const express = require("express");
const router = express.Router();
const { uploadDocument, getDocuments, editDocument, deleteDocument } = require("../controllers/uploaddocument.controller");
const employeemiddleware = require("../middleware/auth/employee.middleware");
const managermiddleware = require("../middleware/auth/manager.middleware");
const adminmiddleware = require("../middleware/auth/admin.middleware");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

const flexibleAuth = (req, res, next) => {
  employeemiddleware(req, res, () => {
    if (req.employee) return next();
    managermiddleware(req, res, () => {
      if (req.manager) return next();
      adminmiddleware(req, res, () => {
        if (req.admin) return next();
        return res.status(401).json({ message: "Unauthorized" });
      });
    });
  });
};

router.post("/upload", flexibleAuth, upload.single("file"), uploadDocument);
router.get("/", flexibleAuth, getDocuments);
router.put("/:id", flexibleAuth, upload.single("file"), editDocument);
router.delete("/:id", flexibleAuth, deleteDocument);

module.exports = router;