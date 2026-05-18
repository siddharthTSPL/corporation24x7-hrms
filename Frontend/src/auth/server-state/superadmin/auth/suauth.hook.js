import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  registerSuperAdmin,
  verifySuperAdmin,
  loginSuperAdmin,
  getMeSuperAdmin,
  logoutSuperAdmin,
  updateSuperAdminProfile,
} from "../../../api/superadmin/auth/su.auth";



export const useRegisterSuperAdmin = () => {
  return useMutation({
    mutationFn: registerSuperAdmin,
  });
};



export const useVerifySuperAdmin = () => {
  return useMutation({
    mutationFn: verifySuperAdmin,
  });
};



export const useLoginSuperAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginSuperAdmin,

    onSuccess: async () => {
      try {
        const user = await getMeSuperAdmin();

        localStorage.setItem("role", "superadmin");

        queryClient.setQueryData(["auth"], {
          role: "superadmin",
          data: user,
        });
      } catch (error) {
        console.error(error);
      }
    },
  });
};



export const useGetMeSuperAdmin = () => {
  return useQuery({
    queryKey: ["superadmin-profile"],
    queryFn: getMeSuperAdmin,
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });
};



export const useLogoutSuperAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutSuperAdmin,

    onSuccess: () => {
      localStorage.removeItem("role");

      queryClient.removeQueries({
        queryKey: ["auth"],
      });

      queryClient.removeQueries({
        queryKey: ["superadmin-profile"],
      });
    },
  });
};



export const useUpdateSuperAdminProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSuperAdminProfile,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["superadmin-profile"],
      });

      queryClient.invalidateQueries({
        queryKey: ["auth"],
      });
    },
  });
};