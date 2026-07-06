import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllShifts,
  createShift,
  updateShift,
  setDefaultShift,
  deleteShift,
  assignShiftToUser,
  getShiftHistory,
  editShiftAssignment,
  deleteShiftAssignment,
} from "../../api/shift/shift.api";

export const useGetAllShifts = () => {
  return useQuery({
    queryKey: ["admin-shifts"],
    queryFn: getAllShifts,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useCreateShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
    },
  });
};

export const useUpdateShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
    },
  });
};

export const useSetDefaultShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDefaultShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
    },
  });
};

export const useDeleteShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
    },
  });
};

export const useAssignShiftToUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignShiftToUser,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
      // also invalidate wherever you list employees/managers/admins
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      if (variables?.employee_id) {
        queryClient.invalidateQueries({ queryKey: ["shift-history", variables.employee_id] });
      }
    },
  });
};

// History of every assign/reassign made to one person. Pass role
// ("employee" | "manager" | "admin") alongside their id.
export const useGetShiftHistory = (employee_id, role) => {
  return useQuery({
    queryKey: ["shift-history", employee_id, role],
    queryFn: () => getShiftHistory(employee_id, role),
    enabled: Boolean(employee_id && role),
    staleTime: 0,
  });
};

export const useEditShiftAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ historyId, data }) => editShiftAssignment(historyId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      const employeeId = data?.history?.employee_id;
      if (employeeId) {
        queryClient.invalidateQueries({ queryKey: ["shift-history", employeeId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["shift-history"] });
      }
    },
  });
};

export const useDeleteShiftAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (historyId) => deleteShiftAssignment(historyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["shift-history"] });
    },
  });
};