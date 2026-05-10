// employee.middleware.js
const jwt      = require("jsonwebtoken");
const usermodel = require("../../Models/user.model");

const authemployee = async (req, res, next) => {
  try {

    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

   
    if (decoded.role !== "employee") {
      return res.status(403).json({ message: "Access denied" });
    }

    const employee = await usermodel.findById(decoded.userId);
    if (!employee) {
      return res.status(401).json({ message: "Unauthorized: user not found" });
    }

    req.employee = employee;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authemployee;