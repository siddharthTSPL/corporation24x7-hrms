import {
  adminApplyWFH,
  adminGetMyWFH,
  adminGetPendingWFH,
  adminApproveWFH,
  adminRejectWFH,
} from "../../api/adminapi/WFH/adminwfh.api";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminApplyWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApplyWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminMyWFH"] });
    },
  });
};

export const useAdminGetMyWFH = () =>
  useQuery({
    queryKey: ["adminMyWFH"],
    queryFn: adminGetMyWFH,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

export const useAdminGetPendingWFH = () =>
  useQuery({
    queryKey: ["adminPendingWFH"],
    queryFn: adminGetPendingWFH,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

export const useAdminGetForwardedWFH = () =>
  useQuery({
    queryKey: ["adminPendingWFH"],
    queryFn: adminGetPendingWFH,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

export const useAdminApproveWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApproveWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingWFH"] });
    },
  });
};

export const useAdminRejectWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminRejectWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingWFH"] });
    },
  });
};

export const useAdminApproveForwardedWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApproveWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingWFH"] });
    },
  });
};

export const useAdminRejectForwardedWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminRejectWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPendingWFH"] });
    },
  });
};