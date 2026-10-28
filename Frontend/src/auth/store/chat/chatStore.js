import { create } from "zustand";

// Client-only chat state that doesn't belong in React Query:
//  - who I am (from the socket handshake), which chat is open
//  - live presence + typing indicators (they expire, they're never fetched)
export const useChatStore = create((set, get) => ({
  myKey: null, // "User:<id>" - set when the socket reports ready
  activeConversationId: null,
  presence: {}, // key -> { online, lastSeenAt, inCall }
  typing: {}, // conversationId -> { [key]: { name, until } }

  setMyKey: (myKey) => set({ myKey }),
  setActiveConversation: (id) => set({ activeConversationId: id }),

  // inCall === undefined keeps whatever we already knew
  setPresence: (key, online, lastSeenAt = null, inCall) =>
    set((s) => ({
      presence: { ...s.presence, [key]: { online, lastSeenAt, inCall: inCall === undefined ? !!s.presence[key]?.inCall : !!inCall } },
    })),
  setPresenceMany: (list) =>
    set((s) => {
      const next = { ...s.presence };
      for (const p of list || []) next[p.key] = { online: p.online, lastSeenAt: p.lastSeenAt || null, inCall: !!p.inCall };
      return { presence: next };
    }),

  setTyping: (conversationId, key, name, isTyping) =>
    set((s) => {
      const room = { ...(s.typing[conversationId] || {}) };
      if (isTyping) room[key] = { name, until: Date.now() + 5000 };
      else delete room[key];
      return { typing: { ...s.typing, [conversationId]: room } };
    }),
  pruneTyping: () => {
    const now = Date.now();
    const cur = get().typing;
    let changed = false;
    const next = {};
    for (const [cid, room] of Object.entries(cur)) {
      const kept = Object.fromEntries(Object.entries(room).filter(([, v]) => v.until > now));
      if (Object.keys(kept).length !== Object.keys(room).length) changed = true;
      next[cid] = kept;
    }
    if (changed) set({ typing: next });
  },

  reset: () => set({ myKey: null, activeConversationId: null, presence: {}, typing: {} }),
}));
