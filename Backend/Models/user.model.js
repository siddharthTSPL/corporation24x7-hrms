const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    empid:{
      type: String,
      required: true,
      unique: true,
  },
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },

    profile_image: {
      type: String,
    },

    uid: {
      type: String,
      required: [true, "UID is required"],
    },

    department: {
      type: String,
      enum: ["OPR", "BPO", "ENG", "HR", "MGMT"],
      required: [true, "Department is required"],
    },

    Under_manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      default: null,
    },

    f_name: {
      type: String,
      required: [true, "First name is required"],
    },

    l_name: {
      type: String,
      required: [true, "Last name is required"],
    },

    work_email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "Gender is required"],
    },

    marital_status: {
      type: String,
      enum: ["single", "married", "divorced"],
      default: "single",
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    personal_contact: {
      type: String,
      required: [true, "Phone number is required"],
    },

    e_contact: {
      type: String,
      required: [true, "Emergency contact is required"],
    },

    aadhaar_number: { type: String },
    pan_number: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String },

    role: {
      type: String,
      default: "employee",
    },

    designation: {
      type: String,
      required: [true, "Designation is required"],
    },

    office_location: {
      type: String,
      required: [true, "Office location is required"],
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
    is_fresher: { type: Boolean, default: true },
    total_experience: { type: Number, default: 0 },
    previous_company: { type: String },
    previous_designation: { type: String },
    bank_name: { type: String },
    account_holder_name: { type: String },
    account_number: { type: String },
    ifsc_code: { type: String },
    resume: { type: String },
    aadhaar_card: { type: String },
    pan_card: { type: String },
    experience_letter: { type: String },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
     working_status:{
      type:String,
      enum:["working","resigned","fired","terminated"],
      default:"working"
    },

    isFirstLogin: { type: Boolean, default: true },
    passwordupdatedAt: { type: Date, default: Date.now },
    isverified: { type: Boolean, default: false },
    date_of_joining: { type: Date, default: null },
    date_of_birth: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ uid: 1, organisation_id: 1 }, { unique: true });
userSchema.index({ work_email: 1, organisation_id: 1 }, { unique: true });
userSchema.index({ Under_manager: 1, status: 1 });
userSchema.index({ department: 1, status: 1 });
userSchema.index({ status: 1 });
userSchema.index({ organisation_id: 1 });
userSchema.index({ office_location: 1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);