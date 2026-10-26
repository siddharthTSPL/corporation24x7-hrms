import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

export const getBiometricDevices = async () => (await api.get("biometric/devices")).data;
export const createBiometricDevice = async (data) => (await api.post("biometric/devices", data)).data;
export const updateBiometricDevice = async ({ id, ...data }) => (await api.patch(`biometric/devices/${id}`, data)).data;
export const deleteBiometricDevice = async (id) => (await api.delete(`biometric/devices/${id}`)).data;
export const getBiometricDeviceUsers = async (id) => (await api.get(`biometric/devices/${id}/users`)).data;
export const mapBiometricUser = async ({ id, deviceUserId, empid }) =>
  (await api.put(`biometric/devices/${id}/users/${encodeURIComponent(deviceUserId)}`, { empid })).data;
export const autoMapBiometricUsers = async (id) => (await api.post(`biometric/devices/${id}/auto-map`)).data;
export const getBiometricPunches = async (params) => (await api.get("biometric/punches", { params })).data;
export const importBiometricPunches = async (data) => (await api.post("biometric/import", data)).data;
export const reprocessBiometric = async (params) => (await api.post("biometric/reprocess", null, { params })).data;

// Downloads (files come back as blobs so the auth cookie is sent)
export const downloadBlob = async (url, params, fallbackName) => {
  const res = await api.get(url, { params, responseType: "blob" });
  const cd = res.headers["content-disposition"] || "";
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] || fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
};