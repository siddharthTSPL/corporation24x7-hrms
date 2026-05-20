const mongoose = require("mongoose");

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    EL: {
      entitled: Number,
      availed: {
        type: Number,
        default: 0,
      },
      accrued: {
        type: Number,
        default: 0,
      },
    },
    SL: {
      entitled: Number,
      availed: {
        type: Number,
        default: 0,
      },
    },
    ML: Number,
    mlStartDate: Date,
    mlEndDate: Date,
    PL: Number,
    pbc: Number,
    lwp: Number,
    lastAccrualDate: Date,
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ employee: 1 }, { unique: true });

module.exports = mongoose.model("LeaveBalance", leaveBalanceSchema);