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

    // text | file | system (joined/left/renamed...) | call (call started/ended/missed summary)
    type: { type: String, enum: ["text", "file", "system", "call"], default: "text" },

    sender: { type: mongoose.Schema.Types.ObjectId, refPath: "senderModel", default: undefined },
    senderModel: { type: String, enum: PERSON_MODELS, default: undefined },
    senderKey: { type: String, default: "" },

    text: { type: String, default: "", maxlength: 5000 },
    attachments: { type: [attachmentSchema], default: [] },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", default: undefined },

    // system / call payload, e.g. { event: "member_added", targets: [...] } or { callType, duration, status }
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },

    clientId: { type: String, default: undefined }, // lets the sender de-dupe its optimistic message
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversation: 1, createdAt: -1 });
chatMessageSchema.index({ conversation: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: "string" } } });

module.exports = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatMessageSchema);
