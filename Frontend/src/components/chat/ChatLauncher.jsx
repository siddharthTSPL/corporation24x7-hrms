import { FaCommentDots } from "react-icons/fa";
import { useChatUnreadCount } from "../../auth/server-state/chat/chat.hook";
import { useChatUiStore } from "../../auth/store/chat/chatUiStore";

export default function ChatLauncher() {
  const open = useChatUiStore((s) => s.open);
  const togglePanel = useChatUiStore((s) => s.togglePanel);
  const { data } = useChatUnreadCount(true);
  const unread = data?.unread || 0;

  return (
    <button
      type="button"
      onClick={togglePanel}
      aria-label="Messages"
      title="Messages"
      className={`relative p-2 rounded-full transition-colors ${open ? "bg-[#730042]/10 text-[#730042]" : "text-gray-600 hover:bg-gray-100"}`}
    >
      <FaCommentDots className="text-lg" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#EB5757] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
