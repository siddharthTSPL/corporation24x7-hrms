import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaArrowLeft, FaCheck, FaSearch } from "react-icons/fa";
import { useConversations, useForwardMessage } from "../../auth/server-state/chat/chat.hook";
import Avatar from "./Avatar";
import { previewOf } from "./chatUtils";

const MAX_TARGETS = 5;

export default function ForwardSheet({ message, onClose, onDone }) {
  const { data: conversations = [] } = useConversations(true);
  const forward = useForwardMessage();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState([]);

  const q = query.trim().toLowerCase();
  const list = useMemo(
    () => conversations.filter((c) => !q || (c.name || "").toLowerCase().includes(q)),
    [conversations, q],
  );

  const toggle = (id) =>
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_TARGETS) {
        toast.error(`You can forward to ${MAX_TARGETS} chats at a time.`);
        return prev;
      }
      return [...prev, id];
    });

  const send = async () => {
    try {
      await forward.mutateAsync({ messageId: message.id, conversationIds: picked });
      toast.success(`Forwarded to ${picked.length} chat${picked.length > 1 ? "s" : ""}`);
      onDone?.(picked);
      onClose();
    } catch (err) {
      toast.error(err.message || "Couldn't forward the message.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
        <button type="button" onClick={onClose} className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center">
          <FaArrowLeft className="text-sm" />
        </button>
        <h3 className="text-base font-bold text-gray-900">Forward to…</h3>
      </div>

      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Message</p>
        <p className="text-sm text-gray-700 truncate">{previewOf(message)}</p>
      </div>

      <div className="px-4 py-3">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full pl-8 pr-3 py-2 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/40"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-100">
        {list.map((c) => {
          const on = picked.includes(c.id);
          return (
            <button key={c.id} type="button" onClick={() => toggle(c.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50">
              <Avatar name={c.name} photo={c.photo} size={38} group={c.type !== "direct"} seed={c.otherPerson?.key || c.id} />
              <p className="flex-1 min-w-0 text-sm font-semibold text-gray-800 truncate">{c.name}</p>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${on ? "bg-[#730042] border-[#730042] text-white" : "border-gray-300"}`}>
                {on && <FaCheck className="text-[9px]" />}
              </span>
            </button>
          );
        })}
        {!list.length && <p className="text-center text-xs text-gray-400 py-10">No chats found.</p>}
      </div>

      <div className="p-3 border-t border-gray-100">
        <button
          type="button"
          onClick={send}
          disabled={!picked.length || forward.isPending}
          className="w-full py-2.5 rounded-full bg-[#730042] text-white text-sm font-semibold hover:bg-[#5c0035] disabled:opacity-50"
        >
          {forward.isPending ? "Forwarding…" : picked.length ? `Forward to ${picked.length} chat${picked.length > 1 ? "s" : ""}` : "Choose chats"}
        </button>
      </div>
    </div>
  );
}
