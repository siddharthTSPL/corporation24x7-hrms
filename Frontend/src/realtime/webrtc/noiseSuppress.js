// AI noise cancellation for the microphone (RNNoise, the same family of model used by Discord / Jitsi).
// Keyboard clicks, fans, traffic and room hiss are removed, the voice is kept.
//   mic -> 80 Hz high-pass -> RNNoise -> soft noise gate -> processed track (what the other people hear)
// If anything fails (old browser, no AudioWorklet, wasm blocked) we return null and the call simply
// uses the normal microphone with the browser's own noise suppression.
import { RnnoiseWorkletNode, NoiseGateWorkletNode, loadRnnoise } from "@sapphi-red/web-noise-suppressor";
import rnnoiseWorkletPath from "@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url";
import noiseGateWorkletPath from "@sapphi-red/web-noise-suppressor/noiseGateWorklet.js?url";
import rnnoiseWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise.wasm?url";
import rnnoiseSimdWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url";

let wasmPromise = null;
const loadWasm = () => {
  if (!wasmPromise) {
    wasmPromise = loadRnnoise({ url: rnnoiseWasmPath, simdUrl: rnnoiseSimdWasmPath }).catch((err) => {
      wasmPromise = null;
      throw err;
    });
  }
  return wasmPromise;
};

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);

const safe = (fn) => {
  try {
    fn();
  } catch {
    /* already closed */
  }
};

export const isNoiseSuppressionSupported = () =>
  typeof window !== "undefined" && typeof AudioWorkletNode !== "undefined" && typeof AudioContext !== "undefined" && typeof WebAssembly !== "undefined";

// Takes the raw microphone track, returns a cleaned track (or null if it could not be set up).
// Stopping the returned track also stops the raw mic and tears the audio graph down.
export const enhanceMicTrack = async (rawTrack) => {
  if (!rawTrack || !isNoiseSuppressionSupported()) return null;
  let ctx = null;
  try {
    ctx = new AudioContext({ sampleRate: 48000, latencyHint: "interactive" }); // RNNoise needs 48 kHz
    const [wasmBinary] = await Promise.all([
      loadWasm(),
      ctx.audioWorklet.addModule(rnnoiseWorkletPath),
      ctx.audioWorklet.addModule(noiseGateWorkletPath),
    ]);
    if (ctx.state !== "running") await withTimeout(ctx.resume().catch(() => {}), 1500);
    if (ctx.state !== "running") throw new Error("audio context is not running");

    const source = ctx.createMediaStreamSource(new MediaStream([rawTrack]));
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 80;
    const rnnoise = new RnnoiseWorkletNode(ctx, { wasmBinary, maxChannels: 1 });
    const gate = new NoiseGateWorkletNode(ctx, { openThreshold: -58, closeThreshold: -64, holdMs: 300, maxChannels: 1 });
    const dest = ctx.createMediaStreamDestination();

    source.connect(highpass);
    highpass.connect(rnnoise);
    rnnoise.connect(gate);
    gate.connect(dest);

    const clean = dest.stream.getAudioTracks()[0];
    if (!clean) throw new Error("no processed track");
    try { clean.contentHint = "speech"; } catch { /* optional hint */ }

    let closed = false;
    const keepAlive = () => {
      if (!closed && ctx.state !== "running" && ctx.state !== "closed") ctx.resume().catch(() => {});
    };
    ctx.addEventListener("statechange", keepAlive);
    document.addEventListener("visibilitychange", keepAlive);
    window.addEventListener("pointerdown", keepAlive);
    const teardown = () => {
      if (closed) return;
      closed = true;
      ctx.removeEventListener("statechange", keepAlive);
      document.removeEventListener("visibilitychange", keepAlive);
      window.removeEventListener("pointerdown", keepAlive);
      safe(() => rnnoise.destroy());
      safe(() => source.disconnect());
      safe(() => rawTrack.stop());
      safe(() => ctx.close());
    };
    const originalStop = clean.stop.bind(clean);
    clean.stop = () => {
      originalStop();
      teardown();
    };
    // mic unplugged / revoked -> the processed track ends too
    rawTrack.addEventListener("ended", () => {
      teardown();
      safe(() => clean.dispatchEvent(new Event("ended")));
    });
    return clean;
  } catch (err) {
    console.warn("[call] AI noise cancellation unavailable, using the browser's:", err?.message || err);
    if (ctx) safe(() => ctx.close());
    return null;
  }
};