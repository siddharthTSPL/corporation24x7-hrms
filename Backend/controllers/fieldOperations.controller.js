const FieldTeam = require("../Models/fieldTeam.model");
const FieldDutySession = require("../Models/fieldDutySession.model");
const FieldLocation = require("../Models/fieldLocation.model");
const FieldVisit = require("../Models/fieldVisit.model");
<<<<<<< HEAD
const FieldAssignment = require("../Models/fieldAssignment.model");
=======
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const SuperAdmin = require("../Models/superadmin.model");
const FaceProfile = require("../Models/faceprofile.model");
const { getEmbedding, cosineSimilarity } = require("../utils/faceService");
const { getDistance } = require("geolib");
<<<<<<< HEAD
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
=======
const { resolveActor, resolveOrgId, httpError } = require("../utils/heirarchy.utils");
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7

const OPEN_STATUSES = ["active", "paused", "offline"];
const STAFF_ROLES = ["SuperAdmin", "Admin", "Manager"];
const FACE_MATCH_THRESHOLD = 0.62;
<<<<<<< HEAD
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
=======
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7

const asPoint = (input, required = true) => {
  const latitude = Number(input?.latitude);
  const longitude = Number(input?.longitude);
<<<<<<< HEAD
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
=======
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    if (!required && (!input || Object.keys(input).length === 0)) return null;
    throw httpError("A valid latitude and longitude are required", 400);
  }
  const capturedAt = input?.capturedAt ? new Date(input.capturedAt) : new Date();
  if (Number.isNaN(capturedAt.getTime())) throw httpError("Invalid location timestamp", 400);
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(Number(input?.accuracy)) ? Number(input.accuracy) : null,
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    capturedAt,
  };
};

<<<<<<< HEAD
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
=======
const actorContext = (req) => ({ actor: resolveActor(req), organisation_id: resolveOrgId(req) });
const isStaff = (actor) => STAFF_ROLES.includes(actor.model);

const getMovement = ({ previous, point, speedMps }) => {
  if (!previous) return { distanceFromPreviousMeters: null, speedKph: null, movementStatus: "unknown" };
  const distanceFromPreviousMeters = getDistance(
    { latitude: previous.latitude, longitude: previous.longitude },
    { latitude: point.latitude, longitude: point.longitude }
  );
  const elapsedSeconds = Math.max(1, (point.capturedAt - previous.capturedAt) / 1000);
  const derivedKph = (distanceFromPreviousMeters / elapsedSeconds) * 3.6;
  const browserKph = Number.isFinite(Number(speedMps)) && Number(speedMps) >= 0 ? Number(speedMps) * 3.6 : null;
  const speedKph = browserKph ?? derivedKph;
  const movementStatus = speedKph < 1 ? "stationary" : speedKph < 8 ? "slow_moving" : "moving";
  return { distanceFromPreviousMeters, speedKph: Number(speedKph.toFixed(1)), movementStatus };
};

const isInsideGeofence = (point, geofence) => {
  if (!geofence || !Number.isFinite(geofence.latitude) || !Number.isFinite(geofence.longitude) || !Number.isFinite(geofence.radiusMeters)) return null;
  return getDistance({ latitude: point.latitude, longitude: point.longitude }, { latitude: geofence.latitude, longitude: geofence.longitude }) <= geofence.radiusMeters;
};

const parseGeofence = (input) => {
  if (!input || input.latitude === "" || input.longitude === "" || input.radiusMeters === "") return undefined;
  const latitude = Number(input.latitude), longitude = Number(input.longitude), radiusMeters = Number(input.radiusMeters);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(radiusMeters) || radiusMeters < 25 || radiusMeters > 50000) {
    throw httpError("Geofence requires valid latitude, longitude, and a radius from 25 to 50,000 metres", 400);
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  }
  return { latitude, longitude, radiusMeters };
};

async function assertFieldOperationsEnabled(organisation_id) {
<<<<<<< HEAD
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
=======
  const organisation = await SuperAdmin.findById(organisation_id).select("field_operations").lean();
  if (!organisation) throw httpError("Organisation not found", 404);
  if (organisation.field_operations?.enabled === false) throw httpError("Field Operations is disabled for this organisation", 403);
  return organisation.field_operations || { max_field_employees: 50, max_managers: 10, data_retention_days: 180, require_face_verification: false };
}

async function verifyDutySelfie({ organisation_id, employeeId, selfieBase64, required }) {
  if (!selfieBase64 && !required) return null;
  if (!selfieBase64) throw httpError("Face verification is required before starting field duty", 403);
  if (typeof selfieBase64 !== "string" || selfieBase64.length > 8 * 1024 * 1024) throw httpError("Invalid face verification image", 400);
  const profile = await FaceProfile.findOne({ organisation_id, employee: employeeId, onModel: "User" }).select("embedding").lean();
  if (!profile) throw httpError("Your face is not enrolled. Ask your administrator to register it before field duty.", 403);
  const embedding = await getEmbedding(selfieBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, ""));
  const score = cosineSimilarity(embedding, profile.embedding);
  if (score < FACE_MATCH_THRESHOLD) throw httpError("Face could not be verified. Use good lighting and look directly at the camera.", 403);
  return { verifiedAt: new Date(), score: Number(score.toFixed(3)) };
}

async function assertEmployeeCanUseFieldOperations(req) {
  const { actor, organisation_id } = actorContext(req);
  await assertFieldOperationsEnabled(organisation_id);
  if (actor.model !== "User") throw httpError("Only field employees can start or update a duty session", 403);

  const team = await FieldTeam.findOne({ organisation_id, members: actor.id, active: true }).select("_id").lean();
  if (!team) throw httpError("You are not assigned to an active field team. Contact your administrator.", 403);
  return { actor, organisation_id, teamId: team._id };
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
}

async function accessibleEmployeeIds(req) {
  const { actor, organisation_id } = actorContext(req);
  if (["SuperAdmin", "Admin"].includes(actor.model)) {
<<<<<<< HEAD
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
=======
    const teams = await FieldTeam.find({ organisation_id, active: true }).select("members").lean();
    return [...new Set(teams.flatMap((team) => team.members.map(String)))];
  }
  if (actor.model === "Manager") {
    const teams = await FieldTeam.find({ organisation_id, active: true, managers: actor.id }).select("members").lean();
    return [...new Set(teams.flatMap((team) => team.members.map(String)))];
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  }
  return [String(actor.id)];
}

async function getOwnedSession(req, sessionId, { employeeOnly = false } = {}) {
  const { actor, organisation_id } = actorContext(req);
<<<<<<< HEAD
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
=======
  const session = await FieldDutySession.findOne({ _id: sessionId, organisation_id });
  if (!session) throw httpError("Field duty session not found", 404);
  if (employeeOnly && String(session.employee) !== String(actor.id)) throw httpError("You can only update your own field duty", 403);
  if (!employeeOnly && !isStaff(actor)) {
    if (String(session.employee) !== String(actor.id)) throw httpError("Access denied", 403);
  } else if (!employeeOnly && actor.model === "Manager") {
    const allowed = await accessibleEmployeeIds(req);
    if (!allowed.includes(String(session.employee))) throw httpError("This employee is not in one of your assigned field teams", 403);
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  }
  return session;
}

exports.startDuty = async (req, res) => {
<<<<<<< HEAD
  const { actor, organisation_id, teamId } =
    await assertEmployeeCanUseFieldOperations(req);
=======
  const { actor, organisation_id, teamId } = await assertEmployeeCanUseFieldOperations(req);
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  const settings = await assertFieldOperationsEnabled(organisation_id);
  const startLocation = asPoint(req.body.location || req.body);
  const clientEventId = String(req.body.eventId || "").trim() || null;

  if (clientEventId) {
<<<<<<< HEAD
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
  const team = await FieldTeam.findById(teamId).select("geofence").lean();
  const session = await FieldDutySession.create({
    organisation_id,
    employee: actor.id,
    team: teamId,
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
=======
    const existing = await FieldDutySession.findOne({ organisation_id, employee: actor.id, clientEventId });
    if (existing) return res.status(200).json({ success: true, session: existing, idempotent: true });
  }

  const open = await FieldDutySession.findOne({ organisation_id, employee: actor.id, status: { $in: OPEN_STATUSES } }).sort({ startedAt: -1 });
  if (open) return res.status(409).json({ success: false, message: "You already have an open field-duty session", session: open });

  const face = await verifyDutySelfie({ organisation_id, employeeId: actor.id, selfieBase64: req.body.selfieBase64, required: settings.require_face_verification });
  const team = await FieldTeam.findById(teamId).select("geofence").lean();
  const session = await FieldDutySession.create({
    organisation_id, employee: actor.id, team: teamId, startLocation, lastLocation: startLocation,
    lastSeenAt: startLocation.capturedAt, clientEventId,
    activity: { withinTeamGeofence: isInsideGeofence(startLocation, team?.geofence), faceVerifiedAt: face?.verifiedAt || null, faceMatchScore: face?.score || null },
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  });
  return res.status(201).json({ success: true, session });
};

exports.myDuty = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (actor.model !== "User") return res.json({ success: true, session: null });
  const settings = await assertFieldOperationsEnabled(organisation_id);
<<<<<<< HEAD
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
=======
  const session = await FieldDutySession.findOne({ organisation_id, employee: actor.id, status: { $in: OPEN_STATUSES } }).sort({ startedAt: -1 });
  return res.json({ success: true, session, faceVerificationRequired: Boolean(settings.require_face_verification) });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
};

exports.updateDutyStatus = async (req, res) => {
  await assertEmployeeCanUseFieldOperations(req);
<<<<<<< HEAD
  const session = await getOwnedSession(req, req.params.sessionId, {
    employeeOnly: true,
  });
  if (!OPEN_STATUSES.includes(session.status))
    throw httpError("This field-duty session is already checked out", 409);
  const status = String(req.body.status || "");
  if (!["active", "paused", "offline"].includes(status))
    throw httpError("Invalid duty status", 400);
=======
  const session = await getOwnedSession(req, req.params.sessionId, { employeeOnly: true });
  if (!OPEN_STATUSES.includes(session.status)) throw httpError("This field-duty session is already checked out", 409);
  const status = String(req.body.status || "");
  if (!["active", "paused", "offline"].includes(status)) throw httpError("Invalid duty status", 400);
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  session.status = status;
  await session.save();
  return res.json({ success: true, session });
};

exports.addLocation = async (req, res) => {
<<<<<<< HEAD
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

  const team = await FieldTeam.findById(session.team)
    .select("geofence managers notifyOnGeofenceExit name")
    .lean();
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
=======
  const { actor, organisation_id } = await assertEmployeeCanUseFieldOperations(req);
  const session = await getOwnedSession(req, req.params.sessionId, { employeeOnly: true });
  if (!OPEN_STATUSES.includes(session.status)) throw httpError("Location sharing has stopped because duty is checked out", 409);
  const point = asPoint(req.body);
  const eventId = String(req.body.eventId || "").trim();
  if (!eventId) throw httpError("eventId is required for safe offline sync", 400);

  const team = await FieldTeam.findById(session.team).select("geofence").lean();
  const movement = getMovement({ previous: session.lastLocation, point, speedMps: req.body.speedMps });
  const withinTeamGeofence = isInsideGeofence(point, team?.geofence);
  let location;
  try {
    location = await FieldLocation.create({
      organisation_id, session: session._id, employee: actor.id, eventId,
      location: { type: "Point", coordinates: [point.longitude, point.latitude] },
      accuracy: point.accuracy, deviceTimestamp: point.capturedAt,
      batteryLevel: Number.isFinite(Number(req.body.batteryLevel)) ? Number(req.body.batteryLevel) : null,
      networkStatus: ["online", "offline"].includes(req.body.networkStatus) ? req.body.networkStatus : "unknown",
      speedKph: movement.speedKph, heading: Number.isFinite(Number(req.body.heading)) ? Number(req.body.heading) : null,
      distanceFromPreviousMeters: movement.distanceFromPreviousMeters, movementStatus: movement.movementStatus, withinTeamGeofence,
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    location = await FieldLocation.findOne({ organisation_id, eventId });
  }

<<<<<<< HEAD
  // A delayed offline point must never move the live marker backwards, and
  // a flagged point never counts toward the live marker or the running
  // distance total — it still gets logged above for audit, just not trusted.
  if (
    !isMocked &&
    (!session.lastSeenAt || point.capturedAt >= session.lastSeenAt)
  ) {
    const wasInsideGeofence = session.activity?.withinTeamGeofence;
=======
  // A delayed offline point must never move the live marker backwards.
  if (!session.lastSeenAt || point.capturedAt >= session.lastSeenAt) {
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    session.lastLocation = point;
    session.lastSeenAt = point.capturedAt;
    session.activity = session.activity || {};
    session.activity.movementStatus = movement.movementStatus;
    session.activity.speedKph = movement.speedKph;
<<<<<<< HEAD
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
=======
    session.activity.distanceFromPreviousMeters = movement.distanceFromPreviousMeters;
    session.activity.withinTeamGeofence = withinTeamGeofence;
    if (session.status === "offline") session.status = "active";
    await session.save();
  }
  return res.status(201).json({ success: true, location, idempotent: location?.eventId !== eventId ? true : undefined });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
};

exports.checkoutDuty = async (req, res) => {
  await assertEmployeeCanUseFieldOperations(req);
<<<<<<< HEAD
  const session = await getOwnedSession(req, req.params.sessionId, {
    employeeOnly: true,
  });
  if (session.status === "checked_out")
    return res.json({ success: true, session, idempotent: true });
  const endLocation =
    asPoint(req.body.location || req.body, false) || session.lastLocation;
  if (!endLocation)
    throw httpError("Your last known location is required to check out", 400);
=======
  const session = await getOwnedSession(req, req.params.sessionId, { employeeOnly: true });
  if (session.status === "checked_out") return res.json({ success: true, session, idempotent: true });
  const endLocation = asPoint(req.body.location || req.body, false) || session.lastLocation;
  if (!endLocation) throw httpError("Your last known location is required to check out", 400);
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  const endedAt = new Date();
  session.status = "checked_out";
  session.endedAt = endedAt;
  session.endLocation = endLocation;
<<<<<<< HEAD
  session.totalDurationSeconds = Math.max(
    0,
    Math.round((endedAt - session.startedAt) / 1000),
  );
  if (Number.isFinite(Number(req.body.batteryLevel))) {
    session.device = session.device || {};
    session.device.batteryAtEnd = Number(req.body.batteryLevel);
  }
=======
  session.totalDurationSeconds = Math.max(0, Math.round((endedAt - session.startedAt) / 1000));
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  await session.save();
  return res.json({ success: true, session });
};

exports.startVisit = async (req, res) => {
<<<<<<< HEAD
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
=======
  const { actor, organisation_id } = await assertEmployeeCanUseFieldOperations(req);
  const session = await getOwnedSession(req, req.params.sessionId, { employeeOnly: true });
  if (!OPEN_STATUSES.includes(session.status)) throw httpError("Start field duty before starting a visit", 409);
  const customerName = String(req.body.customerName || "").trim();
  if (!customerName) throw httpError("Customer or contact name is required", 400);
  const clientEventId = String(req.body.eventId || "").trim() || null;
  if (clientEventId) {
    const existing = await FieldVisit.findOne({ organisation_id, employee: actor.id, clientEventId });
    if (existing) return res.json({ success: true, visit: existing, idempotent: true });
  }
  const visit = await FieldVisit.create({
    organisation_id, session: session._id, employee: actor.id, team: session.team,
    customerName, organisationName: String(req.body.organisationName || "").trim(),
    contactNumber: String(req.body.contactNumber || "").trim(), purpose: String(req.body.purpose || "").trim(),
    startLocation: asPoint(req.body.location || req.body), clientEventId,
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  });
  return res.status(201).json({ success: true, visit });
};

exports.endVisit = async (req, res) => {
  await assertEmployeeCanUseFieldOperations(req);
  const { actor, organisation_id } = actorContext(req);
<<<<<<< HEAD
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
=======
  const visit = await FieldVisit.findOne({ _id: req.params.visitId, organisation_id, employee: actor.id });
  if (!visit) throw httpError("Visit not found", 404);
  if (visit.status !== "in_progress") return res.json({ success: true, visit, idempotent: true });
  const status = ["completed", "skipped", "follow_up_required"].includes(req.body.status) ? req.body.status : "completed";
  visit.status = status;
  visit.endedAt = new Date();
  visit.endLocation = asPoint(req.body.location || req.body, false) || visit.startLocation;
  visit.notes = String(req.body.notes || "").trim();
  visit.outcome = String(req.body.outcome || "").trim();
  visit.followUpAt = req.body.followUpAt ? new Date(req.body.followUpAt) : null;
  if (visit.followUpAt && Number.isNaN(visit.followUpAt.getTime())) throw httpError("Invalid follow-up date", 400);
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  await visit.save();
  return res.json({ success: true, visit });
};

<<<<<<< HEAD
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
  // date: which day's activities/checkpoints to look at (defaults to today,
  //       in the organisation's local sense — we treat it as UTC midnight
  //       like getRoute does, for consistency with that endpoint).
  // teamId / employeeId: narrow down which employees are shown.
  // dutyStatus: active | paused | offline | checked_out
  // activityStatus / activityType: filter the visits list.
  // checkpointStatus: not_due | due | overdue | completed
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
=======
exports.getOverview = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  await assertFieldOperationsEnabled(organisation_id);
  const employeeIds = await accessibleEmployeeIds(req);
  if (!employeeIds.length) return res.json({ success: true, live: [], visits: [], summary: { active: 0, offline: 0, completedVisits: 0 } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sessionQuery = { organisation_id, employee: { $in: employeeIds } };
  const live = await FieldDutySession.find({ ...sessionQuery, status: { $in: OPEN_STATUSES } })
    .populate("employee", "f_name l_name empid profile_image office_location")
    .populate("team", "name territory")
    .sort({ lastSeenAt: -1 }).lean();
  const visits = await FieldVisit.find({ organisation_id, employee: { $in: employeeIds }, startedAt: { $gte: today } })
    .populate("employee", "f_name l_name empid")
    .sort({ startedAt: -1 }).limit(100).lean();
  const completedVisits = visits.filter((visit) => visit.status === "completed").length;
  return res.json({
    success: true, live, visits,
    summary: { active: live.filter((item) => item.status === "active").length, offline: live.filter((item) => item.status === "offline").length, completedVisits },
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    isEmployee: actor.model === "User",
  });
};

exports.getRoute = async (req, res) => {
  const { organisation_id } = actorContext(req);
  await assertFieldOperationsEnabled(organisation_id);
  const employeeIds = await accessibleEmployeeIds(req);
  const employeeId = String(req.params.employeeId);
<<<<<<< HEAD
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
          deviceTimestamp: session.startLocation.capturedAt || session.startedAt,
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
      (a, b) => new Date(a.deviceTimestamp).getTime() - new Date(b.deviceTimestamp).getTime(),
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
=======
  if (!employeeIds.includes(employeeId)) throw httpError("This employee is not in your assigned field teams", 403);
  const from = req.query.date ? new Date(`${req.query.date}T00:00:00.000Z`) : new Date(new Date().setHours(0, 0, 0, 0));
  if (Number.isNaN(from.getTime())) throw httpError("Invalid route date", 400);
  const to = new Date(from); to.setUTCDate(to.getUTCDate() + 1);
  const points = await FieldLocation.find({ organisation_id, employee: employeeId, deviceTimestamp: { $gte: from, $lt: to } })
    .select("location accuracy deviceTimestamp session").sort({ deviceTimestamp: 1 }).lean();
  const sessions = await FieldDutySession.find({ organisation_id, employee: employeeId, startedAt: { $lt: to }, $or: [{ endedAt: null }, { endedAt: { $gte: from } }] })
    .select("startedAt endedAt status startLocation endLocation totalDurationSeconds").sort({ startedAt: 1 }).lean();
  return res.json({ success: true, points, sessions });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
};

exports.listTeams = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  await assertFieldOperationsEnabled(organisation_id);
<<<<<<< HEAD
  // Teams are soft-deleted so historical duties/audit records keep their
  // relationship. Never return inactive teams to the operational UI.
  const query =
    actor.model === "Manager"
      ? { organisation_id, active: true, managers: actor.id }
      : { organisation_id, active: true };
  if (req.query.departmentId) query.department = req.query.departmentId;
  const teams = await FieldTeam.find(query)
    .populate("managers", "f_name l_name empid")
    .populate("members", "f_name l_name empid office_location")
    .populate("department", "name code")
    .sort({ name: 1 })
    .lean();
=======
  const query = actor.model === "Manager" ? { organisation_id, managers: actor.id } : { organisation_id };
  const teams = await FieldTeam.find(query).populate("managers", "f_name l_name empid").populate("members", "f_name l_name empid office_location").sort({ name: 1 }).lean();
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  return res.json({ success: true, teams });
};

exports.createTeam = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
<<<<<<< HEAD
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError("Only an administrator can manage field teams", 403);
  const settings = await assertFieldOperationsEnabled(organisation_id);
  const name = String(req.body.name || "").trim();
  if (!name) throw httpError("Team name is required", 400);
  let department = null;
  if (req.body.departmentId) {
    const departmentDoc = await Department.findOne({
      _id: req.body.departmentId,
      organisation_id,
      isActive: true,
    })
      .select("_id")
      .lean();
    if (!departmentDoc) throw httpError("Department not found", 404);
    department = departmentDoc._id;
  }
  const members = Array.isArray(req.body.members) ? req.body.members : [];
  const managers = Array.isArray(req.body.managers) ? req.body.managers : [];
  const validMembers = await User.countDocuments({
    _id: { $in: members },
    organisation_id,
  });
  if (validMembers !== members.length)
    throw httpError(
      "Every field-team member must belong to this organisation",
      400,
    );

  const activeTeams = await FieldTeam.find({ organisation_id, active: true })
    .select("name members managers")
    .lean();
  // A field employee (and a field manager) can only belong to ONE active
  // team at a time — a simple one-team-per-person model, not a multi-team
  // hierarchy.
  const memberOwner = new Map();
  const managerOwner = new Map();
  activeTeams.forEach((team) => {
    team.members.forEach((id) => memberOwner.set(String(id), team.name));
    team.managers.forEach((id) => managerOwner.set(String(id), team.name));
  });
  const clashedMembers = members.filter((id) => memberOwner.has(String(id)));
  if (clashedMembers.length)
    throw httpError(
      `${clashedMembers.length} of these employees are already on another field team. An employee can only be on one field team at a time.`,
      409,
    );
  const clashedManagers = managers.filter((id) => managerOwner.has(String(id)));
  if (clashedManagers.length)
    throw httpError(
      `${clashedManagers.length} of these managers already lead another field team. A manager can only lead one field team at a time.`,
      409,
    );
  if (members.length) {
    const individuallyAssigned = await FieldAssignment.find({
      organisation_id,
      active: true,
      employee: { $in: members },
    })
      .select("employee")
      .lean();
    if (individuallyAssigned.length)
      throw httpError(
        `${individuallyAssigned.length} of these employees already have an active individual Field Work assignment. Unassign them first.`,
        409,
      );
  }

  const existingMemberIds = new Set(
    activeTeams.flatMap((team) => team.members.map(String)),
  );
  members.forEach((id) => existingMemberIds.add(String(id)));
  const existingManagerIds = new Set(
    activeTeams.flatMap((team) => team.managers.map(String)),
  );
  managers.forEach((id) => existingManagerIds.add(String(id)));
  if (existingMemberIds.size > settings.max_field_employees)
    throw httpError(
      `Your Field Operations plan allows up to ${settings.max_field_employees} field employees`,
      403,
    );
  if (existingManagerIds.size > settings.max_managers)
    throw httpError(
      `Your Field Operations plan allows up to ${settings.max_managers} field managers`,
      403,
    );
  const team = await FieldTeam.create({
    organisation_id,
    name,
    department,
    territory: req.body.territory,
    color: req.body.color,
    notifyOnGeofenceExit: Boolean(req.body.notifyOnGeofenceExit),
    geofence: parseGeofence(req.body.geofence),
    members,
    managers,
    createdBy: actor.id,
  });
  await logAudit({
    organisation_id,
    module: "field_work",
    action: "team.created",
    actor,
    target: { id: team._id, model: "FieldTeam", name: team.name },
    meta: { memberCount: members.length, managerCount: managers.length },
  });
  return res.status(201).json({ success: true, team });
};

exports.updateTeam = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError("Only an administrator can edit field teams", 403);
  const team = await FieldTeam.findOne({
    _id: req.params.teamId,
    organisation_id,
    active: true,
  });
  if (!team) throw httpError("Field team not found", 404);

  const settings = await assertFieldOperationsEnabled(organisation_id);
  if (req.body.departmentId !== undefined) {
    if (req.body.departmentId === null || req.body.departmentId === "") {
      team.department = null;
    } else {
      const departmentDoc = await Department.findOne({
        _id: req.body.departmentId,
        organisation_id,
        isActive: true,
      })
        .select("_id")
        .lean();
      if (!departmentDoc) throw httpError("Department not found", 404);
      team.department = departmentDoc._id;
    }
  }
  const managers = Array.isArray(req.body.managers)
    ? [...new Set(req.body.managers)]
    : team.managers.map(String);
  const members = Array.isArray(req.body.members)
    ? [...new Set(req.body.members)]
    : team.members.map(String);
  if (!members.length)
    throw httpError("A field team needs at least one employee", 400);

  const validMembers = await User.countDocuments({
    _id: { $in: members },
    organisation_id,
  });
  if (validMembers !== members.length)
    throw httpError(
      "Every field-team member must belong to this organisation",
      400,
    );

  const otherTeams = await FieldTeam.find({
    organisation_id,
    active: true,
    _id: { $ne: team._id },
  })
    .select("name members managers")
    .lean();
  const memberOwner = new Map();
  const managerOwner = new Map();
  otherTeams.forEach((t) => {
    t.members.forEach((id) => memberOwner.set(String(id), t.name));
    t.managers.forEach((id) => managerOwner.set(String(id), t.name));
  });
  const clashedMembers = members.filter((id) => memberOwner.has(String(id)));
  if (clashedMembers.length)
    throw httpError(
      `${clashedMembers.length} of these employees are already on another field team.`,
      409,
    );
  const clashedManagers = managers.filter((id) => managerOwner.has(String(id)));
  if (clashedManagers.length)
    throw httpError(
      `${clashedManagers.length} of these managers already lead another field team.`,
      409,
    );
  const newlyAddedMembers = members.filter(
    (id) => !team.members.map(String).includes(String(id)),
  );
  if (newlyAddedMembers.length) {
    const individuallyAssigned = await FieldAssignment.find({
      organisation_id,
      active: true,
      employee: { $in: newlyAddedMembers },
    })
      .select("employee")
      .lean();
    if (individuallyAssigned.length)
      throw httpError(
        `${individuallyAssigned.length} of these employees already have an active individual Field Work assignment. Unassign them first.`,
        409,
      );
  }

  const otherMemberCount = new Set(
    otherTeams.flatMap((t) => t.members.map(String)),
  ).size;
  const otherManagerCount = new Set(
    otherTeams.flatMap((t) => t.managers.map(String)),
  ).size;
  if (otherMemberCount + members.length > settings.max_field_employees)
    throw httpError(
      `Your Field Operations plan allows up to ${settings.max_field_employees} field employees`,
      403,
    );
  if (otherManagerCount + managers.length > settings.max_managers)
    throw httpError(
      `Your Field Operations plan allows up to ${settings.max_managers} field managers`,
      403,
    );

  if (req.body.name !== undefined) team.name = String(req.body.name).trim();
  if (req.body.territory !== undefined)
    team.territory = String(req.body.territory).trim();
  if (req.body.color !== undefined) team.color = req.body.color;
  if (req.body.notifyOnGeofenceExit !== undefined)
    team.notifyOnGeofenceExit = Boolean(req.body.notifyOnGeofenceExit);
  if (req.body.geofence !== undefined)
    team.geofence = parseGeofence(req.body.geofence);
  team.managers = managers;
  team.members = members;
  await team.save();
  await logAudit({
    organisation_id,
    module: "field_work",
    action: "team.updated",
    actor,
    target: { id: team._id, model: "FieldTeam", name: team.name },
    meta: { memberCount: members.length, managerCount: managers.length },
  });
  return res.json({ success: true, team });
};

exports.deleteTeam = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError("Only an administrator can remove field teams", 403);
  const team = await FieldTeam.findOne({
    _id: req.params.teamId,
    organisation_id,
    active: true,
  });
  if (!team) throw httpError("Field team not found", 404);
  team.active = false;
  await team.save();
  await logAudit({
    organisation_id,
    module: "field_work",
    action: "team.deleted",
    actor,
    target: { id: team._id, model: "FieldTeam", name: team.name },
  });
  return res.json({
    success: true,
    message:
      "Field team removed. Its members are now unassigned and free to join another team.",
  });
};

exports.getSettings = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError(
      "Only an administrator can view Field Operations settings",
      403,
    );
  const organisation = await SuperAdmin.findById(organisation_id)
    .select("field_operations")
    .lean();
=======
  if (!["SuperAdmin", "Admin"].includes(actor.model)) throw httpError("Only an administrator can manage field teams", 403);
  const settings = await assertFieldOperationsEnabled(organisation_id);
  const name = String(req.body.name || "").trim();
  if (!name) throw httpError("Team name is required", 400);
  const members = Array.isArray(req.body.members) ? req.body.members : [];
  const managers = Array.isArray(req.body.managers) ? req.body.managers : [];
  const validMembers = await User.countDocuments({ _id: { $in: members }, organisation_id });
  if (validMembers !== members.length) throw httpError("Every field-team member must belong to this organisation", 400);
  const activeTeams = await FieldTeam.find({ organisation_id, active: true }).select("members managers").lean();
  const existingMemberIds = new Set(activeTeams.flatMap((team) => team.members.map(String)));
  members.forEach((id) => existingMemberIds.add(String(id)));
  const existingManagerIds = new Set(activeTeams.flatMap((team) => team.managers.map(String)));
  managers.forEach((id) => existingManagerIds.add(String(id)));
  if (existingMemberIds.size > settings.max_field_employees) throw httpError(`Your Field Operations plan allows up to ${settings.max_field_employees} field employees`, 403);
  if (existingManagerIds.size > settings.max_managers) throw httpError(`Your Field Operations plan allows up to ${settings.max_managers} field managers`, 403);
  const team = await FieldTeam.create({ organisation_id, name, code: req.body.code, territory: req.body.territory, geofence: parseGeofence(req.body.geofence), members, managers, createdBy: actor.id });
  return res.status(201).json({ success: true, team });
};

exports.getSettings = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model)) throw httpError("Only an administrator can view Field Operations settings", 403);
  const organisation = await SuperAdmin.findById(organisation_id).select("field_operations").lean();
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  if (!organisation) throw httpError("Organisation not found", 404);
  return res.json({
    success: true,
    settings: {
<<<<<<< HEAD
      enabled: false,
      max_field_employees: 50,
      max_managers: 10,
      data_retention_days: 180,
      require_face_verification: false,
      geofence_mode: "off",
      min_duration_overrides: {},
=======
      enabled: false, max_field_employees: 50, max_managers: 10, data_retention_days: 180, require_face_verification: false,
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
      ...organisation.field_operations,
    },
  });
};

exports.updateSettings = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
<<<<<<< HEAD
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError(
      "Only an administrator can change Field Operations settings",
      403,
    );
  const organisation =
    await SuperAdmin.findById(organisation_id).select("field_operations");
  if (!organisation) throw httpError("Organisation not found", 404);

  const current = organisation.field_operations || {};
  const next = { ...(current.toObject?.() ?? current) };
  const wasEnabled = Boolean(current.enabled);

  // Only a Super Admin may flip the master switch (spec section 9) — an
  // Admin can tune limits/verification/geofence but not turn the module on
  // or off for the whole organisation.
  if (req.body.enabled !== undefined) {
    if (actor.model !== "SuperAdmin")
      throw httpError(
        "Only the Super Admin can enable or disable Field Work for this organisation",
        403,
      );
    next.enabled = Boolean(req.body.enabled);
  }
  if (req.body.require_face_verification !== undefined)
    next.require_face_verification = Boolean(
      req.body.require_face_verification,
    );
  if (req.body.geofence_mode !== undefined) {
    if (!GEOFENCE_MODES.includes(req.body.geofence_mode))
      throw httpError("geofence_mode must be off, warning, or strict", 400);
    next.geofence_mode = req.body.geofence_mode;
  }
  if (req.body.min_duration_overrides !== undefined) {
    if (
      typeof req.body.min_duration_overrides !== "object" ||
      Array.isArray(req.body.min_duration_overrides)
    )
      throw httpError("min_duration_overrides must be an object", 400);
    const overrides = {};
    for (const [type, minutes] of Object.entries(
      req.body.min_duration_overrides,
    )) {
      if (!ACTIVITY_TYPES.includes(type)) continue;
      const value = Number(minutes);
      if (!Number.isFinite(value) || value < 0 || value > 1440)
        throw httpError(
          `Minimum duration for ${type} must be between 0 and 1440 minutes`,
          400,
        );
      overrides[type] = value;
    }
    next.min_duration_overrides = overrides;
  }

  for (const [key, min, max] of [
    ["max_field_employees", 0, 100000],
    ["max_managers", 0, 10000],
    ["data_retention_days", 1, 3650],
  ]) {
    if (req.body[key] === undefined) continue;
    const value = Number(req.body[key]);
    if (!Number.isFinite(value) || value < min || value > max)
      throw httpError(
        `${key.replaceAll("_", " ")} must be a number between ${min} and ${max}`,
        400,
      );
=======
  if (!["SuperAdmin", "Admin"].includes(actor.model)) throw httpError("Only an administrator can change Field Operations settings", 403);
  const organisation = await SuperAdmin.findById(organisation_id).select("field_operations");
  if (!organisation) throw httpError("Organisation not found", 404);

  const current = organisation.field_operations || {};
  const next = { ...current.toObject?.() ?? current };

  if (req.body.enabled !== undefined) next.enabled = Boolean(req.body.enabled);
  if (req.body.require_face_verification !== undefined) next.require_face_verification = Boolean(req.body.require_face_verification);

  for (const [key, min, max] of [["max_field_employees", 0, 100000], ["max_managers", 0, 10000], ["data_retention_days", 1, 3650]]) {
    if (req.body[key] === undefined) continue;
    const value = Number(req.body[key]);
    if (!Number.isFinite(value) || value < min || value > max) throw httpError(`${key.replaceAll("_", " ")} must be a number between ${min} and ${max}`, 400);
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    next[key] = value;
  }

  organisation.field_operations = next;
  await organisation.save();
<<<<<<< HEAD
  await logAudit({
    organisation_id,
    module: "field_work",
    action:
      req.body.enabled !== undefined
        ? next.enabled
          ? "field_work.enabled"
          : "field_work.disabled"
        : "field_work.settings_updated",
    actor,
    meta: { wasEnabled, nowEnabled: Boolean(next.enabled) },
  });
=======
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  return res.json({ success: true, settings: organisation.field_operations });
};

exports.teamOptions = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
<<<<<<< HEAD
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError("Only an administrator can manage field teams", 403);
  await assertFieldOperationsEnabled(organisation_id);
  const active = { $nin: ["resigned", "fired", "terminated"] };
  const [employees, managers, departments] = await Promise.all([
    User.find({ organisation_id, working_status: active })
      .select("f_name l_name empid office_location")
      .sort({ f_name: 1 })
      .lean(),
    Manager.find({ organisation_id, working_status: active })
      .select("f_name l_name empid")
      .sort({ f_name: 1 })
      .lean(),
    Department.find({ organisation_id, isActive: true })
      .select("name code")
      .sort({ name: 1 })
      .lean(),
  ]);
  return res.json({ success: true, employees, managers, departments });
};

// ── Individual (non-team) Field Work assignment ───────────────────────────
// Spec section 5: an employee's permanent assignment is NONE / TEAM /
// INDIVIDUAL. TEAM is FieldTeam.members; this section covers INDIVIDUAL.

exports.listFieldAssignments = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin", "Manager"].includes(actor.model))
    throw httpError("Access denied", 403);
  await assertFieldOperationsEnabled(organisation_id);
  const query = { organisation_id, active: true };
  if (actor.model === "Manager") query.manager = actor.id;
  const assignments = await FieldAssignment.find(query)
    .populate("employee", "f_name l_name empid office_location")
    .populate("manager", "f_name l_name empid")
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ success: true, assignments });
};

exports.createIndividualAssignment = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError(
      "Only an administrator can create an individual Field Work assignment",
      403,
    );
  const settings = await assertFieldOperationsEnabled(organisation_id);
  const employeeId = String(req.body.employeeId || "").trim();
  if (!employeeId) throw httpError("employeeId is required", 400);

  const employee = await User.findOne({
    _id: employeeId,
    organisation_id,
  })
    .select("_id f_name l_name")
    .lean();
  if (!employee)
    throw httpError("Employee not found in this organisation", 404);

  // One active assignment at a time — reject if already on a team OR
  // already individually assigned (spec section 5).
  const [onTeam, existingIndividual] = await Promise.all([
    FieldTeam.findOne({
      organisation_id,
      active: true,
      members: employeeId,
    })
      .select("name")
      .lean(),
    FieldAssignment.findOne({
      organisation_id,
      employee: employeeId,
      active: true,
    }).lean(),
  ]);
  if (onTeam)
    throw httpError(
      `This employee is already on the "${onTeam.name}" field team. Remove them from that team first.`,
      409,
    );
  if (existingIndividual)
    throw httpError(
      "This employee already has an active individual Field Work assignment.",
      409,
    );

  const currentIndividualCount = await FieldAssignment.countDocuments({
    organisation_id,
    active: true,
  });
  const currentTeamMemberCount = (
    await FieldTeam.find({ organisation_id, active: true })
      .select("members")
      .lean()
  ).reduce((sum, t) => sum + t.members.length, 0);
  if (
    currentIndividualCount + currentTeamMemberCount + 1 >
    settings.max_field_employees
  )
    throw httpError(
      `Your Field Operations plan allows up to ${settings.max_field_employees} field employees`,
      403,
    );

  if (req.body.managerId) {
    const manager = await Manager.findOne({
      _id: req.body.managerId,
      organisation_id,
    })
      .select("_id")
      .lean();
    if (!manager)
      throw httpError("Manager not found in this organisation", 404);
  }

  const assignment = await FieldAssignment.create({
    organisation_id,
    employee: employeeId,
    manager: req.body.managerId || null,
    territory: String(req.body.territory || "").trim(),
    assignedBy: actor.id,
    assignedByModel: actor.model,
  });
  await logAudit({
    organisation_id,
    module: "field_work",
    action: "employee.assigned_individual",
    actor,
    target: {
      id: employee._id,
      model: "User",
      name: `${employee.f_name || ""} ${employee.l_name || ""}`.trim(),
    },
  });
  return res.status(201).json({ success: true, assignment });
};

exports.removeIndividualAssignment = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError(
      "Only an administrator can remove a Field Work assignment",
      403,
    );
  const assignment = await FieldAssignment.findOne({
    _id: req.params.assignmentId,
    organisation_id,
    active: true,
  });
  if (!assignment) throw httpError("Field Work assignment not found", 404);
  assignment.active = false;
  assignment.unassignedAt = new Date();
  assignment.unassignedBy = actor.id;
  await assignment.save();
  await logAudit({
    organisation_id,
    module: "field_work",
    action: "employee.unassigned_individual",
    actor,
    target: { id: assignment.employee, model: "User" },
  });
  return res.json({ success: true, message: "Field Work assignment removed" });
};

// ── Bulk team assignment (spec section 7) ─────────────────────────────────
// Adds many employees to one team in a single call and reports a per-item
// success/failure list instead of an all-or-nothing transaction, so one bad
// employee ID doesn't block the other 99.
exports.bulkAssignEmployees = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError("Only an administrator can bulk-assign employees", 403);
  const team = await FieldTeam.findOne({
    _id: req.params.teamId,
    organisation_id,
    active: true,
  });
  if (!team) throw httpError("Field team not found", 404);
  const settings = await assertFieldOperationsEnabled(organisation_id);

  const employeeIds = [
    ...new Set(
      (Array.isArray(req.body.employeeIds) ? req.body.employeeIds : []).map(
        String,
      ),
    ),
  ];
  if (!employeeIds.length)
    throw httpError("Provide at least one employeeId", 400);

  const [validEmployees, otherTeams, individualAssignments] = await Promise.all(
    [
      User.find({ _id: { $in: employeeIds }, organisation_id })
        .select("_id f_name l_name")
        .lean(),
      FieldTeam.find({
        organisation_id,
        active: true,
        _id: { $ne: team._id },
      })
        .select("name members")
        .lean(),
      FieldAssignment.find({
        organisation_id,
        active: true,
        employee: { $in: employeeIds },
      })
        .select("employee")
        .lean(),
    ],
  );

  const validEmployeeMap = new Map(
    validEmployees.map((e) => [String(e._id), e]),
  );
  const teamOwnerByEmployee = new Map();
  otherTeams.forEach((t) =>
    t.members.forEach((id) => teamOwnerByEmployee.set(String(id), t.name)),
  );
  const individuallyAssignedSet = new Set(
    individualAssignments.map((a) => String(a.employee)),
  );
  const alreadyOnThisTeam = new Set(team.members.map(String));

  const succeeded = [];
  const failed = [];
  const toAdd = [];

  for (const employeeId of employeeIds) {
    if (!validEmployeeMap.has(employeeId)) {
      failed.push({
        employeeId,
        reason: "Employee not found in this organisation",
      });
      continue;
    }
    if (alreadyOnThisTeam.has(employeeId)) {
      failed.push({ employeeId, reason: "Employee is already on this team" });
      continue;
    }
    if (teamOwnerByEmployee.has(employeeId)) {
      failed.push({
        employeeId,
        reason: `Employee already belongs to another active Field Work team (${teamOwnerByEmployee.get(employeeId)})`,
      });
      continue;
    }
    if (individuallyAssignedSet.has(employeeId)) {
      failed.push({
        employeeId,
        reason:
          "Employee already has an active individual Field Work assignment",
      });
      continue;
    }
    toAdd.push(employeeId);
  }

  const projectedTotal =
    (
      await FieldTeam.find({ organisation_id, active: true })
        .select("members")
        .lean()
    ).reduce((sum, t) => sum + t.members.length, 0) +
    (await FieldAssignment.countDocuments({ organisation_id, active: true })) +
    toAdd.length -
    team.members.length +
    team.members.length; // no-op kept explicit for readability
  if (projectedTotal > settings.max_field_employees) {
    // Plan limit reached — nothing gets partially added once the cap would
    // be exceeded; report every remaining candidate as failed with the
    // reason rather than silently truncating the list.
    toAdd.forEach((employeeId) =>
      failed.push({
        employeeId,
        reason: `Field Operations plan limit of ${settings.max_field_employees} employees reached`,
      }),
    );
  } else {
    team.members = [...new Set([...team.members.map(String), ...toAdd])];
    await team.save();
    toAdd.forEach((employeeId) => succeeded.push(employeeId));
    await logAudit({
      organisation_id,
      module: "field_work",
      action: "team.bulk_assigned",
      actor,
      target: { id: team._id, model: "FieldTeam", name: team.name },
      meta: { succeeded: succeeded.length, failed: failed.length },
    });
  }

  return res.json({
    success: true,
    successCount: succeeded.length,
    failedCount: failed.length,
    succeeded,
    failed,
    team,
  });
};

// ── Bulk assignment via Excel/CSV sheet ────────────────────────────────────
// Same outcome as bulkAssignEmployees above (one active assignment rule,
// plan-limit check, per-row success/fail report) but driven by a spreadsheet
// instead of ticking checkboxes — for organisations onboarding a large batch
// of field employees (e.g. 60+ across several teams) in one go. Both paths
// stay available; this doesn't replace the manual one.
exports.downloadBulkAssignTemplate = async (req, res) => {
  const { organisation_id } = actorContext(req);
  const teams = await FieldTeam.find({ organisation_id, active: true })
    .select("name")
    .lean();
  const buffer = buildFieldAssignmentTemplateWorkbook(teams.map((t) => t.name));
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=field_work_bulk_assignment_template.xlsx",
  );
  return res.status(200).send(buffer);
};

exports.bulkAssignEmployeesFromFile = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError("Only an administrator can bulk-assign employees", 403);
  if (!req.file) throw httpError("No file uploaded", 400);
  const settings = await assertFieldOperationsEnabled(organisation_id);

  let rows;
  try {
    rows = parseFieldAssignmentWorkbook(req.file.buffer);
  } catch (err) {
    throw httpError(
      "Could not read that file. Please upload a valid .xlsx, .xls or .csv file.",
      400,
    );
  }
  if (!rows.length) throw httpError("The file has no data rows", 400);

  const autoCreateTeams =
    String(req.body.autoCreateTeams || "").toLowerCase() === "true";

  const [allEmployees, allTeams, allIndividualAssignments] = await Promise.all([
    User.find({ organisation_id })
      .select("_id empid work_email f_name l_name")
      .lean(),
    FieldTeam.find({ organisation_id, active: true })
      .select("name members")
      .lean(),
    FieldAssignment.find({ organisation_id, active: true })
      .select("employee")
      .lean(),
  ]);
  const employeeByRef = new Map();
  allEmployees.forEach((e) => {
    if (e.empid) employeeByRef.set(String(e.empid).toLowerCase(), e);
    if (e.work_email) employeeByRef.set(String(e.work_email).toLowerCase(), e);
  });
  const teamByName = new Map(allTeams.map((t) => [t.name.toLowerCase(), t]));
  const teamOwnerByEmployee = new Map();
  allTeams.forEach((t) =>
    t.members.forEach((id) => teamOwnerByEmployee.set(String(id), t.name)),
  );
  const individuallyAssignedSet = new Set(
    allIndividualAssignments.map((a) => String(a.employee)),
  );

  const succeeded = [];
  const failed = [];
  const teamsToAddMembers = new Map(); // teamId(string) -> Set(employeeId)
  const teamsToCreate = new Map(); // teamName(lowercase) -> { name, territory }
  let projectedNewCount = 0;
  const currentTotal =
    allTeams.reduce((sum, t) => sum + t.members.length, 0) +
    allIndividualAssignments.length;

  for (const row of rows) {
    const rowLabel = `Row ${row.__rowNumber}`;
    const ref = String(row.employeeRef || "")
      .trim()
      .toLowerCase();
    const teamName = String(row.teamName || "").trim();
    if (!ref) {
      failed.push({
        row: row.__rowNumber,
        reason: "Employee ID/Email is missing",
      });
      continue;
    }
    if (!teamName) {
      failed.push({ row: row.__rowNumber, reason: "Team Name is missing" });
      continue;
    }
    const employee = employeeByRef.get(ref);
    if (!employee) {
      failed.push({
        row: row.__rowNumber,
        employeeRef: row.employeeRef,
        reason:
          "Employee not found in this organisation (check ID/email spelling)",
      });
      continue;
    }
    const employeeId = String(employee._id);
    if (individuallyAssignedSet.has(employeeId)) {
      failed.push({
        row: row.__rowNumber,
        employeeRef: row.employeeRef,
        reason:
          "Employee already has an active individual Field Work assignment",
      });
      continue;
    }
    const existingTeamName = teamOwnerByEmployee.get(employeeId);
    if (
      existingTeamName &&
      existingTeamName.toLowerCase() !== teamName.toLowerCase()
    ) {
      failed.push({
        row: row.__rowNumber,
        employeeRef: row.employeeRef,
        reason: `Employee already belongs to another active Field Work team (${existingTeamName})`,
      });
      continue;
    }
    if (
      existingTeamName &&
      existingTeamName.toLowerCase() === teamName.toLowerCase()
    ) {
      failed.push({
        row: row.__rowNumber,
        employeeRef: row.employeeRef,
        reason: "Employee is already on this team",
      });
      continue;
    }

    let team = teamByName.get(teamName.toLowerCase());
    if (!team) {
      if (!autoCreateTeams) {
        failed.push({
          row: row.__rowNumber,
          employeeRef: row.employeeRef,
          reason: `Team "${teamName}" does not exist. Create it first, or re-upload with "create missing teams" enabled.`,
        });
        continue;
      }
      if (!teamsToCreate.has(teamName.toLowerCase()))
        teamsToCreate.set(teamName.toLowerCase(), {
          name: teamName,
          territory: String(row.territory || "").trim(),
        });
    }

    if (currentTotal + projectedNewCount + 1 > settings.max_field_employees) {
      failed.push({
        row: row.__rowNumber,
        employeeRef: row.employeeRef,
        reason: `Field Operations plan limit of ${settings.max_field_employees} employees reached`,
      });
      continue;
    }
    projectedNewCount += 1;
    const teamKey = team ? String(team._id) : `new:${teamName.toLowerCase()}`;
    if (!teamsToAddMembers.has(teamKey))
      teamsToAddMembers.set(teamKey, new Set());
    teamsToAddMembers.get(teamKey).add(employeeId);
    succeeded.push({
      row: row.__rowNumber,
      employeeRef: row.employeeRef,
      employeeName: `${employee.f_name || ""} ${employee.l_name || ""}`.trim(),
      team: teamName,
    });
  }

  // Create any brand-new teams first (only reachable when autoCreateTeams
  // was explicitly requested), then add members to every affected team —
  // one save per team, not one save per row.
  for (const [key, meta] of teamsToCreate.entries()) {
    if (![...teamsToAddMembers.keys()].includes(`new:${key}`)) continue;
    const created = await FieldTeam.create({
      organisation_id,
      name: meta.name,
      territory: meta.territory,
      members: [],
      managers: [],
      createdBy: actor.id,
    });
    teamsToAddMembers.set(
      String(created._id),
      teamsToAddMembers.get(`new:${key}`),
    );
    teamsToAddMembers.delete(`new:${key}`);
    await logAudit({
      organisation_id,
      module: "field_work",
      action: "team.created",
      actor,
      target: { id: created._id, model: "FieldTeam", name: created.name },
      meta: { source: "bulk_excel_upload" },
    });
  }
  for (const [teamId, employeeIdSet] of teamsToAddMembers.entries()) {
    const team = await FieldTeam.findOne({
      _id: teamId,
      organisation_id,
      active: true,
    });
    if (!team) continue;
    team.members = [
      ...new Set([...team.members.map(String), ...employeeIdSet]),
    ];
    await team.save();
  }

  await logAudit({
    organisation_id,
    module: "field_work",
    action: "team.bulk_assigned_via_excel",
    actor,
    meta: {
      succeeded: succeeded.length,
      failed: failed.length,
      rows: rows.length,
    },
  });

  return res.json({
    success: true,
    successCount: succeeded.length,
    failedCount: failed.length,
    succeeded,
    failed,
  });
};

exports.assignActivity = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin", "Manager"].includes(actor.model))
    throw httpError(
      "Only a manager or administrator can assign field work",
      403,
    );
  await assertFieldOperationsEnabled(organisation_id);

  const employeeId = String(req.body.employeeId || "").trim();
  if (!employeeId) throw httpError("employeeId is required", 400);
  const customerName = String(req.body.customerName || "").trim();
  if (!customerName)
    throw httpError("Customer or contact name is required", 400);

  const employeeIds = await accessibleEmployeeIds(req);
  if (!employeeIds.includes(employeeId))
    throw httpError(
      "You can only assign field work to an employee in your own field team(s)",
      403,
    );

  const team = await FieldTeam.findOne({
    organisation_id,
    active: true,
    members: employeeId,
  })
    .select("_id")
    .lean();

  const activityType = ACTIVITY_TYPES.includes(req.body.activityType)
    ? req.body.activityType
    : "customer_visit";
  const priority = ACTIVITY_PRIORITIES.includes(req.body.priority)
    ? req.body.priority
    : "medium";
  const scheduledDate = req.body.scheduledDate
    ? new Date(req.body.scheduledDate)
    : null;
  if (scheduledDate && Number.isNaN(scheduledDate.getTime()))
    throw httpError("Invalid scheduledDate", 400);
  const expectedLocation = parseGeofence(req.body.expectedLocation);

  const activity = await FieldVisit.create({
    organisation_id,
    employee: employeeId,
    team: team?._id || null,
    assignmentType: "assigned",
    activityType,
    priority,
    status: "pending",
    customerName,
    organisationName: String(req.body.organisationName || "").trim(),
    contactNumber: String(req.body.contactNumber || "").trim(),
    purpose: String(req.body.purpose || "").trim(),
    notes: String(req.body.notes || "").trim(),
    scheduledDate,
    scheduledTime: String(req.body.scheduledTime || "").trim(),
    expectedLocation: expectedLocation || undefined,
    assignedBy: actor.id,
    assignedByModel: actor.model,
    assignedAt: new Date(),
  });

  const employee = await User.findById(employeeId)
    .select("f_name l_name")
    .lean();
  await createNotification({
    recipientModel: "User",
    recipientId: employeeId,
    organisation_id,
    type: "field_activity_assigned",
    title: "New field work assigned",
    message: `${customerName} — ${activityType.replaceAll("_", " ")}${scheduledDate ? ` scheduled ${scheduledDate.toDateString()}` : ""}`,
    link: "/field-operations",
    createdBy: actor.id,
    createdByModel: actor.model,
  });
  await logAudit({
    organisation_id,
    module: "field_work",
    action: "activity.assigned",
    actor,
    target: {
      id: employeeId,
      model: "User",
      name: employee
        ? `${employee.f_name || ""} ${employee.l_name || ""}`.trim()
        : "",
    },
    meta: { activityId: activity._id, customerName, activityType },
  });
  return res.status(201).json({ success: true, activity });
};

exports.reassignActivity = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin", "Manager"].includes(actor.model))
    throw httpError(
      "Only a manager or administrator can reassign field work",
      403,
    );
  await assertFieldOperationsEnabled(organisation_id);

  const activity = await FieldVisit.findOne({
    _id: req.params.activityId,
    organisation_id,
    assignmentType: "assigned",
  });
  if (!activity) throw httpError("Assigned activity not found", 404);
  if (activity.status !== "pending")
    throw httpError(
      "Only an activity that hasn't been started yet can be reassigned",
      409,
    );

  const newEmployeeId = String(req.body.employeeId || "").trim();
  if (!newEmployeeId) throw httpError("employeeId is required", 400);

  const employeeIds = await accessibleEmployeeIds(req);
  if (
    !employeeIds.includes(String(activity.employee)) ||
    !employeeIds.includes(newEmployeeId)
  )
    throw httpError(
      "Both the current and new employee must be in your own field team(s)",
      403,
    );

  const newEmployee = await User.findOne({
    _id: newEmployeeId,
    organisation_id,
  })
    .select("_id f_name l_name")
    .lean();
  if (!newEmployee)
    throw httpError("Employee not found in this organisation", 404);

  const fromEmployee = activity.employee;
  activity.reassignmentHistory = [
    ...(activity.reassignmentHistory || []),
    {
      fromEmployee,
      toEmployee: newEmployeeId,
      reassignedBy: actor.id,
      reassignedByModel: actor.model,
      reason: String(req.body.reason || "").trim(),
      reassignedAt: new Date(),
    },
  ];
  activity.employee = newEmployeeId;
  const newTeam = await FieldTeam.findOne({
    organisation_id,
    active: true,
    members: newEmployeeId,
  })
    .select("_id")
    .lean();
  activity.team = newTeam?._id || null;
  await activity.save();

  await createNotification({
    recipientModel: "User",
    recipientId: newEmployeeId,
    organisation_id,
    type: "field_activity_assigned",
    title: "Field work reassigned to you",
    message: `${activity.customerName} — ${activity.activityType.replaceAll("_", " ")}`,
    link: "/field-operations",
    createdBy: actor.id,
    createdByModel: actor.model,
  });
  await logAudit({
    organisation_id,
    module: "field_work",
    action: "activity.reassigned",
    actor,
    target: {
      id: newEmployee._id,
      model: "User",
      name: `${newEmployee.f_name || ""} ${newEmployee.l_name || ""}`.trim(),
    },
    meta: { activityId: activity._id, fromEmployee: String(fromEmployee) },
  });
  return res.json({ success: true, activity });
};

exports.cancelActivity = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin", "Manager"].includes(actor.model))
    throw httpError(
      "Only a manager or administrator can cancel field work",
      403,
    );
  const activity = await FieldVisit.findOne({
    _id: req.params.activityId,
    organisation_id,
    assignmentType: "assigned",
  });
  if (!activity) throw httpError("Assigned activity not found", 404);
  if (!["pending", "in_progress"].includes(activity.status))
    throw httpError("This activity can no longer be cancelled", 409);
  const employeeIds = await accessibleEmployeeIds(req);
  if (!employeeIds.includes(String(activity.employee)))
    throw httpError("This employee is not in your field team(s)", 403);
  activity.status = "cancelled";
  activity.cancelledReason = String(req.body.reason || "").trim();
  activity.endedAt = new Date();
  await activity.save();
  await logAudit({
    organisation_id,
    module: "field_work",
    action: "activity.cancelled",
    actor,
    target: { id: activity.employee, model: "User" },
    meta: { activityId: activity._id },
  });
  return res.json({ success: true, activity });
};

exports.myAssignedActivities = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (actor.model !== "User")
    return res.json({ success: true, activities: [] });
  await assertFieldOperationsEnabled(organisation_id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const activities = await FieldVisit.find({
    organisation_id,
    employee: actor.id,
    assignmentType: "assigned",
    status: { $in: ["pending", "in_progress"] },
    $or: [
      { scheduledDate: null },
      { scheduledDate: { $gte: today, $lt: tomorrow } },
    ],
  })
    .sort({ priority: -1, scheduledTime: 1, createdAt: 1 })
    .lean();
  return res.json({ success: true, activities });
};

// Every visit the employee has ever started, newest first. Used by the
// employee's own "my visits" list so they can review past work without
// opening the manager dashboard.
exports.myVisits = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (actor.model !== "User")
    return res.json({ success: true, visits: [] });
  await assertFieldOperationsEnabled(organisation_id);
  const status = String(req.query.status || "").trim();
  const type = String(req.query.activityType || "").trim();
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  if (from && Number.isNaN(from.getTime()))
    throw httpError("Invalid 'from' date", 400);
  if (to && Number.isNaN(to.getTime()))
    throw httpError("Invalid 'to' date", 400);

  const query = { organisation_id, employee: actor.id };
  if (status) query.status = status;
  if (type) query.activityType = type;
  if (from || to) {
    query.startedAt = {};
    if (from) query.startedAt.$gte = from;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      query.startedAt.$lte = end;
    }
  }
  const visits = await FieldVisit.find(query)
    .sort({ startedAt: -1 })
    .limit(200)
    .lean();
  return res.json({ success: true, visits });
};

// ── CSV export (spec section 30) ──────────────────────────────────────────
function toCsvValue(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
}

exports.exportFieldActivitiesCsv = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError("Only an administrator can export Field Work data", 403);
  await assertFieldOperationsEnabled(organisation_id);

  const from = req.query.from
    ? new Date(`${req.query.from}T00:00:00.000Z`)
    : new Date(new Date().setHours(0, 0, 0, 0));
  const to = req.query.to
    ? new Date(`${req.query.to}T23:59:59.999Z`)
    : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
    throw httpError("Invalid from/to date", 400);

  const query = { organisation_id, createdAt: { $gte: from, $lte: to } };
  if (req.query.teamId) query.team = req.query.teamId;
  if (req.query.activityType) query.activityType = req.query.activityType;
  if (req.query.activityStatus) query.status = req.query.activityStatus;

  const activities = await FieldVisit.find(query)
    .populate("employee", "f_name l_name empid")
    .populate("team", "name")
    .sort({ createdAt: -1 })
    .limit(10000)
    .lean();
  const teamManagerCache = new Map();
  const header = [
    "Date",
    "Employee",
    "Employee ID",
    "Team",
    "Manager",
    "Activity Type",
    "Customer",
    "Purpose",
    "Start Time",
    "End Time",
    "Duration (minutes)",
    "Status",
    "Assignment Type",
    "Location Available",
  ];
  const rows = [header];
  for (const activity of activities) {
    let managerName = "";
    if (activity.team) {
      const teamId = String(activity.team._id);
      if (!teamManagerCache.has(teamId)) {
        const teamDoc = await FieldTeam.findById(teamId)
          .populate("managers", "f_name l_name")
          .select("managers")
          .lean();
        teamManagerCache.set(
          teamId,
          (teamDoc?.managers || [])
            .map((m) => `${m.f_name || ""} ${m.l_name || ""}`.trim())
            .join("; "),
        );
      }
      managerName = teamManagerCache.get(teamId);
    }
    const durationMinutes =
      activity.startedAt && activity.endedAt
        ? Math.round(
            (new Date(activity.endedAt) - new Date(activity.startedAt)) / 60000,
          )
        : "";
    rows.push([
      new Date(activity.createdAt).toISOString().slice(0, 10),
      activity.employee
        ? `${activity.employee.f_name || ""} ${activity.employee.l_name || ""}`.trim()
        : "",
      activity.employee?.empid || "",
      activity.team?.name || "",
      managerName,
      activity.activityType,
      activity.customerName,
      activity.purpose || "",
      activity.startedAt ? new Date(activity.startedAt).toISOString() : "",
      activity.endedAt ? new Date(activity.endedAt).toISOString() : "",
      durationMinutes,
      activity.status,
      activity.assignmentType,
      activity.startLocation ? "yes" : "no",
    ]);
  }
  const csv = rows.map((row) => row.map(toCsvValue).join(",")).join("\r\n");

  await logAudit({
    organisation_id,
    module: "field_work",
    action: "data.exported",
    actor,
    meta: { rows: activities.length },
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="field-activities-${new Date().toISOString().slice(0, 10)}.csv"`,
  );
  return res.status(200).send(csv);
};

// ── Audit log (spec section 31) ────────────────────────────────────────────
exports.getAuditLog = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model))
    throw httpError("Only an administrator can view the audit log", 403);
  const AuditLog = require("../Models/auditLog.model");
  const query = { organisation_id, module: "field_work" };
  if (req.query.action) query.action = req.query.action;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const [entries, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);
  return res.json({ success: true, entries, total, page, limit });
};
=======
  if (!["SuperAdmin", "Admin"].includes(actor.model)) throw httpError("Only an administrator can manage field teams", 403);
  await assertFieldOperationsEnabled(organisation_id);
  const active = { $nin: ["resigned", "fired", "terminated"] };
  const [employees, managers] = await Promise.all([
    User.find({ organisation_id, working_status: active }).select("f_name l_name empid office_location").sort({ f_name: 1 }).lean(),
    Manager.find({ organisation_id, working_status: active }).select("f_name l_name empid").sort({ f_name: 1 }).lean(),
  ]);
  return res.json({ success: true, employees, managers });
};
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
