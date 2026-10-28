import { useEffect, useRef } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useChatSearch } from "../../auth/server-state/chat/chat.hook";
import { formatListTime } from "./chatUtils";

// Search inside ONE chat. Clicking a result scrolls to that message.
export default function ChatSearchBar({ conversationId, query, setQuery, onPick, onClose }) {
  const { data: results = [], isFetching } = useChatSearch(query, conversationId);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            ref={ref}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder="Search in this chat"
            className="w-full pl-8 pr-3 py-2 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/40"
          />
        </div>
        <button type="button" onClick={onClose} className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center">
          <FaTimes className="text-sm" />
        </button>
      </div>

      {query.trim().length >= 2 && (
        <div className="max-h-48 overflow-y-auto border-t border-gray-100">
          {isFetching && !results.length && <p className="px-4 py-3 text-xs text-gray-400">Searching…</p>}
          {!isFetching && !results.length && <p className="px-4 py-3 text-xs text-gray-400">No messages found.</p>}
          {results.map((m) => (
            <button key={m.id} type="button" onClick={() => onPick(m)} className="w-full text-left px-4 py-2 hover:bg-gray-50">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-700 truncate">{m.sender?.name || "Message"}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{formatListTime(m.createdAt)}</span>
              </div>
              <p className="text-xs text-gray-500 truncate">{m.text}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
