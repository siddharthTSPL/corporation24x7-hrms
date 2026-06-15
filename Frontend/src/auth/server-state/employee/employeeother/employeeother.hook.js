import { uploadDocument, getDocuments, editDocument, deleteDocument, fetchOrgInfo } from "../../../api/employeeapi/other/em.other.api";
import { getAttendance } from "../../../api/employeeapi/leave/em.leave.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

export const useGetDocuments = () =>
  useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

export const useEditDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: editDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

export const useGetAttendance = () =>
  useQuery({
    queryKey: ["attendance", "all"],
    queryFn: getAttendance,
    retry: false,
    staleTime: 2 * 60 * 1000,
  });

export const useGetOrgInfoEmployee = () =>
  useQuery({
    queryKey: ["orgInfo-manager"],
    queryFn: fetchOrgInfo,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });