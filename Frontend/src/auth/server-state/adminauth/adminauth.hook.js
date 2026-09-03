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
  downloadBulkEmployeeTemplate,
  bulkUploadEmployees,
  bulkImportEmployeesFromSheet,
  findAllManagers,
  findAllEmployeesFull,
  findAllManagerswithoutAdmin,
  editAdminProfile,
  changeAdminPassword,
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
      localStorage.removeItem("role");
      queryClient.removeQueries({ queryKey: ["auth"] });
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
      queryClient.invalidateQueries({ queryKey: ["employees"] });
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

export const useDownloadBulkEmployeeTemplate = () => {
  return useMutation({
    mutationFn: downloadBulkEmployeeTemplate,
  });
};

export const useBulkUploadEmployees = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkUploadEmployees,
    onSuccess: (data) => {
      if (data?.success) queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
};

export const useBulkImportEmployeesFromSheet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkImportEmployeesFromSheet,
    onSuccess: (data) => {
      if (data?.success) queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
};

export const useFindAllManagers = () => {
  return useQuery({
    queryKey: ["managers"],
    queryFn: findAllManagers,
  });
};

export function useFindAllEmployeesFull() {
  return useQuery({
    queryKey: ["findAllEmployeesFull"],
    queryFn: findAllEmployeesFull,   // ✅ ab pehle se imported api function use hoga
  });
}

export const useEditAdminProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editAdminProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};

export const useChangeAdminPassword = () => {
  return useMutation({
    mutationFn: changeAdminPassword,
  });
};


export const useFindAllManagerswithoutAdmin = () => {
  return useQuery({
    queryKey: ["managerswithoutadmin"],
    queryFn: findAllManagerswithoutAdmin,
  });
};