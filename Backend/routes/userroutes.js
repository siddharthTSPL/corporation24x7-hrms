const express = require("express");
const userrouter = express.Router();

const usercontroller = require("../controllers/user.controller");

userrouter.get("/verify/:token", usercontroller.verifyUserEmail);

userrouter.post("/login", usercontroller.userlogin);

userrouter.get("/change-password", usercontroller.showUserPasswordPage);

userrouter.post(
  "/resetUserPassword",
  usercontroller.firstloginresetUserPassword,
);

userrouter.post("/logout", usercontroller.userlogout);
userrouter.post("/updatepassword", usercontroller.updatepassword);

userrouter.post("/applyleave", usercontroller.applyleave);
userrouter.get("/resultofleaverequest", usercontroller.resultofleaverequest);

userrouter.get("/showannouncements", usercontroller.showannouncements);
userrouter.post("/forgetpassword", usercontroller.forgetpasswordloginbyotp);
userrouter.post("/verifyuOtp", usercontroller.verifyOtp);
userrouter.post(
  "/resetPasswordafterforget",
  usercontroller.resetPasswordafterforget,
);
userrouter.get("/getallleave", usercontroller.getallleave);

module.exports = userrouter;
