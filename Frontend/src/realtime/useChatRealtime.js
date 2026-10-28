import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { connectSocket } from "./socket";
import { emitAck, emitQuiet } from "./chatSocket";
import { getMe } from "../auth/api/chat/chat.api";
import { callManager } from "./webrtc/callManager";
import { useChatStore } from "../auth/store/chat/chatStore";
import { useCallStore } from "../auth/store/call/callStore";
import {
  CHAT_KEYS,
  upsertMessage,
  markMessageDeleted,
  removeMessage,
  addDelivered,
  patchConversation,
  bumpConversationToTop,
  removeConversation,
} from "../auth/server-state/chat/chatCache";
import { MEETING_KEYS } from "../auth/server-state/meeting/meeting.hook";

const preview = (m) =>
  m.type === "sticker" ? "Sticker" : m.text ? m.text : m.type === "file" ? m.attachments?.[0]?.name || "Attachment" : "";

// Mount ONCE inside the authenticated layout, next to useRealtimeSync:
//     useChatRealtime(Boolean(auth?.role));
// It turns socket events into React Query cache updates (messages, unread, typing,
// presence, meeting changes) and wires incoming calls to the call manager.
export default function useChatRealtime(enabled) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      useChatStore.getState().reset();
      useCallStore.getState().reset();
      return undefined;
    }

    const socket = connectSocket();
    const chat = useChatStore.getState;
    const detachCalls = callManager.attach(socket);

    // --- identity + presence ---
    const onReady = ({ recipientModel, id }) => chat().setMyKey(`${recipientModel}:${id}`);
    const onPresence = ({ key, online, lastSeenAt, inCall }) => chat().setPresence(key, online, lastSeenAt || null, inCall);

    // "socket:ready" fires once per connection. If this hook mounted AFTER it fired (or the store was
    // reset) myKey stayed empty and every message looked like it came from the other person. So we
    // always make sure we know who we are: ask the socket, and fall back to REST.
    const syncIdentity = async () => {
      if (chat().myKey) return;
      try {
        const r = await emitAck("chat:whoami", {}, 5000);
        if (r?.key) chat().setMyKey(r.key);
      } catch {
        try {
          const r = await getMe();
          if (r?.key) chat().setMyKey(r.key);
        } catch {
          /* the next connect retries */
        }
      }
    };

    // After a drop/reconnect we may have missed live events: refresh what's on screen.
    let connectedOnce = socket.connected;
    const onConnect = () => {
      syncIdentity();
      if (connectedOnce) qc.invalidateQueries({ queryKey: CHAT_KEYS.all });
      connectedOnce = true;
    };

    // --- messages ---
    const readTimers = new Map();
    const markReadSoon = (conversationId) => {
      clearTimeout(readTimers.get(conversationId));
      readTimers.set(conversationId, setTimeout(() => emitQuiet("chat:read", { conversationId }), 400));
    };
    let unreadTimer = null;
    const refreshUnread = () => {
      clearTimeout(unreadTimer);
      unreadTimer = setTimeout(() => qc.invalidateQueries({ queryKey: CHAT_KEYS.unread }), 500);
    };

    const onMessage = ({ conversationId, message }) => {
      upsertMessage(qc, conversationId, message);
      const { myKey, activeConversationId } = chat();
      const mine = !!message.senderKey && message.senderKey === myKey;
      const viewing = activeConversationId === conversationId && document.visibilityState === "visible";
      const isLine = message.type === "system" || message.type === "call";

      const found = patchConversation(qc, conversationId, (c) => ({
        ...c,
        lastMessage: {
          id: message.id,
          text: preview(message),
          type: message.type,
          senderKey: message.senderKey,
          senderName: message.sender?.name || "",
          at: message.createdAt,
        },
        lastMessageAt: message.createdAt,
        unread: !mine && !viewing && !isLine ? (c.unread || 0) + 1 : c.unread,
      }));
      if (found) bumpConversationToTop(qc, conversationId);
      else qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations }); // brand-new chat for me

      if (message.senderKey) chat().setTyping(conversationId, message.senderKey, "", false);
      if (viewing && !mine && !isLine) markReadSoon(conversationId);
      refreshUnread();
    };

    const onMessageUpdated = ({ conversationId, message }) => upsertMessage(qc, conversationId, message);
    const onMessageDeleted = ({ conversationId, messageId, forMe }) =>
      forMe ? removeMessage(qc, conversationId, messageId) : markMessageDeleted(qc, conversationId, messageId);

    const onDelivered = ({ conversationId, by, messageIds }) => addDelivered(qc, conversationId, messageIds || [], by);

    // someone tried to call me while I was on another call
    const onMissedBusy = ({ from }) => toast(`${from?.name || "Someone"} tried to call you while you were on another call.`, { icon: "📞", duration: 6000 });

    // someone read the chat: update "seen" ticks; if it was me (other tab) clear my badge
    const onRead = ({ conversationId, by, at }) => {
      patchConversation(qc, conversationId, (c) => ({
        ...c,
        unread: by === chat().myKey ? 0 : c.unread,
        participants: c.participants.map((p) => (p.key === by ? { ...p, lastReadAt: at } : p)),
      }));
      qc.setQueryData(CHAT_KEYS.conversation(conversationId), (old) =>
        old ? { ...old, conversation: { ...old.conversation, participants: old.conversation.participants.map((p) => (p.key === by ? { ...p, lastReadAt: at } : p)) } } : old,
      );
      if (by === chat().myKey) refreshUnread();
    };

    const onTyping = ({ conversationId, key, name, isTyping }) => chat().setTyping(conversationId, key, name, isTyping);

    const onConversationUpdated = ({ conversationId, removed }) => {
      if (removed && removed.includes(chat().myKey)) {
        removeConversation(qc, conversationId);
        if (chat().activeConversationId === conversationId) chat().setActiveConversation(null);
        return;
      }
      qc.invalidateQueries({ queryKey: CHAT_KEYS.conversations });
      qc.invalidateQueries({ queryKey: CHAT_KEYS.conversation(conversationId) });
    };

    // --- meetings (bell notifications already arrive via notification:new) ---
    const refreshMeetings = () => qc.invalidateQueries({ queryKey: MEETING_KEYS.all });
    const onMeetingReminder = ({ title, minutes }) =>
      toast(`"${title}" starts in ${minutes} minute${minutes === 1 ? "" : "s"}`, { icon: "📅", duration: 8000 });

    socket.on("socket:ready", onReady);
    socket.on("presence:update", onPresence);
    socket.on("chat:message", onMessage);
    socket.on("chat:message:updated", onMessageUpdated);
    socket.on("chat:message:deleted", onMessageDeleted);
    socket.on("chat:read", onRead);
    socket.on("chat:delivered", onDelivered);
    socket.on("call:missed-busy", onMissedBusy);
    socket.on("connect", onConnect);
    socket.on("chat:typing", onTyping);
    socket.on("chat:conversation:updated", onConversationUpdated);
    for (const ev of ["meeting:started", "meeting:updated", "meeting:rsvp", "meeting:ended"]) socket.on(ev, refreshMeetings);
    socket.on("meeting:reminder", onMeetingReminder);
    socket.on("call:ended", () => qc.invalidateQueries({ queryKey: CHAT_KEYS.callHistory }));
    if (socket.connected) syncIdentity(); // already connected before we attached (re-mount)

    return () => {
      readTimers.forEach(clearTimeout);
      clearTimeout(unreadTimer);
      detachCalls();
      socket.off("socket:ready", onReady);
      socket.off("presence:update", onPresence);
      socket.off("chat:message", onMessage);
      socket.off("chat:message:updated", onMessageUpdated);
      socket.off("chat:message:deleted", onMessageDeleted);
      socket.off("chat:read", onRead);
      socket.off("chat:delivered", onDelivered);
      socket.off("call:missed-busy", onMissedBusy);
      socket.off("connect", onConnect);
      socket.off("chat:typing", onTyping);
      socket.off("chat:conversation:updated", onConversationUpdated);
      for (const ev of ["meeting:started", "meeting:updated", "meeting:rsvp", "meeting:ended"]) socket.off(ev, refreshMeetings);
      socket.off("meeting:reminder", onMeetingReminder);
    };
  }, [enabled, qc]);
}
