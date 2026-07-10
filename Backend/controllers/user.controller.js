const usermodel = require("../Models/user.model");
const Leave = require("../Models/leave.model");
const LeaveBalance = require("../Models/leavebalance.model");
const OtpModel = require("../Models/otpbasedlogin.model");
const generateOTP = require("../automatic/otpgenerator");
const { sendEmail } = require("../utils/nodemailer.utils");
const announcementmodel = require("../Models/announcement.model");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const Review = require("../Models/review.model");
const Attendance = require("../Models/attendance.model");
const Ticket = require("../Models/ticket.model");
const Adminmodel = require("../Models/Admin.model");
const SuperAdminModel = require("../Models/superadmin.model");
const Managermodel = require("../Models/manager.model");

const verifyUserEmail = async (req, res, next) => {
  const { token } = req.params;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res
      .status(400)
      .send(
        `<!DOCTYPE html><html><body style="margin:0;font-family:Segoe UI;background:#F9F8F2;display:flex;align-items:center;justify-content:center;height:100vh;"><div style="background:white;padding:40px;border-radius:12px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.1);max-width:400px;"><h1 style="color:#CD166E;">Link Invalid</h1><p style="color:#555;">This verification link is expired or invalid.</p><a href="${process.env.torchxsuite.com/talent}/login" style="margin-top:20px;display:inline-block;padding:12px 25px;background:#730042;color:white;text-decoration:none;border-radius:8px;">Go to Login</a></div></body></html>`,
      );
  }

  const user = await usermodel.findById(decoded.userid);
  if (!user)
    return res
      .status(404)
      .send(
        `<!DOCTYPE html><html><body style="margin:0;font-family:Segoe UI;background:#F9F8F2;display:flex;align-items:center;justify-content:center;height:100vh;"><div style="background:white;padding:40px;border-radius:12px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.1);max-width:400px;"><h1 style="color:#CD166E;">User Not Found</h1><p style="color:#555;">We couldn't find your account.</p></div></body></html>`,
      );

  if (user.isverified)
    return res
      .status(200)
      .send(
        `<!DOCTYPE html><html><body style="margin:0;font-family:Segoe UI;background:linear-gradient(135deg,#730042,#CD166E);height:100vh;display:flex;align-items:center;justify-content:center;"><div style="background:white;padding:50px 40px;border-radius:16px;text-align:center;box-shadow:0 15px 40px rgba(0,0,0,0.2);max-width:420px;width:90%;"><h1 style="color:#730042;">Already Verified</h1><p style="color:#555;font-size:15px;">Your email is already verified. Please login.</p><a href="${process.env.FRONTEND_URL}/login" style="margin-top:25px;display:inline-block;padding:14px 30px;background:#CD166E;color:white;text-decoration:none;border-radius:10px;font-weight:600;">Go to Login</a></div></body></html>`,
      );

  user.isverified = true;
  await user.save();
  res
    .status(200)
    .send(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head><body style="margin:0;font-family:Segoe UI,sans-serif;background:linear-gradient(135deg,#730042,#CD166E);height:100vh;display:flex;align-items:center;justify-content:center;"><div style="background:white;padding:50px 40px;border-radius:16px;text-align:center;box-shadow:0 15px 40px rgba(0,0,0,0.2);max-width:420px;width:90%;"><div style="width:70px;height:70px;margin:0 auto 20px;background:#F9F8F2;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;">✅</div><h1 style="color:#730042;margin-bottom:10px;">Email Verified!</h1><p style="color:#555;font-size:15px;line-height:1.6;">Your account has been successfully verified.</p><a href="${process.env.FRONTEND_URL}/login" style="margin-top:25px;display:inline-block;padding:14px 30px;background:#CD166E;color:white;text-decoration:none;border-radius:10px;font-weight:600;box-shadow:0 6px 16px rgba(205,22,110,0.3);">Go to Login →</a><p style="margin-top:20px;font-size:12px;color:#999;">Secure • Fast • Reliable</p></div></body></html>`,
    );
};

const userlogin = async (req, res, next) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return next(
      Object.assign(
        new Error("Email and password are required"),
        { statusCode: 400 }
      )
    );
  }

  const user = await usermodel.findOne({
    work_email: identifier.toLowerCase().trim(),
  });

  if (!user) {
    return next(
      Object.assign(
        new Error("User not found"),
        { statusCode: 404 }
      )
    );
  }

  // if (!user.isverified) {
  //   return next(
  //     Object.assign(
  //       new Error("Please verify your email before logging in"),
  //       { statusCode: 403 }
  //     )
  //   );
  // }

  if (user.working_status !== "working") {
    return next(
      Object.assign(
        new Error("Your account is not active. Please contact administrator."),
        { statusCode: 403 }
      )
    );
  }

  const isvalidpassword = await user.isValidPassword(password);

  if (!isvalidpassword) {
    return next(
      Object.assign(
        new Error("Invalid credentials"),
        { statusCode: 401 }
      )
    );
  }

  /*
   * Optional password setup link
   */
  let passwordSetupLink = null;

  if (user.isFirstLogin) {
    const resetToken = jwt.sign(
      {
        work_email: user.work_email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );

    passwordSetupLink =
      `https://corporation24x7-hrms.onrender.com/user/change-password?token=${resetToken}`;
  }

  const superAdmin = await SuperAdminModel.findOne({
    company_domain: user.work_email.split("@")[1].toLowerCase().trim(),
  });

  if (superAdmin) {
    const trialValid = superAdmin.isTrialValid();

    const hasTalentLicense = superAdmin.licenses.some(
      (l) =>
        l.product === "torchx_talent" &&
        l.isActive &&
        new Date(l.expiresAt) > new Date()
    );

    if (!trialValid && !hasTalentLicense) {
      return next(
        Object.assign(
          new Error(
            "Service stopped! Sorry for the inconvenience, please contact your administrator for further assistance."
          ),
          {
            statusCode: 403,
            code: "SERVICE_STOPPED",
          }
        )
      );
    }
  }

const token = jwt.sign(
  {
    _id: user._id,          // ← was "userId", now "_id" to match middleware
    id: user._id,           // ← keep both for compatibility
    userId: user._id,       // ← keep old one so nothing else breaks
    work_email: user.work_email,
    role: user.role,
    organisation_id: user.organisation_id,
    department: user.department ?? null,
    designation: user.designation ?? null,
    Under_manager: user.Under_manager ?? null,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "15d",
  }
);

  const isProduction =
    process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 15 * 24 * 60 * 60 * 1000,
  });

  usermodel.findByIdAndUpdate(
    user._id,
    {
      status: "active",
      last_login: new Date(),
    }
  ).exec();

  res.status(200).json({
    success: true,
    message: "Login successful",
    role: user.role,
    token
  });
};

const userlogout = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  usermodel.findByIdAndUpdate(req.employee._id, { status: "inactive" }).exec();
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  res.status(200).json({ success: true, message: "Logout successful" });
};

const changepassword = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { oldpassword, newpassword } = req.body;
  if (!oldpassword || !newpassword)
    return next(
      Object.assign(
        new Error("Current password and new password are required"),
        { statusCode: 400 },
      ),
    );
  if (oldpassword === newpassword)
    return next(
      Object.assign(
        new Error("New password must be different from current password"),
        { statusCode: 400 },
      ),
    );

  const user = await usermodel.findOne({
    _id: req.employee._id,
    organisation_id: req.employee.organisation_id,
  });
  if (!user)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );

  const isvalid = await user.isValidPassword(oldpassword);
  if (!isvalid)
    return next(
      Object.assign(new Error("Current password is incorrect"), {
        statusCode: 400,
      }),
    );

  user.password = newpassword;
  user.isFirstLogin = false;
  user.passwordupdatedAt = Date.now();
  await user.save();
  res
    .status(200)
    .json({ success: true, message: "Password updated successfully" });
};

const forgetpassword = async (req, res, next) => {
  const { work_email } = req.body;
  if (!work_email)
    return next(
      Object.assign(new Error("Email is required"), { statusCode: 400 }),
    );
  const user = await usermodel
    .findOne({ work_email })
    .select("_id f_name")
    .lean();
  if (!user)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );
  const otp = generateOTP();
  await OtpModel.findOneAndUpdate(
    { email: work_email },
    { otp: String(otp), expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    { upsert: true, new: true },
  );
  sendEmail({
    to: work_email,
    subject: "Password Reset OTP",
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#F9F8F2;font-family:'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1 style="margin:0;">Password Reset</h1></td></tr><tr><td style="padding:40px;color:#333;"><h2 style="color:#730042;">Hello ${user.f_name},</h2><p>Your password reset OTP is:</p><div style="text-align:center;margin:30px 0;"><span style="font-size:40px;font-weight:700;letter-spacing:10px;color:#730042;">${otp}</span></div><p style="text-align:center;color:#666;">Expires in <strong>5 minutes</strong>.</p></td></tr><tr><td style="background:#F9F8F2;padding:20px;text-align:center;font-size:12px;color:#888;">© 2026 HRMS Platform</td></tr></table></td></tr></table></body></html>`,
  });
  res.status(200).json({ success: true, message: "OTP sent to your email" });
};

const verifyOtp = async (req, res, next) => {
  try {
    const { work_email, otp } = req.body;

    if (!work_email || !otp) {
      return next(
        Object.assign(
          new Error("Email and OTP are required"),
          { statusCode: 400 }
        )
      );
    }

    const otpRecord = await OtpModel.findOne({
      email: work_email,
    });

    if (!otpRecord) {
      return next(
        Object.assign(
          new Error("OTP not found. Please request a new one"),
          { statusCode: 404 }
        )
      );
    }

    if (otpRecord.isExpired()) {
      await OtpModel.deleteOne({
        email: work_email,
      });

      return next(
        Object.assign(
          new Error("OTP has expired. Please request a new one"),
          { statusCode: 400 }
        )
      );
    }

    if (!otpRecord.compareOtp(String(otp))) {
      return next(
        Object.assign(
          new Error("Invalid OTP"),
          { statusCode: 400 }
        )
      );
    }

    const user = await usermodel.findOne({
      work_email,
    });

    if (!user) {
      return next(
        Object.assign(
          new Error("User not found"),
          { statusCode: 404 }
        )
      );
    }

    await OtpModel.deleteOne({
      email: work_email,
    });

    /*
     * Optional password setup link
     */
    let passwordSetupLink = null;

    if (user.isFirstLogin) {
      const resetToken = jwt.sign(
        {
          work_email: user.work_email,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "15m",
        }
      );

      passwordSetupLink =
        `https://corporation24x7-hrms.onrender.com/user/change-password?token=${resetToken}`;
    }

    const token = jwt.sign(
      {
        userId: user._id,
        work_email: user.work_email,
        role: user.role,
        organisation_id: user.organisation_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const isProduction =
      process.env.NODE_ENV === "production";

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    usermodel.findByIdAndUpdate(
      user._id,
      {
        status: "active",
        last_login: new Date(),
      }
    ).exec();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      role: user.role,
      isFirstLogin: user.isFirstLogin,

      canSetupPassword: user.isFirstLogin,
      passwordSetupLink,
    });
  } catch (error) {
    next(error);
  }
};

const resetpassword = async (req, res, next) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword)
    return next(
      Object.assign(new Error("Reset token and new password are required"), {
        statusCode: 400,
      }),
    );
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      Object.assign(new Error("Invalid or expired reset token"), {
        statusCode: 400,
      }),
    );
  }
  const user = await usermodel.findOne({ work_email: decoded.work_email });
  if (!user)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );
  user.password = newPassword;
  user.isFirstLogin = false;
  user.passwordupdatedAt = Date.now();
  await user.save();
  res
    .status(200)
    .json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });
};

const applyleave = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { leaveType, startDate, endDate, reason } = req.body;
  if (!leaveType || !startDate || !endDate || !reason)
    return next(
      Object.assign(
        new Error("leaveType, startDate, endDate and reason are required"),
        { statusCode: 400 },
      ),
    );

  const organisation_id = req.employee.organisation_id;

  const user = await usermodel
    .findOne({ _id: req.employee._id, organisation_id })
    .select("gender marital_status Under_manager")
    .lean();
  if (!user)
    return next(Object.assign(new Error("User not found"), { statusCode: 404 }));
  if (!user.Under_manager)
    return next(
      Object.assign(
        new Error("No reporting manager assigned. Cannot apply leave."),
        { statusCode: 400 },
      ),
    );

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start)
    return next(
      Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }),
    );
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (
    leaveType === "ml" &&
    (user.gender !== "female" || user.marital_status !== "married")
  )
    return next(
      Object.assign(new Error("Not eligible for maternity leave"), { statusCode: 400 }),
    );
  if (
    leaveType === "pl" &&
    (user.gender !== "male" || user.marital_status !== "married")
  )
    return next(
      Object.assign(new Error("Not eligible for paternity leave"), { statusCode: 400 }),
    );

  const overlapping = await Leave.findOne({
    employee: req.employee._id,
    organisation_id,
    status: {
      $nin: ["rejected_manager", "rejected_reporting_manager", "rejected_admin"],
    },
    startDate: { $lte: end },
    endDate: { $gte: start },
  })
    .select("_id")
    .lean();
  if (overlapping)
    return next(
      Object.assign(new Error("Leave already applied for these dates"), { statusCode: 400 }),
    );

  const leave = await Leave.create({
    organisation_id,
    employee: req.employee._id,
    manager: user.Under_manager,
    leaveType,
    startDate: start,
    endDate: end,
    days,
    reason,
    status: "pending_manager",
  });

  res.status(201).json({
    success: true,
    message: "Leave request submitted to your manager",
    leave,
  });
};

const editleave = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.employee.organisation_id;

  const leave = await Leave.findOne({
    _id: req.params.id,
    organisation_id,
    employee: req.employee._id,
  });
  if (!leave)
    return next(Object.assign(new Error("Leave not found"), { statusCode: 404 }));
  if (leave.status !== "pending_manager")
    return next(
      Object.assign(
        new Error("Cannot edit leave that is already processed or forwarded"),
        { statusCode: 400 },
      ),
    );

  const { leaveType, startDate, endDate, reason } = req.body;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start)
      return next(
        Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }),
      );
    leave.startDate = start;
    leave.endDate = end;
    leave.days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }
  if (leaveType) leave.leaveType = leaveType;
  if (reason) leave.reason = reason;
  await leave.save();
  res.status(200).json({ success: true, message: "Leave updated successfully", leave });
};

const deleteleave = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.employee.organisation_id;

  const leave = await Leave.findOne({
    _id: req.params.id,
    organisation_id,
    employee: req.employee._id,
  });
  if (!leave)
    return next(Object.assign(new Error("Leave not found"), { statusCode: 404 }));
  if (leave.status !== "pending_manager")
    return next(
      Object.assign(
        new Error("Cannot delete leave that is already processed or forwarded"),
        { statusCode: 400 },
      ),
    );

  await Leave.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: "Leave deleted successfully" });
};

const getallleave = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.employee.organisation_id;

  const leaveBalance = await LeaveBalance.findOne({
    employee: req.employee._id,
    organisation_id,
  }).lean();
  if (!leaveBalance)
    return next(Object.assign(new Error("Leave balance not found"), { statusCode: 404 }));
  res.status(200).json({
    success: true,
    EL: {
      entitled: leaveBalance.EL?.entitled || 0,
      accrued: leaveBalance.EL?.accrued || 0,
      availed: leaveBalance.EL?.availed || 0,
      available: Number(((leaveBalance.EL?.accrued || 0) - (leaveBalance.EL?.availed || 0)).toFixed(2)),
    },
    SL: {
      entitled: leaveBalance.SL?.entitled || 0,
      accrued: leaveBalance.SL?.accrued || 0,
      availed: leaveBalance.SL?.availed || 0,
      available: Number(((leaveBalance.SL?.accrued || 0) - (leaveBalance.SL?.availed || 0)).toFixed(2)),
    },
    ML: leaveBalance.ML || 0,
    PL: leaveBalance.PL || 0,
    pbc: leaveBalance.pbc || 0,
    lwp: leaveBalance.lwp || 0,
  });
};

const getallleavehistory = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.employee.organisation_id;

  const leaves = await Leave.find({
    employee: req.employee._id,
    organisation_id,
  })
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ success: true, count: leaves.length, leaves });
};



const showannouncements = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.employee.organisation_id;

  const announcements = await announcementmodel
    .find({ organisation_id, audience: { $in: ["employees", "all"] } })
    .sort({ createdAt: -1 })
    .lean();
  res
    .status(200)
    .json({ success: true, count: announcements.length, announcements });
};

const showparticularannouncement = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.employee.organisation_id;

  const announcement = await announcementmodel
    .findOne({ _id: req.params.id, organisation_id })
    .lean();
  if (!announcement)
    return next(
      Object.assign(new Error("Announcement not found"), { statusCode: 404 }),
    );
  if (!["employees", "all"].includes(announcement.audience))
    return next(Object.assign(new Error("Access denied"), { statusCode: 403 }));
  res.status(200).json({ success: true, announcement });
};

const getme = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.employee.organisation_id;

  const [employee, leavebalance, reviews] = await Promise.all([
    usermodel
      .findOne({ _id: req.employee._id, organisation_id })
      .populate({
        path: "Under_manager",
        select: "f_name l_name work_email role designation",
      })
      .select("-password -__v")
      .lean(),
    LeaveBalance.findOne({
      employee: req.employee._id,
      organisation_id,
    }).lean(),
    Review.find({
      reviewee: req.employee._id,
      revieweeRoleModel: "User",
      organisation_id,
    })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      .lean(),
  ]);

  if (!employee)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );

  res.status(200).json({ success: true, employee, leavebalance, reviews });
};

const editprofile = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.employee.organisation_id;

  const employee = await usermodel.findOne({
    _id: req.employee._id,
    organisation_id,
  });
  if (!employee)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );

  const { personal_contact, e_contact, marital_status, profile_image, gender } =
    req.body;
  let leaveUpdateRequired = false;

  if (personal_contact !== undefined)
    employee.personal_contact = personal_contact;
  if (e_contact !== undefined) employee.e_contact = e_contact;
  if (gender !== undefined) {
    if (!["male", "female"].includes(gender))
      return next(
        Object.assign(new Error("Invalid gender"), { statusCode: 400 }),
      );
    if (gender !== employee.gender) {
      leaveUpdateRequired = true;
      employee.gender = gender;
    }
  }
  if (marital_status !== undefined) {
    if (!["single", "married", "divorced"].includes(marital_status))
      return next(
        Object.assign(new Error("Invalid marital status"), { statusCode: 400 }),
      );
    if (marital_status !== employee.marital_status) {
      leaveUpdateRequired = true;
      employee.marital_status = marital_status;
    }
  }
  if (profile_image !== undefined) {
    if (typeof profile_image !== "string")
      return next(
        Object.assign(new Error("Profile image must be a string"), {
          statusCode: 400,
        }),
      );
    if (profile_image !== "" && !profile_image.includes("api.dicebear.com"))
      return next(
        Object.assign(new Error("Invalid avatar format"), { statusCode: 400 }),
      );
    employee.profile_image = profile_image;
  }

  employee.updatedAt = Date.now();
  await employee.save();

  if (leaveUpdateRequired) {
    const leave = await LeaveBalance.findOne({
      employee: employee._id,
      organisation_id,
    });
    if (leave) {
      leave.ML =
        employee.gender === "female" && employee.marital_status === "married"
          ? 182
          : 0;
      leave.PL =
        employee.gender === "male" && employee.marital_status === "married"
          ? 7
          : 0;
      await leave.save();
    }
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
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
};

const getattendance = async (req, res, next) => {
  if (!req.employee)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const organisation_id = req.employee.organisation_id;

  const attendance = await Attendance.find({
    employee: req.employee._id,
    organisation_id,
  })
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ success: true, count: attendance.length, attendance });
};

const employeeSubmitTicket = async (req, res, next) => {
  try {
    if (!req.employee)
      return res.status(401).json({ message: "Not authenticated" });

    const organisation_id = req.employee.organisation_id;

    const {
      type,
      category,
      subCategory,
      title,
      description,
      incidentDate,
      incidentLocation,
      witnessNames,
      severity,
      isAnonymous,
      againstId,
      againstModel,
      attachments,
    } = req.body;

    const ticket = await Ticket.create({
      organisation_id,
      type,
      category,
      subCategory,
      title,
      description,
      incidentDate,
      incidentLocation,
      witnessNames: witnessNames || [],
      severity: severity || "medium",
      isAnonymous: isAnonymous || false,
      submittedBy: isAnonymous ? null : req.employee._id,
      submitterModel: isAnonymous ? null : "User",
      submitterDept: req.employee.department,
      submitterRole: "employee",
      against: againstId || undefined,
      againstModel: againstModel || undefined,
      attachments: attachments || [],
    });

    res.status(201).json({
      success: true,
      message: "Ticket submitted successfully.",
      ticket: {
        ticketNumber: ticket.ticketNumber,
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

const employeeGetMyTickets = async (req, res, next) => {
  try {
    if (!req.employee)
      return res.status(401).json({ message: "Not authenticated" });

    const organisation_id = req.employee.organisation_id;

    const tickets = await Ticket.find({
      submittedBy: req.employee._id,
      organisation_id,
      isDeleted: false,
    })
      .select("-timeline -internalNotes -statusHistory")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: tickets.length, tickets });
  } catch (err) {
    next(err);
  }
};

const employeeRateTicket = async (req, res, next) => {
  try {
    if (!req.employee)
      return res.status(401).json({ message: "Not authenticated" });

    const { ticketNumber } = req.params;
    const { rating, feedback } = req.body;
    const organisation_id = req.employee.organisation_id;

    const ticket = await Ticket.findOne({
      ticketNumber,
      submittedBy: req.employee._id,
      organisation_id,
    });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (!["resolved", "closed"].includes(ticket.status))
      return res
        .status(400)
        .json({ message: "Can only rate resolved or closed tickets" });
    if (ticket.submitterRating)
      return res
        .status(400)
        .json({ message: "You have already rated this ticket" });

    ticket.submitterRating = rating;
    ticket.submitterFeedback = feedback;
    ticket.ratedAt = new Date();
    ticket.timeline.push({
      action: "rating_submitted",
      note: `Submitter rated resolution ${rating}/5.`,
      byModel: "System",
      byName: "Submitter",
    });
    await ticket.save();

    res.json({ success: true, message: "Rating submitted. Thank you." });
  } catch (err) {
    next(err);
  }
};

const employeeGetTicketDetail = async (req, res, next) => {
  try {
    if (!req.employee)
      return res.status(401).json({ message: "Not authenticated" });

    const { ticketNumber } = req.params;
    const organisation_id = req.employee.organisation_id;

    const ticket = await Ticket.findOne({
      ticketNumber,
      submittedBy: req.employee._id,
      organisation_id,
      isDeleted: false,
    })
      .populate(
        "submittedBy",
        "f_name l_name work_email department designation",
      )
      .populate("against", "f_name l_name work_email department designation")
      .select("-internalNotes")
      .lean();

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    res.json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};


const getOrgInfo = async (req, res, next) => {
  try {
    if (!req.employee)
      return res.status(401).json({ success: false, message: "Unauthorized" });
 
    const organisation_id = req.employee.organisation_id;
 
    const superAdmin = await SuperAdminModel.findById(organisation_id)
      .select("f_name l_name email organisation_name profile_image")
      .lean();
 
    const admins = await Adminmodel.find({ organisation_id, working_status: "working" })
      .select("f_name l_name work_email designation")
      .lean();
 
    const managers = await Managermodel.find({ organisation_id, working_status: "working" })
      .select(
        "f_name l_name work_email designation department office_location reporting_manager reporting_manager_model"
      )
      .lean();
 
    const employees = managers.length
      ? await usermodel
          .find({
            Under_manager: { $in: managers.map((m) => m._id) },
            organisation_id,
            working_status: "working",
          })
          .select(
            "f_name l_name work_email designation department office_location Under_manager"
          )
          .lean()
      : [];
 
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
        isCurrentUserManager:
          req.employee.Under_manager?.toString() === mgr._id.toString(),
        employees: employees
          .filter((emp) => emp.Under_manager?.toString() === mgr._id.toString())
          .map((emp) => ({
            id: emp._id,
            name: `${emp.f_name} ${emp.l_name}`,
            email: emp.work_email,
            designation: emp.designation,
            department: emp.department,
            isCurrentUser:
              emp._id.toString() === req.employee._id.toString(),
          })),
        subManagers: buildManagerTreeWithCurrentFlags(
          managers,
          mgr._id,
          "Manager",
          employees,
          null,
          req.employee._id
        ),
      }));
 
    return res.status(200).json({
      success: true,
      organisation_name: superAdmin?.organisation_name || "",
      organisation_logo: superAdmin?.profile_image || null,
      super_admin: superAdmin
        ? {
            id: superAdmin._id,
            name: `${superAdmin.f_name} ${superAdmin.l_name}`,
            email: superAdmin.email,
          }
        : null,
      admin: admins[0]
        ? {
            id: admins[0]._id,
            name: `${admins[0].f_name} ${admins[0].l_name}`,
            email: admins[0].work_email,
            designation: admins[0].designation,
          }
        : null,
      managers: topLevelManagers,
      currentUserId: req.employee._id,
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

const showPasswordPage = (req, res) => {
  const { token } = req.query;

  res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        <h2>Set Password</h2>

        <form
          action="/talent/api/user/firstloginpasswordchange"
          method="POST"
        >
          <input
            type="hidden"
            name="token"
            value="${token}"
          />

          <input
            type="password"
            name="newPassword"
            placeholder="Enter New Password"
            required
          />

          <button type="submit">
            Update Password
          </button>
        </form>
      </body>
    </html>
  `);
};

const firstLoginPasswordChange = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return next(
        Object.assign(
          new Error("Token and password are required"),
          {
            statusCode: 400,
          }
        )
      );
    }

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (err) {
      return next(
        Object.assign(
          new Error("Invalid or expired link"),
          {
            statusCode: 400,
          }
        )
      );
    }

    const user = await usermodel.findOne({
      work_email: decoded.work_email,
    });

    if (!user) {
      return next(
        Object.assign(
          new Error("User not found"),
          {
            statusCode: 404,
          }
        )
      );
    }

    user.password = newPassword;
    user.isFirstLogin = false;
    user.passwordupdatedAt = new Date();

    await user.save();

    return res.send(`
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Password Updated Successfully</h2>

          <p>
            You can now continue using your account.
          </p>
        </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
};

const sendPasswordSetupLink = async (req, res, next) => {
  try {
    const user = await usermodel.findById(req.user.userId);

    if (!user) {
      return next(
        Object.assign(new Error("User not found"), {
          statusCode: 404,
        })
      );
    }

    const resetToken = jwt.sign(
      {
        work_email: user.work_email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );

    const passwordLink =
      `${process.env.BASE_URL}talent/api/user/change-password?token=${resetToken}`;

    await sendEmail({
      to: user.work_email,
      subject: "Set Your Password",
      html: `
        <h2>Hello ${user.f_name},</h2>

        <p>Please click the button below to set your password.</p>

        <a href="${passwordLink}"
           style="
             display:inline-block;
             padding:12px 24px;
             background:#730042;
             color:#ffffff;
             text-decoration:none;
             border-radius:8px;
           ">
          Set Password
        </a>

        <p>This link expires in 15 minutes.</p>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Password setup link sent successfully.",
    });
  } catch (error) {
    next(error);
  }
};


const Document = require("../Models/document.model");

const getExpenseDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({
      organisation_id: req.employee.organisation_id,
      uploader: req.employee._id,
      uploaderModel: "User",
      fileType: "expense",
    }).sort({ uploadedAt: -1 });

    return res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

const getPersonalDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({
      organisation_id: req.employee.organisation_id,
      uploader: req.employee._id,
      uploaderModel: "User",
      fileType: "personal",
    }).sort({ uploadedAt: -1 });

    return res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  verifyUserEmail,
  userlogin,
  userlogout,
  changepassword,
  forgetpassword,
  verifyOtp,
  resetpassword,
  applyleave,
  editleave,
  deleteleave,
  getallleave,
  getallleavehistory,
  showannouncements,
  showparticularannouncement,
  getme,
  editprofile,
  getattendance,
  employeeSubmitTicket,
  employeeGetMyTickets,
  employeeRateTicket,
  employeeGetTicketDetail,
  getOrgInfo,
  firstLoginPasswordChange,
  showPasswordPage,
  sendPasswordSetupLink,
  getExpenseDocuments,
  getPersonalDocuments
};