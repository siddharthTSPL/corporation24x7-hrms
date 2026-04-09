import { applyLeave,getAllLeaves,getLeaveResult } from "../../../api/employeeapi/leave/em.leave.api";


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useApplyLeave = () => {
    const queryClient = useQueryClient();
     return useMutation(applyLeave, {
          mutationKey: ["applyLeave"],
          mutationFn:applyLeave,
          onSuccess: () => {
               queryClient.invalidateQueries({ queryKey: ["leaves"] });
          },
     })
};

export const useGetAllLeaves = () => {
     return useQuery({
          queryKey: ["leaves"],
          queryFn: () => getAllLeaves(),
     });
};

export const useGetLeaveResult = (id) => {
     return useQuery({
          queryKey: ["leaveResult", id],
          queryFn: () => getLeaveResult(id),
     });
};