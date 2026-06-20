import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadDocument, getDocuments, updateDocument, deleteDocument, getAllPersonalDocuments, getAllExpenseDocuments, getDocumentDetails } from "../../api/adminapi/document/addocument.api";

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["personal-documents"] });
      queryClient.invalidateQueries({ queryKey: ["expense-documents"] });
    },
  });
};

export const useGetDocuments = () => {
  return useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["personal-documents"] });
      queryClient.invalidateQueries({ queryKey: ["expense-documents"] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["personal-documents"] });
      queryClient.invalidateQueries({ queryKey: ["expense-documents"] });
    },
  });
};

export const useGetAllPersonalDocuments = () => {
  return useQuery({
    queryKey: ["personal-documents"],
    queryFn: getAllPersonalDocuments,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetAllExpenseDocuments = () => {
  return useQuery({
    queryKey: ["expense-documents"],
    queryFn: getAllExpenseDocuments,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetDocumentDetails = (documentId) => {
  return useQuery({
    queryKey: ["document-details", documentId],
    queryFn: () => getDocumentDetails(documentId),
    enabled: !!documentId,
    staleTime: 0,
    refetchOnMount: true,
  });
};