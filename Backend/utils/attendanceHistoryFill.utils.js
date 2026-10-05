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
const fillHistoryGaps = async ({ organisation_id, personId, roleKey, rows, rangeStart, rangeEnd }) => {
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

  out.sort((a, b) => new Date(b.date) - new Date(a.date));
  return out;
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
          });
          result.set(p.id, {
            paidDays: filled.reduce((sum, r) => sum + dayPaidValue(r), 0),
            totalDays: filled.length,
          });
        } catch (err) {
          console.error("[computeMonthPaidDays] failed for", p.id, err.message);
          result.set(p.id, { paidDays: null, totalDays: null });
        }
      })
    );
  }
  return result;
};

module.exports = { fillHistoryGaps, computeMonthPaidDays, dayPaidValue };