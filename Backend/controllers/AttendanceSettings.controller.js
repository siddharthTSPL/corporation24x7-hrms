const SuperAdmin = require("../Models/superadmin.model");

const err = (msg, statusCode) => Object.assign(new Error(msg), { statusCode });

const shape = (org) => ({
  autoCheckoutEnabled: org?.attendanceSettings?.autoCheckoutEnabled !== false,
});

const getAttendanceSettings = async (req, res, next) => {
  const org = await SuperAdmin.findById(req.admin.organisation_id)
    .select("attendanceSettings")
    .lean();
  if (!org) return next(err("Organisation not found", 404));

  res.status(200).json({ success: true, attendanceSettings: shape(org) });
};

const updateAttendanceSettings = async (req, res, next) => {
  const { autoCheckoutEnabled } = req.body;
  if (typeof autoCheckoutEnabled !== "boolean")
    return next(err("autoCheckoutEnabled must be true or false", 400));

  const org = await SuperAdmin.findByIdAndUpdate(
    req.admin.organisation_id,
    { $set: { "attendanceSettings.autoCheckoutEnabled": autoCheckoutEnabled } },
    { new: true }
  )
    .select("attendanceSettings")
    .lean();
  if (!org) return next(err("Organisation not found", 404));

  res.status(200).json({ success: true, attendanceSettings: shape(org) });
};

module.exports = { getAttendanceSettings, updateAttendanceSettings };