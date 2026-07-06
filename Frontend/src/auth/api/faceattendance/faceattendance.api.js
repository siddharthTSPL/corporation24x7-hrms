import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/";

// ---------------------------------------------------------------------
// Admin-side client (enroll / list / remove face profiles).
// Uses the normal cookie-based admin session, same as every other
// admin.* api file in this app.
// ---------------------------------------------------------------------
const adminApi = axios.create({ baseURL: BASE_URL, withCredentials: true });

export const enrollEmployeeFace = async ({ employeeId, onModel, role, photoBlob }) => {
  const form = new FormData();
  form.append("employeeId", employeeId);
  form.append("onModel", onModel);
  form.append("role", role);
  form.append("photo", photoBlob, "enrollment.jpg");

  const res = await adminApi.post("faceattendance/enroll", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const listEnrolledFaces = async () => {
  const res = await adminApi.get("faceattendance/enrolled");
  return res.data;
};

export const removeEnrolledFace = async (employeeId) => {
  const res = await adminApi.delete(`faceattendance/enrolled/${employeeId}`);
  return res.data;
};

// ---------------------------------------------------------------------
// Kiosk-side client (device login + live scan).
// The kiosk is not "a user" — it holds its own long-lived bearer token
// in localStorage (separate from any employee/admin session), attached
// manually per request rather than via cookies.
// ---------------------------------------------------------------------
const KIOSK_TOKEN_KEY = "kiosk_token";

export const getKioskToken = () => localStorage.getItem(KIOSK_TOKEN_KEY);
export const setKioskToken = (token) => localStorage.setItem(KIOSK_TOKEN_KEY, token);
export const clearKioskToken = () => localStorage.removeItem(KIOSK_TOKEN_KEY);

const kioskApi = axios.create({ baseURL: BASE_URL });
kioskApi.interceptors.request.use((config) => {
  const token = getKioskToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
kioskApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    const newError = new Error(message);
    newError.status = error.response?.status;
    newError.reason = error.response?.data?.reason;
    newError.data = error.response?.data;
    return Promise.reject(newError);
  }
);

export const kioskLogin = async ({ work_email, password, device_name }) => {
  const res = await kioskApi.post("kiosk/login", { work_email, password, device_name });
  return res.data;
};

export const kioskLogout = async () => {
  const res = await kioskApi.post("kiosk/logout");
  return res.data;
};

export const kioskMe = async () => {
  const res = await kioskApi.get("kiosk/me");
  return res.data;
};

export const scanFace = async (imageBase64) => {
  const res = await kioskApi.post("faceattendance/scan", { image: imageBase64 });
  return res.data;
};
