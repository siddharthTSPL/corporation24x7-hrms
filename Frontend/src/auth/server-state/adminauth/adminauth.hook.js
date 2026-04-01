
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import {
//   registerAdmin,
//   loginAdmin,
//   logoutAdmin,
//   getMeAdmin,
//   addManager,
//   addEmployee,
// } from "../../api/adminapi/auth/ad.auth.api.js";

// import { useDispatch } from "react-redux";
// import { setAdmin, logoutAdminState } from "./authSlice";


// export const useRegisterAdmin = () => {
//   return useMutation({
//     mutationFn: registerAdmin,
//   });
// };

// export const useAdminLogin = () => {
//   const dispatch = useDispatch();

//   return useMutation({
//     mutationFn: loginAdmin,
//     onSuccess: (data) => {
//       dispatch(setAdmin(data.admin));
//     },
//   });
// };


// export const useGetMeAdmin = () => {
//   const dispatch = useDispatch();

//   return useQuery({
//     queryKey: ["admin"],
//     queryFn: getMeAdmin,
//     onSuccess: (data) => {
//       dispatch(setAdmin(data));
//     },
//     retry: false,
//   });
// };


// export const useAdminLogout = () => {
//   const dispatch = useDispatch();
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: logoutAdmin,
//     onSuccess: () => {
//       dispatch(logoutAdminState());
//       queryClient.clear(); 
//     },
//   });
// };


// export const useAddManager = () => {
//   return useMutation({
//     mutationFn: addManager,
//   });
// };


// export const useAddEmployee = () => {
//   return useMutation({
//     mutationFn: addEmployee,
//   });
// };