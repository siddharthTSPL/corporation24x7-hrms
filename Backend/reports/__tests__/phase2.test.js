const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateAccess } = require("../engine/access");
const { parseDateStrict } = require("../engine/dates");
const registry = require("../registry");
const exc = require("../definitions/attendanceExceptions");
const util = require("../definitions/leaveUtilization");
const funnel = require("../definitions/recruitmentFunnel");
const tsa = require("../definitions/timesheetApproval");

test("registry: all reports unique, every one has filters, columns and a category the server knows", () => {
  const all = registry.all();
  assert.ok(all.length >= 19);
  const cats = new Set(registry.CATEGORIES.map((c) => c.key));
  for (const d of all) {
    assert.ok(cats.has(d.category), d.key);
    assert.ok(d.columns.length && Array.isArray(d.filters) && typeof d.rows === "function", d.key);
    assert.equal(new Set(d.columns.map((c) => c.key)).size, d.columns.length, `dup column in ${d.key}`);
  }
});
test("recruitment needs recruitment.can_view_candidates; performance has its own flag", () => {
  const r = { can_view_reports: true, can_export_reports: true };
  const actor = { actorModel: "Manager", role: "manager" };
  assert.equal(evaluateAccess({ ...actor, perms: { reports: r } }, { category: "recruitment" }).allowed, false);
  const ok = evaluateAccess({ ...actor, perms: { reports: r, recruitment: { can_view_candidates: true } } }, { category: "recruitment" });
  assert.deepEqual([ok.allowed, ok.scope], [true, "org"]);
  assert.equal(evaluateAccess({ ...actor, perms: { reports: r } }, { category: "performance" }).allowed, false);
  const perf = evaluateAccess({ ...actor, perms: { reports: { ...r, can_view_performance_reports: true } } }, { category: "performance" });
  assert.deepEqual([perf.allowed, perf.scope], [true, "team"]);
});
test("exceptions: leave/holiday/week-off never flagged; late + missing check-out detected", () => {
  const today = parseDateStrict("2026-10-26");
  const past = parseDateStrict("2026-10-20");
  assert.deepEqual(exc.exceptionsOf({ status: "leave", isLate: true }, today), []);
  assert.deepEqual(exc.exceptionsOf({ status: "week_off" }, today), []);
  assert.deepEqual(exc.exceptionsOf({ status: "present", isLate: true, checkIn: new Date(), date: past }, today), ["Late Check-in", "Missing Check-out"]);
  assert.deepEqual(exc.exceptionsOf({ status: "present", checkIn: new Date(), date: today }, today), []); // today: not yet missing
  assert.deepEqual(exc.exceptionsOf({ status: "absent" }, today), ["Absent"]);
  assert.deepEqual(exc.exceptionsOf({ status: "half_day" }, today), ["Half Day"]);
});
test("leave utilisation pro-rates a leave crossing the period boundary", () => {
  const from = parseDateStrict("2026-10-01");
  const to = parseDateStrict("2026-10-31");
  const inside = { startDate: parseDateStrict("2026-10-05"), endDate: parseDateStrict("2026-10-07"), days: 3 };
  assert.equal(util.daysInRange(inside, from, to), 3);
  const cross = { startDate: parseDateStrict("2026-09-29"), endDate: parseDateStrict("2026-10-02"), days: 4 }; // 2 of 4 days inside
  assert.equal(util.daysInRange(cross, from, to), 2);
  assert.equal(util.daysInRange({ startDate: parseDateStrict("2026-11-02"), endDate: parseDateStrict("2026-11-03"), days: 2 }, from, to), 0);
});
test("recruitment funnel folds stages per requisition and computes join %", () => {
  const rows = funnel.foldFunnel(
    [{ requisition: "r1", stage: "APPLIED", count: 6 }, { requisition: "r1", stage: "JOINED", count: 2 }, { requisition: "r2", stage: "REJECTED", count: 1 }],
    new Map([["r1", { job_title: "Dev", openings: 3, filled_count: 2 }]])
  );
  const dev = rows.find((r) => r.jobTitle === "Dev");
  assert.equal(dev.candidates, 8); assert.equal(dev.s_JOINED, 2); assert.equal(dev.joinRate, 25);
  assert.equal(rows.find((r) => r.jobTitle.includes("deleted")).candidates, 1);
});
test("timesheet approval buckets", () => {
  assert.equal(tsa.bucketOf("pending_reporting_manager"), "Pending");
  assert.equal(tsa.bucketOf("approved"), "Approved");
  assert.equal(tsa.bucketOf(null), "Draft");
});

// ---------------- Phase 3 ----------------
const wf = require("../definitions/workforceTrends");
const eff = require("../definitions/recruitmentEfficiency");
const { monthSpan } = require("../definitions/_trends");

test("registry now holds 26 reports; every chart references real columns", () => {
  const all = registry.all();
  assert.equal(all.length, 26);
  for (const d of all.filter((x) => x.chart)) {
    const keys = new Set(d.columns.map((c) => c.key));
    assert.ok(keys.has(d.chart.x), `${d.key} x`);
    for (const b of d.chart.bars || []) assert.ok(keys.has(b.key), `${d.key} ${b.key}`);
    if (d.chart.line) assert.ok(keys.has(d.chart.line.key), `${d.key} line`);
  }
});
test("management overview is organisation-admin only", () => {
  const def = { category: "management" };
  assert.equal(evaluateAccess({ actorModel: "Admin", role: "admin", perms: null }, def).allowed, true);
  const p = { reports: { can_view_reports: true, can_view_all_employees: true, can_export_reports: true }, payroll: { can_manage_payroll: true } };
  assert.equal(evaluateAccess({ actorModel: "Manager", role: "manager", perms: p }, def).allowed, false);
  assert.equal(evaluateAccess({ actorModel: "User", role: "employee", perms: p }, def).allowed, false);
});
test("month span: inclusive, IST bounds, capped at 24", () => {
  const m = monthSpan({ fromMonth: "2026-08", toMonth: "2026-10" });
  assert.deepEqual(m.map((x) => x.key), ["2026-08", "2026-09", "2026-10"]);
  assert.ok(m[0].start < m[0].end);
  assert.throws(() => monthSpan({ fromMonth: "2024-01", toMonth: "2026-10" }), /too large/);
  assert.throws(() => monthSpan({ fromMonth: "2026-10", toMonth: "2026-08" }), /cannot be after/);
});
test("attrition % and recruitment efficiency maths", () => {
  assert.equal(wf.attritionPct(2, 98, 100), 2.02);
  assert.equal(wf.attritionPct(1, 0, 0), null);
  const r = eff.efficiencyRow("Referral", { APPLIED: 4, OFFER_ACCEPTED: 1, JOINED: 3, REJECTED: 2, OFFER_REJECTED: 0 }, 21.456);
  assert.equal(r.candidates, 10); assert.equal(r.offered, 4); assert.equal(r.accepted, 4);
  assert.equal(r.joinRate, 30); assert.equal(r.acceptRate, 100); assert.equal(r.avgDaysToJoin, 21.46);
});
