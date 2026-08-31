const Department = require("../Models/department.model");

// The old hardcoded enum - seeded once per organisation so existing data
// (Users/Managers/Admins already saved with these codes) keeps working
// after departments become dynamic/custom.
const LEGACY_DEPARTMENTS = [
  { name: "Operations", code: "OPR" },
  { name: "Business Process Outsourcing", code: "BPO" },
  { name: "Engineering", code: "ENG" },
  { name: "Human Resources", code: "HR" },
  { name: "Management", code: "MGMT" },
];

const getOrgId = (req) => req.user.organisation_id || req.user._id;

const ensureDefaultDepartments = async (organisation_id) => {
  const count = await Department.countDocuments({ organisation_id });
  if (count > 0) return;

  await Department.insertMany(
    LEGACY_DEPARTMENTS.map((d) => ({ ...d, organisation_id, isDefault: true })),
    { ordered: false }
  ).catch(() => {}); // ignore race/duplicate errors if two requests seed at once
};

const listDepartments = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    await ensureDefaultDepartments(organisation_id);

    const departments = await Department.find({ organisation_id, isActive: true })
      .sort({ isDefault: -1, name: 1 })
      .lean();

    res.json({ departments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { name, code } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ message: "Department name is required" });

    const department = await Department.create({
      organisation_id,
      name: name.trim(),
      code: (code || "").trim(),
    });

    res.status(201).json({ message: "Department created", department });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ message: "A department with this name already exists" });
    res.status(500).json({ error: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { id } = req.params;
    const { name, code } = req.body;

    const updates = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: "Department name is required" });
      updates.name = name.trim();
    }
    if (code !== undefined) updates.code = code.trim();

    const department = await Department.findOneAndUpdate(
      { _id: id, organisation_id },
      updates,
      { new: true, runValidators: true }
    );

    if (!department) return res.status(404).json({ message: "Department not found" });
    res.json({ message: "Department updated", department });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ message: "A department with this name already exists" });
    res.status(500).json({ error: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { id } = req.params;

    const department = await Department.findOne({ _id: id, organisation_id });
    if (!department) return res.status(404).json({ message: "Department not found" });

    // Soft delete - keeps it intact for anyone already assigned to it,
    // just hides it from the onboarding / edit dropdowns going forward.
    department.isActive = false;
    await department.save();

    res.json({ message: "Department deactivated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};