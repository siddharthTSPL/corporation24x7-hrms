const UidCounter = require("../Models/UIDmodel.model");

const generateUID = async (department) => {
  const counter = await UidCounter.findOneAndUpdate(
    { department },
    { $inc: { lastNumber: 1 } },
    { new: true, upsert: true }
  );

  return department + String(counter.lastNumber).padStart(2, "0");
};

module.exports = generateUID;