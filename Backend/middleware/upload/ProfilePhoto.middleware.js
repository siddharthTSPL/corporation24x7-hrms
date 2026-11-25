const multer = require("multer");

const ALLOWED_PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_PHOTO_TYPES.has(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, or WEBP photos are allowed."));
    }
    cb(null, true);
  },
});

module.exports = (req, res, next) =>
  uploader.single("photo")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.code === "LIMIT_FILE_SIZE"
          ? "Profile photo must be 5 MB or smaller."
          : error.message || "Profile photo upload failed.",
      });
    }
    next();
  });
