const mongoose = require("mongoose");
const User = require("../../Models/user.model");
const Manager = require("../../Models/manager.model");
const Admin = require("../../Models/Admin.model");
const SuperAdmin = require("../../Models/superadmin.model");
const { httpError } = require("./errors");

const OID = (v) => new mongoose.Types.ObjectId(String(v));

// Employees live in four collections with different field names. This module
// hides that, and is the ONLY place reports read person records, so org scope
// and team scope are enforced in exactly one spot.
//
// SECURITY: the select lists below are an allow-list. Aadhaar, PAN, DOB, bank
// and salary fields are never loaded, so no report can leak them by accident.
const COMMON = "uid empid f_name l_name department designation date_of_joining createdAt working_status status noticePeriod office_location work_email role";
const CONFIG = {
  User: { Model: User, roleKey: "employee", label: "Employee", select: `${COMMON} Under_manager`, managerField: "Under_manager" },
  Manager: { Model: Manager, roleKey: "manager", label: "Manager", select: `${COMMON} reporting_manager reporting_manager_model`, managerField: "reporting_manager" },
  Admin: { Model: Admin, roleKey: "admin", label: "Admin", select: `${COMMON} reporting_manager reporting_manager_model`, managerField: "reporting_manager" },
  SuperAdmin: { Model: SuperAdmin, roleKey: null, label: "Super Admin", select: "empid f_name l_name department designation createdAt working_status email role" },
};
const DB_MODELS = ["User", "Manager", "Admin"]; // collections that carry organisation_id as ObjectId

function normalize(doc, model) {
  const cfg = CONFIG[model];
  const managerId = model === "User" ? doc.Under_manager : doc.reporting_manager;
  const managerModel = model === "User" ? "Manager" : doc.reporting_manager_model || null;
  return {
    id: String(doc._id),
    model,
    roleKey: cfg.roleKey,
    roleLabel: cfg.label,
    // Reports show the Employee ID (empid). The row key stays "uid" so the UI/export
    // column bindings do not change; uid is only a fallback for legacy records.
    uid: doc.empid || doc.uid || "",
    name: [doc.f_name, doc.l_name].filter(Boolean).join(" ").trim(),
    department: doc.department || "",
    designation: doc.designation || "",
    joiningDate: doc.date_of_joining || doc.createdAt || null,
    joiningIsFallback: !doc.date_of_joining,
    workingStatus: doc.working_status || "working",
    accountStatus: doc.status || "active",
    onNotice: !!doc.noticePeriod?.active,
    exitType: doc.noticePeriod?.exitType || null,
    lastWorkingDay: doc.noticePeriod?.lastWorkingDay || null,
    managerId: managerId ? String(managerId) : null,
    managerModel,
    location: doc.office_location || "",
  };
}

/** All ids (strings) in the caller's reporting tree, including the caller. Cycle-safe. */
async function getTeamIds(ctx) {
  if (ctx.teamIds) return ctx.teamIds;
  const visited = new Set([String(ctx.actor.id)]);
  let frontier = [String(ctx.actor.id)];
  let guard = 0;
  while (frontier.length && guard++ < 25 && visited.size < 50000) {
    const ids = frontier.map(OID);
    const [users, managers, admins] = await Promise.all([
      User.find({ organisation_id: ctx.orgId, Under_manager: { $in: ids } }).select("_id").lean(),
      Manager.find({ organisation_id: ctx.orgId, reporting_manager: { $in: ids } }).select("_id").lean(),
      Admin.find({ organisation_id: ctx.orgId, reporting_manager: { $in: ids } }).select("_id").lean(),
    ]);
    frontier = [];
    for (const d of [...users, ...managers, ...admins]) {
      const k = String(d._id);
      if (!visited.has(k)) { visited.add(k); frontier.push(k); }
    }
  }
  ctx.teamIds = visited;
  return visited;
}

/** Throws 403 if ANY requested id is outside the caller's organisation / team. */
async function assertEmployeesInScope(ctx, ids) {
  if (!ids?.length) return;
  const unique = [...new Set(ids.map(String))];
  if (ctx.scope === "team") {
    const team = await getTeamIds(ctx);
    if (unique.some((i) => !team.has(i))) {
      throw httpError(403, "One or more selected employees are outside your authorised scope.");
    }
  }
  const oids = unique.map(OID);
  const counts = await Promise.all([
    ...DB_MODELS.map((m) => CONFIG[m].Model.countDocuments({ organisation_id: ctx.orgId, _id: { $in: oids } })),
    oids.some((o) => String(o) === String(ctx.orgId)) ? 1 : 0,
  ]);
  if (counts.reduce((a, b) => a + b, 0) < unique.length) {
    throw httpError(403, "One or more selected employees are outside your authorised scope.");
  }
}

/**
 * Load the people a report may include.
 * opts: { department, designation, status: "working"|"exited", employeeIds, managerId,
 *         includeSuperAdmin = true, models }
 */
async function loadPeople(ctx, opts = {}) {
  const { department, designation, status, employeeIds, managerId, includeSuperAdmin = true } = opts;
  const models = (opts.models || [...DB_MODELS, "SuperAdmin"]).filter(
    (m) => m !== "SuperAdmin" || (includeSuperAdmin && ctx.scope === "org")
  );

  await assertEmployeesInScope(ctx, employeeIds);

  let idFilter = null; // null => whole organisation
  if (ctx.scope === "team") idFilter = [...(await getTeamIds(ctx))];
  if (employeeIds?.length) {
    const wanted = employeeIds.map(String);
    idFilter = idFilter ? wanted.filter((i) => idFilter.includes(i)) : wanted;
  }

  const out = [];
  await Promise.all(
    models.map(async (model) => {
      const cfg = CONFIG[model];
      const q = {};
      if (model === "SuperAdmin") {
        q._id = ctx.orgId; // the organisation owner's own record, never anyone else's
        if (idFilter && !idFilter.includes(String(ctx.orgId))) return;
        if (managerId) return;
      } else {
        q.organisation_id = ctx.orgId; // tenant isolation: always the first condition
        if (idFilter) q._id = { $in: idFilter.map(OID) };
        if (managerId) q[cfg.managerField] = OID(managerId);
      }
      if (department) q.department = department;
      if (designation) q.designation = designation;
      if (status === "working") q.working_status = "working";
      if (status === "exited") q.working_status = { $ne: "working" };
      const docs = await cfg.Model.find(q).select(cfg.select).lean();
      for (const d of docs) out.push(normalize(d, model));
    })
  );
  out.sort((a, b) => a.name.localeCompare(b.name) || a.uid.localeCompare(b.uid));
  return out;
}

/** Batch-resolve "who is this id" for managers / approvers, scoped to the org. */
async function resolveNames(ctx, refs) {
  const byModel = {};
  for (const r of refs) {
    if (!r?.id || !r?.model || !CONFIG[r.model]) continue;
    (byModel[r.model] ||= new Set()).add(String(r.id));
  }
  const names = new Map();
  await Promise.all(
    Object.entries(byModel).map(async ([model, set]) => {
      const cfg = CONFIG[model];
      const q = model === "SuperAdmin"
        ? { _id: ctx.orgId }
        : { organisation_id: ctx.orgId, _id: { $in: [...set].map(OID) } };
      const docs = await cfg.Model.find(q).select("f_name l_name").lean();
      for (const d of docs) {
        names.set(`${model}:${d._id}`, [d.f_name, d.l_name].filter(Boolean).join(" ").trim());
      }
    })
  );
  return names;
}

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Type-ahead for the employee filter. Scope-aware, capped. */
async function searchPeople(ctx, { q = "", limit = 15, roleKeys } = {}) {
  const term = String(q).trim().slice(0, 50);
  const idFilter = ctx.scope === "team" ? [...(await getTeamIds(ctx))].map(OID) : null;
  const rows = [];
  await Promise.all(
    DB_MODELS.filter((m) => !roleKeys || roleKeys.includes(CONFIG[m].roleKey)).map(async (model) => {
      const cfg = CONFIG[model];
      const query = { organisation_id: ctx.orgId };
      if (idFilter) query._id = { $in: idFilter };
      if (term) {
        const rx = new RegExp(esc(term), "i");
        query.$or = [{ f_name: rx }, { l_name: rx }, { empid: rx }, { uid: rx }];
      }
      const docs = await cfg.Model.find(query).select("empid uid f_name l_name").limit(limit).lean();
      for (const d of docs) rows.push({ value: String(d._id), label: `${[d.f_name, d.l_name].filter(Boolean).join(" ")} (${d.empid || d.uid || "-"})` });
    })
  );
  return rows.sort((a, b) => a.label.localeCompare(b.label)).slice(0, limit);
}

/** Distinct department / designation values the caller can actually filter on. */
async function distinctValues(ctx, field) {
  const idFilter = ctx.scope === "team" ? [...(await getTeamIds(ctx))].map(OID) : null;
  const sets = await Promise.all(
    DB_MODELS.map((m) => {
      const q = { organisation_id: ctx.orgId };
      if (idFilter) q._id = { $in: idFilter };
      return CONFIG[m].Model.distinct(field, q);
    })
  );
  return [...new Set(sets.flat().filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }));
}

module.exports = {
  CONFIG, OID, normalize, getTeamIds, assertEmployeesInScope, loadPeople,
  resolveNames, searchPeople, distinctValues,
};