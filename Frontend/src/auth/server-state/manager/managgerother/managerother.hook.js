import {
  getEmployeeDocuments,
  forgetPasswordManager,
  resetManagerPassword,
  verifyManagerOtpApi,
  getUsersUnderManager,
  reviewEmployee,
  editManagerProfile,
  changeManagerPassword,
  getAllExpenseDocuments,
  getDocumentDetails,
  getAllPersonalDocuments,
  getattendance,
  fetchOrgInfo,
  getOrgInfo,
  getSubManagers,
  reviewSubManager,
  getMyTeamReviews,
  respondToMyReviewAsManager,
} from "../../../api/managerapi/other/ma.other.api";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetEmployeeDocuments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["getEmployeeDocuments"],
    mutationFn: getEmployeeDocuments,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["expenseDocuments"] });
    },
  });
};

export const useForgetPasswordManager = () => {
  return useMutation({
    mutationKey: ["forgetPasswordManager"],
    mutationFn: forgetPasswordManager,
  });
};

export const useResetManagerPassword = () => {
  return useMutation({
    mutationKey: ["resetManagerPassword"],
    mutationFn: resetManagerPassword,
  });
};

export const useVerifyManagerOtpApi = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["verifyManagerOtpApi"],
    mutationFn: verifyManagerOtpApi,
    onSuccess: (data) => {
      queryClient.setQueryData(["manager"], data.my_details || data);
    },
  });
};

export const useGetUsersUnderManager = () => {
  return useQuery({
    queryKey: ["usersUnderManager"],
    queryFn: getUsersUnderManager,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useReviewEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["reviewEmployee"],
    mutationFn: reviewEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meManager"] });
    },
  });
};

export const useGetSubManagers = () => {
  return useQuery({
    queryKey: ["subManagers"],
    queryFn: getSubManagers,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useReviewSubManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["reviewSubManager"],
    mutationFn: reviewSubManager,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meManager"] });
      queryClient.invalidateQueries({ queryKey: ["myTeamReviews"] });
    },
  });
};

export const useGetMyTeamReviews = (params = {}) => {
  return useQuery({
    queryKey: ["myTeamReviews", params],
    queryFn: () => getMyTeamReviews(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useRespondToMyReviewAsManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: respondToMyReviewAsManager,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meManager"] });
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["editManagerProfile"],
    mutationFn: editManagerProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(["meManager"], (old) =>
        old ? { ...old, manager: { ...old.manager, ...data.manager } } : old
      );
      queryClient.invalidateQueries({ queryKey: ["meManager"] });
    },
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationKey: ["changeManagerPassword"],
    mutationFn: changeManagerPassword,
  });
};

export const useGetAllExpenseDocuments = () => {
  return useQuery({
    queryKey: ["expenseDocuments"],
    queryFn: getAllExpenseDocuments,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useGetAllPersonalDocuments = () => {
  return useQuery({
    queryKey: ["personalDocuments"],
    queryFn: getAllPersonalDocuments,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useGetDocumentDetails = (documentId) => {
  return useQuery({
    queryKey: ["documentDetails", documentId],
    queryFn: () => getDocumentDetails(documentId),
    enabled: !!documentId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useGetAttendance = () => {
  return useQuery({
    queryKey: ["attendance"],
    queryFn: getattendance,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useGetOrgInfoManager = () => {
  return useQuery({
    queryKey: ["orgInfo-manager"],
    queryFn: fetchOrgInfo,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useGetOrgInfo = () => {
  return useQuery({
    queryKey: ["org-info"],
    queryFn: getOrgInfo,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};