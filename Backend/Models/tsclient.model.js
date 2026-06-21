const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    company_name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },

    default_hourly_rate: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "created_by_model",
    },
    created_by_model: {
      type: String,
      required: true,
      enum: ["SuperAdmin", "Admin", "Manager"],
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

clientSchema.index({ organisation_id: 1, status: 1 });
clientSchema.index({ organisation_id: 1, name: 1 });

module.exports = mongoose.models.TSClient || mongoose.model("TSClient", clientSchema);