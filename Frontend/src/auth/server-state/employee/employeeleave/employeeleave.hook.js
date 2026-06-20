import { applyLeave, getAllLeaves, deleteLeave, editLeave, getAllLeaveHistory } from "../../../api/employeeapi/leave/em.leave.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useApplyLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["applyLeave"],
    mutationFn: applyLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leaveHistory"] });
    },
  });
};

export const useGetAllLeaves = () => {
  return useQuery({
    queryKey: ["leaves"],
    queryFn: getAllLeaves,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useDeleteLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteLeave"],
    mutationFn: deleteLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leaveHistory"] });
    },
  });
};

export const useEditLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["editLeave"],
    mutationFn: editLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leaveHistory"] });
    },
  });
};

export const useGetAllLeaveHistory = () => {
  return useQuery({
    queryKey: ["leaveHistory"],
    queryFn: getAllLeaveHistory,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};