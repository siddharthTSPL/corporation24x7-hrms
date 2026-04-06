const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: [true, "UID is required"],
    unique: [true, "UID already exists"],
  },

  department: {
    type: String,
    enum: ["OPR", "BPO",  "ENG"],
    required: [true, "Department is required"],
  },

  Under_manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Manager",
    required: true,
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
    unique: [true, "Email already exists"],
  },
  gender:{
    type:String,
    enum:["male","female"],
    required:[true,'Gender is required']
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
    required: [true, "Emergency contact is required"],
  },

  role: {
    type: String,
    default: "employee",
    required: [true, "Role is required"],
  },
  designation:{
     type:String,
     required:[true,'Designation is required']
  },
  office_location:{
    type:String,
    enum:["Noida", "Bareilly", "Delhi", "Mumbai"],
    required:[true,'Office location is required']
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  isFirstLogin: {
    type: Boolean,
    default: true,
  },
  passwordupdatedAt: {
    type: Date,
    default: Date.now,
  },
  isverified: {
    type: Boolean,
    default: false,
  },
});

userSchema.pre("save", async function (next) {
 if (!this.isModified("password")) return;
 
   this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
