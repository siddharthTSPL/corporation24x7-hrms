const express = require("express");
const managerrouter = express.Router();
const managercontroller = require("../controllers/manager.controller");
const managermiddleware = require("../middleware/auth/manager.middleware");
const asyncHandler = require("../middleware/errorhandling/asynchandler");

managerrouter.get(
  "/verify/:token",
  asyncHandler(managercontroller.verifyManagerEmail),
);
managerrouter.post("/login", asyncHandler(managercontroller.managerlogin));

managerrouter.post(
  "/logout",
  managermiddleware,
  asyncHandler(managercontroller.managerlogout),
);

managerrouter.get("/change-password", managercontroller.showPasswordPage);
managerrouter.post(
  "/firstloginpasswordchange",
  asyncHandler(managercontroller.managerFirstLoginPasswordChange),
);

managerrouter.put(
  "/updatepassword",
  managermiddleware,
  asyncHandler(managercontroller.managerUpdatePassword),
);

managerrouter.get(
  "/userunderme",
  managermiddleware,
  asyncHandler(managercontroller.userunderme),
);
managerrouter.get(
  "/viewallleaves",
  managermiddleware,
  asyncHandler(managercontroller.viewallleaves),
);

managerrouter.post(
  "/acceptleaverequest",
  managermiddleware,
  asyncHandler(managercontroller.acceptleaverequest),
);
managerrouter.post(
  "/rejectleaverequest",
  managermiddleware,
  asyncHandler(managercontroller.rejectleaverequest),
);

managerrouter.post(
  "/forwardtoadmin",
  managermiddleware,
  asyncHandler(managercontroller.forwardedtoadmin),
);

managerrouter.get(
  "/employeedocuments/:employeeId",
  managermiddleware,
  managercontroller.viewEmployeeDocuments,
);

managerrouter.get(
  "/showannouncements",
  managermiddleware,
  asyncHandler(managercontroller.showannouncements),
);

managerrouter.get(
  "/showannouncement/:id",
  managermiddleware,
  asyncHandler(managercontroller.particularannouncement),
);

managerrouter.post(
  "/forgetpassword",
  asyncHandler(managercontroller.forgetpasswordloginbyotp),
);
managerrouter.post(
  "/verifyMotp",
  asyncHandler(managercontroller.verifyManagerOtp),
);
managerrouter.get(
  "/showPasswordPageotp",
  managercontroller.showPasswordPageotp,
);
managerrouter.post(
  "/resetManagerPassword",
  asyncHandler(managercontroller.resetManagerPassword),
);
managerrouter.get(
  "/getmyleaves",
  managermiddleware,
  asyncHandler(managercontroller.getmyleaves),
);
managerrouter.post(
  "/applyleavem",
  managermiddleware,
  asyncHandler(managercontroller.applyleavem),
);
managerrouter.post(
  "/reviewtoemployee",
  managermiddleware,
  asyncHandler(managercontroller.reviewtoemployee),
);
managerrouter.get(
  "/getme",
  managermiddleware,
  asyncHandler(managercontroller.getme),
);
managerrouter.put(
  "/manager/edit-profile",
  managermiddleware,
  asyncHandler(managercontroller.editprofilemanager)
);

managerrouter.put(
  "/manager/change-password",
  managermiddleware,
  asyncHandler(managercontroller.changepassword)
);

module.exports = managerrouter;
