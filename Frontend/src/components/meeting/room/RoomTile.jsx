import { FaMicrophoneSlash, FaHandPaper, FaThumbtack, FaBullseye, FaStar } from "react-icons/fa";
import Avatar from "../../chat/Avatar";
import { MediaView } from "./RoomMedia";

const talkLabel = (sec) => (sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`);

// three little bars, shown top-right while the person talks
function SpeakingBars() {
  return (
    <span className="flex h-7 items-end gap-[3px] rounded-full bg-black/55 px-2 pb-2" aria-label="Speaking" role="img">
      <style>{`@keyframes torchx-bar{0%,100%{height:30%}50%{height:100%}}@media (prefers-reduced-motion: reduce){.torchx-bar{animation:none!important;height:70%!important}}`}</style>
      {[0, 0.18, 0.36].map((d) => (
        <span key={d} className="torchx-bar w-[3px] rounded-full bg-[#34D399]" style={{ height: "60%", animation: `torchx-bar .9s ease-in-out ${d}s infinite` }} />
      ))}
    </span>
  );
}

export default function RoomTile({ tile, large = false, compact = false, onPin, onSpotlight, pinned = false }) {
  const { name, photo, seed, stream, muted, audioOn, videoOn, mirror, label, reconnecting, handRaised, handOrder, isHostTile, speaking, spotlighted, talkSec } = tile;
  const avatarSize = compact ? 44 : large ? 120 : 84;
  const talking = speaking && audioOn;
  const ring = handRaised ? "ring-2 ring-[#FBBF24]" : talking ? "ring-[3px] ring-[#34D399] shadow-[0_0_0_4px_rgba(52,211,153,0.14)]" : "ring-1 ring-[#2E2E35]";
  const pillTop = compact ? "left-1.5 top-1.5 px-2 py-0.5 text-[10px]" : "left-3 top-3 px-3 py-1.5 text-[12px]";

  return (
    <div className={`group relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#2b242c] to-[#201d23] transition-shadow ${ring}`}>
      <MediaView stream={stream} muted={muted} mirror={mirror} hidden={!videoOn} />
      {!videoOn && <Avatar name={name} photo={photo} size={avatarSize} seed={seed} />}

      {handRaised && (
        <div className={`absolute flex items-center gap-1.5 rounded-full bg-[#FBBF24] font-semibold text-gray-900 shadow ${pillTop}`}>
          <FaHandPaper className="text-[11px]" />
          {compact ? (handOrder ? `#${handOrder}` : "Hand") : handOrder > 1 ? `Hand raised · #${handOrder}` : "Hand raised"}
        </div>
      )}

      {spotlighted && (
        <div className={`absolute flex items-center gap-1.5 rounded-full bg-[#CD166E] font-semibold text-white shadow ${handRaised ? (compact ? "left-1.5 top-7" : "left-3 top-12") : pillTop}`}>
          <FaBullseye className="text-[10px]" /> {compact ? "" : "Spotlight"}
        </div>
      )}

      <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
        {talking && <SpeakingBars />}
        {onSpotlight && (
          <button
            type="button"
            onClick={onSpotlight}
            title={spotlighted ? "Remove spotlight" : "Spotlight for everyone"}
            aria-label={spotlighted ? "Remove spotlight" : "Spotlight for everyone"}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-opacity focus:opacity-100 group-hover:opacity-100 ${spotlighted ? "bg-[#CD166E] text-white opacity-100" : "bg-black/70 text-white opacity-0 hover:bg-black"}`}
          >
            <FaStar />
          </button>
        )}
        {onPin && (
          <button
            type="button"
            onClick={onPin}
            title={pinned ? "Unpin" : "Pin to the big screen"}
            aria-label={pinned ? "Unpin" : "Pin to the big screen"}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-opacity focus:opacity-100 group-hover:opacity-100 ${pinned ? "bg-white text-gray-900 opacity-100" : "bg-black/70 text-white opacity-0 hover:bg-black"}`}
          >
            <FaThumbtack />
          </button>
        )}
      </div>

      <div className="absolute bottom-2.5 left-2.5 flex max-w-[88%] items-center gap-2 rounded-full bg-black/80 px-3 py-1.5 text-xs text-white">
        {!audioOn && <FaMicrophoneSlash className="shrink-0 text-[11px] text-[#FB7185]" />}
        <span className="truncate font-medium">{label || name}</span>
        {isHostTile && <span className="shrink-0 rounded bg-white/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide">Host</span>}
        {large && talkSec > 0 && <span className="shrink-0 text-[11px] text-gray-400">· spoke {talkLabel(talkSec)}</span>}
      </div>

      {reconnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">Reconnecting…</div>
      )}
    </div>
  );
}
