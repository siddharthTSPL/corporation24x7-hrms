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
const Leave = require("../Models/leave.model");
const Review = require("../Models/review.model");
const generateOTP = require("../automatic/otpgenerator");
const OtpModel = require("../Models/otpbasedlogin.model");
const leavebalanceModel = require("../Models/leavebalance.model");
const reviewModel = require("../Models/review.model");
const Attendance = require("../Models/attendance.model");
const ManagerLeave = require("../Models/maleave.model");
const SuperAdminModel = require("../Models/superadmin.model");
const Document = require("../Models/document.model");
const Ticket = require("../Models/ticket.model");
const { processLeaveDeduction } = require("../automatic/calculateleave");

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
    { new: true },
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
      return next(Object.assign(
        new Error("Service stopped! Sorry for the inconvenience, please contact your administrator for further assistance."),
        { statusCode: 403, code: "SERVICE_STOPPED" }
      ));
  }

  const isProduction = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  };

  if (admin.isFirstLogin) {
    const firstLoginToken = jwt.sign(
      { adminid: admin._id, work_email: admin.work_email, purpose: "first_login" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.cookie("resetToken", firstLoginToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });

    sendEmail({
      to: admin.work_email,
      subject: "Set Your Password",
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2>Hello ${admin.f_name},</h2>
          <p>This is your first login. Please set your password using the link below.</p>
          <a href="${process.env.BASE_URL}talent/api/admin/resetpassword"
             style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">
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
    { adminid: admin._id, role: admin.role, email: admin.work_email, created_by: admin.created_by },
    process.env.JWT_SECRET,
    { expiresIn: "15d" },
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

const addmanager = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const {
      profile_image, f_name, l_name, work_email, gender, marital_status, password,
      personal_contact, e_contact, aadhaar_number, pan_number, address, city, state,
      pincode, role, office_location, designation, department, reporting_manager,
      is_fresher, total_experience, previous_company, previous_designation, bank_name,
      account_holder_name, account_number, ifsc_code, resume, aadhaar_card, pan_card,
      experience_letter,
    } = req.body;

    if (!f_name || !l_name || !work_email || !password || !department || !designation || !office_location || !gender || !personal_contact || !e_contact) {
      return next(Object.assign(new Error("Required fields missing"), { statusCode: 400 }));
    }

    const superAdmin = await SuperAdminModel.findById(req.admin.organisation_id).select("_id organisation_name");
    if (!superAdmin) {
      return next(Object.assign(new Error("Organisation not found. Please contact administrator."), { statusCode: 404 }));
    }

    const organisation_id = superAdmin._id;

    const existingManager = await Managermodel.findOne({ work_email, organisation_id }).select("_id").lean();
    if (existingManager) {
      return next(Object.assign(new Error("Manager already exists"), { statusCode: 400 }));
    }

    const uid = await generateUID(department, organisation_id);

    let reportingManagerId = null;
    let reportingManagerModel = null;

    if (reporting_manager) {
      const admin = await Adminmodel.findOne({ _id: reporting_manager, organisation_id }).select("_id").lean();
      if (admin) {
        reportingManagerId = admin._id;
        reportingManagerModel = "Admin";
      } else {
        const manager = await Managermodel.findOne({ _id: reporting_manager, organisation_id }).select("_id").lean();
        if (manager) {
          reportingManagerId = manager._id;
          reportingManagerModel = "Manager";
        }
      }
    }

    const newmanager = await Managermodel.create({
      organisation_id, profile_image, uid, department, f_name, l_name, work_email, password,
      gender, marital_status, personal_contact, e_contact, aadhaar_number, pan_number,
      address, city, state, pincode, role, designation, office_location,
      reporting_manager: reportingManagerId, reporting_manager_model: reportingManagerModel,
      is_fresher, total_experience, previous_company, previous_designation, bank_name,
      account_holder_name, account_number, ifsc_code, resume, aadhaar_card, pan_card,
      experience_letter,
    });

    const token = jwt.sign({ managerid: newmanager._id, work_email: newmanager.work_email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const verifyLink = `${process.env.BASE_URL}talent/api/manager/verify/${token}`;

    await Promise.all([
      assignDefaultLeave(newmanager),
      sendEmail({
        to: work_email,
        subject: "Activate Your Manager Account",
        html: `
          <div style="font-family:Arial,sans-serif;padding:20px">
            <h2>Hello ${f_name},</h2>
            <p>Your manager account has been created successfully.</p>
            <p><strong>UID:</strong> ${uid}</p>
            <p><strong>Department:</strong> ${department}</p>
            <p><strong>Designation:</strong> ${designation}</p>
            <p>Please verify your account by clicking below:</p>
            <a href="${verifyLink}" style="background:#730042;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Verify Account</a>
            <p>This link will expire in 1 hour.</p>
            <p>Regards,<br/>HR Team</p>
          </div>
        `,
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
    if (!req.admin) {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const organisation_id = req.admin.organisation_id;

    const [users, managers] = await Promise.all([
      Usermodel.find({ organisation_id })
        .select("uid f_name l_name work_email role department designation office_location Under_manager organisation_id")
        .populate({ path: "Under_manager", select: "uid f_name l_name work_email role" })
        .lean(),
      Managermodel.find({ organisation_id })
        .select("uid f_name l_name work_email role designation office_location department gender personal_contact e_contact reporting_manager organisation_id")
        .populate({ path: "reporting_manager", select: "f_name l_name work_email" })
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
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { uid } = req.params;
  const organisation_id = req.admin.organisation_id;

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
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));

  let manager = null;
  if (updateData.role === "manager")
    manager = await Managermodel.findOneAndUpdate(
      { userId: uid, organisation_id },
      updateData,
      { new: true, upsert: true },
    );

  res.status(200).json({ success: true, message: "Employee updated successfully", user, manager });
};

const getperticularemployee = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { uid } = req.params;
  const organisation_id = req.admin.organisation_id;

  const [user, leaveBalance, reviews] = await Promise.all([
    Usermodel.findOne({ _id: uid, organisation_id })
      .populate({ path: "Under_manager", select: "uid f_name l_name work_email role" })
      .select(EXCLUDE)
      .lean(),
    leavebalanceModel.findOne({ employee: uid, organisation_id }).lean(),
    reviewModel.find({ reviewee: uid, organisation_id })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      .lean(),
  ]);

  if (!user)
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));
  if (!leaveBalance)
    return next(Object.assign(new Error("Leave balance not found"), { statusCode: 404 }));

  const manager = await Managermodel.findOne({ userId: user._id, organisation_id }).select(EXCLUDE).lean();

  res.status(200).json({ success: true, user, manager: manager || null, leaveBalance, reviews: reviews || [] });
};

const getperticularemanager = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { uid } = req.params;
  const organisation_id = req.admin.organisation_id;

  const [manager, leaveBalance, reviews] = await Promise.all([
    Managermodel.findOne({ _id: uid, organisation_id })
      .select(EXCLUDE)
      .populate("reporting_manager", "f_name l_name work_email designation")
      .lean(),
    leavebalanceModel.findOne({ employee: uid, organisation_id }).lean(),
    reviewModel.find({ reviewee: uid, organisation_id })
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

  const { uid } = req.params;
  const organisation_id = req.admin.organisation_id;

  const [user, manager] = await Promise.all([
    Usermodel.findOneAndDelete({ _id: uid, organisation_id }),
    Managermodel.findOneAndDelete({ _id: uid, organisation_id }),
  ]);

  if (!user && !manager)
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));

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
        status: { $in: ["forwarded_reporting_manager", "approved_reporting_manager", "rejected_reporting_manager"] },
      })
        .populate("employee", "f_name l_name work_email")
        .populate("manager", "f_name l_name work_email")
        .sort({ createdAt: -1 })
        .lean(),
      ManagerLeave.find({
        organisation_id,
        status: { $in: ["pending_reporting_manager", "approved_reporting_manager", "rejected_reporting_manager"] },
      })
        .populate("manager", "f_name l_name work_email")
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

    let leave = null;

    if (leaveFor === "employee") {
      leave = await Leave.findOne({ _id: id, organisation_id });
      if (!leave)
        return next(Object.assign(new Error("Employee leave not found"), { statusCode: 404 }));
      leave.status = "approved_reporting_manager";
      leave.approvedBy = req.admin._id;
      leave.remarks = "Approved by Admin";
    }

    if (leaveFor === "manager") {
      leave = await ManagerLeave.findOne({ _id: id, organisation_id });
      if (!leave)
        return next(Object.assign(new Error("Manager leave not found"), { statusCode: 404 }));
      leave.status = "approved_reporting_manager";
      leave.approvedBy = req.admin._id;
      leave.remarks = "Approved by Admin";
    }

    if (!leave)
      return next(Object.assign(new Error("Invalid leave type"), { statusCode: 400 }));

    await leave.save();

    try {
      await processLeaveDeduction(leave);
    } catch (deductionError) {
      console.error("Leave approved but balance deduction failed:", deductionError.message);
    }

    res.status(200).json({ success: true, message: "Leave approved successfully", leave });
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

    let leave = null;

    if (leaveFor === "employee") {
      leave = await Leave.findOne({ _id: id, organisation_id });
      if (!leave)
        return next(Object.assign(new Error("Employee leave not found"), { statusCode: 404 }));
      leave.status = "rejected_reporting_manager";
      leave.rejectedBy = req.admin._id;
      leave.remarks = "Rejected by Admin";
    }

    if (leaveFor === "manager") {
      leave = await ManagerLeave.findOne({ _id: id, organisation_id });
      if (!leave)
        return next(Object.assign(new Error("Manager leave not found"), { statusCode: 404 }));
      leave.status = "rejected_reporting_manager";
      leave.rejectedBy = req.admin._id;
      leave.remarks = "Rejected by Admin";
    }

    if (!leave)
      return next(Object.assign(new Error("Invalid leave type"), { statusCode: 400 }));

    leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await leave.save();
    res.status(200).json({ success: true, message: "Leave rejected successfully", leave });
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

  const overlapping = await ManagerLeave.findOne({
    manager: req.admin._id,
    organisation_id,
    status: { $nin: ["rejected_reporting_manager"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).select("_id").lean();

  if (overlapping)
    return next(Object.assign(new Error("Leave already applied for these dates"), { statusCode: 400 }));

  const leave = await ManagerLeave.create({
    organisation_id,
    manager: req.admin._id,
    leaveType,
    startDate: start,
    endDate: end,
    days,
    reason,
    status: "pending_reporting_manager",
  });

  res.status(201).json({ success: true, message: "Leave request submitted to super admin", leave });
};

const getmyleavehistory = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const leave = await ManagerLeave.find({ organisation_id: req.admin.organisation_id }).lean();
  res.status(200).json({ leave });
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
    if (!creator) {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const { title, message, audience, priority, notice_image, expiresAt } = req.body;
    if (!title || !message) {
      return next(Object.assign(new Error("Title and message are required"), { statusCode: 400 }));
    }

    const organisation_id = req.admin ? req.admin.organisation_id : req.superAdmin._id;

    const announcement = await announcementmodel.create({
      organisation_id, title, message, audience, priority, notice_image, expiresAt,
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
    if (!organisation_id) {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const announcements = await announcementmodel.find({ organisation_id }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, count: announcements.length, announcements });
  } catch (error) {
    next(error);
  }
};

const updateAnnouncement = async (req, res, next) => {
  try {
    const user = req.admin || req.superAdmin;
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const { id } = req.params;
    const organisation_id = req.admin ? req.admin.organisation_id : req.superAdmin._id;

    const announcement = await announcementmodel.findOne({ _id: id, organisation_id });
    if (!announcement) {
      return next(Object.assign(new Error("Announcement not found"), { statusCode: 404 }));
    }

    const isOwner = announcement.createdBy.toString() === user._id.toString();
    const isSuperAdmin = !!req.superAdmin;
    if (!isOwner && !isSuperAdmin) {
      return next(Object.assign(new Error("You are not allowed to edit this announcement"), { statusCode: 403 }));
    }

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
    if (!user) {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const { id } = req.params;
    const organisation_id = req.admin ? req.admin.organisation_id : req.superAdmin._id;

    const announcement = await announcementmodel.findOne({ _id: id, organisation_id });
    if (!announcement) {
      return next(Object.assign(new Error("Announcement not found"), { statusCode: 404 }));
    }

    const isOwner = announcement.createdBy.toString() === user._id.toString();
    const isSuperAdmin = !!req.superAdmin;
    if (!isOwner && !isSuperAdmin) {
      return next(Object.assign(new Error("You are not allowed to delete this announcement"), { statusCode: 403 }));
    }

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
    Review.findOne({ reviewer: req.admin._id, reviewee: managerid, monthYear, organisation_id }).select("_id").lean(),
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
      { upsert: true, new: true },
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

  const admin = await Adminmodel.findOne({ work_email: email }).select("_id work_email role f_name").lean();
  if (!admin)
    return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));

  const token = jwt.sign(
    { adminid: admin._id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  const resetToken = jwt.sign(
    { adminid: admin._id, work_email: admin.work_email, purpose: "password_reset" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
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
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px">
        <h2>Hello ${admin.f_name},</h2>
        <p>Your OTP login was successful.</p>
        <p>If you want to reset your password, click the button below. This link expires in <strong>15 minutes</strong>.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a>
        <p style="color:#999;font-size:12px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
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
    reviewModel.find({ reviewee: req.admin._id, organisation_id })
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
    if (!req.admin) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await Adminmodel.findById(req.admin._id).lean();
    return res.status(200).json({ success: true, organisation_id: admin.organisation_id, admin });
  } catch (error) {
    next(error);
  }
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
    { $set: { viewedByAdmin: true } },
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
      employee: doc.employee ? {
        id: doc.employee._id,
        name: `${doc.employee.f_name} ${doc.employee.l_name}`,
        email: doc.employee.work_email,
        contact: doc.employee.personal_contact,
        department: doc.employee.department,
        designation: doc.employee.designation,
      } : null,
      reportingManager: doc.underManager ? {
        id: doc.underManager._id,
        name: `${doc.underManager.f_name} ${doc.underManager.l_name}`,
        email: doc.underManager.work_email,
      } : null,
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
    { $set: { viewedByAdmin: true } },
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
      employee: doc.employee ? {
        id: doc.employee._id,
        name: `${doc.employee.f_name} ${doc.employee.l_name}`,
        email: doc.employee.work_email,
        contact: doc.employee.personal_contact,
        department: doc.employee.department,
        designation: doc.employee.designation,
      } : null,
      reportingManager: doc.underManager ? {
        id: doc.underManager._id,
        name: `${doc.underManager.f_name} ${doc.underManager.l_name}`,
        email: doc.underManager.work_email,
      } : null,
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
      employee: document.employee ? {
        id: document.employee._id,
        name: `${document.employee.f_name} ${document.employee.l_name}`,
        email: document.employee.work_email,
        department: document.employee.department,
      } : null,
      reportingManager: document.underManager ? {
        id: document.underManager._id,
        name: `${document.underManager.f_name} ${document.underManager.l_name}`,
        email: document.underManager.work_email,
      } : null,
    },
  });
};

const adminActionOnLeave = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    }

    const { leaveId, action, remarks } = req.body;

    if (!leaveId || !action) {
      return next(Object.assign(new Error("leaveId and action are required"), { statusCode: 400 }));
    }

    if (!["approve", "reject"].includes(action)) {
      return next(Object.assign(new Error("action must be 'approve' or 'reject'"), { statusCode: 400 }));
    }

    const organisation_id = req.admin.organisation_id;
    const leave = await Leave.findOne({ _id: leaveId, organisation_id });

    if (!leave) {
      return next(Object.assign(new Error("Leave not found"), { statusCode: 404 }));
    }

    if (leave.status !== "forwarded_reporting_manager" && leave.status !== "pending_manager") {
      return next(Object.assign(new Error("Only pending or forwarded leaves can be actioned by admin"), { statusCode: 400 }));
    }

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
    if (!req.admin) {
      return res.status(401).json({ message: "Not authenticated" });
    }

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
    if (!req.admin) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const organisation_id = req.admin.organisation_id;
    const tickets = await Ticket.find({ submittedBy: req.admin._id, organisation_id, isDeleted: false })
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
    if (!req.admin) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { ticketNumber } = req.params;
    const { rating, feedback } = req.body;
    const organisation_id = req.admin.organisation_id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const ticket = await Ticket.findOne({ ticketNumber, submittedBy: req.admin._id, organisation_id, isDeleted: false });
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    if (!["resolved", "closed"].includes(ticket.status)) {
      return res.status(400).json({ success: false, message: "Can only rate resolved or closed tickets" });
    }
    if (ticket.submitterRating) {
      return res.status(400).json({ success: false, message: "You have already rated this ticket" });
    }

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
    if (!req.admin) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { ticketNumber } = req.params;
    const organisation_id = req.admin.organisation_id;

    const ticket = await Ticket.findOne({ ticketNumber, submittedBy: req.admin._id, organisation_id, isDeleted: false })
      .populate("submittedBy", "f_name l_name work_email department designation")
      .populate("against", "f_name l_name work_email department designation")
      .select("-internalNotes")
      .lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

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