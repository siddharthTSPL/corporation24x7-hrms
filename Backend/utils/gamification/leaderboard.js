const GamProfile = require("../../Models/gamification/gamprofile.model");
const PointTx = require("../../Models/gamification/pointtransaction.model");
const GamSeason = require("../../Models/gamification/season.model");
const { levelFromXp, rankForLevel } = require("./catalog/levels");
const { resolveEquipped } = require("./engine");
const { weekRange, monthRange } = require("./periods");
const { startOfISTDay } = require("../Istdate.utils");

const currentSeason = async (organisation_id) => {
  const now = new Date();
  return GamSeason.findOne({ organisation_id, status: "active", startsAt: { $lte: now }, endsAt: { $gte: now } }).sort({ startsAt: -1 }).lean();
};

const rangeFor = async (organisation_id, period) => {
  const now = new Date();
  if (period === "today") { const from = startOfISTDay(now); return { from, to: new Date(from.getTime() + 86400000), label: "Today" }; }
  if (period === "week") return { ...weekRange(now), label: "This week" };
  if (period === "month") return { ...monthRange(now), label: "This month" };
  if (period === "season") {
    const s = await currentSeason(organisation_id);
    if (s) return { from: s.startsAt, to: s.endsAt, label: s.name, season: s };
    return { ...monthRange(now), label: "This month (no active season)" };
  }
  return null; // all time
};

const shapeRow = (p, xp, settings, extra = {}) => {
  const lv = levelFromXp(p.xp, settings.levelBase);
  const eq = resolveEquipped(p);
  return {
    personKey: p.personKey, name: p.name, department: p.department, designation: p.designation, photo: p.photo,
    level: lv.level, rank: rankForLevel(lv.level).key, xp, title: eq.title, frame: eq.frame, badgeCount: (p.badgeKeys || []).length, ...extra,
  };
};

const individualBoard = async ({ organisation_id, period, department, settings, viewerKey, limit }) => {
  const range = await rangeFor(organisation_id, period);
  let ranked; // [{ profile, xp }]
  if (!range) {
    const q = { organisation_id, showOnLeaderboard: { $ne: false }, optedOut: { $ne: true }, xp: { $gt: 0 } };
    if (department) q.department = department;
    const rows = await GamProfile.find(q).sort({ xp: -1 }).limit(2000).lean();
    ranked = rows.map((p) => ({ profile: p, xp: p.xp }));
  } else {
    const match = { organisation_id, createdAt: { $gte: range.from, $lt: range.to }, xp: { $gt: 0 } };
    if (department) match.department = department;
    const grouped = await PointTx.aggregate([
      { $match: match },
      { $group: { _id: "$personKey", xp: { $sum: "$xp" } } },
      { $sort: { xp: -1 } },
      { $limit: 3000 },
    ]);
    const profiles = await GamProfile.find({ personKey: { $in: grouped.map((g) => g._id) }, showOnLeaderboard: { $ne: false }, optedOut: { $ne: true } }).lean();
    const byKey = new Map(profiles.map((p) => [p.personKey, p]));
    ranked = grouped.filter((g) => byKey.has(g._id)).slice(0, 2000).map((g) => ({ profile: byKey.get(g._id), xp: g.xp }));
  }
  const rows = ranked.slice(0, limit).map((r, i) => shapeRow(r.profile, r.xp, settings, { position: i + 1 }));
  const idx = ranked.findIndex((r) => r.profile.personKey === viewerKey);
  const me = idx >= 0 ? { position: idx + 1, xp: ranked[idx].xp, of: ranked.length, gapToNext: idx > 0 ? ranked[idx - 1].xp - ranked[idx].xp : 0 } : null;
  return { rows, me, label: range ? range.label : "All time", from: range && range.from, to: range && range.to, total: ranked.length };
};

const departmentBoard = async ({ organisation_id, period, settings }) => {
  const range = await rangeFor(organisation_id, period);
  const heads = await GamProfile.aggregate([
    { $match: { organisation_id, department: { $ne: "" }, optedOut: { $ne: true } } },
    { $group: { _id: "$department", headcount: { $sum: 1 }, lifetimeXp: { $sum: "$xp" } } },
  ]);
  const headMap = new Map(heads.map((h) => [h._id, h]));
  let totals;
  if (!range) totals = heads.map((h) => ({ _id: h._id, xp: h.lifetimeXp, active: h.headcount }));
  else {
    totals = await PointTx.aggregate([
      { $match: { organisation_id, createdAt: { $gte: range.from, $lt: range.to }, xp: { $gt: 0 }, department: { $ne: "" } } },
      { $group: { _id: { d: "$department", p: "$personKey" }, xp: { $sum: "$xp" } } },
      { $group: { _id: "$_id.d", xp: { $sum: "$xp" }, active: { $sum: 1 } } },
    ]);
  }
  const rows = totals
    .map((t) => {
      const h = headMap.get(t._id) || { headcount: t.active || 1 };
      return { department: t._id, xp: t.xp, active: t.active, headcount: h.headcount, perHead: Math.round(t.xp / Math.max(1, h.headcount)) };
    })
    .sort((a, b) => b.perHead - a.perHead)
    .map((r, i) => ({ ...r, position: i + 1 }));
  return { rows, label: range ? range.label : "All time" };
};

module.exports = { individualBoard, departmentBoard, rangeFor, currentSeason };
