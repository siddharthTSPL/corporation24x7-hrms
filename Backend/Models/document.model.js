const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fileType: {
    type: String,
    enum: ["personal", "expense"],
    required: true,
  },
  fileUrl: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  viewedByManager: { type: Boolean, default: false },
});

module.exports = mongoose.model("Document", documentSchema);