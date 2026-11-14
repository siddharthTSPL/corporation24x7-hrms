import { FaCommentDots } from "react-icons/fa";
import { useChatUnreadCount } from "../../auth/server-state/chat/chat.hook";
import { useSparkStore } from "../../auth/store/spark/sparkStore";

// Navbar button that opens / closes the Spark frame.
export default function SparkLauncher() {
  const open = useSparkStore((s) => s.open);
  const togglePanel = useSparkStore((s) => s.togglePanel);
  const sparkUnread = useSparkStore((s) => s.unread);

  // Until Spark (inside the iframe) reports its own count, fall back to the API.
  const { data } = useChatUnreadCount(true);
  const unread = sparkUnread ?? data?.unread ?? 0;

  return (
    <button
      type="button"
      onClick={togglePanel}
      aria-label="TorchX Spark"
      aria-expanded={open}
      title="TorchX Spark"
      className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${
        open ? "bg-[#730042] text-white shadow-md shadow-[#730042]/30" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <FaCommentDots className="text-lg" />
      {unread > 0 && (
        <span
          key={unread}
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-[#FF5C5C] to-[#EB2F4B] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
