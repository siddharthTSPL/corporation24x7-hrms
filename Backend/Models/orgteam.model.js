const mongoose = require("mongoose");

// Organisation-level functional teams that get onboarding hand-off mails:
//   it        -> assets, accounts, system access for every new joiner
//   accounts  -> payroll / salary structure setup for every new joiner
// (HR is not stored here - it stays the existing Admin.isHR flag, so the
// Review module's "HR Acknowledgement" keeps working unchanged.)
// Members can be any mix of Employees (User), Managers and Admins.
const orgTeamSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    team: { type: String, enum: ["it", "accounts"], required: true },
    members: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, refPath: "members.memberModel", required: true },
        memberModel: { type: String, enum: ["User", "Manager", "Admin"], required: true },
        _id: false,
      },
    ],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: null },
  },
  { timestamps: true }
);

orgTeamSchema.index({ organisation_id: 1, team: 1 }, { unique: true });

module.exports = mongoose.models.OrgTeam || mongoose.model("OrgTeam", orgTeamSchema);