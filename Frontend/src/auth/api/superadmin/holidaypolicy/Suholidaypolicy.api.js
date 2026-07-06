import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

// ── Policy (org-wide weekoff mode) ─────────────────────────────────────────────

export const getPolicySuperAdmin = async () => {
  const res = await api.get('superadmin/policy');
  return res.data;
};

export const setPolicySuperAdmin = async (data) => {
  const res = await api.put('superadmin/policy', data);
  return res.data;
};

// ── Groups (rotational off-day teams) ──────────────────────────────────────────

export const createGroupSuperAdmin = async (data) => {
  const res = await api.post('superadmin/group', data);
  return res.data;
};

export const listGroupsSuperAdmin = async (params) => {
  const res = await api.get('superadmin/group', { params });
  return res.data;
};

export const addGroupMembersSuperAdmin = async (groupId, data) => {
  const res = await api.post(`superadmin/group/${groupId}/members`, data);
  return res.data;
};

export const removeGroupMemberSuperAdmin = async (groupId, employee) => {
  const res = await api.delete(`superadmin/group/${groupId}/members/${employee}`);
  return res.data;
};

// ── Week Schedule (rotational) ─────────────────────────────────────────────────

export const setWeekScheduleSuperAdmin = async (data) => {
  const res = await api.post('superadmin/week-schedule', data);
  return res.data;
};

export const bulkSetWeekScheduleSuperAdmin = async (data) => {
  const res = await api.post('superadmin/week-schedule/bulk', data);
  return res.data;
};

export const setWeekScheduleForMonthSuperAdmin = async (data) => {
  const res = await api.post('superadmin/week-schedule/month', data);
  return res.data;
};

export const getWeekSchedulesSuperAdmin = async (params) => {
  const res = await api.get('superadmin/week-schedule', { params });
  return res.data;
};

// ── Holiday Calendar ────────────────────────────────────────────────────────────

export const addHolidaySuperAdmin = async (data) => {
  const res = await api.post('superadmin/holiday', data);
  return res.data;
};

export const bulkAddHolidaysSuperAdmin = async (data) => {
  const res = await api.post('superadmin/holiday/bulk', data);
  return res.data;
};

export const bulkEditHolidaysSuperAdmin = async (data) => {
  const res = await api.put('superadmin/holiday/bulk', data);
  return res.data;
};

export const bulkDeleteHolidaysSuperAdmin = async (data) => {
  const res = await api.delete('superadmin/holiday/bulk', { data });
  return res.data;
};

export const deleteHolidaySuperAdmin = async (id) => {
  const res = await api.delete(`superadmin/holiday/${id}`);
  return res.data;
};

export const listHolidaysSuperAdmin = async (params) => {
  const res = await api.get('superadmin/holiday', { params });
  return res.data;
};

// ── Employee Override ───────────────────────────────────────────────────────────

export const setEmployeeOverrideSuperAdmin = async (data) => {
  const res = await api.post('superadmin/override', data);
  return res.data;
};

export const removeEmployeeOverrideSuperAdmin = async (employee) => {
  const res = await api.delete(`superadmin/override/${employee}`);
  return res.data;
};

// ── Monthly Report ──────────────────────────────────────────────────────────────

export const getEmployeeMonthlyReportSuperAdmin = async (params) => {
  const res = await api.get('superadmin/report', { params });
  return res.data;
};