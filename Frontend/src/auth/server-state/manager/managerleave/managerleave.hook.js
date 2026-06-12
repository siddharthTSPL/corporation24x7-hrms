import {
  acceptLeaveRequest,
  rejectLeaveRequest,
  forwardLeaveToAdmin,
  applyLeaveManager,
  getMyLeavesManager,
  getAllManagerLeaves,
  getForwardedLeavesManager,
  acceptForwardedLeave,
  rejectForwardedLeave,
} from "../../../api/managerapi/leave/ma.leave.api";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useApplyLeaveManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyLeaveManager,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myLeavesManager"] }),
  });
};

export const useAcceptLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptLeaveRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allManagerLeaves"] }),
  });
};

export const useRejectLeaveRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectLeaveRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allManagerLeaves"] }),
  });
};

export const useForwardLeaveToAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: forwardLeaveToAdmin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["allManagerLeaves"] }),
  });
};

export const useGetMyLeavesManager = () => {
  return useQuery({
    queryKey: ["myLeavesManager"],
    queryFn: getMyLeavesManager,
  });
};

export const useGetAllManagerLeaves = () => {
  return useQuery({
    queryKey: ["allManagerLeaves"],
    queryFn: getAllManagerLeaves,
  });
};


export const useGetForwardedLeavesManager = () => {
  return useQuery({
    queryKey: ["forwardedLeavesManager"],
    queryFn: getForwardedLeavesManager,
  });
};

export const useAcceptForwardedLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptForwardedLeave,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forwardedLeavesManager"] }),
  });
};

export const useRejectForwardedLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectForwardedLeave,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forwardedLeavesManager"] }),
  });
};