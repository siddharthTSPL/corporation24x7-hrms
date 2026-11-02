import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getChatSettings, updateChatSettings, setChatStatus, getChatAbout, reportChatUser,
  getChatReports, reviewChatReport, getChatStorage, clearAllChats, exportChat,
} from "../../api/chat/chatSettings.api";
import { getSocket } from "../../../realtime/socket";
import { CHAT_KEYS } from "./chatCache";

export const SETTINGS_KEYS = {
  settings: ["chat", "settings"],
  about: ["chat", "about"],
  storage: ["chat", "storage"],
  reports: (status) => ["chat", "reports", status || "all"],
};

const merge = (a, b) => {
  if (!b || typeof b !== "object" || Array.isArray(b)) return b;
  const out = { ...(a || {}) };
  for (const k of Object.keys(b)) out[k] = merge(out[k], b[k]);
  return out;
};

// Settings page data. Also listens to "chat:settings:updated" so my other devices stay in sync.
export const useChatSettings = (enabled = true) => {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return undefined;
    const socket = getSocket();
    const onUpdated = (settings) => qc.setQueryData(SETTINGS_KEYS.settings, { success: true, settings });
    socket.on("chat:settings:updated", onUpdated);
    return () => socket.off("chat:settings:updated", onUpdated);
  }, [enabled, qc]);

  return useQuery({
    queryKey: SETTINGS_KEYS.settings,
    queryFn: getChatSettings,
    enabled,
    staleTime: 60000,
    select: (d) => d.settings,
  });
};

// mutate({ privacy:{hideOnline:true} }) - instant, rolls back on error
export const useUpdateChatSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateChatSettings,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: SETTINGS_KEYS.settings });
      const prev = qc.getQueryData(SETTINGS_KEYS.settings);
      if (prev) qc.setQueryData(SETTINGS_KEYS.settings, { ...prev, settings: merge(prev.settings, patch) });
      return { prev };
    },
    onError: (e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(SETTINGS_KEYS.settings, ctx.prev);
      toast.error(e.message);
    },
    onSuccess: (d) => qc.setQueryData(SETTINGS_KEYS.settings, d),
  });
};

// mutate({ preset, text?, duration })
export const useSetChatStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setChatStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEYS.settings }),
    onError: (e) => toast.error(e.message),
  });
};

export const useChatAbout = (enabled = true) =>
  useQuery({ queryKey: SETTINGS_KEYS.about, queryFn: getChatAbout, enabled, staleTime: Infinity });

export const useReportUser = () =>
  useMutation({
    mutationFn: reportChatUser,
    onSuccess: () => toast.success("Report sent. Your admin will review it."),
    onError: (e) => toast.error(e.message),
  });

// Admin / SuperAdmin only
export const useChatReports = ({ status, enabled = true } = {}) =>
  useQuery({
    queryKey: SETTINGS_KEYS.reports(status),
    queryFn: () => getChatReports({ status }),
    enabled,
    staleTime: 15000,
    select: (d) => d.reports,
  });

export const useReviewReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reviewChatReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", "reports"] }),
    onError: (e) => toast.error(e.message),
  });
};

export const useChatStorage = (enabled = true) =>
  useQuery({ queryKey: SETTINGS_KEYS.storage, queryFn: getChatStorage, enabled, staleTime: 30000 });

export const useClearAllChats = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearAllChats,
    onSuccess: (d) => {
      toast.success(d.cleared ? "All chats cleared." : "Nothing to clear.");
      qc.invalidateQueries({ queryKey: CHAT_KEYS.all });
    },
    onError: (e) => toast.error(e.message),
  });
};

// mutate({ id, format: "txt" | "json" })
export const useExportChat = () =>
  useMutation({
    mutationFn: exportChat,
    onSuccess: ({ name }) => toast.success(`Exported ${name}`),
    onError: (e) => toast.error(e.message),
  });
