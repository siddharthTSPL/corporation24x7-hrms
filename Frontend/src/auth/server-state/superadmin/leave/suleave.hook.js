import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  showAllLeaves,
  acceptLeaveByAdmin,
  rejectLeaveByAdmin,
} from "../../../api/superadmin/leave/leave.api";



export const useShowAllLeaves = () => {
  return useQuery({
    queryKey: ["superadmin-leaves"],
    queryFn: showAllLeaves,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
};



export const useAcceptLeaveByAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, leaveFor }) =>
      acceptLeaveByAdmin(id, leaveFor),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["superadmin-leaves"],
      });
    },
  });
};



export const useRejectLeaveByAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, leaveFor }) =>
      rejectLeaveByAdmin(id, leaveFor),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["superadmin-leaves"],
      });
    },
  });
};