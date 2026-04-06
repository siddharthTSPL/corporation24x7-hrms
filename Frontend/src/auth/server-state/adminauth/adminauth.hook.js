import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loginAdmin,
  registerAdmin,
  logoutAdmin,
  getMeAdmin,
  sendForgetPasswordOtp,
  verifyAdminOtp,
  resetAdminPassword,
  addManager,
  addEmployee,
  findAllManagers,
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



export const useSendForgetPasswordOtp = () => {
  return useMutation({
    mutationFn: sendForgetPasswordOtp,
  });
};


export const useVerifyAdminOtp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyAdminOtp,
    onSuccess: (data) => {
      if (data?.login) {
        queryClient.setQueryData(["admin"], data.user);
      }
    },
  });
};


export const useResetAdminPassword = () => {
  return useMutation({
    mutationFn: resetAdminPassword,
  });
};
export const useAddManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addManager,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
  });
};
export const useAddEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
};

export const useFindAllManagers = () => {
  return useQuery({
    queryKey: ["managers"],
    queryFn: findAllManagers,
  });
};