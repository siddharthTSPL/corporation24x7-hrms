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

const userlogin = async (req, res) => {
  try {
    const { work_email, password } = req.body;

    const isvaliduser = await usermodel.findOne({ work_email });

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
        { expiresIn: "15m" },
      );

      const link = `http://localhost:5000/user/change-password?token=${resetToken}`;

      await sendEmail({
        to: isvaliduser.work_email,
        subject: "Set Your Password",
        html: `
          <h2>Hello ${isvaliduser.f_name}</h2>

          <p>This is your first login.</p>

          <p>Please click the link below to set your password:</p>

          <a href="${link}">
            Change Password
          </a>

          <p>This link expires in 15 minutes.</p>
        `,
      });

      return res.status(403).json({
        message: "First login detected. Check your email to set password.",
      });
    }

    const token = jwt.sign(
      {
        userId: isvaliduser._id,
        work_email: isvaliduser.work_email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15d" },
    );

    res.cookie("token", token, { httpOnly: true });

    await usermodel.findOneAndUpdate(
      { work_email: isvaliduser.work_email },
      { status: "active" },
    );

    res.status(200).json({
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
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
  const token = req.cookies.token;
  try {
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (!decode) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await usermodel.findOneAndUpdate(
      { work_email: decode.work_email },
      { status: "inactive" },
    );
    res.clearCookie("token", {
      httpOnly: true,
    });
    res.status(200).json({ message: "User logout successful" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updatepassword = async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { oldpassword, newpassword } = req.body;
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const user = await usermodel.findOne({ work_email: decode.work_email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isvalid = await user.isValidPassword(oldpassword);
    if (!isvalid) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    user.password = newpassword;

    await user.save();

    res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const applyleave = async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const { leaveType, startDate, endDate, reason } = req.body;

  try {

    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const user = await usermodel.findOne({ work_email: decode.work_email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }

    const days =
      Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (leaveType === "ml" && (user.gender !== "female" || user.marital_status !== "married")) {
      return res.status(400).json({ message: "Not eligible for maternity leave" });
    }

    if (leaveType === "pl" && (user.gender !== "male" || user.marital_status !== "married")) {
      return res.status(400).json({ message: "Not eligible for paternity leave" });
    }


    const overlapping = await Leave.findOne({
      employee: user._id,
      status: { $nin: ["rejected_admin", "rejected_manager"] },
      startDate: { $lte: end },
      endDate: { $gte: start }
    });

    if (overlapping) {
      return res.status(400).json({
        message: "Leave already applied for these dates"
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
      status: "pending_manager"
    });

    await leave.save();

    res.status(200).json({
      message: "Leave request submitted successfully. Awaiting manager approval.",
      leave
    });

  } catch (error) {
    console.error("Apply Leave Error:", error);
    res.status(500).json({ error: error.message });
  }
};

const resultofleaverequest = async (req, res) => {
  const token = req.cookies.token;
  const leaveid = req.params.id;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const leave = await leavemodel.findById(leaveid);
    if (!leave) {
      return res.status(404).json({ message: "Leave rejected" });
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
    res.status(200).json({
      message: "Leave request status",
      status: leave.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getallleave = async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    const user = await usermodel.findOne({ id: decode.id });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const leave = await LeaveBalance.find({ employee: user._id });
    const { EL, SL, ML, PL, pbc, lwp } = leave[0];

    res.status(200).json({
      EL: EL.entitled,
      SL: SL.entitled,
      ML,
      PL,
      pbc,
      lwp,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const showannouncements = async (req, res) => {
  try {
    const announcements = await announcementmodel.find({
      audience: { $in: ["employees", "all"] },
    });

    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const forgetpasswordloginbyotp = async (req, res) => {
  const { work_email } = req.body;

  try {
    const user = await usermodel.findOne({ work_email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const otp = generateOTP();

    await OtpModel.findOneAndUpdate(
      { email: work_email },
      { otp },
      { upsert: true, new: true },
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

    res.status(200).json({
      message: "OTP sent to email",
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  const { work_email, otp } = req.body;

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
};
