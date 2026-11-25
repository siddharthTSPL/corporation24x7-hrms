const {
  emailShell,
  detailRow,
  sectionLabel,
  plainLink,
  escapeHtml,
  BRAND,
} = require("./emailtemp");

const STATUS_LABELS = {
  draft: "Draft",
  pending_manager: "Pending manager review",
  pending_reporting_manager: "Pending reporting manager review",
  pending_coadmin: "Pending co-admin review",
  pending_admin: "Pending admin review",
  pending_superadmin: "Pending super admin review",
  approved: "Approved",
  rejected: "Rejected",
};

const statusLabel = (status) => STATUS_LABELS[status] || status || "";

const statusPill = (label, tone) => {
  const palette =
    tone === "approved"
      ? { color: BRAND.approvedText, bg: BRAND.approvedBg }
      : { color: BRAND.rejectedText, bg: BRAND.rejectedBg };
  return `<span style="display:inline-block;padding:6px 18px;border-radius:3px;background:${palette.bg};color:${palette.color};font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">${escapeHtml(label)}</span>`;
};

const reasonBlock = (title, text) => {
  if (!text) return "";
  return `
    ${sectionLabel(title)}
    <p style="margin:0;padding:14px 16px;background:${BRAND.rejectedBg};border-left:3px solid ${BRAND.primary};color:${BRAND.text};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(text)}</p>`;
};

function buildTimesheetAlertEmail({
  preheader,
  headerTitle,
  recipientName,
  intro,
  pill,
  rows = [],
  reasonTitle,
  reasonText,
  actionText,
  link,
  linkLabel = "Open timesheet",
}) {
  const detailRows = rows.map(([label, value]) => detailRow(label, value)).join("");

  const body = `
    <p style="margin:0 0 16px;color:${BRAND.text};font-size:15px;line-height:1.6;">
      Hi ${escapeHtml(recipientName || "there")},<br/><br/>
      ${intro}
    </p>
    ${pill ? `<div style="margin-bottom:20px;">${statusPill(pill.label, pill.tone)}</div>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${detailRows}</table>
    ${reasonBlock(reasonTitle, reasonText)}
    ${
      actionText
        ? `<p style="margin:24px 0 0;color:${BRAND.text};font-size:14px;line-height:1.6;"><strong>Action required:</strong> ${escapeHtml(actionText)}</p>`
        : ""
    }
    ${plainLink(link, linkLabel)}
    <p style="margin:16px 0 0;color:${BRAND.muted};font-size:12px;line-height:1.6;">You will be asked to sign in before the timesheet opens. Access follows your existing permissions.</p>
  `;

  return emailShell({ preheader, headerTitle, bodyHtml: body });
}

module.exports = { buildTimesheetAlertEmail, statusLabel };
