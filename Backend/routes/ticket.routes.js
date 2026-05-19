const express = require("express");
const router = express.Router();

const {
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  escalateTicket,
  deleteTicket,
  getTicketStats,
} = require("../controllers/superadmin.ticket.controller");

const superAdminAuth = require("../middleware/auth/superadmin.middleware");

router.get("/stats", superAdminAuth, getTicketStats);
router.get("/all", superAdminAuth, getAllTickets);
router.get("/:id", superAdminAuth, getTicketById);
router.put("/:id/update", superAdminAuth, updateTicketStatus);
router.put("/:id/escalate", superAdminAuth, escalateTicket);
router.delete("/:id", superAdminAuth, deleteTicket);

module.exports = router;
