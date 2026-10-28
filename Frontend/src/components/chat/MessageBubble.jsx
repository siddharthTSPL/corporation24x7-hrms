import { FaCheck, FaCheckDouble, FaClock, FaReply, FaPen, FaTrash, FaFileAlt, FaPhoneAlt, FaExclamationCircle, FaBan } from "react-icons/fa";
import Avatar from "./Avatar";
import { colorFor, formatClock, formatSize, isAudio, isImage, isVideo } from "./chatUtils";

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

export default function MessageBubble({
  m,
  mine,
  isGroup,
  first,
  last,
  seen,
  onReply,
  onEdit,
  onDelete,
  onRetry,
  onDiscard,
  onJump,
}) {
  if (m.type === "system" || m.type === "call") {
    return (
      <div data-mid={m.id} className="flex justify-center my-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-100 rounded-full px-3 py-1 max-w-[85%] text-center">
          {m.type === "call" && <FaPhoneAlt className="text-[9px] flex-shrink-0" />}
          <span>{m.text}</span>
        </span>
      </div>
    );
  }

  const deleted = m.deleted;
  const canAct = !deleted && !m.pending && !m.failed;
  const canEdit = mine && canAct && m.type === "text";
  const showName = isGroup && !mine && first;
  const showAvatar = isGroup && !mine;

  const radius = mine
    ? `rounded-2xl ${first ? "" : "rounded-tr-md"} ${last ? "" : "rounded-br-md"}`
    : `rounded-2xl ${first ? "" : "rounded-tl-md"} ${last ? "" : "rounded-bl-md"}`;

  const bubbleTone = deleted
    ? "bg-gray-100 text-gray-400 italic"
    : mine
      ? `bg-[#730042] text-white ${m.failed ? "opacity-70" : ""}`
      : "bg-white border border-gray-200 text-gray-900";

  return (
    <div data-mid={m.id} className={`group flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${first ? "mt-2" : "mt-0.5"}`}>
      {showAvatar && (
        <div className="w-7 flex-shrink-0">
          {last && <Avatar name={m.sender?.name || ""} photo={m.sender?.photo || ""} size={28} seed={m.senderKey} />}
        </div>
      )}

      <div className={`relative max-w-[78%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
        {showName && (
          <span className="text-[11px] font-semibold mb-0.5 px-1" style={{ color: colorFor(m.senderKey) }}>
            {m.sender?.name || "Former member"}
          </span>
        )}

        <div className="relative">
          <div className={`px-3 py-2 text-sm break-words ${radius} ${bubbleTone}`}>
            {deleted ? (
              <span className="inline-flex items-center gap-1.5 text-xs">
                <FaBan className="text-[10px]" /> This message was deleted
              </span>
            ) : (
              <>
                {m.replyTo && (
                  <button
                    type="button"
                    onClick={() => m.replyTo.id && onJump(m.replyTo.id)}
                    className={`block w-full text-left mb-1.5 pl-2 border-l-2 rounded-sm py-0.5 ${mine ? "border-white/60 bg-white/10" : "border-[#730042] bg-gray-50"}`}
                  >
                    <span className={`block text-[11px] font-semibold ${mine ? "text-white/90" : "text-[#730042]"}`}>
                      {m.replyTo.senderName || "Message"}
                    </span>
                    <span className={`block text-xs truncate ${mine ? "text-white/80" : "text-gray-500"}`}>
                      {m.replyTo.deleted ? "Message deleted" : m.replyTo.text}
                    </span>
                  </button>
                )}

                {m.attachments?.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-1">
                    {m.attachments.map((a, i) => (
                      <Attachment key={a.url || `${a.name}-${i}`} a={a} mine={mine} />
                    ))}
                  </div>
                )}

                {m.text && <p className="whitespace-pre-wrap leading-snug">{m.text}</p>}
              </>
            )}

            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${mine && !deleted ? "text-white/70" : "text-gray-400"}`}>
              {m.editedAt && !deleted && <span>edited</span>}
              <span>{formatClock(m.createdAt)}</span>
              {mine && !deleted && (
                <>
                  {m.pending && <FaClock className="text-[9px]" />}
                  {m.failed && <FaExclamationCircle className="text-[10px] text-red-200" />}
                  {!m.pending && !m.failed && (seen ? <FaCheckDouble className="text-[10px] text-sky-300" /> : <FaCheck className="text-[10px]" />)}
                </>
              )}
            </div>
          </div>

          {canAct && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-white border border-gray-200 rounded-full shadow-sm px-1 py-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity ${mine ? "right-full mr-2" : "left-full ml-2"}`}
            >
              <button type="button" title="Reply" onClick={() => onReply(m)} className="w-6 h-6 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center">
                <FaReply className="text-[10px]" />
              </button>
              {canEdit && (
                <button type="button" title="Edit" onClick={() => onEdit(m)} className="w-6 h-6 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center">
                  <FaPen className="text-[10px]" />
                </button>
              )}
              {mine && (
                <button type="button" title="Delete" onClick={() => onDelete(m)} className="w-6 h-6 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center">
                  <FaTrash className="text-[10px]" />
                </button>
              )}
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
