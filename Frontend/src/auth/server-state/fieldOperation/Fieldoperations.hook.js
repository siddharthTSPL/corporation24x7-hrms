import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyFieldDuty,
  getFieldOverview,
  getFieldTeams,
  getFieldTeamOptions,
  getFieldSettings,
  getFieldRoute,
  createFieldTeam,
  startFieldDuty,
  updateFieldDutyStatus,
  checkoutFieldDuty,
  submitFieldCheckIn,
  takeOverDuty,
  updateFieldTeam,
  deleteFieldTeam,
  startFieldVisit,
  endFieldVisit,
  uploadVisitPhoto,
  updateFieldSettings,
  getFieldAssignments,
  createIndividualFieldAssignment,
  removeIndividualFieldAssignment,
  getMyAssignedActivities,
  assignFieldActivity,
  reassignFieldActivity,
  cancelFieldActivity,
  getFieldAuditLog,
  getMyFieldVisits,
  getAllFieldVisits,
} from "../../api/fieldOperations/fieldOperations.api";

export const useMyFieldDuty = (enabled) => {
  return useQuery({
    queryKey: ["field-my-duty"],
    queryFn: getMyFieldDuty,
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};

export const useFieldOverview = (enabled, filters = {}) => {
  return useQuery({
    queryKey: ["field-overview", filters],
    queryFn: () => getFieldOverview(filters),
    enabled,
    staleTime: 0,
    // Was 45s — far from "live". 10s matches the employee-side location
    // send interval so the manager's map stays close to real time.
    refetchInterval:
      enabled && !Object.values(filters).some(Boolean) ? 10000 : false,
    refetchOnWindowFocus: false,
  });
};

export const useFieldTeams = (enabled) => {
  return useQuery({
    queryKey: ["field-teams"],
    queryFn: getFieldTeams,
    enabled,
    staleTime: 1000 * 30,
  });
};

export const useFieldTeamOptions = () => {
  // Fetched on demand (opening "create team"), not on every page load.
  return useMutation({ mutationFn: getFieldTeamOptions });
};

export const useFieldSettings = (enabled) => {
  return useQuery({
    queryKey: ["field-settings"],
    queryFn: getFieldSettings,
    enabled,
    staleTime: 1000 * 30,
  });
};

// A past date's route never changes once the day is over, so only poll
// when looking at "today" (no explicit date, or the current date) — that's
// the one case where an employee could still be moving and the trail
// needs to keep drawing itself in like a live tracker.
const isTodayRoute = (date) => {
  if (!date) return true;
  const today = new Date().toISOString().slice(0, 10);
  return date === today;
};

export const useFieldRoute = (employeeId, date, enabled) => {
  const live = isTodayRoute(date);
  return useQuery({
    queryKey: ["field-route", employeeId, date || "today"],
    queryFn: () => getFieldRoute(employeeId, date),
    enabled: Boolean(employeeId) && enabled !== false,
    staleTime: live ? 0 : 1000 * 20,
    refetchInterval: Boolean(employeeId) && enabled !== false && live ? 10000 : false,
    refetchOnWindowFocus: false,
  });
};

export const useCreateFieldTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFieldTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-teams"] });
    },
  });
};

export const useUpdatedFieldTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, body }) => updateFieldTeam(teamId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["field-teams"] }),
  });
};

export const useDeleteFieldTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId) => deleteFieldTeam(teamId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["field-teams"] }),
  });
};

export const useStartFieldDuty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startFieldDuty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-my-duty"] });
    },
  });
};

export const useUpdateFieldDutyStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, status }) =>
      updateFieldDutyStatus(sessionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-my-duty"] });
    },
  });
};

export const useCheckoutFieldDuty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, body }) => checkoutFieldDuty(sessionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-my-duty"] });
    },
  });
};

export const useTakeOverDuty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: takeOverDuty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-my-duty"] });
    },
  });
};

export const useSubmitFieldCheckIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, body }) => submitFieldCheckIn(sessionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-my-duty"] });
    },
  });
};

export const useStartFieldVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, body }) => startFieldVisit(sessionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-overview"] });
      queryClient.invalidateQueries({ queryKey: ["field-visits"] });
    },
  });
};

export const useEndFieldVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, body }) => endFieldVisit(visitId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-overview"] });
      queryClient.invalidateQueries({ queryKey: ["field-visits"] });
    },
  });
};

export const useUploadVisitPhoto = () => {
  return useMutation({
    mutationFn: ({ visitId, file }) => uploadVisitPhoto(visitId, file),
  });
};

export const useUpdateFieldSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateFieldSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-settings"] });
      // Turning Field Operations on/off for the org changes whether the
      // nav item shows at all — refresh the same data Sidebar reads.
      queryClient.invalidateQueries({ queryKey: ["plan-features"] });
    },
  });
};

export const useFieldAssignments = (enabled) =>
  useQuery({
    queryKey: ["field-assignments"],
    queryFn: getFieldAssignments,
    enabled,
    staleTime: 1000 * 30,
  });

export const useCreateIndividualFieldAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createIndividualFieldAssignment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["field-assignments"] }),
  });
};

export const useRemoveIndividualFieldAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeIndividualFieldAssignment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["field-assignments"] }),
  });
};

export const useMyFieldVisits = (enabled, filters = {}) =>
  useQuery({
    queryKey: ["field-my-visits", filters],
    queryFn: () => getMyFieldVisits(filters),
    enabled,
    staleTime: 1000 * 15,
  });

export const useMyAssignedActivities = (enabled) =>
  useQuery({
    queryKey: ["field-assigned-activities", "mine"],
    queryFn: getMyAssignedActivities,
    enabled,
    staleTime: 0,
    refetchInterval: enabled ? 45000 : false,
  });

const invalidateActivities = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ["field-overview"] });
  queryClient.invalidateQueries({ queryKey: ["field-assigned-activities"] });
  queryClient.invalidateQueries({ queryKey: ["field-visits"] });
};

export const useAssignFieldActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignFieldActivity,
    onSuccess: () => invalidateActivities(queryClient),
  });
};

export const useReassignFieldActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, body }) => reassignFieldActivity(activityId, body),
    onSuccess: () => invalidateActivities(queryClient),
  });
};

export const useCancelFieldActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, body }) => cancelFieldActivity(activityId, body),
    onSuccess: () => invalidateActivities(queryClient),
  });
};

export const useFieldAuditLog = (enabled, page = 1, limit = 25) =>
  useQuery({
    queryKey: ["field-audit-log", page, limit],
    queryFn: () => getFieldAuditLog({ page, limit }),
    enabled,
    staleTime: 1000 * 15,
  });


export const useAllFieldVisits = (enabled, filters = {}) =>
  useQuery({
    queryKey: ["field-visits", filters],
    queryFn: () => getAllFieldVisits(filters),
    enabled,
    staleTime: 1000 * 15,
    placeholderData: {
      success: true,
      visits: [],
      total: 0,
      page: 1,
      limit: 8,
      totalPages: 0,
    },
  });