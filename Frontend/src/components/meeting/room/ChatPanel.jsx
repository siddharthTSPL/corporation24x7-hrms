import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaPaperPlane, FaPaperclip, FaExclamationCircle, FaFileAlt } from "react-icons/fa";
import useCall from "../../../realtime/useCall";
import { useChatMessages, useSendMessage, useMarkConversationRead } from "../../../auth/server-state/chat/chat.hook";
import Avatar from "../../chat/Avatar";
import { formatClock } from "../../chat/chatUtils";
import { PanelHeader } from "./RoomMedia";

const URL_RE = /(https?:\/\/[^\s]+)/g;

function Linkified({ text }) {
  const parts = String(text || "").split(URL_RE);
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all text-sky-300 underline">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

function Bubble({ m, mine, showHeader }) {
  const name = m.sender?.name || "Participant";
  const attachments = m.attachments || [];
  return (
    <div className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
      <div className="w-7 shrink-0 pt-0.5">{showHeader && !mine ? <Avatar name={name} photo={m.sender?.photo} size={28} seed={m.senderKey} /> : null}</div>
      <div className={`flex min-w-0 max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
        {showHeader && (
          <p className="mb-1 flex items-baseline gap-2 text-[11px] text-gray-400">
            <span className="font-semibold text-gray-300">{mine ? "You" : name}</span>
            <span>{formatClock(m.createdAt)}</span>
          </p>
        )}
        <div className={`rounded-2xl px-3 py-2 ${mine ? "rounded-tr-md bg-[#730042] text-white" : "rounded-tl-md bg-white/10 text-gray-100"} ${m.failed ? "ring-1 ring-red-400" : ""} ${m.pending ? "opacity-70" : ""}`}>
          {m.deletedAt ? <p className="text-xs italic text-gray-400">This message was deleted</p> : m.text ? <Linkified text={m.text} /> : null}
          {attachments.map((a, i) => (
            <a key={i} href={a.url || undefined} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-2 rounded-lg bg-black/25 px-2.5 py-2 text-xs hover:bg-black/40">
              <FaFileAlt className="shrink-0 text-gray-300" />
              <span className="truncate">{a.name || "Attachment"}</span>
              {a.uploading && <span className="text-[10px] text-gray-400">Uploading…</span>}
            </a>
          ))}
        </div>
        {m.failed && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-red-300">
            <FaExclamationCircle /> Not sent
          </p>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel({ onClose, onSeen }) {
  const { active, myKey, isHost } = useCall();
  const conversationId = active?.conversationId;
  const { messages, isLoading, loadOlder, hasOlder, isLoadingOlder } = useChatMessages(conversationId);
  const { send } = useSendMessage();
  const { mutate: markRead } = useMarkConversationRead();
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const fileRef = useRef(null);
  const disabled = active?.settings?.chatEnabled === false && !isHost;

  const lastId = messages.length ? messages[messages.length - 1].id : null;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [lastId, messages.length]);

  useEffect(() => {
    if (!conversationId || !lastId) return;
    markRead(conversationId);
    if (onSeen) onSeen(lastId);
  }, [conversationId, lastId, markRead, onSeen]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 40 && hasOlder && !isLoadingOlder) loadOlder();
  };

  const rows = useMemo(
    () =>
      messages.map((m, i) => {
        const prev = messages[i - 1];
        const close = prev && prev.senderKey === m.senderKey && new Date(m.createdAt) - new Date(prev.createdAt) < 120000;
        return { m, showHeader: !close };
      }),
    [messages],
  );

  const submit = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if ((!body && !files.length) || !conversationId || disabled) return;
    const picked = files;
    setText("");
    setFiles([]);
    stickRef.current = true;
    try {
      await send({ conversationId, text: body, files: picked });
    } catch (err) {
      toast.error(err?.message || "Couldn't send your message.");
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) submit(e);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader title="In-meeting chat" subtitle="Messages are saved with this meeting" onClose={onClose} />

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {isLoadingOlder && <p className="text-center text-[11px] text-gray-500">Loading earlier messages…</p>}
        {isLoading && <p className="py-10 text-center text-xs text-gray-500">Loading chat…</p>}
        {!isLoading && !messages.length && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xl">💬</div>
            <p className="text-sm font-medium text-gray-200">No messages yet</p>
            <p className="text-xs text-gray-500">Say hi to everyone in the meeting.</p>
          </div>
        )}
        {rows.map(({ m, showHeader }) => (
          <Bubble key={m.clientId || m.id} m={m} mine={m.senderKey === myKey} showHeader={showHeader} />
        ))}
      </div>

      {disabled && <p className="mx-4 mb-2 rounded-lg bg-amber-500/15 px-3 py-2 text-center text-xs text-amber-200">The host has turned chat off for this meeting.</p>}

      {files.length > 0 && (
        <div className="mx-4 mb-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span key={i} className="flex max-w-full items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-gray-200">
              <span className="truncate">{f.name}</span>
              <button type="button" onClick={() => setFiles((list) => list.filter((_, j) => j !== i))} className="text-gray-400 hover:text-white" aria-label="Remove file">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-white/10 p-3">
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            setFiles((list) => [...list, ...Array.from(e.target.files || [])].slice(0, 5));
            e.target.value = "";
          }}
        />
        <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()} title="Attach a file" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40">
          <FaPaperclip />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          disabled={disabled}
          rows={1}
          maxLength={4000}
          placeholder={disabled ? "Chat is turned off" : "Send a message to everyone"}
          className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#CD166E]/50 disabled:opacity-50"
        />
        <button type="submit" disabled={disabled || (!text.trim() && !files.length)} title="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#730042] text-white hover:bg-[#8c0050] disabled:opacity-40">
          <FaPaperPlane className="text-sm" />
        </button>
      </form>
    </div>
  );
}
