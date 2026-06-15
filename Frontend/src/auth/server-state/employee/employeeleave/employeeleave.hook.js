import {
  applyLeave,
  getAllLeaves,
  deleteLeave,
  editLeave,
  getAllLeaveHistory,
} from "../../../api/employeeapi/leave/em.leave.api";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

// Apply Leave
export const useApplyLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["applyLeave"],
    mutationFn: applyLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["leaves"],
      });

      queryClient.invalidateQueries({
        queryKey: ["leaveHistory"],
      });
    },
  });
};

// Get Current Leaves
export const useGetAllLeaves = () => {
  return useQuery({
    queryKey: ["leaves"],
    queryFn: getAllLeaves,
  });
};

// Delete Leave
export const useDeleteLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["deleteLeave"],
    mutationFn: deleteLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["leaves"],
      });

      queryClient.invalidateQueries({
        queryKey: ["leaveHistory"],
      });
    },
  });
};

// Edit Leave
export const useEditLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["editLeave"],
    mutationFn: editLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["leaves"],
      });

      queryClient.invalidateQueries({
        queryKey: ["leaveHistory"],
      });
    },
  });
};

// Leave History
export const useGetAllLeaveHistory = () => {
  return useQuery({
    queryKey: ["leaveHistory"],
    queryFn: getAllLeaveHistory,
  });
};