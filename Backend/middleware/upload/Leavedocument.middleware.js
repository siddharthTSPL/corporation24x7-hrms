const multer = require("multer");

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

const leaveDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error("Only PDF, PNG and JPG files are allowed"));
    }
    cb(null, true);
  },
});

module.exports = leaveDocumentUpload;
