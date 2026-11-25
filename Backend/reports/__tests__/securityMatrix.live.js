// LIVE security matrix - run against a staging server with 2 companies seeded.
//   BASE=https://staging/api TOKENS='{"A_super":"<jwt>","A_admin":"..","A_mgr":"..","A_emp":"..","A_emp_payroll":"..","B_admin":".."}' \
//   B_EMP_ID=<an employee _id that belongs to company B> node reports/__tests__/securityMatrix.live.js
// Auth is the normal cookie JWT, sent here as a Cookie header.
const BASE = process.env.BASE;
const TOKENS = JSON.parse(process.env.TOKENS || "{}");
const B_EMP = process.env.B_EMP_ID;
const post = (tok, path, body) =>
  fetch(`${BASE}/reports/${path}`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `token=${tok}` }, body: JSON.stringify(body) });

const cases = [];
const expect = (name, p, ok) => cases.push({ name, p, ok });
const month = { fromMonth: "2026-10" };
const range = { from: "2026-10-01", to: "2026-10-31" };

(async () => {
  expect("employee (no perms) -> payroll run 403", post(TOKENS.A_emp, "monthly-payroll-register/run", { filters: month }), (r) => r.status === 403);
  expect("employee (no perms) -> payroll EXPORT 403", post(TOKENS.A_emp, "monthly-payroll-register/export", { filters: month }), (r) => r.status === 403);
  expect("manager (no payroll perm) -> payroll export 403", post(TOKENS.A_mgr, "payroll-earnings-deductions/export", { filters: month }), (r) => r.status === 403);
  expect("admin A -> payroll export 200 xlsx", post(TOKENS.A_admin, "monthly-payroll-register/export", { filters: month }), (r) => r.status === 200 && /spreadsheetml/.test(r.headers.get("content-type")));
  expect("admin A selecting company B employee -> 403", post(TOKENS.A_admin, "employee-master/run", { filters: { employees: [B_EMP] } }), (r) => r.status === 403);
  expect("admin A + tampered organisation_id in body is ignored (no B rows)", post(TOKENS.A_admin, "employee-master/run", { filters: {}, organisation_id: "B" }).then(async (r) => ({ r, j: await r.clone().json() })), (x) => x.r.status === 200 && !JSON.stringify(x.j.rows).includes(B_EMP));
  expect("manager -> catalog excludes payroll", fetch(`${BASE}/reports/catalog`, { headers: { Cookie: `token=${TOKENS.A_mgr}` } }).then((r) => r.json()), (j) => !j.categories.some((c) => c.key === "payroll"));
  expect("no token -> 401", fetch(`${BASE}/reports/catalog`), (r) => r.status === 401);
  expect("unknown report -> 404 (authenticated)", post(TOKENS.A_admin, "nope/run", { filters: {} }), (r) => r.status === 404);
  expect("manager without export flag -> export 403", post(TOKENS.A_mgr, "leave-transactions/export", { filters: range }), (r) => r.status === 403);
  expect("NoSQL operator in filter rejected 400", post(TOKENS.A_admin, "employee-master/run", { filters: { employees: [{ $ne: null }] } }), (r) => r.status === 400);
  let fail = 0;
  for (const c of cases) {
    try { const res = await c.p; const pass = c.ok(res); if (!pass) fail++; console.log(pass ? "PASS" : "FAIL", c.name); }
    catch (e) { fail++; console.log("FAIL", c.name, e.message); }
  }
  process.exit(fail ? 1 : 0);
})();
