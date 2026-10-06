const mongoose = require("mongoose");

const departmentCounterSchema = new mongoose.Schema(
  {
    lastNumber: { type: Number, default: 0 },
  },
  { _id: false }
);

const uidCounterSchema = new mongoose.Schema({
  organisation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SuperAdmin",
    required: true,
    unique: true,
  },
  departments: {
    type: Map,
    of: departmentCounterSchema,
    default: () => ({}),
  },
});

const UidCounter = mongoose.model("UidCounter", uidCounterSchema);

module.exports = UidCounter;
