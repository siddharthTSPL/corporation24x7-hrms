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

// -------------------------
// Query Keys
// -------------------------
export const FACE_KEYS = {
  enrolled: ["faceattendance", "enrolled"],
  kioskMe: ["kiosk", "me"],
};

// -------------------------
// Admin Hooks
// -------------------------

export const useEnrolledFaces = () => {
  return useQuery({
    queryKey: FACE_KEYS.enrolled,
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
      queryClient.invalidateQueries({
        queryKey: FACE_KEYS.enrolled,
      });
    },
  });
};

export const useRemoveFace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeEnrolledFace,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FACE_KEYS.enrolled,
      });
    },
  });
};

// -------------------------
// Kiosk Hooks
// -------------------------

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
      queryClient.removeQueries({
        queryKey: FACE_KEYS.kioskMe,
      });
    },
  });
};

export const useKioskMe = () => {
  return useQuery({
    queryKey: FACE_KEYS.kioskMe,
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
