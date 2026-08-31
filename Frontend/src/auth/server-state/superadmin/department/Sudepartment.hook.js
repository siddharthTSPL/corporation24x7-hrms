import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllDepartmentsSuperAdmin,
  createDepartmentSuperAdmin,
  updateDepartmentSuperAdmin,
  deleteDepartmentSuperAdmin,
} from "../../../api/superadmin/department/Sudepartment.api";

export const useGetAllDepartmentsSuperAdmin = () => {
  return useQuery({
    queryKey: ["superadmin-departments"],
    queryFn: getAllDepartmentsSuperAdmin,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useCreateDepartmentSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDepartmentSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-departments"] });
    },
  });
};

export const useUpdateDepartmentSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateDepartmentSuperAdmin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-departments"] });
    },
  });
};

export const useDeleteDepartmentSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDepartmentSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-departments"] });
    },
  });
};