const mongoose = require("mongoose");
const GamChallenge = require("../../Models/gamification/challenge.model");
const ChallengeClaim = require("../../Models/gamification/challengeclaim.model");
const PointTx = require("../../Models/gamification/pointtransaction.model");
const GamProfile = require("../../Models/gamification/gamprofile.model");
const engine = require("./engine");
const { BADGE_MAP } = require("./catalog/badges");

const ref = (p) => ({ organisation_id: p.organisation_id, model: p.personModel, id: p.person });

const baseMatch = (c) => {
  const now = new Date();
  const m = { organisation_id: c.organisation_id, createdAt: { $gte: c.startsAt, $lt: now < c.endsAt ? now : c.endsAt } };
  if (c.events && c.events.length) m.event = { $in: c.events };
  if (c.metric === "xp") m.xp = { $gt: 0 }; // only earned XP counts
  return m;
};
const valueExpr = (c) => (c.metric === "xp" ? { $sum: "$xp" } : { $sum: 1 });

const eligible = (c, profile) => {
  if (c.departments && c.departments.length && !c.departments.includes(profile.department)) return false;
  if (c.optIn && !c.participants.includes(profile.personKey)) return false;
  return true;
};

const myProgress = async (c, profile) => {
  const match = { ...baseMatch(c) };
  if (c.scope === "department") match.department = profile.department;
  else match.personKey = profile.personKey;
  const r = await PointTx.aggregate([{ $match: match }, { $group: { _id: null, v: valueExpr(c) } }]);
  return (r[0] && r[0].v) || 0;
};

const board = async (c, limit = 10) => {
  const key = c.scope === "department" ? "$department" : "$personKey";
  const match = baseMatch(c);
  if (c.scope === "department") match.department = { $ne: "" };
  if (c.departments && c.departments.length) match.department = c.scope === "department" ? { $in: c.departments } : { $in: c.departments };
  const rows = await PointTx.aggregate([{ $match: match }, { $group: { _id: key, v: valueExpr(c) } }, { $sort: { v: -1 } }, { $limit: limit }]);
  if (c.scope === "department") return rows.map((r, i) => ({ position: i + 1, name: r._id, value: r.v }));
  const profiles = await GamProfile.find({ personKey: { $in: rows.map((r) => r._id) } }).select("personKey name department photo").lean();
  const map = new Map(profiles.map((p) => [p.personKey, p]));
  return rows.map((r, i) => { const p = map.get(r._id) || {}; return { position: i + 1, personKey: r._id, name: p.name || "Someone", department: p.department, photo: p.photo, value: r.v }; });
};

const phase = (c) => {
  const now = Date.now();
  if (c.status === "cancelled") return "cancelled";
  if (c.status === "finalised") return "ended";
  if (new Date(c.startsAt).getTime() > now) return "upcoming";
  if (new Date(c.endsAt).getTime() < now) return "ended";
  return "live";
};

const listFor = async (profile) => {
  const rows = await GamChallenge.find({ organisation_id: profile.organisation_id, status: { $ne: "cancelled" }, endsAt: { $gte: new Date(Date.now() - 30 * 86400000) } }).sort({ endsAt: 1 }).lean();
  const out = [];
  for (const c of rows) {
    const canSee = !(c.departments && c.departments.length) || c.departments.includes(profile.department) || c.scope === "department";
    if (!canSee) continue;
    const joined = !c.optIn || c.participants.includes(profile.personKey);
    const inScope = !(c.departments && c.departments.length) || c.departments.includes(profile.department);
    const progress = joined && inScope ? await myProgress(c, profile) : 0;
    const claimed = !!(await ChallengeClaim.exists({ challenge: c._id, personKey: profile.personKey }));
    out.push({
      id: String(c._id), title: c.title, description: c.description, icon: c.icon, scope: c.scope, metric: c.metric, events: c.events,
      target: c.target, startsAt: c.startsAt, endsAt: c.endsAt, optIn: c.optIn, joined, inScope, phase: phase(c),
      rewardXp: c.rewardXp, rewardCoins: c.rewardCoins, rewardBadgeKey: c.rewardBadgeKey, podiumXp: c.podiumXp,
      participants: c.optIn ? c.participants.length : undefined,
      progress, complete: progress >= c.target, claimed, canClaim: progress >= c.target && !claimed && inScope && joined,
      winners: c.winners,
    });
  }
  return out;
};

const join = async (profile, id) => {
  if (!mongoose.isValidObjectId(id)) return { error: "Not found." };
  const c = await GamChallenge.findOne({ _id: id, organisation_id: profile.organisation_id, status: "active" });
  if (!c || !c.optIn) return { error: "This challenge doesn't need joining." };
  if (new Date(c.endsAt) < new Date()) return { error: "This challenge has ended." };
  if (c.departments.length && !c.departments.includes(profile.department)) return { error: "This challenge isn't open to your department." };
  await GamChallenge.updateOne({ _id: c._id }, { $addToSet: { participants: profile.personKey } });
  return { ok: true };
};

const claim = async (profile, id) => {
  if (!mongoose.isValidObjectId(id)) return { error: "Not found." };
  const c = await GamChallenge.findOne({ _id: id, organisation_id: profile.organisation_id, status: { $ne: "cancelled" } }).lean();
  if (!c || !eligible(c, profile) || (c.departments.length && !c.departments.includes(profile.department))) return { error: "You're not part of this challenge." };
  if ((await myProgress(c, profile)) < c.target) return { error: "You haven't reached the target yet." };
  try { await ChallengeClaim.create({ organisation_id: profile.organisation_id, challenge: c._id, personKey: profile.personKey }); }
  catch (e) { if (e.code === 11000) return { error: "Already claimed." }; throw e; }
  const res = await engine.award({ ...ref(profile), event: "challenge_reward", xp: c.rewardXp, coins: c.rewardCoins, dedupeKey: `ch:${c._id}:${profile.personKey}`, meta: { challenge: String(c._id) }, reason: `Challenge: ${c.title}`, force: true });
  await engine.award({ ...ref(profile), event: "challenge_completed", dedupeKey: `chc:${c._id}:${profile.personKey}`, silent: true, force: true, meta: { countOnly: true } });
  if (c.rewardBadgeKey && BADGE_MAP[c.rewardBadgeKey]) await engine.awardBadge(profile, BADGE_MAP[c.rewardBadgeKey], { grantedBy: "challenge" });
  return { award: res };
};

// Called by the cron after endsAt (or by an admin): pays podium prizes once.
const finalise = async (c) => {
  const locked = await GamChallenge.findOneAndUpdate({ _id: c._id, status: "active" }, { $set: { status: "finalised" } }, { returnDocument: "after" }).lean();
  if (!locked) return null;
  const top = await board(locked, 3);
  const winners = [];
  for (let i = 0; i < top.length; i++) {
    const w = top[i];
    const xp = (locked.podiumXp || [])[i] || 0;
    const coins = (locked.podiumCoins || [])[i] || 0;
    winners.push({ ...w, xp, coins });
    if (locked.scope !== "individual" || (!xp && !coins)) continue;
    const [model, id] = w.personKey.split(":");
    const p = await GamProfile.findOne({ personKey: w.personKey }).lean();
    if (!p) continue;
    await engine.award({ organisation_id: locked.organisation_id, model, id, event: "challenge_reward", xp, coins, dedupeKey: `chp:${locked._id}:${w.personKey}`, reason: `Challenge podium #${i + 1}: ${locked.title}`, force: true });
    await engine.notifyPerson(p, { title: `You placed #${i + 1} in "${locked.title}"`, message: `Prize: ${xp} XP and ${coins} reward points.`, priority: "medium" });
  }
  await GamChallenge.updateOne({ _id: locked._id }, { $set: { winners } });
  return winners;
};

module.exports = { listFor, join, claim, finalise, board, myProgress, phase };
