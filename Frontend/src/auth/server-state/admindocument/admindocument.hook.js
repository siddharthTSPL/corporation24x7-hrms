import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  uploadDocument,
  getDocuments,
  updateDocument,
  deleteDocument,
  getAllPersonalDocuments,
  getAllExpenseDocuments,
  getDocumentDetails,
} from "../../api/adminapi/document/addocument.api";

// Upload Document
export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });

      queryClient.invalidateQueries({
        queryKey: ["personal-documents"],
      });

      queryClient.invalidateQueries({
        queryKey: ["expense-documents"],
      });
    },
  });
};

// Get My Documents
export const useGetDocuments = () => {
  return useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });
};

// Update Document
export const useUpdateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });

      queryClient.invalidateQueries({
        queryKey: ["personal-documents"],
      });

      queryClient.invalidateQueries({
        queryKey: ["expense-documents"],
      });
    },
  });
};

// Delete Document
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });

      queryClient.invalidateQueries({
        queryKey: ["personal-documents"],
      });

      queryClient.invalidateQueries({
        queryKey: ["expense-documents"],
      });
    },
  });
};

// Get All Personal Documents
export const useGetAllPersonalDocuments = () => {
  return useQuery({
    queryKey: ["personal-documents"],
    queryFn: getAllPersonalDocuments,
  });
};

// Get All Expense Documents
export const useGetAllExpenseDocuments = () => {
  return useQuery({
    queryKey: ["expense-documents"],
    queryFn: getAllExpenseDocuments,
  });
};

// Get Document Details
export const useGetDocumentDetails = (documentId) => {
  return useQuery({
    queryKey: ["document-details", documentId],
    queryFn: () => getDocumentDetails(documentId),
    enabled: !!documentId,
  });
};