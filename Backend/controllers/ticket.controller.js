const Ticket = require("../Models/ticket.model");
const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");
const { sendEmail } = require("../utils/nodemailer.utils");
require("dotenv").config();

const sendTicketEmail = async ({ to, ticketNumber, type, status, note }) => {
  if (!to) return;
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const statusLabel = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  await sendEmail({
    to,
    subject: `[${ticketNumber}] Your ${typeLabel} ticket status: ${statusLabel}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F9F8F2;font-family:'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;"><tr><td align="center"><table width="600" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);"><tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;"><h2 style="margin:0;">Ticket Update — ${ticketNumber}</h2><p style="margin:8px 0 0;opacity:.9;">${typeLabel} Ticket</p></td></tr><tr><td style="padding:36px;"><div style="background:#F9F4F7;border-left:4px solid #CD166E;border-radius:4px;padding:14px 18px;margin-bottom:24px;"><p style="margin:0;font-size:13px;color:#555;"><strong>Status:</strong> ${statusLabel}</p></div>${note ? `<p style="font-size:14px;color:#444;line-height:1.7;">${note}</p>` : ""}<p style="font-size:13px;color:#888;margin-top:24px;">If you have questions, please log in to the HRMS portal to view your ticket details.</p></td></tr><tr><td style="background:#F9F8F2;padding:20px;text-align:center;font-size:12px;color:#888;">© ${new Date().getFullYear()} TechTorch HRMS Platform — This email is confidential.</td></tr></table></td></tr></table></body></html>`,
  });
};

const getAllTickets = async (req, res, next) => {
  try {
    const {
      type, status, severity, category,
      isOverdue, isEscalated, search,
      page = 1, limit = 20,
      sortBy = "createdAt", sortOrder = "desc",
      dateFrom, dateTo,
    } = req.query;

    const filter = { isDeleted: false };
    if (type)     filter.type     = type;
    if (status)   filter.status   = status;
    if (severity) filter.severity = severity;
    if (category) filter.category = category;
    if (isOverdue === "true")   filter.isOverdue   = true;
    if (isEscalated === "true") filter.isEscalated = true;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(dateTo);
    }
    if (search) {
      filter.$or = [
        { ticketNumber: { $regex: search, $options: "i" } },
        { title:        { $regex: search, $options: "i" } },
        { againstName:  { $regex: search, $options: "i" } },
      ];
    }

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [tickets, total, stats] = await Promise.all([
      Ticket.find(filter)
        .populate("submittedBy", "f_name l_name work_email department")
        .populate("against",     "f_name l_name work_email department")
        .select("-internalNotes -timeline")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Ticket.countDocuments(filter),
      Ticket.getDashboardStats(),
    ]);

    res.json({
      success: true,
      tickets,
      pagination: {
        total,
        page:  Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit),
      },
      stats,
    });
  } catch (err) {
    next(err);
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findOne({ _id: id, isDeleted: false })
      .populate("submittedBy", "f_name l_name work_email department designation")
      .populate("against",     "f_name l_name work_email department designation")
      .lean();

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (ticket.status === "open") {
      await Ticket.findByIdAndUpdate(id, {
        acknowledgedAt: new Date(),
        firstResponseHours: Math.round((Date.now() - new Date(ticket.createdAt)) / 3600000),
        $push: {
          timeline: {
            action:  "acknowledgement_sent",
            note:    "Ticket viewed and acknowledged by Super Admin.",
            byModel: "SuperAdmin",
            byName:  `${req.superAdmin.f_name} ${req.superAdmin.l_name}`,
            by:      req.superAdmin._id,
          },
          statusHistory: {
            status:    "acknowledged",
            changedAt: new Date(),
            changedBy: req.superAdmin._id,
            note:      "Auto-acknowledged on first view",
          },
        },
        $set: { status: "acknowledged" },
      });
      ticket.status = "acknowledged";
    }

    res.json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note, internalNote, resolutionSummary, rejectionReason, priority } = req.body;

    const ticket = await Ticket.findOne({ _id: id, isDeleted: false });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const prevStatus = ticket.status;
    const byName = `${req.superAdmin.f_name} ${req.superAdmin.l_name}`;

    const terminalStatuses = ["resolved", "closed", "rejected"];
    if (terminalStatuses.includes(prevStatus) && status && status !== "reopened")
      return res.status(400).json({ message: `Cannot change status of a ${prevStatus} ticket. Reopen it first.` });

    if (status && status !== prevStatus) {
      ticket.status = status;
      ticket.statusHistory.push({ status, changedAt: new Date(), changedBy: req.superAdmin._id, note: note || "" });

      if (status === "resolved" || status === "closed") {
        ticket.resolvedAt = new Date();
        ticket.resolutionTimeHours = Math.round((Date.now() - new Date(ticket.createdAt)) / 3600000);
        if (resolutionSummary) ticket.resolutionSummary = resolutionSummary;
      }
      if (status === "rejected" && rejectionReason) ticket.rejectionReason = rejectionReason;
      if (status === "reopened") {
        ticket.reopenCount = (ticket.reopenCount || 0) + 1;
        ticket.resolvedAt  = undefined;
      }

      ticket.timeline.push({
        action: "status_changed", fromStatus: prevStatus, toStatus: status,
        note: note || `Status changed to ${status}.`,
        by: req.superAdmin._id, byModel: "SuperAdmin", byName,
      });
    }

    if (note && status === prevStatus) {
      ticket.superAdminNote = note;
      ticket.timeline.push({ action: "note_added", note, by: req.superAdmin._id, byModel: "SuperAdmin", byName });
    }

    if (internalNote) {
      ticket.internalNotes.push({ note: internalNote, addedBy: req.superAdmin._id, byName, addedAt: new Date() });
      ticket.timeline.push({ action: "internal_note_added", internalNote, by: req.superAdmin._id, byModel: "SuperAdmin", byName });
    }

    if (priority && priority !== ticket.severity) {
      const oldSev = ticket.severity;
      ticket.severity = priority;
      ticket.timeline.push({ action: "priority_changed", note: `Priority changed from ${oldSev} to ${priority}.`, by: req.superAdmin._id, byModel: "SuperAdmin", byName });
    }

    await ticket.save();

    if (!ticket.isAnonymous && ticket.submittedBy && status && status !== prevStatus) {
      const modelMap = { User: Usermodel, Manager: Managermodel, Admin: AdminModel };
      const Model = modelMap[ticket.submitterModel];
      if (Model) {
        const submitter = await Model.findById(ticket.submittedBy).select("work_email").lean();
        if (submitter?.work_email) {
          await sendTicketEmail({ to: submitter.work_email, ticketNumber: ticket.ticketNumber, type: ticket.type, status, note });
        }
      }
    }

    res.json({ success: true, message: "Ticket updated successfully.", ticket });
  } catch (err) {
    next(err);
  }
};

const escalateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const ticket = await Ticket.findOne({ _id: id, isDeleted: false });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.isEscalated     = true;
    ticket.escalationCount = (ticket.escalationCount || 0) + 1;
    ticket.severity        = ticket.severity === "high" ? "critical" : ticket.severity === "medium" ? "high" : ticket.severity;

    ticket.timeline.push({
      action: "escalated",
      note:   reason || "Ticket escalated by Super Admin.",
      by:     req.superAdmin._id,
      byModel: "SuperAdmin",
      byName:  `${req.superAdmin.f_name} ${req.superAdmin.l_name}`,
    });

    await ticket.save();
    res.json({ success: true, message: "Ticket escalated.", ticket });
  } catch (err) {
    next(err);
  }
};

const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.isDeleted = true;
    ticket.deletedAt = new Date();
    ticket.deletedBy = req.superAdmin._id;
    await ticket.save();

    res.json({ success: true, message: "Ticket archived successfully." });
  } catch (err) {
    next(err);
  }
};

const getTicketStats = async (req, res, next) => {
  try {
    const stats = await Ticket.getDashboardStats();
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};

const markOverdueTickets = async () => {
  const result = await Ticket.updateMany(
    { isDeleted: false, isOverdue: false, slaDeadline: { $lt: new Date() }, status: { $nin: ["resolved", "closed", "rejected"] } },
    { $set: { isOverdue: true }, $push: { timeline: { action: "escalated", note: "Ticket automatically flagged as overdue (SLA breached).", byModel: "System", byName: "System" } } }
  );
  console.log(`[TICKET CRON] Marked ${result.modifiedCount} tickets as overdue.`);
};

module.exports = {
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  escalateTicket,
  deleteTicket,
  getTicketStats,
  markOverdueTickets,
};