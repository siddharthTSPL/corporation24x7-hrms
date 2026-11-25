const SalaryConfig = require("../Models/salaryconfig.model");
const { DEFAULT_COMPONENTS, validateComponents, computeBreakup } = require("../utils/recruitment/salaryStructure.utils");

const fail = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

const getOrgComponents = async (organisationId) => {
  const doc = await SalaryConfig.findOne({ organisation_id: organisationId }).lean();
  return doc?.components?.length ? doc.components : null;
};

const describeConfig = async (organisationId) => {
  const doc = await SalaryConfig.findOne({ organisation_id: organisationId }).lean();
  if (!doc?.components?.length) return { is_custom: false, version: 0, updated_at: null, components: DEFAULT_COMPONENTS };
  return { is_custom: true, version: doc.version, updated_at: doc.updatedAt, components: doc.components };
};

const getSalaryConfig = async (req, res) => {
  const data = await describeConfig(req.admin.organisation_id);
  return res.status(200).json({ success: true, data });
};

const saveSalaryConfig = async (req, res) => {
  const organisationId = req.admin.organisation_id;
  const components = validateComponents(req.body.components);
  computeBreakup({ annual_ctc: 1200000, components });

  const audit = { updated_by: req.admin._id, updated_by_model: req.actorModel || "Admin" };
  const existing = await SalaryConfig.findOne({ organisation_id: organisationId }).select("_id");
  if (existing) {
    await SalaryConfig.updateOne({ _id: existing._id, organisation_id: organisationId }, { $set: { components, ...audit }, $inc: { version: 1 } });
  } else {
    await SalaryConfig.create({ organisation_id: organisationId, components, version: 1, ...audit });
  }

  const data = await describeConfig(organisationId);
  return res.status(200).json({ success: true, message: "Salary structure saved", data });
};

const resetSalaryConfig = async (req, res) => {
  await SalaryConfig.deleteOne({ organisation_id: req.admin.organisation_id });
  const data = await describeConfig(req.admin.organisation_id);
  return res.status(200).json({ success: true, message: "Salary structure reset to default", data });
};

const previewSalaryConfig = async (req, res) => {
  const { annual_ctc, components } = req.body;
  if (!Array.isArray(components)) throw fail(400, "Components are required");
  const data = computeBreakup({ annual_ctc, components });
  return res.status(200).json({ success: true, data });
};

module.exports = { getOrgComponents, describeConfig, getSalaryConfig, saveSalaryConfig, resetSalaryConfig, previewSalaryConfig };