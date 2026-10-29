const express = require("express");
const meetingRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");
const backgroundUpload = require("../middleware/upload/Meetingbackground.middleware");
const m = require("../controllers/meeting.controller");
const x = require("../controllers/meetingExtras.controller");
const g = require("../controllers/meetingGuest.controller");
const sp = require("../controllers/meetingSpace.controller");
const an = require("../controllers/meetingAnnouncement.controller");
const co = require("../controllers/meetingCollab.controller");

// Outsiders (no account) - these two are public on purpose; everything else below needs a login.
// The join call is protected by the emailed PIN (5 wrong tries -> 15 min lock + per-IP limit).
meetingRouter.get("/guest/:id/info", asyncHandler(g.info));
meetingRouter.post("/guest/join", asyncHandler(g.join));

meetingRouter.use(anyRoleAuth);

meetingRouter.post("/availability", asyncHandler(m.availability));
meetingRouter.get("/calendar", asyncHandler(m.calendar));
meetingRouter.get("/reactions", asyncHandler(x.reactionList));
meetingRouter.get("/backgrounds", asyncHandler(x.listBackgrounds));
meetingRouter.post("/backgrounds", backgroundUpload.single("image"), asyncHandler(x.uploadBackground));
meetingRouter.delete("/backgrounds/:bgId", asyncHandler(x.deleteBackground));
meetingRouter.get("/preferences", asyncHandler(x.getPreferences));
meetingRouter.put("/preferences", asyncHandler(x.updatePreferences));

meetingRouter.get("/discover", asyncHandler(sp.discover));
meetingRouter.post("/instant", asyncHandler(sp.instant));
meetingRouter.get("/insights/me", asyncHandler(sp.insights));
meetingRouter.get("/action-items/mine", asyncHandler(co.myActionItems));

meetingRouter.get("/", asyncHandler(m.listMeetings));
meetingRouter.post("/", asyncHandler(m.createMeeting));
meetingRouter.get("/:id", asyncHandler(m.getMeeting));
meetingRouter.patch("/:id", asyncHandler(m.updateMeeting));
meetingRouter.delete("/:id", asyncHandler(m.cancelMeeting));
meetingRouter.post("/:id/respond", asyncHandler(m.respond));
meetingRouter.post("/:id/end", asyncHandler(m.endMeeting));
meetingRouter.get("/:id/join-info", asyncHandler(m.joinInfo));
meetingRouter.get("/:id/live", asyncHandler(x.liveState));
meetingRouter.patch("/:id/settings", asyncHandler(x.updateSettings));
meetingRouter.get("/:id/report", asyncHandler(x.meetingReport));
meetingRouter.get("/:id/ics", asyncHandler(m.downloadIcs));
meetingRouter.get("/:id/guests", asyncHandler(g.list));
meetingRouter.post("/:id/guests", asyncHandler(g.invite));
meetingRouter.post("/:id/guests/:guestId/resend", asyncHandler(g.resend));
meetingRouter.delete("/:id/guests/:guestId", asyncHandler(g.revoke));

meetingRouter.get("/:id/space", asyncHandler(sp.getSpace));
meetingRouter.patch("/:id/space", asyncHandler(sp.updateSpace));
meetingRouter.put("/:id/interest", asyncHandler(sp.setInterest));
meetingRouter.get("/:id/interested", asyncHandler(sp.listInterested));
meetingRouter.post("/:id/interested/promote", asyncHandler(sp.promoteInterested));
meetingRouter.post("/:id/nudge", asyncHandler(sp.nudge));

meetingRouter.get("/:id/announcements", asyncHandler(an.list));
meetingRouter.post("/:id/announcements", asyncHandler(an.announce));
meetingRouter.post("/:id/announcements/audience", asyncHandler(an.audiencePreview));
meetingRouter.post("/:id/announcements/seen-all", asyncHandler(an.markAllSeen));
meetingRouter.post("/:id/announcements/:aid/seen", asyncHandler(an.markSeen));
meetingRouter.get("/:id/announcements/:aid/viewers", asyncHandler(an.viewers));
meetingRouter.patch("/:id/announcements/:aid", asyncHandler(an.update));
meetingRouter.delete("/:id/announcements/:aid", asyncHandler(an.remove));

meetingRouter.get("/:id/notes", asyncHandler(co.getNotes));
meetingRouter.put("/:id/notes", asyncHandler(co.saveNotes));
meetingRouter.post("/:id/notes/share", asyncHandler(co.shareNotes));

meetingRouter.get("/:id/action-items", asyncHandler(co.listActionItems));
meetingRouter.post("/:id/action-items", asyncHandler(co.createActionItem));
meetingRouter.patch("/:id/action-items/:itemId", asyncHandler(co.updateActionItem));
meetingRouter.delete("/:id/action-items/:itemId", asyncHandler(co.deleteActionItem));

meetingRouter.get("/:id/polls", asyncHandler(co.listPolls));
meetingRouter.post("/:id/polls", asyncHandler(co.createPoll));
meetingRouter.post("/:id/polls/:pollId/vote", asyncHandler(co.votePoll));
meetingRouter.post("/:id/polls/:pollId/close", asyncHandler(co.closePoll));
meetingRouter.delete("/:id/polls/:pollId", asyncHandler(co.deletePoll));

meetingRouter.get("/:id/feedback", asyncHandler(co.feedbackSummary));
meetingRouter.get("/:id/feedback/mine", asyncHandler(co.myFeedback));
meetingRouter.post("/:id/feedback", asyncHandler(co.submitFeedback));

module.exports = meetingRouter;
