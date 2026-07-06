import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllShiftsSuperAdmin,
  createShiftSuperAdmin,
  updateShiftSuperAdmin,
  setDefaultShiftSuperAdmin,
  deleteShiftSuperAdmin,
  assignShiftToUserSuperAdmin,
} from "../../../api/superadmin/shift/Sushift.api";

export const useGetAllShiftsSuperAdmin = () => {
  return useQuery({
    queryKey: ["superadmin-shifts"],
    queryFn: getAllShiftsSuperAdmin,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useCreateShiftSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShiftSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
    },
  });
};

export const useUpdateShiftSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateShiftSuperAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
    },
  });
};

export const useSetDefaultShiftSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDefaultShiftSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
    },
  });
};

export const useDeleteShiftSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteShiftSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
    },
  });
};

export const useAssignShiftToUserSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignShiftToUserSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-shifts"] });
      // also invalidate wherever you list employees/managers/admins
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
  });
};