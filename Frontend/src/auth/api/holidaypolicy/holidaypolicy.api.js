import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

// ── Policy (org-wide weekoff mode) ─────────────────────────────────────────────

export const getPolicy = async () => {
  const res = await api.get('admin/holiday-policy/policy');
  return res.data;
};

export const setPolicy = async (data) => {
  const res = await api.put('admin/holiday-policy/policy', data);
  return res.data;
};

// ── Groups (rotational off-day teams) ──────────────────────────────────────────

export const createGroup = async (data) => {
  const res = await api.post('admin/holiday-policy/group', data);
  return res.data;
};

export const listGroups = async (params) => {
  const res = await api.get('admin/holiday-policy/group', { params });
  return res.data;
};

export const addGroupMembers = async (groupId, data) => {
  const res = await api.post(`admin/holiday-policy/group/${groupId}/members`, data);
  return res.data;
};

export const removeGroupMember = async (groupId, employee) => {
  const res = await api.delete(`admin/holiday-policy/group/${groupId}/members/${employee}`);
  return res.data;
};

// ── Week Schedule (rotational) ─────────────────────────────────────────────────

export const setWeekSchedule = async (data) => {
  const res = await api.post('admin/holiday-policy/week-schedule', data);
  return res.data;
};

export const bulkSetWeekSchedule = async (data) => {
  const res = await api.post('admin/holiday-policy/week-schedule/bulk', data);
  return res.data;
};

export const setWeekScheduleForMonth = async (data) => {
  const res = await api.post('admin/holiday-policy/week-schedule/month', data);
  return res.data;
};

export const getWeekSchedules = async (params) => {
  const res = await api.get('admin/holiday-policy/week-schedule', { params });
  return res.data;
};

// ── Holiday Calendar ────────────────────────────────────────────────────────────

export const addHoliday = async (data) => {
  const res = await api.post('admin/holiday-policy/holiday', data);
  return res.data;
};

export const bulkAddHolidays = async (data) => {
  const res = await api.post('admin/holiday-policy/holiday/bulk', data);
  return res.data;
};

export const bulkEditHolidays = async (data) => {
  const res = await api.put('admin/holiday-policy/holiday/bulk', data);
  return res.data;
};

export const bulkDeleteHolidays = async (data) => {
  const res = await api.delete('admin/holiday-policy/holiday/bulk', { data });
  return res.data;
};

export const deleteHoliday = async (id) => {
  const res = await api.delete(`admin/holiday-policy/holiday/${id}`);
  return res.data;
};

export const listHolidays = async (params) => {
  const res = await api.get('admin/holiday-policy/holiday', { params });
  return res.data;
};

// ── Employee Override ───────────────────────────────────────────────────────────

export const setEmployeeOverride = async (data) => {
  const res = await api.post('admin/holiday-policy/override', data);
  return res.data;
};

export const removeEmployeeOverride = async (employee) => {
  const res = await api.delete(`admin/holiday-policy/override/${employee}`);
  return res.data;
};

// ── Monthly Report ──────────────────────────────────────────────────────────────

export const getEmployeeMonthlyReport = async (params) => {
  const res = await api.get('admin/holiday-policy/report', { params });
  return res.data;
};