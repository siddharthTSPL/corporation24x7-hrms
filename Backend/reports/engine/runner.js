const crypto = require("crypto");
const { LRUCache } = require("lru-cache");
const SuperAdmin = require("../../Models/superadmin.model");
const { logAudit } = require("../../utils/auditLog.utils");
const { httpError } = require("./errors");
const { normalizeFilters, describeFilters } = require("./filters");
const { makeAccumulator } = require("./summary");
const { streamWorkbook } = require("./excelWriter");
const { resolveNames } = require("./people");
const { fmtDateTime } = require("./dates");

const RUN_ROW_LIMIT = Number(process.env.REPORT_RUN_ROW_LIMIT) || 100000;
const EXPORT_ROW_LIMIT = Number(process.env.REPORT_EXPORT_ROW_LIMIT) || 500000; // Excel hard limit is 1,048,576
const CACHE_TTL_MS = 2 * 60 * 1000;

// Short-lived result cache so paging / searching / sorting on the SCREEN does
// not re-run the whole report. The key contains org + actor + normalised
// filters, so one user's cached rows can never be served to anyone else.
// Exports NEVER read this cache - they always re-query.
const cache = new LRUCache({
  max: 30,
  ttl: CACHE_TTL_MS,
  maxSize: 400000,
  sizeCalculation: (v) => Math.max(1, v.rows.length),
});

async function* flatten(def, ctx, filters) {
  for await (const batch of def.rows(ctx, filters)) {
    for (const row of batch) yield row;
  }
}

// A definition may bring its own accumulator (payroll: totals count FINALISED
// rows only). Otherwise the generic one sums every column flagged total:true.
const accumulatorFor = (def) =>
  def.accumulator ? def.accumulator() : makeAccumulator(def.columns, def.extraSummary ? def.extraSummary() : undefined);

async function buildMeta(def, ctx, filters) {
  const [org, labels] = await Promise.all([
    SuperAdmin.findById(ctx.orgId).select("organisation_name").lean(),
    labelsForEmployeeFilters(def, ctx, filters),
  ]);
  const generatedAt = new Date();
  return {
    reportKey: def.key,
    reportName: def.name,
    category: def.category,
    organisationName: org?.organisation_name || "",
    period: def.period ? def.period(filters) : "",
    filterLines: describeFilters(def, filters, labels),
    notes: def.notes || [],
    generatedAt: generatedAt.toISOString(),
    generatedAtText: fmtDateTime(generatedAt),
    generatedBy: ctx.actor.name,
  };
}

async function labelsForEmployeeFilters(def, ctx, filters) {
  const refs = [];
  for (const f of def.filters || []) {
    if (f.type !== "employee" && f.type !== "employees") continue;
    for (const id of filters[f.key] || []) for (const model of ["User", "Manager", "Admin"]) refs.push({ id, model });
  }
  if (!refs.length) return {};
  const names = await resolveNames(ctx, refs);
  const out = {};
  for (const r of refs) { const n = names.get(`${r.model}:${r.id}`); if (n) out[r.id] = n; }
  return out;
}

const cacheKey = (def, ctx, filters) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify([String(ctx.orgId), String(ctx.actor.id), ctx.scope, def.key, filters]))
    .digest("hex");

function cmp(col, a, b) {
  const x = a[col.key];
  const y = b[col.key];
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  if (["date", "datetime", "time"].includes(col.type)) return new Date(x) - new Date(y);
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
}

async function run({ def, ctx, rawFilters, page = 1, pageSize = 25, search = "", sort, refresh = false }) {
  const filters = normalizeFilters(def, rawFilters);
  const key = cacheKey(def, ctx, filters);
  let entry = refresh ? null : cache.get(key);
  let generated = false;

  if (!entry) {
    const t0 = Date.now();
    const acc = accumulatorFor(def);
    const rows = [];
    for await (const row of flatten(def, ctx, filters)) {
      if (rows.length >= RUN_ROW_LIMIT) {
        throw httpError(422, `This report has more than ${RUN_ROW_LIMIT.toLocaleString("en-IN")} rows. Narrow the filters, or use Export to Excel.`);
      }
      acc.add(row);
      rows.push(row);
    }
    entry = { rows, summary: acc.result().items, meta: await buildMeta(def, ctx, filters), durationMs: Date.now() - t0 };
    cache.set(key, entry);
    generated = true;
  }

  let view = entry.rows;
  const term = String(search || "").trim().toLowerCase();
  if (term) {
    const cols = def.columns;
    view = view.filter((r) => cols.some((c) => {
      const v = r[c.key];
      return v != null && !(v instanceof Date) && String(v).toLowerCase().includes(term);
    }));
  }
  const sortCol = sort?.key && def.columns.find((c) => c.key === sort.key);
  if (sortCol) {
    const dir = sort.dir === "desc" ? -1 : 1;
    view = [...view].sort((a, b) => dir * cmp(sortCol, a, b));
  }

  const size = Math.min(Math.max(parseInt(pageSize, 10) || 25, 1), 200);
  const totalRows = view.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / size));
  const current = Math.min(Math.max(parseInt(page, 10) || 1, 1), totalPages);
  const slice = view.slice((current - 1) * size, current * size);

  if (generated && def.sensitive) {
    await auditEvent(ctx, def, "run", { filters, rowCount: entry.rows.length, durationMs: entry.durationMs });
  }

  return {
    meta: entry.meta,
    columns: def.columns.map(({ key, header, type, total }) => ({ key, header, type, total: !!total })),
    rows: slice,
    summary: entry.summary, // always over ALL matching rows, never just the page
    pagination: { page: current, pageSize: size, totalRows, totalPages, matchedBeforeSearch: entry.rows.length },
    empty: entry.rows.length === 0,
  };
}

async function exportXlsx({ def, ctx, rawFilters, req, res }) {
  const filters = normalizeFilters(def, rawFilters);
  const t0 = Date.now();
  const meta = await buildMeta(def, ctx, filters);
  const acc = accumulatorFor(def);
  const stamp = meta.generatedAt.replace(/[-:T]/g, "").slice(0, 12);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${def.key}_${stamp}.xlsx"`);
  res.setHeader("Cache-Control", "no-store");

  let written = 0;
  try {
    written = await streamWorkbook({
      res,
      columns: def.columns,
      meta,
      rows: flatten(def, ctx, filters),
      accumulator: acc,
      maxRows: EXPORT_ROW_LIMIT,
      isAborted: () => res.destroyed || !!res.socket?.destroyed,
    });
  } catch (err) {
    // Headers are already out; the only honest signal left is to kill the response
    // so Excel never opens a silently truncated file.
    res.destroy(err);
    throw err;
  }
  await auditEvent(ctx, def, "export", { filters, rowCount: written, durationMs: Date.now() - t0 });
}

function auditEvent(ctx, def, action, extra = {}) {
  return logAudit({
    organisation_id: ctx.orgId,
    module: "reports",
    action,
    actor: { id: ctx.actor.id, model: ctx.actor.model, name: ctx.actor.name },
    meta: { reportKey: def.key, category: def.category, scope: ctx.scope, ...extra },
  });
}

const auditDenied = (ctx, def, attempted, reason) =>
  auditEvent(ctx, def, "denied", { attempted, reason });

module.exports = { run, exportXlsx, auditDenied, cache, flatten, RUN_ROW_LIMIT, EXPORT_ROW_LIMIT };
