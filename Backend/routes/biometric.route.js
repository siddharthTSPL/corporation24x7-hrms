const express = require("express");
const router = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminDelegatedAccess = require("../middleware/auth/adminDelegatedAccess.middleware");
const biometricAgentAuth = require("../middleware/auth/biometricagent.middleware");
const torchxManagementAccess = adminDelegatedAccess("torchx_management");
const c = require("../controllers/biometric.controller");

// --- Agent (laptop/PC next to the machine). Auth: x-agent-key header ---
router.post("/agent/device-info", biometricAgentAuth, asyncHandler(c.agentDeviceInfo));
router.post("/agent/users", biometricAgentAuth, asyncHandler(c.agentUsers));
router.post("/agent/punches", biometricAgentAuth, asyncHandler(c.agentPunches));
router.get("/agent/config", biometricAgentAuth, asyncHandler(c.agentConfig));

// --- Admin / TorchX Management ---
router.get("/devices", torchxManagementAccess, asyncHandler(c.listDevices));
router.post("/devices", torchxManagementAccess, asyncHandler(c.createDevice));
router.patch("/devices/:id", torchxManagementAccess, asyncHandler(c.updateDevice));
router.delete("/devices/:id", torchxManagementAccess, asyncHandler(c.deleteDevice));
router.get("/devices/:id/users", torchxManagementAccess, asyncHandler(c.listDeviceUsers));
router.put("/devices/:id/users/:deviceUserId", torchxManagementAccess, asyncHandler(c.mapDeviceUser));
router.post("/devices/:id/auto-map", torchxManagementAccess, asyncHandler(c.autoMap));
router.get("/devices/:id/config/download", torchxManagementAccess, asyncHandler(c.downloadDeviceConfig));
router.get("/agent-config/download", torchxManagementAccess, asyncHandler(c.downloadAgentConfig));
router.get("/punches", torchxManagementAccess, asyncHandler(c.listPunches));
router.get("/punches/download", torchxManagementAccess, asyncHandler(c.downloadPunches));
router.post("/reprocess", torchxManagementAccess, asyncHandler(c.reprocess));
router.post("/import", torchxManagementAccess, asyncHandler(c.importPunches));

module.exports = router;
