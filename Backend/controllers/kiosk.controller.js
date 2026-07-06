const jwt = require("jsonwebtoken");
const Kiosk = require("../Models/kiosk.model");
const SuperAdmin = require("../Models/superadmin.model");

// The tablet logs in ONCE using the organisation's own Organisation ID
// plus a dedicated kiosk password (set by the superadmin from Settings —
// see setKioskPassword), plus a name for the device. This is a
// deliberately separate credential from any person's own login: nobody's
// personal superadmin/admin password ever needs to touch a shared
// reception tablet. From then on the tablet holds a long-lived token
// that identifies its organisation — employees never see a login screen.
const kioskLogin = async (req, res) => {
  try {
    const { organisation_id, password, device_name } = req.body;
    if (!organisation_id || !password || !device_name)
      return res
        .status(400)
        .json({ message: "organisation_id, password and device_name are required" });

    const superAdmin = await SuperAdmin.findOne({
      organisation_id: organisation_id.trim(),
    }).select("+kiosk_password");

    if (!superAdmin)
      return res.status(404).json({ message: "No organisation found with that Organisation ID" });

    if (!superAdmin.kiosk_password)
      return res.status(400).json({
        message:
          "Kiosk sign-in hasn't been set up for this organisation yet. Ask your admin to set a kiosk password from Settings.",
        reason: "kiosk_password_not_set",
      });

    const isMatch = await superAdmin.isValidKioskPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid Organisation ID or kiosk password" });

    let kiosk = await Kiosk.findOne({
      organisation_id: superAdmin._id,
      device_name: device_name.trim(),
    });

    if (kiosk) {
      kiosk.isActive = true;
      kiosk.registeredBy = superAdmin._id;
      await kiosk.save();
    } else {
      kiosk = await Kiosk.create({
        organisation_id: superAdmin._id,
        device_name: device_name.trim(),
        registeredBy: superAdmin._id,
      });
    }

    // 90-day token — the tablet stays "logged in" as this organisation
    // until someone explicitly logs it out or an admin deactivates it.
    const token = jwt.sign(
      { kiosk_id: kiosk._id, organisation_id: superAdmin._id, type: "kiosk" },
      process.env.JWT_SECRET,
      { expiresIn: "90d" }
    );

    res.status(200).json({
      message: "Kiosk registered and logged in",
      token,
      kiosk: {
        id: kiosk._id,
        device_name: kiosk.device_name,
        organisation_id: superAdmin.organisation_id,
        organisation_name: superAdmin.organisation_name,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lets the kiosk screen show "Logged in as: <Org Name> — <Device Name>"
// after a refresh, using only the long-lived kiosk token (no re-login).
const kioskMe = async (req, res) => {
  try {
    const kiosk = await Kiosk.findById(req.kiosk.kiosk_id).lean();
    if (!kiosk || !kiosk.isActive)
      return res.status(401).json({ message: "Kiosk session revoked, please log in again" });

    const org = await SuperAdmin.findById(kiosk.organisation_id)
      .select("organisation_id organisation_name")
      .lean();

    res.json({
      device_name: kiosk.device_name,
      organisation_id: org?.organisation_id || null,
      organisation_name: org?.organisation_name || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const kioskLogout = async (req, res) => {
  try {
    await Kiosk.findByIdAndUpdate(req.kiosk.kiosk_id, { isActive: false });
    res.json({ message: "Kiosk logged out" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { kioskLogin, kioskLogout, kioskMe };