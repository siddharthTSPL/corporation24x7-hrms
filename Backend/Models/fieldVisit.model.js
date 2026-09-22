const mongoose = require("mongoose");
const {
  ACTIVITY_TYPES,
  ASSIGNMENT_TYPES,
  ACTIVITY_PRIORITIES,
} = require("../utils/fieldWorkConstants");

const visitPointSchema = new mongoose.Schema(
  {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    capturedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// Kept as its own sub-document array (not a separate collection) — a visit
// is reassigned at most a handful of times, so embedding is simplest and
// keeps the full chain visible on a single fetch without a join.
const reassignmentEntrySchema = new mongoose.Schema(
  {
    fromEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    toEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reassignedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    reassignedByModel: {
      type: String,
      enum: ["SuperAdmin", "Admin", "Manager"],
      required: true,
    },
    reason: { type: String, trim: true, maxlength: 300, default: "" },
    reassignedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const fieldVisitSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },
    // `session` is required for OPEN activities (the employee must be on an
    // active field-duty session to create one themselves). ASSIGNED
    // activities can be created ahead of time by a manager/admin before the
    // employee has started duty for the day, so this stays optional and is
    // filled in when the employee actually starts the assigned work.
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldDutySession",
      default: null,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FieldTeam",
      default: null,
    },

    // ── Open vs Assigned (spec section 3 & 18) ──────────────────────────
    assignmentType: {
      type: String,
      enum: ASSIGNMENT_TYPES,
      default: "open",
      index: true,
    },
    activityType: {
      type: String,
      enum: ACTIVITY_TYPES,
      default: "customer_visit",
      index: true,
    },
    priority: {
      type: String,
      enum: ACTIVITY_PRIORITIES,
      default: "medium",
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    assignedByModel: {
      type: String,
      enum: ["SuperAdmin", "Admin", "Manager", null],
      default: null,
    },
    assignedAt: { type: Date, default: null },
    scheduledDate: { type: Date, default: null },
    scheduledTime: { type: String, trim: true, maxlength: 10, default: "" }, // "HH:mm", display only
    reassignmentHistory: { type: [reassignmentEntrySchema], default: [] },

    customerName: { type: String, required: true, trim: true, maxlength: 160 },
    organisationName: { type: String, trim: true, maxlength: 160, default: "" },
    contactNumber: { type: String, trim: true, maxlength: 30, default: "" },
    purpose: { type: String, trim: true, maxlength: 300, default: "" },

    // Legacy free-text field, kept for backward compatibility with existing
    // records/UI. New code should use `activityType` instead.
    visitType: { type: String, trim: true, maxlength: 60, default: "" },
    attachments: [{ type: String, trim: true }],
    // Parallel array to `attachments` (matched by `url`) holding where each
    // individual photo was actually captured. Kept separate from
    // `attachments` itself — rather than turning it into an array of
    // objects — so every existing reader of `attachments` (frontend +
    // backend) keeps working unchanged on old records that predate this
    // field. Before this, the map only had the visit's single shared
    // start/end location to pin photos at, so every photo of a visit
    // landed on the same spot instead of where it was actually taken.
    attachmentLocations: [
      {
        _id: false,
        url: { type: String, trim: true, required: true },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        accuracy: { type: Number, default: null },
        capturedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: [
        "pending", // assigned but not started yet
        "in_progress",
        "completed",
        "skipped",
        "follow_up_required",
        "cancelled",
      ],
      default: "in_progress",
      index: true,
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    startLocation: { type: visitPointSchema, default: null },
    endLocation: { type: visitPointSchema, default: null },

    // ── Geofencing (spec section 35) ────────────────────────────────────
    expectedLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      radiusMeters: { type: Number, default: null },
    },
    geofenceStatus: {
      atStart: {
        withinFence: { type: Boolean, default: null },
        distanceMeters: { type: Number, default: null },
      },
      atEnd: {
        withinFence: { type: Boolean, default: null },
        distanceMeters: { type: Number, default: null },
      },
    },

    notes: { type: String, trim: true, maxlength: 3000, default: "" },
    outcome: { type: String, trim: true, maxlength: 1000, default: "" },
    followUpAt: { type: Date, default: null },
    cancelledReason: { type: String, trim: true, maxlength: 300, default: "" },
    clientEventId: { type: String, trim: true, default: null },
  },
  { timestamps: true },
);

fieldVisitSchema.index({ organisation_id: 1, employee: 1, startedAt: -1 });
fieldVisitSchema.index({ organisation_id: 1, employee: 1, status: 1 });
fieldVisitSchema.index({
  organisation_id: 1,
  assignmentType: 1,
  scheduledDate: 1,
});
fieldVisitSchema.index(
  { organisation_id: 1, employee: 1, clientEventId: 1 },
  { unique: true, sparse: true },
);

module.exports = mongoose.model("FieldVisit", fieldVisitSchema);