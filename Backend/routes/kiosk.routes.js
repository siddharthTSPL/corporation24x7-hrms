const express = require("express");
const { kioskLogin, kioskLogout, kioskMe } = require("../controllers/kiosk.controller");
const kioskAuth = require("../middleware/auth/kiosk.middleware");

const router = express.Router();

router.post("/login", kioskLogin);
router.post("/logout", kioskAuth, kioskLogout);
router.get("/me", kioskAuth, kioskMe);

module.exports = router;