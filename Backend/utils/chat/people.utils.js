const mongoose = require("mongoose");
const Usermodel = require("../../Models/user.model");
const Managermodel = require("../../Models/manager.model");
const AdminModel = require("../../Models/Admin.model");
const SuperAdminModel = require("../../Models/superadmin.model");

// A "person" in chat is {model, id}. Same four account types the sockets and
// notifications already use. For a SuperAdmin the account IS the organisation.
const MODELS = { User: Usermodel, Manager: Managermodel, Admin: AdminModel, SuperAdmin: SuperAdminModel };
const MODEL_NAMES = Object.keys(MODELS);

const ROLE_LABEL = { User: "Employee", Manager: "Manager", Admin: "Admin", SuperAdmin: "Super Admin" };

const httpError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const personKey = (model, id) => `${model}:${String(id)}`;
const parseKey = (key) => {
  const i = String(key).indexOf(":");
  return { model: key.slice(0, i), id: key.slice(i + 1) };
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PROJECTION = "f_name l_name uid designation department work_email email profile_image working_status";

const shapePerson = (doc, model) => ({
  key: personKey(model, doc._id),
  id: String(doc._id),
  model,
  name: `${doc.f_name || ""} ${doc.l_name || ""}`.trim() || doc.work_email || doc.email || "Unknown",
  uid: doc.uid || doc.empid || "",
  designation: doc.designation || "",
  department: doc.department || "",
  email: doc.work_email || doc.email || "",
  photo: doc.profile_image || "",
  role: ROLE_LABEL[model],
});

// The org filter differs for SuperAdmin (the org itself) vs everyone else.
const orgFilter = (model, organisation_id) =>
  model === "SuperAdmin" ? { _id: organisation_id } : { organisation_id };

const isActive = (doc) => !doc.working_status || doc.working_status === "working";

// Accepts [{model, id}] (or [{model, _id}]) and returns Map<key, shapedPerson>.
// Anyone who isn't in this organisation, or isn't "working", is silently absent
// from the result - callers decide whether that is an error (see requirePeople).
const resolvePeople = async (organisation_id, refs) => {
  const byModel = {};
  for (const r of refs || []) {
    const model = r && r.model;
    const id = String((r && (r.id || r._id)) || "");
    if (!MODELS[model] || !mongoose.isValidObjectId(id)) continue;
    (byModel[model] = byModel[model] || new Set()).add(id);
  }
  const out = new Map();
  await Promise.all(
    Object.entries(byModel).map(async ([model, ids]) => {
      const docs = await MODELS[model]
        .find({ _id: { $in: [...ids] }, ...orgFilter(model, organisation_id) })
        .select(PROJECTION)
        .lean();
      for (const d of docs) if (isActive(d)) out.set(personKey(model, d._id), shapePerson(d, model));
    })
  );
  return out;
};

// Like resolvePeople but throws if any requested person is not a valid, active
// member of the organisation. This is the tenant-isolation gate for every
// "add these people" endpoint.
const requirePeople = async (organisation_id, refs) => {
  const clean = [];
  const seen = new Set();
  for (const r of refs || []) {
    const model = r && r.model;
    const id = String((r && (r.id || r._id)) || "");
    if (!MODELS[model] || !mongoose.isValidObjectId(id)) throw httpError("Each person needs a valid model and id.");
    const k = personKey(model, id);
    if (seen.has(k)) continue;
    seen.add(k);
    clean.push({ model, id });
  }
  const map = await resolvePeople(organisation_id, clean);
  if (map.size !== clean.length) throw httpError("One or more selected people do not belong to this organisation or are inactive.");
  return map;
};

// Org directory search. Every whitespace-separated token must match at least one
// of name / uid / email / designation / department, so "ravi sh" finds "Ravi Sharma".
const searchDirectory = async (organisation_id, { q = "", excludeKey = null, limit = 20, department = "" } = {}) => {
  const tokens = String(q).trim().split(/\s+/).filter(Boolean).slice(0, 5);
  const perModel = Math.min(Math.max(limit, 1), 100);

  const build = (model) => {
    const filter = { ...orgFilter(model, organisation_id), working_status: { $in: [null, "working"] } };
    const and = tokens.map((t) => {
      const re = new RegExp(escapeRegex(t), "i");
      const fields = ["f_name", "l_name", "uid", "designation", "department"];
      fields.push(model === "SuperAdmin" ? "email" : "work_email");
      return { $or: fields.map((f) => ({ [f]: re })) };
    });
    if (and.length) filter.$and = and;
    if (department && model !== "SuperAdmin") filter.department = department;
    return filter;
  };

  const lists = await Promise.all(
    MODEL_NAMES.map(async (model) => {
      const docs = await MODELS[model].find(build(model)).select(PROJECTION).sort({ f_name: 1 }).limit(perModel).lean();
      return docs.map((d) => shapePerson(d, model));
    })
  );

  return lists
    .flat()
    .filter((p) => p.key !== excludeKey)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, perModel);
};

// Every active person in the organisation (used for "invite everyone" meetings).
const listAllPeople = async (organisation_id, { departments = [] } = {}) => {
  const lists = await Promise.all(
    MODEL_NAMES.map(async (model) => {
      const filter = { ...orgFilter(model, organisation_id), working_status: { $in: [null, "working"] } };
      if (departments.length && model !== "SuperAdmin") filter.department = { $in: departments };
      const docs = await MODELS[model].find(filter).select(PROJECTION).lean();
      return docs.map((d) => shapePerson(d, model));
    })
  );
  return lists.flat();
};

module.exports = {
  MODELS,
  MODEL_NAMES,
  httpError,
  personKey,
  parseKey,
  escapeRegex,
  shapePerson,
  resolvePeople,
  requirePeople,
  searchDirectory,
  listAllPeople,
};
