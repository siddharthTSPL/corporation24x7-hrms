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
const OtpModel = require("../Models/otpbasedlogin.model");

const EXCLUDE =
  "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt";

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
    console.log(process.env.BASE_URL);
    const verifyLink = `${process.env.BASE_URL}/superadmin/verify/${verifyToken}`;

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

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;
                 box-shadow:0 8px 32px rgba(115,0,66,0.10);max-width:100%;">

          <!-- Header Banner -->
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

          <!-- Body -->
          <tr>
            <td style="padding:40px;">

              <!-- Greeting -->
              <h2 style="margin:0 0 8px;color:#730042;font-size:20px;">
                Hello, ${f_name} ${l_name} 👋
              </h2>
              <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.7;">
                Your Super Admin account for
                <strong style="color:#730042;">${organisation_name}</strong>
                has been successfully created. You're just one step away from
                accessing the full platform.
              </p>

              <!-- Info Cards -->
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

              <!-- CTA Button -->
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

              <!-- Fallback link -->
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

              <!-- Warning -->
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

          <!-- Footer -->
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
        <!-- /Card -->

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
      return next(
        Object.assign(new Error("Email and password are required"), {
          statusCode: 400,
        }),
      );

    const superAdmin = await SuperAdminModel.findOne({
      email: identifier.toLowerCase().trim(),
    });

    if (!superAdmin)
      return next(
        Object.assign(new Error("No account found with this email"), {
          statusCode: 404,
        }),
      );

    if (!superAdmin.isVerified)
      return next(
        Object.assign(new Error("Please verify your email before logging in"), {
          statusCode: 403,
        }),
      );

    if (superAdmin.status === "suspended")
      return next(
        Object.assign(
          new Error("Your account has been suspended. Contact support."),
          { statusCode: 403 },
        ),
      );

    // if (superAdmin.status === "inactive")
    //   return next(
    //     Object.assign(new Error("Your account is inactive"), { statusCode: 403 })
    //   );

    const isMatch = await superAdmin.isValidPassword(password);
    if (!isMatch)
      return next(
        Object.assign(new Error("Invalid credentials"), { statusCode: 401 }),
      );

    const token = jwt.sign(
      {
        superadminid: superAdmin._id,
        role: superAdmin.role,
        email: superAdmin.email,
        company_domain: superAdmin.company_domain,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15d" },
    );

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

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
        plan: superAdmin.plan,
        plan_expires_at: superAdmin.plan_expires_at,
        role: superAdmin.role,
      },
    });
  } catch (err) {
    next(Object.assign(err, { statusCode: err.statusCode || 500 }));
  }
};

const getMe = async (req, res, next) => {
  const superAdmin = req.superAdmin;
  res.status(200).json({
    success: true,
    superAdmin: {
      id: superAdmin._id,
      f_name: superAdmin.f_name,
      l_name: superAdmin.l_name,
      email: superAdmin.email,
      phone: superAdmin.phone,
      profile_image: superAdmin.profile_image,
      organisation_name: superAdmin.organisation_name,
      company_domain: superAdmin.company_domain,
      company_address: superAdmin.company_address,
      company_size: superAdmin.company_size,
      industry: superAdmin.industry,
      plan: superAdmin.plan,
      plan_started_at: superAdmin.plan_started_at,
      plan_expires_at: superAdmin.plan_expires_at,
      role: superAdmin.role,
      status: superAdmin.status,
      isFirstLogin: superAdmin.isFirstLogin,
      last_login: superAdmin.last_login,
      createdAt: superAdmin.createdAt,
    },
  });
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
    return next(
      Object.assign(new Error("Email and OTP are required"), {
        statusCode: 400,
      }),
    );
  const otpRecord = await OtpModel.findOne({ email });
  if (!otpRecord)
    return next(
      Object.assign(new Error("OTP not found. Please request a new one"), {
        statusCode: 404,
      }),
    );
  if (otpRecord.isExpired()) {
    await OtpModel.deleteOne({ email });
    return next(
      Object.assign(new Error("OTP has expired. Please request a new one"), {
        statusCode: 400,
      }),
    );
  }
  if (!otpRecord.compareOtp(String(otp)))
    return next(Object.assign(new Error("Invalid OTP"), { statusCode: 400 }));
  const superAdmin = await SuperAdminModel.findOne({ email })
    .select("_id email")
    .lean();
  if (!superAdmin)
    return next(
      Object.assign(new Error("Account not found"), { statusCode: 404 }),
    );
  const resetToken = jwt.sign(
    { superadminid: superAdmin._id, email: superAdmin.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
  await OtpModel.deleteOne({ email });
  res
    .status(200)
    .json({ success: true, message: "OTP verified successfully", resetToken });
};

const resetPassword = async (req, res, next) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword)
    return next(
      Object.assign(new Error("Reset token and new password are required"), {
        statusCode: 400,
      }),
    );
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      Object.assign(new Error("Invalid or expired reset token"), {
        statusCode: 400,
      }),
    );
  }
  const superAdmin = await SuperAdminModel.findById(decoded.superadminid);
  if (!superAdmin)
    return next(
      Object.assign(new Error("Account not found"), { statusCode: 404 }),
    );
  superAdmin.password = newPassword;
  await superAdmin.save();
  res.status(200).json({
    success: true,
    message: "Password reset successfully. You can now login.",
  });
};

const createAdmin = async (req, res, next) => {
  try {
    const { f_name, l_name, work_email, password, gender, designation, phone } =
      req.body;

    if (
      !f_name ||
      !l_name ||
      !work_email ||
      !password ||
      !gender ||
      !designation
    ) {
      return next(
        Object.assign(
          new Error(
            "f_name, l_name, work_email, password, gender and designation are required",
          ),
          { statusCode: 400 },
        ),
      );
    }

    const email = work_email.toLowerCase().trim();

    const existing = await AdminModel.findOne({
      work_email: email,
    })
      .select("_id")
      .lean();

    if (existing) {
      return next(
        Object.assign(new Error("An admin with this email already exists"), {
          statusCode: 400,
        }),
      );
    }

    const admin = await AdminModel.create({
      f_name,
      l_name,
      work_email: email,
      password,
      gender,
      designation,
      phone,
      created_by: req.superAdmin._id,
    });

    await assignDefaultLeave({
      ...admin.toObject(),
      role: "admin",
    });

    const verifyToken = jwt.sign(
      { adminid: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const verifyLink = `${process.env.BASE_URL}/admin/verify/${verifyToken}`;

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
style="background:#ffffff;border-radius:14px;overflow:hidden;
box-shadow:0 10px 30px rgba(0,0,0,0.08);">

<tr>
<td
style="background:linear-gradient(135deg,#730042,#CD166E);
padding:35px;
text-align:center;
color:#ffffff;"
>
<h1 style="margin:0;font-size:28px;">
Welcome to HRMS Platform
</h1>

<p style="margin-top:10px;font-size:15px;opacity:0.9;">
Your admin account has been successfully created
</p>
</td>
</tr>

<tr>
<td style="padding:40px;color:#333333;">

<h2 style="margin-top:0;color:#730042;">
Hello ${f_name} ${l_name},
</h2>

<p style="font-size:15px;line-height:1.8;color:#555;">
Your admin account is now ready.
Please verify your email address to activate your account
and access the HRMS dashboard.
</p>

<table width="100%" cellpadding="0" cellspacing="0"
style="margin:30px 0;background:#F9F8F2;border-radius:10px;padding:20px;">

<tr>
<td style="padding:8px 0;">
<strong>Role:</strong> Admin
</td>
</tr>

<tr>
<td style="padding:8px 0;">
<strong>Designation:</strong> ${designation}
</td>
</tr>

<tr>
<td style="padding:8px 0;">
<strong>Email:</strong> ${email}
</td>
</tr>

<tr>
<td style="padding:8px 0;">
<strong>Default Leave Balance:</strong> Assigned Successfully
</td>
</tr>

</table>

<div style="text-align:center;margin:40px 0;">

<a
href="${verifyLink}"
style="
background:#CD166E;
color:#ffffff;
padding:15px 35px;
text-decoration:none;
border-radius:8px;
font-size:16px;
font-weight:600;
display:inline-block;
"
>
Verify & Activate Account
</a>

</div>

<p style="font-size:14px;color:#666;line-height:1.7;">
This verification link will expire in
<strong>1 hour</strong>.
</p>

<p style="font-size:14px;color:#666;line-height:1.7;">
If the button above does not work,
copy and paste the following link into your browser:
</p>

<p
style="
word-break:break-all;
font-size:13px;
color:#CD166E;
background:#F9F8F2;
padding:12px;
border-radius:6px;
"
>
${verifyLink}
</p>

</td>
</tr>

<tr>
<td
style="
background:#F4F6F9;
padding:25px;
text-align:center;
font-size:12px;
color:#888888;
"
>
© 2026 HRMS Platform. All rights reserved.
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
      message: "Admin created successfully. Verification email sent.",
      admin: {
        id: admin._id,
        f_name: admin.f_name,
        l_name: admin.l_name,
        work_email: admin.work_email,
        designation: admin.designation,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateAdmin = async (req, res, next) => {
  const { id } = req.params;
  const admin = await AdminModel.findOne({
    _id: id,
    created_by: req.superAdmin._id,
  });
  if (!admin)
    return next(
      Object.assign(new Error("Admin not found"), { statusCode: 404 }),
    );
  [
    "f_name",
    "l_name",
    "phone",
    "gender",
    "designation",
    "profile_image",
  ].forEach((field) => {
    if (req.body[field] !== undefined) admin[field] = req.body[field];
  });
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
  const admin = await AdminModel.findOne({
    _id: id,
    created_by: req.superAdmin._id,
  });
  if (!admin)
    return next(
      Object.assign(new Error("Admin not found"), { statusCode: 404 }),
    );
  await AdminModel.findByIdAndDelete(id);
  res
    .status(200)
    .json({ success: true, message: "Admin deleted successfully" });
};

const getAllAdmins = async (req, res, next) => {
  const admins = await AdminModel.find({ created_by: req.superAdmin._id })
    .select("-password -__v")
    .lean();
  res.status(200).json({ success: true, count: admins.length, admins });
};

const addmanager = async (req, res, next) => {
  const {
    f_name,
    l_name,
    work_email,
    gender,
    marital_status,
    password,
    personal_contact,
    e_contact,
    role,
    office_location,
    designation,
    department,
  } = req.body;
  if (!f_name || !work_email || !password || !department)
    return next(
      Object.assign(new Error("Required fields missing"), { statusCode: 400 }),
    );
  const existingManager = await Managermodel.findOne({ work_email })
    .select("_id")
    .lean();
  if (existingManager)
    return next(
      Object.assign(new Error("Manager already exists"), { statusCode: 400 }),
    );
  const uid = await generateUID(department);
  const newmanager = await Managermodel.create({
    uid,
    department,
    f_name,
    l_name,
    work_email,
    gender,
    marital_status,
    password,
    personal_contact,
    e_contact,
    role,
    office_location,
    designation,
  });
  const token = jwt.sign(
    { managerid: newmanager._id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
  const verifyLink = `${process.env.BASE_URL}/manager/verify/${token}`;
  Promise.all([
    assignDefaultLeave(newmanager),
    sendEmail({
      to: work_email,
      subject: "Activate Your Manager Account",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1 style="margin:0;">Manager Onboarding</h1></td></tr><tr><td style="padding:40px;color:#333;"><h2 style="color:#730042;">Hi ${f_name},</h2><p>Your <strong>Manager Account</strong> has been successfully created.</p><div style="background:#F9F8F2;padding:15px;border-radius:8px;margin:20px 0;"><p style="margin:0;"><strong>Role:</strong> ${designation}</p><p style="margin:5px 0;"><strong>Department:</strong> ${department}</p><p style="margin:0;"><strong>Location:</strong> ${office_location}</p></div><div style="text-align:center;margin:30px 0;"><a href="${verifyLink}" style="background:#CD166E;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">Verify & Activate</a></div><p style="font-size:13px;color:#777;">Or copy: <span style="color:#CD166E;">${verifyLink}</span></p><p style="font-size:13px;color:#777;">Link expires in 1 hour.</p></td></tr><tr><td style="background:#F9F8F2;padding:20px;text-align:center;font-size:12px;color:#888;">© 2026 Your Company</td></tr></table></td></tr></table></body></html>`,
    }),
  ]);
  res.status(201).json({
    success: true,
    message: "Manager added successfully. Verification email sent.",
  });
};

const addemployee = async (req, res, next) => {
  const {
    f_name,
    l_name,
    work_email,
    password,
    gender,
    marital_status,
    personal_contact,
    e_contact,
    role,
    office_location,
    designation,
    department,
    Under_manager,
  } = req.body;
  if (!f_name || !work_email || !password || !department)
    return next(
      Object.assign(new Error("Required fields missing"), { statusCode: 400 }),
    );
  const existingUser = await Usermodel.findOne({ work_email })
    .select("_id")
    .lean();
  if (existingUser)
    return next(
      Object.assign(new Error("User already exists"), { statusCode: 400 }),
    );
  const uid = await generateUID(department);
  const newuser = await Usermodel.create({
    uid,
    f_name,
    l_name,
    work_email,
    gender,
    marital_status,
    password,
    personal_contact,
    e_contact,
    role,
    office_location,
    designation,
    department,
    Under_manager,
  });
  const token = jwt.sign({ userid: newuser._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const verifyLink = `${process.env.BASE_URL}/user/verify/${token}`;
  Promise.all([
    assignDefaultLeave(newuser),
    sendEmail({
      to: work_email,
      subject: "Welcome! Verify Your Employee Account",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1 style="margin:0;">Welcome Aboard</h1></td></tr><tr><td style="padding:40px;color:#333;"><h2 style="color:#730042;">Hello ${f_name},</h2><p>Your employee account has been successfully created.</p><div style="background:#F9F8F2;padding:15px;border-radius:8px;margin:20px 0;"><p style="margin:0;"><strong>Department:</strong> ${department}</p><p style="margin:5px 0;"><strong>Manager:</strong> ${Under_manager || "Assigned Soon"}</p><p style="margin:0;"><strong>Location:</strong> ${office_location}</p></div><div style="text-align:center;margin:30px 0;"><a href="${verifyLink}" style="background:#730042;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">Verify Account</a></div><p style="font-size:13px;color:#777;">Or copy: <span style="color:#CD166E;">${verifyLink}</span></p><p style="font-size:13px;color:#777;">Link valid for 1 hour only.</p></td></tr><tr><td style="background:#F9F8F2;padding:20px;text-align:center;font-size:12px;color:#888;">© 2026 Your Company</td></tr></table></td></tr></table></body></html>`,
    }),
  ]);
  res.status(201).json({
    success: true,
    message: "User added successfully. Verification email sent.",
  });
};

const findallmanagers = async (req, res, next) => {
  const managers = await Managermodel.find().select(EXCLUDE).lean();
  res.status(200).json({ managers });
};

const getallemployee = async (req, res, next) => {
  const [users, managers] = await Promise.all([
    Usermodel.find()
      .select(
        "uid f_name l_name work_email role department designation office_location Under_manager",
      )
      .populate({
        path: "Under_manager",
        select: "uid f_name l_name work_email role",
      })
      .lean(),
    Managermodel.find()
      .select(
        "uid f_name l_name work_email role designation office_location department gender personal_contact e_contact",
      )
      .lean(),
  ]);
  const all = [...users, ...managers];
  res.status(200).json({ count: all.length, users: all });
};

const editemployee = async (req, res, next) => {
  const { uid } = req.params;
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
  const user = await Usermodel.findByIdAndUpdate(uid, updateData, {
    new: true,
    runValidators: true,
  });
  if (!user)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );
  let manager = null;
  if (updateData.role === "manager")
    manager = await Managermodel.findOneAndUpdate({ userId: uid }, updateData, {
      new: true,
      upsert: true,
    });
  res.status(200).json({
    success: true,
    message: "Employee updated successfully",
    user,
    manager,
  });
};

const getperticularemployee = async (req, res, next) => {
  const { uid } = req.params;
  const [user, leaveBalance, reviews] = await Promise.all([
    Usermodel.findById(uid)
      .populate({
        path: "Under_manager",
        select: "uid f_name l_name work_email role",
      })
      .select(EXCLUDE)
      .lean(),
    leavebalanceModel.findOne({ employee: uid }).lean(),
    reviewModel
      .find({ reviewee: uid })
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
  const manager = await Managermodel.findOne({ userId: user._id })
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
  const [manager, leaveBalance, reviews] = await Promise.all([
    Managermodel.findById(uid).select(EXCLUDE).lean(),
    leavebalanceModel.findOne({ employee: uid }).lean(),
    reviewModel
      .find({ reviewee: uid })
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
  res
    .status(200)
    .json({ success: true, manager, leaveBalance, reviews: reviews || [] });
};

const deleteemployee = async (req, res, next) => {
  const { uid } = req.params;
  const [user, manager] = await Promise.all([
    Usermodel.findByIdAndDelete(uid),
    Managermodel.findByIdAndDelete(uid),
  ]);
  if (!user && !manager)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );
  res.status(200).json({ message: "User deleted successfully" });
};

const showallleaves = async (req, res, next) => {
  const adminIds = await AdminModel.find({
    created_by: req.superAdmin._id,
  }).distinct("_id");
  const [employeeLeaves, adminLeaves] = await Promise.all([
    Leave.find({
      status: {
        $in: [
          "forwarded_reporting_manager",
          "approved_reporting_manager",
          "rejected_reporting_manager",
        ],
      },
    })
      .populate("employee", "f_name l_name work_email")
      .populate("manager", "f_name l_name work_email")
      .sort({ createdAt: -1 })
      .lean(),
    ManagerLeave.find({
      manager: { $in: adminIds },
      status: "pending_reporting_manager",
    })
      .populate("manager", "f_name l_name work_email designation")
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  res.status(200).json({
    employeeLeaves: { count: employeeLeaves.length, leaves: employeeLeaves },
    adminLeaves: { count: adminLeaves.length, leaves: adminLeaves },
  });
};

const acceptleavebyadmin = async (req, res, next) => {
  const { id } = req.params;
  const { leaveFor } = req.query;
  const LeaveModel = leaveFor === "admin" ? ManagerLeave : Leave;
  const leave = await LeaveModel.findById(id);
  if (!leave)
    return next(
      Object.assign(new Error("Leave not found"), { statusCode: 404 }),
    );
  if (
    leave.status.startsWith("approved") ||
    leave.status.startsWith("rejected")
  )
    return next(
      Object.assign(new Error("Leave already processed"), { statusCode: 400 }),
    );
  if (leaveFor === "admin") {
    const adminIds = await AdminModel.find({
      created_by: req.superAdmin._id,
    }).distinct("_id");
    if (!adminIds.some((id) => id.toString() === leave.manager.toString()))
      return next(
        Object.assign(
          new Error("This leave does not belong to your organisation"),
          { statusCode: 403 },
        ),
      );
    leave.status = "approved_reporting_manager";
  } else {
    const leaveBalance = await LeaveBalance.findOne({
      employee: leave.employee,
    });
    if (!leaveBalance)
      return next(
        Object.assign(new Error("Leave balance not found"), {
          statusCode: 404,
        }),
      );
    if (leave.leaveType === "ml") {
      const start = new Date(leave.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 181);
      leaveBalance.mlStartDate = start;
      leaveBalance.mlEndDate = end;
      await leaveBalance.save();
    }
    await processLeaveDeduction(leave);
    leave.status = "approved_reporting_manager";
  }
  leave.approvedBy = req.superAdmin._id;
  await leave.save();
  res.status(200).json({ message: "Leave approved", leave });
};

const rejectleavebyadmin = async (req, res, next) => {
  const { id } = req.params;
  const { leaveFor } = req.query;
  const LeaveModel = leaveFor === "admin" ? ManagerLeave : Leave;
  const leave = await LeaveModel.findById(id);
  if (!leave)
    return next(
      Object.assign(new Error("Leave not found"), { statusCode: 404 }),
    );
  if (
    leave.status.startsWith("approved") ||
    leave.status.startsWith("rejected")
  )
    return next(
      Object.assign(new Error("Leave already processed"), { statusCode: 400 }),
    );
  if (leaveFor === "admin") {
    const adminIds = await AdminModel.find({
      created_by: req.superAdmin._id,
    }).distinct("_id");
    if (!adminIds.some((id) => id.toString() === leave.manager.toString()))
      return next(
        Object.assign(
          new Error("This leave does not belong to your organisation"),
          { statusCode: 403 },
        ),
      );
  }
  leave.status = "rejected_reporting_manager";
  leave.rejectedBy = req.superAdmin._id;
  leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await leave.save();
  res.status(200).json({ message: "Leave rejected successfully", leave });
};

const noofemployee = async (req, res, next) => {
  const departments = await uidmodel
    .find({}, { department: 1, lastNumber: 1, _id: 0 })
    .lean();
  const total = departments.reduce((sum, dep) => sum + dep.lastNumber, 0);
  res.status(200).json({ departments, totalEmployees: total });
};

const createannouncement = async (req, res, next) => {
  const { title, message, audience, priority, notice_image, expiresAt } =
    req.body;
  if (!title || !message)
    return next(
      Object.assign(new Error("Title and message are required"), {
        statusCode: 400,
      }),
    );
  const announcement = await announcementmodel.create({
    title,
    message,
    audience,
    priority,
    notice_image,
    expiresAt,
    createdBy: req.superAdmin._id,
  });
  res.status(201).json({
    success: true,
    message: "Announcement created successfully",
    announcement,
  });
};

const getallannouncement = async (req, res, next) => {
  const announcements = await announcementmodel.find().lean();
  res
    .status(200)
    .json({ success: true, count: announcements.length, announcements });
};

const updateAnnouncement = async (req, res, next) => {
  const { id } = req.params;
  const announcement = await announcementmodel
    .findById(id)
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
  const announcement = await announcementmodel
    .findById(id)
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
  if (!adminid || !rating || !comment)
    return next(
      Object.assign(new Error("adminid, rating and comment are required"), {
        statusCode: 400,
      }),
    );
  const admin = await AdminModel.findOne({
    _id: adminid,
    created_by: req.superAdmin._id,
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
  res
    .status(201)
    .json({ success: true, message: "Review submitted successfully", review });
};

const getTodayCheckins = async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkins = await Attendance.find({
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

const getOrgInfo = async (req, res, next) => {
  res.json({
    organisation_name: req.superAdmin.organisation_name,
    profile_image: req.superAdmin.profile_image,
  });
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
};
