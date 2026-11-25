const { loadPeople, OID } = require("../engine/people");
const { istRange, fmtDate, parseDateStrict, DAY_MS } = require("../engine/dates");
const leaveTx = require("./leaveTransactions");
const { F, batches, round2, periodText } = require("./_shared");

const TYPES = leaveTx._types;
const typeCols = TYPES.map((t) => ({ key: `t_${t.value}`, header: t.label, type: "number", width: 14, total: true }));

/** PURE (unit-tested): part of a leave's `days` that falls inside [from,to], pro-rated by calendar days. */
function daysInRange(leave, from, to) {
  const s = Math.max(new Date(leave.startDate).getTime(), from.getTime());
  const e = Math.min(new Date(leave.endDate).getTime(), to.getTime());
  if (e < s) return 0;
  const span = Math.max(1, Math.round((new Date(leave.endDate) - new Date(leave.startDate)) / DAY_MS) + 1);
  const inside = Math.max(1, Math.round((e - s) / DAY_MS) + 1);
  return round2((leave.days || 0) * Math.min(1, inside / span));
}

module.exports = {
  key: "leave-utilization",
  name: "Leave Utilization Report",
  category: "leave",
  sensitive: false,
  description: "Approved leave days taken per employee and leave type in a period.",
  filters: [
    { key: "from", label: "From Date", type: "date", required: true },
    { key: "to", label: "To Date", type: "date", required: true },
    F.department,
    F.employees,
    { key: "leaveTypes", label: "Leave Type", type: "multiselect", options: TYPES },
  ],
  columns: [
    { key: "uid", header: "Employee ID", type: "text", width: 14 },
    { key: "name", header: "Employee Name", type: "text", width: 26 },
    { key: "department", header: "Department", type: "text", width: 18 },
    ...typeCols,
    { key: "totalDays", header: "Total Approved Days", type: "number", width: 18, total: true },
    { key: "unpaidDays", header: "Of which Unpaid (LWP)", type: "number", width: 18, total: true },
    { key: "pendingDays", header: "Pending Approval Days", type: "number", width: 18, total: true },
  ],
  notes: [
    "Only APPROVED leave counts toward utilisation; requests still awaiting approval are shown separately.",
    "A leave that crosses the period boundary is pro-rated by calendar days. Rejected leave is deleted from the system after 24 hours, so it cannot appear.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  daysInRange,
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const people = await loadPeople(ctx, { department: f.department, employeeIds: f.employees, includeSuperAdmin: false });
    const per = new Map(people.map((p) => [p.id, { p, totals: {}, total: 0, unpaid: 0, pending: 0 }]));
    for (const src of leaveTx._sources) {
      const ids = people.filter((p) => p.model === src.ownerModel).map((p) => OID(p.id));
      for (const chunk of batches(ids, 2000)) {
        const q = { organisation_id: ctx.orgId, [src.field]: { $in: chunk }, startDate: { $lte: to }, endDate: { $gte: from } };
        if (f.leaveTypes?.length) q.leaveType = { $in: f.leaveTypes };
        const docs = await src.Model.find(q).select(`${src.field} leaveType startDate endDate days lwpDays status`).lean();
        for (const d of docs) {
          const row = per.get(String(d[src.field]));
          if (!row) continue;
          const st = leaveTx.normalizeStatus(d.status);
          const used = daysInRange(d, from, to);
          if (st === "Approved") {
            row.totals[d.leaveType] = round2((row.totals[d.leaveType] || 0) + used);
            row.total = round2(row.total + used);
            row.unpaid = round2(row.unpaid + (d.leaveType === "lwp" ? used : Math.min(used, d.lwpDays || 0)));
          } else if (st === "Pending" || st === "Forwarded") row.pending = round2(row.pending + used);
        }
      }
    }
    const rows = [...per.values()].filter((r) => r.total || r.pending).map((r) => ({
      uid: r.p.uid, name: r.p.name, department: r.p.department,
      ...Object.fromEntries(TYPES.map((t) => [`t_${t.value}`, r.totals[t.value] || 0])),
      totalDays: r.total, unpaidDays: r.unpaid, pendingDays: r.pending,
    }));
    for (const g of batches(rows)) yield g;
  },
};
