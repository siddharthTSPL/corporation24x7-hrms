import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject, getMyProjects, getProjectById, updateProject,
  addProjectMembers, removeProjectMember, archiveProject,
  getAssignableTargets, createJob, getMyAssignedJobs, getJobsCreatedByMe,
  getJobById, updateJobStatus, updateJob, toggleWorkItem, archiveJob,
  getJobTimeLogs, logTime, getMyDayLog, getMyWeekLog, updateTimeLog, deleteTimeLog,
  startTimer, heartbeatTimer, pauseTimer, resumeTimer, stopTimer, getActiveTimer, discardTimer,
  submitTimesheet, getMyTimesheets, getPendingApprovals, approveTimesheet, rejectTimesheet, forwardTimesheet,
  getTeamWorkloadHeatmap, getOverrunRiskJobs, getIdleJobs, getMyProductivitySummary,
} from "../../api/timesheet/timesheet.api";

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

export const useAssignableTargets = () =>
  useQuery({
    queryKey: ["tsAssignableTargets"],
    queryFn: getAssignableTargets,
    staleTime: 60000,
  });

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsJobsCreatedByMe"] });
    },
  });
};

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
  });

export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateJobStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsJobsAssignedToMe"] });
      queryClient.invalidateQueries({ queryKey: ["tsJobsCreatedByMe"] });
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
    },
  });
};

export const useJobTimeLogs = (jobId) =>
  useQuery({
    queryKey: ["tsJobTimeLogs", jobId],
    queryFn: () => getJobTimeLogs(jobId),
    enabled: !!jobId,
  });

export const useLogTime = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logTime,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsDayLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsWeekLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsJobsAssignedToMe"] });
    },
  });
};

export const useMyDayLog = (date) =>
  useQuery({
    queryKey: ["tsDayLog", date],
    queryFn: () => getMyDayLog(date),
    enabled: !!date,
  });

export const useMyWeekLog = (weekStart) =>
  useQuery({
    queryKey: ["tsWeekLog", weekStart],
    queryFn: () => getMyWeekLog(weekStart),
    enabled: !!weekStart,
  });

export const useUpdateTimeLog = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTimeLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsDayLog"] });
      queryClient.invalidateQueries({ queryKey: ["tsWeekLog"] });
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
    },
  });
};

export const useStartTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startTimer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsActiveTimer"] });
    },
  });
};

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
    },
  });
};

export const useActiveTimer = (options = {}) =>
  useQuery({
    queryKey: ["tsActiveTimer"],
    queryFn: getActiveTimer,
    refetchInterval: options.refetchInterval ?? 30000,
    refetchOnWindowFocus: true,
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

export const useSubmitTimesheet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitTimesheet,
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
    },
  });
};

export const useRejectTimesheet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectTimesheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsPendingApprovals"] });
    },
  });
};

export const useForwardTimesheet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: forwardTimesheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tsPendingApprovals"] });
    },
  });
};

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