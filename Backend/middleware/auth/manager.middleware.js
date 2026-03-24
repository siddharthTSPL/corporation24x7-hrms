const jwt = require("jsonwebtoken");
const managermodel = require("../../Models/manager.model");

const authmanager = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const manager = await managermodel.findById(decoded.managerid);

    if (!manager) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.manager = manager;

    next();

  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authmanager;