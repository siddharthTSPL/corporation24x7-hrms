const router = require("express").Router();
const adminAuth = require("../middleware/auth/admin.middleware");
const { listReports, runReport } = require("./report.controller");
require("./definitions"); // registers all reports once

router.use(adminAuth);
router.get("/", listReports);
router.post("/:reportKey", runReport);

module.exports = router;
