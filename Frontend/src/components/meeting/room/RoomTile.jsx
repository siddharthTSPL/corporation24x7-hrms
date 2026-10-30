import { FaMicrophoneSlash, FaHandPaper, FaThumbtack } from "react-icons/fa";
import Avatar from "../../chat/Avatar";
import { MediaView } from "./RoomMedia";

export default function RoomTile({ tile, large = false, compact = false, onPin, pinned = false }) {
  const { name, photo, seed, stream, muted, audioOn, videoOn, mirror, label, reconnecting, handRaised, handOrder, isHostTile } = tile;
  const avatarSize = compact ? 44 : large ? 120 : 76;

  return (
    <div className={`group relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#26262b] ${handRaised ? "ring-2 ring-amber-400" : "ring-1 ring-white/5"}`}>
      <MediaView stream={stream} muted={muted} mirror={mirror} hidden={!videoOn} />
      {!videoOn && (
        <div className="flex flex-col items-center gap-2">
          <Avatar name={name} photo={photo} size={avatarSize} seed={seed} />
        </div>
      )}

      {handRaised && (
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-gray-900 shadow">
          <FaHandPaper className="text-[11px]" />
          {handOrder ? `#${handOrder}` : "Hand raised"}
        </div>
      )}

      {onPin && (
        <button
          type="button"
          onClick={onPin}
          title={pinned ? "Unpin" : "Pin"}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-xs opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 ${pinned ? "bg-white text-gray-900 opacity-100" : "bg-black/55 text-white hover:bg-black/75"}`}
        >
          <FaThumbtack />
        </button>
      )}

      <div className="absolute bottom-2 left-2 flex max-w-[85%] items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
        {!audioOn && <FaMicrophoneSlash className="shrink-0 text-[10px] text-red-300" />}
        <span className="truncate">{label || name}</span>
        {isHostTile && <span className="shrink-0 rounded bg-white/20 px-1 text-[9px] font-semibold uppercase tracking-wide">Host</span>}
      </div>

      {reconnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">Reconnecting…</div>
      )}
    </div>
  );
}
