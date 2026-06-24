const SuperAdminModel = require("../Models/superadmin.model");

const TRIAL_USER_LIMIT = 2;

const canOnboardUser = async (organisation_id) => {
  const superAdmin = await SuperAdminModel.findById(organisation_id)
    .select("is_trial_active trial_expires_at licenses active_user_count")
    .lean();

  if (!superAdmin)
    return { allowed: false, message: "Organisation not found." };

  const activeCount = superAdmin.active_user_count || 0;
  const trialActive =
    superAdmin.is_trial_active && new Date() < new Date(superAdmin.trial_expires_at);

  if (trialActive) {
    if (activeCount >= TRIAL_USER_LIMIT)
      return {
        allowed: false,
        message: `Your free trial allows up to ${TRIAL_USER_LIMIT} active users. You have reached the limit. Please upgrade your plan at torchxsuite.com to onboard more users.`,
      };
    return { allowed: true };
  }

  const license = superAdmin.licenses?.find(
    (l) =>
      l.product === "torchx_talent" &&
      l.isActive &&
      new Date(l.expiresAt) > new Date()
  );

  if (!license)
    return {
      allowed: false,
      message:
        "Your trial has expired and you have no active license for TorchX Talent. Please upgrade your plan at torchxsuite.com to continue.",
    };

  const allowedUsers = license.users || 0;

  if (allowedUsers > 0 && activeCount >= allowedUsers)
    return {
      allowed: false,
      message: `You have reached the maximum user limit (${allowedUsers}) for your current plan. Please upgrade your plan at torchxsuite.com to onboard more users.`,
    };

  return { allowed: true };
};

const incrementActiveUserCount = async (organisation_id) => {
  await SuperAdminModel.findByIdAndUpdate(organisation_id, {
    $inc: { active_user_count: 1 },
  });
};

const decrementActiveUserCount = async (organisation_id) => {
  await SuperAdminModel.findByIdAndUpdate(organisation_id, {
    $inc: { active_user_count: -1 },
  });
};

module.exports = { canOnboardUser, incrementActiveUserCount, decrementActiveUserCount };