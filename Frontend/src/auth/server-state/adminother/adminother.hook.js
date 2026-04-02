import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getAllEmployee,
  getParticularEmployee,
  deleteUser,
  getEmployeeStats,
  reviewToManager,
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


export const useGetEmployeeStats = () => {
  return useQuery({
    queryKey: ["employeeStats"],
    queryFn: getEmployeeStats,
  });
};


export const useReviewToManager = () => {
  return useMutation({
    mutationFn: reviewToManager,
  });
};