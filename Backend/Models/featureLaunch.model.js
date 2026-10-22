const mongoose = require("mongoose");

const featureLaunchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    pdf: {
      name: { type: String, default: "" },
      contentType: { type: String, default: "application/pdf" },
      data: { type: Buffer, default: null },
    },
    launchedAt: { type: Date, default: Date.now },
    notifyClaimedAt: { type: Date, default: null },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

featureLaunchSchema.index({ notifiedAt: 1, notifyClaimedAt: 1 });

module.exports =
  mongoose.models.FeatureLaunch || mongoose.model("FeatureLaunch", featureLaunchSchema);