const SuperAdmin = require("../Models/superadmin.model");
const { shapeLateRule } = require("../utils/Laterule.utils");

const err = (msg, statusCode) => Object.assign(new Error(msg), { statusCode });

const shape = (org) => ({
  autoCheckoutEnabled: org?.attendanceSettings?.autoCheckoutEnabled !== false,
  lateRule: shapeLateRule(org),
});

const getAttendanceSettings = async (req, res, next) => {
  const org = await SuperAdmin.findById(req.admin.organisation_id)
    .select("attendanceSettings")
    .lean();
  if (!org) return next(err("Organisation not found", 404));

  res.status(200).json({ success: true, attendanceSettings: shape(org) });
};

// Partial update: send only the setting(s) being changed.
//   { autoCheckoutEnabled: boolean }
//   { lateRule: { enabled?: boolean, allowedLatePerMonth?: integer 0-31 } }
const updateAttendanceSettings = async (req, res, next) => {
  const { autoCheckoutEnabled, lateRule } = req.body;
  const $set = {};

  if (autoCheckoutEnabled !== undefined) {
    if (typeof autoCheckoutEnabled !== "boolean")
      return next(err("autoCheckoutEnabled must be true or false", 400));
    $set["attendanceSettings.autoCheckoutEnabled"] = autoCheckoutEnabled;
  }

  if (lateRule !== undefined) {
    if (!lateRule || typeof lateRule !== "object")
      return next(err("lateRule must be an object", 400));

    if (lateRule.enabled !== undefined) {
      if (typeof lateRule.enabled !== "boolean")
        return next(err("lateRule.enabled must be true or false", 400));
      $set["attendanceSettings.lateRule.enabled"] = lateRule.enabled;
    }
    if (lateRule.allowedLatePerMonth !== undefined) {
      const n = Number(lateRule.allowedLatePerMonth);
      if (!Number.isInteger(n) || n < 0 || n > 31)
        return next(err("lateRule.allowedLatePerMonth must be a whole number between 0 and 31", 400));
      $set["attendanceSettings.lateRule.allowedLatePerMonth"] = n;
    }
  }

  if (!Object.keys($set).length)
    return next(err("Nothing to update", 400));

  const org = await SuperAdmin.findByIdAndUpdate(
    req.admin.organisation_id,
    { $set },
    { new: true }
  )
    .select("attendanceSettings")
    .lean();
  if (!org) return next(err("Organisation not found", 404));

  res.status(200).json({ success: true, attendanceSettings: shape(org) });
};

module.exports = { getAttendanceSettings, updateAttendanceSettings };