import {
  verifyManager,
  loginManager,
  logoutManager,
  updateManagerPassword,
  firstLoginPasswordChange,
  getMeManager,
} from "../../../api/managerapi/auth/ma.auth.api";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useVerifyManager = (token) => {
  return useQuery({
    queryKey: ["verifyManager", token],
    queryFn: () => verifyManager(token),
    enabled: !!token,
  });
};

export const useLoginManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["loginManager"],
    mutationFn: loginManager,
    onSuccess: (data) => {
      queryClient.setQueryData(["manager"], data.manager || data);
    },
  });
};

export const useFirstLoginPasswordChange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["firstLoginPasswordChange"],
    mutationFn: firstLoginPasswordChange,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["manager"] });
    },
  });
};

export const useUpdateManagerPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateManagerPassword"],
    mutationFn: updateManagerPassword,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["manager"] });
    },
  });
};

export const useGetMeManager = () => {
  return useQuery({
    queryKey: ["meManager"],
    queryFn: getMeManager,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    select: (data) => ({
      manager: data.manager,
      leavebalance: data.leavebalance,
      reviews: data.reviews,
    }),
  });
};

export const useLogoutManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutManager,
    onSuccess: () => {
      localStorage.removeItem("role");
      queryClient.clear();
    },
  });
};