const express = require("express");
const adminrouter = express.Router();
const {
  adminlogin,
  adminlogout,
  addmanager,
  adduser,
  getallusers,
  getperticularuser,
  deleteemployee,
  acceptleavebyadmin,
  rejectleavebyadmin,
  showforwardedleaves,
  noofemployee,
  createannouncement,
  reviewtomanager
} = require("../controllers/admin.controller");

adminrouter.post("/login", adminlogin);
adminrouter.post("/logout", adminlogout);
adminrouter.post("/addmanager", addmanager);
adminrouter.post("/adduser", adduser);
adminrouter.get("/getallusers", getallusers);
adminrouter.get("/getperticularuser/:uid", getperticularuser);
adminrouter.delete("/deleteuser/:uid", deleteemployee);
adminrouter.get("/showforwardedleaves", showforwardedleaves);
adminrouter.put("/acceptleave/:id", acceptleavebyadmin);
adminrouter.put("/rejectleave/:id", rejectleavebyadmin);
adminrouter.get("/noofemployee", noofemployee);
adminrouter.post("/createannouncement", createannouncement);
adminrouter.post("/reviewtomanager", reviewtomanager);

module.exports = adminrouter;
