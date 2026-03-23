const imagekit = require("../utils/imagekit.utils");
const Document = require("../Models/document.model");
const jwt = require("jsonwebtoken");

const uploadDocument = async (req, res) => {
  try {

    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decode = jwt.verify(token, process.env.JWT_SECRET);

    const { title } = req.body;

    if (!req.file || !title) {
      return res.status(400).json({ message: "File and title are required" });
    }
    const fileBase64 = req.file.buffer.toString("base64");

    const uploadResponse = await imagekit.upload({
      file: fileBase64,
      fileName: req.file.originalname,
      folder: "/documents",
      useUniqueFileName: true
    });

    const document = new Document({
      title,
      employee: decode.userId,
      fileUrl: uploadResponse.url,
      size: Math.round(uploadResponse.size / 1024)
    });

    await document.save();

    res.status(201).json({
      message: "Document uploaded successfully",
      document
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { uploadDocument };