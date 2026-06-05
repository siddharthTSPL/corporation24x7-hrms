const mongoose = require("mongoose");

const uidCounterSchema = new mongoose.Schema({
  organisation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SuperAdmin",
    required: true,
  },
  department: {
    type: String,
    enum: ["MGMT", "OPR", "BPO", "HR", "ENG"],
    required: true,
  },
  lastNumber: {
    type: Number,
    default: 0,
  },
});


uidCounterSchema.index({ organisation_id: 1, department: 1 }, { unique: true });

module.exports = mongoose.model("UidCounter", uidCounterSchema);