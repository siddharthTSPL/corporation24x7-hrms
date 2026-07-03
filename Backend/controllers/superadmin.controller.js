const SuperAdminModel = require("../Models/superadmin.model");
const AdminModel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const Usermodel = require("../Models/user.model");
const announcementmodel = require("../Models/announcement.model");
const uidmodel = require("../Models/UIDmodel.model");
const LeaveBalance = require("../Models/leavebalance.model");
const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const Review = require("../Models/review.model");
const leavebalanceModel = require("../Models/leavebalance.model");
const reviewModel = require("../Models/review.model");
const Attendance = require("../Models/attendance.model");
const generateUID = require("../automatic/uidgeneration");
const assignDefaultLeave = require("../automatic/bydefaultleaveset");
const { processLeaveDeduction } = require("../automatic/calculateleave");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { sendEmail } = require("../utils/nodemailer.utils");
const generateOTP = require("../automatic/otpgenerator");
const PermissionModel = require("../Models/permission.model");
const Document = require("../Models/document.model");
const OtpModel = require("../Models/otpbasedlogin.model");
const AdminLeave = require("../Models/adleave.model");
const { canOnboardUser, incrementActiveUserCount, decrementActiveUserCount } = require("../utils/licenseCheck");
const AssetModel = require("../Models/asset.model");

const EXCLUDE =
  "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt";

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

const assignPermissions = async (user_id, role, organisation_id, granted_by, granted_by_model, overrides) => {
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
    { upsert: true, new: true, runValidators: true }
  );
};

const registerSuperAdmin = async (req, res, next) => {
  try {
    const {
      f_name,
      l_name,
      email,
      password,
      organisation_name,
      phone,
      company_address,
      company_size,
      industry,
    } = req.body;

    if (!f_name || !l_name || !email || !password || !organisation_name) {
      return next(
        Object.assign(
          new Error(
            "f_name, l_name, email, password and organisation_name are required",
          ),
          { statusCode: 400 },
        ),
      );
    }

    await SuperAdminModel.checkDomainAvailable(email);

    const superAdmin = await SuperAdminModel.create({
      f_name,
      l_name,
      email,
      password,
      organisation_name,
      phone,
      company_address,
      company_size,
      industry,
    });

    const verifyToken = jwt.sign(
      { superadminid: superAdmin._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
    const verifyLink = `${process.env.BASE_URL}talent/api/superadmin/verify/${verifyToken}`;

    sendEmail({
      to: email,
      subject: "✅ Verify Your Super Admin Account — Action Required",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify Your Account</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1ee;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;
                 box-shadow:0 8px 32px rgba(115,0,66,0.10);max-width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#730042 0%,#CD166E 100%);
                        padding:40px 40px 32px 40px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);
                          border-radius:50%;padding:16px;margin-bottom:16px;">
                <span style="font-size:36px;">🛡️</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;
                          letter-spacing:-0.5px;">
                Welcome to the Platform
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Super Admin Account Verification
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#730042;font-size:20px;">
                Hello, ${f_name} ${l_name} 👋
              </h2>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.7;">
                Your Super Admin account for
                <strong style="color:#730042;">${organisation_name}</strong>
                has been successfully created. You're just one step away from
                accessing the full platform.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fdf6fa;border-radius:10px;padding:0;margin-bottom:28px;
                       border:1px solid #f0dcea;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="6" cellspacing="0">
                      <tr>
                        <td style="color:#888;font-size:13px;width:140px;">📧 Email</td>
                        <td style="color:#333;font-size:13px;font-weight:600;">${email}</td>
                      </tr>
                      <tr>
                        <td style="color:#888;font-size:13px;">🏢 Organisation</td>
                        <td style="color:#333;font-size:13px;font-weight:600;">${organisation_name}</td>
                      </tr>
                      <tr>
                        <td style="color:#888;font-size:13px;">🎯 Plan</td>
                        <td style="color:#333;font-size:13px;font-weight:600;">
                          <span style="background:#730042;color:white;padding:2px 10px;
                                       border-radius:20px;font-size:11px;">
                            30-Day Free Trial
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#888;font-size:13px;">👤 Role</td>
                        <td style="color:#333;font-size:13px;font-weight:600;">Super Admin</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;color:#444;font-size:15px;line-height:1.6;">
                Click the button below to verify your email and activate your account:
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${verifyLink}"
                  style="background:linear-gradient(135deg,#730042,#CD166E);
                         color:#ffffff;padding:16px 40px;text-decoration:none;
                         border-radius:10px;font-weight:700;font-size:16px;
                         display:inline-block;letter-spacing:0.3px;
                         box-shadow:0 4px 16px rgba(205,22,110,0.35);">
                  ✅ Verify My Account
                </a>
              </div>
              <div style="background:#f9f9f9;border-left:4px solid #CD166E;
                          border-radius:4px;padding:14px 18px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:13px;color:#666;">
                  Button not working? Copy and paste this link into your browser:
                </p>
                <a href="${verifyLink}"
                  style="font-size:12px;color:#CD166E;word-break:break-all;
                         text-decoration:none;">
                  ${verifyLink}
                </a>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fff8e1;border-radius:8px;border:1px solid #ffe082;
                       margin-bottom:8px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#795548;">
                      ⏱️ <strong>This link expires in 1 hour.</strong>
                      If it expires, please register again or contact support.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;color:#999;">
                If you did not create this account, you can safely ignore this email.
                No action is required.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f4f1ee;padding:24px 40px;text-align:center;
                        border-top:1px solid #eedde8;">
              <p style="margin:0 0 6px;font-size:13px;color:#730042;font-weight:600;">
                TechTorch HRMS Platform
              </p>
              <p style="margin:0;font-size:12px;color:#aaa;">
                © 2026 TechTorch Solutions Private Limited. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully. Please verify your email.",
    });
  } catch (err) {
    next(Object.assign(err, { statusCode: err.statusCode || 400 }));
  }
};

const verifySuperAdmin = async (req, res, next) => {
  const { token } = req.params;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      Object.assign(new Error("Invalid or expired verification link"), {
        statusCode: 400,
      }),
    );
  }
  const superAdmin = await SuperAdminModel.findById(decoded.superadminid);
  if (!superAdmin)
    return next(
      Object.assign(new Error("Account not found"), { statusCode: 404 }),
    );
  if (superAdmin.isVerified)
    return res
      .status(200)
      .json({ message: "Email already verified. Please login." });
  superAdmin.isVerified = true;
  await superAdmin.save();
  res.status(200).json({
    success: true,
    message: "Email verified successfully. You can now login.",
  });
};

const loginSuperAdmin = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password)
      return next(Object.assign(new Error("Email and password are required"), { statusCode: 400 }));

    const superAdmin = await SuperAdminModel.findOne({ email: identifier.toLowerCase().trim() });

    if (!superAdmin)
      return next(Object.assign(new Error("No account found with this email"), { statusCode: 404 }));

    if (!superAdmin.isVerified)
      return next(Object.assign(new Error("Please verify your email before logging in"), { statusCode: 403 }));

    if (superAdmin.status === "suspended")
      return next(Object.assign(new Error("Your account has been suspended. Contact support."), { statusCode: 403 }));

    const isMatch = await superAdmin.isValidPassword(password);
    if (!isMatch)
      return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

    const trialValid = superAdmin.isTrialValid();
    const hasTalentLicense = superAdmin.licenses.some(
      (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date(),
    );

    if (!trialValid && !hasTalentLicense)
      return next(Object.assign(
        new Error("Your trial has expired and you have no active license for TorchX Talent. Please upgrade your plan at torchxsuite.com to continue."),
        { statusCode: 403, code: "PLAN_EXPIRED" },
      ));

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOpts = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    };

    if (superAdmin.isFirstLogin) {
      const firstLoginToken = jwt.sign(
        { superadminid: superAdmin._id, email: superAdmin.email, purpose: "first_login" },
        process.env.JWT_SECRET,
        { expiresIn: "15m" },
      );

      res.cookie("superResetToken", firstLoginToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });

      sendEmail({
        to: superAdmin.email,
        subject: "Set Your Password",
        html: `
          <div style="font-family:Arial,sans-serif;padding:20px">
            <h2>Hello ${superAdmin.f_name},</h2>
            <p>This is your first login. Please set your password using the link below.</p>
            <a href="${process.env.BASE_URL}talent/api/superadmin/reset-password"
               style="display:inline-block;padding:12px 24px;background:#730042;color:#fff;border-radius:6px;text-decoration:none;">
              Set Password
            </a>
            <p>This link expires in 15 minutes.</p>
          </div>
        `,
      }).catch((err) => console.error("First login email failed:", err.message));

      return next(
        Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }),
      );
    }

    const token = jwt.sign(
      { superadminid: superAdmin._id, role: superAdmin.role, email: superAdmin.email, company_domain: superAdmin.company_domain },
      process.env.JWT_SECRET,
      { expiresIn: "15d" },
    );

    res.cookie("token", token, { ...cookieOpts, maxAge: 15 * 24 * 60 * 60 * 1000 });

    superAdmin.last_login = new Date();
    superAdmin.status = "active";
    await superAdmin.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      superAdmin: {
        id: superAdmin._id,
        f_name: superAdmin.f_name,
        l_name: superAdmin.l_name,
        email: superAdmin.email,
        organisation_name: superAdmin.organisation_name,
        company_domain: superAdmin.company_domain,
        role: superAdmin.role,
        is_trial_active: trialValid,
        trial_expires_at: superAdmin.trial_expires_at,
        has_talent_license: hasTalentLicense,
      },
    });
  } catch (err) {
    next(Object.assign(err, { statusCode: err.statusCode || 500 }));
  }
};

const getMe = async (req, res, next) => {
  try {
    const superAdmin = req.superAdmin;

    res.status(200).json({
      success: true,
      superAdmin: {
        profile_image: superAdmin.profile_image,
        _id: superAdmin._id,
        f_name: superAdmin.f_name,
        l_name: superAdmin.l_name,
        email: superAdmin.email,
        phone: superAdmin.phone,
        profile_image: superAdmin.profile_image,
        organisation_name: superAdmin.organisation_name,
        company_address: superAdmin.company_address,
        company_size: superAdmin.company_size,
        industry: superAdmin.industry,
        plan: superAdmin.plan,
        role: superAdmin.role,
        status: superAdmin.status,
        isVerified: superAdmin.isVerified,
        isFirstLogin: superAdmin.isFirstLogin,
        last_login: superAdmin.last_login,
        company_domain: superAdmin.company_domain,
        plan_started_at: superAdmin.plan_started_at,
        plan_expires_at: superAdmin.plan_expires_at,
        trial_started_at: superAdmin.trial_started_at,
        trial_expires_at: superAdmin.trial_expires_at,
        is_trial_active: superAdmin.is_trial_active,
        licenses: superAdmin.licenses,
        purchased_products: superAdmin.purchased_products,
        createdAt: superAdmin.createdAt,
        updatedAt: superAdmin.updatedAt,
        __v: superAdmin.__v,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logoutSuperAdmin = async (req, res, next) => {
  req.superAdmin.status = "inactive";
  await req.superAdmin.save();
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

const updateSuperAdmin = async (req, res, next) => {
  const superAdmin = req.superAdmin;
  [
    "f_name",
    "l_name",
    "phone",
    "profile_image",
    "company_address",
    "company_size",
    "industry",
    "organisation_name",
  ].forEach((field) => {
    if (req.body[field] !== undefined) superAdmin[field] = req.body[field];
  });
  await superAdmin.save();
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    superAdmin: {
      id: superAdmin._id,
      f_name: superAdmin.f_name,
      l_name: superAdmin.l_name,
      email: superAdmin.email,
      phone: superAdmin.phone,
      profile_image: superAdmin.profile_image,
      organisation_name: superAdmin.organisation_name,
      company_address: superAdmin.company_address,
      company_size: superAdmin.company_size,
      industry: superAdmin.industry,
    },
  });
};

const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return next(
      Object.assign(
        new Error("Current password and new password are required"),
        { statusCode: 400 },
      ),
    );
  const superAdmin = await SuperAdminModel.findById(req.superAdmin._id);
  const isValid = await superAdmin.isValidPassword(currentPassword);
  if (!isValid)
    return next(
      Object.assign(new Error("Current password is incorrect"), {
        statusCode: 400,
      }),
    );
  if (currentPassword === newPassword)
    return next(
      Object.assign(
        new Error("New password must be different from current password"),
        { statusCode: 400 },
      ),
    );
  superAdmin.password = newPassword;
  await superAdmin.save();
  res
    .status(200)
    .json({ success: true, message: "Password updated successfully" });
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email)
    return next(
      Object.assign(new Error("Email is required"), { statusCode: 400 }),
    );
  const superAdmin = await SuperAdminModel.findOne({
    email: email.toLowerCase().trim(),
  })
    .select("_id f_name")
    .lean();
  if (!superAdmin)
    return next(
      Object.assign(new Error("No account found with this email"), {
        statusCode: 404,
      }),
    );
  const otp = generateOTP();
  await OtpModel.findOneAndUpdate(
    { email },
    { otp: String(otp), expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    { upsert: true, new: true },
  );
  sendEmail({
    to: email,
    subject: "Password Reset OTP",
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#F9F8F2;font-family:'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1 style="margin:0;">Password Reset</h1></td></tr><tr><td style="padding:40px;color:#333;"><h2 style="color:#730042;">Hello ${superAdmin.f_name},</h2><p>Your password reset OTP is:</p><div style="text-align:center;margin:30px 0;"><span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#730042;">${otp}</span></div><p style="font-size:14px;color:#666;text-align:center;">Expires in <strong>5 minutes</strong>.</p></td></tr><tr><td style="background:#F9F8F2;padding:20px;text-align:center;font-size:12px;color:#888;">© 2026 HRMS Platform</td></tr></table></td></tr></table></body></html>`,
  });
  res.status(200).json({ success: true, message: "OTP sent to your email" });
};

const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return next(Object.assign(new Error("Email and OTP are required"), { statusCode: 400 }));

  const otpRecord = await OtpModel.findOne({ email });
  if (!otpRecord)
    return next(Object.assign(new Error("OTP not found. Please request a new one"), { statusCode: 404 }));
  if (otpRecord.isExpired()) {
    await OtpModel.deleteOne({ email });
    return next(Object.assign(new Error("OTP has expired. Please request a new one"), { statusCode: 400 }));
  }
  if (!otpRecord.compareOtp(String(otp)))
    return next(Object.assign(new Error("Invalid OTP"), { statusCode: 400 }));

  const superAdmin = await SuperAdminModel.findOne({ email }).select("_id f_name email role").lean();
  if (!superAdmin)
    return next(Object.assign(new Error("Account not found"), { statusCode: 404 }));

  await OtpModel.deleteOne({ email });

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  };

  const token = jwt.sign(
    { superadminid: superAdmin._id, role: superAdmin.role, email: superAdmin.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  const resetToken = jwt.sign(
    { superadminid: superAdmin._id, email: superAdmin.email, purpose: "password_reset" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  res.cookie("token", token, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.cookie("superResetToken", resetToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });

  SuperAdminModel.findByIdAndUpdate(superAdmin._id, {
    status: "active",
    last_login: new Date(),
  }).exec();

  sendEmail({
    to: email,
    subject: "Optional Password Reset",
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px">
        <h2>Hello ${superAdmin.f_name},</h2>
        <p>Your OTP login was successful.</p>
        <p>If you want to reset your password, click the button below. This link expires in <strong>15 minutes</strong>.</p>
        <a href="${process.env.BASE_URL}talent/api/superadmin/reset-password"
           style="display:inline-block;padding:12px 24px;background:#730042;color:#fff;border-radius:6px;text-decoration:none;">
          Reset Password
        </a>
        <p style="color:#999;font-size:12px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  }).catch((err) => console.error("Reset email failed:", err.message));

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    role: superAdmin.role,
    passwordResetOptional: true,
  });
};

const resetPassword = async (req, res, next) => {
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword)
    return next(Object.assign(new Error("Both password fields are required"), { statusCode: 400 }));

  if (newPassword !== confirmPassword)
    return next(Object.assign(new Error("Passwords do not match"), { statusCode: 400 }));

  if (newPassword.length < 8)
    return next(Object.assign(new Error("Password must be at least 8 characters"), { statusCode: 400 }));

  const resetToken = req.cookies?.superResetToken;
  if (!resetToken)
    return next(Object.assign(new Error("Reset session expired. Please verify OTP again."), { statusCode: 401 }));

  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (err) {
    return next(Object.assign(new Error("Invalid or expired reset token"), { statusCode: 401 }));
  }

  if (decoded.purpose !== "password_reset" && decoded.purpose !== "first_login")
    return next(Object.assign(new Error("Invalid reset token"), { statusCode: 401 }));

  const superAdmin = await SuperAdminModel.findById(decoded.superadminid);
  if (!superAdmin)
    return next(Object.assign(new Error("Account not found"), { statusCode: 404 }));

  superAdmin.password = newPassword;
  if (decoded.purpose === "first_login") superAdmin.isFirstLogin = false;
  await superAdmin.save();

  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("superResetToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });

  res.status(200).json({ success: true, message: "Password updated successfully" });
};

const createAdmin = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
 
    const {
      f_name, l_name, work_email, password, gender, designation, department,
      office_location, personal_contact, e_contact, role, marital_status,
      is_fresher, total_experience, previous_company, previous_designation,
      aadhaar_number, pan_number, address, city, state, pincode,
      reporting_manager, reporting_manager_model, bank_name,
      account_holder_name, account_number, ifsc_code, country, permissions,
    } = req.body;
 
    if (!f_name || !l_name || !work_email || !password || !gender || !designation ||
        !department || !office_location || !personal_contact || !e_contact)
      return next(Object.assign(
        new Error("f_name, l_name, work_email, password, gender, designation, department, office_location, personal_contact and e_contact are required"),
        { statusCode: 400 }
      ));
 
    const email = work_email.toLowerCase().trim();
    const organisation_id = req.superAdmin._id;
 
    const existing = await AdminModel.findOne({ work_email: email, organisation_id })
      .select("_id").lean();
    if (existing)
      return next(Object.assign(
        new Error("An admin with this email already exists in your organization"),
        { statusCode: 400 }
      ));
 
    const licenseCheck = await canOnboardUser(organisation_id);
    if (!licenseCheck.allowed)
      return next(Object.assign(new Error(licenseCheck.message), { statusCode: 403 }));
 
    const uid = await generateUID(department, organisation_id);
 
    const admin = await AdminModel.create({
      organisation_id, uid, f_name, l_name, work_email: email, password, gender,
      designation, department, office_location, personal_contact, e_contact,
      role: role || "admin",
      marital_status: marital_status || "single",
      is_fresher: is_fresher !== undefined ? is_fresher : true,
      total_experience: total_experience || 0,
      previous_company: previous_company || undefined,
      previous_designation: previous_designation || undefined,
      aadhaar_number: aadhaar_number || undefined,
      pan_number: pan_number || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      pincode: pincode || undefined,
      reporting_manager: reporting_manager || undefined,
      reporting_manager_model: reporting_manager_model || undefined,
      bank_name: bank_name || undefined,
      account_holder_name: account_holder_name || undefined,
      account_number: account_number || undefined,
      ifsc_code: ifsc_code || undefined,
      created_by: req.superAdmin._id,
    });
 
    await incrementActiveUserCount(organisation_id);
 
    await assignDefaultLeave({ ...admin.toObject(), role: "admin" });
 
    const verifyToken = jwt.sign({ adminid: admin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const verifyLink = `${process.env.BASE_URL}/talent/api/admin/verify/${verifyToken}`;
 
    await sendEmail({
      to: email,
      subject: "Activate Your Admin Account",
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Admin Account Activation</title>
</head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 0;">
<tr>
<td align="center">
<table width="650" cellpadding="0" cellspacing="0" border="0"
style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
<tr>
<td style="background:linear-gradient(135deg,#730042,#CD166E);padding:35px;text-align:center;color:#ffffff;">
<h1 style="margin:0;font-size:28px;">Welcome to HRMS Platform</h1>
<p style="margin-top:10px;font-size:15px;opacity:0.9;">Your admin account has been successfully created</p>
</td>
</tr>
<tr>
<td style="padding:40px;color:#333333;">
<h2 style="margin-top:0;color:#730042;">Hello ${f_name} ${l_name},</h2>
<p style="font-size:15px;line-height:1.8;color:#555;">
Your admin account is now ready. Please verify your email address to activate your account and access the HRMS dashboard.
</p>
<table width="100%" cellpadding="0" cellspacing="0"
style="margin:30px 0;background:#F9F8F2;border-radius:10px;padding:20px;">
<tr><td style="padding:8px 0;"><strong>UID:</strong> ${uid}</td></tr>
<tr><td style="padding:8px 0;"><strong>Role:</strong> ${role || "Admin"}</td></tr>
<tr><td style="padding:8px 0;"><strong>Designation:</strong> ${designation}</td></tr>
<tr><td style="padding:8px 0;"><strong>Department:</strong> ${department}</td></tr>
<tr><td style="padding:8px 0;"><strong>Office Location:</strong> ${office_location}</td></tr>
<tr><td style="padding:8px 0;"><strong>Email:</strong> ${email}</td></tr>
<tr><td style="padding:8px 0;"><strong>Default Leave Balance:</strong> Assigned Successfully</td></tr>
</table>
<div style="text-align:center;margin:40px 0;">
<a href="${verifyLink}"
style="background:#CD166E;color:#ffffff;padding:15px 35px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
Verify &amp; Activate Account
</a>
</div>
<p style="font-size:14px;color:#666;line-height:1.7;">This verification link will expire in <strong>1 hour</strong>.</p>
<p style="font-size:14px;color:#666;line-height:1.7;">If the button above does not work, copy and paste the following link into your browser:</p>
<p style="word-break:break-all;font-size:13px;color:#CD166E;background:#F9F8F2;padding:12px;border-radius:6px;">${verifyLink}</p>
</td>
</tr>
<tr>
<td style="background:#F4F6F9;padding:25px;text-align:center;font-size:12px;color:#888888;">
© 2026 HRMS Platform. All rights reserved.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`,
    });
 
    await assignPermissions(admin._id, admin.role || "admin", organisation_id, req.superAdmin._id, "SuperAdmin", permissions);
 
    res.status(201).json({
      success: true,
      message: "Admin created successfully. Verification email sent.",
      admin: {
        id: admin._id, uid: admin.uid, f_name: admin.f_name, l_name: admin.l_name,
        work_email: admin.work_email, designation: admin.designation,
        department: admin.department, office_location: admin.office_location,
        role: admin.role, status: admin.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
 
const addmanager = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
 
    const {
      f_name, l_name, work_email, gender, marital_status, password,
      personal_contact, e_contact, role, office_location, designation,
      department, permissions,
    } = req.body;
 
    if (!f_name || !work_email || !password || !department || !gender ||
        !office_location || !designation || !personal_contact || !e_contact)
      return next(Object.assign(new Error("Required fields missing"), { statusCode: 400 }));
 
    const organisation_id = req.superAdmin._id;
 
    const existingManager = await Managermodel.findOne({
      work_email: work_email.toLowerCase().trim(), organisation_id,
    }).select("_id").lean();
    if (existingManager)
      return next(Object.assign(
        new Error("Manager with this email already exists in your organization"),
        { statusCode: 400 }
      ));
 
    const licenseCheck = await canOnboardUser(organisation_id);
    if (!licenseCheck.allowed)
      return next(Object.assign(new Error(licenseCheck.message), { statusCode: 403 }));
 
    const uid = await generateUID(department, organisation_id);
 
    const newmanager = await Managermodel.create({
      organisation_id, uid, department, f_name, l_name,
      work_email: work_email.toLowerCase().trim(),
      gender, marital_status, password, personal_contact, e_contact,
      role, office_location, designation,
    });
 
    await incrementActiveUserCount(organisation_id);
 
    const token = jwt.sign({ managerid: newmanager._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const verifyLink = `${process.env.BASE_URL}talent/api/manager/verify/${token}`;
 
    await Promise.all([
      assignDefaultLeave(newmanager),
      assignPermissions(newmanager._id, newmanager.role || "manager", organisation_id, req.superAdmin._id, "SuperAdmin", permissions),
      sendEmail({
        to: work_email,
        subject: "Activate Your Manager Account",
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1 style="margin:0;">Manager Onboarding</h1></td></tr><tr><td style="padding:40px;color:#333;"><h2 style="color:#730042;">Hi ${f_name},</h2><p>Your <strong>Manager Account</strong> has been successfully created.</p><div style="background:#F9F8F2;padding:15px;border-radius:8px;margin:20px 0;"><p style="margin:0;"><strong>Role:</strong> ${designation}</p><p style="margin:5px 0;"><strong>Department:</strong> ${department}</p><p style="margin:0;"><strong>Location:</strong> ${office_location}</p></div><div style="text-align:center;margin:30px 0;"><a href="${verifyLink}" style="background:#CD166E;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">Verify & Activate</a></div><p style="font-size:13px;color:#777;">Or copy: <span style="color:#CD166E;">${verifyLink}</span></p><p style="font-size:13px;color:#777;">Link expires in 1 hour.</p></td></tr><tr><td style="background:#F9F8F2;padding:20px;text-align:center;font-size:12px;color:#888;">© 2026 Your Company</td></tr></table></td></tr></table></body></html>`,
      }),
    ]);
 
    res.status(201).json({
      success: true,
      message: "Manager added successfully. Verification email sent.",
      manager: {
        id: newmanager._id, uid: newmanager.uid, f_name: newmanager.f_name,
        l_name: newmanager.l_name, work_email: newmanager.work_email,
        department: newmanager.department, designation: newmanager.designation,
        role: newmanager.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateAdmin = async (req, res, next) => {
  const { id } = req.params;
  const organisation_id = req.superAdmin._id;

  const admin = await AdminModel.findOne({ _id: id, organisation_id });
  if (!admin)
    return next(
      Object.assign(new Error("Admin not found"), { statusCode: 404 }),
    );
  ["f_name", "l_name", "phone", "gender", "designation", "profile_image"].forEach(
    (field) => {
      if (req.body[field] !== undefined) admin[field] = req.body[field];
    },
  );
  await admin.save();
  res.status(200).json({
    success: true,
    message: "Admin updated successfully",
    admin: {
      id: admin._id,
      f_name: admin.f_name,
      l_name: admin.l_name,
      work_email: admin.work_email,
      phone: admin.phone,
      gender: admin.gender,
      designation: admin.designation,
      status: admin.status,
    },
  });
};

const deleteAdmin = async (req, res, next) => {
  const { id } = req.params;
  const organisation_id = req.superAdmin._id;

  const admin = await AdminModel.findOne({ _id: id, organisation_id });
  if (!admin)
    return next(
      Object.assign(new Error("Admin not found"), { statusCode: 404 }),
    );
  await AdminModel.findByIdAndDelete(id);
  if (admin.working_status === "working") {
    await decrementActiveUserCount(organisation_id);
  }
  res
    .status(200)
    .json({ success: true, message: "Admin deleted successfully" });
};

const getAllAdmins = async (req, res, next) => {
  try {
    if (!req.superAdmin) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      );
    }

    const organisation_id = req.superAdmin._id;

    const admins = await AdminModel.find({ organisation_id })
      .select("-password -__v")
      .lean();

    res.status(200).json({
      success: true,
      organisation_id,
      count: admins.length,
      admins,
    });
  } catch (error) {
    next(error);
  }
};


const addemployee = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
 
    const {
      f_name, l_name, work_email, password, gender, marital_status,
      personal_contact, e_contact, role, office_location, designation,
      department, Under_manager, permissions,
    } = req.body;
 
    if (!f_name || !work_email || !password || !department || !gender ||
        !office_location || !designation || !personal_contact || !e_contact)
      return next(Object.assign(new Error("Required fields missing"), { statusCode: 400 }));
 
    const organisation_id = req.superAdmin._id;
 
    const existingUser = await Usermodel.findOne({
      work_email: work_email.toLowerCase().trim(), organisation_id,
    }).select("_id").lean();
    if (existingUser)
      return next(Object.assign(
        new Error("Employee with this email already exists in your organization"),
        { statusCode: 400 }
      ));
 
    const licenseCheck = await canOnboardUser(organisation_id);
    if (!licenseCheck.allowed)
      return next(Object.assign(new Error(licenseCheck.message), { statusCode: 403 }));
 
    const uid = await generateUID(department, organisation_id);
 
    const newuser = await Usermodel.create({
      organisation_id, uid, f_name, l_name,
      work_email: work_email.toLowerCase().trim(),
      gender, marital_status, password, personal_contact, e_contact,
      role, office_location, designation, department,
      Under_manager: Under_manager || null,
    });
 
    await incrementActiveUserCount(organisation_id);
 
    const token = jwt.sign({ userid: newuser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const verifyLink = `${process.env.BASE_URL}talent/api/user/verify/${token}`;
 
    await Promise.all([
      assignDefaultLeave(newuser),
      assignPermissions(newuser._id, newuser.role || "employee", organisation_id, req.superAdmin._id, "SuperAdmin", permissions),
      sendEmail({
        to: work_email,
        subject: "Welcome! Verify Your Employee Account",
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1 style="margin:0;">Welcome Aboard</h1></td></tr><tr><td style="padding:40px;color:#333;"><h2 style="color:#730042;">Hello ${f_name},</h2><p>Your employee account has been successfully created.</p><div style="background:#F9F8F2;padding:15px;border-radius:8px;margin:20px 0;"><p style="margin:0;"><strong>Department:</strong> ${department}</p><p style="margin:5px 0;"><strong>Manager:</strong> ${Under_manager || "Assigned Soon"}</p><p style="margin:0;"><strong>Location:</strong> ${office_location}</p></div><div style="text-align:center;margin:30px 0;"><a href="${verifyLink}" style="background:#730042;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">Verify Account</a></div><p style="font-size:13px;color:#777;">Or copy: <span style="color:#CD166E;">${verifyLink}</span></p><p style="font-size:13px;color:#777;">Link valid for 1 hour only.</p></td></tr><tr><td style="background:#F9F8F2;padding:20px;text-align:center;font-size:12px;color:#888;">© 2026 Your Company</td></tr></table></td></tr></table></body></html>`,
      }),
    ]);
 
    res.status(201).json({
      success: true,
      message: "Employee added successfully. Verification email sent.",
      employee: {
        id: newuser._id, uid: newuser.uid, f_name: newuser.f_name,
        l_name: newuser.l_name, work_email: newuser.work_email,
        department: newuser.department, designation: newuser.designation,
        role: newuser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const findallmanagers = async (req, res, next) => {
  try {
    if (!req.superAdmin) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      );
    }

    const organisation_id = req.superAdmin._id;

    const managers = await Managermodel.find({ organisation_id })
      .select(EXCLUDE)
      .lean();

    res.status(200).json({
      success: true,
      organisation_id,
      count: managers.length,
      managers,
    });
  } catch (error) {
    next(error);
  }
};

const getallemployee = async (req, res, next) => {
  try {
    if (!req.superAdmin) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      );
    }

    const organisation_id = req.superAdmin._id;

    const [admins, managers, users] = await Promise.all([
      AdminModel.find({ organisation_id, working_status: "working" })
        .select(
          "uid f_name l_name work_email role department designation office_location organisation_id",
        )
        .lean(),

      Managermodel.find({ organisation_id, working_status: "working" })
        .select(
          "uid f_name l_name work_email role department designation office_location organisation_id gender personal_contact",
        )
        .lean(),

      Usermodel.find({ organisation_id, working_status: "working" })
        .select(
          "uid f_name l_name work_email role department designation office_location organisation_id Under_manager",
        )
        .populate({
          path: "Under_manager",
          select: "uid f_name l_name work_email role",
        })
        .lean(),
    ]);

    const all = [
      ...admins.map((a) => ({ type: "admin", ...a })),
      ...managers.map((m) => ({ type: "manager", ...m })),
      ...users.map((u) => ({ type: "employee", ...u })),
    ];

    return res.status(200).json({
      success: true,
      organisation_id,
      admins: admins.length,
      managers: managers.length,
      employees: users.length,
      count: all.length,
      users: all,
    });
  } catch (error) {
    next(error);
  }
};

const editemployee = async (req, res, next) => {
  const { uid } = req.params;
  const organisation_id = req.superAdmin._id;

  const updateData = {
    f_name: req.body.f_name,
    l_name: req.body.l_name,
    work_email: req.body.work_email,
    gender: req.body.gender,
    marital_status: req.body.marital_status,
    personal_contact: req.body.personal_contact,
    e_contact: req.body.e_contact,
    role: req.body.role,
    office_location: req.body.office_location,
    designation: req.body.designation,
    department: req.body.department,
    Under_manager: req.body.Under_manager,
  };

  const user = await Usermodel.findOneAndUpdate(
    { _id: uid, organisation_id },
    updateData,
    { new: true, runValidators: true },
  );
  if (!user)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );

  let manager = null;
  if (updateData.role === "manager") {
    manager = await Managermodel.findOneAndUpdate(
      { _id: uid, organisation_id },
      updateData,
      { new: true, upsert: true },
    );
  }

  res.status(200).json({
    success: true,
    message: "Employee updated successfully",
    user,
    manager,
  });
};

const getperticularemployee = async (req, res, next) => {
  const { uid } = req.params;
  const organisation_id = req.superAdmin._id;

  const [user, leaveBalance, reviews] = await Promise.all([
    Usermodel.findOne({ _id: uid, organisation_id })
      .populate({
        path: "Under_manager",
        select: "uid f_name l_name work_email role",
      })
      .select(EXCLUDE)
      .lean(),
    leavebalanceModel.findOne({ employee: uid, organisation_id }).lean(),
    reviewModel
      .find({ reviewee: uid, organisation_id })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      .lean(),
  ]);

  if (!user)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );
  if (!leaveBalance)
    return next(
      Object.assign(new Error("Leave balance not found"), { statusCode: 404 }),
    );

  const manager = await Managermodel.findOne({
    _id: user._id,
    organisation_id,
  })
    .select(EXCLUDE)
    .lean();

  res.status(200).json({
    success: true,
    user,
    manager: manager || null,
    leaveBalance,
    reviews: reviews || [],
  });
};

const getperticularemanager = async (req, res, next) => {
  const { uid } = req.params;
  const organisation_id = req.superAdmin._id;

  const [manager, leaveBalance, reviews] = await Promise.all([
    Managermodel.findOne({ _id: uid, organisation_id }).select(EXCLUDE).lean(),
    leavebalanceModel.findOne({ employee: uid, organisation_id }).lean(),
    reviewModel
      .find({ reviewee: uid, organisation_id })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      .lean(),
  ]);

  if (!manager)
    return next(
      Object.assign(new Error("Manager not found"), { statusCode: 404 }),
    );
  if (!leaveBalance)
    return next(
      Object.assign(new Error("Leave balance not found"), { statusCode: 404 }),
    );

  res.status(200).json({
    success: true,
    manager,
    leaveBalance,
    reviews: reviews || [],
  });
};

const deleteemployee = async (req, res, next) => {
  const { uid } = req.params;
  const organisation_id = req.superAdmin._id;

  const [user, manager] = await Promise.all([
    Usermodel.findOneAndDelete({ _id: uid, organisation_id }),
    Managermodel.findOneAndDelete({ _id: uid, organisation_id }),
  ]);

  if (!user && !manager)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );

  const deleted = user || manager;
  if (deleted.working_status === "working") {
    await decrementActiveUserCount(organisation_id);
  }

  res.status(200).json({ message: "User deleted successfully" });
};

const showallleaves = async (req, res, next) => {
  const organisation_id = req.superAdmin._id;
 
  const [employeeLeaves, managerLeaves, adminLeaves] = await Promise.all([
    Leave.find({ organisation_id })
      .populate("employee", "f_name l_name work_email")
      .populate("manager", "f_name l_name work_email")
      .sort({ createdAt: -1 })
      .lean(),
 
    ManagerLeave.find({ organisation_id })
      .populate("manager", "f_name l_name work_email designation")
      .sort({ createdAt: -1 })
      .lean(),
 
    AdminLeave.find({ organisation_id })
      .populate("admin", "f_name l_name work_email designation")
      .sort({ createdAt: -1 })
      .lean(),
  ]);
 
  res.status(200).json({
    employeeLeaves: { count: employeeLeaves.length, leaves: employeeLeaves },
    managerLeaves:  { count: managerLeaves.length,  leaves: managerLeaves  },
    adminLeaves:    { count: adminLeaves.length,     leaves: adminLeaves    },
  });
};

 
const acceptleavebyadmin = async (req, res, next) => {
  const { id } = req.params;
  const organisation_id = req.superAdmin._id;
 
  const leave = await AdminLeave.findOne({ _id: id, organisation_id });
  if (!leave)
    return next(Object.assign(new Error("Leave not found"), { statusCode: 404 }));
 
  if (leave.status.startsWith("approved") || leave.status.startsWith("rejected"))
    return next(Object.assign(new Error("Leave already processed"), { statusCode: 400 }));
 
  const leaveBalance = await LeaveBalance.findOne({ employee: leave.admin, organisation_id });
  if (!leaveBalance)
    return next(Object.assign(new Error("Admin leave balance not found"), { statusCode: 404 }));
 
  if (leave.leaveType === "ml") {
    const start = new Date(leave.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 181);
    leaveBalance.mlStartDate = start;
    leaveBalance.mlEndDate = end;
    await leaveBalance.save();
  }
 
  await processLeaveDeduction(leave);
 
  leave.status = "approved_superadmin";
  leave.approvedBy = req.superAdmin._id;
  leave.approvedAt = new Date();
  await leave.save();
 
  res.status(200).json({ message: "Leave approved", leave });
};

const rejectleavebyadmin = async (req, res, next) => {
  const { id } = req.params;
  const organisation_id = req.superAdmin._id;
 
  const leave = await AdminLeave.findOne({ _id: id, organisation_id });
  if (!leave)
    return next(Object.assign(new Error("Leave not found"), { statusCode: 404 }));
 
  if (leave.status.startsWith("approved") || leave.status.startsWith("rejected"))
    return next(Object.assign(new Error("Leave already processed"), { statusCode: 400 }));
 
  leave.status = "rejected_superadmin";
  leave.rejectedBy = req.superAdmin._id;
  leave.rejectedAt = new Date();
  leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await leave.save();
 
  res.status(200).json({ message: "Leave rejected successfully", leave });
};

const noofemployee = async (req, res, next) => {
  try {
    if (!req.superAdmin) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      );
    }

    const orgDoc = await uidmodel
      .findOne(
        { organisation_id: req.superAdmin._id },
        { departments: 1, _id: 0 },
      )
      .lean();

    if (!orgDoc) {
      return res.status(200).json({ departments: {}, totalEmployees: 0 });
    }

    const departmentList = Object.entries(orgDoc.departments).map(
      ([name, data]) => ({
        department: name,
        lastNumber: data.lastNumber,
      }),
    );

    const total = departmentList.reduce((sum, dep) => sum + dep.lastNumber, 0);

    res.status(200).json({
      success: true,
      departments: departmentList,
      totalEmployees: total,
    });
  } catch (error) {
    next(error);
  }
};

const createannouncement = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      );

    const { title, message, audience, priority, notice_image, expiresAt } =
      req.body;

    if (!title || !message)
      return next(
        Object.assign(new Error("Title and message are required"), {
          statusCode: 400,
        }),
      );

    const announcement = await announcementmodel.create({
      organisation_id: req.superAdmin._id,
      title,
      message,
      audience,
      priority,
      notice_image,
      expiresAt,
      createdBy: req.superAdmin._id,
      createdByModel: "SuperAdmin",
    });

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    next(error);
  }
};

const getallannouncement = async (req, res, next) => {
  const organisation_id = req.superAdmin._id;

  const announcements = await announcementmodel
    .find({ organisation_id })
    .lean();

  res
    .status(200)
    .json({ success: true, count: announcements.length, announcements });
};

const updateAnnouncement = async (req, res, next) => {
  const { id } = req.params;
  const organisation_id = req.superAdmin._id;

  const announcement = await announcementmodel
    .findOne({ _id: id, organisation_id })
    .select("createdBy")
    .lean();
  if (!announcement)
    return next(
      Object.assign(new Error("Announcement not found"), { statusCode: 404 }),
    );
  if (announcement.createdBy.toString() !== req.superAdmin._id.toString())
    return next(
      Object.assign(
        new Error("You are not allowed to edit this announcement"),
        { statusCode: 403 },
      ),
    );

  const { title, message, audience, priority, notice_image, expiresAt } =
    req.body;
  const $set = {};
  if (title) $set.title = title;
  if (message) $set.message = message;
  if (audience) $set.audience = audience;
  if (priority) $set.priority = priority;
  if (notice_image !== undefined) $set.notice_image = notice_image;
  if (expiresAt) $set.expiresAt = expiresAt;

  const updated = await announcementmodel
    .findByIdAndUpdate(id, { $set }, { new: true })
    .lean();

  res.status(200).json({
    success: true,
    message: "Announcement updated successfully",
    announcement: updated,
  });
};

const deleteAnnouncement = async (req, res, next) => {
  const { id } = req.params;
  const organisation_id = req.superAdmin._id;

  const announcement = await announcementmodel
    .findOne({ _id: id, organisation_id })
    .select("createdBy")
    .lean();
  if (!announcement)
    return next(
      Object.assign(new Error("Announcement not found"), { statusCode: 404 }),
    );
  if (announcement.createdBy.toString() !== req.superAdmin._id.toString())
    return next(
      Object.assign(
        new Error("You are not allowed to delete this announcement"),
        { statusCode: 403 },
      ),
    );

  await announcementmodel.findByIdAndDelete(id);
  res
    .status(200)
    .json({ success: true, message: "Announcement deleted successfully" });
};

const reviewtoadmin = async (req, res, next) => {
  const { adminid, rating, comment } = req.body;
  const organisation_id = req.superAdmin._id;

  if (!adminid || !rating || !comment)
    return next(
      Object.assign(new Error("adminid, rating and comment are required"), {
        statusCode: 400,
      }),
    );

  const admin = await AdminModel.findOne({
    _id: adminid,
    organisation_id,
  })
    .select("role")
    .lean();
  if (!admin)
    return next(
      Object.assign(
        new Error("Admin not found or does not belong to your organisation"),
        { statusCode: 404 },
      ),
    );

  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const existingreview = await Review.findOne({
    organisation_id,
    reviewer: req.superAdmin._id,
    reviewee: adminid,
    monthYear,
  })
    .select("_id")
    .lean();
  if (existingreview)
    return next(
      Object.assign(
        new Error("You have already reviewed this admin this month."),
        { statusCode: 400 },
      ),
    );

  const review = await Review.create({
    organisation_id,
    reviewerRole: "super_admin",
    reviewer: req.superAdmin._id,
    reviewerRoleModel: "SuperAdmin",
    revieweeRole: "admin",
    reviewee: adminid,
    revieweeRoleModel: "Admin",
    rating,
    comment,
    monthYear,
  });

  res.status(201).json({
    success: true,
    message: "Review submitted successfully",
    review,
  });
};

const getTodayCheckins = async (req, res, next) => {
  const organisation_id = req.superAdmin._id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkins = await Attendance.find({
    organisation_id,
    date: today,
    checkIn: { $exists: true },
    latitude: { $exists: true, $ne: null },
    longitude: { $exists: true, $ne: null },
  })
    .populate("employee", "f_name l_name work_email department designation")
    .select("employee role latitude longitude checkIn checkOut")
    .lean();

  const payload = checkins.map((c) => ({
    id: c._id,
    name:
      [c.employee?.f_name, c.employee?.l_name].filter(Boolean).join(" ") ||
      "Unknown",
    email: c.employee?.work_email || "",
    dept: c.employee?.department || c.employee?.designation || "",
    role: c.role,
    lat: c.latitude,
    lng: c.longitude,
    checkIn: c.checkIn,
    checkedOut: !!c.checkOut,
  }));

  res.json({ checkins: payload, total: payload.length });
};

// ─── Helper: recursively build manager hierarchy ──────────────────────────────
const buildManagerTree = (managers, parentId, parentModel, employees) => {
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
      employees: employees
        .filter((emp) => emp.Under_manager?.toString() === mgr._id.toString())
        .map((emp) => ({
          id: emp._id,
          name: `${emp.f_name} ${emp.l_name}`,
          email: emp.work_email,
          designation: emp.designation,
          department: emp.department,
          office_location: emp.office_location,
        })),
      subManagers: buildManagerTree(managers, mgr._id, "Manager", employees),
    }));
};

function buildManagerNode(manager, allManagers, allEmployees) {
  const directReports = allManagers.filter(
    (m) =>
      m.reporting_manager &&
      m.reporting_manager.toString() === manager._id.toString() &&
      m.reporting_manager_model === "Manager"
  );

  const directEmployees = allEmployees.filter(
    (emp) =>
      emp.Under_manager &&
      emp.Under_manager.toString() === manager._id.toString()
  );

  return {
    id: manager._id,
    name: `${manager.f_name} ${manager.l_name}`,
    email: manager.work_email,
    designation: manager.designation,
    department: manager.department,
    office_location: manager.office_location,
    role: manager.role,
    reportsTo: manager.reporting_manager_model,
    employees: directEmployees.map((emp) => ({
      id: emp._id,
      name: `${emp.f_name} ${emp.l_name}`,
      email: emp.work_email,
      designation: emp.designation,
      department: emp.department,
      office_location: emp.office_location,
    })),
    subManagers: directReports.map((sub) =>
      buildManagerNode(sub, allManagers, allEmployees)
    ),
    employeeCount: directEmployees.length,
    teamSize: 0,
  };
}

function countTeamSize(node) {
  let count = node.employees.length;
  for (const sub of node.subManagers) {
    count += countTeamSize(sub) + 1;
  }
  node.teamSize = count;
  return count;
}

const getOrgInfo = async (req, res, next) => {
  try {
    if (!req.superAdmin) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const superAdmin = await SuperAdminModel.findById(req.superAdmin._id)
      .select("f_name l_name email organisation_name profile_image")
      .lean();

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const organisation_id = superAdmin._id;

    const [admins, managers, employees] = await Promise.all([
      AdminModel.find({ organisation_id })
        .select(
          "f_name l_name work_email designation department office_location role reporting_manager reporting_manager_model"
        )
        .lean(),
      Managermodel.find({ organisation_id })
        .select(
          "f_name l_name work_email designation department office_location role reporting_manager reporting_manager_model"
        )
        .lean(),
      Usermodel.find({ organisation_id })
        .select(
          "f_name l_name work_email designation department office_location Under_manager"
        )
        .lean(),
    ]);

    const unassignedEmployees = employees.filter((emp) => !emp.Under_manager);

    const adminTree = admins.map((admin) => {
      const directManagers = managers.filter(
        (mgr) =>
          mgr.reporting_manager &&
          mgr.reporting_manager.toString() === admin._id.toString() &&
          mgr.reporting_manager_model === "Admin"
      );

      const node = {
        id: admin._id,
        name: `${admin.f_name} ${admin.l_name}`,
        email: admin.work_email,
        designation: admin.designation,
        department: admin.department,
        office_location: admin.office_location,
        role: admin.role,
        managers: directManagers.map((mgr) =>
          buildManagerNode(mgr, managers, employees)
        ),
        teamSize: 0,
      };

      let total = node.managers.length;
      for (const mgr of node.managers) {
        total += countTeamSize(mgr);
      }
      node.teamSize = total;

      return node;
    });

    const orphanManagers = managers.filter((mgr) => {
      if (!mgr.reporting_manager) return true;
      if (mgr.reporting_manager_model === "Admin") {
        const parentExists = admins.some(
          (a) => a._id.toString() === mgr.reporting_manager.toString()
        );
        return !parentExists;
      }
      if (mgr.reporting_manager_model === "Manager") {
        const parentExists = managers.some(
          (m) => m._id.toString() === mgr.reporting_manager.toString()
        );
        return !parentExists;
      }
      return false;
    });

    const orphanManagerTree = orphanManagers.map((mgr) =>
      buildManagerNode(mgr, managers, employees)
    );

    return res.status(200).json({
      success: true,

      organisation_id,
      organisation_name: superAdmin.organisation_name,
      organisation_logo: superAdmin.profile_image || null,

      super_admin: {
        id: superAdmin._id,
        name: `${superAdmin.f_name} ${superAdmin.l_name}`,
        email: superAdmin.email,
      },

      totals: {
        admins: admins.length,
        managers: managers.length,
        employees: employees.length,
      },

      admins: adminTree,

      unassignedManagers: orphanManagerTree,
      unassignedEmployees: unassignedEmployees.map((emp) => ({
        id: emp._id,
        name: `${emp.f_name} ${emp.l_name}`,
        email: emp.work_email,
        designation: emp.designation,
        department: emp.department,
        office_location: emp.office_location,
      })),
    });
  } catch (error) {
    next(error);
  }
};



const getAllPersonalDocumentsSuperAdmin = async (req, res, next) => {
  if (!req.superAdmin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.superAdmin._id;

  const documents = await Document.find({ organisation_id, fileType: "personal" })
    .populate("uploader", "f_name l_name work_email personal_contact department designation")
    .sort({ uploadedAt: -1 })
    .lean();

  Document.updateMany(
    { organisation_id, fileType: "personal", viewedBySuperAdmin: false },
    { $set: { viewedBySuperAdmin: true } },
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
      viewedBySuperAdmin: doc.viewedBySuperAdmin,
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

const getAllExpenseDocumentsSuperAdmin = async (req, res, next) => {
  if (!req.superAdmin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.superAdmin._id;

  const documents = await Document.find({ organisation_id, fileType: "expense" })
    .populate("uploader", "f_name l_name work_email personal_contact department designation")
    .sort({ uploadedAt: -1 })
    .lean();

  Document.updateMany(
    { organisation_id, fileType: "expense", viewedBySuperAdmin: false },
    { $set: { viewedBySuperAdmin: true } },
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
      viewedBySuperAdmin: doc.viewedBySuperAdmin,
      uploaderModel: doc.uploaderModel,
      uploader: doc.uploader
        ? {
            id: doc.uploader._id,
            name: `${doc.uploader.f_name} ${doc.uploader.l_name}`,
            email: doc.uploader.work_email,
            contact: doc.uploader.personal_contact,
            department: doc.uploader.department,
            designation: doc.uploader.designation,
            role: doc.uploader.role,
          }
        : null,
    })),
  });
};

const getDocumentDetailsSuperAdmin = async (req, res, next) => {
  if (!req.superAdmin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { id } = req.params;
  const organisation_id = req.superAdmin._id;

  if (!id)
    return next(Object.assign(new Error("Document ID is required"), { statusCode: 400 }));

  const document = await Document.findOne({ _id: id, organisation_id })
    .populate("uploader", "f_name l_name work_email personal_contact department designation");
    
  if (!document)
    return next(Object.assign(new Error("Document not found"), { statusCode: 404 }));
  
  document.viewedBySuperAdmin = true;
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
      viewedBySuperAdmin: document.viewedBySuperAdmin,
      uploaderModel: document.uploaderModel,
      uploader: document.uploader
        ? {
            id: document.uploader._id,
            name: `${document.uploader.f_name} ${document.uploader.l_name}`,
            email: document.uploader.work_email,
            department: document.uploader.department,
            designation: document.uploader.designation,
            role: document.uploader.role,
          }
        : null,
    },
  });
};

const updatePermissions = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id: user_id } = req.params;
    const organisation_id = req.superAdmin._id;
    const { user_model, announcements, documents, tickets, recruitment } = req.body;

    if (!user_model)
      return next(Object.assign(new Error("user_model is required"), { statusCode: 400 }));

    if (!["Admin", "Manager", "User"].includes(user_model))
      return next(Object.assign(new Error("user_model must be Admin, Manager, or User"), { statusCode: 400 }));

    if (!announcements && !documents && !tickets && !recruitment)
      return next(Object.assign(new Error("At least one permission group is required"), { statusCode: 400 }));

    const existing = await PermissionModel.findOne({ user_id, user_model, organisation_id });
    if (!existing)
      return next(Object.assign(new Error("Permission record not found for this user"), { statusCode: 404 }));

    const $set = {
      granted_by: req.superAdmin._id,
      granted_by_model: "SuperAdmin",
    };

    if (announcements) {
      if (announcements.can_view_announcements !== undefined) $set["announcements.can_view_announcements"] = announcements.can_view_announcements;
      if (announcements.can_create_announcement !== undefined) $set["announcements.can_create_announcement"] = announcements.can_create_announcement;
      if (announcements.can_edit_announcement !== undefined) $set["announcements.can_edit_announcement"] = announcements.can_edit_announcement;
      if (announcements.can_delete_announcement !== undefined) $set["announcements.can_delete_announcement"] = announcements.can_delete_announcement;
    }

    if (documents) {
      if (documents.can_upload_documents !== undefined) $set["documents.can_upload_documents"] = documents.can_upload_documents;
      if (documents.can_view_all_documents !== undefined) $set["documents.can_view_all_documents"] = documents.can_view_all_documents;
    }

    if (tickets) {
      if (tickets.can_raise_ticket !== undefined) $set["tickets.can_raise_ticket"] = tickets.can_raise_ticket;
      if (tickets.can_view_all_tickets !== undefined) $set["tickets.can_view_all_tickets"] = tickets.can_view_all_tickets;
      if (tickets.can_resolve_ticket !== undefined) $set["tickets.can_resolve_ticket"] = tickets.can_resolve_ticket;
      if (tickets.can_rate_ticket !== undefined) $set["tickets.can_rate_ticket"] = tickets.can_rate_ticket;
    }

    if (recruitment) {
      if (recruitment.can_view_hiring_requisitions !== undefined) $set["recruitment.can_view_hiring_requisitions"] = recruitment.can_view_hiring_requisitions;
      if (recruitment.can_create_hiring_requisition !== undefined) $set["recruitment.can_create_hiring_requisition"] = recruitment.can_create_hiring_requisition;
      if (recruitment.can_view_candidates !== undefined) $set["recruitment.can_view_candidates"] = recruitment.can_view_candidates;
      if (recruitment.can_add_candidate !== undefined) $set["recruitment.can_add_candidate"] = recruitment.can_add_candidate;
    }

    const updated = await PermissionModel.findOneAndUpdate(
      { user_id, user_model, organisation_id },
      { $set },
      { new: true, runValidators: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Permissions updated successfully",
      permissions: updated,
    });
  } catch (error) {
    next(error);
  }
};

const getPermissions = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id: user_id } = req.params;
    const { user_model } = req.query;
    const organisation_id = req.superAdmin._id;

    if (!user_model || !["Admin", "Manager", "User"].includes(user_model))
      return next(Object.assign(new Error("user_model query param must be Admin, Manager, or User"), { statusCode: 400 }));

    const permissions = await PermissionModel.findOne({ user_id, user_model, organisation_id }).lean();
    if (!permissions)
      return next(Object.assign(new Error("Permission record not found for this user"), { statusCode: 404 }));

    return res.status(200).json({ success: true, permissions });
  } catch (error) {
    next(error);
  }
};

const setAdminWorkingStatus = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const { id } = req.params;
    const { working_status } = req.body;
    const organisation_id = req.superAdmin._id;

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

    const existingAdmin = await AdminModel.findOne({ _id: id, organisation_id })
      .select("working_status")
      .lean();

    if (!existingAdmin)
      return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

    const wasWorking = existingAdmin.working_status === "working";
    const willBeWorking = working_status === "working";

    const admin = await AdminModel.findOneAndUpdate(
      { _id: id, organisation_id },
      {
        $set: {
          working_status,
          ...(working_status !== "working" && { status: "inactive" }),
          ...(working_status === "working" && { status: "active" }),
        },
      },
      { new: true, runValidators: true }
    )
      .select("_id uid f_name l_name work_email role department designation working_status status")
      .lean();

    if (!admin)
      return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

    // Only touch the counter when the transition actually crosses the
    // working <-> not-working boundary. e.g. resigned -> fired must NOT
    // decrement again since the admin was already excluded from the count.
    if (wasWorking && !willBeWorking) {
      await decrementActiveUserCount(organisation_id);
    } else if (!wasWorking && willBeWorking) {
      await incrementActiveUserCount(organisation_id);
    }

    // ── Asset return check ──────────────────────────────────────────────────
    let asset_return_check = null;
    if (working_status !== "working") {
      const pendingAssets = await AssetModel.find({
        organisation_id,
        assigned_to: id,
        assigned_to_model: "Admin",
        status: "assigned",
      })
        .select("_id asset_id asset_name asset_type serial_number brand assigned_date")
        .lean();

      asset_return_check = {
        has_pending_assets: pendingAssets.length > 0,
        pending_asset_count: pendingAssets.length,
        assets: pendingAssets,
        message:
          pendingAssets.length > 0
            ? `⚠️ Warning: ${pendingAssets.length} asset(s) are still assigned to this admin and must be returned before offboarding.`
            : "✅ No pending assets. All clear.",
      };
    }

    return res.status(200).json({
      success: true,
      message: `Admin working status updated to '${working_status}' successfully`,
      admin,
      ...(asset_return_check && { asset_return_check }),
    });
  } catch (error) {
    next(error);
  }
};

const getInactiveUsers = async (req, res, next) => {
  try {
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.superAdmin._id;
    const inactiveStatuses = ["resigned", "fired", "terminated"];

    const [admins, managers, employees] = await Promise.all([
      AdminModel.find({ organisation_id, working_status: { $in: inactiveStatuses } })
        .select("uid f_name l_name work_email role department designation working_status status")
        .lean(),
      Managermodel.find({ organisation_id, working_status: { $in: inactiveStatuses } })
        .select("uid f_name l_name work_email role department designation working_status status")
        .lean(),
      Usermodel.find({ organisation_id, working_status: { $in: inactiveStatuses } })
        .select("uid f_name l_name work_email role department designation working_status status")
        .lean(),
    ]);

    const all = [
      ...admins.map((a) => ({ type: "admin", ...a })),
      ...managers.map((m) => ({ type: "manager", ...m })),
      ...employees.map((e) => ({ type: "employee", ...e })),
    ];

    return res.status(200).json({
      success: true,
      count: all.length,
      admins: admins.length,
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
    if (!req.superAdmin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const superAdmin = await SuperAdminModel.findById(req.superAdmin._id)
      .select("active_user_count licenses is_trial_active trial_expires_at")
      .lean();

    if (!superAdmin)
      return next(Object.assign(new Error("Organisation not found"), { statusCode: 404 }));

    const license = superAdmin.licenses?.find(
      (l) =>
        l.product === "torchx_talent" &&
        l.isActive &&
        new Date(l.expiresAt) > new Date()
    );

    const trialActive =
      superAdmin.is_trial_active &&
      new Date() < new Date(superAdmin.trial_expires_at);

    const activeCount = superAdmin.active_user_count || 0;
    const allowedUsers = trialActive ? 4 : license?.users || 0;

    // false  → activeCount < allowedUsers  (can still add more)
    // true   → activeCount >= allowedUsers (limit reached, cannot add)
    const isLimitReached = allowedUsers > 0 ? activeCount >= allowedUsers : false;

    return res.status(200).json({
      success: true,
      active_user_count: activeCount,
      allowed_users: allowedUsers,
      remaining_slots: Math.max(0, allowedUsers - activeCount),  // bonus: useful on frontend
      is_limit_reached: isLimitReached,
      plan: trialActive ? "trial" : license?.plan || null,
      plan_type: license?.plan_type || null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerSuperAdmin,
  verifySuperAdmin,
  loginSuperAdmin,
  getMe,
  logoutSuperAdmin,
  updateSuperAdmin,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAllAdmins,
  addmanager,
  addemployee,
  findallmanagers,
  getallemployee,
  editemployee,
  getperticularemployee,
  getperticularemanager,
  deleteemployee,
  showallleaves,
  acceptleavebyadmin,
  rejectleavebyadmin,
  noofemployee,
  createannouncement,
  getallannouncement,
  updateAnnouncement,
  deleteAnnouncement,
  reviewtoadmin,
  getTodayCheckins,
  getOrgInfo,
  getAllPersonalDocumentsSuperAdmin,
  getAllExpenseDocumentsSuperAdmin,
  getDocumentDetailsSuperAdmin,
   updatePermissions,
  getPermissions,
  setAdminWorkingStatus,
  getInactiveUsers,
  getActiveUserCount
};