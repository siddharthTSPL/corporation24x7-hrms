import toast from "react-hot-toast";
import { FaLock, FaLockOpen, FaMicrophoneSlash, FaHandPaper, FaPowerOff } from "react-icons/fa";
import useCall from "../../../realtime/useCall";
import { PanelHeader } from "./RoomMedia";

const TOGGLES = [
  ["lobby", "Waiting room", "People must be admitted by a host"],
  ["muteOnEntry", "Mute on entry", "New joiners start muted"],
  ["allowUnmute", "Allow people to unmute", "Turn off to keep the room on mute"],
  ["chatEnabled", "In-meeting chat", "Let everyone send messages"],
  ["reactionsEnabled", "Reactions", "Let everyone send emoji reactions"],
  ["handRaiseEnabled", "Raise hand", "Let everyone raise their hand"],
];

const run = (fn) => Promise.resolve().then(fn).catch((err) => toast.error(err?.message || "Something went wrong."));

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[#CD166E]" : "bg-white/20"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function HostPanel({ onClose, onEndAll }) {
  const { active, setLocked, muteAll, lowerAllHands, updateMeetingSettings } = useCall();
  if (!active) return null;
  const settings = active.settings || {};
  const handCount = Object.keys(active.hands || {}).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="Host controls" subtitle="Only hosts and co-hosts see this" onClose={onClose} />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => run(() => setLocked(!active.locked))} className={`flex flex-col items-start gap-2 rounded-2xl px-4 py-3 text-left transition-colors ${active.locked ? "bg-amber-400 text-gray-900" : "bg-white/10 text-white hover:bg-white/15"}`}>
            {active.locked ? <FaLock /> : <FaLockOpen />}
            <span className="text-sm font-semibold">{active.locked ? "Meeting locked" : "Lock meeting"}</span>
            <span className={`text-[11px] ${active.locked ? "text-gray-800" : "text-gray-400"}`}>{active.locked ? "Tap to unlock" : "No one new can join"}</span>
          </button>
          <button type="button" onClick={() => run(muteAll)} className="flex flex-col items-start gap-2 rounded-2xl bg-white/10 px-4 py-3 text-left text-white transition-colors hover:bg-white/15">
            <FaMicrophoneSlash />
            <span className="text-sm font-semibold">Mute everyone</span>
            <span className="text-[11px] text-gray-400">Except hosts</span>
          </button>
          {handCount > 0 && (
            <button type="button" onClick={() => run(lowerAllHands)} className="col-span-2 flex items-center gap-3 rounded-2xl bg-amber-400/15 px-4 py-3 text-left text-amber-100 hover:bg-amber-400/25">
              <FaHandPaper />
              <span className="text-sm font-semibold">Lower all hands ({handCount})</span>
            </button>
          )}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Meeting settings</p>
          <div className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-white/5">
            {TOGGLES.map(([key, label, hint]) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-[11px] text-gray-400">{hint}</p>
                </div>
                <Switch checked={!!settings[key]} onChange={(v) => run(() => updateMeetingSettings({ [key]: v }))} />
              </div>
            ))}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Screen sharing</p>
                <p className="text-[11px] text-gray-400">Who can present</p>
              </div>
              <select value={settings.screenShare || "everyone"} onChange={(e) => run(() => updateMeetingSettings({ screenShare: e.target.value }))} className="rounded-lg border border-white/15 bg-[#2a2a30] px-2.5 py-1.5 text-xs text-white outline-none">
                <option value="everyone">Everyone</option>
                <option value="host">Host only</option>
              </select>
            </div>
          </div>
        </div>

        <button type="button" onClick={onEndAll} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600/15 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-600/25">
          <FaPowerOff /> End meeting for everyone
        </button>
      </div>
    </div>
  );
}
