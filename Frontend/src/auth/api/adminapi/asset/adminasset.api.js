import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

// ── Asset Management (Admin) ──────────────────────────────────────────────────

export const createAssetAdmin = async (data) => {
  const res = await api.post('admin/assets', data);
  return res.data;
};

export const getAllAssetsAdmin = async (params) => {
  const res = await api.get('admin/assets', { params });
  return res.data;
};

export const getAssetByIdAdmin = async (id) => {
  const res = await api.get(`admin/assets/${id}`);
  return res.data;
};

export const updateAssetAdmin = async (id, data) => {
  const res = await api.put(`admin/assets/${id}`, data);
  return res.data;
};

export const deleteAssetAdmin = async (id) => {
  const res = await api.delete(`admin/assets/${id}`);
  return res.data;
};

export const assignAssetToEmployee = async (id, employee_id, quantity = 1) => {
  const res = await api.patch(`admin/assets/${id}/assign-employee`, { employee_id, quantity });
  return res.data;
};

export const assignAssetToManager = async (id, manager_id, quantity = 1) => {
  const res = await api.patch(`admin/assets/${id}/assign-manager`, { manager_id, quantity });
  return res.data;
};

export const revokeAssetAdmin = async (id, data = {}) => {
  const res = await api.patch(`admin/assets/${id}/revoke`, data);
  return res.data;
};

export const getAssetsOfPersonAdmin = async (person_id, person_model) => {
  const res = await api.get(`admin/assets/person/${person_id}/${person_model}`);
  return res.data;
};

// List of employees/managers who currently hold at least one asset, with a summary count.
export const getEmployeesWithAssetsAdmin = async () => {
  const res = await api.get('admin/assets/employees');
  return res.data;
};

// Full assign/revoke history (active + returned) for a single employee.
export const getEmployeeAssetHistoryAdmin = async (person_id, person_model) => {
  const res = await api.get(`admin/assets/employees/${person_id}/${person_model}/history`);
  return res.data;
};