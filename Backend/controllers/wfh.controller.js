const WFH = require("../Models/wfh.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const { parseISTDateOnly } = require("../utils/Istdate.utils");
const {
  notifyWFHApplied,
  notifyWFHForwarded,
  notifyWFHDecision,
  resolvePerson,
} = require("../utils/notify.utils");

const applyWFH = async (req, res, next) => {
  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate || !reason)
    return next(Object.assign(new Error("startDate, endDate, and reason are required"), { statusCode: 400 }));

  const employee = req.employee;
  const organisation_id = employee.organisation_id;

  if (!employee.Under_manager)
    return next(Object.assign(new Error("No manager assigned. Cannot apply WFH."), { statusCode: 400 }));

  const start = parseISTDateOnly(startDate);
  const end = parseISTDateOnly(endDate);
  if (end < start)
    return next(Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }));

  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const overlapping = await WFH.findOne({
    requester: employee._id,
    organisation_id,
    status: { $nin: ["rejected_manager", "rejected_reporting_manager", "rejected_admin"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).select("_id").lean();
  if (overlapping)
    return next(Object.assign(new Error("You already have a WFH request for overlapping dates"), { statusCode: 409 }));

  const wfh = await WFH.create({
    organisation_id,
    requester: employee._id,
    requesterModel: "User",
    currentHandler: employee.Under_manager,
    currentHandlerModel: "Manager",
    startDate: start,
    endDate: end,
    days,
    reason,
    status: "pending_manager",
  });

  notifyWFHApplied({
    requesterName: `${employee.f_name} ${employee.l_name}`,
    handlerModel: "Manager",
    handlerId: employee.Under_manager,
    startDate: start,
    endDate: end,
    days,
    reason,
  });

  res.status(201).json({ success: true, message: "WFH request submitted", wfh });
};

const editWFH = async (req, res, next) => {
  const wfh = await WFH.findOne({ _id: req.params.id, organisation_id: req.employee.organisation_id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.requester.toString() !== req.employee._id.toString())
    return next(Object.assign(new Error("Not authorized to edit this request"), { statusCode: 403 }));
  if (wfh.status !== "pending_manager")
    return next(Object.assign(new Error("Cannot edit a WFH request that is already processed or forwarded"), { statusCode: 400 }));

  const { startDate, endDate, reason } = req.body;
  if (startDate && endDate) {
    const start = parseISTDateOnly(startDate);
    const end = parseISTDateOnly(endDate);
    if (end < start)
      return next(Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }));
    wfh.startDate = start;
    wfh.endDate = end;
    wfh.days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  }
  if (reason) wfh.reason = reason;
  await wfh.save();
  res.status(200).json({ success: true, message: "WFH request updated", wfh });
};

const deleteWFH = async (req, res, next) => {
  const wfh = await WFH.findOne({ _id: req.params.id, organisation_id: req.employee.organisation_id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.requester.toString() !== req.employee._id.toString())
    return next(Object.assign(new Error("Not authorized to delete this request"), { statusCode: 403 }));
  if (wfh.status !== "pending_manager")
    return next(Object.assign(new Error("Cannot delete a WFH request that is already processed"), { statusCode: 400 }));
  await wfh.deleteOne();
  res.status(200).json({ success: true, message: "WFH request deleted" });
};

const getMyWFH = async (req, res, next) => {
  const wfhList = await WFH.find({ requester: req.employee._id, organisation_id: req.employee.organisation_id })
    .populate("currentHandler", "f_name l_name work_email designation")
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const getPendingWFH = async (req, res, next) => {
  const wfhList = await WFH.find({
    currentHandler: req.manager._id,
    currentHandlerModel: "Manager",
    organisation_id: req.manager.organisation_id,
    status: { $in: ["pending_manager", "pending_reporting_manager"] },
  })
    .populate("requester", "f_name l_name work_email department designation")
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const getAllTeamWFH = async (req, res, next) => {
  const wfhList = await WFH.find({
    organisation_id: req.manager.organisation_id,
    handlerChain: req.manager._id,
  })
    .populate("requester", "f_name l_name work_email department designation")
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const approveWFH = async (req, res, next) => {
  const { wfhId, remarks } = req.body;
  if (!wfhId)
    return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));

  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.manager.organisation_id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.currentHandler.toString() !== req.manager._id.toString() || wfh.currentHandlerModel !== "Manager")
    return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (!["pending_manager", "pending_reporting_manager"].includes(wfh.status))
    return next(Object.assign(new Error("WFH request is not awaiting your approval"), { statusCode: 400 }));

  wfh.status = wfh.status === "pending_manager" ? "approved_manager" : "approved_reporting_manager";
  wfh.approvedBy = req.manager._id;
  wfh.remarks = remarks || "";
  await wfh.save();

  notifyWFHDecision({
    recipientModel: wfh.requesterModel,
    recipientId: wfh.requester,
    startDate: wfh.startDate,
    endDate: wfh.endDate,
    days: wfh.days,
    decision: "approved",
    decidedByName: `${req.manager.f_name} ${req.manager.l_name || ""}`.trim(),
    remarks: wfh.remarks,
  });

  res.status(200).json({ success: true, message: "WFH request approved", wfh });
};

const rejectWFH = async (req, res, next) => {
  const { wfhId, remarks } = req.body;
  if (!wfhId)
    return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));

  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.manager.organisation_id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.currentHandler.toString() !== req.manager._id.toString() || wfh.currentHandlerModel !== "Manager")
    return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (!["pending_manager", "pending_reporting_manager"].includes(wfh.status))
    return next(Object.assign(new Error("WFH request is not awaiting your decision"), { statusCode: 400 }));

  wfh.status = wfh.status === "pending_manager" ? "rejected_manager" : "rejected_reporting_manager";
  wfh.rejectedBy = req.manager._id;
  wfh.remarks = remarks || "";
  wfh.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await wfh.save();

  notifyWFHDecision({
    recipientModel: wfh.requesterModel,
    recipientId: wfh.requester,
    startDate: wfh.startDate,
    endDate: wfh.endDate,
    days: wfh.days,
    decision: "rejected",
    decidedByName: `${req.manager.f_name} ${req.manager.l_name || ""}`.trim(),
    remarks: wfh.remarks,
  });

  res.status(200).json({ success: true, message: "WFH request rejected", wfh });
};

const forwardWFH = async (req, res, next) => {
  const { wfhId, remarks } = req.body;
  if (!wfhId)
    return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));

  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.manager.organisation_id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.currentHandler.toString() !== req.manager._id.toString() || wfh.currentHandlerModel !== "Manager")
    return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (!["pending_manager", "pending_reporting_manager"].includes(wfh.status))
    return next(Object.assign(new Error("WFH request is not awaiting your action"), { statusCode: 400 }));

  const currentManager = await Manager.findOne({ _id: req.manager._id, organisation_id: req.manager.organisation_id })
    .select("reporting_manager reporting_manager_model")
    .lean();

  if (!currentManager.reporting_manager)
    return next(Object.assign(new Error("No reporting manager assigned. Cannot forward."), { statusCode: 400 }));

  wfh.handlerChain = wfh.handlerChain || [];
  wfh.handlerChain.push(req.manager._id);
  wfh.currentHandler = currentManager.reporting_manager;
  wfh.currentHandlerModel = currentManager.reporting_manager_model;
  wfh.forwardedBy = req.manager._id;
  wfh.remarks = remarks || "";
  wfh.status = currentManager.reporting_manager_model === "Admin" ? "pending_admin" : "pending_reporting_manager";

  await wfh.save();

  const wfhRequesterDoc = await resolvePerson(wfh.requesterModel, wfh.requester);
  notifyWFHForwarded({
    requesterName: wfhRequesterDoc ? wfhRequesterDoc.name : "An employee",
    forwardedByName: `${req.manager.f_name} ${req.manager.l_name || ""}`.trim(),
    handlerModel: currentManager.reporting_manager_model,
    handlerId: currentManager.reporting_manager,
    startDate: wfh.startDate,
    endDate: wfh.endDate,
    days: wfh.days,
    reason: wfh.reason,
  });

  res.status(200).json({ success: true, message: "WFH request forwarded", wfh });
};

const managerApplyWFH = async (req, res, next) => {
  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate || !reason)
    return next(Object.assign(new Error("startDate, endDate, and reason are required"), { statusCode: 400 }));

  const managerId = req.manager._id;
  const organisation_id = req.manager.organisation_id;

  const currentManager = await Manager.findOne({ _id: managerId, organisation_id })
    .select("reporting_manager reporting_manager_model")
    .lean();
  if (!currentManager)
    return next(Object.assign(new Error("Manager not found"), { statusCode: 404 }));
  if (!currentManager.reporting_manager)
    return next(Object.assign(new Error("No reporting manager assigned. Cannot apply WFH."), { statusCode: 400 }));

  const start = parseISTDateOnly(startDate);
  const end = parseISTDateOnly(endDate);
  if (end < start)
    return next(Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }));

  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const overlapping = await WFH.findOne({
    requester: managerId,
    requesterModel: "Manager",
    organisation_id,
    status: { $nin: ["rejected_manager", "rejected_reporting_manager", "rejected_admin"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).select("_id").lean();
  if (overlapping)
    return next(Object.assign(new Error("You already have a WFH request for overlapping dates"), { statusCode: 409 }));

  const initialStatus = currentManager.reporting_manager_model === "Admin" ? "pending_admin" : "pending_reporting_manager";

  const wfh = await WFH.create({
    organisation_id,
    requester: managerId,
    requesterModel: "Manager",
    currentHandler: currentManager.reporting_manager,
    currentHandlerModel: currentManager.reporting_manager_model,
    startDate: start,
    endDate: end,
    days,
    reason,
    status: initialStatus,
  });

  notifyWFHApplied({
    requesterName: `${req.manager.f_name} ${req.manager.l_name || ""}`.trim(),
    handlerModel: currentManager.reporting_manager_model,
    handlerId: currentManager.reporting_manager,
    startDate: start,
    endDate: end,
    days,
    reason,
  });

  res.status(201).json({ success: true, message: "WFH request submitted successfully", wfh });
};

const managerGetMyWFH = async (req, res, next) => {
  const wfhList = await WFH.find({
    requester: req.manager._id,
    requesterModel: "Manager",
    organisation_id: req.manager.organisation_id,
  })
    .populate("currentHandler", "f_name l_name work_email designation")
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const adminGetPendingWFH = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const wfhList = await WFH.find({
    currentHandler: req.admin._id,
    currentHandlerModel: "Admin",
    organisation_id: req.admin.organisation_id,
    status: "pending_admin",
  })
    .populate("requester", "f_name l_name work_email department designation role")
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const adminApproveWFH = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { wfhId, remarks } = req.body;
  if (!wfhId)
    return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));

  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.admin.organisation_id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.currentHandler.toString() !== req.admin._id.toString() || wfh.currentHandlerModel !== "Admin")
    return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (wfh.status !== "pending_admin")
    return next(Object.assign(new Error("WFH request is not awaiting your approval"), { statusCode: 400 }));

  wfh.status = "approved_admin";
  wfh.approvedBy = req.admin._id;
  wfh.remarks = remarks || "";
  await wfh.save();

  notifyWFHDecision({
    recipientModel: wfh.requesterModel,
    recipientId: wfh.requester,
    startDate: wfh.startDate,
    endDate: wfh.endDate,
    days: wfh.days,
    decision: "approved",
    decidedByName: `${req.admin.f_name} ${req.admin.l_name || ""}`.trim(),
    remarks: wfh.remarks,
  });

  res.status(200).json({ success: true, message: "WFH request approved by admin", wfh });
};

const adminRejectWFH = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { wfhId, remarks } = req.body;
  if (!wfhId)
    return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));

  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.admin.organisation_id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.currentHandler.toString() !== req.admin._id.toString() || wfh.currentHandlerModel !== "Admin")
    return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (wfh.status !== "pending_admin")
    return next(Object.assign(new Error("WFH request is not awaiting your decision"), { statusCode: 400 }));

  wfh.status = "rejected_admin";
  wfh.rejectedBy = req.admin._id;
  wfh.remarks = remarks || "";
  wfh.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await wfh.save();

  notifyWFHDecision({
    recipientModel: wfh.requesterModel,
    recipientId: wfh.requester,
    startDate: wfh.startDate,
    endDate: wfh.endDate,
    days: wfh.days,
    decision: "rejected",
    decidedByName: `${req.admin.f_name} ${req.admin.l_name || ""}`.trim(),
    remarks: wfh.remarks,
  });

  res.status(200).json({ success: true, message: "WFH request rejected by admin", wfh });
};

const adminApplyWFH = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate || !reason)
    return next(Object.assign(new Error("startDate, endDate, and reason are required"), { statusCode: 400 }));

  const admin = req.admin;
  const organisation_id = admin.organisation_id;
  if (!organisation_id)
    return next(Object.assign(new Error("No organisation assigned. Cannot apply WFH."), { statusCode: 400 }));

  const start = parseISTDateOnly(startDate);
  const end = parseISTDateOnly(endDate);
  if (end < start)
    return next(Object.assign(new Error("End date cannot be before start date"), { statusCode: 400 }));

  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const overlapping = await WFH.findOne({
    requester: admin._id,
    requesterModel: "Admin",
    organisation_id,
    status: { $nin: ["rejected_superadmin"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  }).select("_id").lean();
  if (overlapping)
    return next(Object.assign(new Error("You already have a WFH request for overlapping dates"), { statusCode: 409 }));

  const wfh = await WFH.create({
    organisation_id,
    requester: admin._id,
    requesterModel: "Admin",
    currentHandler: organisation_id,
    currentHandlerModel: "SuperAdmin",
    superadmin: organisation_id,
    startDate: start,
    endDate: end,
    days,
    reason,
    status: "pending_superadmin",
  });

  notifyWFHApplied({
    requesterName: `${admin.f_name} ${admin.l_name || ""}`.trim(),
    handlerModel: "SuperAdmin",
    handlerId: organisation_id,
    startDate: start,
    endDate: end,
    days,
    reason,
  });

  res.status(201).json({ success: true, message: "WFH request submitted to superadmin", wfh });
};

const adminGetMyWFH = async (req, res, next) => {
  if (!req.admin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const wfhList = await WFH.find({
    requester: req.admin._id,
    requesterModel: "Admin",
    organisation_id: req.admin.organisation_id,
  })
    .populate("superadmin", "f_name l_name work_email")
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const superadminGetPendingWFH = async (req, res, next) => {
  if (!req.superAdmin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const wfhList = await WFH.find({
    superadmin: req.superAdmin._id,
    organisation_id: req.superAdmin._id,
    status: "pending_superadmin",
  })
    .populate("requester", "f_name l_name work_email")
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const superadminApproveWFH = async (req, res, next) => {
  if (!req.superAdmin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { wfhId, remarks } = req.body;
  if (!wfhId)
    return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));

  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.superAdmin._id, superadmin: req.superAdmin._id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.status !== "pending_superadmin")
    return next(Object.assign(new Error("WFH request is already processed"), { statusCode: 400 }));

  wfh.status = "approved_superadmin";
  wfh.approvedBy = req.superAdmin._id;
  wfh.remarks = remarks || "";
  await wfh.save();

  notifyWFHDecision({
    recipientModel: wfh.requesterModel,
    recipientId: wfh.requester,
    startDate: wfh.startDate,
    endDate: wfh.endDate,
    days: wfh.days,
    decision: "approved",
    decidedByName: `${req.superAdmin.f_name || ""} ${req.superAdmin.l_name || ""}`.trim() || "SuperAdmin",
    remarks: wfh.remarks,
  });

  res.status(200).json({ success: true, message: "WFH request approved", wfh });
};

const superadminRejectWFH = async (req, res, next) => {
  if (!req.superAdmin)
    return next(Object.assign(new Error("Unauthorized"), { statusCode: 401 }));

  const { wfhId, remarks } = req.body;
  if (!wfhId)
    return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));

  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.superAdmin._id, superadmin: req.superAdmin._id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.status !== "pending_superadmin")
    return next(Object.assign(new Error("WFH request is already processed"), { statusCode: 400 }));

  wfh.status = "rejected_superadmin";
  wfh.rejectedBy = req.superAdmin._id;
  wfh.remarks = remarks || "";
  wfh.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await wfh.save();

  notifyWFHDecision({
    recipientModel: wfh.requesterModel,
    recipientId: wfh.requester,
    startDate: wfh.startDate,
    endDate: wfh.endDate,
    days: wfh.days,
    decision: "rejected",
    decidedByName: `${req.superAdmin.f_name || ""} ${req.superAdmin.l_name || ""}`.trim() || "SuperAdmin",
    remarks: wfh.remarks,
  });

  res.status(200).json({ success: true, message: "WFH request rejected", wfh });
};


const getForwardedWFH = async (req, res, next) => {
  const wfhList = await WFH.find({
    currentHandler: req.manager._id,
    currentHandlerModel: "Manager",
    organisation_id: req.manager.organisation_id,
    status: "pending_reporting_manager",
  })
    .populate("requester", "f_name l_name work_email department designation")
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json({ success: true, count: wfhList.length, wfhList });
};

const approveForwardedWFH = async (req, res, next) => {
  const { wfhId, remarks } = req.body;
  if (!wfhId)
    return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));

  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.manager.organisation_id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.currentHandler.toString() !== req.manager._id.toString() || wfh.currentHandlerModel !== "Manager")
    return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (wfh.status !== "pending_reporting_manager")
    return next(Object.assign(new Error("WFH request is not awaiting your approval"), { statusCode: 400 }));

  wfh.status = "approved_reporting_manager";
  wfh.approvedBy = req.manager._id;
  wfh.remarks = remarks || "";
  await wfh.save();

  notifyWFHDecision({
    recipientModel: wfh.requesterModel,
    recipientId: wfh.requester,
    startDate: wfh.startDate,
    endDate: wfh.endDate,
    days: wfh.days,
    decision: "approved",
    decidedByName: `${req.manager.f_name} ${req.manager.l_name || ""}`.trim(),
    remarks: wfh.remarks,
  });

  res.status(200).json({ success: true, message: "WFH request approved", wfh });
};

const rejectForwardedWFH = async (req, res, next) => {
  const { wfhId, remarks } = req.body;
  if (!wfhId)
    return next(Object.assign(new Error("wfhId is required"), { statusCode: 400 }));

  const wfh = await WFH.findOne({ _id: wfhId, organisation_id: req.manager.organisation_id });
  if (!wfh)
    return next(Object.assign(new Error("WFH request not found"), { statusCode: 404 }));
  if (wfh.currentHandler.toString() !== req.manager._id.toString() || wfh.currentHandlerModel !== "Manager")
    return next(Object.assign(new Error("This WFH request is not in your queue"), { statusCode: 403 }));
  if (wfh.status !== "pending_reporting_manager")
    return next(Object.assign(new Error("WFH request is not awaiting your decision"), { statusCode: 400 }));

  wfh.status = "rejected_reporting_manager";
  wfh.rejectedBy = req.manager._id;
  wfh.remarks = remarks || "";
  wfh.deleteAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await wfh.save();

  notifyWFHDecision({
    recipientModel: wfh.requesterModel,
    recipientId: wfh.requester,
    startDate: wfh.startDate,
    endDate: wfh.endDate,
    days: wfh.days,
    decision: "rejected",
    decidedByName: `${req.manager.f_name} ${req.manager.l_name || ""}`.trim(),
    remarks: wfh.remarks,
  });

  res.status(200).json({ success: true, message: "WFH request rejected", wfh });
};


module.exports = {
  applyWFH,
  editWFH,
  deleteWFH,
  getMyWFH,
  getPendingWFH,
  getAllTeamWFH,
  approveWFH,
  rejectWFH,
  forwardWFH,
  managerApplyWFH,
  managerGetMyWFH,
  getForwardedWFH,
  approveForwardedWFH,
  rejectForwardedWFH,
  adminGetPendingWFH,
  adminApproveWFH,
  adminRejectWFH,
  adminApplyWFH,
  adminGetMyWFH,
  superadminGetPendingWFH,
  superadminApproveWFH,
  superadminRejectWFH,
};