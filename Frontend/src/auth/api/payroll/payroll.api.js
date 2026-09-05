import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    if (error.response?.status === 401) {
      return Promise.reject(null);
    }
    const newError = new Error(message);
    newError.response = error.response;
    newError.status = error.response?.status;
    return Promise.reject(newError);
  },
);



export const getPayrollPolicy = async () => {
  const res = await api.get("admin/payroll/policy");
  return res.data;
};

export const setPayrollPolicy = async (data) => {
  const res = await api.put("admin/payroll/policy", data);
  return res.data;
};

export const resetPayrollPolicy = async () => {
  const res = await api.post("admin/payroll/policy/reset");
  return res.data;
};

export const addPayrollAllowance = async (data) => {
  const res = await api.post("admin/payroll/policy/allowance", data);
  return res.data;
};

export const updatePayrollAllowance = async (name, data) => {
  const res = await api.put(`admin/payroll/policy/allowance/${encodeURIComponent(name)}`, data);
  return res.data;
};

export const removePayrollAllowance = async (name) => {
  const res = await api.delete(`admin/payroll/policy/allowance/${encodeURIComponent(name)}`);
  return res.data;
};



export const getPaySchedule = async () => {
  const res = await api.get("admin/payroll/pay-schedule");
  return res.data;
};

export const setPaySchedule = async (data) => {
  const res = await api.put("admin/payroll/pay-schedule", data);
  return res.data;
};



export const getOrgOwner = async () => {
  const res = await api.get("admin/payroll/org-owner");
  return res.data;
};

export const setEmployeeCTC = async (data) => {
  const res = await api.post("admin/payroll/structure", data);
  return res.data;
};

export const listSalaryStructures = async (params) => {
  const res = await api.get("admin/payroll/structure", { params });
  return res.data;
};

export const getSalaryStructure = async (employee) => {
  const res = await api.get(`admin/payroll/structure/${employee}`);
  return res.data;
};

export const reapplyPolicy = async (employee) => {
  const res = await api.post(`admin/payroll/structure/${employee}/reapply-policy`);
  return res.data;
};



export const generatePayroll = async (data) => {
  const res = await api.post("admin/payroll/generate", data);
  return res.data;
};

export const bulkGeneratePayroll = async (data) => {
  const res = await api.post("admin/payroll/generate/bulk", data);
  return res.data;
};



export const listPayrolls = async (params) => {
  const res = await api.get("admin/payroll", { params });
  return res.data;
};

export const getPayslip = async (params) => {
  const res = await api.get("admin/payroll/payslip", { params });
  return res.data;
};

export const updatePayrollStatus = async (id, status) => {
  const res = await api.patch(`admin/payroll/${id}/status`, { status });
  return res.data;
};

export const deletePayroll = async (id) => {
  const res = await api.delete(`admin/payroll/${id}`);
  return res.data;
};

export const bulkUpdatePayrollStatus = async (ids, status) => {
  const res = await api.patch("admin/payroll/bulk/status", { ids, status });
  return res.data;
};

export const bulkDeletePayroll = async (ids) => {
  const res = await api.post("admin/payroll/bulk/delete", { ids });
  return res.data;
};



// --- Full & Final (FnF) settlement — one-time, for resigned/fired/terminated people ---

export const listEligibleForFnF = async () => {
  const res = await api.get("admin/payroll/fnf/eligible");
  return res.data;
};

export const generateFnF = async (data) => {
  const res = await api.post("admin/payroll/fnf/generate", data);
  return res.data;
};

export const listFnF = async (params) => {
  const res = await api.get("admin/payroll/fnf", { params });
  return res.data;
};

export const getFnFSlip = async (id) => {
  const res = await api.get(`admin/payroll/fnf/${id}`);
  return res.data;
};

export const updateFnF = async (id, data) => {
  const res = await api.patch(`admin/payroll/fnf/${id}`, data);
  return res.data;
};

export const updateFnFStatus = async (id, status) => {
  const res = await api.patch(`admin/payroll/fnf/${id}/status`, { status });
  return res.data;
};

export const deleteFnF = async (id) => {
  const res = await api.delete(`admin/payroll/fnf/${id}`);
  return res.data;
};