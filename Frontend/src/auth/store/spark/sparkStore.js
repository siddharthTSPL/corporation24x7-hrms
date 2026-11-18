import { create } from "zustand";

// UI state for the TorchX Spark frame that lives inside Talent.
// Spark itself runs as a separate app (/spark) inside an <iframe>; this store
// tracks whether the frame is open / expanded, the unread badge count, the
// ringing calls Spark reports (shown by <GlobalIncomingCall/>, outside the
// chat), and a one-shot command queue Talent uses to tell Spark what to do
// (open a conversation, accept / decline a call).
let commandSeq = 0;

export const useSparkStore = create((set) => ({
  open: false,
  expanded: false,
  unread: null, // null = Spark hasn't reported yet
  incoming: [], // [{ roomKey, kind, media, conversationName, from: { key, name, photo } }]
  inCall: false, // Spark reports whether the user is already on a call
  command: null, // { id, type, ...payload } - delivered to the iframe by SparkFrame

  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
  togglePanel: () => set((s) => ({ open: !s.open })),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
  setUnread: (unread) => set({ unread }),

  setIncoming: (incoming, inCall = false) =>
    set((s) => {
      const seen = new Set();
      const list = (Array.isArray(incoming) ? incoming : []).filter((c) => {
        if (!c || !c.roomKey || seen.has(c.roomKey)) return false;
        seen.add(c.roomKey);
        return true;
      });
      const same =
        s.inCall === !!inCall &&
        s.incoming.length === list.length &&
        s.incoming.every((c, i) => c.roomKey === list[i].roomKey);
      return same ? s : { incoming: list, inCall: !!inCall };
    }),
  dropIncoming: (roomKey) => set((s) => ({ incoming: s.incoming.filter((c) => c.roomKey !== roomKey) })),

  // Ask Spark to do something. `open` (default true) also shows the dock.
  sendCommand: (cmd, { open = true } = {}) =>
    set((s) => ({
      command: { ...cmd, id: ++commandSeq },
      ...(open ? { open: true } : {}),
      expanded: s.expanded,
    })),
  clearCommand: (id) => set((s) => (s.command && s.command.id === id ? { command: null } : s)),

  reset: () => set({ open: false, expanded: false, unread: null, incoming: [], inCall: false, command: null }),
}));
