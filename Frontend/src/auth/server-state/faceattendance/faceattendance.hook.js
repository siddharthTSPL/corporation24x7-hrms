import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEnrolledFaces,
  enrollFace,
  removeEnrolledFace,
  scanFace,
  loginKiosk,
  logoutKiosk,
  getKioskMe,
} from "../../api/faceattendance/faceattendance.api";

export const useEnrolledFaces = () => {
  return useQuery({
    queryKey: ["faceattendance", "enrolled"],
    queryFn: getEnrolledFaces,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useEnrollFace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enrollFace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faceattendance", "enrolled"] });
    },
  });
};

export const useRemoveFace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeEnrolledFace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faceattendance", "enrolled"] });
    },
  });
};

export const useKioskLogin = () => {
  return useMutation({
    mutationFn: loginKiosk,
  });
};

export const useKioskLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutKiosk,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["kiosk", "me"] });
    },
  });
};

export const useKioskMe = () => {
  return useQuery({
    queryKey: ["kiosk", "me"],
    queryFn: getKioskMe,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

export const useScanFace = () => {
  return useMutation({
    mutationFn: scanFace,
  });
};
