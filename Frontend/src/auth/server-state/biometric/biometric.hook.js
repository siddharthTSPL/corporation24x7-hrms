import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../../api/biometric/biometric.api";

const KEY = ["biometric"];

export const useBiometricDevices = () => useQuery({ queryKey: [...KEY, "devices"], queryFn: api.getBiometricDevices, staleTime: 0, refetchInterval: 30000 });
export const useBiometricDeviceUsers = (id) =>
  useQuery({ queryKey: [...KEY, "users", id], queryFn: () => api.getBiometricDeviceUsers(id), enabled: !!id, staleTime: 0 });
export const useBiometricPunches = (params) =>
  useQuery({ queryKey: [...KEY, "punches", params], queryFn: () => api.getBiometricPunches(params), staleTime: 0, keepPreviousData: true });

const useInvalidating = (fn) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) });
};
export const useCreateBiometricDevice = () => useInvalidating(api.createBiometricDevice);
export const useUpdateBiometricDevice = () => useInvalidating(api.updateBiometricDevice);
export const useDeleteBiometricDevice = () => useInvalidating(api.deleteBiometricDevice);
export const useMapBiometricUser = () => useInvalidating(api.mapBiometricUser);
export const useAutoMapBiometricUsers = () => useInvalidating(api.autoMapBiometricUsers);
export const useReprocessBiometric = () => useInvalidating(api.reprocessBiometric);
