const PermissionModel = require("../../Models/permission.model");
const { restrictPlanFeature } = require("../../middleware/auth/planFeatureGate.middleware");
const { httpError } = require("./errors");

// category -> the reports.* flag a non-admin needs for it.
const CATEGORY_FLAG = {
  hr: "can_view_hr_reports",
  attendance: "can_view_attendance_reports",
  leave: "can_view_leave_reports",
  timesheet: "can_view_timesheet_reports",
  expense: "can_view_expense_reports",
  payroll: null, // payroll reports are gated by payroll.can_manage_payroll instead
};

const ADMIN_ROLES = ["admin", "senior_admin"];

/** Who is calling? Derived ONLY from the authenticated request, never from the body/query. */
function resolveActor(req) {
  if (req.superAdmin) {
    return { id: req.superAdmin._id, model: "SuperAdmin", orgId: req.superAdmin._id, doc: req.superAdmin };
  }
  if (req.admin) {
    return { id: req.admin._id, model: "Admin", orgId: req.admin.organisation_id, doc: req.admin };
  }
  if (req.manager) {
    return { id: req.manager._id, model: "Manager", orgId: req.manager.organisation_id, doc: req.manager };
  }
  if (req.employee) {
    return { id: req.employee._id, model: "User", orgId: req.employee.organisation_id, doc: req.employee };
  }
  throw httpError(401, "Unauthorized");
}

const actorName = (doc) =>
  [doc?.f_name, doc?.l_name].filter(Boolean).join(" ").trim() || doc?.email || doc?.work_email || "";

/**
 * PURE decision function (unit-tested). No DB, no req.
 *   actorModel: SuperAdmin | Admin | Manager | User
 *   role: JWT role string of the account
 *   perms: the Permission document (plain object) or null
 * Returns { allowed, scope: "org" | "team" | null, canExport, reason }.
 */
function evaluateAccess({ actorModel, role, perms }, def) {
  const isOrgAdmin =
    actorModel === "SuperAdmin" ||
    (actorModel === "Admin" && (ADMIN_ROLES.includes(role) || role === "official" || !role));
  if (isOrgAdmin) return { allowed: true, scope: "org", canExport: true, reason: null };

  const r = perms?.reports || {};
  if (!r.can_view_reports) return { allowed: false, scope: null, canExport: false, reason: "no_reports_permission" };

  const flag = CATEGORY_FLAG[def.category];
  if (def.category === "payroll") {
    if (!perms?.payroll?.can_manage_payroll) {
      return { allowed: false, scope: null, canExport: false, reason: "no_payroll_permission" };
    }
  } else if (!flag || !r[flag]) {
    return { allowed: false, scope: null, canExport: false, reason: "no_category_permission" };
  }

  // Payroll reports are organisation-wide for payroll managers (same as the
  // existing Payroll screen). Everything else: org-wide only if explicitly
  // granted, otherwise managers see their own team and plain employees nothing.
  let scope = null;
  if (def.category === "payroll" || r.can_view_all_employees) scope = "org";
  else if (actorModel === "Manager") scope = "team";
  if (!scope) return { allowed: false, scope: null, canExport: false, reason: "no_scope" };

  return { allowed: true, scope, canExport: !!r.can_export_reports, reason: null };
}

/** Express middleware: builds req.reportCtx for every /reports request. */
async function attachContext(req, res, next) {
  try {
    const actor = resolveActor(req);
    const role = req.user?.role || req.tokenPayload?.role;
    let perms = null;
    if (actor.model !== "SuperAdmin") {
      perms = await PermissionModel.findOne({
        user_id: actor.id,
        user_model: actor.model,
        organisation_id: actor.orgId,
      }).lean();
    }
    req.reportCtx = {
      orgId: actor.orgId,
      actor: { id: actor.id, model: actor.model, role, name: actorName(actor.doc) },
      perms,
      teamIds: null, // lazily filled by people.getTeamIds
    };
    next();
  } catch (err) {
    next(err);
  }
}

/** Per-report gate. mode: "run" | "export". */
function authorizeReport(registry, auditDenied) {
  return async (req, res, next) => {
    try {
      const def = registry.get(req.params.key);
      if (!def) return next(httpError(404, "Unknown report."));
      const ctx = req.reportCtx;
      const decision = evaluateAccess({ actorModel: ctx.actor.model, role: ctx.actor.role, perms: ctx.perms }, def);
      const isExport = req.path.endsWith("/export");

      if (!decision.allowed || (isExport && !decision.canExport)) {
        if (def.sensitive) await auditDenied(ctx, def, isExport ? "export" : "run", decision.reason || "no_export_permission");
        return next(httpError(403, "You do not have permission to access this report."));
      }
      if (def.planFeature) {
        // Same gate the Timesheet module itself uses (Basic plan => blocked).
        return restrictPlanFeature(def.planFeature)(req, res, (err) => {
          if (err) return next(err);
          if (res.headersSent) return;
          ctx.scope = decision.scope;
          req.report = { def };
          next();
        });
      }
      ctx.scope = decision.scope;
      req.report = { def };
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { evaluateAccess, attachContext, authorizeReport, resolveActor, CATEGORY_FLAG };
