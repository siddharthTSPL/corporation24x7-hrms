const FieldTeam = require("../Models/fieldTeam.model");
const FieldDutySession = require("../Models/fieldDutySession.model");
const FieldLocation = require("../Models/fieldLocation.model");
const FieldVisit = require("../Models/fieldVisit.model");
const FieldAssignment = require("../Models/fieldAssignment.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const SuperAdmin = require("../Models/superadmin.model");
const FaceProfile = require("../Models/faceprofile.model");
const { getEmbedding, cosineSimilarity } = require("../utils/faceService");
const { getDistance } = require("geolib");
const {
  resolveActor,
  resolveOrgId,
  httpError,
} = require("../utils/heirarchy.utils");
const {
  createNotification,
  createBulkNotifications,
} = require("../utils/Notification.utils");
const imagekit = require("../utils/imagekit.utils");
const { logAudit } = require("../utils/auditLog.utils");
const {
  parseFieldAssignmentWorkbook,
  buildFieldAssignmentTemplateWorkbook,
} = require("../utils/fieldBulkAssign.utils");
const Department = require("../Models/department.model");
const {
  ACTIVITY_TYPES,
  ACTIVITY_PRIORITIES,
  GEOFENCE_MODES,
  FIELD_CHECKPOINT_INTERVAL_MINUTES,
  FIELD_CHECKPOINT_GRACE_PERIOD_MINUTES,
  resolveMinDurationMinutes,
} = require("../utils/fieldWorkConstants");

const OPEN_STATUSES = ["active", "paused", "offline"];
const STAFF_ROLES = ["SuperAdmin", "Admin", "Manager"];
const FACE_MATCH_THRESHOLD = 0.62;
// A field employee moving faster than this between two GPS fixes almost
// certainly isn't walking/driving there for real — flag the point instead
// of trusting it for the live marker, distance total, or duration.
const IMPLAUSIBLE_SPEED_KPH = 180;
const VISIT_PHOTO_ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const VISIT_PHOTO_MAX_SIZE = 4 * 1024 * 1024;
const VISIT_PHOTO_MAX_COUNT = 6;
// Legacy fallback only — real minimum duration now comes from
// resolveMinDurationMinutes(activityType) in utils/fieldWorkConstants.js.
const MIN_VISIT_MINUTES = 20;

// Checkpoint status derivation shared by myDuty/getOverview (spec section 24).
function computeCheckpointStatus(session, now = new Date()) {
  if (!session || !OPEN_STATUSES.includes(session.status)) return null;
  const last = new Date(session.lastCheckInAt || session.startedAt);
  const dueAt = new Date(
    last.getTime() + FIELD_CHECKPOINT_INTERVAL_MINUTES * 60000,
  );
  const overdueAt = new Date(
    dueAt.getTime() + FIELD_CHECKPOINT_GRACE_PERIOD_MINUTES * 60000,
  );
  let status = "not_due";
  if (now >= overdueAt) status = "overdue";
  else if (now >= dueAt) status = "due";
  return { status, dueAt, overdueAt, lastCheckpointAt: last };
}

const asPoint = (input, required = true) => {
  const latitude = Number(input?.latitude);
  const longitude = Number(input?.longitude);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    if (!required && (!input || Object.keys(input).length === 0)) return null;
    throw httpError("A valid latitude and longitude are required", 400);
  }
  const capturedAt = input?.capturedAt
    ? new Date(input.capturedAt)
    : new Date();
  if (Number.isNaN(capturedAt.getTime()))
    throw httpError("Invalid location timestamp", 400);
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(Number(input?.accuracy))
      ? Number(input.accuracy)
      : null,
    capturedAt,
  };
};

const actorContext = (req) => ({
  actor: resolveActor(req),
  organisation_id: resolveOrgId(req),
});
const isStaff = (actor) => STAFF_ROLES.includes(actor.model);

const getMovement = ({ previous, point, speedMps }) => {
  if (!previous)
    return {
      distanceFromPreviousMeters: null,
      speedKph: null,
      movementStatus: "unknown",
    };
  const distanceFromPreviousMeters = getDistance(
    { latitude: previous.latitude, longitude: previous.longitude },
    { latitude: point.latitude, longitude: point.longitude },
  );
  const elapsedSeconds = Math.max(
    1,
    (point.capturedAt - previous.capturedAt) / 1000,
  );
  const derivedKph = (distanceFromPreviousMeters / elapsedSeconds) * 3.6;
  const browserKph =
    Number.isFinite(Number(speedMps)) && Number(speedMps) >= 0
      ? Number(speedMps) * 3.6
      : null;
  const speedKph = browserKph ?? derivedKph;
  const movementStatus =
    speedKph < 1 ? "stationary" : speedKph < 8 ? "slow_moving" : "moving";
  return {
    distanceFromPreviousMeters,
    speedKph: Number(speedKph.toFixed(1)),
    movementStatus,
  };
};

const isInsideGeofence = (point, geofence) => {
  if (
    !geofence ||
    !Number.isFinite(geofence.latitude) ||
    !Number.isFinite(geofence.longitude) ||
    !Number.isFinite(geofence.radiusMeters)
  )
    return null;
  return (
    getDistance(
      { latitude: point.latitude, longitude: point.longitude },
      { latitude: geofence.latitude, longitude: geofence.longitude },
    ) <= geofence.radiusMeters
  );
};

const parseGeofence = (input) => {
  if (
    !input ||
    input.latitude === "" ||
    input.longitude === "" ||
    input.radiusMeters === ""
  )
    return undefined;
  const latitude = Number(input.latitude),
    longitude = Number(input.longitude),
    radiusMeters = Number(input.radiusMeters);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters < 25 ||
    radiusMeters > 50000
  ) {
    throw httpError(
      "Geofence requires valid latitude, longitude, and a radius from 25 to 50,000 metres",
      400,
    );
  }
  return { latitude, longitude, radiusMeters };
};

async function assertFieldOperationsEnabled(organisation_id) {
  const organisation = await SuperAdmin.findById(organisation_id)
    .select("field_operations")
    .lean();
  if (!organisation) throw httpError("Organisation not found", 404);
  if (organisation.field_operations?.enabled === false)
    throw httpError("Field Operations is disabled for this organisation", 403);
  return (
    organisation.field_operations || {
      max_field_employees: 50,
      max_managers: 10,
      data_retention_days: 180,
      require_face_verification: false,
      geofence_mode: "off",
      min_duration_overrides: {},
    }
  );
}

async function verifyDutySelfie({
  organisation_id,
  employeeId,
  selfieBase64,
  required,
  context = "before starting field duty",
}) {
  if (!selfieBase64 && !required) return null;
  if (!selfieBase64)
    throw httpError(`Face verification is required ${context}`, 403);
  if (typeof selfieBase64 !== "string" || selfieBase64.length > 8 * 1024 * 1024)
    throw httpError("Invalid face verification image", 400);
  const profile = await FaceProfile.findOne({
    organisation_id,
    employee: employeeId,
    onModel: "User",
  })
    .select("embedding")
    .lean();
  if (!profile)
    throw httpError(
      "Your face is not enrolled. Ask your administrator to register it before field duty.",
      403,
    );
  const embedding = await getEmbedding(
    selfieBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, ""),
  );
  const score = cosineSimilarity(embedding, profile.embedding);
  if (score < FACE_MATCH_THRESHOLD)
    throw httpError(
      "Face could not be verified. Use good lighting and look directly at the camera.",
      403,
    );
  return { verifiedAt: new Date(), score: Number(score.toFixed(3)) };
}

// A field employee's assignment can be TEAM (FieldTeam.members) or
// INDIVIDUAL (FieldAssignment, active:true) — never both (enforced in
// createTeam/updateTeam/createIndividualAssignment). This helper checks
// both and returns whichever applies, or throws if the employee has
// neither — i.e. their permanent Field Work assignment state is NONE.
async function assertEmployeeCanUseFieldOperations(req) {
  const { actor, organisation_id } = actorContext(req);
  await assertFieldOperationsEnabled(organisation_id);
  if (actor.model !== "User")
    throw httpError(
      "Only field employees can start or update a duty session",
      403,
    );

  const team = await FieldTeam.findOne({
    organisation_id,
    members: actor.id,
    active: true,
  })
    .select("_id")
    .lean();
  if (team) return { actor, organisation_id, teamId: team._id };

  const individual = await FieldAssignment.findOne({
    organisation_id,
    employee: actor.id,
    active: true,
  })
    .select("_id")
    .lean();
  if (individual) return { actor, organisation_id, teamId: null };

  throw httpError(
    "You are not assigned to Field Work. Contact your administrator.",
    403,
  );
}

async function accessibleEmployeeIds(req) {
  const { actor, organisation_id } = actorContext(req);
  if (["SuperAdmin", "Admin"].includes(actor.model)) {
    const [teams, individuals] = await Promise.all([
      FieldTeam.find({ organisation_id, active: true })
        .select("members")
        .lean(),
      FieldAssignment.find({ organisation_id, active: true })
        .select("employee")
        .lean(),
    ]);
    return [
      ...new Set([
        ...teams.flatMap((team) => team.members.map(String)),
        ...individuals.map((a) => String(a.employee)),
      ]),
    ];
  }
  if (actor.model === "Manager") {
    const [teams, individuals] = await Promise.all([
      FieldTeam.find({ organisation_id, active: true, managers: actor.id })
        .select("members")
        .lean(),
      FieldAssignment.find({
        organisation_id,
        active: true,
        manager: actor.id,
      })
        .select("employee")
        .lean(),
    ]);
    return [
      ...new Set([
        ...teams.flatMap((team) => team.members.map(String)),
        ...individuals.map((a) => String(a.employee)),
      ]),
    ];
  }
  return [String(actor.id)];
}

async function getOwnedSession(req, sessionId, { employeeOnly = false } = {}) {
  const { actor, organisation_id } = actorContext(req);
  const session = await FieldDutySession.findOne({
    _id: sessionId,
    organisation_id,
  });
  if (!session) throw httpError("Field duty session not found", 404);
  if (employeeOnly && String(session.employee) !== String(actor.id))
    throw httpError("You can only update your own field duty", 403);
  if (!employeeOnly && !isStaff(actor)) {
    if (String(session.employee) !== String(actor.id))
      throw httpError("Access denied", 403);
  } else if (!employeeOnly && actor.model === "Manager") {
    const allowed = await accessibleEmployeeIds(req);
    if (!allowed.includes(String(session.employee)))
      throw httpError(
        "This employee is not in one of your assigned field teams",
        403,
      );
  }
  return session;
}

exports.startDuty = async (req, res) => {
  const { actor, organisation_id, teamId } =
    await assertEmployeeCanUseFieldOperations(req);
  const settings = await assertFieldOperationsEnabled(organisation_id);
  const startLocation = asPoint(req.body.location || req.body);
  const clientEventId = String(req.body.eventId || "").trim() || null;

  if (clientEventId) {
    const existing = await FieldDutySession.findOne({
      organisation_id,
      employee: actor.id,
      clientEventId,
    });
    if (existing)
      return res
        .status(200)
        .json({ success: true, session: existing, idempotent: true });
  }

  const open = await FieldDutySession.findOne({
    organisation_id,
    employee: actor.id,
    status: { $in: OPEN_STATUSES },
  }).sort({ startedAt: -1 });
  if (open)
    return res.status(409).json({
      success: false,
      message: "You already have an open field-duty session",
      session: open,
    });

  const face = await verifyDutySelfie({
    organisation_id,
    employeeId: actor.id,
    selfieBase64: req.body.selfieBase64,
    required: settings.require_face_verification,
  });
  const team = teamId
    ? await FieldTeam.findById(teamId).select("geofence").lean()
    : null;
  const session = await FieldDutySession.create({
    organisation_id,
    employee: actor.id,
    team: teamId || null,
    startLocation,
    lastLocation: startLocation,
    lastSeenAt: startLocation.capturedAt,
    clientEventId,
    activity: {
      withinTeamGeofence: isInsideGeofence(startLocation, team?.geofence),
      faceVerifiedAt: face?.verifiedAt || null,
      faceMatchScore: face?.score || null,
    },
    device: {
      platform: String(req.body.device?.platform || "").slice(0, 40),
      appVersion: String(req.body.device?.appVersion || "").slice(0, 20),
      batteryAtStart: Number.isFinite(Number(req.body.device?.batteryLevel))
        ? Number(req.body.device.batteryLevel)
        : null,
    },
  });
  return res.status(201).json({ success: true, session });
};

exports.myDuty = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (actor.model !== "User") return res.json({ success: true, session: null });
  const settings = await assertFieldOperationsEnabled(organisation_id);
  const session = await FieldDutySession.findOne({
    organisation_id,
    employee: actor.id,
    status: { $in: OPEN_STATUSES },
  }).sort({ startedAt: -1 });
  const checkpoint = computeCheckpointStatus(session);
  return res.json({
    success: true,
    session,
    faceVerificationRequired: Boolean(settings.require_face_verification),
    checkInIntervalMinutes: FIELD_CHECKPOINT_INTERVAL_MINUTES,
    checkpointGracePeriodMinutes: FIELD_CHECKPOINT_GRACE_PERIOD_MINUTES,
    checkpointStatus: checkpoint?.status || null,
    nextCheckInDueAt: checkpoint?.dueAt || null,
  });
};

exports.updateDutyStatus = async (req, res) => {
  await assertEmployeeCanUseFieldOperations(req);
  const session = await getOwnedSession(req, req.params.sessionId, {
    employeeOnly: true,
  });
  if (!OPEN_STATUSES.includes(session.status))
    throw httpError("This field-duty session is already checked out", 409);
  const status = String(req.body.status || "");
  if (!["active", "paused", "offline"].includes(status))
    throw httpError("Invalid duty status", 400);
  session.status = status;
  await session.save();
  return res.json({ success: true, session });
};

exports.addLocation = async (req, res) => {
  const { actor, organisation_id } =
    await assertEmployeeCanUseFieldOperations(req);
  const session = await getOwnedSession(req, req.params.sessionId, {
    employeeOnly: true,
  });
  if (!OPEN_STATUSES.includes(session.status))
    throw httpError(
      "Location sharing has stopped because duty is checked out",
      409,
    );
  const point = asPoint(req.body);
  const eventId = String(req.body.eventId || "").trim();
  if (!eventId)
    throw httpError("eventId is required for safe offline sync", 400);

  const team = session.team
    ? await FieldTeam.findById(session.team)
        .select("geofence managers notifyOnGeofenceExit name")
        .lean()
    : null;
  const movement = getMovement({
    previous: session.lastLocation,
    point,
    speedMps: req.body.speedMps,
  });
  const withinTeamGeofence = isInsideGeofence(point, team?.geofence);
  // A browser can't read a native "mock provider" flag, so this is a
  // heuristic: treat an implausible jump (or an explicit flag from a
  // native wrapper, once one exists) as suspicious rather than trusting it.
  const isMocked =
    Boolean(req.body.isMocked) ||
    (movement.speedKph !== null && movement.speedKph > IMPLAUSIBLE_SPEED_KPH);
  const provider = ["gps", "network", "fused"].includes(req.body.provider)
    ? req.body.provider
    : "unknown";

  let location;
  try {
    location = await FieldLocation.create({
      organisation_id,
      session: session._id,
      employee: actor.id,
      eventId,
      location: {
        type: "Point",
        coordinates: [point.longitude, point.latitude],
      },
      accuracy: point.accuracy,
      deviceTimestamp: point.capturedAt,
      batteryLevel: Number.isFinite(Number(req.body.batteryLevel))
        ? Number(req.body.batteryLevel)
        : null,
      networkStatus: ["online", "offline"].includes(req.body.networkStatus)
        ? req.body.networkStatus
        : "unknown",
      speedKph: movement.speedKph,
      heading: Number.isFinite(Number(req.body.heading))
        ? Number(req.body.heading)
        : null,
      distanceFromPreviousMeters: movement.distanceFromPreviousMeters,
      movementStatus: movement.movementStatus,
      withinTeamGeofence,
      isMocked,
      provider,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    location = await FieldLocation.findOne({ organisation_id, eventId });
  }

  // A delayed offline point must never move the live marker backwards, and
  // a flagged point never counts toward the live marker or the running
  // distance total — it still gets logged above for audit, just not trusted.
  if (
    !isMocked &&
    (!session.lastSeenAt || point.capturedAt >= session.lastSeenAt)
  ) {
    const wasInsideGeofence = session.activity?.withinTeamGeofence;
    session.lastLocation = point;
    session.lastSeenAt = point.capturedAt;
    session.activity = session.activity || {};
    session.activity.movementStatus = movement.movementStatus;
    session.activity.speedKph = movement.speedKph;
    session.activity.distanceFromPreviousMeters =
      movement.distanceFromPreviousMeters;
    session.activity.withinTeamGeofence = withinTeamGeofence;
    if (movement.distanceFromPreviousMeters)
      session.totalDistanceMeters =
        (session.totalDistanceMeters || 0) +
        movement.distanceFromPreviousMeters;
    if (session.status === "offline") session.status = "active";

    if (
      wasInsideGeofence === true &&
      withinTeamGeofence === false &&
      team?.notifyOnGeofenceExit
    ) {
      session.geofenceExitCount = (session.geofenceExitCount || 0) + 1;
      const employeeDoc = await User.findById(actor.id)
        .select("f_name l_name")
        .lean();
      const employeeName = employeeDoc
        ? `${employeeDoc.f_name || ""} ${employeeDoc.l_name || ""}`.trim()
        : "A field employee";
      const recipients = (team.managers || []).map((managerId) => ({
        recipientModel: "Manager",
        recipientId: managerId,
      }));
      if (recipients.length) {
        await createBulkNotifications({
          recipients,
          organisation_id,
          type: "field_geofence_exit",
          priority: "high",
          title: "Field employee left the assigned area",
          message: `${employeeName} moved outside ${team.name || "their team"}'s geofence while on field duty.`,
          link: "/field-operations",
        });
      }
    }
    await session.save();
  }
  return res.status(201).json({
    success: true,
    location,
    idempotent: location?.eventId !== eventId ? true : undefined,
  });
};

const CHECK_IN_INTERVAL_MINUTES = FIELD_CHECKPOINT_INTERVAL_MINUTES;

exports.submitCheckIn = async (req, res) => {
  const { actor, organisation_id } =
    await assertEmployeeCanUseFieldOperations(req);
  const session = await getOwnedSession(req, req.params.sessionId, {
    employeeOnly: true,
  });
  if (!OPEN_STATUSES.includes(session.status))
    throw httpError("Duty is already checked out", 409);
  const point = asPoint(req.body.location || req.body);
  const face = await verifyDutySelfie({
    organisation_id,
    employeeId: actor.id,
    selfieBase64: req.body.selfieBase64,
    required: true,
    context: "for this periodic check-in",
  });
  session.checkIns = session.checkIns || [];
  session.checkIns.push({
    capturedAt: point.capturedAt,
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy: point.accuracy,
    faceMatchScore: face?.score ?? null,
  });
  session.lastCheckInAt = point.capturedAt;
  // A live check-in also refreshes the live marker, same as a normal GPS ping.
  if (!session.lastSeenAt || point.capturedAt >= session.lastSeenAt) {
    session.lastLocation = point;
    session.lastSeenAt = point.capturedAt;
  }
  await session.save();
  return res.status(201).json({
    success: true,
    session,
    nextCheckInDueAt: new Date(
      point.capturedAt.getTime() + CHECK_IN_INTERVAL_MINUTES * 60000,
    ),
  });
};

exports.checkoutDuty = async (req, res) => {
  await assertEmployeeCanUseFieldOperations(req);
  const session = await getOwnedSession(req, req.params.sessionId, {
    employeeOnly: true,
  });
  if (session.status === "checked_out")
    return res.json({ success: true, session, idempotent: true });
  const endLocation =
    asPoint(req.body.location || req.body, false) || session.lastLocation;
  if (!endLocation)
    throw httpError("Your last known location is required to check out", 400);
  const endedAt = new Date();
  session.status = "checked_out";
  session.endedAt = endedAt;
  session.endLocation = endLocation;
  session.totalDurationSeconds = Math.max(
    0,
    Math.round((endedAt - session.startedAt) / 1000),
  );
  if (Number.isFinite(Number(req.body.batteryLevel))) {
    session.device = session.device || {};
    session.device.batteryAtEnd = Number(req.body.batteryLevel);
  }
  await session.save();
  return res.json({ success: true, session });
};

exports.startVisit = async (req, res) => {
  const { actor, organisation_id } =
    await assertEmployeeCanUseFieldOperations(req);
  const session = await getOwnedSession(req, req.params.sessionId, {
    employeeOnly: true,
  });
  if (!OPEN_STATUSES.includes(session.status))
    throw httpError("Start field duty before starting a visit", 409);
  const clientEventId = String(req.body.eventId || "").trim() || null;
  if (clientEventId) {
    const existing = await FieldVisit.findOne({
      organisation_id,
      employee: actor.id,
      clientEventId,
    });
    if (existing)
      return res.json({ success: true, visit: existing, idempotent: true });
  }

  const startLocation = asPoint(req.body.location || req.body);
  const activityType = ACTIVITY_TYPES.includes(req.body.activityType)
    ? req.body.activityType
    : "customer_visit";

  // ── Starting a pre-assigned activity (spec section 32) ────────────────
  // The employee is executing work a manager/admin already created ahead of
  // time (status: "pending"), rather than creating a brand-new open one.
  const activityId = String(req.body.activityId || "").trim();
  if (activityId) {
    const assigned = await FieldVisit.findOne({
      _id: activityId,
      organisation_id,
      employee: actor.id,
      assignmentType: "assigned",
    });
    if (!assigned) throw httpError("Assigned activity not found", 404);
    if (assigned.status !== "pending")
      return res.json({ success: true, visit: assigned, idempotent: true });
    const geofenceAtStart = isInsideGeofence(
      startLocation,
      assigned.expectedLocation?.radiusMeters
        ? {
            latitude: assigned.expectedLocation.latitude,
            longitude: assigned.expectedLocation.longitude,
            radiusMeters: assigned.expectedLocation.radiusMeters,
          }
        : null,
    );
    assigned.session = session._id;
    assigned.team = assigned.team || session.team;
    assigned.status = "in_progress";
    assigned.startedAt = new Date();
    assigned.startLocation = startLocation;
    if (geofenceAtStart !== null) {
      assigned.geofenceStatus = assigned.geofenceStatus || {};
      assigned.geofenceStatus.atStart = {
        withinFence: geofenceAtStart,
        distanceMeters: assigned.expectedLocation?.latitude
          ? getDistance(
              {
                latitude: startLocation.latitude,
                longitude: startLocation.longitude,
              },
              {
                latitude: assigned.expectedLocation.latitude,
                longitude: assigned.expectedLocation.longitude,
              },
            )
          : null,
      };
    }
    await assigned.save();
    return res.status(201).json({ success: true, visit: assigned });
  }

  // ── Open activity (spec section 3.A) — the employee decides who/what ───
  const customerName = String(req.body.customerName || "").trim();
  if (!customerName)
    throw httpError("Customer or contact name is required", 400);
  const visit = await FieldVisit.create({
    organisation_id,
    session: session._id,
    employee: actor.id,
    team: session.team,
    assignmentType: "open",
    activityType,
    customerName,
    organisationName: String(req.body.organisationName || "").trim(),
    contactNumber: String(req.body.contactNumber || "").trim(),
    purpose: String(req.body.purpose || "").trim(),
    visitType: String(req.body.visitType || "").trim(),
    startLocation,
    status: "in_progress",
    startedAt: new Date(),
    clientEventId,
  });
  return res.status(201).json({ success: true, visit });
};

exports.endVisit = async (req, res) => {
  await assertEmployeeCanUseFieldOperations(req);
  const { actor, organisation_id } = actorContext(req);
  const visit = await FieldVisit.findOne({
    _id: req.params.visitId,
    organisation_id,
    employee: actor.id,
  });
  if (!visit) throw httpError("Visit not found", 404);
  if (visit.status !== "in_progress")
    return res.json({ success: true, visit, idempotent: true });
  const status = ["completed", "skipped", "follow_up_required"].includes(
    req.body.status,
  )
    ? req.body.status
    : "completed";
  // Per-activity-type minimum duration (spec section 20) — only
  // meeting/customer_visit have a non-zero minimum by default, and an
  // organisation can override any type via field_operations settings.
  const orgSettings = await assertFieldOperationsEnabled(organisation_id);
  const minMinutes = resolveMinDurationMinutes(
    visit.activityType,
    orgSettings.min_duration_overrides,
  );
  const elapsedMinutes =
    (Date.now() - new Date(visit.startedAt).getTime()) / 60000;
  if (status !== "skipped" && minMinutes > 0 && elapsedMinutes < minMinutes) {
    const remaining = Math.ceil(minMinutes - elapsedMinutes);
    throw httpError(
      `This activity must run at least ${minMinutes} minutes before it can be marked ${status.replaceAll("_", " ")}. ${remaining} minute(s) left — mark it "Skipped" instead if the customer wasn't available.`,
      409,
    );
  }
  if (status === "completed" && !(visit.attachments || []).length)
    throw httpError("Add a photo before completing this visit", 409);
  const endLocation =
    asPoint(req.body.location || req.body, false) || visit.startLocation;
  if (visit.expectedLocation?.radiusMeters) {
    const withinFence = isInsideGeofence(endLocation, {
      latitude: visit.expectedLocation.latitude,
      longitude: visit.expectedLocation.longitude,
      radiusMeters: visit.expectedLocation.radiusMeters,
    });
    visit.geofenceStatus = visit.geofenceStatus || {};
    visit.geofenceStatus.atEnd = {
      withinFence,
      distanceMeters: getDistance(
        { latitude: endLocation.latitude, longitude: endLocation.longitude },
        {
          latitude: visit.expectedLocation.latitude,
          longitude: visit.expectedLocation.longitude,
        },
      ),
    };
    if (
      status === "completed" &&
      orgSettings.geofence_mode === "strict" &&
      !withinFence
    ) {
      // Preserve the measured result for manager review while leaving the
      // activity in progress. The employee can retry completion after moving
      // back inside the fence.
      visit.endLocation = endLocation;
      await visit.save();
      throw httpError(
        "You are outside the activity's allowed area. Return within the geofence before completing this activity.",
        403,
      );
    }
  }
  visit.status = status;
  visit.endedAt = new Date();
  visit.endLocation = endLocation;
  visit.notes = String(req.body.notes || "").trim();
  visit.outcome = String(req.body.outcome || "").trim();
  visit.followUpAt = req.body.followUpAt ? new Date(req.body.followUpAt) : null;
  if (visit.followUpAt && Number.isNaN(visit.followUpAt.getTime()))
    throw httpError("Invalid follow-up date", 400);
  await visit.save();
  return res.json({ success: true, visit });
};

exports.uploadVisitPhoto = async (req, res) => {
  const { actor, organisation_id } =
    await assertEmployeeCanUseFieldOperations(req);
  const visit = await FieldVisit.findOne({
    _id: req.params.visitId,
    organisation_id,
    employee: actor.id,
  });
  if (!visit) throw httpError("Visit not found", 404);
  if (!req.file) throw httpError("A photo file is required", 400);
  if (!VISIT_PHOTO_ALLOWED_MIME.includes(req.file.mimetype))
    throw httpError("Only PNG, JPG, or WEBP photos are allowed", 400);
  if (req.file.size > VISIT_PHOTO_MAX_SIZE)
    throw httpError("Photo must be smaller than 4MB", 400);
  if ((visit.attachments || []).length >= VISIT_PHOTO_MAX_COUNT)
    throw httpError(
      `Up to ${VISIT_PHOTO_MAX_COUNT} photos are allowed per visit`,
      400,
    );

  const uploaded = await imagekit.upload({
    file: req.file.buffer.toString("base64"),
    fileName: req.file.originalname,
    folder: "/field-visits",
    useUniqueFileName: true,
  });
  visit.attachments = [...(visit.attachments || []), uploaded.url];
  await visit.save();
  return res.status(201).json({ success: true, visit });
};

exports.getOverview = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  await assertFieldOperationsEnabled(organisation_id);
  let employeeIds = await accessibleEmployeeIds(req);

  // ── Filters (spec section 28) ───────────────────────────────────────
  const day = req.query.date
    ? new Date(`${req.query.date}T00:00:00.000Z`)
    : new Date(new Date().setHours(0, 0, 0, 0));
  if (Number.isNaN(day.getTime())) throw httpError("Invalid date filter", 400);
  const nextDay = new Date(day);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  if (req.query.teamId) {
    const team = await FieldTeam.findOne({
      _id: req.query.teamId,
      organisation_id,
    })
      .select("members")
      .lean();
    const teamMemberIds = new Set((team?.members || []).map(String));
    employeeIds = employeeIds.filter((id) => teamMemberIds.has(id));
  }
  if (req.query.employeeId) {
    employeeIds = employeeIds.filter(
      (id) => id === String(req.query.employeeId),
    );
  }

  if (!employeeIds.length)
    return res.json({
      success: true,
      live: [],
      visits: [],
      summary: { active: 0, offline: 0, completedVisits: 0 },
    });

  const sessionQuery = { organisation_id, employee: { $in: employeeIds } };
  let live = await FieldDutySession.find({
    ...sessionQuery,
    startedAt: { $lt: nextDay },
    $or: [{ endedAt: null }, { endedAt: { $gte: day } }],
  })
    .populate("employee", "f_name l_name empid profile_image office_location")
    .populate("team", "name territory")
    .sort({ lastSeenAt: -1 })
    .lean();

  // Attach checkpoint status to each session so manager/admin dashboards can
  // filter/badge "Checkpoint Overdue" without a second round trip.
  const now = new Date();
  live = live.map((session) => ({
    ...session,
    checkpoint: computeCheckpointStatus(session, now),
  }));

  if (req.query.dutyStatus) {
    live = live.filter((session) => session.status === req.query.dutyStatus);
  } else {
    // default view still only shows currently-open sessions, matching the
    // previous behaviour, unless the caller explicitly asked for a status
    // (including "checked_out") or picked a past date.
    if (day.getTime() === new Date(new Date().setHours(0, 0, 0, 0)).getTime()) {
      live = live.filter((session) => OPEN_STATUSES.includes(session.status));
    }
  }
  if (req.query.checkpointStatus) {
    live = live.filter(
      (session) => session.checkpoint?.status === req.query.checkpointStatus,
    );
  }

  const visitQuery = {
    organisation_id,
    employee: { $in: employeeIds },
    // Pending assigned work has no `startedAt` yet. Include unscheduled work
    // and work scheduled for the selected day so it can be managed before it
    // is started.
    $or: [
      { startedAt: { $gte: day, $lt: nextDay } },
      {
        assignmentType: "assigned",
        status: "pending",
        $or: [
          { scheduledDate: null },
          { scheduledDate: { $gte: day, $lt: nextDay } },
        ],
      },
    ],
  };
  if (req.query.activityType) visitQuery.activityType = req.query.activityType;
  if (req.query.activityStatus) visitQuery.status = req.query.activityStatus;
  if (req.query.assignmentType)
    visitQuery.assignmentType = req.query.assignmentType;

  const visits = await FieldVisit.find(visitQuery)
    .populate("employee", "f_name l_name empid")
    .populate("team", "name")
    .sort({ scheduledDate: 1, scheduledTime: 1, startedAt: -1 })
    .limit(200)
    .lean();
  const completedVisits = visits.filter(
    (visit) => visit.status === "completed",
  ).length;
  return res.json({
    success: true,
    live,
    visits,
    summary: {
      active: live.filter((item) => item.status === "active").length,
      offline: live.filter((item) => item.status === "offline").length,
      checkpointOverdue: live.filter(
        (item) => item.checkpoint?.status === "overdue",
      ).length,
      completedVisits,
    },
    isEmployee: actor.model === "User",
  });
};

exports.getRoute = async (req, res) => {
  const { organisation_id } = actorContext(req);
  await assertFieldOperationsEnabled(organisation_id);
  const employeeIds = await accessibleEmployeeIds(req);
  const employeeId = String(req.params.employeeId);
  if (!employeeIds.includes(employeeId))
    throw httpError("This employee is not in your assigned field teams", 403);
  const from = req.query.date
    ? new Date(`${req.query.date}T00:00:00.000Z`)
    : new Date(new Date().setHours(0, 0, 0, 0));
  if (Number.isNaN(from.getTime())) throw httpError("Invalid route date", 400);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);
  const points = await FieldLocation.find({
    organisation_id,
    employee: employeeId,
    deviceTimestamp: { $gte: from, $lt: to },
  })
    .select(
      "location accuracy deviceTimestamp session distanceFromPreviousMeters movementStatus isMocked",
    )
    .sort({ deviceTimestamp: 1 })
    .lean();
  const sessions = await FieldDutySession.find({
    organisation_id,
    employee: employeeId,
    startedAt: { $lt: to },
    $or: [{ endedAt: null }, { endedAt: { $gte: from } }],
  })
    .select(
      "startedAt endedAt status startLocation endLocation checkIns totalDurationSeconds totalDistanceMeters geofenceExitCount",
    )
    .sort({ startedAt: 1 })
    .lean();

  // A manual checkpoint is an important part of an employee's actual route.
  // It used to be saved only inside the duty session, while the route API
  // returned only background GPS pings. Consequently, a sequence such as
  // Bareilly -> Baheri -> Haldwani could omit Baheri from the drawn line.
  // Keep the raw `points` response for audit/compatibility, and provide one
  // chronological stream which also contains the checkpoint positions.
  const routePoints = [
    ...points.map((point) => ({
      location: point.location,
      accuracy: point.accuracy,
      deviceTimestamp: point.deviceTimestamp,
      session: point.session,
      isMocked: point.isMocked,
      source: "gps",
    })),
    ...sessions.flatMap((session) => {
      const startAt = new Date(session.startedAt);
      if (!(startAt >= from && startAt < to) || !session.startLocation)
        return [];
      return [
        {
          location: {
            type: "Point",
            coordinates: [
              session.startLocation.longitude,
              session.startLocation.latitude,
            ],
          },
          accuracy: session.startLocation.accuracy,
          deviceTimestamp:
            session.startLocation.capturedAt || session.startedAt,
          session: session._id,
          isMocked: false,
          source: "duty_start",
        },
      ];
    }),
    ...sessions.flatMap((session) =>
      (session.checkIns || [])
        .filter((checkIn) => {
          const capturedAt = new Date(checkIn.capturedAt);
          return capturedAt >= from && capturedAt < to;
        })
        .map((checkIn) => ({
          location: {
            type: "Point",
            coordinates: [checkIn.longitude, checkIn.latitude],
          },
          accuracy: checkIn.accuracy,
          deviceTimestamp: checkIn.capturedAt,
          session: session._id,
          isMocked: false,
          source: "check_in",
        })),
    ),
    ...sessions.flatMap((session) => {
      const endAt = new Date(session.endedAt);
      if (!(endAt >= from && endAt < to) || !session.endLocation) return [];
      return [
        {
          location: {
            type: "Point",
            coordinates: [
              session.endLocation.longitude,
              session.endLocation.latitude,
            ],
          },
          accuracy: session.endLocation.accuracy,
          deviceTimestamp: session.endLocation.capturedAt || session.endedAt,
          session: session._id,
          isMocked: false,
          source: "duty_end",
        },
      ];
    }),
  ]
    .filter((point) => {
      const [longitude, latitude] = point.location?.coordinates || [];
      const capturedAt = new Date(point.deviceTimestamp);
      return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        !Number.isNaN(capturedAt.getTime())
      );
    })
    .sort(
      (a, b) =>
        new Date(a.deviceTimestamp).getTime() -
        new Date(b.deviceTimestamp).getTime(),
    );

  const now = new Date();
  const totalDistanceMeters = sessions.reduce(
    (sum, s) => sum + (s.totalDistanceMeters || 0),
    0,
  );
  const totalDurationSeconds = sessions.reduce((sum, s) => {
    if (s.totalDurationSeconds) return sum + s.totalDurationSeconds;
    if (s.endedAt)
      return (
        sum +
        Math.max(
          0,
          Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 1000),
        )
      );
    return sum + Math.max(0, Math.round((now - new Date(s.startedAt)) / 1000));
  }, 0);
  const mockedPoints = points.filter((p) => p.isMocked).length;

  return res.json({
    success: true,
    points,
    routePoints,
    sessions,
    summary: {
      totalDistanceMeters: Math.round(totalDistanceMeters),
      totalDurationSeconds,
      mockedPoints,
      geofenceExitCount: sessions.reduce(
        (sum, s) => sum + (s.geofenceExitCount || 0),
        0,
      ),
    },
  });
};
