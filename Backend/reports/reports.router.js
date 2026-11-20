const express = require("express");
const anyRoleAuth = require("../middleware/auth/Planfeatureanyrole.middleware");
const registry = require("./registry");
const { attachContext, authorizeReport } = require("./engine/access");
const { auditDenied } = require("./engine/runner");
const c = require("./reports.controller");

const router = express.Router();

// 1) authenticate (cookie JWT, same middleware Payroll uses)  2) build org/actor/permission context.
router.use(anyRoleAuth, attachContext);

router.get("/catalog", c.catalog);
router.get("/lookups/:name", c.lookups);

// 3) per-report permission + scope + plan check. POST (not GET) so payroll filters never land in URLs / access logs.
const gate = authorizeReport(registry, auditDenied);
router.post("/:key/run", gate, c.runReport);
router.post("/:key/export", gate, c.exportReport);

module.exports = router;
