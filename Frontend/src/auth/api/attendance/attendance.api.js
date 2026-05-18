import axios from "axios";

const api = axios.create({
  baseURL:import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

export const checkin = async (data) => {
  const res = await api.post("attendance/checkin", data);
  return res.data;
};

export const activity = async (status) => {
  const res = await api.post("attendance/activity", { status });
  return res.data;
};

export const checkout = async () => {
  const res = await api.post("attendance/checkout");
  return res.data;
};

export const getTodayAttendance = async () => {
  const res = await api.get("attendance/today");
  return res.data;
};