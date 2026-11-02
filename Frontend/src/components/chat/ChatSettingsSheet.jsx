import { useState } from "react";
import { FaArrowLeft, FaBell, FaPhoneAlt, FaCommentDots, FaChevronRight, FaKeyboard } from "react-icons/fa";
import Avatar from "./Avatar";
import CallSoundSettings from "./Callsoundsettings";
import { useConversations } from "../../auth/server-state/chat/chat.hook";
import { useChatStore } from "../../auth/store/chat/chatStore";
import { getChatPrefs, setChatPrefs } from "./chatPrefs";

function Header({ title, onBack }) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-white shrink-0">
      <button type="button" onClick={onBack} title="Back" className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center">
        <FaArrowLeft className="text-sm" />
      </button>
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
    </div>
  );
}

function NavRow({ icon: Icon, title, hint, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-gray-50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F6E8EF] text-[#730042]">
        <Icon className="text-sm" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-gray-900">{title}</span>
        <span className="block truncate text-xs text-gray-500">{hint}</span>
      </span>
      <FaChevronRight className="text-[10px] text-gray-300" />
    </button>
  );
}

function Switch({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-[#730042]" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function ChatsPage({ onBack }) {
  const [prefs, setPrefs] = useState(getChatPrefs);
  const patch = (p) => setPrefs(setChatPrefs(p));
  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f0f2f5]">
      <Header title="Chats" onBack={onBack} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <section className="mt-2 bg-white">
          <div className="flex items-center gap-4 px-5 py-3.5">
            <FaKeyboard className="w-4 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-gray-900">Enter is send</p>
              <p className="text-xs text-gray-500">{prefs.enterIsSend ? "Press Enter to send, Shift + Enter for a new line" : "Press Ctrl + Enter to send, Enter adds a new line"}</p>
            </div>
            <Switch on={prefs.enterIsSend} onChange={(v) => patch({ enterIsSend: v })} />
          </div>
        </section>
        <p className="px-5 py-3 text-xs text-gray-500">Chat wallpaper is set per conversation from the ⋮ menu inside a chat.</p>
      </div>
    </div>
  );
}

export default function ChatSettingsSheet({ onClose }) {
  const [page, setPage] = useState(null);
  const myKey = useChatStore((s) => s.myKey);
  const { data: conversations = [] } = useConversations(true);
  const self = conversations.flatMap((c) => c.participants || []).find((p) => p.key === myKey);

  if (page === "notifications") return <CallSoundSettings section="notifications" onClose={() => setPage(null)} />;
  if (page === "calls") return <CallSoundSettings section="calls" onClose={() => setPage(null)} />;
  if (page === "chats") return <ChatsPage onBack={() => setPage(null)} />;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f0f2f5]">
      <Header title="Settings" onBack={onClose} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <section className="flex items-center gap-4 bg-white px-5 py-5">
          <Avatar name={self?.name || "You"} photo={self?.photo || ""} size={64} seed={myKey || "me"} />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-gray-900">{self?.name || "You"}</p>
            <p className="truncate text-sm text-gray-500">{self?.designation || self?.role || "Hey there! I am using TorchX Spark"}</p>
          </div>
        </section>

        <section className="mt-2 divide-y divide-gray-50 bg-white">
          <NavRow icon={FaCommentDots} title="Chats" hint="Enter key behaviour" onClick={() => setPage("chats")} />
          <NavRow icon={FaBell} title="Notifications" hint="Message sounds, desktop alerts" onClick={() => setPage("notifications")} />
          <NavRow icon={FaPhoneAlt} title="Calls" hint="Ringtone, volume, vibration" onClick={() => setPage("calls")} />
        </section>

        <div className="px-5 py-6 text-center">
          <p className="text-sm font-semibold text-[#730042]">TorchX Spark</p>
          <p className="text-xs text-gray-400">from TorchX Talent</p>
        </div>
      </div>
    </div>
  );
}
