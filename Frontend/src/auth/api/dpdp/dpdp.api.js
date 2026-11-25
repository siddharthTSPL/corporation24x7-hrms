import axios from "axios";
// Loads the axios patch first so this instance gets the DPDP interceptors
// (adds X-Dpdp-Token, and opens the PIN popup on a 423 DPDP_PIN_REQUIRED).
import "../../../dpdp/dpdpGate";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

// ───────── every signed-in user ─────────
export const getDpdpStatus = async () => (await api.get("dpdp/status")).data;
export const verifyDpdpPin = async (pin) => (await api.post("dpdp/pin/verify", { pin })).data;
export const lockDpdp = async () => (await api.post("dpdp/pin/lock")).data;
export const getMyConsent = async () => (await api.get("dpdp/consent/me")).data;
export const saveMyConsent = async (purposes) => (await api.post("dpdp/consent/me", { purposes })).data;
export const getMyRequests = async () => (await api.get("dpdp/requests/me")).data;
export const createDpdpRequest = async (payload) => (await api.post("dpdp/requests", payload)).data;
export const exportMyData = async () => (await api.get("dpdp/me/export")).data;

// ───────── super admin ─────────
export const getDpdpAdminSettings = async () => (await api.get("dpdp/admin/settings")).data;
export const updateDpdpAdminSettings = async (patch) => (await api.put("dpdp/admin/settings", patch)).data;
export const setDpdpAdminPin = async (payload) => (await api.post("dpdp/admin/pin", payload)).data;
export const getDpdpAccessLog = async (params = { limit: 25 }) => (await api.get("dpdp/admin/access-log", { params })).data;
export const getDpdpAdminRequests = async (params) => (await api.get("dpdp/admin/requests", { params })).data;
export const updateDpdpAdminRequest = async ({ id, status, resolution }) =>
  (await api.patch(`dpdp/admin/requests/${id}`, { status, resolution })).data;
