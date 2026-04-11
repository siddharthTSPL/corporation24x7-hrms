const imagekit = require("../utils/imagekit.utils");
const Document = require("../Models/document.model");

const uploadDocument = async (req, res) => {
  try {
    const employee = req.employee;

    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, fileType } = req.body;

    if (!req.file || !title || !fileType) {
      return res.status(400).json({
        message: "File, title and fileType are required",
      });
    }

    if (!["personal", "expense"].includes(fileType)) {
      return res.status(400).json({
        message: "Invalid fileType",
      });
    }

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Only PDF, PNG, JPG allowed",
      });
    }

    if (req.file.size > 2 * 1024 * 1024) {
      return res.status(400).json({
        message: "File size must be less than 2MB",
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
      fileType,
      fileUrl: uploadResponse.url,
      fileId: uploadResponse.fileId,
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

const getDocuments = async (req, res) => {
  try {
    const employee = req.employee;

    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const documents = await Document.find({ employee: employee._id });

    return res.status(200).json({
      message: "Documents fetched successfully",
      documents,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const editDocument = async (req, res) => {
  try {
    const employee = req.employee;

    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, fileType } = req.body;

    if (!title || !fileType) {
      return res.status(400).json({
        message: "Title and fileType are required",
      });
    }

    if (!["personal", "expense"].includes(fileType)) {
      return res.status(400).json({
        message: "Invalid fileType",
      });
    }

    const updateData = {
      title,
      fileType,
    };

    if (req.file) {
      const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          message: "Only PDF, PNG, JPG allowed",
        });
      }

      if (req.file.size > 2 * 1024 * 1024) {
        return res.status(400).json({
          message: "File size must be less than 2MB",
        });
      }

      const fileBase64 = req.file.buffer.toString("base64");

      const uploadResponse = await imagekit.upload({
        file: fileBase64,
        fileName: req.file.originalname,
        folder: "/documents",
        useUniqueFileName: true,
      });

      updateData.fileUrl = uploadResponse.url;
      updateData.fileId = uploadResponse.fileId;
      updateData.size = Math.round(uploadResponse.size / 1024);
    }

    const document = await Document.findOneAndUpdate(
      { employee: employee._id, _id: req.params.id },
      updateData,
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.status(200).json({
      message: "Document updated successfully",
      document,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const employee = req.employee;

    if (!employee) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const document = await Document.findOne({
      employee: employee._id,
      _id: req.params.id,
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.fileId) {
      await imagekit.deleteFile(document.fileId);
    }

    await document.deleteOne();

    return res.status(200).json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  editDocument,
  deleteDocument,
};