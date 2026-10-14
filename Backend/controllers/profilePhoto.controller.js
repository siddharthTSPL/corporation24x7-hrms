const SuperAdminModel = require("../Models/superadmin.model");
const imagekit = require("../utils/imagekit.utils");
const { invalidateUserCache } = require("../middleware/cache/cache.middleware");
const { getPlanState, getStorageStatusForLogin } = require("../utils/planAccess");

const uploadProfilePhoto = async (req, res, next) => {
  try {
    const actor = req.superAdmin || req.admin || req.manager || req.employee;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Choose a profile photo to upload." });
    }

    const organisationId = req.superAdmin?._id || actor.organisation_id;
    if (!organisationId) {
      return res.status(400).json({ success: false, message: "Organisation not found." });
    }

    const organisation = req.superAdmin || await SuperAdminModel.findById(organisationId).select(
      "licenses is_trial_active trial_expires_at storage_used_bytes storage_checked_at organisation_id organisation_name",
    );
    if (!organisation) {
      return res.status(404).json({ success: false, message: "Organisation not found." });
    }

    if (getPlanState(organisation).isFreeTier) {
      const storage = await getStorageStatusForLogin(organisation);
      if (storage.exceeded || storage.usedBytes + req.file.size > storage.limitBytes) {
        return res.status(403).json({
          success: false,
          code: "STORAGE_LIMIT_REACHED",
          message: "Your organisation has reached its free storage limit. Please contact your organization.",
        });
      }
    }

    const extensionByMime = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const uploaded = await imagekit.upload({
      file: req.file.buffer.toString("base64"),
      fileName: `profile-${actor._id}-${Date.now()}.${extensionByMime[req.file.mimetype]}`,
      folder: `/profile-photos/${organisationId}`,
      useUniqueFileName: true,
      tags: [String(organisationId)],
    });

    actor.profile_image = uploaded.url;
    await actor.save();
    invalidateUserCache(actor._id);

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully.",
      profile_image: actor.profile_image,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { uploadProfilePhoto };
