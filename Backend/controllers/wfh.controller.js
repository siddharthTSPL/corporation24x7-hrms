const WFH = require("../Models/wfh.model");
const Manager = require("../Models/manager.model");

const applyWFH = async (req, res, next) => {
  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate || !reason)
    return next(Object.assign(new Error("startDate, endDate, and reason are required"), { statusCode: 400 }));

  const employee = req.employee;
  const organisation_id = employee.organisation_id;

  if (!employee.Under_manager)
    return next(Object.assign(new Error("No manager assigned. Cannot apply WFH."), { statusCode: 400 }));

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return next(Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }));
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const overlapping = await WFH.findOne({
    requester: employee._id, organisation_id,
    status: { $nin: ["rejected_manager", "rejected_reporting_manager"] },
    startDate: { $lte: end }, endDate: { $gte: start },
  }).select("_id").lean();
  if (overlapping) return next(Object.assign(new Error("You already have a WFH request for overlapping dates"), { statusCode: 409 }));

  const wfh = await WFH.create({ organisation_id, requester: employee._id, requesterModel: "User", manager: employee.Under_manager, startDate: start, endDate: end, days, reason, status: "pending_manager" });
  res.status(201).json({ success: true, message: "WFH request submitted", wfh });
};

const editWFH = async (req, res, next) => {
  const wfh = await WFH.findOne({ _id: req.params.id, organisation_id: req.employee.organisation_id });
  if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.requester.toString() !== req.employee._id.toString()) return next(Object.assign(new Error("Not authorized to edit this request"), { statusCode: 403 }));
  if (wfh.status !== "pending_manager") return next(Object.assign(new Error("Cannot edit a WFH request that is already processed or forwarded"), { statusCode: 400 }));
  const { startDate, endDate, reason } = req.body;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return next(Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }));
    wfh.startDate = start; wfh.endDate = end;
    wfh.days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }
  if (reason) wfh.reason = reason;
  await wfh.save();
  res.status(200).json({ success: true, message: "WFH request updated", wfh });
};

const deleteWFH = async (req, res, next) => {
  const wfh = await WFH.findOne({ _id: req.params.id, organisation_id: req.employee.organisation_id });
  if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.requester.toString() !== req.employee._id.toString()) return next(Object.assign(new Error("Not authorized to delete this request"), { statusCode: 403 }));
  if (wfh.status !== "pending_manager") return next(Object.assign(new Error("Cannot delete a WFH request that is already processed"), { statusCode: 400 }));
  await wfh.deleteOne();
  res.status(200).json({ success: true, message: "WFH request deleted" });
};

const getMyWFH = async (req, res, next) => {
  const wfhList = await WFH.find({ requester: req.employee._id, organisation_id: req.employee.organisation_id })
    .populate("manager", "f_name l_name work_email designation").sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const getPendingWFH = async (req, res, next) => {
  const wfhList = await WFH.find({ manager: req.manager._id, organisation_id: req.manager.organisation_id, status: "pending_manager" })
    .populate("requester", "f_name l_name work_email department designation").sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const getAllTeamWFH = async (req, res, next) => {
  const wfhList = await WFH.find({ manager: req.manager._id, organisation_id: req.manager.organisation_id })
    .populate("requester", "f_name l_name work_email department designation").sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const approveWFH = async (req, res, next) => {
  const { wfhId } = req.body;
  if (!wfhId) return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));
  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.manager.organisation_id });
  if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.manager.toString() !== req.manager._id.toString()) return next(Object.assign(new Error("This WFH request does not belong to your team"), { statusCode: 403 }));
  if (wfh.status !== "pending_manager") return next(Object.assign(new Error("WFH request is already processed"), { statusCode: 400 }));
  wfh.status = "approved_manager";
  wfh.approvedBy = req.manager._id;
  await wfh.save();
  res.status(200).json({ success: true, message: "WFH request approved", wfh });
};

const rejectWFH = async (req, res, next) => {
  const { wfhId, remarks } = req.body;
  if (!wfhId) return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));
  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.manager.organisation_id });
  if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.manager.toString() !== req.manager._id.toString()) return next(Object.assign(new Error("This WFH request does not belong to your team"), { statusCode: 403 }));
  if (wfh.status !== "pending_manager") return next(Object.assign(new Error("WFH request is already processed"), { statusCode: 400 }));
  wfh.status = "rejected_manager";
  wfh.rejectedBy = req.manager._id;
  wfh.remarks = remarks || "";
  wfh.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await wfh.save();
  res.status(200).json({ success: true, message: "WFH request rejected", wfh });
};

const forwardWFHToReportingManager = async (req, res, next) => {
  const { wfhId, remarks } = req.body;
  if (!wfhId) return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));
  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.manager.organisation_id });
  if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.manager.toString() !== req.manager._id.toString()) return next(Object.assign(new Error("This WFH request does not belong to your team"), { statusCode: 403 }));
  if (wfh.status.startsWith("approved") || wfh.status.startsWith("rejected") || wfh.status === "forwarded_reporting_manager")
    return next(Object.assign(new Error("WFH request is already processed or forwarded"), { statusCode: 400 }));
  const currentManager = await Manager.findById(req.manager._id).select("reporting_manager").lean();
  if (!currentManager.reporting_manager) return next(Object.assign(new Error("You have no reporting manager assigned. Cannot forward WFH."), { statusCode: 400 }));
  wfh.status = "forwarded_reporting_manager";
  wfh.forwardedBy = req.manager._id;
  wfh.remarks = remarks || "";
  wfh.manager = currentManager.reporting_manager;
  await wfh.save();
  res.status(200).json({ success: true, message: "WFH request forwarded to reporting manager", wfh });
};

const managerApplyWFH = async (req, res, next) => {
  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate || !reason) return next(Object.assign(new Error("startDate, endDate, and reason are required"), { statusCode: 400 }));

  const managerId = req.manager._id;
  const organisation_id = req.manager.organisation_id;
  const currentManager = await Manager.findById(managerId).select("reporting_manager reporting_manager_model").lean();
  if (!currentManager) return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
  if (!currentManager.reporting_manager) return next(Object.assign(new Error("No reporting manager assigned. Cannot apply WFH."), { statusCode: 400 }));

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return next(Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }));
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const overlapping = await WFH.findOne({
    requester: managerId, requesterModel: "Manager", organisation_id,
    status: { $nin: ["rejected_admin", "rejected_reporting_manager"] },
    startDate: { $lte: end }, endDate: { $gte: start },
  }).select("_id").lean();
  if (overlapping) return next(Object.assign(new Error("You already have a WFH request for overlapping dates"), { statusCode: 409 }));

  const wfhStatus = currentManager.reporting_manager_model === "Admin" ? "pending_admin" : "pending_manager";
  const wfh = await WFH.create({ organisation_id, requester: managerId, requesterModel: "Manager", manager: currentManager.reporting_manager, managerModel: currentManager.reporting_manager_model, startDate: start, endDate: end, days, reason, status: wfhStatus });
  res.status(201).json({ success: true, message: "WFH request submitted successfully", wfh });
};

const managerGetMyWFH = async (req, res, next) => {
  const wfhList = await WFH.find({ requester: req.manager._id, requesterModel: "Manager", organisation_id: req.manager.organisation_id })
    .populate("manager", "f_name l_name work_email designation").sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const getForwardedWFH = async (req, res, next) => {
  const wfhList = await WFH.find({ manager: req.manager._id, organisation_id: req.manager.organisation_id, status: { $in: ["forwarded_reporting_manager", "pending_reporting_manager"] } })
    .populate("requester", "f_name l_name work_email department designation role").sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const approveForwardedWFH = async (req, res, next) => {
  const { wfhId, remarks } = req.body;
  if (!wfhId) return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));
  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.manager.organisation_id });
  if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.manager.toString() !== req.manager._id.toString()) return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (wfh.status !== "forwarded_reporting_manager" && wfh.status !== "pending_reporting_manager")
    return next(Object.assign(new Error("WFH request is not awaiting your approval"), { statusCode: 400 }));
  wfh.status = "approved_reporting_manager";
  wfh.approvedBy = req.manager._id;
  wfh.remarks = remarks || "";
  await wfh.save();
  res.status(200).json({ success: true, message: "WFH request approved by reporting manager", wfh });
};

const rejectForwardedWFH = async (req, res, next) => {
  const { wfhId, remarks } = req.body;
  if (!wfhId) return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));
  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.manager.organisation_id });
  if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.manager.toString() !== req.manager._id.toString()) return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (wfh.status !== "forwarded_reporting_manager" && wfh.status !== "pending_reporting_manager")
    return next(Object.assign(new Error("WFH request is not awaiting your decision"), { statusCode: 400 }));
  wfh.status = "rejected_reporting_manager";
  wfh.rejectedBy = req.manager._id;
  wfh.remarks = remarks || "";
  wfh.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await wfh.save();
  res.status(200).json({ success: true, message: "WFH request rejected by reporting manager", wfh });
};

const adminApplyWFH = async (req, res, next) => {
  if (!req.admin) return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate || !reason) return next(Object.assign(new Error("startDate, endDate, and reason are required"), { statusCode: 400 }));
  const admin = req.admin;
  const organisation_id = admin.organisation_id;
  if (!organisation_id) return next(Object.assign(new Error("No organisation / superadmin assigned. Cannot apply WFH."), { statusCode: 400 }));
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return next(Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }));
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const overlapping = await WFH.findOne({ requester: admin._id, organisation_id, status: { $nin: ["rejected_superadmin"] }, startDate: { $lte: end }, endDate: { $gte: start } }).select("_id").lean();
  if (overlapping) return next(Object.assign(new Error("You already have a WFH request for overlapping dates"), { statusCode: 409 }));
  const wfh = await WFH.create({ organisation_id, requester: admin._id, requesterModel: "Admin", superadmin: organisation_id, startDate: start, endDate: end, days, reason, status: "pending_superadmin" });
  res.status(201).json({ success: true, message: "WFH request submitted to superadmin", wfh });
};

const adminGetMyWFH = async (req, res, next) => {
  if (!req.admin) return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const wfhList = await WFH.find({ requester: req.admin._id, requesterModel: "Admin", organisation_id: req.admin.organisation_id })
    .populate("superadmin", "f_name l_name work_email").sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const adminGetForwardedWFH = async (req, res, next) => {
  try {
    if (!req.admin) return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    const wfhList = await WFH.find({ organisation_id: req.admin.organisation_id, status: { $in: ["pending_admin", "forwarded_reporting_manager"] } })
      .populate("requester", "f_name l_name work_email department designation role")
      .populate("manager", "f_name l_name work_email designation")
      .sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, count: wfhList.length, wfhList });
  } catch (error) { next(error); }
};

const adminApproveForwardedWFH = async (req, res, next) => {
  try {
    const { wfhId, remarks } = req.body;
    if (!req.admin) return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    if (!wfhId) return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));
    const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.admin.organisation_id });
    if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
    if (!["pending_admin", "forwarded_reporting_manager"].includes(wfh.status))
      return next(Object.assign(new Error("WFH request is not awaiting your approval"), { statusCode: 400 }));
    wfh.status = "approved_admin";
    wfh.approvedBy = req.admin._id;
    wfh.remarks = remarks || "";
    await wfh.save();
    res.status(200).json({ success: true, message: "WFH request approved by admin", wfh });
  } catch (error) { next(error); }
};

const adminRejectForwardedWFH = async (req, res, next) => {
  try {
    const { wfhId, remarks } = req.body;
    if (!req.admin) return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
    if (!wfhId) return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));
    const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.admin.organisation_id });
    if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
    if (!["pending_admin", "forwarded_reporting_manager"].includes(wfh.status))
      return next(Object.assign(new Error("WFH request is not awaiting your decision"), { statusCode: 400 }));
    wfh.status = "rejected_admin";
    wfh.rejectedBy = req.admin._id;
    wfh.remarks = remarks || "";
    wfh.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await wfh.save();
    res.status(200).json({ success: true, message: "WFH request rejected by admin", wfh });
  } catch (error) { next(error); }
};

const superadminGetPendingWFH = async (req, res, next) => {
  if (!req.superadmin) return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const wfhList = await WFH.find({ superadmin: req.superadmin._id, organisation_id: req.superadmin._id, status: "pending_superadmin" })
    .populate("requester", "f_name l_name work_email").sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const superadminApproveWFH = async (req, res, next) => {
  if (!req.superadmin) return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { wfhId, remarks } = req.body;
  if (!wfhId) return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));
  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.superadmin._id });
  if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (!wfh.superadmin || wfh.superadmin.toString() !== req.superadmin._id.toString())
    return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (wfh.status !== "pending_superadmin") return next(Object.assign(new Error("WFH request is already processed"), { statusCode: 400 }));
  wfh.status = "approved_superadmin";
  wfh.approvedBy = req.superadmin._id;
  wfh.remarks = remarks || "";
  await wfh.save();
  res.status(200).json({ success: true, message: "WFH request approved", wfh });
};

const superadminRejectWFH = async (req, res, next) => {
  if (!req.superadmin) return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));
  const { wfhId, remarks } = req.body;
  if (!wfhId) return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));
  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.superadmin._id });
  if (!wfh) return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (!wfh.superadmin || wfh.superadmin.toString() !== req.superadmin._id.toString())
    return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (wfh.status !== "pending_superadmin") return next(Object.assign(new Error("WFH request is already processed"), { statusCode: 400 }));
  wfh.status = "rejected_superadmin";
  wfh.rejectedBy = req.superadmin._id;
  wfh.remarks = remarks || "";
  wfh.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await wfh.save();
  res.status(200).json({ success: true, message: "WFH request rejected", wfh });
};

module.exports = {
  applyWFH, editWFH, deleteWFH, getMyWFH, getPendingWFH, getAllTeamWFH,
  approveWFH, rejectWFH, forwardWFHToReportingManager, managerApplyWFH,
  managerGetMyWFH, getForwardedWFH, approveForwardedWFH, rejectForwardedWFH,
  adminApplyWFH, adminGetMyWFH, superadminGetPendingWFH, superadminApproveWFH,
  superadminRejectWFH, adminGetForwardedWFH, adminApproveForwardedWFH, adminRejectForwardedWFH,
}; 