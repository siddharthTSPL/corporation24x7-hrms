const Department = require("../Models/department.model");
const {
  parseWorkbookBuffer,
  parseGoogleSheetUrl,
  buildTemplateWorkbook,
  validateBulkRows,
  createRecordsBulk,
} = require("../utils/bulkOnboarding.utils");

const LEGACY_DEPARTMENT_CODES = ["OPR", "BPO", "ENG", "HR", "MGMT"];
const VALID_TYPES = new Set(["employee", "manager"]);

// Accepts "employee" or "manager" from either the query string (GET
// template) or the body/form-data (POST upload/import), defaulting to
// "employee" so existing integrations that don't send it keep working.
const resolveType = (req) => {
  const raw = String(req.query?.type || req.body?.type || "employee").toLowerCase().trim();
  return VALID_TYPES.has(raw) ? raw : null;
};

const downloadEmployeeTemplate = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const type = resolveType(req);
    if (!type)
      return next(Object.assign(new Error("type must be 'employee' or 'manager'"), { statusCode: 400 }));

    const departments = await Department.find({ organisation_id: req.admin.organisation_id, isActive: true })
      .select("name code")
      .lean();
    const departmentOptions = departments.length
      ? departments.map((d) => d.code || d.name)
      : LEGACY_DEPARTMENT_CODES;

    const buffer = buildTemplateWorkbook(departmentOptions, type);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=bulk_${type}_onboarding_template.xlsx`);
    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

// Shared by both the file-upload and Google-Sheet import routes once rows
// have been parsed into a plain array of {header: value} objects.
const runBulkImport = async (req, res, next, rows, type) => {
  const organisation_id = req.admin.organisation_id;
  const label = type === "manager" ? "manager" : "employee";

  const { errors, normalizedRows } = await validateBulkRows(rows, organisation_id, type);

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: `${errors.length} row(s) failed validation. No ${label}s were created - fix the errors below and re-upload the file.`,
      errors,
    });
  }

  const createdRecords = await createRecordsBulk(normalizedRows, req.admin, type);

  return res.status(201).json({
    success: true,
    message: `${createdRecords.length} ${label}(s) onboarded successfully. Verification emails sent.`,
    count: createdRecords.length,
    employees: createdRecords,
  });
};

const bulkUploadEmployees = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    if (!req.file)
      return next(Object.assign(new Error("No file uploaded"), { statusCode: 400 }));

    const type = resolveType(req);
    if (!type)
      return next(Object.assign(new Error("type must be 'employee' or 'manager'"), { statusCode: 400 }));

    let rows;
    try {
      rows = parseWorkbookBuffer(req.file.buffer, type);
    } catch (err) {
      return next(Object.assign(new Error("Could not read that file. Please upload a valid .xlsx, .xls or .csv file."), { statusCode: 400 }));
    }

    return await runBulkImport(req, res, next, rows, type);
  } catch (error) {
    next(error);
  }
};

const bulkImportFromGoogleSheet = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const type = resolveType(req);
    if (!type)
      return next(Object.assign(new Error("type must be 'employee' or 'manager'"), { statusCode: 400 }));

    const { sheetUrl } = req.body;
    if (!sheetUrl)
      return next(Object.assign(new Error("sheetUrl is required"), { statusCode: 400 }));

    const rows = await parseGoogleSheetUrl(sheetUrl, type);

    return await runBulkImport(req, res, next, rows, type);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  downloadEmployeeTemplate,
  bulkUploadEmployees,
  bulkImportFromGoogleSheet,
};