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
const generateOTP = require("../automatic/otpgenerator");
const OtpModel = require("../Models/otpbasedlogin.model");
const leavebalanceModel = require("../Models/leavebalance.model");
const reviewModel = require("../Models/review.model");


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
  console.log("NEXT TYPE:", typeof next);
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
    office_location,
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
    office_location,
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
    office_location,
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

const findallmanagers = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const managers = await Managermodel.find()
    .select(
      "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt"
    );

  res.status(200).json({
    managers,
  });
};

const getallemployee = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }
 
  const users = await Usermodel.find()
  .select('uid f_name l_name work_email role department designation office_location gender personal_contact e_contact')
    .populate({
      path: "Under_manager",
      select: "uid f_name l_name work_email role ",
    })
    .select(
      "-password -__v  -marital_status  -personal_contact -e_contact -gender -designation -office_location -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt"
    );
    
    const managers = await Managermodel.find().select("uid f_name l_name work_email role designation office_location department gender personal_contact e_contact");

    users.push(...managers);

  res.status(200).json({
    count: users.length,
    users,
  });
};

const editemployee = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

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

  if (!user) {
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));
  }

  
  let manager = null;

  if (updateData.role === "manager") {
    manager = await Managermodel.findOneAndUpdate(
      { userId: uid }, 
      updateData,
      { new: true, upsert: true } 
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
  try {
    if (!req.admin) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 })
      );
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
      return next(
        Object.assign(new Error("User not found"), { statusCode: 404 })
      );
    }
    const manager = await Managermodel.findOne({ userId: user._id }).select(
      "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt"
    );
    
    const leaveBalance = await leavebalanceModel.findOne({
      employee: user._id,
    });

    if (!leaveBalance) {
      return next(
        Object.assign(new Error("Leave balance not found"), {
          statusCode: 404,
        })
      );
    }

    const reviews = await reviewModel
      .find({ reviewee: user._id })
      .populate({
        path: "reviewer",
        select: "f_name l_name work_email role",
      });

    res.status(200).json({
      success: true,
      user,
      manager: manager || null,
      leaveBalance,
      reviews: reviews || [],
    });
  } catch (error) {
    return next(error);
  }
};

const getperticularemanager = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 })
      );
    }
    const { uid } = req.params;
    const manager = await Managermodel.findById(uid)
      .select(
        "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt"
      );

    if (!manager) {
      return next(
        Object.assign(new Error("Manager not found"), { statusCode: 404 })
      );
    }
    const leaveBalance = await leavebalanceModel.findOne({
      employee: manager._id,
    });

    if (!leaveBalance) {
      return next(
        Object.assign(new Error("Leave balance not found"), {
          statusCode: 404,
        })
      );
    }
    const reviews = await reviewModel
      .find({ reviewee: manager._id })
      .populate({
        path: "reviewer",
        select: "f_name l_name work_email role",
      });

    res.status(200).json({
      success: true,
      manager,
      leaveBalance,
      reviews: reviews || [],
    });
}
    catch (error) {
    return next(error);
  }
};

const deleteemployee = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const { uid } = req.params;

  const user = await Usermodel.findByIdAndDelete(uid);
 const manager = await Managermodel.findOneAndDelete(uid);

  if (!user && !manager) {
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));
  }

  res.status(200).json({
    message: "User deleted successfully",
  });
};

const showallleaves = async (req, res, next) => {
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
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const { title, message, audience, priority, notice_image, expiresAt } = req.body;

  if (!title || !message) {
    const error = new Error("Title and message are required");
    error.statusCode = 400;
    throw error;
  }

  const announcement = await announcementmodel.create({
    title,
    message,
    audience,
    priority,
    notice_image,
    expiresAt,
    createdBy: req.admin._id,
  });

  res.status(201).json({
    success: true,
    message: "Announcement created successfully",
    announcement,
  });
};

const getallannouncement = async (req, res, next) => {
  if (!req.admin) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const announcements = await announcementmodel.find();
    

  res.status(200).json({
    success: true,
    count: announcements.length,
    announcements,
  });
};

const updateAnnouncement = async (req, res, next) => {
  if (!req.admin) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const { id } = req.params;

  const announcement = await announcementmodel.findById(id);

  if (!announcement) {
    const error = new Error("Announcement not found");
    error.statusCode = 404;
    throw error;
  }

  if (announcement.createdBy.toString() !== req.admin._id.toString()) {
    const error = new Error("You are not allowed to edit this announcement");
    error.statusCode = 403;
    throw error;
  }

  const { title, message, audience, priority, notice_image, expiresAt } = req.body;

  if (title) announcement.title = title;
  if (message) announcement.message = message;
  if (audience) announcement.audience = audience;
  if (priority) announcement.priority = priority;
  if (notice_image !== undefined) announcement.notice_image = notice_image;
  if (expiresAt) announcement.expiresAt = expiresAt;

  await announcement.save();

  res.status(200).json({
    success: true,
    message: "Announcement updated successfully",
    announcement,
  });
};

const deleteAnnouncement = async (req, res, next) => {
  if (!req.admin) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }

  const { id } = req.params;

  const announcement = await announcementmodel.findById(id);

  if (!announcement) {
    const error = new Error("Announcement not found");
    error.statusCode = 404;
    throw error;
  }

  if (announcement.createdBy.toString() !== req.admin._id.toString()) {
    const error = new Error("You are not allowed to delete this announcement");
    error.statusCode = 403;
    throw error;
  }

  await announcement.deleteOne();

  res.status(200).json({
    success: true,
    message: "Announcement deleted successfully",
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

  if (!rating || !comment) {
    return next(
      Object.assign(new Error("Rating and comment are required"), {
        statusCode: 400,
      })
    );
  }

  const manager = await Managermodel.findById(managerid);

  if (!manager) {
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
  }


  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;


  const existingreview = await Review.findOne({
    reviewer: adminid,
    reviewee: managerid,
    monthYear,
  });

  if (existingreview) {
    return next(
      Object.assign(
        new Error("You have already reviewed this manager this month."),
        { statusCode: 400 }
      )
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
    monthYear,
  });

  res.status(201).json({
    message: "Review submitted successfully",
    review,
  });
};

const forgetpasswordloginotp = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(Object.assign(new Error("Email is required"), { statusCode: 400 }));
  }

  const admin = await Adminmodel.findOne({ email });

  if (!admin) {
    return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));
  }

  const otp = generateOTP();
  const expiry = Date.now() + 5 * 60 * 1000;

  await OtpModel.findOneAndUpdate(
    { email },
    { otp, expiry },
    { upsert: true, new: true }
  );

  await sendEmail({
    to: email,
    subject: "Admin Password Reset OTP",
    html: `
      <h2>Password Reset Request</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP will expire in 5 minutes.</p>
    `,
  });

  res.status(200).json({
    success: true,
    message: "OTP sent successfully",
  });
};

const verifyAotp = async (req, res, next) => {
  const { email, otp } = req.body;

  const otpRecord = await OtpModel.findOne({ email });

  if (!otpRecord) {
    return next(Object.assign(new Error("OTP not found"), { statusCode: 404 }));
  }

  if (otpRecord.isExpired()) {
    return next(Object.assign(new Error("OTP has expired"), { statusCode: 400 }));
  }

  const isMatch = otpRecord.compareOtp(otp);

  if (!isMatch) {
    return next(Object.assign(new Error("Invalid OTP"), { statusCode: 400 }));
  }

  const admin = await Adminmodel.findOne({ email });

  if (!admin) {
    return next(Object.assign(new Error("Admin not found"), { statusCode: 404 }));
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
    maxAge: 15 * 24 * 60 * 60 * 1000,
  });


  const resetToken = jwt.sign(
    { email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const link = `http://localhost:5173/reset-password?token=${resetToken}`;

  await sendEmail({
    to: admin.email,
    subject: "Optional Password Change",
    html: `
      <h2>Hello ${admin.organisation_name || "Admin"}</h2>
      <p>Your OTP verification was successful.</p>
      <a href="${link}">Change Password</a>
    `,
  });

  await OtpModel.deleteOne({ email });

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
    login: true,
    user: {
      id: admin._id,
      email: admin.email,
    },
  });
};


const showUserPasswordPage = (req, res) => {
  const token = req.query.token;

  res.send(`
    <h2>Set Your Password</h2>

    <form action="/admin/resetAdminPassword" method="POST">

      <input type="hidden" name="token" value="${token}" />

      <input type="password" name="newPassword" placeholder="Enter new password" required/>

      <button type="submit">Update Password</button>

    </form>
  `);
};
const resetAdminPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  let decode;
  try {
    decode = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      Object.assign(new Error("Invalid or expired token"), {
        statusCode: 400,
      })
    );
  }

  const admin = await Adminmodel.findOne({ email: decode.email });

  if (!admin) {
    return next(
      Object.assign(new Error("Admin not found"), {
        statusCode: 404,
      })
    );
  }

  admin.password = newPassword;
  await admin.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
};
const getme = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const admin = req.admin;

  res.status(200).json(admin);
};

const editadminprofile = async (req, res, next) => {
  try {
    if (!req.admin) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 })
      );
    }

    const admin = req.admin;
    const { phone, profile_image } = req.body;

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return next(
          Object.assign(new Error("Phone must be a string"), {
            statusCode: 400,
          })
        );
      }
      admin.phone = phone;
    }

    if (profile_image !== undefined) {
      if (typeof profile_image !== "string") {
        return next(
          Object.assign(new Error("Profile image must be a string"), {
            statusCode: 400,
          })
        );
      }

      if (
        profile_image === "" ||
        profile_image.includes("api.dicebear.com")
      ) {
        admin.profile_image = profile_image;
      } else {
        return next(
          Object.assign(new Error("Invalid avatar format"), {
            statusCode: 400,
          })
        );
      }
    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: "Admin profile updated successfully",
      admin: {
        _id: admin._id,
        organisation_name: admin.organisation_name,
        email: admin.email,
        phone: admin.phone,
        profile_image: admin.profile_image,
      },
    });
  } catch (error) {
    console.error("Admin profile update error:", error);
    return next(
      Object.assign(new Error(error.message), { statusCode: 500 })
    );
  }
};

const changepassword = async (req, res, next) => {
  if (!req.admin) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const adminid = req.admin._id;
  const admin = await Adminmodel.findById(adminid).select("+password");

  const { currentPassword, newPassword } = req.body;

  console.log("Entered:", currentPassword);
  console.log("Stored Hash:", admin.password);

  if (!currentPassword || !newPassword) {
    return next(
      Object.assign(new Error("Current password and new password are required"), {
        statusCode: 400,
      })
    );
  }

  const isvalid = await admin.isValidPassword(currentPassword);

  if (!isvalid) {
    return next(Object.assign(new Error("Current password is incorrect"), { statusCode: 400 }));
  }

  if (currentPassword === newPassword) {
    return next(
      Object.assign(new Error("New password must be different from current password"), {
        statusCode: 400,
      })
    );
  }

  admin.password = newPassword;

  await admin.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
};


module.exports = {
  registerAdmin,
  verifyAdmin,
  adminlogin,
  adminlogout,
  findallmanagers,
  addmanager,
  addemployee,
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
  reviewtomanager,
  forgetpasswordloginotp,
  verifyAotp,
  resetAdminPassword,
  showUserPasswordPage,
  getme,
  editadminprofile,
  changepassword
};
