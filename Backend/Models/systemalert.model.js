const mongoose = require("mongoose");

// One document per distinct problem (identified by `key`). Repeats of the
// same problem bump `count` / `lastSeenAt` instead of creating new rows, and
// `lastEmailedAt` is what the alert mailer uses to avoid mail floods - it
// lives in the DB (not memory) so a crash-restart loop can't spam either.
const systemAlertSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    severity: { type: String, enum: ["critical", "error", "warning", "info"], default: "error" },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    stack: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    count: { type: Number, default: 1 },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    lastEmailedAt: { type: Date, default: null },
    autoFixed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Keep the collection small: rows untouched for 30 days disappear.
systemAlertSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.models.SystemAlert || mongoose.model("SystemAlert", systemAlertSchema);
