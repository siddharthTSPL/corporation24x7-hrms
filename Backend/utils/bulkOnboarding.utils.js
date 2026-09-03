const XLSX = require("xlsx");
const crypto = require("crypto");
const https = require("https");

const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const Adminmodel = require("../Models/Admin.model");
const Department = require("../Models/department.model");
const SuperAdminModel = require("../Models/superadmin.model");
const generateUID = require("../automatic/uidgeneration");
const assignDefaultLeave = require("../automatic/bydefaultleaveset");
const { sendEmail } = require("./nodemailer.utils");
const { incrementActiveUserCount } = require("./Licensecheck");

// Kept intentionally separate from admin.controller.js's assignDefaultPermissions
// so this file has no dependency on admin.controller.js (avoids a require cycle).
// Mirrors the "employee" default permission set used there.
const PermissionModel = require("../Models/permission.model");
const DEFAULT_EMPLOYEE_PERMISSIONS = {
  announcements: { can_view_announcements: true, can_create_announcement: false, can_edit_announcement: false, can_delete_announcement: false },
  documents: { can_upload_documents: true, can_view_all_documents: false },
  tickets: { can_raise_ticket: true, can_view_all_tickets: false, can_resolve_ticket: false, can_rate_ticket: true },
  recruitment: { can_view_hiring_requisitions: false, can_create_hiring_requisition: false, can_view_candidates: false, can_add_candidate: false },
};

const LEGACY_DEPARTMENT_CODES = ["OPR", "BPO", "ENG", "HR", "MGMT"];

// Column definition for the downloadable template AND for parsing any
// incoming file/sheet. `aliases` are extra header spellings we'll accept
// on upload so a hand-built Google Sheet doesn't have to match the
// template's exact wording.
const COLUMNS = [
  { key: "empid", label: "Employee ID*", required: true, aliases: ["empid", "employee id"] },
  { key: "f_name", label: "First Name*", required: true, aliases: ["f_name", "first name"] },
  { key: "l_name", label: "Last Name*", required: true, aliases: ["l_name", "last name"] },
  { key: "work_email", label: "Work Email*", required: true, aliases: ["work_email", "email", "work email"] },
  { key: "gender", label: "Gender* (male/female)", required: true, aliases: ["gender"] },
  { key: "personal_contact", label: "Personal Contact*", required: true, aliases: ["personal_contact", "phone", "mobile", "personal contact"] },
  { key: "e_contact", label: "Emergency Contact*", required: true, aliases: ["e_contact", "emergency contact"] },
  { key: "department", label: "Department Code*", required: true, aliases: ["department", "department code", "dept"] },
  { key: "designation", label: "Designation*", required: true, aliases: ["designation"] },
  { key: "office_location", label: "Office Location*", required: true, aliases: ["office_location", "office location", "location"] },
  { key: "password", label: "Temporary Password (optional - auto-generated if blank)", required: false, aliases: ["password", "temporary password"] },
  { key: "marital_status", label: "Marital Status (single/married/divorced)", required: false, aliases: ["marital_status", "marital status"] },
  { key: "manager_empid", label: "Reporting Manager Employee ID (optional)", required: false, aliases: ["manager_empid", "reporting manager", "manager id", "under_manager"] },
  { key: "role", label: "Role (employee/official)", required: false, aliases: ["role"] },
  { key: "is_fresher", label: "Is Fresher (yes/no)", required: false, aliases: ["is_fresher", "is fresher", "fresher"] },
  { key: "total_experience", label: "Total Experience (years)", required: false, aliases: ["total_experience", "total experience"] },
  { key: "previous_company", label: "Previous Company", required: false, aliases: ["previous_company", "previous company"] },
  { key: "previous_designation", label: "Previous Designation", required: false, aliases: ["previous_designation", "previous designation"] },
  { key: "date_of_birth", label: "Date of Birth (YYYY-MM-DD)", required: false, aliases: ["date_of_birth", "date of birth", "dob"] },
  { key: "address", label: "Address", required: false, aliases: ["address"] },
  { key: "city", label: "City", required: false, aliases: ["city"] },
  { key: "state", label: "State", required: false, aliases: ["state"] },
  { key: "pincode", label: "Pincode", required: false, aliases: ["pincode"] },
  { key: "country", label: "Country", required: false, aliases: ["country"] },
  { key: "aadhaar_number", label: "Aadhaar Number", required: false, aliases: ["aadhaar_number", "aadhaar number"] },
  { key: "pan_number", label: "PAN Number", required: false, aliases: ["pan_number", "pan number"] },
  { key: "bank_name", label: "Bank Name", required: false, aliases: ["bank_name", "bank name"] },
  { key: "account_holder_name", label: "Account Holder Name", required: false, aliases: ["account_holder_name", "account holder name"] },
  { key: "account_number", label: "Account Number", required: false, aliases: ["account_number", "account number"] },
  { key: "ifsc_code", label: "IFSC Code", required: false, aliases: ["ifsc_code", "ifsc code"] },
];

const normalize = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .replace(/[\s_-]+/g, " ")
    .trim();

// header text (as it appears in the uploaded file) -> internal key
const HEADER_TO_KEY = {};
COLUMNS.forEach((col) => {
  HEADER_TO_KEY[normalize(col.label)] = col.key;
  col.aliases.forEach((alias) => {
    HEADER_TO_KEY[normalize(alias)] = col.key;
  });
});

// ---------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------

// Turns a raw sheet (array of {header: value} objects, as returned by
// XLSX.utils.sheet_to_json) into rows keyed by our internal field names,
// dropping any completely blank rows.
const mapSheetRowsToFields = (sheetRows) => {
  return sheetRows
    .map((raw, idx) => {
      const row = { __rowNumber: idx + 2 }; // +2: header row is row 1, data starts row 2
      Object.entries(raw).forEach(([header, value]) => {
        const key = HEADER_TO_KEY[normalize(header)];
        if (key) row[key] = typeof value === "string" ? value.trim() : value;
      });
      return row;
    })
    .filter((row) => Object.keys(row).some((k) => k !== "__rowNumber" && String(row[k] ?? "").length > 0));
};

const parseWorkbookBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const sheetRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  return mapSheetRowsToFields(sheetRows);
};

// Accepts any regular Google Sheets URL (edit link, view link, etc.) and
// fetches it as CSV via Google's export endpoint. Only works for sheets
// shared as "Anyone with the link can view" (or published to web) since
// no OAuth/credentials are involved here.
const extractSheetId = (url) => {
  const match = String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

const extractGid = (url) => {
  const match = String(url || "").match(/[?&#]gid=(\d+)/);
  return match ? match[1] : "0";
};

const fetchUrlText = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrlText(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Google Sheets responded with status ${res.statusCode}`));
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });

const parseGoogleSheetUrl = async (sheetUrl) => {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    throw Object.assign(new Error("That doesn't look like a valid Google Sheets link."), { statusCode: 400 });
  }
  const gid = extractGid(sheetUrl);
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  let csvText;
  try {
    csvText = await fetchUrlText(exportUrl);
  } catch (err) {
    throw Object.assign(
      new Error("Could not read that Google Sheet. Make sure sharing is set to 'Anyone with the link can view'."),
      { statusCode: 400 }
    );
  }
  if (/^<!DOCTYPE html/i.test(csvText.trim())) {
    throw Object.assign(
      new Error("This sheet isn't publicly viewable. Set sharing to 'Anyone with the link can view' and try again."),
      { statusCode: 400 }
    );
  }

  const workbook = XLSX.read(csvText, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const sheetRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  return mapSheetRowsToFields(sheetRows);
};

// ---------------------------------------------------------------------
// Template generation
// ---------------------------------------------------------------------

const buildTemplateWorkbook = (departmentOptions) => {
  const headers = COLUMNS.map((c) => c.label);
  const exampleRow = COLUMNS.map((c) => {
    switch (c.key) {
      case "empid": return "EMP1001";
      case "f_name": return "Jane";
      case "l_name": return "Doe";
      case "work_email": return "jane.doe@company.com";
      case "gender": return "female";
      case "personal_contact": return "9876543210";
      case "e_contact": return "9876500000";
      case "department": return departmentOptions[0] || "ENG";
      case "designation": return "Software Engineer";
      case "office_location": return "Noida";
      case "password": return "";
      case "marital_status": return "single";
      case "manager_empid": return "";
      case "role": return "employee";
      case "is_fresher": return "yes";
      default: return "";
    }
  });

  const sheetData = [headers, exampleRow];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = headers.map(() => ({ wch: 26 }));

  const instructions = [
    ["Bulk Employee Onboarding - Instructions"],
    [""],
    ["1. Do not rename or remove the header row."],
    ["2. Fields marked with * are required."],
    ["3. Gender must be exactly: male or female"],
    ["4. Marital Status (if provided) must be: single, married or divorced"],
    ["5. Department Code must match one of your organisation's departments:"],
    [departmentOptions.join(", ")],
    ["6. Reporting Manager Employee ID (if provided) must belong to an existing manager in your organisation."],
    ["7. If Temporary Password is left blank, a secure password is generated automatically and emailed to the employee."],
    ["8. If any row in the file fails validation, no employees will be created - fix the errors and re-upload."],
    ["9. To import from Google Sheets instead, set sharing to 'Anyone with the link can view' and paste the link in the app."],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet["!cols"] = [{ wch: 90 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Employees");
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

// ---------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_VALUES = new Set(["male", "female"]);
const MARITAL_VALUES = new Set(["single", "married", "divorced"]);
const YES_VALUES = new Set(["yes", "y", "true", "1"]);
const NO_VALUES = new Set(["no", "n", "false", "0", ""]);

const generateTempPassword = () => {
  const random = crypto.randomInt(100000, 999999);
  return `Welcome@${random}`;
};

// Validates the whole batch against itself and against the database in
// as few queries as possible, and returns either a list of row errors
// (nothing gets created) or a list of ready-to-insert row objects.
const validateBulkRows = async (rows, organisation_id) => {
  const errors = [];

  if (!rows.length) {
    return { errors: [{ row: null, message: "No data rows found in the file." }], normalizedRows: [] };
  }

  const [orgDepartments, superAdmin] = await Promise.all([
    Department.find({ organisation_id, isActive: true }).select("name code").lean(),
    SuperAdminModel.findById(organisation_id)
      .select("is_trial_active trial_expires_at licenses active_user_count")
      .lean(),
  ]);

  const validDepartmentCodes = new Set(
    (orgDepartments.length ? orgDepartments.map((d) => d.code || d.name) : LEGACY_DEPARTMENT_CODES)
      .map((d) => String(d).toUpperCase())
  );

  // License / seat check up front, since it applies to the whole batch.
  if (superAdmin) {
    const activeCount = superAdmin.active_user_count || 0;
    const trialActive = superAdmin.is_trial_active && new Date() < new Date(superAdmin.trial_expires_at);
    let remainingSeats = null;
    if (trialActive) {
      remainingSeats = 5 - activeCount;
    } else {
      const license = (superAdmin.licenses || []).find(
        (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
      );
      remainingSeats = license ? (license.users || 0) - activeCount : 0;
    }
    if (remainingSeats < rows.length) {
      errors.push({
        row: null,
        message: `Not enough license seats: ${Math.max(remainingSeats, 0)} remaining, but the file has ${rows.length} employees. Upgrade your plan at torchxsuite.com or reduce the batch size.`,
      });
    }
  }

  const emails = rows.map((r) => String(r.work_email || "").toLowerCase().trim()).filter(Boolean);
  const empids = rows.map((r) => String(r.empid || "").trim()).filter(Boolean);
  const managerEmpids = rows.map((r) => String(r.manager_empid || "").trim()).filter(Boolean);

  const [existingUsersByEmail, existingManagersByEmail, existingAdminsByEmail] = await Promise.all([
    Usermodel.find({ work_email: { $in: emails } }).select("work_email").lean(),
    Managermodel.find({ work_email: { $in: emails } }).select("work_email").lean(),
    Adminmodel.find({ work_email: { $in: emails } }).select("work_email").lean(),
  ]);
  const takenEmails = new Set(
    [...existingUsersByEmail, ...existingManagersByEmail, ...existingAdminsByEmail].map((u) =>
      u.work_email.toLowerCase()
    )
  );

  const [existingUsersByEmpid, existingManagersByEmpid, existingAdminsByEmpid] = await Promise.all([
    Usermodel.find({ empid: { $in: empids }, organisation_id }).select("empid").lean(),
    Managermodel.find({ empid: { $in: empids }, organisation_id }).select("empid").lean(),
    Adminmodel.find({ empid: { $in: empids }, organisation_id }).select("empid").lean(),
  ]);
  const takenEmpids = new Set(
    [...existingUsersByEmpid, ...existingManagersByEmpid, ...existingAdminsByEmpid].map((u) => u.empid)
  );

  const managers = managerEmpids.length
    ? await Managermodel.find({ empid: { $in: managerEmpids }, organisation_id }).select("empid").lean()
    : [];
  const managerEmpidToId = new Map(managers.map((m) => [m.empid, m._id]));

  const seenEmails = new Set();
  const seenEmpids = new Set();
  const normalizedRows = [];

  rows.forEach((row) => {
    const rowErrors = [];
    const rowNum = row.__rowNumber;

    COLUMNS.filter((c) => c.required).forEach((c) => {
      if (!String(row[c.key] ?? "").trim()) rowErrors.push(`${c.label.replace("*", "")} is required`);
    });

    const email = String(row.work_email || "").toLowerCase().trim();
    if (email && !EMAIL_REGEX.test(email)) rowErrors.push("Work Email is not a valid email address");
    if (email && takenEmails.has(email)) rowErrors.push("An account with this email already exists");
    if (email && seenEmails.has(email)) rowErrors.push("Duplicate email within this file");
    if (email) seenEmails.add(email);

    const empid = String(row.empid || "").trim();
    if (empid && takenEmpids.has(empid)) rowErrors.push("This Employee ID is already in use");
    if (empid && seenEmpids.has(empid)) rowErrors.push("Duplicate Employee ID within this file");
    if (empid) seenEmpids.add(empid);

    const gender = String(row.gender || "").toLowerCase().trim();
    if (gender && !GENDER_VALUES.has(gender)) rowErrors.push("Gender must be 'male' or 'female'");

    const marital = String(row.marital_status || "").toLowerCase().trim();
    if (marital && !MARITAL_VALUES.has(marital)) rowErrors.push("Marital Status must be single, married or divorced");

    const department = String(row.department || "").toUpperCase().trim();
    if (department && !validDepartmentCodes.has(department)) {
      rowErrors.push(`Department Code '${row.department}' does not match any department in your organisation`);
    }

    if (row.personal_contact && row.e_contact && String(row.personal_contact).trim() === String(row.e_contact).trim()) {
      rowErrors.push("Emergency contact must be different from personal contact");
    }

    const dobRaw = String(row.date_of_birth || "").trim();
    if (dobRaw && isNaN(Date.parse(dobRaw))) {
      rowErrors.push("Date of Birth is not a valid date (use YYYY-MM-DD)");
    }

    let managerId = null;
    const managerEmpid = String(row.manager_empid || "").trim();
    if (managerEmpid) {
      managerId = managerEmpidToId.get(managerEmpid) || null;
      if (!managerId) rowErrors.push(`Reporting Manager with Employee ID '${managerEmpid}' was not found`);
    }

    let isFresher = true;
    const fresherRaw = String(row.is_fresher || "").toLowerCase().trim();
    if (NO_VALUES.has(fresherRaw) && fresherRaw !== "") isFresher = false;
    else if (YES_VALUES.has(fresherRaw)) isFresher = true;

    if (rowErrors.length) {
      errors.push({ row: rowNum, empid: empid || null, message: rowErrors.join("; ") });
    } else {
      normalizedRows.push({
        rowNumber: rowNum,
        empid,
        profile_image: undefined,
        department,
        Under_manager: managerId,
        f_name: String(row.f_name || "").trim(),
        l_name: String(row.l_name || "").trim(),
        work_email: email,
        gender,
        marital_status: marital || "single",
        password: String(row.password || "").trim() || generateTempPassword(),
        personal_contact: String(row.personal_contact || "").trim(),
        e_contact: String(row.e_contact || "").trim(),
        aadhaar_number: row.aadhaar_number || undefined,
        pan_number: row.pan_number || undefined,
        address: row.address || undefined,
        city: row.city || undefined,
        state: row.state || undefined,
        pincode: row.pincode || undefined,
        country: row.country || undefined,
        role: String(row.role || "employee").trim() || "employee",
        designation: String(row.designation || "").trim(),
        office_location: String(row.office_location || "").trim(),
        date_of_birth: row.date_of_birth ? new Date(row.date_of_birth) : undefined,
        is_fresher: isFresher,
        total_experience: row.total_experience ? Number(row.total_experience) || 0 : 0,
        previous_company: row.previous_company || undefined,
        previous_designation: row.previous_designation || undefined,
        bank_name: row.bank_name || undefined,
        account_holder_name: row.account_holder_name || undefined,
        account_number: row.account_number || undefined,
        ifsc_code: row.ifsc_code || undefined,
      });
    }
  });

  return { errors, normalizedRows };
};

// ---------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------

// Rows have already been fully validated (including uniqueness) by
// validateBulkRows, so failures here should be rare. If one does happen
// partway through, we roll back everything we already created in this
// batch rather than leaving a half-onboarded batch behind - deliberately
// avoiding a mongoose transaction/session here since that requires a
// replica-set deployment, which isn't guaranteed for every environment
// this runs in.
const createEmployeesBulk = async (normalizedRows, admin) => {
  const organisation_id = admin.organisation_id;
  const created = [];

  try {
    for (const row of normalizedRows) {
      const uid = await generateUID(row.department, organisation_id);
      const newuser = await Usermodel.create({
        organisation_id,
        empid: row.empid,
        uid,
        department: row.department,
        Under_manager: row.Under_manager,
        f_name: row.f_name,
        l_name: row.l_name,
        work_email: row.work_email,
        password: row.password,
        gender: row.gender,
        marital_status: row.marital_status,
        personal_contact: row.personal_contact,
        e_contact: row.e_contact,
        aadhaar_number: row.aadhaar_number,
        pan_number: row.pan_number,
        address: row.address,
        city: row.city,
        state: row.state,
        pincode: row.pincode,
        country: row.country,
        role: row.role,
        designation: row.designation,
        office_location: row.office_location,
        is_fresher: row.is_fresher,
        total_experience: row.total_experience,
        previous_company: row.previous_company,
        previous_designation: row.previous_designation,
        bank_name: row.bank_name,
        account_holder_name: row.account_holder_name,
        account_number: row.account_number,
        ifsc_code: row.ifsc_code,
        date_of_birth: row.date_of_birth,
        date_of_joining: new Date(),
      });

      created.push({ user: newuser, tempPassword: row.password });
    }
  } catch (err) {
    // Best-effort rollback of everything created so far in this batch.
    await Usermodel.deleteMany({ _id: { $in: created.map((c) => c.user._id) } }).catch(() => {});
    throw err;
  }

  // Side effects (leave defaults, permissions, license count, emails) -
  // fire these after every row is safely in the DB.
  await Promise.all(
    created.map(({ user }) =>
      Promise.all([
        assignDefaultLeave(user, false),
        PermissionModel.findOneAndUpdate(
          { user_id: user._id, user_model: "User", organisation_id },
          { $set: { user_id: user._id, user_model: "User", organisation_id, granted_by: admin._id, granted_by_model: "Admin", ...DEFAULT_EMPLOYEE_PERMISSIONS } },
          { upsert: true, new: true, runValidators: true }
        ),
        incrementActiveUserCount(organisation_id),
      ])
    )
  );

  // Welcome emails are sent best-effort and don't block the response -
  // a slow mail provider shouldn't hold up a bulk import of 100+ rows.
  Promise.all(
    created.map(({ user, tempPassword }) =>
      sendEmail({
        to: user.work_email,
        subject: "Welcome! Your Employee Account Has Been Created",
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" style="background:#fff;border-radius:14px;overflow:hidden;"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1>Welcome Aboard</h1></td></tr><tr><td style="padding:40px;"><h2>Hello ${user.f_name}</h2><p>Your employee account has been created as part of a bulk onboarding import.</p><p><strong>Employee ID:</strong> ${user.empid}</p><p><strong>Department:</strong> ${user.department}</p><p><strong>Location:</strong> ${user.office_location}</p><p><strong>Temporary Password:</strong> ${tempPassword}</p><p>For security, please log in and change this password immediately.</p></td></tr></table></td></tr></table></body></html>`,
      }).catch(() => {})
    )
  );

  return created.map(({ user }) => ({ empid: user.empid, uid: user.uid, work_email: user.work_email, name: `${user.f_name} ${user.l_name}` }));
};

module.exports = {
  COLUMNS,
  parseWorkbookBuffer,
  parseGoogleSheetUrl,
  buildTemplateWorkbook,
  validateBulkRows,
  createEmployeesBulk,
};