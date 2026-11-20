// Lightweight notification chime + sound on/off preference.
// Generated in-browser with the Web Audio API, so there's no audio file to
// ship/host — it works instantly and can't 404.

import { getSharedAudioContext } from "./Callsound";

const STORAGE_KEY = "torchx_notif_sound_enabled";

// One shared, user-gesture-unlocked AudioContext (see callSound.js). A context
// created on its own when a message arrives stays muted in most browsers.
const getAudioContext = () => getSharedAudioContext();

export const isSoundEnabled = () => {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
};

export const setSoundEnabled = (enabled) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // ignore storage failures (private browsing etc.)
  }
};

// Soft two-note "ding" chime — short and pleasant, safe to fire on every
// new live notification without being annoying.
export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const notes = [
      { freq: 880, start: 0, duration: 0.16 },   // A5
      { freq: 1318.5, start: 0.1, duration: 0.22 }, // E6
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.22, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    });
  } catch {
    // Never let a sound glitch break the notification UI.
  }
};