const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
    },

    profile_image: {
      type: String,
    },

    uid: {
      type: String,
      required: true,
    },

    department: {
      type: String,
      enum: ["OPR", "BPO", "ENG", "HR", "MGMT"],
      required: true,
    },

    f_name: {
      type: String,
      required: true,
      trim: true,
    },

    l_name: {
      type: String,
      required: true,
      trim: true,
    },

    work_email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },

    marital_status: {
      type: String,
      enum: ["single", "married", "divorced"],
      default: "single",
    },

    personal_contact: {
      type: String,
      required: true,
    },

    e_contact: {
      type: String,
      required: true,
    },

    aadhaar_number: {
      type: String,
    },

    pan_number: {
      type: String,
    },

    address: {
      type: String,
    },

    city: {
      type: String,
    },

    state: {
      type: String,
    },

    pincode: {
      type: String,
    },
    country: {
      type: String,
    },

    role: {
      type: String,
      enum: ["admin", "senior_admin", "official"],
      default: "admin",
    },

    designation: {
      type: String,
      required: true,
    },

    office_location: {
      type: String,
      enum: ["Noida", "Bareilly", "Delhi", "Mumbai"],
      required: true,
    },

    reporting_manager: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "reporting_manager_model",
      default: null,
    },

    reporting_manager_model: {
      type: String,
      enum: ["SuperAdmin", "Manager"],
      default: null,
    },

    is_fresher: {
      type: Boolean,
      default: true,
    },

    total_experience: {
      type: Number,
      default: 0,
    },

    previous_company: {
      type: String,
    },

    previous_designation: {
      type: String,
    },

    bank_name: {
      type: String,
    },

    account_holder_name: {
      type: String,
    },

    account_number: {
      type: String,
    },

    ifsc_code: {
      type: String,
    },

    resume: {
      type: String,
    },

    aadhaar_card: {
      type: String,
    },

    pan_card: {
      type: String,
    },

    experience_letter: {
      type: String,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isFirstLogin: {
      type: Boolean,
      default: true,
    },

    last_login: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.index({ uid: 1, organisation_id: 1 }, { unique: true });
adminSchema.index({ department: 1, status: 1 });
adminSchema.index({ status: 1 });
adminSchema.index({ reporting_manager: 1 });
adminSchema.index({ organisation_id: 1 });

adminSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (!this.reporting_manager) {
    this.reporting_manager_model = null;
  }

  if (!this.reporting_manager_model) {
    this.reporting_manager = null;
  }
});

adminSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  function () {
    const update = this.getUpdate();

    if (!update) return;

    const set = update.$set || update;

    if ("reporting_manager" in set && !set.reporting_manager) {
      set.reporting_manager_model = null;
    }

    if (
      "reporting_manager_model" in set &&
      !set.reporting_manager_model
    ) {
      set.reporting_manager = null;
    }

    if (update.$set) {
      update.$set = set;
    }
  }
);

adminSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

adminSchema.methods.reportsToSuperAdmin = function () {
  return this.reporting_manager_model === "SuperAdmin";
};

adminSchema.methods.resolveLeaveStatus = function ({
  pendingSuperAdminStatus = "pending_super_admin",
  pendingManagerStatus = "pending_reporting_manager",
} = {}) {
  if (!this.reporting_manager) return null;

  return this.reporting_manager_model === "SuperAdmin"
    ? pendingSuperAdminStatus
    : pendingManagerStatus;
};

const AdminModel = mongoose.model("Admin", adminSchema);

module.exports = AdminModel;