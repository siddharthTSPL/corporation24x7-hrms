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

export const getAnalyticsSummary = async ({ role = "admin", from, to } = {}) => {
  const base = role === "superadmin" ? "/superadmin/analytics/summary" : "/admin/analytics/summary";
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await api.get(base, { params });
  return res.data;
};