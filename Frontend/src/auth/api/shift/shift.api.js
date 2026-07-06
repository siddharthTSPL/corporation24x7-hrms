import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

export const getAllShifts = async () => {
  const res = await api.get('admin/shift');
  return res.data;
};

export const createShift = async (data) => {
  const res = await api.post('admin/shift', data);
  return res.data;
};

export const updateShift = async (id, data) => {
  const res = await api.put(`admin/shift/${id}`, data);
  return res.data;
};

export const setDefaultShift = async (id) => {
  const res = await api.patch(`admin/shift/${id}/set-default`);
  return res.data;
};

export const deleteShift = async (id) => {
  const res = await api.delete(`admin/shift/${id}`);
  return res.data;
};

export const assignShiftToUser = async (data) => {
  const res = await api.patch('admin/shift/assign', data);
  return res.data;
};

export const getShiftHistory = async (employee_id, role) => {
  const res = await api.get(`admin/shift/history/${employee_id}`, { params: { role } });
  return res.data;
};

export const editShiftAssignment = async (historyId, data) => {
  const res = await api.patch(`admin/shift/history/${historyId}`, data);
  return res.data;
};

export const deleteShiftAssignment = async (historyId) => {
  const res = await api.delete(`admin/shift/history/${historyId}`);
  return res.data;
};