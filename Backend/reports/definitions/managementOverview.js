const Payroll = require("../../Models/payroll.model");
const Leave = require("../../Models/leave.model");
const ManagerLeave = require("../../Models/maleave.model");
const AdminLeave = require("../../Models/adleave.model");
const Candidate = require("../../Models/candidate.model");
const Requisition = require("../../Models/Hiringrequisition.model");
const Reimbursement = require("../../Models/reimbursement.model");
const Timesheet = require("../../Models/Timesheet.model");
const Review = require("../../Models/review.model");
const { loadPeople } = require("../engine/people");
const { startOfISTDay, fmtPeriod, parseMonthStrict } = require("../engine/dates");
const { statusAsOf } = require("./headcount");
const { loadExitDates } = require("./_phase2");
const { monthSpan, monthOffset } = require("./_trends");
const { FINAL_STATUSES } = require("./_payroll");
const { round2 } = require("./_shared");

const changePct = (cur, prev) => (prev ? round2(((cur - prev) / Math.abs(prev)) * 100) : null);
const pad = (m) => `${m.year}-${String(m.month).padStart(2, "0")}`;

/** Safe wrapper: one failing/locked area must never take down the whole overview. */
async function metric(list, area, name, unit, fn) {
  try {
    const [cur, prev] = await fn();
    list.push({ area, metric: name, unit, current: cur, previous: prev, change: changePct(cur, prev) });
  } catch (err) {
    list.push({ area, metric: name, unit, current: null, previous: null, change: null });
  }
}

module.exports = {
  key: "management-overview",
  name: "Management Overview",
  category: "management",
  needsFeatures: ["recruitment", "timesheet", "review"],
  sensitive: true, // contains payroll cost: audited, organisation admins only
  description: "One-page snapshot of headcount, payroll, leave, hiring, expense, timesheet and review KPIs against last month.",
  filters: [{ key: "month", label: "Month", type: "month", required: true, default: monthOffset(0), defaultOffsetMonths: 0 }],
  columns: [
    { key: "area", header: "Area", type: "text", width: 16 },
    { key: "metric", header: "Metric", type: "text", width: 44 },
    { key: "unit", header: "Unit", type: "text", width: 10 },
    { key: "current", header: "Selected Month", type: "number", width: 17 },
    { key: "previous", header: "Previous Month", type: "number", width: 17 },
    { key: "change", header: "Change %", type: "percent", width: 12 },
  ],
  notes: [
    "Organisation admins only. Payroll figures are finalised payroll (Approved + Paid). Areas on a plan that does not include them (Timesheet, Recruitment, Performance) show blanks.",
    "Leave days = approved leaves STARTING in the month. Each area uses the same rules as its detailed report; open the detailed report to drill down.",
    "Metrics that could not be read show blank instead of failing the whole overview.",
  ],
  period: (f) => { const m = parseMonthStrict(f.month); return fmtPeriod(m.year, m.month); },
  validate(f) { parseMonthStrict(f.month); },
  async *rows(ctx, f) {
    const sel = monthSpan({ fromMonth: f.month, toMonth: f.month })[0];
    const [py, pm] = sel.month === 1 ? [sel.year - 1, 12] : [sel.year, sel.month - 1];
    const prev = monthSpan({ fromMonth: `${py}-${String(pm).padStart(2, "0")}`, toMonth: `${py}-${String(pm).padStart(2, "0")}` })[0];
    const open = ctx.openFeatures || new Set();
    const L = [];
    const inM = (d, m) => d && new Date(d) >= m.start && new Date(d) <= m.end;

    // ---- Workforce
    await metric(L, "Workforce", "Closing headcount", "people", async () => {
      const people = await loadPeople(ctx, {});
      const exits = await loadExitDates(ctx, people);
      const today = startOfISTDay(new Date());
      const at = (m) => people.filter((p) => statusAsOf(p, exits.get(p.id) || p.lastWorkingDay || null, startOfISTDay(m.end), today) === "active").length;
      ctx._wf = { people, exits, inM };
      return [at(sel), at(prev)];
    });
    if (ctx._wf) {
      const { people, exits } = ctx._wf;
      const cnt = (fn, m) => people.filter((p) => fn(p) && inM(fn(p), m)).length;
      await metric(L, "Workforce", "Joiners", "people", async () => [cnt((p) => p.joiningDate, sel), cnt((p) => p.joiningDate, prev)]);
      await metric(L, "Workforce", "Exits", "people", async () => {
        const e = (m) => people.filter((p) => p.workingStatus !== "working" && inM(exits.get(p.id), m)).length;
        return [e(sel), e(prev)];
      });
    }
    // ---- Payroll
    const payAgg = async (m) => {
      const [r] = await Payroll.aggregate([
        { $match: { organisation_id: ctx.orgId, year: m.year, month: m.month, status: { $in: FINAL_STATUSES } } },
        { $group: { _id: null, n: { $sum: 1 }, net: { $sum: "$netSalary" }, earn: { $sum: "$earnings.totalEarnings" },
          emp: { $sum: { $add: [{ $ifNull: ["$employerContribution.pf", 0] }, { $ifNull: ["$employerContribution.esi", 0] }, { $ifNull: ["$employerContribution.lwf", 0] }] } } } },
      ]);
      return r || { n: 0, net: 0, earn: 0, emp: 0 };
    };
    let pa; let pb;
    try { [pa, pb] = [await payAgg(sel), await payAgg(prev)]; } catch { /* leave blank */ }
    if (pa) {
      await metric(L, "Payroll", "Payslips finalised", "count", async () => [pa.n, pb.n]);
      await metric(L, "Payroll", "Net pay", "INR", async () => [round2(pa.net), round2(pb.net)]);
      await metric(L, "Payroll", "Total employer cost (earnings + employer PF/ESI/LWF)", "INR", async () => [round2(pa.earn + pa.emp), round2(pb.earn + pb.emp)]);
    }
    // ---- Leave
    await metric(L, "Leave", "Approved leave days (leaves starting in month)", "days", async () => {
      const sum = async (m) => {
        let t = 0;
        for (const M of [Leave, ManagerLeave, AdminLeave]) {
          const [r] = await M.aggregate([{ $match: { organisation_id: ctx.orgId, startDate: { $gte: m.start, $lte: m.end }, status: /^approved/ } }, { $group: { _id: null, d: { $sum: "$days" } } }]);
          t += r?.d || 0;
        }
        return round2(t);
      };
      return [await sum(sel), await sum(prev)];
    });
    // ---- Recruitment
    if (open.has("recruitment")) {
      await metric(L, "Recruitment", "Open requisitions (approved, not yet filled)", "count", async () => [
        await Requisition.countDocuments({ organisation_id: ctx.orgId, status: "APPROVED", $expr: { $lt: ["$filled_count", "$openings"] } }), null]);
      await metric(L, "Recruitment", "Candidates added", "count", async () => [
        await Candidate.countDocuments({ organisation_id: ctx.orgId, createdAt: { $gte: sel.start, $lte: sel.end } }),
        await Candidate.countDocuments({ organisation_id: ctx.orgId, createdAt: { $gte: prev.start, $lte: prev.end } })]);
      await metric(L, "Recruitment", "Candidates joined (by joining date)", "count", async () => [
        await Candidate.countDocuments({ organisation_id: ctx.orgId, current_stage: "JOINED", joining_date: { $gte: sel.start, $lte: sel.end } }),
        await Candidate.countDocuments({ organisation_id: ctx.orgId, current_stage: "JOINED", joining_date: { $gte: prev.start, $lte: prev.end } })]);
    }
    // ---- Expense (INR)
    await metric(L, "Expense", "Claimed amount, INR (pending + approved + paid, by expense date)", "INR", async () => {
      const sum = async (m) => {
        const [r] = await Reimbursement.aggregate([{ $match: { organisation_id: ctx.orgId, isDeleted: false, currency: "INR", status: { $in: ["submitted", "approved", "paid"] }, expenseDate: { $gte: m.start, $lte: m.end } } }, { $group: { _id: null, a: { $sum: "$amountClaimed" } } }]);
        return round2(r?.a || 0);
      };
      return [await sum(sel), await sum(prev)];
    });
    await metric(L, "Expense", "Claims awaiting approval (all dates)", "count", async () => [await Reimbursement.countDocuments({ organisation_id: ctx.orgId, isDeleted: false, status: "submitted" }), null]);
    // ---- Timesheet
    if (open.has("timesheet")) {
      await metric(L, "Timesheet", "Timesheets awaiting approval (period start in month)", "count", async () => {
        const c = (m) => Timesheet.countDocuments({ organisation_id: ctx.orgId, week_start: { $gte: m.start, $lte: m.end }, status: /^pending/ });
        return [await c(sel), await c(prev)];
      });
    }
    // ---- Performance
    if (open.has("review")) {
      await metric(L, "Performance", "Reviews completed (HR approved, submitted in month)", "count", async () => {
        const c = (m) => Review.countDocuments({ organisation_id: ctx.orgId, status: "hr_approved", reviewerSubmittedAt: { $gte: m.start, $lte: m.end } });
        return [await c(sel), await c(prev)];
      });
    }
    yield L;
  },
};
