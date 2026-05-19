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

const { superAdminAuth } = require("../middleware/auth/superadmin.middleware");
const { authemployee } = require("../middleware/auth/employee.middleware");
const { authmanager } = require("../middleware/auth/manager.middleware");
const { adminAuth } = require("../middleware/auth/admin.middleware");

router.post("/submit", authemployee, submitTicket);
router.post("/submit", authmanager, submitTicket); 
router.post("/submit", adminAuth, submitTicket); 

router.get("/my-tickets", authemployee, getMyTickets);
router.get("/my-tickets", authmanager, getMyTickets);
router.get("/my-tickets", adminAuth, getMyTickets);

router.post("/rate/:ticketNumber", authemployee, rateTicket);

router.get("/superadmin/stats", superAdminAuth, getTicketStats);

router.get("/superadmin/all", superAdminAuth, getAllTickets);

router.get("/superadmin/:id", superAdminAuth, getTicketById);

router.put("/superadmin/:id/update", superAdminAuth, updateTicketStatus);

router.put("/superadmin/:id/escalate", superAdminAuth, escalateTicket);

router.delete("/superadmin/:id", superAdminAuth, deleteTicket);

module.exports = router;
