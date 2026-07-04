const express = require("express");
const { kioskLogin, kioskLogout } = require("../controllers/kiosk.controller");
const kioskAuth = require("../middleware/auth/kiosk.middleware");

const router = express.Router();

router.post("/login", kioskLogin);
router.post("/logout", kioskAuth, kioskLogout);

module.exports = router;
