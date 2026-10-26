// ONE source of truth for "what happened on each day" so the Daily Register,
// the Monthly Summary and the existing Attendance History screen can never
// disagree: it calls the same fillHistoryGaps() the history screen and the
// payroll paid-days list already use (approved leave outranks check-ins,
// holidays / week-offs / rotational schedules / timesheet fallback included).
const Attendance = require("../../Models/attendance.model");
const PayrollPolicy = require("../../Models/payrollpolicy.model");
const { fillHistoryGaps, dayPaidValue } = require("../../utils/attendanceHistoryFill.utils");
const { shapeSyncConfig } = require("../../utils/Timesheetovertime.utils");
const { OID } = require("../engine/people");

const CONCURRENCY = 8;

async function standardMinutesFor(ctx) {
  const policy = await PayrollPolicy.findOne({ organisation_id: ctx.orgId }).select("timesheetSync").lean();
  return shapeSyncConfig(policy).standardHoursPerDay * 60;
}

/**
 * Yields { person, days: [ {date,status,checkIn,checkOut,leaveType,isLwpDay,holidayName,isLate,lateMinutes,source,...} ] }
 * for each person, in chunks of CONCURRENCY. `people` must come from loadPeople()
 * (so org + team scope is already applied). SuperAdmin has no attendance.
 */
async function* dayRowsByPerson(ctx, people, rangeStart, rangeEnd) {
  const eligible = people.filter((p) => p.roleKey);
  const standardMinutes = await standardMinutesFor(ctx);
  for (let i = 0; i < eligible.length; i += CONCURRENCY) {
    const chunk = eligible.slice(i, i + CONCURRENCY);
    // One attendance query for the whole chunk; org filter is always applied.
    const recs = await Attendance.find({
      organisation_id: ctx.orgId,
      employee: { $in: chunk.map((p) => OID(p.id)) },
      date: { $gte: rangeStart, $lte: rangeEnd },
    })
      .select("employee date status checkIn checkOut isLate lateMinutes")
      .lean();
    const byPerson = new Map();
    for (const r of recs) {
      const k = String(r.employee);
      if (!byPerson.has(k)) byPerson.set(k, []);
      byPerson.get(k).push(r);
    }
    const done = await Promise.all(
      chunk.map(async (person) => {
        const mine = byPerson.get(person.id) || [];
        const byDate = new Map(mine.map((r) => [r.date.getTime(), r]));
        const rows = mine.map((r) => ({ id: String(r._id), date: r.date, status: r.status || "absent" }));
        const days = await fillHistoryGaps({
          organisation_id: ctx.orgId,
          personId: OID(person.id),
          roleKey: person.roleKey,
          rows,
          rangeStart,
          rangeEnd,
          standardMinutes,
        });
        // Re-attach times/late info for days that have a real attendance record.
        for (const d of days) {
          const rec = byDate.get(new Date(d.date).getTime());
          if (rec) { d.checkIn = rec.checkIn || d.checkIn; d.checkOut = rec.checkOut || d.checkOut; d.isLate = rec.isLate; d.lateMinutes = rec.lateMinutes; }
        }
        days.sort((a, b) => new Date(a.date) - new Date(b.date));
        return { person, days };
      })
    );
    for (const item of done) yield item;
  }
}

module.exports = { dayRowsByPerson, dayPaidValue };
