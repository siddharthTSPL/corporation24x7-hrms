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

const roleToEndpoint = {
  admin: "admin",
  senior_admin: "admin",
  official: "admin",
  manager: "manager",
  senior_manager: "manager",
  employee: "employee",
};

export const fetchMyPermissions = async (role) => {
  const endpoint = roleToEndpoint[role];
  if (!endpoint) return null;
  const res = await api.get(`permissions/me/${endpoint}`);
  return res.data.data;
};