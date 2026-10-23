const { registerReport } = require("../report.registry");

registerReport(require("./employee-summary.report"));
// registerReport(require('./another.report'));   <- each future report is one line
