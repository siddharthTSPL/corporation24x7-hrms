import {
  managerSubmitTicket,
  managerGetMyTickets,
  managerRateTicket,
  managerGetTicketDetail,
} from "../../../api/managerapi/ticket/managerticket.api";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useManagerSubmitTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: managerSubmitTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["managerTickets"],
      });
    },
  });
};

export const useManagerGetMyTickets = () =>
  useQuery({
    queryKey: ["managerTickets"],
    queryFn: managerGetMyTickets,
  });

export const useManagerRateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: managerRateTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["managerTickets"],
      });
    },
  });
};

export const useGetManagerTicketDetail = (ticketNumber) =>
  useQuery({
    queryKey: ["managerTicket", ticketNumber],
    queryFn: () => managerGetTicketDetail(ticketNumber),
    enabled: !!ticketNumber,
    staleTime: 30000,
  });