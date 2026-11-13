const GamSettings = require("../../Models/gamification/gamsettings.model");

const DEFAULTS = {
  enabled: true,
  modules: {
    attendance: true, timesheet: true, training: true, review: true, policy: true,
    meetings: true, tickets: true, kudos: true, store: true,
    streaks: true, quests: true, challenges: true, seasons: true, badges: true, leaderboard: true,
  },
  rules: {},
  dailyXpCap: 400,
  levelBase: 80,
  leaderboard: { showDepartments: true, showCoins: false, topN: 50 },
  kudos: { monthlyAllowance: 100, maxCoinsPerKudos: 25, maxPerDayPerPerson: 2, dailyLimit: 5, minMessageLength: 10 },
  manager: { monthlyXpLimit: 300, monthlyCoinLimit: 100 },
  seasons: { auto: "none" }, // none | monthly | quarterly
};

const deepMerge = (base, over) => {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object") out[k] = deepMerge(base[k], v);
    else if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
};

const cache = new Map(); // orgId -> { at, value }
const TTL = 30 * 1000;

// Master switch lives on the organisation (SuperAdmin) document and defaults
// to OFF. Only the SuperAdmin can flip it. Everything that reads
// settings.enabled (engine, hooks, jobs, controllers) honours it automatically.
const isOrgEnabled = async (organisation_id) => {
  const SuperAdmin = require("../../Models/superadmin.model");
  const org = await SuperAdmin.findById(organisation_id).select("gamification.enabled").lean();
  return org?.gamification?.enabled === true;
};

const getSettings = async (organisation_id) => {
  const key = String(organisation_id);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const [doc, masterOn] = await Promise.all([
    GamSettings.findOne({ organisation_id }).lean(),
    isOrgEnabled(organisation_id).catch(() => false),
  ]);
  const value = deepMerge(DEFAULTS, doc || {});
  value._id = undefined;
  value.masterEnabled = masterOn;
  value.enabled = masterOn && value.enabled !== false;
  cache.set(key, { at: Date.now(), value });
  return value;
};

const invalidateSettings = (organisation_id) => cache.delete(String(organisation_id));

const clampInt = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
};

// Only whitelisted keys are accepted from the admin UI, with clamped values.
const sanitiseUpdate = (body = {}) => {
  const out = {};
  if (typeof body.enabled === "boolean") out.enabled = body.enabled;
  if (body.dailyXpCap !== undefined) out.dailyXpCap = clampInt(body.dailyXpCap, 0, 5000, DEFAULTS.dailyXpCap);
  if (body.levelBase !== undefined) out.levelBase = clampInt(body.levelBase, 20, 400, DEFAULTS.levelBase);
  if (body.modules && typeof body.modules === "object") {
    out.modules = {};
    for (const k of Object.keys(DEFAULTS.modules)) if (typeof body.modules[k] === "boolean") out.modules[k] = body.modules[k];
  }
  if (body.rules && typeof body.rules === "object") {
    const { EVENTS } = require("./catalog/events");
    out.rules = {};
    for (const [event, r] of Object.entries(body.rules)) {
      if (!EVENTS[event] || EVENTS[event].system || !r || typeof r !== "object") continue;
      out.rules[event] = {};
      if (typeof r.enabled === "boolean") out.rules[event].enabled = r.enabled;
      if (r.xp !== undefined) out.rules[event].xp = clampInt(r.xp, 0, 1000, EVENTS[event].xp);
      if (r.coins !== undefined) out.rules[event].coins = clampInt(r.coins, 0, 1000, EVENTS[event].coins);
      if (r.dailyCap !== undefined) out.rules[event].dailyCap = clampInt(r.dailyCap, 0, 50, 0);
    }
  }
  if (body.leaderboard) out.leaderboard = {
    showDepartments: body.leaderboard.showDepartments !== false,
    showCoins: !!body.leaderboard.showCoins,
    topN: clampInt(body.leaderboard.topN, 5, 200, 50),
  };
  if (body.kudos) out.kudos = {
    monthlyAllowance: clampInt(body.kudos.monthlyAllowance, 0, 5000, 100),
    maxCoinsPerKudos: clampInt(body.kudos.maxCoinsPerKudos, 0, 500, 25),
    maxPerDayPerPerson: clampInt(body.kudos.maxPerDayPerPerson, 1, 10, 2),
    dailyLimit: clampInt(body.kudos.dailyLimit, 1, 50, 5),
    minMessageLength: clampInt(body.kudos.minMessageLength, 0, 200, 10),
  };
  if (body.manager) out.manager = {
    monthlyXpLimit: clampInt(body.manager.monthlyXpLimit, 0, 100000, 300),
    monthlyCoinLimit: clampInt(body.manager.monthlyCoinLimit, 0, 100000, 100),
  };
  if (body.seasons && ["none", "monthly", "quarterly"].includes(body.seasons.auto)) out.seasons = { auto: body.seasons.auto };
  return out;
};

module.exports = { DEFAULTS, getSettings, isOrgEnabled, invalidateSettings, sanitiseUpdate, deepMerge };
