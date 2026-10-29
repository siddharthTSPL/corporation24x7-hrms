const mongoose = require("mongoose");

const PERSON_MODELS = ["User", "Manager", "Admin", "SuperAdmin"];

const attendeeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    person: { type: mongoose.Schema.Types.ObjectId, refPath: "attendees.personModel", required: true },
    personModel: { type: String, enum: PERSON_MODELS, required: true },
    // host is always "accepted". Everyone else starts as "invited".
    rsvp: { type: String, enum: ["invited", "accepted", "declined", "tentative"], default: "invited" },
    respondedAt: { type: Date, default: null },
    reminderSent: { type: Boolean, default: false },
  },
  { _id: false }
);

// Outsiders (no account in this organisation) invited by email. They get a personal
// 6-digit PIN by mail; only a salted hash of it is stored. See utils/chat/guest.service.js.
const guestSchema = new mongoose.Schema(
  {
    guestId: { type: mongoose.Schema.Types.ObjectId, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, trim: true, maxlength: 80, default: "" },
    pinHash: { type: String, default: "" },
    pinSalt: { type: String, default: "" },
    pinAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    invitedAt: { type: Date, default: Date.now },
    invitedByKey: { type: String, default: "" },
    lastJoinedAt: { type: Date, default: null },
    joinCount: { type: Number, default: 0 },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
  },
  { _id: false }
);

const interestSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    person: { type: mongoose.Schema.Types.ObjectId, refPath: "interested.personModel", required: true },
    personModel: { type: String, enum: PERSON_MODELS, required: true },
    note: { type: String, trim: true, maxlength: 200, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 3000, default: "" },
    agenda: { type: String, trim: true, maxlength: 3000, default: "" },

    host: { type: mongoose.Schema.Types.ObjectId, refPath: "hostModel", required: true },
    hostModel: { type: String, enum: PERSON_MODELS, required: true },
    hostKey: { type: String, required: true },
    coHostKeys: { type: [String], default: [] }, // can end the meeting / remove people, like the host

    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    timezone: { type: String, default: "Asia/Kolkata" },

    media: { type: String, enum: ["audio", "video"], default: "video" },

    attendees: { type: [attendeeSchema], default: [] },
    attendeeKeys: { type: [String], default: [], index: true },

    // Outsiders invited by email + PIN. Always wait in the lobby until the host admits them.
    guests: { type: [guestSchema], default: [] },

    // How the invite list was built. Stored so the UI can show "Everyone in the organisation".
    audience: {
      everyone: { type: Boolean, default: false },
      departments: { type: [String], default: [] },
      teams: { type: [String], default: [] }, // hr | it | accounts
    },

    // Repeat. Each occurrence is its own Meeting document (series = same seriesId).
    recurrence: {
      freq: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
      interval: { type: Number, default: 1, min: 1, max: 12 },
      until: { type: Date, default: null },
    },
    seriesId: { type: String, default: undefined, index: true },

    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", default: undefined }, // in-meeting chat
    roomKey: { type: String, required: true }, // meeting:<id>
    allowJoinBeforeHost: { type: Boolean, default: false },

    settings: {
      lobby: { type: Boolean, default: false },
      muteOnEntry: { type: Boolean, default: false },
      allowUnmute: { type: Boolean, default: true },
      chatEnabled: { type: Boolean, default: true },
      reactionsEnabled: { type: Boolean, default: true },
      handRaiseEnabled: { type: Boolean, default: true },
      screenShare: { type: String, enum: ["everyone", "host"], default: "everyone" },
    },

    visibility: { type: String, enum: ["invite_only", "organisation"], default: "invite_only", index: true },
    capacity: { type: Number, default: 0, min: 0, max: 5000 },
    interested: { type: [interestSchema], default: [] },
    interestedKeys: { type: [String], default: [], index: true },
    lastNudgeAt: { type: Date, default: null },

    reminderMinutes: { type: Number, default: 10, min: 0, max: 1440 },
    reminderSentAt: { type: Date, default: null },

    status: { type: String, enum: ["scheduled", "live", "ended", "cancelled"], default: "scheduled", index: true },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    cancelReason: { type: String, default: "" },
    sequence: { type: Number, default: 0 }, // bumped on every edit; used by the .ics file
  },
  { timestamps: true }
);

meetingSchema.index({ organisation_id: 1, attendeeKeys: 1, startTime: 1 });
meetingSchema.index({ status: 1, startTime: 1 });

meetingSchema.statics.PERSON_MODELS = PERSON_MODELS;

module.exports = mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);
