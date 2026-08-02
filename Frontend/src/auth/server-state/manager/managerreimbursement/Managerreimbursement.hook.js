import {
  applyReimbursement,
  updateReimbursement,
  deleteReimbursement,
  getMyReimbursements,
} from "../../../api/managerapi/reimbursement/mareimbursement.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetMyReimbursements = () => {
  return useQuery({
    queryKey: ["manager-reimbursements"],
    queryFn: getMyReimbursements,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useApplyReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyReimbursement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-reimbursements"] });
    },
  });
};

export const useUpdateReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateReimbursement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-reimbursements"] });
    },
  });
};

export const useDeleteReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReimbursement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-reimbursements"] });
    },
  });
};