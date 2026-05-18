const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const managerSchema = new mongoose.Schema(
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
      unique: true,
    },

    department: {
      type: String,
      enum: [
        "OPR",
        "BPO",
        "ENG",
        "HR",
        "MGMT"
      ],
      required: true,
    },

    f_name: {
      type: String,
      required: true,
    },

    l_name: {
      type: String,
      required: true,
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
      select: false,
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

    role: {
      type: String,
      enum: ["manager", "senior_manager", "official"],
      default: "manager",
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
      ref: "Manager",
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

    status: {
      type: String,
      enum: ["active", "inactive"],
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
  },
  {
    timestamps: true,
  }
);

managerSchema.index({ department: 1, status: 1 });
managerSchema.index({ status: 1 });
managerSchema.index({ reporting_manager: 1 });

managerSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

managerSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const Managermodel = mongoose.model("Manager", managerSchema);

module.exports = Managermodel;