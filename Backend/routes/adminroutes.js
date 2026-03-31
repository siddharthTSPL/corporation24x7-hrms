const express = require("express");
const adminrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminauthmiddleware = require("../middleware/auth/admin.middleware");
const {
  registerAdmin,
  verifyAdmin,
  adminlogin,
  adminlogout,
  addmanager,
  addemployee,
  getallemployee,
  getperticularemployee,
  deleteemployee,
  acceptleavebyadmin,
  rejectleavebyadmin,
  showforwardedleaves,
  noofemployee,
  createannouncement,
  reviewtomanager,
  getme,
} = require("../controllers/admin.controller");

adminrouter.post("/register", asyncHandler(registerAdmin));
adminrouter.get("/verify/:token", asyncHandler(verifyAdmin));

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
adminrouter.get(
  "/getperticularemployee/:uid",
  adminauthmiddleware,
  asyncHandler(getperticularemployee),
);
adminrouter.delete(
  "/deleteuser/:uid",
  adminauthmiddleware,
  asyncHandler(deleteemployee),
);
adminrouter.get(
  "/showforwardedleaves",
  adminauthmiddleware,
  asyncHandler(showforwardedleaves),
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
adminrouter.post(
  "/reviewtomanager",
  adminauthmiddleware,
  asyncHandler(reviewtomanager),
);
adminrouter.get("/getme", adminauthmiddleware, asyncHandler(getme));

module.exports = adminrouter;
