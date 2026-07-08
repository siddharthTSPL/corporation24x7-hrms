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
  if (role === "superadmin") {
    return jwt.sign(
      { superadminid: account._id, role: account.role, email: account.email, company_domain: account.company_domain },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
  }
  if (role === "admin") {
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

    const isMatch = await admin.isValidPassword(password);
    if (!isMatch)
      return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

    // if (admin.isFirstLogin)
    //   return next(Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }));

    const token = jwt.sign(
      { adminid: admin._id, role: admin.role, email: admin.work_email, created_by: admin.created_by, organisation_id: admin.organisation_id },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
    res.cookie("token", token, cookieOpts());
    AdminModel.findByIdAndUpdate(admin._id, { status: "active", last_login: new Date(), isFirstLogin: false }).exec();

    return res.status(200).json({ success: true, message: "Login successful", role: admin.role, accountType: "admin", token });
  }

  // --- 3. Manager ---
  const manager = await Managermodel.findOne({ work_email: email });
  if (manager) {
    if (!manager.isVerified)
      return next(Object.assign(new Error("Please verify your email before logging in"), { statusCode: 400 }));

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
    const isMatch = await user.isValidPassword(password);
    if (!isMatch)
      return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

    // if (user.isFirstLogin)
    //   return next(Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }));

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

// --- Forgot password: send OTP (role auto-detected from email) ---
const unifiedSendForgotPasswordOtp = async (req, res, next) => {
  const { email } = req.body;
  if (!email)
    return next(Object.assign(new Error("Email is required"), { statusCode: 400 }));

  const normalizedEmail = email.toLowerCase().trim();
  const found = await findAccountByEmail(normalizedEmail);
  if (!found)
    return next(Object.assign(new Error("No account found with this email"), { statusCode: 404 }));

  const otp = generateOTP();
  await OtpModel.findOneAndUpdate(
    { email: normalizedEmail },
    { otp: String(otp), expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    { upsert: true, new: true }
  );

  await sendEmail({
    to: normalizedEmail,
    subject: "Password Reset OTP",
    html: `<h2>Password Reset</h2><p>Your OTP is:</p><h1>${otp}</h1><p>Expires in 5 minutes.</p>`,
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

  await OtpModel.deleteOne({ email: normalizedEmail });
  res.cookie("token", token, cookieOpts());

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    role: account.role,
    accountType,
    token,
  });
};

module.exports = { unifiedLogin, unifiedSendForgotPasswordOtp, unifiedVerifyForgotPasswordOtp };