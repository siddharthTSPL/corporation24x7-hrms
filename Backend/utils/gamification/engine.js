// Gamification engine — the single place points are awarded.
//
//   safeAward({ organisation_id, model, id, event, meta?, dedupeKey? })
//
// never throws, so it is safe to call from any controller / model hook.
// An award: checks org settings + caps -> writes the ledger (idempotent via
// dedupeKey) -> updates the profile atomically -> handles streaks, level-ups,
// badges and quests -> pushes a live "gamification:event" to the browser.
const mongoose = require("mongoose");
const GamProfile = require("../../Models/gamification/gamprofile.model");
const PointTx = require("../../Models/gamification/pointtransaction.model");
const UserBadge = require("../../Models/gamification/userbadge.model");
const CustomBadge = require("../../Models/gamification/custombadge.model");
const { getSettings } = require("./settings");
const { EVENTS, resolveRule } = require("./catalog/events");
const { levelFromXp, levelUpCoins, rankForLevel, titleForLevel } = require("./catalog/levels");
const { BADGE_MAP, candidatesFor, meets } = require("./catalog/badges");
const { STREAK_EVENTS, advanceStreak, viewStreak } = require("./streaks");
const { toISTKey, periodKeys } = require("./periods");

const MAX_DEPTH = 3;
const ELIGIBLE = ["User", "Manager", "Admin"];

const log = (...a) => console.error("[gamification]", ...a);
const personKeyOf = (model, id) => `${model}:${String(id)}`;
const modelFromRole = (role) => {
  const r = String(role || "").toLowerCase();
  if (r === "employee" || r === "user") return "User";
  if (["manager", "senior_manager", "official"].includes(r)) return "Manager";
  if (["admin", "senior_admin"].includes(r)) return "Admin";
  if (r === "super_admin" || r === "superadmin") return "SuperAdmin";
  return null;
};

// ── identity ────────────────────────────────────────────────────────────
const MODEL_FILES = {
  User: "../../Models/user.model",
  Manager: "../../Models/manager.model",
  Admin: "../../Models/Admin.model",
};
const PERSON_FIELDS =
  "f_name l_name department designation profile_image Under_manager reporting_manager reporting_manager_model date_of_joining date_of_birth organisation_id working_status";

const loadIdentity = async (model, id) => {
  if (!MODEL_FILES[model] || !mongoose.isValidObjectId(String(id))) return null;
  const Model = require(MODEL_FILES[model]);
  const doc = await Model.findById(id).select(PERSON_FIELDS).lean();
  if (!doc) return null;
  let managerKey = "";
  if (model === "User" && doc.Under_manager) managerKey = personKeyOf("Manager", doc.Under_manager);
  else if (doc.reporting_manager && doc.reporting_manager_model) managerKey = personKeyOf(doc.reporting_manager_model, doc.reporting_manager);
  return {
    organisation_id: doc.organisation_id,
    name: `${doc.f_name || ""} ${doc.l_name || ""}`.trim() || "Employee",
    department: doc.department || "",
    designation: doc.designation || "",
    photo: doc.profile_image || "",
    managerKey,
    joinedAt: doc.date_of_joining || null,
    dob: doc.date_of_birth || null,
    working: !doc.working_status || doc.working_status === "working",
  };
};

const refreshIdentity = async (profile) => {
  try {
    const ident = await loadIdentity(profile.personModel, profile.person);
    if (!ident) return profile;
    const { working, organisation_id, ...fields } = ident;
    return (
      (await GamProfile.findByIdAndUpdate(profile._id, { $set: { ...fields, identityAt: new Date() } }, { returnDocument: "after" }).lean()) || profile
    );
  } catch (e) {
    return profile;
  }
};

const IDENTITY_TTL = 7 * 24 * 3600 * 1000;

const getOrCreateProfile = async (organisation_id, model, id, { fireWelcome = true } = {}) => {
  if (!ELIGIBLE.includes(model)) return null;
  const key = personKeyOf(model, id);
  let profile = await GamProfile.findOne({ personKey: key }).lean();
  if (profile) {
    if (!profile.identityAt || Date.now() - new Date(profile.identityAt).getTime() > IDENTITY_TTL) {
      refreshIdentity(profile).catch(() => {});
    }
    return profile;
  }
  const ident = await loadIdentity(model, id);
  if (!ident || !ident.working) return null;
  const { working, organisation_id: identOrg, ...fields } = ident;
  try {
    const created = await GamProfile.create({
      organisation_id: organisation_id || identOrg,
      personModel: model,
      person: id,
      personKey: key,
      ...fields,
      identityAt: new Date(),
    });
    profile = created.toObject();
    if (fireWelcome) setImmediate(() => award({ organisation_id: profile.organisation_id, model, id, event: "welcome", dedupeKey: `welcome:${key}` }).catch(() => {}));
  } catch (e) {
    if (e.code === 11000) profile = await GamProfile.findOne({ personKey: key }).lean();
    else throw e;
  }
  return profile;
};

// ── notifications / live push ───────────────────────────────────────────
const notifyPerson = async (profile, { title, message, priority = "low", meta = {} }) => {
  try {
    const { createNotification } = require("../Notification.utils");
    await createNotification({
      recipientModel: profile.personModel,
      recipientId: profile.person,
      organisation_id: profile.organisation_id,
      type: "gamification",
      title,
      message,
      link: "/gamification",
      priority,
      createdByModel: "System",
      meta,
    });
  } catch (e) { /* never block */ }
};

const pushLive = (profile, payload) => {
  try {
    const { emitToRecipient } = require("../../config/socket");
    emitToRecipient(profile.personModel, profile.person, "gamification:event", payload);
  } catch (e) { /* never block */ }
};

// ── badges ──────────────────────────────────────────────────────────────
const awardBadge = async (profile, badge, { grantedBy = "", note = "", depth = 0 } = {}) => {
  try {
    await UserBadge.create({ organisation_id: profile.organisation_id, personKey: profile.personKey, badgeKey: badge.key, grantedBy, note });
  } catch (e) {
    if (e.code === 11000) return null; // already has it
    throw e;
  }
  await GamProfile.updateOne({ _id: profile._id }, { $addToSet: { badgeKeys: badge.key } });
  const reward = badge.reward || { xp: 0, coins: 0 };
  if (reward.xp || reward.coins) {
    await award({
      organisation_id: profile.organisation_id,
      model: profile.personModel,
      id: profile.person,
      event: "badge_reward",
      xp: reward.xp,
      coins: reward.coins,
      dedupeKey: `badge:${profile.personKey}:${badge.key}`,
      meta: { badge: badge.key },
      reason: `Badge: ${badge.name}`,
      silent: true,
      _depth: depth + 1,
    });
  }
  await notifyPerson(profile, {
    title: `New achievement: ${badge.name}`,
    message: badge.description || "You earned a new achievement.",
    meta: { badge: badge.key },
  });
  return { key: badge.key, name: badge.name, icon: badge.icon, tier: badge.tier, description: badge.description, color: badge.color, xp: reward.xp, coins: reward.coins };
};

const grantCustomBadge = async (profile, customBadge, actorKey, note = "") => {
  const badge = {
    key: `custom:${customBadge._id}`,
    name: customBadge.name,
    description: customBadge.description,
    icon: customBadge.icon,
    tier: "special",
    color: customBadge.color,
    reward: { xp: customBadge.xp || 0, coins: customBadge.coins || 0 },
  };
  return awardBadge(profile, badge, { grantedBy: actorKey, note });
};

const evaluateBadges = async (profile, ctx, depth) => {
  const earned = new Set(profile.badgeKeys || []);
  const cands = candidatesFor(ctx).filter((b) => !earned.has(b.key));
  const unique = [...new Map(cands.map((b) => [b.key, b])).values()];
  const out = [];
  for (const b of unique) {
    if (!meets(b, profile)) continue;
    const got = await awardBadge(profile, b, { depth });
    if (got) out.push(got);
  }
  return out;
};

// Atomic per-day counters (xp earned + per-event counts). Per-field $inc so two
// concurrent awards can never overwrite each other; a new IST day swaps in a
// fresh object, guarded by the day key.
const bumpDaily = async (profileId, dayKey, xpDelta, event) => {
  for (let i = 0; i < 3; i++) {
    const a = await GamProfile.updateOne({ _id: profileId, "daily.key": dayKey }, { $inc: { "daily.xp": xpDelta, [`daily.counts.${event}`]: 1 } });
    if (a.modifiedCount) return;
    const b = await GamProfile.updateOne({ _id: profileId, "daily.key": { $ne: dayKey } }, { $set: { daily: { key: dayKey, xp: xpDelta, counts: { [event]: 1 } } } });
    if (b.modifiedCount) return;
  }
};

// ── main entry point ────────────────────────────────────────────────────
const skipped = (reason) => ({ ok: false, skipped: reason });

async function award(opts) {
  const {
    organisation_id, model, id, event,
    xp: xpOverride, coins: coinsOverride,
    dedupeKey, meta = {}, actorKey = "", reason = "",
    silent = false, force = false, _depth = 0,
  } = opts;

  if (!ELIGIBLE.includes(model) || !id || !event) return skipped("ineligible");
  if (_depth > MAX_DEPTH) return skipped("depth");
  const def = EVENTS[event];
  if (!def) return skipped("unknown_event");

  const settings = await getSettings(organisation_id);
  if (!settings.enabled) return skipped("disabled");
  if (!force && def.module && settings.modules && settings.modules[def.module] === false) return skipped("module_off");

  const rule = resolveRule(event, settings);
  if (!force && !rule.enabled) return skipped("rule_off");

  const profile = await getOrCreateProfile(organisation_id, model, id, { fireWelcome: event !== "welcome" });
  if (!profile) return skipped("no_profile");
  if (profile.optedOut && !force) return skipped("opted_out");
  if (profile.frozenAccount && !force) return skipped("frozen");

  let gainXp = Number.isFinite(xpOverride) ? Math.round(xpOverride) : rule.xp;
  let gainCoins = Number.isFinite(coinsOverride) ? Math.round(coinsOverride) : rule.coins;

  // once-per-lifetime events
  if (rule.once && (profile.stats || {})[event] > 0) return skipped("once");

  const todayKey = toISTKey();
  const daily = profile.daily && profile.daily.key === todayKey ? profile.daily : { key: todayKey, xp: 0, counts: {} };
  const counts = daily.counts || {};
  if (!force && rule.dailyCap && (counts[event] || 0) >= rule.dailyCap) return skipped("event_cap");

  let capped = false;
  if (!force && !rule.capExempt && settings.dailyXpCap > 0 && gainXp > 0) {
    const room = Math.max(0, settings.dailyXpCap - (daily.xp || 0));
    if (room <= 0) return skipped("daily_cap");
    if (gainXp > room) { gainXp = room; capped = true; }
  }

  if (gainXp === 0 && gainCoins === 0 && !def.system && !["spin_played", "quiz_attempt", "store_visit", "welcome"].includes(event) && !meta.countOnly) {
    return skipped("zero");
  }

  // spending: atomic balance check first
  if (gainCoins < 0) {
    const spend = -gainCoins;
    const ok = await GamProfile.findOneAndUpdate(
      { _id: profile._id, coins: { $gte: spend } },
      { $inc: { coins: -spend, spentCoins: spend } },
      { returnDocument: "after" }
    ).lean();
    if (!ok) return { ok: false, skipped: "insufficient_coins" };
  }

  // idempotent ledger write
  try {
    await PointTx.create({
      organisation_id: profile.organisation_id,
      personKey: profile.personKey,
      personModel: model,
      person: profile.person,
      department: profile.department || "",
      event,
      xp: gainXp,
      coins: gainCoins,
      reason: String(reason || "").slice(0, 300),
      actorKey,
      dedupeKey: dedupeKey || undefined,
      meta,
    });
  } catch (e) {
    if (e.code === 11000) {
      if (gainCoins < 0) await GamProfile.updateOne({ _id: profile._id }, { $inc: { coins: -gainCoins, spentCoins: gainCoins } }); // undo spend
      return skipped("duplicate");
    }
    throw e;
  }

  // streak (activity events only)
  const streakName = STREAK_EVENTS[event];
  let streakResult = null;
  if (streakName && settings.modules.streaks !== false) streakResult = await advanceStreak(profile, streakName, todayKey);

  await bumpDaily(profile._id, todayKey, rule.capExempt ? 0 : Math.max(0, gainXp), event);
  const inc = { xp: gainXp, [`stats.${event}`]: 1, "stats._total": 1 };
  if (gainCoins > 0) { inc.coins = gainCoins; inc.lifetimeCoins = gainCoins; }
  const set = { lastActiveAt: new Date() };
  if (streakResult && streakResult.changed) {
    set[`streaks.${streakName}`] = streakResult.streak;
  }
  if (event === "anniversary_bonus" && meta.years) set["stats.anniversary_years"] = meta.years;

  let fresh = await GamProfile.findByIdAndUpdate(profile._id, { $inc: inc, $set: set }, { returnDocument: "after" }).lean();
  if (!fresh) return skipped("profile_gone");

  // level-ups
  const lv = levelFromXp(fresh.xp, settings.levelBase);
  const levelUps = [];
  if (lv.level > (fresh.level || 1)) {
    fresh = (await GamProfile.findByIdAndUpdate(profile._id, { $max: { level: lv.level } }, { returnDocument: "after" }).lean()) || fresh;
    for (let l = (profile.level || 1) + 1; l <= lv.level; l++) {
      const coinsBonus = levelUpCoins(l);
      await award({
        organisation_id: profile.organisation_id, model, id, event: "level_up", coins: coinsBonus,
        dedupeKey: `lvl:${profile.personKey}:${l}`, meta: { level: l }, silent: true, _depth: _depth + 1, force: true,
      });
      levelUps.push({ level: l, coins: coinsBonus, title: titleForLevel(l), rank: rankForLevel(l).label });
    }
    const top = levelUps[levelUps.length - 1];
    await notifyPerson(fresh, { title: `You reached level ${top.level}`, message: `New title: ${top.title} (${top.rank} tier). Bonus: +${top.coins} reward points.`, meta: { level: top.level } });
    fresh = (await GamProfile.findById(profile._id).lean()) || fresh;
  }

  // streak milestone bonus
  let milestone = null;
  if (streakResult && streakResult.milestone) {
    const m = streakResult.milestone;
    milestone = { name: streakName, days: m.days, xp: m.xp, coins: m.coins };
    await award({
      organisation_id: profile.organisation_id, model, id, event: "streak_bonus", xp: m.xp, coins: m.coins,
      dedupeKey: `streak:${profile.personKey}:${streakName}:${streakResult.streak.startKey}:${m.days}`,
      meta: { streak: streakName, days: m.days }, silent: true, _depth: _depth + 1, force: true,
    });
    await notifyPerson(fresh, { title: `${m.days}-day attendance consistency milestone`, message: `Bonus: +${m.xp} XP and +${m.coins} reward points.`, meta: { streak: streakName, days: m.days } });
    fresh = (await GamProfile.findById(profile._id).lean()) || fresh;
  }

  // badges
  let badges = [];
  if (settings.modules.badges !== false && _depth < MAX_DEPTH) {
    badges = await evaluateBadges(fresh, { event, streakName, levelChanged: levelUps.length > 0, xpChanged: gainXp > 0 }, _depth);
    if (badges.length) fresh = (await GamProfile.findById(profile._id).lean()) || fresh;
  }

  // quests
  let questsDone = [];
  if (settings.modules.quests !== false && !def.system) {
    try {
      const quests = require("./quests.service");
      questsDone = await quests.onEvent(fresh, event, 1, settings);
    } catch (e) { log("quests.onEvent failed", e.message); }
  }

  const result = {
    ok: true, event, xp: gainXp, coins: gainCoins, capped,
    level: lv.level, levelUps, badges, milestone, quests: questsDone,
    streak: streakResult && streakResult.changed ? { name: streakName, current: streakResult.streak.current } : null,
  };

  if (!silent && (gainXp > 0 || gainCoins > 0 || levelUps.length || badges.length || questsDone.length)) {
    pushLive(fresh, {
      event, label: def.label, icon: def.icon,
      xp: gainXp, coins: gainCoins, capped,
      level: lv.level, levelUps, badges, milestone,
      quests: questsDone.map((q) => ({ id: q._id, title: q.title, icon: q.icon, xp: q.xp, coins: q.coins })),
      totals: { xp: fresh.xp, coins: fresh.coins },
    });
  }
  return result;
}

const safeAward = async (opts) => {
  try {
    return await award(opts);
  } catch (e) {
    log(`award(${opts && opts.event}) failed:`, e && e.stack ? e.stack : e);
    return { ok: false, error: e && e.message };
  }
};

// ── read model: everything the UI needs about one person ────────────────
const buildSummary = async (profile, settings) => {
  const lv = levelFromXp(profile.xp, settings.levelBase);
  const rank = rankForLevel(lv.level);
  const todayKey = toISTKey();
  const daily = profile.daily && profile.daily.key === todayKey ? profile.daily : { xp: 0, counts: {} };
  return {
    personKey: profile.personKey,
    name: profile.name,
    department: profile.department,
    designation: profile.designation,
    photo: profile.photo,
    xp: profile.xp,
    coins: profile.coins,
    lifetimeCoins: profile.lifetimeCoins,
    spentCoins: profile.spentCoins,
    level: lv,
    rank: { key: rank.key, label: rank.label, color: rank.color },
    title: titleForLevel(lv.level),
    streak: await viewStreak(profile, "attendance", todayKey),
    badgeCount: (profile.badgeKeys || []).length,
    stats: profile.stats || {},
    today: { xp: daily.xp || 0, cap: settings.dailyXpCap, counts: daily.counts || {} },
    optedOut: !!profile.optedOut,
    showOnLeaderboard: profile.showOnLeaderboard !== false,
    periods: periodKeys(),
  };
};

module.exports = {
  award, safeAward, awardBadge, grantCustomBadge, evaluateBadges,
  getOrCreateProfile, loadIdentity, refreshIdentity,
  buildSummary, personKeyOf, modelFromRole, notifyPerson, pushLive, ELIGIBLE,
};
