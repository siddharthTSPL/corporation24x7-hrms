const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema({
  profile_image: {
    type: String,
  },
  organisation_name: {
    type: String,
    required: [true, "Organisation name is required"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  role: {
    type: String,
    default: "admin",
    unique: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  phone: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
});

adminSchema.index({ status: 1 });

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

adminSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const Adminmodel = mongoose.model("Admin", adminSchema);
module.exports = Adminmodel;