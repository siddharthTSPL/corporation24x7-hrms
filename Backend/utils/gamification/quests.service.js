// Quests: catalogue + admin-defined quests, generated lazily per person and
// advanced from the engine (see engine.js -> quests.onEvent).
const QuestProgress = require("../../Models/gamification/questprogress.model");
const QuestDef = require("../../Models/gamification/questdef.model");
const GamProfile = require("../../Models/gamification/gamprofile.model");
const { pickQuests, ONBOARDING, DAILY } = require("./catalog/quests");
const { periodKeys } = require("./periods");
const { startOfISTDay } = require("../Istdate.utils");
const engine = require("./engine");

// Org custom quests change rarely: cache them for a minute.
const defCache = new Map();
const loadCustomDefs = async (organisation_id) => {
  const k = String(organisation_id);
  const hit = defCache.get(k);
  if (hit && Date.now() - hit.at < 60000) return hit.value;
  const value = await QuestDef.find({ organisation_id, active: true }).lean();
  defCache.set(k, { at: Date.now(), value });
  return value;
};
const invalidateQuestDefs = (organisation_id) => defCache.delete(String(organisation_id));

const periodKeyFor = (period, keys) => ({ daily: keys.day, weekly: keys.week, monthly: keys.month, oneoff: "once", onboarding: "once" }[period]);

const instanceFromTemplate = (profile, period, t, keys) => ({
  organisation_id: profile.organisation_id,
  personKey: profile.personKey,
  questKey: t.key,
  custom: false,
  period,
  periodKey: periodKeyFor(period, keys),
  title: t.title, desc: t.desc, icon: t.icon, event: t.event, target: t.target,
  xp: t.xp, coins: t.coins, optional: !!t.optional,
});

const desiredQuests = async (profile) => {
  const keys = periodKeys();
  const out = [];
  for (const period of ["daily", "weekly", "monthly"]) {
    const seed = `${profile.personKey}:${periodKeyFor(period, keys)}`;
    pickQuests(period, seed).forEach((t) => out.push(instanceFromTemplate(profile, period, t, keys)));
  }
  ONBOARDING.forEach((t) => out.push(instanceFromTemplate(profile, "onboarding", t, keys)));

  const now = Date.now();
  const defs = await loadCustomDefs(profile.organisation_id);
  for (const d of defs) {
    if (d.startsAt && new Date(d.startsAt).getTime() > now) continue;
    if (d.endsAt && new Date(d.endsAt).getTime() < now) continue;
    if (d.departments && d.departments.length && !d.departments.includes(profile.department)) continue;
    out.push({
      organisation_id: profile.organisation_id, personKey: profile.personKey,
      questKey: `custom:${d._id}`, custom: true, period: d.period, periodKey: periodKeyFor(d.period, keys),
      title: d.title, desc: d.desc, icon: d.icon, event: d.event, target: d.target, xp: d.xp, coins: d.coins, optional: false,
    });
  }
  return out;
};

const ensureQuests = async (profile) => {
  const desired = await desiredQuests(profile);
  const rerolled = (profile.questKeys && profile.questKeys.rerolled) || {};
  const sig = desired.map((d) => `${d.questKey}@${d.periodKey}`).sort().join("|");
  if (profile.questKeys && profile.questKeys.sig === sig) return;
  // Skip any slot the user already rerolled away from today.
  const toInsert = desired.filter((d) => !(rerolled[d.periodKey] || []).includes(d.questKey));
  try {
    await QuestProgress.insertMany(toInsert, { ordered: false });
  } catch (e) {
    if (!(e && (e.code === 11000 || (e.writeErrors && e.writeErrors.every((w) => w.err && w.err.code === 11000)) || e.name === "MongoBulkWriteError"))) throw e;
  }
  await GamProfile.updateOne({ _id: profile._id }, { $set: { "questKeys.sig": sig } });
  profile.questKeys = { ...(profile.questKeys || {}), sig };
};

const onEvent = async (profile, event, amount = 1) => {
  await ensureQuests(profile);
  const keys = periodKeys();
  const docs = await QuestProgress.find({
    personKey: profile.personKey, status: "active", event, periodKey: { $in: [keys.day, keys.week, keys.month, "once"] },
  }).lean();
  const completed = [];
  for (const d of docs) {
    const upd = await QuestProgress.findOneAndUpdate({ _id: d._id, status: "active" }, { $inc: { progress: amount } }, { returnDocument: "after" });
    if (upd && upd.progress >= upd.target) {
      const done = await QuestProgress.findOneAndUpdate({ _id: d._id, status: "active" }, { $set: { status: "completed", completedAt: new Date() } }, { returnDocument: "after" });
      if (done) {
        completed.push(done.toObject());
        await engine.award({
          organisation_id: profile.organisation_id, model: profile.personModel, id: profile.person,
          event: "quest_completed", dedupeKey: `qc:${done._id}`, silent: true, meta: { quest: done.questKey, countOnly: true }, force: true,
        });
      }
    }
  }
  if (completed.some((c) => c.period === "daily")) await maybeDailySweep(profile, keys.day);
  return completed;
};

const maybeDailySweep = async (profile, dayKey) => {
  const all = await QuestProgress.find({ personKey: profile.personKey, period: "daily", periodKey: dayKey }).select("status").lean();
  if (all.length && all.every((q) => q.status !== "active")) {
    await engine.award({
      organisation_id: profile.organisation_id, model: profile.personModel, id: profile.person,
      event: "daily_sweep", dedupeKey: `sweep:${profile.personKey}:${dayKey}`, force: true,
    });
  }
};

const shape = (q) => ({
  id: String(q._id), questKey: q.questKey, custom: q.custom, period: q.period, title: q.title, desc: q.desc, icon: q.icon,
  event: q.event, target: q.target, progress: Math.min(q.progress, q.target), xp: q.xp, coins: q.coins, optional: q.optional,
  status: q.status, completedAt: q.completedAt, claimedAt: q.claimedAt,
});

const listQuests = async (profile) => {
  await ensureQuests(profile);
  const keys = periodKeys();
  const rows = await QuestProgress.find({
    personKey: profile.personKey,
    $or: [
      { period: "daily", periodKey: keys.day },
      { period: "weekly", periodKey: keys.week },
      { period: "monthly", periodKey: keys.month },
      { period: { $in: ["onboarding", "oneoff"] } },
    ],
  }).sort({ createdAt: 1 }).lean();

  const tomorrow = new Date(startOfISTDay().getTime() + 86400000);
  const groups = { daily: [], weekly: [], monthly: [], onboarding: [], special: [] };
  for (const r of rows) (r.period === "oneoff" ? groups.special : groups[r.period]).push(shape(r));
  const claimable = rows.filter((r) => r.status === "completed").length;
  const rerolled = (profile.questKeys && profile.questKeys.rerolled) || {};
  return { quests: groups, claimable, dailyResetsAt: tomorrow, canReroll: !(rerolled[keys.day] && rerolled[keys.day].length >= 1) };
};

const claimQuest = async (profile, questId) => {
  const q = await QuestProgress.findOneAndUpdate(
    { _id: questId, personKey: profile.personKey, status: "completed" },
    { $set: { status: "claimed", claimedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!q) return null;
  const res = await engine.award({
    organisation_id: profile.organisation_id, model: profile.personModel, id: profile.person,
    event: "quest_reward", xp: q.xp, coins: q.coins, dedupeKey: `qr:${q._id}`, meta: { quest: q.questKey, title: q.title }, reason: `Quest: ${q.title}`, force: true,
  });
  return { quest: shape(q), award: res };
};

const claimAll = async (profile) => {
  const ids = await QuestProgress.find({ personKey: profile.personKey, status: "completed" }).select("_id").lean();
  const out = [];
  for (const { _id } of ids) { const r = await claimQuest(profile, _id); if (r) out.push(r); }
  return out;
};

// Swap one not-yet-started daily quest for a different one (once a day).
const rerollDaily = async (profile, questId) => {
  const keys = periodKeys();
  const rerolled = (profile.questKeys && profile.questKeys.rerolled) || {};
  if ((rerolled[keys.day] || []).length >= 1) return { error: "You've already used today's reroll." };
  const q = await QuestProgress.findOne({ _id: questId, personKey: profile.personKey, period: "daily", periodKey: keys.day, status: "active" });
  if (!q || q.custom) return { error: "That quest can't be rerolled." };
  if (q.progress > 0) return { error: "You can only reroll a quest you haven't started." };
  const current = await QuestProgress.find({ personKey: profile.personKey, period: "daily", periodKey: keys.day }).select("questKey").lean();
  const have = new Set(current.map((c) => c.questKey));
  const pool = DAILY.filter((t) => !have.has(t.key));
  if (!pool.length) return { error: "No other quests are available to swap in." };
  const t = pool[Math.floor(Math.random() * pool.length)];
  await QuestProgress.deleteOne({ _id: q._id });
  await QuestProgress.create(instanceFromTemplate(profile, "daily", t, keys));
  await GamProfile.updateOne({ _id: profile._id }, { $set: { [`questKeys.rerolled.${keys.day}`]: [q.questKey] } });
  return { ok: true };
};

module.exports = { ensureQuests, onEvent, listQuests, claimQuest, claimAll, rerollDaily, invalidateQuestDefs };
