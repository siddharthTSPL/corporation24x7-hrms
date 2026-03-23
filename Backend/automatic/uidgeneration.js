const UidCounter = require("../Models/UIDmodel.model");

const generateUID = async (department) => {

     const counter = await UidCounter.findOneAndUpdate(
          { department },
          { $inc: { lastNumber: 1 } },
          { new: true, upsert: true }
     );

     const uid = department + String(counter.lastNumber).padStart(2,"0");

     return uid;
};

module.exports = generateUID;