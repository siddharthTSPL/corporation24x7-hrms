const mongoose = require("mongoose");


const fnfSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
      index: true,
    },

    employee: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "employeeModel",
      required: true,
    },
    employeeModel: {
      type: String,
      required: true,
      enum: ["User", "Manager", "Admin", "SuperAdmin"],
    },

   
    exitType: { type: String, enum: ["resigned", "fired", "terminated"], required: true },
    lastWorkingDay: { type: Date, default: null },

    
    employeeSnapshot: {
      name: { type: String, default: "" },
      employeeId: { type: String, default: "" }, // uid/empid
      department: { type: String, default: "" },
      designation: { type: String, default: "" },
    },

    organisationSnapshot: {
      name: { type: String, default: "" },
    },

    ctc: { type: Number, default: 0 }, 

    settlement: {
      pendingSalary: { type: Number, default: 0 }, 
      leaveEncashment: { type: Number, default: 0 },
      gratuity: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      otherEarnings: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 }, 
      otherDeductions: { type: Number, default: 0 },
    },

    netPayable: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["generated", "approved", "paid", "on_hold"],
      default: "generated",
    },

    remarks: { type: String, trim: true, maxlength: 500, default: "" },

    generatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    generatedByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    approvedByModel: { type: String, enum: ["Admin", "SuperAdmin"], default: null },
    paidOn: { type: Date, default: null },
  },
  { timestamps: true }
);


fnfSchema.index({ employee: 1 }, { unique: true });
fnfSchema.index({ organisation_id: 1, status: 1 });

module.exports = mongoose.models.FnF || mongoose.model("FnF", fnfSchema);