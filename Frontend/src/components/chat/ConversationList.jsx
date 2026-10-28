import { useMemo, useState } from "react";
import { FaSearch, FaPlus, FaTimes, FaExpandAlt, FaCompressAlt, FaBellSlash, FaRegCommentDots } from "react-icons/fa";
import { useConversations, useChatSearch, useIsOnline } from "../../auth/server-state/chat/chat.hook";
import { useChatStore } from "../../auth/store/chat/chatStore";
import Avatar from "./Avatar";
import { formatListTime } from "./chatUtils";

const TABS = [
  { id: "all", label: "All" },
  { id: "direct", label: "Direct" },
  { id: "group", label: "Groups" },
];

function Row({ conv, active, myKey, onClick }) {
  const other = conv.otherPerson;
  const online = useIsOnline(conv.type === "direct" ? other?.key : null, !!other?.online);
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
            {lm ? `${prefix}${lm.text || "Message deleted"}` : "No messages yet"}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
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
  const myKey = useChatStore((s) => s.myKey);
  const { data: conversations = [], isLoading } = useConversations(true);
  const { data: results = [], isFetching: searching } = useChatSearch(query);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      conversations.filter((c) => {
        if (tab === "direct" && c.type !== "direct") return false;
        if (tab === "group" && c.type === "direct") return false;
        if (!q) return true;
        return (
          (c.name || "").toLowerCase().includes(q) ||
          c.participants?.some((p) => (p.name || "").toLowerCase().includes(q))
        );
      }),
    [conversations, tab, q],
  );

  const nameOf = (id) => conversations.find((c) => c.id === id)?.name || "Conversation";
  const showMessageHits = q.length >= 2 && results.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-900">Messages</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNew}
            title="New chat"
            className="w-8 h-8 rounded-full bg-[#730042] text-white flex items-center justify-center hover:bg-[#5c0035] transition-colors"
          >
            <FaPlus className="text-xs" />
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
        {isLoading ? (
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