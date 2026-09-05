const SuperAdminModel = require("../Models/superadmin.model");
const { UNLOCKED_PLANS } = require("../middleware/auth/planFeatureGate.middleware");

// Features gated by the org's torchx_talent plan tier. Keep this in sync
// with middleware/auth/planFeatureGate.middleware.js — that middleware is
// the actual enforcement; this endpoint just tells the frontend what to
// show ahead of time so users see a clear "upgrade required" state instead
// of a failed API call.
const GATED_FEATURES = ["review", "timesheet", "recruitment", "asset", "tickets"];

const getPlanFeatureAccess = async (req, res, next) => {
  try {
    let organisation = req.superAdmin;

    if (!organisation) {
      const organisationId =
        req.admin?.organisation_id ||
        req.manager?.organisation_id ||
        req.employee?.organisation_id ||
        req.user?.organisation_id;

      if (!organisationId)
        return next(
          Object.assign(new Error("Organisation not found."), { statusCode: 404 })
        );

      organisation = await SuperAdminModel.findById(organisationId).select(
        "licenses is_trial_active trial_expires_at"
      );
    }

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

    res.status(200).json({
      success: true,
      plan,
      isTrialActive: trialActive,
      features,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPlanFeatureAccess };