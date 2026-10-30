import { useState } from "react";
import toast from "react-hot-toast";
import { FaUsers, FaLock, FaLockOpen, FaMicrophoneSlash, FaCog, FaCheck, FaTimes, FaBan } from "react-icons/fa";
import useCall from "../../realtime/useCall";
import Avatar from "../chat/Avatar";

const SETTINGS = [
  ["lobby", "Waiting room"],
  ["muteOnEntry", "Mute on entry"],
  ["allowUnmute", "Allow people to unmute"],
  ["chatEnabled", "Chat"],
  ["reactionsEnabled", "Reactions"],
  ["handRaiseEnabled", "Raise hand"],
];

// Host / co-host tools shown in the top bar of a running meeting:
// lobby (admit / deny), lock the room, mute everyone, live settings.
export default function MeetingHostControls() {
  const { active, admit, admitAll, deny, denyAll, setLocked, muteAll, updateMeetingSettings } = useCall();
  const [panel, setPanel] = useState(null); // "lobby" | "settings" | null
  if (!active) return null;

  const lobby = active.lobby || [];
  const settings = active.settings || {};
  const run = (fn) => () => Promise.resolve(fn()).catch((err) => toast.error(err?.message || "Something went wrong."));
  const toggle = (name) => setPanel((p) => (p === name ? null : name));
  const btn = "relative w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center";

  return (
    <>
      <button type="button" onClick={() => toggle("lobby")} title="Waiting room" className={btn}>
        <FaUsers className="text-sm" />
        {lobby.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-[#CD166E] px-1 text-[10px] font-semibold">{lobby.length}</span>}
      </button>
      <button type="button" onClick={run(() => setLocked(!active.locked))} title={active.locked ? "Unlock meeting" : "Lock meeting (no one new can join)"} className={`${btn} ${active.locked ? "!bg-amber-400 !text-gray-900" : ""}`}>
        {active.locked ? <FaLock className="text-xs" /> : <FaLockOpen className="text-xs" />}
      </button>
      <button type="button" onClick={run(muteAll)} title="Mute everyone" className={btn}>
        <FaMicrophoneSlash className="text-xs" />
      </button>
      <button type="button" onClick={() => toggle("settings")} title="Meeting settings" className={btn}>
        <FaCog className="text-xs" />
      </button>

      {panel && (
        <section className="fixed right-3 top-16 z-[100] w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-bold">{panel === "lobby" ? `Waiting room (${lobby.length})` : "Meeting settings"}</p>
            <button type="button" onClick={() => setPanel(null)} aria-label="Close" className="text-gray-400 hover:text-gray-700">
              <FaTimes />
            </button>
          </div>

          {panel === "lobby" && (
            <div className="max-h-[60vh] overflow-y-auto">
              {lobby.length === 0 && <p className="px-4 py-8 text-center text-xs text-gray-400">No one is waiting.</p>}
              {lobby.map((w) => (
                <div key={w.socketId} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar name={w.name} photo={w.photo} size={36} seed={w.key} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{w.name || "Guest"}</p>
                    <p className="truncate text-xs text-gray-500">{w.isGuest ? `Outside guest${w.email ? ` · ${w.email}` : ""}` : "Member"}</p>
                  </div>
                  <button type="button" onClick={run(() => admit(w.socketId))} title="Admit" className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600">
                    <FaCheck className="text-xs" />
                  </button>
                  <button type="button" onClick={run(() => deny(w.socketId))} title="Deny" className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                    <FaTimes className="text-xs" />
                  </button>
                  <button type="button" onClick={run(() => deny(w.socketId, true))} title="Deny and block from rejoining" className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100">
                    <FaBan className="text-xs" />
                  </button>
                </div>
              ))}
              {lobby.length > 1 && (
                <div className="flex justify-end gap-2 border-t border-gray-100 p-3">
                  <button type="button" onClick={run(denyAll)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">Deny all</button>
                  <button type="button" onClick={run(admitAll)} className="rounded-full bg-[#730042] px-4 py-1.5 text-xs font-semibold text-white">Admit all</button>
                </div>
              )}
            </div>
          )}

          {panel === "settings" && (
            <div className="space-y-1 p-3">
              {SETTINGS.map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                  {label}
                  <input type="checkbox" checked={!!settings[key]} onChange={(e) => run(() => updateMeetingSettings({ [key]: e.target.checked }))()} className="h-4 w-4 accent-[#730042]" />
                </label>
              ))}
              <label className="flex items-center justify-between rounded-lg px-2 py-2 text-sm">
                Screen sharing
                <select value={settings.screenShare || "everyone"} onChange={(e) => run(() => updateMeetingSettings({ screenShare: e.target.value }))()} className="rounded-md border border-gray-300 px-2 py-1 text-xs">
                  <option value="everyone">Everyone</option>
                  <option value="host">Host only</option>
                </select>
              </label>
            </div>
          )}
        </section>
      )}
    </>
  );
}
