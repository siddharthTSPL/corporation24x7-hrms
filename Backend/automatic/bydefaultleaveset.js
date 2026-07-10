const LeaveBalance = require("../Models/leavebalance.model");
const LeavePolicy = require("../Models/leavepolicy.model");

// Fallback values used for any organisation that hasn't set a custom
// LeavePolicy (or hasn't customized a particular field in it).
const DEFAULT_POLICY = {
  EL: { admin: 18, default: 15 },
  SL: { admin: 12, default: 12 },
};

// `isAdmin` must be passed explicitly by the caller rather than inferred
// from user.role — "official" is a valid role value on both the Admin
// model and the Manager model, so the role string alone can't reliably
// tell us which entitlement tier applies.
const assignDefaultLeave = async (user, isAdmin = false) => {
  const tier = isAdmin ? "admin" : "default";

  let policy = null;
  if (user.organisation_id) {
    policy = await LeavePolicy.findOne({ organisation_id: user.organisation_id }).lean();
  }

  const yearlyEL = policy?.EL?.[tier] ?? DEFAULT_POLICY.EL[tier];
  const yearlySL = policy?.SL?.[tier] ?? DEFAULT_POLICY.SL[tier];

  // Only this month's share is granted up front. The rest accrues via the
  // monthly cron (autoelcredit.js), which adds entitled/12 on the 1st of
  // every subsequent month, capped at `entitled`. This is what naturally
  // prorates the balance for anyone who joins partway through the year —
  // e.g. joining in December means only 1 month's share (this one) is ever
  // granted before the yearly carry-forward on Jan 1, instead of the full
  // year's amount.
  const leaveBalance = await LeaveBalance.create({
    organisation_id: user.organisation_id,
    employee: user._id,

    EL: {
      entitled: yearlyEL,
      availed: 0,
      accrued: Number((yearlyEL / 12).toFixed(2)),
    },

    SL: {
      entitled: yearlySL,
      availed: 0,
      accrued: Number((yearlySL / 12).toFixed(2)),
    },

    ML: user.gender === "female" && user.marital_status === "married" ? 182 : 0,
    PL: user.gender === "male" && user.marital_status === "married" ? 7 : 0,

    pbc: 0,
    lwp: 0,
    lastAccrualDate: new Date(),
  });

  return leaveBalance;
};

module.exports = assignDefaultLeave;
module.exports.DEFAULT_POLICY = DEFAULT_POLICY;