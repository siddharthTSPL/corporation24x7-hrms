const mongoose = require("mongoose");

// Whiteboard drawn during a meeting. Coordinates are normalised 0..1 by the client.
const strokeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    k: { type: String, default: "" }, // drawer's person key
    tool: { type: String, default: "pen" },
    color: { type: String, default: "#000000" },
    width: { type: Number, default: 3 },
    points: { type: [Number], default: [] }, // flat [x1,y1,x2,y2,...]
    text: { type: String, default: "" },
  },
  { _id: false }
);

const meetingBoardSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
    strokes: { type: [strokeSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MeetingBoard || mongoose.model("MeetingBoard", meetingBoardSchema);
