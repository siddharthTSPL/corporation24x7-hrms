
require("dotenv").config();
const mongoose = require("mongoose");

const SuperAdmin = require("../Models/superadmin.model");
const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const LeaveBalance = require("../Models/leavebalance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const Shift = require("../Models/shift.model");
const { updateSummary } = require("../automatic/monthattendanceupdate");
const { resolveEmployeeShift, evaluateCheckoutWindow } = require("../utils/shift.utils");
const { isDateInLwpPortion } = require("../utils/Leavelwpday.utils");
const { startOfISTDay, getISTDateParts, toISTKey } = require("../utils/Istdate.utils");

const ORG_CODE = "ORG-CE4C439F254A";
const APPLY = process.argv.includes("--apply");

// SIRF AAJ (IST) - koi date/time argument nahi.
const HH = 20, MM = 0;
const dayStart = startOfISTDay(new Date());
const CHECKOUT_AT = new Date(dayStart.getTime() + (HH * 60 + MM) * 60000);

// monthattendanceupdate.js ke hasApprovedLeave ki copy (wahan export nahi hai)
const hasApprovedLeave = async (employeeId, date, role, { excludeLwp = false } = {}) => {
  const checkDate = new Date(date);
  const id = new mongoose.Types.ObjectId(employeeId);
  const f = excludeLwp ? { leaveType: { $ne: "lwp" } } : {};
  const sel = "_id startDate endDate lwpDays";
  let leave;
  if (role === "manager") {
    leave = await ManagerLeave.findOne({
      manager: id, status: { $in: ["approved_reporting_manager", "approved_admin"] },
      startDate: { $lte: checkDate }, endDate: { $gte: checkDate }, ...f,
    }).select(sel).lean();
  } else if (role === "admin") {
    leave = await AdminLeave.findOne({
      admin: id, status: { $in: ["approved_reporting_manager", "approved_superadmin"] },
      startDate: { $lte: checkDate }, endDate: { $gte: checkDate }, ...f,
    }).select(sel).lean();
  } else {
    leave = await Leave.findOne({
      employee: id, status: { $in: ["approved_manager", "approved_reporting_manager", "approved_admin"] },
      startDate: { $lte: checkDate }, endDate: { $gte: checkDate }, ...f,
    }).select(sel).lean();
  }
  if (!leave) return false;
  if (excludeLwp && isDateInLwpPortion(leave, checkDate)) return false;
  return true;
};

(async () => {
  await mongoose.connect(process.env.LINK, { family: 4 });

  const org = await SuperAdmin.findOne({ organisation_id: ORG_CODE }).select("_id organisation_name").lean();
  if (!org) throw new Error(`Org ${ORG_CODE} not found`);

  console.log(`Org      : ${org.organisation_name} (${ORG_CODE})`);
  console.log(`Din (IST): ${toISTKey(dayStart)}`);
  console.log(`Checkout : ${CHECKOUT_AT.toISOString()}  (20:00 IST)`);
  console.log(APPLY ? "Mode     : APPLY\n" : "Mode     : DRY RUN\n");

  const open = await Attendance.find({
    organisation_id: org._id,
    date: dayStart,
    checkIn: { $exists: true, $ne: null },
    $or: [{ checkOut: { $exists: false } }, { checkOut: null }],
  }).lean();

  console.log(`Open check-ins mile: ${open.length}`);

  const shiftCache = new Map();
  const getShift = async (a) => {
    const key = String(a.shift || "default");
    if (!shiftCache.has(key)) {
      const s = a.shift ? await Shift.findById(a.shift).lean() : null;
      shiftCache.set(key, s || (await resolveEmployeeShift({}, a.organisation_id)));
    }
    return shiftCache.get(key);
  };

  let done = 0, skipped = 0;

  for (const a of open) {
    const tag = `${a.role}:${a.employee}`;

    if (a.source === "agent") { console.log(` - SKIP ${tag} (agent-only ping)`); skipped++; continue; }
    if (a.source === "field") { console.log(` - SKIP ${tag} (field duty)`); skipped++; continue; }
    if (new Date(a.checkIn) >= CHECKOUT_AT) { console.log(` - SKIP ${tag} (check-in 20:00 ke baad ka)`); skipped++; continue; }

    const shift = await getShift(a);
    const win = evaluateCheckoutWindow(shift, CHECKOUT_AT, a.checkIn);
    const elapsed = (CHECKOUT_AT.getTime() - new Date(a.checkIn).getTime()) / 60000;

    // "missed_checkout" => cron pehle hi half_day summary me jod chuka hai
    const alreadyCountedHalf = a.checkoutRemark === "missed_checkout";

    console.log(
      ` - ${APPLY ? "DONE" : "WILL"} ${tag} ${(elapsed / 60).toFixed(2)}h active=${Math.round(a.activeMinutes || 0)}m ` +
      `${a.status} -> present | remark=${win.remark} ot=${win.isOvertime ? win.overtimeMinutes : 0}m | ` +
      `summary: ${alreadyCountedHalf ? "half_day -> present (halfDays-1, presentDays+0.5, lwp-0.5 agar kata tha)" : "present +1"}` +
      `${a.isLate ? " | LATE" : ""}`
    );

    if (!APPLY) continue;

    const set = {
      checkOut: CHECKOUT_AT,
      status: "present",
      checkoutRemark: win.remark,
      overtimeMinutes: win.isOvertime ? win.overtimeMinutes : 0,
      autoCheckedOut: true,
      latePenalty: false, // full day dena hai, late penalty se half day nahi
    };
    if (a.source === "face") set.activeMinutes = Math.round(elapsed);

    const res = await Attendance.updateOne(
      { _id: a._id, $or: [{ checkOut: { $exists: false } }, { checkOut: null }] },
      { $set: set }
    );
    if (!res.modifiedCount) { console.log(`   (skip: record pehle hi badal chuka hai)`); skipped++; continue; }

    if (!alreadyCountedHalf) {
      await updateSummary({ ...a, ...set });
    } else {
      const [onPaidLeave, onAnyLeave] = await Promise.all([
        hasApprovedLeave(a.employee, a.date, a.role, { excludeLwp: true }),
        hasApprovedLeave(a.employee, a.date, a.role),
      ]);
      const { month, year } = getISTDateParts(a.date);
      const inc = { presentDays: 0.5 };
      if (!onPaidLeave) inc.halfDays = -1;
      await AttendanceSummary.updateOne({ employee: a.employee, role: a.role, month, year }, { $inc: inc });

      if (!onAnyLeave) {
        const r = await LeaveBalance.updateOne({ employee: a.employee, lwp: { $gte: 0.5 } }, { $inc: { lwp: -0.5 } });
        if (!r.modifiedCount) console.log(`   (lwp wapas nahi hua - balance me 0.5 LWP nahi mila)`);
      }
    }
    done++;
  }

  console.log(
    APPLY
      ? `\nKhatam. ${done} checkout + full day, ${skipped} skip.`
      : `\nDRY RUN - ${open.length - skipped} record(s) checkout + full day honge, ${skipped} skip. Save karne ke liye --apply lagao.`
  );
})()
  .catch((e) => { console.error("FAILED:", e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());