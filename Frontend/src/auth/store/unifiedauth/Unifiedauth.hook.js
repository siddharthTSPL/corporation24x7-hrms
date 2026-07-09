import { useMutation } from "@tanstack/react-query";
import {
  unifiedLogin,
  unifiedSendForgotPasswordOtp,
  unifiedVerifyForgotPasswordOtp,
  unifiedResetPassword,
} from "../../api/unifiedauth/unifiedauth.api";

export const useUnifiedLogin = () =>
  useMutation({
    mutationKey: ["unified-login"],
    mutationFn: unifiedLogin,
  });

export const useUnifiedSendForgotPasswordOtp = () =>
  useMutation({
    mutationKey: ["unified-forgot-password-send-otp"],
    mutationFn: unifiedSendForgotPasswordOtp,
  });

export const useUnifiedVerifyForgotPasswordOtp = () =>
  useMutation({
    mutationKey: ["unified-forgot-password-verify-otp"],
    mutationFn: unifiedVerifyForgotPasswordOtp,
  });

export const useUnifiedResetPassword = () =>
  useMutation({
    mutationKey: ["unified-forgot-password-reset-password"],
    mutationFn: unifiedResetPassword,
  });