const jwt = require("jsonwebtoken");
const AdminModel = require("../../Models/Admin.model");

const adminAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.role || decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const admin = await AdminModel.findById(decoded.adminid).select("-password");

    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!admin.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    if (admin.status === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended" });
    }

    if (admin.status === "inactive") {
      return res.status(403).json({ message: "Your account is inactive" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = adminAuth;