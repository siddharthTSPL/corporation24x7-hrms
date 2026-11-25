const Attendance = require("../Models/attendance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const { startOfDay } = require("../automatic/weekoffcalendar");
const { getISTDateParts } = require("./Istdate.utils");
const { getLookbackWindow } = require("./Attendancewindow.utils");
const { resolveLeaveDayOverride } = require("./Leavelwpday.utils");

const DAY = 24 * 60 * 60 * 1000;

// Same approved-status lists the leave-aware reconcile / history use.
const ROLE_CONFIG = {
  employee: { LeaveModel: Leave, leaveField: "employee", approved: ["approved_manager", "approved_reporting_manager", "approved_admin"] },
  manager: { LeaveModel: ManagerLeave, leaveField: "manager", approved: ["approved_reporting_manager", "approved_admin"] },
  admin: { LeaveModel: AdminLeave, leaveField: "admin", approved: ["approved_reporting_manager", "approved_superadmin"] },
};

/**
 * Makes the stored Attendance.status of every day that sits inside an APPROVED
 * leave match that leave, whenever the leave was approved:
 *   full-day leave (el/sl/ml/pl/lwp) -> "absent" (the enum has no "leave";
 *                                        paid vs LWP is decided by the leave)
 *   half-day leave                   -> "present" becomes "half_day"
 *   comp_off                         -> "present"
 * Covers the last N days (default 45 / ATTENDANCE_LOOKBACK_DAYS) for all orgs
 * (or one org). A session that is still running (checked in, not checked out)
 * is left alone - the Today view / history already show it as On Leave at read
 * time, and checkout would overwrite the status anyway; the next run fixes it.
 *
 * Returns { scanned, corrected, months: ["2026-10", ...] } - the months whose
 * AttendanceSummary must be rebuilt afterwards.
 */
const syncLeaveStatuses = async ({ apply = true, days = null, organisationId = null } = {}) => {
  const win = getLookbackWindow(days);
  const today = startOfDay(new Date());
  const orgFilter = organisationId ? { organisation_id: organisationId } : {};

  let scanned = 0;
  const corrections = [];
  const months = new Set();

  for (const [role, cfg] of Object.entries(ROLE_CONFIG)) {
    const leaves = await cfg.LeaveModel.find({
      ...orgFilter,
      status: { $in: cfg.approved },
      startDate: { $lte: today },
      endDate: { $gte: win.windowStart },
    })
      .select(`${cfg.leaveField} startDate endDate leaveType lwpDays`)
      .lean();

    for (let i = 0; i < leaves.length; i += 20) {
      await Promise.all(
        leaves.slice(i, i + 20).map(async (leave) => {
          const from = new Date(Math.max(startOfDay(leave.startDate).getTime(), win.windowStart.getTime()));
          const to = new Date(Math.min(startOfDay(leave.endDate).getTime(), today.getTime()));
          if (from > to) return;

          const records = await Attendance.find({
            employee: leave[cfg.leaveField],
            role,
            date: { $gte: from, $lte: new Date(to.getTime() + DAY - 1) },
          })
            .select("date status checkIn checkOut checkoutRemark")
            .lean();

          for (const r of records) {
            scanned += 1;
            const running = r.checkIn && !r.checkOut && r.checkoutRemark !== "missed_checkout";
            if (running) continue;

            const ov = resolveLeaveDayOverride(leave, startOfDay(r.date));
            let target = ov.status; // "absent" | "half_day" | "present"
            if (leave.leaveType.startsWith("half_day") && r.status !== "present") target = r.status;
            if (r.status === target) continue;

            corrections.push({ _id: r._id, status: target });
            const p = getISTDateParts(r.date);
            months.add(`${p.year}-${p.month}`);
          }
        })
      );
    }
  }

  if (apply && corrections.length) {
    await Attendance.bulkWrite(
      corrections.map((c) => ({ updateOne: { filter: { _id: c._id }, update: { $set: { status: c.status } } } })),
      { ordered: false }
    );
  }

  return { scanned, corrected: corrections.length, months: [...months] };
};

module.exports = { syncLeaveStatuses };