import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  searchDirectory,
  getConversations,
  getConversation,
  openDirectChat,
  createGroupChat,
  updateGroupChat,
  addGroupMembers,
  removeGroupMember,
  setGroupMemberRole,
  leaveGroupChat,
  muteConversation,
  markConversationRead,
  getMessages,
  sendMessageRest,
  editMessage,
  deleteMessage,
  searchMessages,
  getChatUnreadCount,
  getIceServers,
  getActiveCalls,
  getCallHistory,
} from "../../api/chat/chat.api";
import { emitAck, emitQuiet } from "../../../realtime/chatSocket";
import { useChatStore } from "../../store/chat/chatStore";
import {
  CHAT_KEYS,
  flattenMessages,
  upsertMessage,
  patchMessage,
  patchConversation,
  removeConversation,
  newClientId,
} from "./chatCache";

export { CHAT_KEYS };

// ---------------------------------------------------------------- utilities

export const useDebouncedValue = (value, delay = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

// ---------------------------------------------------------------- directory

// Search everyone in my organisation. Pass the raw input; it is debounced here.
export const useDirectorySearch = (query = "", { department = "", enabled = true } = {}) => {
  const q = useDebouncedValue(query.trim(), 250);
  return useQuery({
    queryKey: CHAT_KEYS.directory(q, department),
    queryFn: () => searchDirectory({ q, department, limit: 30 }),
    enabled,
    staleTime: 30000,
    placeholderData: keepPreviousData,
    select: (d) => d.people,
  });
};

// ---------------------------------------------------------------- conversations

export const useConversations = (enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.conversations,
    queryFn: () => getConversations({ limit: 100 }),
    enabled,
    staleTime: 15000,
    refetchOnWindowFocus: true,
    select: (d) => d.conversations,
  });

export const useConversation = (id) =>
  useQuery({
    queryKey: CHAT_KEYS.conversation(id),
    queryFn: () => getConversation(id),
    enabled: !!id,
    staleTime: 15000,
    select: (d) => d.conversation,
  });

// mutate(participant) with participant = { model, id }. Resolves { conversation }.
export const useOpenDirectChat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: openDirectChat,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations }),
  });
};

// mutate({ name, description?, members: [{model,id}] })
export const useCreateGroupChat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGroupChat,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations }),
  });
};

const useGroupMutation = (fn) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations });
      qc.invalidateQueries({ queryKey: CHAT_KEYS.conversation(vars.id) });
      qc.invalidateQueries({ queryKey: CHAT_KEYS.messages(vars.id) }); // "X added Y" system lines
    },
  });
};
export const useUpdateGroupChat = () => useGroupMutation(updateGroupChat); // { id, name?, description? }
export const useAddGroupMembers = () => useGroupMutation(addGroupMembers); // { id, members }
export const useRemoveGroupMember = () => useGroupMutation(removeGroupMember); // { id, key }
export const useSetGroupMemberRole = () => useGroupMutation(setGroupMemberRole); // { id, key, role }

export const useLeaveGroupChat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leaveGroupChat, // (conversationId)
    onSuccess: (_r, id) => removeConversation(qc, id),
  });
};

export const useMuteConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: muteConversation, // { id, muted }
    onMutate: ({ id, muted }) => patchConversation(qc, id, (c) => ({ ...c, muted })),
    onError: () => qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations }),
  });
};

// Call when a chat is opened / a new message arrives while it's visible.
export const useMarkConversationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      try {
        await emitAck("chat:read", { conversationId: id }, 5000);
      } catch {
        await markConversationRead(id); // socket down -> REST
      }
    },
    onMutate: (id) => {
      patchConversation(qc, id, (c) => ({ ...c, unread: 0 }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAT_KEYS.unread }),
  });
};

export const useChatUnreadCount = (enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.unread,
    queryFn: getChatUnreadCount, // { unread, unreadChats }
    enabled,
    staleTime: 10000,
    refetchInterval: enabled ? 120000 : false, // live updates come via socket; this is the fallback
  });

// ---------------------------------------------------------------- messages

// Returns { messages (oldest->newest), loadOlder, hasOlder, isLoadingOlder, ...query }
export const useChatMessages = (conversationId) => {
  const q = useInfiniteQuery({
    queryKey: CHAT_KEYS.messages(conversationId),
    queryFn: ({ pageParam }) => getMessages({ id: conversationId, before: pageParam, limit: 40 }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: !!conversationId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  const messages = useMemo(() => flattenMessages(q.data), [q.data]);
  return {
    ...q,
    messages,
    loadOlder: q.fetchNextPage,
    hasOlder: !!q.hasNextPage,
    isLoadingOlder: q.isFetchingNextPage,
  };
};

/**
 * send({ conversationId, text, replyTo?, files? })
 * - plain text goes over the socket (fastest), falling back to REST if offline
 * - files always go over REST (multipart)
 * - the message shows instantly as { pending: true } and is replaced when the server confirms;
 *   on failure it stays with { failed: true } so the UI can offer "retry"
 * - a clientId makes retries safe: the server never stores the same message twice
 */
export const useSendMessage = () => {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ conversationId, text, replyTo, files = [], clientId, onUploadProgress }) => {
      if (!files.length) {
        try {
          const res = await emitAck("chat:send", { conversationId, text, replyTo, clientId });
          return res.message;
        } catch (err) {
          if (err.code !== "OFFLINE" && err.code !== "TIMEOUT") throw err;
        }
      }
      const res = await sendMessageRest({ id: conversationId, text, replyTo, clientId, files, onUploadProgress });
      return res.message;
    },
    onMutate: ({ conversationId, text, replyTo, files = [], clientId }) => {
      const myKey = useChatStore.getState().myKey;
      upsertMessage(qc, conversationId, {
        id: clientId,
        clientId,
        conversationId,
        type: files.length ? "file" : "text",
        senderKey: myKey || "",
        sender: null,
        text: text || "",
        attachments: files.map((f) => ({ name: f.name, size: f.size, mime: f.type, url: null, uploading: true })),
        replyTo: replyTo ? { id: replyTo } : null,
        meta: {},
        createdAt: new Date().toISOString(),
        pending: true,
      });
    },
    onSuccess: (message, vars) => upsertMessage(qc, vars.conversationId, message),
    onError: (_e, vars) => patchMessage(qc, vars.conversationId, vars.clientId, { pending: false, failed: true }),
  });

  const send = useCallback(
    (vars) => mutation.mutateAsync({ ...vars, clientId: vars.clientId || newClientId() }),
    [mutation],
  );
  return { send, isSending: mutation.isPending, error: mutation.error };
};

export const useEditMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: editMessage, // { messageId, text }
    onSuccess: ({ message }) => upsertMessage(qc, message.conversationId, message),
  });
};

export const useDeleteMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMessage, // (messageId)
    onSuccess: ({ conversationId, messageId }) =>
      patchMessage(qc, conversationId, messageId, { deleted: true, text: "", attachments: [] }),
  });
};

// Message search. Pass conversationId to search inside one chat.
export const useChatSearch = (query = "", conversationId) => {
  const q = useDebouncedValue(query.trim(), 350);
  return useQuery({
    queryKey: CHAT_KEYS.search(q, conversationId),
    queryFn: () => searchMessages({ q, conversationId }),
    enabled: q.length >= 2,
    staleTime: 30000,
    select: (d) => d.results,
  });
};

// ---------------------------------------------------------------- typing + presence

// Typing indicator for the composer:
//   const { onType, stopTyping } = useTypingEmitter(conversationId)
//   <input onChange={(e)=>{ setText(e.target.value); onType(); }} onBlur={stopTyping} />
export const useTypingEmitter = (conversationId) => {
  const lastSent = useRef(0);
  const idleTimer = useRef(null);

  const stopTyping = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (lastSent.current) {
      emitQuiet("chat:typing", { conversationId, isTyping: false });
      lastSent.current = 0;
    }
  }, [conversationId]);

  const onType = useCallback(() => {
    if (!conversationId) return;
    const now = Date.now();
    if (now - lastSent.current > 2500) {
      emitQuiet("chat:typing", { conversationId, isTyping: true });
      lastSent.current = now;
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, 3000);
  }, [conversationId, stopTyping]);

  useEffect(() => stopTyping, [stopTyping]);
  return { onType, stopTyping };
};

// Names of people currently typing in a conversation (excluding me).
export const useTypingNames = (conversationId) => {
  const room = useChatStore((s) => s.typing[conversationId]);
  const pruneTyping = useChatStore((s) => s.pruneTyping);
  useEffect(() => {
    if (!room || !Object.keys(room).length) return undefined;
    const t = setInterval(pruneTyping, 1500);
    return () => clearInterval(t);
  }, [room, pruneTyping]);
  return useMemo(() => Object.values(room || {}).map((v) => v.name), [room]);
};

// Live online state for a person key; falls back to what the API last said.
export const useIsOnline = (key, fallback = false) =>
  useChatStore((s) => (key && s.presence[key] ? s.presence[key].online : fallback));

export const useLastSeen = (key) => useChatStore((s) => (key ? s.presence[key]?.lastSeenAt || null : null));

// ---------------------------------------------------------------- calls (REST side)

export const useIceServers = (enabled = true) =>
  useQuery({ queryKey: ["chat", "ice"], queryFn: getIceServers, enabled, staleTime: 60 * 60 * 1000 });

export const useActiveCalls = (enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.activeCalls,
    queryFn: getActiveCalls,
    enabled,
    staleTime: 5000,
    select: (d) => d.calls,
  });

export const useCallHistory = (enabled = true) =>
  useQuery({
    queryKey: CHAT_KEYS.callHistory,
    queryFn: () => getCallHistory({ limit: 50 }),
    enabled,
    staleTime: 15000,
    select: (d) => d.calls,
  });
