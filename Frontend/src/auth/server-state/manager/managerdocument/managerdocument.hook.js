import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadManagerDocument, getManagerDocuments, updateManagerDocument, deleteManagerDocument, getAllExpenseDocuments, getAllPersonalDocuments, getDocumentDetails } from "../../../api/managerapi/document/madocument.api";

export const useUploadManagerDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadManagerDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-documents"] });
      queryClient.invalidateQueries({ queryKey: ["manager-personal-documents"] });
      queryClient.invalidateQueries({ queryKey: ["manager-expense-documents"] });
    },
  });
};

export const useGetManagerDocuments = () => {
  return useQuery({
    queryKey: ["manager-documents"],
    queryFn: getManagerDocuments,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useUpdateManagerDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateManagerDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-documents"] });
      queryClient.invalidateQueries({ queryKey: ["manager-personal-documents"] });
      queryClient.invalidateQueries({ queryKey: ["manager-expense-documents"] });
    },
  });
};

export const useDeleteManagerDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManagerDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-documents"] });
      queryClient.invalidateQueries({ queryKey: ["manager-personal-documents"] });
      queryClient.invalidateQueries({ queryKey: ["manager-expense-documents"] });
    },
  });
};

export const useGetAllExpenseDocuments = () => {
  return useQuery({
    queryKey: ["manager-expense-documents"],
    queryFn: getAllExpenseDocuments,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetAllPersonalDocuments = () => {
  return useQuery({
    queryKey: ["manager-personal-documents"],
    queryFn: getAllPersonalDocuments,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetDocumentDetails = (documentId) => {
  return useQuery({
    queryKey: ["manager-document-details", documentId],
    queryFn: () => getDocumentDetails(documentId),
    enabled: !!documentId,
    staleTime: 0,
    refetchOnMount: true,
  });
};