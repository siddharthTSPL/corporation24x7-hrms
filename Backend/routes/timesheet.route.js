const express = require("express");
const timesheetRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const superAdminAuth = require("../middleware/auth/superadmin.middleware");
const adminAuth = require("../middleware/auth/admin.middleware");
const managerAuth = require("../middleware/auth/manager.middleware");
const employeeAuth = require("../middleware/auth/employee.middleware");

const anyRole = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const jwt = require("jsonwebtoken");
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  if (decoded.role === "super_admin") return superAdminAuth(req, res, next);
  if (["admin", "senior_admin", "official"].includes(decoded.role)) return adminAuth(req, res, next);
  if (["manager", "senior_manager"].includes(decoded.role)) return managerAuth(req, res, next);
  if (decoded.role === "employee") return employeeAuth(req, res, next);

  return res.status(403).json({ message: "Access denied" });
};

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
  getAllTimesheets,
} = require("../controllers/timesheet.controller");

// ─── SA / Admin only middleware ───────────────────────────────────────────────
const saOrAdmin = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  const jwt = require("jsonwebtoken");
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
  catch (e) { return res.status(401).json({ message: "Invalid or expired token" }); }
  if (decoded.role === "super_admin") return superAdminAuth(req, res, next);
  if (["admin", "senior_admin", "official"].includes(decoded.role)) return adminAuth(req, res, next);
  return res.status(403).json({ message: "Admin or Super Admin access required" });
};

const {
  getTeamWorkloadHeatmap,
  getOverrunRiskJobs,
  getIdleJobs,
  getMyProductivitySummary,
} = require("../controllers/tsinsights.controller");

timesheetRouter.post("/projects", anyRole, asyncHandler(createProject));
timesheetRouter.get("/projects", anyRole, asyncHandler(getMyProjects));
timesheetRouter.get("/projects/:id", anyRole, asyncHandler(getProjectById));
timesheetRouter.put("/projects/:id", anyRole, asyncHandler(updateProject));
timesheetRouter.post("/projects/:id/members", anyRole, asyncHandler(addProjectMembers));
timesheetRouter.delete("/projects/:id/members/:memberId", anyRole, asyncHandler(removeProjectMember));
timesheetRouter.post("/projects/:id/archive", anyRole, asyncHandler(archiveProject));

timesheetRouter.get("/assignable-targets", anyRole, asyncHandler(getAssignableTargets));
timesheetRouter.post("/jobs", anyRole, asyncHandler(createJob));
timesheetRouter.get("/jobs/assigned-to-me", anyRole, asyncHandler(getMyAssignedJobs));
timesheetRouter.get("/jobs/created-by-me", anyRole, asyncHandler(getJobsCreatedByMe));
timesheetRouter.get("/jobs/:id", anyRole, asyncHandler(getJobById));
timesheetRouter.patch("/jobs/:id/status", anyRole, asyncHandler(updateJobStatus));
timesheetRouter.put("/jobs/:id", anyRole, asyncHandler(updateJob));
timesheetRouter.patch("/jobs/:id/work-items/:workItemId", anyRole, asyncHandler(toggleWorkItem));
timesheetRouter.post("/jobs/:id/archive", anyRole, asyncHandler(archiveJob));
timesheetRouter.get("/jobs/:jobId/time-logs", anyRole, asyncHandler(getJobTimeLogs));

timesheetRouter.post("/time-logs", anyRole, asyncHandler(logTime));
timesheetRouter.get("/time-logs/day", anyRole, asyncHandler(getMyDayLog));
timesheetRouter.get("/time-logs/week", anyRole, asyncHandler(getMyWeekLog));
timesheetRouter.put("/time-logs/:id", anyRole, asyncHandler(updateTimeLog));
timesheetRouter.delete("/time-logs/:id", anyRole, asyncHandler(deleteTimeLog));

timesheetRouter.post("/timer/start", anyRole, asyncHandler(startTimer));
timesheetRouter.post("/timer/heartbeat", anyRole, asyncHandler(heartbeatTimer));
timesheetRouter.post("/timer/pause", anyRole, asyncHandler(pauseTimer));
timesheetRouter.post("/timer/resume", anyRole, asyncHandler(resumeTimer));
timesheetRouter.post("/timer/stop", anyRole, asyncHandler(stopTimer));
timesheetRouter.get("/timer/active", anyRole, asyncHandler(getActiveTimer));
timesheetRouter.delete("/timer/discard", anyRole, asyncHandler(discardTimer));

timesheetRouter.post("/timesheets/submit", anyRole, asyncHandler(submitTimesheet));
timesheetRouter.get("/timesheets/mine", anyRole, asyncHandler(getMyTimesheets));
timesheetRouter.get("/timesheets/pending-approvals", anyRole, asyncHandler(getPendingApprovals));
timesheetRouter.post("/timesheets/approve", anyRole, asyncHandler(approveTimesheet));
timesheetRouter.post("/timesheets/reject", anyRole, asyncHandler(rejectTimesheet));
timesheetRouter.post("/timesheets/forward", anyRole, asyncHandler(forwardTimesheet));

timesheetRouter.get("/insights/workload-heatmap", anyRole, asyncHandler(getTeamWorkloadHeatmap));
timesheetRouter.get("/insights/overrun-risk", anyRole, asyncHandler(getOverrunRiskJobs));
timesheetRouter.get("/insights/idle-jobs", anyRole, asyncHandler(getIdleJobs));
timesheetRouter.get("/insights/my-productivity", anyRole, asyncHandler(getMyProductivitySummary));

// ─── SA / Admin: org-wide visibility endpoints ────────────────────────────────
timesheetRouter.get("/admin/time-logs", saOrAdmin, asyncHandler(getAllTimeLogs));
timesheetRouter.get("/admin/timesheets", saOrAdmin, asyncHandler(getAllTimesheets));
timesheetRouter.get("/debug/targets", anyRole, asyncHandler(async (req, res) => {
  const Admin = require("../Models/Admin.model");
  const Manager = require("../Models/manager.model");
  const User = require("../Models/user.model");

  const { resolveActor, resolveOrgId } = require("../utils/heirarchy.utils");

  const actor = resolveActor(req);
  const organisation_id = resolveOrgId(req);

  const allManagers = await Manager.find({ organisation_id })
    .select("f_name l_name reporting_manager reporting_manager_model working_status")
    .lean();

  const allUsers = await User.find({ organisation_id })
    .select("f_name l_name Under_manager working_status")
    .lean();

  const allAdmins = await Admin.find({ organisation_id })
    .select("f_name l_name working_status")
    .lean();

  res.json({
    actor,
    organisation_id,
    allAdmins,
    allManagers,
    allUsers,
  });
}));
module.exports = timesheetRouter;