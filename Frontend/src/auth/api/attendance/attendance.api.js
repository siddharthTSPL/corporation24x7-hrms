import axios from "axios";

const api = axios.create({
  baseURL:import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});


const CLIENT_ID_KEY = "attendance_client_id";
const getClientId = () => {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = (window.crypto?.randomUUID && window.crypto.randomUUID()) || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch (_) {
    return "unknown";
  }
};

export const checkin = async (data) => {
  const res = await api.post("attendance/checkin", data);
  return res.data;
};

export const activity = async (status) => {
  const res = await api.post("attendance/activity", { status, clientId: getClientId() });
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

export const getMyShift = async () => {
  const res = await api.get('attendance/my-shift');
  return res.data;
};

export const getCalendarMeta = async ({ month, year } = {}) => {
  const res = await api.get('attendance/calendar-meta', { params: { month, year } });
  return res.data;
};