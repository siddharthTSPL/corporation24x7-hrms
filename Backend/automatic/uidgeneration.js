const UidCounter = require("../Models/UIDmodel.model");
const Department = require("../Models/department.model");

const VALID_DEPARTMENTS = ["MGMT", "OPR", "BPO", "HR", "ENG"];

const generateUID = async (department, organisation_id) => {
  if (!organisation_id) throw new Error("organisation_id is required");

  const requestedDepartment = String(department || "").trim();
  const requestedCode = requestedDepartment.toUpperCase();
  const orgDepartments = requestedDepartment
    ? await Department.find({ organisation_id }).select("name code").lean()
    : [];
  const orgDepartment = orgDepartments.find((item) =>
    [item.code, item.name].some(
      (value) => String(value || "").trim().toUpperCase() === requestedCode
    )
  );

  if (!orgDepartment && !VALID_DEPARTMENTS.includes(requestedCode)) {
    const error = new Error(`Invalid department: ${requestedDepartment}`);
    error.statusCode = 400;
    throw error;
  }

  const rawPrefix = orgDepartment?.code || orgDepartment?.name || requestedCode;
  const uidPrefix = rawPrefix
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();

  if (!uidPrefix) {
    const error = new Error(`Invalid department: ${requestedDepartment}`);
    error.statusCode = 400;
    throw error;
  }

  const counter = await UidCounter.findOneAndUpdate(
    { organisation_id },
    {
      $inc: { [`departments.${uidPrefix}.lastNumber`]: 1 },
    },
    { returnDocument: "after", upsert: true }
  );

  const departmentCounter = counter.departments.get(uidPrefix);
  const lastNumber = departmentCounter?.lastNumber;
  return uidPrefix + String(lastNumber).padStart(2, "0");
};

module.exports = generateUID;
