import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  submitTicket        as _submitTicket,
  getMyTickets        as _getMyTickets,
  rateTicket          as _rateTicket,
  getTicketStats      as _getTicketStats,
  getAllTickets        as _getAllTickets,
  getTicketById       as _getTicketById,
  updateTicketStatus  as _updateTicketStatus,
  escalateTicket      as _escalateTicket,
  deleteTicket        as _deleteTicket,
} from "../../api/ticket/ticket.api";

/* ── Submitter hooks (employee / manager / admin) ── */

export const useSubmitTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: _submitTicket,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["my-tickets"] }),
  });
};

export const useGetMyTickets = () =>
  useQuery({
    queryKey: ["my-tickets"],
    queryFn:  _getMyTickets,
    staleTime: 60_000,
  });

export const useRateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketNumber, ...data }) => _rateTicket(ticketNumber, data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["my-tickets"] }),
  });
};

/* ── Super-admin hooks ── */

export const useGetTicketStats = () =>
  useQuery({
    queryKey:             ["ticket-stats"],
    queryFn:              _getTicketStats,
    staleTime:            60_000 * 2,
    refetchOnWindowFocus: false,
  });

export const useGetAllTickets = (params = {}) =>
  useQuery({
    queryKey:             ["tickets", params],
    queryFn:              () => _getAllTickets(params),
    staleTime:            60_000,
    keepPreviousData:     true,
    refetchOnWindowFocus: false,
  });

export const useGetTicketById = (id) =>
  useQuery({
    queryKey:  ["ticket", id],
    queryFn:   () => _getTicketById(id),
    enabled:   !!id,
    staleTime: 30_000,
  });

export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => _updateTicketStatus(id, data),
    onSuccess:  (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket", vars.id] });
      qc.invalidateQueries({ queryKey: ["ticket-stats"] });
    },
  });
};

export const useEscalateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => _escalateTicket(id, data),
    onSuccess:  (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket", vars.id] });
    },
  });
};

export const useDeleteTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: _deleteTicket,
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket-stats"] });
    },
  });
};