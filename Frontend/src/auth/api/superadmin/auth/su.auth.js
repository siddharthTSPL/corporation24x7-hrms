import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

export const registerSuperAdmin = async (data) => {
  const res = await api.post("superadmin/register", data);
  return res.data;
};

export const verifySuperAdmin = async (token) => {
  const res = await api.get(`superadmin/verify/${token}`);
  return res.data;
};

export const loginSuperAdmin = async (data) => {
  const res = await api.post("superadmin/login", data);
  return res.data;
};


export const getMeSuperAdmin = async () => {
  const res = await api.get("superadmin/me");
  return res.data;
};

export const logoutSuperAdmin = async () => {
  const res = await api.post("superadmin/logout");
  return res.data;
};

export const updateSuperAdminProfile = async (data) => {
  const res = await api.put("superadmin/update-profile", data);
  return res.data;
};