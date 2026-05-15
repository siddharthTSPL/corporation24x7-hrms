import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  reviewToAdmin,
  getTodayCheckins,
  getOrgInfo,
  changeSuperAdminPassword,
  forgotPasswordSuperAdmin,
  verifySuperAdminOtp,
  resetSuperAdminPassword,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAllAdmins,
  addManager,
  addEmployee,
  getAllManagers,
  getAllEmployees,
  editEmployee,
  getParticularEmployee,
  getParticularManager,
  deleteEmployee,
  getNoOfEmployees,
} from "../../../api/superadmin/other/su.other";



export const useReviewToAdmin = () => {
  return useMutation({
    mutationFn: reviewToAdmin,
  });
};



export const useGetTodayCheckins = () => {
  return useQuery({
    queryKey: ["today-checkins"],
    queryFn: getTodayCheckins,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
};



export const useGetOrgInfo = () => {
  return useQuery({
    queryKey: ["org-info"],
    queryFn: getOrgInfo,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
};



export const useChangeSuperAdminPassword = () => {
  return useMutation({
    mutationFn: changeSuperAdminPassword,
  });
};



export const useForgotPasswordSuperAdmin = () => {
  return useMutation({
    mutationFn: forgotPasswordSuperAdmin,
  });
};



export const useVerifySuperAdminOtp = () => {
  return useMutation({
    mutationFn: verifySuperAdminOtp,
  });
};



export const useResetSuperAdminPassword = () => {
  return useMutation({
    mutationFn: resetSuperAdminPassword,
  });
};



export const useCreateAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdmin,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admins"],
      });
    },
  });
};



export const useUpdateAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateAdmin(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admins"],
      });
    },
  });
};



export const useDeleteAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAdmin,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admins"],
      });
    },
  });
};



export const useGetAllAdmins = () => {
  return useQuery({
    queryKey: ["admins"],
    queryFn: getAllAdmins,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};



export const useAddManager = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addManager,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["managers"],
      });
    },
  });
};



export const useAddEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addEmployee,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employees"],
      });
    },
  });
};



export const useGetAllManagers = () => {
  return useQuery({
    queryKey: ["managers"],
    queryFn: getAllManagers,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};



export const useGetAllEmployees = () => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: getAllEmployees,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};



export const useEditEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, data }) => editEmployee(uid, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employees"],
      });
    },
  });
};



export const useGetParticularEmployee = (uid) => {
  return useQuery({
    queryKey: ["employee", uid],
    queryFn: () => getParticularEmployee(uid),
    enabled: !!uid,
    refetchOnWindowFocus: false,
  });
};



export const useGetParticularManager = (uid) => {
  return useQuery({
    queryKey: ["manager", uid],
    queryFn: () => getParticularManager(uid),
    enabled: !!uid,
    refetchOnWindowFocus: false,
  });
};



export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmployee,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employees"],
      });

      queryClient.invalidateQueries({
        queryKey: ["managers"],
      });
    },
  });
};



export const useGetNoOfEmployees = () => {
  return useQuery({
    queryKey: ["employee-count"],
    queryFn: getNoOfEmployees,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};