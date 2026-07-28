const multer = require("multer");

// Keep this list in sync with ALLOWED_ATTACHMENT_TYPES in Support.controller.js.
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
]);

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB — mirrors TechnicalSupportModal.jsx

// Exported as a raw multer instance — routes/adminroutes.js (and the
// manager/employee/superadmin equivalents) call .array("attachments", 5)
// on this directly, e.g.:
//   supportUpload.array("attachments", 5)
const supportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.originalname}`));
    }
    cb(null, true);
  },
});

module.exports = supportUpload;