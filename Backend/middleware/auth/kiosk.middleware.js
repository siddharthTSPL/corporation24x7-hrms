const jwt = require("jsonwebtoken");
const Kiosk = require("../../Models/kiosk.model");

const kioskAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) return res.status(401).json({ message: "Kiosk is not logged in" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "kiosk")
      return res.status(403).json({ message: "Invalid token type for kiosk endpoint" });

    const kiosk = await Kiosk.findById(decoded.kiosk_id);
    if (!kiosk || !kiosk.isActive)
      return res.status(401).json({ message: "Kiosk session revoked, please log in again" });

    kiosk.lastSeenAt = new Date();
    kiosk.save().catch(() => {});

    req.kiosk = {
      kiosk_id: kiosk._id,
      organisation_id: kiosk.organisation_id,
      device_name: kiosk.device_name,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired kiosk token" });
  }
};

module.exports = kioskAuth;
