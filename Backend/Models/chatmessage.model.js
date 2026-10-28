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

const chatMessageSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },

    // text | file | sticker | system (joined/left/renamed...) | call (call started/ended/missed summary)
    type: { type: String, enum: ["text", "file", "sticker", "system", "call"], default: "text" },

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
chatMessageSchema.index({ conversation: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: "string" } } });

module.exports = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatMessageSchema);
