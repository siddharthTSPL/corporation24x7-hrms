const { ReportService } = require("./report.service");
const { getReportUser } = require("./report.adapter");
const { sendExcel } = require("./exporters/excel.exporter");
const { sendCsv } = require("./exporters/csv.exporter");

exports.listReports = (req, res, next) => {
  try {
    res.json({ data: ReportService.list(getReportUser(req)) });
  } catch (e) {
    next(e);
  }
};

exports.runReport = async (req, res, next) => {
  try {
    const user = getReportUser(req);
    const format = String(req.query.format || "json");
    const result = await ReportService.run(
      req.params.reportKey,
      req.body,
      user,
    );

    if (format === "xlsx") return await sendExcel(res, result);
    if (format === "csv") return sendCsv(res, result);
    return res.json({ data: result });
  } catch (e) {
    next(e); // handled by your existing errorhandling middleware
  }
};
