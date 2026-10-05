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

module.exports = { fillHistoryGaps };
