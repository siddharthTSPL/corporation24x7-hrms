const TimeLog = require("../../Models/Timelog.model");
const TSProject = require("../../Models/tsproject.model");
const { loadPeople, OID } = require("../engine/people");
const { istRange, fmtDate, parseDateStrict } = require("../engine/dates");
const { F, batches, round2, periodText } = require("./_shared");

const hrs = (m) => round2((m || 0) / 60);

module.exports = {
  key: "project-billable-hours",
  name: "Project & Billable Hours Analysis",
  category: "timesheet",
  planFeature: "timesheet",
  sensitive: false,
  description: "Hours, billable share and billed amount per project.",
  filters: [
    { key: "from", label: "From Date", type: "date", required: true },
    { key: "to", label: "To Date", type: "date", required: true },
    F.department,
  ],
  columns: [
    { key: "project", header: "Project", type: "text", width: 28 },
    { key: "client", header: "Client", type: "text", width: 22 },
    { key: "totalHours", header: "Total Hours", type: "hours", width: 13, total: true },
    { key: "billableHours", header: "Billable Hours", type: "hours", width: 15, total: true },
    { key: "nonBillableHours", header: "Non-billable Hours", type: "hours", width: 18, total: true },
    { key: "billablePct", header: "Billable %", type: "percent", width: 12 },
    { key: "billedAmount", header: "Billed Amount", type: "currency", width: 16, total: true },
    { key: "contributors", header: "People Logged", type: "integer", width: 14 },
  ],
  chart: { type: "bar", x: "project", stacked: true, bars: [{ key: "billableHours", label: "Billable" }, { key: "nonBillableHours", label: "Non-billable" }] },
  notes: [
    "Hours come from time logs dated inside the period, whether or not the timesheet is submitted yet. Logs with no project appear as '(No project)'.",
    "Billed amount is the amount stored on each billable log (hours x its hourly rate); the system does not hold a billing currency per log.",
  ],
  period: (f) => periodText(fmtDate(parseDateStrict(f.from)), fmtDate(parseDateStrict(f.to))),
  validate(f) { istRange(f.from, f.to, { maxDays: 366 }); },
  async *rows(ctx, f) {
    const { from, to } = istRange(f.from, f.to, { maxDays: 366 });
    const people = await loadPeople(ctx, { department: f.department, includeSuperAdmin: false });
    const per = new Map();
    for (const chunk of batches(people, 2000)) {
      const agg = await TimeLog.aggregate([
        { $match: { organisation_id: ctx.orgId, log_date: { $gte: from, $lte: to }, logged_by: { $in: chunk.map((p) => OID(p.id)) } } },
        { $group: {
          _id: "$project", total: { $sum: "$duration_minutes" },
          billable: { $sum: { $cond: ["$billable", "$duration_minutes", 0] } },
          amount: { $sum: { $ifNull: ["$billed_amount", 0] } }, users: { $addToSet: "$logged_by" },
        } },
      ]);
      for (const a of agg) {
        const k = a._id ? String(a._id) : "none";
        const e = per.get(k) || { total: 0, billable: 0, amount: 0, users: new Set() };
        e.total += a.total; e.billable += a.billable; e.amount += a.amount; a.users.forEach((u) => e.users.add(String(u)));
        per.set(k, e);
      }
    }
    const ids = [...per.keys()].filter((k) => k !== "none");
    const projects = ids.length ? await TSProject.find({ organisation_id: ctx.orgId, _id: { $in: ids.map(OID) } }).select("name client").lean() : [];
    const byId = new Map(projects.map((p) => [String(p._id), p]));
    yield [...per.entries()].map(([k, e]) => ({
      project: k === "none" ? "(No project)" : byId.get(k)?.name || "(Deleted project)", client: k === "none" ? "" : byId.get(k)?.client || "",
      totalHours: hrs(e.total), billableHours: hrs(e.billable), nonBillableHours: hrs(e.total - e.billable),
      billablePct: e.total ? round2((e.billable / e.total) * 100) : null, billedAmount: round2(e.amount), contributors: e.users.size,
    })).sort((a, b) => b.totalHours - a.totalHours);
  },
};
