import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const unifiedLogin = async ({ email, password }) => {
  const res = await api.post('auth/login', { identifier: email, password });
  return res.data;
};

export const unifiedSendForgotPasswordOtp = async (email) => {
  const res = await api.post('auth/forgot-password/send-otp', { email });
  return res.data;
};

export const unifiedVerifyForgotPasswordOtp = async ({ email, otp }) => {
  const res = await api.post('auth/forgot-password/verify-otp', { email, otp });
  return res.data;
};

export const unifiedResetPassword = async ({ newPassword, confirmPassword }) => {
  const res = await api.post('auth/forgot-password/reset-password', { newPassword, confirmPassword });
  return res.data;
};

export const dismissWelcomeMessage = async () => {
  const res = await api.post('auth/dismiss-welcome');
  return res.data;
};

export const dismissBirthdayWish = async () => {
  const res = await api.post('auth/dismiss-birthday');
  return res.data;
};