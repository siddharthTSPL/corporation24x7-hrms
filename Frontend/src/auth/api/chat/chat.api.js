import axios from "axios";

// Same base + cookie auth as every other api file in this project.
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

// A person is always { model: "User" | "Manager" | "Admin" | "SuperAdmin", id }.

// ---- directory / presence ----
export const searchDirectory = async ({ q = "", limit = 20, department = "" } = {}) =>
  (await api.get("chat/directory", { params: { q, limit, department: department || undefined } })).data;

export const getPresence = async (keys = []) =>
  (await api.get("chat/presence", { params: { keys: keys.join(",") } })).data;

// ---- conversations ----
export const getConversations = async ({ limit = 50, before, type } = {}) =>
  (await api.get("chat/conversations", { params: { limit, before, type } })).data;

export const getConversation = async (id) => (await api.get(`chat/conversations/${id}`)).data;

export const openDirectChat = async (participant) =>
  (await api.post("chat/conversations/direct", { participant })).data;

export const createGroupChat = async ({ name, description, members }) =>
  (await api.post("chat/conversations/group", { name, description, members })).data;

export const updateGroupChat = async ({ id, ...body }) =>
  (await api.patch(`chat/conversations/${id}`, body)).data;

export const addGroupMembers = async ({ id, members }) =>
  (await api.post(`chat/conversations/${id}/members`, { members })).data;

export const removeGroupMember = async ({ id, key }) =>
  (await api.delete(`chat/conversations/${id}/members/${encodeURIComponent(key)}`)).data;

export const setGroupMemberRole = async ({ id, key, role }) =>
  (await api.patch(`chat/conversations/${id}/members/${encodeURIComponent(key)}/role`, { role })).data;

export const leaveGroupChat = async (id) => (await api.post(`chat/conversations/${id}/leave`)).data;

export const muteConversation = async ({ id, muted }) =>
  (await api.patch(`chat/conversations/${id}/mute`, { muted })).data;

export const markConversationRead = async (id) => (await api.post(`chat/conversations/${id}/read`)).data;

// ---- messages ----
// before = id of the oldest message you already have (cursor for "load older")
export const getMessages = async ({ id, before, limit = 40 }) =>
  (await api.get(`chat/conversations/${id}/messages`, { params: { before, limit } })).data;

// JSON for text, multipart when files are attached (max 5 files, 15 MB each).
export const sendMessageRest = async ({ id, text, replyTo, clientId, files = [], onUploadProgress }) => {
  if (!files.length) {
    return (await api.post(`chat/conversations/${id}/messages`, { text, replyTo, clientId })).data;
  }
  const fd = new FormData();
  if (text) fd.append("text", text);
  if (replyTo) fd.append("replyTo", replyTo);
  if (clientId) fd.append("clientId", clientId);
  files.forEach((f) => fd.append("attachments", f));
  return (await api.post(`chat/conversations/${id}/messages`, fd, { onUploadProgress })).data;
};

export const editMessage = async ({ messageId, text }) =>
  (await api.patch(`chat/messages/${messageId}`, { text })).data;

export const deleteMessage = async (messageId) => (await api.delete(`chat/messages/${messageId}`)).data;

export const searchMessages = async ({ q, conversationId }) =>
  (await api.get("chat/search", { params: { q, conversationId } })).data;

export const getChatUnreadCount = async () => (await api.get("chat/unread-count")).data;

// ---- calls ----
export const getIceServers = async () => (await api.get("chat/calls/ice-servers")).data;
export const getActiveCalls = async () => (await api.get("chat/calls/active")).data;
export const getCallHistory = async ({ limit = 30, before } = {}) =>
  (await api.get("chat/calls/history", { params: { limit, before } })).data;
