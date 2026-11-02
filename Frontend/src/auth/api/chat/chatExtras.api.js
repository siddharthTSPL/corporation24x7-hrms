import axios from "axios";

// Chat features 21-34. Same base + cookie auth as chat.api.js.
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

const c = (id) => `chat/conversations/${id}`;
const m = (id) => `chat/messages/${id}`;

// ---- 21 star + starred screen ----
export const starMessage = async ({ messageId, starred = true }) => (await api.post(`${m(messageId)}/star`, { starred })).data;
export const getStarred = async ({ conversationId, q, before, limit = 30 } = {}) =>
  (await api.get("chat/starred", { params: { conversationId, q: q || undefined, before, limit } })).data; // { starred:[{starredAt,conversation,message}], hasMore, nextCursor }

// ---- 22 pin message ----
// duration: "24h" | "7d" | "30d"
export const pinMessage = async ({ messageId, pinned = true, duration = "7d" }) => (await api.post(`${m(messageId)}/pin`, { pinned, duration })).data;
export const getPinnedMessages = async (id) => (await api.get(`${c(id)}/pinned`)).data; // { pinned:[...] } newest first

// ---- 23 archive ----
export const archiveConversation = async ({ id, archived = true }) => (await api.patch(`${c(id)}/archive`, { archived })).data;

// ---- 24 list chips ----
export const getChatCounts = async () => (await api.get("chat/counts")).data; // { counts:{all,unread,groups,direct,favourites,mentions,archived} }
export const setFavouriteConversation = async ({ id, favourite = true }) => (await api.patch(`${c(id)}/favourite`, { favourite })).data;

// ---- 25 mentions ----
export const getMentionable = async ({ id, q = "" }) => (await api.get(`${c(id)}/mentionable`, { params: { q } })).data; // { members:[{key,name,...}, {key:"all"}] }
export const getMyMentions = async ({ id, before, limit = 30 }) => (await api.get(`${c(id)}/mentions`, { params: { before, limit } })).data;

// ---- 26 message info ----
export const getMessageInfo = async (messageId) => (await api.get(`${m(messageId)}/info`)).data; // seenBy / deliveredOnly / pending

// ---- 27 polls (groups) ----
// body: { question, options:["A","B",...2-12], multiple?, anonymous? }
export const createPoll = async ({ id, ...body }) => (await api.post(`${c(id)}/polls`, body)).data; // { message }
export const votePoll = async ({ messageId, optionIds = [] }) => (await api.post(`${m(messageId)}/vote`, { optionIds })).data; // [] withdraws
export const closePoll = async (messageId) => (await api.post(`${m(messageId)}/poll/close`)).data;
export const getPoll = async (messageId) => (await api.get(`${m(messageId)}/poll`)).data;

// ---- 28 link preview (while typing) ----
export const getLinkPreview = async (url) => (await api.get("chat/link-preview", { params: { url } })).data; // { preview | null }

// ---- 29 scheduled messages ----
// sendAt = ISO string, 20 s .. 1 year ahead. text only.
export const scheduleMessage = async ({ id, text, sendAt, replyTo, mentions }) =>
  (await api.post(`${c(id)}/scheduled`, { text, sendAt, replyTo, mentions })).data;
export const listScheduled = async ({ conversationId } = {}) => (await api.get("chat/scheduled", { params: { conversationId } })).data;
export const updateScheduled = async ({ scheduledId, ...body }) => (await api.patch(`chat/scheduled/${scheduledId}`, body)).data; // { text?, sendAt? } - also retries a failed one
export const cancelScheduled = async (scheduledId) => (await api.delete(`chat/scheduled/${scheduledId}`)).data;
export const sendScheduledNow = async (scheduledId) => (await api.post(`chat/scheduled/${scheduledId}/send-now`)).data;

// ---- 30 disappearing messages ----
// seconds: 0 (off) | 86400 | 604800 | 7776000
export const setDisappearing = async ({ id, seconds }) => (await api.patch(`${c(id)}/disappearing`, { seconds })).data;

// ---- 31 media / docs / links tabs ----
export const getMediaSummary = async (id) => (await api.get(`${c(id)}/media-summary`)).data; // { counts:{media,docs,audio,links} }
// tab: "media" | "docs" | "audio" | "links"; before = nextCursor
export const getMedia = async ({ id, tab = "media", before, limit = 30 }) => (await api.get(`${c(id)}/media`, { params: { tab, before, limit } })).data;

// ---- 32 drafts ----
export const saveDraft = async ({ id, text, replyTo }) => (await api.put(`${c(id)}/draft`, { text, replyTo })).data; // empty text clears
export const getDraft = async (id) => (await api.get(`${c(id)}/draft`)).data;

// ---- 34 group admin controls + invite link ----
// settings: { onlyAdminsCanSend, onlyAdminsCanEditInfo, onlyAdminsCanAddMembers, onlyAdminsCanPin }
export const updateGroupSettings = async ({ id, settings }) => (await api.patch(c(id), { settings })).data;
export const getGroupInvite = async (id) => (await api.get(`${c(id)}/invite`)).data; // admins see code/link
export const createGroupInvite = async (id) => (await api.post(`${c(id)}/invite`)).data; // creates OR resets
export const disableGroupInvite = async (id) => (await api.delete(`${c(id)}/invite`)).data;
export const previewInvite = async (code) => (await api.get(`chat/invite/${encodeURIComponent(code)}`)).data; // { group:{name,photo,memberCount,alreadyMember,full} }
export const joinByInvite = async (code) => (await api.post(`chat/invite/${encodeURIComponent(code)}/join`)).data;
