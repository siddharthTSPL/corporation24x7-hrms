import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

// ── Asset Management (SuperAdmin) ─────────────────────────────────────────────

export const createAssetSuperAdmin = async (data) => {
  const res = await api.post('superadmin/assets', data);
  return res.data;
};

export const getAllAssetsSuperAdmin = async (params) => {
  const res = await api.get('superadmin/assets', { params });
  return res.data;
};

export const getAssetByIdSuperAdmin = async (id) => {
  const res = await api.get(`superadmin/assets/${id}`);
  return res.data;
};

export const updateAssetSuperAdmin = async (id, data) => {
  const res = await api.put(`superadmin/assets/${id}`, data);
  return res.data;
};

export const deleteAssetSuperAdmin = async (id) => {
  const res = await api.delete(`superadmin/assets/${id}`);
  return res.data;
};

export const assignAssetToAdmin = async (id, admin_id, quantity = 1) => {
  const res = await api.patch(`superadmin/assets/${id}/assign-admin`, { admin_id, quantity });
  return res.data;
};

export const revokeAssetSuperAdmin = async (id, data = {}) => {
  const res = await api.patch(`superadmin/assets/${id}/revoke`, data);
  return res.data;
};

export const getAssetsOfPersonSuperAdmin = async (person_id, person_model) => {
  const res = await api.get(`superadmin/assets/person/${person_id}/${person_model}`);
  return res.data;
};

// List of admins/managers/employees who currently hold at least one asset, with a summary count.
export const getEmployeesWithAssetsSuperAdmin = async () => {
  const res = await api.get('superadmin/assets/employees');
  return res.data;
};

// Full assign/revoke history (active + returned) for a single person.
export const getEmployeeAssetHistorySuperAdmin = async (person_id, person_model) => {
  const res = await api.get(`superadmin/assets/employees/${person_id}/${person_model}/history`);
  return res.data;
};