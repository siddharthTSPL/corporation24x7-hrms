import axios from "axios";

const api = axios.create({
  baseURL:import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

// One id per browser TAB, persisted in sessionStorage. sessionStorage is
// scoped to a single tab (unlike localStorage, which is shared by every
// tab/window of the same browser) and survives a refresh within that tab
// but not a new tab/window - so two tabs of the SAME browser get their
// own id too, not just two different browsers. Without this, two tabs of
// one browser (one active, one idle in the background) would still
// collide under one shared key, the exact same "last ping wins" problem
// this whole channel system exists to avoid (see channelPings in
// attendance.controller.js).
const CLIENT_ID_KEY = "attendance_client_id";
const getClientId = () => {
  try {
    let id = sessionStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = (window.crypto?.randomUUID && window.crypto.randomUUID()) || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(CLIENT_ID_KEY, id);
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