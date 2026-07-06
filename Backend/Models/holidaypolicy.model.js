const mongoose = require("mongoose");

/**
 * One document per organisation.
 * weekOffType:
 *   "sunday"      -> only Sunday is off every week
 *   "sat_sun"     -> Saturday + Sunday off every week
 *   "rotational"  -> off day(s) change week to week, admin must set each
 *                    week explicitly in WeeklyOffSchedule (mandatory)
 */
const holidayPolicySchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      unique: true,
      index: true,
    },
    weekOffType: {
      type: String,
      enum: ["sunday", "sat_sun", "rotational"],
      required: true,
      default: "sunday",
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId },
    updatedByModel: { type: String, enum: ["Admin", "SuperAdmin"] },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.HolidayPolicy ||
  mongoose.model("HolidayPolicy", holidayPolicySchema);
