import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getAllEmployee,
  getParticularEmployee,
  deleteUser,
  getEmployeeStats,
  reviewToManager,
  editEmployee,
  getparticularEmployeeStats,
  getParticularManager,
  getTodayCheckins,
  getOrgInfo,
} from "../../api/adminapi/other/ad.other.api";

export const useGetAllEmployee = () => {
  return useQuery({
    queryKey: ["employees"],
    queryFn: getAllEmployee,
    staleTime: 1000 * 60 * 5, 
  });
};


export const useGetParticularEmployee = (uid) => {
  return useQuery({
    queryKey: ["employee", uid],
    queryFn: () => getParticularEmployee(uid),
    enabled: !!uid, // run only if uid exists
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


export const useEditEmployee = (uid) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => editEmployee(uid, data),
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

export const useGetParticularEmployeeStats = (uid) => {
  return useQuery({
    queryKey: ["employeeStats", uid],
    queryFn: () => getparticularEmployeeStats(uid),
    enabled: !!uid, 
  });
};

export const useGetParticularManager = (uid) => {
  return useQuery({
    queryKey: ["manager", uid],
    queryFn: () => getParticularManager(uid),
    enabled: !!uid, 
  });
};
export const useGetParticularManagerStats = (uid) => {
  return useQuery({
    queryKey: ["manager-stats", uid],
    queryFn: () => getParticularManager(uid),
    enabled: !!uid,
  });
};

export const useGetTodayCheckins = () => {
  return useQuery({
    queryKey: ["todayCheckins"],
    queryFn: getTodayCheckins,
    // Refetch every 2 minutes so the map stays live without a page reload
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
