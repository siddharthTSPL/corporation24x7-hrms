import { useState } from "react";
import toast from "react-hot-toast";
import { FaCheck, FaTimes, FaBan, FaMicrophoneSlash, FaMicrophone, FaHandPaper, FaUserShield, FaUserMinus, FaEllipsisV, FaVideoSlash, FaVideo } from "react-icons/fa";
import useCall from "../../../realtime/useCall";
import Avatar from "../../chat/Avatar";
import { PanelHeader } from "./RoomMedia";

const run = (fn) => Promise.resolve().then(fn).catch((err) => toast.error(err?.message || "Something went wrong."));

function SectionTitle({ children, count, action }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {children} {count != null && <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">{count}</span>}
      </p>
      {action}
    </div>
  );
}

function LobbySection() {
  const { active, admit, admitAll, deny, denyAll } = useCall();
  const lobby = active?.lobby || [];
  if (!lobby.length) return null;
  return (
    <div className="mx-3 mt-3 overflow-hidden rounded-2xl border border-amber-400/30 bg-amber-400/10">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-amber-100">Waiting to join</p>
          <p className="text-xs text-amber-200/70">{lobby.length} {lobby.length === 1 ? "person is" : "people are"} at the door</p>
        </div>
        {lobby.length > 1 && (
          <div className="flex gap-1.5">
            <button type="button" onClick={() => run(denyAll)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-white/10">Deny all</button>
            <button type="button" onClick={() => run(admitAll)} className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600">Admit all</button>
          </div>
        )}
      </div>
      <div className="divide-y divide-white/5 border-t border-white/10">
        {lobby.map((w) => (
          <div key={w.socketId} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar name={w.name} photo={w.photo} size={36} seed={w.key} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{w.name || "Guest"}</p>
              <p className="truncate text-[11px] text-amber-200/70">{w.isGuest ? `Outside guest${w.email ? ` · ${w.email}` : ""}` : "Team member"}</p>
            </div>
            <button type="button" title="Admit" onClick={() => run(() => admit(w.socketId))} className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600">
              <FaCheck className="text-xs" />
            </button>
            <button type="button" title="Deny" onClick={() => run(() => deny(w.socketId))} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-gray-200 hover:bg-white/20">
              <FaTimes className="text-xs" />
            </button>
            <button type="button" title="Deny and block" onClick={() => run(() => deny(w.socketId, true))} className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/30">
              <FaBan className="text-xs" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonRow({ p, isMe, isHostRow, canModerate, handOrder, menuOpen, onMenu }) {
  const { requestMute, kick, lowerHand, setCoHost, active } = useCall();
  const isModerator = (active?.hostKeys || []).includes(p.key);
  const isOwner = p.key === active?.ownerKey;
  const canAct = canModerate && !isMe && !isOwner;

  return (
    <div className="relative flex items-center gap-3 px-4 py-2.5 hover:bg-white/5">
      <Avatar name={p.name} photo={p.photo} size={36} seed={p.key || p.socketId} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
          <span className="truncate">{isMe ? `${p.name || "You"} (You)` : p.name || "Participant"}</span>
          {isHostRow && <span className="shrink-0 rounded bg-white/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-gray-200">{isOwner ? "Host" : "Co-host"}</span>}
        </p>
        {p.model === "Guest" || p.isGuest ? <p className="text-[11px] text-gray-500">Outside guest</p> : null}
      </div>
      {handOrder ? (
        <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[11px] font-semibold text-gray-900">
          <FaHandPaper className="text-[10px]" /> {handOrder}
        </span>
      ) : null}
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${p.audio === false ? "bg-red-500/20 text-red-300" : "text-gray-400"}`}>
        {p.audio === false ? <FaMicrophoneSlash /> : <FaMicrophone />}
      </span>
      <span className={`hidden h-7 w-7 items-center justify-center rounded-full text-xs sm:flex ${p.video ? "text-gray-400" : "text-gray-600"}`}>
        {p.video ? <FaVideo /> : <FaVideoSlash />}
      </span>
      {canAct || (handOrder && canModerate) ? (
        <button type="button" onClick={onMenu} aria-label="Participant actions" className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white">
          <FaEllipsisV className="text-xs" />
        </button>
      ) : null}

      {menuOpen && (
        <div className="absolute right-4 top-12 z-20 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#25252b] py-1 text-sm shadow-2xl">
          {handOrder ? (
            <button type="button" onClick={() => { run(() => lowerHand(p.key)); onMenu(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-gray-200 hover:bg-white/10">
              <FaHandPaper className="text-xs text-gray-400" /> Lower hand
            </button>
          ) : null}
          {canAct && p.audio !== false && (
            <button type="button" onClick={() => { run(() => requestMute(p.socketId)); onMenu(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-gray-200 hover:bg-white/10">
              <FaMicrophoneSlash className="text-xs text-gray-400" /> Mute
            </button>
          )}
          {canAct && p.model !== "Guest" && !p.isGuest && (
            <button type="button" onClick={() => { run(() => setCoHost(p.key, !isModerator)); onMenu(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-gray-200 hover:bg-white/10">
              <FaUserShield className="text-xs text-gray-400" /> {isModerator ? "Remove co-host" : "Make co-host"}
            </button>
          )}
          {canAct && (
            <button type="button" onClick={() => { run(() => kick(p.socketId)); onMenu(); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-red-300 hover:bg-red-500/10">
              <FaUserMinus className="text-xs" /> Remove from meeting
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PeoplePanel({ onClose, selfPerson }) {
  const { active, peers, myKey, isHost, lowerAllHands } = useCall();
  const [menu, setMenu] = useState(null);
  if (!active) return null;

  const hands = active.hands || {};
  const handList = Object.entries(hands).sort((a, b) => new Date(a[1].raisedAt) - new Date(b[1].raisedAt));
  const orderOf = (key) => {
    const idx = handList.findIndex(([k]) => k === key);
    return idx >= 0 ? idx + 1 : 0;
  };

  const me = { socketId: active.mySocketId, key: myKey, name: selfPerson?.name || "You", photo: selfPerson?.photo || "", audio: active.audio, video: active.video };
  const everyone = [me, ...peers];
  const total = everyone.length;

  return (
    <div className="flex h-full min-h-0 flex-col" onClick={() => setMenu(null)}>
      <PanelHeader title="People" subtitle={`${total} in the meeting`} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto pb-4" onClick={(e) => e.stopPropagation()}>
        {isHost && <LobbySection />}

        {handList.length > 0 && (
          <>
            <SectionTitle
              count={handList.length}
              action={
                isHost && handList.length > 1 ? (
                  <button type="button" onClick={() => run(lowerAllHands)} className="text-xs font-semibold text-amber-300 hover:text-amber-200">Lower all</button>
                ) : null
              }
            >
              Raised hands
            </SectionTitle>
            <div className="mx-3 overflow-hidden rounded-2xl bg-white/5">
              {handList.map(([key, h], i) => {
                const person = everyone.find((p) => p.key === key);
                return (
                  <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[11px] font-bold text-gray-900">{i + 1}</span>
                    <p className="min-w-0 flex-1 truncate text-sm text-white">{key === myKey ? "You" : person?.name || h.name || "Participant"}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <SectionTitle count={total}>In the meeting</SectionTitle>
        {everyone.map((p) => {
          const rowKey = p.socketId || p.key;
          return (
            <PersonRow
              key={rowKey}
              p={p}
              isMe={p.socketId === active.mySocketId}
              isHostRow={(active.hostKeys || []).includes(p.key)}
              canModerate={isHost}
              handOrder={hands[p.key] ? orderOf(p.key) : 0}
              menuOpen={menu === rowKey}
              onMenu={() => setMenu((m) => (m === rowKey ? null : rowKey))}
            />
          );
        })}
      </div>
    </div>
  );
}
