import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as api from "../../api/gamification/gamification.api";

// All gamification cache keys start with "gam" so one invalidate refreshes everything
// (XP chip, hub, quests, store...) after any action.
const KEY = "gam";

export const useGamMe = (enabled = true) =>
  useQuery({ queryKey: [KEY, "me"], queryFn: api.getMe, enabled, staleTime: 15000, refetchOnWindowFocus: true });
export const useGamHub = () => useQuery({ queryKey: [KEY, "hub"], queryFn: api.getHub, staleTime: 10000 });
export const useGamMeta = () => useQuery({ queryKey: [KEY, "meta"], queryFn: api.getMeta, staleTime: 3600000 });
export const useGamHistory = (params) => useQuery({ queryKey: [KEY, "history", params], queryFn: () => api.getHistory(params), keepPreviousData: true });
export const useGamBadges = () => useQuery({ queryKey: [KEY, "badges"], queryFn: api.getBadges });
export const useGamCosmetics = () => useQuery({ queryKey: [KEY, "cosmetics"], queryFn: api.getCosmetics });
export const useGamLeaderboard = (params) => useQuery({ queryKey: [KEY, "leaderboard", params], queryFn: () => api.getLeaderboard(params), staleTime: 20000 });
export const useGamFeed = () => useQuery({ queryKey: [KEY, "feed"], queryFn: api.getFeed, staleTime: 30000 });
export const useGamSeasons = () => useQuery({ queryKey: [KEY, "seasons"], queryFn: api.getSeasons });
export const useGamQuests = () => useQuery({ queryKey: [KEY, "quests"], queryFn: api.getQuests });
export const useGamChallenges = () => useQuery({ queryKey: [KEY, "challenges"], queryFn: api.getChallenges });
export const useGamChallengeBoard = (id, enabled) => useQuery({ queryKey: [KEY, "challengeBoard", id], queryFn: () => api.getChallengeBoard(id), enabled });
export const useGamStore = () => useQuery({ queryKey: [KEY, "store"], queryFn: api.getStore });
export const useGamRedemptions = () => useQuery({ queryKey: [KEY, "redemptions"], queryFn: api.getMyRedemptions });
export const useGamKudosMeta = () => useQuery({ queryKey: [KEY, "kudosMeta"], queryFn: api.getKudosMeta });
export const useGamKudos = (params) => useQuery({ queryKey: [KEY, "kudos", params], queryFn: () => api.getKudos(params), keepPreviousData: true });
export const useGamPeopleSearch = (q) => useQuery({ queryKey: [KEY, "people", q], queryFn: () => api.searchPeople(q), enabled: (q || "").trim().length >= 2, staleTime: 30000 });
export const useGamTeam = (enabled) => useQuery({ queryKey: [KEY, "team"], queryFn: api.getTeam, enabled });

// Generic mutation: toast the error, refresh every gamification query on success.
const useGamMutation = (fn, { success, silent } = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      if (success && !silent) toast.success(typeof success === "function" ? success(data) : success);
    },
    onError: (e) => toast.error(e.message || "Something went wrong"),
  });
};

export const useClaimQuest = () => useGamMutation(api.claimQuest);
export const useClaimAllQuests = () => useGamMutation(api.claimAllQuests, { success: (d) => `Claimed ${d.claimed.length} quest${d.claimed.length === 1 ? "" : "s"}!` });
export const useRerollQuest = () => useGamMutation(api.rerollQuest, { success: "Fresh quest swapped in" });
export const useClaimDaily = () => useGamMutation(api.claimDaily);
export const useSpin = () => useGamMutation(api.doSpin, { silent: true });
export const useAnswerQuiz = () => useGamMutation(api.answerQuiz, { silent: true });
export const useBuyFreeze = () => useGamMutation(api.buyFreeze, { success: "Streak freeze added 🧊" });
export const useJoinChallenge = () => useGamMutation(api.joinChallenge, { success: "You're in! Good luck 🏁" });
export const useClaimChallenge = () => useGamMutation(api.claimChallenge);
export const useRedeem = () => useGamMutation(api.redeemReward);
export const useCancelRedemption = () => useGamMutation(api.cancelRedemption, { success: "Request cancelled and coins refunded" });
export const useGiveKudos = () => useGamMutation(api.giveKudos, { success: "Kudos sent 🎉" });
export const useReactKudos = () => useGamMutation(api.reactKudos, { silent: true });
export const useCommentKudos = () => useGamMutation(api.commentKudos, { silent: true });
export const useUpdatePrefs = () => useGamMutation(api.updatePrefs, { success: "Saved" });
export const useManualAward = () => useGamMutation(api.manualAward, { success: "Award sent 🎖️" });
export const useMarkBadgesSeen = () => useGamMutation(api.markBadgesSeen, { silent: true });

// ── admin ──
export const useAdminSettings = () => useQuery({ queryKey: [KEY, "adminSettings"], queryFn: api.getAdminSettings });
export const useAdminAnalytics = () => useQuery({ queryKey: [KEY, "adminAnalytics"], queryFn: api.getAdminAnalytics, staleTime: 60000 });
export const useAdminParticipants = (params) => useQuery({ queryKey: [KEY, "adminParticipants", params], queryFn: () => api.getAdminParticipants(params), keepPreviousData: true });
export const useAdminBadges = () => useQuery({ queryKey: [KEY, "adminBadges"], queryFn: api.getAdminBadges });
export const useAdminQuests = () => useQuery({ queryKey: [KEY, "adminQuests"], queryFn: api.getAdminQuests });
export const useAdminChallenges = () => useQuery({ queryKey: [KEY, "adminChallenges"], queryFn: api.getAdminChallenges });
export const useAdminRewards = () => useQuery({ queryKey: [KEY, "adminRewards"], queryFn: api.getAdminRewards });
export const useAdminRedemptions = (status) => useQuery({ queryKey: [KEY, "adminRedemptions", status], queryFn: () => api.getAdminRedemptions(status) });
export const useAdminSeasons = () => useQuery({ queryKey: [KEY, "adminSeasons"], queryFn: api.getAdminSeasons });
export const useAdminQuiz = () => useQuery({ queryKey: [KEY, "adminQuiz"], queryFn: api.getAdminQuiz });

export const useSaveSettings = () => useGamMutation(api.saveAdminSettings, { success: "Settings saved" });
export const useResetRules = () => useGamMutation(api.resetAdminRules, { success: "Rules reset to defaults" });
export const useUpdateParticipant = () => useGamMutation(api.updateAdminParticipant, { success: "Updated" });
export const useAdjust = () => useGamMutation(api.adminAdjust, { success: "Adjustment applied" });
export const useCreateBadge = () => useGamMutation(api.createAdminBadge, { success: "Badge created" });
export const useUpdateBadge = () => useGamMutation(api.updateAdminBadge, { success: "Badge updated" });
export const useDeleteBadge = () => useGamMutation(api.deleteAdminBadge, { success: "Badge deleted" });
export const useGrantBadge = () => useGamMutation(api.grantAdminBadge, { success: "Badge granted 🏅" });
export const useCreateQuest = () => useGamMutation(api.createAdminQuest, { success: "Quest created" });
export const useUpdateQuest = () => useGamMutation(api.updateAdminQuest, { success: "Quest updated" });
export const useDeleteQuest = () => useGamMutation(api.deleteAdminQuest, { success: "Quest deleted" });
export const useCreateChallenge = () => useGamMutation(api.createAdminChallenge, { success: "Challenge launched 🚀" });
export const useUpdateChallenge = () => useGamMutation(api.updateAdminChallenge, { success: "Challenge updated" });
export const useFinaliseChallenge = () => useGamMutation(api.finaliseAdminChallenge, { success: "Challenge finalised" });
export const useCancelChallenge = () => useGamMutation(api.cancelAdminChallenge, { success: "Challenge cancelled" });
export const useSeedRewards = () => useGamMutation(api.seedAdminRewards, { success: (d) => `Added ${d.created} starter rewards` });
export const useCreateReward = () => useGamMutation(api.createAdminReward, { success: "Reward added" });
export const useUpdateReward = () => useGamMutation(api.updateAdminReward, { success: "Reward updated" });
export const useDeleteReward = () => useGamMutation(api.deleteAdminReward, { success: "Reward removed" });
export const useDecideRedemption = () => useGamMutation(api.decideAdminRedemption, { success: "Updated" });
export const useCreateSeason = () => useGamMutation(api.createAdminSeason, { success: "Season created" });
export const useFinaliseSeason = () => useGamMutation(api.finaliseAdminSeason, { success: "Season finalised — prizes paid 🏆" });
export const useDeleteSeason = () => useGamMutation(api.deleteAdminSeason, { success: "Season deleted" });
export const useCreateQuiz = () => useGamMutation(api.createAdminQuiz, { success: "Question added" });
export const useUpdateQuiz = () => useGamMutation(api.updateAdminQuiz, { success: "Question updated" });
export const useDeleteQuiz = () => useGamMutation(api.deleteAdminQuiz, { success: "Question deleted" });
export const useModerateKudos = () => useGamMutation(api.moderateKudos, { success: "Updated" });
