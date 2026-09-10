const express = require("express");
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRole = require("../middleware/auth/Planfeatureanyrole.middleware");
const fieldVisitPhotoUpload = require("../middleware/upload/FieldVisitPhoto.middleware");
const controller = require("../controllers/fieldOperations.controller");

const router = express.Router();
router.use(anyRole);

router.get("/my-duty", asyncHandler(controller.myDuty));
router.post("/duty/start", asyncHandler(controller.startDuty));
router.patch(
  "/duty/:sessionId/status",
  asyncHandler(controller.updateDutyStatus),
);
router.post("/duty/:sessionId/locations", asyncHandler(controller.addLocation));
router.post("/duty/:sessionId/checkout", asyncHandler(controller.checkoutDuty));
router.post("/duty/:sessionId/visits", asyncHandler(controller.startVisit));
router.patch("/visits/:visitId/end", asyncHandler(controller.endVisit));
router.post(
  "/visits/:visitId/photo",
  fieldVisitPhotoUpload.single("photo"),
  asyncHandler(controller.uploadVisitPhoto),
);

router.get("/settings", asyncHandler(controller.getSettings));
router.patch("/settings", asyncHandler(controller.updateSettings));

router.get("/overview", asyncHandler(controller.getOverview));
router.get("/employees/:employeeId/route", asyncHandler(controller.getRoute));
router.get("/teams", asyncHandler(controller.listTeams));
router.get("/team-options", asyncHandler(controller.teamOptions));
router.post("/teams", asyncHandler(controller.createTeam));

module.exports = router;
