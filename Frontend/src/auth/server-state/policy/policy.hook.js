import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDashboardSummary,
  listPolicies,
  getPolicyDetail,
  createPolicy,
  addPolicyVersion,
  updatePolicyMeta,
  publishPolicy,
  archivePolicy,
  deletePolicy,
  getAcknowledgementReport,
  getGateStatus,
  getMyPolicies,
  getMyPendingPolicies,
  viewPolicy,
  acknowledgePolicy,
  getMyAcknowledgementHistory,
} from "../../api/policy/policy.api";

// ── Management ───────────────────────────────────────────────────────────────

export const usePolicyDashboard = () =>
  useQuery({
    queryKey: ["policy-dashboard"],
    queryFn: getDashboardSummary,
    staleTime: 0,
    refetchOnMount: true,
  });

export const useListPolicies = (params) =>
  useQuery({
    queryKey: ["policies", params],
    queryFn: () => listPolicies(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const usePolicyDetail = (id) =>
  useQuery({
    queryKey: ["policy-detail", id],
    queryFn: () => getPolicyDetail(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });

export const useCreatePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-dashboard"] });
    },
  });
};

export const useAddPolicyVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addPolicyVersion,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-detail", id] });
    },
  });
};

export const useUpdatePolicyMeta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePolicyMeta,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-detail", id] });
    },
  });
};

export const usePublishPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishPolicy,
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["policy-dashboard"] });
    },
  });
};

export const useArchivePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archivePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-dashboard"] });
    },
  });
};

export const useDeletePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-dashboard"] });
    },
  });
};

export const useAcknowledgementReport = (id) =>
  useQuery({
    queryKey: ["policy-report", id],
    queryFn: () => getAcknowledgementReport(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });

// ── Viewer (any role) ────────────────────────────────────────────────────────

export const useGateStatus = (options = {}) =>
  useQuery({
    queryKey: ["policy-gate-status"],
    queryFn: getGateStatus,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 10000,
    ...options,
  });

export const useMyPolicies = () =>
  useQuery({
    queryKey: ["my-policies"],
    queryFn: getMyPolicies,
    staleTime: 0,
    refetchOnMount: true,
  });

export const useMyPendingPolicies = () =>
  useQuery({
    queryKey: ["my-pending-policies"],
    queryFn: getMyPendingPolicies,
    staleTime: 0,
    refetchOnMount: true,
  });

export const useViewPolicy = (policyId) =>
  useQuery({
    queryKey: ["policy-view", policyId],
    queryFn: () => viewPolicy(policyId),
    enabled: !!policyId,
    staleTime: 0,
  });

export const useAcknowledgePolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acknowledgePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-gate-status"] });
      queryClient.invalidateQueries({ queryKey: ["my-policies"] });
      queryClient.invalidateQueries({ queryKey: ["my-pending-policies"] });
      queryClient.invalidateQueries({ queryKey: ["my-acknowledgements"] });
    },
  });
};

export const useMyAcknowledgementHistory = () =>
  useQuery({
    queryKey: ["my-acknowledgements"],
    queryFn: getMyAcknowledgementHistory,
    staleTime: 0,
    refetchOnMount: true,
  });