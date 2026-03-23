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

const adminlogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const validusername = await Adminmodel.findOne({ username: username });

    if (!validusername) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const validpassword = await validusername.isValidPassword(password);

    if (!validpassword) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        username: validusername.username,
        adminid: validusername._id,
        role: validusername.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15d" },
    );
    res.cookie("token", token, { httpOnly: true });
    await Adminmodel.findOneAndUpdate(
      { username: validusername.username },
      { status: "active" },
    );

    res.status(200).json({
      message: "Admin login successful",
      admin: validusername.username,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const adminlogout = async (req, res) => {
  const token = req.cookies.token;
  try {
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (!decode) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    await Adminmodel.findOneAndUpdate(
      { username: decode.username },
      { status: "inactive" },
    );
    res.clearCookie("token", {
      httpOnly: true,
    });
    res.status(200).json({ message: "Admin logout successful" });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

const adduser = async (req, res) => {
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

const getallusers = async (req, res) => {
  try {
    const users = await Usermodel.find().populate({
      path: "Under_manager",
      select: "uid f_name l_name work_email role ",
    });

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

const getperticularuser = async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await Usermodel.findById(uid).populate({
      path: "Under_manager",
      select: "uid f_name l_name work_email role ",
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteemployee = async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (!decode) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { uid } = req.params;
    const user = await Usermodel.findByIdAndDelete(uid);
    const manager = await Managermodel.findByIdAndDelete(uid);
    if (!user && !manager) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const showforwardedleaves = async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (!decode) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const leaves = await Leave.find({
      status: { $in: ["forwarded_admin", "pending_admin"] },
    })
      .populate("employee", "name work_email")
      .populate("manager", "name work_email")
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
  const token = req.cookies.token;
  const leaveId = req.params.id;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);

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
    leave.approvedBy = decode.id;

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
  const token = req.cookies.token;
  const leaveId = req.params.id;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);

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
    leave.rejectedBy = decode.id;
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
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (!decode) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const departments = await uidmodel.find(
      {},
      { department: 1, lastNumber: 1, _id: 0 },
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
  const token = req.cookies.token;

  const { title, message, audience, priority, expiresAt } = req.body;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);

    if (!decode) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const announcement = new announcementmodel({
      title,
      message,
      audience,
      priority,
      expiresAt,
      createdBy: decode.adminid,
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
  const token = req.cookies.token;
  const { managerid, rating, comment } = req.body;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (!decode) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const adminrole = decode.role;
    const adminid = decode.adminid;
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
      reviewerRole: decode.role,
      reviewer: adminid,
      reviewerRoleModel: decode.role,
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

module.exports = {
  adminlogin,
  adminlogout,
  addmanager,
  adduser,
  getallusers,
  getperticularuser,
  deleteemployee,
  showforwardedleaves,
  acceptleavebyadmin,
  rejectleavebyadmin,
  noofemployee,
  createannouncement,
  reviewtomanager,
};
