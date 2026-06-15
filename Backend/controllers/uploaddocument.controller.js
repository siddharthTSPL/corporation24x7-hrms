const imagekit = require("../utils/imagekit.utils");
const Document = require("../Models/document.model");

const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg"];
const MAX_SIZE = 2 * 1024 * 1024;

const validateFile = (file) => {
  if (!ALLOWED_MIME.includes(file.mimetype)) return "Only PDF, PNG, JPG allowed";
  if (file.size > MAX_SIZE) return "File size must be less than 2MB";
  return null;
};

const uploadToImageKit = async (file) => {
  const fileBase64 = file.buffer.toString("base64");
  return imagekit.upload({ file: fileBase64, fileName: file.originalname, folder: "/documents", useUniqueFileName: true });
};

const buildDocumentResponse = (doc) => ({
  id: doc._id,
  title: doc.title,
  fileUrl: doc.fileUrl,
  fileType: doc.fileType,
  sizeKB: doc.size,
  uploadedAt: doc.uploadedAt,
  uploaderModel: doc.uploaderModel,
});

const uploadDocument = async (req, res) => {
  try {
    const actor = req.employee || req.manager || req.admin;
    const actorModel = req.employee ? "User" : req.manager ? "Manager" : req.admin ? "Admin" : null;
    if (!actor || !actorModel) return res.status(401).json({ message: "Unauthorized" });

    const { title, fileType } = req.body;
    if (!req.file || !title || !fileType) return res.status(400).json({ message: "File, title and fileType are required" });
    if (!["personal", "expense"].includes(fileType)) return res.status(400).json({ message: "Invalid fileType" });

    const fileError = validateFile(req.file);
    if (fileError) return res.status(400).json({ message: fileError });

    const uploadResponse = await uploadToImageKit(req.file);

    const underManager = actorModel === "User" ? (actor.Under_manager || null) : null;

    const document = new Document({
      organisation_id: actor.organisation_id,
      title,
      uploader: actor._id,
      uploaderModel: actorModel,
      uploadedAt: new Date(),
      viewedByAdmin: actorModel === "Admin",
      viewedBySuperAdmin: false,
      underManager,
      fileType,
      fileUrl: uploadResponse.url,
      fileId: uploadResponse.fileId,
      size: Math.round(uploadResponse.size / 1024),
    });

    await document.save();
    return res.status(201).json({ message: "Document uploaded successfully", document: buildDocumentResponse(document) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getDocuments = async (req, res) => {
  try {
    const actor = req.employee || req.manager || req.admin;
    const actorModel = req.employee ? "User" : req.manager ? "Manager" : req.admin ? "Admin" : null;
    if (!actor || !actorModel) return res.status(401).json({ message: "Unauthorized" });

    const documents = await Document.find({
      uploader: actor._id,
      uploaderModel: actorModel,
      organisation_id: actor.organisation_id,
    }).sort({ uploadedAt: -1 }).lean();

    return res.status(200).json({ message: "Documents fetched successfully", documents: documents.map(buildDocumentResponse) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const editDocument = async (req, res) => {
  try {
    const actor = req.employee || req.manager || req.admin;
    const actorModel = req.employee ? "User" : req.manager ? "Manager" : req.admin ? "Admin" : null;
    if (!actor || !actorModel) return res.status(401).json({ message: "Unauthorized" });

    const { title, fileType } = req.body;
    if (!title || !fileType) return res.status(400).json({ message: "Title and fileType are required" });
    if (!["personal", "expense"].includes(fileType)) return res.status(400).json({ message: "Invalid fileType" });

    const updateData = { title, fileType };

    if (req.file) {
      const fileError = validateFile(req.file);
      if (fileError) return res.status(400).json({ message: fileError });
      const uploadResponse = await uploadToImageKit(req.file);
      updateData.fileUrl = uploadResponse.url;
      updateData.fileId = uploadResponse.fileId;
      updateData.size = Math.round(uploadResponse.size / 1024);
    }

    const document = await Document.findOneAndUpdate(
      { uploader: actor._id, uploaderModel: actorModel, _id: req.params.id, organisation_id: actor.organisation_id },
      updateData,
      { new: true },
    );
    if (!document) return res.status(404).json({ message: "Document not found" });
    return res.status(200).json({ message: "Document updated successfully", document: buildDocumentResponse(document) });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const actor = req.employee || req.manager || req.admin;
    const actorModel = req.employee ? "User" : req.manager ? "Manager" : req.admin ? "Admin" : null;
    if (!actor || !actorModel) return res.status(401).json({ message: "Unauthorized" });

    const document = await Document.findOne({
      uploader: actor._id,
      uploaderModel: actorModel,
      _id: req.params.id,
      organisation_id: actor.organisation_id,
    });
    if (!document) return res.status(404).json({ message: "Document not found" });
    if (document.fileId) await imagekit.deleteFile(document.fileId);
    await document.deleteOne();
    return res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { uploadDocument, getDocuments, editDocument, deleteDocument };