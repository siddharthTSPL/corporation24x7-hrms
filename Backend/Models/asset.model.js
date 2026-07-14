const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "assignments.assigned_to_model",
      required: true,
    },

    assigned_to_model: {
      type: String,
      enum: ["Admin", "Manager", "User"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    assigned_date: {
      type: Date,
      default: Date.now,
    },

    returned_date: {
      type: Date,
      default: null,
    },

    is_returned: {
      type: Boolean,
      default: false,
    },

    return_condition: {
      type: String,
      enum: ["good", "damaged", "lost", null],
      default: null,
    },

    return_notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const assetSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },

    asset_id: {
      type: String,
      required: true,
    },

    asset_name: {
      type: String,
      required: true,
      trim: true,
    },

    asset_type: {
      type: String,
      enum: ["laptop", "desktop", "monitor", "keyboard", "mouse", "headset", "mobile", "tablet", "other"],
      required: true,
    },

    serial_number: {
      type: String,
      trim: true,
    },

    brand: {
      type: String,
      trim: true,
    },

    model_number: {
      type: String,
      trim: true,
    },

    purchase_date: {
      type: Date,
    },

    purchase_price: {
      type: Number,
    },

    condition: {
      type: String,
      enum: ["new", "good", "fair", "poor"],
      default: "good",
    },

    status: {
      type: String,
      enum: ["available", "assigned", "under_maintenance", "retired"],
      default: "available",
    },

    total_quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    available_quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },

    notes: {
      type: String,
      trim: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "created_by_model",
      required: true,
    },

    created_by_model: {
      type: String,
      enum: ["SuperAdmin", "Admin"],
      required: true,
    },

    assignments: [assignmentSchema],
  },
  {
    timestamps: true,
  }
);

assetSchema.index({ organisation_id: 1 });
assetSchema.index({ asset_id: 1, organisation_id: 1 }, { unique: true });
assetSchema.index({ "assignments.assigned_to": 1 });
assetSchema.index({ status: 1 });

const AssetModel = mongoose.models.Asset || mongoose.model("Asset", assetSchema);

module.exports = AssetModel;