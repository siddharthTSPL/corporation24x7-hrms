const jwt = require("jsonwebtoken");
const adminmodel = require("../../Models/Admin.model");

const adminauth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await adminmodel.findById(decoded.adminid);

    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }
   if (!decoded.role || decoded.role !== "admin") {
  return res.status(403).json({ message: "Access denied" });
}

    req.admin = admin;
    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = adminauth;