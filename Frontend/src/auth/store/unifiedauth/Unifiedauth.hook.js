import { useMutation } from "@tanstack/react-query";
import {
  unifiedLogin,
  unifiedSendForgotPasswordOtp,
  unifiedVerifyForgotPasswordOtp,
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