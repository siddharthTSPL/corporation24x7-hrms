const multer = require("multer");

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    const extension = file.originalname.toLowerCase();
    const allowed = file.fieldname === "template"
      ? file.mimetype === "application/pdf" && extension.endsWith(".pdf")
      : ["image/png", "image/jpeg"].includes(file.mimetype) && /\.(png|jpe?g)$/.test(extension);
    if (!allowed) return cb(new Error(file.fieldname === "template" ? "Certificate design must be a PDF." : "Logo and signature must be PNG or JPG images."));
    cb(null, true);
  },
});

module.exports = (req, res, next) => uploader.fields([
  { name: "template", maxCount: 1 },
  { name: "logo", maxCount: 1 },
  { name: "signature", maxCount: 1 },
])(req, res, (error) => {
  if (error) return res.status(400).json({ success: false, message: error.message || "Certificate upload failed." });
  next();
});
