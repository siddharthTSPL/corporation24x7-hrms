const ApprovalFlow = require("../Models/approvalFlow.model");
const Admin = require("../Models/Admin.model");

const MODULES = ["leave", "wfh", "timesheet"];
const err = (msg, statusCode) => Object.assign(new Error(msg), { statusCode });

const defaultFlow = (module) => ({
  module,
  enabled: false,
  firstApprover: "reporting_manager",
  admins: [],
  applyToEmployees: true,
  applyToManagers: true,
});

// GET /approval-flow  -> all three modules, defaults filled in
const getApprovalFlows = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const rows = await ApprovalFlow.find({ organisation_id }).lean();
  const byModule = Object.fromEntries(rows.map((r) => [r.module, r]));
  const flows = MODULES.map((m) => byModule[m] || defaultFlow(m));
  const admins = await Admin.find({ organisation_id, working_status: "working" })
    .select("f_name l_name work_email designation")
    .lean();
  res.status(200).json({ success: true, flows, admins });
};

// PUT /approval-flow/:module
const saveApprovalFlow = async (req, res, next) => {
  const organisation_id = req.admin.organisation_id;
  const { module } = req.params;
  if (!MODULES.includes(module)) return next(err("Invalid module", 400));

  const { enabled, firstApprover, admins = [], applyToEmployees, applyToManagers } = req.body;

  if (enabled && firstApprover === "admin") {
    if (!Array.isArray(admins) || !admins.length)
      return next(err("Select at least one admin", 400));
    const valid = await Admin.countDocuments({
      _id: { $in: admins },
      organisation_id,
      working_status: "working",
    });
    if (valid !== admins.length)
      return next(err("One or more selected admins are invalid or inactive", 400));
  }

  const flow = await ApprovalFlow.findOneAndUpdate(
    { organisation_id, module },
    {
      $set: {
        enabled: !!enabled,
        firstApprover: firstApprover || "reporting_manager",
        admins,
        applyToEmployees: applyToEmployees !== false,
        applyToManagers: applyToManagers !== false,
        updatedBy: req.admin._id,
        updatedByModel: req.actorModel || "Admin",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.status(200).json({ success: true, flow });
};

// DELETE /approval-flow/:module  -> back to default (config kept off)
const resetApprovalFlow = async (req, res, next) => {
  const { module } = req.params;
  if (!MODULES.includes(module)) return next(err("Invalid module", 400));
  await ApprovalFlow.deleteOne({ organisation_id: req.admin.organisation_id, module });
  res.status(200).json({ success: true, flow: defaultFlow(module) });
};

module.exports = { getApprovalFlows, saveApprovalFlow, resetApprovalFlow };