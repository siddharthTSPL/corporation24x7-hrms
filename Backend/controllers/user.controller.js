const usermodel = require("../Models/user.model");
const Leave = require("../Models/leave.model");
const LeaveBalance = require("../Models/leavebalance.model");
const OtpModel = require("../Models/otpbasedlogin.model");
const generateOTP = require("../automatic/otpgenerator");
const { sendEmail } = require("../utils/nodemailer.utils");
const announcementmodel = require("../Models/announcement.model");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyUserEmail = async (req, res, next) => {
  const { token } = req.params;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      Object.assign(new Error("Invalid or expired verification link"), {
        statusCode: 400,
      }),
    );
  }

  const user = await usermodel.findById(decoded.userid);

  if (!user) {
    return next(
      Object.assign(new Error("User not found"), {
        statusCode: 404,
      }),
    );
  }

  // update verification
  user.isverified = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: "User email verified successfully",
  });
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

const userlogin = async (req, res, next) => {
  const { identifier, password } = req.body;

  const isvaliduser = await usermodel.findOne({
    $or: [{ work_email: identifier }, { username: identifier }],
  });

  if (!isvaliduser) {
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );
  }

  const isvalidpassword = await isvaliduser.isValidPassword(password);

  if (!isvalidpassword) {
    return next(
      Object.assign(new Error("Invalid password"), { statusCode: 401 }),
    );
  }

  if (!isvaliduser.isverified) {
    return next(
      Object.assign(new Error("Please verify your email before login"), {
        statusCode: 400,
      }),
    );
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
        <p>Please click below to set your password:</p>
        <a href="${link}">Change Password</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    return next(
      Object.assign(new Error("First login detected. Check your email."), {
        statusCode: 403,
      }),
    );
  }

  const token = jwt.sign(
    {
      userId: isvaliduser._id,
      work_email: isvaliduser.work_email,
      role: isvaliduser.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15d" },
  );

  res.cookie("token", token, { httpOnly: true });

  await usermodel.findByIdAndUpdate(isvaliduser._id, {
    status: "active",
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
  });
};

const firstloginresetUserPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  let decode;
  try {
    decode = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      Object.assign(new Error("Invalid or expired token"), {
        statusCode: 400,
      }),
    );
  }

  const user = await usermodel.findOne({
    work_email: decode.work_email,
  });

  if (!user) {
    return next(
      Object.assign(new Error("User not found"), {
        statusCode: 404,
      }),
    );
  }

  user.password = newPassword;
  user.isFirstLogin = false;

  await user.save();

  res.status(200).send(`
    <h2>Password Updated Successfully</h2>
    <p>You can now login.</p>
  `);
};

const userlogout = async (req, res, next) => {
  const employee = req.employee;

  if (!employee) {
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
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
    success: true,
    message: "User logout successful",
  });
};

const updatepassword = async (req, res, next) => {
  const employee = req.employee;
  const { oldpassword, newpassword } = req.body;

  if (!oldpassword || !newpassword) {
    return next(
      Object.assign(new Error("Old and new password required"), {
        statusCode: 400,
      }),
    );
  }

  if (!employee || !employee.password) {
    return next(
      Object.assign(new Error("User password not found"), {
        statusCode: 400,
      }),
    );
  }

  let isvalid;
  try {
    isvalid = await employee.isValidPassword(oldpassword);
  } catch (err) {
    return next(
      Object.assign(new Error("Invalid password data"), {
        statusCode: 400,
      }),
    );
  }

  if (!isvalid) {
    return next(
      Object.assign(new Error("Old password is incorrect"), {
        statusCode: 400,
      }),
    );
  }

  employee.password = newpassword;
  employee.passwordupdatedAt = Date.now();

  await employee.save();

  return res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
};

const applyleave = async (req, res, next) => {
  if(!req.employee) {
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
  }
  const user = await usermodel.findById(req.employee._id).select("gender marital_status")
  .populate({
    path: "Under_manager",
    select: "uid f_name l_name work_email role",
  });
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!user) {
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
  }

  if (!leaveType || !startDate || !endDate || !reason) {
    return next(
      Object.assign(new Error("All fields are required"), {
        statusCode: 400,
      }),
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    return next(
      Object.assign(new Error("End date cannot be before start date"), {
        statusCode: 400,
      }),
    );
  }

  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (
    leaveType === "ml" &&
    (user.gender !== "female" || user.marital_status !== "married")
  ) {
    return next(
      Object.assign(new Error("Not eligible for maternity leave"), {
        statusCode: 400,
      }),
    );
  }

  if (
    leaveType === "pl" &&
    (user.gender !== "male" || user.marital_status !== "married")
  ) {
    return next(
      Object.assign(new Error("Not eligible for paternity leave"), {
        statusCode: 400,
      }),
    );
  }

  const overlapping = await Leave.findOne({
    employee: user._id,
    status: { $nin: ["rejected_admin", "rejected_manager"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });

  if (overlapping) {
    return next(
      Object.assign(new Error("Leave already applied for these dates"), {
        statusCode: 400,
      }),
    );
  }
 console.log(user);
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
    success: true,
    message: "Leave request submitted successfully. Awaiting manager approval.",
    leave,
  });
};
const editleave = async (req, res, next) => {
  if(!req.employee){
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
  }
  const leaveid = req.params.id;
  const { leaveType, startDate, endDate, reason } = req.body;
  const leave = await Leave.findById(leaveid);
  if (!leave) {
    return next(
      Object.assign(new Error("Leave not found"), {
        statusCode: 404,
      }),
    );
  }
  leave.leaveType = leaveType;
  leave.startDate = startDate;
  leave.endDate = endDate;
  leave.reason = reason;
  await leave.save();
  return res.status(200).json({
    success: true,
    message: "Leave updated successfully",
    leave,
  });
};
const deleteleave = async (req, res, next) => {
  if (!req.employee) {
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      })
    );
  }

  const leaveid = req.params.id;

  const leave = await Leave.findById(leaveid);
  if (!leave) {
    return next(
      Object.assign(new Error("Leave not found"), {
        statusCode: 404,
      })
    );
  }

  await Leave.findByIdAndDelete(leaveid);

  return res.status(200).json({
    success: true,
    message: "Leave deleted successfully",
  });
};
const resultofleaverequest = async (req, res, next) => {
  const employee = req.employee;
  const leaveid = req.params.id;

  if (!employee) {
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
  }

  const leave = await Leave.findById(leaveid);

  if (!leave) {
    return next(
      Object.assign(new Error("Leave not found"), {
        statusCode: 404,
      }),
    );
  }

  if (leave.employee.toString() !== employee._id.toString()) {
    return next(
      Object.assign(new Error("Access denied"), {
        statusCode: 403,
      }),
    );
  }

  if (leave.status === "pending_manager") {
    return res.status(200).json({
      success: true,
      message: "Leave request pending",
    });
  }

  if (leave.status === "forwarded_admin") {
    return res.status(200).json({
      success: true,
      message: "Leave request forwarded to admin",
    });
  }

  if (
    leave.status === "approved_manager" ||
    leave.status === "approved_admin"
  ) {
    return res.status(200).json({
      success: true,
      message: "Leave request approved",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Leave request status",
    status: leave.status,
  });
};

const getallleave = async (req, res, next) => {
  const user = req.employee;

  if (!user) {
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
  }

  const leave = await LeaveBalance.findOne({ employee: user._id });

  if (!leave) {
    return next(
      Object.assign(new Error("Leave balance not found"), {
        statusCode: 404,
      }),
    );
  }

  const { EL, SL, ML, PL, pbc, lwp } = leave;

  return res.status(200).json({
    success: true,
    EL: EL?.entitled || 0,
    SL: SL?.entitled || 0,
    ML,
    PL,
    pbc,
    lwp,
  });
};

const getallleavehistory = async (req, res, next) => {
  const user = req.employee;

  if (!user) {
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
  }

  const leaves = await Leave.find({ employee: user._id });

  return res.status(200).json({
    success: true,
    leaves,
  });
};


const showannouncements = async (req, res, next) => {
  const employee = req.employee;

  if (!employee) {
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
  }

  const announcements = await announcementmodel.find({
    audience: { $in: ["employees", "all"] },
  });

  return res.status(200).json({
    success: true,
    announcements,
  });
};

const showparticlausannouncements = async (req, res, next) => {
  if(!req.employee){
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
  }

  const announcementid = req.params.id;
  const announcement = await announcementmodel.findById(announcementid);
  if (!announcement) {
    return next(
      Object.assign(new Error("Announcement not found"), {
        statusCode: 404,
      }),
    );
  }
  if (announcement.audience !== "employees" && announcement.audience !== "all") {
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
  }
  return res.status(200).json({
    success: true,
    announcement,
  });
}

const forgetpasswordloginbyotp = async (req, res, next) => {
  const { work_email } = req.body;

  if (!work_email) {
    return next(
      Object.assign(new Error("Email is required"), {
        statusCode: 400,
      }),
    );
  }

  const user = await usermodel.findOne({ work_email });

  if (!user) {
    return next(
      Object.assign(new Error("User not found"), {
        statusCode: 404,
      }),
    );
  }

  const otp = generateOTP();
  const expiry = Date.now() + 5 * 60 * 1000;

  await OtpModel.findOneAndUpdate(
    { email: work_email },
    { otp, expiry },
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

  return res.status(200).json({
    success: true,
    message: "OTP sent to email",
  });
};

const verifyOtp = async (req, res, next) => {
  const { work_email, otp } = req.body;

  const otpRecord = await OtpModel.findOne({ email: work_email });

  if (!otpRecord) {
    return next(
      Object.assign(new Error("OTP not found"), {
        statusCode: 404,
      }),
    );
  }

  if (otpRecord.isExpired()) {
    return next(
      Object.assign(new Error("OTP has expired"), {
        statusCode: 400,
      }),
    );
  }

  const isMatch = otpRecord.compareOtp(otp);

  if (!isMatch) {
    return next(
      Object.assign(new Error("Invalid OTP"), {
        statusCode: 400,
      }),
    );
  }

  const user = await usermodel.findOne({ work_email });

  if (!user) {
    return next(
      Object.assign(new Error("User not found"), {
        statusCode: 404,
      }),
    );
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
    success: true,
    message: "OTP verified successfully",
    login: true,
    passwordResetOptional: true,
    user: {
      id: user._id,
      email: user.work_email,
    },
  });
};

const resetPasswordafterforget = async (req, res, next) => {
  const { token, newPassword } = req.body;

  let decode;
  try {
    decode = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      Object.assign(new Error("Invalid or expired token"), {
        statusCode: 400,
      }),
    );
  }

  const user = await usermodel.findOne({
    work_email: decode.work_email,
  });

  if (!user) {
    return next(
      Object.assign(new Error("User not found"), {
        statusCode: 404,
      }),
    );
  }

  user.password = newPassword;
  user.isFirstLogin = false;
  user.passwordupdatedAt = Date.now();

  await user.save();

  res.status(200).send(`
    <h2>Password Updated Successfully</h2>
    <p>You can continue using the system.</p>
  `);
};

const getme = async (req, res, next) => {
  const employee = req.employee;

  if (!employee) {
    return next(
      Object.assign(new Error("Unauthorized"), {
        statusCode: 401,
      }),
    );
  }

  const emp = await usermodel
    .findById(employee._id)

    .populate({
      path: "Under_manager",
      select: "f_name l_name work_email role",
    });

  const leavebalance = await LeaveBalance.find({
    employee: employee._id,
  });

  return res.status(200).json({
    success: true,

    employee: emp,

    leavebalance,
  });
};



const editprofileemployee = async (req, res, next) => {
  try {
    if (!req.employee) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 })
      );
    }

    const employee = req.employee;

    const {
      personal_contact,
      e_contact,
      marital_status,
      profile_image,
      gender 
    } = req.body;

    let leaveUpdateRequired = false;

    if (personal_contact !== undefined) {
      employee.personal_contact = personal_contact;
    }

    if (e_contact !== undefined) {
      employee.e_contact = e_contact;
    }

  
    if (gender !== undefined) {
      const allowedGender = ["male", "female"];
      if (!allowedGender.includes(gender)) {
        return next(
          Object.assign(new Error("Invalid gender"), {
            statusCode: 400,
          })
        );
      }

      if (gender !== employee.gender) {
        leaveUpdateRequired = true;
        employee.gender = gender;
      }
    }

   
    if (marital_status !== undefined) {
      const allowedStatus = ["single", "married", "divorced"];
      if (!allowedStatus.includes(marital_status)) {
        return next(
          Object.assign(new Error("Invalid marital status"), {
            statusCode: 400,
          })
        );
      }

      if (marital_status !== employee.marital_status) {
        leaveUpdateRequired = true;
        employee.marital_status = marital_status;
      }
    }

    if (profile_image !== undefined) {
      if (typeof profile_image === "string") {
        if (
          profile_image === "" ||
          profile_image.includes("api.dicebear.com")
        ) {
          employee.profile_image = profile_image;
        } else {
          return next(
            Object.assign(new Error("Invalid avatar format"), {
              statusCode: 400,
            })
          );
        }
      } else {
        return next(
          Object.assign(new Error("Profile image must be a string"), {
            statusCode: 400,
          })
        );
      }
    }

    employee.updatedAt = Date.now();

    await employee.save();

    if (leaveUpdateRequired) {
      const leave = await LeaveBalance.findOne({
        employee: employee._id,
      });

      if (leave) {
    
        leave.ML = 0;
        leave.PL = 0;

        if (
          employee.gender === "female" &&
          employee.marital_status === "married"
        ) {
          leave.ML = 182;
        }

        if (
          employee.gender === "male" &&
          employee.marital_status === "married"
        ) {
          leave.PL = 7;
        }

        await leave.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Employee profile updated successfully",
      employee: {
        _id: employee._id,
        f_name: employee.f_name,
        l_name: employee.l_name,
        work_email: employee.work_email,
        personal_contact: employee.personal_contact,
        e_contact: employee.e_contact,
        gender: employee.gender,
        marital_status: employee.marital_status,
        profile_image: employee.profile_image,
      },
    });

  } catch (error) {
    console.error("Employee profile update error:", error);
    return next(
      Object.assign(new Error(error.message), { statusCode: 500 })
    );
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
  editleave,
  deleteleave,
  resultofleaverequest,
  showannouncements,
  showparticlausannouncements,
  forgetpasswordloginbyotp,
  verifyOtp,
  resetPasswordafterforget,
  getallleave,
  getallleavehistory,
  getme,
  editprofileemployee,
};
