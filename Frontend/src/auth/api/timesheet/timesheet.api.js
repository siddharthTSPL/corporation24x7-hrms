import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    if (error.response?.status === 401) return Promise.reject(null);
    return Promise.reject(new Error(message));
  }
);

export const createProject = async (data) => {
  const res = await api.post("timesheet/projects", data);
  return res.data;
};

export const getMyProjects = async () => {
  const res = await api.get("timesheet/projects");
  return res.data;
};

export const getProjectById = async (id) => {
  const res = await api.get(`timesheet/projects/${id}`);
  return res.data;
};

export const updateProject = async ({ id, data }) => {
  const res = await api.put(`timesheet/projects/${id}`, data);
  return res.data;
};

export const addProjectMembers = async ({ id, member_ids }) => {
  const res = await api.post(`timesheet/projects/${id}/members`, { member_ids });
  return res.data;
};

export const removeProjectMember = async ({ id, memberId }) => {
  const res = await api.delete(`timesheet/projects/${id}/members/${memberId}`);
  return res.data;
};

export const archiveProject = async (id) => {
  const res = await api.post(`timesheet/projects/${id}/archive`);
  return res.data;
};

export const getAssignableTargets = async () => {
  const res = await api.get("timesheet/assignable-targets");
  return res.data;
};

export const createJob = async (data) => {
  const res = await api.post("timesheet/jobs", data);
  return res.data;
};

export const getMyAssignedJobs = async (params) => {
  const res = await api.get("timesheet/jobs/assigned-to-me", { params });
  return res.data;
};

export const getJobsCreatedByMe = async (params) => {
  const res = await api.get("timesheet/jobs/created-by-me", { params });
  return res.data;
};

export const getJobById = async (id) => {
  const res = await api.get(`timesheet/jobs/${id}`);
  return res.data;
};

export const updateJobStatus = async ({ id, status }) => {
  const res = await api.patch(`timesheet/jobs/${id}/status`, { status });
  return res.data;
};

export const updateJob = async ({ id, data }) => {
  const res = await api.put(`timesheet/jobs/${id}`, data);
  return res.data;
};

export const toggleWorkItem = async ({ id, workItemId }) => {
  const res = await api.patch(`timesheet/jobs/${id}/work-items/${workItemId}`);
  return res.data;
};

export const archiveJob = async (id) => {
  const res = await api.post(`timesheet/jobs/${id}/archive`);
  return res.data;
};

export const getJobTimeLogs = async (jobId) => {
  const res = await api.get(`timesheet/jobs/${jobId}/time-logs`);
  return res.data;
};

export const logTime = async (data) => {
  const res = await api.post("timesheet/time-logs", data);
  return res.data;
};

export const getMyDayLog = async (date) => {
  const res = await api.get("timesheet/time-logs/day", { params: { date } });
  return res.data;
};

export const getMyWeekLog = async (week_start) => {
  const res = await api.get("timesheet/time-logs/week", { params: { week_start } });
  return res.data;
};

export const updateTimeLog = async ({ id, data }) => {
  const res = await api.put(`timesheet/time-logs/${id}`, data);
  return res.data;
};

export const deleteTimeLog = async (id) => {
  const res = await api.delete(`timesheet/time-logs/${id}`);
  return res.data;
};

export const startTimer = async (data) => {
  const res = await api.post("timesheet/timer/start", data);
  return res.data;
};

export const heartbeatTimer = async () => {
  const res = await api.post("timesheet/timer/heartbeat");
  return res.data;
};

export const pauseTimer = async () => {
  const res = await api.post("timesheet/timer/pause");
  return res.data;
};

export const resumeTimer = async () => {
  const res = await api.post("timesheet/timer/resume");
  return res.data;
};

export const stopTimer = async (data) => {
  const res = await api.post("timesheet/timer/stop", data);
  return res.data;
};

export const getActiveTimer = async () => {
  const res = await api.get("timesheet/timer/active");
  return res.data;
};

export const discardTimer = async () => {
  const res = await api.delete("timesheet/timer/discard");
  return res.data;
};

export const submitTimesheet = async (data) => {
  const res = await api.post("timesheet/timesheets/submit", data);
  return res.data;
};

export const getMyTimesheets = async () => {
  const res = await api.get("timesheet/timesheets/mine");
  return res.data;
};

export const getPendingApprovals = async () => {
  const res = await api.get("timesheet/timesheets/pending-approvals");
  return res.data;
};

export const approveTimesheet = async (data) => {
  const res = await api.post("timesheet/timesheets/approve", data);
  return res.data;
};

export const rejectTimesheet = async (data) => {
  const res = await api.post("timesheet/timesheets/reject", data);
  return res.data;
};

export const forwardTimesheet = async (data) => {
  const res = await api.post("timesheet/timesheets/forward", data);
  return res.data;
};

export const getTeamWorkloadHeatmap = async (week_start) => {
  const res = await api.get("timesheet/insights/workload-heatmap", { params: { week_start } });
  return res.data;
};

export const getOverrunRiskJobs = async () => {
  const res = await api.get("timesheet/insights/overrun-risk");
  return res.data;
};

export const getIdleJobs = async (days) => {
  const res = await api.get("timesheet/insights/idle-jobs", { params: { days } });
  return res.data;
};

export const getMyProductivitySummary = async (week_start) => {
  const res = await api.get("timesheet/insights/my-productivity", { params: { week_start } });
  return res.data;
};