const Leave = require("../Models/leave.model");
const ManagerLeave = require("../Models/maleave.model");
const AdminLeave = require("../Models/adleave.model");
const LeaveBalance = require("../Models/leavebalance.model");
const Reimbursement = require("../Models/reimbursement.model");
const Document = require("../Models/document.model");
const Ticket = require("../Models/ticket.model");
const Attendance = require("../Models/attendance.model");
const AttendanceSummary = require("../Models/attendancesummary.model");
const AssetModel = require("../Models/asset.model");

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

const lastNMonthMeta = (n) => {
  const meta = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meta.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, month: d.getMonth() + 1, year: d.getFullYear() });
  }
  return meta;
};

const round1 = (n) => Math.round(n * 10) / 10;

const buildLeaveSummary = async ({ Model, filterField, actorId, organisation_id }) => {
  const leaves = await Model.find({ [filterField]: actorId, organisation_id }).sort({ createdAt: -1 }).lean();

  const counts = { pending: 0, approved: 0, rejected: 0, total: leaves.length };
  const byType = {};
  const monthlyDays = {};
  lastNMonthKeys(6).forEach((k) => { monthlyDays[k] = 0; });

  leaves.forEach((l) => {
    const bucket = statusBucket(l.status);
    if (counts[bucket] !== undefined) counts[bucket] += 1;
    byType[l.leaveType] = (byType[l.leaveType] || 0) + 1;
    const key = monthKey(l.startDate);
    if (monthlyDays[key] !== undefined) monthlyDays[key] += l.days || 0;
  });

  const balanceDoc = await LeaveBalance.findOne({ employee: actorId, organisation_id }).lean();
  const balance = balanceDoc
    ? {
        EL: { entitled: balanceDoc.EL?.entitled ?? 0, availed: balanceDoc.EL?.availed ?? 0, remaining: Math.max((balanceDoc.EL?.entitled || 0) - (balanceDoc.EL?.availed || 0), 0) },
        SL: { entitled: balanceDoc.SL?.entitled ?? 0, availed: balanceDoc.SL?.availed ?? 0, remaining: Math.max((balanceDoc.SL?.entitled || 0) - (balanceDoc.SL?.availed || 0), 0) },
        ML: balanceDoc.ML ?? 0,
        PL: balanceDoc.PL ?? 0,
        lwp: balanceDoc.lwp ?? 0,
      }
    : null;

  return {
    balance,
    counts,
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    monthlyTrend: Object.entries(monthlyDays).map(([month, days]) => ({ month, days: round1(days) })),
    recent: leaves.slice(0, 6).map((l) => ({
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

const buildOrgLeaveSummary = async ({ organisation_id }) => {
  const [employeeLeave, managerLeave, adminLeave] = await Promise.all([
    Leave.find({ organisation_id }).lean(),
    ManagerLeave.find({ organisation_id }).lean(),
    AdminLeave.find({ organisation_id }).lean(),
  ]);
  const allLeaves = [...employeeLeave, ...managerLeave, ...adminLeave];

  const counts = { pending: 0, approved: 0, rejected: 0, total: allLeaves.length };
  const byType = {};
  const monthlyDays = {};
  lastNMonthKeys(6).forEach((k) => { monthlyDays[k] = 0; });

  allLeaves.forEach((l) => {
    const bucket = statusBucket(l.status);
    if (counts[bucket] !== undefined) counts[bucket] += 1;
    byType[l.leaveType] = (byType[l.leaveType] || 0) + 1;
    const key = monthKey(l.startDate);
    if (monthlyDays[key] !== undefined) monthlyDays[key] += l.days || 0;
  });

  return {
    counts,
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    monthlyTrend: Object.entries(monthlyDays).map(([month, days]) => ({ month, days: round1(days) })),
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
    if (!byType[c.reimbursementType]) byType[c.reimbursementType] = { count: 0, amount: 0 };
    byType[c.reimbursementType].count += 1;
    byType[c.reimbursementType].amount += c.amountClaimed || 0;
  });

  const decided = counts.approved + counts.rejected + counts.paid;
  const approvalRate = decided > 0 ? round1(((counts.approved + counts.paid) / decided) * 100) : null;
  const avgClaim = claims.length > 0 ? Math.round(totalClaimed / claims.length) : 0;

  return {
    counts,
    totalClaimed,
    totalApproved,
    avgClaim,
    approvalRate,
    monthlyTrend: Object.entries(monthly).map(([month, amount]) => ({ month, amount })),
    byType: Object.entries(byType).map(([type, v]) => ({ type, count: v.count, amount: v.amount })),
    recent: claims.slice(0, 6).map((c) => ({
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
  const monthly = {};
  lastNMonthKeys(6).forEach((k) => { monthly[k] = 0; });
  let totalSizeKb = 0;

  docs.forEach((d) => {
    byType[d.fileType] = (byType[d.fileType] || 0) + 1;
    const key = monthKey(d.uploadedAt);
    if (monthly[key] !== undefined) monthly[key] += 1;
    totalSizeKb += d.size || 0;
  });

  return {
    total: docs.length,
    totalSizeMb: round1(totalSizeKb / 1024),
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    monthlyTrend: Object.entries(monthly).map(([month, count]) => ({ month, count })),
    recent: docs.slice(0, 6).map((d) => ({
      _id: d._id,
      title: d.title,
      fileType: d.fileType,
      uploadedAt: d.uploadedAt,
      size: d.size,
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
  const byType = {};
  const monthly = {};
  lastNMonthKeys(6).forEach((k) => { monthly[k] = 0; });
  let open = 0;

  tickets.forEach((t) => {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byType[t.type] = (byType[t.type] || 0) + 1;
    if (OPEN_TICKET_STATUSES.includes(t.status)) open += 1;
    const key = monthKey(t.createdAt);
    if (monthly[key] !== undefined) monthly[key] += 1;
  });

  return {
    counts: { open, resolved: tickets.length - open, total: tickets.length },
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    monthlyTrend: Object.entries(monthly).map(([month, count]) => ({ month, count })),
    recent: tickets.slice(0, 6).map((t) => ({
      _id: t._id,
      ticketNumber: t.ticketNumber,
      type: t.type,
      status: t.status,
      createdAt: t.createdAt,
    })),
  };
};

// Full asset assignment history (currently held + returned) for the
// logged-in person, used by their own Self Service Portal.
const buildAssetSummary = async ({ organisation_id, personId, personModel }) => {
  const assets = await AssetModel.find({
    organisation_id,
    assignments: { $elemMatch: { assigned_to: personId, assigned_to_model: personModel } },
  })
    .select("asset_id asset_name asset_type serial_number brand model_number status purchase_date purchase_price condition notes assignments")
    .lean();

  const history = [];
  assets.forEach((a) => {
    (a.assignments || [])
      .filter((x) => String(x.assigned_to) === String(personId) && x.assigned_to_model === personModel)
      .forEach((x) => {
        history.push({
          assignment_id: x._id,
          asset_id: a._id,
          asset_code: a.asset_id,
          asset_name: a.asset_name,
          asset_type: a.asset_type,
          serial_number: a.serial_number,
          brand: a.brand,
          model_number: a.model_number,
          asset_status: a.status,
          purchase_date: a.purchase_date,
          purchase_price: a.purchase_price,
          condition: a.condition,
          notes: a.notes,
          quantity: x.quantity,
          assigned_date: x.assigned_date,
          returned_date: x.returned_date,
          is_returned: x.is_returned,
          return_condition: x.return_condition,
          return_notes: x.return_notes,
        });
      });
  });

  history.sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date));

  const currentlyAssigned = history.filter((h) => !h.is_returned);
  const returned = history.filter((h) => h.is_returned);

  const byType = {};
  currentlyAssigned.forEach((h) => { byType[h.asset_type] = (byType[h.asset_type] || 0) + 1; });

  return {
    counts: { currently_assigned: currentlyAssigned.length, returned: returned.length, total: history.length },
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    recent: history.slice(0, 8),
  };
};

// Org-wide asset snapshot (status breakdown + most recent assignment activity).
const buildOrgAssetSummary = async ({ organisation_id }) => {
  const assets = await AssetModel.find({ organisation_id })
    .select("asset_id asset_name asset_type serial_number brand model_number status purchase_date purchase_price condition notes assignments")
    .lean();

  const counts = { available: 0, assigned: 0, under_maintenance: 0, retired: 0, total: assets.length };
  const activity = [];

  assets.forEach((a) => {
    if (counts[a.status] !== undefined) counts[a.status] += 1;
    (a.assignments || []).forEach((x) => {
      activity.push({
        assignment_id: x._id,
        asset_id: a._id,
        asset_code: a.asset_id,
        asset_name: a.asset_name,
        asset_type: a.asset_type,
        serial_number: a.serial_number,
        brand: a.brand,
        model_number: a.model_number,
        asset_status: a.status,
        purchase_date: a.purchase_date,
        purchase_price: a.purchase_price,
        condition: a.condition,
        notes: a.notes,
        assigned_to_model: x.assigned_to_model,
        quantity: x.quantity,
        assigned_date: x.assigned_date,
        returned_date: x.returned_date,
        is_returned: x.is_returned,
        return_condition: x.return_condition,
        return_notes: x.return_notes,
      });
    });
  });

  activity.sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date));

  return { counts, recent: activity.slice(0, 8) };
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

const buildAttendanceSummary = async ({ organisation_id, employee, role }) => {
  const months = lastNMonthMeta(6);
  const summaries = await AttendanceSummary.find({
    organisation_id,
    employee,
    role,
    $or: months.map((m) => ({ year: m.year, month: m.month })),
  }).lean();

  const byKey = {};
  summaries.forEach((s) => { byKey[`${s.year}-${String(s.month).padStart(2, "0")}`] = s; });

  const monthlyTrend = months.map((m) => {
    const s = byKey[m.key];
    return {
      month: m.key,
      present: s?.presentDays || 0,
      half: s?.halfDays || 0,
      absent: s?.absentDays || 0,
    };
  });

  const current = monthlyTrend[monthlyTrend.length - 1];
  const workedDays = (current?.present || 0) + (current?.half || 0) * 0.5;
  const totalMarked = (current?.present || 0) + (current?.half || 0) + (current?.absent || 0);
  const attendanceRate = totalMarked > 0 ? round1((workedDays / totalMarked) * 100) : null;

  return { monthlyTrend, attendanceRate };
};

const buildOrgAttendanceSummary = async ({ organisation_id }) => {
  const months = lastNMonthMeta(6);
  const summaries = await AttendanceSummary.aggregate([
    { $match: { organisation_id, $or: months.map((m) => ({ year: m.year, month: m.month })) } },
    { $group: { _id: { year: "$year", month: "$month" }, present: { $sum: "$presentDays" }, half: { $sum: "$halfDays" }, absent: { $sum: "$absentDays" } } },
  ]);

  const byKey = {};
  summaries.forEach((s) => { byKey[`${s._id.year}-${String(s._id.month).padStart(2, "0")}`] = s; });

  const monthlyTrend = months.map((m) => {
    const s = byKey[m.key];
    return { month: m.key, present: s?.present || 0, half: s?.half || 0, absent: s?.absent || 0 };
  });

  const current = monthlyTrend[monthlyTrend.length - 1];
  const workedDays = (current?.present || 0) + (current?.half || 0) * 0.5;
  const totalMarked = (current?.present || 0) + (current?.half || 0) + (current?.absent || 0);
  const attendanceRate = totalMarked > 0 ? round1((workedDays / totalMarked) * 100) : null;

  return { monthlyTrend, attendanceRate };
};

const getSelfServiceSummary = async (req, res, next) => {
  try {
    if (req.superAdmin) {
      const organisation_id = req.superAdmin._id;

      const [leave, reimbursement, documents, tickets, attendance, assets] = await Promise.all([
        buildOrgLeaveSummary({ organisation_id }),
        buildReimbursementSummary({ organisation_id }),
        buildDocumentSummary({ organisation_id }),
        buildTicketSummary({ organisation_id }),
        buildOrgAttendanceSummary({ organisation_id }),
        buildOrgAssetSummary({ organisation_id }),
      ]);

      return res.status(200).json({
        success: true,
        scope: "organisation",
        role: "superadmin",
        leave,
        reimbursement,
        documents,
        tickets,
        attendance,
        assets,
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

    const [leave, reimbursement, documents, tickets, attendanceToday, attendanceSummary, assets] = await Promise.all([
      buildLeaveSummary({ Model: leaveModel, filterField: leaveField, actorId: actor._id, organisation_id }),
      buildReimbursementSummary({ organisation_id, submittedBy: actor._id, submitterModel }),
      buildDocumentSummary({ organisation_id, uploader: actor._id, uploaderModel: submitterModel }),
      buildTicketSummary({ organisation_id, submittedBy: actor._id, submitterModel }),
      buildAttendanceToday({ organisation_id, employee: actor._id }),
      buildAttendanceSummary({ organisation_id, employee: actor._id, role }),
      buildAssetSummary({ organisation_id, personId: actor._id, personModel: submitterModel }),
    ]);

    res.status(200).json({
      success: true,
      scope: "personal",
      role,
      leave,
      reimbursement,
      documents,
      tickets,
      attendance: { today: attendanceToday, ...attendanceSummary },
      assets,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSelfServiceSummary };