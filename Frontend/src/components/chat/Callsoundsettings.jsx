import { useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaPlay, FaStop, FaUpload, FaTrash } from "react-icons/fa";
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
  const [previewing, setPreviewing] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const fileRef = useRef(null);
  const previewStopRef = useRef(null);

  const stopPreview = () => {
    previewStopRef.current?.();
    previewStopRef.current = null;
    setPreviewing(false);
  };

  useEffect(() => () => previewStopRef.current?.(), []);

  const patch = (p) => {
    stopPreview();
    setPreviewMessage("");
    setS(setCallSoundSettings(p));
  };

  const testRingtone = () => {
    if (previewing) {
      stopPreview();
      setPreviewMessage("Test stopped");
      return;
    }
    setPreviewMessage("");
    const stop = previewRingtone(s.ringtone, s.volume, s, {
      onStopped: () => {
        previewStopRef.current = null;
        setPreviewing(false);
      },
      onError: (err) => {
        previewStopRef.current = null;
        setPreviewing(false);
        setPreviewMessage(err?.message || "Could not play the test ringtone.");
      },
    });
    if (!stop) return;
    previewStopRef.current = stop;
    setPreviewing(true);
  };

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
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 shrink-0">
        <button type="button" onClick={onClose} title="Back to chat" className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center">
          <FaArrowLeft className="text-sm" />
        </button>
        <h3 className="text-base font-bold text-gray-900">Call & sound settings</h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">

        <Row label="Ring on incoming calls"><Toggle on={s.ringEnabled} onChange={(v) => patch({ ringEnabled: v })} /></Row>

        <Row label="Ringtone">
          <div className="flex items-center gap-2">
            <select
              value={s.ringtone}
              onChange={(e) => patch({ ringtone: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1"
            >
              {RINGTONES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              {s.customRingtone?.dataUrl && <option value="custom">{s.customRingtone.name || "My ringtone"}</option>}
            </select>
            <button
              type="button"
              title={previewing ? "Stop ringtone test" : "Test ringtone"}
              onClick={testRingtone}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${previewing ? "bg-[#730042] text-white" : "bg-gray-100 hover:bg-gray-200"}`}
            >
              {previewing ? <FaStop className="text-[10px]" /> : <FaPlay className="text-[10px]" />}
            </button>
          </div>
        </Row>
        {previewMessage && <p role="status" className={`text-xs pb-2 ${previewMessage.includes("Could not") || previewMessage.includes("ringing") ? "text-amber-700" : "text-gray-500"}`}>{previewMessage}</p>}
        {previewing && <p role="status" className="text-xs pb-2 text-[#730042]">Playing test ringtone… Click again to stop.</p>}

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
