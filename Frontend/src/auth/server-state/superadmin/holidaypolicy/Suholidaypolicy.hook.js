import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPolicySuperAdmin,
  setPolicySuperAdmin,
  createGroupSuperAdmin,
  listGroupsSuperAdmin,
  addGroupMembersSuperAdmin,
  removeGroupMemberSuperAdmin,
  setWeekScheduleSuperAdmin,
  bulkSetWeekScheduleSuperAdmin,
  setWeekScheduleForMonthSuperAdmin,
  getWeekSchedulesSuperAdmin,
  addHolidaySuperAdmin,
  bulkAddHolidaysSuperAdmin,
  bulkEditHolidaysSuperAdmin,
  bulkDeleteHolidaysSuperAdmin,
  deleteHolidaySuperAdmin,
  listHolidaysSuperAdmin,
  setEmployeeOverrideSuperAdmin,
  removeEmployeeOverrideSuperAdmin,
  getEmployeeMonthlyReportSuperAdmin,
} from "../../../api/superadmin/holidaypolicy/Suholidaypolicy.api";

// ── Policy ───────────────────────────────────────────────────────────────────

export const useGetPolicySuperAdmin = () => {
  return useQuery({
    queryKey: ["superadmin-holiday-policy"],
    queryFn: getPolicySuperAdmin,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useSetPolicySuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setPolicySuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy"] });
    },
  });
};

// ── Groups ───────────────────────────────────────────────────────────────────

export const useListGroupsSuperAdmin = (params) => {
  return useQuery({
    queryKey: ["superadmin-holiday-policy-groups", params],
    queryFn: () => listGroupsSuperAdmin(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useCreateGroupSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGroupSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy-groups"] });
    },
  });
};

export const useAddGroupMembersSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, data }) => addGroupMembersSuperAdmin(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy-groups"] });
    },
  });
};

export const useRemoveGroupMemberSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, employee }) => removeGroupMemberSuperAdmin(groupId, employee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy-groups"] });
    },
  });
};

// ── Week Schedule ────────────────────────────────────────────────────────────

export const useGetWeekSchedulesSuperAdmin = (params) => {
  return useQuery({
    queryKey: ["superadmin-holiday-policy-week-schedule", params],
    queryFn: () => getWeekSchedulesSuperAdmin(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useSetWeekScheduleSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setWeekScheduleSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy-week-schedule"] });
    },
  });
};

export const useBulkSetWeekScheduleSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkSetWeekScheduleSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy-week-schedule"] });
    },
  });
};

export const useSetWeekScheduleForMonthSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setWeekScheduleForMonthSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy-week-schedule"] });
    },
  });
};

// ── Holiday Calendar ─────────────────────────────────────────────────────────

export const useListHolidaysSuperAdmin = (params) => {
  return useQuery({
    queryKey: ["superadmin-holidays", params],
    queryFn: () => listHolidaysSuperAdmin(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useAddHolidaySuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addHolidaySuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holidays"] });
    },
  });
};

export const useBulkAddHolidaysSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkAddHolidaysSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holidays"] });
    },
  });
};

export const useBulkEditHolidaysSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkEditHolidaysSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holidays"] });
    },
  });
};

export const useBulkDeleteHolidaysSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkDeleteHolidaysSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holidays"] });
    },
  });
};

export const useDeleteHolidaySuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHolidaySuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holidays"] });
    },
  });
};

// ── Employee Override ────────────────────────────────────────────────────────

export const useSetEmployeeOverrideSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setEmployeeOverrideSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy-report"] });
    },
  });
};

export const useRemoveEmployeeOverrideSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeEmployeeOverrideSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-holiday-policy-report"] });
    },
  });
};

// ── Monthly Report ───────────────────────────────────────────────────────────

export const useGetEmployeeMonthlyReportSuperAdmin = (params) => {
  return useQuery({
    queryKey: ["superadmin-holiday-policy-report", params],
    queryFn: () => getEmployeeMonthlyReportSuperAdmin(params),
    enabled: !!params?.employee_id && !!params?.month && !!params?.year,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};