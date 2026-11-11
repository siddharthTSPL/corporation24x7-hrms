const GamSeason = require("../../Models/gamification/season.model");
const GamProfile = require("../../Models/gamification/gamprofile.model");
const PointTx = require("../../Models/gamification/pointtransaction.model");
const engine = require("./engine");
const { getSettings } = require("./settings");
const { istDateFromYMD, getISTDateParts } = require("../Istdate.utils");

const finaliseSeason = async (season) => {
  const s = await GamSeason.findOneAndUpdate({ _id: season._id, status: { $ne: "finalised" } }, { $set: { status: "finalised" } }, { returnDocument: "after" }).lean();
  if (!s) return null;
  const match = { organisation_id: s.organisation_id, createdAt: { $gte: s.startsAt, $lt: s.endsAt }, xp: { $gt: 0 } };
  const grouped = await PointTx.aggregate([{ $match: match }, { $group: { _id: "$personKey", xp: { $sum: "$xp" } } }, { $sort: { xp: -1 } }, { $limit: 25 }]);
  const profiles = await GamProfile.find({ personKey: { $in: grouped.map((g) => g._id) }, optedOut: { $ne: true }, showOnLeaderboard: { $ne: false } }).lean();
  const map = new Map(profiles.map((p) => [p.personKey, p]));
  const eligible = grouped.filter((g) => map.has(g._id));
  const winners = [];
  for (let i = 0; i < eligible.length; i++) {
    const g = eligible[i];
    const p = map.get(g._id);
    const prize = (s.prizes || []).find((x) => x.rank === i + 1);
    winners.push({ rank: i + 1, personKey: g._id, name: p.name, department: p.department, photo: p.photo, xp: g.xp, label: prize ? prize.label : "" });
    if (!prize) continue;
    await engine.award({ organisation_id: s.organisation_id, model: p.personModel, id: p.person, event: "season_reward", xp: prize.xp, coins: prize.coins, dedupeKey: `season:${s._id}:${g._id}`, reason: `${s.name}: ${prize.label || `#${i + 1}`}`, force: true });
    if (i === 0) await engine.award({ organisation_id: s.organisation_id, model: p.personModel, id: p.person, event: "season_win", dedupeKey: `seasonwin:${s._id}`, silent: true, force: true, meta: { countOnly: true } });
    await engine.notifyPerson(p, { title: `${s.theme || "🏟️"} ${s.name} finished`, message: `You placed #${i + 1}! +${prize.xp} XP, +${prize.coins} coins.`, priority: "medium" });
  }
  const depts = await PointTx.aggregate([{ $match: { ...match, department: { $ne: "" } } }, { $group: { _id: "$department", xp: { $sum: "$xp" } } }, { $sort: { xp: -1 } }, { $limit: 3 }]);
  await GamSeason.updateOne({ _id: s._id }, { $set: { winners, departmentWinners: depts.map((d, i) => ({ rank: i + 1, department: d._id, xp: d.xp })) } });
  return winners;
};

const nextWindow = (auto, now = new Date()) => {
  const { year, month } = getISTDateParts(now);
  if (auto === "quarterly") {
    const q = Math.floor((month - 1) / 3);
    const sm = q * 3 + 1;
    const em = sm + 3;
    return { startsAt: istDateFromYMD(year, sm, 1), endsAt: istDateFromYMD(em > 12 ? year + 1 : year, em > 12 ? em - 12 : em, 1), name: `Q${q + 1} ${year} Season` };
  }
  const em = month === 12 ? 1 : month + 1;
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return { startsAt: istDateFromYMD(year, month, 1), endsAt: istDateFromYMD(month === 12 ? year + 1 : year, em, 1), name: `${names[month - 1]} ${year} Season` };
};

// Cron helper: finalise ended seasons, open auto seasons.
const rollSeasons = async (organisation_id) => {
  const now = new Date();
  const ended = await GamSeason.find({ organisation_id, status: { $ne: "finalised" }, endsAt: { $lte: now } }).lean();
  for (const s of ended) await finaliseSeason(s);
  const settings = await getSettings(organisation_id);
  const auto = settings.seasons && settings.seasons.auto;
  if (auto && auto !== "none") {
    const active = await GamSeason.exists({ organisation_id, status: "active", startsAt: { $lte: now }, endsAt: { $gt: now } });
    if (!active) {
      const w = nextWindow(auto, now);
      const dupe = await GamSeason.exists({ organisation_id, startsAt: w.startsAt, endsAt: w.endsAt });
      if (!dupe) await GamSeason.create({ organisation_id, ...w, createdBy: "auto" });
    }
  }
};

module.exports = { finaliseSeason, rollSeasons, nextWindow };
