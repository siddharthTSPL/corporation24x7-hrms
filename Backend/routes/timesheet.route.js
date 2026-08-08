const express = require("express");
const timesheetRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const superAdminAuth = require("../middleware/auth/superadmin.middleware");
const adminAuth = require("../middleware/auth/admin.middleware");
const managerAuth = require("../middleware/auth/manager.middleware");
const employeeAuth = require("../middleware/auth/employee.middleware");
const jwt = require("jsonwebtoken");

// ─── role-detection middlewares ───────────────────────────────────────────────

// Accepts any authenticated role (SA / Admin / Manager / Employee)
const anyRole = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  if (decoded.role === "super_admin") return superAdminAuth(req, res, next);
  if (decoded.role === "official") {
    if (decoded.managerid) return managerAuth(req, res, next);
    if (decoded.adminid) return adminAuth(req, res, next);
  }
  if (["admin", "senior_admin"].includes(decoded.role))
    return adminAuth(req, res, next);
  if (["manager", "senior_manager"].includes(decoded.role))
    return managerAuth(req, res, next);
  if (decoded.role === "employee") return employeeAuth(req, res, next);

  return res.status(403).json({ message: "Access denied" });
};

// SuperAdmin or Admin only
const saOrAdmin = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  if (decoded.role === "super_admin") return superAdminAuth(req, res, next);
  if (["admin", "senior_admin"].includes(decoded.role))
    return adminAuth(req, res, next);
  if (decoded.role === "official" && decoded.adminid)
    return adminAuth(req, res, next);

  return res
    .status(403)
    .json({ message: "Admin or Super Admin access required" });
};

// SuperAdmin only
const saOnly = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  if (decoded.role === "super_admin") return superAdminAuth(req, res, next);

  return res.status(403).json({ message: "Super Admin access required" });
};

// ─── controller imports ───────────────────────────────────────────────────────

const {
  createProject,
  getMyProjects,
  getProjectById,
  updateProject,
  addProjectMembers,
  removeProjectMember,
  archiveProject,
} = require("../controllers/Tsproject.controller");

const {
  createJob,
  getAssignableTargets,
  getMyAssignedJobs,
  getJobsCreatedByMe,
  getJobById,
  updateJobStatus,
  updateJob,
  toggleWorkItem,
  archiveJob,
  getAllJobsAdmin,
  getJobTimelineAdmin,
} = require("../controllers/tsjob.controller");

const {
  logTime,
  getMyDayLog,
  getMyWeekLog,
  updateTimeLog,
  deleteTimeLog,
  getJobTimeLogs,
  getAllTimeLogs,
} = require("../controllers/timelog.controller");

const {
  startTimer,
  heartbeatTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  getActiveTimer,
  discardTimer,
} = require("../controllers/activetimmer.controller");

const {
  submitTimesheet,
  getMyTimesheets,
  getPendingApprovals,
  approveTimesheet,
  rejectTimesheet,
  forwardTimesheet,
  recallTimesheet,
  getAllTimesheets,
} = require("../controllers/timesheet.controller");

const {
  getTeamWorkloadHeatmap,
  getOverrunRiskJobs,
  getIdleJobs,
  getMyProductivitySummary,
} = require("../controllers/Tsinsights.controller");

// ─── Projects ─────────────────────────────────────────────────────────────────
timesheetRouter.post("/projects", anyRole, asyncHandler(createProject));
timesheetRouter.get("/projects", anyRole, asyncHandler(getMyProjects));
timesheetRouter.get("/projects/:id", anyRole, asyncHandler(getProjectById));
timesheetRouter.put("/projects/:id", anyRole, asyncHandler(updateProject));
timesheetRouter.post(
  "/projects/:id/members",
  anyRole,
  asyncHandler(addProjectMembers),
);
timesheetRouter.delete(
  "/projects/:id/members/:memberId",
  anyRole,
  asyncHandler(removeProjectMember),
);
timesheetRouter.post(
  "/projects/:id/archive",
  anyRole,
  asyncHandler(archiveProject),
);

// ─── Jobs (self + assignable) ─────────────────────────────────────────────────
// Must come before /jobs/:id to avoid route shadowing
timesheetRouter.get(
  "/jobs/assignable-targets",
  anyRole,
  asyncHandler(getAssignableTargets),
);
timesheetRouter.get(
  "/jobs/assigned-to-me",
  anyRole,
  asyncHandler(getMyAssignedJobs),
);
timesheetRouter.get(
  "/jobs/created-by-me",
  anyRole,
  asyncHandler(getJobsCreatedByMe),
);
timesheetRouter.post("/jobs", anyRole, asyncHandler(createJob));
timesheetRouter.get("/jobs/:id", anyRole, asyncHandler(getJobById));
timesheetRouter.patch(
  "/jobs/:id/status",
  anyRole,
  asyncHandler(updateJobStatus),
);
timesheetRouter.put("/jobs/:id", anyRole, asyncHandler(updateJob));
timesheetRouter.patch(
  "/jobs/:id/work-items/:workItemId",
  anyRole,
  asyncHandler(toggleWorkItem),
);
timesheetRouter.post("/jobs/:id/archive", anyRole, asyncHandler(archiveJob));
timesheetRouter.get(
  "/jobs/:jobId/time-logs",
  anyRole,
  asyncHandler(getJobTimeLogs),
);

// ─── Time logs ────────────────────────────────────────────────────────────────
timesheetRouter.post("/time-logs", anyRole, asyncHandler(logTime));
timesheetRouter.get("/time-logs/day", anyRole, asyncHandler(getMyDayLog));
timesheetRouter.get("/time-logs/week", anyRole, asyncHandler(getMyWeekLog));
timesheetRouter.put("/time-logs/:id", anyRole, asyncHandler(updateTimeLog));
timesheetRouter.delete("/time-logs/:id", anyRole, asyncHandler(deleteTimeLog));

// ─── Timer ────────────────────────────────────────────────────────────────────
timesheetRouter.post("/timer/start", anyRole, asyncHandler(startTimer));
timesheetRouter.post("/timer/heartbeat", anyRole, asyncHandler(heartbeatTimer));
timesheetRouter.post("/timer/pause", anyRole, asyncHandler(pauseTimer));
timesheetRouter.post("/timer/resume", anyRole, asyncHandler(resumeTimer));
timesheetRouter.post("/timer/stop", anyRole, asyncHandler(stopTimer));
timesheetRouter.get("/timer/active", anyRole, asyncHandler(getActiveTimer));
timesheetRouter.delete("/timer/discard", anyRole, asyncHandler(discardTimer));

// ─── Timesheets ───────────────────────────────────────────────────────────────
timesheetRouter.post(
  "/timesheets/submit",
  anyRole,
  asyncHandler(submitTimesheet),
);
timesheetRouter.post(
  "/timesheets/recall",
  anyRole,
  asyncHandler(recallTimesheet),
);
timesheetRouter.get("/timesheets/mine", anyRole, asyncHandler(getMyTimesheets));
timesheetRouter.get(
  "/timesheets/pending-approvals",
  anyRole,
  asyncHandler(getPendingApprovals),
);
timesheetRouter.post(
  "/timesheets/approve",
  anyRole,
  asyncHandler(approveTimesheet),
);
timesheetRouter.post(
  "/timesheets/reject",
  anyRole,
  asyncHandler(rejectTimesheet),
);
timesheetRouter.post(
  "/timesheets/forward",
  anyRole,
  asyncHandler(forwardTimesheet),
);

// ─── Insights ─────────────────────────────────────────────────────────────────
timesheetRouter.get(
  "/insights/workload-heatmap",
  anyRole,
  asyncHandler(getTeamWorkloadHeatmap),
);
timesheetRouter.get(
  "/insights/overrun-risk",
  anyRole,
  asyncHandler(getOverrunRiskJobs),
);
timesheetRouter.get("/insights/idle-jobs", anyRole, asyncHandler(getIdleJobs));
timesheetRouter.get(
  "/insights/my-productivity",
  anyRole,
  asyncHandler(getMyProductivitySummary),
);

// ─── Admin / SuperAdmin: org-wide visibility ──────────────────────────────────
timesheetRouter.get("/admin/jobs", saOrAdmin, asyncHandler(getAllJobsAdmin));
timesheetRouter.get(
  "/admin/jobs/:id/timeline",
  saOrAdmin,
  asyncHandler(getJobTimelineAdmin),
);
timesheetRouter.get(
  "/admin/time-logs",
  saOrAdmin,
  asyncHandler(getAllTimeLogs),
);
timesheetRouter.get(
  "/admin/timesheets",
  saOrAdmin,
  asyncHandler(getAllTimesheets),
);

module.exports = timesheetRouter;