const express = require("express");
const router = express.Router();
const { uploadDocument, getDocuments, editDocument, deleteDocument } = require("../controllers/uploaddocument.controller");
const employeemiddleware = require("../middleware/auth/employee.middleware");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", employeemiddleware, upload.single("file"), uploadDocument);
router.get("/", employeemiddleware, getDocuments);
router.put("/:id", employeemiddleware, upload.single("file"), editDocument);
router.delete("/:id", employeemiddleware, deleteDocument);

module.exports = router;