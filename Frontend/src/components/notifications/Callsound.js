// Incoming-call ringtone + call/sound preferences.
//
// Why the old ringtone was silent: every ring created a brand-new AudioContext
// with no user gesture behind it, and browsers keep such a context "suspended"
// (muted). Here ONE shared context is created and unlocked on the person's
// first click / key press / tap anywhere in the app, so by the time a call
// arrives it is allowed to make sound.

const KEY = "torchx_call_sound_settings";

export const RINGTONES = [
  { id: "classic", label: "Classic phone" },
  { id: "digital", label: "Digital" },
  { id: "soft", label: "Soft chime" },
];

const DEFAULTS = {
  ringEnabled: true, // ring on incoming calls
  ringtone: "classic",
  volume: 80, // 0-100
  desktopAlerts: true, // browser notification when the tab is in the background
  vibrate: true, // phones
};

export const getCallSoundSettings = () => {
  try {
    const raw = window.localStorage.getItem(KEY);
    return { ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULTS };
  }
};

export const setCallSoundSettings = (patch) => {
  const next = { ...getCallSoundSettings(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode etc. */
  }
  window.dispatchEvent(new CustomEvent("torchx-callsound-change", { detail: next }));
  return next;
};

// ---------------------------------------------------------------- audio context

let ctx = null;

export const getSharedAudioContext = () => {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx || ctx.state === "closed") ctx = new Ctx();
  return ctx;
};

export const isAudioLocked = () => !ctx || ctx.state !== "running";

const unlock = () => {
  const c = getSharedAudioContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  // a 1-sample silent buffer fully unlocks iOS Safari
  try {
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch {
    /* ignore */
  }
  if (c.state === "running") {
    ["pointerdown", "keydown", "touchstart", "click"].forEach((e) => window.removeEventListener(e, unlock, true));
    window.dispatchEvent(new CustomEvent("torchx-audio-unlocked"));
  }
};

if (typeof window !== "undefined") {
  ["pointerdown", "keydown", "touchstart", "click"].forEach((e) => window.addEventListener(e, unlock, true));
}

// ---------------------------------------------------------------- ringtones

const tone = (c, { freq, start, dur, type = "sine", gain = 0.3 }, master) => {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t0 + 0.02);
  g.gain.setValueAtTime(Math.max(gain, 0.0002), t0 + Math.max(dur - 0.05, 0.03));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
};

// each pattern = one ring cycle; `cycleMs` is how often it repeats
const PATTERNS = {
  classic: {
    cycleMs: 3000,
    notes: [
      { freq: 440, start: 0, dur: 0.4, gain: 0.35 }, { freq: 480, start: 0, dur: 0.4, gain: 0.35 },
      { freq: 440, start: 0.55, dur: 0.4, gain: 0.35 }, { freq: 480, start: 0.55, dur: 0.4, gain: 0.35 },
    ],
  },
  digital: {
    cycleMs: 2200,
    notes: [
      { freq: 988, start: 0, dur: 0.12, type: "square", gain: 0.16 },
      { freq: 1175, start: 0.16, dur: 0.12, type: "square", gain: 0.16 },
      { freq: 1319, start: 0.32, dur: 0.12, type: "square", gain: 0.16 },
      { freq: 988, start: 0.6, dur: 0.12, type: "square", gain: 0.16 },
      { freq: 1175, start: 0.76, dur: 0.12, type: "square", gain: 0.16 },
      { freq: 1319, start: 0.92, dur: 0.12, type: "square", gain: 0.16 },
    ],
  },
  soft: {
    cycleMs: 2500,
    notes: [
      { freq: 784, start: 0, dur: 0.5, gain: 0.3 },
      { freq: 1047, start: 0.22, dur: 0.6, gain: 0.3 },
      { freq: 1319, start: 0.5, dur: 0.8, gain: 0.26 },
    ],
  },
};

const playCycle = (name, volume) => {
  const c = getSharedAudioContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const p = PATTERNS[name] || PATTERNS.classic;
  const master = c.createGain();
  master.gain.value = Math.min(Math.max(volume, 0), 100) / 100;
  master.connect(c.destination);
  p.notes.forEach((n) => tone(c, n, master));
  setTimeout(() => {
    try { master.disconnect(); } catch { /* ignore */ }
  }, 2500);
};

// Starts ringing until the returned stop() is called. Respects the saved settings.
export const startRingtone = () => {
  const s = getCallSoundSettings();
  if (!s.ringEnabled) return () => {};
  const p = PATTERNS[s.ringtone] || PATTERNS.classic;
  const run = () => playCycle(s.ringtone, s.volume);
  run();
  const timer = setInterval(run, p.cycleMs);
  let vib = null;
  if (s.vibrate && typeof navigator !== "undefined" && navigator.vibrate) {
    const buzz = () => navigator.vibrate([400, 200, 400]);
    buzz();
    vib = setInterval(buzz, p.cycleMs);
  }
  return () => {
    clearInterval(timer);
    if (vib) {
      clearInterval(vib);
      navigator.vibrate?.(0);
    }
  };
};

// "Test" button in settings: plays one cycle with the given (unsaved) values.
export const previewRingtone = (name, volume) => {
  unlock();
  playCycle(name, volume);
};

// ---------------------------------------------------------------- desktop alerts

export const desktopAlertSupported = () => typeof Notification !== "undefined";
export const desktopAlertPermission = () => (desktopAlertSupported() ? Notification.permission : "unsupported");
export const requestDesktopAlertPermission = async () => {
  if (!desktopAlertSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
};

// Shows an OS notification for an incoming call, only while the tab is hidden.
// Returns a function that closes it again.
export const showIncomingCallAlert = ({ title, body, onClick }) => {
  const s = getCallSoundSettings();
  if (!s.desktopAlerts || !desktopAlertSupported() || Notification.permission !== "granted") return () => {};
  if (document.visibilityState === "visible") return () => {};
  try {
    const n = new Notification(title, { body, tag: "torchx-incoming-call", renotify: true, requireInteraction: true });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
    return () => n.close();
  } catch {
    return () => {};
  }
};