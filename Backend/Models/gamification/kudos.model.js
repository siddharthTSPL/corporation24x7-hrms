const mongoose = require("mongoose");

const CATEGORIES = [
  { key: "teamwork", label: "Teamwork", icon: "handshake" },
  { key: "ownership", label: "Ownership", icon: "shield" },
  { key: "innovation", label: "Innovation", icon: "bulb" },
  { key: "customer", label: "Customer focus", icon: "heart" },
  { key: "mentor", label: "Mentoring", icon: "compass" },
  { key: "above_beyond", label: "Going above & beyond", icon: "rocket" },
  { key: "positivity", label: "Positivity", icon: "sun" },
  { key: "learning", label: "Continuous learning", icon: "book" },
];

const schema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    fromKey: { type: String, required: true, index: true },
    fromName: { type: String, default: "" },
    fromPhoto: { type: String, default: "" },
    toKey: { type: String, required: true, index: true },
    toName: { type: String, default: "" },
    toPhoto: { type: String, default: "" },
    toDepartment: { type: String, default: "" },
    category: { type: String, enum: CATEGORIES.map((c) => c.key), default: "teamwork" },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    coins: { type: Number, default: 0, min: 0 }, // gifted coins (from giver's allowance)
    reactions: { type: mongoose.Schema.Types.Mixed, default: {} }, // { "🎉": ["User:1", ...] }
    comments: {
      type: [
        {
          key: String,
          name: String,
          text: { type: String, maxlength: 300 },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    pinned: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true, minimize: false }
);
schema.index({ organisation_id: 1, hidden: 1, createdAt: -1 });
schema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.models.GamKudos || mongoose.model("GamKudos", schema);
