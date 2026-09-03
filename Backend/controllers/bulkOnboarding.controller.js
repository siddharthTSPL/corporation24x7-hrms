const Department = require("../Models/department.model");
const {
  parseWorkbookBuffer,
  parseGoogleSheetUrl,
  buildTemplateWorkbook,
  validateBulkRows,
  createEmployeesBulk,
} = require("../utils/bulkOnboarding.utils");

const LEGACY_DEPARTMENT_CODES = ["OPR", "BPO", "ENG", "HR", "MGMT"];

const downloadEmployeeTemplate = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const departments = await Department.find({ organisation_id: req.admin.organisation_id, isActive: true })
      .select("name code")
      .lean();
    const departmentOptions = departments.length
      ? departments.map((d) => d.code || d.name)
      : LEGACY_DEPARTMENT_CODES;

    const buffer = buildTemplateWorkbook(departmentOptions);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=bulk_employee_onboarding_template.xlsx");
    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};

// Shared by both the file-upload and Google-Sheet import routes once rows
// have been parsed into a plain array of {header: value} objects.
const runBulkImport = async (req, res, next, rows) => {
  const organisation_id = req.admin.organisation_id;

  const { errors, normalizedRows } = await validateBulkRows(rows, organisation_id);

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: `${errors.length} row(s) failed validation. No employees were created - fix the errors below and re-upload the file.`,
      errors,
    });
  }

  const createdEmployees = await createEmployeesBulk(normalizedRows, req.admin);

  return res.status(201).json({
    success: true,
    message: `${createdEmployees.length} employee(s) onboarded successfully. Verification emails sent.`,
    count: createdEmployees.length,
    employees: createdEmployees,
  });
};

const bulkUploadEmployees = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    if (!req.file)
      return next(Object.assign(new Error("No file uploaded"), { statusCode: 400 }));

    let rows;
    try {
      rows = parseWorkbookBuffer(req.file.buffer);
    } catch (err) {
      return next(Object.assign(new Error("Could not read that file. Please upload a valid .xlsx, .xls or .csv file."), { statusCode: 400 }));
    }

    return await runBulkImport(req, res, next, rows);
  } catch (error) {
    next(error);
  }
};

const bulkImportFromGoogleSheet = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { sheetUrl } = req.body;
    if (!sheetUrl)
      return next(Object.assign(new Error("sheetUrl is required"), { statusCode: 400 }));

    const rows = await parseGoogleSheetUrl(sheetUrl);

    return await runBulkImport(req, res, next, rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  downloadEmployeeTemplate,
  bulkUploadEmployees,
  bulkImportFromGoogleSheet,
};