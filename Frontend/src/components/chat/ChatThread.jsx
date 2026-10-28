import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  FaArrowLeft,
  FaPhoneAlt,
  FaVideo,
  FaEllipsisV,
  FaBellSlash,
  FaBell,
  FaInfoCircle,
  FaTimes,
  FaExpandAlt,
  FaCompressAlt,
  FaChevronUp,
} from "react-icons/fa";
import {
  useConversation,
  useChatMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useMarkConversationRead,
  useMuteConversation,
  useTypingNames,
  useIsOnline,
  useLastSeen,
} from "../../auth/server-state/chat/chat.hook";
import { CHAT_KEYS, newClientId } from "../../auth/server-state/chat/chatCache";
import { useChatStore } from "../../auth/store/chat/chatStore";
import { useChatUiStore } from "../../auth/store/chat/chatUiStore";
import useCall from "../../realtime/useCall";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import { formatDayLabel, formatLastSeen, isSameDay } from "./chatUtils";

const GROUP_GAP_MS = 5 * 60 * 1000;

const isLine = (m) => m.type === "system" || m.type === "call";

function Skeleton() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"} animate-pulse`}>
          <div className={`h-10 rounded-2xl bg-gray-200 ${i % 2 ? "w-1/2" : "w-2/3"}`} />
        </div>
      ))}
    </div>
  );
}

export default function ChatThread({ conversationId, listConv, onBack, expanded, onToggleExpand, onClose, canExpand, showBack }) {
  const qc = useQueryClient();
  const myKey = useChatStore((s) => s.myKey);
  const setInfoOpen = useChatUiStore((s) => s.setInfoOpen);
  const { startCall, inCall } = useCall();

  const { data: detail, isError: convMissing } = useConversation(conversationId);
  const conv = detail || listConv;
  const isGroup = conv ? conv.type !== "direct" : false;
  const other = conv?.otherPerson;

  const { messages, isLoading, hasOlder, isLoadingOlder, loadOlder } = useChatMessages(conversationId);
  const { send } = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const muteMutation = useMuteConversation();
  const { mutate: markRead } = useMarkConversationRead();

  const typingNames = useTypingNames(conversationId);
  const online = useIsOnline(!isGroup ? other?.key : null, !!other?.online);
  const lastSeen = useLastSeen(!isGroup ? other?.key : null);

  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const restoreRef = useRef(null);
  const lastIdRef = useRef(null);
  const pendingRef = useRef(new Map());
  const menuRef = useRef(null);

  useEffect(() => {
    if (conversationId) markRead(conversationId);
  }, [conversationId, markRead]);

  useEffect(() => {
    if (convMissing) onBack();
  }, [convMissing, onBack]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (restoreRef.current != null) {
      el.scrollTop = el.scrollHeight - restoreRef.current;
      restoreRef.current = null;
      return;
    }
    const last = messages[messages.length - 1];
    const lastId = last ? last.clientId || last.id : null;
    const sentByMe = last && last.senderKey === myKey && lastId !== lastIdRef.current;
    if (stickRef.current || sentByMe) el.scrollTop = el.scrollHeight;
    lastIdRef.current = lastId;
  }, [messages, myKey]);

  const fetchOlder = () => {
    const el = scrollRef.current;
    if (!el || !hasOlder || isLoadingOlder || restoreRef.current != null) return;
    restoreRef.current = el.scrollHeight - el.scrollTop;
    Promise.resolve(loadOlder()).catch(() => {
      restoreRef.current = null;
    });
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 60) fetchOlder();
  };

  const items = useMemo(() => {
    const out = [];
    let prev = null;
    messages.forEach((m, i) => {
      if (!prev || !isSameDay(prev.createdAt, m.createdAt)) {
        out.push({ kind: "day", key: `d-${m.id}`, label: formatDayLabel(m.createdAt) });
        prev = null;
      }
      const next = messages[i + 1];
      const joins = (a, b) =>
        a &&
        b &&
        !isLine(a) &&
        !isLine(b) &&
        a.senderKey === b.senderKey &&
        isSameDay(a.createdAt, b.createdAt) &&
        new Date(b.createdAt) - new Date(a.createdAt) < GROUP_GAP_MS;
      out.push({
        kind: "msg",
        key: m.clientId || m.id,
        m,
        first: !joins(prev, m),
        last: !joins(m, next),
      });
      prev = m;
    });
    return out;
  }, [messages]);

  const others = useMemo(() => (conv?.participants || []).filter((p) => p.key !== myKey), [conv, myKey]);

  const isSeen = (m) =>
    others.length > 0 &&
    others.every((p) => p.lastReadAt && new Date(p.lastReadAt) >= new Date(m.createdAt));

  const handleSend = ({ text, files }) => {
    if (editing) {
      editMessage.mutate(
        { messageId: editing.id, text },
        { onError: (err) => toast.error(err.message || "Couldn't edit the message.") },
      );
      setEditing(null);
      return;
    }
    const clientId = newClientId();
    const payload = { conversationId, text, files, replyTo: replyTo?.id };
    pendingRef.current.set(clientId, payload);
    setReplyTo(null);
    stickRef.current = true;
    send({ ...payload, clientId })
      .then(() => pendingRef.current.delete(clientId))
      .catch(() => {});
  };

  const handleRetry = (m) => {
    const saved = pendingRef.current.get(m.clientId);
    if (!saved) {
      toast.error("This message can't be retried. Please send it again.");
      return;
    }
    send({ ...saved, clientId: m.clientId })
      .then(() => pendingRef.current.delete(m.clientId))
      .catch(() => {});
  };

  const handleDiscard = (m) => {
    pendingRef.current.delete(m.clientId);
    qc.setQueryData(CHAT_KEYS.messages(conversationId), (old) =>
      old
        ? { ...old, pages: old.pages.map((p) => ({ ...p, messages: p.messages.filter((x) => !(x.clientId === m.clientId && x.failed)) })) }
        : old,
    );
  };

  const handleDelete = (m) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    deleteMessage.mutate(m.id, { onError: (err) => toast.error(err.message || "Couldn't delete the message.") });
  };

  const handleReply = (m) => {
    setEditing(null);
    setReplyTo({
      id: m.id,
      name: m.sender?.name || "",
      text: m.text || m.attachments?.[0]?.name || "Attachment",
    });
  };

  const handleEdit = (m) => {
    setReplyTo(null);
    setEditing({ id: m.id, text: m.text });
  };

  const jumpTo = (id) => {
    const el = scrollRef.current?.querySelector(`[data-mid="${id}"]`);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const call = (media) => {
    Promise.resolve(startCall({ conversationId, media })).catch((err) => toast.error(err?.message || "Couldn't start the call."));
  };

  const subtitle = (() => {
    if (typingNames.length) {
      return typingNames.length === 1 || !isGroup
        ? `${isGroup ? typingNames[0] : "typing"}${isGroup ? " is typing…" : "…"}`
        : `${typingNames.join(", ")} are typing…`;
    }
    if (!conv) return "";
    if (isGroup) return `${conv.participants.length} members`;
    if (online) return "Online";
    if (lastSeen) return `Last seen ${formatLastSeen(lastSeen)}`;
    return other?.designation || "Offline";
  })();

  const typing = typingNames.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#F7F9FB]">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {showBack && (
          <button type="button" onClick={onBack} className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
            <FaArrowLeft className="text-sm" />
          </button>
        )}

        <button
          type="button"
          onClick={() => isGroup && setInfoOpen(true)}
          className={`flex items-center gap-2.5 min-w-0 flex-1 text-left ${isGroup ? "cursor-pointer" : "cursor-default"}`}
        >
          <Avatar
            name={conv?.name || ""}
            photo={conv?.photo || ""}
            size={38}
            online={!isGroup ? online : null}
            group={isGroup}
            seed={other?.key || conversationId}
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{conv?.name || "…"}</p>
            <p className={`text-[11px] truncate ${typing ? "text-[#730042] font-medium" : online && !isGroup ? "text-emerald-600" : "text-gray-500"}`}>
              {subtitle}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            disabled={inCall}
            onClick={() => call("audio")}
            title={inCall ? "You're already in a call" : "Voice call"}
            className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center"
          >
            <FaPhoneAlt className="text-sm" />
          </button>
          <button
            type="button"
            disabled={inCall}
            onClick={() => call("video")}
            title={inCall ? "You're already in a call" : "Video call"}
            className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center"
          >
            <FaVideo className="text-sm" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center"
            >
              <FaEllipsisV className="text-sm" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                {isGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setInfoOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FaInfoCircle className="text-gray-400" /> Group info
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    muteMutation.mutate({ id: conversationId, muted: !conv?.muted });
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {conv?.muted ? <FaBell className="text-gray-400" /> : <FaBellSlash className="text-gray-400" />}
                  {conv?.muted ? "Unmute notifications" : "Mute notifications"}
                </button>
              </div>
            )}
          </div>

          {canExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              title={expanded ? "Collapse" : "Expand"}
              className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center"
            >
              {expanded ? <FaCompressAlt className="text-xs" /> : <FaExpandAlt className="text-xs" />}
            </button>
          )}
          <button type="button" onClick={onClose} title="Close" className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center">
            <FaTimes className="text-sm" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <Skeleton />
        ) : (
          <>
            {hasOlder && (
              <div className="flex justify-center mb-2">
                <button
                  type="button"
                  onClick={fetchOlder}
                  disabled={isLoadingOlder}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#730042] bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50 disabled:opacity-60"
                >
                  <FaChevronUp className="text-[9px]" />
                  {isLoadingOlder ? "Loading…" : "Load earlier messages"}
                </button>
              </div>
            )}

            {!messages.length && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-16">
                <Avatar name={conv?.name || ""} photo={conv?.photo || ""} size={64} group={isGroup} seed={other?.key || conversationId} />
                <p className="text-sm font-semibold text-gray-700 mt-3">{conv?.name}</p>
                <p className="text-xs mt-1">No messages yet. Say hello!</p>
              </div>
            )}

            {items.map((it) =>
              it.kind === "day" ? (
                <div key={it.key} className="flex justify-center my-3">
                  <span className="text-[11px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-0.5">
                    {it.label}
                  </span>
                </div>
              ) : (
                <MessageBubble
                  key={it.key}
                  m={it.m}
                  mine={!!it.m.senderKey && it.m.senderKey === myKey}
                  isGroup={isGroup}
                  first={it.first}
                  last={it.last}
                  seen={it.m.senderKey === myKey && isSeen(it.m)}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRetry={handleRetry}
                  onDiscard={handleDiscard}
                  onJump={jumpTo}
                />
              ),
            )}
          </>
        )}
      </div>

      {typing && (
        <div className="px-4 pb-1 bg-[#F7F9FB]">
          <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      <Composer
        key={`${conversationId}:${editing?.id || ""}`}
        initialText={editing?.text || ""}
        conversationId={conversationId}
        replyTo={replyTo}
        editing={editing}
        onCancelContext={() => {
          setReplyTo(null);
          setEditing(null);
        }}
        onSend={handleSend}
      />
    </div>
  );
}
