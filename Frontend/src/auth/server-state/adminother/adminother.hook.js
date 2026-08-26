import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllEmployee, getMyTeamOverview, getParticularEmployee, deleteUser, getEmployeeStats, reviewToManager, getAllReviews,
  editEmployee, editManager, getparticularEmployeeStats, getParticularManager,
  getTodayCheckins, getAttendanceOverview, getEmployeeAttendanceHistory, getOrgInfo, changeManagerRole, demoteManagerToEmployee,
  demoteAdminToManager, demoteAdminToEmployee, promoteEmployeeToManager,
  promoteEmployeeToAdmin, promoteManagerToAdmin, getTodayLeaves,
  getAllPersonalDocuments, getAllExpenseDocuments, getDocumentDetails,
  adminActionOnLeave, setEmployeeWorkingStatus, setManagerWorkingStatus,
  getInactiveUsers, getActiveUserCount, getAllAdmins, getAttendanceHistory,
  respondToMyReviewAsAdmin, hrAcknowledgeReview
} from "../../api/adminapi/other/ad.other.api";

export const useGetAllEmployee = () => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: getAllEmployee,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Dashboard-only: scoped to the logged-in admin's own team.
export const useGetMyTeamOverview = () => {
  return useQuery({
    queryKey: ["myTeamOverview"],
    queryFn: getMyTeamOverview,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetParticularEmployee = (id) => {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: () => getParticularEmployee(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useGetParticularManager = (id) => {
  return useQuery({
    queryKey: ["manager", id],
    queryFn: () => getParticularManager(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useGetParticularManagerStats = (id) => {
  return useQuery({
    queryKey: ["managerStats", id],
    queryFn: () => getParticularManager(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
  });
};

export const useEditEmployee = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => editEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
    },
  });
};

export const useEditManager = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => editManager(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["manager", id] });
    },
  });
};

export const usePromoteEmployeeToManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => promoteEmployeeToManager(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["employeeStats"] });
    },
  });
};

export const usePromoteEmployeeToAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => promoteEmployeeToAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["employeeStats"] });
    },
  });
};

export const usePromoteManagerToAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => promoteManagerToAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["employeeStats"] });
    },
  });
};

export const useDemoteManagerToEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => demoteManagerToEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["employeeStats"] });
    },
  });
};

export const useDemoteAdminToManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => demoteAdminToManager(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["employeeStats"] });
    },
  });
};

export const useDemoteAdminToEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => demoteAdminToEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["employeeStats"] });
    },
  });
};

export const useChangeManagerRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => changeManagerRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
  });
};

export const useReviewToManager = () => {
  return useMutation({ mutationFn: reviewToManager });
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

export const useRespondToMyReviewAsAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: respondToMyReviewAsAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
};

export const useHrAcknowledgeReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrAcknowledgeReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allReviews"] });
    },
  });
};

export const useGetEmployeeStats = () => {
  return useQuery({
    queryKey: ["employeeStats"],
    queryFn: getEmployeeStats,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetParticularEmployeeStats = (id) => {
  return useQuery({
    queryKey: ["employeeStats", id],
    queryFn: () => getparticularEmployeeStats(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useGetTodayCheckins = () => {
  return useQuery({
    queryKey: ["todayCheckins"],
    queryFn: getTodayCheckins,
    refetchInterval: 2 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
  });
};

export const useGetOrgInfo = () => {
  return useQuery({
    queryKey: ["orgInfo"],
    queryFn: getOrgInfo,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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

// "History" button on the Monthly tab — day-wise history for one team member.
export const useGetEmployeeAttendanceHistory = (employeeId, { startDate, endDate } = {}, options = {}) => {
  return useQuery({
    queryKey: ["employeeAttendanceHistory", employeeId, startDate ?? null, endDate ?? null],
    queryFn: () => getEmployeeAttendanceHistory(employeeId, { startDate, endDate }),
    enabled: !!employeeId,
    staleTime: 30 * 1000,
    ...options,
  });
};

export const useGetTodayLeaves = () => {
  return useQuery({
    queryKey: ["todayLeaves"],
    queryFn: getTodayLeaves,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetAllPersonalDocuments = () => {
  return useQuery({
    queryKey: ["personalDocuments"],
    queryFn: getAllPersonalDocuments,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetAllExpenseDocuments = () => {
  return useQuery({
    queryKey: ["expenseDocuments"],
    queryFn: getAllExpenseDocuments,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetDocumentDetails = (documentId) => {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocumentDetails(documentId),
    enabled: !!documentId,
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useAdminActionOnLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminActionOnLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayLeaves"] });
    },
  });
};

export const useSetEmployeeWorkingStatus = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => setEmployeeWorkingStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "inactive-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "active-user-count"] });
    },
  });
};

export const useSetManagerWorkingStatus = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => setManagerWorkingStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      queryClient.invalidateQueries({ queryKey: ["manager", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "inactive-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "active-user-count"] });
    },
  });
};


export const useAdminInactiveUsers = () => {
  return useQuery({
    queryKey: ["admin", "inactive-users"],
    queryFn: getInactiveUsers,
  });
};
export const useGetActiveUserCount = () => {
  return useQuery({
    queryKey: ["admin", "active-user-count"],
    queryFn: getActiveUserCount,
  });
};

export const useGetAllAdmins = () => {
  return useQuery({
    queryKey: ["admin", "all-admins"],
    queryFn: getAllAdmins,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetAttendanceHistory = () => {
  return useQuery({
    queryKey: ["attendance", "admin-history"],
    queryFn: getAttendanceHistory,
    staleTime: 2 * 60 * 1000,
  });
};