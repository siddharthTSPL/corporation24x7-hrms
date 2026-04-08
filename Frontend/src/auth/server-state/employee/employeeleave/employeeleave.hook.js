import { applyLeave,getAllLeaves,getLeaveResult } from "../../../api/employeeapi/leave/em.leave.api";


import { useQuery } from "@tanstack/react-query";

export const useApplyLeave = () => {
     return useMutation(applyLeave);
};

export const useGetAllLeaves = () => {
     return useQuery(["leaves"], getAllLeaves);
};

export const useGetLeaveResult = (id) => {
     return useQuery({
          queryKey: ["leaveResult", id],
          queryFn: () => getLeaveResult(id),
     });
};