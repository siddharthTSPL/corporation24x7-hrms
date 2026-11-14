import { create } from "zustand";

// UI state for the TorchX Spark frame that lives inside Talent.
// Spark itself runs as a separate app (/spark) inside an <iframe>; this store
// only tracks whether the frame is open / expanded and the unread badge count
// that Spark reports back through postMessage.
export const useSparkStore = create((set) => ({
  open: false,
  expanded: false,
  unread: null, // null = Spark hasn't reported yet

  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
  togglePanel: () => set((s) => ({ open: !s.open })),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),
  setUnread: (unread) => set({ unread }),
  reset: () => set({ open: false, expanded: false, unread: null }),
}));
