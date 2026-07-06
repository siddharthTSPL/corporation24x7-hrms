const mongoose = require("mongoose");

/**
 * A named group of employees that can be assigned a different rotational
 * off-day than other groups in the same week.
 *
 * Example: "Group A" (4 employees) off Wednesday this week,
 *          "Group B" (3 employees) off Thursday this week.
 *
 * An employee should belong to at most one active group per organisation.
 */
const weekOffGroupSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    name: { type: String, required: true }, // e.g. "Group A"
    members: [
      {
        employee: { type: mongoose.Schema.Types.ObjectId, required: true },
        employeeModel: {
          type: String,
          enum: ["User", "Manager", "Admin"],
          required: true,
        },
      },
    ],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId },
    createdByModel: { type: String, enum: ["Admin", "SuperAdmin"] },
  },
  { timestamps: true }
);

weekOffGroupSchema.index({ organisation_id: 1, name: 1 }, { unique: true });

module.exports =
  mongoose.models.WeekOffGroup || mongoose.model("WeekOffGroup", weekOffGroupSchema);
