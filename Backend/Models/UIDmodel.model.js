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
    MGMT: { type: departmentCounterSchema, default: () => ({}) },
    OPR:  { type: departmentCounterSchema, default: () => ({}) },
    BPO:  { type: departmentCounterSchema, default: () => ({}) },
    HR:   { type: departmentCounterSchema, default: () => ({}) },
    ENG:  { type: departmentCounterSchema, default: () => ({}) },
  },
});

const UidCounter = mongoose.model("UidCounter", uidCounterSchema);

module.exports = UidCounter;