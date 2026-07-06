const mongoose = require("mongoose");

/**
 * Admin-managed holiday calendar per organisation.
 * Replaces the previous hardcoded "date-holidays" npm package,
 * which used a fixed India/Delhi list nobody could edit.
 */
const holidaySchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    date: { type: Date, required: true }, // normalised to 00:00:00
    name: { type: String, required: true }, // e.g. "Diwali", "Republic Day"
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    createdByModel: { type: String, enum: ["Admin", "SuperAdmin"] },
  },
  { timestamps: true }
);

holidaySchema.index({ organisation_id: 1, date: 1 }, { unique: true });

module.exports =
  mongoose.models.Holiday || mongoose.model("Holiday", holidaySchema);
