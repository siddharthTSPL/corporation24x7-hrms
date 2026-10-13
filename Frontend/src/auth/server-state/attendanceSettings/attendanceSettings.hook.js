import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAttendanceSettings,
  updateAttendanceSettings,
} from "../../api/attendanceSettings/attendanceSettings.api";

const KEY = ["attendance-settings"];

export const useGetAttendanceSettings = () =>
  useQuery({
    queryKey: KEY,
    queryFn: getAttendanceSettings,
    staleTime: 0,
    refetchOnMount: true,
  });

export const useUpdateAttendanceSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAttendanceSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};