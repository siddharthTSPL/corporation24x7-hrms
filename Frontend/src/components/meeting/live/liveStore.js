import { create } from "zustand";

// Everything the live tools show that the call store does not already hold.
// Written by useLiveBridge (socket events + local audio detection), read by the panels.
const fresh = () => ({
  speaking: {}, // { [key]: true } - key = person key (or socketId for guests)
  talk: {}, // { [key]: seconds spoken in this meeting }
  spotlightKey: null,
  captions: [], // [{ id, key, name, text, final, at }] newest last, kept short
  recording: { on: false, by: "", since: null },
  flags: {},
  board: { strokes: [], viewOnly: false, loaded: false },
  timer: { label: "", durationSec: 0, endsAt: null, remainingSec: 0, running: false },
  agenda: { items: [], currentId: null },
  pulse: null, // { id, question, scale, open, votes: {1:n..}, total, mine }
  wheel: null, // { id, names: [], winner, at }
  decisions: [],
  kudosFeed: [],
});

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const who = (p = {}) => p.key || p.socketId || p.by || "";

const normalizeTimer = (p = {}, prev) => {
  const durationSec = num(p.durationSec ?? p.duration ?? (p.durationMin ? p.durationMin * 60 : undefined), prev.durationSec);
  const running = p.running ?? (p.status ? p.status === "running" : prev.running);
  const remainingSec = num(p.remainingSec ?? p.remaining, running ? 0 : durationSec);
  const endsAt = p.endsAt ? new Date(p.endsAt).getTime() : running ? Date.now() + remainingSec * 1000 : null;
  return { label: p.label ?? p.title ?? prev.label, durationSec, running: !!running, remainingSec, endsAt };
};

const normalizeAgenda = (p = {}, prev) => {
  const list = p.items || p.agenda || prev.items;
  const items = (list || []).map((it, i) => (typeof it === "string" ? { id: String(i), title: it } : { id: String(it.id ?? it._id ?? i), title: it.title || it.text || "", minutes: it.minutes, done: !!it.done }));
  let currentId = p.currentId ?? (p.currentIndex != null ? items[p.currentIndex]?.id : undefined) ?? prev.currentId;
  if (currentId != null) currentId = String(currentId);
  return { items, currentId };
};

const normalizePulse = (p = {}, prev) => {
  const id = String(p.id ?? p.pulseId ?? prev?.id ?? "");
  const raw = p.votes ?? p.results ?? p.counts ?? prev?.votes ?? {};
  const votes = Array.isArray(raw) ? raw.reduce((a, v, i) => ({ ...a, [i + 1]: num(v) }), {}) : { ...raw };
  const total = num(p.total ?? p.count, Object.values(votes).reduce((a, b) => a + num(b), 0));
  return {
    id,
    question: p.question ?? prev?.question ?? "How is this going?",
    scale: num(p.scale, prev?.scale || 5),
    open: p.open ?? (p.status ? p.status === "open" : prev?.open ?? true),
    votes,
    total,
    mine: prev?.id === id ? prev.mine : null,
  };
};

export const useLiveStore = create((set, get) => ({
  ...fresh(),
  reset: () => set(fresh()),

  setSpeaking: (key, on) =>
    set((s) => {
      if (!key || !!s.speaking[key] === !!on) return s;
      const speaking = { ...s.speaking };
      if (on) speaking[key] = true;
      else delete speaking[key];
      return { speaking };
    }),
  tickTalk: () =>
    set((s) => {
      const keys = Object.keys(s.speaking);
      if (!keys.length) return s;
      const talk = { ...s.talk };
      keys.forEach((k) => (talk[k] = (talk[k] || 0) + 1));
      return { talk };
    }),

  setSpotlight: (key) => set({ spotlightKey: key || null }),

  addCaption: (c) =>
    set((s) => {
      const id = `${c.key}`;
      const list = s.captions.slice();
      const last = list[list.length - 1];
      // interim results replace the previous interim line from the same speaker
      if (last && last.key === id && !last.final) list[list.length - 1] = { ...last, ...c, key: id };
      else list.push({ ...c, key: id, id: `${id}-${Date.now()}` });
      return { captions: list.slice(-30) };
    }),
  clearCaptions: () => set({ captions: [] }),

  setRecording: (p = {}) => {
    const on = p.on ?? p.recording ?? p.active ?? p.status === "recording";
    set({ recording: { on: !!on, by: p.by || p.name || "", since: on ? num(p.since ?? p.startedAt, Date.now()) : null } });
  },
  setFlags: (p = {}) => set((s) => ({ flags: { ...s.flags, ...(p.flags || p) } })),

  boardLoad: (strokes) => set((s) => ({ board: { ...s.board, strokes: strokes || [], loaded: true } })),
  boardAdd: (stroke) =>
    set((s) => (s.board.strokes.some((x) => x.id === stroke.id) ? s : { board: { ...s.board, strokes: [...s.board.strokes, stroke] } })),
  boardRemove: (id) => set((s) => ({ board: { ...s.board, strokes: s.board.strokes.filter((x) => x.id !== id) } })),
  boardRemoveLastOf: (key) =>
    set((s) => {
      const idx = [...s.board.strokes].map((x) => x.key).lastIndexOf(key);
      if (idx < 0) return s;
      return { board: { ...s.board, strokes: s.board.strokes.filter((_, i) => i !== idx) } };
    }),
  boardClear: () => set((s) => ({ board: { ...s.board, strokes: [] } })),
  boardViewOnly: (viewOnly) => set((s) => ({ board: { ...s.board, viewOnly: !!viewOnly } })),

  timerApply: (p, mode) =>
    set((s) => {
      if (mode === "reset") return { timer: { ...s.timer, running: false, endsAt: null, remainingSec: s.timer.durationSec } };
      if (mode === "pause") {
        const left = s.timer.endsAt ? Math.max(0, Math.round((s.timer.endsAt - Date.now()) / 1000)) : s.timer.remainingSec;
        return { timer: { ...s.timer, running: false, endsAt: null, remainingSec: num(p?.remainingSec, left) } };
      }
      const next = normalizeTimer({ running: true, ...p }, s.timer);
      return { timer: next };
    }),
  agendaApply: (p) => set((s) => ({ agenda: normalizeAgenda(p, s.agenda) })),
  agendaNext: () =>
    set((s) => {
      const { items, currentId } = s.agenda;
      const i = items.findIndex((x) => x.id === currentId);
      const next = items[i + 1];
      return { agenda: { ...s.agenda, currentId: next ? next.id : currentId, items: items.map((x, j) => (j <= i ? { ...x, done: true } : x)) } };
    }),

  pulseApply: (p) => set((s) => ({ pulse: normalizePulse(p, s.pulse) })),
  pulseMine: (value) => set((s) => (s.pulse ? { pulse: { ...s.pulse, mine: value } } : s)),
  wheelApply: (p = {}) => {
    const names = (p.names || p.candidates || []).map((n) => (typeof n === "string" ? n : n.name));
    set({ wheel: { id: `${Date.now()}`, names, winner: p.winnerName || p.winner?.name || p.winner || "", winnerKey: p.winnerKey || p.winner?.key || "", at: Date.now() } });
  },
  decisionsSet: (list) => set({ decisions: list }),
  decisionApply: (p = {}) =>
    set((s) => {
      if (Array.isArray(p.decisions)) return { decisions: p.decisions };
      if (p.removedId) return { decisions: s.decisions.filter((d) => d.id !== p.removedId) };
      if (p.decision || p.text) {
        const d = p.decision || p;
        const id = String(d.id ?? d._id ?? `${Date.now()}`);
        if (s.decisions.some((x) => x.id === id)) return s;
        return { decisions: [...s.decisions, { id, text: d.text, by: d.byName || d.by || d.name || "", at: d.at || Date.now() }] };
      }
      return s;
    }),
  kudosPush: (k) => set((s) => ({ kudosFeed: [k, ...s.kudosFeed].slice(0, 30) })),
}));

export const speakerKey = who;
