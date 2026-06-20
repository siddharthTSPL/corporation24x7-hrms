const express = require("express");
const userrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const employeemiddleware = require("../middleware/auth/employee.middleware");
const checkPermission = require("../middleware/auth/Checkpermission.middleware");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

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
  firstLoginPasswordChange,
  showPasswordPage,
  sendPasswordSetupLink,
  getExpenseDocuments,
  getPersonalDocuments
} = require("../controllers/user.controller");

const {
  uploadDocument,
  getDocuments,
  editDocument,
  deleteDocument,
} = require("../controllers/uploaddocument.controller");

userrouter.get("/verify/:token", asyncHandler(verifyUserEmail));
userrouter.post("/login", asyncHandler(userlogin));
userrouter.post("/forgetpassword", asyncHandler(forgetpassword));
userrouter.post("/verifyotp", asyncHandler(verifyOtp));
userrouter.post("/resetpassword", asyncHandler(resetpassword));
userrouter.get("/change-password", showPasswordPage);
userrouter.post("/firstloginpasswordchange", asyncHandler(firstLoginPasswordChange));

userrouter.post("/logout", employeemiddleware, asyncHandler(userlogout));
userrouter.get("/getme", employeemiddleware, asyncHandler(getme));
userrouter.put("/updateprofile", employeemiddleware, asyncHandler(editprofile));
userrouter.put("/changepassword", employeemiddleware, asyncHandler(changepassword));
userrouter.get("/getOrgInfo", employeemiddleware, asyncHandler(getOrgInfo));
userrouter.post("/sendPasswordSetupLink", employeemiddleware, asyncHandler(sendPasswordSetupLink));

userrouter.post("/applyleave", employeemiddleware, asyncHandler(applyleave));
userrouter.put("/editleave/:id", employeemiddleware, asyncHandler(editleave));
userrouter.delete("/deleteleave/:id", employeemiddleware, asyncHandler(deleteleave));
userrouter.get("/getallleave", employeemiddleware, asyncHandler(getallleave));
userrouter.get("/getallleavehistory", employeemiddleware, asyncHandler(getallleavehistory));
userrouter.get("/getattendance", employeemiddleware, asyncHandler(getattendance));

userrouter.get("/showannouncements", employeemiddleware, checkPermission("announcements.can_view_announcements"), asyncHandler(showannouncements));
userrouter.get("/showannouncement/:id", employeemiddleware, checkPermission("announcements.can_view_announcements"), asyncHandler(showparticularannouncement));

userrouter.post("/upload", employeemiddleware, checkPermission("documents.can_upload_documents"), upload.single("file"), uploadDocument);
userrouter.get("/documents", employeemiddleware, checkPermission("documents.can_upload_documents"), getDocuments);
userrouter.put("/documents/:id", employeemiddleware, checkPermission("documents.can_upload_documents"), upload.single("file"), editDocument);
userrouter.delete("/documents/:id", employeemiddleware, checkPermission("documents.can_upload_documents"), deleteDocument);

userrouter.post("/submitTicket", employeemiddleware, checkPermission("tickets.can_raise_ticket"), asyncHandler(employeeSubmitTicket));
userrouter.get("/getMyTickets", employeemiddleware, checkPermission("tickets.can_raise_ticket"), asyncHandler(employeeGetMyTickets));
userrouter.post("/rateTicket", employeemiddleware, checkPermission("tickets.can_rate_ticket"), asyncHandler(employeeRateTicket));
userrouter.get("/getTicketDetail/:ticketNumber", employeemiddleware, checkPermission("tickets.can_raise_ticket"), asyncHandler(employeeGetTicketDetail));


userrouter.get("/getExpenseDocuments", employeemiddleware, checkPermission("documents.can_view_all_documents"), asyncHandler(getExpenseDocuments));
userrouter.get("/getPersonalDocuments", employeemiddleware, checkPermission("documents.can_view_all_documents"), asyncHandler(getPersonalDocuments));

module.exports = userrouter;