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

async function isEmpidTaken(empid, organisation_id) {
  if (!empid || !organisation_id) return false;
  const normalizedEmpid = empid.toString().trim();

  const [user, manager, admin] = await Promise.all([
    Usermodel.findOne({ empid: normalizedEmpid, organisation_id }).select("_id").lean(),
    Managermodel.findOne({ empid: normalizedEmpid, organisation_id }).select("_id").lean(),
    AdminModel.findOne({ empid: normalizedEmpid, organisation_id }).select("_id").lean(),
  ]);

  return Boolean(user || manager || admin);
}

module.exports = { isEmailTaken, isEmpidTaken };