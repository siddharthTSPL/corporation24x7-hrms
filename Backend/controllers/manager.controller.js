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
const managerLeaveModel = require("../Models/maleave.model");

require("dotenv").config();

const verifyManagerEmail = async (req, res, next) => {
  const { token } = req.params;

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <body style="margin:0; font-family:Segoe UI; background:#F9F8F2; display:flex; align-items:center; justify-content:center; height:100vh;">
        
        <div style="background:white; padding:40px; border-radius:14px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.1); max-width:420px;">
          
          <h1 style="color:#CD166E;">❌ Invalid Link</h1>
          <p style="color:#555;">This verification link is expired or invalid.</p>

          <a href="http://localhost:3000/login" style="
            display:inline-block;
            margin-top:20px;
            padding:12px 25px;
            background:#730042;
            color:white;
            text-decoration:none;
            border-radius:8px;
          ">
            Go to Login
          </a>

        </div>

      </body>
      </html>
    `);
  }

  const manager = await managermodel.findById(decoded.managerid);

  if (!manager) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <body style="margin:0; font-family:Segoe UI; background:#F9F8F2; display:flex; align-items:center; justify-content:center; height:100vh;">
        
        <div style="background:white; padding:40px; border-radius:14px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.1); max-width:420px;">
          
          <h1 style="color:#CD166E;">⚠️ Manager Not Found</h1>
          <p style="color:#555;">We couldn’t find your account.</p>

        </div>

      </body>
      </html>
    `);
  }

  manager.isVerified = true;
  await manager.save();

  // ✅ SUCCESS UI
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    </head>

    <body style="
      margin:0;
      font-family:Segoe UI, sans-serif;
      background:linear-gradient(135deg,#730042,#CD166E);
      height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
    ">

      <div style="
        background:white;
        padding:50px 40px;
        border-radius:16px;
        text-align:center;
        box-shadow:0 15px 40px rgba(0,0,0,0.2);
        max-width:420px;
        width:90%;
      ">

        <!-- Icon -->
        <div style="
          width:70px;
          height:70px;
          margin:0 auto 20px;
          background:#F9F8F2;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:30px;
        ">
          🎉
        </div>

        <h1 style="color:#730042; margin-bottom:10px;">
          Manager Verified!
        </h1>

        <p style="color:#555; font-size:15px; line-height:1.6;">
          Your manager account has been successfully verified.  
          You now have full access to manage your team and dashboard.
        </p>

        <a href="http://localhost:3000/login" style="
          margin-top:25px;
          display:inline-block;
          padding:14px 30px;
          background:#CD166E;
          color:white;
          text-decoration:none;
          border-radius:10px;
          font-weight:600;
          box-shadow:0 6px 16px rgba(205,22,110,0.3);
        ">
          Go to Dashboard →
        </a>

        <p style="margin-top:20px; font-size:12px; color:#999;">
          Secure • Scalable • Modern SaaS
        </p>

      </div>

    </body>
    </html>
  `);
};

const managerlogin = async (req, res, next) => {
  const { work_email, password } = req.body;

  if (!work_email || !password) {
    return next(
      Object.assign(new Error("Email and password are required"), {
        statusCode: 400,
      }),
    );
  }

  const manager = await managermodel.findOne({ work_email });

  if (!manager) {
    return next(
      Object.assign(new Error("Invalid credentials"), { statusCode: 401 }),
    );
  }

  const isValidPassword = await manager.isValidPassword(password);

  if (!isValidPassword) {
    return next(
      Object.assign(new Error("Invalid credentials"), { statusCode: 401 }),
    );
  }

  if (!manager.isVerified) {
    return next(
      Object.assign(new Error("Please verify your email before login"), {
        statusCode: 400,
      }),
    );
  }

  if (manager.isFirstLogin) {
    const resetToken = jwt.sign(
      { work_email: manager.work_email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
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
      `,
    });

    return next(
      Object.assign(
        new Error("First login detected. Check your email to set password."),
        { statusCode: 403 },
      ),
    );
  }

  const token = jwt.sign(
    {
      managerid: manager._id,
      work_email: manager.work_email,
      role: manager.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15d" },
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 15 * 24 * 60 * 60 * 1000,
  });

  manager.status = "active";
  await manager.save();

  res.status(200).json({
    message: "Manager login successful",
    role: manager.role,
    token
  });
};

const managerlogout = async (req, res, next) => {
  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  await managermodel.findByIdAndUpdate(req.manager._id, { status: "inactive" });

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });

  res.status(200).json({
    message: "Manager logout successful",
  });
};

const showPasswordPage = (req, res) => {
  const token = req.query.token;

  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Set Password</title>
  </head>

  <body style="
    margin:0;
    font-family:Segoe UI, sans-serif;
    background:linear-gradient(135deg,#730042,#CD166E);
    height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
  ">

    <div style="
      background:white;
      padding:40px;
      border-radius:16px;
      box-shadow:0 15px 40px rgba(0,0,0,0.2);
      width:100%;
      max-width:400px;
    ">

      <!-- Title -->
      <h1 style="text-align:center; color:#730042; margin-bottom:10px;">
        🔐 Set Your Password
      </h1>

      <p style="text-align:center; color:#666; font-size:14px; margin-bottom:25px;">
        Create a strong password to secure your account
      </p>

      <!-- Form -->
      <form action="/manager/firstloginpasswordchange" method="POST">

        <input type="hidden" name="token" value="${token}" />

        <!-- Password Input -->
        <div style="margin-bottom:20px;">
          <input 
            type="password" 
            name="newpassword" 
            placeholder="Enter new password"
            required
            style="
              width:100%;
              padding:12px;
              border-radius:8px;
              border:1px solid #ddd;
              font-size:14px;
              outline:none;
            "
          />
        </div>

        <!-- Button -->
        <button type="submit" style="
          width:100%;
          padding:12px;
          background:#CD166E;
          color:white;
          border:none;
          border-radius:8px;
          font-size:15px;
          font-weight:600;
          cursor:pointer;
          box-shadow:0 6px 16px rgba(205,22,110,0.3);
        ">
          Update Password
        </button>

      </form>

      <!-- Tips -->
      <p style="margin-top:20px; font-size:12px; color:#999; text-align:center;">
        Use at least 8 characters with numbers & symbols
      </p>

    </div>

  </body>
  </html>
  `);
};

const managerFirstLoginPasswordChange = async (req, res, next) => {
  const { token, newpassword } = req.body;

  if (!token) {
    return next(Object.assign(new Error("Token missing"), { statusCode: 401 }));
  }

  if (!newpassword) {
    return next(
      Object.assign(new Error("New password is required"), { statusCode: 400 }),
    );
  }

  const decode = jwt.verify(token, process.env.JWT_SECRET);

  const manager = await managermodel.findOne({
    work_email: decode.work_email,
  });

  if (!manager) {
    return next(
      Object.assign(new Error("Manager not found"), { statusCode: 404 }),
    );
  }

  if (!manager.isFirstLogin) {
    return next(
      Object.assign(new Error("Password already updated"), { statusCode: 400 }),
    );
  }

  manager.password = newpassword;
  manager.isFirstLogin = false;
  manager.updatedAt = Date.now();

  await manager.save();

  res.status(200).json({
    message: "Password updated successfully",
  });
};

const managerUpdatePassword = async (req, res, next) => {
  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const { oldpassword, newpassword } = req.body;

  if (!oldpassword || !newpassword) {
    return next(
      Object.assign(new Error("Old password and new password are required"), {
        statusCode: 400,
      }),
    );
  }

  const manager = req.manager;

  const isvalid = await manager.isValidPassword(oldpassword);

  if (!isvalid) {
    return next(
      Object.assign(new Error("Old password is incorrect"), {
        statusCode: 400,
      }),
    );
  }

  if (oldpassword === newpassword) {
    return next(
      Object.assign(
        new Error("New password must be different from old password"),
        { statusCode: 400 },
      ),
    );
  }

  manager.password = newpassword;
  manager.passwordUpdatedAt = Date.now();

  await manager.save();

  res.status(200).json({
    message: "Password updated successfully",
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
      "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt",
    );

  if (!users || users.length === 0) {
    return next(
      Object.assign(new Error("No users found under this manager"), {
        statusCode: 404,
      }),
    );
  }

  res.status(200).json(users);
};

const viewallleaves = async (req, res, next) => {
  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const managerId = req.manager._id;

  const leaves = await leavemodel
    .find({ manager: managerId })
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
    return next(
      Object.assign(new Error("Leave ID is required"), { statusCode: 400 }),
    );
  }

  const leave = await leavemodel.findById(leaveId);

  if (!leave) {
    return next(
      Object.assign(new Error("Leave not found"), { statusCode: 404 }),
    );
  }

  if (
    leave.status.startsWith("approved") ||
    leave.status.startsWith("rejected")
  ) {
    return next(
      Object.assign(new Error("Leave already processed"), { statusCode: 400 }),
    );
  }

  const leaveBalance = await LeaveBalance.findOne({
    employee: leave.employee,
  });

  if (!leaveBalance) {
    return next(
      Object.assign(new Error("Leave balance not found"), { statusCode: 404 }),
    );
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
    return next(
      Object.assign(new Error("Leave ID is required"), { statusCode: 400 }),
    );
  }

  const leave = await leavemodel.findById(leaveId);

  if (!leave) {
    return next(
      Object.assign(new Error("Leave not found"), { statusCode: 404 }),
    );
  }

  if (
    leave.status.startsWith("approved") ||
    leave.status.startsWith("rejected")
  ) {
    return next(
      Object.assign(new Error("Leave already processed"), { statusCode: 400 }),
    );
  }

  leave.status = "rejected_manager";
  leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await leave.save();

  res.status(200).json({
    message: "Leave rejected successfully",
    leave,
  });
};

const forwardedtoadmin = async (req, res, next) => {
  const { leaveId } = req.body;

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  if (!leaveId) {
    return next(
      Object.assign(new Error("Leave ID is required"), { statusCode: 400 }),
    );
  }

  const leave = await leavemodel.findById(leaveId);

  if (!leave) {
    return next(
      Object.assign(new Error("Leave not found"), { statusCode: 404 }),
    );
  }

  if (
    leave.status.startsWith("approved") ||
    leave.status.startsWith("rejected")
  ) {
    return next(
      Object.assign(new Error("Leave already processed"), { statusCode: 400 }),
    );
  }

  leave.status = "forwarded_admin";

  await leave.save();

  res.status(200).json({
    message: "Leave forwarded to admin successfully",
    leave,
  });
};



const applyleavem = async (req, res, next) => {
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  if (!startDate || !endDate || !leaveType) {
    return next(
      Object.assign(new Error("Required fields missing"), { statusCode: 400 })
    );
  }

  const managerId = req.manager._id;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    return next(
      Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 })
    );
  }

  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const overlapping = await managerLeaveModel.findOne({ // ← use new model
    manager: managerId,
    status: { $nin: ["rejected_admin"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });

  if (overlapping) {
    return next(
      Object.assign(new Error("Leave already applied for these dates"), { statusCode: 400 })
    );
  }

  const leave = new managerLeaveModel({ // ← use new model
    manager: managerId,
    leaveType,
    startDate: start,
    endDate: end,
    days,
    reason,
    status: "pending_admin",
  });

  await leave.save();

  res.status(200).json({
    message: "Leave request submitted to admin",
    leave,
  });
};

const showannouncements = async (req, res, next) => {
  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const announcements = await announcementmodel.find({
    audience: { $in: ["managers", "all"] },
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
    return next(
      Object.assign(new Error("Announcement not found"), { statusCode: 404 }),
    );
  }
  if (announcement.audience !== "managers" && announcement.audience !== "all") {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }
  return res.status(200).json({
    success: true,
    announcement,
  });
};
const getAllPersonalDocuments = async (req, res, next) => {
  try {
    if (!req.manager) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      );
    }

    const employees = await usermodel
      .find({
        Under_manager: req.manager._id,
      })
      .select("_id");

    const employeeIds = employees.map((emp) => emp._id);

    const documents = await Document.find({
      employee: { $in: employeeIds },
      fileType: "personal",
    })
      .populate("employee", "f_name l_name work_email personal_contact")
      .sort({ createdAt: -1 });
     
       if (documents.length === 0) {
      return res.status(200).json({
        message: "No expense documents found",
        total: 0,
        documents: [],
      });
    }

    if (!documents.length) {
      return next(
        Object.assign(new Error("No personal documents found"), {
          statusCode: 404,
        }),
      );
    }

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
        employee: {
          id: doc.employee._id,
          name: `${doc.employee.f_name} ${doc.employee.l_name}`,
          email: doc.employee.work_email,
          contact: doc.employee.personal_contact,
        },
      })),
    });
  } catch (error) {
    next(error);
  }
};
const getAllExpenseDocuments = async (req, res, next) => {
  try {
    if (!req.manager) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      );
    }

    const employees = await usermodel
      .find({
        Under_manager: req.manager._id,
      })
      .select("_id");

    const employeeIds = employees.map((emp) => emp._id);

    const documents = await Document.find({
      employee: { $in: employeeIds },
      fileType: "expense",
    })
      .populate("employee", "f_name l_name work_email personal_contact")
      .sort({ createdAt: -1 });
    if (documents.length === 0) {
      return res.status(200).json({
        message: "No expense documents found",
        total: 0,
        documents: [],
      });
    }
    if (!documents.length) {
      return next(
        Object.assign(new Error("No expense documents found"), {
          statusCode: 404,
        }),
      );
    }

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
        employee: {
          id: doc.employee._id,
          name: `${doc.employee.f_name} ${doc.employee.l_name}`,
          email: doc.employee.work_email,
          contact: doc.employee.personal_contact,
        },
      })),
    });
  } catch (error) {
    next(error);
  }
};
const getDocumentDetails = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    console.log(documentId);
    if (!req.manager) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      );
    }

    const document = await Document.findById(documentId).populate(
      "employee",
      "f_name l_name work_email personal_contact Under_manager",
    );

    if (!document) {
      return next(
        Object.assign(new Error("Document not found"), { statusCode: 404 }),
      );
    }

    // Security check
    if (
      document.employee.Under_manager.toString() !== req.manager._id.toString()
    ) {
      return next(
        Object.assign(new Error("Not authorized"), { statusCode: 403 }),
      );
    }

    // Mark as viewed
    document.viewedByManager = true;
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
        employee: {
          id: document.employee._id,
          name: `${document.employee.f_name} ${document.employee.l_name}`,
          email: document.employee.work_email,
          contact: document.employee.personal_contact,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const forgetpasswordloginbyotp = async (req, res, next) => {
  const { work_email } = req.body;

  if (!work_email) {
    return next(
      Object.assign(new Error("Email is required"), { statusCode: 400 }),
    );
  }

  const manager = await managermodel.findOne({ work_email });

  if (!manager) {
    return next(
      Object.assign(new Error("Manager not found"), { statusCode: 404 }),
    );
  }

  const otp = generateOTP();

  await OtpModel.findOneAndUpdate(
    { email: work_email },
    { otp, createdAt: Date.now() },
    { upsert: true, new: true },
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
    return next(
      Object.assign(new Error("Email and OTP are required"), {
        statusCode: 400,
      }),
    );
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
    return next(
      Object.assign(new Error("Manager not found"), { statusCode: 404 }),
    );
  }

  const token = jwt.sign(
    {
      managerid: manager._id,
      work_email: manager.work_email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  res.cookie("token", token, { httpOnly: true });

  const resetToken = jwt.sign(
    { work_email: manager.work_email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
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
    return next(
      Object.assign(new Error("New password is required"), { statusCode: 400 }),
    );
  }

  let decode;

  try {
    decode = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(
      Object.assign(new Error("Invalid or expired token"), { statusCode: 400 }),
    );
  }

  const manager = await managermodel.findOne({
    work_email: decode.work_email,
  });

  if (!manager) {
    return next(
      Object.assign(new Error("Manager not found"), { statusCode: 404 }),
    );
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
      }),
    );
  }

  res.status(200).json(leaves);
};

const reviewtoemployee = async (req, res, next) => {
  if (!req.manager) {
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  }

  const { employeeid, rating, comment } = req.body;

  if (!rating || !comment) {
    return next(
      Object.assign(new Error("Rating and comment are required"), { statusCode: 400 })
    );
  }

  const manager = req.manager;

  const employee = await usermodel.findOne({
    _id: employeeid,
    Under_manager: manager._id,
  });

  if (!employee) {
    return next(
      Object.assign(new Error("Employee not found under your management"), { statusCode: 404 })
    );
  }

  
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  try {
   const review = await Review.create({
  reviewerRole: manager.role,    
  reviewer: manager._id,
  reviewerRoleModel: "Manager",   
  revieweeRole: "employee",       
  reviewee: employee._id,
  revieweeRoleModel: "User",      
  rating,
  comment,
  monthYear,
});

    res.status(201).json({
      message: "Employee reviewed successfully",
      review,
    });

  } catch (err) {
    if (err.code === 11000) {
      return next(
        Object.assign(
          new Error("You have already reviewed this employee this month. You can submit again next month."),
          { statusCode: 400 }
        )
      );
    }
    next(err);
  }
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

const editprofilemanager = async (req, res, next) => {
  try {
    if (!req.manager) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      );
    }

    const manager = req.manager;

    const {
      personal_contact,
      e_contact,
      marital_status,
      profile_image,
      office_location,
      designation,
      gender,
    } = req.body;

    let leaveUpdateRequired = false;

    if (personal_contact !== undefined) {
      manager.personal_contact = personal_contact;
    }

    if (e_contact !== undefined) {
      manager.e_contact = e_contact;
    }

    if (designation !== undefined) {
      manager.designation = designation;
    }
    if (gender !== undefined) {
      const allowedGender = ["male", "female"];
      if (!allowedGender.includes(gender)) {
        return next(
          Object.assign(new Error("Invalid gender"), {
            statusCode: 400,
          }),
        );
      }

      if (gender !== manager.gender) {
        leaveUpdateRequired = true;
        manager.gender = gender;
      }
    }

    if (marital_status !== undefined) {
      const allowedStatus = ["single", "married", "divorced"];
      if (!allowedStatus.includes(marital_status)) {
        return next(
          Object.assign(new Error("Invalid marital status"), {
            statusCode: 400,
          }),
        );
      }

      if (marital_status !== manager.marital_status) {
        leaveUpdateRequired = true;
        manager.marital_status = marital_status;
      }
    }

    if (office_location !== undefined) {
      const allowedLocations = ["Noida", "Bareilly", "Delhi", "Mumbai"];
      if (!allowedLocations.includes(office_location)) {
        return next(
          Object.assign(new Error("Invalid office location"), {
            statusCode: 400,
          }),
        );
      }
      manager.office_location = office_location;
    }

    if (profile_image !== undefined) {
      if (typeof profile_image === "string") {
        if (
          profile_image === "" ||
          profile_image.includes("api.dicebear.com")
        ) {
          manager.profile_image = profile_image;
        } else {
          return next(
            Object.assign(new Error("Invalid avatar format"), {
              statusCode: 400,
            }),
          );
        }
      } else {
        return next(
          Object.assign(new Error("Profile image must be a string"), {
            statusCode: 400,
          }),
        );
      }
    }

    manager.updatedAt = Date.now();

    await manager.save();

    if (leaveUpdateRequired) {
      const leave = await LeaveBalance.findOne({
        employee: manager._id,
      });

      if (leave) {
        leave.ML = 0;
        leave.PL = 0;

        if (
          manager.gender === "female" &&
          manager.marital_status === "married"
        ) {
          leave.ML = 182;
        }

        if (manager.gender === "male" && manager.marital_status === "married") {
          leave.PL = 7;
        }

        await leave.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Manager profile updated successfully",
      manager: {
        _id: manager._id,
        f_name: manager.f_name,
        l_name: manager.l_name,
        work_email: manager.work_email,
        personal_contact: manager.personal_contact,
        e_contact: manager.e_contact,
        gender: manager.gender,
        marital_status: manager.marital_status,
        office_location: manager.office_location,
        designation: manager.designation,
        profile_image: manager.profile_image,
        role: manager.role,
      },
    });
  } catch (error) {
    console.error("Manager profile update error:", error);
    return next(Object.assign(new Error(error.message), { statusCode: 500 }));
  }
};

const changepassword = async (req, res, next) => {
  try {
    const managerId = req.manager.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const manager = await managermodel.findById(managerId);

    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    const isMatch = await manager.isValidPassword(oldPassword);

    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    manager.password = newPassword;
    await manager.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};


const getattendance = async (req, res, next) => {
  try {
    if (!req.manager) {
      return next(
        Object.assign(new Error("Unauthorized"), { statusCode: 401 })
      );
    }

    const manager = req.manager;

    const attendance = await Attendance.find({
      employee: manager._id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyManagerEmail,
  managerlogin,
  managerlogout,
  showPasswordPage,
  managerFirstLoginPasswordChange,
  managerUpdatePassword,
  userunderme,
  viewallleaves,
  acceptleaverequest,
  rejectleaverequest,
  forwardedtoadmin,
  showannouncements,
  particularannouncement,
  getAllExpenseDocuments,
  getAllPersonalDocuments,
  getDocumentDetails,
  forgetpasswordloginbyotp,
  showPasswordPageotp,
  verifyManagerOtp,
  resetManagerPassword,
  getmyleaves,
  applyleavem,
  reviewtoemployee,
  getme,
  changepassword,
  editprofilemanager,
  getattendance,
};
