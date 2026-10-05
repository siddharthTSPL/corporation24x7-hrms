const mongoose = require("mongoose");
const Attendance = require("../Models/attendance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const { classifyNonWorkingDay, startOfDay } = require("../automatic/weekoffcalendar");
const { toISTKey } = require("./Istdate.utils");
const TimeLog = require("../Models/Timelog.model");
const Timesheet = require("../Models/Timesheet.model");
const PayrollPolicy = require("../Models/payrollpolicy.model");
const { shapeSyncConfig } = require("./Timesheetovertime.utils");
// Same 85% / 50% rule payroll uses for timesheet-basis employees.
const { classifyDay } = require("./Timesheetattendance.utils");
// NOTE: keep this require string identical to the one used by
// automatic/Marknoshowabsent.js (same file on disk).
const { isDateInLwpPortion } = require("./leaveLwpDay.utils");

const ROLE_CONFIG = {
  employee: {
    Model: User, onModel: "User", LeaveModel: Leave, leaveField: "employee",
    approved: ["approved_manager", "approved_admin"],
  },
  manager: {
    Model: Manager, onModel: "Manager", LeaveModel: ManagerLeave, leaveField: "manager",
    approved: ["approved_reporting_manager", "approved_admin"],
  },
  admin: {
    Model: Admin, onModel: "Admin", LeaveModel: AdminLeave, leaveField: "admin",
    approved: ["approved_superadmin"],
  },
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * The admin/superadmin "Attendance History" only listed days that have an
 * Attendance record, so week-offs, holidays, approved-leave days and no-show
 * days were simply missing. This adds one row per missing calendar day in the
 * requested range:
 *   status "week_off" | "holiday" | "leave" (with leaveType) | "absent"
 * and tags existing rows that sit on an approved leave with `leaveType`.
 * Today is only filled when it is already a known week-off/holiday/leave
 * (the person may still check in later, so it is never marked absent).
 */
const fillHistoryGaps = async ({ organisation_id, personId, roleKey, rows, rangeStart, rangeEnd, standardMinutes }) => {
  const cfg = ROLE_CONFIG[roleKey] || ROLE_CONFIG.employee;

  const [emp, leaves] = await Promise.all([
    cfg.Model.findById(personId).select("date_of_joining createdAt").lean(),
    cfg.LeaveModel.find({
      [cfg.leaveField]: personId,
      status: { $in: cfg.approved },
      startDate: { $lte: rangeEnd },
      endDate: { $gte: rangeStart },
    }).select("startDate endDate leaveType lwpDays").lean(),
  ]);

  const joinDate = emp ? startOfDay(emp.date_of_joining || emp.createdAt || 0) : null;
  const leaveFor = (date) =>
    leaves.find((l) => date >= startOfDay(l.startDate) && date <= startOfDay(l.endDate)) || null;

  const byKey = new Map(rows.map((r) => [toISTKey(r.date), r]));
  const out = rows.map((r) => {
    const l = leaveFor(startOfDay(r.date));
    return l ? { ...r, leaveType: l.leaveType } : r;
  });

  const today = startOfDay(new Date());
  const last = startOfDay(rangeEnd) < today ? startOfDay(rangeEnd) : today;

  for (let cursor = startOfDay(rangeStart); cursor <= last; cursor = new Date(cursor.getTime() + DAY)) {
    const key = toISTKey(cursor);
    if (byKey.has(key)) continue;
    if (joinDate && cursor < joinDate) continue;

    const nonWorking = await classifyNonWorkingDay(cursor, organisation_id, personId, cfg.onModel);
    const base = {
      id: `gap-${key}`,
      date: cursor,
      checkIn: null,
      checkOut: null,
      source: null,
      synthetic: true,
      activeMinutes: 0,
      idleMinutes: 0,
      isLate: false,
      lateMinutes: 0,
      overtimeMinutes: 0,
      checkoutRemark: null,
      checkInGate: null,
      checkOutGate: null,
    };

    if (nonWorking.type === "holiday") {
      out.push({ ...base, status: "holiday", holidayName: nonWorking.name || null });
    } else if (nonWorking.type === "week_off") {
      out.push({ ...base, status: "week_off" });
    } else if (nonWorking.type === "unconfigured") {
      continue; // org never configured this week's off-days - don't guess
    } else {
      const l = leaveFor(cursor);
      if (l) {
        out.push({ ...base, status: "leave", leaveType: l.leaveType, isLwpDay: l.leaveType === "lwp" || isDateInLwpPortion(l, cursor) });
      } else if (cursor < today) {
        out.push({ ...base, status: "absent" });
      }
    }
  }

  await applyTimesheetFallback({ organisation_id, personId, onModel: cfg.onModel, rows: out, today, standardMinutes });

  out.sort((a, b) => new Date(b.date) - new Date(a.date));
  return out;
};

// Timesheet-based days are only applied from this IST date onward
// (1 Sept 2026). Earlier history stays attendance-only.
const TIMESHEET_FALLBACK_FROM_KEY = "2026-09-01";

/**
 * Attendance is always checked FIRST. Only a day (on/after 1 Sept 2026) that
 * attendance leaves as "absent" (no record / no-show / too little active
 * time) and that is not a leave, holiday or week-off is looked up in the
 * person's timesheet LOGS - any non-rejected timesheet (approved, pending or
 * not yet submitted); rejected ones are ignored. Same rule payroll uses:
 *   logged regular minutes >= 85% of standard day -> present (full day)
 *   >= 50%                                       -> half_day
 *   below 50% / nothing logged                   -> stays absent
 * Rows that used it get source "timesheet" + timesheetMinutes /
 * timesheetPercent / timesheetApproved. Mutates `rows` in place.
 */
const applyTimesheetFallback = async ({ organisation_id, personId, onModel, rows, today, standardMinutes }) => {
  const candidates = rows.filter(
    (r) =>
      r.status === "absent" &&
      !r.leaveType &&
      startOfDay(r.date) < today &&
      toISTKey(r.date) >= TIMESHEET_FALLBACK_FROM_KEY
  );
  if (!candidates.length) return;

  try {
    let stdMin = standardMinutes;
    if (!stdMin) {
      const policy = await PayrollPolicy.findOne({ organisation_id }).select("timesheetSync").lean();
      stdMin = shapeSyncConfig(policy).standardHoursPerDay * 60;
    }

    const times = candidates.map((r) => startOfDay(r.date).getTime());
    const from = new Date(Math.min(...times));
    const to = new Date(Math.max(...times) + DAY);

    const logs = await TimeLog.find({
      organisation_id,
      logged_by: personId,
      logged_by_model: onModel,
      log_date: { $gte: from, $lt: to },
      regular_minutes: { $gt: 0 },
    })
      .select("log_date regular_minutes timesheet")
      .lean();
    if (!logs.length) return;

    const tsIds = [...new Set(logs.filter((l) => l.timesheet).map((l) => String(l.timesheet)))];
    const sheets = tsIds.length
      ? await Timesheet.find({ _id: { $in: tsIds }, organisation_id }).select("_id status").lean()
      : [];
    const statusById = new Map(sheets.map((t) => [String(t._id), t.status]));

    // day -> { mins, allApproved }. Rejected timesheets never count; logs not
    // yet attached to a timesheet (or on draft / pending ones) do, flagged as
    // not-yet-approved so the screen can say so.
    const byDay = new Map();
    for (const log of logs) {
      const st = log.timesheet ? statusById.get(String(log.timesheet)) : null;
      if (st === "rejected") continue;
      const key = toISTKey(log.log_date);
      const cur = byDay.get(key) || { mins: 0, allApproved: true };
      cur.mins += log.regular_minutes || 0;
      if (st !== "approved") cur.allApproved = false;
      byDay.set(key, cur);
    }

    for (const r of candidates) {
      const day = byDay.get(toISTKey(r.date));
      const mins = day?.mins || 0;
      if (!mins) continue;
      const verdict = classifyDay(mins, stdMin);
      r.source = "timesheet";
      r.timesheetApproved = day.allApproved;
      r.timesheetMinutes = mins;
      r.timesheetPercent = Math.round((mins / stdMin) * 1000) / 10;
      if (verdict === "full") r.status = "present";
      else if (verdict === "half") r.status = "half_day";
    }
  } catch (err) {
    // Never break the history screen because the timesheet lookup failed -
    // the days simply stay absent, exactly as before.
    console.error("[applyTimesheetFallback] failed for", String(personId), err.message);
  }
};

// ── Paid-day classification (same rules as the frontend Exportcsv.js) ──────
// Present + Week Off + Paid Leave (+ Holiday, + Half Day as 0.5) are paid;
// everything else (no-show, LWP / unpaid leave, unknown) is Absent.
const dayPaidValue = (r) => {
  const paidLeave = !!r.leaveType && r.leaveType !== "lwp" && !r.isLwpDay;
  if (r.status === "present") return 1;
  if (r.status === "half_day") return paidLeave ? 1 : 0.5;
  if (r.status === "week_off" || r.status === "holiday") return 1;
  if (r.status === "leave") return r.isLwpDay || r.leaveType === "lwp" ? 0 : 1;
  if (r.status === "absent") return paidLeave ? 1 : 0;
  return 0;
};

/**
 * Month-wise Total Paid Days for many people at once, using exactly the same
 * day rows as the Attendance History screen (fillHistoryGaps), so the number
 * in the Monthly list always matches the History modal for that month.
 * people: [{ id, roleKey: "admin" | "manager" | "employee" }]
 * returns Map(id -> { paidDays, totalDays })
 */
const computeMonthPaidDays = async ({ organisation_id, people, month, year }) => {
  const rangeStart = startOfDay(new Date(year, month - 1, 1));
  const rangeEnd = startOfDay(new Date(year, month, 0));
  const result = new Map();
  const CHUNK = 8;
  const policy = await PayrollPolicy.findOne({ organisation_id }).select("timesheetSync").lean();
  const standardMinutes = shapeSyncConfig(policy).standardHoursPerDay * 60;

  for (let i = 0; i < people.length; i += CHUNK) {
    await Promise.all(
      people.slice(i, i + CHUNK).map(async (person) => {
        // History passes real ObjectIds; the overview list only has string ids.
        const p = { ...person, oid: new mongoose.Types.ObjectId(String(person.id)) };
        try {
          const records = await Attendance.find({
            organisation_id,
            employee: p.oid,
            date: { $gte: rangeStart, $lte: rangeEnd },
          })
            .select("date status")
            .lean();
          const rows = records.map((r) => ({ id: String(r._id), date: r.date, status: r.status || "absent" }));
          const filled = await fillHistoryGaps({
            organisation_id,
            personId: p.oid,
            roleKey: p.roleKey,
            rows,
            rangeStart,
            rangeEnd,
            standardMinutes,
          });
          result.set(p.id, {
            paidDays: filled.reduce((sum, r) => sum + dayPaidValue(r), 0),
            totalDays: filled.length,
            timesheetDays: filled.filter((r) => r.source === "timesheet" && (r.status === "present" || r.status === "half_day")).length,
          });
        } catch (err) {
          console.error("[computeMonthPaidDays] failed for", p.id, err.message);
          result.set(p.id, { paidDays: null, totalDays: null, timesheetDays: 0 });
        }
      })
    );
  }
  return result;
};

module.exports = { fillHistoryGaps, computeMonthPaidDays, dayPaidValue };