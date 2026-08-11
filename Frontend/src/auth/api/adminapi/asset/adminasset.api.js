import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAssetAdmin,
  getAllAssetsAdmin,
  getAssetByIdAdmin,
  updateAssetAdmin,
  deleteAssetAdmin,
  assignAssetToEmployee,
  assignAssetToManager,
  revokeAssetAdmin,
  getAssetsOfPersonAdmin,
  getEmployeesWithAssetsAdmin,
  getEmployeeAssetHistoryAdmin,
  getMyAssetsAdmin,
} from "../../api/adminapi/asset/adminasset.api";

export const useGetAllAssetsAdmin = (params) => {
  return useQuery({
    queryKey: ["admin-assets", params],
    queryFn: () => getAllAssetsAdmin(params),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useGetAssetByIdAdmin = (id) => {
  return useQuery({
    queryKey: ["admin-asset", id],
    queryFn: () => getAssetByIdAdmin(id),
    enabled: !!id,
    staleTime: 0,
  });
};

export const useGetAssetsOfPersonAdmin = (person_id, person_model) => {
  return useQuery({
    queryKey: ["admin-assets-person", person_id, person_model],
    queryFn: () => getAssetsOfPersonAdmin(person_id, person_model),
    enabled: !!person_id && !!person_model,
    staleTime: 0,
  });
};

export const useGetEmployeesWithAssetsAdmin = () => {
  return useQuery({
    queryKey: ["admin-assets-employees"],
    queryFn: () => getEmployeesWithAssetsAdmin(),
    staleTime: 0,
    refetchOnMount: true,
  });
};

export const useGetEmployeeAssetHistoryAdmin = (person_id, person_model) => {
  return useQuery({
    queryKey: ["admin-assets-employee-history", person_id, person_model],
    queryFn: () => getEmployeeAssetHistoryAdmin(person_id, person_model),
    enabled: !!person_id && !!person_model,
    staleTime: 0,
  });
};

export const useGetMyAssetsAdmin = () => {
  return useQuery({
    queryKey: ["my-assets-admin"],
    queryFn: () => getMyAssetsAdmin(),
    staleTime: 60 * 1000,
    retry: false,
  });
};

export const useCreateAssetAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAssetAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
    },
  });
};

export const useUpdateAssetAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAssetAdmin(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-asset", id] });
    },
  });
};

export const useDeleteAssetAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAssetAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
    },
  });
};

export const useAssignAssetToEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employee_id, quantity }) =>
      assignAssetToEmployee(id, employee_id, quantity),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-asset", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets-employees"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-assets-employee-history"],
      });
    },
  });
};

export const useAssignAssetToManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, manager_id, quantity }) =>
      assignAssetToManager(id, manager_id, quantity),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-asset", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets-employees"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-assets-employee-history"],
      });
    },
  });
};

export const useRevokeAssetAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => revokeAssetAdmin(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-asset", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets-person"] });
      queryClient.invalidateQueries({ queryKey: ["admin-assets-employees"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-assets-employee-history"],
      });
    },
  });
};