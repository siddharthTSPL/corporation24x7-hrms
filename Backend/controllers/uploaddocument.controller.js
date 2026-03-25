const imagekit = require("../utils/imagekit.utils");
const Document = require("../Models/document.model");


const uploadDocument = async (req, res) => {
  try {
    const employee = req.employee; 

    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title } = req.body;

    if (!req.file || !title) {
      return res.status(400).json({
        message: "File and title are required",
      });
    }

    const fileBase64 = req.file.buffer.toString("base64");

    const uploadResponse = await imagekit.upload({
      file: fileBase64,
      fileName: req.file.originalname,
      folder: "/documents",
      useUniqueFileName: true,
    });

    const document = new Document({
      title,
      employee: employee._id, 
      fileUrl: uploadResponse.url,
      size: Math.round(uploadResponse.size / 1024),
    });

    await document.save();

    return res.status(201).json({
      message: "Document uploaded successfully",
      document,
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = { uploadDocument };

// done