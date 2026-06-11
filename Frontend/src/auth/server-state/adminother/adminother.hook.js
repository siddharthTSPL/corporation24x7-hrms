import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllEmployee,
  getParticularEmployee,
  deleteUser,
  getEmployeeStats,
  reviewToManager,
  editEmployee,
  editManager,
  getparticularEmployeeStats,
  getParticularManager,
  getTodayCheckins,
  getOrgInfo,
  changeManagerRole,
  demoteManagerToEmployee,
  demoteAdminToManager,
  demoteAdminToEmployee,
  promoteEmployeeToManager,
  promoteEmployeeToAdmin,
  promoteManagerToAdmin,
  getTodayLeaves,
  getAllPersonalDocuments,
  getAllExpenseDocuments,
  getDocumentDetails,
  adminActionOnLeave,
} from "../../api/adminapi/other/ad.other.api";

export const useGetAllEmployee = () => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: getAllEmployee,
    staleTime: 1000 * 60 * 5,
  });
};

export const useGetParticularEmployee = (id) => {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: () => getParticularEmployee(id),
    enabled: !!id,
  });
};

export const useGetParticularManager = (id) => {
  return useQuery({
    queryKey: ["manager", id],
    queryFn: () => getParticularManager(id),
    enabled: !!id,
  });
};

export const useGetParticularManagerStats = (id) => {
  return useQuery({
    queryKey: ["managerStats", id],
    queryFn: () => getParticularManager(id),
    enabled: !!id,
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
  return useMutation({
    mutationFn: reviewToManager,
  });
};

export const useGetEmployeeStats = () => {
  return useQuery({
    queryKey: ["employeeStats"],
    queryFn: getEmployeeStats,
  });
};

export const useGetParticularEmployeeStats = (id) => {
  return useQuery({
    queryKey: ["employeeStats", id],
    queryFn: () => getparticularEmployeeStats(id),
    enabled: !!id,
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
  });
};

export const useGetTodayLeaves = () => {
  return useQuery({
    queryKey: ["todayLeaves"],
    queryFn: getTodayLeaves,
  });
};

export const useGetAllPersonalDocuments = () => {
  return useQuery({
    queryKey: ["personalDocuments"],
    queryFn: getAllPersonalDocuments,
  });
};

export const useGetAllExpenseDocuments = () => {
  return useQuery({
    queryKey: ["expenseDocuments"],
    queryFn: getAllExpenseDocuments,
  });
};

export const useGetDocumentDetails = (documentId) => {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: () => getDocumentDetails(documentId),
    enabled: !!documentId,
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