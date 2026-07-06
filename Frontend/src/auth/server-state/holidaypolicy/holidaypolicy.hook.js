import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPolicy,
  setPolicy,
  createGroup,
  listGroups,
  addGroupMembers,
  removeGroupMember,
  setWeekSchedule,
  bulkSetWeekSchedule,
  setWeekScheduleForMonth,
  getWeekSchedules,
  addHoliday,
  bulkAddHolidays,
  bulkEditHolidays,
  bulkDeleteHolidays,
  deleteHoliday,
  listHolidays,
  setEmployeeOverride,
  removeEmployeeOverride,
  getEmployeeMonthlyReport,
} from "../../api/holidaypolicy/holidaypolicy.api";

// ── Policy ───────────────────────────────────────────────────────────────────

export const useGetPolicy = () => {
  return useQuery({
    queryKey: ["holiday-policy"],
    queryFn: getPolicy,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useSetPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday-policy"] });
    },
  });
};

// ── Groups ───────────────────────────────────────────────────────────────────

export const useListGroups = (params) => {
  return useQuery({
    queryKey: ["holiday-policy-groups", params],
    queryFn: () => listGroups(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday-policy-groups"] });
    },
  });
};

export const useAddGroupMembers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, data }) => addGroupMembers(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday-policy-groups"] });
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, employee }) => removeGroupMember(groupId, employee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday-policy-groups"] });
    },
  });
};

// ── Week Schedule ────────────────────────────────────────────────────────────

export const useGetWeekSchedules = (params) => {
  return useQuery({
    queryKey: ["holiday-policy-week-schedule", params],
    queryFn: () => getWeekSchedules(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useSetWeekSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setWeekSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday-policy-week-schedule"] });
    },
  });
};

export const useBulkSetWeekSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkSetWeekSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday-policy-week-schedule"] });
    },
  });
};

export const useSetWeekScheduleForMonth = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setWeekScheduleForMonth,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday-policy-week-schedule"] });
    },
  });
};

// ── Holiday Calendar ─────────────────────────────────────────────────────────

export const useListHolidays = (params) => {
  return useQuery({
    queryKey: ["holidays", params],
    queryFn: () => listHolidays(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useAddHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
};

export const useBulkAddHolidays = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkAddHolidays,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
};

export const useBulkEditHolidays = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkEditHolidays,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
};

export const useBulkDeleteHolidays = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkDeleteHolidays,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
};

// ── Employee Override ────────────────────────────────────────────────────────

export const useSetEmployeeOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setEmployeeOverride,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday-policy-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["holiday-policy-report"] });
    },
  });
};

export const useRemoveEmployeeOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeEmployeeOverride,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holiday-policy-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["holiday-policy-report"] });
    },
  });
};

// ── Monthly Report ───────────────────────────────────────────────────────────

export const useGetEmployeeMonthlyReport = (params) => {
  return useQuery({
    queryKey: ["holiday-policy-report", params],
    queryFn: () => getEmployeeMonthlyReport(params),
    enabled: !!params?.employee_id && !!params?.month && !!params?.year,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};