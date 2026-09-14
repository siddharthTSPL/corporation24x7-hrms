const express = require("express");
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const anyRole = require("../middleware/auth/Planfeatureanyrole.middleware");
<<<<<<< HEAD
const fieldVisitPhotoUpload = require("../middleware/upload/Fieldvisitphoto.middleware");
const bulkFileUpload = require("../middleware/upload/Bulkonboarding.middleware");
=======
const fieldVisitPhotoUpload = require("../middleware/upload/FieldVisitPhoto.middleware");
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
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
<<<<<<< HEAD
router.post(
  "/duty/:sessionId/check-in",
  asyncHandler(controller.submitCheckIn),
);
=======
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
router.post("/duty/:sessionId/visits", asyncHandler(controller.startVisit));
router.patch("/visits/:visitId/end", asyncHandler(controller.endVisit));
router.post(
  "/visits/:visitId/photo",
  fieldVisitPhotoUpload.single("photo"),
  asyncHandler(controller.uploadVisitPhoto),
);

<<<<<<< HEAD
// Assigned Field Activity (optional, spec sections 18/32/33)
router.get("/activities/mine", asyncHandler(controller.myAssignedActivities));
router.get("/visits/mine", asyncHandler(controller.myVisits));
router.post("/activities", asyncHandler(controller.assignActivity));
router.patch(
  "/activities/:activityId/reassign",
  asyncHandler(controller.reassignActivity),
);
router.patch(
  "/activities/:activityId/cancel",
  asyncHandler(controller.cancelActivity),
);

=======
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7
router.get("/settings", asyncHandler(controller.getSettings));
router.patch("/settings", asyncHandler(controller.updateSettings));

router.get("/overview", asyncHandler(controller.getOverview));
router.get("/employees/:employeeId/route", asyncHandler(controller.getRoute));
router.get("/teams", asyncHandler(controller.listTeams));
router.get("/team-options", asyncHandler(controller.teamOptions));
router.post("/teams", asyncHandler(controller.createTeam));
<<<<<<< HEAD
router.patch("/teams/:teamId", asyncHandler(controller.updateTeam));
router.delete("/teams/:teamId", asyncHandler(controller.deleteTeam));
router.post(
  "/teams/:teamId/bulk-assign",
  asyncHandler(controller.bulkAssignEmployees),
);
router.get(
  "/bulk-assign/template",
  asyncHandler(controller.downloadBulkAssignTemplate),
);
router.post(
  "/bulk-assign/upload",
  bulkFileUpload.single("file"),
  asyncHandler(controller.bulkAssignEmployeesFromFile),
);

// Individual (non-team) Field Work assignment (spec section 5)
router.get("/assignments", asyncHandler(controller.listFieldAssignments));
router.post(
  "/assignments",
  asyncHandler(controller.createIndividualAssignment),
);
router.delete(
  "/assignments/:assignmentId",
  asyncHandler(controller.removeIndividualAssignment),
);

router.get("/export/csv", asyncHandler(controller.exportFieldActivitiesCsv));
router.get("/audit-log", asyncHandler(controller.getAuditLog));
=======
>>>>>>> 5035b061a1efa021ba50454f6e5a182e4d2740e7

module.exports = router;
