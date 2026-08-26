const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema(
  {
    empid: {
      type: String,
      required: true,
      unique: true,
    },

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

    // Set only by SuperAdmin. When true, this Admin can give the final
    // "HR Acknowledgement" approval on any performance review in the
    // organisation. Multiple admins can hold this flag at once.
    isHR: {
      type: Boolean,
      default: false,
    },

    designation: {
      type: String,
      required: true,
    },

    office_location: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (value) {
          return typeof value === "string" && value.trim().length > 0 && value.length <= 100;
        },
        message: "Office location must be a valid, non-empty location name (max 100 characters)",
      },
    },

    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
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

    working_status: {
      type: String,
      enum: ["working", "resigned", "fired", "terminated"],
      default: "working",
      trim: true,
    },

    noticePeriod: {
      active: { type: Boolean, default: false },
      exitType: { type: String, enum: ["resigned", "fired", "terminated", null], default: null },
      months: { type: Number, default: null },
      initiatedOn: { type: Date, default: null },
      lastWorkingDay: { type: Date, default: null },
      initiatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
      initiatedByModel: { type: String, enum: ["Admin", "SuperAdmin", null], default: null },
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

    date_of_joining: {
      type: Date,
      default: null,
    },

    date_of_birth: {
      type: Date,
      default: null,
    },

    // Calendar year the "Happy Birthday" popup was last shown/dismissed for
    // this person, so it appears once on their birthday (first login of that
    // day) and then stays quiet for the rest of the year.
    lastBirthdayWishYear: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.index({ uid: 1, organisation_id: 1 }, { unique: true });
adminSchema.index({ work_email: 1, organisation_id: 1 }, { unique: true });
adminSchema.index({ department: 1, status: 1 });
adminSchema.index({ status: 1 });
adminSchema.index({ reporting_manager: 1 });
adminSchema.index({ organisation_id: 1 });
adminSchema.index({ office_location: 1 });

adminSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  if (this.isModified("reporting_manager") || this.isModified("reporting_manager_model")) {
    if (!this.reporting_manager || !this.reporting_manager_model) {
      this.reporting_manager = null;
      this.reporting_manager_model = null;
    }
  }
});

adminSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  function () {
    const update = this.getUpdate();

    if (!update) return;

    const set = update.$set || update;

    const touchesManager = "reporting_manager" in set || "reporting_manager_model" in set;

    if (touchesManager) {
      const nextManager = "reporting_manager" in set ? set.reporting_manager : undefined;
      const nextModel = "reporting_manager_model" in set ? set.reporting_manager_model : undefined;

      const managerMissing = "reporting_manager" in set ? !nextManager : false;
      const modelMissing = "reporting_manager_model" in set ? !nextModel : false;

      if (managerMissing || modelMissing) {
        set.reporting_manager = null;
        set.reporting_manager_model = null;
      }
    }

    if ("working_status" in set && typeof set.working_status === "string") {
      set.working_status = set.working_status.trim();
    }

    if ("office_location" in set && typeof set.office_location === "string") {
      set.office_location = set.office_location.trim();
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