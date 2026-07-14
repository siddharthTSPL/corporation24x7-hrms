const LeaveBalance = require("../Models/leavebalance.model");
const LeavePolicy = require("../Models/Leavepolicy.model");

const DEFAULT_POLICY = {
  EL: { admin: 18, default: 15 },
  SL: { admin: 12, default: 12 },
};

const assignDefaultLeave = async (user, isAdmin = false) => {
  const tier = isAdmin ? "admin" : "default";

  let policy = null;
  if (user.organisation_id) {
    policy = await LeavePolicy.findOne({ organisation_id: user.organisation_id }).lean();
  }

  const yearlyEL = policy?.EL?.[tier] ?? DEFAULT_POLICY.EL[tier];
  const yearlySL = policy?.SL?.[tier] ?? DEFAULT_POLICY.SL[tier];

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