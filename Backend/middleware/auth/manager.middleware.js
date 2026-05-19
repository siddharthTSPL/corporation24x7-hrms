const jwt = require("jsonwebtoken");
const managermodel = require("../../Models/manager.model");

const authmanager = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    if (
      decoded.role !== "manager" &&
      decoded.role !== "senior_manager" &&
      decoded.role !== "official"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const manager = await managermodel
      .findById(decoded.managerid)
      .select("-password -isVerified -status");

    if (!manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.manager = manager;
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = authmanager;