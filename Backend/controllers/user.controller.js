const usermodel = require("../Models/user.model");
const Leave = require("../Models/leave.model");
const LeaveBalance = require("../Models/leavebalance.model");
const OtpModel = require("../Models/otpbasedlogin.model");
const generateOTP = require("../automatic/otpgenerator");
const { sendEmail } = require("../utils/nodemailer.utils");
const announcementmodel = require("../Models/announcement.model");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyUserEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await usermodel.findById(decoded.userid);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.isverified = true;

    await user.save();

    res.send("User email verified successfully");
  } catch (error) {
    res.status(400).json({
      message: "Invalid or expired verification link",
    });
  }
};

const showUserPasswordPage = (req, res) => {
  const token = req.query.token;

  res.send(`
    <h2>Set Your Password</h2>

    <form action="/user/resetUserPassword" method="POST">

      <input type="hidden" name="token" value="${token}" />

      <input type="password" name="newPassword" placeholder="Enter new password" required/>

      <button type="submit">Update Password</button>

    </form>
  `);
};

const userlogin = async (req, res) => {
  try {
    const { identifier, password } = req.body; 

    const isvaliduser = await usermodel.findOne({
      $or: [
        { work_email: identifier },
        { username: identifier }
      ]
    });

    if (!isvaliduser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isvalidpassword = await isvaliduser.isValidPassword(password);

    if (!isvalidpassword) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    if (!isvaliduser.isverified) {
      return res.status(400).json({
        message: "Please verify your email before login",
      });
    }

    if (isvaliduser.isFirstLogin) {
      const resetToken = jwt.sign(
        { work_email: isvaliduser.work_email },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      const link = `http://localhost:5000/user/change-password?token=${resetToken}`;

      await sendEmail({
        to: isvaliduser.work_email,
        subject: "Set Your Password",
        html: `
          <h2>Hello ${isvaliduser.f_name}</h2>
          <p>This is your first login.</p>
          <p>Please click below to set your password:</p>
          <a href="${link}">Change Password</a>
          <p>This link expires in 15 minutes.</p>
        `,
      });

      return res.status(403).json({
        message: "First login detected. Check your email.",
      });
    }

    const token = jwt.sign(
      {
        userId: isvaliduser._id,
        work_email: isvaliduser.work_email,
        role: isvaliduser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );

    res.cookie("token", token, { httpOnly: true });

    await usermodel.findByIdAndUpdate(isvaliduser._id, {
      status: "active",
    });

    res.status(200).json({
      message: "Login successful",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};


const firstloginresetUserPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const user = await usermodel.findOne({
      work_email: decode.work_email,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.password = newPassword;
    user.isFirstLogin = false;

    await user.save();

    res.send(`
      <h2>Password Updated Successfully</h2>
      <p>You can now login.</p>
    `);
  } catch (error) {
    res.status(500).json({
      error: "Invalid or expired token",
    });
  }
};



const userlogout = async (req, res) => {
  try {
    const employee = req.employee; 

    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await usermodel.findByIdAndUpdate(employee._id, {
      status: "inactive",
    });

    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false, 
    });

    return res.status(200).json({
      message: "User logout successful",
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


const updatepassword = async (req, res) => {
  try {
    const employee = req.employee;
    const { oldpassword, newpassword } = req.body;
  
    if (!oldpassword || !newpassword) {
      return res.status(400).json({
        message: "Old and new password required",
      });
    }

    if (!employee || !employee.password) {
      return res.status(400).json({
        message: "User password not found",
      });
    }

    let isvalid;
    try {
      isvalid = await employee.isValidPassword(oldpassword);
    } catch (err) {
      return res.status(400).json({
        message: "Invalid password data",
      });
    }

    if (!isvalid) {
      return res.status(400).json({
        message: "Old password is incorrect",
      });
    }

    employee.password = newpassword;
    employee.passwordupdatedAt = Date.now();

    await employee.save();

    return res.status(200).json({
      message: "Password updated successfully",
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message,
    });
  }
};



const applyleave = async (req, res) => {
  try {
    const user = req.employee; 
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    const days =
      Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (
      leaveType === "ml" &&
      (user.gender !== "female" || user.marital_status !== "married")
    ) {
      return res.status(400).json({
        message: "Not eligible for maternity leave",
      });
    }

    if (
      leaveType === "pl" &&
      (user.gender !== "male" || user.marital_status !== "married")
    ) {
      return res.status(400).json({
        message: "Not eligible for paternity leave",
      });
    }

    const overlapping = await Leave.findOne({
      employee: user._id,
      status: { $nin: ["rejected_admin", "rejected_manager"] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlapping) {
      return res.status(400).json({
        message: "Leave already applied for these dates",
      });
    }

    const leave = new Leave({
      employee: user._id,
      manager: user.Under_manager,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      reason,
      status: "pending_manager",
    });

    await leave.save();

    return res.status(200).json({
      message: "Leave request submitted successfully. Awaiting manager approval.",
      leave,
    });

  } catch (error) {
    console.error("Apply Leave Error:", error);
    return res.status(500).json({
      message: error.message,
    });
  }
};


const resultofleaverequest = async (req, res) => {
  try {
    const employee = req.employee; 
    const leaveid = req.params.id;

    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const leave = await Leave.findById(leaveid);

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (leave.employee.toString() !== employee._id.toString()) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    if (leave.status === "pending_manager") {
      return res.status(200).json({
        message: "Leave request pending",
      });
    }

    if (leave.status === "forwarded_admin") {
      return res.status(200).json({
        message: "Leave request forwarded to admin",
      });
    }

    if (
      leave.status === "approved_manager" ||
      leave.status === "approved_admin"
    ) {
      return res.status(200).json({
        message: "Leave request approved",
      });
    }

    return res.status(200).json({
      message: "Leave request status",
      status: leave.status,
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};



const getallleave = async (req, res) => {
  try {
    const user = req.employee; 

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const leave = await LeaveBalance.findOne({ employee: user._id });

    if (!leave) {
      return res.status(404).json({
        message: "Leave balance not found",
      });
    }

    const { EL, SL, ML, PL, pbc, lwp } = leave;

    return res.status(200).json({
      EL: EL?.entitled || 0,
      SL: SL?.entitled || 0,
      ML,
      PL,
      pbc,
      lwp,
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


const showannouncements = async (req, res) => {
  try {
    const employee = req.employee; 

    if (!employee) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const announcements = await announcementmodel.find({
      audience: { $in: ["employees", "all"] },
    });

    return res.status(200).json(announcements);

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


const forgetpasswordloginbyotp = async (req, res) => {
  try {
    const { work_email } = req.body;

    if (!work_email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await usermodel.findOne({ work_email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const otp = generateOTP();

    // ⏱ Expiry (5 min)
    const expiry = Date.now() + 5 * 60 * 1000;

    await OtpModel.findOneAndUpdate(
      { email: work_email },
      { otp, expiry },
      { upsert: true, new: true }
    );

    await sendEmail({
      to: work_email,
      subject: "Password Reset OTP",
      html: `
        <h2>Password Reset OTP</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
      `,
    });

    return res.status(200).json({
      message: "OTP sent to email",
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  const { work_email, otp } = req.body;
 console.log(work_email,otp);
  try {
    const otpRecord = await OtpModel.findOne({ email: work_email });

    if (!otpRecord) {
      return res.status(404).json({
        message: "OTP not found",
      });
    }

    if (otpRecord.isExpired()) {
      return res.status(400).json({
        message: "OTP has expired",
      });
    }

    const isMatch = otpRecord.compareOtp(otp);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const user = await usermodel.findOne({ work_email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const token = jwt.sign(
      {
        userid: user._id,
        work_email: user.work_email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, { httpOnly: true });

    const resetToken = jwt.sign(
      { work_email: user.work_email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const link = `http://localhost:5000/user/change-password?token=${resetToken}`;

    await sendEmail({
      to: user.work_email,
      subject: "Optional Password Change",
      html: `
        <h2>Hello ${user.f_name}</h2>
        <p>Your OTP verification was successful.</p>
        <p>If you want to change your password, click below:</p>
        <a href="${link}">Change Password</a>
        <p>If you don't want to change it, you can ignore this email.</p>
      `,
    });

    await usermodel.findOneAndUpdate({ work_email }, { status: "active" });

    await OtpModel.deleteOne({ email: work_email });

    res.status(200).json({
      message: "OTP verified successfully",
      login: true,
      passwordResetOptional: true,
      user: {
        id: user._id,
        email: user.work_email,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const resetPasswordafterforget = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const user = await usermodel.findOne({
      work_email: decode.work_email,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.password = newPassword;
    user.isFirstLogin = false;
    user.passwordupdatedAt = Date.now();

    await user.save();

    res.send(`
      <h2>Password Updated Successfully</h2>
      <p>You can continue using the system.</p>
    `);
  } catch (error) {
    res.status(500).json({
      error: "Invalid or expired token",
    });
  }
};

const getme = async (req, res) => {
  try {
    if(!req.employee){
      return res.status(401).json({message:"Unauthorized"});
    }

    const employee = req.employee;
    const leavebalance=await LeaveBalance.find({employee:employee._id});
    res.status(200).json({
      employee,
      leavebalance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
// done
module.exports = {
  verifyUserEmail,
  userlogin,
  showUserPasswordPage,
  firstloginresetUserPassword,
  userlogout,
  updatepassword,
  applyleave,
  resultofleaverequest,
  showannouncements,
  forgetpasswordloginbyotp,
  verifyOtp,
  resetPasswordafterforget,
  getallleave,
  getme
};
