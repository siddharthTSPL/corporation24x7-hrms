const mongoose = require("mongoose");

const PERSON_MODELS = ["User", "Manager", "Admin", "SuperAdmin"];

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    fileId: { type: String, default: "" }, // ImageKit id, so the file can be deleted with the message
    name: { type: String, default: "" },
    mime: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

// formatting ranges (see utils/chat/formatting.js)
const entitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["bold", "italic", "strike", "code", "pre"], required: true },
    start: Number,
    end: Number,
    contentStart: Number,
    contentEnd: Number,
  },
  { _id: false }
);

const mentionSchema = new mongoose.Schema(
  { key: { type: String, required: true }, name: { type: String, default: "" } },
  { _id: false }
);

const linkPreviewSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    siteName: { type: String, default: "" },
  },
  { _id: false }
);

// group poll. `votes` holds the keys of the people who chose that option.
const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, maxlength: 255 },
    multiple: { type: Boolean, default: false }, // allow more than one answer
    anonymous: { type: Boolean, default: false }, // hide who voted for what
    options: {
      type: [{ id: { type: String, required: true }, text: { type: String, required: true, maxlength: 100 }, votes: { type: [String], default: [] }, _id: false }],
      default: [],
    },
    closedAt: { type: Date, default: null },
    closedByKey: { type: String, default: "" },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },

    // text | file | sticker | system (joined/left/renamed...) | call (call started/ended/missed summary)
    type: { type: String, enum: ["text", "file", "sticker", "system", "call", "poll"], default: "text" },

    sender: { type: mongoose.Schema.Types.ObjectId, refPath: "senderModel", default: undefined },
    senderModel: { type: String, enum: PERSON_MODELS, default: undefined },
    senderKey: { type: String, default: "" },

    text: { type: String, default: "", maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", default: undefined },

    // system / call payload, e.g. { event: "member_added", targets: [...] } or { callType, duration, status }
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },

    // one emoji per person per message (tap the same emoji again to remove it)
    reactions: {
      type: [{ key: { type: String, required: true }, emoji: { type: String, required: true, maxlength: 16 }, at: { type: Date, default: Date.now }, _id: false }],
      default: [],
    },
    // keys of people whose device has received the message (grey double tick)
    deliveredTo: { type: [String], default: [] },
    // message info: WHEN each person got / read it (deliveredTo above stays the quick lookup)
    deliveries: { type: [{ key: { type: String, required: true }, at: { type: Date, default: Date.now }, _id: false }], default: [] },
    readBy: { type: [{ key: { type: String, required: true }, at: { type: Date, default: Date.now }, _id: false }], default: [] },

    entities: { type: [entitySchema], default: [] }, // bold / italic / code ranges inside `text`
    mentions: { type: [mentionSchema], default: [] }, // people tagged with @name
    mentionsAll: { type: Boolean, default: false }, // @all / @everyone
    links: { type: [String], default: [] }, // urls found in the text (feeds the "Links" tab)
    linkPreviews: { type: [linkPreviewSchema], default: [] }, // cards, filled in a moment after sending
    poll: { type: pollSchema, default: undefined },

    // disappearing messages: removed for everyone once this time passes
    expiresAt: { type: Date, default: null },
    // "delete for me": the message disappears only for these people
    deletedFor: { type: [String], default: [] },
    forwarded: { type: Boolean, default: false },

    clientId: { type: String, default: undefined }, // lets the sender de-dupe its optimistic message
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversation: 1, createdAt: -1 });
chatMessageSchema.index({ expiresAt: 1 }, { partialFilterExpression: { expiresAt: { $type: "date" } } });
chatMessageSchema.index({ conversation: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: "string" } } });

module.exports = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatMessageSchema);
