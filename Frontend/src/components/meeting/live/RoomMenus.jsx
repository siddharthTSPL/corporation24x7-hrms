import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaQuestionCircle, FaPoll, FaChalkboard, FaStopwatch, FaClosedCaptioning, FaTimes } from "react-icons/fa";
import useCall from "../../../../realtime/useCall";
import { getMediaPrefs } from "../../../../realtime/webrtc/mediaPrefs";
import { DeviceSelect, useDevices } from "./DeviceFields";
import { SHORTCUTS } from "./useRoomShortcuts";

function Popup({ onClose, children, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const away = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  return (
    <div ref={ref} className={`absolute bottom-full z-50 mb-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#25252b] p-1.5 text-sm shadow-2xl ${className}`}>
      {children}
    </div>
  );
}

const Item = ({ icon, label, hint, onClick, badge }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-gray-100 hover:bg-white/10">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{label}</span>{hint ? <span className="block truncate text-[11px] text-gray-500">{hint}</span> : null}</span>
    {badge ? <span className="rounded-full bg-[#CD166E] px-1.5 py-0.5 text-[10px] font-semibold">{badge}</span> : null}
  </button>
);

// Q&A, polls, whiteboard, activities, captions
export function ActivitiesMenu({ onPick, onClose, boardOpen }) {
  const pick = (id) => { onClose(); onPick(id); };
  return (
    <Popup onClose={onClose} className="left-1/2 -translate-x-1/2">
      <Item icon={<FaQuestionCircle />} label="Q&A" hint="Ask and upvote questions" onClick={() => pick("qa")} />
      <Item icon={<FaPoll />} label="Polls" hint="Vote on quick questions" onClick={() => pick("polls")} />
      <Item icon={<FaChalkboard />} label={boardOpen ? "Close whiteboard" : "Whiteboard"} hint="Draw together" onClick={() => pick("board")} />
      <Item icon={<FaStopwatch />} label="Activities" hint="Timer, agenda, pulse, wheel, kudos, decisions" onClick={() => pick("activities")} />
      <Item icon={<FaClosedCaptioning />} label="Captions & transcript" onClick={() => pick("transcript")} />
    </Popup>
  );
}

// devices, sounds, share audio, layout, shortcuts
export function MoreMenu({ onClose, layout, onLayout, sounds, onSounds, shareAudio, onShareAudio, onShortcuts }) {
  const { switchDevice } = useCall();
  const devices = useDevices(0);
  const [prefs, setPrefs] = useState(getMediaPrefs);
  const change = async (kind, id) => {
    setPrefs((p) => ({ ...p, [kind === "audio" ? "audioDeviceId" : "videoDeviceId"]: id }));
    try {
      await switchDevice(kind, id);
    } catch (err) {
      toast.error(err?.message || "Couldn't switch device.");
    }
  };
  const Row = ({ label, on, onChange }) => (
    <label className="flex items-center justify-between rounded-xl px-3 py-2 text-gray-100 hover:bg-white/5">
      {label}
      <input type="checkbox" className="h-4 w-4 accent-[#CD166E]" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
  return (
    <Popup onClose={onClose} className="right-0 w-80">
      <div className="space-y-3 p-2">
        <DeviceSelect label="Microphone" devices={devices.mics} value={prefs.audioDeviceId} onChange={(v) => change("audio", v)} fallback="Microphone" />
        <DeviceSelect label="Camera" devices={devices.cams} value={prefs.videoDeviceId} onChange={(v) => change("video", v)} fallback="Camera" />
      </div>
      <div className="my-1 h-px bg-white/10" />
      <div className="px-1 pb-1">
        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Layout</p>
        <div className="flex gap-1 px-2 pb-1">
          {[["grid", "Grid"], ["speaker", "Speaker"]].map(([id, l]) => (
            <button key={id} type="button" onClick={() => onLayout(id)} className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${layout === id ? "bg-white text-gray-900" : "bg-white/10 text-white hover:bg-white/15"}`}>{l}</button>
          ))}
        </div>
        <Row label="Join / leave sounds" on={sounds} onChange={onSounds} />
        <Row label="Share tab / system audio" on={shareAudio} onChange={onShareAudio} />
        <button type="button" onClick={onShortcuts} className="w-full rounded-xl px-3 py-2 text-left text-gray-100 hover:bg-white/5">Keyboard shortcuts</button>
      </div>
    </Popup>
  );
}

export function ShortcutsHelp({ onClose }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1b1b20] p-5 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-semibold">Keyboard shortcuts</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white"><FaTimes /></button>
        </div>
        <ul className="space-y-1.5">
          {SHORTCUTS.map(([k, l]) => (
            <li key={k} className="flex items-center justify-between text-sm text-gray-200">
              {l}
              <kbd className="min-w-7 rounded-md bg-white/10 px-2 py-0.5 text-center text-xs font-semibold">{k}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
