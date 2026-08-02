import {
  getPendingReimbursements,
  approveReimbursement,
  rejectReimbursement,
  markReimbursementPaid,
  getAllReimbursements,
} from "../../../api/superadmin/reimbursement/sureimbursement.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---- Reviewing Admin claims ----
export const useGetPendingReimbursements = () => {
  return useQuery({
    queryKey: ["superadmin-pending-reimbursements"],
    queryFn: getPendingReimbursements,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

const invalidateAll = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ["superadmin-pending-reimbursements"] });
  queryClient.invalidateQueries({ queryKey: ["superadmin-all-reimbursements"] });
};

export const useApproveReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveReimbursement,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useRejectReimbursement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectReimbursement,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useMarkReimbursementPaid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markReimbursementPaid,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// ---- Org-wide visibility: Employee + Manager + Admin claims, any status ----
export const useGetAllReimbursements = (filters) => {
  return useQuery({
    queryKey: ["superadmin-all-reimbursements", filters?.status || "any", filters?.submitterModel || "any"],
    queryFn: () => getAllReimbursements(filters),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};