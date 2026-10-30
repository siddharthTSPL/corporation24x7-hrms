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
  FaChevronDown,
  FaSearch,
  FaImage,
  FaThumbtack,
  FaEraser,
  FaSignOutAlt,
} from "react-icons/fa";
import {
  useConversation,
  useChatMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  useReactToMessage,
  useMarkConversationRead,
  useMuteConversation,
  usePinConversation,
  useClearChat,
  useLeaveGroupChat,
  useTypingNames,
  useIsOnline,
  useIsInCall,
  useLastSeen,
} from "../../auth/server-state/chat/chat.hook";
import { CHAT_KEYS, newClientId, isMineMessage } from "../../auth/server-state/chat/chatCache";
import { useChatStore } from "../../auth/store/chat/chatStore";
import { useChatUiStore } from "../../auth/store/chat/chatUiStore";
import useCall from "../../realtime/useCall";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import WallpaperSheet from "./WallpaperSheet";
import ForwardSheet from "./ForwardSheet";
import DeleteDialog from "./DeleteDialog";
import ChatSearchBar from "./ChatSearchBar";
import { wallpaperStyle } from "./emojiData";
import { copyToClipboard, deliveryStatus, formatDayLabel, formatLastSeen, isSameDay, previewOf } from "./chatUtils";

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

function MenuButton({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}
    >
      <Icon className={danger ? "text-red-400" : "text-gray-400"} /> {label}
    </button>
  );
}

export default function ChatThread({ conversationId, listConv, onBack, expanded, onToggleExpand, onClose, canExpand, showBack }) {
  const qc = useQueryClient();
  const storeKey = useChatStore((s) => s.myKey);
  const presenceMap = useChatStore((s) => s.presence);
  const setInfoOpen = useChatUiStore((s) => s.setInfoOpen);
  const { startCall, inCall } = useCall();

  const { data: detail, isError: convMissing } = useConversation(conversationId);
  const conv = detail || listConv;
  const derivedKey =
    conv?.type === "direct" && conv.otherPerson && conv.participants?.length === 2
      ? conv.participants.find((p) => p.key !== conv.otherPerson.key)?.key
      : null;
  const myKey = derivedKey || storeKey;
  useEffect(() => {
    if (derivedKey && derivedKey !== useChatStore.getState().myKey) useChatStore.getState().setMyKey(derivedKey);
  }, [derivedKey]);
  const isGroup = conv ? conv.type !== "direct" : false;
  const other = conv?.otherPerson;
  const isGroupAdmin = conv?.type === "group" && conv?.myRole === "admin";

  const { messages, isLoading, hasOlder, isLoadingOlder, loadOlder } = useChatMessages(conversationId);
  const { send } = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const react = useReactToMessage();
  const muteMutation = useMuteConversation();
  const pinMutation = usePinConversation();
  const clearChat = useClearChat();
  const leaveGroup = useLeaveGroupChat();
  const { mutate: markRead } = useMarkConversationRead();

  const typingNames = useTypingNames(conversationId);
  const online = useIsOnline(!isGroup ? other?.key : null, !!other?.online);
  const otherInCall = useIsInCall(!isGroup ? other?.key : null, !!other?.inCall);
  const lastSeen = useLastSeen(!isGroup ? other?.key : null);
  const onlineGroupRecipients = isGroup && (conv?.participants || []).some((p) =>
    p.key !== myKey && (presenceMap[p.key] ? presenceMap[p.key].online : !!p.online),
  );

  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sheet, setSheet] = useState(null); // null | "wallpaper" | "forward"
  const [forwardMsg, setForwardMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [atBottom, setAtBottom] = useState(true);

  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const restoreRef = useRef(null);
  const lastIdRef = useRef(null);
  const pendingRef = useRef(new Map());
  const menuRef = useRef(null);
  const olderRef = useRef({ hasOlder: false, loadOlder: null });
  olderRef.current = { hasOlder, loadOlder };

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
    const sentByMe = last && isMineMessage(last, myKey) && lastId !== lastIdRef.current;
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
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickRef.current = near;
    setAtBottom((prev) => (prev === near ? prev : near));
    if (el.scrollTop < 60) fetchOlder();
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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

  const handleSend = ({ text, files = [], sticker }) => {
    if (editing) {
      if (sticker) return;
      editMessage.mutate(
        { messageId: editing.id, text },
        { onError: (err) => toast.error(err.message || "Couldn't edit the message.") },
      );
      setEditing(null);
      return;
    }
    const clientId = newClientId();
    const payload = { conversationId, text, files, sticker, replyTo: replyTo?.id };
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

  const runDelete = (scope) => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    deleteMessage.mutate(
      { messageId: target.id, scope },
      { onError: (err) => toast.error(err.message || "Couldn't delete the message.") },
    );
  };

  const handleReply = (m) => {
    setEditing(null);
    setReplyTo({ id: m.id, name: m.sender?.name || "", text: previewOf(m) });
  };

  const handleEdit = (m) => {
    setReplyTo(null);
    setEditing({ id: m.id, text: m.text });
  };

  const handleCopy = async (m) => {
    if (await copyToClipboard(m.text)) toast.success("Copied");
    else toast.error("Couldn't copy the message.");
  };

  const handleReact = (m, emoji) =>
    react.mutate({ conversationId, messageId: m.id, emoji }, { onError: (err) => toast.error(err.message || "Couldn't react.") });

  const flash = (el) => {
    el.classList.add("ring-2", "ring-[#730042]/50");
    setTimeout(() => el.classList.remove("ring-2", "ring-[#730042]/50"), 1400);
  };

  // Scrolls to a message; if it's older than what's loaded, keeps loading older pages (up to 6).
  const jumpTo = async (id) => {
    const find = () => scrollRef.current?.querySelector(`[data-mid="${id}"]`);
    for (let i = 0; i < 6; i += 1) {
      const el = find();
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        flash(el);
        return;
      }
      if (!olderRef.current.hasOlder) break;
      try {
        // eslint-disable-next-line no-await-in-loop
        await olderRef.current.loadOlder();
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 80));
      } catch {
        break;
      }
    }
    toast.error("Couldn't find that message in the loaded history.");
  };

  const call = (media) => {
    Promise.resolve(startCall({ conversationId, media })).catch((err) => toast.error(err?.message || "Couldn't start the call."));
  };

  const handleExitGroup = async () => {
    setMenuOpen(false);
    if (!window.confirm("Exit this group? You won't get new messages from it.")) return;
    try {
      await leaveGroup.mutateAsync(conversationId);
      toast.success("You left the group.");
      onBack();
    } catch (err) {
      toast.error(err.message || "Couldn't leave the group.");
    }
  };

  const handleClear = () => {
    setMenuOpen(false);
    if (!window.confirm("Clear all messages in this chat? This only clears them for you.")) return;
    clearChat.mutate(conversationId, { onError: (err) => toast.error(err.message || "Couldn't clear the chat.") });
  };

  const typing = typingNames.length > 0;
  const callsBlocked = inCall || (isGroup ? !onlineGroupRecipients : otherInCall || !online);
  const callTitle = (label) => (
    inCall ? "You're already in a call"
      : !isGroup && otherInCall ? `${conv?.name || "This person"} is on another call`
        : !isGroup && !online ? `${conv?.name || "This person"} is offline`
          : isGroup && !onlineGroupRecipients ? "Nobody else in this group is online"
          : label
  );

  const subtitle = (() => {
    if (typing) {
      return typingNames.length === 1 || !isGroup
        ? `${isGroup ? typingNames[0] : "typing"}${isGroup ? " is typing…" : "…"}`
        : `${typingNames.join(", ")} are typing…`;
    }
    if (!conv) return "";
    if (isGroup) return `${conv.participants.length} members`;
    if (other?.onLeave) return "On leave";
    if (otherInCall) return "On another call";
    if (online) return "Online";
    if (lastSeen) return `Last seen ${formatLastSeen(lastSeen)}`;
    return other?.designation || "Offline";
  })();

  const composerLock =
    conv?.type === "group" && conv.settings?.onlyAdminsCanSend && conv.myRole !== "admin" ? "Only admins can send messages in this group." : "";

  return (
    <div className="relative flex flex-col h-full min-h-0 bg-[#F8F7FA]">
      <div className="chat-header-glass relative z-10 flex items-center gap-2 px-3 py-3 border-b border-[#eee8ef] shadow-[0_2px_12px_rgba(36,10,28,0.035)]">
        {showBack && (
          <button type="button" onClick={onBack} className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center flex-shrink-0">
            <FaArrowLeft className="text-sm" />
          </button>
        )}

        <button
          type="button"
          onClick={() => (isGroup || other) && setInfoOpen(true)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
          title={isGroup ? "Group info" : "Contact information"}
        >
          <Avatar
            name={conv?.name || ""}
            photo={conv?.photo || ""}
            size={38}
            online={!isGroup ? online : null}
            busy={!isGroup && otherInCall}
            group={isGroup}
            seed={other?.key || conversationId}
          />
          <div className="min-w-0">
            <p className="text-[13px] font-bold tracking-[-0.01em] text-gray-900 truncate">{conv?.name || "…"}</p>
            <p
              className={`text-[11px] mt-0.5 truncate ${typing ? "text-[#730042] font-semibold" : otherInCall && !isGroup ? "text-amber-600 font-medium" : online && !isGroup ? "text-emerald-600 font-medium" : "text-gray-500"}`}
            >
              {subtitle}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            disabled={callsBlocked}
            onClick={() => call("audio")}
            title={callTitle("Voice call")}
            className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent flex items-center justify-center"
          >
            <FaPhoneAlt className="text-sm" />
          </button>
          <button
            type="button"
            disabled={callsBlocked}
            onClick={() => call("video")}
            title={callTitle("Video call")}
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
              <div className="absolute right-0 top-9 z-20 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                {isGroup && (
                  <MenuButton
                    icon={FaInfoCircle}
                    label="Group info"
                    onClick={() => {
                      setMenuOpen(false);
                      setInfoOpen(true);
                    }}
                  />
                )}
                <MenuButton
                  icon={FaSearch}
                  label="Search in chat"
                  onClick={() => {
                    setMenuOpen(false);
                    setSearchOpen(true);
                  }}
                />
                <MenuButton
                  icon={FaImage}
                  label="Chat background"
                  onClick={() => {
                    setMenuOpen(false);
                    setSheet("wallpaper");
                  }}
                />
                <MenuButton
                  icon={FaThumbtack}
                  label={conv?.pinned ? "Unpin chat" : "Pin chat"}
                  onClick={() => {
                    setMenuOpen(false);
                    pinMutation.mutate({ id: conversationId, pinned: !conv?.pinned }, { onError: (e) => toast.error(e.message || "Couldn't pin the chat.") });
                  }}
                />
                <MenuButton
                  icon={conv?.muted ? FaBell : FaBellSlash}
                  label={conv?.muted ? "Unmute notifications" : "Mute notifications"}
                  onClick={() => {
                    setMenuOpen(false);
                    muteMutation.mutate({ id: conversationId, muted: !conv?.muted });
                  }}
                />
                <MenuButton icon={FaEraser} label="Clear chat" onClick={handleClear} />
                {conv?.type === "group" && <MenuButton icon={FaSignOutAlt} label="Exit group" onClick={handleExitGroup} danger />}
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

      {searchOpen && (
        <ChatSearchBar
          conversationId={conversationId}
          query={searchQuery}
          setQuery={setSearchQuery}
          onClose={() => {
            setSearchOpen(false);
            setSearchQuery("");
          }}
          onPick={(m) => {
            setSearchOpen(false);
            setSearchQuery("");
            jumpTo(m.id);
          }}
        />
      )}

      <div className="chat-message-list relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          data-chat-scroll
          onScroll={onScroll}
          className="absolute inset-0 overflow-y-auto px-3 py-3"
          style={wallpaperStyle(conv?.wallpaper)}
        >
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
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <div className="bg-white/90 rounded-2xl px-6 py-5 flex flex-col items-center border border-gray-100">
                    <Avatar name={conv?.name || ""} photo={conv?.photo || ""} size={64} group={isGroup} seed={other?.key || conversationId} />
                    <p className="text-sm font-semibold text-gray-700 mt-3">{conv?.name}</p>
                    <p className="text-xs text-gray-500 mt-1">No messages yet. Say hello! 👋</p>
                  </div>
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
                    mine={isMineMessage(it.m, myKey)}
                    myKey={myKey}
                    isGroup={isGroup}
                    first={it.first}
                    last={it.last}
                    status={isMineMessage(it.m, myKey) ? deliveryStatus(it.m, others) : undefined}
                    canDeleteForAll={isGroupAdmin}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={setDeleteTarget}
                    onForward={(m) => {
                      setForwardMsg(m);
                      setSheet("forward");
                    }}
                    onReact={handleReact}
                    onCopy={handleCopy}
                    onRetry={handleRetry}
                    onDiscard={handleDiscard}
                    onJump={jumpTo}
                  />
                ),
              )}
            </>
          )}
        </div>

        {!atBottom && !isLoading && (
          <button
            type="button"
            onClick={scrollToBottom}
            title="Jump to latest"
            className="absolute bottom-3 right-4 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md text-gray-600 hover:bg-gray-50 flex items-center justify-center z-10"
          >
            <FaChevronDown className="text-sm" />
          </button>
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
        disabledReason={composerLock}
        onCancelContext={() => {
          setReplyTo(null);
          setEditing(null);
        }}
        onSend={handleSend}
      />

      {deleteTarget && (
        <DeleteDialog
          canDeleteForAll={!deleteTarget.deleted && (isMineMessage(deleteTarget, myKey) || isGroupAdmin)}
          onDeleteForMe={() => runDelete("me")}
          onDeleteForAll={() => runDelete("everyone")}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {sheet === "wallpaper" && (
        <div className="absolute inset-0 z-30 bg-white">
          <WallpaperSheet conversationId={conversationId} current={conv?.wallpaper || ""} onClose={() => setSheet(null)} />
        </div>
      )}

      {sheet === "forward" && forwardMsg && (
        <div className="absolute inset-0 z-30 bg-white">
          <ForwardSheet
            message={forwardMsg}
            onClose={() => {
              setSheet(null);
              setForwardMsg(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
