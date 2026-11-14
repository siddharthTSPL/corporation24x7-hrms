const mongoose = require("mongoose");

// A community = a named space that groups several channels (e.g. "Engineering", "Sales India").
// Channels themselves are Conversation documents (type "group" with channel.enabled = true)
// that point back here through channel.community, so every chat feature keeps working in them.
const communitySchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    color: { type: String, default: "#730042" },
    members: {
      type: [{ _id: false, key: { type: String, required: true }, role: { type: String, enum: ["admin", "member"], default: "member" }, joinedAt: { type: Date, default: Date.now } }],
      default: [],
    },
    memberKeys: { type: [String], default: [], index: true },
    announcementChannel: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", default: undefined },
    createdByKey: { type: String, default: "" },
  },
  { timestamps: true }
);

communitySchema.index({ organisation_id: 1, name: 1 });
communitySchema.statics.MAX_MEMBERS = 5000;

module.exports = mongoose.models.Community || mongoose.model("Community", communitySchema);
