import { acceptLeaveRequest, rejectLeaveRequest, forwardLeaveToAdmin, applyLeaveManager, getMyLeavesManager, getAllManagerLeaves } from "../../../api/managerapi/leave/ma.leave.api";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useApplyLeaveManager = () => {
     return useMutation(applyLeaveManager);
}

export const useAcceptLeaveRequest = () => {
     return useMutation(acceptLeaveRequest);
}

export const useRejectLeaveRequest = () => {
     return useMutation(rejectLeaveRequest);
}

export const useForwardLeaveToAdmin = () => {
     return useMutation(forwardLeaveToAdmin);
}

export const useGetMyLeavesManager = () => {
     return useQuery(["myLeavesManager"], getMyLeavesManager);
}

export const useGetAllManagerLeaves = () => {
     return useQuery(["allManagerLeaves"], getAllManagerLeaves); 
}
