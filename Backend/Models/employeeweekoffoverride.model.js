const mongoose = require("mongoose");

/**
 * Individual exception to the organisation's HolidayPolicy.
 * If a document exists here for an employee, it wins over the
 * org-wide policy/schedule for that employee only.
 *
 * Example: whole company follows "sat_sun", but this one employee
 * (e.g. support/ops role) only gets Sunday off.
 */
const employeeWeekOffOverrideSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    employee: { type: mongoose.Schema.Types.ObjectId, required: true },
    employeeModel: {
      type: String,
      enum: ["User", "Manager", "Admin"],
      required: true,
    },
    weekOffType: {
      type: String,
      enum: ["sunday", "sat_sun", "custom_fixed_days", "rotational"],
      required: true,
    },
    // used when weekOffType === "custom_fixed_days"
    fixedOffDays: {
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
      default: undefined,
    },
    isActive: { type: Boolean, default: true },
    setBy: { type: mongoose.Schema.Types.ObjectId },
    setByModel: { type: String, enum: ["Admin", "SuperAdmin"] },
  },
  { timestamps: true }
);

employeeWeekOffOverrideSchema.index(
  { organisation_id: 1, employee: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.EmployeeWeekOffOverride ||
  mongoose.model("EmployeeWeekOffOverride", employeeWeekOffOverrideSchema);
