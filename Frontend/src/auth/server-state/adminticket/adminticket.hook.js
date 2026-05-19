import {
  adminSubmitTicket,
  adminGetMyTickets,
  adminRateTicket,
} from "../../api/adminapi/ticket/adminticket.api";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useSubmitTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminSubmitTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adminTickets"],
      });
    },
  });
};

export const useGetMyTickets = () =>
  useQuery({
    queryKey: ["adminTickets"],
    queryFn: adminGetMyTickets,
  });

export const useRateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminRateTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adminTickets"],
      });
    },
  });
};