import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDpdpStatus, verifyDpdpPin, lockDpdp, getMyConsent, saveMyConsent, getMyRequests,
  createDpdpRequest, exportMyData, getDpdpAdminSettings, updateDpdpAdminSettings,
  setDpdpAdminPin, getDpdpAccessLog, getDpdpAdminRequests, updateDpdpAdminRequest,
} from "../../api/dpdp/dpdp.api";

const KEY = "dpdp";

// Polled lightly so the lock/unlock chip stays right; a 401 (logged out) just means "no status".
export const useDpdpStatus = () =>
  useQuery({
    queryKey: [KEY, "status"],
    queryFn: getDpdpStatus,
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

// After PIN entry/lock, everything that may contain masked data must be re-fetched.
const refetchAll = (qc) => qc.invalidateQueries();

export const useVerifyDpdpPin = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: verifyDpdpPin, onSuccess: () => refetchAll(qc) });
};
export const useLockDpdp = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: lockDpdp, onSettled: () => refetchAll(qc) });
};

export const useMyConsent = () => useQuery({ queryKey: [KEY, "consent"], queryFn: getMyConsent });
export const useSaveConsent = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: saveMyConsent, onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "consent"] }) });
};

export const useMyDpdpRequests = () => useQuery({ queryKey: [KEY, "my-requests"], queryFn: getMyRequests });
export const useCreateDpdpRequest = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createDpdpRequest, onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "my-requests"] }) });
};
export const useExportMyData = () => useMutation({ mutationFn: exportMyData });

export const useDpdpAdminSettings = () => useQuery({ queryKey: [KEY, "admin-settings"], queryFn: getDpdpAdminSettings });
export const useUpdateDpdpSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateDpdpAdminSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "admin-settings"] });
      qc.invalidateQueries({ queryKey: [KEY, "status"] });
    },
  });
};
export const useSetDpdpPin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setDpdpAdminPin,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "admin-settings"] });
      qc.invalidateQueries({ queryKey: [KEY, "access-log"] });
    },
  });
};
export const useDpdpAccessLog = (params) => useQuery({ queryKey: [KEY, "access-log", params], queryFn: () => getDpdpAccessLog(params) });
export const useDpdpAdminRequests = (params) => useQuery({ queryKey: [KEY, "admin-requests", params], queryFn: () => getDpdpAdminRequests(params) });
export const useUpdateDpdpRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateDpdpAdminRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "admin-requests"] });
      qc.invalidateQueries({ queryKey: [KEY, "access-log"] });
    },
  });
};
