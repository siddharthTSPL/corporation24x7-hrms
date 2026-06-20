import { applyWFH, editWFH, deleteWFH, getMyWFH } from "../../../api/employeeapi/wfh/emwfh.api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetMyWFH = () => {
  return useQuery({
    queryKey: ["employee-wfh"],
    queryFn: getMyWFH,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useApplyWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-wfh"] });
    },
  });
};

export const useEditWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => editWFH(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-wfh"] });
    },
  });
};

export const useDeleteWFH = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWFH,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-wfh"] });
    },
  });
};