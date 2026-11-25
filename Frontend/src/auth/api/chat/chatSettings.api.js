import axios from "axios";

// Chat Settings page + privacy + report + storage + export. Same base + cookie auth as chat.api.js.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const e = new Error(error.response?.data?.message || "Something went wrong");
    e.status = error.response?.status;
    return Promise.reject(e);
  },
);

// ---- settings ----
// -> { settings:{ privacy, profile, status, appearance, notifications, storage, dndActiveNow } }
export const getChatSettings = async () => (await api.get("chat/settings")).data;

// body = any subset of { privacy, profile, appearance, notifications, storage }
export const updateChatSettings = async (body) => (await api.patch("chat/settings", body)).data;

// preset: "available" | "busy" | "in_meeting" | "on_leave" | "custom" | "" (clear)
// duration: "1h" | "today" | "7d" | "never"
export const setChatStatus = async ({ preset = "", text, duration = "never" }) =>
  (await api.put("chat/settings/status", { preset, text, duration })).data;

// ---- help & about ----
export const getChatAbout = async () => (await api.get("chat/about")).data; // { app, version, shortcuts:[{keys,action}] }

// ---- report user ----
export const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "impersonation", label: "Impersonation" },
  { id: "other", label: "Other" },
];
export const reportChatUser = async ({ targetKey, reason, details, conversationId, messageId }) =>
  (await api.post("chat/report", { targetKey, reason, details, conversationId, messageId })).data; // { reportId }

// Admin / SuperAdmin only. status: "open" | "reviewed" | "dismissed" | undefined (all)
export const getChatReports = async ({ status, limit = 50 } = {}) =>
  (await api.get("chat/reports", { params: { status: status || undefined, limit } })).data;
export const reviewChatReport = async ({ id, status }) => (await api.patch(`chat/reports/${id}`, { status })).data;

// ---- storage & data ----
export const getChatStorage = async () => (await api.get("chat/storage")).data;
export const clearAllChats = async () => (await api.post("chat/clear-all", { confirm: true })).data; // { cleared }

// format: "txt" | "json" -> triggers a browser download
export const exportChat = async ({ id, format = "txt" }) => {
  const res = await api.get(`chat/conversations/${id}/export`, { params: { format }, responseType: "blob" });
  const cd = res.headers?.["content-disposition"] || "";
  const name = /filename="?([^";]+)"?/i.exec(cd)?.[1] || `chat.${format}`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { name };
};
