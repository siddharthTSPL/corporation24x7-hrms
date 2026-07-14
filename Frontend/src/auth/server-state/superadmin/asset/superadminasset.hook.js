import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAssetSuperAdmin,
  getAllAssetsSuperAdmin,
  getAssetByIdSuperAdmin,
  updateAssetSuperAdmin,
  deleteAssetSuperAdmin,
  assignAssetToAdmin,
  revokeAssetSuperAdmin,
  getAssetsOfPersonSuperAdmin,
} from "../../../api/superadmin/asset/superadminasset.api";

export const useGetAllAssetsSuperAdmin = (params) => {
  return useQuery({
    queryKey: ["superadmin-assets", params],
    queryFn: () => getAllAssetsSuperAdmin(params),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

export const useGetAssetByIdSuperAdmin = (id) => {
  return useQuery({
    queryKey: ["superadmin-asset", id],
    queryFn: () => getAssetByIdSuperAdmin(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useGetAssetsOfPersonSuperAdmin = (person_id, person_model) => {
  return useQuery({
    queryKey: ["superadmin-assets-person", person_id, person_model],
    enabled: !!person_id && !!person_model,
    queryFn: () => getAssetsOfPersonSuperAdmin(person_id, person_model),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateAssetSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAssetSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-assets"] });
    },
  });
};

export const useUpdateAssetSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateAssetSuperAdmin(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-asset", id] });
    },
  });
};

export const useDeleteAssetSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAssetSuperAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-assets"] });
    },
  });
};

export const useAssignAssetToAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, admin_id, quantity }) => assignAssetToAdmin(id, admin_id, quantity),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-asset", id] });
    },
  });
};

export const useRevokeAssetSuperAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => revokeAssetSuperAdmin(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["superadmin-assets"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-asset", id] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-assets-person"] });
    },
  });
};