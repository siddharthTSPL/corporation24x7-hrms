const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    fileId: { type: String },
    originalName: String,
    mimeType: String,
    sizeKb: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: mongoose.Schema.Types.ObjectId,
    changedByModel: { type: String, enum: ["User", "Manager", "Admin", "SuperAdmin"] },
    note: String,
  },
  { _id: false },
);

const reimbursementSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    claimNumber: { type: String, unique: true, index: true },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "submitterModel",
    },
    submitterModel: {
      type: String,
      required: true,
      enum: ["User", "Manager", "Admin"],
    },
    employeeName: { type: String, required: true },
    empid: { type: String, required: true },
    department: { type: String },
    designation: { type: String },
    email: { type: String },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      default: null,
    },

    reimbursementType: {
      type: String,
      enum: [
        "Travel",
        "Food",
        "Medical",
        "Internet",
        "Office Supplies",
        "Training",
        "Other",
      ],
      required: true,
    },
    expenseDate: { type: Date, required: true },
    amountClaimed: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    project: { type: String, trim: true, default: "" },
    costCenter: { type: String, trim: true, default: "" },

    receipts: { type: [attachmentSchema], default: [] },
    supportingDocuments: { type: [attachmentSchema], default: [] },

    paymentMethod: {
      type: String,
      enum: ["Bank Transfer", "UPI", "Cash", "Cheque"],
      default: "Bank Transfer",
    },
    bankAccount: {
      bankName: String,
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
    },
    paymentReference: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    paidByModel: { type: String, enum: ["Admin", "SuperAdmin", null], default: null },

    approverModel: {
      type: String,
      enum: ["Admin", "SuperAdmin"],
      required: true,
    },

    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected", "paid"],
      default: "draft",
      index: true,
    },
    submissionDate: { type: Date, default: null },

    reimbursementPolicyAcknowledged: { type: Boolean, default: false },
    employeeSignature: { type: String, default: "" },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    approvedByModel: { type: String, enum: ["Admin", "SuperAdmin", null], default: null },
    approvedAt: { type: Date, default: null },
    approverComments: { type: String, default: "" },

    rejectedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    rejectedByModel: { type: String, enum: ["Admin", "SuperAdmin", null], default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },

    financeNotes: { type: String, default: "" },
    remarks: { type: String, default: "" },

    statusHistory: { type: [statusHistoryEntrySchema], default: [] },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

reimbursementSchema.virtual("isEditable").get(function () {
  return this.status === "draft";
});

reimbursementSchema.pre("validate", function (next) {
  this.approverModel = this.submitterModel === "Admin" ? "SuperAdmin" : "Admin";
  next();
});

reimbursementSchema.pre("save", async function () {
  if (this.isNew && !this.claimNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      organisation_id: this.organisation_id,
    });
    this.claimNumber = `RB-${year}-${String(count + 1).padStart(4, "0")}`;
  }

  if (this.isModified("status")) {
    if (this.status === "submitted" && !this.submissionDate) {
      this.submissionDate = new Date();
    }
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      note: `Status changed to ${this.status}`,
    });
  }
});

reimbursementSchema.index({ organisation_id: 1, submitterModel: 1, status: 1 });
reimbursementSchema.index({ organisation_id: 1, approverModel: 1, status: 1 });
reimbursementSchema.index({ submittedBy: 1, submitterModel: 1 });
reimbursementSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.Reimbursement || mongoose.model("Reimbursement", reimbursementSchema);