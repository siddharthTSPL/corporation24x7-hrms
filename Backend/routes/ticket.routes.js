const express = require("express");
const router = express.Router();

const {
  submitTicket,
  getMyTickets,
  rateTicket,
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  escalateTicket,
  deleteTicket,
  getTicketStats,
} = require("../controllers/ticket.controller");

const superAdminAuth = require("../middleware/auth/superadmin.middleware");
const authemployee   = require("../middleware/auth/employee.middleware");
const authmanager    = require("../middleware/auth/manager.middleware");
const adminAuth      = require("../middleware/auth/admin.middleware");


const anyOf = (...middlewares) => (req, res, next) => {
  let idx = 0;
  const run = () => {
    if (idx >= middlewares.length) return next(new Error("Not authenticated"));
    const mw = middlewares[idx++];
   
    mw(req, res, (err) => {
      if (!err) return next();   // succeeded → continue to controller
      run();                     // failed → try the next middleware
    });
  };
  run();
};

/* ── Shared (employee | manager | admin) ── */
router.post("/submit",               anyOf(authemployee, authmanager, adminAuth), submitTicket);
router.get("/my-tickets",            anyOf(authemployee, authmanager, adminAuth), getMyTickets);
router.post("/rate/:ticketNumber",   anyOf(authemployee, authmanager, adminAuth), rateTicket);

/* ── Super-admin only ── */
router.get("/superadmin/stats",            superAdminAuth, getTicketStats);
router.get("/superadmin/all",              superAdminAuth, getAllTickets);
router.get("/superadmin/:id",              superAdminAuth, getTicketById);
router.put("/superadmin/:id/update",       superAdminAuth, updateTicketStatus);
router.put("/superadmin/:id/escalate",     superAdminAuth, escalateTicket);
router.delete("/superadmin/:id",           superAdminAuth, deleteTicket);

module.exports = router;