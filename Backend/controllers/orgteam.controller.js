const OrgTeam = require("../Models/orgteam.model");
const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");

const MODELS = { User: Usermodel, Manager: Managermodel, Admin: AdminModel };
const TEAMS = ["it", "accounts"];

const httpError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const orgOf = (req) => req.admin.organisation_id;
const actorModelOf = (req) => (req.actorModel === "SuperAdmin" ? "SuperAdmin" : "Admin");

const shapePerson = (doc, model) => ({
  _id: doc._id,
  model,
  name: `${doc.f_name || ""} ${doc.l_name || ""}`.trim(),
  uid: doc.uid || "",
  designation: doc.designation || "",
  department: doc.department || "",
  email: doc.work_email || "",
  role: model === "User" ? "Employee" : model,
  isHR: model === "Admin" ? !!doc.isHR : undefined,
});

const listPeople = async (organisation_id) => {
  const fields = "f_name l_name uid designation department work_email isHR";
  const filter = { organisation_id, working_status: "working" };
  const [admins, managers, employees] = await Promise.all([
    AdminModel.find(filter).select(fields).lean(),
    Managermodel.find(filter).select(fields).lean(),
    Usermodel.find(filter).select(fields).lean(),
  ]);
  return [
    ...admins.map((d) => shapePerson(d, "Admin")),
    ...managers.map((d) => shapePerson(d, "Manager")),
    ...employees.map((d) => shapePerson(d, "User")),
  ].sort((a, b) => a.name.localeCompare(b.name));
};

// GET /org-teams  -> current HR / IT / Accounts setup + everyone who can be picked
const getTeams = async (req, res) => {
  const organisation_id = orgOf(req);
  const people = await listPeople(organisation_id);
  const byKey = new Map(people.map((p) => [`${p.model}:${p._id}`, p]));

  const teamDocs = await OrgTeam.find({ organisation_id }).lean();
  const teams = { it: [], accounts: [] };
  for (const doc of teamDocs) {
    teams[doc.team] = (doc.members || [])
      .map((m) => byKey.get(`${m.memberModel}:${m.member}`))
      .filter(Boolean);
  }

  res.status(200).json({
    success: true,
    people,
    hr: people.filter((p) => p.model === "Admin" && p.isHR),
    it: teams.it,
    accounts: teams.accounts,
  });
};

// PUT /org-teams/hr  { adminIds: [] }
// Same flag the Review module already uses. Empty list = no designated HR,
// which means every Admin can review overtime requests.
const setHRTeam = async (req, res) => {
  const organisation_id = orgOf(req);
  const adminIds = Array.isArray(req.body?.adminIds) ? [...new Set(req.body.adminIds.map(String))] : null;
  if (!adminIds) throw httpError("adminIds must be an array.");

  const valid = await AdminModel.find({ _id: { $in: adminIds }, organisation_id }).select("_id").lean();
  if (valid.length !== adminIds.length) throw httpError("One or more selected admins do not belong to this organisation.");

  await AdminModel.updateMany({ organisation_id, _id: { $nin: adminIds }, isHR: true }, { $set: { isHR: false } });
  if (adminIds.length) await AdminModel.updateMany({ organisation_id, _id: { $in: adminIds } }, { $set: { isHR: true } });

  res.status(200).json({ success: true, message: adminIds.length ? "HR team updated." : "HR team cleared. All admins can now review overtime." });
};

const saveTeam = (team) => async (req, res) => {
  if (!TEAMS.includes(team)) throw httpError("Unknown team.");
  const organisation_id = orgOf(req);
  const raw = Array.isArray(req.body?.members) ? req.body.members : null;
  if (!raw) throw httpError("members must be an array.");

  const seen = new Set();
  const members = [];
  for (const m of raw) {
    const model = m?.model;
    const id = String(m?.id || "");
    if (!MODELS[model] || !id) throw httpError("Each member needs a valid id and model.");
    const key = `${model}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    members.push({ member: id, memberModel: model });
  }

  for (const model of Object.keys(MODELS)) {
    const ids = members.filter((m) => m.memberModel === model).map((m) => m.member);
    if (!ids.length) continue;
    const found = await MODELS[model].countDocuments({ _id: { $in: ids }, organisation_id });
    if (found !== ids.length) throw httpError("One or more selected people do not belong to this organisation.");
  }

  await OrgTeam.findOneAndUpdate(
    { organisation_id, team },
    { $set: { members, updatedBy: req.admin._id, updatedByModel: actorModelOf(req) } },
    { upsert: true, new: true }
  );

  const label = team === "it" ? "IT" : "Accounts";
  res.status(200).json({
    success: true,
    message: members.length
      ? `${label} team updated. New joiners will be reported to ${members.length} member${members.length === 1 ? "" : "s"}.`
      : `${label} team cleared. No onboarding mails will be sent to ${label}.`,
  });
};

module.exports = { getTeams, setHRTeam, saveITTeam: saveTeam("it"), saveAccountsTeam: saveTeam("accounts") };