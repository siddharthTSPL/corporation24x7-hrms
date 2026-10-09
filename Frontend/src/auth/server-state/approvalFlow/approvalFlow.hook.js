import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApprovalFlows,
  saveApprovalFlow,
  resetApprovalFlow,
} from "../../api/approvalFlow/approvalFlow.api";

const KEY = ["approval-flow"];

export const useGetApprovalFlows = () =>
  useQuery({
    queryKey: KEY,
    queryFn: getApprovalFlows,
    staleTime: 0,
    refetchOnMount: true,
  });

export const useSaveApprovalFlow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveApprovalFlow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};

export const useResetApprovalFlow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetApprovalFlow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};