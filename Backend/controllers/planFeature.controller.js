const SuperAdminModel = require("../Models/superadmin.model");
const FieldTeam = require("../Models/fieldTeam.model");
const { UNLOCKED_PLANS } = require("../middleware/auth/planFeatureGate.middleware");

// Features gated by the org's torchx_talent plan tier. Keep this in sync
// with middleware/auth/planFeatureGate.middleware.js — that middleware is
// the actual enforcement; this endpoint just tells the frontend what to
// show ahead of time so users see a clear "upgrade required" state instead
// of a failed API call.
//
// NOTE: "selfService" (Self Service Portal — Leave/Reimbursement/Documents)
// is intentionally NOT in this list. It is available on every plan,
// including Basic. Only these 5 remain locked on Basic: Review, Timesheet,
// Recruitment, Asset Management, TorchX Voice.
const GATED_FEATURES = ["review", "timesheet", "recruitment", "asset", "tickets", "single_sign_in"];

// Field Operations is NOT plan-tier gated like the list above — it's an
// org-type toggle. Most organisations on the platform don't do field work,
// so it stays off (see Models/superadmin.model.js field_operations.enabled,
// default false) until an admin/superadmin turns it on for that org from
// Field Operations settings. Orgs where it's off never see the nav item at
// all — no "Upgrade" upsell, since upgrading their plan wouldn't be
// relevant to them.
const getPlanFeatureAccess = async (req, res, next) => {
  try {
    const organisationId =
      req.superAdmin?._id ||
      req.admin?.organisation_id ||
      req.manager?.organisation_id ||
      req.employee?.organisation_id ||
      req.user?.organisation_id;

    if (!organisationId)
      return next(
        Object.assign(new Error("Organisation not found."), { statusCode: 404 })
      );

    const organisation = req.superAdmin
      ? req.superAdmin
      : await SuperAdminModel.findById(organisationId).select(
          "licenses is_trial_active trial_expires_at field_operations"
        );

    if (!organisation)
      return next(
        Object.assign(new Error("Organisation not found."), { statusCode: 404 })
      );

    const trialActive = organisation.isTrialValid();

    const license = organisation.licenses?.find(
      (l) =>
        l.product === "torchx_talent" &&
        l.isActive &&
        new Date(l.expiresAt) > new Date()
    );

    const plan = license?.plan || null;
    const unlocked = trialActive || (!!plan && UNLOCKED_PLANS.includes(plan));

    const features = GATED_FEATURES.reduce((acc, key) => {
      acc[key] = unlocked;
      return acc;
    }, {});
    features.fieldOperations = organisation.field_operations?.enabled === true;

    // Even when the org has Field Operations on, the "Field Duty" nav item
    // should only appear for the employees an admin actually assigned to a
    // field team (and "Field Operations" for the managers who lead one) —
    // everyone else in that org never sees a check-in/checkout screen they
    // aren't meant to use.
    const fieldAssignment = { isMember: false, isManager: false };
    if (features.fieldOperations) {
      if (req.employee) {
        const team = await FieldTeam.findOne({
          organisation_id: organisationId,
          members: req.employee._id,
          active: true,
        }).select("_id").lean();
        fieldAssignment.isMember = Boolean(team);
      } else if (req.manager) {
        const team = await FieldTeam.findOne({
          organisation_id: organisationId,
          managers: req.manager._id,
          active: true,
        }).select("_id").lean();
        fieldAssignment.isManager = Boolean(team);
      }
    }

    res.status(200).json({
      success: true,
      plan,
      isTrialActive: trialActive,
      features,
      fieldAssignment,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPlanFeatureAccess };