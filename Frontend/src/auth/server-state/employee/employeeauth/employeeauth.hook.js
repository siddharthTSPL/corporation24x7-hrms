import { loginUser,verifyUser,getMeUser,logoutUser,verifyOtp,forgetPassword,updatePassword,firstLoginResetPassword,resetPasswordAfterForget,getMeUser  } from "../../../api/employeeapi/auth/em.auth.api";

import { useQuery } from "@tanstack/react-query";

export const useLoginUser = () => {
     return useMutation(loginUser);
};

export const useVerifyUser = (token) => {
     return useQuery({
          queryKey: ["verifyUser", token],
          queryFn: () => verifyUser(token),
          enabled: !!token, 
     });
};

export const useGetMeUser = () => {
     return useQuery(["meUser"], getMeUser);
     
};

export const useLogoutUser = () => {
     return useMutation(logoutUser);
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
