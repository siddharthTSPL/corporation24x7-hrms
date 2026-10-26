const registry = require("./registry");
const { evaluateAccess } = require("./engine/access");
const { run, exportXlsx } = require("./engine/runner");
const people = require("./engine/people");
const TSProject = require("../Models/tsproject.model");
const { httpError } = require("./engine/errors");

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const accessFor = (ctx, def) => evaluateAccess({ actorModel: ctx.actor.model, role: ctx.actor.role, perms: ctx.perms }, def);
const serialize = (def) => ({
  key: def.key, name: def.name, category: def.category, description: def.description,
  sensitive: !!def.sensitive, filters: def.filters, notes: def.notes || [],
  columns: def.columns.map(({ key, header, type }) => ({ key, header, type })),
});

// GET /reports/catalog - only reports the caller may open, grouped by category.
const catalog = wrap(async (req, res) => {
  const ctx = req.reportCtx;
  const reports = registry.all().map((d) => ({ d, a: accessFor(ctx, d) })).filter((x) => x.a.allowed);
  res.json({
    success: true,
    categories: registry.CATEGORIES
      .map((c) => ({ ...c, reports: reports.filter((x) => x.d.category === c.key).map((x) => ({ ...serialize(x.d), canExport: x.a.canExport, scope: x.a.scope })) }))
      .filter((c) => c.reports.length),
  });
});

// GET /reports/lookups/:name - option lists for filter dropdowns, scoped like the reports.
const lookups = wrap(async (req, res) => {
  const ctx = req.reportCtx;
  const scopes = registry.all().map((d) => accessFor(ctx, d)).filter((a) => a.allowed).map((a) => a.scope);
  if (!scopes.length) throw httpError(403, "You do not have permission to access reports.");
  ctx.scope = scopes.includes("org") ? "org" : "team";
  const q = String(req.query.q || "");
  let data = [];
  switch (req.params.name) {
    case "departments": data = await people.distinctValues(ctx, "department"); break;
    case "designations": data = await people.distinctValues(ctx, "designation"); break;
    case "employees": data = await people.searchPeople(ctx, { q }); break;
    case "managers": data = await people.searchPeople(ctx, { q, roleKeys: ["manager", "admin"] }); break;
    case "projects": {
      if (ctx.scope !== "org") break;
      const docs = await TSProject.find({ organisation_id: ctx.orgId }).select("name").sort({ name: 1 }).limit(500).lean();
      data = docs.map((d) => ({ value: String(d._id), label: d.name }));
      break;
    }
    default: throw httpError(404, "Unknown lookup.");
  }
  res.json({ success: true, data });
});

// POST /reports/:key/run
const runReport = wrap(async (req, res) => {
  const { filters, page, pageSize, search, sort, refresh } = req.body || {};
  const result = await run({ def: req.report.def, ctx: req.reportCtx, rawFilters: filters, page, pageSize, search, sort, refresh: refresh === true });
  res.set("Cache-Control", "no-store");
  res.json({ success: true, ...result });
});

// POST /reports/:key/export - rows are NEVER accepted from the client; they are re-queried here.
const exportReport = wrap(async (req, res, next) => {
  try {
    await exportXlsx({ def: req.report.def, ctx: req.reportCtx, rawFilters: (req.body || {}).filters, req, res });
  } catch (err) {
    if (res.headersSent) return; // stream already destroyed in runner
    res.removeHeader("Content-Disposition");
    next(err);
  }
});

module.exports = { catalog, lookups, runReport, exportReport };
