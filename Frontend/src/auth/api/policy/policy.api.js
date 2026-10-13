import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

// ── Management (SuperAdmin / Admin) ─────────────────────────────────────────

export const getDashboardSummary = async () => {
  const res = await api.get('policy/manage/dashboard');
  return res.data;
};

export const listPolicies = async (params) => {
  const res = await api.get('policy/manage', { params });
  return res.data;
};

export const getPolicyDetail = async (id) => {
  const res = await api.get(`policy/manage/${id}`);
  return res.data;
};

// payload: { title, code, category, description,
//            effectiveFrom, assignment, pdfFile, imageFiles }
const buildPolicyFormData = (payload) => {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'pdfFile') {
      if (value) form.append('pdf', value);
      return;
    }
    if (key === 'imageFiles') {
      (value || []).forEach((file) => form.append('images', file));
      return;
    }
    if (key === 'assignment') {
      form.append('assignment', JSON.stringify(value));
      return;
    }
    form.append(key, value);
  });
  return form;
};

export const createPolicy = async (payload) => {
  const res = await api.post('policy/manage', buildPolicyFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const addPolicyVersion = async ({ id, ...payload }) => {
  const res = await api.post(`policy/manage/${id}/versions`, buildPolicyFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updatePolicyMeta = async ({ id, ...payload }) => {
  const res = await api.put(`policy/manage/${id}`, payload);
  return res.data;
};

export const publishPolicy = async ({ id, versionId }) => {
  const res = await api.post(`policy/manage/${id}/publish`, { versionId });
  return res.data;
};

export const archivePolicy = async (id) => {
  const res = await api.post(`policy/manage/${id}/archive`);
  return res.data;
};

export const deletePolicy = async (id) => {
  const res = await api.delete(`policy/manage/${id}`);
  return res.data;
};

export const getAcknowledgementReport = async (id) => {
  const res = await api.get(`policy/manage/${id}/report`);
  return res.data;
};

export const exportAcknowledgementReportUrl = (id) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:5000/'}policy/manage/${id}/report/export`;

// ── Viewer (any role: employee, manager, admin, superadmin) ────────────────

export const getGateStatus = async () => {
  const res = await api.get('policy/me/gate-status');
  return res.data;
};

export const getMyPolicies = async () => {
  const res = await api.get('policy/me/list');
  return res.data;
};

export const getMyPendingPolicies = async () => {
  const res = await api.get('policy/me/pending');
  return res.data;
};

export const viewPolicy = async (policyId) => {
  const res = await api.get(`policy/me/${policyId}`);
  return res.data;
};

export const acknowledgePolicy = async ({ policyId, confirm }) => {
  const res = await api.post(`policy/me/${policyId}/acknowledge`, { confirm });
  return res.data;
};

export const getMyAcknowledgementHistory = async () => {
  const res = await api.get('policy/me/acknowledgements');
  return res.data;
};

export const getCertificateUrl = (policyId) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:5000/'}policy/me/${policyId}/certificate`;