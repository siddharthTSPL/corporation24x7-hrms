const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");
const SuperAdminModel = require("../Models/superadmin.model");
const { sendEmail } = require("./nodemailer.utils");
const {
  buildApprovalRequestEmail,
  buildStatusDecisionEmail,
  buildAssetAssignedEmail,
} = require("./helpers/emailtemp");

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
    console.error(`[notify] Email failed (${subject} -> ${to}):`, err.message);
  }
};

const notifyLeaveApplied = async ({
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

  const html = buildApprovalRequestEmail({
    recipientName: handler.name,
    requesterName,
    requestTypeLabel: "Leave Request",
    leaveType,
    startDate,
    endDate,
    days,
    reason,
    portalLink: `${PORTAL_BASE}/leave-requests`,
  });

  await safeSendMail({ to: handler.email, subject: `New Leave Request from ${requesterName}`, html });
};

const notifyLeaveForwarded = async ({
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

  const html = buildApprovalRequestEmail({
    recipientName: handler.name,
    requesterName,
    requestTypeLabel: "Leave Request",
    leaveType,
    startDate,
    endDate,
    days,
    reason,
    portalLink: `${PORTAL_BASE}/leave-requests`,
    forwarded: true,
    forwardedByName,
  });

  await safeSendMail({ to: handler.email, subject: `Leave Request Forwarded by ${forwardedByName}`, html });
};

const notifyLeaveDecision = async ({
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

  const html = buildStatusDecisionEmail({
    recipientName: recipient.name,
    requestTypeLabel: "Leave Request",
    leaveType,
    startDate,
    endDate,
    days,
    decision,
    decidedByName,
    remarks,
    portalLink: `${PORTAL_BASE}/my-leaves`,
  });

  await safeSendMail({
    to: recipient.email,
    subject: `Leave Request ${decision === "approved" ? "Approved" : "Rejected"}`,
    html,
  });
};

const notifyWFHApplied = async ({ requesterName, handlerModel, handlerId, startDate, endDate, days, reason }) => {
  const handler = await resolvePerson(handlerModel, handlerId);
  if (!handler || !handler.email) return;

  const html = buildApprovalRequestEmail({
    recipientName: handler.name,
    requesterName,
    requestTypeLabel: "Work From Home Request",
    startDate,
    endDate,
    days,
    reason,
    portalLink: `${PORTAL_BASE}/wfh-requests`,
  });

  await safeSendMail({ to: handler.email, subject: `New WFH Request from ${requesterName}`, html });
};

const notifyWFHForwarded = async ({
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

  const html = buildApprovalRequestEmail({
    recipientName: handler.name,
    requesterName,
    requestTypeLabel: "Work From Home Request",
    startDate,
    endDate,
    days,
    reason,
    portalLink: `${PORTAL_BASE}/wfh-requests`,
    forwarded: true,
    forwardedByName,
  });

  await safeSendMail({ to: handler.email, subject: `WFH Request Forwarded by ${forwardedByName}`, html });
};

const notifyWFHDecision = async ({
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

  const html = buildStatusDecisionEmail({
    recipientName: recipient.name,
    requestTypeLabel: "Work From Home Request",
    startDate,
    endDate,
    days,
    decision,
    decidedByName,
    remarks,
    portalLink: `${PORTAL_BASE}/my-wfh`,
  });

  await safeSendMail({
    to: recipient.email,
    subject: `WFH Request ${decision === "approved" ? "Approved" : "Rejected"}`,
    html,
  });
};

const notifyAssetAssigned = async ({ recipientModel, recipientId, asset, assignedByName }) => {
  const recipient = await resolvePerson(recipientModel, recipientId);
  if (!recipient || !recipient.email) return;

  const html = buildAssetAssignedEmail({
    recipientName: recipient.name,
    asset,
    assignedByName,
    portalLink: `${PORTAL_BASE}/my-assets`,
  });

  await safeSendMail({
    to: recipient.email,
    subject: `Asset Assigned: ${asset?.asset_name || asset?.asset_id || "New Asset"}`,
    html,
  });
};

module.exports = {
  resolvePerson,
  notifyLeaveApplied,
  notifyLeaveForwarded,
  notifyLeaveDecision,
  notifyWFHApplied,
  notifyWFHForwarded,
  notifyWFHDecision,
  notifyAssetAssigned,
};
