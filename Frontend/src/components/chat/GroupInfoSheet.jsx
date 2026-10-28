import { useState } from "react";
import toast from "react-hot-toast";
import { FaArrowLeft, FaSearch, FaUserPlus, FaSignOutAlt, FaBellSlash, FaBell } from "react-icons/fa";
import {
  useDirectorySearch,
  useIsOnline,
  useUpdateGroupChat,
  useAddGroupMembers,
  useRemoveGroupMember,
  useSetGroupMemberRole,
  useLeaveGroupChat,
  useMuteConversation,
} from "../../auth/server-state/chat/chat.hook";
import { useChatStore } from "../../auth/store/chat/chatStore";
import { useChatUiStore } from "../../auth/store/chat/chatUiStore";
import Avatar from "./Avatar";

function Member({ p, isMe, canManage, busy, onToggleRole, onRemove }) {
  const online = useIsOnline(p.key, !!p.online);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Avatar name={p.name} photo={p.photo} size={38} online={online} seed={p.key} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {p.name}
          {isMe && <span className="text-gray-400 font-normal"> (You)</span>}
        </p>
        <p className="text-xs text-gray-500 truncate">{p.designation || p.department || ""}</p>
      </div>
      {p.role === "admin" && (
        <span className="text-[10px] font-semibold text-[#730042] bg-[#F6E8EF] rounded-full px-2 py-0.5">Admin</span>
      )}
      {canManage && !isMe && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleRole(p)}
            className="text-[11px] font-semibold text-gray-600 hover:text-[#730042] px-1.5 disabled:opacity-50"
          >
            {p.role === "admin" ? "Remove admin" : "Make admin"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(p)}
            className="text-[11px] font-semibold text-red-500 hover:text-red-600 px-1.5 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

export default function GroupInfoSheet({ conversation, onClose }) {
  const conv = conversation;
  const myKey = useChatStore((s) => s.myKey);
  const backToList = useChatUiStore((s) => s.backToList);
  const isAdmin = conv.myRole === "admin" && conv.type === "group";

  const [draftName, setDraftName] = useState(null);
  const [draftDescription, setDraftDescription] = useState(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const name = draftName ?? conv.name ?? "";
  const description = draftDescription ?? conv.description ?? "";

  const update = useUpdateGroupChat();
  const addMembers = useAddGroupMembers();
  const removeMember = useRemoveGroupMember();
  const setRole = useSetGroupMemberRole();
  const leave = useLeaveGroupChat();
  const mute = useMuteConversation();
  const { data: people = [], isFetching } = useDirectorySearch(query, { enabled: adding });

  const memberKeys = new Set(conv.participants.map((p) => p.key));
  const candidates = people.filter((p) => !memberKeys.has(p.key));
  const dirty = name.trim() !== (conv.name || "") || description.trim() !== (conv.description || "");
  const busy = removeMember.isPending || setRole.isPending || addMembers.isPending;

  const fail = (err) => toast.error(err.message || "Something went wrong.");

  const save = () => {
    if (!name.trim()) {
      toast.error("Group name can't be empty.");
      return;
    }
    update.mutate(
      { id: conv.id, name: name.trim(), description: description.trim() },
      {
        onSuccess: () => {
          setDraftName(null);
          setDraftDescription(null);
        },
        onError: fail,
      },
    );
  };

  const handleLeave = async () => {
    if (!window.confirm("Exit this group? You won't get new messages from it.")) return;
    try {
      await leave.mutateAsync(conv.id);
      backToList();
      onClose();
    } catch (err) {
      fail(err);
    }
  };

  const handleRemove = (p) => {
    if (!window.confirm(`Remove ${p.name} from the group?`)) return;
    removeMember.mutate({ id: conv.id, key: p.key }, { onError: fail });
  };

  const handleToggleRole = (p) =>
    setRole.mutate({ id: conv.id, key: p.key, role: p.role === "admin" ? "member" : "admin" }, { onError: fail });

  const handleAdd = (p) =>
    addMembers.mutate({ id: conv.id, members: [{ model: p.model, id: p.id }] }, { onError: fail });

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
        <button type="button" onClick={adding ? () => setAdding(false) : onClose} className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center">
          <FaArrowLeft className="text-sm" />
        </button>
        <h3 className="text-base font-bold text-gray-900">{adding ? "Add members" : "Group info"}</h3>
      </div>

      {adding ? (
        <>
          <div className="px-4 py-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                placeholder="Search people"
                className="w-full pl-8 pr-3 py-2 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#730042]/40"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto border-t border-gray-100">
            {candidates.map((p) => (
              <button
                key={p.key}
                type="button"
                disabled={busy}
                onClick={() => handleAdd(p)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 disabled:opacity-60"
              >
                <Avatar name={p.name} photo={p.photo} size={38} online={p.online} seed={p.key} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 truncate">{[p.designation, p.department].filter(Boolean).join(" · ")}</p>
                </div>
                <FaUserPlus className="text-[#730042]" />
              </button>
            ))}
            {!candidates.length && (
              <p className="text-center text-xs text-gray-400 py-10">{isFetching ? "Searching…" : "No one to add."}</p>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col items-center px-6 pt-6 pb-4 border-b border-gray-100">
            <Avatar name={conv.name} photo={conv.photo} size={72} group seed={conv.id} />
            {isAdmin ? (
              <div className="w-full mt-4 space-y-2">
                <input
                  value={name}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={80}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[#730042]/40"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Add a description"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#730042]/40"
                />
                {dirty && (
                  <button
                    type="button"
                    onClick={save}
                    disabled={update.isPending}
                    className="w-full py-2 rounded-full bg-[#730042] text-white text-xs font-semibold hover:bg-[#5c0035] disabled:opacity-60"
                  >
                    {update.isPending ? "Saving…" : "Save changes"}
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="text-base font-bold text-gray-900 mt-3 text-center">{conv.name}</p>
                {conv.description && <p className="text-xs text-gray-500 mt-1 text-center">{conv.description}</p>}
              </>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">Only admins can send messages</p>
                <p className="text-xs text-gray-500">Good for announcements. Everyone can still read and react.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!conv.settings?.onlyAdminsCanSend}
                disabled={update.isPending}
                onClick={() => update.mutate({ id: conv.id, settings: { onlyAdminsCanSend: !conv.settings?.onlyAdminsCanSend } }, { onError: fail })}
                className={`relative w-10 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-60 ${conv.settings?.onlyAdminsCanSend ? "bg-[#730042]" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${conv.settings?.onlyAdminsCanSend ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {conv.participants.length} members
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#730042] hover:underline"
              >
                <FaUserPlus /> Add
              </button>
            )}
          </div>

          {conv.participants.map((p) => (
            <Member
              key={p.key}
              p={p}
              isMe={p.key === myKey}
              canManage={isAdmin}
              busy={busy}
              onToggleRole={handleToggleRole}
              onRemove={handleRemove}
            />
          ))}

          <div className="p-4 space-y-2 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={() => mute.mutate({ id: conv.id, muted: !conv.muted })}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              {conv.muted ? <FaBell className="text-gray-400" /> : <FaBellSlash className="text-gray-400" />}
              {conv.muted ? "Unmute notifications" : "Mute notifications"}
            </button>
            {conv.type === "group" && (
              <button
                type="button"
                onClick={handleLeave}
                disabled={leave.isPending}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 disabled:opacity-60"
              >
                <FaSignOutAlt /> Exit group
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
