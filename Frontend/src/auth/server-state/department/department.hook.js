import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../api/department/department.api";

<<<<<<< HEAD
const ADMIN_DEPARTMENT_QUERY_KEY = ["admin-departments"];

const updateAdminDepartmentsCache = (queryClient, updater) => {
  queryClient.setQueryData(ADMIN_DEPARTMENT_QUERY_KEY, (prev) => {
    const current = prev && typeof prev === "object" ? prev : { departments: [] };
    const departments = Array.isArray(current.departments) ? current.departments : [];
    return { ...current, departments: updater(departments) };
  });
};

export const useGetAllDepartments = () => {
  return useQuery({
    queryKey: ADMIN_DEPARTMENT_QUERY_KEY,
=======
export const useGetAllDepartments = () => {
  return useQuery({
    queryKey: ["admin-departments"],
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    queryFn: getAllDepartments,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDepartment,
<<<<<<< HEAD
    onSuccess: (response, _variables, _context) => {
      const department = response?.data?.department;
      if (department) {
        updateAdminDepartmentsCache(queryClient, (departments) => [...departments, department]);
      }
      queryClient.invalidateQueries({ queryKey: ADMIN_DEPARTMENT_QUERY_KEY, refetchType: "active" });
=======
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    },
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateDepartment(id, data),
<<<<<<< HEAD
    onSuccess: (response, _variables) => {
      const department = response?.data?.department;
      if (department) {
        updateAdminDepartmentsCache(queryClient, (departments) =>
          departments.map((item) => (item._id === department._id ? department : item))
        );
      }
      queryClient.invalidateQueries({ queryKey: ADMIN_DEPARTMENT_QUERY_KEY, refetchType: "active" });
=======
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDepartment,
<<<<<<< HEAD
    onSuccess: (_response, departmentId) => {
      if (departmentId) {
        updateAdminDepartmentsCache(queryClient, (departments) =>
          departments.filter((item) => item._id !== departmentId)
        );
      }
      queryClient.invalidateQueries({ queryKey: ADMIN_DEPARTMENT_QUERY_KEY, refetchType: "active" });
=======
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    },
  });
};