const express = require("express");
const userrouter = express.Router();
const usercontroller = require("../controllers/user.controller");
const employeemiddleware = require("../middleware/auth/employee.middleware");
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const admincontroller = require("../controllers/admin.controller");


userrouter.get("/verify/:token", asyncHandler(usercontroller.verifyUserEmail));

userrouter.post("/login", asyncHandler(usercontroller.userlogin));

userrouter.get("/change-password", usercontroller.showUserPasswordPage);

userrouter.post(
  "/resetUserPassword",
  asyncHandler(usercontroller.firstloginresetUserPassword),
);

userrouter.post("/logout",employeemiddleware,asyncHandler(usercontroller.userlogout));


userrouter.post("/updatepassword",employeemiddleware,asyncHandler(usercontroller.updatepassword));

userrouter.post("/applyleave", employeemiddleware,asyncHandler(usercontroller.applyleave));


userrouter.get("/resultofleaverequest/:id",employeemiddleware,asyncHandler(usercontroller.resultofleaverequest));
userrouter.get("/getallleave",employeemiddleware, asyncHandler(usercontroller.getallleave));

userrouter.put(
  "/editleave/:id",
  employeemiddleware,
  asyncHandler(usercontroller.editleave)
);
userrouter.delete("/deleteleave/:id",employeemiddleware,asyncHandler(usercontroller.deleteleave));

userrouter.get("/getallleavehistory",employeemiddleware,asyncHandler(usercontroller.getallleavehistory));

userrouter.get("/showannouncements", employeemiddleware,asyncHandler(usercontroller.showannouncements));
userrouter.get(
  "/showannouncement/:id",
  employeemiddleware,
  asyncHandler(usercontroller.showparticlausannouncements)
);



userrouter.post("/forgetpassword",asyncHandler(usercontroller.forgetpasswordloginbyotp));
userrouter.post("/verifyotp", asyncHandler(usercontroller.verifyOtp));
userrouter.post(
  "/resetPasswordafterforget",
  asyncHandler(usercontroller.resetPasswordafterforget),
);

userrouter.get("/getme",employeemiddleware, asyncHandler(usercontroller.getme));

userrouter.put("/updateprofile",employeemiddleware, asyncHandler(usercontroller.editprofileemployee));
userrouter.get("/getattendance",employeemiddleware, asyncHandler(usercontroller.getattendance));
userrouter.get(
  "/getorginfo",
  employeemiddleware,
  asyncHandler(admincontroller.getOrgInfo)
);

module.exports = userrouter;
