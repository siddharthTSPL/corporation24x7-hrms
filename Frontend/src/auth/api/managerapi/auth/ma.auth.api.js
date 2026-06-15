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

export const verifyManager = async (token) => {
  const res = await api.get(`manager/verify/${token}`);
  return res.data;
};

export const loginManager = async (data) => {
  const res = await api.post('manager/login', data);
  return res.data;
};

export const logoutManager = async () => {
  const res = await api.post('manager/logout');
  return res.data;
};

export const firstLoginPasswordChange = async (data) => {
  const res = await api.post('manager/firstloginpasswordchange', data);
  return res.data;
};

export const updateManagerPassword = async (data) => {
  const res = await api.put('manager/updatepassword', data);
  return res.data;
};

export const getMeManager = async () => {
  const res = await api.get('manager/getme');
  return res.data;
};