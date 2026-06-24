const express = require("express");
const adminrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const checkPermission = require("../middleware/auth/Checkpermission.middleware");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

const {
  verifyAdmin,
  adminlogin,
  adminlogout,
  addmanager,
  addemployee,
  findallmanagers,
  getallemployee,
  editemployee,
  editmanager,
  promoteEmployeeToManager,
  promoteManagerToAdmin,
  promoteEmployeeToAdmin,
  demoteManagerToEmployee,
  demoteAdminToManager,
  demoteAdminToEmployee,
  changeManagerRole,
  getperticularemployee,
  getperticularemanager,
  deleteemployee,
  showallleaves,
  acceptLeave,
  rejectLeave,
  applyleave,
  getmyleavehistory,
  noofemployee,
  createannouncement,
  getallannouncement,
  updateAnnouncement,
  deleteAnnouncement,
  reviewtomanager,
  forgetpasswordloginotp,
  verifyAotp,
  resetAdminPassword,
  getme,
  editadminprofile,
  changepassword,
  getTodayCheckins,
  getOrgInfo,
  getAllPersonalDocumentsAdmin,
  getAllExpenseDocumentsAdmin,
  getDocumentDetailsAdmin,
  adminActionOnLeave,
  adminSubmitTicket,
  adminGetMyTickets,
  adminRateTicket,
  adminGetTicketDetail,
  findallmanagerswoadmin,
  setEmployeeWorkingStatus,
  setManagerWorkingStatus,
  getInactiveUsers,
  getActiveUserCount
} = require("../controllers/admin.controller");

const {
  uploadDocument,
  getDocuments,
  editDocument,
  deleteDocument,
} = require("../controllers/uploaddocument.controller");

adminrouter.get("/verify/:token", asyncHandler(verifyAdmin));
adminrouter.post("/login", asyncHandler(adminlogin));
adminrouter.post("/forgetpassword", asyncHandler(forgetpasswordloginotp));
adminrouter.post("/verifyotp", asyncHandler(verifyAotp));
adminrouter.post("/resetpassword", asyncHandler(resetAdminPassword));

adminrouter.post("/logout", adminauthmiddleware, asyncHandler(adminlogout));
adminrouter.get("/getme", adminauthmiddleware, asyncHandler(getme));
adminrouter.put(
  "/editadminprofile",
  adminauthmiddleware,
  asyncHandler(editadminprofile),
);
adminrouter.put(
  "/changepassword",
  adminauthmiddleware,
  asyncHandler(changepassword),
);
adminrouter.get("/getorginfo", adminauthmiddleware, asyncHandler(getOrgInfo));
adminrouter.get(
  "/noofemployee",
  adminauthmiddleware,
  asyncHandler(noofemployee),
);
adminrouter.get(
  "/gettodaycheckins",
  adminauthmiddleware,
  asyncHandler(getTodayCheckins),
);

adminrouter.post("/addmanager", adminauthmiddleware, asyncHandler(addmanager));
adminrouter.post(
  "/addemployee",
  adminauthmiddleware,
  asyncHandler(addemployee),
);
adminrouter.get(
  "/findallmanagers",
  adminauthmiddleware,
  asyncHandler(findallmanagers),
);
adminrouter.get(
  "/getallemployee",
  adminauthmiddleware,
  asyncHandler(getallemployee),
);
adminrouter.put(
  "/editemployee/:id",
  adminauthmiddleware,
  asyncHandler(editemployee),
);
adminrouter.put(
  "/editmanager/:id",
  adminauthmiddleware,
  asyncHandler(editmanager),
);
adminrouter.get(
  "/getperticularemployee/:id",
  adminauthmiddleware,
  asyncHandler(getperticularemployee),
);
adminrouter.get(
  "/getperticularemanager/:id",
  adminauthmiddleware,
  asyncHandler(getperticularemanager),
);
adminrouter.delete(
  "/deleteuser/:id",
  adminauthmiddleware,
  asyncHandler(deleteemployee),
);

adminrouter.post(
  "/employee/:id/promote/manager",
  adminauthmiddleware,
  asyncHandler(promoteEmployeeToManager),
);
adminrouter.post(
  "/employee/:id/promote/admin",
  adminauthmiddleware,
  asyncHandler(promoteEmployeeToAdmin),
);
adminrouter.post(
  "/manager/:id/promote/admin",
  adminauthmiddleware,
  asyncHandler(promoteManagerToAdmin),
);
adminrouter.post(
  "/manager/:id/demote/employee",
  adminauthmiddleware,
  asyncHandler(demoteManagerToEmployee),
);
adminrouter.post(
  "/admin/:id/demote/manager",
  adminauthmiddleware,
  asyncHandler(demoteAdminToManager),
);
adminrouter.post(
  "/admin/:id/demote/employee",
  adminauthmiddleware,
  asyncHandler(demoteAdminToEmployee),
);
adminrouter.put(
  "/manager/:id/role",
  adminauthmiddleware,
  asyncHandler(changeManagerRole),
);

adminrouter.get(
  "/showallleaves",
  adminauthmiddleware,
  asyncHandler(showallleaves),
);
adminrouter.post("/applyleave", adminauthmiddleware, asyncHandler(applyleave));
adminrouter.get(
  "/getmyleavehistory",
  adminauthmiddleware,
  asyncHandler(getmyleavehistory),
);
adminrouter.put(
  "/acceptleave/:id",
  adminauthmiddleware,
  asyncHandler(acceptLeave),
);
adminrouter.put(
  "/rejectleave/:id",
  adminauthmiddleware,
  asyncHandler(rejectLeave),
);
adminrouter.post(
  "/actionleave",
  adminauthmiddleware,
  asyncHandler(adminActionOnLeave),
);

adminrouter.post(
  "/reviewtomanager",
  adminauthmiddleware,
  asyncHandler(reviewtomanager),
);

adminrouter.get(
  "/getallannouncement",
  adminauthmiddleware,
  checkPermission("announcements.can_view_announcements"),
  asyncHandler(getallannouncement),
);
adminrouter.post(
  "/createannouncement",
  adminauthmiddleware,
  checkPermission("announcements.can_create_announcement"),
  asyncHandler(createannouncement),
);
adminrouter.put(
  "/updateannouncement/:id",
  adminauthmiddleware,
  checkPermission("announcements.can_edit_announcement"),
  asyncHandler(updateAnnouncement),
);
adminrouter.delete(
  "/deleteannouncement/:id",
  adminauthmiddleware,
  checkPermission("announcements.can_delete_announcement"),
  asyncHandler(deleteAnnouncement),
);

adminrouter.post(
  "/upload",
  adminauthmiddleware,
  checkPermission("documents.can_upload_documents"),
  upload.single("file"),
  uploadDocument,
);
adminrouter.put(
  "/documents/:id",
  adminauthmiddleware,
  checkPermission("documents.can_upload_documents"),
  upload.single("file"),
  editDocument,
);
adminrouter.delete(
  "/documents/:id",
  adminauthmiddleware,
  checkPermission("documents.can_upload_documents"),
  deleteDocument,
);
adminrouter.get(
  "/documents/personal",
  adminauthmiddleware,
  checkPermission("documents.can_view_all_documents"),
  asyncHandler(getAllPersonalDocumentsAdmin),
);
adminrouter.get(
  "/documents/expense",
  adminauthmiddleware,
  checkPermission("documents.can_view_all_documents"),
  asyncHandler(getAllExpenseDocumentsAdmin),
);
adminrouter.get(
  "/documents/:documentId",
  adminauthmiddleware,
  checkPermission("documents.can_view_all_documents"),
  asyncHandler(getDocumentDetailsAdmin),
);

adminrouter.post(
  "/submitTicket",
  adminauthmiddleware,
  checkPermission("tickets.can_raise_ticket"),
  asyncHandler(adminSubmitTicket),
);
adminrouter.get(
  "/getMyTickets",
  adminauthmiddleware,
  checkPermission("tickets.can_view_all_tickets"),
  asyncHandler(adminGetMyTickets),
);
adminrouter.get(
  "/getTicketDetail/:ticketNumber",
  adminauthmiddleware,
  checkPermission("tickets.can_view_all_tickets"),
  asyncHandler(adminGetTicketDetail),
);
adminrouter.post(
  "/rateTicket/:ticketNumber",
  adminauthmiddleware,
  checkPermission("tickets.can_rate_ticket"),
  asyncHandler(adminRateTicket),
);

adminrouter.get(
  "/documents",
  adminauthmiddleware,
  checkPermission("documents.can_upload_documents"),
  asyncHandler(getDocuments),
);

adminrouter.get(
  "/all-no-admin",
  adminauthmiddleware,
  asyncHandler(findallmanagerswoadmin)
);

adminrouter.put(
  "/employee/:id/working-status",
  adminauthmiddleware,
  asyncHandler(setEmployeeWorkingStatus)
);

adminrouter.put(
  "/manager/:id/working-status",
  adminauthmiddleware,
  asyncHandler(setManagerWorkingStatus)
);

adminrouter.get("/inactive-users", adminauthmiddleware, asyncHandler(getInactiveUsers));

adminrouter.get("/active-user-count", adminauthmiddleware, getActiveUserCount);

module.exports = adminrouter;
