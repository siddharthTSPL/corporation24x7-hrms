import { adminSubmitTicket, adminGetMyTickets, adminRateTicket, adminGetTicketDetail } from "../../api/adminapi/ticket/adminticket.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useSubmitTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminSubmitTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
    },
  });
};

export const useGetMyTickets = () =>
  useQuery({
    queryKey: ["adminTickets"],
    queryFn: adminGetMyTickets,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

export const useRateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminRateTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
    },
  });
};

export const useGetTicketDetail = (ticketNumber) =>
  useQuery({
    queryKey: ["adminTicket", ticketNumber],
    queryFn: () => adminGetTicketDetail(ticketNumber),
    enabled: !!ticketNumber,
    staleTime: 0,
    refetchOnMount: true,
  });