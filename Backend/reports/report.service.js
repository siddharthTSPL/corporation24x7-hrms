const { ZodError } = require("zod");
const { AppError } = require("./report.error");
const { getAllReports, getReport } = require("./report.registry");

const MAX_ROWS = 50000;

const hasPermission = (user, permission) =>
  user.permissions.includes(permission) ||
  user.permissions.includes("reports.*");

class ReportService {
  // Reports this user may see (feeds the dropdown in the UI)
  static list(user) {
    return getAllReports()
      .filter((r) => hasPermission(user, r.permission))
      .map((r) => ({
        key: r.key,
        title: r.title,
        description: r.description,
        columns: r.columns,
        filters: r.filterFields || [],
      }));
  }

  static async run(reportKey, rawFilters, user) {
    // 1. find report
    const report = getReport(reportKey);
    if (!report) throw new AppError(404, `Report '${reportKey}' not found`);

    // 2. permission
    if (!hasPermission(user, report.permission)) {
      throw new AppError(403, "You do not have access to this report");
    }

    // 3. validate filters
    let filters;
    try {
      filters = report.filterSchema.parse(rawFilters || {});
    } catch (e) {
      if (e instanceof ZodError)
        throw new AppError(400, "Invalid filters", e.issues);
      throw e;
    }

    // 4. company isolation: taken from the authenticated user only
    const ctx = { companyId: user.companyId, user };

    // 5. fetch data (reuses existing models/services)
    const data = await report.fetchData(filters, ctx);
    if (data.length > MAX_ROWS) {
      throw new AppError(
        413,
        `Report has ${data.length} rows (max ${MAX_ROWS}). Narrow your filters.`,
      );
    }

    // 6. calculations
    const calculated = report.calculate
      ? report.calculate(data, filters)
      : { rows: data };

    return {
      reportKey: report.key,
      title: report.title,
      columns: report.columns,
      rows: calculated.rows,
      summary: calculated.summary,
      meta: {
        generatedAt: new Date().toISOString(),
        rowCount: calculated.rows.length,
        filters,
      },
    };
  }
}

module.exports = { ReportService };
