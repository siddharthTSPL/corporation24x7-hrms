import { verifyManager,loginManager,logoutManager,updateManagerPassword,firstLoginPasswordChange,getMeManager  } from "../../../api/managerapi/auth/ma.auth.api";


import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useVerifyManager = (token) => {
     return useQuery({
          queryKey: ["verifyManager", token],
          queryFn: () => verifyManager(token),
          enabled: !!token,
     });
};


export const useLoginManager = () => {
     return useMutation(loginManager);
};

export const useLogoutManager = () => {
     return useMutation(logoutManager);
};

export const useFirstLoginPasswordChange = () => {
     return useMutation(firstLoginPasswordChange);
};

export const useUpdateManagerPassword = () => {
     return useMutation(updateManagerPassword);
};

export const useGetMeManager = () => {
     return useQuery(["meManager"], getMeManager);
};
