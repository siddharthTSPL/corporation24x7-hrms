const express = require("express");
const router = express.Router();

const {
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  escalateTicket,
  deleteTicket,
  getTicketStats,
} = require("../controllers/ticket.controller");

const superAdminAuth = require("../middleware/auth/superadmin.middleware");
const { restrictPlanFeature } = require("../middleware/auth/planFeatureGate.middleware");

// TorchX Voice is a plan-gated feature: fully locked on the Basic plan,
// fully open on Advance/enterprise (or during the free trial). The
// SuperAdmin document IS the organisation record, so the SuperAdmin's own
// plan gates this too.
const ticketsPlanGate = restrictPlanFeature("tickets");

router.get("/stats", superAdminAuth, ticketsPlanGate, getTicketStats);
router.get("/all", superAdminAuth, ticketsPlanGate, getAllTickets);
router.get("/:id", superAdminAuth, ticketsPlanGate, getTicketById);
router.put("/:id/update", superAdminAuth, ticketsPlanGate, updateTicketStatus);
router.put("/:id/escalate", superAdminAuth, ticketsPlanGate, escalateTicket);
router.delete("/:id", superAdminAuth, ticketsPlanGate, deleteTicket);

module.exports = router;