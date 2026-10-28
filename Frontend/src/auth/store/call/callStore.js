import { create } from "zustand";

// Live call state. Written ONLY by src/realtime/webrtc/callManager.js;
// components read it through the useCall() hook.
//
// active = {
//   roomKey, callId, kind: "direct"|"group"|"meeting", media: "audio"|"video", title,
//   conversationId, meetingId, hostKeys: [], mySocketId, status: "connecting"|"ringing"|"connected",
//   startedAt, localStream, screenStream, audio, video, screen,
//   presenterSocketId,
//   peers: { [socketId]: { socketId, key, name, photo, audio, video, screen,
//                          stream, screenStream, connectionState } }
// }
const initial = {
  incoming: [], // [{ callId, roomKey, kind, media, conversationId, conversationName, from, expiresAt }]
  active: null,
  waiting: null, // { meetingId, roomKey, code, startsAt } - waiting for host / early
  lastEnded: null, // { roomKey, reason, status, durationSec } - lets the UI show "Call ended"
  error: null,
};

export const useCallStore = create((set) => ({
  ...initial,

  addIncoming: (call) =>
    set((s) => ({
      incoming: s.incoming.some((c) => c.roomKey === call.roomKey) ? s.incoming : [...s.incoming, call],
    })),
  removeIncoming: (roomKey) => set((s) => ({ incoming: s.incoming.filter((c) => c.roomKey !== roomKey) })),

  setActive: (active) => set({ active }),
  patchActive: (patch) => set((s) => (s.active ? { active: { ...s.active, ...patch } } : s)),
  patchPeer: (socketId, patch) =>
    set((s) => {
      if (!s.active) return s;
      const prev = s.active.peers[socketId] || { socketId };
      return { active: { ...s.active, peers: { ...s.active.peers, [socketId]: { ...prev, ...patch } } } };
    }),
  removePeer: (socketId) =>
    set((s) => {
      if (!s.active) return s;
      const { [socketId]: _gone, ...rest } = s.active.peers;
      return { active: { ...s.active, peers: rest } };
    }),

  setWaiting: (waiting) => set({ waiting }),
  setLastEnded: (lastEnded) => set({ lastEnded }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  reset: () => set({ ...initial }),
}));
