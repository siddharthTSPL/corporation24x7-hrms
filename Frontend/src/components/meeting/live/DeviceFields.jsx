import { useCallback, useEffect, useState } from "react";

// mic / camera lists. Labels are empty until the browser has given camera/mic permission once.
export function useDevices(refreshKey) {
  const [list, setList] = useState({ mics: [], cams: [] });
  const load = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setList({ mics: all.filter((d) => d.kind === "audioinput"), cams: all.filter((d) => d.kind === "videoinput") });
    } catch {
      setList({ mics: [], cams: [] });
    }
  }, []);
  useEffect(() => {
    load();
    navigator.mediaDevices?.addEventListener?.("devicechange", load);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", load);
  }, [load, refreshKey]);
  return list;
}

export function DeviceSelect({ label, devices, value, onChange, fallback }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={!devices.length} className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#CD166E]/50 disabled:opacity-50">
        {!devices.length && <option value="" className="text-gray-900">None found</option>}
        {devices.length > 0 && <option value="" className="text-gray-900">Default</option>}
        {devices.map((d, i) => <option key={d.deviceId || i} value={d.deviceId} className="text-gray-900">{d.label || `${fallback} ${i + 1}`}</option>)}
      </select>
    </label>
  );
}
