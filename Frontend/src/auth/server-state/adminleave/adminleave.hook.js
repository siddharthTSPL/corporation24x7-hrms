import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllLeaves, acceptLeave, rejectLeave, applyleave, getLeavehistory } from "../../api/adminapi/leave/ad.leave.api";

export const useGetForwardedLeaves = () => {
  return useQuery({
    queryKey: ["AllLeaves"],
    queryFn: getAllLeaves,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useAcceptLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["AllLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["employeeStats"] });
    },
  });
};

export const useRejectLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["AllLeaves"] });
    },
  });
};

export const useAdminApplyLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyleave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["AllLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["leaveHistory"] });
    },
  });
};

export const useAdminGetMyLeaveHistory = () => {
  return useQuery({
    queryKey: ["leaveHistory"],
    queryFn: getLeavehistory,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};