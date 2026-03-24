const express = require("express");
const router = express.Router();
const { uploadDocument } = require("../controllers/uploaddocument.controller");
const employeemiddleware = require("../middleware/auth/employee.middleware");
const multer=require('multer')
const upload=multer({storage:multer.memoryStorage()})

router.post("/upload",employeemiddleware,upload.single("file"), uploadDocument);

module.exports = router;

// done