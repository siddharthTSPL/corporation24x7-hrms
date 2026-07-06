const mongoose = require("mongoose");

/**
 * Keeps a full audit trail every time a shift is (re)assigned to an
 * employee/manager/admin, so Admin/SuperAdmin can see history, and can
 * edit or delete an individual history entry if it was a mistake.
 *
 * shift === null means "org default shift" was assigned at that point in time
 * (matches the same convention used on User/Manager/Admin.shift).
 */
const shiftAssignmentSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "employee_model",
      index: true,
    },
    employee_model: {
      type: String,
      required: true,
      enum: ["User", "Manager", "Admin"],
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    previous_shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "assigned_by_model",
    },
    assigned_by_model: {
      type: String,
      required: true,
      enum: ["Admin", "SuperAdmin"],
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

shiftAssignmentSchema.index({ organisation_id: 1, employee_id: 1, createdAt: -1 });

module.exports = mongoose.model("ShiftAssignment", shiftAssignmentSchema);