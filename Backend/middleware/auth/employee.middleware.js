const jwt = require("jsonwebtoken");
const usermodel = require("../../Models/user.model");

const authemployee = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) return res.status(401).json({ message: "Unauthorized: no token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "employee") {
      return res.status(403).json({ message: "Access denied" });
    }

    const rawId = decoded._id || decoded.id || decoded.userId || null;

    if (!rawId) return res.status(401).json({ message: "Invalid token payload" });

    const employee = await usermodel.findById(rawId);
    if (!employee) return res.status(401).json({ message: "Unauthorized: user not found" });

    if (employee.working_status !== "working") {
      return res.status(403).json({ message: "Your account is not active. Please contact your admin." });
    }

    req.employee = employee;
    req.user = employee;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authemployee;