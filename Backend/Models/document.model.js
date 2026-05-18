const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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
  viewedByManager: { type: Boolean, default: false },
  viewedByAdmin: { type: Boolean, default: false },
  viewedBySuperAdmin: { type: Boolean, default: false },
});

documentSchema.index({ employee: 1, fileType: 1 });
documentSchema.index({ employee: 1, uploadedAt: -1 });
documentSchema.index({ underManager: 1, fileType: 1 });

module.exports = mongoose.model("Document", documentSchema);