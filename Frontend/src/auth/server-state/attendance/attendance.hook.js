import { activity,checkin,checkout } from "../../api/attendance/attendance.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCheckin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
};

export const useActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
};

export const useCheckout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
};