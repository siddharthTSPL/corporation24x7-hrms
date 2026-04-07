const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
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
    ref: "Admin",
    required: true,
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

module.exports = mongoose.model("Announcement", announcementSchema);
