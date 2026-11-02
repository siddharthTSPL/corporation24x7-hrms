// Pure helpers that patch the React Query cache when a socket event arrives,
// so the UI updates instantly without refetching whole lists.

export const CHAT_KEYS = {
  all: ["chat"],
  conversations: ["chat", "conversations"],
  conversation: (id) => ["chat", "conversation", id],
  messages: (id) => ["chat", "messages", id],
  directory: (q, dept) => ["chat", "directory", q || "", dept || ""],
  unread: ["chat", "unread"],
  search: (q, cid) => ["chat", "search", q, cid || ""],
  callHistory: ["chat", "calls", "history"],
  activeCalls: ["chat", "calls", "active"],
  // features 21-34
  counts: ["chat", "counts"],
  starred: (cid, q) => ["chat", "starred", cid || "", q || ""],
  pinned: (id) => ["chat", "pinned", id],
  mentionable: (id, q) => ["chat", "mentionable", id, q || ""],
  mentions: (id) => ["chat", "mentions", id],
  messageInfo: (id) => ["chat", "messageInfo", id],
  poll: (id) => ["chat", "poll", id],
  linkPreview: (url) => ["chat", "linkPreview", url],
  scheduled: (cid) => ["chat", "scheduled", cid || ""],
  mediaSummary: (id) => ["chat", "mediaSummary", id],
  media: (id, tab) => ["chat", "media", id, tab],
  draft: (id) => ["chat", "draft", id],
  invite: (id) => ["chat", "invite", id],
  invitePreview: (code) => ["chat", "invitePreview", code],
};

// Messages are cached as an infinite query: pages[0] is the NEWEST page, later
// pages are older; inside a page messages run oldest -> newest.
export const flattenMessages = (data) => {
  if (!data) return [];
  const now = Date.now();
  // disappearing messages: hide anything past expiresAt even before the server's 30 s sweep / socket event arrives
  return data.pages.slice().reverse().flatMap((p) => p.messages).filter((m) => !m.expiresAt || new Date(m.expiresAt).getTime() > now);
};

const mapPages = (old, fn) => (old ? { ...old, pages: old.pages.map((p) => ({ ...p, messages: fn(p.messages) })) } : old);

// Insert a new message, or replace an existing one (same id, or same clientId =
// my optimistic copy). Duplicates from socket + REST can never appear twice.
export const upsertMessage = (qc, conversationId, message) => {
  qc.setQueryData(CHAT_KEYS.messages(conversationId), (old) => {
    if (!old) return old;
    const same = (m) => m.id === message.id || (message.clientId && m.clientId === message.clientId);
    if (old.pages.some((p) => p.messages.some(same))) return mapPages(old, (msgs) => msgs.map((m) => (same(m) ? message : m)));
    const pages = old.pages.slice();
    pages[0] = { ...pages[0], messages: [...pages[0].messages, message] };
    return { ...old, pages };
  });
};

export const patchMessage = (qc, conversationId, messageId, patch) =>
  qc.setQueryData(CHAT_KEYS.messages(conversationId), (old) =>
    mapPages(old, (msgs) => msgs.map((m) => (m.id === messageId ? { ...m, ...patch } : m))),
  );

// "Delete for me": the message just vanishes from my own list.
export const removeMessage = (qc, conversationId, messageId) =>
  qc.setQueryData(CHAT_KEYS.messages(conversationId), (old) => mapPages(old, (msgs) => msgs.filter((m) => m.id !== messageId)));

// Someone's device received these messages -> grey double tick for the sender.
export const addDelivered = (qc, conversationId, messageIds, byKey) => {
  const ids = new Set(messageIds);
  qc.setQueryData(CHAT_KEYS.messages(conversationId), (old) =>
    mapPages(old, (msgs) =>
      msgs.map((m) => (ids.has(m.id) && !(m.deliveredTo || []).includes(byKey) ? { ...m, deliveredTo: [...(m.deliveredTo || []), byKey] } : m)),
    ),
  );
};

export const markMessageDeleted = (qc, conversationId, messageId) =>
  patchMessage(qc, conversationId, messageId, { deleted: true, text: "", attachments: [], reactions: [] });

// Patch one conversation inside the cached list; returns false if it isn't there.
export const patchConversation = (qc, conversationId, updater) => {
  let found = false;
  // setQueriesData -> patches the default list AND every filter / archived variant
  qc.setQueriesData({ queryKey: CHAT_KEYS.conversations }, (old) => {
    if (!old?.conversations) return old;
    if (!old) return old;
    const list = old.conversations.map((c) => {
      if (c.id !== conversationId) return c;
      found = true;
      return updater(c);
    });
    return { ...old, conversations: list };
  });
  return found;
};

// Move a conversation to the top (newest activity first).
export const bumpConversationToTop = (qc, conversationId) =>
  qc.setQueriesData({ queryKey: CHAT_KEYS.conversations }, (old) => {
    if (!old?.conversations) return old;
    const i = old.conversations.findIndex((c) => c.id === conversationId);
    if (i <= 0) return old;
    const list = old.conversations.slice();
    const [c] = list.splice(i, 1);
    return { ...old, conversations: [c, ...list] };
  });

export const removeConversation = (qc, conversationId) => {
  qc.setQueriesData({ queryKey: CHAT_KEYS.conversations }, (old) =>
    old?.conversations ? { ...old, conversations: old.conversations.filter((c) => c.id !== conversationId) } : old,
  );
  qc.removeQueries({ queryKey: CHAT_KEYS.conversation(conversationId) });
  qc.removeQueries({ queryKey: CHAT_KEYS.messages(conversationId) });
};

const sentClientIds = new Set();

export const registerSent = (clientId) => {
  if (clientId) sentClientIds.add(clientId);
  return clientId;
};

export const isMineMessage = (m, myKey) => {
  if (!m) return false;
  if (m.pending || m.failed) return true;
  if (m.clientId && sentClientIds.has(m.clientId)) return true;
  return !!m.senderKey && !!myKey && m.senderKey === myKey;
};

export const newClientId = () =>
  registerSent(`c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`);

// ---------------------------------------------------------------- features 21-34 socket helpers
// Call these from the socket listeners (realtime/chatSocket).

// chat:message:expired { conversationId, messageIds } -> disappearing messages vanish
export const removeMessages = (qc, conversationId, messageIds) => {
  const ids = new Set(messageIds || []);
  qc.setQueryData(CHAT_KEYS.messages(conversationId), (old) => mapPages(old, (msgs) => msgs.filter((m) => !ids.has(m.id))));
};

// chat:pinned:updated { conversationId } -> refetch the pinned bar
export const refreshPinned = (qc, conversationId) => qc.invalidateQueries({ queryKey: CHAT_KEYS.pinned(conversationId) });

// chat:draft { conversationId, draft } -> keep drafts in sync across my devices
export const setConversationDraft = (qc, conversationId, draft) => {
  patchConversation(qc, conversationId, (c) => ({ ...c, draft: draft || null }));
  qc.setQueryData(CHAT_KEYS.conversation(conversationId), (old) => (old ? { ...old, conversation: { ...old.conversation, draft: draft || null } } : old));
  qc.setQueryData(CHAT_KEYS.draft(conversationId), { draft: draft || null });
};

// chat:mention -> bump the "@" badge and the Mentions chip count
export const addMention = (qc, conversationId) => {
  patchConversation(qc, conversationId, (c) => ({ ...c, unreadMentions: (c.unreadMentions || 0) + 1 }));
  qc.invalidateQueries({ queryKey: CHAT_KEYS.counts });
};

// chat:scheduled:sent / chat:scheduled:failed -> refresh the "Scheduled" list
export const refreshScheduled = (qc) => qc.invalidateQueries({ queryKey: ["chat", "scheduled"] });

// chat:message:starred { messageId, starred } -> keep the star icon + Starred screen in sync
export const setStarredFlag = (qc, conversationId, messageId, starred) => {
  if (conversationId) patchMessage(qc, conversationId, messageId, { starred: !!starred });
  qc.invalidateQueries({ queryKey: ["chat", "starred"] });
};
