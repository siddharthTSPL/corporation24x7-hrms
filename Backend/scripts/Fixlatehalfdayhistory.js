/**
 * Fix full attendance HISTORY for two rules:
 *
 *  1) LATE RULE (monthly): in every IST month the first N late check-ins
 *     (N = org's allowedLatePerMonth, default 3) are free. From the (N+1)th
 *     late check-in of that month onward the day is a Half Day (0.5).
 *     Counter restarts on the 1st of every month.
 *
 *  2) HALF DAY SL / HALF DAY EL (0.5 leave):
 *       - SL / EL balance available -> leave half is paid -> day = 1
 *       - balance over (LWP)         -> leave half unpaid  -> day = 0.5
 *     Step (a) re-checks lwpDays of every half_day_el / half_day_sl leave by
 *     replaying the balance chronologically (only with --fix-lwp).
 *     Step (b) re-aligns Attendance.status with the leave and rebuilds
 *     AttendanceSummary for all touched months (always runs).
 *
 * Usage (from project root, DRY RUN by default - nothing is written):
 *   node scripts/Fixlatehalfdayhistory.js
 *   node scripts/Fixlatehalfdayhistory.js --from=2026-09 --to=2026-09
 *   node scripts/Fixlatehalfdayhistory.js --apply
 *   node scripts/Fixlatehalfdayhistory.js --apply --fix-lwp
 *
 * Flags:
 *   --apply            actually write changes
 *   --from=YYYY-MM     first month (default: earliest attendance month)
 *   --to=YYYY-MM       last month  (default: current IST month)
 *   --org=<orgId>      limit LATE step + LWP step to one organisation
 *   --employee=<id>    limit to one person (employee role)
 *   --allowed=3        override allowedLatePerMonth
 *   --force-late-rule  apply late rule even if the org has it switched OFF
 *   --fix-lwp          also recompute lwpDays of half-day SL/EL leaves and
 *                      adjust LeaveBalance (availed / pbc / lwp) accordingly
 *   --skip-late        skip step 1
 *   --skip-summary     skip the final AttendanceSummary rebuild
 *
 * Take a DB backup first. Payroll already generated for the corrected months
 * must be regenerated afterwards.
 */
const mongoose = require("mongoose");
require("dotenv").config();

const Attendance = require("../Models/attendance.model");
const SuperAdmin = require("../Models/superadmin.model");
const Shift = require("../Models/shift.model");
const LeaveBalance = require("../Models/leavebalance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const { shapeLateRule } = require("../utils/Laterule.utils");
const { getISTDateParts, istDateFromYMD } = require("../utils/Istdate.utils");
const { getShiftThresholds, calculateFaceStatus } = require("../utils/shift.utils");
const { calculateStatus } = require("../automatic/monthattendanceupdate");
const { isSandwichLeave } = require("../automatic/sandwitchleave");
const { recomputeSummaries } = require("./Reconcileattendancesummaryleaveaware");

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n) => {
  const a = argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split("=")[1] : null;
};

const APPLY = flag("apply");
const FIX_LWP = flag("fix-lwp");
const FORCE_LATE = flag("force-late-rule");
const SKIP_LATE = flag("skip-late");
const SKIP_SUMMARY = flag("skip-summary");
const ORG = opt("org");
const EMPLOYEE = opt("employee");
const ALLOWED_OVERRIDE = opt("allowed") !== null ? Number(opt("allowed")) : null;

const parseYM = (s) => {
  const m = /^(\d{4})-(\d{1,2})$/.exec(s || "");
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
};
const ymKey = ({ year, month }) => `${year}-${month}`;
const r2 = (n) => Math.round(n * 100) / 100;

// ───────────────────────── Step 1: monthly late rule ─────────────────────────
const fixLateRule = async (rangeStart, rangeEndExclusive) => {
  console.log("\n=== STEP 1: Late rule (monthly, free limit then Half Day) ===");

  const orgFilter = ORG ? { _id: ORG } : {};
  const orgs = await SuperAdmin.find(orgFilter).select("attendanceSettings organisation_name").lean();

  const shiftCache = new Map();
  const getShift = async (id) => {
    if (!id) return null;
    const k = String(id);
    if (!shiftCache.has(k)) shiftCache.set(k, await Shift.findById(id).lean());
    return shiftCache.get(k);
  };

  let totalCountFix = 0, totalToHalf = 0, totalRevert = 0;

  for (const org of orgs) {
    const rule = shapeLateRule(org);
    if (!rule.enabled && !FORCE_LATE) {
      console.log(`[SKIP] ${org.organisation_name || org._id}: late rule is OFF (turn it on in Attendance Settings, or use --force-late-rule)`);
      continue;
    }
    const allowed = ALLOWED_OVERRIDE !== null ? ALLOWED_OVERRIDE : rule.allowedLatePerMonth;

    const q = {
      organisation_id: org._id,
      isLate: true,
      date: { $gte: rangeStart, $lt: rangeEndExclusive },
    };
    if (EMPLOYEE) q.employee = EMPLOYEE;

    const lates = await Attendance.find(q)
      .select("employee role date status isLate latePenalty lateCountInMonth checkIn checkOut source activeMinutes shift checkoutRemark")
      .sort({ date: 1 })
      .lean();

    // person + IST month -> ordered late days (oldest first)
    const groups = new Map();
    for (const a of lates) {
      const { year, month } = getISTDateParts(a.date);
      const key = `${a.employee}_${a.role}_${year}_${month}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }

    const ops = [];
    let countFix = 0, toHalf = 0, revert = 0;

    for (const list of groups.values()) {
      list.forEach((a, i) => {
        const n = i + 1; // which late check-in of the month this is
        const penalty = n > allowed;
        const $set = {};

        if ((a.lateCountInMonth || 0) !== n) $set.lateCountInMonth = n;
        if (!!a.latePenalty !== penalty) $set.latePenalty = penalty;
        if (Object.keys($set).length) countFix++;

        if (penalty && a.status === "present") {
          $set.status = "half_day";
          toHalf++;
        }
        if (Object.keys($set).length) {
          ops.push({ updateOne: { filter: { _id: a._id }, update: { $set } } });
        }
        a.__n = n; a.__penalty = penalty;
      });
    }

    // Days that were wrongly penalised before (e.g. old counter ran across
    // months) -> restore the status the day earned on its own hours.
    for (const list of groups.values()) {
      for (const a of list) {
        if (a.__penalty || !a.latePenalty) continue;
        if (a.status !== "half_day" || !a.checkOut || a.checkoutRemark === "missed_checkout") continue;
        const shift = await getShift(a.shift);
        if (!shift) continue;
        const base =
          a.source === "face"
            ? calculateFaceStatus((new Date(a.checkOut) - new Date(a.checkIn)) / 60000, shift)
            : calculateStatus(a.activeMinutes || 0, getShiftThresholds(shift));
        if (base === "present") {
          ops.push({ updateOne: { filter: { _id: a._id }, update: { $set: { status: "present" } } } });
          revert++;
        }
      }
    }

    console.log(
      `${org.organisation_name || org._id}: limit ${allowed}/month | late days ${lates.length} | ` +
      `counter fixes ${countFix} | present->half_day ${toHalf} | half_day->present (wrongly penalised) ${revert}`
    );
    totalCountFix += countFix; totalToHalf += toHalf; totalRevert += revert;

    if (APPLY && ops.length) await Attendance.bulkWrite(ops, { ordered: false });
  }

  console.log(
    `LATE TOTAL: counter fixes ${totalCountFix}, present->half_day ${totalToHalf}, ` +
    `half_day->present ${totalRevert} ${APPLY ? "(applied)" : "(dry run)"}`
  );
};

// ─────────── Step 2: half_day_el / half_day_sl balance (lwpDays) ───────────
const LEAVE_SOURCES = [
  { Model: Leave, field: "employee", approved: ["approved_manager", "approved_admin"], model: "User" },
  { Model: ManagerLeave, field: "manager", approved: ["approved_reporting_manager", "approved_admin"], model: "Manager" },
  { Model: AdminLeave, field: "admin", approved: ["approved_superadmin"], model: "Admin" },
];
const BUCKET = { el: "EL", half_day_el: "EL", sl: "SL", half_day_sl: "SL" };

const fixHalfDayLeaveBalance = async (rangeStart, rangeEndExclusive) => {
  console.log("\n=== STEP 2a: Half Day SL / EL balance check (lwpDays) ===");

  // personId_bucket -> leaves (every EL/SL type from rangeStart onward, so the
  // opening balance can be reconstructed from today's balance)
  const byPerson = new Map();
  for (const src of LEAVE_SOURCES) {
    const q = {
      status: { $in: src.approved },
      leaveType: { $in: Object.keys(BUCKET) },
      startDate: { $gte: rangeStart },
    };
    if (ORG) q.organisation_id = ORG;
    if (EMPLOYEE) q[src.field] = EMPLOYEE;
    const docs = await src.Model.find(q).lean();
    for (const d of docs) {
      const pid = String(d[src.field]);
      const key = `${pid}_${BUCKET[d.leaveType]}`;
      if (!byPerson.has(key)) byPerson.set(key, []);
      byPerson.get(key).push({ ...d, __src: src, __pid: pid });
    }
  }

  let changed = 0;
  for (const [key, leaves] of byPerson) {
    const bucket = key.split("_")[1];
    const pid = leaves[0].__pid;
    const balance = await LeaveBalance.findOne({ employee: pid }).lean();
    if (!balance) { console.log(`[SKIP] ${pid}: no LeaveBalance`); continue; }

    leaves.sort((a, b) => new Date(a.startDate) - new Date(b.startDate) || new Date(a.createdAt) - new Date(b.createdAt));

    const currentAvail =
      bucket === "EL"
        ? Math.max(0, r2((balance.EL?.accrued || 0) - (balance.EL?.availed || 0)))
        : Math.max(0, r2((balance.SL?.entitled || 0) - (balance.SL?.availed || 0)));

    // Work out what each leave consumed (sandwich = all LWP, nothing consumed).
    for (const l of leaves) {
      const half = l.leaveType.startsWith("half_day");
      l.__full = half ? 0.5 : l.days;
      try {
        l.__sandwich = await isSandwichLeave(l.startDate, l.endDate, l.organisation_id, new mongoose.Types.ObjectId(pid), l.__src.model, l.nextLeaveDate);
      } catch { l.__sandwich = false; }
      l.__oldDed = l.__sandwich ? 0 : Math.max(0, r2(l.__full - (l.lwpDays || 0)));
    }

    let avail = r2(currentAvail + leaves.reduce((s, l) => s + l.__oldDed, 0)); // opening balance
    for (const l of leaves) {
      const half = l.leaveType.startsWith("half_day");
      let ded = l.__oldDed;
      if (half && !l.__sandwich) ded = Math.min(avail, 0.5);
      ded = r2(ded);
      avail = Math.max(0, r2(avail - ded));

      if (!half || l.__sandwich) continue;
      const newLwp = r2(0.5 - ded);
      const oldLwp = r2(l.lwpDays || 0);
      const inRange = new Date(l.startDate) < rangeEndExclusive;
      if (!inRange || Math.abs(newLwp - oldLwp) < 0.001) continue;

      changed++;
      const dDed = r2(ded - l.__oldDed);
      console.log(
        `[LWP] ${pid} ${l.leaveType} ${new Date(l.startDate).toISOString().slice(0, 10)}: ` +
        `lwpDays ${oldLwp} -> ${newLwp}  (${bucket} availed ${dDed >= 0 ? "+" : ""}${dDed}, lwp ${r2(newLwp - oldLwp) >= 0 ? "+" : ""}${r2(newLwp - oldLwp)})`
      );

      if (APPLY && FIX_LWP) {
        await l.__src.Model.updateOne({ _id: l._id }, { $set: { lwpDays: newLwp } });
        await LeaveBalance.updateOne(
          { employee: pid },
          { $inc: { [`${bucket}.availed`]: dDed, pbc: dDed, lwp: r2(newLwp - oldLwp) } }
        );
      }
    }
  }

  console.log(
    `Half-day leaves with wrong lwpDays: ${changed} ` +
    (FIX_LWP ? (APPLY ? "(fixed)" : "(dry run)") : "(NOT changed - add --fix-lwp --apply to fix them)")
  );
};

// ───────────────────────────────── main ─────────────────────────────────────
(async () => {
  await mongoose.connect(process.env.LINK);
  console.log(APPLY ? ">>> APPLY MODE - writing changes" : ">>> DRY RUN - nothing will be written");

  const nowIst = getISTDateParts(new Date());
  const curYM = { year: nowIst.year, month: nowIst.month };

  let from = parseYM(opt("from"));
  if (!from) {
    const first = await Attendance.findOne(ORG ? { organisation_id: ORG } : {}).sort({ date: 1 }).select("date").lean();
    const p = first ? getISTDateParts(first.date) : nowIst;
    from = { year: p.year, month: p.month };
  }
  const to = parseYM(opt("to")) || curYM;

  const rangeStart = istDateFromYMD(from.year, from.month, 1);
  const rangeEndExclusive = to.month === 12 ? istDateFromYMD(to.year + 1, 1, 1) : istDateFromYMD(to.year, to.month + 1, 1);

  const months = [];
  for (let y = from.year, m = from.month; y < to.year || (y === to.year && m <= to.month); m === 12 ? (y++, (m = 1)) : m++) {
    months.push(ymKey({ year: y, month: m }));
  }
  console.log(`Range: ${from.year}-${from.month} -> ${to.year}-${to.month} (${months.length} month(s))`);

  if (!SKIP_LATE) await fixLateRule(rangeStart, rangeEndExclusive);
  await fixHalfDayLeaveBalance(rangeStart, rangeEndExclusive);

  if (!SKIP_SUMMARY) {
    console.log("\n=== STEP 2b: Align attendance status with half-day leaves + rebuild AttendanceSummary ===");
    // Re-applies resolveLeaveDayOverride (half_day_el/sl -> half_day, paid half
    // when balance available, unpaid half when LWP) and rewrites the monthly
    // summaries for every month in the range.
    await recomputeSummaries(APPLY, null, EMPLOYEE ? { employeeId: EMPLOYEE, months } : { months });
  }

  await mongoose.disconnect();
  console.log("\nDone.");
})().catch(async (err) => {
  console.error("FAILED:", err);
  await mongoose.disconnect();
  process.exit(1);
});