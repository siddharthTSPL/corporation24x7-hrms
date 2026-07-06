import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllShiftsSuperAdmin,
  createShiftSuperAdmin,
  updateShiftSuperAdmin,
  setDefaultShiftSuperAdmin,
  deleteShiftSuperAdmin,
  assignShiftToUserSuperAdmin,
  getShiftHistorySuperAdmin,
  editShiftAssignmentSuperAdmin,
  deleteShiftAssignmentSuperAdmin,
} from "../../../api/superadmin/shift/Sushift.api";

export const useGetAllShiftsSuperAdmin = () => {
  return useQuery({
    queryKey: ["superadmin-shifts"],
    queryFn: getAllShiftsSuperAdmin,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useCreateShiftSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShiftSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
    },
  });
};

export const useUpdateShiftSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateShiftSuperAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
    },
  });
};

export const useSetDefaultShiftSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDefaultShiftSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
    },
  });
};

export const useDeleteShiftSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShiftSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
    },
  });
};

export const useAssignShiftToUserSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignShiftToUserSuperAdmin,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
      // also invalidate wherever you list employees/managers/admins
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      if (variables?.employee_id) {
        queryClient.invalidateQueries({ queryKey: ["superadmin-shift-history", variables.employee_id] });
      }
    },
  });
};

// History of every assign/reassign made to one person. Pass role
// ("employee" | "manager" | "admin") alongside their id.
export const useGetShiftHistorySuperAdmin = (employee_id, role) => {
  return useQuery({
    queryKey: ["superadmin-shift-history", employee_id, role],
    queryFn: () => getShiftHistorySuperAdmin(employee_id, role),
    enabled: Boolean(employee_id && role),
    staleTime: 0,
  });
};

export const useEditShiftAssignmentSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ historyId, data }) => editShiftAssignmentSuperAdmin(historyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-shift-history"] });
    },
  });
};

export const useDeleteShiftAssignmentSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (historyId) => deleteShiftAssignmentSuperAdmin(historyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-shift-history"] });
    },
  });
};