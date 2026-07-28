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

// ---- Admin's own claims (escalate to SuperAdmin) ----
export const applyReimbursement = async (data) => {
  const res = await api.post("reimbursement/admin/apply", data);
  return res.data;
};

export const updateReimbursement = async (id, data) => {
  const res = await api.put(`reimbursement/admin/update/${id}`, data);
  return res.data;
};

export const deleteReimbursement = async (id) => {
  const res = await api.delete(`reimbursement/admin/delete/${id}`);
  return res.data;
};

export const getMyReimbursements = async () => {
  const res = await api.get("reimbursement/admin/my");
  return res.data;
};

// ---- Reviewing Employee + Manager claims ----
export const getPendingReimbursements = async () => {
  const res = await api.get("reimbursement/admin/pending");
  return res.data;
};

export const getAllReimbursements = async (status) => {
  const res = await api.get("reimbursement/admin/all", { params: status ? { status } : {} });
  return res.data;
};

export const approveReimbursement = async ({ id, comments }) => {
  const res = await api.post("reimbursement/admin/approve", { id, comments });
  return res.data;
};

export const rejectReimbursement = async ({ id, reason }) => {
  const res = await api.post("reimbursement/admin/reject", { id, reason });
  return res.data;
};

export const markReimbursementPaid = async ({ id, paymentReference, financeNotes }) => {
  const res = await api.post("reimbursement/admin/markPaid", { id, paymentReference, financeNotes });
  return res.data;
};