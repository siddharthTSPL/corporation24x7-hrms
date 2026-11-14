import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaQuestionCircle, FaPoll, FaChalkboard, FaStopwatch, FaClosedCaptioning, FaTimes, FaCheck } from "react-icons/fa";
import useCall from "../../../../realtime/useCall";
import { getMediaPrefs } from "../../../../realtime/webrtc/mediaPrefs";
import { DeviceSelect } from "./DeviceFields";
import { useDevices } from "./useDevices";
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
    <div ref={ref} className={`fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-50 max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-[#2E2E35] bg-[#1B1B20] p-1.5 text-sm shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-full sm:mb-3 sm:max-h-[60vh] sm:w-72 ${className}`}>
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
    <Popup onClose={onClose} className="sm:left-1/2 sm:-translate-x-1/2">
      <Item icon={<FaQuestionCircle />} label="Q&A" hint="Ask and upvote questions" onClick={() => pick("qa")} />
      <Item icon={<FaPoll />} label="Polls" hint="Vote on quick questions" onClick={() => pick("polls")} />
      <Item icon={<FaChalkboard />} label={boardOpen ? "Close whiteboard" : "Whiteboard"} hint="Draw together" onClick={() => pick("board")} />
      <Item icon={<FaStopwatch />} label="Activities" hint="Timer, agenda, pulse, kudos, decisions" onClick={() => pick("activities")} />
      <Item icon={<FaClosedCaptioning />} label="Captions & transcript" onClick={() => pick("transcript")} />
    </Popup>
  );
}


// ---- Change view: how the screen is laid out for ME (nobody else's screen changes) ----
const LayoutThumb = ({ kind }) =>
  kind === "grid" ? (
    <svg viewBox="0 0 48 32" className="h-8 w-12" aria-hidden="true">
      {[0, 1].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={1 + c * 16} y={1 + r * 16} width="14" height="14" rx="3" fill="currentColor" opacity=".85" />))}
    </svg>
  ) : (
    <svg viewBox="0 0 48 32" className="h-8 w-12" aria-hidden="true">
      <rect x="1" y="1" width="46" height="21" rx="3" fill="currentColor" opacity=".85" />
      {[0, 1, 2].map((c) => <rect key={c} x={1 + c * 16} y="24" width="14" height="7" rx="2" fill="currentColor" opacity=".5" />)}
    </svg>
  );

function Toggle({ label, hint, on, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-gray-100 hover:bg-white/5">
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {hint ? <span className="block text-[11px] text-gray-500">{hint}</span> : null}
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-[#CD166E]" : "bg-white/20"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export function ViewMenu({ onClose, layout, onLayout, hideNoVideo, onHideNoVideo, hideSelf, onHideSelf, onFullscreen, fullscreen }) {
  const options = [
    ["grid", "Grid", "Everyone the same size"],
    ["speaker", "Speaker", "Active speaker big, others below"],
  ];
  return (
    <Popup onClose={onClose} className="sm:left-1/2 sm:w-[19rem] sm:-translate-x-1/2">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Change view</p>
      <div className="grid grid-cols-2 gap-2 px-2 pb-2">
        {options.map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            onClick={() => onLayout(id)}
            aria-pressed={layout === id}
            className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${layout === id ? "border-[#CD166E] bg-[#730042]/30 text-white" : "border-[#2E2E35] bg-white/5 text-gray-300 hover:bg-white/10"}`}
          >
            <LayoutThumb kind={id} />
            <span className="text-xs font-semibold">{label}</span>
            <span className="text-[10px] leading-tight text-gray-500">{hint}</span>
            {layout === id && <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#CD166E] text-[8px] text-white"><FaCheck /></span>}
          </button>
        ))}
      </div>
      <div className="my-1 h-px bg-white/10" />
      <Toggle label="Only people with camera on" hint="Others still stay audible" on={hideNoVideo} onChange={onHideNoVideo} />
      <Toggle label="Hide my own tile" hint="Only on your screen" on={hideSelf} onChange={onHideSelf} />
      <button type="button" onClick={() => { onClose(); onFullscreen(); }} className="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-gray-100 hover:bg-white/5">
        {fullscreen ? "Exit full screen" : "Full screen"}
      </button>
    </Popup>
  );
}

// devices, sounds, share audio, layout, shortcuts
function Row({ label, on, onChange }) {
  return (
    <label className="flex min-h-10 items-center justify-between rounded-xl px-3 py-2 text-gray-100 hover:bg-white/5">
      {label}
      <input type="checkbox" className="h-4 w-4 accent-[#CD166E]" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function MoreMenu({ onClose, layout, onLayout, sounds, onSounds, shareAudio, onShareAudio, onShortcuts, quickActions = [] }) {
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
  return (
    <Popup onClose={onClose} className="sm:right-0 sm:w-80">
      {quickActions.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 p-2 sm:hidden">
          {quickActions.map((a) => (
            <button key={a.id} type="button" disabled={a.disabled} onClick={() => { onClose(); a.onClick(); }} className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-2 text-[11px] font-medium disabled:opacity-40 ${a.active ? "bg-white text-gray-900" : "bg-white/10 text-gray-100"}`}>
              <span className="text-base">{a.icon}</span>
              <span className="w-full truncate text-center">{a.label}</span>
            </button>
          ))}
        </div>
      )}
      {quickActions.length > 0 && <div className="my-1 h-px bg-white/10 sm:hidden" />}
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
