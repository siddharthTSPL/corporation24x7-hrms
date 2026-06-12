import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || "Something went wrong";

    if (error.response?.status === 401) {
      return Promise.reject(null);
    }

    return Promise.reject(new Error(message));
  }
);

export const adminApplyWFH = async (data) => {
  const res = await api.post("wfh/admin/applyWFH", data);
  return res.data;
};

export const adminGetMyWFH = async () => {
  const res = await api.get("wfh/admin/getMyWFH");
  return res.data;
};

export const adminGetPendingWFH = async () => {
  const res = await api.get("wfh/admin/getPendingWFH");
  return res.data;
};

export const adminApproveWFH = async (data) => {
  const res = await api.post("wfh/admin/approveWFH", data);
  return res.data;
};

export const adminRejectWFH = async (data) => {
  const res = await api.post("wfh/admin/rejectWFH", data);
  return res.data;
};