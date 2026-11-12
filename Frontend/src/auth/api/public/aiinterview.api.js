import axios from "axios";

// Same base URL rules as offerresponse.api.js: in production the build is served
// under /talent behind IIS, which proxies /talent/api/* to the backend.
const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/talent/api" : "http://localhost:5000/");

const api = axios.create({ baseURL });

// Keeps the machine-readable `code` (EXPIRED, LINK_USED, BUSY, STALE_QUESTION...)
// and any extra fields the server sent, so the page can react to them.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const body = error.response?.data || {};
    const err = new Error(body.message || "Something went wrong. Please try again");
    err.status = error.response?.status;
    err.code = body.code || (error.response ? "" : "NETWORK");
    err.data = body;
    return Promise.reject(err);
  },
);

const base = (token) => `recruitment/public/ai-interview/${token}`;

export const getAiInterview = async (token) => {
  const res = await api.get(base(token));
  return res.data.data;
};

export const giveAiInterviewConsent = async (token) => {
  const res = await api.post(`${base(token)}/consent`, { accepted: true });
  return res.data.data;
};

export const startAiInterview = async (token) => {
  const res = await api.post(`${base(token)}/start`);
  return res.data.data;
};

export const answerAiInterview = async (token, { text, expected_sequence, input_mode, stt_ms, audio_ms, transcript_edited }) => {
  const res = await api.post(`${base(token)}/answer`, {
    text,
    expected_sequence,
    ...(input_mode && { input_mode, stt_ms, audio_ms, transcript_edited }),
  });
  return res.data.data;
};

export const transcribeAiInterviewAudio = async (token, blob, durationMs) => {
  const form = new FormData();
  form.append("duration_ms", String(Math.round(durationMs || 0)));
  const type = blob.type || "";
  const ext = /mp4|m4a/.test(type) ? "m4a" : /ogg/.test(type) ? "ogg" : "webm";
  form.append("audio", blob, `answer.${ext}`);
  const res = await api.post(`${base(token)}/audio`, form, { timeout: 90000 });
  return res.data.data;
};

export const getAiInterviewTts = async (token, messageId) => {
  const res = await api.get(`${base(token)}/tts/${messageId}`, { responseType: "blob", timeout: 60000 });
  return res.data;
};

export const resumeAiInterview = async (token) => {
  const res = await api.post(`${base(token)}/resume`);
  return res.data.data;
};

export const endAiInterview = async (token) => {
  const res = await api.post(`${base(token)}/end`);
  return res.data.data;
};
