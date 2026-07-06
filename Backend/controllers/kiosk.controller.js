const jwt = require("jsonwebtoken");
const Admin = require("../Models/Admin.model");
const Kiosk = require("../Models/kiosk.model");
const SuperAdmin = require("../Models/superadmin.model");

// An admin of an organisation logs the tablet in ONCE using their normal
// work_email + password, plus a name for the device. From then on the
// tablet holds a long-lived token that identifies its organisation —
// employees never see a login screen.
const kioskLogin = async (req, res) => {
  try {
    const { work_email, password, device_name } = req.body;
    if (!work_email || !password || !device_name)
      return res
        .status(400)
        .json({ message: "work_email, password and device_name are required" });

    const admin = await Admin.findOne({ work_email: work_email.toLowerCase().trim() });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await admin.isValidPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    let kiosk = await Kiosk.findOne({
      organisation_id: admin.organisation_id,
      device_name: device_name.trim(),
    });

    if (kiosk) {
      kiosk.isActive = true;
      kiosk.registeredBy = admin._id;
      await kiosk.save();
    } else {
      kiosk = await Kiosk.create({
        organisation_id: admin.organisation_id,
        device_name: device_name.trim(),
        registeredBy: admin._id,
      });
    }

    // 90-day token — the tablet stays "logged in" as this organisation
    // until someone explicitly logs it out or an admin deactivates it.
    const token = jwt.sign(
      { kiosk_id: kiosk._id, organisation_id: admin.organisation_id, type: "kiosk" },
      process.env.JWT_SECRET,
      { expiresIn: "90d" }
    );

    res.status(200).json({
      message: "Kiosk registered and logged in",
      token,
      kiosk: {
        id: kiosk._id,
        device_name: kiosk.device_name,
        organisation_id: kiosk.organisation_id,
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
      .select("organisation_name")
      .lean();

    res.json({
      device_name: kiosk.device_name,
      organisation_id: kiosk.organisation_id,
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