const mongoose = require("mongoose");

const stageSchema = new mongoose.Schema({
  code: { type: String, enum: ["T1", "T2", "T3"], required: true },
  objective: { type: String, default: "", maxlength: 1000 },
  materials_url: { type: String, default: "", maxlength: 2048 },
  assessment_type: { type: String, enum: ["none", "quiz", "practical", "attendance"], default: "none" },
  pass_score: { type: Number, min: 0, max: 100, default: 0 },
  scheduled_at: { type: Date, default: null },
  mode: { type: String, enum: ["in_person", "online", ""], default: "" },
  location: { type: String, default: "" },
  meeting_link: { type: String, default: "" },
  evidence_url: { type: String, default: "" },
  evidence_file_id: { type: String, default: "" },
  evidence_name: { type: String, default: "" },
  evidence_note: { type: String, default: "", maxlength: 2000 },
  submitted_at: { type: Date, default: null },
  attempt_count: { type: Number, default: 0, min: 0 },
  review_status: { type: String, enum: ["not_started", "submitted", "passed", "needs_retry"], default: "not_started" },
  score: { type: Number, min: 0, max: 100, default: null },
  trainer_feedback: { type: String, default: "", maxlength: 2000 },
  completed_at: { type: Date, default: null },
}, { _id: false });

const trainingSchema = new mongoose.Schema({
  organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  details: { type: String, default: "", maxlength: 4000 },
  category: { type: String, default: "General", trim: true, maxlength: 80 },
  mandatory: { type: Boolean, default: false },
  due_at: { type: Date, default: null },
  estimated_hours: { type: Number, min: 0, max: 500, default: 0 },
  certificate_validity_months: { type: Number, min: 0, max: 120, default: 0 },
  skills: { type: [String], default: [] },
  due_reminder_offsets_sent: { type: [Number], default: [] },
  trainee: { id: { type: mongoose.Schema.Types.ObjectId, required: true }, model: { type: String, enum: ["User", "Manager", "Admin"], required: true } },
  trainer: { id: { type: mongoose.Schema.Types.ObjectId, required: true }, model: { type: String, enum: ["User", "Manager", "Admin"], required: true } },
  stages: { type: [stageSchema], validate: { validator: (v) => v.length === 3 && v.map((s) => s.code).join(",") === "T1,T2,T3", message: "Training must have exactly ordered stages T1, T2 and T3" } },
  status: { type: String, enum: ["assigned", "in_progress", "pending_approval", "rejected", "approved"], default: "assigned", index: true },
  completion_submitted_at: { type: Date, default: null },
  issuance_lock: { type: String, default: "" },
  decision: { type: String, enum: ["approved", "rejected", null], default: null },
  decision_reason: { type: String, default: "" },
  decision_by: { type: mongoose.Schema.Types.ObjectId, default: null },
  decision_at: { type: Date, default: null },
  approval_history: [{ decision: String, reason: String, by: mongoose.Schema.Types.ObjectId, at: { type: Date, default: Date.now } }],
  certificate: { url: { type: String, default: "" }, file_id: { type: String, default: "" }, issued_at: { type: Date, default: null }, valid_until: { type: Date, default: null }, expiry_reminder_offsets_sent: { type: [Number], default: [] }, template_file_id: { type: String, default: "" } },
  audit: [{ action: String, actor_id: mongoose.Schema.Types.ObjectId, actor_model: String, at: { type: Date, default: Date.now }, details: mongoose.Schema.Types.Mixed }],
}, { timestamps: true });

trainingSchema.index({ organisation_id: 1, "trainee.id": 1 });
trainingSchema.index({ organisation_id: 1, "trainer.id": 1 });
trainingSchema.index({ status: 1, due_at: 1 });
trainingSchema.index({ status: 1, "certificate.valid_until": 1 });
module.exports = mongoose.model("Training", trainingSchema);
