const UidCounter = require("../Models/UIDmodel.model");

const generateUID = async (department, organisation_id) => {
  if (!organisation_id) {
    throw new Error("organisation_id is required to generate a UID");
  }

  const counter = await UidCounter.findOneAndUpdate(
    { department, organisation_id },
    { $inc: { lastNumber: 1 } },
    { new: true, upsert: true }
  );

  return department + String(counter.lastNumber).padStart(2, "0");
};

module.exports = generateUID;