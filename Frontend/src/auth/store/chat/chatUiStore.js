import { create } from "zustand";
import { useChatStore } from "./chatStore";

export const useChatUiStore = create((set) => ({
  open: false,
  expanded: false,
  selectedId: null,
  newChatOpen: false,
  infoOpen: false,
  soundSettingsOpen: false,

  togglePanel: () => set((s) => ({ open: !s.open, newChatOpen: false, infoOpen: false, soundSettingsOpen: false })),
  closePanel: () => set({ open: false, newChatOpen: false, infoOpen: false, soundSettingsOpen: false }),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),

  openConversation: (id) => {
    useChatStore.getState().setActiveConversation(id);
    set({ open: true, selectedId: id, newChatOpen: false, infoOpen: false, soundSettingsOpen: false });
  },
  backToList: () => {
    useChatStore.getState().setActiveConversation(null);
    set({ selectedId: null, infoOpen: false, soundSettingsOpen: false });
  },

  setNewChatOpen: (newChatOpen) => set({ newChatOpen, ...(newChatOpen ? { infoOpen: false, soundSettingsOpen: false } : {}) }),
  setInfoOpen: (infoOpen) => set({ infoOpen, ...(infoOpen ? { newChatOpen: false, soundSettingsOpen: false } : {}) }),
  setSoundSettingsOpen: (soundSettingsOpen) => set({ soundSettingsOpen, ...(soundSettingsOpen ? { newChatOpen: false, infoOpen: false } : {}) }),
  reset: () => set({ open: false, expanded: false, selectedId: null, newChatOpen: false, infoOpen: false, soundSettingsOpen: false }),
}));
