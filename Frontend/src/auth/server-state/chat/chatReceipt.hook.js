import { useQuery } from "@tanstack/react-query";
import { getMessageReceipts, getConversationReceipts } from "../../api/chat/chatReceipt.api";

export const RECEIPT_KEYS = {
  all: ["chat", "receipts"],
  message: (id) => ["chat", "receipts", "message", id],
  conversation: (id, ids) => ["chat", "receipts", "conversation", id, ids],
};

export const getSeenInfo = (message, conversation) => {
  const empty = { totalRecipients: 0, seenCount: 0, deliveredCount: 0, allSeen: false, anySeen: false };
  if (!message || !conversation?.participants) return empty;
  const sentAt = new Date(message.createdAt).getTime();
  const delivered = new Set(message.deliveredTo || []);
  const recipients = conversation.participants.filter((p) => p.key !== message.senderKey && new Date(p.joinedAt).getTime() <= sentAt + 1000);
  const seen = recipients.filter((p) => p.lastReadAt && new Date(p.lastReadAt).getTime() >= sentAt);
  const deliveredCount = recipients.filter((p) => delivered.has(p.key) || (p.lastReadAt && new Date(p.lastReadAt).getTime() >= sentAt)).length;
  return {
    totalRecipients: recipients.length,
    seenCount: seen.length,
    deliveredCount,
    allSeen: recipients.length > 0 && seen.length === recipients.length,
    anySeen: seen.length > 0,
  };
};

export const useMessageReceipts = (messageId, enabled = true) =>
  useQuery({
    queryKey: RECEIPT_KEYS.message(messageId),
    queryFn: () => getMessageReceipts(messageId),
    enabled: enabled && !!messageId,
    staleTime: 5000,
  });

export const useConversationReceipts = (conversationId, messageIds = [], enabled = true) => {
  const ids = [...new Set(messageIds)].sort();
  return useQuery({
    queryKey: RECEIPT_KEYS.conversation(conversationId, ids.join(",")),
    queryFn: () => getConversationReceipts({ id: conversationId, messageIds: ids }),
    enabled: enabled && !!conversationId && ids.length > 0,
    staleTime: 10000,
    select: (d) => d.receipts,
  });
};
