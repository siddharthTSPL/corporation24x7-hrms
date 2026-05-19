const jwt = require("jsonwebtoken");
const managermodel = require("../../Models/manager.model");

const authmanager = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const manager = await managermodel.findById(decoded.managerid).select("-password -isVerified -status");

    if (!manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (decoded.role !== "manager" && decoded.role !== "senior_manager" && decoded.role !== "official") {
      return res.status(403).json({ message: "Access denied" });
    }

    req.manager = manager;
    next();

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = authmanager;