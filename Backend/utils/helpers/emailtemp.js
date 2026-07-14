// ===================================================================
// TorchX Talent — Transactional Email Templates
// Professional, minimal, brand-consistent. No emoji icons, no CTA
// buttons — links (where required) are rendered as plain text.
// ===================================================================

const BRAND = {
  bg: "#F4F3EE",
  cardBg: "#FFFFFF",
  primary: "#730042",
  accent: "#CD166E",
  text: "#2B2B2B",
  muted: "#7A7A7A",
  border: "#ECE8E0",
  approvedText: "#730042",
  approvedBg: "#F7EAF0",
  rejectedText: "#5A5A5A",
  rejectedBg: "#F1F0EC",
};

const PRODUCT_NAME = "TorchX Talent";

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

// ---------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------

function detailRow(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};color:${BRAND.muted};font-size:13px;width:150px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${BRAND.border};color:${BRAND.text};font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`;
}

function sectionLabel(text) {
  return `<p style="margin:28px 0 10px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(text)}</p>`;
}

// Neutral, professional status pill — no red/green, no icons.
function statusBadge(decision) {
  const isApproved = decision === "approved";
  const color = isApproved ? BRAND.approvedText : BRAND.rejectedText;
  const bg = isApproved ? BRAND.approvedBg : BRAND.rejectedBg;
  const label = isApproved ? "Approved" : "Rejected";
  return `<span style="display:inline-block;padding:6px 18px;border-radius:3px;background:${bg};color:${color};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">${label}</span>`;
}

// Plain-text reference link — deliberately NOT styled as a button/CTA.
function plainLink(link, label = "Open TorchX Talent") {
  if (!link) return "";
  return `<p style="margin:24px 0 0;font-size:13px;color:${BRAND.muted};">
    ${escapeHtml(label)}: <a href="${link}" style="color:${BRAND.primary};text-decoration:underline;">${link}</a>
  </p>`;
}

// Renders a list of assets using the same detail-row pattern.
function assetListBlock(assets = []) {
  const list = Array.isArray(assets) ? assets.filter(Boolean) : [];
  if (list.length === 0) return "";

  const items = list
    .map((asset) => {
      const rows = [
        detailRow("Asset ID", asset.asset_id),
        detailRow("Asset Name", asset.asset_name),
        detailRow("Type", asset.asset_type),
        detailRow("Brand", asset.brand),
        detailRow("Model Number", asset.model_number),
        detailRow("Serial Number", asset.serial_number),
      ].join("");
      return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">${rows}</table>`;
    })
    .join("");

  return `
    ${sectionLabel(list.length > 1 ? "Assets Issued" : "Asset Issued")}
    ${items}
    <p style="margin:0 0 0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
      All listed items remain company property and must be maintained in good working condition. Please report any damage or malfunction to your administrator promptly.
    </p>`;
}

// ---------------------------------------------------------------
// Shell — clean masthead, no emoji, no icon glyphs
// ---------------------------------------------------------------

function emailShell({ preheader = "", eyebrow = PRODUCT_NAME, headerTitle, bodyHtml, footerNote = "" }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="600" style="background:${BRAND.cardBg};border-radius:8px;overflow:hidden;border:1px solid ${BRAND.border};">
        <tr>
          <td style="background:${BRAND.primary};padding:30px 40px;text-align:left;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.7);">${escapeHtml(eyebrow)}</p>
            <h1 style="margin:0;font-size:20px;font-weight:600;color:#ffffff;">${escapeHtml(headerTitle)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid ${BRAND.border};">
            <p style="margin:0;font-size:12px;color:${BRAND.muted};">${footerNote || `This is an automated notification from ${PRODUCT_NAME}. Please do not reply to this email.`}</p>
            <p style="margin:6px 0 0;font-size:11px;color:#B5B0A6;">TorchX Suite &bull; TechTorch Solutions Private Limited</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------
// Manager onboarding
// ---------------------------------------------------------------

function buildManagerEmail(name, designation, department, location, verifyLink, assets = []) {
  const rows = [
    detailRow("Role", designation),
    detailRow("Department", department),
    detailRow("Location", location),
  ].join("");

  const body = `
    <p style="margin:0 0 20px;color:${BRAND.text};font-size:15px;line-height:1.6;">
      Hi ${escapeHtml(name)},<br/><br/>
      Your manager account has been created on ${PRODUCT_NAME}. Your account details are below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
    ${assetListBlock(assets)}
    ${plainLink(verifyLink, "Verify your account")}
  `;

  return emailShell({
    preheader: `Your manager account has been created on ${PRODUCT_NAME}`,
    headerTitle: "Manager Account Created",
    bodyHtml: body,
  });
}

// ---------------------------------------------------------------
// Employee onboarding
// ---------------------------------------------------------------

function buildEmployeeEmail(name, department, location, verifyLink, assets = []) {
  const rows = [
    detailRow("Department", department),
    detailRow("Location", location),
  ].join("");

  const body = `
    <p style="margin:0 0 20px;color:${BRAND.text};font-size:15px;line-height:1.6;">
      Hi ${escapeHtml(name)},<br/><br/>
      Your employee account has been created on ${PRODUCT_NAME}. Your account details are below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
    ${assetListBlock(assets)}
    ${plainLink(verifyLink, "Verify your account")}
  `;

  return emailShell({
    preheader: `Your employee account has been created on ${PRODUCT_NAME}`,
    headerTitle: "Welcome to the Team",
    bodyHtml: body,
  });
}

// ---------------------------------------------------------------
// Leave / WFH approval request
// ---------------------------------------------------------------

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
        A ${escapeHtml(requestTypeLabel.toLowerCase())} raised by <strong>${escapeHtml(requesterName)}</strong> has been forwarded to you by <strong>${escapeHtml(forwardedByName)}</strong> and is awaiting your decision.
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
    ${plainLink(portalLink, "Review this request")}
  `;

  return emailShell({
    preheader: `${requesterName} submitted a ${requestTypeLabel.toLowerCase()} awaiting your approval`,
    headerTitle: title,
    bodyHtml: body,
  });
}

// ---------------------------------------------------------------
// Leave / WFH status decision
// ---------------------------------------------------------------

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
    ${plainLink(portalLink, "View full details")}
  `;

  return emailShell({
    preheader: `Your ${requestTypeLabel.toLowerCase()} was ${decision}`,
    headerTitle: `${requestTypeLabel} ${isApproved ? "Approved" : "Rejected"}`,
    bodyHtml: body,
  });
}

// ---------------------------------------------------------------
// Asset assignment (standalone, post-onboarding)
// ---------------------------------------------------------------

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
      A company asset has been assigned to you${assignedByName ? ` by <strong>${escapeHtml(assignedByName)}</strong>` : ""}. Please find the details below.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
    <p style="margin:20px 0 0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
      This asset remains company property. Please take good care of it and report any damage or issues to your admin immediately. It must be returned in good working condition upon request or offboarding.
    </p>
    ${plainLink(portalLink, "View my assets")}
  `;

  return emailShell({
    preheader: `${asset.asset_name || "An asset"} has been assigned to you`,
    headerTitle: "Asset Assigned To You",
    bodyHtml: body,
  });
}

// ---------------------------------------------------------------
// OTP / password reset
// ---------------------------------------------------------------

function otpBlock(otp, expiresInMinutes) {
  const digits = String(otp)
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 4px;"><div style="width:38px;height:46px;line-height:46px;text-align:center;border:1px solid ${BRAND.border};border-radius:4px;background:${BRAND.bg};font-size:20px;font-weight:700;color:${BRAND.primary};">${escapeHtml(d)}</div></td>`
    )
    .join("");

  return `
    <table cellpadding="0" cellspacing="0" style="margin:22px 0;">
      <tr>${digits}</tr>
    </table>
    <p style="margin:0;font-size:12px;color:${BRAND.muted};">This code expires in ${expiresInMinutes} minutes. Do not share it with anyone.</p>
  `;
}

function buildForgotPasswordOtpEmail({ recipientName = "", otp, expiresInMinutes = 5 }) {
  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hello,";
  const body = `
    <p style="margin:0 0 20px;color:${BRAND.text};font-size:15px;line-height:1.6;">
      ${greeting}<br/><br/>
      We received a request to reset the password for your ${PRODUCT_NAME} account. Use the verification code below to continue.
    </p>
    ${otpBlock(otp, expiresInMinutes)}
    <p style="margin:24px 0 0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
      If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
    </p>
  `;

  return emailShell({
    preheader: `Your ${PRODUCT_NAME} password reset code`,
    headerTitle: "Password Reset Code",
    bodyHtml: body,
  });
}

module.exports = {
  buildManagerEmail,
  buildEmployeeEmail,
  buildApprovalRequestEmail,
  buildStatusDecisionEmail,
  buildAssetAssignedEmail,
  buildForgotPasswordOtpEmail,
  leaveTypeLabel,
  formatDate,
};