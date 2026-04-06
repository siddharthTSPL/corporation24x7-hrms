const LeaveBalance = require("../Models/leavebalance.model");

const assignDefaultLeave = async (user) => {

  let yearlyEL = 15;

  switch (user.role) {
    case "manager":
      yearlyEL = 18;
      break;
    case "senior_manager":
      yearlyEL = 20;
      break;
    case "official":
      yearlyEL = 24;
      break;
  }

  const monthlyEL = yearlyEL / 12;

  const SL = 12;

  let ML = 0;
  let PL = 0;

  if (user.gender === "female" && user.marital_status === "married")
    ML = 182;

  if (user.gender === "male" && user.marital_status === "married")
    PL = 7;

  const leaveBalance = await LeaveBalance.create({

    employee: user._id,

    EL: {
      entitled: yearlyEL,
      availed: 0,
      accrued: monthlyEL
    },

    SL: {
      entitled: SL,
      availed: 0
    },

    ML,
    PL,
    pbc: 0,
    lwp: 0,

    lastAccrualDate: new Date()

  });

  return leaveBalance;
};

module.exports = assignDefaultLeave;