const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "user_model",
    },

    user_model: {
      type: String,
      required: true,
      enum: ["Admin", "Manager", "User"],
    },

    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },

    granted_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "granted_by_model",
    },

    granted_by_model: {
      type: String,
      required: true,
      enum: ["SuperAdmin", "Admin"],
    },

    employee_management: {
      can_view_employees: { type: Boolean, default: false },
      can_add_employee: { type: Boolean, default: false },
      can_edit_employee: { type: Boolean, default: false },
      can_delete_employee: { type: Boolean, default: false },
      can_promote_employee: { type: Boolean, default: false },
      can_demote_employee: { type: Boolean, default: false },
    },

    manager_management: {
      can_view_managers: { type: Boolean, default: false },
      can_add_manager: { type: Boolean, default: false },
      can_edit_manager: { type: Boolean, default: false },
      can_delete_manager: { type: Boolean, default: false },
      can_promote_manager: { type: Boolean, default: false },
      can_demote_manager: { type: Boolean, default: false },
    },

    leave_management: {
      can_view_leaves: { type: Boolean, default: false },
      can_approve_leave: { type: Boolean, default: false },
      can_reject_leave: { type: Boolean, default: false },
      can_apply_leave: { type: Boolean, default: true },
    },

    attendance: {
      can_view_attendance: { type: Boolean, default: false },
      can_view_own_attendance: { type: Boolean, default: true },
      can_edit_attendance: { type: Boolean, default: false },
    },

    announcements: {
      can_view_announcements: { type: Boolean, default: true },
      can_create_announcement: { type: Boolean, default: false },
      can_edit_announcement: { type: Boolean, default: false },
      can_delete_announcement: { type: Boolean, default: false },
    },

    recruitment: {
      can_view_candidates: { type: Boolean, default: false },
      can_add_candidate: { type: Boolean, default: false },
      can_edit_candidate: { type: Boolean, default: false },
      can_delete_candidate: { type: Boolean, default: false },
      can_view_hiring_requisitions: { type: Boolean, default: false },
      can_create_hiring_requisition: { type: Boolean, default: false },
    },

    documents: {
      can_view_own_documents: { type: Boolean, default: true },
      can_view_all_documents: { type: Boolean, default: false },
      can_upload_documents: { type: Boolean, default: true },
      can_delete_documents: { type: Boolean, default: false },
    },

    wfh: {
      can_apply_wfh: { type: Boolean, default: true },
      can_view_wfh_requests: { type: Boolean, default: false },
      can_approve_wfh: { type: Boolean, default: false },
      can_reject_wfh: { type: Boolean, default: false },
    },

    tickets: {
      can_raise_ticket: { type: Boolean, default: true },
      can_view_all_tickets: { type: Boolean, default: false },
      can_resolve_ticket: { type: Boolean, default: false },
      can_rate_ticket: { type: Boolean, default: true },
    },

    reviews: {
      can_view_own_review: { type: Boolean, default: true },
      can_give_review: { type: Boolean, default: false },
      can_view_all_reviews: { type: Boolean, default: false },
    },

    reports: {
      can_view_reports: { type: Boolean, default: false },
      can_export_reports: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

permissionSchema.index({ user_id: 1, user_model: 1, organisation_id: 1 }, { unique: true });
permissionSchema.index({ organisation_id: 1 });

const PermissionModel = mongoose.model("Permission", permissionSchema);
module.exports = PermissionModel;