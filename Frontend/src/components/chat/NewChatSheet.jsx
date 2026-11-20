import { useState } from "react";
import toast from "react-hot-toast";
import { FaArrowLeft, FaSearch, FaCheck, FaTimes } from "react-icons/fa";
import { useDirectorySearch, useOpenDirectChat, useCreateGroupChat } from "../../auth/server-state/chat/chat.hook";
import { useChatUiStore } from "../../auth/store/chat/chatUiStore";
import Avatar from "./Avatar";

function PersonRow({ person, onClick, selected, busy }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 disabled:opacity-60"
    >
      <Avatar name={person.name} photo={person.photo} size={40} online={person.online} seed={person.key} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{person.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {[person.designation, person.department].filter(Boolean).join(" · ") || person.role}
        </p>
      </div>
      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">{person.role}</span>
      {selected !== undefined && (
        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "bg-[#730042] border-[#730042] text-white" : "border-gray-300"}`}>
          {selected && <FaCheck className="text-[9px]" />}
        </span>
      )}
    </button>
  );
}

export default function NewChatSheet({ onClose }) {
  const [mode, setMode] = useState("direct");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const openConversation = useChatUiStore((s) => s.openConversation);

  const { data: people = [], isFetching } = useDirectorySearch(query);
  const openDirect = useOpenDirectChat();
  const createGroup = useCreateGroupChat();

  const startDirect = async (p) => {
    try {
      const res = await openDirect.mutateAsync({ model: p.model, id: p.id });
      openConversation(res.conversation.id);
    } catch (err) {
      toast.error(err.message || "Couldn't open the chat.");
    }
  };

  const toggle = (p) =>
    setSelected((prev) => (prev.some((x) => x.key === p.key) ? prev.filter((x) => x.key !== p.key) : [...prev, p]));

  const makeGroup = async () => {
    if (!name.trim()) {
      toast.error("Give the group a name.");
      return;
    }
    if (!selected.length) {
      toast.error("Pick at least one person.");
      return;
    }
    try {
      const res = await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        members: selected.map((p) => ({ model: p.model, id: p.id })),
      });
      openConversation(res.conversation.id);
    } catch (err) {
      toast.error(err.message || "Couldn't create the group.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
        <button type="button" onClick={onClose} className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center">
          <FaArrowLeft className="text-sm" />
        </button>
        <h3 className="text-base font-bold text-gray-900">New chat</h3>
      </div>

      <div className="flex gap-1.5 px-4 pt-3">
        {[
          { id: "direct", label: "Direct message" },
          { id: "group", label: "New group" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${mode === t.id ? "bg-[#730042] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "group" && (
        <div className="px-4 pt-3 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Group name"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/40"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/40"
          />
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selected.map((p) => (
                <span key={p.key} className="inline-flex items-center gap-1.5 bg-[#F6E8EF] text-[#730042] text-xs font-semibold rounded-full pl-2.5 pr-1.5 py-1">
                  {p.name}
                  <button type="button" onClick={() => toggle(p)} className="w-4 h-4 rounded-full hover:bg-[#730042]/15 flex items-center justify-center">
                    <FaTimes className="text-[8px]" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Search by name, ID, department"
            className="w-full pl-8 pr-3 py-2 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/40"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-100">
        {people.map((p) =>
          mode === "direct" ? (
            <PersonRow key={p.key} person={p} busy={openDirect.isPending} onClick={() => startDirect(p)} />
          ) : (
            <PersonRow key={p.key} person={p} selected={selected.some((x) => x.key === p.key)} onClick={() => toggle(p)} />
          ),
        )}
        {!people.length && (
          <p className="text-center text-xs text-gray-400 py-10">{isFetching ? "Searching…" : "No one found."}</p>
        )}
      </div>

      {mode === "group" && (
        <div className="p-4 border-t border-gray-100">
          <button
            type="button"
            onClick={makeGroup}
            disabled={createGroup.isPending}
            className="w-full py-2.5 rounded-full bg-[#730042] text-white text-sm font-semibold hover:bg-[#5c0035] disabled:opacity-60"
          >
            {createGroup.isPending ? "Creating…" : `Create group${selected.length ? ` (${selected.length + 1})` : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
