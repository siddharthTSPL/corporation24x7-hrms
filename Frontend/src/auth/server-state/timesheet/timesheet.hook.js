import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject, getMyProjects, getProjectById, updateProject,
  addProjectMembers, removeProjectMember, archiveProject,
  getAssignableTargets, createJob, getMyAssignedJobs, getJobsCreatedByMe,
  getJobById, updateJobStatus, updateJob, toggleWorkItem, archiveJob,
  getJobTimeLogs, logTime, getMyDayLog, getMyWeekLog, updateTimeLog, deleteTimeLog,
  startTimer, heartbeatTimer, pauseTimer, resumeTimer, stopTimer, getActiveTimer, discardTimer,
  submitTimesheet, recallTimesheet, getMyTimesheets, getPendingApprovals,
  approveTimesheet, rejectTimesheet, forwardTimesheet,
  getTeamWorkloadHeatmap, getOverrunRiskJobs, getIdleJobs, getMyProductivitySummary,
  getOrgAllTimeLogs, getOrgAllTimesheets, getOrgAllJobs, getJobTimeline,
  getTimesheetDetailedReport,
} from "../../api/timesheet/timesheet.api";

// ─── Projects ─────────────────────────────────────────────────────────────────

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsProjects"] });
    },
  });
};

export const useMyProjects = () =>
  useQuery({
    queryKey: ["tsProjects"],
    queryFn: getMyProjects,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const useProjectById = (id) =>
  useQuery({
    queryKey: ["tsProject", id],
    queryFn: () => getProjectById(id),
    enabled: !!id,
  });

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProject,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tsProjects"] });
      queryClient.invalidateQueries({ queryKey: ["tsProject", variables.id] });
    },
  });
};

export const useAddProjectMembers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addProjectMembers,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tsProject", variables.id] });
    },
  });
};

export const useRemoveProjectMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeProjectMember,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tsProject", variables.id] });
    },
  });
};

export const useArchiveProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsProjects"] });
    },
  });
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

// Each target: { id, model, name, email, role }
// Render in dropdown as: `${t.name} (${t.role})`
export const useAssignableTargets = () =>
  useQuery({
    queryKey: ["tsAssignableTargets"],
    queryFn: getAssignableTargets,
    staleTime: 60000,
    refetchOnMount: true,
  });

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsJobsCreatedByMe"] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllJobs"] });
    },
  });
};

// Jobs assigned TO the current user — the source for the timer job dropdown
export const useMyAssignedJobs = (params) =>
  useQuery({
    queryKey: ["tsJobsAssignedToMe", params],
    queryFn: () => getMyAssignedJobs(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const useJobsCreatedByMe = (params) =>
  useQuery({
    queryKey: ["tsJobsCreatedByMe", params],
    queryFn: () => getJobsCreatedByMe(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const useJobById = (id) =>
  useQuery({
    queryKey: ["tsJob", id],
    queryFn: () => getJobById(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });

export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateJobStatus,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tsJobsAssignedToMe"] });
      queryClient.invalidateQueries({ queryKey: ["tsJobsCreatedByMe"] });
      queryClient.invalidateQueries({ queryKey: ["tsJob", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllJobs"] });
    },
  });
};

export const useUpdateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateJob,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tsJobsCreatedByMe"] });
      queryClient.invalidateQueries({ queryKey: ["tsJob", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllJobs"] });
    },
  });
};

export const useToggleWorkItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleWorkItem,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tsJob", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["tsJobsAssignedToMe"] });
    },
  });
};

export const useArchiveJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsJobsCreatedByMe"] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllJobs"] });
    },
  });
};

export const useJobTimeLogs = (jobId) =>
  useQuery({
    queryKey: ["tsJobTimeLogs", jobId],
    queryFn: () => getJobTimeLogs(jobId),
    enabled: !!jobId,
    staleTime: 0,
    refetchOnMount: true,
  });

// ─── Time logs ────────────────────────────────────────────────────────────────

export const useLogTime = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logTime,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsDayLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsWeekLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsJobsAssignedToMe"] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllTimeLogs"] });
    },
  });
};

export const useMyDayLog = (date) =>
  useQuery({
    queryKey: ["tsDayLog", date],
    queryFn: () => getMyDayLog(date),
    enabled: !!date,
    staleTime: 0,
    refetchOnMount: true,
  });

export const useMyWeekLog = (weekStart) =>
  useQuery({
    queryKey: ["tsWeekLog", weekStart],
    queryFn: () => getMyWeekLog(weekStart),
    enabled: !!weekStart,
    staleTime: 0,
    refetchOnMount: true,
  });

export const useUpdateTimeLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTimeLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsDayLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsWeekLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllTimeLogs"] });
    },
  });
};

export const useDeleteTimeLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTimeLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsDayLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsWeekLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllTimeLogs"] });
    },
  });
};

// ─── Timer ────────────────────────────────────────────────────────────────────

export const useStartTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startTimer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsActiveTimer"] });
    },
  });
};

// Fire this in a useEffect with setInterval(mutate, 60000) — exactly 60 000 ms
export const useHeartbeatTimer = () =>
  useMutation({ mutationFn: heartbeatTimer });

export const usePauseTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pauseTimer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsActiveTimer"] });
    },
  });
};

export const useResumeTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resumeTimer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsActiveTimer"] });
    },
  });
};

export const useStopTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: stopTimer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsActiveTimer"] });
      queryClient.invalidateQueries({ queryKey: ["tsDayLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsWeekLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsJobsAssignedToMe"] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllTimeLogs"] });
    },
  });
};

// Polls every 30 s to keep the timer widget in sync.
// Pass refetchInterval: false when the timer page is not mounted.
export const useActiveTimer = (options = {}) =>
  useQuery({
    queryKey: ["tsActiveTimer"],
    queryFn: getActiveTimer,
    refetchInterval: options.refetchInterval ?? 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

export const useDiscardTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: discardTimer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsActiveTimer"] });
    },
  });
};

// ─── Timesheets ───────────────────────────────────────────────────────────────

export const useSubmitTimesheet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitTimesheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsMyTimesheets"] });
      queryClient.invalidateQueries({ queryKey: ["tsWeekLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllTimesheets"] });
    },
  });
};

// Recall a submitted-but-not-approved timesheet back to draft so the user can edit
export const useRecallTimesheet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recallTimesheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsMyTimesheets"] });
      queryClient.invalidateQueries({ queryKey: ["tsWeekLog"] });
    },
  });
};

export const useMyTimesheets = () =>
  useQuery({
    queryKey: ["tsMyTimesheets"],
    queryFn: getMyTimesheets,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const usePendingApprovals = () =>
  useQuery({
    queryKey: ["tsPendingApprovals"],
    queryFn: getPendingApprovals,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const useApproveTimesheet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveTimesheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsPendingApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllTimesheets"] });
    },
  });
};

export const useRejectTimesheet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectTimesheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsPendingApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllTimesheets"] });
    },
  });
};

export const useForwardTimesheet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: forwardTimesheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsPendingApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["tsOrgAllTimesheets"] });
    },
  });
};

// ─── Insights ─────────────────────────────────────────────────────────────────

export const useTeamWorkloadHeatmap = (weekStart) =>
  useQuery({
    queryKey: ["tsWorkloadHeatmap", weekStart],
    queryFn: () => getTeamWorkloadHeatmap(weekStart),
    enabled: !!weekStart,
  });

export const useOverrunRiskJobs = () =>
  useQuery({
    queryKey: ["tsOverrunRisk"],
    queryFn: getOverrunRiskJobs,
  });

export const useIdleJobs = (days) =>
  useQuery({
    queryKey: ["tsIdleJobs", days],
    queryFn: () => getIdleJobs(days),
  });

export const useMyProductivitySummary = (weekStart) =>
  useQuery({
    queryKey: ["tsProductivitySummary", weekStart],
    queryFn: () => getMyProductivitySummary(weekStart),
    enabled: !!weekStart,
  });

// ─── Admin / SuperAdmin: org-wide visibility ──────────────────────────────────

// params: { date?, week_start?, user_id?, job_id?, status? }
export const useOrgAllTimeLogs = (params = {}) =>
  useQuery({
    queryKey: ["tsOrgAllTimeLogs", params],
    queryFn: () => getOrgAllTimeLogs(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

// params: { status?, owner_model?, week_start? }
export const useOrgAllTimesheets = (params = {}) =>
  useQuery({
    queryKey: ["tsOrgAllTimesheets", params],
    queryFn: () => getOrgAllTimesheets(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

// All jobs org-wide with enriched assigned_to_info / assigned_by_info
// params: { status?, assigned_to?, assigned_to_model?, project?, priority? }
export const useOrgAllJobs = (params = {}) =>
  useQuery({
    queryKey: ["tsOrgAllJobs", params],
    queryFn: () => getOrgAllJobs(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

// Full timeline for one job — { job, total_minutes, contributor_summary, logs }
export const useJobTimeline = (id) =>
  useQuery({
    queryKey: ["tsJobTimeline", id],
    queryFn: () => getJobTimeline(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });

// Detailed, filterable Time Sheet Report (Admin/SuperAdmin) — one row per
// time-log entry (+ "Off" placeholder rows for un-logged week-off days).
// params: { from?, to?, week_start?, employee_id?, employee_model?,
//           department?, designation?, project_id?, job_id?, status?, billable? }
export const useTimesheetDetailedReport = (params = {}) =>
  useQuery({
    queryKey: ["tsTimesheetDetailedReport", params],
    queryFn: () => getTimesheetDetailedReport(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });