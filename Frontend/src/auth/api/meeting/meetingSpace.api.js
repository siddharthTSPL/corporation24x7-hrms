import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const e = new Error(error.response?.data?.message || "Something went wrong");
    e.status = error.response?.status;
    e.data = error.response?.data;
    return Promise.reject(e);
  },
);

export const getDiscoverMeetings = async ({ from, to, q, interested, limit } = {}) =>
  (await api.get("meetings/discover", { params: { from, to, q: q || undefined, interested: interested || undefined, limit } })).data;

export const getMeetingSpace = async (id) => (await api.get(`meetings/${id}/space`)).data;

export const updateMeetingSpace = async ({ id, ...body }) => (await api.patch(`meetings/${id}/space`, body)).data;

export const setMeetingInterest = async ({ id, interested = true, note }) =>
  (await api.put(`meetings/${id}/interest`, { interested, note })).data;

export const getInterestedPeople = async (id) => (await api.get(`meetings/${id}/interested`)).data;

export const promoteInterestedPeople = async ({ id, keys, all, sendEmail }) =>
  (await api.post(`meetings/${id}/interested/promote`, { keys, all, sendEmail })).data;

export const nudgeMeetingInvitees = async ({ id, sendEmail }) => (await api.post(`meetings/${id}/nudge`, { sendEmail })).data;

export const createInstantMeeting = async (body) => (await api.post("meetings/instant", body)).data;

export const getMeetingInsights = async ({ from, to, tz } = {}) => (await api.get("meetings/insights/me", { params: { from, to, tz } })).data;

export const getAnnouncements = async ({ id, before, limit, unseen }) =>
  (await api.get(`meetings/${id}/announcements`, { params: { before, limit, unseen: unseen || undefined } })).data;

export const createAnnouncement = async ({ id, ...body }) => (await api.post(`meetings/${id}/announcements`, body)).data;

export const previewAnnouncementAudience = async ({ id, to }) => (await api.post(`meetings/${id}/announcements/audience`, { to })).data;

export const markAnnouncementSeen = async ({ id, aid }) => (await api.post(`meetings/${id}/announcements/${aid}/seen`)).data;

export const markAllAnnouncementsSeen = async (id) => (await api.post(`meetings/${id}/announcements/seen-all`)).data;

export const getAnnouncementViewers = async ({ id, aid }) => (await api.get(`meetings/${id}/announcements/${aid}/viewers`)).data;

export const updateAnnouncement = async ({ id, aid, ...body }) => (await api.patch(`meetings/${id}/announcements/${aid}`, body)).data;

export const deleteAnnouncement = async ({ id, aid }) => (await api.delete(`meetings/${id}/announcements/${aid}`)).data;

export const getMeetingNotes = async (id) => (await api.get(`meetings/${id}/notes`)).data;

export const saveMeetingNotes = async ({ id, ...body }) => (await api.put(`meetings/${id}/notes`, body)).data;

export const shareMeetingNotes = async ({ id, includeAttendees, includeGuests }) =>
  (await api.post(`meetings/${id}/notes/share`, { includeAttendees, includeGuests })).data;

export const getMeetingActionItems = async ({ id, status, assignee }) =>
  (await api.get(`meetings/${id}/action-items`, { params: { status, assignee } })).data;

export const createMeetingActionItem = async ({ id, ...body }) => (await api.post(`meetings/${id}/action-items`, body)).data;

export const updateMeetingActionItem = async ({ id, itemId, ...body }) => (await api.patch(`meetings/${id}/action-items/${itemId}`, body)).data;

export const deleteMeetingActionItem = async ({ id, itemId }) => (await api.delete(`meetings/${id}/action-items/${itemId}`)).data;

export const getMyActionItems = async ({ status, overdue, limit } = {}) =>
  (await api.get("meetings/action-items/mine", { params: { status, overdue: overdue || undefined, limit } })).data;

export const getMeetingPolls = async (id) => (await api.get(`meetings/${id}/polls`)).data;

export const createMeetingPoll = async ({ id, ...body }) => (await api.post(`meetings/${id}/polls`, body)).data;

export const voteMeetingPoll = async ({ id, pollId, optionIds }) => (await api.post(`meetings/${id}/polls/${pollId}/vote`, { optionIds })).data;

export const closeMeetingPoll = async ({ id, pollId }) => (await api.post(`meetings/${id}/polls/${pollId}/close`)).data;

export const deleteMeetingPoll = async ({ id, pollId }) => (await api.delete(`meetings/${id}/polls/${pollId}`)).data;

export const getMeetingFeedbackSummary = async (id) => (await api.get(`meetings/${id}/feedback`)).data;

export const getMyMeetingFeedback = async (id) => (await api.get(`meetings/${id}/feedback/mine`)).data;

export const submitMeetingFeedback = async ({ id, ...body }) => (await api.post(`meetings/${id}/feedback`, body)).data;
