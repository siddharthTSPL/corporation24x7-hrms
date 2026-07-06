import { activity, checkin, checkout, getTodayAttendance, getMyShift, getCalendarMeta } from "../../api/attendance/attendance.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useTodayAttendance = () => {
  return useQuery({
    queryKey: ["attendance", "today"],
    queryFn: getTodayAttendance,
    retry: false,
    staleTime: 30_000,
  });
};

// Holidays + week-offs for the given month, plus a "today" block telling
// the UI whether check-in is currently allowed (holiday / week-off / shift
// window all combined). Refetches every minute so the Check-in button
// flips on/off in real time as the shift window opens or closes.
export const useCalendarMeta = (month, year) => {
  return useQuery({
    queryKey: ["attendance", "calendar-meta", month, year],
    queryFn: () => getCalendarMeta({ month: month + 1, year }),
    retry: false,
    staleTime: 60_000,
    refetchInterval: 60_000,
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