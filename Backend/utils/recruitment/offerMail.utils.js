const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtDate = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
};

const row = (label, value) =>
  value
    ? `<tr><td style="padding:9px 0;color:#7a7a7a;font-size:13px;width:42%;border-bottom:1px solid #f0ece4;">${esc(label)}</td><td style="padding:9px 0;color:#2b2b2b;font-size:14px;font-weight:600;border-bottom:1px solid #f0ece4;">${esc(value)}</td></tr>`
    : "";

const shell = ({ accent = "#730042", companyName, title, bodyHtml }) => `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f3ee;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f3ee;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ece8e0;">
<tr><td style="background:${esc(accent)};padding:22px 28px;color:#ffffff;font-size:18px;font-weight:700;">${esc(companyName)}</td></tr>
<tr><td style="padding:28px;">
<h2 style="margin:0 0 14px 0;color:#2b2b2b;font-size:20px;">${esc(title)}</h2>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;background:#faf9f6;color:#9a9a9a;font-size:11px;line-height:1.5;">This is an automated message from ${esc(companyName)} via TorchX Talent. Please do not share this email, the link in it is personal to you.</td></tr>
</table></td></tr></table></body></html>`;

const button = (href, label, bg, color = "#ffffff", border = "") =>
  `<a href="${esc(href)}" style="display:inline-block;padding:14px 30px;margin:6px 6px 6px 0;background:${bg};color:${color};text-decoration:none;font-weight:700;font-size:15px;border-radius:8px;${border}">${esc(label)}</a>`;

const summaryTable = ({ designation, annualCtcText, joiningDate, validTill, refNo }) =>
  `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 8px 0;">
${row("Reference", refNo)}${row("Designation", designation)}${row("Annual CTC", annualCtcText)}${row("Date of Joining", fmtDate(joiningDate))}${row("Offer Valid Until", fmtDate(validTill))}
</table>`;

const buildOfferEmail = ({ candidateName, companyName, accent, designation, annualCtcText, joiningDate, validTill, refNo, responseUrl }) => ({
  subject: `Offer of Employment - ${designation} at ${companyName}`,
  html: shell({
    accent,
    companyName,
    title: "Congratulations, you have an offer",
    bodyHtml: `<p style="margin:0 0 12px 0;color:#2b2b2b;font-size:14px;line-height:1.65;">Dear ${esc(candidateName)},</p>
<p style="margin:0 0 12px 0;color:#2b2b2b;font-size:14px;line-height:1.65;">We are pleased to offer you the position of <strong>${esc(designation)}</strong> at ${esc(companyName)}. Your offer letter is attached to this email as a PDF.</p>
${summaryTable({ designation, annualCtcText, joiningDate, validTill, refNo })}
<p style="margin:16px 0 6px 0;color:#2b2b2b;font-size:14px;">Please review the attached letter and let us know your decision:</p>
<div style="margin:10px 0 18px 0;">
${button(responseUrl, "Accept Offer", "#15803d")}${button(responseUrl, "Reject Offer", "#ffffff", "#b91c1c", "border:2px solid #b91c1c;padding:12px 28px;")}
</div>
<p style="margin:0 0 8px 0;color:#7a7a7a;font-size:12px;line-height:1.6;">The buttons open a secure page where you can confirm your response. Nothing is recorded until you confirm there. If the buttons do not work, copy this link into your browser:<br><span style="color:#2b2b2b;word-break:break-all;">${esc(responseUrl)}</span></p>`,
  }),
});

const buildOfferReminderEmail = ({ candidateName, companyName, accent, designation, validTill, responseUrl }) => ({
  subject: `Reminder: your offer from ${companyName} is awaiting your response`,
  html: shell({
    accent,
    companyName,
    title: "Your offer is waiting for your response",
    bodyHtml: `<p style="margin:0 0 12px 0;color:#2b2b2b;font-size:14px;line-height:1.65;">Dear ${esc(candidateName)},</p>
<p style="margin:0 0 12px 0;color:#2b2b2b;font-size:14px;line-height:1.65;">This is a gentle reminder that your offer for <strong>${esc(designation)}</strong> is valid until <strong>${esc(fmtDate(validTill))}</strong>. Please respond before it lapses.</p>
<div style="margin:16px 0;">${button(responseUrl, "Review and Respond", accent)}</div>`,
  }),
});

const buildOfferConfirmationEmail = ({ candidateName, companyName, accent, designation, action }) => ({
  subject: `Your response has been recorded - ${companyName}`,
  html: shell({
    accent,
    companyName,
    title: "Thank you, your response has been recorded",
    bodyHtml: `<p style="margin:0 0 12px 0;color:#2b2b2b;font-size:14px;line-height:1.65;">Dear ${esc(candidateName)},</p>
<p style="margin:0 0 12px 0;color:#2b2b2b;font-size:14px;line-height:1.65;">${
      action === "ACCEPTED"
        ? `We have recorded your acceptance of the offer for <strong>${esc(designation)}</strong>. Our HR team will contact you shortly with joining formalities.`
        : `We have recorded your decision to decline the offer for <strong>${esc(designation)}</strong>. We appreciate your time and wish you the very best.`
    }</p>`,
  }),
});

const buildHrOfferResponseEmail = ({ hrName, companyName, candidateName, designation, action, reason, comment, message }) => ({
  subject:
    action === "ACCEPTED"
      ? `Offer accepted: ${candidateName} (${designation})`
      : action === "REJECTED"
      ? `Offer declined: ${candidateName} (${designation})`
      : action === "EXPIRED"
      ? `Offer expired: ${candidateName} (${designation})`
      : `Change requested: ${candidateName} (${designation})`,
  html: shell({
    companyName,
    title:
      action === "ACCEPTED" ? "Offer accepted" : action === "REJECTED" ? "Offer declined" : action === "EXPIRED" ? "Offer expired without a response" : "Candidate requested changes",
    bodyHtml: `<p style="margin:0 0 12px 0;color:#2b2b2b;font-size:14px;line-height:1.65;">Hi ${esc(hrName || "there")},</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
${row("Candidate", candidateName)}${row("Position", designation)}${row("Reason", reason)}${row("Comment", comment)}${row("Message", message)}
</table>
<p style="margin:16px 0 0 0;color:#2b2b2b;font-size:13px;line-height:1.6;">${
      action === "ACCEPTED"
        ? "You can now mark the candidate as joined from the Offer tab."
        : action === "REJECTED"
        ? "The opening has been made available again for this requisition."
        : action === "EXPIRED"
        ? "You can resend the offer or extend its validity from the Offer tab."
        : "Review the request in the Offer tab and get back to the candidate."
    }</p>`,
  }),
});

const buildAppointmentEmail = ({ candidateName, companyName, accent, designation, joiningDate, refNo }) => ({
  subject: `Appointment Letter - ${designation} at ${companyName}`,
  html: shell({
    accent,
    companyName,
    title: "Welcome aboard",
    bodyHtml: `<p style="margin:0 0 12px 0;color:#2b2b2b;font-size:14px;line-height:1.65;">Dear ${esc(candidateName)},</p>
<p style="margin:0 0 12px 0;color:#2b2b2b;font-size:14px;line-height:1.65;">Welcome to ${esc(companyName)}. Please find your appointment letter attached as a PDF. Kindly sign the duplicate copy and hand it over to HR.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${row("Reference", refNo)}${row("Designation", designation)}${row("Date of Joining", fmtDate(joiningDate))}</table>`,
  }),
});

module.exports = {
  buildOfferEmail,
  buildOfferReminderEmail,
  buildOfferConfirmationEmail,
  buildHrOfferResponseEmail,
  buildAppointmentEmail,
};