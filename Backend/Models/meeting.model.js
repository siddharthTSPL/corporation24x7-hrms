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
