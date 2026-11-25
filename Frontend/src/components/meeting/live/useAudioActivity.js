import { useEffect, useRef } from "react";

// Voice-activity detection on MediaStreams (own mic + every remote audio stream).
// One shared AudioContext, one polling loop. onChange(id, speaking) fires only when the state flips.
const THRESHOLD = 0.018; // RMS above this = voice
const HOLD_MS = 700; // stay "speaking" a bit after the last loud frame so it doesn't flicker between words

export default function useAudioActivity(entries, onChange) {
  const ctxRef = useRef(null);
  const nodes = useRef(new Map()); // streamId -> { id, source, analyser, buf, speaking, lastLoud }
  const cb = useRef(onChange);
  cb.current = onChange;

  // entries = [{ id, stream, enabled }] - rebuilt on every render, so key the effect on a signature
  const signature = entries.map((e) => `${e.id}:${e.stream?.id || ""}:${e.stream?.getAudioTracks().length || 0}:${e.enabled ? 1 : 0}`).join("|");
  const latest = useRef(entries);
  latest.current = entries;

  useEffect(() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return undefined;
    if (!ctxRef.current) ctxRef.current = new AC();
    const ctx = ctxRef.current;
    const map = nodes.current;
    const wanted = new Set();

    for (const e of latest.current) {
      if (!e.stream || !e.stream.getAudioTracks().length) continue;
      const nodeKey = `${e.id}:${e.stream.id}`;
      wanted.add(nodeKey);
      if (map.has(nodeKey)) {
        map.get(nodeKey).enabled = e.enabled;
        continue;
      }
      try {
        const source = ctx.createMediaStreamSource(new MediaStream(e.stream.getAudioTracks()));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser); // never connected to destination: this only measures, it does not play
        map.set(nodeKey, { id: e.id, source, analyser, buf: new Float32Array(analyser.fftSize), speaking: false, lastLoud: 0, enabled: e.enabled });
      } catch {
        /* stream can't be analysed (already closed) */
      }
    }
    for (const [k, n] of map) {
      if (wanted.has(k)) continue;
      try { n.source.disconnect(); } catch { /* ignore */ }
      if (n.speaking) cb.current?.(n.id, false);
      map.delete(k);
    }
  }, [signature]);

  useEffect(() => {
    const t = setInterval(() => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = performance.now();
      nodes.current.forEach((n) => {
        let loud = false;
        if (n.enabled) {
          n.analyser.getFloatTimeDomainData(n.buf);
          let sum = 0;
          for (let i = 0; i < n.buf.length; i++) sum += n.buf[i] * n.buf[i];
          loud = Math.sqrt(sum / n.buf.length) > THRESHOLD;
        }
        if (loud) n.lastLoud = now;
        const next = loud || (n.speaking && now - n.lastLoud < HOLD_MS);
        if (next !== n.speaking) {
          n.speaking = next;
          cb.current?.(n.id, next);
        }
      });
    }, 140);
    return () => clearInterval(t);
  }, []);

  useEffect(
    () => () => {
      nodes.current.forEach((n) => { try { n.source.disconnect(); } catch { /* ignore */ } });
      nodes.current.clear();
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    },
    [],
  );
}
