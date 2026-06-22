const mongoose = require("mongoose");

const activeTimerSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "user_model",
    },
    user_model: {
      type: String,
      required: true,
      enum: ["Admin", "Manager", "User"],
    },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TSJob",
      required: true,
    },

    started_at: { type: Date, required: true },
    last_heartbeat_at: { type: Date, required: true },

    accumulated_seconds: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ["running", "paused"],
      default: "running",
    },

    paused_at: { type: Date, default: null },

    note: { type: String, trim: true, maxlength: 300, default: "" },

    is_idle: { type: Boolean, default: false },
    idle_since: { type: Date, default: null },
  },
  { timestamps: true }
);

activeTimerSchema.index({ organisation_id: 1, user: 1 }, { unique: true });
activeTimerSchema.index({ status: 1, last_heartbeat_at: 1 });

module.exports =
  mongoose.models.ActiveTimer ||
  mongoose.model("ActiveTimer", activeTimerSchema);