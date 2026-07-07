import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  enrollEmployeeFace,
  listEnrolledFaces,
  removeEnrolledFace,
  kioskLogin,
  kioskLogout,
  kioskMe,
  scanFace,
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
    queryFn: listEnrolledFaces,
  });
};

export const useEnrollFace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enrollEmployeeFace,
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
    mutationFn: kioskLogin,
  });
};

export const useKioskLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: kioskLogout,
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
    queryFn: kioskMe,
    retry: false,
    enabled: false, // fetch manually using queryClient.fetchQuery()
  });
};

export const useScanFace = () => {
  return useMutation({
    mutationFn: scanFace,
  });
};