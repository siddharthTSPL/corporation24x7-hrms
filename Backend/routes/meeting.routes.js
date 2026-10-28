const express = require("express");
const meetingRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");
const m = require("../controllers/meeting.controller");

meetingRouter.use(anyRoleAuth);

meetingRouter.post("/availability", asyncHandler(m.availability)); // must stay above "/:id"
meetingRouter.get("/", asyncHandler(m.listMeetings));
meetingRouter.post("/", asyncHandler(m.createMeeting));
meetingRouter.get("/:id", asyncHandler(m.getMeeting));
meetingRouter.patch("/:id", asyncHandler(m.updateMeeting));
meetingRouter.delete("/:id", asyncHandler(m.cancelMeeting));
meetingRouter.post("/:id/respond", asyncHandler(m.respond));
meetingRouter.post("/:id/end", asyncHandler(m.endMeeting));
meetingRouter.get("/:id/join-info", asyncHandler(m.joinInfo));
meetingRouter.get("/:id/ics", asyncHandler(m.downloadIcs));

module.exports = meetingRouter;
