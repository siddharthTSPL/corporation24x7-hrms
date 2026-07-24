const jwt = require("jsonwebtoken");
const AdminModel = require("../../Models/Admin.model");

const adminAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

   const adminRoles = ["admin", "senior_admin", "official"];
if (!decoded.role || !adminRoles.includes(decoded.role)) {
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

    if (admin.working_status !== "working") {
      return res.status(403).json({ message: "Your account is not active. Please contact super admin." });
    }

    // Intentionally not checking admin.status === "inactive" here.
    // `working_status` (working/resigned/fired/terminated) is the source
    // of truth for whether the account should be able to log in / stay
    // authenticated — checked here on every request (not just at login),
    // so a stale token for a resigned/fired/terminated admin is rejected
    // immediately. `status` gets flipped by other, unrelated flows and
    // shouldn't gate every request.

    req.admin = admin;
    req.user = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = adminAuth;