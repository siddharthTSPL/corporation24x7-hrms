import {
  employeeSubmitTicket,
  employeeGetMyTickets,
  employeeRateTicket,
} from "../../../api/employeeapi/ticket/employeeticket.api";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useEmployeeSubmitTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeeSubmitTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employeeTickets"],
      });
    },
  });
};

export const useEmployeeGetMyTickets = () =>
  useQuery({
    queryKey: ["employeeTickets"],
    queryFn: employeeGetMyTickets,
  });

export const useEmployeeRateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: employeeRateTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employeeTickets"],
      });
    },
  });
};