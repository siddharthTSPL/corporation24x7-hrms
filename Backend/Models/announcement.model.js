const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
   organisation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SuperAdmin",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
   createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "createdByModel",
  },

  createdByModel: {
    type: String,
    required: true,
    enum: ["Admin", "SuperAdmin"],
  },
  audience: {
    type: String,
    enum: ["employees", "managers", "all"],
    default: "all",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "low",
  },
  notice_image: {
    type: String,
  },
  expiresAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }, 
  
});

announcementSchema.index({ audience: 1, createdAt: -1 });
announcementSchema.index({ expiresAt: 1 }, { sparse: true });

module.exports = mongoose.model("Announcement", announcementSchema);