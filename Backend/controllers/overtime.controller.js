const Overtime = require("../Models/overtime.model");
const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");
const SuperAdminModel = require("../Models/superadmin.model");
const Payroll = require("../Models/payroll.model");
const SalaryStructure = require("../Models/salarystructure.model");
const { getOrCreatePolicy } = require("./payrollpolicy.controller");
const { createNotification, createBulkNotifications } = require("../utils/Notification.utils");
const { parseISTDateOnly, getISTDateParts, startOfISTDay } = require("../utils/Istdate.utils");
const { getOvertimeRates } = require("../utils/Overtimerequest.utils");
const { round2 } = require("../utils/payroll.utils");

const MODEL_MAP = { User: Usermodel, Manager: Managermodel, Admin: AdminModel };
const MIN_MINUTES = 15;
const MAX_MINUTES = 16 * 60;
const MAX_BACKDATE_DAYS = 60;
const FINAL_PAYROLL_STATUSES = ["approved", "paid"];

const httpError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const actorOf = (req) => ({
  id: req.actor.id,
  model: req.actor.recipientModel, // User | Manager | Admin | SuperAdmin
  organisation_id: req.actor.organisation_id,
  doc: req.user,
});

// Who reviews overtime:
//   - the org SuperAdmin, always;
//   - an Admin flagged isHR (same flag the Review module uses);
//   - if NO admin in the org is flagged HR, every Admin can review.
const hasDesignatedHR = async (organisation_id) =>
  (await AdminModel.countDocuments({ organisation_id, isHR: true, working_status: "working" })) > 0;

const canReviewOvertime = async (actor) => {
  if (actor.model === "SuperAdmin") return true;
  if (actor.model !== "Admin") return false;
  if (actor.doc?.isHR === true) return true;
  return !(await hasDesignatedHR(actor.organisation_id));
};

const displayName = (doc) =>
  `${doc?.f_name || ""} ${doc?.l_name || ""}`.trim() || doc?.organisation_name || "";

const parseHM = (value) => {
  if (typeof value !== "string") return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const fmtHours = (minutes) => `${round2(minutes / 60)} hr`;

const notifyHRs = async ({ organisation_id, title, message, createdBy, createdByModel, excludeId }) => {
  const designated = await hasDesignatedHR(organisation_id);
  const hrAdmins = await AdminModel.find({
    organisation_id,
    working_status: "working",
    ...(designated ? { isHR: true } : {}),
  })
    .select("_id")
    .lean();
  const recipients = hrAdmins
    .filter((a) => String(a._id) !== String(excludeId))
    .map((a) => ({ recipientModel: "Admin", recipientId: a._id }));
  // The org owner always sees overtime requests too.
  recipients.push({ recipientModel: "SuperAdmin", recipientId: organisation_id });
  await createBulkNotifications({
    recipients,
    organisation_id,
    type: "overtime",
    title,
    message,
    link: "/overtime",
    createdBy,
    createdByModel,
  });
};

// Estimated rupee value of one request, for display only (payroll recomputes
// the real figure when it is generated).
const estimateAmounts = async (rows, organisation_id) => {
  if (!rows.length) return new Map();
  const policy = await getOrCreatePolicy(organisation_id);
  const requesterIds = [...new Set(rows.map((r) => String(r.requester)))];
  const structures = await SalaryStructure.find({ employee: { $in: requesterIds }, isActive: true })
    .select("employee breakup.monthlyGross")
    .lean();
  const byEmployee = new Map(structures.map((s) => [String(s.employee), s]));
  const multiplier = Number(policy?.overtimeRequests?.multiplier) > 0 ? Number(policy.overtimeRequests.multiplier) : 1;

  const out = new Map();
  for (const row of rows) {
    const structure = byEmployee.get(String(row.requester));
    if (!structure) {
      out.set(String(row._id), null);
      continue;
    }
    const rates = getOvertimeRates({ structure, policy, month: row.month, year: row.year });
    out.set(String(row._id), {
      perDaySalary: rates.perDaySalary,
      perHourSalary: rates.perHourSalary,
      amount: round2((row.minutes / 60) * rates.rawPerHour * multiplier),
    });
  }
  return out;
};

const shapeRow = (row, estimates) => ({
  ...row,
  estimate: estimates?.get(String(row._id)) ?? null,
});

const isPayrollFinal = async ({ requester, month, year }) => {
  const p = await Payroll.findOne({ employee: requester, month, year }).select("status").lean();
  return !!p && FINAL_PAYROLL_STATUSES.includes(p.status);
};

// ------------------------------------------------------------------ apply
const applyOvertime = async (req, res) => {
  const actor = actorOf(req);
  if (!MODEL_MAP[actor.model]) throw httpError("Overtime can be filed by employees, managers and admins only.", 403);

  const { date, hours, startTime, endTime, reason } = req.body || {};

  const day = parseISTDateOnly(date);
  if (!day || Number.isNaN(day.getTime())) throw httpError("A valid overtime date is required.");
  const today = startOfISTDay(new Date());
  if (day.getTime() > today.getTime()) throw httpError("Overtime cannot be filed for a future date.");
  if (today.getTime() - day.getTime() > MAX_BACKDATE_DAYS * 86400000)
    throw httpError(`Overtime can only be filed for the last ${MAX_BACKDATE_DAYS} days.`);

  let minutes;
  const hasTimes = startTime && endTime;
  if (hasTimes) {
    const s = parseHM(startTime);
    const e = parseHM(endTime);
    if (s === null || e === null) throw httpError("Start and end time must be in HH:mm format.");
    minutes = e > s ? e - s : e + 24 * 60 - s;
  } else {
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0) throw httpError("Enter the overtime hours (or a start and end time).");
    minutes = Math.round(h * 60);
  }
  if (minutes < MIN_MINUTES) throw httpError(`Minimum overtime is ${MIN_MINUTES} minutes.`);
  if (minutes > MAX_MINUTES) throw httpError(`Overtime cannot exceed ${MAX_MINUTES / 60} hours for one day.`);

  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw httpError("Please give a reason for the overtime.");
  if (cleanReason.length > 500) throw httpError("Reason must be 500 characters or fewer.");

  const { month, year } = getISTDateParts(day);

  if (await isPayrollFinal({ requester: actor.id, month, year }))
    throw httpError("Payroll for that month is already finalised, so overtime can no longer be added.");

  const duplicate = await Overtime.findOne({
    requester: actor.id,
    requesterModel: actor.model,
    date: day,
    status: { $in: ["pending", "approved"] },
  }).select("_id status");
  if (duplicate)
    throw httpError(`You already have a ${duplicate.status} overtime request for this date.`, 409);

  const doc = actor.doc;
  const created = await Overtime.create({
    organisation_id: actor.organisation_id,
    requester: actor.id,
    requesterModel: actor.model,
    requesterSnapshot: {
      name: displayName(doc),
      employeeId: doc.uid || "",
      department: doc.department || "",
      designation: doc.designation || "",
      role: actor.model === "User" ? "Employee" : actor.model,
    },
    date: day,
    month,
    year,
    startTime: hasTimes ? startTime : "",
    endTime: hasTimes ? endTime : "",
    minutes,
    hours: round2(minutes / 60),
    reason: cleanReason,
  });

  await notifyHRs({
    organisation_id: actor.organisation_id,
    title: "New overtime request",
    message: `${displayName(doc) || "A team member"} filed ${fmtHours(minutes)} overtime for review.`,
    createdBy: actor.id,
    createdByModel: actor.model,
    excludeId: actor.id,
  });

  res.status(201).json({ success: true, message: "Overtime request sent to HR.", overtime: created });
};

// -------------------------------------------------------------- my records
const getMyOvertime = async (req, res) => {
  const actor = actorOf(req);
  if (!MODEL_MAP[actor.model]) return res.status(200).json({ success: true, overtime: [], summary: {} });

  const { status, month, year } = req.query;
  const filter = { requester: actor.id, requesterModel: actor.model };
  if (["pending", "approved", "rejected"].includes(status)) filter.status = status;
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);

  const rows = await Overtime.find(filter).sort({ date: -1, createdAt: -1 }).limit(500).lean();
  const estimates = await estimateAmounts(rows, actor.organisation_id);

  const summary = rows.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      if (r.status === "approved") {
        acc.approvedMinutes += r.minutes;
        acc.estimatedAmount += estimates.get(String(r._id))?.amount || 0;
      }
      return acc;
    },
    { pending: 0, approved: 0, rejected: 0, approvedMinutes: 0, estimatedAmount: 0 }
  );
  summary.approvedHours = round2(summary.approvedMinutes / 60);
  summary.estimatedAmount = round2(summary.estimatedAmount);

  res.status(200).json({ success: true, overtime: rows.map((r) => shapeRow(r, estimates)), summary });
};

const editMyOvertime = async (req, res) => {
  const actor = actorOf(req);
  const row = await Overtime.findOne({ _id: req.params.id, requester: actor.id, requesterModel: actor.model });
  if (!row) throw httpError("Overtime request not found.", 404);
  if (row.status !== "pending") throw httpError("Only pending requests can be edited.", 409);

  const { hours, startTime, endTime, reason } = req.body || {};
  const hasTimes = startTime && endTime;
  let minutes = row.minutes;
  if (hasTimes) {
    const s = parseHM(startTime);
    const e = parseHM(endTime);
    if (s === null || e === null) throw httpError("Start and end time must be in HH:mm format.");
    minutes = e > s ? e - s : e + 24 * 60 - s;
  } else if (hours !== undefined) {
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0) throw httpError("Enter valid overtime hours.");
    minutes = Math.round(h * 60);
  }
  if (minutes < MIN_MINUTES || minutes > MAX_MINUTES)
    throw httpError(`Overtime must be between ${MIN_MINUTES} minutes and ${MAX_MINUTES / 60} hours.`);

  if (reason !== undefined) {
    const r = String(reason).trim();
    if (!r) throw httpError("Reason cannot be empty.");
    row.reason = r.slice(0, 500);
  }
  row.minutes = minutes;
  row.hours = round2(minutes / 60);
  row.startTime = hasTimes ? startTime : hours !== undefined ? "" : row.startTime;
  row.endTime = hasTimes ? endTime : hours !== undefined ? "" : row.endTime;
  await row.save();

  res.status(200).json({ success: true, message: "Overtime request updated.", overtime: row });
};

const deleteMyOvertime = async (req, res) => {
  const actor = actorOf(req);
  const row = await Overtime.findOne({ _id: req.params.id, requester: actor.id, requesterModel: actor.model });
  if (!row) throw httpError("Overtime request not found.", 404);
  if (row.status !== "pending") throw httpError("Only pending requests can be withdrawn.", 409);
  await row.deleteOne();
  res.status(200).json({ success: true, message: "Overtime request withdrawn." });
};

// ---------------------------------------------------------------- HR side
const getOvertimeAccess = async (req, res) => {
  const actor = actorOf(req);
  res.status(200).json({
    success: true,
    canReview: await canReviewOvertime(actor),
    canApply: !!MODEL_MAP[actor.model],
    role: actor.model,
  });
};

const listOvertimeForReview = async (req, res) => {
  const actor = actorOf(req);
  if (!(await canReviewOvertime(actor))) throw httpError("Only HR can review overtime requests.", 403);

  const { status, month, year, search } = req.query;
  const filter = { organisation_id: actor.organisation_id };
  if (["pending", "approved", "rejected"].includes(status)) filter.status = status;
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  if (search && String(search).trim()) {
    const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ "requesterSnapshot.name": rx }, { "requesterSnapshot.employeeId": rx }, { "requesterSnapshot.department": rx }];
  }

  const rows = await Overtime.find(filter).sort({ status: 1, createdAt: -1 }).limit(1000).lean();
  // pending first, then newest
  rows.sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1));
  const estimates = await estimateAmounts(rows, actor.organisation_id);

  const counts = await Overtime.aggregate([
    { $match: { organisation_id: actor.organisation_id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));

  res.status(200).json({
    success: true,
    overtime: rows.map((r) => shapeRow(r, estimates)),
    counts: { pending: countMap.pending || 0, approved: countMap.approved || 0, rejected: countMap.rejected || 0 },
  });
};

const decide = async (req, decision) => {
  const actor = actorOf(req);
  if (!(await canReviewOvertime(actor))) throw httpError("Only HR can review overtime requests.", 403);

  const row = await Overtime.findOne({ _id: req.params.id, organisation_id: actor.organisation_id });
  if (!row) throw httpError("Overtime request not found.", 404);
  if (row.status !== "pending") throw httpError(`This request is already ${row.status}.`, 409);
  if (String(row.requester) === String(actor.id) && row.requesterModel === actor.model)
    throw httpError("You cannot review your own overtime request. Another HR or the SuperAdmin must do it.", 403);

  const remarks = String(req.body?.remarks || "").trim().slice(0, 500);
  if (decision === "rejected" && !remarks) throw httpError("Please add a remark when rejecting.");

  if (decision === "approved" && (await isPayrollFinal(row)))
    throw httpError("Payroll for that month is already finalised, so this can no longer be approved.", 409);

  row.status = decision;
  row.reviewedBy = actor.id;
  row.reviewedByModel = actor.model === "SuperAdmin" ? "SuperAdmin" : "Admin";
  row.reviewerName = displayName(actor.doc);
  row.reviewedAt = new Date();
  row.remarks = remarks;
  await row.save();

  await createNotification({
    recipientModel: row.requesterModel,
    recipientId: row.requester,
    organisation_id: actor.organisation_id,
    type: "overtime",
    title: decision === "approved" ? "Overtime approved" : "Overtime rejected",
    message:
      decision === "approved"
        ? `Your ${fmtHours(row.minutes)} overtime request has been approved and will be added to payroll.`
        : `Your ${fmtHours(row.minutes)} overtime request was rejected${remarks ? `: ${remarks}` : "."}`,
    link: "/overtime",
    createdBy: actor.id,
    createdByModel: actor.model,
  });

  return row;
};

const approveOvertime = async (req, res) => {
  const row = await decide(req, "approved");
  res.status(200).json({
    success: true,
    message: "Overtime approved. It will be added to this month's payroll automatically.",
    overtime: row,
  });
};

const rejectOvertime = async (req, res) => {
  const row = await decide(req, "rejected");
  res.status(200).json({ success: true, message: "Overtime rejected.", overtime: row });
};

module.exports = {
  applyOvertime,
  getMyOvertime,
  editMyOvertime,
  deleteMyOvertime,
  getOvertimeAccess,
  listOvertimeForReview,
  approveOvertime,
  rejectOvertime,
};