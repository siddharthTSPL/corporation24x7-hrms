import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    return Promise.reject(Object.assign(new Error(message), { code: error.response?.data?.code, status: error.response?.status }));
  }
);

// --- SuperAdmin settings ---
export const getSingleSignInSettings = async () => {
  const res = await api.get('single-sign-in/settings');
  return res.data;
};

export const updateSingleSignInSettings = async ({ enabled, mode }) => {
  const res = await api.patch('single-sign-in/settings', { enabled, mode });
  return res.data;
};

export const listActiveSessions = async () => {
  const res = await api.get('single-sign-in/sessions');
  return res.data;
};

// --- Any logged-in role ---
export const getMyPendingChallenge = async () => {
  const res = await api.get('single-sign-in/challenge/mine');
  return res.data;
};

export const respondToChallenge = async (decision) => {
  const res = await api.post('single-sign-in/challenge/respond', { decision });
  return res.data;
};

export const signOutAllOtherSessions = async () => {
  const res = await api.post('single-sign-in/sessions/sign-out-others');
  return res.data;
};

// --- Unauthenticated: used from the login screen while waiting on the
// other device to approve/deny. ---
export const pollChallengeStatus = async (sessionId) => {
  const res = await api.get(`single-sign-in/challenge/${sessionId}`);
  return res.data;
};

export const finalizeApprovedLogin = async (sessionId) => {
  const res = await api.post('single-sign-in/challenge/finalize', { sessionId });
  return res.data;
};