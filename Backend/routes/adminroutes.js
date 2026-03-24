const express = require("express");
const adminrouter = express.Router();
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
  reviewtomanager
} = require("../controllers/admin.controller");

adminrouter.post("/login", adminlogin);
adminrouter.post("/logout", adminauthmiddleware, adminlogout);
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

module.exports = adminrouter;
