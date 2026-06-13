const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  organisation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SuperAdmin",
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "uploaderModel",
  },
  uploaderModel: {
    type: String,
    required: true,
    enum: ["User", "Manager", "Admin"],
  },
  underManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Manager",
    default: null,
  },
  fileType: {
    type: String,
    enum: ["personal", "expense"],
    required: true,
  },
  fileUrl: { type: String, required: true },
  fileId: { type: String },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  viewedByAdmin: { type: Boolean, default: false },
  viewedBySuperAdmin: { type: Boolean, default: false },
});

documentSchema.index({ uploader: 1, uploaderModel: 1, fileType: 1 });
documentSchema.index({ uploader: 1, uploaderModel: 1, uploadedAt: -1 });
documentSchema.index({ organisation_id: 1, fileType: 1, uploadedAt: -1 });

module.exports = mongoose.model("Document", documentSchema);