import {
  managerApplyWFH,
  managerGetMyWFH,
  managerGetPendingWFH,
  managerGetAllTeamWFH,
  managerApproveWFH,
  managerRejectWFH,
  managerForwardWFH,
  managerGetForwardedWFH,
  managerApproveForwardedWFH,
  managerRejectForwardedWFH,
} from "../../../api/managerapi/WFH/mawfh.api";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export const useManagerApplyWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: managerApplyWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managerWFH"] });
    },
  });
};

export const useManagerGetMyWFH = () =>
  useQuery({ queryKey: ["managerWFH"], queryFn: managerGetMyWFH });

export const useManagerGetPendingWFH = () =>
  useQuery({ queryKey: ["pendingWFH"], queryFn: managerGetPendingWFH });

export const useManagerGetAllTeamWFH = () =>
  useQuery({ queryKey: ["teamWFH"], queryFn: managerGetAllTeamWFH });

export const useManagerApproveWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: managerApproveWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingWFH"] });
      queryClient.invalidateQueries({ queryKey: ["teamWFH"] });
    },
  });
};

export const useManagerRejectWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: managerRejectWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingWFH"] });
      queryClient.invalidateQueries({ queryKey: ["teamWFH"] });
    },
  });
};

export const useManagerForwardWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: managerForwardWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingWFH"] });
      queryClient.invalidateQueries({ queryKey: ["forwardedWFH"] });
    },
  });
};

export const useManagerGetForwardedWFH = () =>
  useQuery({ queryKey: ["forwardedWFH"], queryFn: managerGetForwardedWFH });

export const useManagerApproveForwardedWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: managerApproveForwardedWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forwardedWFH"] });
      queryClient.invalidateQueries({ queryKey: ["teamWFH"] });
    },
  });
};

export const useManagerRejectForwardedWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: managerRejectForwardedWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forwardedWFH"] });
    },
  });
};