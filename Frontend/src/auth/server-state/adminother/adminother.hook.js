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