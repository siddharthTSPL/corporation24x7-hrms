const jwt = require("jsonwebtoken");
const SuperAdminModel = require("../../Models/superadmin.model");

const superAdminAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.role || decoded.role !== "super_admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const superAdmin = await SuperAdminModel.findById(decoded.superadminid).select("-password");

    if (!superAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (superAdmin.status === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended" });
    }

    if (!superAdmin.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    req.superAdmin = superAdmin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = superAdminAuth;