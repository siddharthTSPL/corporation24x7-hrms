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
    return Promise.reject(e);
  },
);

// from / to are ISO strings. status: "scheduled,live" etc. hosting: true => only meetings I host.
export const getMeetings = async ({ from, to, status, hosting, limit } = {}) =>
  (await api.get("meetings", { params: { from, to, status, hosting: hosting || undefined, limit } })).data;

export const getMeeting = async (id) => (await api.get(`meetings/${id}`)).data;

/**
 * body: {
 *   title, description?, agenda?, startTime (ISO), durationMin? | endTime?, timezone?, media: "video"|"audio",
 *   attendees?: [{model,id}], audience?: { everyone?, departments?: [], teams?: ["hr","it","accounts"] },
 *   coHosts?: ["Manager:<id>"], recurrence?: { freq: "daily"|"weekly"|"monthly", interval?, count? },
 *   reminderMinutes?, allowJoinBeforeHost?, sendEmail?
 * }
 * Response: { meeting, occurrences, conflicts: [{ key, name, title, startTime, endTime }] }
 */
export const createMeeting = async (body) => (await api.post("meetings", body)).data;

export const updateMeeting = async ({ id, ...body }) => (await api.patch(`meetings/${id}`, body)).data;

// scope: "this" | "series"
export const cancelMeeting = async ({ id, scope = "this", reason, sendEmail }) =>
  (await api.delete(`meetings/${id}`, { params: { scope }, data: { reason, sendEmail } })).data;

export const respondToMeeting = async ({ id, rsvp }) => (await api.post(`meetings/${id}/respond`, { rsvp })).data;

export const endMeeting = async (id) => (await api.post(`meetings/${id}/end`)).data;

// -> { canJoin, running, roomKey, ... } or { canJoin:false, code: "TOO_EARLY"|"WAITING_FOR_HOST"|..., startsAt }
export const getMeetingJoinInfo = async (id) => (await api.get(`meetings/${id}/join-info`)).data;

// Download the .ics (Add to calendar). Returns a Blob.
export const downloadMeetingIcs = async (id) =>
  (await api.get(`meetings/${id}/ics`, { responseType: "blob" })).data;

// body: { people?: [{model,id}], audience?, startTime, endTime, excludeMeetingId? }
export const checkAvailability = async (body) => (await api.post("meetings/availability", body)).data;

// Month view for the calendar. month: "YYYY-MM"; tz: IANA zone used to bucket meetings into days.
// -> { timezone, meetings: [...], days: { "YYYY-MM-DD": [meetingId] }, counts: { "YYYY-MM-DD": n }, liveNow: [ids] }
export const getMeetingCalendar = async ({ month, tz, hosting } = {}) =>
  (await api.get("meetings/calendar", { params: { month, tz, hosting: hosting || undefined } })).data;

// Host / co-host: lobby, mute-on-entry, chat, reactions, hand raise, screen-share mode
export const updateMeetingSettings = async ({ id, ...settings }) => (await api.patch(`meetings/${id}/settings`, { settings })).data;

// Host / co-host: attendance report -> { meeting, summary, participants }
export const getMeetingReport = async (id) => (await api.get(`meetings/${id}/report`)).data;
export const downloadMeetingReportCsv = async (id) =>
  (await api.get(`meetings/${id}/report`, { params: { format: "csv" }, responseType: "blob" })).data;

export const getMeetingReactions = async () => (await api.get("meetings/reactions")).data;

export const getMeetingBackgrounds = async () => (await api.get("meetings/backgrounds")).data;

export const uploadMeetingBackground = async ({ file, name, scope = "personal" }) => {
  const form = new FormData();
  form.append("image", file);
  if (name) form.append("name", name);
  form.append("scope", scope);
  return (await api.post("meetings/backgrounds", form)).data;
};

export const deleteMeetingBackground = async (bgId) => (await api.delete(`meetings/backgrounds/${bgId}`)).data;

export const getMeetingPreferences = async () => (await api.get("meetings/preferences")).data;

export const updateMeetingPreferences = async (body) => (await api.put("meetings/preferences", body)).data;

export const getMeetingLiveState = async (id) => (await api.get(`meetings/${id}/live`)).data;
