const LeaveBalance = require("../Models/leavebalance.model");

const assignDefaultLeave = async (user) => {
  let yearlyEL = 15;

  switch (user.role) {
    case "manager":      yearlyEL = 18; break;
    case "senior_manager": yearlyEL = 20; break;
    case "official":     yearlyEL = 24; break;
  }

  const leaveBalance = await LeaveBalance.create({
    employee: user._id,
    EL: {
      entitled: yearlyEL,
      availed: 0,
      accrued: Number((yearlyEL / 12).toFixed(2)),
    },
    SL: {
      entitled: 12,
      availed: 0,
    },
    ML: user.gender === "female" && user.marital_status === "married" ? 182 : 0,
    PL: user.gender === "male"   && user.marital_status === "married" ? 7   : 0,
    pbc: 0,
    lwp: 0,
    lastAccrualDate: new Date(),
  });

  return leaveBalance;
};

module.exports = assignDefaultLeave;