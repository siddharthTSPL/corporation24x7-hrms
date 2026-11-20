const mongoose = require("mongoose");

// Append-only ledger. Leaderboards, challenges and analytics are all
// aggregations over this collection, so nothing here is ever edited.
const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true },
    personKey: { type: String, required: true },
    personModel: { type: String, default: "User" },
    person: { type: mongoose.Schema.Types.ObjectId },
    department: { type: String, default: "" },
    event: { type: String, required: true },
    xp: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    reason: { type: String, default: "", maxlength: 300 },
    actorKey: { type: String, default: "" }, // who awarded it (manual awards)
    dedupeKey: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ organisation_id: 1, createdAt: -1 });
schema.index({ personKey: 1, createdAt: -1 });
schema.index({ organisation_id: 1, event: 1, createdAt: -1 });
schema.index({ organisation_id: 1, department: 1, createdAt: -1 });
schema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } });

module.exports = mongoose.models.GamPointTx || mongoose.model("GamPointTx", schema);
