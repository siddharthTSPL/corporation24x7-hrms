import {
  applyLeaveManager, getMyLeavesManager, getAllManagerLeaves, getLeaveHistory,
  acceptLeaveRequest, rejectLeaveRequest, forwardLeaveToReportingManager,
  getForwardedLeavesManager, acceptForwardedLeave, rejectForwardedLeave, forwardLeaveUpChain,
  editLeaveManager, deleteLeaveManager,
} from "../../../api/managerapi/leave/ma.leave.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useApplyLeaveManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyLeaveManager,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myLeavesManager"] });
      queryClient.invalidateQueries({ queryKey: ["leaveHistory"] });
    },
  });
};

export const useGetMyLeavesManager = () => {
  return useQuery({
    queryKey: ["myLeavesManager"],
    queryFn: getMyLeavesManager,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useEditLeaveManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editLeaveManager,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myLeavesManager"] });
      queryClient.invalidateQueries({ queryKey: ["leaveHistory"] });
    },
  });
};

export const useDeleteLeaveManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLeaveManager,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myLeavesManager"] });
      queryClient.invalidateQueries({ queryKey: ["leaveHistory"] });
    },
  });
};

export const useGetAllManagerLeaves = () => {
  return useQuery({
    queryKey: ["allManagerLeaves"],
    queryFn: getAllManagerLeaves,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetLeaveHistory = () => {
  return useQuery({
    queryKey: ["leaveHistory"],
    queryFn: getLeaveHistory,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useAcceptLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allManagerLeaves"] });
    },
  });
};

export const useRejectLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allManagerLeaves"] });
    },
  });
};

export const useForwardLeaveToReportingManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: forwardLeaveToReportingManager,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allManagerLeaves"] });
    },
  });
};

export const useGetForwardedLeavesManager = () => {
  return useQuery({
    queryKey: ["forwardedLeavesManager"],
    queryFn: getForwardedLeavesManager,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useAcceptForwardedLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptForwardedLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forwardedLeavesManager"] });
    },
  });
};

export const useRejectForwardedLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectForwardedLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forwardedLeavesManager"] });
    },
  });
};

export const useForwardLeaveUpChain = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: forwardLeaveUpChain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forwardedLeavesManager"] });
    },
  });
};