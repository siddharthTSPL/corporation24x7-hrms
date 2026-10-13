const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", unique: true, required: true },
  url: { type: String, default: "" },
  file_id: { type: String, default: "" },
  updated_by: { type: mongoose.Schema.Types.ObjectId, required: true },
  signatory_name: { type: String, default: "", trim: true, maxlength: 120 },
  signatory_title: { type: String, default: "", trim: true, maxlength: 120 },
  logo_url: { type: String, default: "" },
  logo_file_id: { type: String, default: "" },
  signature_url: { type: String, default: "" },
  signature_file_id: { type: String, default: "" },
}, { timestamps: true });
module.exports = mongoose.model("TrainingTemplate", schema);
