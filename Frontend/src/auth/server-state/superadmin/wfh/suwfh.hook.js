

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getPendingWFHSuperAdmin,
  approveWFHSuperAdmin,
  rejectWFHSuperAdmin,
} from "../../../api/superadmin/wfh/suwfh.api";

export const useGetPendingWFHSuperAdmin = () => {
  return useQuery({
    queryKey: ["superadmin-pending-wfh"],
    queryFn: getPendingWFHSuperAdmin,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

export const useApproveWFHSuperAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveWFHSuperAdmin,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["superadmin-pending-wfh"],
      });
    },
  });
};

export const useRejectWFHSuperAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectWFHSuperAdmin,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["superadmin-pending-wfh"],
      });
    },
  });
};