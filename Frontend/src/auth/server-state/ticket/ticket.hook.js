import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getTicketStats as _getTicketStats,
  getAllTickets as _getAllTickets,
  getTicketById as _getTicketById,
  updateTicketStatus as _updateTicketStatus,
  escalateTicket as _escalateTicket,
  deleteTicket as _deleteTicket,
} from "../../api/ticket/ticket.api";

export const useGetTicketStats = () =>
  useQuery({
    queryKey: ["ticket-stats"],
    queryFn: _getTicketStats,
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

export const useGetAllTickets = (params = {}) =>
  useQuery({
    queryKey: ["tickets", params],
    queryFn: () => _getAllTickets(params),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

export const useGetTicketById = (id) =>
  useQuery({
    queryKey: ["ticket", id],
    queryFn: () => _getTicketById(id),
    enabled: !!id,
    staleTime: 30000,
  });

export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: _updateTicketStatus,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["tickets"],
      });

      qc.invalidateQueries({
        queryKey: ["ticket", vars.id],
      });

      qc.invalidateQueries({
        queryKey: ["ticket-stats"],
      });
    },
  });
};

export const useEscalateTicket = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: _escalateTicket,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["tickets"],
      });

      qc.invalidateQueries({
        queryKey: ["ticket", vars.id],
      });

      qc.invalidateQueries({
        queryKey: ["ticket-stats"],
      });
    },
  });
};

export const useDeleteTicket = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: _deleteTicket,
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["tickets"],
      });

      qc.invalidateQueries({
        queryKey: ["ticket-stats"],
      });
    },
  });
};