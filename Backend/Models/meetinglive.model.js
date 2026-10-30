const mongoose = require("mongoose");

// One document per meeting. Holds everything the "live extras" collect while the room is
// running: transcript, talk time, decisions, agenda log, pulse rounds, wheel spins, etc.
// Written by utils/chat/meetingLive.service.js (buffered; flushed every few seconds and when the room closes).
const meetingLiveSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    meeting: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },

    transcript: {
      type: [{ _id: false, k: String, n: String, t: String, at: Date, lang: String }],
      default: [],
    },
    transcriptShared: { type: Boolean, default: false },

    // { "<personKey>": milliseconds spoken }
    talkMs: { type: mongoose.Schema.Types.Mixed, default: {} },
    // { "<personKey>": "Display name" } so reports still work for guests / ex-employees
    names: { type: mongoose.Schema.Types.Mixed, default: {} },

    decisions: {
      type: [{ _id: false, id: String, text: String, byKey: String, byName: String, at: Date }],
      default: [],
    },
    agendaLog: {
      type: [{ _id: false, title: String, plannedMin: Number, spentSec: Number, status: String, startedAt: Date, endedAt: Date }],
      default: [],
    },
    pulseRounds: {
      type: [{ _id: false, prompt: String, at: Date, count: Number, avg: Number, dist: [Number] }],
      default: [],
    },
    wheelHistory: {
      type: [{ _id: false, at: Date, pool: String, winnerKey: String, winnerName: String, byKey: String }],
      default: [],
    },
    recordingLog: {
      type: [{ _id: false, on: Boolean, at: Date, byKey: String, byName: String }],
      default: [],
    },
    breakoutLog: {
      type: [{ _id: false, startedAt: Date, endedAt: Date, rooms: Number, people: Number, byKey: String }],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MeetingLive || mongoose.model("MeetingLive", meetingLiveSchema);
