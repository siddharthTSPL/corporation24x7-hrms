import axios from "axios";

const resolveApiBaseUrl = () => {
  const configured =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";
  const trimmed = String(configured).trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed.slice(0, -"/api".length) : trimmed;
};

const api = axios.create({
  baseURL: `${resolveApiBaseUrl()}/`,
  withCredentials: true,
});

const kioskApi = axios.create({
  baseURL: `${resolveApiBaseUrl()}/`,
  withCredentials: true,
});

const KIOSK_TOKEN_KEY = "kiosk_token";

kioskApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(KIOSK_TOKEN_KEY);
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

export const getEnrolledFaces = async () => {
  const response = await api.get("faceattendance/enrolled");
  return response.data;
};

export const removeEnrolledFace = async (employeeId) => {
  const response = await api.delete(`faceattendance/enrolled/${employeeId}`);
  return response.data;
};

export const loginKiosk = async ({ organisation_id, password, device_name }) => {
  const response = await kioskApi.post("kiosk/login", {
    organisation_id,
    password,
    device_name,
  });
  return response.data;
};

export const logoutKiosk = async () => {
  const response = await kioskApi.post("kiosk/logout");
  return response.data;
};

export const getKioskMe = async () => {
  const response = await kioskApi.get("kiosk/me");
  return response.data;
};

export const scanFace = async ({ image, gate }) => {
  const response = await kioskApi.post("faceattendance/scan", { image, gate });
  return response.data;
};

export const setKioskToken = (token) => {
  if (token) localStorage.setItem(KIOSK_TOKEN_KEY, token);
};

export const clearKioskToken = () => {
  localStorage.removeItem(KIOSK_TOKEN_KEY);
};

export const getKioskToken = () => localStorage.getItem(KIOSK_TOKEN_KEY);
