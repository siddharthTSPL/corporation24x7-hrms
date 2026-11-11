// Gamification — configuration, moderation and analytics (admin / super admin).
const mongoose = require("mongoose");
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const GamSettings = require("../Models/gamification/gamsettings.model");
const GamProfile = require("../Models/gamification/gamprofile.model");
const PointTx = require("../Models/gamification/pointtransaction.model");
const UserBadge = require("../Models/gamification/userbadge.model");
const CustomBadge = require("../Models/gamification/custombadge.model");
const QuestDef = require("../Models/gamification/questdef.model");
const GamChallenge = require("../Models/gamification/challenge.model");
const GamReward = require("../Models/gamification/reward.model");
const GamRedemption = require("../Models/gamification/redemption.model");
const GamKudos = require("../Models/gamification/kudos.model");
const GamSeason = require("../Models/gamification/season.model");
const { GamQuizQuestion } = require("../Models/gamification/quizquestion.model");
const engine = require("../utils/gamification/engine");
const { getSettings, invalidateSettings, sanitiseUpdate, DEFAULTS } = require("../utils/gamification/settings");
const { EVENTS, TUNABLE_EVENTS } = require("../utils/gamification/catalog/events");
const { BADGES, BADGE_MAP } = require("../utils/gamification/catalog/badges");
const { levelFromXp } = require("../utils/gamification/catalog/levels");
const cosmetics = require("../utils/gamification/catalog/cosmetics");
const quests = require("../utils/gamification/quests.service");
const challenges = require("../utils/gamification/challenges.service");
const seasons = require("../utils/gamification/seasons.service");
const store = require("../utils/gamification/store.service");
const board = require("../utils/gamification/leaderboard");

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const ok = (res, data = {}) => res.json({ success: true, ...data });
const org = (req) => req.actor.organisation_id;
const actorKey = (req) => `${req.actor.recipientModel}:${req.actor.id}`;
const oid = (id) => { if (!mongoose.isValidObjectId(id)) throw fail("Not found.", 404); return id; };
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const num = (v, min, max, d = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d; };
const date = (v, label) => { const d = new Date(v); if (Number.isNaN(d.getTime())) throw fail(`${label} is not a valid date.`); return d; };

// ── settings ────────────────────────────────────────────────────────────
exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings(org(req));
  ok(res, {
    settings,
    defaults: DEFAULTS,
    events: TUNABLE_EVENTS.map((key) => ({ key, label: EVENTS[key].label, icon: EVENTS[key].icon, category: EVENTS[key].category, xp: EVENTS[key].xp, coins: EVENTS[key].coins, dailyCap: EVENTS[key].dailyCap || 0 })),
  });
});
exports.updateSettings = asyncHandler(async (req, res) => {
  const update = sanitiseUpdate(req.body);
  const doc = (await GamSettings.findOne({ organisation_id: org(req) })) || new GamSettings({ organisation_id: org(req) });
  for (const [k, v] of Object.entries(update)) { doc[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...(doc[k] || {}), ...v } : v; doc.markModified(k); }
  doc.updatedBy = actorKey(req);
  await doc.save();
  invalidateSettings(org(req));
  ok(res, { settings: await getSettings(org(req)) });
});
exports.resetRules = asyncHandler(async (req, res) => {
  await GamSettings.updateOne({ organisation_id: org(req) }, { $set: { rules: {} } }, { upsert: true });
  invalidateSettings(org(req));
  ok(res, { settings: await getSettings(org(req)) });
});

// ── analytics ───────────────────────────────────────────────────────────
exports.analytics = asyncHandler(async (req, res) => {
  const o = org(req);
  const since = new Date(Date.now() - 30 * 86400000);
  const since7 = new Date(Date.now() - 7 * 86400000);
  const since14 = new Date(Date.now() - 14 * 86400000);
  const models = [["User", "../Models/user.model"], ["Manager", "../Models/manager.model"], ["Admin", "../Models/Admin.model"]];
  const headcount = (await Promise.all(models.map(([, f]) => require(f).countDocuments({ organisation_id: o, working_status: "working" })))).reduce((a, b) => a + b, 0);

  const [profiles, active7, dormant, optedOut, levelBuckets, daily, topEvents, byDept, economy, kudosCount, kudosTop, pending, redeemStats, topRewards, badgesEarned] = await Promise.all([
    GamProfile.countDocuments({ organisation_id: o }),
    GamProfile.countDocuments({ organisation_id: o, lastActiveAt: { $gte: since7 } }),
    GamProfile.countDocuments({ organisation_id: o, $or: [{ lastActiveAt: { $lt: since14 } }, { lastActiveAt: null }] }),
    GamProfile.countDocuments({ organisation_id: o, optedOut: true }),
    GamProfile.aggregate([{ $match: { organisation_id: o } }, { $bucket: { groupBy: "$level", boundaries: [1, 5, 10, 20, 35, 50, 101], default: "other", output: { n: { $sum: 1 } } } }]),
    PointTx.aggregate([{ $match: { organisation_id: o, createdAt: { $gte: since }, xp: { $gt: 0 } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, xp: { $sum: "$xp" }, people: { $addToSet: "$personKey" } } }, { $project: { xp: 1, people: { $size: "$people" } } }, { $sort: { _id: 1 } }]),
    PointTx.aggregate([{ $match: { organisation_id: o, createdAt: { $gte: since }, xp: { $gt: 0 } } }, { $group: { _id: "$event", count: { $sum: 1 }, xp: { $sum: "$xp" } } }, { $sort: { xp: -1 } }, { $limit: 12 }]),
    PointTx.aggregate([{ $match: { organisation_id: o, createdAt: { $gte: since }, xp: { $gt: 0 }, department: { $ne: "" } } }, { $group: { _id: { d: "$department", p: "$personKey" }, xp: { $sum: "$xp" } } }, { $group: { _id: "$_id.d", xp: { $sum: "$xp" }, active: { $sum: 1 } } }, { $sort: { xp: -1 } }]),
    GamProfile.aggregate([{ $match: { organisation_id: o } }, { $group: { _id: null, circulating: { $sum: "$coins" }, issued: { $sum: "$lifetimeCoins" }, spent: { $sum: "$spentCoins" }, xp: { $sum: "$xp" } } }]),
    GamKudos.countDocuments({ organisation_id: o, createdAt: { $gte: since } }),
    GamKudos.aggregate([{ $match: { organisation_id: o, createdAt: { $gte: since } } }, { $group: { _id: "$toKey", name: { $first: "$toName" }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 5 }]),
    GamRedemption.countDocuments({ organisation_id: o, status: "pending" }),
    GamRedemption.aggregate([{ $match: { organisation_id: o, createdAt: { $gte: since }, status: { $nin: ["rejected", "cancelled"] } } }, { $group: { _id: null, n: { $sum: 1 }, coins: { $sum: "$cost" } } }]),
    GamRedemption.aggregate([{ $match: { organisation_id: o, status: { $nin: ["rejected", "cancelled"] } } }, { $group: { _id: "$rewardName", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 5 }]),
    UserBadge.countDocuments({ organisation_id: o }),
  ]);
  const deptHead = await GamProfile.aggregate([{ $match: { organisation_id: o, department: { $ne: "" } } }, { $group: { _id: "$department", headcount: { $sum: 1 } } }]);
  const hm = new Map(deptHead.map((d) => [d._id, d.headcount]));
  const eco = economy[0] || { circulating: 0, issued: 0, spent: 0, xp: 0 };
  ok(res, {
    participation: { headcount, profiles, active7, dormant, optedOut, rate: headcount ? Math.round((active7 / headcount) * 100) : 0 },
    levels: levelBuckets.map((b) => ({ label: { 1: "1–4", 5: "5–9", 10: "10–19", 20: "20–34", 35: "35–49", 50: "50+" }[b._id] || String(b._id), count: b.n })),
    daily: daily.map((d) => ({ date: d._id, xp: d.xp, people: d.people })),
    topEvents: topEvents.map((e) => ({ event: e._id, label: (EVENTS[e._id] || {}).label || e._id, icon: (EVENTS[e._id] || {}).icon, count: e.count, xp: e.xp })),
    departments: byDept.map((d) => ({ department: d._id, xp: d.xp, active: d.active, headcount: hm.get(d._id) || d.active, perHead: Math.round(d.xp / Math.max(1, hm.get(d._id) || d.active)) })).sort((a, b) => b.perHead - a.perHead),
    economy: { circulating: eco.circulating, issued: eco.issued, spent: eco.spent, totalXp: eco.xp, redeemed30d: (redeemStats[0] || {}).n || 0, coinsSpent30d: (redeemStats[0] || {}).coins || 0, pendingRedemptions: pending },
    kudos: { last30d: kudosCount, topReceivers: kudosTop.map((k) => ({ key: k._id, name: k.name, count: k.n })) },
    topRewards: topRewards.map((r) => ({ name: r._id, count: r.n })),
    badgesEarned,
  });
});

// ── participants ────────────────────────────────────────────────────────
exports.participants = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 25;
  const filter = { organisation_id: org(req) };
  if (req.query.q) filter.name = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (req.query.department) filter.department = req.query.department;
  const sortKey = { xp: { xp: -1 }, coins: { coins: -1 }, recent: { lastActiveAt: -1 } }[req.query.sort] || { xp: -1 };
  const [rows, total, departments] = await Promise.all([
    GamProfile.find(filter).sort(sortKey).skip((page - 1) * limit).limit(limit).lean(),
    GamProfile.countDocuments(filter),
    GamProfile.distinct("department", { organisation_id: org(req) }),
  ]);
  ok(res, { page, pages: Math.ceil(total / limit), total, departments: departments.filter(Boolean).sort(), items: rows.map((p) => ({ personKey: p.personKey, name: p.name, department: p.department, designation: p.designation, photo: p.photo, xp: p.xp, level: p.level, coins: p.coins, badges: (p.badgeKeys || []).length, optedOut: !!p.optedOut, showOnLeaderboard: p.showOnLeaderboard !== false, frozenAccount: !!p.frozenAccount, lastActiveAt: p.lastActiveAt })) });
});
exports.updateParticipant = asyncHandler(async (req, res) => {
  const set = pick(req.body || {}, ["frozenAccount", "optedOut", "showOnLeaderboard"]);
  for (const k of Object.keys(set)) set[k] = !!set[k];
  const p = await GamProfile.findOneAndUpdate({ organisation_id: org(req), personKey: req.params.key }, { $set: set }, { returnDocument: "after" }).lean();
  if (!p) throw fail("Person not found.", 404);
  ok(res, { personKey: p.personKey, frozenAccount: p.frozenAccount, optedOut: p.optedOut, showOnLeaderboard: p.showOnLeaderboard });
});

// ── manual adjustments (add or deduct) ──────────────────────────────────
exports.adjust = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!/^(User|Manager|Admin):[a-f0-9]{24}$/.test(b.targetKey || "")) throw fail("Choose a person.");
  const xp = num(b.xp, 0, 100000);
  const coins = num(b.coins, 0, 100000);
  const reason = String(b.reason || "").trim().slice(0, 200);
  if (!xp && !coins) throw fail("Enter XP and/or coins.");
  if (reason.length < 5) throw fail("A reason is required for the audit trail.");
  const [model, id] = b.targetKey.split(":");
  const target = await engine.getOrCreateProfile(org(req), model, id);
  if (!target || String(target.organisation_id) !== String(org(req))) throw fail("Person not found.", 404);

  if (b.mode === "deduct") {
    const newXp = Math.max(0, target.xp - xp);
    const newCoins = Math.max(0, target.coins - coins);
    await PointTx.create({ organisation_id: org(req), personKey: target.personKey, personModel: model, person: target.person, department: target.department, event: "admin_adjust", xp: -(target.xp - newXp), coins: -(target.coins - newCoins), reason, actorKey: actorKey(req), meta: { mode: "deduct" } });
    const lvl = levelFromXp(newXp, (await getSettings(org(req))).levelBase).level;
    await GamProfile.updateOne({ _id: target._id }, { $set: { xp: newXp, coins: newCoins, level: lvl } });
    return ok(res, { xp: newXp, coins: newCoins });
  }
  const r = await engine.award({ organisation_id: org(req), model, id, event: "manual_award", xp, coins, reason, actorKey: actorKey(req), dedupeKey: `adm:${actorKey(req)}:${target.personKey}:${Date.now()}`, force: true });
  await engine.notifyPerson(target, { title: "🎖️ You received a bonus", message: `${reason} (+${xp} XP, +${coins} coins)`, priority: "medium" });
  ok(res, { award: r });
});

// ── custom badges ───────────────────────────────────────────────────────
exports.listBadges = asyncHandler(async (req, res) => {
  const custom = await CustomBadge.find({ organisation_id: org(req) }).sort({ createdAt: -1 }).lean();
  const manual = BADGES.filter((b) => b.criteria.type === "manual").map((b) => ({ key: b.key, name: b.name, icon: b.icon, description: b.description, builtin: true, xp: b.reward.xp, coins: b.reward.coins }));
  ok(res, { custom: custom.map((c) => ({ ...c, key: `custom:${c._id}` })), manual, total: BADGES.length });
});
exports.createBadge = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!String(b.name || "").trim()) throw fail("Give the badge a name.");
  const doc = await CustomBadge.create({ organisation_id: org(req), ...pick(b, ["name", "description", "icon", "color"]), xp: num(b.xp, 0, 5000, 50), coins: num(b.coins, 0, 5000, 10), createdBy: actorKey(req) });
  ok(res, { badge: doc });
});
exports.updateBadge = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const set = pick(b, ["name", "description", "icon", "color"]);
  if (b.xp !== undefined) set.xp = num(b.xp, 0, 5000); if (b.coins !== undefined) set.coins = num(b.coins, 0, 5000); if (b.active !== undefined) set.active = !!b.active;
  const doc = await CustomBadge.findOneAndUpdate({ _id: oid(req.params.id), organisation_id: org(req) }, { $set: set }, { returnDocument: "after", runValidators: true });
  if (!doc) throw fail("Not found.", 404);
  ok(res, { badge: doc });
});
exports.deleteBadge = asyncHandler(async (req, res) => {
  await CustomBadge.deleteOne({ _id: oid(req.params.id), organisation_id: org(req) });
  ok(res);
});
exports.grantBadge = asyncHandler(async (req, res) => {
  const { targetKey, badgeKey, note } = req.body || {};
  if (!/^(User|Manager|Admin):[a-f0-9]{24}$/.test(targetKey || "")) throw fail("Choose a person.");
  const [model, id] = targetKey.split(":");
  const target = await engine.getOrCreateProfile(org(req), model, id);
  if (!target || String(target.organisation_id) !== String(org(req))) throw fail("Person not found.", 404);
  let got;
  if (String(badgeKey).startsWith("custom:")) {
    const cb = await CustomBadge.findOne({ _id: oid(badgeKey.slice(7)), organisation_id: org(req), active: true });
    if (!cb) throw fail("Badge not found.", 404);
    got = await engine.grantCustomBadge(target, cb, actorKey(req), String(note || "").slice(0, 200));
  } else {
    const b = BADGE_MAP[badgeKey];
    if (!b || b.criteria.type !== "manual") throw fail("That badge can't be granted manually.");
    got = await engine.awardBadge(target, b, { grantedBy: actorKey(req), note: String(note || "").slice(0, 200) });
  }
  if (!got) throw fail("They already have that badge.");
  engine.pushLive(target, { event: "badge_granted", label: "Badge granted", icon: got.icon, xp: got.xp, coins: got.coins, badges: [got], levelUps: [], quests: [], totals: {} });
  ok(res, { badge: got });
});
exports.revokeBadge = asyncHandler(async (req, res) => {
  const { targetKey, badgeKey } = req.body || {};
  await UserBadge.deleteOne({ organisation_id: org(req), personKey: targetKey, badgeKey });
  await GamProfile.updateOne({ organisation_id: org(req), personKey: targetKey }, { $pull: { badgeKeys: badgeKey } });
  ok(res);
});

// ── custom quests ───────────────────────────────────────────────────────
const questFields = (b) => {
  if (!EVENTS[b.event] || EVENTS[b.event].system) throw fail("Choose a valid activity for the quest.");
  if (!String(b.title || "").trim()) throw fail("Give the quest a title.");
  return {
    ...pick(b, ["title", "desc", "icon"]), event: b.event, target: num(b.target, 1, 1000, 1),
    period: ["daily", "weekly", "monthly", "oneoff"].includes(b.period) ? b.period : "weekly",
    xp: num(b.xp, 0, 5000, 30), coins: num(b.coins, 0, 5000, 5),
    departments: Array.isArray(b.departments) ? b.departments.map(String).slice(0, 30) : [],
    startsAt: b.startsAt ? date(b.startsAt, "Start") : null, endsAt: b.endsAt ? date(b.endsAt, "End") : null, active: b.active !== false,
  };
};
exports.listQuests = asyncHandler(async (req, res) => ok(res, { quests: await QuestDef.find({ organisation_id: org(req) }).sort({ createdAt: -1 }).lean() }));
exports.createQuest = asyncHandler(async (req, res) => { const doc = await QuestDef.create({ organisation_id: org(req), ...questFields(req.body || {}), createdBy: actorKey(req) }); quests.invalidateQuestDefs(org(req)); ok(res, { quest: doc }); });
exports.updateQuest = asyncHandler(async (req, res) => { const doc = await QuestDef.findOneAndUpdate({ _id: oid(req.params.id), organisation_id: org(req) }, { $set: questFields(req.body || {}) }, { returnDocument: "after" }); if (!doc) throw fail("Not found.", 404); quests.invalidateQuestDefs(org(req)); ok(res, { quest: doc }); });
exports.deleteQuest = asyncHandler(async (req, res) => { await QuestDef.deleteOne({ _id: oid(req.params.id), organisation_id: org(req) }); quests.invalidateQuestDefs(org(req)); ok(res); });

// ── challenges ──────────────────────────────────────────────────────────
const challengeFields = (b) => {
  if (!String(b.title || "").trim()) throw fail("Give the challenge a title.");
  const events = Array.isArray(b.events) ? b.events.filter((e) => EVENTS[e] && !EVENTS[e].system) : [];
  const metric = b.metric === "xp" ? "xp" : "count";
  if (metric === "count" && !events.length) throw fail("Pick at least one activity to count.");
  const startsAt = date(b.startsAt, "Start"); const endsAt = date(b.endsAt, "End");
  if (endsAt <= startsAt) throw fail("The end must be after the start.");
  const three = (a) => [0, 1, 2].map((i) => num((a || [])[i], 0, 20000, 0));
  return {
    ...pick(b, ["title", "description", "icon"]), scope: b.scope === "department" ? "department" : "individual", metric, events,
    target: num(b.target, 1, 10000000, 1), startsAt, endsAt, optIn: !!b.optIn,
    departments: Array.isArray(b.departments) ? b.departments.map(String).slice(0, 30) : [],
    rewardXp: num(b.rewardXp, 0, 20000, 100), rewardCoins: num(b.rewardCoins, 0, 20000, 20),
    rewardBadgeKey: BADGE_MAP[b.rewardBadgeKey] ? b.rewardBadgeKey : "", podiumXp: three(b.podiumXp), podiumCoins: three(b.podiumCoins),
  };
};
exports.listChallenges = asyncHandler(async (req, res) => {
  const rows = await GamChallenge.find({ organisation_id: org(req) }).sort({ endsAt: -1 }).limit(100).lean();
  ok(res, { challenges: rows.map((c) => ({ ...c, id: String(c._id), phase: challenges.phase(c), participants: c.participants.length })) });
});
exports.createChallenge = asyncHandler(async (req, res) => {
  const doc = await GamChallenge.create({ organisation_id: org(req), ...challengeFields(req.body || {}), createdBy: actorKey(req) });
  ok(res, { challenge: doc });
  // let everyone know
  try {
    const GamProf = await GamProfile.find({ organisation_id: org(req), optedOut: { $ne: true } }).select("personModel person organisation_id").lean();
    const { createBulkNotifications } = require("../utils/Notification.utils");
    createBulkNotifications({ recipients: GamProf.map((p) => ({ recipientModel: p.personModel, recipientId: p.person })), organisation_id: org(req), type: "gamification", title: `${doc.icon} New challenge: ${doc.title}`, message: doc.description || "A new challenge just started — jump in!", link: "/gamification" });
  } catch (_) { /* best effort */ }
});
exports.updateChallenge = asyncHandler(async (req, res) => {
  const doc = await GamChallenge.findOneAndUpdate({ _id: oid(req.params.id), organisation_id: org(req), status: "active" }, { $set: challengeFields(req.body || {}) }, { returnDocument: "after" });
  if (!doc) throw fail("Only active challenges can be edited.", 404);
  ok(res, { challenge: doc });
});
exports.finaliseChallenge = asyncHandler(async (req, res) => {
  const c = await GamChallenge.findOne({ _id: oid(req.params.id), organisation_id: org(req) }).lean();
  if (!c) throw fail("Not found.", 404);
  ok(res, { winners: await challenges.finalise(c) });
});
exports.cancelChallenge = asyncHandler(async (req, res) => {
  await GamChallenge.updateOne({ _id: oid(req.params.id), organisation_id: org(req), status: "active" }, { $set: { status: "cancelled" } });
  ok(res);
});

// ── rewards store ───────────────────────────────────────────────────────
const rewardFields = (b) => {
  if (!String(b.name || "").trim()) throw fail("Give the reward a name.");
  const eff = b.effect || {};
  const type = ["none", "cosmetic", "freeze", "mystery"].includes(eff.type) ? eff.type : "none";
  if (type === "cosmetic" && !cosmetics.find(eff.cosmeticType, eff.cosmeticId)) throw fail("Choose a valid cosmetic.");
  return {
    ...pick(b, ["name", "description", "icon"]), category: ["perk", "voucher", "time", "swag", "charity", "cosmetic", "boost", "other"].includes(b.category) ? b.category : "perk",
    cost: num(b.cost, 1, 1000000, 100), stock: b.stock === -1 || b.stock === "" || b.stock === null || b.stock === undefined ? -1 : num(b.stock, -1, 100000, -1),
    perUserLimit: num(b.perUserLimit, 0, 1000, 0), minLevel: num(b.minLevel, 1, 100, 1), requiresApproval: b.requiresApproval !== false, active: b.active !== false,
    effect: { type, cosmeticType: eff.cosmeticType || "", cosmeticId: eff.cosmeticId || "", freezes: num(eff.freezes, 0, 10, 1), mysteryMin: num(eff.mysteryMin, 0, 100000, 0), mysteryMax: num(eff.mysteryMax, 0, 100000, 0) },
  };
};
exports.listRewards = asyncHandler(async (req, res) => ok(res, { rewards: await GamReward.find({ organisation_id: org(req) }).sort({ createdAt: -1 }).lean(), cosmetics: { frame: cosmetics.FRAMES.filter((c) => c.unlock.type === "store"), title: cosmetics.TITLES.filter((c) => c.unlock.type === "store"), theme: cosmetics.THEMES.filter((c) => c.unlock.type === "store") } }));
exports.createReward = asyncHandler(async (req, res) => ok(res, { reward: await GamReward.create({ organisation_id: org(req), ...rewardFields(req.body || {}), createdBy: actorKey(req) }) }));
exports.updateReward = asyncHandler(async (req, res) => { const d = await GamReward.findOneAndUpdate({ _id: oid(req.params.id), organisation_id: org(req) }, { $set: rewardFields(req.body || {}) }, { returnDocument: "after" }); if (!d) throw fail("Not found.", 404); ok(res, { reward: d }); });
exports.deleteReward = asyncHandler(async (req, res) => { await GamReward.updateOne({ _id: oid(req.params.id), organisation_id: org(req) }, { $set: { active: false } }); ok(res); });

// A starter catalogue so a new org has something to spend coins on.
exports.seedRewards = asyncHandler(async (req, res) => {
  if (await GamReward.exists({ organisation_id: org(req) })) throw fail("Your store already has rewards.");
  const base = { organisation_id: org(req), createdBy: actorKey(req) };
  const items = [
    { name: "Coffee on the house", icon: "☕", category: "perk", cost: 150, description: "A free coffee or tea from the office pantry/cafe.", requiresApproval: true },
    { name: "Wear-what-you-like day", icon: "👟", category: "perk", cost: 300, description: "Dress casually for a day.", requiresApproval: true },
    { name: "Team lunch for 4", icon: "🍕", category: "perk", cost: 1500, description: "Lunch with your team, on the company.", requiresApproval: true, perUserLimit: 2 },
    { name: "Extended lunch break", icon: "🥗", category: "time", cost: 400, description: "An extra 30 minutes at lunch (manager approval).", requiresApproval: true },
    { name: "Half-day off", icon: "🌴", category: "time", cost: 2500, description: "Take a half day, no leave balance used.", requiresApproval: true, minLevel: 10, perUserLimit: 2 },
    { name: "Gift voucher ₹500", icon: "🎟️", category: "voucher", cost: 3000, description: "A ₹500 voucher.", requiresApproval: true, minLevel: 8, stock: 20 },
    { name: "Company swag", icon: "👕", category: "swag", cost: 2000, description: "T-shirt, mug or notebook of your choice.", requiresApproval: true },
    { name: "Donate to charity", icon: "💚", category: "charity", cost: 500, description: "The company donates ₹250 in your name.", requiresApproval: true },
    { name: "Streak freeze", icon: "🧊", category: "boost", cost: 100, description: "Protect a streak for one missed day.", requiresApproval: false, effect: { type: "freeze", freezes: 1 } },
    { name: "Mystery box", icon: "📦", category: "boost", cost: 120, description: "Open it for 50–300 bonus coins. Feeling lucky?", requiresApproval: false, effect: { type: "mystery", mysteryMin: 50, mysteryMax: 300 } },
    { name: "Neon avatar frame", icon: "🟢", category: "cosmetic", cost: 400, description: "An animated neon ring for your avatar.", requiresApproval: false, effect: { type: "cosmetic", cosmeticType: "frame", cosmeticId: "neon" } },
    { name: "Rose Gold frame", icon: "🌸", category: "cosmetic", cost: 350, description: "A soft rose-gold avatar ring.", requiresApproval: false, effect: { type: "cosmetic", cosmeticType: "frame", cosmeticId: "rose_gold" } },
    { name: "Ocean profile theme", icon: "🌊", category: "cosmetic", cost: 300, description: "Cool ocean colours for your profile card.", requiresApproval: false, effect: { type: "cosmetic", cosmeticType: "theme", cosmeticId: "ocean" } },
    { name: "Neon City theme", icon: "🌃", category: "cosmetic", cost: 450, description: "A vivid neon-city profile card.", requiresApproval: false, effect: { type: "cosmetic", cosmeticType: "theme", cosmeticId: "neon_city" } },
    { name: "Title: Office Legend", icon: "🏆", category: "cosmetic", cost: 600, description: "Show off a legendary title.", requiresApproval: false, effect: { type: "cosmetic", cosmeticType: "title", cosmeticId: "office_legend" } },
    { name: "Title: Lucky Charm", icon: "🍀", category: "cosmetic", cost: 350, description: "A lucky title for your profile.", requiresApproval: false, effect: { type: "cosmetic", cosmeticType: "title", cosmeticId: "lucky_charm" } },
  ].map((i) => ({ ...base, stock: -1, ...i }));
  await GamReward.insertMany(items);
  ok(res, { created: items.length });
});

exports.listRedemptions = asyncHandler(async (req, res) => {
  const filter = { organisation_id: org(req) };
  if (req.query.status && req.query.status !== "all") filter.status = req.query.status;
  const rows = await GamRedemption.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  ok(res, { items: rows.map((r) => ({ id: String(r._id), name: r.rewardName, icon: r.rewardIcon, personKey: r.personKey, personName: r.personName, department: r.department, cost: r.cost, status: r.status, note: r.note, adminNote: r.adminNote, at: r.createdAt, decidedAt: r.decidedAt, decidedBy: r.decidedBy })) });
});
exports.decideRedemption = asyncHandler(async (req, res) => {
  const { action, adminNote } = req.body || {};
  const next = { approve: "approved", fulfil: "fulfilled", fulfill: "fulfilled", reject: "rejected" }[action];
  if (!next) throw fail("Unknown action.");
  const from = next === "approved" ? ["pending"] : next === "fulfilled" ? ["pending", "approved"] : ["pending", "approved"];
  const r = await GamRedemption.findOneAndUpdate({ _id: oid(req.params.id), organisation_id: org(req), status: { $in: from } }, { $set: { status: next, adminNote: String(adminNote || "").slice(0, 300), decidedBy: actorKey(req), decidedAt: new Date() } }, { returnDocument: "after" });
  if (!r) throw fail("That request can no longer be changed.");
  const profile = await GamProfile.findOne({ personKey: r.personKey }).lean();
  if (profile) {
    if (next === "rejected") await store.refund(r, profile);
    await engine.notifyPerson(profile, { title: `${r.rewardIcon || "🎁"} ${r.rewardName}: ${next}`, message: next === "rejected" ? `Your coins were refunded.${adminNote ? " Note: " + adminNote : ""}` : `Your reward request was ${next}.${adminNote ? " Note: " + adminNote : ""}`, priority: "medium" });
  }
  ok(res);
});

// ── seasons & hall of fame ──────────────────────────────────────────────
exports.listSeasons = asyncHandler(async (req, res) => ok(res, { seasons: await GamSeason.find({ organisation_id: org(req) }).sort({ startsAt: -1 }).limit(50).lean() }));
exports.createSeason = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const startsAt = date(b.startsAt, "Start"); const endsAt = date(b.endsAt, "End");
  if (endsAt <= startsAt) throw fail("The end must be after the start.");
  if (!String(b.name || "").trim()) throw fail("Give the season a name.");
  const prizes = Array.isArray(b.prizes) ? b.prizes.slice(0, 10).map((p, i) => ({ rank: i + 1, xp: num(p.xp, 0, 50000), coins: num(p.coins, 0, 50000), label: String(p.label || "").slice(0, 40) })) : undefined;
  const doc = await GamSeason.create({ organisation_id: org(req), name: b.name, theme: b.theme || "🏟️", startsAt, endsAt, status: startsAt > new Date() ? "upcoming" : "active", ...(prizes ? { prizes } : {}), createdBy: actorKey(req) });
  ok(res, { season: doc });
});
exports.finaliseSeason = asyncHandler(async (req, res) => {
  const s = await GamSeason.findOne({ _id: oid(req.params.id), organisation_id: org(req) }).lean();
  if (!s) throw fail("Not found.", 404);
  ok(res, { winners: await seasons.finaliseSeason(s) });
});
exports.deleteSeason = asyncHandler(async (req, res) => { await GamSeason.deleteOne({ _id: oid(req.params.id), organisation_id: org(req), status: { $ne: "finalised" } }); ok(res); });

// ── quiz questions ──────────────────────────────────────────────────────
const quizFields = (b) => {
  const options = (Array.isArray(b.options) ? b.options : []).map((o) => String(o).trim()).filter(Boolean).slice(0, 5);
  if (!String(b.question || "").trim() || options.length < 2) throw fail("A question needs text and at least 2 options.");
  const answer = num(b.answer, 0, options.length - 1, -1);
  if (answer < 0) throw fail("Mark the correct option.");
  return { question: String(b.question).trim(), options, answer, category: String(b.category || "Company").slice(0, 30), explanation: String(b.explanation || "").slice(0, 300), active: b.active !== false };
};
exports.listQuiz = asyncHandler(async (req, res) => ok(res, { questions: await GamQuizQuestion.find({ organisation_id: org(req) }).sort({ createdAt: -1 }).lean() }));
exports.createQuiz = asyncHandler(async (req, res) => ok(res, { question: await GamQuizQuestion.create({ organisation_id: org(req), ...quizFields(req.body || {}), createdBy: actorKey(req) }) }));
exports.updateQuiz = asyncHandler(async (req, res) => { const d = await GamQuizQuestion.findOneAndUpdate({ _id: oid(req.params.id), organisation_id: org(req) }, { $set: quizFields(req.body || {}) }, { returnDocument: "after" }); if (!d) throw fail("Not found.", 404); ok(res, { question: d }); });
exports.deleteQuiz = asyncHandler(async (req, res) => { await GamQuizQuestion.deleteOne({ _id: oid(req.params.id), organisation_id: org(req) }); ok(res); });

// ── kudos moderation ────────────────────────────────────────────────────
exports.moderateKudos = asyncHandler(async (req, res) => {
  const { hidden, pinned } = req.body || {};
  const set = {};
  if (typeof hidden === "boolean") set.hidden = hidden;
  if (typeof pinned === "boolean") set.pinned = pinned;
  const k = await GamKudos.findOneAndUpdate({ _id: oid(req.params.id), organisation_id: org(req) }, { $set: set }, { returnDocument: "after" });
  if (!k) throw fail("Not found.", 404);
  ok(res);
});

// ── export ──────────────────────────────────────────────────────────────
exports.exportCsv = asyncHandler(async (req, res) => {
  const settings = await getSettings(org(req));
  const period = ["today", "week", "month", "season", "all"].includes(req.query.period) ? req.query.period : "all";
  const lb = await board.individualBoard({ organisation_id: org(req), period, settings, viewerKey: null, limit: 2000 });
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Position", "Name", "Department", "Designation", "Level", "XP (period)", "Badges"].join(",")];
  lb.rows.forEach((r) => lines.push([r.position, esc(r.name), esc(r.department), esc(r.designation), r.level, r.xp, r.badgeCount].join(",")));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="rewards-leaderboard-${period}.csv"`);
  res.send("\ufeff" + lines.join("\n"));
});
