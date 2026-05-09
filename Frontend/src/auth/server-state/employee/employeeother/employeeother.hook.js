import { uploadDocument, getDocuments, editDocument, deleteDocument,fetchOrgInfo } from "../../../api/employeeapi/other/em.other.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getattendance } from "../../../api/employeeapi/leave/em.leave.api";

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

export const useGetAttendance = () => {
    return useQuery({
        queryKey: ["attendance"],
        queryFn: getattendance,
    });
};


export const useGetOrgInfoEmployee = () => {
  return useQuery({
    queryKey: ["orgInfo-manager"],
    queryFn:  fetchOrgInfo,        
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};