import { useEffect, useState } from "react";

export function useDevices(refreshKey) {
  const [list, setList] = useState({ mics: [], cams: [] });
  useEffect(() => {
    let off = false;
    const load = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!off) setList({ mics: all.filter((d) => d.kind === "audioinput"), cams: all.filter((d) => d.kind === "videoinput") });
      } catch {
        if (!off) setList({ mics: [], cams: [] });
      }
    };
    load();
    navigator.mediaDevices?.addEventListener?.("devicechange", load);
    return () => {
      off = true;
      navigator.mediaDevices?.removeEventListener?.("devicechange", load);
    };
  }, [refreshKey]);
  return list;
}
