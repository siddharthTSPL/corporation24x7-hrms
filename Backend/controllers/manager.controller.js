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

const verifyManagerEmail = async (req,res)=>{

  const { token } = req.params;

  try {

    const decoded = jwt.verify(token,process.env.JWT_SECRET);

    const manager = await managermodel.findById(decoded.managerid);

    if(!manager){
      return res.status(404).json({
        message:"Manager not found"
      });
    }

    manager.isVerified = true;
    await manager.save();

    res.send("Manager email verified successfully");

  } catch (error) {

    res.status(400).json({
      message:"Invalid or expired verification link"
    });

  }

};


const managerlogin = async (req, res) => {
  try {
    const { work_email, password } = req.body;

    if (!work_email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const manager = await managermodel.findOne({ work_email });

    if (!manager) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    const isValidPassword = await manager.isValidPassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    if (!manager.isVerified) {
      return res.status(400).json({
        message: "Please verify your email before login"
      });
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

      return res.status(403).json({
        message: "First login detected. Check your email to set password."
      });
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

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


const managerlogout = async (req, res) => {
  try {

    if (!req.manager) {
      return res.status(401).json({ message: "Unauthorized" });
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

    return res.status(200).json({
      message: "Manager logout successful"
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
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

const managerFirstLoginPasswordChange = async (req, res) => {

  const { token, newpassword } = req.body;

  if (!token) {
    return res.status(401).json({
      message: "Token missing"
    });
  }

  try {

    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const manager = await managermodel.findOne({
      work_email: decode.work_email
    });

    if (!manager) {
      return res.status(404).json({
        message: "Manager not found"
      });
    }

    if (!manager.isFirstLogin) {
      return res.status(400).json({
        message: "Password already updated"
      });
    }

    manager.password = newpassword;
    manager.isFirstLogin = false;
    manager.updatedAt = Date.now();

    await manager.save();

    res.status(200).json({
      message: "Password updated successfully"
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
};



const managerUpdatePassword = async (req, res) => {
  try {
   
    if (!req.manager) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const { oldpassword, newpassword } = req.body;

   
    if (!oldpassword || !newpassword) {
      return res.status(400).json({
        message: "Old password and new password are required"
      });
    }

    const manager = req.manager;

    const isvalid = await manager.isValidPassword(oldpassword);

    if (!isvalid) {
      return res.status(400).json({
        message: "Old password is incorrect"
      });
    }

  
    if (oldpassword === newpassword) {
      return res.status(400).json({
        message: "New password must be different from old password"
      });
    }

    manager.password = newpassword;
    manager.passwordUpdatedAt = Date.now();

    await manager.save();

    return res.status(200).json({
      message: "Password updated successfully"
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};


const userunderme = async (req, res) => {
  try {
   
    if (!req.manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const managerid = req.manager._id;

    const users = await usermodel
      .find({ Under_manager: managerid })
      .select(
        "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt"
      );

    if (!users || users.length === 0) {
      return res.status(404).json({
        message: "No users found under this manager"
      });
    }

    return res.status(200).json(users);

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};


const viewallleaves = async (req, res) => {
  try {
  
    if (!req.manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const managerId = req.manager._id;

    const leaves = await leavemodel.find({ manager: managerId })
      .populate("employee", "f_name l_name work_email role")
      .sort({ createdAt: -1 });

    return res.status(200).json(leaves);

  } catch (error) {
    console.error("View Leaves Error:", error);
    return res.status(500).json({ message: error.message });
  }
};




const acceptleaverequest = async (req, res) => {
  const { leaveId } = req.body;

  if (!req.manager) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {

    const leave = await leavemodel.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (leave.status.startsWith("approved") || leave.status.startsWith("rejected")) {
      return res.status(400).json({ message: "Leave already processed" });
    }

    const leaveBalance = await LeaveBalance.findOne({ employee: leave.employee });

    if (!leaveBalance) {
      return res.status(404).json({ message: "Leave balance not found" });
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
      leaveBalance: updatedBalance
    });

  } catch (error) {
    console.error("Approve Leave Error:", error);
    res.status(500).json({ message: error.message });
  }
};



const rejectleaverequest = async (req, res) => {
  const { leaveId } = req.body;

  if (!req.manager) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {

    const leave = await leavemodel.findById(leaveId);

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (leave.status.startsWith("approved") || leave.status.startsWith("rejected")) {
      return res.status(400).json({ message: "Leave already processed" });
    }

    leave.status = "rejected_manager";
    leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await leave.save();

    res.status(200).json({
      message: "Leave rejected successfully",
      leave
    });

  } catch (error) {
    console.error("Reject Leave Error:", error);
    res.status(500).json({ message: error.message });
  }
};


const forwardedtoadmin = async (req, res) => {
  const { leaveId } = req.body;

  if (!req.manager) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {

    const leave = await leavemodel.findById(leaveId);

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (leave.status.startsWith("approved") || leave.status.startsWith("rejected")) {
      return res.status(400).json({ message: "Leave already processed" });
    }

    leave.status = "forwarded_admin";

    await leave.save();

    res.status(200).json({
      message: "Leave forwarded to admin successfully",
      leave
    });

  } catch (error) {
    console.error("Forward Leave Error:", error);
    res.status(500).json({ message: error.message });
  }
};


const applyleavem = async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!req.manager) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const managerId = req.manager._id;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({
        message: "End date cannot be before start date"
      });
    }

    const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const overlapping = await leavemodel.findOne({
      manager: managerId,
      status: { $nin: ["rejected_admin"] },
      startDate: { $lte: end },
      endDate: { $gte: start }
    });

    if (overlapping) {
      return res.status(400).json({
        message: "Leave already applied for these dates"
      });
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

  } catch (error) {
    console.error("Manager Leave Error:", error);
    res.status(500).json({ message: error.message });
  }
};


const showannouncements = async (req, res) => {
  try {
   
    if (!req.manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const announcements = await announcementmodel.find({
      audience: { $in: ["managers", "all"] }
    });

    res.status(200).json(announcements);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const viewEmployeeDocuments = async (req, res) => {
  try {
    const { employeeId } = req.params;

    
    if (!req.manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

   
    const employee = await usermodel.findOne({
      _id: employeeId,
      Under_manager: req.manager._id
    });

    if (!employee) {
      return res.status(403).json({
        message: "This employee is not under your management"
      });
    }

    const documents = await Document.find({ employee: employeeId });

    if (!documents.length) {
      return res.status(404).json({ message: "No documents found" });
    }

    res.status(200).json({
      message: "Documents downloaded successfully",
      url: documents.map((document) => document.fileUrl)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



const viewallemployeewhounderme = async (req, res) => {
  try {
   
    if (!req.manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const employees = await usermodel.find({ Under_manager: req.manager._id })
      .select('-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordUpdatedAt');

    if (!employees.length) {
      return res.status(404).json({ message: "No employees found under this manager" });
    }

    res.status(200).json(employees);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const forgetpasswordloginbyotp = async (req, res) => {

  const { work_email } = req.body;

  try {

    const manager = await managermodel.findOne({ work_email });

    if (!manager) {
      return res.status(404).json({
        message: "Manager not found"
      });
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
      `
    });

    res.status(200).json({
      message: "OTP sent to email"
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};

const verifyManagerOtp = async (req, res) => {

  const { work_email, otp } = req.body;

  try {

    const otpRecord = await OtpModel.findOne({ email: work_email });

    if (!otpRecord) {
      return res.status(404).json({
        message: "OTP not found"
      });
    }

    if (otpRecord.isExpired()) {
      return res.status(400).json({
        message: "OTP expired"
      });
    }

    const isMatch = otpRecord.compareOtp(otp);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    const manager = await managermodel.findOne({ work_email });

    if (!manager) {
      return res.status(404).json({
        message: "Manager not found"
      });
    }


    const token = jwt.sign(
      {
        managerid: manager._id,
        work_email: manager.work_email
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
      `
    });

    await OtpModel.deleteOne({ email: work_email });

    res.status(200).json({
      message: "OTP verified. Login successful.",
      my_details: {
        id: manager._id,
        email: manager.work_email
      },
      passwordResetOptional: true
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

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

const resetManagerPassword = async (req, res) => {

  const { token, newPassword } = req.body;

  if (!token) {
    return res.status(401).json({
      message: "Token missing"
    });
  }

  try {

    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const manager = await managermodel.findOne({
      work_email: decode.work_email
    });

    if (!manager) {
      return res.status(404).json({
        message: "Manager not found"
      });
    }

    manager.password = newPassword;

    await manager.save();

    res.send(`
      <h2>Password updated successfully</h2>
      <p>You can now login with your new password.</p>
    `);

  } catch (error) {

    res.status(500).json({
      error: "Invalid or expired token"
    });

  }

};

const getmyleaves = async (req, res) => {
  try {
 
    if (!req.manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const manager = req.manager;

    const leaves = await LeaveBalance.find({ employee: manager._id });

    if (!leaves.length) {
      return res.status(404).json({ message: "No leaves found for this manager" });
    }

    res.status(200).json(leaves);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const reviewtoemployee = async (req, res) => {
  try {
    const { employeeid, rating, comment } = req.body;

    if (!req.manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const manager = req.manager;

    if (!rating || !comment) {
      return res.status(400).json({ message: "Rating and comment are required" });
    }

    const employee = await usermodel.findOne({
      _id: employeeid,
      Under_manager: manager._id
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found under your management" });
    }

    const existingReview = await Review.findOne({
      reviewer: manager._id,
      reviewee: employeeid
    });

    if (existingReview) {
      return res.status(400).json({ message: "You already reviewed this employee" });
    }

    const review = await Review.create({
      reviewerRole: manager.role,
      reviewer: manager._id,
      reviewerRoleModel: manager.role,
      revieweeRole: employee.role,
      reviewee: employee._id,
      revieweeRoleModel: employee.role,
      rating,
      comment
    });

    res.status(201).json({
      message: "Employee reviewed successfully",
      review
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getme = async (req, res) => {
  try {

    if (!req.manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const manager = req.manager;
    const leavebalance = await LeaveBalance.find({ employee: manager._id });
    const review = await Review.find({ reviewer: manager._id });

    res.status(200).json({
      manager,
      leavebalance,
      review
    });
  }
  catch (error) {
    res.status(500).json({ message: error.message });
  }
}
// Done

module.exports = { verifyManagerEmail  , managerlogin, managerlogout, showPasswordPage,managerFirstLoginPasswordChange, managerUpdatePassword, userunderme,  viewallleaves, acceptleaverequest, rejectleaverequest, forwardedtoadmin, showannouncements, viewEmployeeDocuments, viewallemployeewhounderme, forgetpasswordloginbyotp, showPasswordPageotp,verifyManagerOtp, resetManagerPassword ,getmyleaves,applyleavem,reviewtoemployee,getme};
