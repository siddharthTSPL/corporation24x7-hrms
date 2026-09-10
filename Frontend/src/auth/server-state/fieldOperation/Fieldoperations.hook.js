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
  startFieldVisit,
  endFieldVisit,
  uploadVisitPhoto,
  updateFieldSettings,
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

export const useFieldOverview = (enabled) => {
  return useQuery({
    queryKey: ["field-overview"],
    queryFn: getFieldOverview,
    enabled,
    staleTime: 0,
    refetchInterval: enabled ? 45000 : false,
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

export const useFieldRoute = (employeeId, date, enabled) => {
  return useQuery({
    queryKey: ["field-route", employeeId, date || "today"],
    queryFn: () => getFieldRoute(employeeId, date),
    enabled: Boolean(employeeId) && enabled !== false,
    staleTime: 1000 * 20,
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

export const useStartFieldVisit = () => {
  return useMutation({
    mutationFn: ({ sessionId, body }) => startFieldVisit(sessionId, body),
  });
};

export const useEndFieldVisit = () => {
  return useMutation({
    mutationFn: ({ visitId, body }) => endFieldVisit(visitId, body),
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
