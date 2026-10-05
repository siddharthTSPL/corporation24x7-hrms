const multer = require("multer");

const allowed = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!allowed.has(file.mimetype)) return cb(new Error("Evidence must be a PDF, PNG, JPG, WEBP or DOCX file."));
    cb(null, true);
  },
});

module.exports = (req, res, next) => uploader.single("evidence")(req, res, (error) => {
  if (error) return res.status(400).json({ success: false, message: error.message || "Evidence upload failed." });
  next();
});
