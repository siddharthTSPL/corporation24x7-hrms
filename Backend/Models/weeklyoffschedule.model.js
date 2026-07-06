const mongoose = require("mongoose");

/**
 * Only used when HolidayPolicy.weekOffType === "rotational".
 * Admin MUST create one entry per week per group. Applies uniformly to
 * every member of that group (individual single-employee overrides are
 * handled separately in EmployeeWeekOffOverride).
 *
 * group: null            -> default entry, applies to any employee who
 *                            isn't a member of a named WeekOffGroup.
 * group: <WeekOffGroup>   -> applies only to members of that group,
 *                            letting different teams get different
 *                            off-days in the same week
 *                            (e.g. Group A off Wednesday, Group B off Thursday).
 *
 * weekStartDate is normalised to the Monday of that week (00:00:00)
 * so lookups are simple and unambiguous.
 */
const weeklyOffScheduleSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WeekOffGroup",
      default: null, // null = default/fallback entry for ungrouped employees
    },
    weekStartDate: { type: Date, required: true }, // Monday, 00:00:00
    weekEndDate: { type: Date, required: true },   // Sunday, 00:00:00
    offDays: {
      type: [String],
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one off day must be set for the week.",
      },
    },
    setBy: { type: mongoose.Schema.Types.ObjectId },
    setByModel: { type: String, enum: ["Admin", "SuperAdmin"] },
  },
  { timestamps: true }
);

weeklyOffScheduleSchema.index(
  { organisation_id: 1, weekStartDate: 1, group: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.WeeklyOffSchedule ||
  mongoose.model("WeeklyOffSchedule", weeklyOffScheduleSchema);
