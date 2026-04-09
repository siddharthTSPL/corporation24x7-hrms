import { loginUser,verifyUser,getMeUser,logoutUser,verifyOtp,forgetPassword,updatePassword,firstLoginResetPassword,resetPasswordAfterForget,getMeUser  } from "../../../api/employeeapi/auth/em.auth.api";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useLoginUser = () => {
     const queryClient = useQueryClient();
     return useMutation(loginUser, {
          mutationKey: ["loginUser"],
          mutationFn:loginUser,
          onSuccess: (data) => {
               queryClient.setQueryData(["meUser"], data.user);
          },
     })
}

export const useVerifyUser = (token) => {
   const queryClient = useQueryClient();

   return useQuery({
        queryKey: ["verifyUser", token],
        queryFn: () => verifyUser(token),
        enabled: !!token,
   })
};

export const useGetMeUser = () => {
     const queryClient = useQueryClient();

     return useQuery({
          queryKey: ["meUser"],
          queryFn: () => getMeUser(),
          onSuccess: (data) => {
               queryClient.setQueryData(["meUser"], data.user);
          },
          staleTime: 1000 * 60 * 5,
          refetchOnMount: true,
     })
     
};

export const useLogoutUser = () => {
     const queryClient = useQueryClient();
     return useMutation(logoutUser, {
          mutationKey: ["logoutUser"],
          mutationFn:logoutUser,
          onSuccess: () => {
               queryClient.removeQueries({ queryKey: ["meUser"] });
          },
     })
};

export const useVerifyOtp = () => {
     return useMutation(verifyOtp);
}

export const useForgetPassword = () => {
     return useMutation(forgetPassword);
}

export const useUpdatePassword = () => {
     return useMutation(updatePassword);
}

export const useFirstLoginResetPassword = () => {
     return useMutation(firstLoginResetPassword);
}

export const useResetPasswordAfterForget = () => {
     return useMutation(resetPasswordAfterForget);
}
