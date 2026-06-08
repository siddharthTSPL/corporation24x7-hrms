const UidCounter = require("../Models/UIDmodel.model");

const VALID_DEPARTMENTS = ["MGMT", "OPR", "BPO", "HR", "ENG"];

const generateUID = async (department, organisation_id) => {
  if (!organisation_id) throw new Error("organisation_id is required");
  if (!VALID_DEPARTMENTS.includes(department))
    throw new Error(`Invalid department: ${department}`);


  const setOnInsert = {};
  VALID_DEPARTMENTS.forEach((dept) => {
    if (dept !== department) {
      setOnInsert[`departments.${dept}.lastNumber`] = 0;
    }
  });

  const counter = await UidCounter.findOneAndUpdate(
    { organisation_id },
    {
      $inc: { [`departments.${department}.lastNumber`]: 1 },
      $setOnInsert: setOnInsert,
    },
    { new: true, upsert: true }
  );

  const lastNumber = counter.departments[department].lastNumber;
  return department + String(lastNumber).padStart(2, "0");
};

module.exports = generateUID;