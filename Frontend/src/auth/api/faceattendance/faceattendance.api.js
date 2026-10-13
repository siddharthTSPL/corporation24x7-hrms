import axios from "axios";

// ---------------------------------------------------------------------
// Base URL resolution.
// Keep the HEAD version: it handles both VITE_API_BASE_URL and
// VITE_API_URL, trims trailing slashes, and strips a trailing "/api"
// so the same env var works whether or not it includes the /api prefix.
// ---------------------------------------------------------------------
const resolveApiBaseUrl = () => {
  const configured =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";
  const trimmed = String(configured).trim().replace(/\/+$/, "");
  // Every call below is written as "faceattendance/..." / "kiosk/..." with
  // no "api/" prefix, so the base URL itself must end in "/api" or IIS's
  // "^api/faceattendance/..." rewrite rule never matches and the request
  // falls through to the SPA catch-all, returning index.html instead of JSON.
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

// ---------------------------------------------------------------------
// Admin-side client (enroll / list / remove face profiles).
// Uses the normal cookie-based admin session, same as every other
// admin.* api file in this app.
// ---------------------------------------------------------------------
const api = axios.create({
  baseURL: `${resolveApiBaseUrl()}/`,
  withCredentials: true,
});

// ---------------------------------------------------------------------
// Kiosk-side client (device login + live scan).
// The kiosk is not "a user" — it holds its own long-lived bearer token
// in localStorage (separate from any employee/admin session), attached
// manually per request rather than via cookies.
// ---------------------------------------------------------------------
const KIOSK_TOKEN_KEY = "kiosk_token";

export const getKioskToken = () => localStorage.getItem(KIOSK_TOKEN_KEY);
export const setKioskToken = (token) => {
  if (token) localStorage.setItem(KIOSK_TOKEN_KEY, token);
};
export const clearKioskToken = () => {
  localStorage.removeItem(KIOSK_TOKEN_KEY);
};

const kioskApi = axios.create({
  baseURL: `${resolveApiBaseUrl()}/`,
  withCredentials: true,
});

kioskApi.interceptors.request.use((config) => {
  const token = getKioskToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

kioskApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    const err = new Error(message);
    err.status = error.response?.status;
    err.reason = error.response?.data?.reason;
    err.data = error.response?.data;
    return Promise.reject(err);
  },
);

// ---------------------------------------------------------------------
// Face enrollment (admin)
// ---------------------------------------------------------------------

// Primary export: HEAD name. Branch alias exported below.
export const enrollFace = async ({ employeeId, onModel, role, photoBlob }) => {
  const form = new FormData();
  form.append("employeeId", employeeId);
  form.append("onModel", onModel);
  form.append("role", role);
  form.append("photo", photoBlob, "enrollment.jpg");

  const response = await api.post("faceattendance/enroll", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// Alias (Branch name) — safe to remove if nothing imports this.
export const enrollEmployeeFace = enrollFace;

// Primary export: HEAD name.
export const getEnrolledFaces = async () => {
  const response = await api.get("faceattendance/enrolled");
  return response.data;
};

// Alias (Branch name).
export const listEnrolledFaces = getEnrolledFaces;

// Same on both sides — no alias needed.
export const removeEnrolledFace = async (employeeId) => {
  const response = await api.delete(`faceattendance/enrolled/${employeeId}`);
  return response.data;
};

// ---------------------------------------------------------------------
// Kiosk (device login + live scan)
// ---------------------------------------------------------------------

// Primary export: HEAD name.
export const loginKiosk = async ({
  organisation_id,
  password,
  device_name,
}) => {
  const response = await kioskApi.post("kiosk/login", {
    organisation_id,
    password,
    device_name,
  });
  return response.data;
};

// Alias (Branch name).
export const kioskLogin = loginKiosk;

// Primary export: HEAD name.
export const logoutKiosk = async () => {
  const response = await kioskApi.post("kiosk/logout");
  return response.data;
};

// Alias (Branch name).
export const kioskLogout = logoutKiosk;

// Primary export: HEAD name.
export const getKioskMe = async () => {
  const response = await kioskApi.get("kiosk/me");
  return response.data;
};

// Alias (Branch name).
export const kioskMe = getKioskMe;

// Same on both sides — no alias needed.
export const scanFace = async ({ image, gate }) => {
  const response = await kioskApi.post("faceattendance/scan", { image, gate });
  return response.data;
};