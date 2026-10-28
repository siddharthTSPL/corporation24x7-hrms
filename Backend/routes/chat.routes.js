const express = require("express");
const chatRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");
const chatUpload = require("../middleware/upload/Chatattachments.middleware");
const c = require("../controllers/chat.controller");

// Every role (employee / manager / admin / super admin) uses the same endpoints.
chatRouter.use(anyRoleAuth);

// people
chatRouter.get("/directory", asyncHandler(c.searchPeople));
chatRouter.get("/presence", asyncHandler(c.getPresence));

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

// messages
chatRouter.get("/conversations/:id/messages", asyncHandler(c.getMessages));
chatRouter.post("/conversations/:id/messages", chatUpload.array("attachments", 5), asyncHandler(c.sendMessage));
chatRouter.patch("/messages/:messageId", asyncHandler(c.editMessage));
chatRouter.delete("/messages/:messageId", asyncHandler(c.deleteMessage));
chatRouter.get("/search", asyncHandler(c.searchMessages));
chatRouter.get("/unread-count", asyncHandler(c.unreadCount));

// calls (signalling itself runs over Socket.IO - see config/chatSocket.js)
chatRouter.get("/calls/ice-servers", asyncHandler(c.iceServers));
chatRouter.get("/calls/active", asyncHandler(c.activeCalls));
chatRouter.get("/calls/history", asyncHandler(c.callHistory));

module.exports = chatRouter;
