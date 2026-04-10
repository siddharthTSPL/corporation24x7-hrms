import { loginUser, verifyUser, getMeUser, logoutUser, verifyOtp, forgetPassword, updatePassword, firstLoginResetPassword, resetPasswordAfterForget, updateProfile } from "../../../api/employeeapi/auth/em.auth.api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useLoginUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["loginUser"],
    mutationFn: loginUser,
    onSuccess: (data) => {
      queryClient.setQueryData(["meUser"], data.user);
    },
  });
};

export const useVerifyUser = (token) => {
  return useQuery({
    queryKey: ["verifyUser", token],
    queryFn: () => verifyUser(token),
    enabled: !!token,
  });
};

export const useGetMeUser = () => {
  return useQuery({
    queryKey: ["meUser"],
    queryFn: getMeUser,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });
};

export const useLogoutUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      localStorage.removeItem("role");
      queryClient.removeQueries({ queryKey: ["auth"] });
    },
  });
};

export const useVerifyOtp = () => {
  return useMutation({ mutationFn: verifyOtp });
};

export const useForgetPassword = () => {
  return useMutation({ mutationFn: forgetPassword });
};

export const useUpdatePassword = () => {
  return useMutation({ mutationFn: updatePassword });
};

export const useFirstLoginResetPassword = () => {
  return useMutation({ mutationFn: firstLoginResetPassword });
};

export const useResetPasswordAfterForget = () => {
  return useMutation({ mutationFn: resetPasswordAfterForget });
};

export const useUpdateProfile = () => {
  return useMutation({ mutationFn: updateProfile });
};