const jwt = require("jsonwebtoken");
const SuperAdminModel = require("../../Models/superadmin.model");
const { isSessionStillActive } = require("../../utils/singleSignIn.utils");

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

    // Single Sign-In: a token minted while the feature was on carries a
    // `sid`. If that session got revoked (signed in elsewhere), this device
    // is logged out immediately instead of waiting for token expiry.
    if (decoded.sid && !(await isSessionStillActive(decoded.sid))) {
      return res.status(401).json({ message: "Logged out — signed in from another device.", code: "SESSION_REVOKED" });
    }

    const superAdmin = await SuperAdminModel.findById(decoded.superadminid).select("-password");

    if (!superAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (superAdmin.status === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended" });
    }

    if (superAdmin.working_status !== "working") {
      return res.status(403).json({ message: "Your account is not active." });
    }

    if (!superAdmin.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    req.superAdmin = superAdmin;
    req.user = superAdmin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = superAdminAuth;