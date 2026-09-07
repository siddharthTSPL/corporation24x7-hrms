const Managermodel = require("../Models/manager.model");
const Adminmodel = require("../Models/Admin.model");
const PermissionModel = require("../Models/permission.model");

// ─── Role-based default permissions ───────────────────────────────────────────
// admin   : announcements + documents + tickets + recruitment  (all features)
// manager : announcements + documents + tickets + recruitment  (all features)
// employee: announcements + documents + tickets only           (NO recruitment)
//
// Single source of truth for both the "add one" flows (admin.controller.js)
// and bulk onboarding (bulkOnboarding.utils.js) - do not duplicate this.
const DEFAULT_PERMISSIONS = {
  admin: {
    announcements: {
      can_view_announcements: true,
      can_create_announcement: true,
      can_edit_announcement: true,
      can_delete_announcement: true,
    },
    documents: {
      can_upload_documents: true,
      can_view_all_documents: true,
    },
    tickets: {
      can_raise_ticket: true,
      can_view_all_tickets: true,
      can_resolve_ticket: true,
      can_rate_ticket: true,
    },
    recruitment: {
      can_view_hiring_requisitions: true,
      can_create_hiring_requisition: true,
      can_view_candidates: true,
      can_add_candidate: true,
    },
  },
  manager: {
    announcements: {
      can_view_announcements: true,
      can_create_announcement: true,
      can_edit_announcement: true,
      can_delete_announcement: true,
    },
    documents: {
      can_upload_documents: true,
      can_view_all_documents: true,
    },
    tickets: {
      can_raise_ticket: true,
      can_view_all_tickets: true,
      can_resolve_ticket: true,
      can_rate_ticket: true,
    },
    recruitment: {
      can_view_hiring_requisitions: true,
      can_create_hiring_requisition: true,
      can_view_candidates: true,
      can_add_candidate: true,
    },
  },
  employee: {
    announcements: {
      can_view_announcements: true,
      can_create_announcement: false,
      can_edit_announcement: false,
      can_delete_announcement: false,
    },
    documents: {
      can_upload_documents: true,
      can_view_all_documents: false,
    },
    tickets: {
      can_raise_ticket: true,
      can_view_all_tickets: false,
      can_resolve_ticket: false,
      can_rate_ticket: true,
    },
    // Employees have NO recruitment access
    recruitment: {
      can_view_hiring_requisitions: false,
      can_create_hiring_requisition: false,
      can_view_candidates: false,
      can_add_candidate: false,
    },
  },
};

const USER_MODEL_MAP = {
  admin: "Admin",
  senior_admin: "Admin",
  official: "Admin",
  manager: "Manager",
  senior_manager: "Manager",
  employee: "User",
};

const mergePermissions = (role, overrides) => {
  const permissionRole = ["admin", "senior_admin", "official"].includes(role)
    ? "admin"
    : ["manager", "senior_manager"].includes(role)
    ? "manager"
    : "employee";

  const defaults = DEFAULT_PERMISSIONS[permissionRole];
  if (!overrides) return defaults;

  return {
    announcements: {
      can_view_announcements: overrides.announcements?.can_view_announcements ?? defaults.announcements.can_view_announcements,
      can_create_announcement: overrides.announcements?.can_create_announcement ?? defaults.announcements.can_create_announcement,
      can_edit_announcement: overrides.announcements?.can_edit_announcement ?? defaults.announcements.can_edit_announcement,
      can_delete_announcement: overrides.announcements?.can_delete_announcement ?? defaults.announcements.can_delete_announcement,
    },
    documents: {
      can_upload_documents: overrides.documents?.can_upload_documents ?? defaults.documents.can_upload_documents,
      can_view_all_documents: overrides.documents?.can_view_all_documents ?? defaults.documents.can_view_all_documents,
    },
    tickets: {
      can_raise_ticket: overrides.tickets?.can_raise_ticket ?? defaults.tickets.can_raise_ticket,
      can_view_all_tickets: overrides.tickets?.can_view_all_tickets ?? defaults.tickets.can_view_all_tickets,
      can_resolve_ticket: overrides.tickets?.can_resolve_ticket ?? defaults.tickets.can_resolve_ticket,
      can_rate_ticket: overrides.tickets?.can_rate_ticket ?? defaults.tickets.can_rate_ticket,
    },
    recruitment: {
      can_view_hiring_requisitions: overrides.recruitment?.can_view_hiring_requisitions ?? defaults.recruitment.can_view_hiring_requisitions,
      can_create_hiring_requisition: overrides.recruitment?.can_create_hiring_requisition ?? defaults.recruitment.can_create_hiring_requisition,
      can_view_candidates: overrides.recruitment?.can_view_candidates ?? defaults.recruitment.can_view_candidates,
      can_add_candidate: overrides.recruitment?.can_add_candidate ?? defaults.recruitment.can_add_candidate,
    },
  };
};

const assignDefaultPermissions = async (
  user_id,
  role,
  organisation_id,
  granted_by,
  granted_by_model,
  session,
  overrides
) => {
  const user_model = USER_MODEL_MAP[role] || "User";
  const perms = mergePermissions(role, overrides);

  await PermissionModel.findOneAndUpdate(
    { user_id, user_model, organisation_id },
    {
      $set: {
        user_id,
        user_model,
        organisation_id,
        granted_by,
        granted_by_model,
        ...perms,
      },
    },
    { upsert: true, new: true, runValidators: true, session: session || undefined }
  );
};

// A manager's `reporting_manager` can point at either another Manager or
// an Admin (see manager.model.js's reporting_manager/reporting_manager_model
// pair) - this resolves an id to whichever collection it actually belongs to.
const resolveReportingManager = async (reporting_manager_id, organisation_id) => {
  if (!reporting_manager_id) return { reportingManagerId: null, reportingManagerModel: null };

  const manager = await Managermodel.findOne({ _id: reporting_manager_id, organisation_id })
    .select("_id")
    .lean();
  if (manager) return { reportingManagerId: manager._id, reportingManagerModel: "Manager" };

  const admin = await Adminmodel.findOne({ _id: reporting_manager_id, organisation_id })
    .select("_id")
    .lean();
  if (admin) return { reportingManagerId: admin._id, reportingManagerModel: "Admin" };

  return { reportingManagerId: null, reportingManagerModel: null };
};

module.exports = {
  DEFAULT_PERMISSIONS,
  USER_MODEL_MAP,
  mergePermissions,
  assignDefaultPermissions,
  resolveReportingManager,
};