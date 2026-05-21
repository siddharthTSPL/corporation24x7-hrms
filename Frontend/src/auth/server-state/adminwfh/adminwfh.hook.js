import {
  adminApplyWFH,
  adminGetMyWFH,
  adminGetForwardedWFH,
  adminApproveForwardedWFH,
  adminRejectForwardedWFH,
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

export const useAdminGetForwardedWFH = () =>
  useQuery({
    queryKey: ["adminForwardedWFH"],
    queryFn: adminGetForwardedWFH,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

export const useAdminApproveForwardedWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApproveForwardedWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminForwardedWFH"] });
    },
  });
};

export const useAdminRejectForwardedWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminRejectForwardedWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminForwardedWFH"] });
    },
  });
};