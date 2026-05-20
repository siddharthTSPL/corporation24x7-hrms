import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getAllRequisitions,
  getPendingRequisitions,
  getRequisitionById,
  approveRequisition,
  rejectRequisition,
  holdRequisition,
  requestRevision,
  addCandidate,
  getCandidatesByRequisition,
  getCandidateById,
  updateCandidateStage,
  scheduleInterview,
  submitInterviewFeedback,
} from "../../api/adminapi/recruitment/recruitment.api";

export const useGetAllRequisitions = () => {
  return useQuery({
    queryKey: ["all-requisitions"],
    queryFn: getAllRequisitions,
  });
};

export const useGetPendingRequisitions = () => {
  return useQuery({
    queryKey: ["pending-requisitions"],
    queryFn: getPendingRequisitions,
  });
};

export const useGetRequisitionById = (id) => {
  return useQuery({
    queryKey: ["requisition", id],
    queryFn: () => getRequisitionById(id),
    enabled: !!id,
  });
};

export const useApproveRequisition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => approveRequisition(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["all-requisitions"],
      });

      queryClient.invalidateQueries({
        queryKey: ["pending-requisitions"],
      });
    },
  });
};

export const useRejectRequisition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => rejectRequisition(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["all-requisitions"],
      });

      queryClient.invalidateQueries({
        queryKey: ["pending-requisitions"],
      });
    },
  });
};

export const useHoldRequisition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => holdRequisition(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["all-requisitions"],
      });

      queryClient.invalidateQueries({
        queryKey: ["pending-requisitions"],
      });
    },
  });
};

export const useRequestRevision = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => requestRevision(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["all-requisitions"],
      });

      queryClient.invalidateQueries({
        queryKey: ["pending-requisitions"],
      });
    },
  });
};

export const useAddCandidate = () => {
  return useMutation({
    mutationFn: addCandidate,
  });
};

export const useGetCandidatesByRequisition = (requisition_id) => {
  return useQuery({
    queryKey: ["candidates", requisition_id],
    queryFn: () => getCandidatesByRequisition(requisition_id),
    enabled: !!requisition_id,
  });
};

export const useGetCandidateById = (id) => {
  return useQuery({
    queryKey: ["candidate", id],
    queryFn: () => getCandidateById(id),
    enabled: !!id,
  });
};

export const useUpdateCandidateStage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateCandidateStage(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["candidates"],
      });
    },
  });
};

export const useScheduleInterview = () => {
  return useMutation({
    mutationFn: ({ id, data }) => scheduleInterview(id, data),
  });
};

export const useSubmitInterviewFeedback = () => {
  return useMutation({
    mutationFn: ({ candidateId, roundId, data }) =>
      submitInterviewFeedback(candidateId, roundId, data),
  });
};
