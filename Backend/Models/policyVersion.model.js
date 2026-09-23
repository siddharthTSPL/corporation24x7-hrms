const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────────────────
// TorchX Policy — PolicyVersion.
//
// Holds the actual readable content for one version of a Policy: a PDF
// upload and/or attached photos/images ("org can put data in any form but
// employee needs to see it in a clean, standard view"). Once a version is
// published it MUST be treated as immutable — if content needs to change,
// create a new version instead of editing this one. This is what makes an
// employee's acknowledgement legally meaningful later ("what exactly did
// they agree to?"). documentHash lets you prove the file wasn't altered
// after the fact.
// ─────────────────────────────────────────────────────────────────────────

const policyVersionSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    policyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Policy",
      required: true,
      index: true,
    },

    // Simple incrementing string version, e.g. "1.0", "2.0".
    versionNumber: { type: String, required: true },

    contentType: {
      type: String,
      enum: ["pdf", "images", "pdf_and_images"],
      default: "pdf",
    },

    pdfUrl: { type: String, default: null },
    pdfFileId: { type: String, default: null },
    pdfFileName: { type: String, default: null },

    // Additional photos/scans/screenshots attached alongside (or instead
    // of) the PDF — e.g. a signed hard copy photographed, or supporting
    // images referenced by the policy text.
    images: [
      {
        url: { type: String, required: true },
        fileId: { type: String, default: null },
        caption: { type: String, default: "", trim: true },
        _id: false,
      },
    ],

    documentHash: { type: String, default: null },

    // True only for the one version currently in force for this policy.
    isCurrent: { type: Boolean, default: false, index: true },

    releaseNotes: { type: String, trim: true, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdByModel: { type: String, enum: ["Admin", "SuperAdmin"], required: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

policyVersionSchema.index({ policyId: 1, versionNumber: 1 }, { unique: true });
policyVersionSchema.index({ policyId: 1, isCurrent: 1 });

module.exports =
  mongoose.models.PolicyVersion || mongoose.model("PolicyVersion", policyVersionSchema);