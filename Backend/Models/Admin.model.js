const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema(
  {
    f_name: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },

    l_name: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },

    work_email: {
      type: String,
      required: [true, "Work email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    phone: {
      type: String,
      trim: true,
    },

    profile_image: {
      type: String,
      default: null,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "Gender is required"],
    },

    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },

    role: {
      type: String,
      default: "admin",
      immutable: true,
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

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

adminSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const AdminModel = mongoose.model("Admin", adminSchema);
module.exports = AdminModel;