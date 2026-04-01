import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loginAdmin,
  registerAdmin,
  logoutAdmin,
  getMeAdmin,
} from "../../api/adminapi/auth/ad.auth.api";

export const useRegisterAdmin = () => {
  return useMutation({
    mutationFn: registerAdmin,
  });
};

export const useAdminLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginAdmin,
    onSuccess: (data) => {
      queryClient.setQueryData(["admin"], data.admin || data);
    },
  });
};

export const useGetMeAdmin = () => {
  return useQuery({
    queryKey: ["admin"],
    queryFn: getMeAdmin,
    staleTime: 0, 
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useAdminLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutAdmin,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["admin"] });
    },
  });
};