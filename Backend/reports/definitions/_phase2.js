const Fnf = require("../../Models/Fnf.model");
const { OID, resolveNames } = require("../engine/people");

/** Exit date per person: notice-period last working day, else the F&F 'date of leaving'. Map(id -> Date). */
async function loadExitDates(ctx, people) {
  const out = new Map();
  const leavers = people.filter((p) => p.workingStatus !== "working" || p.lastWorkingDay);
  for (const p of leavers) if (p.lastWorkingDay) out.set(p.id, p.lastWorkingDay);
  const need = leavers.filter((p) => !out.has(p.id));
  if (need.length) {
    const docs = await Fnf.find({ organisation_id: ctx.orgId, employee: { $in: need.map((p) => OID(p.id)) } })
      .select("employee dateOfLeaving exitType").lean();
    for (const d of docs) if (d.dateOfLeaving) out.set(String(d.employee), d.dateOfLeaving);
  }
  return out;
}

/** Approved_by style fields store only an id (no model): try every account type, org-scoped. */
async function resolveAnyNames(ctx, ids) {
  const uniq = [...new Set(ids.filter(Boolean).map(String))];
  const refs = uniq.flatMap((id) => ["Manager", "Admin", "SuperAdmin", "User"].map((model) => ({ id, model })));
  const names = await resolveNames(ctx, refs);
  const out = new Map();
  for (const id of uniq) {
    for (const m of ["Manager", "Admin", "SuperAdmin", "User"]) {
      const n = names.get(`${m}:${id}`);
      if (n) { out.set(id, n); break; }
    }
  }
  return out;
}

const daysBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));

module.exports = { loadExitDates, resolveAnyNames, daysBetween };
