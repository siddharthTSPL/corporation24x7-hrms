const express = require("express");
const router = express.Router();
const { uploadDocument } = require("../controllers/uploaddocument.controller");
const multer=require('multer')
const upload=multer({storage:multer.memoryStorage()})

router.post("/upload",upload.single("file"), uploadDocument);

module.exports = router;