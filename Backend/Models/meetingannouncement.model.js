const mongoose = require("mongoose");

const seenSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const meetingAnnouncementSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true, index: true },
    authorKey: { type: String, required: true },
    title: { type: String, trim: true, maxlength: 150, default: "" },
    text: { type: String, trim: true, required: true, maxlength: 3000 },
    pinned: { type: Boolean, default: false },
    audience: {
      attendees: { type: Boolean, default: true },
      rsvp: { type: [String], default: [] },
      interested: { type: Boolean, default: false },
      guests: { type: Boolean, default: false },
    },
    recipientKeys: { type: [String], default: [], index: true },
    guestEmails: { type: [String], default: [] },
    emailedCount: { type: Number, default: 0 },
    seenBy: { type: [seenSchema], default: [] },
    seenKeys: { type: [String], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

meetingAnnouncementSchema.index({ meeting: 1, createdAt: -1 });

module.exports = mongoose.models.MeetingAnnouncement || mongoose.model("MeetingAnnouncement", meetingAnnouncementSchema);
