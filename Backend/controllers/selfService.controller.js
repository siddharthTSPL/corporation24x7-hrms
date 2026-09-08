const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const LeaveBalance = require("../Models/leavebalance.model");
const Reimbursement = require("../Models/reimbursement.model");
const Document = require("../Models/document.model");
const Ticket = require("../Models/ticket.model");
const Attendance = require("../Models/attendance.model");

const statusBucket = (status = "") => {
  if (status.startsWith("pending") || status.startsWith("forwarded")) return "pending";
  if (status.startsWith("approved")) return "approved";
  if (status.startsWith("rejected")) return "rejected";
  return "other";
};

const OPEN_TICKET_STATUSES = ["open", "acknowledged", "under_review", "action_taken", "reopened"];

const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const lastNMonthKeys = (n) => {
  const keys = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
};

const buildLeaveSummary = async ({ Model, filterField, actorId, organisation_id }) => {
  const leaves = await Model.find({ [filterField]: actorId, organisation_id })
    .sort({ createdAt: -1 })
    .lean();

  const counts = { pending: 0, approved: 0, rejected: 0, total: leaves.length };
  leaves.forEach((l) => {
    const bucket = statusBucket(l.status);
    if (counts[bucket] !== undefined) counts[bucket] += 1;
  });

  const balanceDoc = await LeaveBalance.findOne({ employee: actorId, organisation_id }).lean();
  const balance = balanceDoc
    ? {
        EL: balanceDoc.EL?.entitled != null ? Math.max(balanceDoc.EL.entitled - (balanceDoc.EL.availed || 0), 0) : null,
        SL: balanceDoc.SL?.entitled != null ? Math.max(balanceDoc.SL.entitled - (balanceDoc.SL.availed || 0), 0) : null,
        ML: balanceDoc.ML ?? null,
        PL: balanceDoc.PL ?? null,
      }
    : null;

  return {
    balance,
    counts,
    recent: leaves.slice(0, 5).map((l) => ({
      _id: l._id,
      leaveType: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      days: l.days,
      status: l.status,
      reason: l.reason,
    })),
  };
};

const buildReimbursementSummary = async ({ organisation_id, submittedBy, submitterModel }) => {
  const query = { organisation_id, isDeleted: false };
  if (submittedBy) {
    query.submittedBy = submittedBy;
    query.submitterModel = submitterModel;
  }

  const claims = await Reimbursement.find(query).sort({ createdAt: -1 }).lean();

  const counts = { draft: 0, submitted: 0, approved: 0, rejected: 0, paid: 0, total: claims.length };
  let totalClaimed = 0;
  let totalApproved = 0;
  const monthly = {};
  lastNMonthKeys(6).forEach((k) => { monthly[k] = 0; });
  const byType = {};

  claims.forEach((c) => {
    if (counts[c.status] !== undefined) counts[c.status] += 1;
    totalClaimed += c.amountClaimed || 0;
    if (["approved", "paid"].includes(c.status)) totalApproved += c.amountClaimed || 0;
    const key = monthKey(c.expenseDate || c.createdAt);
    if (monthly[key] !== undefined) monthly[key] += c.amountClaimed || 0;
    byType[c.reimbursementType] = (byType[c.reimbursementType] || 0) + 1;
  });

  return {
    counts,
    totalClaimed,
    totalApproved,
    monthlyTrend: Object.entries(monthly).map(([month, amount]) => ({ month, amount })),
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    recent: claims.slice(0, 5).map((c) => ({
      _id: c._id,
      claimNumber: c.claimNumber,
      reimbursementType: c.reimbursementType,
      amountClaimed: c.amountClaimed,
      status: c.status,
      expenseDate: c.expenseDate,
    })),
  };
};

const buildDocumentSummary = async ({ organisation_id, uploader, uploaderModel }) => {
  const query = { organisation_id };
  if (uploader) {
    query.uploader = uploader;
    query.uploaderModel = uploaderModel;
  }

  const docs = await Document.find(query).sort({ uploadedAt: -1 }).lean();
  const byType = {};
  docs.forEach((d) => {
    byType[d.fileType] = (byType[d.fileType] || 0) + 1;
  });

  return {
    total: docs.length,
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    recent: docs.slice(0, 5).map((d) => ({
      _id: d._id,
      title: d.title,
      fileType: d.fileType,
      uploadedAt: d.uploadedAt,
    })),
  };
};

const buildTicketSummary = async ({ organisation_id, submittedBy, submitterModel }) => {
  const query = { organisation_id };
  if (submittedBy) {
    query.submittedBy = submittedBy;
    query.submitterModel = submitterModel;
  }

  const tickets = await Ticket.find(query).sort({ createdAt: -1 }).lean();
  const byStatus = {};
  let open = 0;
  tickets.forEach((t) => {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    if (OPEN_TICKET_STATUSES.includes(t.status)) open += 1;
  });

  return {
    counts: { open, resolved: tickets.length - open, total: tickets.length },
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    recent: tickets.slice(0, 5).map((t) => ({
      _id: t._id,
      ticketNumber: t.ticketNumber,
      type: t.type,
      status: t.status,
      createdAt: t.createdAt,
    })),
  };
};

const buildAttendanceToday = async ({ organisation_id, employee }) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const record = await Attendance.findOne({
    organisation_id,
    employee,
    date: { $gte: start, $lte: end },
  }).lean();

  return {
    checkedIn: !!record?.checkIn,
    checkedOut: !!record?.checkOut,
    checkIn: record?.checkIn || null,
    checkOut: record?.checkOut || null,
  };
};

const getSelfServiceSummary = async (req, res, next) => {
  try {
    if (req.superAdmin) {
      const organisation_id = req.superAdmin._id;

      const [employeeLeave, managerLeave, adminLeave] = await Promise.all([
        Leave.find({ organisation_id }).lean(),
        ManagerLeave.find({ organisation_id }).lean(),
        AdminLeave.find({ organisation_id }).lean(),
      ]);
      const allLeaves = [...employeeLeave, ...managerLeave, ...adminLeave];
      const leaveCounts = { pending: 0, approved: 0, rejected: 0, total: allLeaves.length };
      const leaveByType = {};
      allLeaves.forEach((l) => {
        const bucket = statusBucket(l.status);
        if (leaveCounts[bucket] !== undefined) leaveCounts[bucket] += 1;
        leaveByType[l.leaveType] = (leaveByType[l.leaveType] || 0) + 1;
      });

      const [reimbursement, documents, tickets] = await Promise.all([
        buildReimbursementSummary({ organisation_id }),
        buildDocumentSummary({ organisation_id }),
        buildTicketSummary({ organisation_id }),
      ]);

      return res.status(200).json({
        success: true,
        scope: "organisation",
        role: "superadmin",
        leave: {
          counts: leaveCounts,
          byType: Object.entries(leaveByType).map(([type, count]) => ({ type, count })),
        },
        reimbursement,
        documents,
        tickets,
        attendance: null,
      });
    }

    let role;
    let actor;
    let organisation_id;
    let leaveModel;
    let leaveField;
    let submitterModel;

    if (req.admin) {
      role = "admin";
      actor = req.admin;
      organisation_id = req.admin.organisation_id;
      leaveModel = AdminLeave;
      leaveField = "admin";
      submitterModel = "Admin";
    } else if (req.manager) {
      role = "manager";
      actor = req.manager;
      organisation_id = req.manager.organisation_id;
      leaveModel = ManagerLeave;
      leaveField = "manager";
      submitterModel = "Manager";
    } else if (req.employee) {
      role = "employee";
      actor = req.employee;
      organisation_id = req.employee.organisation_id;
      leaveModel = Leave;
      leaveField = "employee";
      submitterModel = "User";
    } else {
      return next(Object.assign(new Error("Unrecognised role."), { statusCode: 403 }));
    }

    const [leave, reimbursement, documents, tickets, attendance] = await Promise.all([
      buildLeaveSummary({ Model: leaveModel, filterField: leaveField, actorId: actor._id, organisation_id }),
      buildReimbursementSummary({ organisation_id, submittedBy: actor._id, submitterModel }),
      buildDocumentSummary({ organisation_id, uploader: actor._id, uploaderModel: submitterModel }),
      buildTicketSummary({ organisation_id, submittedBy: actor._id, submitterModel }),
      buildAttendanceToday({ organisation_id, employee: actor._id }),
    ]);

    res.status(200).json({
      success: true,
      scope: "personal",
      role,
      leave,
      reimbursement,
      documents,
      tickets,
      attendance,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSelfServiceSummary };