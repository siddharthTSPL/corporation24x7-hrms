import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

export const getAllDepartments = async () => {
  const res = await api.get('admin/department');
  return res.data;
};

export const createDepartment = async (data) => {
  const res = await api.post('admin/department', data);
  return res.data;
};

export const updateDepartment = async (id, data) => {
  const res = await api.put(`admin/department/${id}`, data);
  return res.data;
};

export const deleteDepartment = async (id) => {
  const res = await api.delete(`admin/department/${id}`);
  return res.data;
};