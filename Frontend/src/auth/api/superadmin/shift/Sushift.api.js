import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

export const getAllShiftsSuperAdmin = async () => {
  const res = await api.get('superadmin/shift');
  return res.data;
};

export const createShiftSuperAdmin = async (data) => {
  const res = await api.post('superadmin/shift', data);
  return res.data;
};

export const updateShiftSuperAdmin = async (id, data) => {
  const res = await api.put(`superadmin/shift/${id}`, data);
  return res.data;
};

export const setDefaultShiftSuperAdmin = async (id) => {
  const res = await api.patch(`superadmin/shift/${id}/set-default`);
  return res.data;
};

export const deleteShiftSuperAdmin = async (id) => {
  const res = await api.delete(`superadmin/shift/${id}`);
  return res.data;
};

export const assignShiftToUserSuperAdmin = async (data) => {
  const res = await api.patch('superadmin/shift/assign', data);
  return res.data;
};

export const getShiftHistorySuperAdmin = async (employee_id, role) => {
  const res = await api.get(`superadmin/shift/history/${employee_id}`, { params: { role } });
  return res.data;
};

export const editShiftAssignmentSuperAdmin = async (historyId, data) => {
  const res = await api.patch(`superadmin/shift/history/${historyId}`, data);
  return res.data;
};

export const deleteShiftAssignmentSuperAdmin = async (historyId) => {
  const res = await api.delete(`superadmin/shift/history/${historyId}`);
  return res.data;
};