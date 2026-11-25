import { useEffect, useRef } from "react";
import { emitQuiet } from "../../../../realtime/chatSocket";
import { EV } from "./liveEvents";
import { useLiveStore } from "./liveStore";

export const captionsSupported = () => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Turns MY speech into captions with the browser's speech recognition and shares it with the room
// (meeting:caption). Everyone else's captions arrive through the socket (see useLiveBridge).
// Runs only while the mic is on and "caption my speech" is enabled. Chrome / Edge / Safari support it.
export default function useCaptions({ roomKey, myKey, name, micOn, enabled, lang = "en-IN" }) {
  const recRef = useRef(null);

  useEffect(() => {
    if (!roomKey || !enabled || !micOn || !captionsSupported()) return undefined;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    let stopped = false;
    let lastSent = 0;
    const key = myKey || "me";

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0]?.transcript?.trim();
        if (!text) continue;
        const final = r.isFinal;
        useLiveStore.getState().addCaption({ key, name: "You", text, final, at: Date.now() });
        // interim lines are throttled so we don't flood the socket
        if (final || Date.now() - lastSent > 700) {
          lastSent = Date.now();
          emitQuiet(EV.caption, { roomKey, text, final, lang, name });
        }
      }
    };
    rec.onend = () => {
      if (!stopped) setTimeout(() => { try { rec.start(); } catch { /* already running */ } }, 250);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") stopped = true;
    };
    try { rec.start(); } catch { /* ignore */ }
    recRef.current = rec;
    return () => {
      stopped = true;
      rec.onend = null;
      try { rec.stop(); } catch { /* ignore */ }
    };
  }, [roomKey, myKey, name, micOn, enabled, lang]);
}
