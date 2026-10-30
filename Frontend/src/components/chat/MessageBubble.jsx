import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FaCheck,
  FaCheckDouble,
  FaClock,
  FaReply,
  FaPen,
  FaTrash,
  FaFileAlt,
  FaPhoneAlt,
  FaExclamationCircle,
  FaBan,
  FaRegSmile,
  FaCopy,
  FaShare,
  FaChevronDown,
} from "react-icons/fa";
import Avatar from "./Avatar";
import StickerView from "./StickerView";
import { QUICK_REACTIONS } from "./emojiData";
import { colorFor, formatClock, formatSize, groupReactions, isAudio, isEmojiOnly, isImage, isVideo, splitLinks } from "./chatUtils";

function Attachment({ a, mine }) {
  if (a.uploading || !a.url) {
    return (
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${mine ? "bg-white/15" : "bg-gray-100"}`}>
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span className="truncate max-w-[180px]">{a.name || "Uploading"}</span>
      </div>
    );
  }
  if (isImage(a.mime)) {
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={a.url} alt={a.name} loading="lazy" className="rounded-lg max-h-56 max-w-full object-cover" />
      </a>
    );
  }
  if (isAudio(a.mime)) {
    return <audio controls src={a.url} className="max-w-[230px] h-10" />;
  }
  if (isVideo(a.mime)) {
    return <video controls src={a.url} className="rounded-lg max-h-56 max-w-full" />;
  }
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${mine ? "bg-white/15 hover:bg-white/25" : "bg-gray-100 hover:bg-gray-200"} transition-colors`}
    >
      <FaFileAlt className="text-base flex-shrink-0 opacity-80" />
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate max-w-[180px]">{a.name || "File"}</p>
        <p className="text-[10px] opacity-70">{formatSize(a.size)}</p>
      </div>
    </a>
  );
}

// sent = one tick, delivered = two grey ticks, seen = two blue ticks
function Ticks({ status, tone }) {
  const base = tone === "dark" ? "text-gray-400" : "text-white/70";
  const seen = tone === "dark" ? "text-sky-500" : "text-sky-300";
  if (status === "sending") return <FaClock className={`text-[9px] ${base}`} title="Sending" />;
  if (status === "failed") return <FaExclamationCircle className="text-[10px] text-red-400" title="Not sent" />;
  if (status === "seen") return <FaCheckDouble className={`text-[10px] ${seen}`} title="Seen" />;
  if (status === "delivered") return <FaCheckDouble className={`text-[10px] ${base}`} title="Delivered" />;
  return <FaCheck className={`text-[10px] ${base}`} title="Sent" />;
}

function Linkified({ text, mine }) {
  return (
    <p className="whitespace-pre-wrap leading-snug">
      {splitLinks(text).map((part, i) =>
        part.url ? (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline break-all ${mine ? "text-sky-200" : "text-sky-700"}`}
          >
            {part.url}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </p>
  );
}

// Decides whether a popover should open upwards (not enough room below inside the scrolling chat).
function useOpenUp(open, ref) {
  const [up, setUp] = useState(false);
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const scroller = ref.current.closest("[data-chat-scroll]");
    const box = ref.current.getBoundingClientRect();
    const limit = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    setUp(limit.bottom - box.bottom < 230 && box.top - limit.top > 230);
  }, [open, ref]);
  return up;
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left whitespace-nowrap ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}
    >
      <Icon className={`text-xs ${danger ? "text-red-400" : "text-gray-400"}`} /> {label}
    </button>
  );
}

export default function MessageBubble({
  m,
  mine,
  myKey,
  isGroup,
  first,
  last,
  status,
  canDeleteForAll,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
  onCopy,
  onRetry,
  onDiscard,
  onJump,
}) {
  const [panel, setPanel] = useState(null); // null | "react" | "more"
  const wrapRef = useRef(null);
  const up = useOpenUp(!!panel, wrapRef);

  useEffect(() => {
    if (!panel) return undefined;
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setPanel(null);
    };
    const esc = (e) => e.key === "Escape" && setPanel(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [panel]);

  if (m.type === "system" || m.type === "call") {
    return (
      <div data-mid={m.id} className="flex justify-center my-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 bg-white/90 border border-gray-200 rounded-full px-3 py-1 max-w-[85%] text-center">
          {m.type === "call" && <FaPhoneAlt className="text-[9px] flex-shrink-0" />}
          <span>{m.text}</span>
        </span>
      </div>
    );
  }

  const deleted = m.deleted;
  const canAct = !deleted && !m.pending && !m.failed;
  const canEdit = mine && canAct && m.type === "text";
  const canDeleteEveryone = mine || canDeleteForAll;
  const showName = isGroup && !mine && first;
  const showAvatar = isGroup && !mine;
  const isSticker = m.type === "sticker" && !deleted;
  const bigEmoji = !deleted && m.type === "text" && !m.attachments?.length && !m.replyTo && isEmojiOnly(m.text);
  const bare = isSticker || bigEmoji; // no coloured bubble around it
  const reactions = groupReactions(m.reactions, myKey);

  const radius = mine
    ? `rounded-2xl ${first ? "" : "rounded-tr-md"} ${last ? "" : "rounded-br-md"}`
    : `rounded-2xl ${first ? "" : "rounded-tl-md"} ${last ? "" : "rounded-bl-md"}`;

  const bubbleTone = deleted
    ? "bg-gray-100 text-gray-400 italic"
    : bare
      ? "bg-transparent text-gray-900"
      : mine
        ? `bg-[#730042] text-white ${m.failed ? "opacity-70" : ""}`
        : "bg-white border border-gray-200 text-gray-900";

  const footerTone = mine && !deleted && !bare ? "text-white/70" : "text-gray-400";
  const tickTone = bare ? "dark" : "light";
  const pick = (fn) => () => {
    setPanel(null);
    fn(m);
  };
  const popPos = `${up ? "bottom-full mb-1" : "top-full mt-1"} ${mine ? "right-0" : "left-0"}`;

  return (
    <div
      data-mid={m.id}
      className={`group flex items-end gap-2 transition-shadow rounded-xl ${mine ? "justify-end" : "justify-start"} ${first ? "mt-2" : "mt-0.5"} ${reactions.length ? "mb-3" : ""}`}
    >
      {showAvatar && (
        <div className="w-7 flex-shrink-0">
          {last && <Avatar name={m.sender?.name || ""} photo={m.sender?.photo || ""} size={28} seed={m.senderKey} />}
        </div>
      )}

      <div ref={wrapRef} className={`relative max-w-[82%] sm:max-w-[76%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
        {showName && (
          <span className="text-[11px] font-semibold mb-0.5 px-1" style={{ color: colorFor(m.senderKey) }}>
            {m.sender?.name || "Former member"}
          </span>
        )}

        <div
          className="relative"
          onContextMenu={(e) => {
            if (!canAct) return;
            e.preventDefault();
            setPanel("more");
          }}
        >
          <div className={`${bare ? "px-1 py-0.5" : "px-3.5 py-2.5"} chat-message-bubble ${mine && !bare && !deleted ? "chat-message-bubble-mine" : !mine && !bare && !deleted ? "chat-message-bubble-theirs" : ""} text-[13px] leading-[1.55] break-words ${radius} ${bubbleTone}`}>
            {deleted ? (
              <span className="inline-flex items-center gap-1.5 text-xs">
                <FaBan className="text-[10px]" /> This message was deleted
              </span>
            ) : (
              <>
                {m.forwarded && (
                  <p className={`flex items-center gap-1 text-[11px] italic mb-1 ${mine && !bare ? "text-white/70" : "text-gray-400"}`}>
                    <FaShare className="text-[9px]" /> Forwarded
                  </p>
                )}

                {m.replyTo && (
                  <button
                    type="button"
                    onClick={() => m.replyTo.id && onJump(m.replyTo.id)}
                    className={`block w-full text-left mb-1.5 pl-2 border-l-2 rounded-sm py-0.5 ${mine && !bare ? "border-white/60 bg-white/10" : "border-[#730042] bg-gray-50"}`}
                  >
                    <span className={`block text-[11px] font-semibold ${mine && !bare ? "text-white/90" : "text-[#730042]"}`}>
                      {m.replyTo.senderName || "Message"}
                    </span>
                    <span className={`block text-xs truncate ${mine && !bare ? "text-white/80" : "text-gray-500"}`}>
                      {m.replyTo.deleted ? "Message deleted" : m.replyTo.text || "Attachment"}
                    </span>
                  </button>
                )}

                {isSticker && <StickerView id={m.text} />}

                {m.attachments?.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-1">
                    {m.attachments.map((a, i) => (
                      <Attachment key={a.url || `${a.name}-${i}`} a={a} mine={mine} />
                    ))}
                  </div>
                )}

                {!isSticker && m.text && (bigEmoji ? <p className="text-4xl leading-tight">{m.text}</p> : <Linkified text={m.text} mine={mine} />)}
              </>
            )}

            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${footerTone}`}>
              {m.editedAt && !deleted && <span>edited</span>}
              <span>{formatClock(m.createdAt)}</span>
              {mine && !deleted && <Ticks status={status} tone={tickTone} />}
            </div>
          </div>

          {canAct && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white border border-gray-200 rounded-full shadow-sm px-1 py-0.5 transition-opacity ${panel ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100"} ${mine ? "right-full mr-2" : "left-full ml-2"}`}
            >
              <button type="button" title="React" onClick={() => setPanel(panel === "react" ? null : "react")} className="w-6 h-6 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center">
                <FaRegSmile className="text-[11px]" />
              </button>
              <button type="button" title="Reply" onClick={() => onReply(m)} className="w-6 h-6 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center">
                <FaReply className="text-[10px]" />
              </button>
              <button type="button" title="More" onClick={() => setPanel(panel === "more" ? null : "more")} className="w-6 h-6 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center">
                <FaChevronDown className="text-[10px]" />
              </button>
            </div>
          )}

          {panel === "react" && (
            <div className={`absolute z-30 flex items-center gap-0.5 bg-white border border-gray-200 rounded-full shadow-lg px-1.5 py-1 ${popPos}`}>
              {QUICK_REACTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setPanel(null);
                    onReact(m, e);
                  }}
                  className="w-8 h-8 text-xl rounded-full hover:bg-gray-100 hover:scale-125 transition-transform flex items-center justify-center"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {panel === "more" && (
            <div className={`absolute z-30 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 ${popPos}`}>
              <MenuItem icon={FaReply} label="Reply" onClick={pick(onReply)} />
              {m.text && m.type !== "sticker" && <MenuItem icon={FaCopy} label="Copy" onClick={pick(onCopy)} />}
              <MenuItem icon={FaShare} label="Forward" onClick={pick(onForward)} />
              {canEdit && <MenuItem icon={FaPen} label="Edit" onClick={pick(onEdit)} />}
              <MenuItem icon={FaTrash} label={canDeleteEveryone ? "Delete…" : "Delete for me"} onClick={pick(onDelete)} danger />
            </div>
          )}

          {reactions.length > 0 && (
            <div className={`absolute -bottom-3.5 flex gap-1 ${mine ? "right-2" : "left-2"}`}>
              {reactions.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onReact(m, r.emoji)}
                  title={r.mine ? "Tap to remove your reaction" : "React too"}
                  className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-xs shadow-sm ${r.mine ? "bg-[#F6E8EF] border-[#730042]/40" : "bg-white border-gray-200"}`}
                >
                  <span className="leading-none">{r.emoji}</span>
                  {r.count > 1 && <span className="text-[10px] font-semibold text-gray-600">{r.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {m.failed && (
          <div className="flex items-center gap-2 mt-1 text-[11px] text-red-500">
            <span>Not sent</span>
            <button type="button" onClick={() => onRetry(m)} className="font-semibold underline">Retry</button>
            <button type="button" onClick={() => onDiscard(m)} className="text-gray-500 underline">Discard</button>
          </div>
        )}
      </div>
    </div>
  );
}
