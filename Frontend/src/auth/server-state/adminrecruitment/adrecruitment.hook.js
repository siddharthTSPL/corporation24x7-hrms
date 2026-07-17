import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllRequisitions, getPendingRequisitions, getRequisitionById, approveRequisition, rejectRequisition, holdRequisition, requestRevision, addCandidate, getCandidatesByRequisition, getCandidateById, updateCandidateStage, scheduleInterview, submitInterviewFeedback } from "../../api/adminapi/recruitment/recruitment.api";

export const useGetAllRequisitions = () => {
  return useQuery({
    queryKey: ["all-requisitions"],
    queryFn: getAllRequisitions,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetPendingRequisitions = () => {
  return useQuery({
    queryKey: ["pending-requisitions"],
    queryFn: getPendingRequisitions,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetRequisitionById = (id) => {
  return useQuery({
    queryKey: ["requisition", id],
    queryFn: () => getRequisitionById(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useApproveRequisition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => approveRequisition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-requisitions"] });
    },
  });
};

export const useRejectRequisition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => rejectRequisition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-requisitions"] });
    },
  });
};

export const useHoldRequisition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => holdRequisition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-requisitions"] });
    },
  });
};

export const useRequestRevision = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => requestRevision(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-requisitions"] });
    },
  });
};

export const useAddCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addCandidate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidates", variables.requisition_id] });
      queryClient.invalidateQueries({ queryKey: ["all-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["requisition"] });
    },
  });
};

export const useGetCandidatesByRequisition = (requisition_id) => {
  return useQuery({
    queryKey: ["candidates", requisition_id],
    queryFn: () => getCandidatesByRequisition(requisition_id),
    enabled: !!requisition_id,
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useGetCandidateById = (id) => {
  return useQuery({
    queryKey: ["candidate", id],
    queryFn: () => getCandidateById(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useUpdateCandidateStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateCandidateStage(id, data),
    onSuccess: (_, variables) => {
      // Openings/filled_count and requisition status can change (e.g. SELECTED -> FILLED),
      // so refresh everything that shows those numbers, not just the candidate list.
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["all-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["requisition"] });
    },
  });
};

export const useScheduleInterview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => scheduleInterview(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidate", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
};

export const useSubmitInterviewFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, roundId, data }) => submitInterviewFeedback(candidateId, roundId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidate", variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
};