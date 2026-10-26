const LeaveBalance = require("../../Models/leavebalance.model");
const { loadPeople, OID } = require("../engine/people");
const { fmtDate } = require("../engine/dates");
const { F, batches, round2 } = require("./_shared");

const num = (v) => (v === undefined || v === null ? null : round2(v));

/**
 * PURE (unit-tested). Mirrors how the app's own Leave screen derives
 * "remaining": EL = accrued - availed, SL = entitled - availed (never below 0).
 */
function remaining(b) {
  const elAccrued = Number(b?.EL?.accrued ?? 0);
  const elAvailed = Number(b?.EL?.availed ?? 0);
  const slEntitled = Number(b?.SL?.entitled ?? 0);
  const slAvailed = Number(b?.SL?.availed ?? 0);
  return { el: Math.max(0, round2(elAccrued - elAvailed)), sl: Math.max(0, round2(slEntitled - slAvailed)) };
}

module.exports = {
  key: "leave-balance",
  name: "Leave Balance Report",
  category: "leave",
  sensitive: false,
  description: "Current leave balances per employee: entitlement, accrued, availed and available.",
  filters: [F.department, F.employees],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    { key: "elYearly", header: "EL Yearly Entitlement", type: "number", width: 18 },
    { key: "elAccrued", header: "EL Accrued", type: "number", width: 12 },
    { key: "elAvailed", header: "EL Availed", type: "number", width: 12 },
    { key: "elAvailable", header: "EL Available", type: "number", width: 13, total: true },
    { key: "slEntitled", header: "SL Entitled", type: "number", width: 12 },
    { key: "slAvailed", header: "SL Availed", type: "number", width: 12 },
    { key: "slAvailable", header: "SL Available", type: "number", width: 13, total: true },
    { key: "pbc", header: "Paid by Company", type: "number", width: 15 },
    { key: "ml", header: "Maternity", type: "number", width: 11 },
    { key: "pl", header: "Paternity", type: "number", width: 11 },
    { key: "lastAccrual", header: "Last EL Accrual", type: "date", width: 15 },
  ],
  notes: [
    "CURRENT balances only. Opening balance, credits, adjustments and a closing balance as of a past date are not available because the system stores a single balance snapshot per employee, not a ledger.",
    "Available EL = accrued - availed; available SL = entitled - availed (same rule as the Leave screen).",
  ],
  period: () => `Current balance as of ${fmtDate(new Date())}`,
  remaining,
  async *rows(ctx, f) {
    const people = (await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false }));
    for (const group of batches(people, 400)) {
      const docs = await LeaveBalance.find({ organisation_id: ctx.orgId, employee: { $in: group.map((p) => OID(p.id)) } }).lean();
      const byEmp = new Map(docs.map((d) => [String(d.employee), d]));
      yield group.map((p) => {
        const b = byEmp.get(p.id);
        const r = b ? remaining(b) : { el: null, sl: null };
        return {
          uid: p.uid, name: p.name, department: p.department,
          elYearly: num(b?.EL?.yearlyEntitled), elAccrued: num(b?.EL?.accrued), elAvailed: num(b?.EL?.availed), elAvailable: r.el,
          slEntitled: num(b?.SL?.entitled), slAvailed: num(b?.SL?.availed), slAvailable: r.sl,
          pbc: num(b?.pbc), ml: num(b?.ML), pl: num(b?.PL), lastAccrual: b?.lastAccrualDate || null,
        };
      });
    }
  },
};
