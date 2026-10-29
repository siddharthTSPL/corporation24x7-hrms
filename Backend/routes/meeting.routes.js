const express = require("express");
const meetingRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");
const backgroundUpload = require("../middleware/upload/Meetingbackground.middleware");
const m = require("../controllers/meeting.controller");
const x = require("../controllers/meetingExtras.controller");

meetingRouter.use(anyRoleAuth);

meetingRouter.post("/availability", asyncHandler(m.availability));
meetingRouter.get("/calendar", asyncHandler(m.calendar));
meetingRouter.get("/reactions", asyncHandler(x.reactionList));
meetingRouter.get("/backgrounds", asyncHandler(x.listBackgrounds));
meetingRouter.post("/backgrounds", backgroundUpload.single("image"), asyncHandler(x.uploadBackground));
meetingRouter.delete("/backgrounds/:bgId", asyncHandler(x.deleteBackground));
meetingRouter.get("/preferences", asyncHandler(x.getPreferences));
meetingRouter.put("/preferences", asyncHandler(x.updatePreferences));

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

module.exports = meetingRouter;
