<<<<<<< HEAD
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
=======
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
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  });
};

export const useEnrollFace = () => {
  const queryClient = useQueryClient();

  return useMutation({
<<<<<<< HEAD
    mutationFn: enrollFace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faceattendance", "enrolled"] });
=======
    mutationFn: enrollEmployeeFace,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: FACE_KEYS.enrolled,
      });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    },
  });
};

export const useRemoveFace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeEnrolledFace,
    onSuccess: () => {
<<<<<<< HEAD
      queryClient.invalidateQueries({ queryKey: ["faceattendance", "enrolled"] });
=======
      queryClient.invalidateQueries({
        queryKey: FACE_KEYS.enrolled,
      });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    },
  });
};

<<<<<<< HEAD
export const useKioskLogin = () => {
  return useMutation({
    mutationFn: loginKiosk,
=======
// -------------------------
// Kiosk Hooks
// -------------------------

export const useKioskLogin = () => {
  return useMutation({
    mutationFn: kioskLogin,
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  });
};

export const useKioskLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
<<<<<<< HEAD
    mutationFn: logoutKiosk,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["kiosk", "me"] });
=======
    mutationFn: kioskLogout,
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: FACE_KEYS.kioskMe,
      });
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
    },
  });
};

export const useKioskMe = () => {
  return useQuery({
<<<<<<< HEAD
    queryKey: ["kiosk", "me"],
    queryFn: getKioskMe,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
=======
    queryKey: FACE_KEYS.kioskMe,
    queryFn: kioskMe,
    retry: false,
    enabled: false, // fetch manually using queryClient.fetchQuery()
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
  });
};

export const useScanFace = () => {
  return useMutation({
    mutationFn: scanFace,
  });
<<<<<<< HEAD
};
=======
};
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
