import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllRequisitions, getPendingRequisitions, getRequisitionById, approveRequisition, rejectRequisition, holdRequisition, requestRevision, addCandidate, getCandidatesByRequisition, getCandidateById, updateCandidateStage, scheduleInterview, submitInterviewFeedback, previewCtc, generateOffer, getCandidateOfferBundle, updateOffer, uploadOfferAssets, markOfferReviewDone, finalizeOffer, reopenOffer, sendOfferEmail, sendOfferWhatsapp, resendOffer, extendOfferValidity, joinCandidate, generateAppointment, updateAppointment, uploadAppointmentAssets, finalizeAppointment, sendAppointmentEmail, sendAppointmentWhatsapp, resendInterviewInvite, getInterviewers, getApprovers, submitForApproval, withdrawApproval, getMyApprovals, getApprovalPendingCount, approveLetter, rejectLetter } from "../../api/adminapi/recruitment/recruitment.api";

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

export const useOfferBundle = (candidateId) => {
  return useQuery({
    queryKey: ["offer-bundle", candidateId],
    queryFn: () => getCandidateOfferBundle(candidateId),
    enabled: !!candidateId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

const useOfferMutation = (fn, { pipeline = false } = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offer-bundle"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate"] });
      if (pipeline) {
        queryClient.invalidateQueries({ queryKey: ["all-requisitions"] });
        queryClient.invalidateQueries({ queryKey: ["requisition"] });
      }
    },
  });
};

export const usePreviewCtc = () => useMutation({ mutationFn: previewCtc });
export const useGenerateOffer = () => useOfferMutation(({ candidateId, data }) => generateOffer(candidateId, data));
export const useUpdateOffer = () => useOfferMutation(({ id, data }) => updateOffer(id, data));
export const useUploadOfferAssets = () => useOfferMutation(({ id, formData }) => uploadOfferAssets(id, formData));
export const useMarkOfferReviewDone = () => useOfferMutation(markOfferReviewDone);
export const useFinalizeOffer = () => useOfferMutation(finalizeOffer);
export const useReopenOffer = () => useOfferMutation(reopenOffer);
export const useSendOfferEmail = () => useOfferMutation(sendOfferEmail, { pipeline: true });
export const useSendOfferWhatsapp = () => useOfferMutation(sendOfferWhatsapp, { pipeline: true });
export const useResendOffer = () => useOfferMutation(({ id, data }) => resendOffer(id, data), { pipeline: true });
export const useExtendOfferValidity = () => useOfferMutation(({ id, data }) => extendOfferValidity(id, data), { pipeline: true });
export const useJoinCandidate = () => useOfferMutation(({ id, data }) => joinCandidate(id, data), { pipeline: true });
export const useGenerateAppointment = () => useOfferMutation(generateAppointment);
export const useUpdateAppointment = () => useOfferMutation(({ id, data }) => updateAppointment(id, data));
export const useUploadAppointmentAssets = () => useOfferMutation(({ id, formData }) => uploadAppointmentAssets(id, formData));
export const useFinalizeAppointment = () => useOfferMutation(finalizeAppointment);
export const useSendAppointmentEmail = () => useOfferMutation(sendAppointmentEmail);
export const useSendAppointmentWhatsapp = () => useOfferMutation(sendAppointmentWhatsapp);

export const useResendInterviewInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, roundId }) => resendInterviewInvite(candidateId, roundId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidate", variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });
};

export const useInterviewers = () =>
  useQuery({ queryKey: ["recruitment-interviewers"], queryFn: getInterviewers, staleTime: 5 * 60 * 1000 });

export const useApprovers = (enabled = true) =>
  useQuery({ queryKey: ["recruitment-approvers"], queryFn: getApprovers, enabled, staleTime: 60 * 1000 });

export const useSubmitForApproval = () => useOfferMutation(submitForApproval);
export const useWithdrawApproval = () => useOfferMutation(withdrawApproval);

export const useMyApprovals = () =>
  useQuery({
    queryKey: ["my-approvals"],
    queryFn: getMyApprovals,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
  });

export const useApprovalPendingCount = () =>
  useQuery({
    queryKey: ["my-approvals-count"],
    queryFn: getApprovalPendingCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: false,
  });

const useApprovalDecision = (fn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["my-approvals-count"] });
      queryClient.invalidateQueries({ queryKey: ["offer-bundle"] });
    },
  });
};

export const useApproveLetter = () => useApprovalDecision(approveLetter);
export const useRejectLetter = () => useApprovalDecision(rejectLetter);