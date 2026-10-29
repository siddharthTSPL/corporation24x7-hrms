const multer = require("multer");

const ALLOWED_BACKGROUND_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const meetingBackgroundUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_BACKGROUND_TYPES.has(file.mimetype)) {
      return cb(Object.assign(new Error("Backgrounds must be PNG, JPG or WebP images."), { statusCode: 400 }));
    }
    cb(null, true);
  },
});

module.exports = meetingBackgroundUpload;
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
