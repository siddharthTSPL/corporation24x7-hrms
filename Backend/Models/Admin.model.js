const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema({
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
  isVerified: {
    type: Boolean,
    default: false,
  },
});

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

adminSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const Adminmodel = mongoose.model("Admin", adminSchema);
module.exports = Adminmodel;