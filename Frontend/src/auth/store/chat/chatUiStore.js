import { create } from "zustand";
import { useChatStore } from "./chatStore";

export const useChatUiStore = create((set) => ({
  open: false,
  expanded: false,
  selectedId: null,
  newChatOpen: false,
  infoOpen: false,

  togglePanel: () => set((s) => ({ open: !s.open, newChatOpen: false, infoOpen: false })),
  closePanel: () => set({ open: false, newChatOpen: false, infoOpen: false }),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),

  openConversation: (id) => {
    useChatStore.getState().setActiveConversation(id);
    set({ open: true, selectedId: id, newChatOpen: false, infoOpen: false });
  },
  backToList: () => {
    useChatStore.getState().setActiveConversation(null);
    set({ selectedId: null, infoOpen: false });
  },

  setNewChatOpen: (newChatOpen) => set({ newChatOpen }),
  setInfoOpen: (infoOpen) => set({ infoOpen }),
  reset: () => set({ open: false, expanded: false, selectedId: null, newChatOpen: false, infoOpen: false }),
}));
