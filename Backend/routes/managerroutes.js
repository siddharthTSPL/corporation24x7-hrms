const express = require("express");
const managerrouter = express.Router();
const managercontroller = require("../controllers/manager.controller");
const managermiddleware = require("../middleware/auth/manager.middleware");
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const checkPermission = require("../middleware/auth/Checkpermission.middleware");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });
const { sendSupportRequest } = require("../controllers/support.controller");
const supportUpload = require("../middleware/upload/supportAttachments.middleware");

const {
  uploadDocument,
  getDocuments,
  editDocument,
  deleteDocument,
} = require("../controllers/uploaddocument.controller");

managerrouter.get("/verify/:token", asyncHandler(managercontroller.verifyManagerEmail));
managerrouter.post("/login", asyncHandler(managercontroller.managerlogin));
managerrouter.get("/change-password", managercontroller.showPasswordPage);
managerrouter.post("/firstloginpasswordchange", asyncHandler(managercontroller.managerFirstLoginPasswordChange));
managerrouter.post("/forgetpassword", asyncHandler(managercontroller.forgetpasswordloginbyotp));
managerrouter.post("/verifyotp", asyncHandler(managercontroller.verifyManagerOtp));
managerrouter.get("/showPasswordPageotp", managercontroller.showPasswordPageotp);
managerrouter.post("/resetManagerPassword", asyncHandler(managercontroller.resetManagerPassword));

managerrouter.post("/logout", managermiddleware, asyncHandler(managercontroller.managerlogout));
managerrouter.get("/getme", managermiddleware, asyncHandler(managercontroller.getme));
managerrouter.put("/manager/edit-profile", managermiddleware, asyncHandler(managercontroller.editprofilemanager));
managerrouter.put("/manager/change-password", managermiddleware, asyncHandler(managercontroller.changepassword));
managerrouter.put("/updatepassword", managermiddleware, asyncHandler(managercontroller.managerUpdatePassword));
managerrouter.get("/getOrgInfo", managermiddleware, asyncHandler(managercontroller.getOrgInfoForManager));
managerrouter.get("/getattendance", managermiddleware, asyncHandler(managercontroller.getattendance));

managerrouter.get("/userunderme", managermiddleware, asyncHandler(managercontroller.userunderme));

managerrouter.post("/applyleavem", managermiddleware, asyncHandler(managercontroller.applyleavem));
managerrouter.put("/editleavem/:id", managermiddleware, asyncHandler(managercontroller.editleavem));
managerrouter.delete("/deleteleavem/:id", managermiddleware, asyncHandler(managercontroller.deleteleavem));
managerrouter.get("/getmyleaves", managermiddleware, asyncHandler(managercontroller.getmyleaves));
managerrouter.get("/myleavehistory", managermiddleware, asyncHandler(managercontroller.getmyleavehistory));
managerrouter.post("/acceptleaverequest", managermiddleware, asyncHandler(managercontroller.acceptleaverequest));
managerrouter.post("/rejectleaverequest", managermiddleware, asyncHandler(managercontroller.rejectleaverequest));
managerrouter.post("/forwardtoreportingmanager", managermiddleware, asyncHandler(managercontroller.forwardedtoreportingmanager));
managerrouter.get("/getforwardedleaves", managermiddleware, asyncHandler(managercontroller.getforwardedleaves));
managerrouter.post("/acceptforwardedleave", managermiddleware, asyncHandler(managercontroller.acceptforwardedleave));
managerrouter.post("/rejectforwardedleave", managermiddleware, asyncHandler(managercontroller.rejectforwardedleave));
managerrouter.post("/forwardforwardedleavetoadmin", managermiddleware, asyncHandler(managercontroller.forwardLeaveUpChain));

managerrouter.post("/reviewtoemployee", managermiddleware, asyncHandler(managercontroller.reviewtoemployee));

managerrouter.get("/showannouncements", managermiddleware, checkPermission("announcements.can_view_announcements"), asyncHandler(managercontroller.showannouncements));
managerrouter.get("/showannouncement/:id", managermiddleware, checkPermission("announcements.can_view_announcements"), asyncHandler(managercontroller.particularannouncement));

managerrouter.post("/upload", managermiddleware, checkPermission("documents.can_upload_documents"), upload.single("file"), uploadDocument);
managerrouter.get("/documents", managermiddleware, checkPermission("documents.can_upload_documents"), asyncHandler(getDocuments));
managerrouter.put("/documents/:id", managermiddleware, checkPermission("documents.can_upload_documents"), upload.single("file"), editDocument);
managerrouter.delete("/documents/:id", managermiddleware, checkPermission("documents.can_upload_documents"), deleteDocument);
managerrouter.get("/getAllExpenseDocuments", managermiddleware, checkPermission("documents.can_view_all_documents"), asyncHandler(managercontroller.getAllExpenseDocuments));
managerrouter.get("/getAllPersonalDocuments", managermiddleware, checkPermission("documents.can_view_all_documents"), asyncHandler(managercontroller.getAllPersonalDocuments));
managerrouter.get("/getDocumentDetails/:documentId", managermiddleware, checkPermission("documents.can_view_all_documents"), asyncHandler(managercontroller.getDocumentDetails));

managerrouter.post("/submit-ticket", managermiddleware, checkPermission("tickets.can_raise_ticket"), asyncHandler(managercontroller.managerSubmitTicket));
managerrouter.get("/my-tickets", managermiddleware, checkPermission("tickets.can_raise_ticket"), asyncHandler(managercontroller.managerGetMyTickets));
managerrouter.post("/rate-ticket/:ticketNumber", managermiddleware, checkPermission("tickets.can_rate_ticket"), asyncHandler(managercontroller.managerRateTicket));
managerrouter.get("/getTicketDetail/:ticketNumber", managermiddleware, checkPermission("tickets.can_raise_ticket"), asyncHandler(managercontroller.managerGetTicketDetail));
managerrouter.get(
  "/viewallleaves",
  managermiddleware,
  asyncHandler(managercontroller.viewallleaves)
);

// Help & Support form — no permission gate, every logged-in manager can reach support.
managerrouter.post("/contact-support", managermiddleware, supportUpload.array("attachments", 5), asyncHandler(sendSupportRequest));

// Assets assigned to the logged-in manager (Dashboard / Settings "My Assets" widget)
const { getMyAssets } = require("../controllers/asset.controller");
managerrouter.get("/my-assets", managermiddleware, asyncHandler(getMyAssets));

module.exports = managerrouter;