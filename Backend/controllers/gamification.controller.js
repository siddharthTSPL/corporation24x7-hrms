// Gamification — endpoints available to every signed-in role.
const mongoose = require("mongoose");
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const GamProfile = require("../Models/gamification/gamprofile.model");
const PointTx = require("../Models/gamification/pointtransaction.model");
const UserBadge = require("../Models/gamification/userbadge.model");
const CustomBadge = require("../Models/gamification/custombadge.model");
const GamReward = require("../Models/gamification/reward.model");
const GamRedemption = require("../Models/gamification/redemption.model");
const GamKudos = require("../Models/gamification/kudos.model");
const GamSeason = require("../Models/gamification/season.model");
const engine = require("../utils/gamification/engine");
const { getSettings } = require("../utils/gamification/settings");
const { EVENTS, CATEGORIES } = require("../utils/gamification/catalog/events");
const { BADGES, progressOf, TIER_COLOR } = require("../utils/gamification/catalog/badges");
const cosmetics = require("../utils/gamification/catalog/cosmetics");
const { RANKS, TITLES, threshold } = require("../utils/gamification/catalog/levels");
const quests = require("../utils/gamification/quests.service");
const daily = require("../utils/gamification/daily.service");
const board = require("../utils/gamification/leaderboard");
const store = require("../utils/gamification/store.service");
const kudos = require("../utils/gamification/kudos.service");
const challenges = require("../utils/gamification/challenges.service");

const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
const ok = (res, data = {}) => res.json({ success: true, ...data });

// Resolve who is calling. SuperAdmin can browse but doesn't earn.
const who = async (req, { requireProfile = true } = {}) => {
  const a = req.actor;
  const model = engine.modelFromRole(a.role);
  const settings = await getSettings(a.organisation_id);
  if (!model || model === "SuperAdmin") {
    if (requireProfile) throw fail("The organisation owner account doesn't take part in the rewards programme.", 403);
    return { actor: a, model, profile: null, settings, key: null };
  }
  const profile = await engine.getOrCreateProfile(a.organisation_id, model, a.id);
  if (!profile) throw fail("Your rewards profile isn't available.", 403);
  return { actor: a, model, profile, settings, key: profile.personKey };
};

const guardEnabled = (settings) => { if (!settings.enabled) throw fail("The rewards programme is switched off for your organisation.", 403); };

// ── profile ─────────────────────────────────────────────────────────────
exports.me = asyncHandler(async (req, res) => {
  const { profile, settings, actor } = await who(req, { requireProfile: false });
  if (!profile) return ok(res, { eligible: false, enabled: settings.enabled, role: actor.role });
  ok(res, { eligible: true, enabled: settings.enabled, me: await engine.buildSummary(profile, settings), modules: settings.modules });
});

exports.history = asyncHandler(async (req, res) => {
  const { key } = await who(req);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const filter = { personKey: key };
  if (req.query.kind === "xp") filter.xp = { $ne: 0 };
  if (req.query.kind === "coins") filter.coins = { $ne: 0 };
  const [rows, total] = await Promise.all([
    PointTx.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    PointTx.countDocuments(filter),
  ]);
  ok(res, {
    page, total, pages: Math.ceil(total / limit),
    items: rows.map((r) => ({ id: String(r._id), event: r.event, label: (EVENTS[r.event] || {}).label || r.event, icon: (EVENTS[r.event] || {}).icon || "✨", xp: r.xp, coins: r.coins, reason: r.reason, at: r.createdAt })),
  });
});

// One call for the hub landing tab.
exports.hub = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req);
  guardEnabled(settings);
  const [me, q, d, spin, quiz, lbWeek, challengeList, recentBadges, seasonRow] = await Promise.all([
    engine.buildSummary(profile, settings),
    quests.listQuests(profile),
    daily.dailyState(profile),
    Promise.resolve(daily.spinState(profile, settings)),
    daily.quizState(profile),
    board.individualBoard({ organisation_id: profile.organisation_id, period: "week", settings, viewerKey: profile.personKey, limit: 5 }),
    challenges.listFor(profile),
    UserBadge.find({ personKey: profile.personKey }).sort({ earnedAt: -1 }).limit(6).lean(),
    board.currentSeason(profile.organisation_id),
  ]);
  const badgeMap = Object.fromEntries(BADGES.map((b) => [b.key, b]));
  ok(res, {
    me, quests: q, daily: d, spin, quiz, modules: settings.modules,
    weekBoard: lbWeek,
    challenges: challengeList.filter((c) => c.phase === "live").slice(0, 3),
    recentBadges: recentBadges.map((b) => ({ key: b.badgeKey, earnedAt: b.earnedAt, ...(badgeMap[b.badgeKey] ? { name: badgeMap[b.badgeKey].name, icon: badgeMap[b.badgeKey].icon, tier: badgeMap[b.badgeKey].tier } : {}) })),
    season: seasonRow ? { id: String(seasonRow._id), name: seasonRow.name, theme: seasonRow.theme, startsAt: seasonRow.startsAt, endsAt: seasonRow.endsAt, prizes: seasonRow.prizes } : null,
  });
});

exports.updatePrefs = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  const b = req.body || {};
  const set = {};
  if (typeof b.optedOut === "boolean") set.optedOut = b.optedOut;
  if (typeof b.showOnLeaderboard === "boolean") set.showOnLeaderboard = b.showOnLeaderboard;
  for (const type of ["frame", "title", "theme"]) {
    if (b[type] !== undefined) {
      if (!cosmetics.isUnlocked(type, b[type], profile)) throw fail(`That ${type} isn't unlocked yet.`);
      set[`equipped.${type}`] = b[type];
    }
  }
  const fresh = await GamProfile.findByIdAndUpdate(profile._id, { $set: set }, { returnDocument: "after" }).lean();
  ok(res, { equipped: engine.resolveEquipped(fresh), optedOut: fresh.optedOut, showOnLeaderboard: fresh.showOnLeaderboard });
});

exports.cosmeticsList = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  const shape = (type) => cosmetics.CATALOG[type].map((c) => ({ ...c, type, unlocked: cosmetics.isUnlocked(type, c.id, profile) }));
  ok(res, { frames: shape("frame"), titles: shape("title"), themes: shape("theme"), equipped: engine.resolveEquipped(profile) });
});

// ── badges ──────────────────────────────────────────────────────────────
exports.badges = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req);
  const earnedRows = await UserBadge.find({ personKey: profile.personKey }).lean();
  const earned = new Map(earnedRows.map((e) => [e.badgeKey, e]));
  const custom = await CustomBadge.find({ organisation_id: profile.organisation_id, active: true }).lean();
  const list = BADGES.map((b) => {
    const e = earned.get(b.key);
    return { key: b.key, family: b.family, name: b.name, description: b.description, icon: b.icon, category: b.category, tier: b.tier, color: b.color, reward: b.reward, manual: b.criteria.type === "manual", earned: !!e, earnedAt: e && e.earnedAt, seen: e ? e.seen : true, note: e && e.note, progress: progressOf(b, profile) };
  });
  for (const c of custom) {
    const e = earned.get(`custom:${c._id}`);
    list.push({ key: `custom:${c._id}`, family: "custom", name: c.name, description: c.description, icon: c.icon, category: "organisation", tier: "special", color: c.color, reward: { xp: c.xp, coins: c.coins }, manual: true, earned: !!e, earnedAt: e && e.earnedAt, seen: e ? e.seen : true, note: e && e.note, progress: { current: e ? 1 : 0, target: 1 } });
  }
  ok(res, { badges: list, earnedCount: earnedRows.length, total: list.length, tiers: TIER_COLOR });
});

exports.badgesSeen = asyncHandler(async (req, res) => {
  const { key } = await who(req);
  await UserBadge.updateMany({ personKey: key, seen: false }, { $set: { seen: true } });
  ok(res);
});

// ── leaderboard / feed / seasons ────────────────────────────────────────
exports.leaderboard = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req);
  guardEnabled(settings);
  if (settings.modules.leaderboard === false) throw fail("Leaderboards are turned off.", 403);
  const period = ["today", "week", "month", "season", "all"].includes(req.query.period) ? req.query.period : "week";
  const limit = Math.min(settings.leaderboard.topN || 50, parseInt(req.query.limit) || 50);
  if (req.query.scope === "department") {
    if (settings.leaderboard.showDepartments === false) throw fail("Department rankings are turned off.", 403);
    return ok(res, { scope: "department", period, ...(await board.departmentBoard({ organisation_id: profile.organisation_id, period, settings })), myDepartment: profile.department });
  }
  const department = req.query.department === "mine" ? profile.department : req.query.department || undefined;
  ok(res, { scope: "individual", period, ...(await board.individualBoard({ organisation_id: profile.organisation_id, period, department, settings, viewerKey: profile.personKey, limit })) });
});

const FEED_EVENTS = ["badge_reward", "level_up", "streak_bonus", "challenge_reward", "season_reward", "weekly_win", "monthly_star", "anniversary_bonus", "birthday_bonus"];
exports.feed = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  const rows = await PointTx.find({ organisation_id: profile.organisation_id, event: { $in: FEED_EVENTS } }).sort({ createdAt: -1 }).limit(40).lean();
  const profs = await GamProfile.find({ personKey: { $in: [...new Set(rows.map((r) => r.personKey))] }, showOnLeaderboard: { $ne: false }, optedOut: { $ne: true } }).select("personKey name photo department").lean();
  const map = new Map(profs.map((p) => [p.personKey, p]));
  const badgeMap = Object.fromEntries(BADGES.map((b) => [b.key, b]));
  const items = rows.filter((r) => map.has(r.personKey)).slice(0, 25).map((r) => {
    const p = map.get(r.personKey);
    const m = r.meta || {};
    let text = (EVENTS[r.event] || {}).label || r.event;
    if (r.event === "badge_reward" && badgeMap[m.badge]) text = `earned the ${badgeMap[m.badge].name} badge`;
    else if (r.event === "level_up") text = `reached level ${m.level}`;
    else if (r.event === "streak_bonus") text = `hit a ${m.days}-day ${m.streak} streak`;
    else if (r.event === "anniversary_bonus") text = `celebrates ${m.years} year${m.years > 1 ? "s" : ""} with us`;
    else if (r.event === "birthday_bonus") text = "is celebrating a birthday today";
    return { id: String(r._id), name: p.name, photo: p.photo, department: p.department, icon: (EVENTS[r.event] || {}).icon, text, at: r.createdAt, mine: r.personKey === profile.personKey };
  });
  ok(res, { items });
});

exports.seasons = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  const rows = await GamSeason.find({ organisation_id: profile.organisation_id }).sort({ startsAt: -1 }).limit(12).lean();
  ok(res, { seasons: rows.map((s) => ({ id: String(s._id), name: s.name, theme: s.theme, startsAt: s.startsAt, endsAt: s.endsAt, status: s.status, prizes: s.prizes, winners: s.winners, departmentWinners: s.departmentWinners })) });
});

// ── quests ──────────────────────────────────────────────────────────────
exports.quests = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req);
  guardEnabled(settings);
  ok(res, await quests.listQuests(profile));
});
exports.questClaim = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  const r = await quests.claimQuest(profile, req.params.id);
  if (!r) throw fail("That quest isn't ready to claim.");
  ok(res, r);
});
exports.questClaimAll = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  ok(res, { claimed: await quests.claimAll(profile) });
});
exports.questReroll = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  const r = await quests.rerollDaily(profile, req.params.id);
  if (r.error) throw fail(r.error);
  ok(res, await quests.listQuests(await GamProfile.findById(profile._id).lean()));
});

// ── daily reward / spin / quiz / freeze ─────────────────────────────────
exports.dailyState = asyncHandler(async (req, res) => { const { profile } = await who(req); ok(res, await daily.dailyState(profile)); });
exports.dailyClaim = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req); guardEnabled(settings);
  const r = await daily.claimDaily(profile);
  if (r.error) throw fail(r.error);
  ok(res, r);
});
exports.spinState = asyncHandler(async (req, res) => { const { profile, settings } = await who(req); ok(res, daily.spinState(profile, settings)); });
exports.spin = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req); guardEnabled(settings);
  if (settings.modules.spin === false) throw fail("The lucky wheel is turned off.", 403);
  const r = await daily.doSpin(profile, settings, { extra: !!(req.body && req.body.extra) });
  if (r.error) throw fail(r.error);
  ok(res, r);
});
exports.quiz = asyncHandler(async (req, res) => { const { profile, settings } = await who(req); if (settings.modules.quiz === false) throw fail("The daily quiz is turned off.", 403); ok(res, await daily.quizState(profile)); });
exports.quizAnswer = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req); guardEnabled(settings);
  if (settings.modules.quiz === false) throw fail("The daily quiz is turned off.", 403);
  const r = await daily.answerQuiz(profile, req.body && req.body.choice);
  if (r.error) throw fail(r.error);
  ok(res, r);
});
exports.freezeBuy = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req);
  const r = await daily.buyFreeze(profile, settings);
  if (r.error) throw fail(r.error);
  ok(res, r);
});

// ── challenges ──────────────────────────────────────────────────────────
exports.challenges = asyncHandler(async (req, res) => { const { profile, settings } = await who(req); guardEnabled(settings); ok(res, { challenges: await challenges.listFor(profile) }); });
exports.challengeBoard = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  const GamChallenge = require("../Models/gamification/challenge.model");
  if (!mongoose.isValidObjectId(req.params.id)) throw fail("Not found.", 404);
  const c = await GamChallenge.findOne({ _id: req.params.id, organisation_id: profile.organisation_id }).lean();
  if (!c) throw fail("Not found.", 404);
  ok(res, { rows: await challenges.board(c, 15) });
});
exports.challengeJoin = asyncHandler(async (req, res) => { const { profile } = await who(req); const r = await challenges.join(profile, req.params.id); if (r.error) throw fail(r.error); ok(res); });
exports.challengeClaim = asyncHandler(async (req, res) => { const { profile } = await who(req); const r = await challenges.claim(profile, req.params.id); if (r.error) throw fail(r.error); ok(res, r); });

// ── rewards store ───────────────────────────────────────────────────────
exports.store = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req);
  guardEnabled(settings);
  if (settings.modules.store === false) throw fail("The rewards store is turned off.", 403);
  const items = await GamReward.find({ organisation_id: profile.organisation_id, active: true }).sort({ cost: 1 }).lean();
  const mine = await GamRedemption.aggregate([{ $match: { personKey: profile.personKey, status: { $nin: ["rejected", "cancelled"] } } }, { $group: { _id: "$reward", n: { $sum: 1 } } }]);
  const used = new Map(mine.map((m) => [String(m._id), m.n]));
  engine.safeAward({ organisation_id: profile.organisation_id, model: profile.personModel, id: profile.person, event: "store_visit", dedupeKey: `sv:${profile.personKey}` });
  ok(res, {
    coins: profile.coins,
    items: items.map((r) => ({
      id: String(r._id), name: r.name, description: r.description, icon: r.icon, category: r.category, cost: r.cost, stock: r.stock, minLevel: r.minLevel, perUserLimit: r.perUserLimit,
      requiresApproval: r.requiresApproval, effect: r.effect && r.effect.type !== "none" ? { type: r.effect.type, cosmeticType: r.effect.cosmeticType, cosmeticId: r.effect.cosmeticId } : null,
      usedByMe: used.get(String(r._id)) || 0, outOfStock: r.stock === 0, locked: (profile.level || 1) < r.minLevel,
    })),
    freeze: { cost: settings.streaks.freezeCost, have: profile.freezes || 0, max: settings.streaks.maxFreezes },
  });
});
exports.redeem = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req);
  guardEnabled(settings);
  const r = await store.redeem(profile, req.params.id, req.body && req.body.note, settings);
  if (r.error) throw fail(r.error);
  ok(res, { redemption: { id: String(r.redemption._id), status: r.redemption.status, result: r.redemption.result }, message: r.redemption.status === "fulfilled" ? "Redeemed — enjoy!" : "Request sent for approval." });
});
exports.myRedemptions = asyncHandler(async (req, res) => {
  const { key } = await who(req);
  const rows = await GamRedemption.find({ personKey: key }).sort({ createdAt: -1 }).limit(50).lean();
  ok(res, { items: rows.map((r) => ({ id: String(r._id), name: r.rewardName, icon: r.rewardIcon, cost: r.cost, status: r.status, adminNote: r.adminNote, result: r.result, at: r.createdAt, decidedAt: r.decidedAt })) });
});
exports.cancelRedemption = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  if (!mongoose.isValidObjectId(req.params.id)) throw fail("Not found.", 404);
  const r = await GamRedemption.findOneAndUpdate({ _id: req.params.id, personKey: profile.personKey, status: "pending" }, { $set: { status: "cancelled", decidedAt: new Date(), decidedBy: profile.personKey } }, { returnDocument: "after" });
  if (!r) throw fail("Only pending requests can be cancelled.");
  await store.refund(r, profile);
  ok(res);
});

// ── kudos ───────────────────────────────────────────────────────────────
exports.kudosMeta = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req);
  ok(res, { categories: GamKudos.CATEGORIES, reactions: kudos.REACTIONS, budget: kudos.monthBudget(profile, settings), limits: settings.kudos });
});
exports.kudosFeed = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req);
  if (settings.modules.kudos === false) throw fail("Kudos is turned off.", 403);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 15;
  const filter = { organisation_id: profile.organisation_id, hidden: false };
  if (req.query.view === "received") filter.toKey = profile.personKey;
  if (req.query.view === "given") filter.fromKey = profile.personKey;
  const [rows, total] = await Promise.all([
    GamKudos.find(filter).sort({ pinned: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    GamKudos.countDocuments(filter),
  ]);
  ok(res, { page, pages: Math.ceil(total / limit), total, items: rows.map((k) => kudos.shapeKudos(k, profile.personKey)) });
});
exports.kudosPeople = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return ok(res, { people: [] });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const out = [];
  for (const [model, file] of [["User", "../Models/user.model"], ["Manager", "../Models/manager.model"], ["Admin", "../Models/Admin.model"]]) {
    const Model = require(file);
    const docs = await Model.find({ organisation_id: profile.organisation_id, working_status: "working", $or: [{ f_name: rx }, { l_name: rx }] }).select("f_name l_name department designation profile_image").limit(8).lean();
    docs.forEach((d) => out.push({ key: `${model}:${d._id}`, name: `${d.f_name || ""} ${d.l_name || ""}`.trim(), department: d.department, designation: d.designation, photo: d.profile_image }));
  }
  ok(res, { people: out.filter((p) => p.key !== profile.personKey).slice(0, 10) });
});
exports.kudosGive = asyncHandler(async (req, res) => {
  const { profile, settings } = await who(req);
  guardEnabled(settings);
  const b = req.body || {};
  if (!b.toKey || !/^(User|Manager|Admin):[a-f0-9]{24}$/.test(b.toKey)) throw fail("Choose who you'd like to recognise.");
  const r = await kudos.give(profile, b.toKey, b, settings);
  if (r.error) throw fail(r.error);
  ok(res, { kudos: kudos.shapeKudos(r.kudos, profile.personKey), award: r.award, budget: r.budget });
});
exports.kudosReact = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  const r = await kudos.toggleReaction(profile, req.params.id, req.body && req.body.emoji);
  if (r.error) throw fail(r.error);
  ok(res, r);
});
exports.kudosComment = asyncHandler(async (req, res) => {
  const { profile } = await who(req);
  const text = String((req.body && req.body.text) || "").trim().slice(0, 300);
  if (!text) throw fail("Write a comment first.");
  if (!mongoose.isValidObjectId(req.params.id)) throw fail("Not found.", 404);
  const k = await GamKudos.findOneAndUpdate({ _id: req.params.id, organisation_id: profile.organisation_id, hidden: false }, { $push: { comments: { key: profile.personKey, name: profile.name, text } } }, { returnDocument: "after" }).lean();
  if (!k) throw fail("Not found.", 404);
  ok(res, { kudos: kudos.shapeKudos(k, profile.personKey) });
});

// ── managers & admins: team view and manual awards ──────────────────────
const isAdminRole = (r) => ["admin", "senior_admin", "super_admin"].includes(r);
const isManagerRole = (r) => ["manager", "senior_manager", "official"].includes(r);

exports.team = asyncHandler(async (req, res) => {
  const { profile, actor } = await who(req);
  if (!isManagerRole(actor.role) && !isAdminRole(actor.role)) throw fail("Only managers can view a team.", 403);
  const rows = await GamProfile.find({ organisation_id: profile.organisation_id, managerKey: profile.personKey }).sort({ xp: -1 }).lean();
  ok(res, { members: rows.map((p) => ({ personKey: p.personKey, name: p.name, photo: p.photo, designation: p.designation, level: p.level, xp: p.xp, badges: (p.badgeKeys || []).length, streak: (p.streaks && p.streaks.attendance && p.streaks.attendance.current) || 0, lastActiveAt: p.lastActiveAt })) });
});

exports.manualAward = asyncHandler(async (req, res) => {
  const { profile, settings, actor } = await who(req);
  guardEnabled(settings);
  if (!isManagerRole(actor.role) && !isAdminRole(actor.role)) throw fail("Only managers and admins can award points.", 403);
  const b = req.body || {};
  if (!/^(User|Manager|Admin):[a-f0-9]{24}$/.test(b.targetKey || "")) throw fail("Choose a person.");
  if (b.targetKey === profile.personKey) throw fail("You can't award yourself.");
  const xp = Math.max(0, Math.min(Math.round(Number(b.xp) || 0), 1000));
  const coins = Math.max(0, Math.min(Math.round(Number(b.coins) || 0), 1000));
  const reason = String(b.reason || "").trim().slice(0, 200);
  if (!xp && !coins) throw fail("Enter some XP or coins to award.");
  if (reason.length < 5) throw fail("Add a short reason so the person knows what it's for.");
  const target = await engine.getOrCreateProfile(profile.organisation_id, b.targetKey.split(":")[0], b.targetKey.split(":")[1]);
  if (!target || String(target.organisation_id) !== String(profile.organisation_id)) throw fail("Person not found.", 404);
  if (!isAdminRole(actor.role) && target.managerKey !== profile.personKey) throw fail("You can only award people who report to you.", 403);

  if (!isAdminRole(actor.role)) {
    const month = require("../utils/gamification/periods").periodKeys().month;
    const ab = profile.awardBudget && profile.awardBudget.monthKey === month ? profile.awardBudget : { monthKey: month, xp: 0, coins: 0 };
    if (ab.xp + xp > settings.manager.monthlyXpLimit || ab.coins + coins > settings.manager.monthlyCoinLimit)
      throw fail(`Monthly award budget reached (${settings.manager.monthlyXpLimit} XP / ${settings.manager.monthlyCoinLimit} coins). Remaining: ${Math.max(0, settings.manager.monthlyXpLimit - ab.xp)} XP / ${Math.max(0, settings.manager.monthlyCoinLimit - ab.coins)} coins.`);
    await GamProfile.updateOne({ _id: profile._id }, { $set: { "awardBudget.monthKey": month }, $inc: { "awardBudget.xp": xp, "awardBudget.coins": coins } });
  }
  const r = await engine.award({
    organisation_id: profile.organisation_id, model: target.personModel, id: target.person, event: "manual_award", xp, coins,
    dedupeKey: `manual:${profile.personKey}:${target.personKey}:${Date.now()}`, actorKey: profile.personKey, reason, force: true,
  });
  await engine.notifyPerson(target, { title: "🎖️ You were awarded by " + profile.name, message: `${reason} (+${xp} XP, +${coins} coins)`, priority: "medium" });
  ok(res, { award: r });
});

exports.meta = asyncHandler(async (req, res) => {
  ok(res, { categories: CATEGORIES, ranks: RANKS, titles: TITLES, levelThresholds: [2, 5, 10, 20, 30, 50, 75, 100].map((l) => ({ level: l, xp: threshold(l) })), events: Object.entries(EVENTS).filter(([, e]) => !e.system).map(([key, e]) => ({ key, label: e.label, icon: e.icon, category: e.category, xp: e.xp, coins: e.coins, dailyCap: e.dailyCap || 0, once: !!e.once })) });
});
