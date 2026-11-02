const mongoose = require("mongoose");

// One document per chat thread.
//   direct  -> exactly 2 people (1:1). `directKey` makes it unique per pair.
//   group   -> 2..MAX_GROUP_MEMBERS people, with admin/member roles.
//   meeting -> auto-created chat that belongs to a scheduled Meeting.
// "A person" is always {model, id}: User | Manager | Admin | SuperAdmin.
const PERSON_MODELS = ["User", "Manager", "Admin", "SuperAdmin"];

const participantSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // `${model}:${id}` - cheap lookups/filters
    member: { type: mongoose.Schema.Types.ObjectId, refPath: "participants.memberModel", required: true },
    memberModel: { type: String, enum: PERSON_MODELS, required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: Date.now },
    unread: { type: Number, default: 0, min: 0 },
    muted: { type: Boolean, default: false },
    // per-person chat settings (every person sees their own wallpaper / pin)
    wallpaper: { type: String, default: "" }, // preset id ("preset:sunset"), "color:#hex" or an image url
    pinned: { type: Boolean, default: false },
    archived: { type: Boolean, default: false }, // moved to "Archived chats" (comes back on a new message unless muted)
    clearedAt: { type: Date, default: null }, // "clear chat": older messages are hidden for this person only
    favourite: { type: Boolean, default: false }, // shows up under the "Favourites" chip
    mentionUnread: { type: Number, default: 0, min: 0 }, // unread @mentions of me (the "@" badge); reset when I open the chat
    // half-typed message: comes back when the person returns, on any device
    draft: {
      text: { type: String, default: "", maxlength: 5000 },
      replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", default: undefined },
      updatedAt: { type: Date, default: null },
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    type: { type: String, enum: ["direct", "group", "meeting"], required: true },

    name: { type: String, trim: true, maxlength: 80, default: "" },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    photo: { type: String, default: "" },

    // group rules (admins change them)
    settings: {
      onlyAdminsCanSend: { type: Boolean, default: false }, // announcement-style group
      onlyAdminsCanEditInfo: { type: Boolean, default: true }, // name / description / photo (true = same as before this option existed)
      onlyAdminsCanAddMembers: { type: Boolean, default: true },
      onlyAdminsCanPin: { type: Boolean, default: false }, // pinning messages to the top of the chat
    },

    // disappearing messages: new messages vanish this many seconds after they are sent (0 = off)
    disappearingSeconds: { type: Number, enum: [0, 86400, 604800, 7776000], default: 0 },

    // messages pinned to the top of the chat (max 3, newest last)
    pinnedMessages: {
      type: [
        {
          message: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", required: true },
          pinnedByKey: { type: String, default: "" },
          pinnedAt: { type: Date, default: Date.now },
          expiresAt: { type: Date, default: null },
          _id: false,
        },
      ],
      default: [],
    },

    // group invite link: anyone in the SAME organisation who has the code can join while `enabled`
    invite: {
      code: { type: String, default: undefined },
      enabled: { type: Boolean, default: false },
      createdByKey: { type: String, default: "" },
      createdAt: { type: Date, default: null },
    },

    participants: { type: [participantSchema], default: [] },
    participantKeys: { type: [String], default: [], index: true }, // mirror of participants[].key for fast "my chats" queries

    directKey: { type: String, default: undefined },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", default: undefined },

    createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: "createdByModel" },
    createdByModel: { type: String, enum: PERSON_MODELS },

    lastMessage: {
      message: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" },
      text: { type: String, default: "" },
      type: { type: String, default: "text" },
      senderKey: { type: String, default: "" },
      senderName: { type: String, default: "" },
      at: { type: Date },
    },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

conversationSchema.index({ organisation_id: 1, participantKeys: 1, lastMessageAt: -1 });
conversationSchema.index(
  { organisation_id: 1, directKey: 1 },
  { unique: true, partialFilterExpression: { directKey: { $type: "string" } } }
);

conversationSchema.index({ "invite.code": 1 }, { unique: true, partialFilterExpression: { "invite.code": { $type: "string" } } });

conversationSchema.statics.PERSON_MODELS = PERSON_MODELS;
conversationSchema.statics.MAX_GROUP_MEMBERS = 256;
conversationSchema.statics.DISAPPEARING_OPTIONS = [0, 86400, 604800, 7776000]; // off / 24 hours / 7 days / 90 days
conversationSchema.statics.MAX_PINNED_MESSAGES = 3;

module.exports = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
