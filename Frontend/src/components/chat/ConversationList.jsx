import { useMemo, useState } from "react";
import { FaSearch, FaUsers, FaTimes, FaExpandAlt, FaCompressAlt, FaBellSlash, FaRegCommentDots, FaCog, FaThumbtack, FaPhoneAlt, FaVideo, FaPhone, FaPhoneSlash, FaPhoneVolume } from "react-icons/fa";
import { useConversations, useChatSearch, useIsOnline, useIsInCall, useCallHistory } from "../../auth/server-state/chat/chat.hook";
import { useChatStore } from "../../auth/store/chat/chatStore";
import Avatar from "./Avatar";
import { formatDuration, formatListTime } from "./chatUtils";
import RealtimeStatus from "./RealtimeStatus";
import CallSoundSettings from "./CallSoundSettings";
import useCall from "../../realtime/useCall";
import toast from "react-hot-toast";

const TABS = [
  { id: "all", label: "All" },
  { id: "direct", label: "Direct" },
  { id: "group", label: "Groups" },
  { id: "calls", label: "Calls" },
];

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
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
      <button type="button" disabled={!call.conversationId} onClick={() => call.conversationId && onSelect(call.conversationId)} className="flex flex-1 min-w-0 items-center gap-3 text-left disabled:cursor-default">
        <Avatar name={label} photo={call.kind === "direct" ? counterpart?.photo : ""} size={44} group={call.kind !== "direct"} seed={counterpart?.key || call.id} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-gray-800">{label}</span>
            <span className="shrink-0 text-[11px] text-gray-400">{formatListTime(call.startedAt)}</span>
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <DirectionIcon className={`text-[10px] ${missed ? "text-red-500" : "text-emerald-600"}`} />
            <span>{details}</span><span>·</span>
            {isVideo ? <FaVideo className="text-[10px]" /> : <FaPhoneAlt className="text-[10px]" />}
            {call.outcome === "ended" && call.durationSec > 0 && <><span>·</span><span>{formatDuration(call.durationSec)}</span></>}
          </span>
        </span>
      </button>
      {call.conversationId && (
        <button type="button" disabled={inCall} title={inCall ? "Already on a call" : isVideo ? "Video call back" : "Call back"} onClick={() => onCallBack(call)} className="w-9 h-9 shrink-0 rounded-full text-[#730042] hover:bg-[#F6E8EF] disabled:opacity-40 flex items-center justify-center">
          {isVideo ? <FaVideo className="text-sm" /> : <FaPhoneAlt className="text-sm" />}
        </button>
      )}
    </div>
  );
}

function Row({ conv, active, myKey, onClick }) {
  const other = conv.otherPerson;
  const online = useIsOnline(conv.type === "direct" ? other?.key : null, !!other?.online);
  const onCall = useIsInCall(conv.type === "direct" ? other?.key : null, !!other?.inCall);
  const lm = conv.lastMessage;

  let prefix = "";
  if (lm && lm.type !== "system" && lm.type !== "call") {
    if (lm.senderKey && lm.senderKey === myKey) prefix = "You: ";
    else if (conv.type !== "direct" && lm.senderName) prefix = `${lm.senderName.split(" ")[0]}: `;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${active ? "bg-[#F6E8EF]" : "hover:bg-gray-50"}`}
    >
      <Avatar
        name={conv.name}
        photo={conv.photo}
        size={44}
        online={conv.type === "direct" ? online : null}
        busy={conv.type === "direct" && onCall}
        group={conv.type !== "direct"}
        seed={conv.otherPerson?.key || conv.id}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${conv.unread ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
            {conv.name || "Conversation"}
          </p>
          <span className={`text-[11px] flex-shrink-0 ${conv.unread ? "text-[#730042] font-semibold" : "text-gray-400"}`}>
            {formatListTime(conv.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-xs truncate ${conv.unread ? "text-gray-800 font-medium" : "text-gray-500"}`}>
            {onCall && conv.type === "direct" ? "On another call" : lm ? `${prefix}${lm.type === "sticker" ? "Sticker" : lm.text || "Message deleted"}` : "No messages yet"}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {conv.pinned && <FaThumbtack className="text-[10px] text-gray-400 -rotate-45" />}
            {conv.muted && <FaBellSlash className="text-[10px] text-gray-400" />}
            {conv.unread > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#730042] text-white text-[10px] font-bold flex items-center justify-center">
                {conv.unread > 99 ? "99+" : conv.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function Skeleton() {
  return (
    <div className="px-4 py-3 space-y-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-11 h-11 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-2.5 bg-gray-200 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ConversationList({ selectedId, onSelect, onNew, expanded, onToggleExpand, onClose, canExpand }) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [soundOpen, setSoundOpen] = useState(false);
  const myKey = useChatStore((s) => s.myKey);
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

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">Messages</h2>
          <RealtimeStatus />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSoundOpen(true)}
            title="Call & sound settings"
            className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center"
          >
            <FaCog className="text-xs" />
          </button>
          <button
            type="button"
            onClick={onNew}
            title="New chat"
            className="w-8 h-8 rounded-full bg-[#730042] text-white flex items-center justify-center hover:bg-[#5c0035] transition-colors"
          >
            <FaUsers className="text-xs" />
          </button>
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
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>
      </div>

      {soundOpen && <CallSoundSettings onClose={() => setSoundOpen(false)} />}

      <div className="px-4 pb-2">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and messages"
            className="w-full pl-8 pr-8 py-2 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 px-4 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${tab === t.id ? "bg-[#730042] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-100">
        {tab === "calls" ? (
          callsLoading ? <Skeleton /> : callsError ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">Could not load call history. Please try again.</div>
          ) : calls.length ? calls.map((call) => <CallRow key={call.id} call={call} onSelect={onSelect} onCallBack={callBack} inCall={inCall} />) : (
            <div className="flex flex-col items-center justify-center text-center px-8 py-14 text-gray-500">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3"><FaPhoneAlt className="text-xl text-gray-400" /></div>
              <p className="text-sm font-semibold text-gray-700">No calls yet</p>
              <p className="text-xs mt-1">Your incoming, outgoing and missed calls will appear here.</p>
            </div>
          )
        ) : isLoading ? (
          <Skeleton />
        ) : (
          <>
            {filtered.map((c) => (
              <Row key={c.id} conv={c} active={c.id === selectedId} myKey={myKey} onClick={() => onSelect(c.id)} />
            ))}

            {!filtered.length && !showMessageHits && (
              <div className="flex flex-col items-center justify-center text-center px-8 py-14 text-gray-500">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <FaRegCommentDots className="text-2xl text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">{q ? "No chats found" : "No conversations yet"}</p>
                <p className="text-xs mt-1">{q ? "Try a different name." : "Start a chat with anyone in your organisation."}</p>
                {!q && (
                  <button
                    type="button"
                    onClick={onNew}
                    className="mt-4 px-4 py-2 rounded-full bg-[#730042] text-white text-xs font-semibold hover:bg-[#5c0035]"
                  >
                    New chat
                  </button>
                )}
              </div>
            )}

            {q.length >= 2 && (searching || showMessageHits) && (
              <div className="border-t border-gray-100">
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Messages
                </p>
                {searching && !results.length && <p className="px-4 py-2 text-xs text-gray-400">Searching…</p>}
                {results.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelect(m.conversationId)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-800 truncate">{nameOf(m.conversationId)}</p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{formatListTime(m.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {m.sender?.name ? `${m.sender.name.split(" ")[0]}: ` : ""}
                      {m.text}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
