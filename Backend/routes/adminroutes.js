const express = require("express");
const adminrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const {
  verifyAdmin,
  adminlogin,
  adminlogout,
  addmanager,
  addemployee,
  findallmanagers,
  getallemployee,
  editemployee,
  getperticularemployee,
  getperticularemanager,
  deleteemployee,
  showallleaves,
  applyleave,
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
} = require("../controllers/admin.controller");

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
  "/editemployee/:uid",
  adminauthmiddleware,
  asyncHandler(editemployee),
);
adminrouter.get(
  "/getperticularemployee/:uid",
  adminauthmiddleware,
  asyncHandler(getperticularemployee),
);
adminrouter.get(
  "/getperticularemanager/:uid",
  adminauthmiddleware,
  asyncHandler(getperticularemanager),
);
adminrouter.delete(
  "/deleteuser/:uid",
  adminauthmiddleware,
  asyncHandler(deleteemployee),
);

// Leave
adminrouter.get(
  "/showallleaves",
  adminauthmiddleware,
  asyncHandler(showallleaves),
);
adminrouter.post("/applyleave", adminauthmiddleware, asyncHandler(applyleave));
// Admin can approve / reject any pending or forwarded leave (acts as reporting manager)
adminrouter.post(
  "/actionleave",
  adminauthmiddleware,
  asyncHandler(adminActionOnLeave),
);

adminrouter.get(
  "/noofemployee",
  adminauthmiddleware,
  asyncHandler(noofemployee),
);

adminrouter.post(
  "/createannouncement",
  adminauthmiddleware,
  asyncHandler(createannouncement),
);
adminrouter.get(
  "/getallannouncement",
  adminauthmiddleware,
  asyncHandler(getallannouncement),
);
adminrouter.put(
  "/updateannouncement/:id",
  adminauthmiddleware,
  asyncHandler(updateAnnouncement),
);
adminrouter.delete(
  "/deleteannouncement/:id",
  adminauthmiddleware,
  asyncHandler(deleteAnnouncement),
);

adminrouter.post(
  "/reviewtomanager",
  adminauthmiddleware,
  asyncHandler(reviewtomanager),
);
adminrouter.get(
  "/gettodaycheckins",
  adminauthmiddleware,
  asyncHandler(getTodayCheckins),
);

adminrouter.get(
  "/documents/personal",
  adminauthmiddleware,
  asyncHandler(getAllPersonalDocumentsAdmin),
);
adminrouter.get(
  "/documents/expense",
  adminauthmiddleware,
  asyncHandler(getAllExpenseDocumentsAdmin),
);
adminrouter.get(
  "/documents/:documentId",
  adminauthmiddleware,
  asyncHandler(getDocumentDetailsAdmin),
);

module.exports = adminrouter;
