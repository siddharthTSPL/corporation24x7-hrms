import {
  applyReimbursement,
  updateReimbursement,
  deleteReimbursement,
  getMyReimbursements,
  getPendingReimbursements,
  getAllReimbursements,
  approveReimbursement,
  rejectReimbursement,
  markReimbursementPaid,
} from "../../api/adminapi/reimbursement/adminreimbursement.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---- Admin's own claims (escalate to SuperAdmin) ----
export const useGetMyReimbursements = () => {
  return useQuery({
    queryKey: ["admin-my-reimbursements"],
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
      queryClient.invalidateQueries({ queryKey: ["admin-my-reimbursements"] });
    },
  });
};

export const useUpdateReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateReimbursement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-my-reimbursements"] });
    },
  });
};

export const useDeleteReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReimbursement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-my-reimbursements"] });
    },
  });
};

// ---- Reviewing Employee + Manager claims ----
export const useGetPendingReimbursements = () => {
  return useQuery({
    queryKey: ["admin-pending-reimbursements"],
    queryFn: getPendingReimbursements,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetAllReimbursements = (status) => {
  return useQuery({
    queryKey: ["admin-all-reimbursements", status || "any"],
    queryFn: () => getAllReimbursements(status),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

const invalidateReviewQueues = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ["admin-pending-reimbursements"] });
  queryClient.invalidateQueries({ queryKey: ["admin-all-reimbursements"] });
};

export const useApproveReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveReimbursement,
    onSuccess: () => invalidateReviewQueues(queryClient),
  });
};

export const useRejectReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectReimbursement,
    onSuccess: () => invalidateReviewQueues(queryClient),
  });
};

export const useMarkReimbursementPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markReimbursementPaid,
    onSuccess: () => invalidateReviewQueues(queryClient),
  });
};