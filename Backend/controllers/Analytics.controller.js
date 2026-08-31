const mongoose = require("mongoose");

const UserModel = require("../Models/user.model");
const ManagerModel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");
const AttendanceModel = require("../Models/attendance.model");
const LeaveModel = require("../Models/leave.model");
const PayrollModel = require("../Models/payroll.model");
const ReimbursementModel = require("../Models/reimbursement.model");
const ReviewModel = require("../Models/review.model");
const TicketModel = require("../Models/ticket.model");
const AssetModel = require("../Models/asset.model");

const DEPARTMENTS = ["OPR", "BPO", "ENG", "HR", "MGMT"];

// Resolves the requested date window. Defaults to the trailing 30 days
// (inclusive of today) when the caller doesn't pass from/to — every trend
// series below is bucketed against this same window so the charts line up.
const resolveRange = (req) => {
  const { from, to } = req.query;

  const toDate = to ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999);

  let fromDate;
  if (from) {
    fromDate = new Date(from);
  } else {
    fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - 29);
  }
  fromDate.setHours(0, 0, 0, 0);

  return { fromDate, toDate };
};

// createdAt-based monthly growth trend, last 6 calendar months, per role model.
const growthTrendPipeline = (orgId) => [
  {
    $match: {
      organisation_id: orgId,
      createdAt: { $gte: new Date(Date.now() - 180 * 86400000) },
    },
  },
  {
    $group: {
      _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
      count: { $sum: 1 },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } },
];

const departmentFacetStage = {
  $group: { _id: "$department", count: { $sum: 1 } },
};

const fillDepartments = (agg) => {
  const map = Object.fromEntries((agg || []).map((d) => [d._id || "Unassigned", d.count]));
  return DEPARTMENTS.map((dept) => ({ department: dept, count: map[dept] || 0 }));
};

const monthKey = (y, m) => `${y}-${String(m).padStart(2, "0")}`;

// Merges same-shaped {_id:{year,month},count} series from different role
// models into one combined-by-month array so the frontend can render one
// "org growth" line instead of three.
const mergeMonthlySeries = (...seriesList) => {
  const totals = {};
  seriesList.forEach((series) => {
    (series || []).forEach((row) => {
      const key = monthKey(row._id.year, row._id.month);
      totals[key] = (totals[key] || 0) + row.count;
    });
  });
  return Object.entries(totals)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([month, count]) => ({ month, count }));
};

const getAnalyticsSummary = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const orgId = new mongoose.Types.ObjectId(organisation_id);
  const { fromDate, toDate } = resolveRange(req);
  const dateMatch = { createdAt: { $gte: fromDate, $lte: toDate } };

  const [
    // ── Headcount ──────────────────────────────────────────────────
    employeeStats,
    managerStats,
    adminStats,

    // ── Attendance ─────────────────────────────────────────────────
    attendanceOverall,
    attendanceDaily,

    // ── Leave ──────────────────────────────────────────────────────
    leaveStatusAgg,
    leaveTypeAgg,
    leaveMonthlyAgg,
    topLeaveTakersAgg,

    // ── Payroll ────────────────────────────────────────────────────
    payrollMonthlyAgg,
    payrollDeptAgg,

    // ── Reimbursement ──────────────────────────────────────────────
    reimbursementStatusAgg,
    reimbursementTypeAgg,
    reimbursementMonthlyAgg,

    // ── Reviews ──────────────────────────────────────────────────
    reviewStatusAgg,
    reviewRatingAgg,
    reviewAvgAgg,

    // ── Tickets (reuse existing schema static) ──────────────────────
    ticketStats,

    // ── Assets ─────────────────────────────────────────────────────
    assetTypeAgg,
    assetStatusAgg,
    assetConditionAgg,
  ] = await Promise.all([
    UserModel.aggregate([
      { $match: { organisation_id: orgId } },
      {
        $facet: {
          total: [{ $count: "count" }],
          byWorkingStatus: [{ $group: { _id: "$working_status", count: { $sum: 1 } } }],
          byDepartment: [departmentFacetStage],
          growth: growthTrendPipeline(orgId),
        },
      },
    ]),
    ManagerModel.aggregate([
      { $match: { organisation_id: orgId } },
      {
        $facet: {
          total: [{ $count: "count" }],
          byWorkingStatus: [{ $group: { _id: "$working_status", count: { $sum: 1 } } }],
          byDepartment: [departmentFacetStage],
          growth: growthTrendPipeline(orgId),
        },
      },
    ]),
    AdminModel.aggregate([
      { $match: { organisation_id: orgId } },
      {
        $facet: {
          total: [{ $count: "count" }],
          byWorkingStatus: [{ $group: { _id: "$working_status", count: { $sum: 1 } } }],
          byDepartment: [departmentFacetStage],
          growth: growthTrendPipeline(orgId),
        },
      },
    ]),

    AttendanceModel.aggregate([
      { $match: { organisation_id: orgId, date: { $gte: fromDate, $lte: toDate } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    AttendanceModel.aggregate([
      { $match: { organisation_id: orgId, date: { $gte: fromDate, $lte: toDate } } },
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, status: "$status" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]),

    LeaveModel.aggregate([
      { $match: { organisation_id: orgId, ...dateMatch } },
      { $group: { _id: "$status", count: { $sum: 1 }, days: { $sum: "$days" } } },
    ]),
    LeaveModel.aggregate([
      { $match: { organisation_id: orgId, ...dateMatch } },
      { $group: { _id: "$leaveType", count: { $sum: 1 }, days: { $sum: "$days" } } },
    ]),
    LeaveModel.aggregate([
      {
        $match: {
          organisation_id: orgId,
          createdAt: { $gte: new Date(Date.now() - 180 * 86400000) },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
          days: { $sum: "$days" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    LeaveModel.aggregate([
      { $match: { organisation_id: orgId, ...dateMatch, status: { $regex: "^approved" } } },
      {
        $group: {
          _id: "$employee",
          name: { $first: "$applicantName" },
          role: { $first: "$applicantRole" },
          totalDays: { $sum: "$days" },
          requests: { $sum: 1 },
        },
      },
      { $sort: { totalDays: -1 } },
      { $limit: 5 },
    ]),

    PayrollModel.aggregate([
      {
        $match: {
          organisation_id: orgId,
          $expr: {
            $and: [
              { $gte: [{ $dateFromParts: { year: "$year", month: "$month", day: 1 } }, new Date(Date.now() - 180 * 86400000)] },
            ],
          },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          totalNet: { $sum: "$netSalary" },
          totalCtc: { $sum: "$ctc" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    PayrollModel.aggregate([
      { $match: { organisation_id: orgId } },
      { $sort: { year: -1, month: -1 } },
      {
        $group: {
          _id: "$employeeSnapshot.department",
          latestNet: { $sum: "$netSalary" },
        },
      },
    ]),

    ReimbursementModel.aggregate([
      { $match: { organisation_id: orgId, ...dateMatch } },
      { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amountClaimed" } } },
    ]),
    ReimbursementModel.aggregate([
      { $match: { organisation_id: orgId, ...dateMatch } },
      { $group: { _id: "$reimbursementType", count: { $sum: 1 }, amount: { $sum: "$amountClaimed" } } },
    ]),
    ReimbursementModel.aggregate([
      {
        $match: {
          organisation_id: orgId,
          createdAt: { $gte: new Date(Date.now() - 180 * 86400000) },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          amount: { $sum: "$amountClaimed" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    ReviewModel.aggregate([
      { $match: { organisation_id: orgId, ...dateMatch } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    ReviewModel.aggregate([
      { $match: { organisation_id: orgId, ...dateMatch } },
      { $group: { _id: "$overallRating", count: { $sum: 1 } } },
    ]),
    ReviewModel.aggregate([
      { $match: { organisation_id: orgId, ...dateMatch } },
      { $group: { _id: null, avgScore: { $avg: "$overallScore" }, count: { $sum: 1 } } },
    ]),

    TicketModel.getDashboardStats(organisation_id).catch(() => null),

    AssetModel.aggregate([
      { $match: { organisation_id: orgId } },
      { $group: { _id: "$asset_type", count: { $sum: 1 }, quantity: { $sum: "$total_quantity" } } },
    ]),
    AssetModel.aggregate([
      { $match: { organisation_id: orgId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    AssetModel.aggregate([
      { $match: { organisation_id: orgId } },
      { $group: { _id: "$condition", count: { $sum: 1 } } },
    ]),
  ]);

  // ── Shape headcount ──────────────────────────────────────────────
  const shapeHeadcount = (facetResult) => {
    const f = facetResult?.[0] || {};
    const workingMap = Object.fromEntries((f.byWorkingStatus || []).map((w) => [w._id || "unknown", w.count]));
    return {
      total: f.total?.[0]?.count || 0,
      working: workingMap.working || 0,
      resigned: workingMap.resigned || 0,
      fired: workingMap.fired || 0,
      terminated: workingMap.terminated || 0,
      byDepartment: fillDepartments(f.byDepartment),
      growth: f.growth || [],
    };
  };

  const employeeShaped = shapeHeadcount(employeeStats);
  const managerShaped = shapeHeadcount(managerStats);
  const adminShaped = shapeHeadcount(adminStats);

  const combinedDeptDistribution = DEPARTMENTS.map((dept) => ({
    department: dept,
    employees: employeeShaped.byDepartment.find((d) => d.department === dept)?.count || 0,
    managers: managerShaped.byDepartment.find((d) => d.department === dept)?.count || 0,
    admins: adminShaped.byDepartment.find((d) => d.department === dept)?.count || 0,
  }));

  const orgGrowthTrend = mergeMonthlySeries(employeeShaped.growth, managerShaped.growth, adminShaped.growth);

  // ── Shape attendance ─────────────────────────────────────────────
  const attendanceStatusMap = Object.fromEntries((attendanceOverall || []).map((a) => [a._id, a.count]));
  const attendanceTotal = Object.values(attendanceStatusMap).reduce((a, b) => a + b, 0);
  const attendanceDailyMap = {};
  (attendanceDaily || []).forEach((row) => {
    const date = row._id.date;
    if (!attendanceDailyMap[date]) attendanceDailyMap[date] = { date, present: 0, half_day: 0, absent: 0 };
    attendanceDailyMap[date][row._id.status] = row.count;
  });

  // ── Shape leave ──────────────────────────────────────────────────
  const leaveStatusShaped = (leaveStatusAgg || []).map((s) => ({ status: s._id, count: s.count, days: s.days }));
  const leaveApproved = leaveStatusShaped
    .filter((s) => s.status?.startsWith("approved"))
    .reduce((sum, s) => sum + s.count, 0);
  const leaveRejected = leaveStatusShaped
    .filter((s) => s.status?.startsWith("rejected"))
    .reduce((sum, s) => sum + s.count, 0);
  const leavePending = leaveStatusShaped
    .filter((s) => s.status?.startsWith("pending") || s.status?.startsWith("forwarded"))
    .reduce((sum, s) => sum + s.count, 0);

  // ── Shape payroll ────────────────────────────────────────────────
  const payrollMonthlyShaped = (payrollMonthlyAgg || []).map((p) => ({
    month: monthKey(p._id.year, p._id.month),
    totalNet: p.totalNet,
    totalCtc: p.totalCtc,
    headcount: p.count,
  }));
  const payrollDeptShaped = (payrollDeptAgg || [])
    .filter((p) => p._id)
    .map((p) => ({ department: p._id, totalNet: p.latestNet }));

  // ── Shape reimbursement ──────────────────────────────────────────
  const reimbursementStatusShaped = (reimbursementStatusAgg || []).map((r) => ({
    status: r._id,
    count: r.count,
    amount: r.amount,
  }));
  const reimbursementTypeShaped = (reimbursementTypeAgg || []).map((r) => ({
    type: r._id,
    count: r.count,
    amount: r.amount,
  }));
  const reimbursementMonthlyShaped = (reimbursementMonthlyAgg || []).map((r) => ({
    month: monthKey(r._id.year, r._id.month),
    amount: r.amount,
    count: r.count,
  }));
  const reimbursementTotalAmount = reimbursementStatusShaped.reduce((sum, r) => sum + (r.amount || 0), 0);

  // ── Shape reviews ────────────────────────────────────────────────
  const reviewStatusShaped = (reviewStatusAgg || []).map((r) => ({ status: r._id, count: r.count }));
  const reviewRatingShaped = (reviewRatingAgg || []).map((r) => ({ rating: r._id, count: r.count }));
  const reviewTotal = reviewStatusShaped.reduce((sum, r) => sum + r.count, 0);
  const reviewFinalized = reviewStatusShaped
    .filter((r) => r.status === "hr_approved")
    .reduce((sum, r) => sum + r.count, 0);

  // ── Shape assets ─────────────────────────────────────────────────
  const assetTypeShaped = (assetTypeAgg || []).map((a) => ({ type: a._id, count: a.count, quantity: a.quantity }));
  const assetStatusShaped = (assetStatusAgg || []).map((a) => ({ status: a._id, count: a.count }));
  const assetConditionShaped = (assetConditionAgg || []).map((a) => ({ condition: a._id, count: a.count }));

  return res.status(200).json({
    success: true,
    range: { from: fromDate, to: toDate },

    headcount: {
      total: employeeShaped.total + managerShaped.total + adminShaped.total,
      employees: employeeShaped,
      managers: managerShaped,
      admins: adminShaped,
      departmentDistribution: combinedDeptDistribution,
      orgGrowthTrend,
    },

    attendance: {
      totalMarked: attendanceTotal,
      present: attendanceStatusMap.present || 0,
      halfDay: attendanceStatusMap.half_day || 0,
      absent: attendanceStatusMap.absent || 0,
      attendanceRate: attendanceTotal
        ? Math.round(((attendanceStatusMap.present || 0) / attendanceTotal) * 1000) / 10
        : 0,
      dailyTrend: Object.values(attendanceDailyMap).sort((a, b) => (a.date > b.date ? 1 : -1)),
    },

    leave: {
      totalRequests: leaveStatusShaped.reduce((sum, s) => sum + s.count, 0),
      approved: leaveApproved,
      rejected: leaveRejected,
      pending: leavePending,
      byStatus: leaveStatusShaped,
      byType: (leaveTypeAgg || []).map((l) => ({ type: l._id, count: l.count, days: l.days })),
      monthlyTrend: (leaveMonthlyAgg || []).map((l) => ({
        month: monthKey(l._id.year, l._id.month),
        count: l.count,
        days: l.days,
      })),
      topLeaveTakers: (topLeaveTakersAgg || []).map((t) => ({
        name: t.name,
        role: t.role,
        totalDays: t.totalDays,
        requests: t.requests,
      })),
    },

    payroll: {
      monthlyTrend: payrollMonthlyShaped,
      departmentWise: payrollDeptShaped,
      latestMonthTotal: payrollMonthlyShaped[payrollMonthlyShaped.length - 1]?.totalNet || 0,
    },

    reimbursement: {
      totalClaims: reimbursementStatusShaped.reduce((sum, r) => sum + r.count, 0),
      totalAmount: reimbursementTotalAmount,
      byStatus: reimbursementStatusShaped,
      byType: reimbursementTypeShaped,
      monthlyTrend: reimbursementMonthlyShaped,
    },

    reviews: {
      total: reviewTotal,
      finalized: reviewFinalized,
      completionRate: reviewTotal ? Math.round((reviewFinalized / reviewTotal) * 1000) / 10 : 0,
      avgScore: Math.round((reviewAvgAgg?.[0]?.avgScore || 0) * 100) / 100,
      byStatus: reviewStatusShaped,
      byRating: reviewRatingShaped,
    },

    tickets: ticketStats || { byType: {}, byStatus: {}, overdue: 0, criticalOrPosh: 0, monthly: [] },

    assets: {
      total: assetTypeShaped.reduce((sum, a) => sum + a.count, 0),
      byType: assetTypeShaped,
      byStatus: assetStatusShaped,
      byCondition: assetConditionShaped,
    },
  });
};

module.exports = { getAnalyticsSummary };