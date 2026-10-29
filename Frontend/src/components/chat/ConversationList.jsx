import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FaSearch,
  FaTimes,
  FaExpandAlt,
  FaCompressAlt,
  FaBellSlash,
  FaRegCommentDots,
  FaCog,
  FaThumbtack,
  FaPhoneAlt,
  FaVideo,
  FaPhone,
  FaPhoneSlash,
  FaPhoneVolume,
  FaRegEdit,
} from "react-icons/fa";
import { useConversations, useChatSearch, useIsOnline, useIsInCall, useCallHistory, useTypingNames } from "../../auth/server-state/chat/chat.hook";
import { useChatStore } from "../../auth/store/chat/chatStore";
import { useChatUiStore } from "../../auth/store/chat/chatUiStore";
import Avatar from "./Avatar";
import { formatDuration, formatListTime } from "./chatUtils";
import RealtimeStatus from "./RealtimeStatus";
import useCall from "../../realtime/useCall";
import toast from "react-hot-toast";

const TABS = [
  { id: "all", label: "All" },
  { id: "direct", label: "Direct" },
  { id: "group", label: "Groups" },
  { id: "calls", label: "Calls" },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text = "", q = "" }) {
  const term = q.trim();
  if (!term) return text;
  const parts = String(text).split(new RegExp(`(${escapeRe(term)})`, "ig"));
  return parts.map((p, i) =>
    p.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="bg-[#730042]/10 text-[#730042] rounded px-0.5">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function IconBtn({ title, onClick, children, solid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
        solid
          ? "bg-gradient-to-br from-[#8F0A55] to-[#640038] text-white shadow-md shadow-[#730042]/25 hover:shadow-lg"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function CallRow({ call, onSelect, onCallBack, inCall }) {
  const counterpart = call.direction === "incoming" ? call.initiator : call.with?.[0];
  const label = call.kind === "meeting" ? "Meeting" : call.kind === "group" || (call.with?.length || 0) > 1
    ? `${call.with?.length || call.participantCount || 0} people`
    : counterpart?.name || "Unknown caller";
  const missed = call.outcome === "missed" || call.outcome === "declined";
  const isVideo = call.media === "video";
  const DirectionIcon = missed ? FaPhoneSlash : call.direction === "incoming" ? FaPhoneVolume : FaPhone;
  const details = call.outcome === "missed" ? "Missed call" : call.outcome === "declined" ? "Declined" : call.direction === "incoming" ? "Incoming" : "Outgoing";

  return (
    <div className="px-2">
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-colors">
        <button
          type="button"
          disabled={!call.conversationId}
          onClick={() => call.conversationId && onSelect(call.conversationId)}
          className="flex flex-1 min-w-0 items-center gap-3 text-left disabled:cursor-default"
        >
          <Avatar name={label} photo={call.kind === "direct" ? counterpart?.photo : ""} size={46} group={call.kind !== "direct"} seed={counterpart?.key || call.id} />
          <span className="flex-1 min-w-0">
            <span className="flex items-center justify-between gap-2">
              <span className={`truncate text-sm font-semibold ${missed ? "text-red-600" : "text-gray-900"}`}>{label}</span>
              <span className="shrink-0 text-[11px] text-gray-400">{formatListTime(call.startedAt)}</span>
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
              <DirectionIcon className={`text-[10px] ${missed ? "text-red-500" : "text-emerald-600"}`} />
              <span>{details}</span>
              <span>·</span>
              {isVideo ? <FaVideo className="text-[10px]" /> : <FaPhoneAlt className="text-[10px]" />}
              {call.outcome === "ended" && call.durationSec > 0 && (
                <>
                  <span>·</span>
                  <span>{formatDuration(call.durationSec)}</span>
                </>
              )}
            </span>
          </span>
        </button>
        {call.conversationId && (
          <button
            type="button"
            disabled={inCall}
            title={inCall ? "Already on a call" : isVideo ? "Video call back" : "Call back"}
            onClick={() => onCallBack(call)}
            className="w-10 h-10 shrink-0 rounded-full bg-[#F6E8EF] text-[#730042] hover:bg-[#730042] hover:text-white disabled:opacity-40 disabled:hover:bg-[#F6E8EF] disabled:hover:text-[#730042] flex items-center justify-center transition-colors active:scale-90"
          >
            {isVideo ? <FaVideo className="text-sm" /> : <FaPhoneAlt className="text-sm" />}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ conv, active, myKey, onClick }) {
  const other = conv.otherPerson;
  const online = useIsOnline(conv.type === "direct" ? other?.key : null, !!other?.online);
  const onCall = useIsInCall(conv.type === "direct" ? other?.key : null, !!other?.inCall);
  const typingNames = useTypingNames(conv.id);
  const lm = conv.lastMessage;
  const typing = typingNames.length > 0;

  let prefix = "";
  if (lm && lm.type !== "system" && lm.type !== "call") {
    if (lm.senderKey && lm.senderKey === myKey) prefix = "You: ";
    else if (conv.type !== "direct" && lm.senderName) prefix = `${lm.senderName.split(" ")[0]}: `;
  }

  const unread = conv.unread > 0;
  const preview =
    conv.type === "direct" && other?.onLeave
      ? "On leave"
      : onCall && conv.type === "direct"
        ? "On another call"
        : lm
          ? `${prefix}${lm.type === "sticker" ? "Sticker" : lm.text || "Message deleted"}`
          : "No messages yet";

  return (
    <div className="relative px-2">
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-1 rounded-r-full bg-[#730042]" />}
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-150 active:scale-[0.99] ${
          active ? "bg-gradient-to-r from-[#F6E8EF] to-[#FBF3F7] shadow-sm" : "hover:bg-gray-50"
        }`}
      >
        <Avatar
          name={conv.name}
          photo={conv.photo}
          size={48}
          online={conv.type === "direct" ? online : null}
          busy={conv.type === "direct" && onCall}
          group={conv.type !== "direct"}
          seed={conv.otherPerson?.key || conv.id}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[14px] truncate ${unread ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
              {conv.name || "Conversation"}
            </p>
            <span className={`text-[11px] flex-shrink-0 ${unread ? "text-[#730042] font-bold" : "text-gray-400"}`}>
              {formatListTime(conv.lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            {typing ? (
              <p className="text-[13px] truncate text-[#730042] font-medium flex items-center gap-1.5">
                <span className="inline-flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="chat-typing-dot w-1 h-1 rounded-full bg-[#730042]" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
                {conv.type === "direct" ? "typing" : `${typingNames[0].split(" ")[0]} is typing`}
              </p>
            ) : (
              <p
                className={`text-[13px] truncate ${
                  onCall && conv.type === "direct" ? "text-amber-600 font-medium" : unread ? "text-gray-800 font-medium" : "text-gray-500"
                }`}
              >
                {preview}
              </p>
            )}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {conv.pinned && <FaThumbtack className="text-[10px] text-gray-400 -rotate-45" />}
              {conv.muted && <FaBellSlash className="text-[10px] text-gray-400" />}
              {unread && (
                <span
                  className={`min-w-[20px] h-5 px-1.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm ${
                    conv.muted ? "bg-gray-400" : "bg-gradient-to-br from-[#8F0A55] to-[#640038]"
                  }`}
                >
                  {conv.unread > 99 ? "99+" : conv.unread}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

function ActiveNow({ people, onSelect }) {
  if (!people.length) return null;
  return (
    <div className="pb-2">
      <p className="px-5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Active now</p>
      <div className="chat-hide-scroll flex gap-3 overflow-x-auto px-4 pb-1">
        {people.map(({ conv, busy }) => (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv.id)}
            title={busy ? `${conv.name} is on a call` : conv.name}
            className="flex-shrink-0 w-[58px] flex flex-col items-center gap-1 group"
          >
            <span className={`p-[2px] rounded-full ${busy ? "bg-amber-400" : "bg-gradient-to-tr from-emerald-400 to-teal-500"} group-hover:scale-105 transition-transform`}>
              <span className="block p-[2px] rounded-full bg-white">
                <Avatar name={conv.name} photo={conv.photo} size={44} online busy={busy} seed={conv.otherPerson?.key || conv.id} />
              </span>
            </span>
            <span className="text-[11px] text-gray-600 font-medium truncate w-full text-center">{(conv.name || "").split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="px-4 py-3 space-y-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3 items-center">
          <div className="w-12 h-12 rounded-full chat-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded-full chat-shimmer w-1/2" />
            <div className="h-2.5 rounded-full chat-shimmer w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="px-5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">{children}</p>;
}

export default function ConversationList({ selectedId, onSelect, onNew, expanded, onToggleExpand, onClose, canExpand }) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const myKey = useChatStore((s) => s.myKey);
  const presence = useChatStore((s) => s.presence);
  const setSoundSettingsOpen = useChatUiStore((s) => s.setSoundSettingsOpen);
  const { data: conversations = [], isLoading } = useConversations(true);
  const { data: results = [], isFetching: searching } = useChatSearch(query);
  const { data: calls = [], isLoading: callsLoading, isError: callsError } = useCallHistory(tab === "calls");
  const { startCall, inCall } = useCall();

  const q = query.trim().toLowerCase();

  // pinned chats first; the sort is stable, so everything else stays newest-first
  const filtered = useMemo(
    () =>
      conversations
        .filter((c) => {
          if (tab === "direct" && c.type !== "direct") return false;
          if (tab === "group" && c.type === "direct") return false;
          if (!q) return true;
          return (
            (c.name || "").toLowerCase().includes(q) ||
            c.participants?.some((p) => (p.name || "").toLowerCase().includes(q))
          );
        })
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)),
    [conversations, tab, q],
  );

  const unreadChats = useMemo(() => conversations.filter((c) => c.unread > 0 && !c.muted).length, [conversations]);

  const activeNow = useMemo(
    () =>
      conversations
        .filter((c) => c.type === "direct" && c.otherPerson?.key)
        .map((c) => {
          const p = presence[c.otherPerson.key];
          const online = p ? p.online : !!c.otherPerson.online;
          const busy = p ? !!p.inCall : !!c.otherPerson.inCall;
          return { conv: c, online, busy };
        })
        .filter((x) => x.online)
        .slice(0, 14),
    [conversations, presence],
  );

  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);
  const showSections = tab !== "calls" && !q && pinned.length > 0;

  const nameOf = (id) => conversations.find((c) => c.id === id)?.name || "Conversation";
  const showMessageHits = q.length >= 2 && results.length > 0;

  const callBack = (call) => {
    if (inCall) {
      toast.error("You are already on a call.");
      return;
    }
    Promise.resolve(startCall({ conversationId: call.conversationId, media: call.media === "video" ? "video" : "audio" }))
      .catch((err) => toast.error(err?.message || "Could not start the call."));
  };

  const renderRow = (c) => <Row key={c.id} conv={c} active={c.id === selectedId} myKey={myKey} onClick={() => onSelect(c.id)} />;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[22px] leading-none font-extrabold tracking-tight text-gray-900">Chats</h2>
          <RealtimeStatus />
        </div>
        <div className="flex items-center gap-0.5">
          <IconBtn title="Call & sound settings" onClick={() => setSoundSettingsOpen(true)}>
            <FaCog className="text-[13px]" />
          </IconBtn>
          {canExpand && (
            <IconBtn title={expanded ? "Collapse" : "Expand"} onClick={onToggleExpand}>
              {expanded ? <FaCompressAlt className="text-xs" /> : <FaExpandAlt className="text-xs" />}
            </IconBtn>
          )}
          <IconBtn title="New chat" onClick={onNew} solid>
            <FaRegEdit className="text-[13px]" />
          </IconBtn>
          <IconBtn title="Close" onClick={onClose}>
            <FaTimes className="text-sm" />
          </IconBtn>
        </div>
      </div>

      <div className="px-4 pb-2.5">
        <div className="relative group">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs group-focus-within:text-[#730042] transition-colors" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and messages"
            className="w-full pl-9 pr-9 py-2.5 rounded-full bg-gray-100 border border-transparent text-sm placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#730042]/30 focus:ring-4 focus:ring-[#730042]/10 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300/70 text-white hover:bg-gray-400 flex items-center justify-center"
            >
              <FaTimes className="text-[9px]" />
            </button>
          )}
        </div>
      </div>

      <div className="mx-4 mb-2 p-1 rounded-full bg-gray-100 flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative z-10 flex-1 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              tab === t.id ? "text-[#730042]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === t.id && (
              <motion.span
                layoutId="chat-tab-pill"
                className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            {t.label}
            {t.id === "all" && unreadChats > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#730042] text-white text-[9px] font-bold flex items-center justify-center">
                {unreadChats > 99 ? "99+" : unreadChats}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="chat-scroll flex-1 min-h-0 overflow-y-auto pb-3">
        {tab === "calls" ? (
          callsLoading ? <Skeleton /> : callsError ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">Could not load call history. Please try again.</div>
          ) : calls.length ? (
            calls.map((call) => <CallRow key={call.id} call={call} onSelect={onSelect} onCallBack={callBack} inCall={inCall} />)
          ) : (
            <div className="flex flex-col items-center justify-center text-center px-8 py-14 text-gray-500">
              <div className="w-16 h-16 rounded-full bg-[#F6E8EF] flex items-center justify-center mb-3">
                <FaPhoneAlt className="text-xl text-[#730042]" />
              </div>
              <p className="text-sm font-semibold text-gray-800">No calls yet</p>
              <p className="text-xs mt-1">Your incoming, outgoing and missed calls will appear here.</p>
            </div>
          )
        ) : isLoading ? (
          <Skeleton />
        ) : (
          <>
            {tab === "all" && !q && <ActiveNow people={activeNow} onSelect={onSelect} />}

            {showSections ? (
              <>
                <SectionLabel>Pinned</SectionLabel>
                {pinned.map(renderRow)}
                {rest.length > 0 && <SectionLabel>All chats</SectionLabel>}
                {rest.map(renderRow)}
              </>
            ) : (
              filtered.map(renderRow)
            )}

            {!filtered.length && !showMessageHits && (
              <div className="flex flex-col items-center justify-center text-center px-8 py-14 text-gray-500">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <FaRegCommentDots className="text-2xl text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800">{q ? "No chats found" : "No conversations yet"}</p>
                <p className="text-xs mt-1">{q ? "Try a different name." : "Start a chat with anyone in your organisation."}</p>
                {!q && (
                  <button
                    type="button"
                    onClick={onNew}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-[#8F0A55] to-[#640038] text-white text-xs font-semibold shadow-md shadow-[#730042]/25 hover:shadow-lg transition-shadow"
                  >
                    <FaRegEdit /> New chat
                  </button>
                )}
              </div>
            )}

            {q.length >= 2 && (searching || showMessageHits) && (
              <div className="mt-2 border-t border-gray-100">
                <SectionLabel>Messages</SectionLabel>
                {searching && !results.length && <p className="px-5 py-2 text-xs text-gray-400">Searching…</p>}
                {results.map((m) => (
                  <div key={m.id} className="px-2">
                    <button
                      type="button"
                      onClick={() => onSelect(m.conversationId)}
                      className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-gray-800 truncate">{nameOf(m.conversationId)}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{formatListTime(m.createdAt)}</span>
                      </div>
                      <p className="text-[13px] text-gray-500 truncate mt-0.5">
                        {m.sender?.name ? `${m.sender.name.split(" ")[0]}: ` : ""}
                        <Highlight text={m.text} q={query} />
                      </p>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}