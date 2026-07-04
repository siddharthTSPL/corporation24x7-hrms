const mongoose = require("mongoose");

const faceProfileSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "onModel",
      required: true,
    },
    onModel: {
      type: String,
      enum: ["User", "Manager", "Admin"],
      required: true,
    },
    role: {
      type: String,
      enum: ["employee", "manager", "admin"],
      required: true,
    },
    // 512-length numeric vector produced by the face recognition model.
    // This is the "trained data" for one person — not a photo, just numbers
    // describing that face's unique geometry.
    embedding: {
      type: [Number],
      required: true,
    },
    photoSample: String, // optional: store the enrollment photo URL for admin review/audit
    enrolledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

// One face profile per employee per organisation.
faceProfileSchema.index({ organisation_id: 1, employee: 1 }, { unique: true });

module.exports = mongoose.model("FaceProfile", faceProfileSchema);
