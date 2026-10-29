import { useRef, useState } from "react";
import { FaTimes, FaPlay, FaUpload, FaTrash } from "react-icons/fa";
import {
  RINGTONES,
  getCallSoundSettings,
  setCallSoundSettings,
  previewRingtone,
  desktopAlertPermission,
  requestDesktopAlertPermission,
} from "../notifications/Callsound";
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from "../notifications/Notificationsound";

const Row = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-700">{label}</span>
    {children}
  </div>
);

const Toggle = ({ on, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    onClick={() => onChange(!on)}
    className={`w-10 h-6 rounded-full transition-colors relative ${on ? "bg-[#730042]" : "bg-gray-300"}`}
  >
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
  </button>
);

// Call ringtone + message sound preferences (saved per browser).
export default function CallSoundSettings({ onClose }) {
  const [s, setS] = useState(getCallSoundSettings);
  const [msgSound, setMsgSound] = useState(isSoundEnabled);
  const [perm, setPerm] = useState(desktopAlertPermission);
  const fileRef = useRef(null);

  const patch = (p) => setS(setCallSoundSettings(p));

  const uploadRingtone = (file) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      fileRef.current.value = "";
      return window.alert("Please select an audio file.");
    }
    if (file.size > 1024 * 1024) {
      fileRef.current.value = "";
      return window.alert("Choose an audio file smaller than 1 MB.");
    }
    const reader = new FileReader();
    reader.onload = () => patch({ ringtone: "custom", customRingtone: { name: file.name, dataUrl: reader.result } });
    reader.onerror = () => window.alert("Couldn't read that audio file.");
    reader.readAsDataURL(file);
  };

  const removeRingtone = () => patch({ ringtone: "classic", customRingtone: null });

  return (
    <div className="fixed inset-0 z-[96] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-gray-900">Call & sound settings</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center">
            <FaTimes className="text-sm" />
          </button>
        </div>

        <Row label="Ring on incoming calls"><Toggle on={s.ringEnabled} onChange={(v) => patch({ ringEnabled: v })} /></Row>

        <Row label="Ringtone">
          <div className="flex items-center gap-2">
            <select
              value={s.ringtone}
              onChange={(e) => { patch({ ringtone: e.target.value }); previewRingtone(e.target.value, s.volume); }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1"
            >
              {RINGTONES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              {s.customRingtone?.dataUrl && <option value="custom">{s.customRingtone.name || "My ringtone"}</option>}
            </select>
            <button
              type="button"
              title="Test ringtone"
              onClick={() => previewRingtone(s.ringtone, s.volume)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              <FaPlay className="text-[10px]" />
            </button>
          </div>
        </Row>

        <Row label="Your ringtone">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => uploadRingtone(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              <FaUpload /> {s.customRingtone ? "Change" : "Upload"}
            </button>
            {s.customRingtone && (
              <button type="button" onClick={removeRingtone} title="Remove uploaded ringtone" className="w-7 h-7 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center">
                <FaTrash className="text-[10px]" />
              </button>
            )}
          </div>
        </Row>

        <Row label={`Volume (${s.volume}%)`}>
          <input
            type="range" min="10" max="100" value={s.volume}
            onChange={(e) => patch({ volume: Number(e.target.value) })}
            onMouseUp={() => previewRingtone(s.ringtone, s.volume)}
            className="w-32 accent-[#730042]"
          />
        </Row>

        <Row label="Vibrate (phones)"><Toggle on={s.vibrate} onChange={(v) => patch({ vibrate: v })} /></Row>

        <Row label="Message sound">
          <Toggle
            on={msgSound}
            onChange={(v) => { setSoundEnabled(v); setMsgSound(v); if (v) playNotificationSound(); }}
          />
        </Row>

        <Row label="Call alert when tab is in background">
          {perm === "granted" ? (
            <Toggle on={s.desktopAlerts} onChange={(v) => patch({ desktopAlerts: v })} />
          ) : perm === "denied" ? (
            <span className="text-xs text-red-500">Blocked in browser</span>
          ) : perm === "unsupported" ? (
            <span className="text-xs text-gray-400">Not supported</span>
          ) : (
            <button
              type="button"
              onClick={async () => setPerm(await requestDesktopAlertPermission())}
              className="text-xs px-3 py-1 rounded-full bg-[#730042] text-white"
            >
              Allow
            </button>
          )}
        </Row>
      </div>
    </div>
  );
}
