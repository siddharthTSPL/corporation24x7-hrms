const SuperAdminModel = require("../Models/superadmin.model");
const AdminModel = require("../Models/Admin.model");
const ManagerModel = require("../Models/manager.model");
const UserModel = require("../Models/user.model");

const TRIAL_USER_LIMIT = 5;

/**
 * Counts all currently WORKING users (employees + managers + admins) for an org.
 * Only working_status === "working" counts against the license cap.
 */
const countWorkingUsers = async (organisation_id) => {
  const [employees, managers, admins] = await Promise.all([
    UserModel.countDocuments({ organisation_id, working_status: "working" }),
    ManagerModel.countDocuments({ organisation_id, working_status: "working" }),
    AdminModel.countDocuments({ organisation_id, working_status: "working" }),
  ]);
  return employees + managers + admins;
};

/**
 * Checks whether the org can onboard one more user.
 * Returns { allowed: true } or { allowed: false, message: "..." }
 */
const canOnboardUser = async (organisation_id) => {
  const superAdmin = await SuperAdminModel.findById(organisation_id)
    .select("is_trial_active trial_expires_at licenses")
    .lean();

  if (!superAdmin) {
    return { allowed: false, message: "Organisation not found." };
  }

  const currentCount = await countWorkingUsers(organisation_id);

  // --- Trial path ---
  const trialActive =
    superAdmin.is_trial_active && new Date() < new Date(superAdmin.trial_expires_at);

  if (trialActive) {
    if (currentCount >= TRIAL_USER_LIMIT) {
      return {
        allowed: false,
        message: `Your free trial allows up to ${TRIAL_USER_LIMIT} active users. You have reached the limit. Please upgrade your plan at torchxsuite.com to onboard more users.`,
      };
    }
    return { allowed: true };
  }

  // --- License path ---
  const license = superAdmin.licenses?.find(
    (l) =>
      l.product === "torchx_talent" &&
      l.isActive &&
      new Date(l.expiresAt) > new Date()
  );

  if (!license) {
    return {
      allowed: false,
      message:
        "Your trial has expired and you have no active license for TorchX Talent. Please upgrade your plan at torchxsuite.com to continue.",
    };
  }

  const allowedUsers = license.users || 0;

  if (allowedUsers > 0 && currentCount >= allowedUsers) {
    return {
      allowed: false,
      message: `You have reached the maximum user limit (${allowedUsers}) for your current plan. Please upgrade your plan at torchxsuite.com to onboard more users.`,
    };
  }

  return { allowed: true };
};

module.exports = { canOnboardUser, countWorkingUsers };