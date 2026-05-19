import {
  adminSubmitTicket,
  adminGetMyTickets,
  adminRateTicket,
} from "../../api/adminapi/ticket/adminticket.api";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useAdminSubmitTicket = () => {
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

export const useAdminGetMyTickets = () =>
  useQuery({
    queryKey: ["adminTickets"],
    queryFn: adminGetMyTickets,
  });

export const useAdminRateTicket = () => {
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