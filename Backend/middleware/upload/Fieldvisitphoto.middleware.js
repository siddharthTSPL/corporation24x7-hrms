const multer = require("multer");

// Keep this list in sync with VISIT_PHOTO_ALLOWED_MIME in fieldOperations.controller.js.
const ALLOWED_PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB — mirrors VISIT_PHOTO_MAX_SIZE

// Exported as a raw multer instance — routes/fieldOperations.route.js calls
// .single("photo") on this directly.
const fieldVisitPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_PHOTO_TYPES.has(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, or WEBP photos are allowed"));
    }
    cb(null, true);
  },
});

module.exports = fieldVisitPhotoUpload;