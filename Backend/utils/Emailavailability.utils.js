const SuperAdminModel = require("../Models/superadmin.model");
const AdminModel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const Usermodel = require("../Models/user.model");

const isEmailTaken = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  const [superAdmin, admin, manager, user] = await Promise.all([
    SuperAdminModel.findOne({ email: normalizedEmail }).select("_id").lean(),
    AdminModel.findOne({ work_email: normalizedEmail }).select("_id").lean(),
    Managermodel.findOne({ work_email: normalizedEmail }).select("_id").lean(),
    Usermodel.findOne({ work_email: normalizedEmail }).select("_id").lean(),
  ]);

  if (superAdmin) return { taken: true, role: "super_admin" };
  if (admin) return { taken: true, role: "admin" };
  if (manager) return { taken: true, role: "manager" };
  if (user) return { taken: true, role: "employee" };

  return { taken: false, role: null };
};

module.exports = { isEmailTaken };