const multer = require("multer");

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);

const offerAssetsUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error("Only PNG and JPG images are allowed"));
    }
    cb(null, true);
  },
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "signature", maxCount: 1 },
]);

module.exports = offerAssetsUpload;