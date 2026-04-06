const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const managerSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: [true, "UID is required"],
    unique: [true, "UID already exists"],
  },
   department: {
    type: String,
    enum: ["MGMT",  "HR"],
    required: [true, "Department is required"],
  },
  f_name: {
    type: String,
    required: [true, "Name is required"],
  },
  l_name: {
    type: String,
    required: [true, "Name is required"],
  },
  work_email: {
    type: String,
    required: [true, "Email is required"],
    unique: [true, "Email already exists"],
  },
  gender: {
    type: String,
    enum: ["male", "female"],
    required: [true, "Gender is required"],
  },
  marital_status: {
    type: String,
    enum: ["single", "married", "divorced"],
    required: [true, "Marital status is required"],
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
    required: [true, "Phone number is required"],
  },
  role: {
    type: String,
    enum: ["manager","senior_manager", "official"],
    default: "manager",
  },
   office_location:{
    type:String,
    enum:["Noida", "Bareilly", "Delhi", "Mumbai"],
    required:[true,'Office location is required']
  },
   designation:{
     type:String,
     required:[true,'Designation is required']
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  }
 ,
  isFirstLogin: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
 isVerified: {
  type: Boolean,
  default: false,
},
});

managerSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});
managerSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};
const Managermodel = mongoose.model("Manager", managerSchema);
module.exports = Managermodel;
