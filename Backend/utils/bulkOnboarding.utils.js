const XLSX = require("xlsx");
const crypto = require("crypto");
const https = require("https");
const jwt = require("jsonwebtoken");

const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const Adminmodel = require("../Models/Admin.model");
const Department = require("../Models/department.model");
const SuperAdminModel = require("../Models/superadmin.model");
const generateUID = require("../automatic/uidgeneration");
const assignDefaultLeave = require("../automatic/bydefaultleaveset");
const { sendEmail } = require("./nodemailer.utils");
const { incrementActiveUserCount } = require("./Licensecheck");
const { assignDefaultPermissions } = require("./onboardingDefaults.utils");

const LEGACY_DEPARTMENT_CODES = ["OPR", "BPO", "ENG", "HR", "MGMT"];
const MANAGER_ROLES = new Set(["manager", "official"]);

// ---------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------
// Employee (User model) and Manager model share almost all fields; the
// differences are: Manager's `role` is required and restricted to a fixed
// set of values, and a Manager's "reports to" can be either another
// Manager or an Admin, whereas an Employee can only report to a Manager
// (this mirrors addemployee/addmanager's own restrictions exactly).
const getColumns = (type) => {
  const isManager = type === "manager";
  return [
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
    {
      key: "role",
      label: isManager ? "Role* (manager/official)" : "Role (employee/official)",
      required: isManager,
      aliases: ["role"],
    },
    { key: "password", label: "Temporary Password (optional - auto-generated if blank)", required: false, aliases: ["password", "temporary password"] },
    { key: "marital_status", label: "Marital Status (single/married/divorced)", required: false, aliases: ["marital_status", "marital status"] },
    {
      key: "reporting_manager_email",
      label: isManager
        ? "Reporting Manager/Admin Email (optional)"
        : "Reporting Manager Email (optional)",
      required: false,
      aliases: ["reporting_manager_email", "reporting manager email", "reporting manager", "manager email", "under_manager", "reports to"],
    },
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
};

const normalize = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .replace(/[\s_-]+/g, " ")
    .trim();

// Built once per type so header aliases resolve correctly regardless of
// which template (employee/manager) the file was originally downloaded from -
// a file's headers are matched by meaning, not by which tab produced them.
const buildHeaderToKeyMap = (type) => {
  const map = {};
  getColumns(type).forEach((col) => {
    map[normalize(col.label)] = col.key;
    col.aliases.forEach((alias) => {
      map[normalize(alias)] = col.key;
    });
  });
  return map;
};

// ---------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------

const mapSheetRowsToFields = (sheetRows, headerToKey) => {
  return sheetRows
    .map((raw, idx) => {
      const row = { __rowNumber: idx + 2 }; // +2: header row is row 1, data starts row 2
      Object.entries(raw).forEach(([header, value]) => {
        const key = headerToKey[normalize(header)];
        if (key) row[key] = typeof value === "string" ? value.trim() : value;
      });
      return row;
    })
    .filter((row) => Object.keys(row).some((k) => k !== "__rowNumber" && String(row[k] ?? "").length > 0));
};

const parseWorkbookBuffer = (buffer, type) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const sheetRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  return mapSheetRowsToFields(sheetRows, buildHeaderToKeyMap(type));
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

const parseGoogleSheetUrl = async (sheetUrl, type) => {
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
  return mapSheetRowsToFields(sheetRows, buildHeaderToKeyMap(type));
};

// ---------------------------------------------------------------------
// Template generation
// ---------------------------------------------------------------------

const buildTemplateWorkbook = (departmentOptions, type) => {
  const isManager = type === "manager";
  const columns = getColumns(type);
  const headers = columns.map((c) => c.label);
  const exampleRow = columns.map((c) => {
    switch (c.key) {
      case "empid": return isManager ? "MGR2001" : "EMP1001";
      case "f_name": return "Jane";
      case "l_name": return "Doe";
      case "work_email": return "jane.doe@company.com";
      case "gender": return "female";
      case "personal_contact": return "9876543210";
      case "e_contact": return "9876500000";
      case "department": return departmentOptions[0] || "ENG";
      case "designation": return isManager ? "Engineering Manager" : "Software Engineer";
      case "office_location": return "Noida";
      case "password": return "";
      case "marital_status": return "single";
      case "reporting_manager_email": return "";
      case "role": return isManager ? "manager" : "employee";
      case "is_fresher": return "yes";
      default: return "";
    }
  });

  const sheetData = [headers, exampleRow];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet["!cols"] = headers.map(() => ({ wch: 26 }));

  const instructions = [
    [`Bulk ${isManager ? "Manager" : "Employee"} Onboarding - Instructions`],
    [""],
    ["1. Do not rename or remove the header row."],
    ["2. Fields marked with * are required."],
    ["3. Gender must be exactly: male or female"],
    ["4. Marital Status (if provided) must be: single, married or divorced"],
    ["5. Department Code must match one of your organisation's departments:"],
    [departmentOptions.join(", ")],
    isManager
      ? ["6. Role is required and must be exactly: manager or official"]
      : ["6. Role (if provided) is free text, e.g. employee or official"],
    isManager
      ? ["7. Reporting Manager/Admin Email (if provided) must match the work email of an existing Manager or Admin in your organisation."]
      : ["7. Reporting Manager Email (if provided) must match the work email of an existing manager in your organisation."],
    ["8. If Temporary Password is left blank, a secure password is generated automatically and emailed."],
    ["9. If any row in the file fails validation, no accounts will be created - fix the errors and re-upload."],
    ["10. To import from Google Sheets instead, set sharing to 'Anyone with the link can view' and paste the link in the app."],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet["!cols"] = [{ wch: 90 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, isManager ? "Managers" : "Employees");
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

// Validates the whole batch against itself and against the database in as
// few queries as possible, and returns either a list of row errors
// (nothing gets created) or a list of ready-to-insert row objects.
// `type` is "employee" or "manager" and controls which collection is
// checked for uniqueness targets and which reporting-manager rules apply.
const validateBulkRows = async (rows, organisation_id, type) => {
  const isManager = type === "manager";
  const columns = getColumns(type);
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

  // License / seat check up front, since it applies to the whole batch -
  // both employees and managers draw from the same seat pool.
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
        message: `Not enough license seats: ${Math.max(remainingSeats, 0)} remaining, but the file has ${rows.length} ${isManager ? "managers" : "employees"}. Upgrade your plan at torchxsuite.com or reduce the batch size.`,
      });
    }
  }

  const emails = rows.map((r) => String(r.work_email || "").toLowerCase().trim()).filter(Boolean);
  const empids = rows.map((r) => String(r.empid || "").trim()).filter(Boolean);
  const reportsToEmails = rows.map((r) => String(r.reporting_manager_email || "").toLowerCase().trim()).filter(Boolean);

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

  // Employees can only report to a Manager (matches addemployee's own
  // restriction). Managers can report to either a Manager or an Admin
  // (matches addmanager/resolveReportingManager). Looked up by work email,
  // since that's easier for whoever's filling in the sheet to know than an
  // internal Employee ID.
  const managersByEmail = reportsToEmails.length
    ? await Managermodel.find({ work_email: { $in: reportsToEmails }, organisation_id }).select("work_email").lean()
    : [];
  const reportsToMap = new Map(managersByEmail.map((m) => [m.work_email.toLowerCase(), { id: m._id, model: "Manager" }]));

  if (isManager && reportsToEmails.length) {
    const adminsByEmail = await Adminmodel.find({ work_email: { $in: reportsToEmails }, organisation_id }).select("work_email").lean();
    adminsByEmail.forEach((a) => {
      const key = a.work_email.toLowerCase();
      if (!reportsToMap.has(key)) reportsToMap.set(key, { id: a._id, model: "Admin" });
    });
  }

  const seenEmails = new Set();
  const seenEmpids = new Set();
  const normalizedRows = [];

  rows.forEach((row) => {
    const rowErrors = [];
    const rowNum = row.__rowNumber;

    columns.filter((c) => c.required).forEach((c) => {
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

    const roleRaw = String(row.role || "").toLowerCase().trim();
    if (isManager && !MANAGER_ROLES.has(roleRaw)) {
      rowErrors.push("Role must be manager or official");
    }

    let reportsTo = { id: null, model: null };
    const reportsToEmail = String(row.reporting_manager_email || "").toLowerCase().trim();
    if (reportsToEmail) {
      const match = reportsToMap.get(reportsToEmail);
      if (!match) {
        rowErrors.push(
          isManager
            ? `Reporting Manager/Admin with email '${reportsToEmail}' was not found`
            : `Reporting Manager with email '${reportsToEmail}' was not found`
        );
      } else {
        reportsTo = match;
      }
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
        department,
        Under_manager: isManager ? undefined : reportsTo.id, // Employee model field
        reporting_manager: isManager ? reportsTo.id : undefined, // Manager model fields
        reporting_manager_model: isManager ? reportsTo.model : undefined,
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
        role: isManager ? roleRaw : (String(row.role || "employee").trim() || "employee"),
        designation: String(row.designation || "").trim(),
        office_location: String(row.office_location || "").trim(),
        date_of_birth: dobRaw ? new Date(dobRaw) : undefined,
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

const buildWelcomeEmailHtml = ({ f_name, empid, department, office_location, tempPassword, verifyLink, isManager }) => `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center">
<table width="600" style="background:#fff;border-radius:14px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1>Welcome Aboard</h1></td></tr>
<tr><td style="padding:40px;">
<h2>Hello ${f_name}</h2>
<p>Your ${isManager ? "manager" : "employee"} account has been created as part of a bulk onboarding import.</p>
<p><strong>Employee ID:</strong> ${empid}</p>
<p><strong>Department:</strong> ${department}</p>
<p><strong>Location:</strong> ${office_location}</p>
<p><strong>Temporary Password:</strong> ${tempPassword}</p>
<a href="${verifyLink}" style="background:#730042;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;display:inline-block;">Verify Account</a>
<p>This link will expire in 7 days. For security, please log in and change this password immediately after verifying your account.</p>
</td></tr></table></td></tr></table></body></html>`;

// Rows have already been fully validated (including uniqueness) by
// validateBulkRows, so failures here should be rare. If one does happen
// partway through, we roll back everything we already created in this
// batch rather than leaving a half-onboarded batch behind - deliberately
// avoiding a mongoose transaction/session here since that requires a
// replica-set deployment, which isn't guaranteed for every environment
// this runs in.
const createRecordsBulk = async (normalizedRows, admin, type) => {
  const isManager = type === "manager";
  const Model = isManager ? Managermodel : Usermodel;
  const organisation_id = admin.organisation_id;
  const created = [];

  try {
    for (const row of normalizedRows) {
      const uid = await generateUID(row.department, organisation_id);
      const docFields = {
        organisation_id,
        empid: row.empid,
        uid,
        department: row.department,
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
        date_of_birth: row.date_of_birth,
        is_fresher: row.is_fresher,
        total_experience: row.total_experience,
        previous_company: row.previous_company,
        previous_designation: row.previous_designation,
        bank_name: row.bank_name,
        account_holder_name: row.account_holder_name,
        account_number: row.account_number,
        ifsc_code: row.ifsc_code,
        date_of_joining: new Date(),
      };

      if (isManager) {
        docFields.reporting_manager = row.reporting_manager || null;
        docFields.reporting_manager_model = row.reporting_manager_model || null;
      } else {
        docFields.Under_manager = row.Under_manager || null;
      }

      const newRecord = await Model.create(docFields);
      created.push({ record: newRecord, tempPassword: row.password });
    }
  } catch (err) {
    // Best-effort rollback of everything created so far in this batch.
    await Model.deleteMany({ _id: { $in: created.map((c) => c.record._id) } }).catch(() => {});
    throw err;
  }

  // Side effects (leave defaults, permissions, license count, verification
  // emails) - fire these after every row is safely in the DB, exactly
  // mirroring what addemployee/addmanager do for a single add.
  await Promise.all(
    created.map(({ record }) =>
      Promise.all([
        assignDefaultLeave(record, false),
        assignDefaultPermissions(
          record._id,
          record.role || (isManager ? "manager" : "employee"),
          organisation_id,
          admin._id,
          "Admin",
          null,
          undefined
        ),
        incrementActiveUserCount(organisation_id),
      ])
    )
  );

  // Verification emails are sent best-effort and don't block the response -
  // a slow mail provider shouldn't hold up a bulk import of 100+ rows.
  Promise.all(
    created.map(({ record, tempPassword }) => {
      const token = isManager
        ? jwt.sign({ managerid: record._id, work_email: record.work_email }, process.env.JWT_SECRET, { expiresIn: "7d" })
        : jwt.sign({ userid: record._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
      const verifyLink = `${process.env.BASE_URL}talent/api/${isManager ? "manager" : "user"}/verify/${token}`;

      return sendEmail({
        to: record.work_email,
        subject: `Welcome! Verify Your ${isManager ? "Manager" : "Employee"} Account`,
        html: buildWelcomeEmailHtml({
          f_name: record.f_name,
          empid: record.empid,
          department: record.department,
          office_location: record.office_location,
          tempPassword,
          verifyLink,
          isManager,
        }),
      }).catch(() => {});
    })
  );

  return created.map(({ record }) => ({
    empid: record.empid,
    uid: record.uid,
    work_email: record.work_email,
    name: `${record.f_name} ${record.l_name}`,
  }));
};

module.exports = {
  getColumns,
  parseWorkbookBuffer,
  parseGoogleSheetUrl,
  buildTemplateWorkbook,
  validateBulkRows,
  createRecordsBulk,
};