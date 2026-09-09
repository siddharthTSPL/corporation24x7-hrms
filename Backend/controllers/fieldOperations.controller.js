const FieldTeam = require("../Models/fieldTeam.model");
const FieldDutySession = require("../Models/fieldDutySession.model");
const FieldLocation = require("../Models/fieldLocation.model");
const FieldVisit = require("../Models/fieldVisit.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const SuperAdmin = require("../Models/superadmin.model");
const { resolveActor, resolveOrgId, httpError } = require("../utils/heirarchy.utils");

const OPEN_STATUSES = ["active", "paused", "offline"];
const STAFF_ROLES = ["SuperAdmin", "Admin", "Manager"];

const asPoint = (input, required = true) => {
  const latitude = Number(input?.latitude);
  const longitude = Number(input?.longitude);
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
    capturedAt,
  };
};

const actorContext = (req) => ({ actor: resolveActor(req), organisation_id: resolveOrgId(req) });
const isStaff = (actor) => STAFF_ROLES.includes(actor.model);

async function assertFieldOperationsEnabled(organisation_id) {
  const organisation = await SuperAdmin.findById(organisation_id).select("field_operations").lean();
  if (!organisation) throw httpError("Organisation not found", 404);
  if (organisation.field_operations?.enabled === false) throw httpError("Field Operations is disabled for this organisation", 403);
  return organisation.field_operations || { max_field_employees: 50, max_managers: 10, data_retention_days: 180 };
}

async function assertEmployeeCanUseFieldOperations(req) {
  const { actor, organisation_id } = actorContext(req);
  await assertFieldOperationsEnabled(organisation_id);
  if (actor.model !== "User") throw httpError("Only field employees can start or update a duty session", 403);

  const team = await FieldTeam.findOne({ organisation_id, members: actor.id, active: true }).select("_id").lean();
  if (!team) throw httpError("You are not assigned to an active field team. Contact your administrator.", 403);
  return { actor, organisation_id, teamId: team._id };
}

async function accessibleEmployeeIds(req) {
  const { actor, organisation_id } = actorContext(req);
  if (["SuperAdmin", "Admin"].includes(actor.model)) {
    const teams = await FieldTeam.find({ organisation_id, active: true }).select("members").lean();
    return [...new Set(teams.flatMap((team) => team.members.map(String)))];
  }
  if (actor.model === "Manager") {
    const teams = await FieldTeam.find({ organisation_id, active: true, managers: actor.id }).select("members").lean();
    return [...new Set(teams.flatMap((team) => team.members.map(String)))];
  }
  return [String(actor.id)];
}

async function getOwnedSession(req, sessionId, { employeeOnly = false } = {}) {
  const { actor, organisation_id } = actorContext(req);
  const session = await FieldDutySession.findOne({ _id: sessionId, organisation_id });
  if (!session) throw httpError("Field duty session not found", 404);
  if (employeeOnly && String(session.employee) !== String(actor.id)) throw httpError("You can only update your own field duty", 403);
  if (!employeeOnly && !isStaff(actor)) {
    if (String(session.employee) !== String(actor.id)) throw httpError("Access denied", 403);
  } else if (!employeeOnly && actor.model === "Manager") {
    const allowed = await accessibleEmployeeIds(req);
    if (!allowed.includes(String(session.employee))) throw httpError("This employee is not in one of your assigned field teams", 403);
  }
  return session;
}

exports.startDuty = async (req, res) => {
  const { actor, organisation_id, teamId } = await assertEmployeeCanUseFieldOperations(req);
  const startLocation = asPoint(req.body.location || req.body);
  const clientEventId = String(req.body.eventId || "").trim() || null;

  if (clientEventId) {
    const existing = await FieldDutySession.findOne({ organisation_id, employee: actor.id, clientEventId });
    if (existing) return res.status(200).json({ success: true, session: existing, idempotent: true });
  }

  const open = await FieldDutySession.findOne({ organisation_id, employee: actor.id, status: { $in: OPEN_STATUSES } }).sort({ startedAt: -1 });
  if (open) return res.status(409).json({ success: false, message: "You already have an open field-duty session", session: open });

  const session = await FieldDutySession.create({
    organisation_id, employee: actor.id, team: teamId, startLocation, lastLocation: startLocation,
    lastSeenAt: startLocation.capturedAt, clientEventId,
  });
  return res.status(201).json({ success: true, session });
};

exports.myDuty = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (actor.model !== "User") return res.json({ success: true, session: null });
  const session = await FieldDutySession.findOne({ organisation_id, employee: actor.id, status: { $in: OPEN_STATUSES } }).sort({ startedAt: -1 });
  return res.json({ success: true, session });
};

exports.updateDutyStatus = async (req, res) => {
  await assertEmployeeCanUseFieldOperations(req);
  const session = await getOwnedSession(req, req.params.sessionId, { employeeOnly: true });
  if (!OPEN_STATUSES.includes(session.status)) throw httpError("This field-duty session is already checked out", 409);
  const status = String(req.body.status || "");
  if (!["active", "paused", "offline"].includes(status)) throw httpError("Invalid duty status", 400);
  session.status = status;
  await session.save();
  return res.json({ success: true, session });
};

exports.addLocation = async (req, res) => {
  const { actor, organisation_id } = await assertEmployeeCanUseFieldOperations(req);
  const session = await getOwnedSession(req, req.params.sessionId, { employeeOnly: true });
  if (!OPEN_STATUSES.includes(session.status)) throw httpError("Location sharing has stopped because duty is checked out", 409);
  const point = asPoint(req.body);
  const eventId = String(req.body.eventId || "").trim();
  if (!eventId) throw httpError("eventId is required for safe offline sync", 400);

  let location;
  try {
    location = await FieldLocation.create({
      organisation_id, session: session._id, employee: actor.id, eventId,
      location: { type: "Point", coordinates: [point.longitude, point.latitude] },
      accuracy: point.accuracy, deviceTimestamp: point.capturedAt,
      batteryLevel: Number.isFinite(Number(req.body.batteryLevel)) ? Number(req.body.batteryLevel) : null,
      networkStatus: ["online", "offline"].includes(req.body.networkStatus) ? req.body.networkStatus : "unknown",
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    location = await FieldLocation.findOne({ organisation_id, eventId });
  }

  // A delayed offline point must never move the live marker backwards.
  if (!session.lastSeenAt || point.capturedAt >= session.lastSeenAt) {
    session.lastLocation = point;
    session.lastSeenAt = point.capturedAt;
    if (session.status === "offline") session.status = "active";
    await session.save();
  }
  return res.status(201).json({ success: true, location, idempotent: location?.eventId !== eventId ? true : undefined });
};

exports.checkoutDuty = async (req, res) => {
  await assertEmployeeCanUseFieldOperations(req);
  const session = await getOwnedSession(req, req.params.sessionId, { employeeOnly: true });
  if (session.status === "checked_out") return res.json({ success: true, session, idempotent: true });
  const endLocation = asPoint(req.body.location || req.body, false) || session.lastLocation;
  if (!endLocation) throw httpError("Your last known location is required to check out", 400);
  const endedAt = new Date();
  session.status = "checked_out";
  session.endedAt = endedAt;
  session.endLocation = endLocation;
  session.totalDurationSeconds = Math.max(0, Math.round((endedAt - session.startedAt) / 1000));
  await session.save();
  return res.json({ success: true, session });
};

exports.startVisit = async (req, res) => {
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
  });
  return res.status(201).json({ success: true, visit });
};

exports.endVisit = async (req, res) => {
  await assertEmployeeCanUseFieldOperations(req);
  const { actor, organisation_id } = actorContext(req);
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
  await visit.save();
  return res.json({ success: true, visit });
};

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
    isEmployee: actor.model === "User",
  });
};

exports.getRoute = async (req, res) => {
  const { organisation_id } = actorContext(req);
  await assertFieldOperationsEnabled(organisation_id);
  const employeeIds = await accessibleEmployeeIds(req);
  const employeeId = String(req.params.employeeId);
  if (!employeeIds.includes(employeeId)) throw httpError("This employee is not in your assigned field teams", 403);
  const from = req.query.date ? new Date(`${req.query.date}T00:00:00.000Z`) : new Date(new Date().setHours(0, 0, 0, 0));
  if (Number.isNaN(from.getTime())) throw httpError("Invalid route date", 400);
  const to = new Date(from); to.setUTCDate(to.getUTCDate() + 1);
  const points = await FieldLocation.find({ organisation_id, employee: employeeId, deviceTimestamp: { $gte: from, $lt: to } })
    .select("location accuracy deviceTimestamp session").sort({ deviceTimestamp: 1 }).lean();
  const sessions = await FieldDutySession.find({ organisation_id, employee: employeeId, startedAt: { $lt: to }, $or: [{ endedAt: null }, { endedAt: { $gte: from } }] })
    .select("startedAt endedAt status startLocation endLocation totalDurationSeconds").sort({ startedAt: 1 }).lean();
  return res.json({ success: true, points, sessions });
};

exports.listTeams = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  await assertFieldOperationsEnabled(organisation_id);
  const query = actor.model === "Manager" ? { organisation_id, managers: actor.id } : { organisation_id };
  const teams = await FieldTeam.find(query).populate("managers", "f_name l_name empid").populate("members", "f_name l_name empid office_location").sort({ name: 1 }).lean();
  return res.json({ success: true, teams });
};

exports.createTeam = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
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
  const team = await FieldTeam.create({ organisation_id, name, code: req.body.code, territory: req.body.territory, members, managers, createdBy: actor.id });
  return res.status(201).json({ success: true, team });
};

exports.teamOptions = async (req, res) => {
  const { actor, organisation_id } = actorContext(req);
  if (!["SuperAdmin", "Admin"].includes(actor.model)) throw httpError("Only an administrator can manage field teams", 403);
  await assertFieldOperationsEnabled(organisation_id);
  const active = { $nin: ["resigned", "fired", "terminated"] };
  const [employees, managers] = await Promise.all([
    User.find({ organisation_id, working_status: active }).select("f_name l_name empid office_location").sort({ f_name: 1 }).lean(),
    Manager.find({ organisation_id, working_status: active }).select("f_name l_name empid").sort({ f_name: 1 }).lean(),
  ]);
  return res.json({ success: true, employees, managers });
};
