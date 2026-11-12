const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    category: { type: String, default: "Company", trim: true, maxlength: 30 },
    question: { type: String, required: true, trim: true, maxlength: 300 },
    options: { type: [String], validate: (v) => Array.isArray(v) && v.length >= 2 && v.length <= 5 },
    answer: { type: Number, required: true, min: 0 },
    explanation: { type: String, default: "", maxlength: 300 },
    active: { type: Boolean, default: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

const attemptSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true },
    personKey: { type: String, required: true },
    dateKey: { type: String, required: true },
    questionId: { type: String, required: true },
    choice: { type: Number, required: true },
    correct: { type: Boolean, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
attemptSchema.index({ personKey: 1, dateKey: 1 }, { unique: true });

module.exports = {
  GamQuizQuestion: mongoose.models.GamQuizQuestion || mongoose.model("GamQuizQuestion", questionSchema),
  GamQuizAttempt: mongoose.models.GamQuizAttempt || mongoose.model("GamQuizAttempt", attemptSchema),
};
