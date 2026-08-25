import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import {
  reviewToAdmin,
  getAllReviews,
  getTodayCheckins,
  getAttendanceOverview,
  getAttendanceHistory,
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
    getAllPersonalDocumentsSuperAdmin,
  getAllExpenseDocumentsSuperAdmin,
  getDocumentDetailsSuperAdmin,
  updatePermissions,
  getPermissions,
  getInactiveUsers,
  setAdminWorkingStatus,
  getActiveUserCount,
  getKioskPasswordStatus,
  setKioskPassword,
  getLeavePolicy,
  setLeavePolicy,
  getParticularAdmin
} from "../../../api/superadmin/other/su.other";



export const useReviewToAdmin = () => {
  return useMutation({
    mutationFn: reviewToAdmin,
  });
};

export const useGetAllReviews = (params = {}) => {
  return useQuery({
    queryKey: ["allReviews", params],
    queryFn: () => getAllReviews(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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

// Attendance Details modal (Today / Monthly tabs).
export const useGetAttendanceOverview = ({ type = "today", month, year } = {}, options = {}) => {
  return useQuery({
    queryKey: ["attendanceOverview", type, type === "monthly" ? month : null, type === "monthly" ? year : null],
    queryFn: () => getAttendanceOverview({ type, month, year }),
    staleTime: 30 * 1000,
    ...options,
  });
};

// "History" button on the Monthly tab — day-wise history for one employee.
export const useGetAttendanceHistory = (employeeId, { startDate, endDate } = {}, options = {}) => {
  return useQuery({
    queryKey: ["attendanceHistory", employeeId, startDate ?? null, endDate ?? null],
    queryFn: () => getAttendanceHistory(employeeId, { startDate, endDate }),
    enabled: !!employeeId,
    staleTime: 30 * 1000,
    ...options,
  });
};


export const useGetOrgInfo = () => {
  return useQuery({
    queryKey: ["org-info"],
    queryFn: getOrgInfo,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 1, 
  });
};



export const useChangeSuperAdminPassword = () => {
  return useMutation({
    mutationFn: changeSuperAdminPassword,
  });
};



export const useKioskPasswordStatus = () => {
  return useQuery({
    queryKey: ["superadmin", "kiosk-password-status"],
    queryFn: getKioskPasswordStatus,
  });
};

export const useSetKioskPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setKioskPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "kiosk-password-status"] });
    },
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

    onSuccess: (response) => {
      toast.success(response.message, {
        position: "top-right",
        duration: 5000,
        style: {
          background: "#FFFFFF",
          color: "#16A34A",
          borderRadius: "10px",
          padding: "14px 16px",
          fontSize: "14px",
          fontWeight: "500",
        },
      });

      queryClient.invalidateQueries({
        queryKey: ["admins"],
      });
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Something went wrong",
        {
          position: "top-right",
          duration: 5000,
          icon: "❌",
          style: {
            background: "#FFFFFF",
            color:  "#16A34A",
            borderRadius: "10px",
            padding: "14px 16px",
            fontSize: "14px",
            fontWeight: "500",
          },
        }
      );
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



export const useGetAllAdmins = (options = {}) => {
  return useQuery({
    queryKey: ["admins"],
    queryFn: getAllAdmins,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    ...options,
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



export const useGetAllManagers = (options = {}) => {
  return useQuery({
    queryKey: ["managers"],
    queryFn: getAllManagers,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    ...options,
  });
};



export const useGetAllEmployees = (options = {}) => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: getAllEmployees,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    ...options,
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



export const useGetAllPersonalDocumentsSuperAdmin = () => {
  return useQuery({
    queryKey: ["superadmin-personal-documents"],
    queryFn: getAllPersonalDocumentsSuperAdmin,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

export const useGetAllExpenseDocumentsSuperAdmin = () => {
  return useQuery({
    queryKey: ["superadmin-expense-documents"],
    queryFn: getAllExpenseDocumentsSuperAdmin,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

export const useGetDocumentDetailsSuperAdmin = (documentId) => {
  return useQuery({
    queryKey: ["superadmin-document", documentId],
    queryFn: () => getDocumentDetailsSuperAdmin(documentId),
    enabled: !!documentId,
    refetchOnWindowFocus: false,
  });
};

export const useGetPermissions = (id, user_model) => {
  return useQuery({
    queryKey: ["permissions", id, user_model],
    queryFn: () => getPermissions(id, user_model),
    enabled: !!id && !!user_model,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });
};

export const useUpdatePermissions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePermissions,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["permissions", variables.id] });
    },
  });
};


export const useSuperAdminInactiveUsers = () => {
  return useQuery({
    queryKey: ["superadmin", "inactive-users"],
    queryFn: getInactiveUsers,
  });
};

export const useSetAdminWorkingStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, working_status, noticePeriodAllowed, noticePeriodMonths, lastWorkingDay }) => {
      try {
        return await setAdminWorkingStatus(id, working_status, { noticePeriodAllowed, noticePeriodMonths, lastWorkingDay });
      } catch (err) {
        const payload = err?.response?.data || err?.data || err;
        throw payload;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "inactive-users"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin", "all-employees"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin", "all-admins"] });
      queryClient.invalidateQueries({ queryKey: ["admins"] });
    },
  });
};

export const useSuperAdminActiveUserCount = () => {
  return useQuery({
    queryKey: ["superadmin", "active-user-count"],
    queryFn: getActiveUserCount,
  });
};

export const useGetLeavePolicy = () => {
  return useQuery({
    queryKey: ["superadmin", "leave-policy"],
    queryFn: getLeavePolicy,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

export const useSetLeavePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setLeavePolicy,

    onSuccess: (response) => {
      toast.success(response.message, {
        position: "top-right",
        duration: 5000,
        style: {
          background: "#FFFFFF",
          color: "#16A34A",
          borderRadius: "10px",
          padding: "14px 16px",
          fontSize: "14px",
          fontWeight: "500",
        },
      });

      queryClient.invalidateQueries({ queryKey: ["superadmin", "leave-policy"] });
    },

    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Something went wrong",
        {
          position: "top-right",
          duration: 5000,
          icon: "❌",
          style: {
            background: "#FFFFFF",
            color: "#16A34A",
            borderRadius: "10px",
            padding: "14px 16px",
            fontSize: "14px",
            fontWeight: "500",
          },
        }
      );
    },
  });
};


export const useGetParticularAdmin = (uid) => {
  return useQuery({
    queryKey: ["admin-detail", uid],
    queryFn: () => getParticularAdmin(uid),
    enabled: !!uid,
    refetchOnWindowFocus: false,
  });
};