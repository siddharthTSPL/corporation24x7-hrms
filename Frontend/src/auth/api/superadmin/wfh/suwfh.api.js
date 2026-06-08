import axios from "axios";

const api = axios.create({
  baseURL: "https://torchxsuite.com/talent/api/",
  withCredentials: true,
});

export const getPendingWFHSuperAdmin = async () => {
  const res = await api.get("wfh/superadmin/getPendingWFH");
  return res.data;
};

export const approveWFHSuperAdmin = async (data) => {
  const res = await api.post("wfh/superadmin/approveWFH", data);
  return res.data;
};

export const rejectWFHSuperAdmin = async (data) => {
  const res = await api.post("wfh/superadmin/rejectWFH", data);
  return res.data;
};