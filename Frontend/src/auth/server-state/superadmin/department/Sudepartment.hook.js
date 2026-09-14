import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllDepartmentsSuperAdmin,
  createDepartmentSuperAdmin,
  updateDepartmentSuperAdmin,
  deleteDepartmentSuperAdmin,
} from "../../../api/superadmin/department/Sudepartment.api";

<<<<<<< HEAD
const SUPERADMIN_DEPARTMENT_QUERY_KEY = ["superadmin-departments"];

const updateSuperAdminDepartmentsCache = (queryClient, updater) => {
  queryClient.setQueryData(SUPERADMIN_DEPARTMENT_QUERY_KEY, (prev) => {
    const current = prev && typeof prev === "object" ? prev : { departments: [] };
    const departments = Array.isArray(current.departments) ? current.departments : [];
    return { ...current, departments: updater(departments) };
  });
};

export const useGetAllDepartmentsSuperAdmin = () => {
  return useQuery({
    queryKey: SUPERADMIN_DEPARTMENT_QUERY_KEY,
=======
export const useGetAllDepartmentsSuperAdmin = () => {
  return useQuery({
    queryKey: ["superadmin-departments"],
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
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
<<<<<<< HEAD
    onSuccess: (response, _variables, _context) => {
      const department = response?.data?.department;
      if (department) {
        updateSuperAdminDepartmentsCache(queryClient, (departments) => [...departments, department]);
      }
      queryClient.invalidateQueries({ queryKey: SUPERADMIN_DEPARTMENT_QUERY_KEY, refetchType: "active" });
=======
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-departments"] });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    },
  });
};

export const useUpdateDepartmentSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateDepartmentSuperAdmin(id, data),
<<<<<<< HEAD
    onSuccess: (response, _variables) => {
      const department = response?.data?.department;
      if (department) {
        updateSuperAdminDepartmentsCache(queryClient, (departments) =>
          departments.map((item) => (item._id === department._id ? department : item))
        );
      }
      queryClient.invalidateQueries({ queryKey: SUPERADMIN_DEPARTMENT_QUERY_KEY, refetchType: "active" });
=======
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-departments"] });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    },
  });
};

export const useDeleteDepartmentSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDepartmentSuperAdmin,
<<<<<<< HEAD
    onSuccess: (_response, departmentId) => {
      if (departmentId) {
        updateSuperAdminDepartmentsCache(queryClient, (departments) =>
          departments.filter((item) => item._id !== departmentId)
        );
      }
      queryClient.invalidateQueries({ queryKey: SUPERADMIN_DEPARTMENT_QUERY_KEY, refetchType: "active" });
=======
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-departments"] });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    },
  });
};