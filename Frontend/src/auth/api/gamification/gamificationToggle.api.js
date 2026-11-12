import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(new Error(err?.response?.data?.message || err?.message || "Something went wrong"))
);

// SuperAdmin only: Rewards & Gamification master switch for the organisation.
export const getGamificationToggle = async () => (await api.get("superadmin/gamification-toggle")).data;
export const setGamificationToggle = async (enabled) =>
  (await api.put("superadmin/gamification-toggle", { enabled })).data;
