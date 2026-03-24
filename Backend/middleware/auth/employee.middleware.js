const jwt = require("jsonwebtoken");
const usermodel = require("../../Models/user.model");

const authemployee = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const employee = await usermodel.findById(decoded.userId); 

    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if(decoded.role !== "employee"){
      return res.status(403).json({ message: "Access denied" });
    }

    req.employee = employee;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authemployee;