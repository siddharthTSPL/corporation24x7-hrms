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

// REST side of the live-meeting extras. The realtime part (asking, upvoting, sending kudos, drawing,
// captions...) goes over the socket - these calls load the state when you open the panel or after the meeting.

// Q&A -> { questions: [...] } (dismissed ones are only returned to the host / co-hosts)
export const getMeetingQuestions = async (id) => (await api.get(`meetings/${id}/questions`)).data;

// Kudos given in this meeting -> { kudos: [...] }
export const getMeetingKudos = async (id) => (await api.get(`meetings/${id}/kudos`)).data;

// My kudos over the last N days (1..365, default 90) -> { days, receivedCount, givenCount, received, given }
export const getMyKudos = async ({ days } = {}) => (await api.get("meetings/kudos/mine", { params: { days } })).data;

// Organisation leaderboard, last N days (1..365, default 30) -> { days, topReceivers, topGivers }
export const getKudosLeaderboard = async ({ days } = {}) => (await api.get("meetings/kudos/leaderboard", { params: { days } })).data;

// Whiteboard -> { strokes: [...], updatedAt }
export const getMeetingBoard = async (id) => (await api.get(`meetings/${id}/board`)).data;

// -> { shared, canShare, lines: [{ key, name, text, at, lang }] }. 403 for attendees until the host shares it.
export const getMeetingTranscript = async (id) => (await api.get(`meetings/${id}/transcript`)).data;
export const downloadMeetingTranscriptTxt = async (id) =>
  (await api.get(`meetings/${id}/transcript`, { params: { format: "txt" }, responseType: "blob" })).data;

// Host / co-host. shared: false takes it back. -> { shared }
export const shareMeetingTranscript = async ({ id, shared = true }) => (await api.post(`meetings/${id}/transcript/share`, { shared })).data;

// Minutes of meeting -> { minutes, markdown }
//   minutes: { meeting, attendance, agenda, decisions, actionItems, polls, questions, pulse, kudos, wheel,
//              breakouts, recording, transcript, talk (host only), notes }
export const getMeetingMinutes = async (id) => (await api.get(`meetings/${id}/minutes`)).data;
export const downloadMeetingMinutesMd = async (id) =>
  (await api.get(`meetings/${id}/minutes`, { params: { format: "md" }, responseType: "blob" })).data;
