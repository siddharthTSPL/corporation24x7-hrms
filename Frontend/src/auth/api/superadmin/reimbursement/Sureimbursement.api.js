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
    return Promise.reject(new Error(message));
  }
);

// ---- Reviewing Admin claims ----
export const getPendingReimbursements = async () => {
  const res = await api.get("reimbursement/superadmin/pending");
  return res.data;
};

export const approveReimbursement = async ({ id, comments }) => {
  const res = await api.post("reimbursement/superadmin/approve", { id, comments });
  return res.data;
};

export const rejectReimbursement = async ({ id, reason }) => {
  const res = await api.post("reimbursement/superadmin/reject", { id, reason });
  return res.data;
};

export const markReimbursementPaid = async ({ id, paymentReference, financeNotes }) => {
  const res = await api.post("reimbursement/superadmin/markPaid", { id, paymentReference, financeNotes });
  return res.data;
};

// ---- Org-wide visibility: Employee + Manager + Admin claims, any status ----
export const getAllReimbursements = async ({ status, submitterModel } = {}) => {
  const params = {};
  if (status) params.status = status;
  if (submitterModel) params.submitterModel = submitterModel;
  const res = await api.get("reimbursement/superadmin/all", { params });
  return res.data;
};