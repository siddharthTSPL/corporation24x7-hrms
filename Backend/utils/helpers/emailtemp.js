
function buildManagerEmail(name, designation, department, location, verifyLink) {
  return `<!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
  <tr><td align="center">
  <table width="600" style="background:#fff;border-radius:14px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;">
  <h1>Manager Onboarding</h1></td></tr>
  <tr><td style="padding:40px;">
  <h2>Hi ${name}</h2>
  <p>Your manager account has been created.</p>
  <p><strong>Role:</strong> ${designation}</p>
  <p><strong>Department:</strong> ${department}</p>
  <p><strong>Location:</strong> ${location}</p>
  <a href="${verifyLink}" style="background:#CD166E;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;">Verify Account</a>
  </td></tr>
  </table></td></tr>
  </table></body></html>`;
}

function buildEmployeeEmail(name, department, location, verifyLink) {
  return `<!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#F9F8F2;font-family:Segoe UI,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
  <tr><td align="center">
  <table width="600" style="background:#fff;border-radius:14px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#730042,#CD166E);padding:30px;text-align:center;color:white;">
  <h1>Welcome Aboard</h1></td></tr>
  <tr><td style="padding:40px;">
  <h2>Hello ${name}</h2>
  <p>Your employee account has been created.</p>
  <p><strong>Department:</strong> ${department}</p>
  <p><strong>Location:</strong> ${location}</p>
  <a href="${verifyLink}" style="background:#730042;color:white;padding:14px 30px;text-decoration:none;border-radius:8px;">Verify Account</a>
  </td></tr>
  </table></td></tr>
  </table></body></html>`;
}

const BRAND = {
  bg: "#F9F8F2",
  primary: "#730042",
  accent: "#CD166E",
  text: "#333333",
  muted: "#777777",
  approvedColor: "#1B8A3D",
  approvedBg: "#EAF7EE",
  rejectedColor: "#C62828",
  rejectedBg: "#FDECEA",
};

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const LEAVE_TYPE_LABELS = {
  el: "Earned Leave",
  sl: "Sick Leave",
  ml: "Maternity Leave",
  pl: "Paternity Leave",
  half_day_el: "Half Day - Earned Leave",
  half_day_sl: "Half Day - Sick Leave",
  lwp: "Leave Without Pay",
};

function leaveTypeLabel(code) {
  if (!code) return "";
  return LEAVE_TYPE_LABELS[code] || code;
}

function detailRow(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #F0EDE6;color:#8A8A8A;font-size:13px;width:150px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:10px 0 10px 16px;border-bottom:1px solid #F0EDE6;color:#2B2B2B;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

function statusBadge(decision) {
  const isApproved = decision === "approved";
  const color = isApproved ? BRAND.approvedColor : BRAND.rejectedColor;
  const bg = isApproved ? BRAND.approvedBg : BRAND.rejectedBg;
  const label = isApproved ? "Approved" : "Rejected";
  const icon = isApproved ? "&#9989;" : "&#10060;";
  return `<span style="display:inline-block;padding:6px 16px;border-radius:20px;background:${bg};color:${color};font-size:13px;font-weight:700;letter-spacing:0.3px;">${icon} ${label}</span>`;
}

function actionButton(link, label) {
  if (!link) return "";
  return `<div style="text-align:center;margin-top:28px;">
    <a href="${link}" style="background:${BRAND.accent};color:#ffffff;padding:13px 32px;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">${escapeHtml(label)}</a>
  </div>`;
}

function emailShell({ preheader = "", headerIcon = "&#128231;", headerTitle, bodyHtml, footerNote = "" }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.accent});padding:34px 40px;text-align:center;color:#ffffff;">
            <div style="font-size:32px;margin-bottom:8px;">${headerIcon}</div>
            <h1 style="margin:0;font-size:21px;font-weight:600;">${escapeHtml(headerTitle)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 30px;border-top:1px solid #F0EDE6;">
            <p style="margin:0;font-size:12px;color:#999;text-align:center;">${footerNote || "This is an automated notification from TorchX Talent. Please do not reply to this email."}</p>
            <p style="margin:6px 0 0;font-size:11px;color:#bbb;text-align:center;">TorchX Suite &bull; TechTorch Solutions Private Limited</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildApprovalRequestEmail({
  recipientName,
  requesterName,
  requestTypeLabel,
  leaveType,
  startDate,
  endDate,
  days,
  reason,
  portalLink,
  forwarded = false,
  forwardedByName = "",
}) {
  const title = forwarded ? `${requestTypeLabel} Forwarded To You` : `New ${requestTypeLabel}`;
  const intro = forwarded
    ? `<p style="margin:0 0 20px;color:${BRAND.text};font-size:15px;line-height:1.6;">
        Hi ${escapeHtml(recipientName)},<br/><br/>
        A ${escapeHtml(requestTypeLabel.toLowerCase())} raised by <strong>${escapeHtml(requesterName)}</strong> has been forwarded to you by <strong>${escapeHtml(forwardedByName)}</strong> and is now awaiting your decision.
      </p>`
    : `<p style="margin:0 0 20px;color:${BRAND.text};font-size:15px;line-height:1.6;">
        Hi ${escapeHtml(recipientName)},<br/><br/>
        <strong>${escapeHtml(requesterName)}</strong> has submitted a new ${escapeHtml(requestTypeLabel.toLowerCase())} that requires your approval.
      </p>`;

  const rows = [
    leaveType ? detailRow("Leave Type", leaveTypeLabel(leaveType)) : "",
    detailRow("Start Date", formatDate(startDate)),
    detailRow("End Date", formatDate(endDate)),
    detailRow("Duration", days ? `${days} day${Number(days) > 1 ? "s" : ""}` : ""),
    detailRow("Reason", reason),
  ].join("");

  const body = `
    ${intro}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px;">${rows}</table>
    ${actionButton(portalLink, "Review Request")}
  `;

  return emailShell({
    preheader: `${requesterName} submitted a ${requestTypeLabel.toLowerCase()} awaiting your approval`,
    headerIcon: forwarded ? "&#8618;" : "&#128221;",
    headerTitle: title,
    bodyHtml: body,
  });
}

function buildStatusDecisionEmail({
  recipientName,
  requestTypeLabel,
  leaveType,
  startDate,
  endDate,
  days,
  decision,
  decidedByName,
  remarks,
  portalLink,
}) {
  const isApproved = decision === "approved";
  const rows = [
    leaveType ? detailRow("Leave Type", leaveTypeLabel(leaveType)) : "",
    detailRow("Start Date", formatDate(startDate)),
    detailRow("End Date", formatDate(endDate)),
    detailRow("Duration", days ? `${days} day${Number(days) > 1 ? "s" : ""}` : ""),
    detailRow("Remarks", remarks),
  ].join("");

  const body = `
    <p style="margin:0 0 16px;color:${BRAND.text};font-size:15px;line-height:1.6;">
      Hi ${escapeHtml(recipientName)},<br/><br/>
      Your ${escapeHtml(requestTypeLabel.toLowerCase())} has been <strong>${isApproved ? "approved" : "rejected"}</strong>${decidedByName ? ` by <strong>${escapeHtml(decidedByName)}</strong>` : ""}.
    </p>
    <div style="margin-bottom:20px;">${statusBadge(decision)}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
    ${actionButton(portalLink, "View Details")}
  `;

  return emailShell({
    preheader: `Your ${requestTypeLabel.toLowerCase()} was ${decision}`,
    headerIcon: isApproved ? "&#9989;" : "&#10060;",
    headerTitle: `${requestTypeLabel} ${isApproved ? "Approved" : "Rejected"}`,
    bodyHtml: body,
  });
}

function buildAssetAssignedEmail({ recipientName, asset = {}, assignedByName, portalLink }) {
  const rows = [
    detailRow("Asset ID", asset.asset_id),
    detailRow("Asset Name", asset.asset_name),
    detailRow("Type", asset.asset_type),
    detailRow("Brand", asset.brand),
    detailRow("Model Number", asset.model_number),
    detailRow("Serial Number", asset.serial_number),
    detailRow("Assigned Date", formatDate(asset.assigned_date || new Date())),
  ].join("");

  const body = `
    <p style="margin:0 0 20px;color:${BRAND.text};font-size:15px;line-height:1.6;">
      Hi ${escapeHtml(recipientName)},<br/><br/>
      A company asset has been assigned to you${assignedByName ? ` by <strong>${escapeHtml(assignedByName)}</strong>` : ""}. Please find the asset details below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
    <p style="margin:20px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">
      This asset remains company property. Please take good care of it and report any damage or issues to your admin immediately. It must be returned in good working condition upon request or offboarding.
    </p>
    ${actionButton(portalLink, "View My Assets")}
  `;

  return emailShell({
    preheader: `${asset.asset_name || "An asset"} has been assigned to you`,
    headerIcon: "&#128187;",
    headerTitle: "Asset Assigned To You",
    bodyHtml: body,
  });
}

module.exports = {
  buildManagerEmail,
  buildEmployeeEmail,
  buildApprovalRequestEmail,
  buildStatusDecisionEmail,
  buildAssetAssignedEmail,
  leaveTypeLabel,
  formatDate,
};
