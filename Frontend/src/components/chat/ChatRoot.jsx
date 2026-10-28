import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import useChatRealtime from "../../realtime/useChatRealtime";
import { getSocket } from "../../realtime/socket";
import { useConversations } from "../../auth/server-state/chat/chat.hook";
import { CHAT_KEYS } from "../../auth/server-state/chat/chatCache";
import { useChatStore } from "../../auth/store/chat/chatStore";
import { useChatUiStore } from "../../auth/store/chat/chatUiStore";
import { playNotificationSound, isSoundEnabled } from "../notifications/Notificationsound";
import Avatar from "./Avatar";
import { previewOf } from "./chatUtils";
import ChatPanel from "./ChatPanel";
import CallOverlay from "./CallOverlay";

function useMessageToasts(enabled) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return undefined;
    const socket = getSocket();

    const onMessage = ({ conversationId, message }) => {
      const { myKey, activeConversationId } = useChatStore.getState();
      if (!message.senderKey || message.senderKey === myKey) return;
      if (message.type === "system" || message.type === "call") return;

      const viewing = activeConversationId === conversationId && document.visibilityState === "visible";
      if (viewing) return;

      const conv = qc.getQueryData(CHAT_KEYS.conversations)?.conversations?.find((c) => c.id === conversationId);
      if (conv?.muted) return;

      if (isSoundEnabled()) playNotificationSound();

      const title = conv && conv.type !== "direct" ? `${message.sender?.name || "Someone"} · ${conv.name}` : message.sender?.name || conv?.name || "New message";
      const body = previewOf(message) || "Sent an attachment";

      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id);
              useChatUiStore.getState().openConversation(conversationId);
            }}
            className="flex items-center gap-3 bg-white shadow-lg border border-gray-100 rounded-xl p-3 w-[320px] max-w-[90vw] cursor-pointer transition-opacity duration-200"
            style={{ opacity: t.visible ? 1 : 0 }}
          >
            <Avatar name={message.sender?.name || ""} photo={message.sender?.photo || ""} size={38} seed={message.senderKey} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
              <p className="text-xs text-gray-500 truncate">{body}</p>
            </div>
          </div>
        ),
        { id: `chat-${conversationId}`, duration: 5000 },
      );
    };

    socket.on("chat:message", onMessage);
    return () => socket.off("chat:message", onMessage);
  }, [enabled, qc]);
}

export default function ChatRoot() {
  const { data: auth } = useAuth();
  const enabled = Boolean(auth?.role);

  useChatRealtime(enabled);
  useConversations(enabled);
  useMessageToasts(enabled);

  useEffect(() => {
    if (!enabled) useChatUiStore.getState().reset();
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <ChatPanel />
      <CallOverlay />
    </>
  );
}
