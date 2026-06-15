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

    announcements: {
      can_view_announcements: { type: Boolean, default: false },
      can_create_announcement: { type: Boolean, default: false },
      can_edit_announcement: { type: Boolean, default: false },
      can_delete_announcement: { type: Boolean, default: false },
    },

    documents: {
      can_upload_documents: { type: Boolean, default: false },
      can_view_all_documents: { type: Boolean, default: false },
    },

    tickets: {
      can_raise_ticket: { type: Boolean, default: false },
      can_view_all_tickets: { type: Boolean, default: false },
      can_resolve_ticket: { type: Boolean, default: false },
      can_rate_ticket: { type: Boolean, default: false },
    },

    recruitment: {
      can_view_hiring_requisitions: { type: Boolean, default: false },
      can_create_hiring_requisition: { type: Boolean, default: false },
      can_view_candidates: { type: Boolean, default: false },
      can_add_candidate: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

permissionSchema.index({ user_id: 1, user_model: 1, organisation_id: 1 }, { unique: true });
permissionSchema.index({ organisation_id: 1 });

const PermissionModel = mongoose.model("Permission", permissionSchema);
module.exports = PermissionModel;