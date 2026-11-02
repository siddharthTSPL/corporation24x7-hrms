import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  starMessage, getStarred, pinMessage, getPinnedMessages, archiveConversation, getChatCounts, setFavouriteConversation,
  getMentionable, getMyMentions, getMessageInfo, createPoll, votePoll, closePoll, getPoll, getLinkPreview,
  scheduleMessage, listScheduled, updateScheduled, cancelScheduled, sendScheduledNow, setDisappearing,
  getMediaSummary, getMedia, saveDraft, getDraft, updateGroupSettings, getGroupInvite, createGroupInvite,
  disableGroupInvite, previewInvite, joinByInvite,
} from "../../api/chat/chatExtras.api";
import { CHAT_KEYS, patchConversation, patchMessage, upsertMessage, removeConversation } from "./chatCache";
import { useDebouncedValue } from "./chat.hook";

// Chat features 21-34. Socket listeners should call the helpers exported from ./chatCache
// (removeMessages, refreshPinned, setConversationDraft, addMention, refreshScheduled, setStarredFlag).

const patchConvEverywhere = (qc, id, patch) => {
  patchConversation(qc, id, (c) => ({ ...c, ...patch }));
  qc.setQueryData(CHAT_KEYS.conversation(id), (old) => (old ? { ...old, conversation: { ...old.conversation, ...patch } } : old));
};

// ---------------------------------------------------------------- 21 star + starred screen

// mutate({ conversationId, messageId, starred }) - instant, rolls back on error
export const useStarMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, starred }) => starMessage({ messageId, starred }),
    onMutate: ({ conversationId, messageId, starred }) => conversationId && patchMessage(qc, conversationId, messageId, { starred }),
    onError: (_e, { conversationId, messageId, starred }) => conversationId && patchMessage(qc, conversationId, messageId, { starred: !starred }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["chat", "starred"] }),
  });
};

// Starred screen. Returns { items:[{starredAt,conversation,message}], loadMore, hasMore, ... }
export const useStarredMessages = ({ conversationId, q = "", enabled = true } = {}) => {
  const term = useDebouncedValue(q.trim(), 350);
  const query = useInfiniteQuery({
    queryKey: CHAT_KEYS.starred(conversationId, term),
    queryFn: ({ pageParam }) => getStarred({ conversationId, q: term, before: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled,
    staleTime: 15000,
    placeholderData: keepPreviousData,
  });
  const items = useMemo(() => (query.data ? query.data.pages.flatMap((p) => p.starred) : []), [query.data]);
  return { ...query, items, loadMore: query.fetchNextPage, hasMore: !!query.hasNextPage };
};

// ---------------------------------------------------------------- 22 pin message

// Pinned bar at the top of a chat (newest first, max 3). Refetch on socket "chat:pinned:updated" via refreshPinned().
export const usePinnedMessages = (conversationId, enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.pinned(conversationId),
    queryFn: () => getPinnedMessages(conversationId),
    enabled: enabled && !!conversationId,
    staleTime: 30000,
    select: (d) => d.pinned,
  });

// mutate({ conversationId, messageId, pinned: true|false, duration: "24h"|"7d"|"30d" })
export const usePinMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, pinned, duration }) => pinMessage({ messageId, pinned, duration }),
    onSuccess: (_r, { conversationId }) => {
      if (conversationId) qc.invalidateQueries({ queryKey: CHAT_KEYS.pinned(conversationId) });
      else qc.invalidateQueries({ queryKey: ["chat", "pinned"] });
    },
  });
};

// ---------------------------------------------------------------- 23 archive / 24 chips

// mutate({ id, archived }) - removes it from the current list instantly
export const useArchiveConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: archiveConversation,
    onSuccess: (_r, { id }) => {
      removeConversation(qc, id);
      qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations });
      qc.invalidateQueries({ queryKey: CHAT_KEYS.counts });
    },
  });
};

// Numbers for the chips: { all, unread, groups, direct, favourites, mentions, archived }
export const useChatCounts = (enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.counts,
    queryFn: getChatCounts,
    enabled,
    staleTime: 10000,
    refetchOnWindowFocus: true,
    select: (d) => d.counts,
  });

// mutate({ id, favourite })
export const useFavouriteConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setFavouriteConversation,
    onMutate: ({ id, favourite }) => patchConvEverywhere(qc, id, { favourite }),
    onError: () => qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CHAT_KEYS.counts });
      qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations }); // a chat may enter / leave the Favourites chip
    },
  });
};

// ---------------------------------------------------------------- 25 mentions

// Autocomplete while typing after "@". Rows: members + { key: "all" } (never put "all" in `mentions`).
export const useMentionable = (conversationId, query = "", enabled = true) => {
  const q = useDebouncedValue(query.trim(), 150);
  return useQuery({
    queryKey: CHAT_KEYS.mentionable(conversationId, q),
    queryFn: () => getMentionable({ id: conversationId, q }),
    enabled: enabled && !!conversationId,
    staleTime: 30000,
    placeholderData: keepPreviousData,
    select: (d) => d.members,
  });
};

// Messages that mention me in this chat (the "@" badge screen)
export const useMyMentions = (conversationId, enabled = true) => {
  const query = useInfiniteQuery({
    queryKey: CHAT_KEYS.mentions(conversationId),
    queryFn: ({ pageParam }) => getMyMentions({ id: conversationId, before: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: enabled && !!conversationId,
    staleTime: 15000,
  });
  const items = useMemo(() => (query.data ? query.data.pages.flatMap((p) => p.messages || p.items || []) : []), [query.data]);
  return { ...query, items, loadMore: query.fetchNextPage, hasMore: !!query.hasNextPage };
};

// Helper for the composer: turns picked people into the `mentions` array for useSendMessage.
//   const m = useMentionPicker();  m.add({key,name}); send({ ..., mentions: m.keysIn(text) })
export const useMentionPicker = () => {
  const [picked, setPicked] = useState([]);
  const add = useCallback((p) => p?.key && p.key !== "all" && setPicked((l) => (l.some((x) => x.key === p.key) ? l : [...l, p])), []);
  const reset = useCallback(() => setPicked([]), []);
  // only keep people whose "@name" is still in the text
  const keysIn = useCallback((text = "") => picked.filter((p) => text.includes(`@${p.name}`)).map((p) => p.key), [picked]);
  return { picked, add, reset, keysIn };
};

// ---------------------------------------------------------------- 26 message info

export const useMessageInfo = (messageId, enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.messageInfo(messageId),
    queryFn: () => getMessageInfo(messageId), // { seenBy[], deliveredOnly[], pending[], canSeeNames, ... }
    enabled: enabled && !!messageId,
    staleTime: 5000,
  });

// ---------------------------------------------------------------- 27 polls

// mutate({ id: conversationId, question, options: ["A","B"], multiple?, anonymous? })
export const useCreatePoll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPoll,
    onSuccess: ({ message }, { id }) => {
      upsertMessage(qc, id, message);
      qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations });
    },
  });
};

// mutate({ conversationId, messageId, optionIds: [] }) - [] withdraws. Updates my vote instantly.
export const useVotePoll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, optionIds }) => votePoll({ messageId, optionIds }),
    onSuccess: ({ poll }, { conversationId, messageId }) => {
      if (conversationId) patchMessage(qc, conversationId, messageId, { poll });
      qc.setQueryData(CHAT_KEYS.poll(messageId), { poll });
    },
  });
};

export const useClosePoll = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId }) => closePoll(messageId),
    onSuccess: ({ poll }, { conversationId, messageId }) => {
      if (conversationId) patchMessage(qc, conversationId, messageId, { poll });
      qc.setQueryData(CHAT_KEYS.poll(messageId), { poll });
    },
  });
};

// Full poll (with voter names on non-anonymous polls)
export const usePoll = (messageId, enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.poll(messageId),
    queryFn: () => getPoll(messageId),
    enabled: enabled && !!messageId,
    staleTime: 5000,
    select: (d) => d.poll,
  });

// ---------------------------------------------------------------- 28 link preview while typing

// Pass the composer text; returns the preview card for the first link in it (or null). Render as TEXT, never HTML.
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/i;
export const useLinkPreview = (text = "", enabled = true) => {
  const match = useMemo(() => (text.match(URL_RE) || [])[0] || "", [text]);
  const url = useDebouncedValue(match && !/^https?:\/\//i.test(match) ? `https://${match}` : match, 600);
  return useQuery({
    queryKey: CHAT_KEYS.linkPreview(url),
    queryFn: () => getLinkPreview(url),
    enabled: enabled && !!url,
    staleTime: 10 * 60 * 1000,
    retry: false,
    select: (d) => d.preview || null,
  });
};

// ---------------------------------------------------------------- 29 scheduled messages

export const useScheduledMessages = ({ conversationId, enabled = true } = {}) =>
  useQuery({
    queryKey: CHAT_KEYS.scheduled(conversationId),
    queryFn: () => listScheduled({ conversationId }),
    enabled,
    staleTime: 10000,
    select: (d) => d.scheduled,
  });

const useScheduledMutation = (fn) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", "scheduled"] }) });
};
export const useScheduleMessage = () => useScheduledMutation(scheduleMessage); // { id, text, sendAt (ISO), replyTo?, mentions? }
export const useUpdateScheduled = () => useScheduledMutation(updateScheduled); // { scheduledId, text?, sendAt? } (also retries failed)
export const useCancelScheduled = () => useScheduledMutation(cancelScheduled); // (scheduledId)

export const useSendScheduledNow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: sendScheduledNow, // (scheduledId)
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["chat", "scheduled"] });
      if (res?.message?.conversationId) upsertMessage(qc, res.message.conversationId, res.message);
    },
  });
};

// ---------------------------------------------------------------- 30 disappearing messages

// mutate({ id, seconds }) seconds: 0 | 86400 | 604800 | 7776000   (applies to NEW messages only)
export const DISAPPEARING_OPTIONS = [
  { label: "Off", seconds: 0 },
  { label: "24 hours", seconds: 86400 },
  { label: "7 days", seconds: 604800 },
  { label: "90 days", seconds: 7776000 },
];

export const useSetDisappearing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setDisappearing,
    onSuccess: (res, { id, seconds }) => {
      const v = res?.disappearingSeconds ?? seconds;
      patchConvEverywhere(qc, id, { disappearingSeconds: v });
      qc.invalidateQueries({ queryKey: CHAT_KEYS.messages(id) }); // system line "X turned on disappearing messages"
    },
  });
};

// ---------------------------------------------------------------- 31 media / docs / links tabs

export const useMediaSummary = (conversationId, enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.mediaSummary(conversationId),
    queryFn: () => getMediaSummary(conversationId),
    enabled: enabled && !!conversationId,
    staleTime: 30000,
    select: (d) => d.counts, // { media, docs, audio, links }
  });

// tab: "media" | "docs" | "audio" | "links"
export const useChatMedia = (conversationId, tab = "media", enabled = true) => {
  const query = useInfiniteQuery({
    queryKey: CHAT_KEYS.media(conversationId, tab),
    queryFn: ({ pageParam }) => getMedia({ id: conversationId, tab, before: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: enabled && !!conversationId,
    staleTime: 30000,
  });
  const items = useMemo(() => (query.data ? query.data.pages.flatMap((p) => p.items) : []), [query.data]);
  return { ...query, items, loadMore: query.fetchNextPage, hasMore: !!query.hasNextPage };
};

// ---------------------------------------------------------------- 32 drafts

export const useDraft = (conversationId, enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.draft(conversationId),
    queryFn: () => getDraft(conversationId),
    enabled: enabled && !!conversationId,
    staleTime: 60000,
    select: (d) => d.draft, // { text, replyTo, updatedAt } | null
  });

// Composer: call save(text, replyTo) on every keystroke - it is debounced (500 ms) and flushed on unmount / chat switch.
//   const { save, flush } = useDraftSaver(conversationId)
export const useDraftSaver = (conversationId, delay = 500) => {
  const qc = useQueryClient();
  const timer = useRef(null);
  const pending = useRef(null);
  const last = useRef(null);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    if (last.current === p.text) return;
    last.current = p.text;
    saveDraft({ id: p.id, text: p.text, replyTo: p.replyTo })
      .then(() => {
        const draft = p.text.trim() ? { text: p.text, replyTo: p.replyTo || null, updatedAt: new Date().toISOString() } : null;
        patchConversation(qc, p.id, (c) => ({ ...c, draft }));
      })
      .catch(() => {}); // drafts are best-effort
  }, [qc]);

  const save = useCallback(
    (text, replyTo) => {
      if (!conversationId) return;
      pending.current = { id: conversationId, text: text || "", replyTo };
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [conversationId, delay, flush],
  );

  useEffect(() => {
    last.current = null;
    return flush; // switching chats / unmounting saves what was typed
  }, [conversationId, flush]);
  return { save, flush };
};

// ---------------------------------------------------------------- 34 group admin controls + invite link

export const GROUP_SETTING_KEYS = ["onlyAdminsCanSend", "onlyAdminsCanEditInfo", "onlyAdminsCanAddMembers", "onlyAdminsCanPin"];

// mutate({ id, settings: { onlyAdminsCanSend: true, ... } }) - admins only
export const useUpdateGroupSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateGroupSettings,
    onMutate: ({ id, settings }) => {
      const prev = qc.getQueryData(CHAT_KEYS.conversation(id));
      patchConvEverywhere(qc, id, { settings: { ...(prev?.conversation?.settings || {}), ...settings } });
      return { prev };
    },
    onError: (_e, { id }, ctx) => ctx?.prev && qc.setQueryData(CHAT_KEYS.conversation(id), ctx.prev),
    onSettled: (_r, _e, { id }) => {
      qc.invalidateQueries({ queryKey: CHAT_KEYS.conversation(id) });
      qc.invalidateQueries({ queryKey: CHAT_KEYS.messages(id) }); // system lines for each change
    },
  });
};

// Admins get { enabled, code, link }; members only { enabled }
export const useGroupInvite = (conversationId, enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.invite(conversationId),
    queryFn: () => getGroupInvite(conversationId),
    enabled: enabled && !!conversationId,
    staleTime: 30000,
    select: (d) => d.invite,
  });

const useInviteMutation = (fn) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res, id) => {
      qc.setQueryData(CHAT_KEYS.invite(id), res);
      qc.invalidateQueries({ queryKey: CHAT_KEYS.conversation(id) });
    },
  });
};
export const useCreateGroupInvite = () => useInviteMutation(createGroupInvite); // (conversationId) creates OR resets (old link dies)
export const useDisableGroupInvite = () => useInviteMutation(disableGroupInvite); // (conversationId)

// Join screen at /chat/join/:code  ->  const { data } = useInvitePreview(code)  then  join.mutate(code)
export const useInvitePreview = (code, enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.invitePreview(code),
    queryFn: () => previewInvite(code),
    enabled: enabled && !!code,
    retry: false,
    select: (d) => d.group, // { name, photo, memberCount, alreadyMember, full }
  });

export const useJoinByInvite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: joinByInvite, // (code) -> { conversation, ... }
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations });
      qc.invalidateQueries({ queryKey: CHAT_KEYS.counts });
    },
  });
};
