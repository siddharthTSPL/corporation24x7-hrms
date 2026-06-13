const mongoose = require("mongoose");
const Adminmodel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const announcementmodel = require("../Models/announcement.model");
const uidmodel = require("../Models/UIDmodel.model");
const Usermodel = require("../Models/user.model");
const generateUID = require("../automatic/uidgeneration");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { sendEmail } = require("../utils/nodemailer.utils");
const assignDefaultLeave = require("../automatic/bydefaultleaveset");
const PermissionModel = require("../Models/permission.model");
const Leave = require("../Models/leave.model");
const Review = require("../Models/review.model");
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
const { processLeaveDeduction } = require("../automatic/calculateleave");
const AttendanceSummary = require("../Models/attendancesummary.model");
const WFH = require("../Models/wfh.model");

const EXCLUDE =
  "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt";

const verifyAdmin = async (req, res, next) => {
  const { token } = req.params;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(Object.assign(new Error(err.message), { statusCode: 400 }));
  }
  const admin = await Adminmodel.findByIdAndUpdate(
    decoded.adminid,
    { isVerified: true },
    { new: true }
  ).lean();
  if (!admin)
    return next(Object.assign(new Error("Invalid token"), { statusCode: 400 }));
  res.status(200).json({ message: "Admin verified successfully" });
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

  const isMatch = await admin.isValidPassword(password);
  if (!isMatch)
    return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));

  const superAdmin = await SuperAdminModel.findOne({
    company_domain: identifier.split("@")[1].toLowerCase().trim(),
  });

  if (superAdmin) {
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
  }

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
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
    { adminid: admin._id, role: admin.role, email: admin.work_email, created_by: admin.created_by },
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
      f_name: admin.f_name,
      l_name: admin.l_name,
      work_email: admin.work_email,
      designation: admin.designation,
      role: admin.role,
    },
  });
};

const adminlogout = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  Adminmodel.findByIdAndUpdate(req.admin._id, { status: "inactive" }).exec();
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
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

const addmanager = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const {
      profile_image, f_name, l_name, work_email, gender, marital_status, password,
      personal_contact, e_contact, aadhaar_number, pan_number, address, city, state,
      pincode, role, office_location, designation, department, reporting_manager,
      is_fresher, total_experience, previous_company, previous_designation, bank_name,
      account_holder_name, account_number, ifsc_code, resume, aadhaar_card, pan_card,
      experience_letter,
    } = req.body;

    if (!f_name || !l_name || !work_email || !password || !department || !designation || !office_location || !gender || !personal_contact || !e_contact)
      return next(Object.assign(new Error("Required fields missing"), { statusCode: 400 }));

    const superAdmin = await SuperAdminModel.findById(req.admin.organisation_id)
      .select("_id organisation_name")
      .lean();
    if (!superAdmin)
      return next(Object.assign(new Error("Organisation not found. Please contact administrator."), { statusCode: 404 }));

    const organisation_id = superAdmin._id;

    const existingManager = await Managermodel.findOne({ work_email, organisation_id })
      .select("_id")
      .lean();
    if (existingManager)
      return next(Object.assign(new Error("Manager already exists"), { statusCode: 400 }));

    const uid = await generateUID(department, organisation_id);
    const { reportingManagerId, reportingManagerModel } = await resolveReportingManager(
      reporting_manager,
      organisation_id
    );

    const newmanager = await Managermodel.create({
      organisation_id, profile_image, uid, department, f_name, l_name, work_email, password,
      gender, marital_status, personal_contact, e_contact, aadhaar_number, pan_number,
      address, city, state, pincode, role, designation, office_location,
      reporting_manager: reportingManagerId,
      reporting_manager_model: reportingManagerModel,
      is_fresher, total_experience, previous_company, previous_designation, bank_name,
      account_holder_name, account_number, ifsc_code, resume, aadhaar_card, pan_card,
      experience_letter,
    });

    const token = jwt.sign(
      { managerid: newmanager._id, work_email: newmanager.work_email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const verifyLink = `${process.env.BASE_URL}talent/api/manager/verify/${token}`;

    await Promise.all([
      assignDefaultLeave(newmanager),
      sendEmail({
        to: work_email,
        subject: "Activate Your Manager Account",
        html: `<div style="font-family:Arial,sans-serif;padding:20px"><h2>Hello ${f_name},</h2><p>Your manager account has been created successfully.</p><p><strong>UID:</strong> ${uid}</p><p><strong>Department:</strong> ${department}</p><p><strong>Designation:</strong> ${designation}</p><p>Please verify your account by clicking below:</p><a href="${verifyLink}" style="background:#730042;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Verify Account</a><p>This link will expire in 1 hour.</p><p>Regards,<br/>HR Team</p></div>`,
      }),
    ]);

    return res.status(201).json({
      success: true,
      message: "Manager added successfully. Verification email sent.",
      manager: {
        _id: newmanager._id,
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
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const {
    profile_image, f_name, l_name, work_email, password, gender, marital_status,
    personal_contact, e_contact, aadhaar_number, pan_number, address, city, state,
    pincode, role, office_location, designation, department, Under_manager, is_fresher,
    total_experience, previous_company, previous_designation, bank_name, account_holder_name,
    account_number, ifsc_code, resume, aadhaar_card, pan_card, experience_letter,
  } = req.body;

  if (!f_name || !l_name || !work_email || !password || !department || !designation || !office_location || !gender || !personal_contact || !e_contact)
    return next(Object.assign(new Error("Required fields missing"), { statusCode: 400 }));

  const organisation_id = req.admin.organisation_id;

  const existingUser = await Usermodel.findOne({ work_email, organisation_id }).select("_id").lean();
  if (existingUser)
    return next(Object.assign(new Error("User already exists"), { statusCode: 400 }));

  if (Under_manager) {
    const managerExists = await Managermodel.findOne({ _id: Under_manager, organisation_id })
      .select("_id")
      .lean();
    if (!managerExists)
      return next(Object.assign(new Error("Assigned manager not found in this organisation"), { statusCode: 404 }));
  }

  const uid = await generateUID(department, organisation_id);

  const newuser = await Usermodel.create({
    organisation_id, profile_image, uid, department, Under_manager: Under_manager || null,
    f_name, l_name, work_email, password, gender, marital_status, personal_contact, e_contact,
    aadhaar_number, pan_number, address, city, state, pincode, role, designation, office_location,
    is_fresher, total_experience, previous_company, previous_designation, bank_name,
    account_holder_name, account_number, ifsc_code, resume, aadhaar_card, pan_card, experience_letter,
  });

  const token = jwt.sign({ userid: newuser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const verifyLink = `${process.env.BASE_URL}talent/api/user/verify/${token}`;

  Promise.all([
    assignDefaultLeave(newuser),
    sendEmail({
      to: work_email,
      subject: "Welcome! Verify Your Employee Account",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" style="background:#fff;border-radius:14px;overflow:hidden;"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1>Welcome Aboard</h1></td></tr><tr><td style="padding:40px;"><h2>Hello ${f_name}</h2><p>Your employee account has been created.</p><p><strong>Department:</strong> ${department}</p><p><strong>Location:</strong> ${office_location}</p><a href="${verifyLink}" style="background:#730042;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;">Verify Account</a></td></tr></table></td></tr></table></body></html>`,
    }),
  ]);

  res.status(201).json({ success: true, message: "User added successfully. Verification email sent." });
};


const findallmanagers = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const organisation_id = req.admin.organisation_id;

    const [managers, adminData] = await Promise.all([
      Managermodel.find({ organisation_id })
        .select(EXCLUDE)
        .populate("reporting_manager", "f_name l_name work_email designation")
        .lean(),
      Adminmodel.findById(req.admin._id)
        .select("uid f_name l_name work_email designation department office_location role organisation_id")
        .lean(),
    ]);

    const allManagers = [...managers];
    if (adminData) {
      allManagers.unshift({ ...adminData, isAdmin: true });
    }

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


const getallemployee = async (req, res, next) => {
  try {
    if (!req.admin)
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

    const organisation_id = req.admin.organisation_id;

    const [users, managers] = await Promise.all([
      Usermodel.find({ organisation_id })
        .select("uid f_name l_name work_email role department designation office_location Under_manager organisation_id")
        .populate({ path: "Under_manager", select: "uid f_name l_name work_email role" })
        .lean(),
      Managermodel.find({ organisation_id })
        .select("uid f_name l_name work_email role designation office_location department gender personal_contact e_contact reporting_manager reporting_manager_model organisation_id")
        .populate({ path: "reporting_manager", select: "f_name l_name work_email role" })
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
      .select("_id")
      .lean();
    if (existing)
      return next(Object.assign(new Error("A manager with this email already exists"), { statusCode: 400 }));

    const { reportingManagerId, reportingManagerModel } = await resolveReportingManager(
      reporting_manager,
      organisation_id
    );

    const yearsAtCompany = parseFloat(
      ((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const newRole = role || "manager";

    const roleHistoryEntry = {
      from_role: user.role || "employee",
      to_role: newRole,
      from_model: "User",
      to_model: "Manager",
      changed_by: req.admin._id,
      changed_by_model: "Admin",
      reason: reason || null,
      changed_at: new Date(),
    };

    const inheritedHistory = Array.isArray(user.role_history) ? user.role_history : [];

    const [newManager] = await Managermodel.create(
      [
        {
          organisation_id,
          uid: user.uid,
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
          role_history: [...inheritedHistory, roleHistoryEntry],
        },
      ],
      { session }
    );

    await Managermodel.findByIdAndUpdate(
      newManager._id,
      { $set: { password: user.password } },
      { session }
    );

    const newLeaveBalance = await assignDefaultLeave({ ...newManager.toObject(), _id: newManager._id });

    await Promise.all([
      Usermodel.findByIdAndDelete(id, { session }),

      leavebalanceModel.deleteOne({ employee: id }, { session }),

      leavebalanceModel.findByIdAndUpdate(
        newLeaveBalance._id,
        { $set: { employee: newManager._id } },
        { session }
      ),

      PermissionModel.deleteOne({ user_id: id, user_model: "User", organisation_id }, { session }),

      Usermodel.updateMany(
        { Under_manager: id, organisation_id },
        { $set: { Under_manager: newManager._id } },
        { session }
      ),

      Leave.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id } },
        { session }
      ),

      Attendance.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id, onModel: "Manager", role: "manager" } },
        { session }
      ),

      AttendanceSummary.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id, role: "manager" } },
        { session }
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id } },
        { session }
      ),

      Review.updateMany(
        { reviewee: id, organisation_id },
        { $set: { reviewee: newManager._id, revieweeRole: newRole, revieweeRoleModel: "Manager" } },
        { session }
      ),

      Review.updateMany(
        { reviewer: id, organisation_id },
        { $set: { reviewer: newManager._id, reviewerRole: newRole, reviewerRoleModel: "Manager" } },
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

      WFH.updateMany(
        { requester: id, requesterModel: "User", organisation_id },
        { $set: { requester: newManager._id, requesterModel: "Manager" } },
        { session }
      ),
    ]);

    await session.commitTransaction();

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
      .select("_id")
      .lean();
    if (existing)
      return next(Object.assign(new Error("An admin with this email already exists"), { statusCode: 400 }));

    const superAdmin = await SuperAdminModel.findById(organisation_id).select("_id").lean();
    if (!superAdmin)
      return next(Object.assign(new Error("Organisation not found"), { statusCode: 404 }));

    let resolvedReportingManagerId = null;
    let resolvedReportingManagerModel = null;

    if (reporting_manager) {
      const superAdminDoc = await SuperAdminModel.findById(reporting_manager).select("_id").lean();
      if (superAdminDoc) {
        resolvedReportingManagerId = superAdminDoc._id;
        resolvedReportingManagerModel = "SuperAdmin";
      } else {
        const mgr = await Managermodel.findOne({ _id: reporting_manager, organisation_id })
          .select("_id")
          .lean();
        if (mgr) {
          resolvedReportingManagerId = mgr._id;
          resolvedReportingManagerModel = "Manager";
        }
      }
    }

    const yearsAtCompany = parseFloat(
      ((Date.now() - new Date(manager.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const [newAdmin] = await Adminmodel.create(
      [
        {
          organisation_id,
          uid: manager.uid,
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
        },
      ],
      { session }
    );

    await Adminmodel.findByIdAndUpdate(
      newAdmin._id,
      { $set: { password: manager.password } },
      { session }
    );

    const newRole = role || "admin";

    await Promise.all([
      Managermodel.findByIdAndDelete(id, { session }),

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

      leavebalanceModel.findOneAndUpdate(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id } },
        { session }
      ),

      ManagerLeave.updateMany(
        { manager: id, organisation_id },
        { $set: { manager: newAdmin._id } },
        { session }
      ),

      Leave.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id } },
        { session }
      ),

      Attendance.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id, onModel: "Admin", role: "admin" } },
        { session }
      ),

      AttendanceSummary.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id, role: "admin" } },
        { session }
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id } },
        { session }
      ),

      Review.updateMany(
        { reviewee: id, organisation_id },
        { $set: { reviewee: newAdmin._id, revieweeRole: newRole, revieweeRoleModel: "Admin" } },
        { session }
      ),

      Review.updateMany(
        { reviewer: id, organisation_id },
        { $set: { reviewer: newAdmin._id, reviewerRole: newRole, reviewerRoleModel: "Admin" } },
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

      WFH.updateMany(
        { requester: id, requesterModel: "Manager", organisation_id },
        { $set: { requester: newAdmin._id, requesterModel: "Admin" } },
        { session }
      ),

      WFH.updateMany(
        { manager: id, organisation_id },
        { $set: { manager: null } },
        { session }
      ),
    ]);

    await session.commitTransaction();

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
      .select("_id")
      .lean();
    if (existing)
      return next(Object.assign(new Error("An admin with this email already exists"), { statusCode: 400 }));

    const superAdmin = await SuperAdminModel.findById(organisation_id).select("_id").lean();
    if (!superAdmin)
      return next(Object.assign(new Error("Organisation not found"), { statusCode: 404 }));

    let resolvedReportingManagerId = null;
    let resolvedReportingManagerModel = null;

    if (reporting_manager) {
      const superAdminDoc = await SuperAdminModel.findById(reporting_manager).select("_id").lean();
      if (superAdminDoc) {
        resolvedReportingManagerId = superAdminDoc._id;
        resolvedReportingManagerModel = "SuperAdmin";
      } else {
        const mgr = await Managermodel.findOne({ _id: reporting_manager, organisation_id })
          .select("_id")
          .lean();
        if (mgr) {
          resolvedReportingManagerId = mgr._id;
          resolvedReportingManagerModel = "Manager";
        }
      }
    }

    const yearsAtCompany = parseFloat(
      ((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const [newAdmin] = await Adminmodel.create(
      [
        {
          organisation_id,
          uid: user.uid,
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
        },
      ],
      { session }
    );

    await Adminmodel.findByIdAndUpdate(
      newAdmin._id,
      { $set: { password: user.password } },
      { session }
    );

    const newRole = role || "admin";

    await Promise.all([
      Usermodel.findByIdAndDelete(id, { session }),

      Usermodel.updateMany(
        { Under_manager: id, organisation_id },
        { $set: { Under_manager: null } },
        { session }
      ),

      leavebalanceModel.findOneAndUpdate(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id } },
        { session }
      ),

      Leave.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id } },
        { session }
      ),

      Attendance.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id, onModel: "Admin", role: "admin" } },
        { session }
      ),

      AttendanceSummary.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id, role: "admin" } },
        { session }
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newAdmin._id } },
        { session }
      ),

      Review.updateMany(
        { reviewee: id, organisation_id },
        { $set: { reviewee: newAdmin._id, revieweeRole: newRole, revieweeRoleModel: "Admin" } },
        { session }
      ),

      Review.updateMany(
        { reviewer: id, organisation_id },
        { $set: { reviewer: newAdmin._id, reviewerRole: newRole, reviewerRoleModel: "Admin" } },
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

      WFH.updateMany(
        { requester: id, requesterModel: "User", organisation_id },
        { $set: { requester: newAdmin._id, requesterModel: "Admin" } },
        { session }
      ),
    ]);

    await session.commitTransaction();

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
      .select("_id")
      .lean();
    if (existing)
      return next(Object.assign(new Error("An employee with this email already exists"), { statusCode: 400 }));

    let resolvedUnderManager = null;
    if (Under_manager) {
      const mgr = await Managermodel.findOne({ _id: Under_manager, organisation_id })
        .select("_id")
        .lean();
      if (!mgr)
        return next(Object.assign(new Error("Assigned manager not found in this organisation"), { statusCode: 404 }));
      resolvedUnderManager = mgr._id;
    }

    const yearsAsManager = parseFloat(
      ((Date.now() - new Date(manager.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const [newEmployee] = await Usermodel.create(
      [
        {
          organisation_id,
          uid: manager.uid,
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
        },
      ],
      { session }
    );

    await Usermodel.findByIdAndUpdate(
      newEmployee._id,
      { $set: { password: manager.password } },
      { session }
    );

    await Promise.all([
      Managermodel.findByIdAndDelete(id, { session }),

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

      leavebalanceModel.findOneAndUpdate(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id } },
        { session }
      ),

      ManagerLeave.updateMany(
        { manager: id, organisation_id },
        { $set: { manager: newEmployee._id } },
        { session }
      ),

      Leave.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id } },
        { session }
      ),

      Attendance.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id, onModel: "User", role: "employee" } },
        { session }
      ),

      AttendanceSummary.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id, role: "employee" } },
        { session }
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id } },
        { session }
      ),

      Review.updateMany(
        { reviewee: id, organisation_id },
        { $set: { reviewee: newEmployee._id, revieweeRole: "employee", revieweeRoleModel: "User" } },
        { session }
      ),

      Review.updateMany(
        { reviewer: id, organisation_id },
        { $set: { reviewer: newEmployee._id, reviewerRole: "employee", reviewerRoleModel: "User" } },
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

      WFH.updateMany(
        { requester: id, requesterModel: "Manager", organisation_id },
        { $set: { requester: newEmployee._id, requesterModel: "User" } },
        { session }
      ),

      WFH.updateMany(
        { manager: id, organisation_id },
        { $set: { manager: null } },
        { session }
      ),

      Document.updateMany(
        { underManager: id, organisation_id },
        { $set: { underManager: resolvedUnderManager } },
        { session }
      ),
    ]);

    await session.commitTransaction();

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
      .select("_id")
      .lean();
    if (existing)
      return next(Object.assign(new Error("A manager with this email already exists"), { statusCode: 400 }));

    const { reportingManagerId, reportingManagerModel } = await resolveReportingManager(
      reporting_manager,
      organisation_id
    );

    const yearsAsAdmin = parseFloat(
      ((Date.now() - new Date(adminToDemote.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const [newManager] = await Managermodel.create(
      [
        {
          organisation_id,
          uid: adminToDemote.uid,
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
        },
      ],
      { session }
    );

    await Managermodel.findByIdAndUpdate(
      newManager._id,
      { $set: { password: adminToDemote.password } },
      { session }
    );

    const newRole = role || "manager";

    await Promise.all([
      Adminmodel.findByIdAndDelete(id, { session }),

      leavebalanceModel.findOneAndUpdate(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id } },
        { session }
      ),

      AdminLeave.updateMany(
        { admin: id, organisation_id },
        { $set: { admin: newManager._id } },
        { session }
      ),

      Leave.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id } },
        { session }
      ),

      Attendance.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id, onModel: "Manager", role: "manager" } },
        { session }
      ),

      AttendanceSummary.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id, role: "manager" } },
        { session }
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newManager._id } },
        { session }
      ),

      Review.updateMany(
        { reviewee: id, organisation_id },
        { $set: { reviewee: newManager._id, revieweeRole: newRole, revieweeRoleModel: "Manager" } },
        { session }
      ),

      Review.updateMany(
        { reviewer: id, organisation_id },
        { $set: { reviewer: newManager._id, reviewerRole: newRole, reviewerRoleModel: "Manager" } },
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

      WFH.updateMany(
        { requester: id, requesterModel: "Admin", organisation_id },
        { $set: { requester: newManager._id, requesterModel: "Manager" } },
        { session }
      ),
    ]);

    await session.commitTransaction();

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
      .select("_id")
      .lean();
    if (existing)
      return next(Object.assign(new Error("An employee with this email already exists"), { statusCode: 400 }));

    let resolvedUnderManager = null;
    if (Under_manager) {
      const mgr = await Managermodel.findOne({ _id: Under_manager, organisation_id })
        .select("_id")
        .lean();
      if (!mgr)
        return next(Object.assign(new Error("Assigned manager not found in this organisation"), { statusCode: 404 }));
      resolvedUnderManager = mgr._id;
    }

    const yearsAsAdmin = parseFloat(
      ((Date.now() - new Date(adminToDemote.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
    );

    const [newEmployee] = await Usermodel.create(
      [
        {
          organisation_id,
          uid: adminToDemote.uid,
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
        },
      ],
      { session }
    );

    await Usermodel.findByIdAndUpdate(
      newEmployee._id,
      { $set: { password: adminToDemote.password } },
      { session }
    );

    await Promise.all([
      Adminmodel.findByIdAndDelete(id, { session }),

      leavebalanceModel.findOneAndUpdate(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id } },
        { session }
      ),

      AdminLeave.updateMany(
        { admin: id, organisation_id },
        { $set: { admin: newEmployee._id } },
        { session }
      ),

      Leave.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id } },
        { session }
      ),

      Attendance.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id, onModel: "User", role: "employee" } },
        { session }
      ),

      AttendanceSummary.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id, role: "employee" } },
        { session }
      ),

      Document.updateMany(
        { employee: id, organisation_id },
        { $set: { employee: newEmployee._id } },
        { session }
      ),

      Review.updateMany(
        { reviewee: id, organisation_id },
        { $set: { reviewee: newEmployee._id, revieweeRole: "employee", revieweeRoleModel: "User" } },
        { session }
      ),

      Review.updateMany(
        { reviewer: id, organisation_id },
        { $set: { reviewer: newEmployee._id, reviewerRole: "employee", reviewerRoleModel: "User" } },
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

      WFH.updateMany(
        { requester: id, requesterModel: "Admin", organisation_id },
        { $set: { requester: newEmployee._id, requesterModel: "User" } },
        { session }
      ),
    ]);

    await session.commitTransaction();

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
      .populate({ path: "Under_manager", select: "uid f_name l_name work_email role" })
      .select(EXCLUDE)
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

  const [manager, leaveBalance, reviews] = await Promise.all([
    Managermodel.findOne({ _id: id, organisation_id })
      .select(EXCLUDE)
      .populate("reporting_manager", "f_name l_name work_email designation role")
      .lean(),
    leavebalanceModel.findOne({ employee: id, organisation_id }).lean(),
    reviewModel
      .find({ reviewee: id, organisation_id })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      .lean(),
  ]);

  if (!manager)
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
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
    Usermodel.findOneAndDelete({ _id: id, organisation_id }),
    Managermodel.findOneAndDelete({ _id: id, organisation_id }),
  ]);

  if (!user && !manager)
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));

  if (manager) {
    await Promise.all([
      Usermodel.updateMany({ Under_manager: id, organisation_id }, { Under_manager: null }),
      Managermodel.updateMany(
        { reporting_manager: id, reporting_manager_model: "Manager", organisation_id },
        { reporting_manager: null, reporting_manager_model: null }
      ),
    ]);
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
        status: "pending_admin",
        directed_to: req.admin._id,
        directed_to_model: "Admin",
      })
        .populate("employee", "f_name l_name work_email")
        .populate("manager", "f_name l_name work_email")
        .sort({ createdAt: -1 })
        .lean(),
      ManagerLeave.find({
        organisation_id,
        status: { $in: ["pending_admin", "pending_reporting_manager"] },
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

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start)
    return next(Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }));

  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
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
    leaveType,
    startDate: start,
    endDate: end,
    days,
    reason,
    status: "pending_superadmin",
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

  const { managerid, rating, comment } = req.body;
  if (!managerid || !rating || !comment)
    return next(Object.assign(new Error("managerid, rating and comment are required"), { statusCode: 400 }));

  const organisation_id = req.admin.organisation_id;
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [manager, existingreview] = await Promise.all([
    Managermodel.findOne({ _id: managerid, organisation_id }).select("role").lean(),
    Review.findOne({ reviewer: req.admin._id, reviewee: managerid, monthYear, organisation_id })
      .select("_id")
      .lean(),
  ]);

  if (!manager)
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
  if (existingreview)
    return next(Object.assign(new Error("You have already reviewed this manager this month."), { statusCode: 400 }));

  const review = await Review.create({
    organisation_id,
    reviewerRole: "admin",
    reviewer: req.admin._id,
    reviewerRoleModel: "Admin",
    revieweeRole: manager.role,
    reviewee: managerid,
    revieweeRoleModel: "Manager",
    rating,
    comment,
    monthYear,
  });

  res.status(201).json({ message: "Review submitted successfully", review });
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
  });

  res.status(200).json({ success: true, message: "Password updated successfully" });
};

const getme = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.admin.organisation_id;

  const [admin, leaveBalance, reviews] = await Promise.all([
    Adminmodel.findById(req.admin._id).select(EXCLUDE).lean(),
    leavebalanceModel.findOne({ employee: req.admin._id, organisation_id }).lean(),
    reviewModel
      .find({ reviewee: req.admin._id, organisation_id })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      .lean(),
  ]);

  if (!admin)
    return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

  res.status(200).json({ success: true, user: admin, leaveBalance: leaveBalance || null, reviews: reviews || [] });
};

const editadminprofile = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const admin = req.admin;
  const { phone, profile_image, f_name, l_name } = req.body;
  if (f_name !== undefined) admin.f_name = f_name;
  if (l_name !== undefined) admin.l_name = l_name;
  if (phone !== undefined) {
    if (typeof phone !== "string")
      return next(Object.assign(new Error("Phone must be a string"), { statusCode: 400 }));
    admin.phone = phone;
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

  await admin.save();
  res.status(200).json({
    success: true,
    message: "Admin profile updated successfully",
    admin: {
      _id: admin._id,
      f_name: admin.f_name,
      l_name: admin.l_name,
      work_email: admin.work_email,
      phone: admin.phone,
      profile_image: admin.profile_image,
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
    name: [c.employee?.f_name, c.employee?.l_name].filter(Boolean).join(" ") || "Unknown",
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
  try {
    if (!req.admin)
      return res.status(401).json({ success: false, message: "Unauthorized" });
 
    const admin = await Adminmodel.findById(req.admin._id)
      .select(
        "f_name l_name work_email designation department office_location organisation_id"
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
        "f_name l_name work_email designation department office_location reporting_manager reporting_manager_model"
      )
      .lean();
 
    const employees = await Usermodel
      .find({
        organisation_id,
        Under_manager: { $in: managers.map((m) => m._id) },
      })
      .select(
        "f_name l_name work_email designation department office_location Under_manager"
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
          }
        : null,
      admin: {
        id: admin._id,
        name: `${admin.f_name} ${admin.l_name}`,
        email: admin.work_email,
        designation: admin.designation,
        department: admin.department,
        office_location: admin.office_location,
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
      name: `${mgr.f_name} ${mgr.l_name}`,
      email: mgr.work_email,
      designation: mgr.designation,
      department: mgr.department,
      office_location: mgr.office_location,
      _raw: mgr,
      employees: employees
        .filter((emp) => emp.Under_manager?.toString() === mgr._id.toString())
        .map((emp) => ({
          id: emp._id,
          name: `${emp.f_name} ${emp.l_name}`,
          email: emp.work_email,
          designation: emp.designation,
          department: emp.department,
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
    .populate("employee", "f_name l_name work_email personal_contact department designation")
    .populate("underManager", "f_name l_name work_email")
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
      viewedByManager: doc.viewedByManager,
      viewedByAdmin: doc.viewedByAdmin,
      employee: doc.employee
        ? {
            id: doc.employee._id,
            name: `${doc.employee.f_name} ${doc.employee.l_name}`,
            email: doc.employee.work_email,
            contact: doc.employee.personal_contact,
            department: doc.employee.department,
            designation: doc.employee.designation,
          }
        : null,
      reportingManager: doc.underManager
        ? {
            id: doc.underManager._id,
            name: `${doc.underManager.f_name} ${doc.underManager.l_name}`,
            email: doc.underManager.work_email,
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
    .populate("employee", "f_name l_name work_email personal_contact department designation")
    .populate("underManager", "f_name l_name work_email")
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
      viewedByManager: doc.viewedByManager,
      viewedByAdmin: doc.viewedByAdmin,
      employee: doc.employee
        ? {
            id: doc.employee._id,
            name: `${doc.employee.f_name} ${doc.employee.l_name}`,
            email: doc.employee.work_email,
            contact: doc.employee.personal_contact,
            department: doc.employee.department,
            designation: doc.employee.designation,
          }
        : null,
      reportingManager: doc.underManager
        ? {
            id: doc.underManager._id,
            name: `${doc.underManager.f_name} ${doc.underManager.l_name}`,
            email: doc.underManager.work_email,
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
    .populate("employee", "f_name l_name work_email personal_contact department designation")
    .populate("underManager", "f_name l_name work_email");

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
      viewedByManager: document.viewedByManager,
      viewedByAdmin: document.viewedByAdmin,
      employee: document.employee
        ? {
            id: document.employee._id,
            name: `${document.employee.f_name} ${document.employee.l_name}`,
            email: document.employee.work_email,
            department: document.employee.department,
          }
        : null,
      reportingManager: document.underManager
        ? {
            id: document.underManager._id,
            name: `${document.underManager.f_name} ${document.underManager.l_name}`,
            email: document.underManager.work_email,
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

module.exports = {
  verifyAdmin,
  adminlogin,
  adminlogout,
  addmanager,
  addemployee,
  findallmanagers,
  getallemployee,
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
  forgetpasswordloginotp,
  verifyAotp,
  resetAdminPassword,
  getme,
  editadminprofile,
  changepassword,
  getTodayCheckins,
  getOrgInfo,
  getAllPersonalDocumentsAdmin,
  getAllExpenseDocumentsAdmin,
  getDocumentDetailsAdmin,
  adminActionOnLeave,
  adminSubmitTicket,
  adminGetMyTickets,
  adminRateTicket,
  adminGetTicketDetail,
};