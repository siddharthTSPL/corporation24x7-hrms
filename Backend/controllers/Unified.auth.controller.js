const jwt = require("jsonwebtoken");
const SuperAdminModel = require("../Models/superadmin.model");
const AdminModel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const Usermodel = require("../Models/user.model");

const cookieOpts = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 15 * 24 * 60 * 60 * 1000,
  };
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

    if (superAdmin.isFirstLogin)
      return next(Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }));

    const token = jwt.sign(
      { superadminid: superAdmin._id, role: superAdmin.role, email: superAdmin.email, company_domain: superAdmin.company_domain },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
    res.cookie("token", token, cookieOpts());
    superAdmin.last_login = new Date();
    superAdmin.status = "active";
    await superAdmin.save();

    return res.status(200).json({ success: true, message: "Login successful", role: superAdmin.role, token });
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

    if (admin.isFirstLogin)
      return next(Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }));

    const token = jwt.sign(
      { adminid: admin._id, role: admin.role, email: admin.work_email, created_by: admin.created_by, organisation_id: admin.organisation_id },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
    res.cookie("token", token, cookieOpts());
    AdminModel.findByIdAndUpdate(admin._id, { status: "active", last_login: new Date(), isFirstLogin: false }).exec();

    return res.status(200).json({ success: true, message: "Login successful", role: admin.role, token });
  }

  // --- 3. Manager ---
  const manager = await Managermodel.findOne({ work_email: email });
  if (manager) {
    if (!manager.isVerified)
      return next(Object.assign(new Error("Please verify your email before logging in"), { statusCode: 400 }));

    const isMatch = await manager.isValidPassword(password);
    if (!isMatch)
      return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

    if (manager.isFirstLogin)
      return next(Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }));

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

    return res.status(200).json({ success: true, message: "Login successful", role: manager.role, token });
  }

  // --- 4. Employee ---
  const user = await Usermodel.findOne({ work_email: email });
  if (user) {
    const isMatch = await user.isValidPassword(password);
    if (!isMatch)
      return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

    if (user.isFirstLogin)
      return next(Object.assign(new Error("First login detected. Check your email to set password."), { statusCode: 403 }));

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

    return res.status(200).json({ success: true, message: "Login successful", role: user.role, token });
  }

  // --- No match ---
  return next(Object.assign(new Error("No account found with this email"), { statusCode: 404 }));
};

module.exports = { unifiedLogin };