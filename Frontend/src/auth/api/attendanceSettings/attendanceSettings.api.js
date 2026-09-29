import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

export const getAttendanceSettings = async () => {
  const res = await api.get("attendance-settings/settings");
  return res.data;
};

export const updateAttendanceSettings = async (data) => {
  const res = await api.patch("attendance-settings/settings", data);
  return res.data;
};