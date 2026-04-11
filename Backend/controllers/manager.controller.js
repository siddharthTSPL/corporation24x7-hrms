const managermodel = require("../Models/manager.model");
const usermodel = require("../Models/user.model");
const Document = require("../Models/document.model");
const leavemodel = require("../Models/leave.model");
const LeaveBalance = require("../Models/leavebalance.model");
const OtpModel = require("../Models/otpbasedlogin.model");
const generateOTP = require("../automatic/otpgenerator");
const { sendEmail } = require("../utils/nodemailer.utils");
const announcementmodel = require("../Models/announcement.model");
const { processLeaveDeduction } = require("../automatic/calculateleave");
const axios = require("axios");
const Review = require("../Models/review.model");

const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyManagerEmail = async (req, res, next) => {
  const { token } = req.params;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const manager = await managermodel.findById(decoded.managerid);

  if (!manager) {
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
  }

  manager.isVerified = true;
  await manager.save();

  res.send("Manager email verified successfully");
};


const managerlogin = async (req, res, next) => {
  const { work_email, password } = req.body;

  if (!work_email || !password) {
    return next(Object.assign(new Error("Email and password are required"), { statusCode: 400 }));
  }

  const manager = await managermodel.findOne({ work_email });

  if (!manager) {
    return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));
  }

  const isValidPassword = await manager.isValidPassword(password);

  if (!isValidPassword) {
    return next(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }));
  }

  if (!manager.isVerified) {
    return next(Object.assign(new Error("Please verify your email before login"), { statusCode: 400 }));
  }

  if (manager.isFirstLogin) {
    const resetToken = jwt.sign(
      { work_email: manager.work_email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const link = `http://localhost:5000/manager/change-password?token=${resetToken}`;

    await sendEmail({
      to: manager.work_email,
      subject: "Set Your Password",
      html: `
        <h2>Hello ${manager.f_name}</h2>
        <p>This is your first login.</p>
        <p>Please click the link below to set your password:</p>
        <a href="${link}">Change Password</a>
        <p>This link expires in 15 minutes.</p>
      `
    });

    return next(Object.assign(
      new Error("First login detected. Check your email to set password."),
      { statusCode: 403 }
    ));
  }

  const token = jwt.sign(
    {
      managerid: manager._id,
      work_email: manager.work_email,
      role: manager.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "15d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 15 * 24 * 60 * 60 * 1000
  });

  manager.status = "active";
  await manager.save();

  res.status(200).json({
    message: "Manager login successful"
  });
};


const managerlogout = async (req, res, next) => {

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  await managermodel.findByIdAndUpdate(
    req.manager._id,
    { status: "inactive" }
  );

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });

  res.status(200).json({
    message: "Manager logout successful"
  });
};


const showPasswordPage = (req, res) => {

  const token = req.query.token;   

  console.log("TOKEN:", token);

  res.send(`
    <h2>Set Your Password</h2>

    <form action="/manager/firstloginpasswordchange" method="POST">

      <input type="hidden" name="token" value="${token}" />

      <input type="password" name="newpassword" placeholder="Enter new password" required/>

      <button type="submit">
        Update Password
      </button>

    </form>
  `);

};

const managerFirstLoginPasswordChange = async (req, res, next) => {

  const { token, newpassword } = req.body;

  if (!token) {
    return next(Object.assign(new Error("Token missing"), { statusCode: 401 }));
  }

  if (!newpassword) {
    return next(Object.assign(new Error("New password is required"), { statusCode: 400 }));
  }

  const decode = jwt.verify(token, process.env.JWT_SECRET);

  const manager = await managermodel.findOne({
    work_email: decode.work_email
  });

  if (!manager) {
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
  }

  if (!manager.isFirstLogin) {
    return next(Object.assign(new Error("Password already updated"), { statusCode: 400 }));
  }

  manager.password = newpassword;
  manager.isFirstLogin = false;
  manager.updatedAt = Date.now();

  await manager.save();

  res.status(200).json({
    message: "Password updated successfully"
  });
};



const managerUpdatePassword = async (req, res, next) => {

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const { oldpassword, newpassword } = req.body;

  if (!oldpassword || !newpassword) {
    return next(Object.assign(
      new Error("Old password and new password are required"),
      { statusCode: 400 }
    ));
  }

  const manager = req.manager;

  const isvalid = await manager.isValidPassword(oldpassword);

  if (!isvalid) {
    return next(Object.assign(new Error("Old password is incorrect"), { statusCode: 400 }));
  }

  if (oldpassword === newpassword) {
    return next(Object.assign(
      new Error("New password must be different from old password"),
      { statusCode: 400 }
    ));
  }

  manager.password = newpassword;
  manager.passwordUpdatedAt = Date.now();

  await manager.save();

  res.status(200).json({
    message: "Password updated successfully"
  });
};


const userunderme = async (req, res, next) => {

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const managerid = req.manager._id;

  const users = await usermodel
    .find({ Under_manager: managerid })
    .select(
      "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt"
    );

  if (!users || users.length === 0) {
    return next(Object.assign(
      new Error("No users found under this manager"),
      { statusCode: 404 }
    ));
  }

  res.status(200).json(users);
};



const viewallleaves = async (req, res, next) => {

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const managerId = req.manager._id;

  const leaves = await leavemodel.find({ manager: managerId })
    .populate("employee", "f_name l_name work_email role")
    .sort({ createdAt: -1 });

  res.status(200).json(leaves);
};




const acceptleaverequest = async (req, res, next) => {
  const { leaveId } = req.body;

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  if (!leaveId) {
    return next(Object.assign(new Error("Leave ID is required"), { statusCode: 400 }));
  }

  const leave = await leavemodel.findById(leaveId);

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

  leave.status = "approved_manager";
  await leave.save();

  res.status(200).json({
    message: "Leave approved successfully",
    leave,
    leaveBalance: updatedBalance,
  });
};



const rejectleaverequest = async (req, res, next) => {
  const { leaveId } = req.body;

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  if (!leaveId) {
    return next(Object.assign(new Error("Leave ID is required"), { statusCode: 400 }));
  }

  const leave = await leavemodel.findById(leaveId);

  if (!leave) {
    return next(Object.assign(new Error("Leave not found"), { statusCode: 404 }));
  }

  if (
    leave.status.startsWith("approved") ||
    leave.status.startsWith("rejected")
  ) {
    return next(Object.assign(new Error("Leave already processed"), { statusCode: 400 }));
  }

  leave.status = "rejected_manager";
  leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await leave.save();

  res.status(200).json({
    message: "Leave rejected successfully",
    leave
  });
};


const forwardedtoadmin = async (req, res, next) => {
  const { leaveId } = req.body;

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  if (!leaveId) {
    return next(Object.assign(new Error("Leave ID is required"), { statusCode: 400 }));
  }

  const leave = await leavemodel.findById(leaveId);

  if (!leave) {
    return next(Object.assign(new Error("Leave not found"), { statusCode: 404 }));
  }

  if (
    leave.status.startsWith("approved") ||
    leave.status.startsWith("rejected")
  ) {
    return next(Object.assign(new Error("Leave already processed"), { statusCode: 400 }));
  }

  leave.status = "forwarded_admin";

  await leave.save();

  res.status(200).json({
    message: "Leave forwarded to admin successfully",
    leave
  });
};


const applyleavem = async (req, res, next) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  if (!startDate || !endDate || !leaveType) {
    return next(Object.assign(
      new Error("Required fields missing"),
      { statusCode: 400 }
    ));
  }

  const managerId = req.manager._id;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    return next(Object.assign(
      new Error("End date cannot be before start date"),
      { statusCode: 400 }
    ));
  }

  const days =
    Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const overlapping = await leavemodel.findOne({
    manager: managerId,
    status: { $nin: ["rejected_admin"] },
    startDate: { $lte: end },
    endDate: { $gte: start }
  });

  if (overlapping) {
    return next(Object.assign(
      new Error("Leave already applied for these dates"),
      { statusCode: 400 }
    ));
  }

  const leave = new leavemodel({
    manager: managerId,
    leaveType,
    startDate: start,
    endDate: end,
    days,
    reason,
    status: "pending_admin"
  });

  await leave.save();

  res.status(200).json({
    message: "Leave request submitted to admin",
    leave
  });
};


const showannouncements = async (req, res, next) => {

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const announcements = await announcementmodel.find({
    audience: { $in: ["managers", "all"] }
  });

  res.status(200).json(announcements);
};

const particularannouncement = async (req, res, next) => {

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const announcementid = req.params.id;
  const announcement = await announcementmodel.findById(announcementid);
  if (!announcement) {
    return next(Object.assign(new Error("Announcement not found"), { statusCode: 404 }));
  }
  if (announcement.audience !== "managers" && announcement.audience !== "all") {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }
  return res.status(200).json({
    success: true,
    announcement,
  });
}
const viewEmployeeDocuments = async (req, res, next) => {
  const { employeeId } = req.params;

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const employee = await usermodel.findOne({
    _id: employeeId,
    Under_manager: req.manager._id
  });

  if (!employee) {
    return next(
      Object.assign(new Error("This employee is not under your management"), {
        statusCode: 403
      })
    );
  }

  const documents = await Document.find({ employee: employeeId });

  if (!documents.length) {
    return next(
      Object.assign(new Error("No documents found"), { statusCode: 404 })
    );
  }

  res.status(200).json({
    message: "Documents fetched successfully",
    url: documents.map((doc) => doc.fileUrl)
  });
};


const forgetpasswordloginbyotp = async (req, res, next) => {
  const { work_email } = req.body;

  if (!work_email) {
    return next(Object.assign(new Error("Email is required"), { statusCode: 400 }));
  }

  const manager = await managermodel.findOne({ work_email });

  if (!manager) {
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
  }

  const otp = generateOTP();

  await OtpModel.findOneAndUpdate(
    { email: work_email },
    { otp, createdAt: Date.now() },
    { upsert: true, new: true }
  );

  await sendEmail({
    to: work_email,
    subject: "Password Reset OTP",
    html: `
      <h2>Password Reset Request</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP will expire in 5 minutes.</p>
    `,
  });

  res.status(200).json({
    message: "OTP sent to email",
  });
};

const verifyManagerOtp = async (req, res, next) => {
  const { work_email, otp } = req.body;

  if (!work_email || !otp) {
    return next(Object.assign(new Error("Email and OTP are required"), { statusCode: 400 }));
  }

  const otpRecord = await OtpModel.findOne({ email: work_email });

  if (!otpRecord) {
    return next(Object.assign(new Error("OTP not found"), { statusCode: 404 }));
  }

  if (otpRecord.isExpired()) {
    return next(Object.assign(new Error("OTP expired"), { statusCode: 400 }));
  }

  const isMatch = otpRecord.compareOtp(otp);

  if (!isMatch) {
    return next(Object.assign(new Error("Invalid OTP"), { statusCode: 400 }));
  }

  const manager = await managermodel.findOne({ work_email });

  if (!manager) {
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
  }

  const token = jwt.sign(
    {
      managerid: manager._id,
      work_email: manager.work_email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.cookie("token", token, { httpOnly: true });

  const resetToken = jwt.sign(
    { work_email: manager.work_email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const link = `http://localhost:5000/manager/showPasswordPageotp?token=${resetToken}`;

  await sendEmail({
    to: manager.work_email,
    subject: "Optional Password Change",
    html: `
      <h2>Hello ${manager.f_name}</h2>
      <p>Your OTP verification was successful.</p>

      <p>If you want to change your password, click the link below:</p>

      <a href="${link}">
        Change Password
      </a>

      <p>If you do not want to change your password, you can ignore this email.</p>
    `,
  });

  await OtpModel.deleteOne({ email: work_email });

  res.status(200).json({
    message: "OTP verified. Login successful.",
    my_details: {
      id: manager._id,
      email: manager.work_email,
    },
    passwordResetOptional: true,
  });
};

const showPasswordPageotp = (req, res) => {

  const token = req.query.token;

  res.send(`
    <h2>Set Your Password</h2>

    <form action="/manager/resetManagerPassword" method="POST">

      <input type="hidden" name="token" value="${token}" />

      <input type="password" name="newPassword" placeholder="Enter new password" required/>

      <button type="submit">
        Update Password
      </button>

    </form>
  `);

};

const resetManagerPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token) {
    return next(Object.assign(new Error("Token missing"), { statusCode: 401 }));
  }

  if (!newPassword) {
    return next(Object.assign(new Error("New password is required"), { statusCode: 400 }));
  }

  let decode;


  try {
    decode = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(Object.assign(new Error("Invalid or expired token"), { statusCode: 400 }));
  }


  const manager = await managermodel.findOne({
    work_email: decode.work_email
  });

  if (!manager) {
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
  }

 
  manager.password = newPassword;
  await manager.save();

  res.send(`
    <h2>Password updated successfully</h2>
    <p>You can now login with your new password.</p>
  `);
};

const getmyleaves = async (req, res, next) => {
  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const manager = req.manager;

  const leaves = await LeaveBalance.find({ employee: manager._id });

  if (!leaves.length) {
    return next(
      Object.assign(new Error("No leaves found for this manager"), {
        statusCode: 404,
      })
    );
  }

  res.status(200).json(leaves);
};


const reviewtoemployee = async (req, res, next) => {
  const { employeeid, rating, comment } = req.body;

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  if (!rating || !comment) {
    return next(
      Object.assign(new Error("Rating and comment are required"), {
        statusCode: 400,
      })
    );
  }

  const manager = req.manager;

  const employee = await usermodel.findOne({
    _id: employeeid,
    Under_manager: manager._id,
  });

  if (!employee) {
    return next(
      Object.assign(
        new Error("Employee not found under your management"),
        { statusCode: 404 }
      )
    );
  }

  const existingReview = await Review.findOne({
    reviewer: manager._id,
    reviewee: employeeid,
  });

  if (existingReview) {
    return next(
      Object.assign(new Error("You already reviewed this employee"), {
        statusCode: 400,
      })
    );
  }

  const review = await Review.create({
    reviewerRole: manager.role,
    reviewer: manager._id,
    reviewerRoleModel: manager.role,
    revieweeRole: employee.role,
    reviewee: employee._id,
    revieweeRoleModel: employee.role,
    rating,
    comment,
  });

  res.status(201).json({
    message: "Employee reviewed successfully",
    review,
  });
};

const getme = async (req, res, next) => {
  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const manager = req.manager;

  const leavebalance = await LeaveBalance.find({ employee: manager._id });
  const review = await Review.find({ reviewer: manager._id });

  res.status(200).json({
    manager,
    leavebalance,
    review,
  });
};
// Done
module.exports = { verifyManagerEmail  , managerlogin, managerlogout, showPasswordPage,managerFirstLoginPasswordChange, managerUpdatePassword, userunderme,  viewallleaves, acceptleaverequest, rejectleaverequest, forwardedtoadmin, showannouncements,
  particularannouncement, viewEmployeeDocuments,  forgetpasswordloginbyotp, showPasswordPageotp,verifyManagerOtp, resetManagerPassword ,getmyleaves,applyleavem,reviewtoemployee,getme};
