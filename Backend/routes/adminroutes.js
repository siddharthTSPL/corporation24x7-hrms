const express = require("express");
const adminrouter = express.Router();
const asyncHandler = require('../middleware/errorhandling/asynchandler');
const adminauthmiddleware=require('../middleware/auth/admin.middleware')
const {
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
  getme
} = require("../controllers/admin.controller");

adminrouter.post("/login", asyncHandler(adminlogin));
adminrouter.post("/logout", adminauthmiddleware,asyncHandler(adminlogout));
adminrouter.post("/addmanager",adminauthmiddleware,addmanager);
adminrouter.post("/addemployee",adminauthmiddleware, addemployee);
adminrouter.get("/getallemployee",adminauthmiddleware, getallemployee);
adminrouter.get("/getperticularemployee/:uid", adminauthmiddleware,getperticularemployee);
adminrouter.delete("/deleteuser/:uid", adminauthmiddleware,deleteemployee);
adminrouter.get("/showforwardedleaves",adminauthmiddleware,showforwardedleaves);
adminrouter.put("/acceptleave/:id",adminauthmiddleware,acceptleavebyadmin);
adminrouter.put("/rejectleave/:id",adminauthmiddleware,rejectleavebyadmin);
adminrouter.get("/noofemployee",adminauthmiddleware, noofemployee);
adminrouter.post("/createannouncement",adminauthmiddleware, createannouncement);
adminrouter.post("/reviewtomanager",adminauthmiddleware, reviewtomanager);
adminrouter.get("/getme",adminauthmiddleware, getme);

module.exports = adminrouter;
