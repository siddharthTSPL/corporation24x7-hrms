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
};

// Messages are cached as an infinite query: pages[0] is the NEWEST page, later
// pages are older; inside a page messages run oldest -> newest.
export const flattenMessages = (data) =>
  data ? data.pages.slice().reverse().flatMap((p) => p.messages) : [];

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
  qc.setQueryData(CHAT_KEYS.conversations, (old) => {
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
  qc.setQueryData(CHAT_KEYS.conversations, (old) => {
    if (!old) return old;
    const i = old.conversations.findIndex((c) => c.id === conversationId);
    if (i <= 0) return old;
    const list = old.conversations.slice();
    const [c] = list.splice(i, 1);
    return { ...old, conversations: [c, ...list] };
  });

export const removeConversation = (qc, conversationId) => {
  qc.setQueryData(CHAT_KEYS.conversations, (old) =>
    old ? { ...old, conversations: old.conversations.filter((c) => c.id !== conversationId) } : old,
  );
  qc.removeQueries({ queryKey: CHAT_KEYS.conversation(conversationId) });
  qc.removeQueries({ queryKey: CHAT_KEYS.messages(conversationId) });
};

export const newClientId = () =>
  `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
