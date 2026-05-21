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

export const managerApplyWFH = async (data) => {
  const res = await api.post("wfh/applyWFH", data);
  return res.data;
};

export const managerGetMyWFH = async () => {
  const res = await api.get("wfh/getMyWFH");
  return res.data;
};

export const managerGetPendingWFH = async () => {
  const res = await api.get("wfh/getPendingWFH");
  return res.data;
};

export const managerGetAllTeamWFH = async () => {
  const res = await api.get("wfh/getAllTeamWFH");
  return res.data;
};

export const managerApproveWFH = async (data) => {
  const res = await api.post("wfh/approveWFH", data);
  return res.data;
};

export const managerRejectWFH = async (data) => {
  const res = await api.post("wfh/rejectWFH", data);
  return res.data;
};

export const managerForwardWFH = async (data) => {
  const res = await api.post("wfh/forwardWFH", data);
  return res.data;
};

export const managerGetForwardedWFH = async () => {
  const res = await api.get("wfh/getForwardedWFH");
  return res.data;
};

export const managerApproveForwardedWFH = async (data) => {
  const res = await api.post("wfh/approveForwardedWFH", data);
  return res.data;
};

export const managerRejectForwardedWFH = async (data) => {
  const res = await api.post("wfh/rejectForwardedWFH", data);
  return res.data;
};