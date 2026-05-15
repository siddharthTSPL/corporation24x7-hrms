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

const EXCLUDE =
  "-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt";

const verifyAdmin = async (req, res, next) => {
  const { token } = req.params;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      Object.assign(new Error("Invalid or expired token"), { statusCode: 400 }),
    );
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
    return next(
      Object.assign(new Error("All fields are required"), { statusCode: 400 }),
    );
  const admin = await Adminmodel.findOne({ work_email: identifier });
  if (!admin)
    return next(
      Object.assign(new Error("Admin not found"), { statusCode: 404 }),
    );
  if (!admin.isVerified)
    return next(
      Object.assign(new Error("Please verify your email before logging in"), {
        statusCode: 403,
      }),
    );
  if (admin.status === "suspended")
    return next(
      Object.assign(
        new Error("Your account has been suspended. Contact super admin."),
        { statusCode: 403 },
      ),
    );
  const isMatch = await admin.isValidPassword(password);
  if (!isMatch)
    return next(
      Object.assign(new Error("Invalid credentials"), { statusCode: 401 }),
    );
  const token = jwt.sign(
    {
      adminid: admin._id,
      role: admin.role,
      email: admin.work_email,
      created_by: admin.created_by,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15d" },
  );
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 15 * 24 * 60 * 60 * 1000,
  });
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
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
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
    reporting_manager,
  } = req.body;
  if (!f_name || !work_email || !password || !department)
    return next(
      Object.assign(new Error("Required fields missing"), { statusCode: 400 }),
    );
  const existingManager = await Managermodel.findOne({ work_email })
    .select("_id")
    .lean();
  if (existingManager)
    return next(
      Object.assign(new Error("Manager already exists"), { statusCode: 400 }),
    );
  const uid = await generateUID(department);
  const newmanager = await Managermodel.create({
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
    reporting_manager: reporting_manager || null,
  });
  const token = jwt.sign(
    { managerid: newmanager._id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
  const verifyLink = `${process.env.BASE_URL}/manager/verify/${token}`;
  Promise.all([
    assignDefaultLeave(newmanager),
    sendEmail({
      to: work_email,
      subject: "Activate Your Manager Account",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" style="background:#fff;border-radius:14px;overflow:hidden;"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1 style="margin:0;">Manager Onboarding</h1></td></tr><tr><td style="padding:40px;color:#333;"><h2 style="color:#730042;">Hi ${f_name},</h2><p>Your <strong>Manager Account</strong> has been created.</p><div style="background:#F9F8F2;padding:15px;border-radius:8px;margin:20px 0;"><p><strong>Role:</strong> ${designation}</p><p><strong>Department:</strong> ${department}</p><p><strong>Location:</strong> ${office_location}</p></div><div style="text-align:center;margin:30px 0;"><a href="${verifyLink}" style="background:#CD166E;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:600;">Verify & Activate</a></div><p style="font-size:13px;color:#777;">Link expires in 1 hour.</p></td></tr><tr><td style="background:#F9F8F2;padding:20px;text-align:center;font-size:12px;color:#888;">© 2026 Your Company</td></tr></table></td></tr></table></body></html>`,
    }),
  ]);
  res
    .status(201)
    .json({
      success: true,
      message: "Manager added successfully. Verification email sent.",
    });
};

const addemployee = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
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
  if (!f_name || !work_email || !password || !department)
    return next(
      Object.assign(new Error("Required fields missing"), { statusCode: 400 }),
    );
  const existingUser = await Usermodel.findOne({ work_email })
    .select("_id")
    .lean();
  if (existingUser)
    return next(
      Object.assign(new Error("User already exists"), { statusCode: 400 }),
    );
  const uid = await generateUID(department);
  const newuser = await Usermodel.create({
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
  const token = jwt.sign({ userid: newuser._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const verifyLink = `${process.env.BASE_URL}/user/verify/${token}`;
  Promise.all([
    assignDefaultLeave(newuser),
    sendEmail({
      to: work_email,
      subject: "Welcome! Verify Your Employee Account",
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" style="background:#fff;border-radius:14px;overflow:hidden;"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h1 style="margin:0;">Welcome Aboard</h1></td></tr><tr><td style="padding:40px;color:#333;"><h2 style="color:#730042;">Hello ${f_name},</h2><p>Your employee account has been created.</p><div style="background:#F9F8F2;padding:15px;border-radius:8px;margin:20px 0;"><p><strong>Department:</strong> ${department}</p><p><strong>Location:</strong> ${office_location}</p></div><div style="text-align:center;margin:30px 0;"><a href="${verifyLink}" style="background:#730042;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;font-weight:600;">Verify Account</a></div><p style="font-size:13px;color:#777;">Link valid for 1 hour only.</p></td></tr><tr><td style="background:#F9F8F2;padding:20px;text-align:center;font-size:12px;color:#888;">© 2026 Your Company</td></tr></table></td></tr></table></body></html>`,
    }),
  ]);
  res
    .status(201)
    .json({
      success: true,
      message: "User added successfully. Verification email sent.",
    });
};

const findallmanagers = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const managers = await Managermodel.find()
    .select(EXCLUDE)
    .populate("reporting_manager", "f_name l_name work_email designation")
    .lean();
  res.status(200).json({ managers });
};

const getallemployee = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const [users, managers] = await Promise.all([
    Usermodel.find()
      .select(
        "uid f_name l_name work_email role department designation office_location Under_manager",
      )
      .populate({
        path: "Under_manager",
        select: "uid f_name l_name work_email role",
      })
      .lean(),
    Managermodel.find()
      .select(
        "uid f_name l_name work_email role designation office_location department gender personal_contact e_contact reporting_manager",
      )
      .populate("reporting_manager", "f_name l_name work_email")
      .lean(),
  ]);
  res
    .status(200)
    .json({
      count: users.length + managers.length,
      users: [...users, ...managers],
    });
};

const editemployee = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
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
  if (!user)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );
  let manager = null;
  if (updateData.role === "manager")
    manager = await Managermodel.findOneAndUpdate({ userId: uid }, updateData, {
      new: true,
      upsert: true,
    });
  res
    .status(200)
    .json({
      success: true,
      message: "Employee updated successfully",
      user,
      manager,
    });
};

const getperticularemployee = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { uid } = req.params;
  const [user, leaveBalance, reviews] = await Promise.all([
    Usermodel.findById(uid)
      .populate({
        path: "Under_manager",
        select: "uid f_name l_name work_email role",
      })
      .select(EXCLUDE)
      .lean(),
    leavebalanceModel.findOne({ employee: uid }).lean(),
    reviewModel
      .find({ reviewee: uid })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      .lean(),
  ]);
  if (!user)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );
  if (!leaveBalance)
    return next(
      Object.assign(new Error("Leave balance not found"), { statusCode: 404 }),
    );
  const manager = await Managermodel.findOne({ userId: user._id })
    .select(EXCLUDE)
    .lean();
  res
    .status(200)
    .json({
      success: true,
      user,
      manager: manager || null,
      leaveBalance,
      reviews: reviews || [],
    });
};

const getperticularemanager = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { uid } = req.params;
  const [manager, leaveBalance, reviews] = await Promise.all([
    Managermodel.findById(uid)
      .select(EXCLUDE)
      .populate("reporting_manager", "f_name l_name work_email designation")
      .lean(),
    leavebalanceModel.findOne({ employee: uid }).lean(),
    reviewModel
      .find({ reviewee: uid })
      .populate({ path: "reviewer", select: "f_name l_name work_email role" })
      .lean(),
  ]);
  if (!manager)
    return next(
      Object.assign(new Error("Manager not found"), { statusCode: 404 }),
    );
  if (!leaveBalance)
    return next(
      Object.assign(new Error("Leave balance not found"), { statusCode: 404 }),
    );
  res
    .status(200)
    .json({ success: true, manager, leaveBalance, reviews: reviews || [] });
};

const deleteemployee = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { uid } = req.params;
  const [user, manager] = await Promise.all([
    Usermodel.findByIdAndDelete(uid),
    Managermodel.findByIdAndDelete(uid),
  ]);
  if (!user && !manager)
    return next(
      Object.assign(new Error("User not found"), { statusCode: 404 }),
    );
  res.status(200).json({ message: "User deleted successfully" });
};

const showallleaves = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const [employeeLeaves, myLeaves] = await Promise.all([
    Leave.find({
      status: {
        $in: [
          "forwarded_reporting_manager",
          "approved_reporting_manager",
          "rejected_reporting_manager",
        ],
      },
    })
      .populate("employee", "f_name l_name work_email")
      .populate("manager", "f_name l_name work_email")
      .sort({ createdAt: -1 })
      .lean(),
    ManagerLeave.find({ manager: req.admin._id })
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  res.status(200).json({
    employeeLeaves: { count: employeeLeaves.length, leaves: employeeLeaves },
    myLeaves: { count: myLeaves.length, leaves: myLeaves },
  });
};

const applyleave = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { leaveType, startDate, endDate, reason } = req.body;
  if (!leaveType || !startDate || !endDate || !reason)
    return next(
      Object.assign(
        new Error("leaveType, startDate, endDate and reason are required"),
        { statusCode: 400 },
      ),
    );
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start)
    return next(
      Object.assign(new Error("End date cannot be before start date"), {
        statusCode: 400,
      }),
    );
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const overlapping = await ManagerLeave.findOne({
    manager: req.admin._id,
    status: { $nin: ["rejected_reporting_manager"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  })
    .select("_id")
    .lean();
  if (overlapping)
    return next(
      Object.assign(new Error("Leave already applied for these dates"), {
        statusCode: 400,
      }),
    );
  const leave = await ManagerLeave.create({
    manager: req.admin._id,
    leaveType,
    startDate: start,
    endDate: end,
    days,
    reason,
    status: "pending_reporting_manager",
  });
  res
    .status(201)
    .json({
      success: true,
      message: "Leave request submitted to super admin",
      leave,
    });
};

const noofemployee = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const departments = await uidmodel
    .find({}, { department: 1, lastNumber: 1, _id: 0 })
    .lean();
  const total = departments.reduce((sum, dep) => sum + dep.lastNumber, 0);
  res.status(200).json({ departments, totalEmployees: total });
};

const createannouncement = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { title, message, audience, priority, notice_image, expiresAt } =
    req.body;
  if (!title || !message)
    return next(
      Object.assign(new Error("Title and message are required"), {
        statusCode: 400,
      }),
    );
  const announcement = await announcementmodel.create({
    title,
    message,
    audience,
    priority,
    notice_image,
    expiresAt,
    createdBy: req.admin._id,
  });
  res
    .status(201)
    .json({
      success: true,
      message: "Announcement created successfully",
      announcement,
    });
};

const getallannouncement = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const announcements = await announcementmodel.find().lean();
  res
    .status(200)
    .json({ success: true, count: announcements.length, announcements });
};

const updateAnnouncement = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { id } = req.params;
  const announcement = await announcementmodel
    .findById(id)
    .select("createdBy")
    .lean();
  if (!announcement)
    return next(
      Object.assign(new Error("Announcement not found"), { statusCode: 404 }),
    );
  if (announcement.createdBy.toString() !== req.admin._id.toString())
    return next(
      Object.assign(
        new Error("You are not allowed to edit this announcement"),
        { statusCode: 403 },
      ),
    );
  const { title, message, audience, priority, notice_image, expiresAt } =
    req.body;
  const $set = {};
  if (title) $set.title = title;
  if (message) $set.message = message;
  if (audience) $set.audience = audience;
  if (priority) $set.priority = priority;
  if (notice_image !== undefined) $set.notice_image = notice_image;
  if (expiresAt) $set.expiresAt = expiresAt;
  const updated = await announcementmodel
    .findByIdAndUpdate(id, { $set }, { new: true })
    .lean();
  res
    .status(200)
    .json({
      success: true,
      message: "Announcement updated successfully",
      announcement: updated,
    });
};

const deleteAnnouncement = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { id } = req.params;
  const announcement = await announcementmodel
    .findById(id)
    .select("createdBy")
    .lean();
  if (!announcement)
    return next(
      Object.assign(new Error("Announcement not found"), { statusCode: 404 }),
    );
  if (announcement.createdBy.toString() !== req.admin._id.toString())
    return next(
      Object.assign(
        new Error("You are not allowed to delete this announcement"),
        { statusCode: 403 },
      ),
    );
  await announcementmodel.findByIdAndDelete(id);
  res
    .status(200)
    .json({ success: true, message: "Announcement deleted successfully" });
};

const reviewtomanager = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { managerid, rating, comment } = req.body;
  if (!managerid || !rating || !comment)
    return next(
      Object.assign(new Error("managerid, rating and comment are required"), {
        statusCode: 400,
      }),
    );
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [manager, existingreview] = await Promise.all([
    Managermodel.findById(managerid).select("role").lean(),
    Review.findOne({ reviewer: req.admin._id, reviewee: managerid, monthYear })
      .select("_id")
      .lean(),
  ]);
  if (!manager)
    return next(
      Object.assign(new Error("Manager not found"), { statusCode: 404 }),
    );
  if (existingreview)
    return next(
      Object.assign(
        new Error("You have already reviewed this manager this month."),
        { statusCode: 400 },
      ),
    );
  const review = await Review.create({
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
    return next(
      Object.assign(new Error("Email is required"), { statusCode: 400 }),
    );
  const admin = await Adminmodel.findOne({ work_email: email })
    .select("_id f_name")
    .lean();
  if (!admin)
    return next(
      Object.assign(new Error("Admin not found"), { statusCode: 404 }),
    );
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
    return next(
      Object.assign(new Error("OTP has expired"), { statusCode: 400 }),
    );
  if (!otpRecord.compareOtp(String(otp)))
    return next(Object.assign(new Error("Invalid OTP"), { statusCode: 400 }));
  const admin = await Adminmodel.findOne({ work_email: email })
    .select("_id work_email")
    .lean();
  if (!admin)
    return next(
      Object.assign(new Error("Admin not found"), { statusCode: 404 }),
    );
  const resetToken = jwt.sign(
    { email: admin.work_email },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
  await OtpModel.deleteOne({ email });
  res
    .status(200)
    .json({ success: true, message: "OTP verified successfully", resetToken });
};

const resetAdminPassword = async (req, res, next) => {
  const { resetToken, newPassword } = req.body;
  let decode;
  try {
    decode = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      Object.assign(new Error("Invalid or expired token"), { statusCode: 400 }),
    );
  }
  const admin = await Adminmodel.findOne({ work_email: decode.email });
  if (!admin)
    return next(
      Object.assign(new Error("Admin not found"), { statusCode: 404 }),
    );
  admin.password = newPassword;
  await admin.save();
  res
    .status(200)
    .json({ success: true, message: "Password updated successfully" });
};

const getme = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  res.status(200).json(req.admin);
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
      return next(
        Object.assign(new Error("Phone must be a string"), { statusCode: 400 }),
      );
    admin.phone = phone;
  }
  if (profile_image !== undefined) {
    if (typeof profile_image !== "string")
      return next(
        Object.assign(new Error("Profile image must be a string"), {
          statusCode: 400,
        }),
      );
    if (profile_image === "" || profile_image.includes("api.dicebear.com")) {
      admin.profile_image = profile_image;
    } else {
      return next(
        Object.assign(new Error("Invalid avatar format"), { statusCode: 400 }),
      );
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
    return next(
      Object.assign(
        new Error("Current password and new password are required"),
        { statusCode: 400 },
      ),
    );
  const admin = await Adminmodel.findById(req.admin._id);
  const isvalid = await admin.isValidPassword(currentPassword);
  if (!isvalid)
    return next(
      Object.assign(new Error("Current password is incorrect"), {
        statusCode: 400,
      }),
    );
  if (currentPassword === newPassword)
    return next(
      Object.assign(
        new Error("New password must be different from current password"),
        { statusCode: 400 },
      ),
    );
  admin.password = newPassword;
  await admin.save();
  res
    .status(200)
    .json({ success: true, message: "Password updated successfully" });
};

const getTodayCheckins = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkins = await Attendance.find({
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
    name:
      [c.employee?.f_name, c.employee?.l_name].filter(Boolean).join(" ") ||
      "Unknown",
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

const getOrgInfo = async (req, res) => {
  const superAdmin = await SuperAdminModel.findById(req.admin.created_by)
    .select("organisation_name profile_image")
    .lean();
  res.json({
    organisation_name: superAdmin?.organisation_name,
    profile_image: superAdmin?.profile_image,
  });
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
  applyleave,
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
};
