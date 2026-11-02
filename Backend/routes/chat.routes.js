const express = require("express");
const chatRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");
const chatUpload = require("../middleware/upload/Chatattachments.middleware");
const c = require("../controllers/chat.controller");
const r = require("../controllers/chatReceipt.controller");
const s = require("../controllers/chatSettings.controller");
const x = require("../controllers/chatExtras.controller");

// Every role (employee / manager / admin / super admin) uses the same endpoints.
chatRouter.use(anyRoleAuth);

// people
chatRouter.get("/directory", asyncHandler(c.searchPeople));
chatRouter.get("/presence", asyncHandler(c.getPresence));
chatRouter.get("/me", asyncHandler(c.whoAmI));

// settings page, privacy, status, help
chatRouter.get("/settings", asyncHandler(s.getSettings));
chatRouter.patch("/settings", asyncHandler(s.updateSettings));
chatRouter.put("/settings/status", asyncHandler(s.setStatus));
chatRouter.get("/about", asyncHandler(s.about));

// report user (+ admin review)
chatRouter.post("/report", asyncHandler(s.reportUser));
chatRouter.get("/reports", asyncHandler(s.listReports));
chatRouter.patch("/reports/:id", asyncHandler(s.reviewReport));

// starred messages, archived chats, storage & data
chatRouter.get("/starred", asyncHandler(s.listStarred));
chatRouter.get("/storage", asyncHandler(s.storage));
chatRouter.post("/clear-all", asyncHandler(s.clearAll));

// chat-list chips (All / Unread / Groups / Direct / Favourites) + their counts
chatRouter.get("/counts", asyncHandler(x.counts));

// link preview card while typing, scheduled messages, group invite links (static paths first)
chatRouter.get("/link-preview", asyncHandler(x.linkPreviewLookup));
chatRouter.get("/scheduled", asyncHandler(x.listScheduled));
chatRouter.patch("/scheduled/:id", asyncHandler(x.updateScheduled));
chatRouter.delete("/scheduled/:id", asyncHandler(x.cancelScheduled));
chatRouter.post("/scheduled/:id/send-now", asyncHandler(x.sendScheduledNow));
chatRouter.get("/invite/:code", asyncHandler(x.previewInvite));
chatRouter.post("/invite/:code/join", asyncHandler(x.joinInvite));

// conversations
chatRouter.get("/conversations", asyncHandler(c.listConversations));
chatRouter.post("/conversations/direct", asyncHandler(c.openDirect));
chatRouter.post("/conversations/group", asyncHandler(c.createGroup));
chatRouter.get("/conversations/:id", asyncHandler(c.getConversation));
chatRouter.patch("/conversations/:id", asyncHandler(c.updateGroup));
chatRouter.post("/conversations/:id/members", asyncHandler(c.addMembers));
chatRouter.delete("/conversations/:id/members/:key", asyncHandler(c.removeMember));
chatRouter.patch("/conversations/:id/members/:key/role", asyncHandler(c.setMemberRole));
chatRouter.post("/conversations/:id/leave", asyncHandler(c.leaveGroup));
chatRouter.patch("/conversations/:id/mute", asyncHandler(c.setMuted));
chatRouter.post("/conversations/:id/read", asyncHandler(c.markRead));
chatRouter.patch("/conversations/:id/pin", asyncHandler(c.setPinned));
chatRouter.patch("/conversations/:id/archive", asyncHandler(s.setArchived));
chatRouter.patch("/conversations/:id/favourite", asyncHandler(x.favourite));
chatRouter.put("/conversations/:id/draft", asyncHandler(x.putDraft));
chatRouter.get("/conversations/:id/draft", asyncHandler(x.getDraft));
chatRouter.patch("/conversations/:id/disappearing", asyncHandler(x.disappearing));
chatRouter.get("/conversations/:id/pinned", asyncHandler(x.pinned));
chatRouter.get("/conversations/:id/media-summary", asyncHandler(x.mediaSummary));
chatRouter.get("/conversations/:id/media", asyncHandler(x.media));
chatRouter.get("/conversations/:id/mentionable", asyncHandler(x.mentionable));
chatRouter.get("/conversations/:id/mentions", asyncHandler(x.myMentions));
chatRouter.post("/conversations/:id/scheduled", asyncHandler(x.schedule));
chatRouter.post("/conversations/:id/polls", asyncHandler(x.createPoll));
// group invite link (admins)
chatRouter.get("/conversations/:id/invite", asyncHandler(x.getInvite));
chatRouter.post("/conversations/:id/invite", asyncHandler(x.createInvite));
chatRouter.delete("/conversations/:id/invite", asyncHandler(x.disableInvite));
chatRouter.get("/conversations/:id/export", asyncHandler(s.exportChat));
chatRouter.post("/conversations/:id/clear", asyncHandler(c.clearChat));
chatRouter.patch("/conversations/:id/wallpaper", asyncHandler(c.setWallpaper));
chatRouter.post("/conversations/:id/wallpaper/upload", chatUpload.single("image"), asyncHandler(c.uploadWallpaper));

// messages
chatRouter.get("/conversations/:id/messages", asyncHandler(c.getMessages));
chatRouter.post("/conversations/:id/messages", chatUpload.array("attachments", 5), asyncHandler(c.sendMessage));
chatRouter.patch("/messages/:messageId", asyncHandler(c.editMessage));
chatRouter.delete("/messages/:messageId", asyncHandler(c.deleteMessage));
chatRouter.post("/messages/:messageId/react", asyncHandler(c.reactToMessage));
chatRouter.post("/messages/:messageId/star", asyncHandler(s.starMessage));
chatRouter.post("/messages/:messageId/forward", asyncHandler(c.forwardMessage));
chatRouter.get("/messages/:messageId/receipts", asyncHandler(r.messageReceipts));
chatRouter.get("/messages/:messageId/info", asyncHandler(r.messageReceipts)); // "Message info" screen (same data)
chatRouter.post("/messages/:messageId/pin", asyncHandler(x.pin));
chatRouter.post("/messages/:messageId/vote", asyncHandler(x.vote));
chatRouter.post("/messages/:messageId/poll/close", asyncHandler(x.closePoll));
chatRouter.get("/messages/:messageId/poll", asyncHandler(x.pollDetails));
chatRouter.post("/conversations/:id/receipts", asyncHandler(r.conversationReceipts));
chatRouter.get("/search", asyncHandler(c.searchMessages));
chatRouter.get("/unread-count", asyncHandler(c.unreadCount));

// calls (signalling itself runs over Socket.IO - see config/chatSocket.js)
chatRouter.get("/calls/ice-servers", asyncHandler(c.iceServers));
chatRouter.get("/calls/active", asyncHandler(c.activeCalls));
chatRouter.get("/calls/history", asyncHandler(c.callHistory));

module.exports = chatRouter;
