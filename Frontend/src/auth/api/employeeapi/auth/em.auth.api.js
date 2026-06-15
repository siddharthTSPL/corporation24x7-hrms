import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    if (error.response?.status === 401) {
      return Promise.reject(null);
    }
    return Promise.reject(new Error(message));
  }
);

export const verifyUser = async (token) => {
  const res = await api.get(`user/verify/${token}`);
  return res.data;
};

export const loginUser = async (data) => {
  const res = await api.post('user/login', data);
  return res.data;
};

export const logoutUser = async () => {
  const res = await api.post('user/logout');
  return res.data;
};

export const firstLoginResetPassword = async (data) => {
  const res = await api.post('user/firstloginpasswordchange', data);
  return res.data;
};

export const updatePassword = async (data) => {
  const res = await api.put('user/changepassword', data);
  return res.data;
};

export const forgetPassword = async (data) => {
  const res = await api.post('user/forgetpassword', data);
  return res.data;
};

export const verifyOtp = async (data) => {
  const res = await api.post('user/verifyotp', data);
  return res.data;
};

export const resetPasswordAfterForget = async (data) => {
  const res = await api.post('user/resetpassword', data);
  return res.data;
};

export const getMeUser = async () => {
  const res = await api.get('user/getme');
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await api.put('user/updateprofile', data);
  return res.data;
};