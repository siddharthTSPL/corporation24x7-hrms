import { useEffect, useRef } from "react";

// Single-key shortcuts for the meeting room. Ignored while typing and when Ctrl / Cmd / Alt is held.
//   useRoomShortcuts({ m: toggleMic, v: toggleCamera, h: toggleHand, c: openChat, p: openPeople })
export const SHORTCUTS = [
  ["M", "Mute / unmute"],
  ["V", "Camera on / off"],
  ["H", "Raise / lower hand"],
  ["C", "Open chat"],
  ["P", "Open people"],
  ["R", "Reactions"],
  ["S", "Share screen"],
  ["W", "Whiteboard"],
  ["?", "Show shortcuts"],
  ["Esc", "Close panel"],
];

export default function useRoomShortcuts(map, enabled = true) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const fn = ref.current[key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
