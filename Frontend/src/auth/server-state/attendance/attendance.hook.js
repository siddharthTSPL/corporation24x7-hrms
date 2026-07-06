import { activity, checkin, checkout, getTodayAttendance, getMyShift } from "../../api/attendance/attendance.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useTodayAttendance = () => {
  return useQuery({
    queryKey: ["attendance", "today"],
    queryFn: getTodayAttendance,
    retry: false,
    staleTime: 30_000,
  });
};

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
// hooks
export const useGetMyShift = () => {
  return useQuery({
    queryKey: ["my-shift"],
    queryFn: getMyShift,
    staleTime: 5 * 60 * 1000, // shift rarely changes mid-day
  });
};