import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

export const getAllDepartmentsSuperAdmin = async () => {
  const res = await api.get('superadmin/department');
  return res.data;
};

export const createDepartmentSuperAdmin = async (data) => {
  const res = await api.post('superadmin/department', data);
  return res.data;
};

export const updateDepartmentSuperAdmin = async (id, data) => {
  const res = await api.put(`superadmin/department/${id}`, data);
  return res.data;
};

export const deleteDepartmentSuperAdmin = async (id) => {
  const res = await api.delete(`superadmin/department/${id}`);
  return res.data;
};