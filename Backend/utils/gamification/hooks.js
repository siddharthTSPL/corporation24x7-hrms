// Non-invasive event hooks. Mongoose plugins attached to existing schemas fire
// gamification events on real state changes, so every code path (web, kiosk,
// biometric, desktop agent ...) is covered without editing each controller.
// Everything is fire-and-forget: a gamification failure can never break the
// HR action that triggered it.
const fire = (opts) => {
  try {
    const { safeAward } = require("./engine");
    safeAward(opts).catch(() => {});
  } catch (_) { /* never block */ }
};

const keyParts = (key) => {
  const i = String(key || "").indexOf(":");
  return i > 0 ? { model: key.slice(0, i), id: key.slice(i + 1) } : null;
};

// Capture "what changed" before the save, act on it after.
const trackSave = (schema, paths, handler) => {
  schema.pre("save", function () {
    this.$locals.gam = { isNew: this.isNew, changed: Object.fromEntries(paths.map((p) => [p, this.isModified(p)])) };
  });
  schema.post("save", function (doc) {
    try { handler(doc, (doc.$locals && doc.$locals.gam) || { isNew: false, changed: {} }); } catch (_) { /* never block */ }
  });
};

// Attendance: check-in / on-time / completed-day (all channels).
exports.attendancePlugin = (schema) => {
  trackSave(schema, ["checkIn", "checkOut", "source"], (doc, g) => {
    if (!doc.employee || !doc.organisation_id || !doc.onModel) return;
    const base = { organisation_id: doc.organisation_id, model: doc.onModel, id: doc.employee };
    const checkedIn = doc.checkIn && doc.source !== "agent" && (g.isNew || g.changed.checkIn || g.changed.source);
    if (checkedIn) {
      fire({ ...base, event: "attendance_checkin", dedupeKey: `ci:${doc._id}` });
      if (!doc.isLate) fire({ ...base, event: "attendance_ontime", dedupeKey: `ot:${doc._id}` });
    }
    if (doc.checkOut && g.changed.checkOut && doc.status === "present") {
      fire({ ...base, event: "attendance_checkout", dedupeKey: `co:${doc._id}` });
    }
  });
};

// Timesheet: submitted + approved (owner is rewarded, not the approver).
exports.timesheetPlugin = (schema) => {
  trackSave(schema, ["submitted_at", "status"], (doc, g) => {
    if (!doc.owner || !doc.owner_model) return;
    const base = { organisation_id: doc.organisation_id, model: doc.owner_model, id: doc.owner };
    if (doc.submitted_at && g.changed.submitted_at) fire({ ...base, event: "timesheet_submitted", dedupeKey: `tsub:${doc._id}` });
    if (doc.status === "approved" && g.changed.status) fire({ ...base, event: "timesheet_approved", dedupeKey: `tsapp:${doc._id}` });
  });
};

// Review: reviewer on creation, reviewee when they acknowledge.
exports.reviewPlugin = (schema) => {
  trackSave(schema, ["revieweeAcceptance.status"], (doc, g) => {
    const rv = doc.reviewerRoleModel;
    if (g.isNew && ["Admin", "Manager", "User"].includes(rv)) {
      fire({ organisation_id: doc.organisation_id, model: rv, id: doc.reviewer, event: "review_submitted", dedupeKey: `rvs:${doc._id}` });
    }
    const acc = doc.revieweeAcceptance && doc.revieweeAcceptance.status;
    if (acc === "accepted" && g.changed["revieweeAcceptance.status"]) {
      fire({ organisation_id: doc.organisation_id, model: doc.revieweeRoleModel, id: doc.reviewee, event: "review_accepted", dedupeKey: `rva:${doc._id}` });
    }
  });
};

// Policy acknowledgement.
exports.policyAckPlugin = (schema) => {
  trackSave(schema, ["status"], (doc, g) => {
    if (doc.status === "ACKNOWLEDGED" && g.changed.status && ["User", "Manager", "Admin"].includes(doc.employeeModel)) {
      fire({ organisation_id: doc.organisation_id, model: doc.employeeModel, id: doc.employee, event: "policy_acknowledged", dedupeKey: `pol:${doc._id}` });
    }
  });
};

// Meeting action items closed by their assignee.
exports.actionItemPlugin = (schema) => {
  trackSave(schema, ["status"], (doc, g) => {
    if (doc.status !== "done" || !g.changed.status) return;
    const p = keyParts(doc.assigneeKey);
    if (p && ["User", "Manager", "Admin"].includes(p.model)) fire({ organisation_id: doc.organisation_id, model: p.model, id: p.id, event: "meeting_action_done", dedupeKey: `ai:${doc._id}` });
  });
};

// Non-anonymous suggestions raised through TorchX Voice.
exports.ticketPlugin = (schema) => {
  trackSave(schema, [], (doc, g) => {
    if (!g.isNew || doc.type !== "suggestion" || doc.isAnonymous || !doc.submittedBy) return;
    if (!["User", "Manager", "Admin"].includes(doc.submitterModel)) return;
    fire({ organisation_id: doc.organisation_id, model: doc.submitterModel, id: doc.submittedBy, event: "suggestion_submitted", dedupeKey: `sug:${doc._id}` });
  });
};

// Meeting feedback is written with findOneAndUpdate(upsert).
exports.meetingFeedbackPlugin = (schema) => {
  schema.post("findOneAndUpdate", function (doc) {
    try {
      const p = doc && keyParts(doc.key);
      if (p && ["User", "Manager", "Admin"].includes(p.model)) fire({ organisation_id: doc.organisation_id, model: p.model, id: p.id, event: "meeting_feedback_given", dedupeKey: `mf:${doc._id}` });
    } catch (_) { /* never block */ }
  });
};

// Called from controllers that use update queries instead of save().
exports.trainingCompleted = (training) => {
  if (!training || !training.trainee) return;
  fire({ organisation_id: training.organisation_id, model: training.trainee.model, id: training.trainee.id, event: "training_completed", dedupeKey: `tr:${training._id}` });
};

exports.profilePhotoAdded = (organisation_id, model, id, account) => {
  fire({ organisation_id, model, id, event: "profile_photo", dedupeKey: `pp:${model}:${id}` });
  const needed = ["personal_contact", "e_contact", "address", "city", "state", "pincode"];
  if (account && needed.every((f) => account[f] && String(account[f]).trim())) {
    fire({ organisation_id, model, id, event: "profile_complete", dedupeKey: `pc:${model}:${id}` });
  }
};
