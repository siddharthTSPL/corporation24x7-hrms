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

    // Intentionally not checking admin.status === "inactive" here.
    // `working_status` (working/resigned/fired/terminated) is the source
    // of truth for whether the account should be able to log in — that's
    // already enforced at login time. `status` gets flipped by other
    // flows (e.g. working_status changes) and shouldn't gate every
    // request, or a valid session can get locked out mid-use.

    req.admin = admin;
    req.user = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = adminAuth;