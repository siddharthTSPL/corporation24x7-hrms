import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

// Surface the server's friendly message instead of "Request failed with status code 400".
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const message = err?.response?.data?.message || err?.message || "Something went wrong";
    return Promise.reject(Object.assign(new Error(message), { status: err?.response?.status }));
  }
);

const get = async (url, params) => (await api.get(`gamification/${url}`, { params })).data;
const post = async (url, body) => (await api.post(`gamification/${url}`, body || {})).data;
const put = async (url, body) => (await api.put(`gamification/${url}`, body || {})).data;
const patch = async (url, body) => (await api.patch(`gamification/${url}`, body || {})).data;
const del = async (url) => (await api.delete(`gamification/${url}`)).data;

// ── everyone ──
export const getMe = () => get("me");
export const getHub = () => get("hub");
export const getMeta = () => get("meta");
export const getHistory = (params) => get("history", params);
export const updatePrefs = (body) => patch("prefs", body);
export const getCosmetics = () => get("cosmetics");
export const getBadges = () => get("badges");
export const markBadgesSeen = () => post("badges/seen");
export const getLeaderboard = (params) => get("leaderboard", params);
export const getFeed = () => get("feed");
export const getSeasons = () => get("seasons");

export const getQuests = () => get("quests");
export const claimQuest = (id) => post(`quests/${id}/claim`);
export const claimAllQuests = () => post("quests/claim-all");
export const rerollQuest = (id) => post(`quests/${id}/reroll`);

export const getDaily = () => get("daily");
export const claimDaily = () => post("daily/claim");
export const getSpin = () => get("spin");
export const doSpin = (extra = false) => post("spin", { extra });
export const getQuiz = () => get("quiz");
export const answerQuiz = (choice) => post("quiz/answer", { choice });
export const buyFreeze = () => post("streak-freeze");

export const getChallenges = () => get("challenges");
export const getChallengeBoard = (id) => get(`challenges/${id}/board`);
export const joinChallenge = (id) => post(`challenges/${id}/join`);
export const claimChallenge = (id) => post(`challenges/${id}/claim`);

export const getStore = () => get("store");
export const redeemReward = ({ id, note }) => post(`store/${id}/redeem`, { note });
export const getMyRedemptions = () => get("store/redemptions");
export const cancelRedemption = (id) => post(`store/redemptions/${id}/cancel`);

export const getKudosMeta = () => get("kudos/meta");
export const getKudos = (params) => get("kudos", params);
export const searchPeople = (q) => get("kudos/people", { q });
export const giveKudos = (body) => post("kudos", body);
export const reactKudos = ({ id, emoji }) => post(`kudos/${id}/react`, { emoji });
export const commentKudos = ({ id, text }) => post(`kudos/${id}/comment`, { text });

export const getTeam = () => get("team");
export const manualAward = (body) => post("award", body);

// ── admin ──
export const getAdminSettings = () => get("admin/settings");
export const saveAdminSettings = (body) => put("admin/settings", body);
export const resetAdminRules = () => post("admin/settings/reset-rules");
export const getAdminAnalytics = () => get("admin/analytics");
export const exportLeaderboardUrl = (period) => `${api.defaults.baseURL}gamification/admin/export?period=${period}`;
export const getAdminParticipants = (params) => get("admin/participants", params);
export const updateAdminParticipant = ({ key, ...body }) => patch(`admin/participants/${key}`, body);
export const adminAdjust = (body) => post("admin/adjust", body);

export const getAdminBadges = () => get("admin/badges");
export const createAdminBadge = (b) => post("admin/badges", b);
export const updateAdminBadge = ({ id, ...b }) => put(`admin/badges/${id}`, b);
export const deleteAdminBadge = (id) => del(`admin/badges/${id}`);
export const grantAdminBadge = (b) => post("admin/badges/grant", b);

export const getAdminQuests = () => get("admin/quests");
export const createAdminQuest = (b) => post("admin/quests", b);
export const updateAdminQuest = ({ id, ...b }) => put(`admin/quests/${id}`, b);
export const deleteAdminQuest = (id) => del(`admin/quests/${id}`);

export const getAdminChallenges = () => get("admin/challenges");
export const createAdminChallenge = (b) => post("admin/challenges", b);
export const updateAdminChallenge = ({ id, ...b }) => put(`admin/challenges/${id}`, b);
export const finaliseAdminChallenge = (id) => post(`admin/challenges/${id}/finalise`);
export const cancelAdminChallenge = (id) => post(`admin/challenges/${id}/cancel`);

export const getAdminRewards = () => get("admin/rewards");
export const seedAdminRewards = () => post("admin/rewards/seed");
export const createAdminReward = (b) => post("admin/rewards", b);
export const updateAdminReward = ({ id, ...b }) => put(`admin/rewards/${id}`, b);
export const deleteAdminReward = (id) => del(`admin/rewards/${id}`);
export const getAdminRedemptions = (status) => get("admin/redemptions", { status });
export const decideAdminRedemption = ({ id, ...b }) => patch(`admin/redemptions/${id}`, b);

export const getAdminSeasons = () => get("admin/seasons");
export const createAdminSeason = (b) => post("admin/seasons", b);
export const finaliseAdminSeason = (id) => post(`admin/seasons/${id}/finalise`);
export const deleteAdminSeason = (id) => del(`admin/seasons/${id}`);

export const getAdminQuiz = () => get("admin/quiz");
export const createAdminQuiz = (b) => post("admin/quiz", b);
export const updateAdminQuiz = ({ id, ...b }) => put(`admin/quiz/${id}`, b);
export const deleteAdminQuiz = (id) => del(`admin/quiz/${id}`);

export const moderateKudos = ({ id, ...b }) => patch(`admin/kudos/${id}`, b);
