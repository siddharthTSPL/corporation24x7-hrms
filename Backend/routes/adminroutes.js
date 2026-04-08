const express = require("express");
const adminrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const {
  registerAdmin,
  verifyAdmin,
  findallmanagers,
  adminlogin,
  adminlogout,
  addmanager,
  addemployee,
  getallemployee,
  editemployee,
  getperticularemployee,
  getperticularemanager,
  deleteemployee,
  acceptleavebyadmin,
  rejectleavebyadmin,
  showallleaves,
  noofemployee,
  createannouncement,
  getallannouncement,
  updateAnnouncement,
  deleteAnnouncement,
  reviewtomanager,
  forgetpasswordloginotp,
  verifyAotp,
  resetAdminPassword,
  showUserPasswordPage,
  getme,
  editadminprofile,
  changepassword
} = require("../controllers/admin.controller");

adminrouter.post("/register", asyncHandler(registerAdmin));
adminrouter.get("/verify/:token", asyncHandler(verifyAdmin));

adminrouter.get("/findallmanagers", adminauthmiddleware, asyncHandler(findallmanagers));

adminrouter.post("/login", asyncHandler(adminlogin));
adminrouter.post("/logout", adminauthmiddleware, asyncHandler(adminlogout));
adminrouter.post("/addmanager", adminauthmiddleware, asyncHandler(addmanager));
adminrouter.post(
  "/addemployee",
  adminauthmiddleware,
  asyncHandler(addemployee),
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
adminrouter.get(
  "/showallleaves",
  adminauthmiddleware,
  asyncHandler(showallleaves),
);

adminrouter.put(
  "/acceptleave/:id",
  adminauthmiddleware,
  asyncHandler(acceptleavebyadmin),
);
adminrouter.put(
  "/rejectleave/:id",
  adminauthmiddleware,
  asyncHandler(rejectleavebyadmin),
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
adminrouter.post(
  "/forgetpassword",
  asyncHandler(forgetpasswordloginotp),
);
adminrouter.post("/verifyotp", asyncHandler(verifyAotp));
adminrouter.get("/change-password", asyncHandler(showUserPasswordPage));
adminrouter.post(
  "/resetAdminPassword",
  asyncHandler(resetAdminPassword),
);
adminrouter.get("/getme", adminauthmiddleware, asyncHandler(getme));
adminrouter.put("/editadminprofile", adminauthmiddleware, asyncHandler(editadminprofile));
adminrouter.put("/changepassword", adminauthmiddleware, asyncHandler(changepassword));

module.exports = adminrouter;
