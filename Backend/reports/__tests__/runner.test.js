const test = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("stream");
const ExcelJS = require("exceljs");
const SuperAdmin = require("../../Models/superadmin.model");
const AuditLog = require("../../Models/auditLog.model");

// No database in unit tests: stub the two model calls the runner makes.
SuperAdmin.findById = () => ({ select: () => ({ lean: async () => ({ organisation_name: "Acme" }) }) });
const audits = [];
AuditLog.create = async (d) => { audits.push(d); return d; };

const runner = require("../engine/runner");

const rowsData = Array.from({ length: 57 }, (_, i) => ({ name: `Emp ${String(i).padStart(2, "0")}`, amount: i + 0.5, when: new Date(Date.UTC(2026, 9, 1 + (i % 20))) }));
const def = {
  key: "t", name: "Test", category: "hr", sensitive: true,
  filters: [{ key: "q", label: "Q", type: "text" }],
  columns: [
    { key: "name", header: "Name", type: "text" },
    { key: "amount", header: "Amount", type: "currency", total: true },
    { key: "when", header: "When", type: "date" },
  ],
  async *rows() { for (let i = 0; i < rowsData.length; i += 10) yield rowsData.slice(i, i + 10); },
};
const ctx = { orgId: "64b7f0f4f4f4f4f4f4f4f4f4", scope: "org", actor: { id: "64b7f0f4f4f4f4f4f4f4f4f5", model: "Admin", role: "admin", name: "Tester" } };

test("run: pagination, search, sort; summary covers ALL rows, not the page", async () => {
  const r = await runner.run({ def, ctx, rawFilters: {}, page: 2, pageSize: 20, refresh: true });
  assert.equal(r.rows.length, 20);
  assert.equal(r.pagination.totalRows, 57);
  assert.equal(r.pagination.totalPages, 3);
  const total = rowsData.reduce((s, x) => s + x.amount, 0);
  assert.equal(r.summary.find((s) => s.label === "Total Amount").value, total);
  const s = await runner.run({ def, ctx, rawFilters: {}, search: "emp 05" });
  assert.equal(s.pagination.totalRows, 1);
  const d = await runner.run({ def, ctx, rawFilters: {}, sort: { key: "amount", dir: "desc" }, pageSize: 5 });
  assert.equal(d.rows[0].name, "Emp 56");
  assert.equal(r.meta.organisationName, "Acme");
  assert.equal(r.empty, false);
});
test("run: sensitive report audited once per generation, not per page flip", async () => {
  audits.length = 0;
  runner.cache.clear();
  await runner.run({ def, ctx, rawFilters: {}, page: 1 });
  await runner.run({ def, ctx, rawFilters: {}, page: 2 });
  await runner.run({ def, ctx, rawFilters: {}, page: 3 });
  assert.equal(audits.filter((a) => a.action === "run").length, 1);
  await runner.run({ def, ctx, rawFilters: {}, refresh: true });
  assert.equal(audits.filter((a) => a.action === "run").length, 2);
});
test("cache is per actor: another user never receives cached rows", async () => {
  runner.cache.clear();
  await runner.run({ def, ctx, rawFilters: {} });
  const other = { ...ctx, actor: { ...ctx.actor, id: "64b7f0f4f4f4f4f4f4f4f4f6" } };
  audits.length = 0;
  await runner.run({ def, ctx: other, rawFilters: {} });
  assert.equal(audits.filter((a) => a.action === "run").length, 1); // regenerated, not served from the first user's cache
});
test("empty result is flagged", async () => {
  const empty = { ...def, async *rows() {} };
  const r = await runner.run({ def: empty, ctx, rawFilters: {}, refresh: true });
  assert.equal(r.empty, true);
  assert.equal(r.rows.length, 0);
});
test("export contains every matching row (not just a page) and matches run() totals", async () => {
  const chunks = [];
  const res = new PassThrough();
  res.setHeader = () => {}; res.removeHeader = () => {};
  res.on("data", (c) => chunks.push(c));
  const done = new Promise((r) => res.on("end", r));
  audits.length = 0;
  await runner.exportXlsx({ def, ctx, rawFilters: {}, req: {}, res });
  await done;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.concat(chunks));
  const vals = []; wb.worksheets[0].eachRow((r) => vals.push(r.values.slice(1)));
  const start = vals.findIndex((r) => r[0] === "Name") + 1;
  const dataRows = vals.slice(start).filter((r) => /^Emp \d+$/.test(r[0]));
  assert.equal(dataRows.length, 57);
  const totalRow = vals.find((r) => r[0] === "Total");
  assert.equal(totalRow[1], rowsData.reduce((s, x) => s + x.amount, 0));
  assert.equal(audits.filter((a) => a.action === "export")[0].meta.rowCount, 57);
});
test("a bad filter is rejected before any data is read", async () => {
  await assert.rejects(runner.run({ def: { ...def, filters: [{ key: "d", label: "D", type: "date", required: true }] }, ctx, rawFilters: {} }), /required/);
});
