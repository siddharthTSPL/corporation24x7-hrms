const jwt = require("jsonwebtoken");
const SuperAdminModel = require("../Models/superadmin.model");
const AdminModel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const Usermodel = require("../Models/user.model");
const OtpModel = require("../Models/otpbasedlogin.model");
const generateOTP = require("../automatic/otpgenerator");
const { sendEmail } = require("../utils/nodemailer.utils");

const cookieOpts = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 15 * 24 * 60 * 60 * 1000,
  };
};

// Finds which account (super admin, admin, manager or employee) an email
// belongs to. Since every email is unique across all four roles, this is
// enough to auto-detect the role without asking the user to pick one.
const findAccountByEmail = async (email) => {
  const superAdmin = await SuperAdminModel.findOne({ email });
  if (superAdmin) return { accountType: "superadmin", account: superAdmin };

  const admin = await AdminModel.findOne({ work_email: email });
  if (admin) return { accountType: "admin", account: admin };

  const manager = await Managermodel.findOne({ work_email: email });
  if (manager) return { accountType: "manager", account: manager };

  const user = await Usermodel.findOne({ work_email: email });
  if (user) return { accountType: "employee", account: user };

  return null;
};

const buildLoginToken = async (role, account) => {
  if (account.working_status && account.working_status !== "working") {
    throw Object.assign(
      new Error(role === "employee" ? "Your account is not active. Please contact your admin." : "Your account is not active. Please contact super admin."),
      { statusCode: 403 }
    );
  }
  if (role === "superadmin") {
    // Mirror unifiedLogin: logout sets status to "inactive", so the OTP
    // path must reactivate the account too, or the very next authenticated
    // request (e.g. getme) gets rejected by the auth middleware.
    if (account.status !== "active") {
      account.status = "active";
      await account.save();
    }
    return jwt.sign(
      { superadminid: account._id, role: account.role, email: account.email, company_domain: account.company_domain },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
  }
  if (role === "admin") {
    const orgSuperAdmin = await SuperAdminModel.findById(account.organisation_id);
    if (!orgSuperAdmin)
      throw Object.assign(new Error("Organisation not found. Please contact support."), { statusCode: 404 });

    const trialValid = orgSuperAdmin.isTrialValid();
    const hasTalentLicense = orgSuperAdmin.licenses?.some(
      (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
    );
    if (!trialValid && !hasTalentLicense)
      throw Object.assign(
        new Error("Service stopped! Sorry for the inconvenience, please contact your administrator for further assistance."),
        { statusCode: 403, code: "SERVICE_STOPPED" }
      );

    if (account.status !== "active") {
      await AdminModel.findByIdAndUpdate(account._id, { status: "active" });
    }
    return jwt.sign(
      { adminid: account._id, role: account.role, email: account.work_email, created_by: account.created_by, organisation_id: account.organisation_id },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
  }
  if (role === "manager") {
    let organisationId = account.organisation_id;
    let orgSuperAdmin = await SuperAdminModel.findById(organisationId);
    if (!orgSuperAdmin) {
      const parentAdmin = await AdminModel.findById(organisationId).select("organisation_id").lean();
      if (parentAdmin?.organisation_id) {
        organisationId = parentAdmin.organisation_id;
        await Managermodel.findByIdAndUpdate(account._id, { organisation_id: organisationId });
        orgSuperAdmin = await SuperAdminModel.findById(organisationId);
      }
    }
    if (!orgSuperAdmin)
      throw Object.assign(new Error("Organisation not found. Please contact administrator."), { statusCode: 404 });

    const trialValid = orgSuperAdmin.isTrialValid();
    const hasTalentLicense = orgSuperAdmin.licenses?.some(
      (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
    );
    if (!trialValid && !hasTalentLicense)
      throw Object.assign(
        new Error("Service stopped! Please contact your administrator for further assistance."),
        { statusCode: 403, code: "SERVICE_STOPPED" }
      );

    await Managermodel.findByIdAndUpdate(account._id, { status: "active", organisation_id: organisationId });

    return jwt.sign(
      { managerid: account._id, work_email: account.work_email, role: account.role, organisation_id: organisationId },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
  }
  // employee
  {
    const orgSuperAdmin = await SuperAdminModel.findById(account.organisation_id);
    if (!orgSuperAdmin)
      throw Object.assign(new Error("Organisation not found. Please contact support."), { statusCode: 404 });

    const trialValid = orgSuperAdmin.isTrialValid();
    const hasTalentLicense = orgSuperAdmin.licenses?.some(
      (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
    );
    if (!trialValid && !hasTalentLicense)
      throw Object.assign(
        new Error("Service stopped! Sorry for the inconvenience, please contact your administrator for further assistance."),
        { statusCode: 403, code: "SERVICE_STOPPED" }
      );
  }
  Usermodel.findByIdAndUpdate(account._id, { status: "active", last_login: new Date() }).exec();
  return jwt.sign(
    {
      _id: account._id, id: account._id, userId: account._id,
      work_email: account.work_email, role: account.role,
      organisation_id: account.organisation_id,
      department: account.department ?? null,
      designation: account.designation ?? null,
      Under_manager: account.Under_manager ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15d" }
  );
};

const unifiedLogin = async (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || !password)
    return next(Object.assign(new Error("Email and password are required"), { statusCode: 400 }));

  const email = identifier.toLowerCase().trim();

  // --- 1. SuperAdmin ---
  const superAdmin = await SuperAdminModel.findOne({ email });
  if (superAdmin) {
    if (!superAdmin.isVerified)
      return next(Object.assign(new Error("Please verify your email before logging in"), { statusCode: 403 }));
    if (superAdmin.status === "suspended")
      return next(Object.assign(new Error("Your account has been suspended. Contact support."), { statusCode: 403 }));
    if (superAdmin.working_status !== "working")
      return next(Object.assign(new Error("Your account is not active."), { statusCode: 403 }));

    const isMatch = await superAdmin.isValidPassword(password);
    if (!isMatch)
      return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

    const trialValid = superAdmin.isTrialValid();
    const hasTalentLicense = superAdmin.licenses?.some(
      (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
    );
    if (!trialValid && !hasTalentLicense)
      return next(Object.assign(
        new Error("Your trial has expired. Please upgrade your plan at torchxsuite.com to continue."),
        { statusCode: 403, code: "PLAN_EXPIRED" }
      ));

    // if (superAdmin.isFirstLogin)
    //   return next(Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }));

    const token = jwt.sign(
      { superadminid: superAdmin._id, role: superAdmin.role, email: superAdmin.email, company_domain: superAdmin.company_domain },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
    res.cookie("token", token, cookieOpts());
    superAdmin.last_login = new Date();
    superAdmin.status = "active";
    await superAdmin.save();

    return res.status(200).json({ success: true, message: "Login successful", role: superAdmin.role, accountType: "superadmin", token });
  }

  // --- 2. Admin ---
  const admin = await AdminModel.findOne({ work_email: email });
  if (admin) {
    if (!admin.isVerified)
      return next(Object.assign(new Error("Please verify your email before logging in"), { statusCode: 403 }));
    if (admin.status === "suspended")
      return next(Object.assign(new Error("Your account has been suspended. Contact super admin."), { statusCode: 403 }));
    if (admin.working_status !== "working")
      return next(Object.assign(new Error("Your account is not active. Please contact super admin."), { statusCode: 403 }));

    const isMatch = await admin.isValidPassword(password);
    if (!isMatch)
      return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

    // if (admin.isFirstLogin)
    //   return next(Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }));

    const orgSuperAdmin = await SuperAdminModel.findById(admin.organisation_id);
    if (!orgSuperAdmin)
      return next(Object.assign(new Error("Organisation not found. Please contact support."), { statusCode: 404 }));

    const trialValid = orgSuperAdmin.isTrialValid();
    const hasTalentLicense = orgSuperAdmin.licenses?.some(
      (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
    );
    if (!trialValid && !hasTalentLicense)
      return next(Object.assign(
        new Error("Service stopped! Sorry for the inconvenience, please contact your administrator for further assistance."),
        { statusCode: 403, code: "SERVICE_STOPPED" }
      ));

    const token = jwt.sign(
      { adminid: admin._id, role: admin.role, email: admin.work_email, created_by: admin.created_by, organisation_id: admin.organisation_id },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
    res.cookie("token", token, cookieOpts());
    AdminModel.findByIdAndUpdate(admin._id, { status: "active", last_login: new Date() }).exec();

    return res.status(200).json({ success: true, message: "Login successful", role: admin.role, accountType: "admin", token });
  }

  // --- 3. Manager ---
  const manager = await Managermodel.findOne({ work_email: email });
  if (manager) {
    if (!manager.isVerified)
      return next(Object.assign(new Error("Please verify your email before logging in"), { statusCode: 400 }));
    if (manager.working_status !== "working")
      return next(Object.assign(new Error("Your account is not active. Please contact super admin."), { statusCode: 403 }));

    const isMatch = await manager.isValidPassword(password);
    if (!isMatch)
      return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

    // if (manager.isFirstLogin)
    //   return next(Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }));

    let organisationId = manager.organisation_id;
    let orgSuperAdmin = await SuperAdminModel.findById(organisationId);
    if (!orgSuperAdmin) {
      const parentAdmin = await AdminModel.findById(organisationId).select("organisation_id").lean();
      if (parentAdmin?.organisation_id) {
        organisationId = parentAdmin.organisation_id;
        await Managermodel.findByIdAndUpdate(manager._id, { organisation_id: organisationId });
        orgSuperAdmin = await SuperAdminModel.findById(organisationId);
      }
    }
    if (!orgSuperAdmin)
      return next(Object.assign(new Error("Organisation not found. Please contact administrator."), { statusCode: 404 }));

    const trialValid = orgSuperAdmin.isTrialValid();
    const hasTalentLicense = orgSuperAdmin.licenses?.some(
      (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
    );
    if (!trialValid && !hasTalentLicense)
      return next(Object.assign(
        new Error("Service stopped! Please contact your administrator for further assistance."),
        { statusCode: 403, code: "SERVICE_STOPPED" }
      ));

    const token = jwt.sign(
      { managerid: manager._id, work_email: manager.work_email, role: manager.role, organisation_id: organisationId },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
    res.cookie("token", token, cookieOpts());
    await Managermodel.findByIdAndUpdate(manager._id, { status: "active", organisation_id: organisationId });

    return res.status(200).json({ success: true, message: "Login successful", role: manager.role, accountType: "manager", token });
  }

  // --- 4. Employee ---
  const user = await Usermodel.findOne({ work_email: email });
  if (user) {
    if (user.working_status !== "working")
      return next(Object.assign(new Error("Your account is not active. Please contact your admin."), { statusCode: 403 }));

    const isMatch = await user.isValidPassword(password);
    if (!isMatch)
      return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

    // if (user.isFirstLogin)
    //   return next(Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }));

    const orgSuperAdmin = await SuperAdminModel.findById(user.organisation_id);
    if (!orgSuperAdmin)
      return next(Object.assign(new Error("Organisation not found. Please contact support."), { statusCode: 404 }));

    const trialValid = orgSuperAdmin.isTrialValid();
    const hasTalentLicense = orgSuperAdmin.licenses?.some(
      (l) => l.product === "torchx_talent" && l.isActive && new Date(l.expiresAt) > new Date()
    );
    if (!trialValid && !hasTalentLicense)
      return next(Object.assign(
        new Error("Service stopped! Sorry for the inconvenience, please contact your administrator for further assistance."),
        { statusCode: 403, code: "SERVICE_STOPPED" }
      ));

    const token = jwt.sign(
      {
        _id: user._id, id: user._id, userId: user._id,
        work_email: user.work_email, role: user.role,
        organisation_id: user.organisation_id,
        department: user.department ?? null,
        designation: user.designation ?? null,
        Under_manager: user.Under_manager ?? null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
    res.cookie("token", token, cookieOpts());
    Usermodel.findByIdAndUpdate(user._id, { status: "active", last_login: new Date() }).exec();

    return res.status(200).json({ success: true, message: "Login successful", role: user.role, accountType: "employee", token });
  }

  // --- No match ---
  return next(Object.assign(new Error("No account found with this email"), { statusCode: 404 }));
};

const dismissWelcomeMessage = async (req, res, next) => {
  if (!req.user || !req.actor) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  if ("isFirstLogin" in req.user && req.user.isFirstLogin) {
    req.user.isFirstLogin = false;
    await req.user.save({ validateBeforeSave: false });
  }

  return res.status(200).json({
    success: true,
    message: "Welcome message dismissed",
    role: req.actor.role,
    isFirstLogin: false,
  });
};

// --- Forgot password: send OTP (role auto-detected from email) ---
const { buildForgotPasswordOtpEmail } = require("../utils/helpers/emailtemp");

const unifiedSendForgotPasswordOtp = async (req, res, next) => {
  const { email } = req.body;
  if (!email)
    return next(Object.assign(new Error("Email is required"), { statusCode: 400 }));

  const normalizedEmail = email.toLowerCase().trim();
  const found = await findAccountByEmail(normalizedEmail);
  if (!found)
    return next(Object.assign(new Error("No account found with this email"), { statusCode: 404 }));

  const otp = generateOTP();
  const expiresInMinutes = 5;

  await OtpModel.findOneAndUpdate(
    { email: normalizedEmail },
    { otp: String(otp), expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000) },
    { upsert: true, new: true }
  );

  await sendEmail({
    to: normalizedEmail,
    subject: "Password Reset OTP - TorchX Talent",
    html: buildForgotPasswordOtpEmail({
      recipientName: found.name,
      otp,
      expiresInMinutes,
    }),
  });

  return res.status(200).json({ success: true, message: "OTP sent to your email" });
};

// --- Forgot password: verify OTP and log the user in (role auto-detected) ---
const unifiedVerifyForgotPasswordOtp = async (req, res, next) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return next(Object.assign(new Error("Email and OTP are required"), { statusCode: 400 }));

  const normalizedEmail = email.toLowerCase().trim();

  const otpRecord = await OtpModel.findOne({ email: normalizedEmail });
  if (!otpRecord)
    return next(Object.assign(new Error("OTP not found. Please request a new one"), { statusCode: 404 }));
  if (otpRecord.isExpired()) {
    await OtpModel.deleteOne({ email: normalizedEmail });
    return next(Object.assign(new Error("OTP has expired. Please request a new one"), { statusCode: 400 }));
  }
  if (!otpRecord.compareOtp(String(otp)))
    return next(Object.assign(new Error("Invalid OTP"), { statusCode: 400 }));

  const found = await findAccountByEmail(normalizedEmail);
  if (!found)
    return next(Object.assign(new Error("Account not found"), { statusCode: 404 }));

  const { accountType, account } = found;

  let token;
  try {
    token = await buildLoginToken(accountType, account);
  } catch (err) {
    return next(err);
  }

  // Short-lived token that authorizes setting a new password, independent of
  // the login/session token above. Without this, verify-otp had no way to
  // hand the client anything it could use to actually change the password.
  const resetToken = jwt.sign(
    { accountType, accountId: account._id, purpose: "password_reset" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  await OtpModel.deleteOne({ email: normalizedEmail });
  res.cookie("token", token, cookieOpts());
  res.cookie("resetToken", resetToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 15 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    role: account.role,
    accountType,
    token,
    passwordResetAvailable: true,
  });
};

// --- Cross-browser sign-in link ("companion login") ---------------------
// Cookies are scoped to a single browser by design (that's the whole point
// of them), so a person who is logged into Talent on Chrome has no session
// on Edge/Firefox until they sign in there too - which is exactly why
// activity pings only ever showed up from whichever browser they actually
// logged into. Retyping the password in every browser is annoying, so
// instead: generate a short-lived, single-purpose link from an already
// logged-in browser and open it in the other browser to sign in there too.
// This is still an explicit, authenticated action (not silent session
// sharing) - it just replaces "type your password again" with "open this
// link", the same pattern already used for password-reset/verification
// links elsewhere in this codebase.
const COMPANION_TOKEN_TTL_MINUTES = 60;

// Maps a JWT's `role` claim (senior_manager/official/senior_admin/etc) to
// the coarse account-type bucket the frontend keeps in localStorage
// ("employee" | "manager" | "admin" | "superadmin") so the redeemed
// session is recognised correctly on first load in the new browser.
const ACCOUNT_TYPE_BY_ROLE = {
  employee: "employee",
  manager: "manager",
  senior_manager: "manager",
  official: "manager",
  admin: "admin",
  senior_admin: "admin",
  super_admin: "superadmin",
};

// GET /auth/companion-link - called from an already-authenticated browser
// (any role, via anyRoleAuth) to mint a link that can be opened in another
// browser to sign in there too.
const generateCompanionLink = async (req, res, next) => {
  if (!req.tokenPayload)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { iat, exp, purpose, ...payload } = req.tokenPayload;

  const companionToken = jwt.sign(
    { ...payload, purpose: "companion" },
    process.env.JWT_SECRET,
    { expiresIn: `${COMPANION_TOKEN_TTL_MINUTES}m` }
  );

  const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const link = `${frontendUrl}/companion-login?token=${companionToken}`;

  res.status(200).json({
    success: true,
    link,
    token: companionToken,
    expiresInMinutes: COMPANION_TOKEN_TTL_MINUTES,
  });
};

// POST /auth/companion-login - called (unauthenticated) from the SECOND
// browser after opening the link above. Exchanges the short-lived
// companion token for a normal session cookie on that browser.
const redeemCompanionLink = async (req, res, next) => {
  const token = req.body?.token || req.query?.token;
  if (!token)
    return next(Object.assign(new Error("Missing sign-in token"), { statusCode: 400 }));

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(Object.assign(
      new Error("This sign-in link is invalid or has expired. Generate a new one from the other browser."),
      { statusCode: 401 }
    ));
  }

  if (decoded.purpose !== "companion")
    return next(Object.assign(new Error("Invalid sign-in link"), { statusCode: 400 }));

  const accountType = ACCOUNT_TYPE_BY_ROLE[decoded.role];
  if (!accountType)
    return next(Object.assign(new Error("Unknown role in sign-in link"), { statusCode: 400 }));

  const { purpose, iat, exp, ...payload } = decoded;
  const sessionToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15d" });
  res.cookie("token", sessionToken, cookieOpts());

  res.status(200).json({
    success: true,
    message: "Signed in on this browser",
    role: decoded.role,
    accountType,
  });
};

const MODEL_BY_ACCOUNT_TYPE = {
  superadmin: SuperAdminModel,
  admin: AdminModel,
  manager: Managermodel,
  employee: Usermodel,
};

// --- Forgot password: set a new password using the resetToken from verify-otp ---
const unifiedResetPassword = async (req, res, next) => {
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

  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (err) {
    return next(Object.assign(new Error("Invalid or expired reset token"), { statusCode: 401 }));
  }

  if (decoded.purpose !== "password_reset")
    return next(Object.assign(new Error("Invalid reset token"), { statusCode: 401 }));

  const Model = MODEL_BY_ACCOUNT_TYPE[decoded.accountType];
  if (!Model)
    return next(Object.assign(new Error("Invalid account type in reset token"), { statusCode: 400 }));

  const account = await Model.findById(decoded.accountId);
  if (!account)
    return next(Object.assign(new Error("Account not found"), { statusCode: 404 }));

  account.password = newPassword;
  if ("isFirstLogin" in account) account.isFirstLogin = false;
  await account.save();

  res.clearCookie("resetToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  return res.status(200).json({ success: true, message: "Password updated successfully" });
};

module.exports = {
  unifiedLogin,
  unifiedSendForgotPasswordOtp,
  unifiedVerifyForgotPasswordOtp,
  unifiedResetPassword,
  dismissWelcomeMessage,
  generateCompanionLink,
  redeemCompanionLink,
};