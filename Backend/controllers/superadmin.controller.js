const SuperAdminModel = require("../Models/superadmin.model");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { sendEmail } = require("../utils/nodemailer.utils");

const registerSuperAdmin = async (req, res, next) => {
  const { f_name, l_name, email, password, organisation_name, phone, company_address, company_size, industry } = req.body;

  if (!f_name || !l_name || !email || !password || !organisation_name) {
    return next(Object.assign(new Error("f_name, l_name, email, password and organisation_name are required"), { statusCode: 400 }));
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
    { expiresIn: "1h" }
  );

  const verifyLink = `${process.env.BASE_URL}/superadmin/verify/${verifyToken}`;

  await sendEmail({
    to: email,
    subject: "Verify Your Super Admin Account",
    html: `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
    <body style="margin:0;padding:0;background:#F9F8F2;font-family:'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;">
                  <h1 style="margin:0;">Welcome to the Platform</h1>
                  <p style="margin-top:8px;font-size:14px;">Super Admin Account Verification</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;color:#333;">
                  <h2 style="color:#730042;">Hello ${f_name} ${l_name},</h2>
                  <p style="font-size:15px;line-height:1.6;color:#444;">
                    Your super admin account for <strong>${organisation_name}</strong> has been created.
                    Please verify your email to activate your account.
                  </p>
                  <div style="text-align:center;margin:30px 0;">
                    <a href="${verifyLink}" style="background:#CD166E;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">
                      Verify Email
                    </a>
                  </div>
                  <p style="font-size:14px;color:#666;">If the button doesn't work, copy this link:</p>
                  <p style="font-size:13px;word-break:break-all;color:#CD166E;">${verifyLink}</p>
                  <hr style="border:none;border-top:1px solid #eee;margin:30px 0;"/>
                  <p style="font-size:13px;color:#777;">This link expires in <strong>1 hour</strong>.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#F9F8F2;padding:20px;text-align:center;font-size:12px;color:#888;">
                  © 2026 HRMS Platform
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
};

const verifySuperAdmin = async (req, res, next) => {
  const { token } = req.params;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(Object.assign(new Error("Invalid or expired verification link"), { statusCode: 400 }));
  }

  const superAdmin = await SuperAdminModel.findById(decoded.superadminid);

  if (!superAdmin) {
    return next(Object.assign(new Error("Account not found"), { statusCode: 404 }));
  }

  if (superAdmin.isVerified) {
    return res.status(200).json({ message: "Email already verified. Please login." });
  }

  superAdmin.isVerified = true;
  await superAdmin.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully. You can now login.",
  });
};

const loginSuperAdmin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(Object.assign(new Error("Email and password are required"), { statusCode: 400 }));
  }

  const superAdmin = await SuperAdminModel.findOne({ email: email.toLowerCase().trim() });

  if (!superAdmin) {
    return next(Object.assign(new Error("No account found with this email"), { statusCode: 404 }));
  }

  if (!superAdmin.isVerified) {
    return next(Object.assign(new Error("Please verify your email before logging in"), { statusCode: 403 }));
  }

  if (superAdmin.status === "suspended") {
    return next(Object.assign(new Error("Your account has been suspended. Contact support."), { statusCode: 403 }));
  }

  if (superAdmin.status === "inactive") {
    return next(Object.assign(new Error("Your account is inactive"), { statusCode: 403 }));
  }

  const isMatch = await superAdmin.isValidPassword(password);

  if (!isMatch) {
    return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));
  }

  const token = jwt.sign(
    {
      superadminid: superAdmin._id,
      role: superAdmin.role,
      email: superAdmin.email,
      company_domain: superAdmin.company_domain,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15d" }
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
  const superAdmin = req.superAdmin;

  if (!superAdmin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  superAdmin.status = "inactive";
  await superAdmin.save();

  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

module.exports = {
  registerSuperAdmin,
  verifySuperAdmin,
  loginSuperAdmin,
  getMe,
  logoutSuperAdmin,
};