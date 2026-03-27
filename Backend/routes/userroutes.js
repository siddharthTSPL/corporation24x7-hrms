const express = require("express");
const userrouter = express.Router();
const usercontroller = require("../controllers/user.controller");
const employeemiddleware = require("../middleware/auth/employee.middleware");
const asyncHandler = require("../middleware/errorhandling/asynchandler");

userrouter.get("/verify/:token", asyncHandler(usercontroller.verifyUserEmail));

userrouter.post("/login", usercontroller.userlogin);

userrouter.get("/change-password", usercontroller.showUserPasswordPage);

userrouter.post(
  "/resetUserPassword",
  usercontroller.firstloginresetUserPassword,
);

userrouter.post("/logout",employeemiddleware,employeemiddleware,usercontroller.userlogout);


userrouter.post("/updatepassword",employeemiddleware,usercontroller.updatepassword);

userrouter.post("/applyleave", employeemiddleware,usercontroller.applyleave);


userrouter.get("/resultofleaverequest/:id",employeemiddleware,usercontroller.resultofleaverequest);
userrouter.get("/getallleave",employeemiddleware, usercontroller.getallleave);

userrouter.get("/showannouncements", employeemiddleware,usercontroller.showannouncements);



userrouter.post("/forgetpassword", usercontroller.forgetpasswordloginbyotp);
userrouter.post("/verifyotp", usercontroller.verifyOtp);
userrouter.post(
  "/resetPasswordafterforget",
  usercontroller.resetPasswordafterforget,
);

userrouter.get("/getme",employeemiddleware, usercontroller.getme);
// done

module.exports = userrouter;
