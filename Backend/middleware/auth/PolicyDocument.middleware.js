const multer = require("multer");

// Keep in sync with the checks in controllers/policy.controller.js.
const ALLOWED_PDF_TYPES = new Set(["application/pdf"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const MAX_PDF_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per photo
const MAX_IMAGES = 10;

// Routes call .fields([{ name: "pdf", maxCount: 1 }, { name: "images", maxCount: 10 }])
// on this instance, so an admin can attach a PDF, photos of a signed hard
// copy, or both together ("org can put data in any form").
const policyDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.max(MAX_PDF_SIZE, MAX_IMAGE_SIZE), files: 1 + MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "pdf") {
      if (!ALLOWED_PDF_TYPES.has(file.mimetype)) {
        return cb(new Error("Policy document must be a PDF file"));
      }
      return cb(null, true);
    }
    if (file.fieldname === "images") {
      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        return cb(new Error("Attached photos must be PNG, JPG, or WEBP"));
      }
      return cb(null, true);
    }
    return cb(new Error(`Unexpected upload field: ${file.fieldname}`));
  },
});

module.exports = { policyDocumentUpload, MAX_PDF_SIZE, MAX_IMAGE_SIZE, MAX_IMAGES };