import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createRequisition,
  getMyRequisitions,
} from "../../../api/managerapi/recruitment/recruitment.api";

export const useCreateRequisition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRequisition,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["my-requisitions"],
      });
    },
  });
};

export const useGetMyRequisitions = () => {
  return useQuery({
    queryKey: ["my-requisitions"],
    queryFn: getMyRequisitions,
  });
};