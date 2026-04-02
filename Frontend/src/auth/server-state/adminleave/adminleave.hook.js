import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getForwardedLeaves,
  acceptLeave,
  rejectLeave,
} from "../../api/adminapi/leave/ad.leave.api";

export const useGetForwardedLeaves = () => {
  return useQuery({
    queryKey: ["forwardedLeaves"],
    queryFn: getForwardedLeaves,
    staleTime: 1000 * 60 * 2,
  });
};

export const useAcceptLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forwardedLeaves"] });
      queryClient.invalidateQueries({ queryKey: ["employeeStats"] });
    },
  });
};

export const useRejectLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forwardedLeaves"] });
    },
  });
};
