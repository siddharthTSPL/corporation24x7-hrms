// Tiny WebAudio chimes (no audio files to ship). Browsers only allow sound after a click in the page,
// which is always true here because the user pressed Join.
let ctx = null;

const tone = (freq, start, dur, vol = 0.08, type = "sine") => {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
};

const SOUNDS = {
  join: () => { tone(660, 0, 0.14); tone(880, 0.12, 0.2); },
  leave: () => { tone(660, 0, 0.14); tone(440, 0.12, 0.22); },
  record: () => { tone(520, 0, 0.12, 0.07, "triangle"); tone(520, 0.2, 0.12, 0.07, "triangle"); },
  kudos: () => { tone(784, 0, 0.1); tone(988, 0.1, 0.1); tone(1175, 0.2, 0.22); },
  tick: () => tone(1000, 0, 0.08, 0.05),
  done: () => { tone(880, 0, 0.18); tone(880, 0.25, 0.18); tone(1175, 0.5, 0.4); },
};

let enabled = true;
export const setSoundsEnabled = (v) => { enabled = !!v; };
export const soundsEnabled = () => enabled;

export const playSound = (name) => {
  if (!enabled || !SOUNDS[name]) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    SOUNDS[name]();
  } catch {
    /* sound is a nicety, never an error */
  }
};
