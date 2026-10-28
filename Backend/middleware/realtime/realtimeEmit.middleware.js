const { emitToOrganisation } = require("../../config/socket");

// After ANY successful write (POST/PUT/PATCH/DELETE) we tell everyone connected
// in the same organisation "module X changed". The browser then refetches that
// module's lists. No data is sent over the socket - clients refetch through the
// normal authorised REST endpoints - so nothing sensitive leaks.
//
// Classified from the URL, first match wins (order matters).
const RULES = [
  ["leave", /leave/],
  ["wfh", /wfh/],
  ["reimbursement", /reimburs/],
  ["ticket", /ticket/],
  ["announcement", /announcement/],
  ["document", /document/],
  ["review", /review/],
  ["training", /training/],
  ["overtime", /overtime/],
  ["payroll", /payroll|salary|\/fnf|payslip/],
  ["recruitment", /recruitment|offer|candidate|appointment|requisition/],
  ["timesheet", /timesheet|\/jobs(\/|$)|\/projects(\/|$)|timelog|activetimer|\/timer/],
  ["attendance", /attendance|checkin|checkout|regulariz/],
  ["holiday", /holiday/],
  ["shift", /shift/],
  ["asset", /\/assets?(\/|$)/],
  ["policy", /\/policy(\/|$)/],
  ["people", /addmanager|addadmin|addemployee|onboard|\/import/],
];

// High-frequency / non-business endpoints we never broadcast for.
const SKIP = /^\/(auth|notifications|kiosk|faceattendance|field-operations|single-sign-in|chat|meetings)(\/|$)/;

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const classify = (url) => {
  const path = url.split("?")[0].toLowerCase();
  if (SKIP.test(path)) return null;
  for (const [name, re] of RULES) if (re.test(path)) return name;
  return null;
};

const orgIdOf = (req) => {
  const u = req.user;
  if (!u) return null;
  if (u.organisation_id) return u.organisation_id;
  if (req.actor && req.actor.organisation_id) return req.actor.organisation_id;
  // SuperAdmin: the account itself is the organisation.
  const modelName = u.constructor && u.constructor.modelName;
  if (modelName === "SuperAdmin") return u._id;
  return null;
};

const realtimeEmit = (req, res, next) => {
  if (!MUTATING.has(req.method)) return next();

  res.on("finish", () => {
    try {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const module = classify(req.originalUrl || req.url || "");
      if (!module) return;
      const orgId = orgIdOf(req);
      if (!orgId) return;
      emitToOrganisation(orgId, "data:changed", { module, method: req.method, at: Date.now() });
    } catch (err) {
      console.error("[realtime] data:changed emit failed:", err.message);
    }
  });

  next();
};

module.exports = realtimeEmit;
module.exports.classify = classify;