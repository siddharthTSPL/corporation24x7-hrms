import axios from "axios";

// Works for both Admin and SuperAdmin sessions: the backend route accepts
// either token (adminOrSuperAdminAuth) and scopes everything to the org.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

export const getApprovalFlows = async () => {
  const res = await api.get("approval-flow");
  return res.data;
};

export const saveApprovalFlow = async ({ module, data }) => {
  const res = await api.put(`approval-flow/${module}`, data);
  return res.data;
};

export const resetApprovalFlow = async (module) => {
  const res = await api.delete(`approval-flow/${module}`);
  return res.data;
};