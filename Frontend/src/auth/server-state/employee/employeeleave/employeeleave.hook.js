import { applyLeave,getAllLeaves,getLeaveResult ,deleteLeave,editLeave} from "../../../api/employeeapi/leave/em.leave.api";


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

export const useDeleteLeave = () => {
     const queryClient = useQueryClient();
     return useMutation(deleteLeave, {
          mutationKey: ["deleteLeave"],
          mutationFn:deleteLeave,
          onSuccess: () => {
               queryClient.invalidateQueries({ queryKey: ["leaves"] });
          },
     })
};

export const useEditLeave = () => {
     const queryClient = useQueryClient();
     return useMutation(editLeave, {
          mutationKey: ["editLeave"],
          mutationFn:editLeave,
          onSuccess: () => {
               queryClient.invalidateQueries({ queryKey: ["leaves"] });
          },
     })
};