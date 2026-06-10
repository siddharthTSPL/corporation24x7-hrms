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
  demoteToEmployee,
  promoteToManager,
  getTodayLeaves,
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
      queryClient.invalidateQueries({ queryKey: ["manager", id] });
    },
  });
};

export const usePromoteToManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => promoteToManager(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeeStats"] });
    },
  });
};

export const useDemoteToEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => demoteToEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
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