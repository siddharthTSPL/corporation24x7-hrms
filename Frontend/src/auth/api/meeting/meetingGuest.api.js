import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/";

const toError = (error) => {
  const e = new Error(error.response?.data?.message || "Something went wrong");
  e.status = error.response?.status;
  e.code = error.response?.data?.code;
  return Promise.reject(e);
};

// Host / co-host (logged in)
const api = axios.create({ baseURL, withCredentials: true });
api.interceptors.response.use((r) => r, toError);

// Outsiders: no account, so never send cookies
const open = axios.create({ baseURL, withCredentials: false });
open.interceptors.response.use((r) => r, toError);

// ---- host / co-host ----
export const getMeetingGuests = async (id) => (await api.get(`meetings/${id}/guests`)).data;

// guests: [{ email, name? }]  ->  { added, skipped: [{ email, reason }], guests }
export const inviteMeetingGuests = async ({ id, guests, sendEmail = true }) =>
  (await api.post(`meetings/${id}/guests`, { guests, sendEmail })).data;

// New PIN is emailed, the old one stops working
export const resendGuestPin = async ({ id, guestId }) => (await api.post(`meetings/${id}/guests/${guestId}/resend`)).data;

export const revokeMeetingGuest = async ({ id, guestId }) => (await api.delete(`meetings/${id}/guests/${guestId}`)).data;

// ---- public (guest join page) ----
export const getGuestMeetingInfo = async (id) => (await open.get(`meetings/guest/${id}/info`)).data;

// { meetingId, email, pin, name? } -> { token, guest, meeting }
export const guestJoin = async (body) => (await open.post("meetings/guest/join", body)).data;
