const multer = require("multer");

// Same allow-list idea as Supportattachments.middleware.js, plus common chat media.
const ALLOWED_CHAT_TYPES = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf", "text/plain", "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint",
  "application/zip",
  "audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav", // voice notes
  "video/mp4", "video/webm",
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB per file
const MAX_FILES = 5;

// Use as: chatUpload.array("attachments", 5)
const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_CHAT_TYPES.has(file.mimetype)) {
      return cb(Object.assign(new Error(`Unsupported file type: ${file.originalname}`), { statusCode: 400 }));
    }
    cb(null, true);
  },
});

module.exports = chatUpload;
module.exports.MAX_FILES = MAX_FILES;
module.exports.MAX_FILE_SIZE = MAX_FILE_SIZE;
