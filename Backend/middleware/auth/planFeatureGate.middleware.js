const SuperAdminModel = require("../../Models/superadmin.model");

// Human-readable names used in the upgrade-required error message.
const FEATURE_LABELS = {
  review: "Performance Management (Review)",
  timesheet: "Timesheet",
  recruitment: "Recruitment Management",
  asset: "Asset Management",
  tickets: "TorchX Voice",
};

// Plans that unlock the gated features below (Review, Timesheet, Recruitment,
// Asset Management, TorchX Voice). "basic" is deliberately excluded —
// organisations on Basic get these features fully locked, while Advance and
// enterprise get them fully open. Update here if a new plan tier is introduced.
const UNLOCKED_PLANS = ["Advance", "enterprise"];

// Every role (SuperAdmin/Admin/Manager/Employee) ultimately belongs to one
// organisation (the SuperAdmin document), which is where licenses/plan
// live. SuperAdmin requests already carry the full doc via req.superAdmin;
// everyone else only carries an organisation_id, so we look it up.
const resolveOrganisation = async (req) => {
  if (req.superAdmin) return req.superAdmin;

  const organisationId =
    req.admin?.organisation_id ||
    req.manager?.organisation_id ||
    req.employee?.organisation_id ||
    req.user?.organisation_id;

  if (!organisationId) return null;

  return SuperAdminModel.findById(organisationId).select(
    "licenses is_trial_active trial_expires_at"
  );
};

/**
 * Locks a route behind the org's torchx_talent plan tier.
 * - Free trial: full access (matches getAccessibleProducts()/canAccessProduct()
 *   elsewhere in the app — trial unlocks everything).
 * - No active torchx_talent license: blocked (license required at all).
 * - plan === "basic": blocked — feature fully locked.
 * - plan === "Advance" | "enterprise": allowed — feature fully open.
 */
const restrictPlanFeature = (featureKey) => {
  const featureLabel = FEATURE_LABELS[featureKey] || featureKey;

  return async (req, res, next) => {
    try {
      const organisation = await resolveOrganisation(req);

      if (!organisation) {
        return res.status(404).json({
          success: false,
          message: "Organisation not found.",
        });
      }

      if (organisation.isTrialValid()) return next();

      const license = organisation.licenses?.find(
        (l) =>
          l.product === "torchx_talent" &&
          l.isActive &&
          new Date(l.expiresAt) > new Date()
      );

      if (!license) {
        return res.status(403).json({
          success: false,
          message:
            "Your organisation does not have an active TorchX Talent license. Please contact your administrator.",
          code: "NO_LICENSE",
        });
      }

      if (!UNLOCKED_PLANS.includes(license.plan)) {
        return res.status(403).json({
          success: false,
          message: `${featureLabel} is not available on the Basic plan. Upgrade to Advance or Enterprise to unlock this feature.`,
          code: "PLAN_UPGRADE_REQUIRED",
          feature: featureKey,
          currentPlan: license.plan,
        });
      }

      return next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { restrictPlanFeature, FEATURE_LABELS, UNLOCKED_PLANS };