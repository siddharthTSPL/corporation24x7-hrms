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
const { processLeaveDeduction } = require("../automatic/calculateleave");
const LeaveBalance = require("../Models/leavebalance.model");
const Leave = require("../Models/leave.model");
const Review = require("../Models/review.model");


const registerAdmin = async (req, res, next) => {
  const { organisation_name, email, password } = req.body;

  if (!organisation_name || !email || !password) {
    return next(
      Object.assign(new Error("All fields are required"), { statusCode: 400 })
    );
  }

  const existingAdmin = await Adminmodel.findOne();

  if (existingAdmin) {
    return next(
      Object.assign(new Error("Only one admin allowed in system"), {
        statusCode: 403,
      })
    );
  }

  const admin = await Adminmodel.create({
    organisation_name,
    email,
    password,
  });

  const token = jwt.sign(
    { adminid: admin._id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const verifyLink = `http://localhost:5000/admin/verify/${token}`;

  await sendEmail({
    to: email,
    subject: "Verify Your Admin Account",
    html: `<h2>Welcome ${organisation_name}</h2>
    <p>Please verify your admin account:</p>
    <a href="${verifyLink}" style="padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>`,
  });

  res.status(201).json({
    message: "Admin registered. Please verify your email.",
  });
};

const verifyAdmin = async (req, res, next) => {
  const { token } = req.params;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(Object.assign(new Error("Invalid or expired token"), { statusCode: 400 }));
  }

  const admin = await Adminmodel.findById(decoded.adminid);

  if (!admin) {
    return next(Object.assign(new Error("Invalid token"), { statusCode: 400 }));
  }

  admin.isVerified = true;
  await admin.save();

  res.status(200).json({
    message: "Admin verified successfully",
  });
};




const adminlogin = async (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return next(Object.assign(new Error("All fields are required"), { statusCode: 400 }));
  }

  const admin = await Adminmodel.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  });

  if (!admin) {
    return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));
  }

  const isMatch = await admin.isValidPassword(password);
  if (!isMatch) {
    return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));
  }

  const token = jwt.sign(
    {
      adminid: admin._id,
      role: admin.role,
      email: admin.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: false, 
    sameSite: "lax", 
  });

  admin.status = "active";
  await admin.save();

  res.status(200).json({
    message: "Login successful",
    admin: {
      id: admin._id,
      username: admin.username,
      email: admin.email,
    },
  });
};


const adminlogout = async (req, res, next) => {
  const admin = req.admin;

  if (!admin) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    return next(err);
  }

  admin.status = "inactive";
  await admin.save();

  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
  });

  res.status(200).json({
    message: "Admin logout successful",
  });
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
    designation,
    department,
  } = req.body;

  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const existingManager = await Managermodel.findOne({ work_email });

  if (existingManager) {
    return next(Object.assign(new Error("Manager already exists"), { statusCode: 400 }));
  }

  const uid = await generateUID(department);

  const newmanager = new Managermodel({
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
    designation,
  });

  await newmanager.save();

  const token = jwt.sign(
    { managerid: newmanager._id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  await assignDefaultLeave(newmanager);

  const verifyLink = `http://localhost:5000/manager/verify/${token}`;

  await sendEmail({
    to: work_email,
    subject: "Verify Your Manager Account",
    html: `
      <h2>Welcome ${f_name}</h2>
      <p>Your manager account has been created.</p>
      <p>Please verify your email by clicking the button below.</p>

      <a href="${verifyLink}"
      style="
      padding:10px 20px;
      background:#28a745;
      color:white;
      text-decoration:none;
      border-radius:5px;
      ">
      Verify Email
      </a>
    `,
  });

  res.status(200).json({
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
    designation,
    department,
    Under_manager,
  } = req.body;
 
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

if (!f_name || !work_email || !password) {
  return next(Object.assign(new Error("Required fields missing"), { statusCode: 400 }));
}
  const existingUser = await Usermodel.findOne({ work_email });

  if (existingUser) {
    return next(Object.assign(new Error("User already exists"), { statusCode: 400 }));
  }

  const uid = await generateUID(department);

  const newuser = new Usermodel({
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
    designation,
    department,
    Under_manager,
  });

  await newuser.save();

  const token = jwt.sign(
    { userid: newuser._id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  await assignDefaultLeave(newuser);

  const verifyLink = `http://localhost:5000/user/verify/${token}`;

  await sendEmail({
    to: work_email,
    subject: "Verify Your Employee Account",
    html: `
      <h2>Welcome ${f_name}</h2>
      <p>Your employee account has been created.</p>
      <p>Please verify your email by clicking the button below.</p>

      <a href="${verifyLink}"
      style="
      padding:10px 20px;
      background:#28a745;
      color:white;
      text-decoration:none;
      border-radius:5px;
      ">
      Verify Email
      </a>
    `,
  });

  res.status(200).json({
    message: "User added successfully. Verification email sent.",
  });
};


const getallemployee = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const users = await Usermodel.find()
    .populate({
      path: "Under_manager",
      select: "uid f_name l_name work_email role",
    })
    .select(
      "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt"
    );

  if (!users || users.length === 0) {
    return next(Object.assign(new Error("No users found"), { statusCode: 404 }));
  }

  res.status(200).json({
    count: users.length,
    users,
  });
};


const getperticularemployee = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const { uid } = req.params;

  const user = await Usermodel.findById(uid)
    .populate({
      path: "Under_manager",
      select: "uid f_name l_name work_email role",
    })
    .select(
      "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt"
    );

  if (!user) {
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));
  }

  res.status(200).json(user);
};


const deleteemployee = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const { uid } = req.params;

  const user = await Usermodel.findByIdAndDelete(uid);
  const manager = await Managermodel.findByIdAndDelete(uid);

  if (!user && !manager) {
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));
  }

  res.status(200).json({
    message: "User deleted successfully",
  });
};

const showforwardedleaves = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const leaves = await Leave.find({
    status: { $in: ["forwarded_admin", "pending_admin"] },
  })
    .populate("employee", "f_name l_name work_email")
    .populate("manager", "f_name l_name work_email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    count: leaves.length,
    leaves,
  });
};

const acceptleavebyadmin = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const leaveId = req.params.id;

  const leave = await Leave.findById(leaveId);

  if (!leave) {
    return next(Object.assign(new Error("Leave not found"), { statusCode: 404 }));
  }

  if (
    leave.status.startsWith("approved") ||
    leave.status.startsWith("rejected")
  ) {
    return next(Object.assign(new Error("Leave already processed"), { statusCode: 400 }));
  }

  const leaveBalance = await LeaveBalance.findOne({
    employee: leave.employee,
  });

  if (!leaveBalance) {
    return next(Object.assign(new Error("Leave balance not found"), { statusCode: 404 }));
  }

  if (leave.leaveType === "ml") {
    const start = new Date(leave.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 181);

    leaveBalance.mlStartDate = start;
    leaveBalance.mlEndDate = end;

    await leaveBalance.save();
  }

  const updatedBalance = await processLeaveDeduction(leave);

  leave.status = "approved_admin";
  leave.approvedBy = req.admin._id;

  await leave.save();

  res.status(200).json({
    message: "Leave approved by admin",
    leave,
    leaveBalance: updatedBalance,
  });
};


const rejectleavebyadmin = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const leaveId = req.params.id;

  const leave = await Leave.findById(leaveId);

  if (!leave) {
    return next(Object.assign(new Error("Leave not found"), { statusCode: 404 }));
  }

  if (
    leave.status.startsWith("approved") ||
    leave.status.startsWith("rejected")
  ) {
    return next(Object.assign(new Error("Leave already processed"), { statusCode: 400 }));
  }

  leave.status = "rejected_admin";
  leave.rejectedBy = req.admin._id;

  leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await leave.save();

  res.status(200).json({
    message: "Leave rejected by admin successfully",
    leave,
  });
};




const noofemployee = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const departments = await uidmodel.find(
    {},
    { department: 1, lastNumber: 1, _id: 0 }
  );

  let total = 0;

  departments.forEach((dep) => {
    total += dep.lastNumber;
  });

  res.status(200).json({
    departments,
    totalEmployees: total,
  });
};


const createannouncement = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const { title, message, audience, priority, expiresAt } = req.body;

  const announcement = new announcementmodel({
    title,
    message,
    audience,
    priority,
    expiresAt,
    createdBy: req.admin._id,
  });

  await announcement.save();

  res.status(201).json({
    message: "Announcement created successfully",
    announcement,
  });
};


const reviewtomanager = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const { managerid, rating, comment } = req.body;

  const adminid = req.admin._id;
  const adminrole = req.admin.role;

  if (adminrole !== "admin") {
    return next(
      Object.assign(new Error("Only admin can review managers"), {
        statusCode: 403,
      })
    );
  }

  const manager = await Managermodel.findById(managerid);

  if (!manager) {
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
  }

  const existingreview = await Review.findOne({
    reviewer: adminid,
    reviewee: managerid,
  });

  if (existingreview) {
    return next(
      Object.assign(new Error("Review already submitted"), {
        statusCode: 400,
      })
    );
  }

  const review = await Review.create({
    reviewerRole: adminrole,
    reviewer: adminid,
    reviewerRoleModel: adminrole,
    revieweeRole: manager.role,
    reviewee: managerid,
    revieweeRoleModel: manager.role,
    rating,
    comment,
  });

  res.status(201).json({
    message: "Review submitted successfully",
    review,
  });
};

const getme = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const admin = req.admin;

  res.status(200).json(admin);
};


module.exports = {
  registerAdmin,
  verifyAdmin,
  adminlogin,
  adminlogout,
  addmanager,
  addemployee,
  getallemployee,
  getperticularemployee,
  deleteemployee,
  showforwardedleaves,
  acceptleavebyadmin,
  rejectleavebyadmin,
  noofemployee,
  createannouncement,
  reviewtomanager,
  getme
};
