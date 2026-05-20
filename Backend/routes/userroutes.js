const express = require("express");
const userrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const employeemiddleware = require("../middleware/auth/employee.middleware");

const {
  verifyUserEmail,
  userlogin,
  userlogout,
  changepassword,
  forgetpassword,
  verifyOtp,
  resetpassword,
  applyleave,
  editleave,
  deleteleave,
  getallleave,
  getallleavehistory,
  showannouncements,
  showparticularannouncement,
  getme,
  editprofile,
  getattendance,
  employeeSubmitTicket,
  employeeGetMyTickets,
  employeeRateTicket,
  employeeGetTicketDetail,
  getOrgInfo,
} = require("../controllers/user.controller");

userrouter.get("/verify/:token", asyncHandler(verifyUserEmail));
userrouter.post("/login", asyncHandler(userlogin));
userrouter.post("/forgetpassword", asyncHandler(forgetpassword));
userrouter.post("/verifyotp", asyncHandler(verifyOtp));
userrouter.post("/resetpassword", asyncHandler(resetpassword));

userrouter.post("/logout", employeemiddleware, asyncHandler(userlogout));
userrouter.get("/getme", employeemiddleware, asyncHandler(getme));
userrouter.put("/updateprofile", employeemiddleware, asyncHandler(editprofile));
userrouter.put(
  "/changepassword",
  employeemiddleware,
  asyncHandler(changepassword),
);

userrouter.post("/applyleave", employeemiddleware, asyncHandler(applyleave));
userrouter.put("/editleave/:id", employeemiddleware, asyncHandler(editleave));
userrouter.delete(
  "/deleteleave/:id",
  employeemiddleware,
  asyncHandler(deleteleave),
);
userrouter.get("/getallleave", employeemiddleware, asyncHandler(getallleave));
userrouter.get(
  "/getallleavehistory",
  employeemiddleware,
  asyncHandler(getallleavehistory),
);

userrouter.get(
  "/showannouncements",
  employeemiddleware,
  asyncHandler(showannouncements),
);
userrouter.get(
  "/showannouncement/:id",
  employeemiddleware,
  asyncHandler(showparticularannouncement),
);

userrouter.get(
  "/getattendance",
  employeemiddleware,
  asyncHandler(getattendance),
);

userrouter.post(
  "/submitTicket",
  employeemiddleware,
  asyncHandler(employeeSubmitTicket),
);
userrouter.get(
  "/getMyTickets",
  employeemiddleware,
  asyncHandler(employeeGetMyTickets),
);
userrouter.post(
  "/rateTicket",
  employeemiddleware,
  asyncHandler(employeeRateTicket),
);

userrouter.get(
  "/getTicketDetail/:ticketNumber",
  employeemiddleware,
  asyncHandler(employeeGetTicketDetail),
);

userrouter.get("/getOrgInfo", employeemiddleware, asyncHandler(getOrgInfo));

module.exports = userrouter;
