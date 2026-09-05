const multer = require("multer");

const ALLOWED_TYPES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
// Some browsers/OSes send generic types for .csv/.xlsx, so also allow by extension.
const ALLOWED_EXTENSIONS = /\.(xlsx|xls|csv)$/i;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const bulkOnboardingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype) && !ALLOWED_EXTENSIONS.test(file.originalname)) {
      return cb(new Error("Unsupported file type. Please upload a .xlsx, .xls or .csv file."));
    }
    cb(null, true);
  },
});

module.exports = bulkOnboardingUpload;