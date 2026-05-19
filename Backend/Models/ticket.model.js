const mongoose = require("mongoose");

const timelineEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "ticket_created",
        "status_changed",
        "note_added",
        "internal_note_added",
        "priority_changed",
        "assigned",
        "attachment_added",
        "acknowledgement_sent",
        "reminder_sent",
        "escalated",
        "reopened",
        "resolution_submitted",
        "rating_submitted",
      ],
      required: true,
    },
    fromStatus: String,
    toStatus: String,
    note: String,
    internalNote: String,
    by: mongoose.Schema.Types.ObjectId,
    byModel: {
      type: String,
      enum: ["SuperAdmin", "Admin", "Manager", "User", "System"],
    },
    byName: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { _id: true, timestamps: { createdAt: "timestamp", updatedAt: false } },
);

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  originalName: String,
  mimeType: String,
  sizeKb: Number,
  uploadedBy: mongoose.Schema.Types.ObjectId,
  uploadedAt: { type: Date, default: Date.now },
});

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true, index: true },

    type: {
      type: String,
      enum: ["suggestion", "complaint", "posh", "grievance", "whistleblower"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "sexual_harassment",
        "hostile_work_environment",
        "inappropriate_behavior",
        "manager_behavior",
        "colleague_behavior",
        "discrimination",
        "workplace_violence",
        "policy_violation",
        "compensation_issue",
        "workload_stress",
        "unfair_treatment",
        "process_improvement",
        "technology_tools",
        "policy_feedback",
        "culture_diversity",
        "benefits_perks",
        "training_development",
        "financial_fraud",
        "data_breach",
        "safety_violation",
        "legal_compliance",
        "other",
      ],
      required: true,
    },
    subCategory: String,

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "submitterModel",
    },
    submitterModel: { type: String, enum: ["User", "Manager", "Admin"] },
    submitterDept: String,
    submitterRole: String,
    isAnonymous: { type: Boolean, default: false },

    against: { type: mongoose.Schema.Types.ObjectId, refPath: "againstModel" },
    againstModel: { type: String, enum: ["User", "Manager", "Admin"] },
    againstName: String,
    againstDept: String,

    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    incidentDate: Date,
    incidentLocation: String,
    witnessNames: [String],
    attachments: [attachmentSchema],

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    slaDeadline: Date,
    acknowledgedAt: Date,
    isOverdue: { type: Boolean, default: false, index: true },
    isEscalated: { type: Boolean, default: false },
    escalationCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: [
        "open",
        "acknowledged",
        "under_review",
        "action_taken",
        "resolved",
        "closed",
        "rejected",
        "reopened",
      ],
      default: "open",
      index: true,
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: mongoose.Schema.Types.ObjectId,
        note: String,
      },
    ],

    assignedTo: mongoose.Schema.Types.ObjectId,
    internalNotes: [
      {
        note: String,
        addedBy: mongoose.Schema.Types.ObjectId,
        addedAt: { type: Date, default: Date.now },
        byName: String,
      },
    ],
    superAdminNote: String,
    resolutionSummary: String,
    resolvedAt: Date,
    closedAt: Date,
    rejectionReason: String,

    confidentialityLevel: {
      type: String,
      enum: ["public", "internal", "confidential", "strictly_confidential"],
      default: "confidential",
    },

    timeline: [timelineEntrySchema],

    submitterRating: { type: Number, min: 1, max: 5 },
    submitterFeedback: String,
    ratedAt: Date,

    resolutionTimeHours: Number,
    firstResponseHours: Number,
    reopenCount: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: mongoose.Schema.Types.ObjectId,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ticketSchema.virtual("isOpen").get(function () {
  return [
    "open",
    "acknowledged",
    "under_review",
    "action_taken",
    "reopened",
  ].includes(this.status);
});

ticketSchema.virtual("daysSinceCreated").get(function () {
  return Math.floor((Date.now() - this.createdAt) / 86400000);
});

ticketSchema.virtual("daysUntilDeadline").get(function () {
  if (!this.slaDeadline) return null;
  return Math.ceil((this.slaDeadline - Date.now()) / 86400000);
});

ticketSchema.pre("save", async function () {
  if (this.isNew) {
    const prefixMap = {
      suggestion: "SUGG",
      complaint: "CMPL",
      posh: "POSH",
      grievance: "GRIV",
      whistleblower: "WBTL",
    };
    const prefix = prefixMap[this.type] || "TCKT";
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({ type: this.type });
    this.ticketNumber = `HRMS-${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

    const slaDays = {
      posh: { low: 7, medium: 7, high: 3, critical: 1 },
      whistleblower: { low: 14, medium: 7, high: 3, critical: 1 },
      complaint: { low: 21, medium: 14, high: 7, critical: 3 },
      grievance: { low: 30, medium: 21, high: 14, critical: 7 },
      suggestion: { low: 45, medium: 30, high: 30, critical: 30 },
    };
    const days = slaDays[this.type]?.[this.severity] ?? 14;
    this.slaDeadline = new Date(Date.now() + days * 86400000);

    if (this.type === "posh") {
      this.confidentialityLevel = "strictly_confidential";
      this.severity = this.severity === "low" ? "medium" : this.severity;
    }

    if (this.type === "whistleblower") {
      this.confidentialityLevel = "strictly_confidential";
    }

    this.timeline.push({
      action: "ticket_created",
      note: `Ticket ${this.ticketNumber} submitted.`,
      by: this.submittedBy,
      byModel: this.submitterModel || "System",
      byName: this.isAnonymous ? "Anonymous" : "Submitter",
    });

    this.statusHistory.push({
      status: "open",
      changedAt: new Date(),
      note: "Ticket created",
    });
  }
});

ticketSchema.index({ type: 1, status: 1 });
ticketSchema.index({ status: 1, isOverdue: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ slaDeadline: 1, status: 1 });
ticketSchema.index({ submittedBy: 1 });
ticketSchema.index({ against: 1 });

ticketSchema.statics.getDashboardStats = async function () {
  const [
    typeCounts,
    statusCounts,
    overdueCounts,
    recentCritical,
    monthlyCounts,
  ] = await Promise.all([
    this.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),

    this.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    this.countDocuments({
      isDeleted: false,
      isOverdue: true,
      status: { $nin: ["resolved", "closed", "rejected"] },
    }),

    this.countDocuments({
      isDeleted: false,
      $or: [{ severity: "critical" }, { type: "posh" }],
      status: { $nin: ["resolved", "closed", "rejected"] },
    }),

    this.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: new Date(Date.now() - 180 * 86400000) },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  return {
    byType: Object.fromEntries(typeCounts.map((t) => [t._id, t.count])),
    byStatus: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
    overdue: overdueCounts,
    criticalOrPosh: recentCritical,
    monthly: monthlyCounts,
  };
};

module.exports = mongoose.model("Ticket", ticketSchema);
