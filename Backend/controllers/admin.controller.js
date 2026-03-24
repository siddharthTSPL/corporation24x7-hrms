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

// Admin login-identifier and password are required
const adminlogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const admin = await Adminmodel.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    const isMatch = await admin.isValidPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
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
      sameSite: "strict",
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

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const adminlogout = async (req, res) => {
  try {
    const admin = req.admin;
    console.log(admin);

    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    admin.status = "inactive";
    await admin.save();

    res.clearCookie("token", {
      httpOnly: true,
      secure: false, 
      sameSite: "strict",
    });

    return res.status(200).json({
      message: "Admin logout successful",
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


const addmanager = async (req, res) => {
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
    department,
  } = req.body;

  if (!req.admin) {
  return res.status(401).json({ message: "Unauthorized" });
}
  try {
    const existingManager = await Managermodel.findOne({ work_email });

    if (existingManager) {
      return res.status(400).json({ message: "Manager already exists" });
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
    });

    await newmanager.save();

    const token = jwt.sign(
      { managerid: newmanager._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addemployee = async (req, res) => {
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
    department,
    Under_manager,
  } = req.body;

  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const existingUser = await Usermodel.findOne({ work_email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
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
      department,
      Under_manager,
    });

    await newuser.save();

    const token = jwt.sign({ userid: newuser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
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
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const getallemployee = async (req, res) => {
    if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const users = await Usermodel.find().populate({
      path: "Under_manager",
      select: "uid f_name l_name work_email role ",
    }).select('-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt');

    if (!users || users.length === 0) {
      return res.status(404).json({
        message: "No users found",
      });
    }

    res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
};

const getperticularemployee = async (req, res) => {
  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const { uid } = req.params;
    const user = await Usermodel.findById(uid).populate({
      path: "Under_manager",
      select: "uid f_name l_name work_email role ",
    }).select('-password -__v -isverified -status -createdAt -updatedAt -isFirstLogin -passwordupdatedAt');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteemployee = async (req, res) => {

  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { uid } = req.params;
    const user = await Usermodel.findByIdAndDelete(uid);
    const manager = await Managermodel.findByIdAndDelete(uid);

    if (!user && !manager) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User deleted successfully",
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const showforwardedleaves = async (req, res) => {
  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
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

  } catch (error) {
    console.error("Show Forwarded Leaves Error:", error);
    res.status(500).json({ error: error.message });
  }
};


const acceptleavebyadmin = async (req, res) => {

  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const leaveId = req.params.id;

  try {
    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (
      leave.status.startsWith("approved") ||
      leave.status.startsWith("rejected")
    ) {
      return res.status(400).json({ message: "Leave already processed" });
    }

    const leaveBalance = await LeaveBalance.findOne({
      employee: leave.employee,
    });

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
    leave.status = "approved_admin";
    leave.approvedBy = req.admin._id;

    await leave.save();

    res.status(200).json({
      message: "Leave approved by admin",
      leave,
      leaveBalance: updatedBalance,
    });

  } catch (error) {
    console.error("Admin Approve Error:", error);
    res.status(500).json({ error: error.message });
  }
};


const rejectleavebyadmin = async (req, res) => {

  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const leaveId = req.params.id;

  try {
    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (
      leave.status.startsWith("approved") ||
      leave.status.startsWith("rejected")
    ) {
      return res.status(400).json({ message: "Leave already processed" });
    }

    leave.status = "rejected_admin";
    leave.rejectedBy = req.admin._id;

    leave.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await leave.save();

    res.status(200).json({
      message: "Leave rejected by admin successfully",
      leave,
    });

  } catch (error) {
    console.error("Admin Reject Error:", error);
    res.status(500).json({ error: error.message });
  }
};



const noofemployee = async (req, res) => {

  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
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

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



const createannouncement = async (req, res) => {

  if (!req.admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { title, message, audience, priority, expiresAt } = req.body;

  try {
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

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const reviewtomanager = async (req, res) => {
  if (!req.admin) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { managerid, rating, comment } = req.body;

  try {
    const adminid = req.admin._id;
    const adminrole = req.admin.role;

    if (adminrole !== "admin") {
      return res.status(403).json({
        message: "Only admin can review managers",
      });
    }

    const manager = await Managermodel.findById(managerid);
    if (!manager) {
      return res.status(404).json({
        message: "Manager not found",
      });
    }

    const existingreview = await Review.findOne({
      reviewer: adminid,
      reviewee: managerid,
    });

    if (existingreview) {
      return res.status(400).json({
        message: "Review already submitted",
      });
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

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// DONE

module.exports = {
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
};
