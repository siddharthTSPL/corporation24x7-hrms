import {
  applyWFH,
  editWFH,
  deleteWFH,
  getMyWFH,
} from "../../../api/employeeapi/wfh/emwfh.api";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetMyWFH = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["employee-wfh"],
    queryFn: () => getMyWFH(),
    onSuccess: (data) => {
      queryClient.setQueryData(["employee-wfh"], data);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });
};

export const useApplyWFH = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => applyWFH(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["employee-wfh"]);
    },
  });
};

export const useEditWFH = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => editWFH(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["employee-wfh"]);
    },
  });
};

export const useDeleteWFH = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteWFH(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["employee-wfh"]);
    },
  });
};