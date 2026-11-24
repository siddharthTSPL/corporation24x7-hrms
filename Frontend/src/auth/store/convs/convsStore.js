import { create } from "zustand";

// UI state for the TorchX Convs frame that lives inside Talent.
// Convs itself runs as a separate app (/convs) inside an <iframe>; this store
// tracks whether the frame is open / expanded, the unread badge count, the
// ringing calls Convs reports (shown by <GlobalIncomingCall/>, outside the
// chat), and a one-shot command queue Talent uses to tell Convs what to do
// (open a conversation, accept / decline a call).
let commandSeq = 0;

export const useConvsStore = create((set) => ({
  open: false,
  expanded: false,
  unread: null, // null = Convs hasn't reported yet
  incoming: [], // [{ roomKey, kind, media, conversationName, from: { key, name, photo } }]
  inCall: false, // Convs reports whether the user is already on a call
  command: null, // { id, type, ...payload } - delivered to the iframe by ConvsFrame

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

  // Ask Convs to do something. `open` (default true) also shows the dock.
  sendCommand: (cmd, { open = true } = {}) =>
    set((s) => ({
      command: { ...cmd, id: ++commandSeq },
      ...(open ? { open: true } : {}),
      expanded: s.expanded,
    })),
  clearCommand: (id) => set((s) => (s.command && s.command.id === id ? { command: null } : s)),

  reset: () => set({ open: false, expanded: false, unread: null, incoming: [], inCall: false, command: null }),
}));
