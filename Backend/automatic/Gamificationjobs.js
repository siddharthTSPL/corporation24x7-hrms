// Scheduled gamification work (all times IST):
//  * 00:20 daily  - finalise ended seasons / open auto seasons / finalise ended challenges
//  * 08:00 daily  - work-anniversary recognition
//  * Mon 09:00    - weekly leaderboard winners
//  * 1st 09:30    - Star of the Month + perfect-attendance month
const cron = require("node-cron");
const GamProfile = require("../Models/gamification/gamprofile.model");
const PointTx = require("../Models/gamification/pointtransaction.model");
const GamChallenge = require("../Models/gamification/challenge.model");
const engine = require("../utils/gamification/engine");
const seasons = require("../utils/gamification/seasons.service");
const challenges = require("../utils/gamification/challenges.service");
const { getSettings } = require("../utils/gamification/settings");
const { getISTDateParts, istDateFromYMD } = require("../utils/Istdate.utils");
const { weekRange, monthRange } = require("../utils/gamification/periods");

const orgIds = () => GamProfile.distinct("organisation_id");
const guard = (label, fn) => async () => { try { await fn(); } catch (e) { console.error(`[gamification:${label}]`, e.message); } };

const dailyHousekeeping = guard("housekeeping", async () => {
  for (const o of await orgIds()) {
    const settings = await getSettings(o);
    if (!settings.enabled) continue;
    await seasons.rollSeasons(o);
  }
  const ended = await GamChallenge.find({ status: "active", endsAt: { $lte: new Date() } }).lean();
  for (const c of ended) {
    if (!(await getSettings(c.organisation_id)).enabled) continue; // org has gamification OFF
    await challenges.finalise(c);
  }
});

const celebrations = guard("celebrations", async () => {
  const today = getISTDateParts();
  const cursor = GamProfile.find({ joinedAt: { $ne: null } }).select("organisation_id personModel person personKey joinedAt optedOut").cursor();
  const same = (d) => { if (!d) return false; const p = getISTDateParts(new Date(d)); return p.month === today.month && p.day === today.day; };
  for await (const p of cursor) {
    if (p.optedOut) continue;
    if (!(await getSettings(p.organisation_id)).enabled) continue; // org has gamification OFF
    const base = { organisation_id: p.organisation_id, model: p.personModel, id: p.person, force: false };
    if (same(p.joinedAt)) {
      const years = today.year - getISTDateParts(new Date(p.joinedAt)).year;
      if (years >= 1) await engine.safeAward({ ...base, event: "anniversary_bonus", xp: Math.min(1000, years * 100), coins: Math.min(500, years * 50), dedupeKey: `anniv:${p.personKey}:${today.year}`, meta: { years } });
    }
  }
});

// Top 3 individuals of the week that just ended.
const weeklyWinners = guard("weekly", async () => {
  const { from } = weekRange();
  const prev = { from: new Date(from.getTime() - 7 * 86400000), to: from };
  const label = `${prev.from.toISOString().slice(0, 10)}`;
  const prizes = [{ xp: 100, coins: 30 }, { xp: 60, coins: 20 }, { xp: 30, coins: 10 }];
  for (const o of await orgIds()) {
    const settings = await getSettings(o);
    if (!settings.enabled || settings.modules.leaderboard === false) continue;
    const top = await PointTx.aggregate([
      { $match: { organisation_id: o, createdAt: { $gte: prev.from, $lt: prev.to }, xp: { $gt: 0 }, event: { $nin: ["weekly_win", "monthly_star", "season_reward", "manual_award", "admin_adjust"] } } },
      { $group: { _id: "$personKey", xp: { $sum: "$xp" } } }, { $sort: { xp: -1 } }, { $limit: 8 },
    ]);
    const profs = await GamProfile.find({ personKey: { $in: top.map((t) => t._id) }, optedOut: { $ne: true }, showOnLeaderboard: { $ne: false } }).lean();
    const map = new Map(profs.map((p) => [p.personKey, p]));
    let rank = 0;
    for (const t of top) {
      const p = map.get(t._id);
      if (!p || rank >= 3 || t.xp < 20) continue;
      const pr = prizes[rank++];
      await engine.safeAward({ organisation_id: o, model: p.personModel, id: p.person, event: "weekly_win", xp: pr.xp, coins: pr.coins, dedupeKey: `ww:${label}:${p.personKey}`, force: true, reason: `Weekly leaderboard #${rank}` });
      await engine.notifyPerson(p, { title: `You were #${rank} on last week's leaderboard`, message: `${t.xp} XP earned. Bonus: +${pr.xp} XP and +${pr.coins} reward points.`, priority: "medium" });
    }
  }
});

const monthlyStar = guard("monthly", async () => {
  const cur = monthRange();
  const prev = monthRange(new Date(cur.from.getTime() - 86400000));
  const label = prev.from.toISOString().slice(0, 7);
  for (const o of await orgIds()) {
    const settings = await getSettings(o);
    if (!settings.enabled) continue;
    const top = await PointTx.aggregate([
      { $match: { organisation_id: o, createdAt: { $gte: prev.from, $lt: prev.to }, xp: { $gt: 0 }, event: { $nin: ["monthly_star", "weekly_win", "season_reward", "manual_award"] } } },
      { $group: { _id: "$personKey", xp: { $sum: "$xp" } } }, { $sort: { xp: -1 } }, { $limit: 5 },
    ]);
    for (const t of top) {
      const p = await GamProfile.findOne({ personKey: t._id, optedOut: { $ne: true }, showOnLeaderboard: { $ne: false } }).lean();
      if (!p || t.xp < 100) continue;
      await engine.safeAward({ organisation_id: o, model: p.personModel, id: p.person, event: "monthly_star", xp: 300, coins: 100, dedupeKey: `ms:${label}:${o}`, force: true, reason: "Top performer of the month" });
      await engine.notifyPerson(p, { title: "You are this month's top performer", message: `Top performer for ${label} with ${t.xp} XP. Bonus: +300 XP and +100 reward points.`, priority: "high" });
      break;
    }
    // Perfect attendance: nobody absent / half-day / late during the month.
    try {
      const Summary = require("../Models/attendancesummary.model");
      const Attendance = require("../Models/attendance.model");
      const { year, month } = getISTDateParts(prev.from);
      const rows = await Summary.find({ organisation_id: o, year, month, presentDays: { $gte: 10 }, absentDays: 0, halfDays: 0 }).select("employee role").lean();
      const modelOf = { employee: "User", manager: "Manager", admin: "Admin" };
      for (const r of rows) {
        const late = await Attendance.exists({ organisation_id: o, employee: r.employee, date: { $gte: prev.from, $lt: prev.to }, isLate: true });
        if (late) continue;
        await engine.safeAward({ organisation_id: o, model: modelOf[r.role] || "User", id: r.employee, event: "attendance_perfect_month", dedupeKey: `pm:${label}:${r.employee}` });
      }
    } catch (e) { console.error("[gamification:perfect-month]", e.message); }
  }
});

cron.schedule("20 0 * * *", dailyHousekeeping, { timezone: "Asia/Kolkata" });
cron.schedule("0 8 * * *", celebrations, { timezone: "Asia/Kolkata" });
cron.schedule("0 9 * * 1", weeklyWinners, { timezone: "Asia/Kolkata" });
cron.schedule("30 9 1 * *", monthlyStar, { timezone: "Asia/Kolkata" });

module.exports = { dailyHousekeeping, celebrations, weeklyWinners, monthlyStar };
