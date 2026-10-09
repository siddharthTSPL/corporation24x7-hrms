const jwt = require("jsonwebtoken");
const managermodel = require("../../Models/manager.model");
const { isSessionStillActive } = require("../../utils/singleSignIn.utils");

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

    if (decoded.sid && !(await isSessionStillActive(decoded.sid))) {
      return res.status(401).json({ message: "Logged out — signed in from another device.", code: "SESSION_REVOKED" });
    }

    const manager = await managermodel.findById(decoded.managerid).select("-password -isVerified -status");

    if (!manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (manager.working_status !== "working") {
      return res.status(403).json({ message: "Your account is not active. Please contact super admin." });
    }

    if (decoded.role !== "manager" && decoded.role !== "senior_manager" && decoded.role !== "official") {
      return res.status(403).json({ message: "Access denied" });
    }

    req.manager = manager;
    req.user = manager;
    // Raw decoded claims (sid included) — needed by logout to revoke this
    // device's Single Sign-In session row.
    req.tokenPayload = decoded;
    next();

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = authmanager;