const mongoose = require("mongoose");
const Adminmodel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const { parseISTDateOnly } = require("../utils/Istdate.utils");

const announcementmodel = require("../Models/announcement.model");
const uidmodel = require("../Models/UIDmodel.model");
const Usermodel = require("../Models/user.model");
const generateUID = require("../automatic/uidgeneration");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { sendEmail } = require("../utils/nodemailer.utils");
const assignDefaultLeave = require("../automatic/bydefaultleaveset");
const LeavePolicy = require("../Models/Leavepolicy.model");
const PermissionModel = require("../Models/permission.model");
const Leave = require("../Models/leave.model");
const Review = require("../Models/review.model");
const { buildReviewFields, createReviewOrThrow, respondToReviewAsReviewee, hrAcknowledgeReview } = require("../utils/reviewWorkflow.utils");
const generateOTP = require("../automatic/otpgenerator");
const OtpModel = require("../Models/otpbasedlogin.model");
const leavebalanceModel = require("../Models/leavebalance.model");
const reviewModel = require("../Models/review.model");
const Attendance = require("../Models/attendance.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const SuperAdminModel = require("../Models/superadmin.model");
const Document = require("../Models/document.model");
const Ticket = require("../Models/ticket.model");
const { startOfDay } = require("../automatic/weekoffcalendar");
const { processLeaveDeduction } = require("../automatic/calculateleave");
const AttendanceSummary = require("../Models/attendancesummary.model");
const WFH = require("../Models/wfh.model");
const { canOnboardUser, incrementActiveUserCount, decrementActiveUserCount } = require("../utils/licenseCheck");
const AssetModel = require("../Models/asset.model");
const { notifyLeaveDecision, notifyAssetAssigned, notifyLeaveApplied } = require("../utils/notify.utils");
const { isEmailTaken, isEmpidTaken } = require("../utils/emailAvailability.utils");

const EXCLUDE =
  "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt";
const PROFILE_EXCLUDE = EXCLUDE.replace(" -createdAt", "");

const verifyAdmin = async (req, res, next) => {
  const { token } = req.params;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(400).send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Verification Failed</title>
</head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 0;">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" border="0"
style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
<tr>
<td style="background:linear-gradient(135deg,#730042,#CD166E);padding:35px;text-align:center;color:#ffffff;">
<h1 style="margin:0;font-size:26px;">Verification Failed</h1>
</td>
</tr>
<tr>
<td style="padding:40px;text-align:center;color:#333333;">
<div style="font-size:60px;">❌</div>
<h2 style="color:#730042;margin-top:20px;">Link Expired or Invalid</h2>
<p style="font-size:15px;line-height:1.8;color:#555;">
Your verification link has expired or is no longer valid.<br/>Please contact your administrator to resend the verification email.
</p>
</td>
</tr>
<tr>
<td style="background:#F4F6F9;padding:20px;text-align:center;font-size:12px;color:#888888;">
© 2026 HRMS Platform. All rights reserved.
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`);
  }

  const admin = await Adminmodel.findByIdAndUpdate(
    decoded.adminid,
    { isVerified: true },
    { returnDocument: "after" }
  ).lean();

  if (!admin) {
    return res.status(400).send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Verification Failed</title>
</head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 0;">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" border="0"
style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
<tr>
<td style="background:linear-gradient(135deg,#730042,#CD166E);padding:35px;text-align:center;color:#ffffff;">
<h1 style="margin:0;font-size:26px;">Verification Failed</h1>
</td>
</tr>
<tr>
<td style="padding:40px;text-align:center;color:#333333;">
<div style="font-size:60px;">⚠️</div>
<h2 style="color:#730042;margin-top:20px;">Account Not Found</h2>
<p style="font-size:15px;line-height:1.8;color:#555;">
We could not find an account associated with this verification link.<br/>Please contact your administrator for assistance.
</p>
</td>
</tr>
<tr>
<td style="background:#F4F6F9;padding:20px;text-align:center;font-size:12px;color:#888888;">
© 2026 HRMS Platform. All rights reserved.
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`);
  }

  return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Account Verified</title>
</head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 0;">
<tr><td align="center">
<table width="500" cellpadding="0" cellspacing="0" border="0"
style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
<tr>
<td style="background:linear-gradient(135deg,#730042,#CD166E);padding:35px;text-align:center;color:#ffffff;">
<h1 style="margin:0;font-size:26px;">Account Activated!</h1>
<p style="margin-top:10px;font-size:15px;opacity:0.9;">Your admin account is now active</p>
</td>
</tr>
<tr>
<td style="padding:40px;text-align:center;color:#333333;">
<div style="font-size:60px;">✅</div>
<h2 style="color:#730042;margin-top:20px;">Hello ${admin.f_name} ${admin.l_name},</h2>
<p style="font-size:15px;line-height:1.8;color:#555;">
Your email has been verified successfully.<br/>You can now log in to your HRMS dashboard.
</p>
<table width="100%" cellpadding="0" cellspacing="0"
style="margin:25px 0;background:#F9F8F2;border-radius:10px;padding:20px;text-align:left;">
<tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>UID:</strong> ${admin.uid}</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Role:</strong> ${admin.role}</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Email:</strong> ${admin.work_email}</td></tr>
<tr><td style="padding:6px 0;font-size:14px;color:#555;"><strong>Department:</strong> ${admin.department}</td></tr>
</table>
<div style="margin:30px 0;">
<a href="http://torchxsuite.com/talent/login"
style="background:#CD166E;color:#ffffff;padding:14px 35px;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">
Go to Login
</a>
</div>
</td>
</tr>
<tr>
<td style="background:#F4F6F9;padding:20px;text-align:center;font-size:12px;color:#888888;">
© 2026 HRMS Platform. All rights reserved.
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`);
};

const adminlogin = async (req, res, next) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return next(Object.assign(new Error("All fields are required"), { statusCode: 400 }));

  const admin = await Adminmodel.findOne({ work_email: identifier });
  if (!admin)
    return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

  if (!admin.isVerified)
    return next(Object.assign(new Error("Please verify your email before logging in"), { statusCode: 403 }));

  if (admin.status === "suspended")
    return next(Object.assign(new Error("Your account has been suspended. Contact super admin."), { statusCode: 403 }));

  if (admin.working_status !== "working")
    return next(Object.assign(new Error("Your account is not active. Please contact super admin."), { statusCode: 403 }));

  const isMatch = await admin.isValidPassword(password);
  if (!isMatch)
    return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

  let superAdmin = admin.organisation_id
    ? await SuperAdminModel.findById(admin.organisation_id)
    : null;

  if (!superAdmin) {
    // Fallback for any legacy records where organisation_id wasn't set correctly
    superAdmin = await SuperAdminModel.findOne({
      company_domain: identifier.split("@")[1].toLowerCase().trim(),
    });
  }

  if (!superAdmin)
    return next(Object.assign(new Error("Organisation not found. Please contact support."), { statusCode: 404 }));

  const trialValid = superAdmin.isTrialValid();
  const hasTalentLicense = superAdmin.licenses.some(
    (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
  );
  if (!trialValid && !hasTalentLicense)
    return next(
      Object.assign(
        new Error("Service stopped! Sorry for the inconvenience, please contact your administrator for further assistance."),
        { statusCode: 403, code: "SERVICE_STOPPED" }
      )
    );

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };

  // if (admin.isFirstLogin) {
  //   const firstLoginToken = jwt.sign(
  //     { adminid: admin._id, work_email: admin.work_email, purpose: "first_login" },
  //     process.env.JWT_SECRET,
  //     { expiresIn: "15m" }
  //   );
  //   res.cookie("resetToken", firstLoginToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  //   sendEmail({
  //     to: admin.work_email,
  //     subject: "Set Your Password",
  //     html: `<div style="font-family:Arial,sans-serif;padding:20px"><h2>Hello ${admin.f_name},</h2><p>This is your first login. Please set your password using the link below.</p><a href="${process.env.BASE_URL}talent/api/admin/resetpassword" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">Set Password</a><p>This link expires in 15 minutes.</p></div>`,
  //   }).catch((err) => console.error("First login email failed:", err.message));
  //   return next(
  //     Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 })
  //   );
  // }

 const token = jwt.sign(
  { adminid: admin._id, role: admin.role, email: admin.work_email, created_by: admin.created_by, organisation_id: admin.organisation_id },
  process.env.JWT_SECRET,
  { expiresIn: "15d" }
);

  res.cookie("token", token, { ...cookieOpts, maxAge: 15 * 24 * 60 * 60 * 1000 });

  Adminmodel.findByIdAndUpdate(admin._id, {
    status: "active",
    last_login: new Date(),
    isFirstLogin: false,
  }).exec();

  res.status(200).json({
    message: "Login successful",
    admin: {
      id: admin._id,
      username: admin.username,
      email: admin.email,
    },
    role: admin.role,
    token
  });
};

const adminlogout = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  // NOTE: do NOT flip `status` here. `status` represents the admin's
  // account state (active/inactive/suspended) and is checked by
  // admin.middleware.js on every request. Setting it to "inactive" on
  // logout locks the admin out of the account (403 "Your account is
  // inactive") until their next successful login, and can 403 any other
  // still-valid session/tab/device in the meantime. Logout should only
  // clear this session's cookie, not mutate account status.
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
  res.status(200).json({ message: "Admin logout successful" });
};

const resolveReportingManager = async (reporting_manager_id, organisation_id) => {
  if (!reporting_manager_id) return { reportingManagerId: null, reportingManagerModel: null };

  const manager = await Managermodel.findOne({ _id: reporting_manager_id, organisation_id })
    .select("_id")
    .lean();
  if (manager) return { reportingManagerId: manager._id, reportingManagerModel: "Manager" };

  const admin = await Adminmodel.findOne({ _id: reporting_manager_id, organisation_id })
    .select("_id")
    .lean();
  if (admin) return { reportingManagerId: admin._id, reportingManagerModel: "Admin" };

  return { reportingManagerId: null, reportingManagerModel: null };
};

// ─── Role-based default permissions ───────────────────────────────────────────
// admin   : announcements + documents + tickets + recruitment  (all features)
// manager : announcements + documents + tickets + recruitment  (all features)
// employee: announcements + documents + tickets only           (NO recruitment)
const DEFAULT_PERMISSIONS = {
  admin: {
    announcements: {
      can_view_announcements: true,
      can_create_announcement: true,
      can_edit_announcement: true,
      can_delete_announcement: true,
    },
    documents: {
      can_upload_documents: true,
      can_view_all_documents: true,
    },
    tickets: {
      can_raise_ticket: true,
      can_view_all_tickets: true,
      can_resolve_ticket: true,
      can_rate_ticket: true,
    },
    recruitment: {
      can_view_hiring_requisitions: true,
      can_create_hiring_requisition: true,
      can_view_candidates: true,
      can_add_candidate: true,
    },
  },
  manager: {
    announcements: {
      can_view_announcements: true,
      can_create_announcement: true,
      can_edit_announcement: true,
      can_delete_announcement: true,
    },
    documents: {
      can_upload_documents: true,
      can_view_all_documents: true,
    },
    tickets: {
      can_raise_ticket: true,
      can_view_all_tickets: true,
      can_resolve_ticket: true,
      can_rate_ticket: true,
    },
    recruitment: {
      can_view_hiring_requisitions: true,
      can_create_hiring_requisition: true,
      can_view_candidates: true,
      can_add_candidate: true,
    },
  },
  employee: {
    announcements: {
      can_view_announcements: true,
      can_create_announcement: false,
      can_edit_announcement: false,
      can_delete_announcement: false,
    },
    documents: {
      can_upload_documents: true,
      can_view_all_documents: false,
    },
    tickets: {
      can_raise_ticket: true,
      can_view_all_tickets: false,
      can_resolve_ticket: false,
      can_rate_ticket: true,
    },
    // Employees have NO recruitment access
    recruitment: {
      can_view_hiring_requisitions: false,
      can_create_hiring_requisition: false,
      can_view_candidates: false,
      can_add_candidate: false,
    },
  },
};

const USER_MODEL_MAP = {
  admin: "Admin",
  senior_admin: "Admin",
  official: "Admin",
  manager: "Manager",
  senior_manager: "Manager",
  employee: "User",
};

const mergePermissions = (role, overrides) => {
  const permissionRole = ["admin", "senior_admin", "official"].includes(role)
    ? "admin"
    : ["manager", "senior_manager"].includes(role)
    ? "manager"
    : "employee";

  const defaults = DEFAULT_PERMISSIONS[permissionRole];
  if (!overrides) return defaults;

  return {
    announcements: {
      can_view_announcements: overrides.announcements?.can_view_announcements ?? defaults.announcements.can_view_announcements,
      can_create_announcement: overrides.announcements?.can_create_announcement ?? defaults.announcements.can_create_announcement,
      can_edit_announcement: overrides.announcements?.can_edit_announcement ?? defaults.announcements.can_edit_announcement,
      can_delete_announcement: overrides.announcements?.can_delete_announcement ?? defaults.announcements.can_delete_announcement,
    },
    documents: {
      can_upload_documents: overrides.documents?.can_upload_documents ?? defaults.documents.can_upload_documents,
      can_view_all_documents: overrides.documents?.can_view_all_documents ?? defaults.documents.can_view_all_documents,
    },
    tickets: {
      can_raise_ticket: overrides.tickets?.can_raise_ticket ?? defaults.tickets.can_raise_ticket,
      can_view_all_tickets: overrides.tickets?.can_view_all_tickets ?? defaults.tickets.can_view_all_tickets,
      can_resolve_ticket: overrides.tickets?.can_resolve_ticket ?? defaults.tickets.can_resolve_ticket,
      can_rate_ticket: overrides.tickets?.can_rate_ticket ?? defaults.tickets.can_rate_ticket,
    },
    recruitment: {
      can_view_hiring_requisitions: overrides.recruitment?.can_view_hiring_requisitions ?? defaults.recruitment.can_view_hiring_requisitions,
      can_create_hiring_requisition: overrides.recruitment?.can_create_hiring_requisition ?? defaults.recruitment.can_create_hiring_requisition,
      can_view_candidates: overrides.recruitment?.can_view_candidates ?? defaults.recruitment.can_view_candidates,
      can_add_candidate: overrides.recruitment?.can_add_candidate ?? defaults.recruitment.can_add_candidate,
    },
  };
};

const assignDefaultPermissions = async (
  user_id,
  role,
  organisation_id,
  granted_by,
  granted_by_model,
  session,
  overrides
) => {
  const user_model = USER_MODEL_MAP[role] || "User";
  const perms = mergePermissions(role, overrides);

  await PermissionModel.findOneAndUpdate(
    { user_id, user_model, organisation_id },
    {
      $set: {
        user_id,
        user_model,
        organisation_id,
        granted_by,
        granted_by_model,
        ...perms,
      },
    },
    { upsert: true, new: true, runValidators: true, session: session || undefined }
  );
};

const addmanager = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const {
      empid, profile_image, f_name, l_name, work_email, gender, marital_status, password,
      personal_contact, e_contact, aadhaar_number, pan_number, address, city, state,
      pincode, country, role, office_location, designation, department, reporting_manager,
      is_fresher, total_experience, previous_company, previous_designation, bank_name,
      account_holder_name, account_number, ifsc_code, resume, aadhaar_card, pan_card,
      experience_letter, permissions,
    } = req.body;

    if (!empid || !f_name || !l_name || !work_email || !password || !department || !designation || !office_location || !gender || !personal_contact || !e_contact)
      return next(Object.assign(new Error("empid and other required fields are missing"), { statusCode: 400 }));

    const superAdmin = await SuperAdminModel.findById(req.admin.organisation_id)
      .select("_id organisation_name")
      .lean();
    if (!superAdmin)
      return next(Object.assign(new Error("Organisation not found. Please contact administrator."), { statusCode: 404 }));

    const organisation_id = superAdmin._id;

    const emailCheck = await isEmailTaken(work_email);
    if (emailCheck.taken)
      return next(Object.assign(new Error("An account with this email already exists"), { statusCode: 400 }));

    const empidTaken = await isEmpidTaken(empid, organisation_id); // see helper below
    if (empidTaken)
      return next(Object.assign(new Error("This Employee ID is already in use"), { statusCode: 400 }));

    const licenseCheck = await canOnboardUser(organisation_id);
    if (!licenseCheck.allowed)
      return next(Object.assign(new Error(licenseCheck.message), { statusCode: 403 }));

    const uid = await generateUID(department, organisation_id);
    const { reportingManagerId, reportingManagerModel } = await resolveReportingManager(
      reporting_manager,
      organisation_id
    );

    const newmanager = await Managermodel.create({
      organisation_id, empid, profile_image, uid, department, f_name, l_name, work_email, password,
      gender, marital_status, personal_contact, e_contact, aadhaar_number, pan_number,
      address, city, state, pincode, country, role, designation, office_location,
      reporting_manager: reportingManagerId,
      reporting_manager_model: reportingManagerModel,
      is_fresher, total_experience, previous_company, previous_designation, bank_name,
      account_holder_name, account_number, ifsc_code, resume, aadhaar_card, pan_card,
      experience_letter,
      date_of_joining: new Date(),
    });

    const token = jwt.sign(
      { managerid: newmanager._id, work_email: newmanager.work_email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const verifyLink = `${process.env.BASE_URL}talent/api/manager/verify/${token}`;

    await Promise.all([
      assignDefaultLeave(newmanager, false),
      assignDefaultPermissions(
        newmanager._id,
        newmanager.role || "manager",
        organisation_id,
        req.admin._id,
        "Admin",
        null,
        permissions
      ),
      sendEmail({
        to: work_email,
        subject: "Activate Your Manager Account",
        html: `<div style="font-family:Arial,sans-serif;padding:20px"><h2>Hello ${f_name},</h2><p>Your manager account has been created successfully.</p><p><strong>Employee ID:</strong> ${empid}</p><p><strong>UID:</strong> ${uid}</p><p><strong>Department:</strong> ${department}</p><p><strong>Designation:</strong> ${designation}</p><p><strong>Temporary Password:</strong> ${password}</p><p>Please verify your account by clicking below:</p><a href="${verifyLink}" style="background:#730042;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Verify Account</a><p>This link will expire in 7 days.</p><p>For security, please log in and change this password immediately after verifying your account.</p><p>Regards,<br/>HR Team</p></div>`,
      }),
      incrementActiveUserCount(organisation_id),
    ]);

    return res.status(201).json({
      success: true,
      message: "Manager added successfully. Verification email sent.",
      manager: {
        _id: newmanager._id,
        empid: newmanager.empid,
        uid: newmanager.uid,
        work_email: newmanager.work_email,
        organisation_id: newmanager.organisation_id,
        reporting_manager: reportingManagerId,
        reporting_manager_model: reportingManagerModel,
      },
    });
  } catch (error) {
    next(error);
  }
};

const addemployee = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const {
      empid, profile_image, f_name, l_name, work_email, password, gender, marital_status,
      personal_contact, e_contact, aadhaar_number, pan_number, address, city, state,
      pincode, country, role, office_location, designation, department, Under_manager, is_fresher,
      total_experience, previous_company, previous_designation, bank_name, account_holder_name,
      account_number, ifsc_code, resume, aadhaar_card, pan_card, experience_letter, permissions,
    } = req.body;

    if (!empid || !f_name || !l_name || !work_email || !password || !department || !designation || !office_location || !gender || !personal_contact || !e_contact)
      return next(Object.assign(new Error("empid and other required fields are missing"), { statusCode: 400 }));

    const organisation_id = req.admin.organisation_id;

    const emailCheck = await isEmailTaken(work_email);
    if (emailCheck.taken)
      return next(Object.assign(new Error("An account with this email already exists"), { statusCode: 400 }));

    const empidTaken = await isEmpidTaken(empid, organisation_id);
    if (empidTaken)
      return next(Object.assign(new Error("This Employee ID is already in use"), { statusCode: 400 }));

    const licenseCheck = await canOnboardUser(organisation_id);
    if (!licenseCheck.allowed)
      return next(Object.assign(new Error(licenseCheck.message), { statusCode: 403 }));

    if (Under_manager) {
      const managerExists = await Managermodel.findOne({ _id: Under_manager, organisation_id })
        .select("_id")
        .lean();
      if (!managerExists)
        return next(Object.assign(new Error("Assigned manager not found in this organisation"), { statusCode: 404 }));
    }

    const uid = await generateUID(department, organisation_id);

    const newuser = await Usermodel.create({
      organisation_id, empid, profile_image, uid, department, Under_manager: Under_manager || null,
      f_name, l_name, work_email, password, gender, marital_status, personal_contact, e_contact,
      aadhaar_number, pan_number, address, city, state, pincode, country, role, designation, office_location,
      is_fresher, total_experience, previous_company, previous_designation, bank_name,
      account_holder_name, account_number, ifsc_code, resume, aadhaar_card, pan_card, experience_letter,
      date_of_joining: new Date(),
    });

    const token = jwt.sign({ userid: newuser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const verifyLink = `${process.env.BASE_URL}talent/api/user/verify/${token}`;

    await Promise.all([
      assignDefaultLeave(newuser, false),
      assignDefaultPermissions(
        newuser._id,
        newuser.role || "employee",
        organisation_id,
        req.admin._id,
        "Admin",
        null,
        permissions
      ),
      sendEmail({
        to: work_email,
        subject: "Welcome! Verify Your Employee Account",
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" style="background:#fff;border-radius:14px;overflow:hidden;"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1>Welcome Aboard</h1></td></tr><tr><td style="padding:40px;"><h2>Hello ${f_name}</h2><p>Your employee account has been created.</p><p><strong>Employee ID:</strong> ${empid}</p><p><strong>Department:</strong> ${department}</p><p><strong>Location:</strong> ${office_location}</p><p><strong>Temporary Password:</strong> ${password}</p><a href="${verifyLink}" style="background:#730042;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;">Verify Account</a><p>For security, please log in and change this password immediately after verifying your account.</p></td></tr></table></td></tr></table></body></html>`,
      }),
      incrementActiveUserCount(organisation_id),
    ]);

    return res.status(201).json({ success: true, message: "User added successfully. Verification email sent.", empid: newuser.empid });
  } catch (error) {
    next(error);
  }
};

const findallmanagers = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const organisation_id = req.admin.organisation_id;

    const [managers, admins] = await Promise.all([
      Managermodel.find({ organisation_id, working_status: "working" })
        .select(EXCLUDE)
        .populate("reporting_manager", "f_name l_name work_email designation")
        .lean(),
      Adminmodel.find({ organisation_id, working_status: "working" })
        .select("uid f_name l_name work_email designation department office_location role organisation_id")
        .lean(),
    ]);

    const allManagers = [
      ...admins.map((admin) => ({ ...admin, isAdmin: true })),
      ...managers,
    ];

    return res.status(200).json({
      success: true,
      organisation_id,
      count: allManagers.length,
      managers: allManagers,
    });
  } catch (error) {
    next(error);
  }
};

const findallemployeesfull = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;

    const employees = await Usermodel.find({ organisation_id, working_status: "working" })
      .select(EXCLUDE)
      .populate("Under_manager", "f_name l_name work_email designation")
      .lean();

    return res.status(200).json({
      success: true,
      organisation_id,
      count: employees.length,
      employees,
    });
  } catch (error) {
    next(error);
  }
};


const findallmanagerswoadmin = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const organisation_id = req.admin.organisation_id;

    // Was querying every manager in the org, so any admin could see (and
    // review) managers that don't report up to them. Scope to just this
    // admin's own team, same as getTodayCheckins does.
    const teamManagerIds = [...(await getAdminTeamManagerIds(req.admin._id, organisation_id))];

    if (!teamManagerIds.length) {
      return res.status(200).json({ success: true, organisation_id, count: 0, managers: [] });
    }

    const managers = await Managermodel.find({
      organisation_id,
      working_status: "working",
      _id: { $in: teamManagerIds },
    })
      .select(EXCLUDE)
      .populate("reporting_manager", "f_name l_name work_email designation")
      .lean();

    return res.status(200).json({
      success: true,
      organisation_id,
      count: managers.length,
      managers,
    });
  } catch (error) {
    next(error);
  }
};

// Walks the manager hierarchy and returns the set of manager _ids (as
// strings) that report — directly, or through a chain of managers — to
// the given admin. Used to scope "my team" data (dashboard employee list,
// today's check-ins, etc.) to just the people under a specific admin,
// instead of leaking the whole organisation to every admin.
const getAdminTeamManagerIds = async (adminId, organisation_id) => {
  const allManagers = await Managermodel.find({ organisation_id })
    .select("_id reporting_manager reporting_manager_model")
    .lean();

  const managerIds = new Set();
  let frontierIds = allManagers
    .filter((m) => m.reporting_manager_model === "Admin" && String(m.reporting_manager) === String(adminId))
    .map((m) => String(m._id));

  while (frontierIds.length) {
    frontierIds.forEach((id) => managerIds.add(id));
    const frontierSet = new Set(frontierIds);
    frontierIds = allManagers
      .filter(
        (m) =>
          m.reporting_manager_model === "Manager" &&
          frontierSet.has(String(m.reporting_manager)) &&
          !managerIds.has(String(m._id))
      )
      .map((m) => String(m._id));
  }

  return managerIds;
};

const getallemployee = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;

    const [users, managers] = await Promise.all([
  Usermodel.find({ organisation_id, working_status: "working" })
    .select("empid uid f_name l_name work_email role department designation office_location Under_manager organisation_id gender e_contact personal_contact")
    .populate({ path: "Under_manager", select: "empid uid f_name l_name work_email role" })
    .lean(),
  Managermodel.find({ organisation_id, working_status: "working" })
    .select("empid uid f_name l_name work_email role designation office_location department gender personal_contact e_contact reporting_manager reporting_manager_model organisation_id")
    .populate({ path: "reporting_manager", select: "empid uid f_name l_name work_email role" })
    .lean(),
]);

    const allEmployees = [
      ...users.map((user) => ({ type: "employee", ...user })),
      ...managers.map((manager) => ({ type: "manager", ...manager })),
    ];

    return res.status(200).json({
      success: true,
      organisation_id,
      employees: users.length,
      managers: managers.length,
      count: allEmployees.length,
      users: allEmployees,
    });
  } catch (error) {
    next(error);
  }
};


const getMyTeamOverview = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;
    const teamManagerIds = [...(await getAdminTeamManagerIds(req.admin._id, organisation_id))];

    const [users, managers] = await Promise.all([
      teamManagerIds.length
        ? Usermodel.find({ organisation_id, working_status: "working", Under_manager: { $in: teamManagerIds } })
           .select("empid uid f_name l_name work_email role department designation office_location profile_image Under_manager organisation_id")
            .populate({ path: "Under_manager", select:"empid uid f_name l_name work_email role" })
            .lean()
        : [],
      teamManagerIds.length
        ? Managermodel.find({ organisation_id, working_status: "working", _id: { $in: teamManagerIds } })
            .select("empid uid f_name l_name work_email role designation office_location department gender personal_contact e_contact profile_image reporting_manager reporting_manager_model organisation_id")
            .populate({ path: "reporting_manager", select: "empid uid f_name l_name work_email role" })
            .lean()
        : [],
    ]);

    const allEmployees = [
      ...users.map((user) => ({ type: "employee", ...user })),
      ...managers.map((manager) => ({ type: "manager", ...manager })),
    ];

    return res.status(200).json({
      success: true,
      organisation_id,
      employees: users.length,
      managers: managers.length,
      count: allEmployees.length,
      users: allEmployees,
    });
  } catch (error) {
    next(error);
  }
};

const editemployee = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;

    const {
      f_name, l_name, work_email, gender, marital_status, personal_contact, e_contact,
      role, office_location, designation, department, Under_manager,
    } = req.body;

    if (Under_manager) {
      const managerExists = await Managermodel.findOne({ _id: Under_manager, organisation_id })
        .select("_id")
        .lean();
      if (!managerExists)
        return next(Object.assign(new Error("Assigned manager not found in this organisation"), { statusCode: 404 }));
    }

    const updateData = {
      ...(f_name !== undefined && { f_name }),
      ...(l_name !== undefined && { l_name }),
      ...(work_email !== undefined && { work_email }),
      ...(gender !== undefined && { gender }),
      ...(marital_status !== undefined && { marital_status }),
      ...(personal_contact !== undefined && { personal_contact }),
      ...(e_contact !== undefined && { e_contact }),
      ...(role !== undefined && { role }),
      ...(office_location !== undefined && { office_location }),
      ...(designation !== undefined && { designation }),
      ...(department !== undefined && { department }),
      Under_manager: Under_manager || null,
    };

    const user = await Usermodel.findOneAndUpdate(
      { _id: id, organisation_id },
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!user)
      return next(Object.assign(new Error("Employee not found"), { statusCode: 404 }));

    return res.status(200).json({ success: true, message: "Employee updated successfully", user });
  } catch (error) {
    next(error);
  }
};

const editmanager = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;

    const {
      f_name, l_name, work_email, gender, marital_status, personal_contact, e_contact,
      role, office_location, designation, department, reporting_manager,
    } = req.body;

    if (reporting_manager && reporting_manager.toString() === id.toString())
      return next(Object.assign(new Error("A manager cannot report to themselves"), { statusCode: 400 }));

    const { reportingManagerId, reportingManagerModel } = await resolveReportingManager(
      reporting_manager,
      organisation_id
    );

    const updateData = {
      ...(f_name !== undefined && { f_name }),
      ...(l_name !== undefined && { l_name }),
      ...(work_email !== undefined && { work_email }),
      ...(gender !== undefined && { gender }),
      ...(marital_status !== undefined && { marital_status }),
      ...(personal_contact !== undefined && { personal_contact }),
      ...(e_contact !== undefined && { e_contact }),
      ...(role !== undefined && { role }),
      ...(office_location !== undefined && { office_location }),
      ...(designation !== undefined && { designation }),
      ...(department !== undefined && { department }),
      reporting_manager: reportingManagerId,
      reporting_manager_model: reportingManagerModel,
    };

    const manager = await Managermodel.findOneAndUpdate(
      { _id: id, organisation_id },
      updateData,
      { new: true, runValidators: true }
    )
      .select(EXCLUDE)
      .populate("reporting_manager", "f_name l_name work_email designation role")
      .lean();

    if (!manager)
      return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));

    return res.status(200).json({ success: true, message: "Manager updated successfully", manager });
  } catch (error) {
    next(error);
  }
};

const promoteEmployeeToManager = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { reporting_manager, designation, role, reason } = req.body;

    const user = await Usermodel.findOne({ _id: id, organisation_id }).lean();
    if (!user)
      return next(Object.assign(new Error("Employee not found"), { statusCode: 404 }));

    const existing = await Managermodel.findOne({ work_email: user.work_email, organisation_id })
      .select("_id").lean();
    if (existing)
      return next(Object.assign(new Error("A manager with this email already exists"), { statusCode: 400 }));

    const { reportingManagerId, reportingManagerModel } = await resolveReportingManager(
      reporting_manager, organisation_id
    );

    const yearsAtCompany = parseFloat(
      ((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const newRole = role || "manager";
    const newUid = await generateUID(user.department, organisation_id);

    const [newManager] = await Managermodel.create([{
      organisation_id,
      empid: user.empid,
      uid: newUid,
      profile_image: user.profile_image || null,
      department: user.department,
      f_name: user.f_name,
      l_name: user.l_name,
      work_email: user.work_email,
      password: "placeholder_will_be_overwritten",
      gender: user.gender,
      marital_status: user.marital_status || "single",
      personal_contact: user.personal_contact,
      e_contact: user.e_contact,
      aadhaar_number: user.aadhaar_number || null,
      pan_number: user.pan_number || null,
      address: user.address || null,
      city: user.city || null,
      state: user.state || null,
      pincode: user.pincode || null,
      designation: designation || user.designation,
      role: newRole,
      office_location: user.office_location,
      reporting_manager: reportingManagerId,
      reporting_manager_model: reportingManagerModel,
      is_fresher: false,
      total_experience: (user.total_experience || 0) + yearsAtCompany,
      previous_company: user.previous_company || null,
      previous_designation: user.designation,
      bank_name: user.bank_name || null,
      account_holder_name: user.account_holder_name || null,
      account_number: user.account_number || null,
      ifsc_code: user.ifsc_code || null,
      resume: user.resume || null,
      aadhaar_card: user.aadhaar_card || null,
      pan_card: user.pan_card || null,
      experience_letter: user.experience_letter || null,
      isVerified: user.isverified,
      status: user.status,
      isFirstLogin: false,
    }], { session });

    await Managermodel.findByIdAndUpdate(
      newManager._id,
      { $set: { password: user.password } },
      { session }
    );

    await assignDefaultLeave({ ...newManager.toObject(), _id: newManager._id }, false);

    await Promise.all([
      Usermodel.findByIdAndDelete(id, { session }),

      PermissionModel.findOneAndDelete({ user_id: id, user_model: "User", organisation_id }, { session }),

      assignDefaultPermissions(
        newManager._id,
        newManager.role || "manager",
        organisation_id,
        req.admin._id,
        "Admin",
        session
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id } },
        { session }
      ),

      Ticket.updateMany(
        { submittedBy: id, submitterModel: "User", organisation_id },
        { $set: { submittedBy: newManager._id, submitterModel: "Manager", submitterRole: "manager" } },
        { session }
      ),

      Ticket.updateMany(
        { against: id, againstModel: "User", organisation_id },
        { $set: { against: newManager._id, againstModel: "Manager" } },
        { session }
      ),

      Leave.updateMany(
        { employee: id, organisation_id, applicantName: { $exists: false } },
        { $set: {
          applicantName: `${user.f_name} ${user.l_name || ""}`.trim(),
          applicantEmail: user.work_email,
          applicantRole: "Employee",
        } },
        { session }
      ),
    ]);

    await session.commitTransaction();

    if (user.working_status === "working") {
      await decrementActiveUserCount(organisation_id);
    }
    await incrementActiveUserCount(organisation_id);

    return res.status(200).json({
      success: true,
      message: `${user.f_name} ${user.l_name} has been promoted from Employee to Manager`,
      manager: {
        _id: newManager._id,
        uid: newManager.uid,
        work_email: newManager.work_email,
        role: newManager.role,
        designation: newManager.designation,
        previous_designation: user.designation,
        total_experience: (user.total_experience || 0) + yearsAtCompany,
        reporting_manager: reportingManagerId,
        reporting_manager_model: reportingManagerModel,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};


const promoteManagerToAdmin = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { reporting_manager, designation, role } = req.body;

    const manager = await Managermodel.findOne({ _id: id, organisation_id }).lean();
    if (!manager)
      return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));

    const existing = await Adminmodel.findOne({ work_email: manager.work_email, organisation_id })
      .select("_id").lean();
    if (existing)
      return next(Object.assign(new Error("An admin with this email already exists"), { statusCode: 400 }));

    const superAdmin = await SuperAdminModel.findById(organisation_id).select("_id").lean();
    if (!superAdmin)
      return next(Object.assign(new Error("Organisation not found"), { statusCode: 404 }));

    if (reporting_manager && reporting_manager.toString() === id.toString())
      return next(Object.assign(new Error("A manager cannot report to themselves"), { statusCode: 400 }));

    // Default: a newly promoted Admin reports directly to the Super Admin unless
    // a specific reporting manager/admin was explicitly chosen.
    let resolvedReportingManagerId = superAdmin._id;
    let resolvedReportingManagerModel = "SuperAdmin";
    if (reporting_manager) {
      const superAdminDoc = await SuperAdminModel.findById(reporting_manager).select("_id").lean();
      if (superAdminDoc) {
        resolvedReportingManagerId = superAdminDoc._id;
        resolvedReportingManagerModel = "SuperAdmin";
      } else {
        const mgr = await Managermodel.findOne({ _id: reporting_manager, organisation_id }).select("_id").lean();
        if (mgr) {
          resolvedReportingManagerId = mgr._id;
          resolvedReportingManagerModel = "Manager";
        }
      }
    }

    const yearsAtCompany = parseFloat(
      ((Date.now() - new Date(manager.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const newUid = await generateUID(manager.department, organisation_id);

    const [newAdmin] = await Adminmodel.create([{
      organisation_id,
      empid: manager.empid,
      uid: newUid,
      profile_image: manager.profile_image || null,
      department: manager.department,
      f_name: manager.f_name,
      l_name: manager.l_name,
      work_email: manager.work_email,
      password: "placeholder_will_be_overwritten",
      gender: manager.gender,
      marital_status: manager.marital_status || "single",
      personal_contact: manager.personal_contact,
      e_contact: manager.e_contact,
      aadhaar_number: manager.aadhaar_number || null,
      pan_number: manager.pan_number || null,
      address: manager.address || null,
      city: manager.city || null,
      state: manager.state || null,
      pincode: manager.pincode || null,
      designation: designation || manager.designation,
      role: role || "admin",
      office_location: manager.office_location,
      reporting_manager: resolvedReportingManagerId,
      reporting_manager_model: resolvedReportingManagerModel,
      is_fresher: false,
      total_experience: (manager.total_experience || 0) + yearsAtCompany,
      previous_company: manager.previous_company || null,
      previous_designation: manager.designation,
      bank_name: manager.bank_name || null,
      account_holder_name: manager.account_holder_name || null,
      account_number: manager.account_number || null,
      ifsc_code: manager.ifsc_code || null,
      resume: manager.resume || null,
      aadhaar_card: manager.aadhaar_card || null,
      pan_card: manager.pan_card || null,
      experience_letter: manager.experience_letter || null,
      created_by: req.admin.created_by || req.admin._id,
      isVerified: manager.isVerified,
      status: manager.status,
      isFirstLogin: false,
      last_login: null,
    }], { session });

    await Adminmodel.findByIdAndUpdate(
      newAdmin._id,
      { $set: { password: manager.password } },
      { session }
    );

    await assignDefaultLeave({ ...newAdmin.toObject(), _id: newAdmin._id }, true);

    await LeavePolicy.findOneAndUpdate(
      { organisation_id: req.admin.organisation_id },
      { $set: { locked: true } },
      { upsert: true }
    );

    await Promise.all([
      Managermodel.findByIdAndDelete(id, { session }),

      PermissionModel.findOneAndDelete({ user_id: id, user_model: "Manager", organisation_id }, { session }),

      assignDefaultPermissions(
        newAdmin._id,
        newAdmin.role || "admin",
        organisation_id,
        req.admin._id,
        "Admin",
        session
      ),

      Usermodel.updateMany(
        { Under_manager: id, organisation_id },
        { $set: { Under_manager: null } },
        { session }
      ),

      Managermodel.updateMany(
        { reporting_manager: id, reporting_manager_model: "Manager", organisation_id },
        { $set: { reporting_manager: null, reporting_manager_model: null } },
        { session }
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id } },
        { session }
      ),

      Ticket.updateMany(
        { submittedBy: id, submitterModel: "Manager", organisation_id },
        { $set: { submittedBy: newAdmin._id, submitterModel: "Admin", submitterRole: "admin" } },
        { session }
      ),

      Ticket.updateMany(
        { against: id, againstModel: "Manager", organisation_id },
        { $set: { against: newAdmin._id, againstModel: "Admin" } },
        { session }
      ),

      ManagerLeave.updateMany(
        { manager: id, organisation_id, applicantName: { $exists: false } },
        { $set: {
          applicantName: `${manager.f_name} ${manager.l_name || ""}`.trim(),
          applicantEmail: manager.work_email,
          applicantRole: "Manager",
        } },
        { session }
      ),
    ]);

    await session.commitTransaction();

    if (manager.working_status === "working") {
      await decrementActiveUserCount(organisation_id);
    }
    await incrementActiveUserCount(organisation_id);

    return res.status(200).json({
      success: true,
      message: `${manager.f_name} ${manager.l_name} has been promoted from Manager to Admin`,
      admin: {
        _id: newAdmin._id,
        uid: newAdmin.uid,
        work_email: newAdmin.work_email,
        role: newAdmin.role,
        designation: newAdmin.designation,
        previous_designation: manager.designation,
        total_experience: (manager.total_experience || 0) + yearsAtCompany,
        reporting_manager: resolvedReportingManagerId,
        reporting_manager_model: resolvedReportingManagerModel,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

const promoteEmployeeToAdmin = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { reporting_manager, designation, role } = req.body;

    const user = await Usermodel.findOne({ _id: id, organisation_id }).lean();
    if (!user)
      return next(Object.assign(new Error("Employee not found"), { statusCode: 404 }));

    const existing = await Adminmodel.findOne({ work_email: user.work_email, organisation_id })
      .select("_id").lean();
    if (existing)
      return next(Object.assign(new Error("An admin with this email already exists"), { statusCode: 400 }));

    const superAdmin = await SuperAdminModel.findById(organisation_id).select("_id").lean();
    if (!superAdmin)
      return next(Object.assign(new Error("Organisation not found"), { statusCode: 404 }));

    // Default: a newly promoted Admin reports directly to the Super Admin unless
    // a specific reporting manager/admin was explicitly chosen.
    let resolvedReportingManagerId = superAdmin._id;
    let resolvedReportingManagerModel = "SuperAdmin";
    if (reporting_manager) {
      const superAdminDoc = await SuperAdminModel.findById(reporting_manager).select("_id").lean();
      if (superAdminDoc) {
        resolvedReportingManagerId = superAdminDoc._id;
        resolvedReportingManagerModel = "SuperAdmin";
      } else {
        const mgr = await Managermodel.findOne({ _id: reporting_manager, organisation_id }).select("_id").lean();
        if (mgr) {
          resolvedReportingManagerId = mgr._id;
          resolvedReportingManagerModel = "Manager";
        }
      }
    }

    const yearsAtCompany = parseFloat(
      ((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const newUid = await generateUID(user.department, organisation_id);

    const [newAdmin] = await Adminmodel.create([{
      organisation_id,
      empid: user.empid,
      uid: newUid,
      profile_image: user.profile_image || null,
      department: user.department,
      f_name: user.f_name,
      l_name: user.l_name,
      work_email: user.work_email,
      password: "placeholder_will_be_overwritten",
      gender: user.gender,
      marital_status: user.marital_status || "single",
      personal_contact: user.personal_contact,
      e_contact: user.e_contact,
      aadhaar_number: user.aadhaar_number || null,
      pan_number: user.pan_number || null,
      address: user.address || null,
      city: user.city || null,
      state: user.state || null,
      pincode: user.pincode || null,
      designation: designation || user.designation,
      role: role || "admin",
      office_location: user.office_location,
      reporting_manager: resolvedReportingManagerId,
      reporting_manager_model: resolvedReportingManagerModel,
      is_fresher: false,
      total_experience: (user.total_experience || 0) + yearsAtCompany,
      previous_company: user.previous_company || null,
      previous_designation: user.designation,
      bank_name: user.bank_name || null,
      account_holder_name: user.account_holder_name || null,
      account_number: user.account_number || null,
      ifsc_code: user.ifsc_code || null,
      resume: user.resume || null,
      aadhaar_card: user.aadhaar_card || null,
      pan_card: user.pan_card || null,
      experience_letter: user.experience_letter || null,
      created_by: req.admin.created_by || req.admin._id,
      isVerified: user.isverified,
      status: user.status,
      isFirstLogin: false,
      last_login: null,
    }], { session });

    await Adminmodel.findByIdAndUpdate(
      newAdmin._id,
      { $set: { password: user.password } },
      { session }
    );

    await assignDefaultLeave({ ...newAdmin.toObject(), _id: newAdmin._id }, true);

    await LeavePolicy.findOneAndUpdate(
      { organisation_id: req.admin.organisation_id },
      { $set: { locked: true } },
      { upsert: true }
    );

    await Promise.all([
      Usermodel.findByIdAndDelete(id, { session }),

      PermissionModel.findOneAndDelete({ user_id: id, user_model: "User", organisation_id }, { session }),

      assignDefaultPermissions(
        newAdmin._id,
        newAdmin.role || "admin",
        organisation_id,
        req.admin._id,
        "Admin",
        session
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id } },
        { session }
      ),

      Ticket.updateMany(
        { submittedBy: id, submitterModel: "User", organisation_id },
        { $set: { submittedBy: newAdmin._id, submitterModel: "Admin", submitterRole: "admin" } },
        { session }
      ),

      Ticket.updateMany(
        { against: id, againstModel: "User", organisation_id },
        { $set: { against: newAdmin._id, againstModel: "Admin" } },
        { session }
      ),

      Leave.updateMany(
        { employee: id, organisation_id, applicantName: { $exists: false } },
        { $set: {
          applicantName: `${user.f_name} ${user.l_name || ""}`.trim(),
          applicantEmail: user.work_email,
          applicantRole: "Employee",
        } },
        { session }
      ),
    ]);

    await session.commitTransaction();

    if (user.working_status === "working") {
      await decrementActiveUserCount(organisation_id);
    }
    await incrementActiveUserCount(organisation_id);

    return res.status(200).json({
      success: true,
      message: `${user.f_name} ${user.l_name} has been promoted from Employee directly to Admin`,
      admin: {
        _id: newAdmin._id,
        uid: newAdmin.uid,
        work_email: newAdmin.work_email,
        role: newAdmin.role,
        designation: newAdmin.designation,
        previous_designation: user.designation,
        total_experience: (user.total_experience || 0) + yearsAtCompany,
        reporting_manager: resolvedReportingManagerId,
        reporting_manager_model: resolvedReportingManagerModel,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

const demoteManagerToEmployee = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { Under_manager, designation } = req.body;

    const manager = await Managermodel.findOne({ _id: id, organisation_id }).lean();
    if (!manager)
      return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));

    const existing = await Usermodel.findOne({ work_email: manager.work_email, organisation_id })
      .select("_id").lean();
    if (existing)
      return next(Object.assign(new Error("An employee with this email already exists"), { statusCode: 400 }));

    let resolvedUnderManager = null;
    if (Under_manager) {
      const mgr = await Managermodel.findOne({ _id: Under_manager, organisation_id }).select("_id").lean();
      if (!mgr)
        return next(Object.assign(new Error("Assigned manager not found in this organisation"), { statusCode: 404 }));
      resolvedUnderManager = mgr._id;
    }

    const yearsAsManager = parseFloat(
      ((Date.now() - new Date(manager.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const newUid = await generateUID(manager.department, organisation_id);

    const [newEmployee] = await Usermodel.create([{
      organisation_id,
      empid: manager.empid,
      uid: newUid,
      profile_image: manager.profile_image || null,
      department: manager.department,
      f_name: manager.f_name,
      l_name: manager.l_name,
      work_email: manager.work_email,
      password: "placeholder_will_be_overwritten",
      gender: manager.gender,
      marital_status: manager.marital_status || "single",
      personal_contact: manager.personal_contact,
      e_contact: manager.e_contact,
      aadhaar_number: manager.aadhaar_number || null,
      pan_number: manager.pan_number || null,
      address: manager.address || null,
      city: manager.city || null,
      state: manager.state || null,
      pincode: manager.pincode || null,
      designation: designation || manager.designation,
      role: "employee",
      office_location: manager.office_location,
      Under_manager: resolvedUnderManager,
      is_fresher: false,
      total_experience: (manager.total_experience || 0) + yearsAsManager,
      previous_company: manager.previous_company || null,
      previous_designation: manager.designation,
      bank_name: manager.bank_name || null,
      account_holder_name: manager.account_holder_name || null,
      account_number: manager.account_number || null,
      ifsc_code: manager.ifsc_code || null,
      resume: manager.resume || null,
      aadhaar_card: manager.aadhaar_card || null,
      pan_card: manager.pan_card || null,
      experience_letter: manager.experience_letter || null,
      isverified: manager.isVerified,
      status: manager.status,
      isFirstLogin: false,
    }], { session });

    await Usermodel.findByIdAndUpdate(
      newEmployee._id,
      { $set: { password: manager.password } },
      { session }
    );

    await assignDefaultLeave({ ...newEmployee.toObject(), _id: newEmployee._id }, false);

    await Promise.all([
      Managermodel.findByIdAndDelete(id, { session }),

      PermissionModel.findOneAndDelete({ user_id: id, user_model: "Manager", organisation_id }, { session }),

      assignDefaultPermissions(
        newEmployee._id,
        "employee",
        organisation_id,
        req.admin._id,
        "Admin",
        session
      ),

      Usermodel.updateMany(
        { Under_manager: id, organisation_id },
        { $set: { Under_manager: resolvedUnderManager } },
        { session }
      ),

      Managermodel.updateMany(
        { reporting_manager: id, reporting_manager_model: "Manager", organisation_id },
        { $set: { reporting_manager: null, reporting_manager_model: null } },
        { session }
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id } },
        { session }
      ),

      Ticket.updateMany(
        { submittedBy: id, submitterModel: "Manager", organisation_id },
        { $set: { submittedBy: newEmployee._id, submitterModel: "User", submitterRole: "employee" } },
        { session }
      ),

      Ticket.updateMany(
        { against: id, againstModel: "Manager", organisation_id },
        { $set: { against: newEmployee._id, againstModel: "User" } },
        { session }
      ),

      ManagerLeave.updateMany(
        { manager: id, organisation_id, applicantName: { $exists: false } },
        { $set: {
          applicantName: `${manager.f_name} ${manager.l_name || ""}`.trim(),
          applicantEmail: manager.work_email,
          applicantRole: "Manager",
        } },
        { session }
      ),
    ]);

    await session.commitTransaction();

    if (manager.working_status === "working") {
      await decrementActiveUserCount(organisation_id);
    }
    await incrementActiveUserCount(organisation_id);

    return res.status(200).json({
      success: true,
      message: `${manager.f_name} ${manager.l_name} has been demoted from Manager to Employee`,
      employee: {
        _id: newEmployee._id,
        uid: newEmployee.uid,
        work_email: newEmployee.work_email,
        role: newEmployee.role,
        designation: newEmployee.designation,
        previous_designation: manager.designation,
        total_experience: (manager.total_experience || 0) + yearsAsManager,
        Under_manager: resolvedUnderManager,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

const demoteAdminToManager = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { reporting_manager, designation, role } = req.body;

    if (id === req.admin._id.toString())
      return next(Object.assign(new Error("You cannot demote yourself"), { statusCode: 400 }));

    const adminToDemote = await Adminmodel.findOne({ _id: id, organisation_id }).lean();
    if (!adminToDemote)
      return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

    const existing = await Managermodel.findOne({ work_email: adminToDemote.work_email, organisation_id })
      .select("_id").lean();
    if (existing)
      return next(Object.assign(new Error("A manager with this email already exists"), { statusCode: 400 }));

    if (reporting_manager && reporting_manager.toString() === id.toString())
      return next(Object.assign(new Error("A manager cannot report to themselves"), { statusCode: 400 }));

    const { reportingManagerId, reportingManagerModel } = await resolveReportingManager(
      reporting_manager, organisation_id
    );

    const yearsAsAdmin = parseFloat(
      ((Date.now() - new Date(adminToDemote.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const newUid = await generateUID(adminToDemote.department, organisation_id);

    const [newManager] = await Managermodel.create([{
      organisation_id,
      empid: adminToDemote.empid,
      uid: newUid,
      profile_image: adminToDemote.profile_image || null,
      department: adminToDemote.department,
      f_name: adminToDemote.f_name,
      l_name: adminToDemote.l_name,
      work_email: adminToDemote.work_email,
      password: "placeholder_will_be_overwritten",
      gender: adminToDemote.gender,
      marital_status: adminToDemote.marital_status || "single",
      personal_contact: adminToDemote.personal_contact,
      e_contact: adminToDemote.e_contact,
      aadhaar_number: adminToDemote.aadhaar_number || null,
      pan_number: adminToDemote.pan_number || null,
      address: adminToDemote.address || null,
      city: adminToDemote.city || null,
      state: adminToDemote.state || null,
      pincode: adminToDemote.pincode || null,
      designation: designation || adminToDemote.designation,
      role: role || "manager",
      office_location: adminToDemote.office_location,
      reporting_manager: reportingManagerId,
      reporting_manager_model: reportingManagerModel,
      is_fresher: false,
      total_experience: (adminToDemote.total_experience || 0) + yearsAsAdmin,
      previous_company: adminToDemote.previous_company || null,
      previous_designation: adminToDemote.designation,
      bank_name: adminToDemote.bank_name || null,
      account_holder_name: adminToDemote.account_holder_name || null,
      account_number: adminToDemote.account_number || null,
      ifsc_code: adminToDemote.ifsc_code || null,
      resume: adminToDemote.resume || null,
      aadhaar_card: adminToDemote.aadhaar_card || null,
      pan_card: adminToDemote.pan_card || null,
      experience_letter: adminToDemote.experience_letter || null,
      isVerified: adminToDemote.isVerified,
      status: adminToDemote.status === "suspended" ? "inactive" : adminToDemote.status,
      isFirstLogin: false,
    }], { session });

    await Managermodel.findByIdAndUpdate(
      newManager._id,
      { $set: { password: adminToDemote.password } },
      { session }
    );

    await assignDefaultLeave({ ...newManager.toObject(), _id: newManager._id }, false);

    await Promise.all([
      Adminmodel.findByIdAndDelete(id, { session }),

      PermissionModel.findOneAndDelete({ user_id: id, user_model: "Admin", organisation_id }, { session }),

      assignDefaultPermissions(
        newManager._id,
        newManager.role || "manager",
        organisation_id,
        req.admin._id,
        "Admin",
        session
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id } },
        { session }
      ),

      Ticket.updateMany(
        { submittedBy: id, submitterModel: "Admin", organisation_id },
        { $set: { submittedBy: newManager._id, submitterModel: "Manager", submitterRole: "manager" } },
        { session }
      ),

      Ticket.updateMany(
        { against: id, againstModel: "Admin", organisation_id },
        { $set: { against: newManager._id, againstModel: "Manager" } },
        { session }
      ),

      AdminLeave.updateMany(
        { admin: id, organisation_id, applicantName: { $exists: false } },
        { $set: {
          applicantName: `${adminToDemote.f_name} ${adminToDemote.l_name || ""}`.trim(),
          applicantEmail: adminToDemote.work_email,
          applicantRole: "Admin",
        } },
        { session }
      ),
    ]);

    await session.commitTransaction();

    if (adminToDemote.working_status === "working") {
      await decrementActiveUserCount(organisation_id);
    }
    await incrementActiveUserCount(organisation_id);

    return res.status(200).json({
      success: true,
      message: `${adminToDemote.f_name} ${adminToDemote.l_name} has been demoted from Admin to Manager`,
      manager: {
        _id: newManager._id,
        uid: newManager.uid,
        work_email: newManager.work_email,
        role: newManager.role,
        designation: newManager.designation,
        previous_designation: adminToDemote.designation,
        total_experience: (adminToDemote.total_experience || 0) + yearsAsAdmin,
        reporting_manager: reportingManagerId,
        reporting_manager_model: reportingManagerModel,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

const demoteAdminToEmployee = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin.organisation_id;
    const { Under_manager, designation } = req.body;

    if (id === req.admin._id.toString())
      return next(Object.assign(new Error("You cannot demote yourself"), { statusCode: 400 }));

    const adminToDemote = await Adminmodel.findOne({ _id: id, organisation_id }).lean();
    if (!adminToDemote)
      return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

    const existing = await Usermodel.findOne({ work_email: adminToDemote.work_email, organisation_id })
      .select("_id").lean();
    if (existing)
      return next(Object.assign(new Error("An employee with this email already exists"), { statusCode: 400 }));

    let resolvedUnderManager = null;
    if (Under_manager) {
      const mgr = await Managermodel.findOne({ _id: Under_manager, organisation_id }).select("_id").lean();
      if (!mgr)
        return next(Object.assign(new Error("Assigned manager not found in this organisation"), { statusCode: 404 }));
      resolvedUnderManager = mgr._id;
    }

    const yearsAsAdmin = parseFloat(
      ((Date.now() - new Date(adminToDemote.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const newUid = await generateUID(adminToDemote.department, organisation_id);

    const [newEmployee] = await Usermodel.create([{
      organisation_id,
      empid: adminToDemote.empid,
      uid: newUid,
      profile_image: adminToDemote.profile_image || null,
      department: adminToDemote.department,
      f_name: adminToDemote.f_name,
      l_name: adminToDemote.l_name,
      work_email: adminToDemote.work_email,
      password: "placeholder_will_be_overwritten",
      gender: adminToDemote.gender,
      marital_status: adminToDemote.marital_status || "single",
      personal_contact: adminToDemote.personal_contact,
      e_contact: adminToDemote.e_contact,
      aadhaar_number: adminToDemote.aadhaar_number || null,
      pan_number: adminToDemote.pan_number || null,
      address: adminToDemote.address || null,
      city: adminToDemote.city || null,
      state: adminToDemote.state || null,
      pincode: adminToDemote.pincode || null,
      designation: designation || adminToDemote.designation,
      role: "employee",
      office_location: adminToDemote.office_location,
      Under_manager: resolvedUnderManager,
      is_fresher: false,
      total_experience: (adminToDemote.total_experience || 0) + yearsAsAdmin,
      previous_company: adminToDemote.previous_company || null,
      previous_designation: adminToDemote.designation,
      bank_name: adminToDemote.bank_name || null,
      account_holder_name: adminToDemote.account_holder_name || null,
      account_number: adminToDemote.account_number || null,
      ifsc_code: adminToDemote.ifsc_code || null,
      resume: adminToDemote.resume || null,
      aadhaar_card: adminToDemote.aadhaar_card || null,
      pan_card: adminToDemote.pan_card || null,
      experience_letter: adminToDemote.experience_letter || null,
      isverified: adminToDemote.isVerified,
      status: adminToDemote.status === "suspended" ? "inactive" : adminToDemote.status,
      isFirstLogin: false,
    }], { session });

    await Usermodel.findByIdAndUpdate(
      newEmployee._id,
      { $set: { password: adminToDemote.password } },
      { session }
    );

    await assignDefaultLeave({ ...newEmployee.toObject(), _id: newEmployee._id }, false);

    await Promise.all([
      Adminmodel.findByIdAndDelete(id, { session }),

      PermissionModel.findOneAndDelete({ user_id: id, user_model: "Admin", organisation_id }, { session }),

      assignDefaultPermissions(
        newEmployee._id,
        "employee",
        organisation_id,
        req.admin._id,
        "Admin",
        session
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id } },
        { session }
      ),

      Ticket.updateMany(
        { submittedBy: id, submitterModel: "Admin", organisation_id },
        { $set: { submittedBy: newEmployee._id, submitterModel: "User", submitterRole: "employee" } },
        { session }
      ),

      Ticket.updateMany(
        { against: id, againstModel: "Admin", organisation_id },
        { $set: { against: newEmployee._id, againstModel: "User" } },
        { session }
      ),

      AdminLeave.updateMany(
        { admin: id, organisation_id, applicantName: { $exists: false } },
        { $set: {
          applicantName: `${adminToDemote.f_name} ${adminToDemote.l_name || ""}`.trim(),
          applicantEmail: adminToDemote.work_email,
          applicantRole: "Admin",
        } },
        { session }
      ),
    ]);

    await session.commitTransaction();

    if (adminToDemote.working_status === "working") {
      await decrementActiveUserCount(organisation_id);
    }
    await incrementActiveUserCount(organisation_id);

    return res.status(200).json({
      success: true,
      message: `${adminToDemote.f_name} ${adminToDemote.l_name} has been demoted from Admin directly to Employee`,
      employee: {
        _id: newEmployee._id,
        uid: newEmployee.uid,
        work_email: newEmployee.work_email,
        role: newEmployee.role,
        designation: newEmployee.designation,
        previous_designation: adminToDemote.designation,
        total_experience: (adminToDemote.total_experience || 0) + yearsAsAdmin,
        Under_manager: resolvedUnderManager,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

const changeManagerRole = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const { role } = req.body;
    const organisation_id = req.admin.organisation_id;

    if (!["manager", "senior_manager", "official"].includes(role))
      return next(Object.assign(new Error("Invalid role. Must be manager, senior_manager, or official"), { statusCode: 400 }));

    const manager = await Managermodel.findOneAndUpdate(
      { _id: id, organisation_id },
      { role },
      { new: true, runValidators: true }
    )
      .select("_id uid f_name l_name work_email role department designation")
      .lean();

    if (!manager)
      return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));

    return res.status(200).json({
      success: true,
      message: `Role updated to ${role} successfully`,
      manager,
    });
  } catch (error) {
    next(error);
  }
};

const getperticularemployee = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { id } = req.params;
  const organisation_id = req.admin.organisation_id;

  const [user, leaveBalance, reviews] = await Promise.all([
    Usermodel.findOne({ _id: id, organisation_id })
      .populate({ path: "Under_manager", select: "empid uid f_name l_name work_email role" })
      .select(PROFILE_EXCLUDE)
      .lean(),
    leavebalanceModel.findOne({ employee: id, organisation_id }).lean(),
    reviewModel
      .find({ reviewee: id, organisation_id })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      .lean(),
  ]);

  if (!user)
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));
  if (!leaveBalance)
    return next(Object.assign(new Error("Leave balance not found"), { statusCode: 404 }));

  res.status(200).json({ success: true, user, leaveBalance, reviews: reviews || [] });
};

const getperticularemanager = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { id } = req.params;
  const organisation_id = req.admin.organisation_id;

  // Debug: check if manager exists at all (ignoring org)
  const managerExists = await Managermodel.findById(id).select("_id organisation_id").lean();
  if (!managerExists) {
    // Maybe it was promoted to Admin?
    const asAdmin = await Adminmodel.findOne({ _id: id, organisation_id }).select("_id").lean();
    if (asAdmin)
      return next(Object.assign(new Error("This user is now an Admin, not a Manager"), { statusCode: 400 }));
    return next(Object.assign(new Error("Manager not found in any collection"), { statusCode: 404 }));
  }

  if (managerExists.organisation_id.toString() !== organisation_id.toString())
    return next(Object.assign(new Error("Manager belongs to a different organisation"), { statusCode: 403 }));

  const [manager, leaveBalance, reviews] = await Promise.all([
    Managermodel.findOne({ _id: id, organisation_id })
      .select(PROFILE_EXCLUDE)
      .populate("reporting_manager", "empid uid f_name l_name work_email role")
      .lean(),
    leavebalanceModel.findOne({ employee: id, organisation_id }).lean(),
    reviewModel
      .find({ reviewee: id, organisation_id })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      .lean(),
  ]);

  if (!leaveBalance)
    return next(Object.assign(new Error("Leave balance not found"), { statusCode: 404 }));

  res.status(200).json({ success: true, manager, leaveBalance, reviews: reviews || [] });
};

const deleteemployee = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { id } = req.params;
  const organisation_id = req.admin.organisation_id;

  const [user, manager] = await Promise.all([
    Usermodel.findOne({ _id: id, organisation_id }).lean(),
    Managermodel.findOne({ _id: id, organisation_id }).lean(),
  ]);

  if (!user && !manager)
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));

  const target = user || manager;
  const wasWorking = target.working_status === "working";

  await Promise.all([
    user && Usermodel.findByIdAndDelete(id),
    manager && Managermodel.findByIdAndDelete(id),
  ]);

  if (manager) {
    await Promise.all([
      Usermodel.updateMany({ Under_manager: id, organisation_id }, { Under_manager: null }),
      Managermodel.updateMany(
        { reporting_manager: id, reporting_manager_model: "Manager", organisation_id },
        { reporting_manager: null, reporting_manager_model: null }
      ),
    ]);
  }

  if (wasWorking) {
    await decrementActiveUserCount(organisation_id);
  }

  res.status(200).json({ message: "User deleted successfully" });
};

const showallleaves = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;

    const [employeeLeaves, managerLeaves] = await Promise.all([
      Leave.find({
        organisation_id,
        directed_to: req.admin._id,
        directed_to_model: "Admin",
      })
        .populate("employee", "f_name l_name work_email")
        .populate("manager", "f_name l_name work_email")
        .sort({ createdAt: -1 })
        .lean(),
      ManagerLeave.find({
        organisation_id,
        directed_to: req.admin._id,
        directed_to_model: "Admin",
      })
        .populate("manager", "f_name l_name work_email department designation")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      employeeLeaves: { count: employeeLeaves.length, leaves: employeeLeaves },
      managerLeaves: { count: managerLeaves.length, leaves: managerLeaves },
    });
  } catch (error) {
    next(error);
  }
};

const acceptLeave = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const { leaveFor } = req.query;
    const organisation_id = req.admin.organisation_id;

    if (!leaveFor)
      return next(Object.assign(new Error("leaveFor is required"), { statusCode: 400 }));

    if (leaveFor === "employee") {
      const leave = await Leave.findOne({ _id: id, organisation_id });
      if (!leave)
        return next(Object.assign(new Error("Employee leave not found"), { statusCode: 404 }));
      if (
        leave.directed_to?.toString() !== req.admin._id.toString() ||
        leave.directed_to_model !== "Admin"
      )
        return next(Object.assign(new Error("This leave is not directed to you"), { statusCode: 403 }));
      if (leave.status !== "pending_admin")
        return next(Object.assign(new Error("Leave is not pending for admin action"), { statusCode: 400 }));

      if (leave.leaveType === "ml") {
        const leaveBalance = await leavebalanceModel.findOne({ employee: leave.employee, organisation_id });
        if (leaveBalance) {
          const start = new Date(leave.startDate);
          const end = new Date(start);
          end.setDate(end.getDate() + 181);
          leaveBalance.mlStartDate = start;
          leaveBalance.mlEndDate = end;
          await leaveBalance.save();
        }
      }

      leave.status = "approved_admin";
      leave.approvedBy = req.admin._id;
      leave.approvedByModel = "Admin";
      leave.remarks = `Approved by Admin (${req.admin.f_name})`;
      await leave.save();

      try {
        await processLeaveDeduction(leave);
      } catch (deductionError) {
        console.error("Leave approved but balance deduction failed:", deductionError.message);
      }

      notifyLeaveDecision({
        recipientModel: "User",
        recipientId: leave.employee,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: leave.days,
        decision: "approved",
        decidedByName: `${req.admin.f_name} ${req.admin.l_name || ""}`.trim(),
        remarks: leave.remarks,
      });

      return res.status(200).json({ success: true, message: "Employee leave approved successfully", leave });
    }

    if (leaveFor === "manager") {
      const leave = await ManagerLeave.findOne({ _id: id, organisation_id });
      if (!leave)
        return next(Object.assign(new Error("Manager leave not found"), { statusCode: 404 }));
      if (
        leave.directed_to?.toString() !== req.admin._id.toString() ||
        leave.directed_to_model !== "Admin"
      )
        return next(Object.assign(new Error("This leave is not directed to you"), { statusCode: 403 }));
      if (!["pending_admin", "pending_reporting_manager"].includes(leave.status))
        return next(Object.assign(new Error("Leave is not pending for admin action"), { statusCode: 400 }));

      leave.status = "approved_admin";
      leave.approvedBy = req.admin._id;
      leave.approvedByModel = "Admin";
      leave.remarks = `Approved by Admin (${req.admin.f_name})`;
      await leave.save();

      try {
        await processLeaveDeduction(leave);
      } catch (deductionError) {
        console.error("Leave approved but balance deduction failed:", deductionError.message);
      }

      notifyLeaveDecision({
        recipientModel: "Manager",
        recipientId: leave.manager,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: leave.days,
        decision: "approved",
        decidedByName: `${req.admin.f_name} ${req.admin.l_name || ""}`.trim(),
        remarks: leave.remarks,
      });

      return res.status(200).json({ success: true, message: "Manager leave approved successfully", leave });
    }

    return next(Object.assign(new Error("Invalid leaveFor value"), { statusCode: 400 }));
  } catch (error) {
    next(error);
  }
};

const rejectLeave = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const { leaveFor } = req.query;
    const organisation_id = req.admin.organisation_id;

    if (!leaveFor)
      return next(Object.assign(new Error("leaveFor is required"), { statusCode: 400 }));

    if (leaveFor === "employee") {
      const leave = await Leave.findOne({ _id: id, organisation_id });
      if (!leave)
        return next(Object.assign(new Error("Employee leave not found"), { statusCode: 404 }));
      if (
        leave.directed_to?.toString() !== req.admin._id.toString() ||
        leave.directed_to_model !== "Admin"
      )
        return next(Object.assign(new Error("This leave is not directed to you"), { statusCode: 403 }));
      if (leave.status !== "pending_admin")
        return next(Object.assign(new Error("Leave is not pending for admin action"), { statusCode: 400 }));

      leave.status = "rejected_admin";
      leave.rejectedBy = req.admin._id;
      leave.rejectedByModel = "Admin";
      leave.remarks = `Rejected by Admin (${req.admin.f_name})`;
      leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await leave.save();

      notifyLeaveDecision({
        recipientModel: "User",
        recipientId: leave.employee,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: leave.days,
        decision: "rejected",
        decidedByName: `${req.admin.f_name} ${req.admin.l_name || ""}`.trim(),
        remarks: leave.remarks,
      });

      return res.status(200).json({ success: true, message: "Employee leave rejected successfully", leave });
    }

    if (leaveFor === "manager") {
      const leave = await ManagerLeave.findOne({ _id: id, organisation_id });
      if (!leave)
        return next(Object.assign(new Error("Manager leave not found"), { statusCode: 404 }));
      if (
        leave.directed_to?.toString() !== req.admin._id.toString() ||
        leave.directed_to_model !== "Admin"
      )
        return next(Object.assign(new Error("This leave is not directed to you"), { statusCode: 403 }));
      if (!["pending_admin", "pending_reporting_manager"].includes(leave.status))
        return next(Object.assign(new Error("Leave is not pending for admin action"), { statusCode: 400 }));

      leave.status = "rejected_admin";
      leave.rejectedBy = req.admin._id;
      leave.rejectedByModel = "Admin";
      leave.remarks = `Rejected by Admin (${req.admin.f_name})`;
      leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await leave.save();

      notifyLeaveDecision({
        recipientModel: "Manager",
        recipientId: leave.manager,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: leave.days,
        decision: "rejected",
        decidedByName: `${req.admin.f_name} ${req.admin.l_name || ""}`.trim(),
        remarks: leave.remarks,
      });

      return res.status(200).json({ success: true, message: "Manager leave rejected successfully", leave });
    }

    return next(Object.assign(new Error("Invalid leaveFor value"), { statusCode: 400 }));
  } catch (error) {
    next(error);
  }
};

const applyleave = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { leaveType, startDate, endDate, reason } = req.body;
  if (!leaveType || !startDate || !endDate || !reason)
    return next(Object.assign(new Error("leaveType, startDate, endDate and reason are required"), { statusCode: 400 }));

  const start = parseISTDateOnly(startDate);
  const end = parseISTDateOnly(endDate);
  if (end < start)
    return next(Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }));

  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const organisation_id = req.admin.organisation_id;

  const overlapping = await AdminLeave.findOne({
    admin: req.admin._id,
    organisation_id,
    status: { $nin: ["rejected_superadmin"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  })
    .select("_id")
    .lean();

  if (overlapping)
    return next(Object.assign(new Error("Leave already applied for these dates"), { statusCode: 400 }));

  const leave = await AdminLeave.create({
    organisation_id,
    admin: req.admin._id,
    applicantName: `${req.admin.f_name} ${req.admin.l_name || ""}`.trim(),
    applicantEmail: req.admin.work_email,
    applicantRole: "Admin",
    leaveType,
    startDate: start,
    endDate: end,
    days,
    reason,
    status: "pending_superadmin",
  });

  notifyLeaveApplied({
    requesterName: `${req.admin.f_name} ${req.admin.l_name || ""}`.trim(),
    handlerModel: "SuperAdmin",
    handlerId: organisation_id,
    leaveType,
    startDate: start,
    endDate: end,
    days,
    reason,
  });

  res.status(201).json({ success: true, message: "Leave request submitted to super admin", leave });
};

const getmyleavehistory = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const leave = await AdminLeave.find({
    admin: req.admin._id,
    organisation_id: req.admin.organisation_id,
  })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, count: leave.length, leave });
};



const noofemployee = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.admin.organisation_id;

  const orgDoc = await uidmodel.findOne({ organisation_id }, { departments: 1, _id: 0 }).lean();

  if (!orgDoc)
    return res.status(200).json({ departments: {}, totalEmployees: 0 });

  const departmentList = Object.entries(orgDoc.departments).map(([name, data]) => ({
    department: name,
    lastNumber: data.lastNumber,
  }));

  const total = departmentList.reduce((sum, dep) => sum + dep.lastNumber, 0);
  res.status(200).json({ departments: departmentList, totalEmployees: total });
};

const createannouncement = async (req, res, next) => {
  try {
    const creator = req.admin || req.superAdmin;
    if (!creator)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { title, message, audience, priority, notice_image, expiresAt } = req.body;
    if (!title || !message)
      return next(Object.assign(new Error("Title and message are required"), { statusCode: 400 }));

    const organisation_id = req.admin ? req.admin.organisation_id : req.superAdmin._id;

    const announcement = await announcementmodel.create({
      organisation_id,
      title,
      message,
      audience,
      priority,
      notice_image,
      expiresAt,
      createdBy: creator._id,
      createdByModel: req.admin ? "Admin" : "SuperAdmin",
    });

    res.status(201).json({ success: true, message: "Announcement created successfully", announcement });
  } catch (error) {
    next(error);
  }
};

const getallannouncement = async (req, res, next) => {
  try {
    const organisation_id = req.admin ? req.admin.organisation_id : req.superAdmin?._id;
    if (!organisation_id)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const announcements = await announcementmodel
      .find({ organisation_id })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, count: announcements.length, announcements });
  } catch (error) {
    next(error);
  }
};

const updateAnnouncement = async (req, res, next) => {
  try {
    const user = req.admin || req.superAdmin;
    if (!user)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin ? req.admin.organisation_id : req.superAdmin._id;

    const announcement = await announcementmodel.findOne({ _id: id, organisation_id });
    if (!announcement)
      return next(Object.assign(new Error("Announcement not found"), { statusCode: 404 }));

    const isOwner = announcement.createdBy.toString() === user._id.toString();
    const isSuperAdmin = !!req.superAdmin;
    if (!isOwner && !isSuperAdmin)
      return next(Object.assign(new Error("You are not allowed to edit this announcement"), { statusCode: 403 }));

    const { title, message, audience, priority, notice_image, expiresAt } = req.body;
    if (title) announcement.title = title;
    if (message) announcement.message = message;
    if (audience) announcement.audience = audience;
    if (priority) announcement.priority = priority;
    if (notice_image !== undefined) announcement.notice_image = notice_image;
    if (expiresAt) announcement.expiresAt = expiresAt;

    await announcement.save();
    res.status(200).json({ success: true, message: "Announcement updated successfully", announcement });
  } catch (error) {
    next(error);
  }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    const user = req.admin || req.superAdmin;
    if (!user)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const organisation_id = req.admin ? req.admin.organisation_id : req.superAdmin._id;

    const announcement = await announcementmodel.findOne({ _id: id, organisation_id });
    if (!announcement)
      return next(Object.assign(new Error("Announcement not found"), { statusCode: 404 }));

    const isOwner = announcement.createdBy.toString() === user._id.toString();
    const isSuperAdmin = !!req.superAdmin;
    if (!isOwner && !isSuperAdmin)
      return next(Object.assign(new Error("You are not allowed to delete this announcement"), { statusCode: 403 }));

    await announcementmodel.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Announcement deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const reviewtomanager = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { managerid } = req.body;
  if (!managerid)
    return next(Object.assign(new Error("managerid is required"), { statusCode: 400 }));

  const organisation_id = req.admin.organisation_id;

  const manager = await Managermodel.findOne({ _id: managerid, organisation_id })
    .select("role designation department")
    .lean();
  if (!manager)
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));

  try {
    const fields = buildReviewFields(req.body);

    const review = await createReviewOrThrow(
      Review,
      {
        organisation_id,
        reviewerRole: "admin",
        reviewer: req.admin._id,
        reviewerRoleModel: "Admin",
        revieweeRole: manager.role,
        reviewee: managerid,
        revieweeRoleModel: "Manager",
        revieweeDepartment: fields.revieweeDepartment || manager.department || "",
        revieweeDesignation: fields.revieweeDesignation || manager.designation || "",
        ...fields,
      },
      "You have already reviewed this manager this month."
    );

    res.status(201).json({ message: "Review submitted successfully", review });
  } catch (err) {
    next(err);
  }
};

// Step 2 — an Admin, when they are the *reviewee* (reviewed by SuperAdmin),
// accepts or disputes that review.
const respondToMyReview = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { reviewId, status, comment } = req.body;
  if (!reviewId)
    return next(Object.assign(new Error("reviewId is required"), { statusCode: 400 }));

  try {
    const review = await respondToReviewAsReviewee(Review, {
      reviewId,
      revieweeId: req.admin._id,
      revieweeRoleModel: "Admin",
      organisation_id: req.admin.organisation_id,
      status,
      comment,
    });
    res.status(200).json({ success: true, message: "Response recorded", review });
  } catch (err) {
    next(err);
  }
};

// Step 3 — FINAL approval. Only an Admin with isHR === true can call this,
// and it applies to any review in the organisation (Admin visibility is
// org-wide), regardless of who the reviewer/reviewee were.
const hrAcknowledgeReviewHandler = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  if (!req.admin.isHR)
    return next(Object.assign(new Error("Only an Admin designated as HR can give the final acknowledgement"), { statusCode: 403 }));

  const { reviewId, decision, comment } = req.body;
  if (!reviewId)
    return next(Object.assign(new Error("reviewId is required"), { statusCode: 400 }));

  try {
    const review = await hrAcknowledgeReview(Review, {
      reviewId,
      hrAdminId: req.admin._id,
      organisation_id: req.admin.organisation_id,
      decision,
      comment,
    });
    res.status(200).json({ success: true, message: `Review ${decision}`, review });
  } catch (err) {
    next(err);
  }
};

const getAllReviewsForAdmin = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.admin.organisation_id;
  const { revieweeRoleModel, monthYear } = req.query;

  const filter = { organisation_id };
  if (revieweeRoleModel) filter.revieweeRoleModel = revieweeRoleModel;
  if (monthYear) filter.monthYear = monthYear;

  const reviews = await Review.find(filter)
    .populate({ path: "reviewer", select: "f_name l_name work_email role" })
    .populate({ path: "reviewee", select: "f_name l_name work_email role designation department" })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, count: reviews.length, reviews });
};

const forgetpasswordloginotp = async (req, res, next) => {
  const { email } = req.body;
  if (!email)
    return next(Object.assign(new Error("Email is required"), { statusCode: 400 }));

  const admin = await Adminmodel.findOne({ work_email: email }).select("_id f_name").lean();
  if (!admin)
    return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

  const otp = generateOTP();
  await Promise.all([
    OtpModel.findOneAndUpdate(
      { email },
      { otp, expiry: Date.now() + 5 * 60 * 1000 },
      { upsert: true, new: true }
    ),
    sendEmail({
      to: email,
      subject: "Admin Password Reset OTP",
      html: `<h2>Password Reset</h2><p>Your OTP is:</p><h1>${otp}</h1><p>Expires in 5 minutes.</p>`,
    }),
  ]);

  res.status(200).json({ success: true, message: "OTP sent successfully" });
};

const verifyAotp = async (req, res, next) => {
  const { email, otp } = req.body;
  const otpRecord = await OtpModel.findOne({ email });
  if (!otpRecord)
    return next(Object.assign(new Error("OTP not found"), { statusCode: 404 }));
  if (otpRecord.isExpired())
    return next(Object.assign(new Error("OTP has expired"), { statusCode: 400 }));
  if (!otpRecord.compareOtp(String(otp)))
    return next(Object.assign(new Error("Invalid OTP"), { statusCode: 400 }));

  const admin = await Adminmodel.findOne({ work_email: email })
    .select("_id work_email role f_name")
    .lean();
  if (!admin)
    return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

  const token = jwt.sign(
    { adminid: admin._id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const resetToken = jwt.sign(
    { adminid: admin._id, work_email: admin.work_email, purpose: "password_reset" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  await OtpModel.deleteOne({ email });

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };

  res.cookie("token", token, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.cookie("resetToken", resetToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });

  Adminmodel.findByIdAndUpdate(admin._id, {
    status: "active",
    last_login: new Date(),
    isFirstLogin: false,
  }).exec();

  const resetLink = `${process.env.BASE_URL}talent/api/admin/resetpassword`;
  sendEmail({
    to: email,
    subject: "Optional Password Reset",
    html: `<div style="font-family:Arial,sans-serif;padding:20px"><h2>Hello ${admin.f_name},</h2><p>Your OTP login was successful.</p><p>If you want to reset your password, click the button below. This link expires in <strong>15 minutes</strong>.</p><a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a><p style="color:#999;font-size:12px;">If you didn't request this, ignore this email.</p></div>`,
  }).catch((err) => console.error("Reset email failed:", err.message));

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    role: admin.role,
    passwordResetOptional: true,
  });
};

const resetAdminPassword = async (req, res, next) => {
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword)
    return next(Object.assign(new Error("Both password fields are required"), { statusCode: 400 }));
  if (newPassword !== confirmPassword)
    return next(Object.assign(new Error("Passwords do not match"), { statusCode: 400 }));
  if (newPassword.length < 8)
    return next(Object.assign(new Error("Password must be at least 8 characters"), { statusCode: 400 }));

  const resetToken = req.cookies?.resetToken;
  if (!resetToken)
    return next(Object.assign(new Error("Reset session expired. Please verify OTP again."), { statusCode: 401 }));

  let decode;
  try {
    decode = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (err) {
    return next(Object.assign(new Error("Invalid or expired reset token"), { statusCode: 401 }));
  }

  if (decode.purpose !== "password_reset" && decode.purpose !== "first_login")
    return next(Object.assign(new Error("Invalid reset token"), { statusCode: 401 }));

  const admin = await Adminmodel.findById(decode.adminid);
  if (!admin)
    return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

  admin.password = newPassword;
  if (decode.purpose === "first_login") admin.isFirstLogin = false;
  await admin.save();

  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("resetToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });

  res.status(200).json({ success: true, message: "Password updated successfully" });
};

const getme = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.admin.organisation_id;

  // getme feeds the dashboard's "Date of joining" / "Member since" cards,
  // which rely on createdAt — so keep it even though the shared EXCLUDE
  // list hides it from other admin-facing responses.
  const GETME_SELECT = EXCLUDE
    .replace(" -createdAt", "")
    .replace(" -isFirstLogin", "");

  const [admin, leaveBalance, reviews] = await Promise.all([
    Adminmodel.findById(req.admin._id).select(GETME_SELECT).lean(),
    leavebalanceModel.findOne({ employee: req.admin._id, organisation_id }).lean(),
    reviewModel
      .find({ reviewee: req.admin._id, organisation_id })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      // Reviewee here is always this admin, but ReviewCard still reads
      // review.reviewee.f_name for the card title — without this the
      // frontend showed "Unknown" on every card in "My Review".
      .populate({ path: "reviewee", select: "f_name l_name work_email role designation department" })
      .lean(),
  ]);

  if (!admin)
    return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

  res.status(200).json({ success: true, user: admin, leaveBalance: leaveBalance || null, reviews: reviews || [] });
};

const PHONE_REGEX = /^[0-9]{10}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const editadminprofile = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const admin = req.admin;
  const {
    f_name,
    l_name,
    personal_contact,
    e_contact,
    profile_image,
    office_location,
    resume,
    aadhaar_card,
    pan_card,
    experience_letter,
    bank_name,
    account_holder_name,
    account_number,
    ifsc_code,
    date_of_joining,
    date_of_birth,
  } = req.body;

  if (date_of_joining !== undefined) {
    if (date_of_joining === null || date_of_joining === "") {
      admin.date_of_joining = null;
    } else {
      const parsedDOJ = new Date(date_of_joining);
      if (isNaN(parsedDOJ.getTime()))
        return next(Object.assign(new Error("Invalid date of joining"), { statusCode: 400 }));
      admin.date_of_joining = parsedDOJ;
    }
  }

  if (date_of_birth !== undefined) {
    if (date_of_birth === null || date_of_birth === "") {
      admin.date_of_birth = null;
    } else {
      const parsedDOB = new Date(date_of_birth);
      if (isNaN(parsedDOB.getTime()))
        return next(Object.assign(new Error("Invalid date of birth"), { statusCode: 400 }));
      if (parsedDOB > new Date())
        return next(Object.assign(new Error("Date of birth cannot be in the future"), { statusCode: 400 }));
      admin.date_of_birth = parsedDOB;
    }
  }

  if (f_name !== undefined) {
    if (typeof f_name !== "string" || !f_name.trim() || f_name.length > 50)
      return next(Object.assign(new Error("Invalid first name"), { statusCode: 400 }));
    admin.f_name = f_name.trim();
  }

  if (l_name !== undefined) {
    if (typeof l_name !== "string" || !l_name.trim() || l_name.length > 50)
      return next(Object.assign(new Error("Invalid last name"), { statusCode: 400 }));
    admin.l_name = l_name.trim();
  }

  if (personal_contact !== undefined) {
    if (typeof personal_contact !== "string" || !PHONE_REGEX.test(personal_contact))
      return next(Object.assign(new Error("Phone number must be a valid 10-digit number"), { statusCode: 400 }));
    admin.personal_contact = personal_contact;
  }

  if (e_contact !== undefined) {
    if (typeof e_contact !== "string" || !PHONE_REGEX.test(e_contact))
      return next(Object.assign(new Error("Emergency contact must be a valid 10-digit number"), { statusCode: 400 }));
    admin.e_contact = e_contact;
  }

  if (profile_image !== undefined) {
    if (typeof profile_image !== "string")
      return next(Object.assign(new Error("Profile image must be a string"), { statusCode: 400 }));
    if (profile_image === "" || profile_image.includes("api.dicebear.com")) {
      admin.profile_image = profile_image;
    } else {
      return next(Object.assign(new Error("Invalid avatar format"), { statusCode: 400 }));
    }
  }

  if (office_location !== undefined) {
    if (typeof office_location !== "string" || !office_location.trim() || office_location.length > 100)
      return next(Object.assign(new Error("Office location must be a valid, non-empty location name (max 100 characters)"), { statusCode: 400 }));
    admin.office_location = office_location.trim();
  }

  if (resume !== undefined) {
    if (typeof resume !== "string")
      return next(Object.assign(new Error("Resume must be a string"), { statusCode: 400 }));
    admin.resume = resume;
  }

  if (aadhaar_card !== undefined) {
    if (typeof aadhaar_card !== "string")
      return next(Object.assign(new Error("Aadhaar card must be a string"), { statusCode: 400 }));
    admin.aadhaar_card = aadhaar_card;
  }

  if (pan_card !== undefined) {
    if (typeof pan_card !== "string")
      return next(Object.assign(new Error("PAN card must be a string"), { statusCode: 400 }));
    admin.pan_card = pan_card;
  }

  if (experience_letter !== undefined) {
    if (typeof experience_letter !== "string")
      return next(Object.assign(new Error("Experience letter must be a string"), { statusCode: 400 }));
    admin.experience_letter = experience_letter;
  }

  if (bank_name !== undefined) {
    if (typeof bank_name !== "string" || bank_name.length > 100)
      return next(Object.assign(new Error("Invalid bank name"), { statusCode: 400 }));
    admin.bank_name = bank_name.trim();
  }

  if (account_holder_name !== undefined) {
    if (typeof account_holder_name !== "string" || !account_holder_name.trim() || account_holder_name.length > 100)
      return next(Object.assign(new Error("Invalid account holder name"), { statusCode: 400 }));
    admin.account_holder_name = account_holder_name.trim();
  }

  if (account_number !== undefined) {
    if (typeof account_number !== "string" || !/^[0-9]{9,18}$/.test(account_number))
      return next(Object.assign(new Error("Invalid account number"), { statusCode: 400 }));
    admin.account_number = account_number;
  }

  if (ifsc_code !== undefined) {
    if (typeof ifsc_code !== "string" || !IFSC_REGEX.test(ifsc_code.toUpperCase()))
      return next(Object.assign(new Error("Invalid IFSC code"), { statusCode: 400 }));
    admin.ifsc_code = ifsc_code.toUpperCase();
  }

  await admin.save();

  res.status(200).json({
    success: true,
    message: "Admin profile updated successfully",
    admin: {
      _id: admin._id,
      f_name: admin.f_name,
      l_name: admin.l_name,
      work_email: admin.work_email,
      personal_contact: admin.personal_contact,
      e_contact: admin.e_contact,
      profile_image: admin.profile_image,
      office_location: admin.office_location,
      resume: admin.resume,
      aadhaar_card: admin.aadhaar_card,
      pan_card: admin.pan_card,
      experience_letter: admin.experience_letter,
      bank_name: admin.bank_name,
      account_holder_name: admin.account_holder_name,
      account_number: admin.account_number,
      ifsc_code: admin.ifsc_code,
      date_of_joining: admin.date_of_joining,
      date_of_birth: admin.date_of_birth,
    },
  });
};

const changepassword = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return next(Object.assign(new Error("Current password and new password are required"), { statusCode: 400 }));

  const admin = await Adminmodel.findById(req.admin._id);
  const isvalid = await admin.isValidPassword(currentPassword);
  if (!isvalid)
    return next(Object.assign(new Error("Current password is incorrect"), { statusCode: 400 }));
  if (currentPassword === newPassword)
    return next(Object.assign(new Error("New password must be different from current password"), { statusCode: 400 }));

  admin.password = newPassword;
  await admin.save();
  res.status(200).json({ success: true, message: "Password updated successfully" });
};

const getTodayCheckins = async (req, res) => {
  if (!req.admin)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const organisation_id = req.admin.organisation_id;
  // IMPORTANT: attendance.controller.js stores `date` as startOfDay(new Date())
  // which is the IST calendar-day boundary (see automatic/weekoffcalendar.js /
  // utils/Istdate.utils.js), NOT the server process's local midnight. Using
  // `new Date(); today.setHours(0,0,0,0)` here reads the OS timezone of
  // whichever machine Node happens to be running on - on a dev laptop that's
  // usually IST already (so localhost "works"), but on the live server
  // (typically UTC) it computes a midnight that's 5:30 hrs off from the
  // stored `date`, so the query matches nothing and the map shows empty.
  const today = startOfDay(new Date());

  // Scope to this admin's own team (managers under them + employees under
  // those managers) instead of the whole organisation.
  const teamManagerIds = [...(await getAdminTeamManagerIds(req.admin._id, organisation_id))];
  const teamEmployees = teamManagerIds.length
    ? await Usermodel.find({ organisation_id, Under_manager: { $in: teamManagerIds } }).select("_id").lean()
    : [];
  const scopedEmployeeIds = [...teamManagerIds, ...teamEmployees.map((u) => String(u._id))];

  if (!scopedEmployeeIds.length) {
    return res.json({ checkins: [], total: 0 });
  }

  // No lat/lng filter here: face-terminal check-ins don't carry GPS
  // coordinates (the kiosk is a fixed device), so requiring lat/lng used
  // to silently drop every face check-in. We still include hasLocation so
  // the map can plot only the ones that have coordinates while the list
  // shows everyone, whichever terminal (System/live or Face) they used.
  const checkins = await Attendance.find({
    organisation_id,
    date: today,
    checkIn: { $exists: true },
    employee: { $in: scopedEmployeeIds },
  })
    // `employee` uses refPath: "onModel", so Mongoose needs `onModel` itself
    // loaded on the doc to know which collection (User/Manager/Admin) to
    // populate from. The previous .select() below excluded it, which meant
    // populate silently resolved employee to null for every record -> the
    // "Unknown" name and missing avatar on every pin.
    .populate("employee", "f_name l_name work_email department designation profile_image")
    .select("employee onModel role latitude longitude checkIn checkOut source")
    .lean();

  const payload = checkins.map((c) => ({
    id: c._id,
    name: [c.employee?.f_name, c.employee?.l_name].filter(Boolean).join(" ") || "Unknown",
    email: c.employee?.work_email || "",
    dept: c.employee?.department || c.employee?.designation || "",
    avatar: c.employee?.profile_image || null,
    role: c.role,
    lat: c.latitude ?? null,
    lng: c.longitude ?? null,
    hasLocation: c.latitude != null && c.longitude != null,
    source: c.source === "face" ? "face" : "live",
    checkIn: c.checkIn,
    checkedOut: !!c.checkOut,
  }));

  res.json({ checkins: payload, total: payload.length });
};

// Powers the "Attendance Details" button on the Live Attendance Map card.
// type=today  -> live check-in/out status for every team member today.
// type=monthly -> rolled-up AttendanceSummary counts (presentDays/halfDays/
// absentDays/totalWorkingMinutes) for the requested month+year.
// Scoped to this admin's own team, same as getTodayCheckins.
const getAttendanceOverview = async (req, res, next) => {
  try {
    if (!req.admin)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const organisation_id = req.admin.organisation_id;
    const type = req.query.type === "monthly" ? "monthly" : "today";

    const teamManagerIds = [...(await getAdminTeamManagerIds(req.admin._id, organisation_id))];

    const [managers, employees] = await Promise.all([
      teamManagerIds.length
        ? Managermodel.find({ organisation_id, _id: { $in: teamManagerIds } })
            .select("empid f_name l_name work_email role designation department office_location profile_image reporting_manager reporting_manager_model")
            .populate({ path: "reporting_manager", select: "f_name l_name empid" })
            .lean()
        : [],
      teamManagerIds.length
        ? Usermodel.find({ organisation_id, Under_manager: { $in: teamManagerIds } })
            .select("empid f_name l_name work_email role designation department office_location profile_image Under_manager")
            .populate({ path: "Under_manager", select: "f_name l_name empid" })
            .lean()
        : [],
    ]);

    const people = [
      ...managers.map((m) => ({
        id: String(m._id),
        empid: m.empid,
        name: [m.f_name, m.l_name].filter(Boolean).join(" "),
        email: m.work_email,
        role: m.role || "manager",
        designation: m.designation,
        department: m.department,
        office_location: m.office_location,
        avatar: m.profile_image || null,
        reportingManager: m.reporting_manager
          ? [m.reporting_manager.f_name, m.reporting_manager.l_name].filter(Boolean).join(" ")
          : "—",
      })),
      ...employees.map((u) => ({
        id: String(u._id),
        empid: u.empid,
        name: [u.f_name, u.l_name].filter(Boolean).join(" "),
        email: u.work_email,
        role: u.role || "employee",
        designation: u.designation,
        department: u.department,
        office_location: u.office_location,
        avatar: u.profile_image || null,
        reportingManager: u.Under_manager
          ? [u.Under_manager.f_name, u.Under_manager.l_name].filter(Boolean).join(" ")
          : "—",
      })),
    ];

    if (!people.length)
      return res.json({ success: true, type, total: 0, data: [] });

    const peopleIds = people.map((p) => p.id);

    if (type === "today") {
      const today = startOfDay(new Date());
      const records = await Attendance.find({
        organisation_id,
        date: today,
        employee: { $in: peopleIds },
      })
        .select("employee checkIn checkOut latitude longitude source activeMinutes idleMinutes status")
        .lean();

      const byEmp = new Map(records.map((r) => [String(r.employee), r]));
      const data = people.map((p) => {
        const r = byEmp.get(p.id);
        const checkedIn = !!r?.checkIn;
        const checkedOut = !!r?.checkOut;
        // Once checked out, trust the stored `status` (present/half_day/absent)
        // instead of re-deriving it from checkIn/checkOut presence. `status`
        // is computed at checkout time from activeMinutes vs the shift's
        // thresholds (see attendance.controller.js checkout()), so a punch
        // in+out with too little active time is correctly "absent" or
        // "half_day" even though both timestamps are set. The old logic
        // treated any checkIn+checkOut pair as "present" regardless of how
        // little time was actually worked.
        const status = checkedIn ? (checkedOut ? (r.status || "absent") : "on_duty") : "absent";
        return {
          ...p,
          checkIn: r?.checkIn || null,
          checkOut: r?.checkOut || null,
          status,
          source: r?.source === "face" ? "face" : r ? "live" : null,
          lat: r?.latitude ?? null,
          lng: r?.longitude ?? null,
          activeMinutes: r?.activeMinutes ?? 0,
          idleMinutes: r?.idleMinutes ?? 0,
        };
      });

      return res.json({ success: true, type, date: today, total: data.length, data });
    }

    // monthly — deliberately NOT filtered by organisation_id here: historical
    // AttendanceSummary docs may predate the organisation_id backfill in
    // monthattendanceupdate.js, so org-scoping goes through peopleIds instead.
    const now = new Date();
    const month = Math.min(Math.max(parseInt(req.query.month, 10) || now.getMonth() + 1, 1), 12);
    const year = parseInt(req.query.year, 10) || now.getFullYear();

    const summaries = await AttendanceSummary.find({
      employee: { $in: peopleIds },
      month,
      year,
    }).lean();
    const summaryByEmp = new Map(summaries.map((s) => [String(s.employee), s]));

    const data = people.map((p) => {
      const s = summaryByEmp.get(p.id);
      const presentDays = s?.presentDays ?? 0;
      const halfDays = s?.halfDays ?? 0;
      const absentDays = s?.absentDays ?? 0;
      const weekOffHolidayDays = s?.weekOffHolidayDays ?? 0;
      const totalWorkingMinutes = s?.totalWorkingMinutes ?? 0;
      // markedDays intentionally excludes weekOffHolidayDays — attendance %
      // is "present out of working days", not "present out of calendar days".
      // Including weekoff/holiday in the denominator would inflate the %.
      const markedDays = presentDays + halfDays + absentDays;
      return {
        ...p,
        presentDays,
        halfDays,
        absentDays,
        weekOffHolidayDays,
        markedDays,
        totalWorkingMinutes,
        attendancePercent: markedDays > 0 ? Math.round(((presentDays + halfDays * 0.5) / markedDays) * 100) : 0,
      };
    });

    return res.json({ success: true, type, month, year, total: data.length, data });
  } catch (error) {
    next(error);
  }
};

// Day-wise attendance history for one team member (manager or employee) —
// powers the "History" button on the Monthly tab of AttendanceDetailsModal.
// Accepts an optional startDate/endDate range (YYYY-MM-DD); defaults to the
// current calendar month when neither is passed. Scoped to the admin's own
// team via getAdminTeamManagerIds, same as getAttendanceOverview above.
const getAttendanceHistory = async (req, res, next) => {
  try {
    if (!req.admin)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const organisation_id = req.admin.organisation_id;
    const { employeeId } = req.params;
    if (!employeeId)
      return res.status(400).json({ success: false, message: "employeeId is required" });

    const teamManagerIds = [...(await getAdminTeamManagerIds(req.admin._id, organisation_id))];

    const [manager, employee] = await Promise.all([
      teamManagerIds.length
        ? Managermodel.findOne({ _id: employeeId, organisation_id, _id: { $in: teamManagerIds } })
            .select("empid f_name l_name work_email role designation department office_location")
            .lean()
        : null,
      Usermodel.findOne({ _id: employeeId, organisation_id, Under_manager: { $in: teamManagerIds } })
        .select("empid f_name l_name work_email role designation department office_location")
        .lean(),
    ]);
    const person = manager || employee;
    if (!person)
      return res.status(404).json({ success: false, message: "Employee not found in your team" });

    const now = new Date();
    let { startDate, endDate } = req.query;
    let rangeStart, rangeEnd;
    if (startDate && endDate) {
      rangeStart = startOfDay(new Date(startDate));
      rangeEnd = startOfDay(new Date(endDate));
    } else {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = startOfDay(now);
    }

    const records = await Attendance.find({
      organisation_id,
      employee: employeeId,
      date: { $gte: rangeStart, $lte: rangeEnd },
    })
      .select("date checkIn checkOut source status activeMinutes idleMinutes isLate lateMinutes overtimeMinutes checkoutRemark checkInGate checkOutGate")
      .sort({ date: -1 })
      .lean();

    const data = records.map((r) => ({
      id: String(r._id),
      date: r.date,
      checkIn: r.checkIn || null,
      checkOut: r.checkOut || null,
      source: r.source === "face" ? "face" : r.source === "agent" ? "agent" : "system",
      status: r.status || "absent",
      activeMinutes: r.activeMinutes ?? 0,
      idleMinutes: r.idleMinutes ?? 0,
      isLate: !!r.isLate,
      lateMinutes: r.lateMinutes ?? 0,
      overtimeMinutes: r.overtimeMinutes ?? 0,
      checkoutRemark: r.checkoutRemark || null,
      checkInGate: r.checkInGate || null,
      checkOutGate: r.checkOutGate || null,
    }));

    return res.json({
      success: true,
      employee: {
        id: String(person._id),
        empid: person.empid,
        name: [person.f_name, person.l_name].filter(Boolean).join(" "),
        email: person.work_email,
        role: person.role,
        designation: person.designation,
        department: person.department,
        office_location: person.office_location,
      },
      startDate: rangeStart,
      endDate: rangeEnd,
      total: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getOrgInfo = async (req, res, next) => {
  try {
    if (!req.admin)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const admin = await Adminmodel.findById(req.admin._id)
      .select(
        "empid f_name l_name work_email designation department office_location organisation_id profile_image"
      )
      .lean();

    if (!admin)
      return res.status(404).json({ success: false, message: "Admin not found" });

    const organisation_id = admin.organisation_id;

    const superAdmin = await SuperAdminModel.findById(organisation_id)
      .select("f_name l_name email organisation_name profile_image")
      .lean();

    const managers = await Managermodel.find({ organisation_id })
      .select(
        "empid f_name l_name work_email designation department office_location reporting_manager reporting_manager_model profile_image"
      )
      .lean();

    const employees = await Usermodel
      .find({
        organisation_id,
        Under_manager: { $in: managers.map((m) => m._id) },
      })
      .select(
        "empid f_name l_name work_email designation department office_location Under_manager profile_image"
      )
      .lean();

    const topLevelManagers = managers
      .filter(
        (mgr) =>
          !mgr.reporting_manager ||
          mgr.reporting_manager_model === "Admin"
      )
      .map((mgr) => ({
        id: mgr._id,
        empid: mgr.empid,
        name: `${mgr.f_name} ${mgr.l_name}`,
        email: mgr.work_email,
        designation: mgr.designation,
        department: mgr.department,
        office_location: mgr.office_location,
        profile_image: mgr.profile_image || null,
        employees: employees
          .filter((emp) => emp.Under_manager?.toString() === mgr._id.toString())
          .map((emp) => ({
            id: emp._id,
            empid: emp.empid,
            name: `${emp.f_name} ${emp.l_name}`,
            email: emp.work_email,
            designation: emp.designation,
            department: emp.department,
            profile_image: emp.profile_image || null,
          })),
        subManagers: buildManagerTree(managers, mgr._id, "Manager", employees),
      }));

    return res.status(200).json({
      success: true,
      organisation_id,
      organisation_name: superAdmin?.organisation_name || "",
      organisation_logo: superAdmin?.profile_image || null,
      super_admin: superAdmin
        ? {
            id: superAdmin._id,
            name: `${superAdmin.f_name} ${superAdmin.l_name}`,
            email: superAdmin.email,
            profile_image: superAdmin.profile_image || null,
          }
        : null,
      admin: {
        id: admin._id,
        empid: admin.empid,
        name: `${admin.f_name} ${admin.l_name}`,
        email: admin.work_email,
        designation: admin.designation,
        department: admin.department,
        office_location: admin.office_location,
        profile_image: admin.profile_image || null,
      },
      managers: topLevelManagers,
    });
  } catch (error) {
    next(error);
  }
};

const buildManagerTree = (managers, parentId, parentModel, employees) => {
  return managers
    .filter((mgr) => {
      if (!mgr.reporting_manager) return false;
      return mgr.reporting_manager.toString() === parentId.toString() &&
        mgr.reporting_manager_model === parentModel;
    })
    .map((mgr) => ({
      id: mgr._id,
      empid: mgr.empid,
      name: `${mgr.f_name} ${mgr.l_name}`,
      email: mgr.work_email,
      designation: mgr.designation,
      department: mgr.department,
      office_location: mgr.office_location,
      profile_image: mgr.profile_image || null,
      _raw: mgr,
      employees: employees
        .filter((emp) => emp.Under_manager?.toString() === mgr._id.toString())
        .map((emp) => ({
          id: emp._id,
          empid: emp.empid,
          name: `${emp.f_name} ${emp.l_name}`,
          email: emp.work_email,
          designation: emp.designation,
          department: emp.department,
          profile_image: emp.profile_image || null,
          isCurrentUser: false,
        })),
      subManagers: buildManagerTree(managers, mgr._id, "Manager", employees),
    }));
};
 
const buildManagerTreeWithCurrentFlags = (
  managers,
  parentId,
  parentModel,
  employees,
  currentManagerId,
  currentEmployeeId
) => {
  return managers
    .filter((mgr) => {
      if (!mgr.reporting_manager) return false;
      return (
        mgr.reporting_manager.toString() === parentId.toString() &&
        mgr.reporting_manager_model === parentModel
      );
    })
    .map((mgr) => ({
      id: mgr._id,
      name: `${mgr.f_name} ${mgr.l_name}`,
      email: mgr.work_email,
      designation: mgr.designation,
      department: mgr.department,
      office_location: mgr.office_location,
      profile_image: mgr.profile_image || null,
      isCurrentManager: currentManagerId
        ? mgr._id.toString() === currentManagerId.toString()
        : false,
      isCurrentUserManager: currentEmployeeId
        ? employees.some(
            (e) =>
              e.Under_manager?.toString() === mgr._id.toString() &&
              e._id.toString() === currentEmployeeId.toString()
          )
        : false,
      employees: employees
        .filter((emp) => emp.Under_manager?.toString() === mgr._id.toString())
        .map((emp) => ({
          id: emp._id,
          name: `${emp.f_name} ${emp.l_name}`,
          email: emp.work_email,
          designation: emp.designation,
          department: emp.department,
          profile_image: emp.profile_image || null,
          isCurrentUser: currentEmployeeId
            ? emp._id.toString() === currentEmployeeId.toString()
            : false,
        })),
      subManagers: buildManagerTreeWithCurrentFlags(
        managers,
        mgr._id,
        "Manager",
        employees,
        currentManagerId,
        currentEmployeeId
      ),
    }));
};

const getAllPersonalDocumentsAdmin = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.admin.organisation_id;

  const documents = await Document.find({ fileType: "personal", organisation_id })
    .populate("uploader", "f_name l_name work_email personal_contact department designation")
    .sort({ uploadedAt: -1 })
    .lean();

  Document.updateMany(
    { fileType: "personal", organisation_id, viewedByAdmin: false },
    { $set: { viewedByAdmin: true } }
  ).exec();

  res.status(200).json({
    message: "All personal documents fetched successfully",
    total: documents.length,
    documents: documents.map((doc) => ({
      id: doc._id,
      title: doc.title,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      sizeKB: doc.size,
      uploadedAt: doc.uploadedAt,
      viewedByAdmin: doc.viewedByAdmin,
      uploaderModel: doc.uploaderModel,
      uploader: doc.uploader
        ? {
            id: doc.uploader._id,
            name: `${doc.uploader.f_name} ${doc.uploader.l_name}`,
            email: doc.uploader.work_email,
            contact: doc.uploader.personal_contact,
            department: doc.uploader.department,
            designation: doc.uploader.designation,
          }
        : null,
    })),
  });
};

const getAllExpenseDocumentsAdmin = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.admin.organisation_id;

  const documents = await Document.find({ fileType: "expense", organisation_id })
    .populate("uploader", "f_name l_name work_email personal_contact department designation")
    .sort({ uploadedAt: -1 })
    .lean();

  Document.updateMany(
    { fileType: "expense", organisation_id, viewedByAdmin: false },
    { $set: { viewedByAdmin: true } }
  ).exec();

  res.status(200).json({
    message: "All expense documents fetched successfully",
    total: documents.length,
    documents: documents.map((doc) => ({
      id: doc._id,
      title: doc.title,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      sizeKB: doc.size,
      uploadedAt: doc.uploadedAt,
      viewedByAdmin: doc.viewedByAdmin,
      uploaderModel: doc.uploaderModel,
      uploader: doc.uploader
        ? {
            id: doc.uploader._id,
            name: `${doc.uploader.f_name} ${doc.uploader.l_name}`,
            email: doc.uploader.work_email,
            contact: doc.uploader.personal_contact,
            department: doc.uploader.department,
            designation: doc.uploader.designation,
          }
        : null,
    })),
  });
};

const getDocumentDetailsAdmin = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { documentId } = req.params;
  if (!documentId)
    return next(Object.assign(new Error("Document ID is required"), { statusCode: 400 }));

  const organisation_id = req.admin.organisation_id;

  const document = await Document.findOne({ _id: documentId, organisation_id })
    .populate("uploader", "f_name l_name work_email personal_contact department designation");

  if (!document)
    return next(Object.assign(new Error("Document not found"), { statusCode: 404 }));

  document.viewedByAdmin = true;
  await document.save();

  res.status(200).json({
    message: "Document details fetched successfully",
    document: {
      id: document._id,
      title: document.title,
      fileUrl: document.fileUrl,
      fileType: document.fileType,
      sizeKB: document.size,
      uploadedAt: document.uploadedAt,
      viewedByAdmin: document.viewedByAdmin,
      uploaderModel: document.uploaderModel,
      uploader: document.uploader
        ? {
            id: document.uploader._id,
            name: `${document.uploader.f_name} ${document.uploader.l_name}`,
            email: document.uploader.work_email,
            department: document.uploader.department,
            designation: document.uploader.designation,
          }
        : null,
    },
  });
};

const adminActionOnLeave = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { leaveId, action, remarks } = req.body;

    if (!leaveId || !action)
      return next(Object.assign(new Error("leaveId and action are required"), { statusCode: 400 }));

    if (!["approve", "reject"].includes(action))
      return next(Object.assign(new Error("action must be 'approve' or 'reject'"), { statusCode: 400 }));

    const organisation_id = req.admin.organisation_id;
    const leave = await Leave.findOne({ _id: leaveId, organisation_id });

    if (!leave)
      return next(Object.assign(new Error("Leave not found"), { statusCode: 404 }));

    if (leave.status !== "forwarded_reporting_manager" && leave.status !== "pending_manager")
      return next(Object.assign(new Error("Only pending or forwarded leaves can be actioned by admin"), { statusCode: 400 }));

    if (action === "approve") {
      leave.status = "approved_reporting_manager";
      leave.approvedBy = req.admin._id;
      leave.rejectedBy = null;
      leave.remarks = remarks || `Approved by Admin (${req.admin.f_name})`;
      leave.deleteAt = null;

      await leave.save();

      try {
        await processLeaveDeduction(leave);
      } catch (deductionError) {
        console.error("Leave approved but balance deduction failed:", deductionError.message);
      }
    } else {
      leave.status = "rejected_reporting_manager";
      leave.rejectedBy = req.admin._id;
      leave.approvedBy = null;
      leave.remarks = remarks || `Rejected by Admin (${req.admin.f_name})`;
      leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await leave.save();
    }

    return res.status(200).json({
      success: true,
      organisation_id,
      message: `Leave ${action === "approve" ? "approved" : "rejected"} successfully by Admin`,
      leave,
    });
  } catch (error) {
    next(error);
  }
};

const adminSubmitTicket = async (req, res, next) => {
  try {
    if (!req.admin)
      return res.status(401).json({ message: "Not authenticated" });

    const organisation_id = req.admin.organisation_id;
    const {
      type, category, subCategory, title, description, incidentDate, incidentLocation,
      witnessNames, severity, isAnonymous, againstId, againstModel, attachments,
    } = req.body;

    const ticket = await Ticket.create({
      organisation_id, type, category, subCategory, title, description, incidentDate,
      incidentLocation, witnessNames: witnessNames || [], severity: severity || "medium",
      isAnonymous: isAnonymous || false,
      submittedBy: isAnonymous ? null : req.admin._id,
      submitterModel: isAnonymous ? null : "Admin",
      submitterDept: req.admin.department,
      submitterRole: "admin",
      against: againstId || undefined,
      againstModel: againstModel || undefined,
      attachments: attachments || [],
    });

    res.status(201).json({
      success: true,
      message: "Ticket submitted successfully",
      ticket: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        organisation_id: ticket.organisation_id,
        type: ticket.type,
        status: ticket.status,
        slaDeadline: ticket.slaDeadline,
        confidentialityLevel: ticket.confidentialityLevel,
      },
    });
  } catch (err) {
    next(err);
  }
};

const adminGetMyTickets = async (req, res, next) => {
  try {
    if (!req.admin)
      return res.status(401).json({ success: false, message: "Not authenticated" });

    const organisation_id = req.admin.organisation_id;
    const tickets = await Ticket.find({
      submittedBy: req.admin._id,
      organisation_id,
      isDeleted: false,
    })
      .select("-timeline -internalNotes -statusHistory")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, organisation_id, count: tickets.length, tickets });
  } catch (error) {
    next(error);
  }
};

const adminRateTicket = async (req, res, next) => {
  try {
    if (!req.admin)
      return res.status(401).json({ success: false, message: "Not authenticated" });

    const { ticketNumber } = req.params;
    const { rating, feedback } = req.body;
    const organisation_id = req.admin.organisation_id;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });

    const ticket = await Ticket.findOne({
      ticketNumber,
      submittedBy: req.admin._id,
      organisation_id,
      isDeleted: false,
    });
    if (!ticket)
      return res.status(404).json({ success: false, message: "Ticket not found" });
    if (!["resolved", "closed"].includes(ticket.status))
      return res.status(400).json({ success: false, message: "Can only rate resolved or closed tickets" });
    if (ticket.submitterRating)
      return res.status(400).json({ success: false, message: "You have already rated this ticket" });

    ticket.submitterRating = rating;
    ticket.submitterFeedback = feedback || "";
    ticket.ratedAt = new Date();
    ticket.timeline.push({
      action: "rating_submitted",
      note: `Submitter rated resolution ${rating}/5`,
      byModel: "Admin",
      byName: `${req.admin.f_name} ${req.admin.l_name}`,
    });

    await ticket.save();
    return res.status(200).json({ success: true, organisation_id, message: "Rating submitted successfully", rating });
  } catch (error) {
    next(error);
  }
};

const adminGetTicketDetail = async (req, res, next) => {
  try {
    if (!req.admin)
      return res.status(401).json({ success: false, message: "Not authenticated" });

    const { ticketNumber } = req.params;
    const organisation_id = req.admin.organisation_id;

    const ticket = await Ticket.findOne({
      ticketNumber,
      submittedBy: req.admin._id,
      organisation_id,
      isDeleted: false,
    })
      .populate("submittedBy", "f_name l_name work_email department designation")
      .populate("against", "f_name l_name work_email department designation")
      .select("-internalNotes")
      .lean();

    if (!ticket)
      return res.status(404).json({ success: false, message: "Ticket not found" });

    return res.status(200).json({ success: true, organisation_id, ticket });
  } catch (error) {
    next(error);
  }
};


const setEmployeeWorkingStatus = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const { working_status, noticePeriodAllowed, noticePeriodMonths, lastWorkingDay } = req.body;
    const organisation_id = req.admin.organisation_id;

    if (!working_status)
      return next(Object.assign(new Error("working_status is required"), { statusCode: 400 }));

    const allowedStatuses = ["working", "resigned", "fired", "terminated"];
    if (!allowedStatuses.includes(working_status))
      return next(
        Object.assign(
          new Error(`Invalid working_status. Must be one of: ${allowedStatuses.join(", ")}`),
          { statusCode: 400 }
        )
      );

    const existingUser = await Usermodel.findOne({ _id: id, organisation_id })
      .select("_id f_name l_name working_status")
      .lean();

    if (!existingUser)
      return next(Object.assign(new Error("Employee not found"), { statusCode: 404 }));

    // Notice period path: employee stays "working" (normal payroll keeps
    // running for the notice-period months) — the actual status flip and
    // FnF generation happen automatically on lastWorkingDay via the
    // Noticeperiodautoexit cron. No asset check here since they haven't
    // left yet.
    if (working_status !== "working" && noticePeriodAllowed) {
      if (!noticePeriodMonths || !lastWorkingDay)
        return next(Object.assign(new Error("noticePeriodMonths and lastWorkingDay are required when noticePeriodAllowed is true"), { statusCode: 400 }));

      const updated = await Usermodel.findOneAndUpdate(
        { _id: id, organisation_id },
        {
          $set: {
            noticePeriod: {
              active: true,
              exitType: working_status,
              months: Number(noticePeriodMonths),
              initiatedOn: new Date(),
              lastWorkingDay: new Date(lastWorkingDay),
              initiatedBy: req.admin._id,
              initiatedByModel: req.actorModel || "Admin",
            },
          },
        },
        { new: true, runValidators: true }
      )
        .select("_id uid f_name l_name work_email role department designation working_status status noticePeriod")
        .lean();

      return res.status(200).json({
        success: true,
        message: `Notice period started. ${existingUser.f_name} ${existingUser.l_name} will be marked '${working_status}' automatically on ${new Date(lastWorkingDay).toDateString()}.`,
        employee: updated,
      });
    }

    const wasWorking = existingUser.working_status === "working";
    const willBeWorking = working_status === "working";

    // 🔒 HARD BLOCK: check pending assets BEFORE updating status
    if (wasWorking && !willBeWorking) {
      const pendingAssets = await AssetModel.find({
        organisation_id,
        assignments: {
          $elemMatch: { assigned_to: id, assigned_to_model: "User", is_returned: false },
        },
      })
        .select("_id asset_id asset_name asset_type serial_number brand assignments")
        .lean();

      if (pendingAssets.length > 0) {
        return next(
          Object.assign(
            new Error(
              `Cannot offboard ${existingUser.f_name} ${existingUser.l_name}. ${pendingAssets.length} asset(s) must be revoked first.`
            ),
            {
              statusCode: 409,
              asset_return_check: {
                has_pending_assets: true,
                pending_asset_count: pendingAssets.length,
                assets: pendingAssets,
                message: `⚠️ ${pendingAssets.length} asset(s) are still assigned to this employee. Please revoke them before changing working status.`,
              },
            }
          )
        );
      }
    }

    const user = await Usermodel.findOneAndUpdate(
      { _id: id, organisation_id },
      {
        $set: {
          working_status,
          "noticePeriod.active": false,
          ...(willBeWorking ? { status: "active" } : { status: "inactive" }),
        },
      },
      { new: true, runValidators: true }
    )
      .select("_id uid f_name l_name work_email role department designation working_status status")
      .lean();

    if (!wasWorking && willBeWorking) {
      await incrementActiveUserCount(organisation_id);
    } else if (wasWorking && !willBeWorking) {
      await decrementActiveUserCount(organisation_id);
    }

    return res.status(200).json({
      success: true,
      message: `Employee working status updated to '${working_status}' successfully`,
      employee: user,
    });
  } catch (error) {
    next(error);
  }
};


const setManagerWorkingStatus = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const { working_status, noticePeriodAllowed, noticePeriodMonths, lastWorkingDay } = req.body;
    const organisation_id = req.admin.organisation_id;

    if (!working_status)
      return next(Object.assign(new Error("working_status is required"), { statusCode: 400 }));

    const allowedStatuses = ["working", "resigned", "fired", "terminated"];
    if (!allowedStatuses.includes(working_status))
      return next(
        Object.assign(
          new Error(`Invalid working_status. Must be one of: ${allowedStatuses.join(", ")}`),
          { statusCode: 400 }
        )
      );

    const existingManager = await Managermodel.findOne({ _id: id, organisation_id })
      .select("empid _id f_name l_name working_status")
      .lean();

    if (!existingManager)
      return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));

    if (working_status !== "working" && noticePeriodAllowed) {
      if (!noticePeriodMonths || !lastWorkingDay)
        return next(Object.assign(new Error("noticePeriodMonths and lastWorkingDay are required when noticePeriodAllowed is true"), { statusCode: 400 }));

      const updated = await Managermodel.findOneAndUpdate(
        { _id: id, organisation_id },
        {
          $set: {
            noticePeriod: {
              active: true,
              exitType: working_status,
              months: Number(noticePeriodMonths),
              initiatedOn: new Date(),
              lastWorkingDay: new Date(lastWorkingDay),
              initiatedBy: req.admin._id,
              initiatedByModel: req.actorModel || "Admin",
            },
          },
        },
        { new: true, runValidators: true }
      )
        .select("_id uid f_name l_name work_email role department designation working_status status noticePeriod")
        .lean();

      return res.status(200).json({
        success: true,
        message: `Notice period started. ${existingManager.f_name} ${existingManager.l_name} will be marked '${working_status}' automatically on ${new Date(lastWorkingDay).toDateString()}.`,
        manager: updated,
      });
    }

    const wasWorking = existingManager.working_status === "working";
    const willBeWorking = working_status === "working";

    // 🔒 HARD BLOCK: check pending assets BEFORE updating status
    if (wasWorking && !willBeWorking) {
      const pendingAssets = await AssetModel.find({
        organisation_id,
        assignments: {
          $elemMatch: { assigned_to: id, assigned_to_model: "Manager", is_returned: false },
        },
      })
        .select("_id asset_id asset_name asset_type serial_number brand assignments")
        .lean();

      if (pendingAssets.length > 0) {
        return next(
          Object.assign(
            new Error(
              `Cannot offboard ${existingManager.f_name} ${existingManager.l_name}. ${pendingAssets.length} asset(s) must be revoked first.`
            ),
            {
              statusCode: 409,
              asset_return_check: {
                has_pending_assets: true,
                pending_asset_count: pendingAssets.length,
                assets: pendingAssets,
                message: `⚠️ ${pendingAssets.length} asset(s) are still assigned to this manager. Please revoke them before changing working status.`,
              },
            }
          )
        );
      }
    }

    const manager = await Managermodel.findOneAndUpdate(
      { _id: id, organisation_id },
      {
        $set: {
          working_status,
          "noticePeriod.active": false,
          ...(willBeWorking ? { status: "active" } : { status: "inactive" }),
        },
      },
      { new: true, runValidators: true }
    )
      .select("_id uid f_name l_name work_email role department designation working_status status")
      .lean();

    if (!wasWorking && willBeWorking) {
      await incrementActiveUserCount(organisation_id);
    } else if (wasWorking && !willBeWorking) {
      await decrementActiveUserCount(organisation_id);
    }

    return res.status(200).json({
      success: true,
      message: `Manager working status updated to '${working_status}' successfully`,
      manager,
    });
  } catch (error) {
    next(error);
  }
};

const getInactiveUsers = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;
    const inactiveStatuses = ["resigned", "fired", "terminated"];

    const [managers, employees] = await Promise.all([
      Managermodel.find({ organisation_id, working_status: { $in: inactiveStatuses } })
        .select("uid f_name l_name work_email role department designation working_status status")
        .lean(),
      Usermodel.find({ organisation_id, working_status: { $in: inactiveStatuses } })
        .select("uid f_name l_name work_email role department designation working_status status")
        .lean(),
    ]);

    const all = [
      ...managers.map((m) => ({ type: "manager", ...m })),
      ...employees.map((e) => ({ type: "employee", ...e })),
    ];

    return res.status(200).json({
      success: true,
      count: all.length,
      managers: managers.length,
      employees: employees.length,
      users: all,
    });
  } catch (error) {
    next(error);
  }
};


const getActiveUserCount = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const superAdmin = await SuperAdminModel.findById(req.admin.organisation_id)
      .select("active_user_count licenses is_trial_active trial_expires_at")
      .lean();

    if (!superAdmin)
      return next(Object.assign(new Error("Organisation not found"), { statusCode: 404 }));

    const license = superAdmin.licenses?.find(
      (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
    );

    const trialActive =
      superAdmin.is_trial_active && new Date() < new Date(superAdmin.trial_expires_at);

    const activeCount = superAdmin.active_user_count || 0;
    const allowedUsers = trialActive ? 4 : (license?.users || 0);
    const isLimitReached = allowedUsers > 0 ? activeCount >= allowedUsers : false;

    return res.status(200).json({
      success: true,
      active_user_count: activeCount,
      allowed_users: allowedUsers,
      remaining_slots: Math.max(0, allowedUsers - activeCount),
      is_limit_reached: isLimitReached,
      plan: trialActive ? "trial" : (license?.plan || null),
      plan_type: license?.plan_type || null,
    });
  } catch (error) {
    next(error);
  }
};

const getAllAdminsForOrg = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;

    const admins = await Adminmodel.find({ organisation_id, working_status: "working" })
      .select("empid uid f_name l_name work_email role department designation office_location organisation_id")
      .lean();

    return res.status(200).json({
      success: true,
      organisation_id,
      count: admins.length,
      admins: admins.map((admin) => ({ type: "admin", ...admin })),
    });
  } catch (error) {
    next(error);
  }
};
const getMyAttendanceHistory = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    const attendance = await Attendance.find({
      employee: req.admin._id,
      organisation_id: req.admin.organisation_id,
    })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, count: attendance.length, attendance });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyAdmin,
  adminlogin,
  adminlogout,
  getMyAttendanceHistory,
  addmanager,
  addemployee,
  findallmanagers,
  getallemployee,
  getMyTeamOverview,
  editemployee,
  editmanager,
  promoteEmployeeToManager,
  promoteManagerToAdmin,
  promoteEmployeeToAdmin,
  demoteManagerToEmployee,
  demoteAdminToManager,
  demoteAdminToEmployee,
  changeManagerRole,
  getperticularemployee,
  getperticularemanager,
  deleteemployee,
  showallleaves,
  acceptLeave,
  rejectLeave,
  applyleave,
  getmyleavehistory,
  noofemployee,
  createannouncement,
  getallannouncement,
  updateAnnouncement,
  deleteAnnouncement,
  reviewtomanager,
  getAllReviewsForAdmin,
  respondToMyReview,
  hrAcknowledgeReviewHandler,
  forgetpasswordloginotp,
  verifyAotp,
  resetAdminPassword,
  getme,
  editadminprofile,
  changepassword,
  getTodayCheckins,
  getAttendanceOverview,
  getAttendanceHistory,
  getOrgInfo,
  getAllPersonalDocumentsAdmin,
  getAllExpenseDocumentsAdmin,
  getDocumentDetailsAdmin,
  adminActionOnLeave,
  adminSubmitTicket,
  adminGetMyTickets,
  adminRateTicket,
  adminGetTicketDetail,
  findallmanagerswoadmin,
  findallemployeesfull,
  setEmployeeWorkingStatus,
  setManagerWorkingStatus,
  getInactiveUsers,
  getActiveUserCount,
  getAllAdminsForOrg
};