import { verifyManager,loginManager,logoutManager,updateManagerPassword,firstLoginPasswordChange,getMeManager  } from "../../../api/managerapi/auth/ma.auth.api";


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useVerifyManager = (token) => {
    const queryClient = useQueryClient();

    return useQuery({
         queryKey: ["verifyManager", token],
         queryFn: () => verifyManager(token),
         enabled: !!token,
    })
};


export const useLoginManager = () => {
     const queryClient = useQueryClient();

     return useMutation(loginManager, {
          mutationKey: ["loginManager"],
          mutationFn:loginManager,
          onSuccess: (data) => {
               queryClient.setQueryData(["manager"], data.manager || data);
          },
     })
};



export const useFirstLoginPasswordChange = () => {
      const queryClient = useQueryClient();

     return useMutation(firstLoginPasswordChange, {
          mutationKey: ["firstLoginPasswordChange"],
          mutationFn:firstLoginPasswordChange,
          onSuccess: () => {
               queryClient.removeQueries({ queryKey: ["manager"] });
          },
     })
};

export const useUpdateManagerPassword = () => {
  const queryClient = useQueryClient();

     return useMutation(updateManagerPassword, {
          mutationKey: ["updateManagerPassword"],
          mutationFn:updateManagerPassword,
          onSuccess: () => {
               queryClient.removeQueries({ queryKey: ["manager"] });
          },
     })
};

export const useGetMeManager = () => {
     const queryClient = useQueryClient();
     return useQuery({
          queryKey: ["meManager"],
          queryFn: getMeManager,
          onSuccess: (data) => {
               queryClient.setQueryData(["manager"], data.manager || data);
          },
     });
};
export const useLogoutManager = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutManager,
    onSuccess: () => {
      localStorage.removeItem("role");
      queryClient.removeQueries({ queryKey: ["auth"] });
    },
  });
};