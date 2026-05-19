const express = require("express");
const router  = express.Router();

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

const { superAdminAuth } = require("../middleware/auth/superadmin.middleware");
const { authemployee }       = require("../middleware/auth/employee.middleware");
const { authmanager }    = require("../middleware/auth/manager.middleware");
const { adminAuth }      = require("../middleware/auth/admin.middleware");


router.post("/submit",     protectUser,    submitTicket);
router.post("/submit",     protectManager, submitTicket);   // fallback for managers
router.post("/submit",     protectAdmin,   submitTicket);   // fallback for admins


router.get("/my-tickets",  protectUser,    getMyTickets);
router.get("/my-tickets",  protectManager, getMyTickets);
router.get("/my-tickets",  protectAdmin,   getMyTickets);


router.post("/rate/:ticketNumber", protectUser, rateTicket);




router.get( "/superadmin/stats",              protectSuperAdmin, getTicketStats);


router.get( "/superadmin/all",                protectSuperAdmin, getAllTickets);


router.get( "/superadmin/:id",                protectSuperAdmin, getTicketById);


router.put( "/superadmin/:id/update",         protectSuperAdmin, updateTicketStatus);


router.put( "/superadmin/:id/escalate",       protectSuperAdmin, escalateTicket);


router.delete("/superadmin/:id",              protectSuperAdmin, deleteTicket);

module.exports = router;
