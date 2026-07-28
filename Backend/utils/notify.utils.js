const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");
const SuperAdminModel = require("../Models/superadmin.model");
const { sendEmail } = require("./nodemailer.utils");
const emailtemp = require("./helpers/emailtemp");

require("dotenv").config();

const PORTAL_BASE = process.env.TORCHX_TALENT_URL || "https://torchxsuite.com/talent";

const MODEL_MAP = {
  User: Usermodel,
  Manager: Managermodel,
  Admin: AdminModel,
  SuperAdmin: SuperAdminModel,
};

const resolvePerson = async (modelName, id) => {
  if (!modelName || !id) return null;
  const Model = MODEL_MAP[modelName];
  if (!Model) return null;

  const isSuperAdmin = modelName === "SuperAdmin";
  const doc = await Model.findById(id)
    .select(isSuperAdmin ? "f_name l_name email organisation_name" : "f_name l_name work_email")
    .lean();
  if (!doc) return null;

  const name = `${doc.f_name || ""} ${doc.l_name || ""}`.trim() || doc.organisation_name || "there";
  const email = isSuperAdmin ? doc.email : doc.work_email;
  return { name, email };
};

const safeSendMail = async ({ to, subject, html }) => {
  if (!to) return;
  try {
    await sendEmail({ to, subject, html });
  } catch (err) {
    console.error(`[notify] Email send failed (${subject} -> ${to}):`, err.message);
  }
};

// Wraps every notify function so a template/lookup/send error can NEVER crash
// the calling controller or the process. Any failure is just logged.
const guarded = (fn, label) => async (payload) => {
  try {
    await fn(payload);
  } catch (err) {
    console.error(`[notify] ${label} failed:`, err && err.stack ? err.stack : err);
  }
};

const _notifyLeaveApplied = async ({
  requesterName,
  handlerModel,
  handlerId,
  leaveType,
  startDate,
  endDate,
  days,
  reason,
}) => {
  const handler = await resolvePerson(handlerModel, handlerId);
  if (!handler || !handler.email) return;

  const html = emailtemp.buildApprovalRequestEmail({
    recipientName: handler.name,
    requesterName,
    requestTypeLabel: "Leave Request",
    leaveType,
    startDate,
    endDate,
    days,
    reason,
    portalLink: `${PORTAL_BASE}/login`,
  });

  await safeSendMail({ to: handler.email, subject: `New Leave Request from ${requesterName}`, html });
};

const _notifyLeaveForwarded = async ({
  requesterName,
  forwardedByName,
  handlerModel,
  handlerId,
  leaveType,
  startDate,
  endDate,
  days,
  reason,
}) => {
  const handler = await resolvePerson(handlerModel, handlerId);
  if (!handler || !handler.email) return;

  const html = emailtemp.buildApprovalRequestEmail({
    recipientName: handler.name,
    requesterName,
    requestTypeLabel: "Leave Request",
    leaveType,
    startDate,
    endDate,
    days,
    reason,
    portalLink: `${PORTAL_BASE}/login`,
    forwarded: true,
    forwardedByName,
  });

  await safeSendMail({ to: handler.email, subject: `Leave Request Forwarded by ${forwardedByName}`, html });
};

const _notifyLeaveDecision = async ({
  recipientModel,
  recipientId,
  leaveType,
  startDate,
  endDate,
  days,
  decision,
  decidedByName,
  remarks,
}) => {
  const recipient = await resolvePerson(recipientModel, recipientId);
  if (!recipient || !recipient.email) return;

  const html = emailtemp.buildStatusDecisionEmail({
    recipientName: recipient.name,
    requestTypeLabel: "Leave Request",
    leaveType,
    startDate,
    endDate,
    days,
    decision,
    decidedByName,
    remarks,
    portalLink: `${PORTAL_BASE}/login`,
  });

  await safeSendMail({
    to: recipient.email,
    subject: `Leave Request ${decision === "approved" ? "Approved" : "Rejected"}`,
    html,
  });
};

const _notifyWFHApplied = async ({ requesterName, handlerModel, handlerId, startDate, endDate, days, reason }) => {
  const handler = await resolvePerson(handlerModel, handlerId);
  if (!handler || !handler.email) return;

  const html = emailtemp.buildApprovalRequestEmail({
    recipientName: handler.name,
    requesterName,
    requestTypeLabel: "Work From Home Request",
    startDate,
    endDate,
    days,
    reason,
    portalLink: `${PORTAL_BASE}/login`,
  });

  await safeSendMail({ to: handler.email, subject: `New WFH Request from ${requesterName}`, html });
};

const _notifyWFHForwarded = async ({
  requesterName,
  forwardedByName,
  handlerModel,
  handlerId,
  startDate,
  endDate,
  days,
  reason,
}) => {
  const handler = await resolvePerson(handlerModel, handlerId);
  if (!handler || !handler.email) return;

  const html = emailtemp.buildApprovalRequestEmail({
    recipientName: handler.name,
    requesterName,
    requestTypeLabel: "Work From Home Request",
    startDate,
    endDate,
    days,
    reason,
    portalLink: `${PORTAL_BASE}/login`,
    forwarded: true,
    forwardedByName,
  });

  await safeSendMail({ to: handler.email, subject: `WFH Request Forwarded by ${forwardedByName}`, html });
};

const _notifyWFHDecision = async ({
  recipientModel,
  recipientId,
  startDate,
  endDate,
  days,
  decision,
  decidedByName,
  remarks,
}) => {
  const recipient = await resolvePerson(recipientModel, recipientId);
  if (!recipient || !recipient.email) return;

  const html = emailtemp.buildStatusDecisionEmail({
    recipientName: recipient.name,
    requestTypeLabel: "Work From Home Request",
    startDate,
    endDate,
    days,
    decision,
    decidedByName,
    remarks,
    portalLink: `${PORTAL_BASE}/login`,
  });

  await safeSendMail({
    to: recipient.email,
    subject: `WFH Request ${decision === "approved" ? "Approved" : "Rejected"}`,
    html,
  });
};

const _notifyAssetAssigned = async ({ recipientModel, recipientId, asset, assignedByName }) => {
  const recipient = await resolvePerson(recipientModel, recipientId);
  if (!recipient || !recipient.email) return;

  const html = emailtemp.buildAssetAssignedEmail({
    recipientName: recipient.name,
    asset,
    assignedByName,
    portalLink: `${PORTAL_BASE}/login`,
  });

  await safeSendMail({
    to: recipient.email,
    subject: `Asset Assigned: ${asset?.asset_name || asset?.asset_id || "New Asset"}`,
    html,
  });
};

module.exports = {
  resolvePerson,
  notifyLeaveApplied: guarded(_notifyLeaveApplied, "notifyLeaveApplied"),
  notifyLeaveForwarded: guarded(_notifyLeaveForwarded, "notifyLeaveForwarded"),
  notifyLeaveDecision: guarded(_notifyLeaveDecision, "notifyLeaveDecision"),
  notifyWFHApplied: guarded(_notifyWFHApplied, "notifyWFHApplied"),
  notifyWFHForwarded: guarded(_notifyWFHForwarded, "notifyWFHForwarded"),
  notifyWFHDecision: guarded(_notifyWFHDecision, "notifyWFHDecision"),
  notifyAssetAssigned: guarded(_notifyAssetAssigned, "notifyAssetAssigned"),
};