import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllShifts,
  createShift,
  updateShift,
  setDefaultShift,
  deleteShift,
  assignShiftToUser,
} from "../../api/shift/shift.api";

export const useGetAllShifts = () => {
  return useQuery({
    queryKey: ["admin-shifts"],
    queryFn: getAllShifts,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useCreateShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
    },
  });
};

export const useUpdateShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
    },
  });
};

export const useSetDefaultShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDefaultShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
    },
  });
};

export const useDeleteShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
    },
  });
};

export const useAssignShiftToUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignShiftToUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
      // also invalidate wherever you list employees/managers/admins
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
  });
};