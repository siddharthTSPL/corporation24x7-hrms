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

const fmtDateTimeIst = (d) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.toLocaleString("en-IN", { weekday: "short", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })} IST`;
};

const p = (html) => `<p style="margin:0 0 12px 0;color:#2b2b2b;font-size:14px;line-height:1.65;">${html}</p>`;

const buildApprovalRequestEmail = ({ approverName, companyName, requesterName, kindLabel, candidateName, designation, refNo, annualCtcText, reviewUrl }) => ({
  subject: `Approval needed: ${kindLabel} for ${candidateName}`,
  html: shell({
    companyName,
    title: `${kindLabel} waiting for your approval`,
    bodyHtml: `${p(`Hi ${esc(approverName || "there")},`)}
${p(`<strong>${esc(requesterName)}</strong> has sent a ${esc(kindLabel.toLowerCase())} to you for review and finalization. Please review it and approve with your signature, or reject it with a reason.`)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${row("Candidate", candidateName)}${row("Position", designation)}${row("Reference", refNo)}${row("Annual CTC", annualCtcText)}</table>
${reviewUrl ? `<div style="margin:18px 0 6px 0;">${button(reviewUrl, "Review and Approve", "#730042")}</div>` : ""}
${p(`<span style="color:#7a7a7a;font-size:12px;">You will find it under Recruitment, in the Offer Approvals section.</span>`)}`,
  }),
});

const buildApprovalResultEmail = ({ requesterName, companyName, kindLabel, candidateName, designation, refNo, approverName, approved, reason }) => ({
  subject: approved ? `${kindLabel} approved: ${candidateName}` : `${kindLabel} rejected: ${candidateName}`,
  html: shell({
    companyName,
    title: approved ? `${kindLabel} approved and signed` : `${kindLabel} rejected`,
    bodyHtml: `${p(`Hi ${esc(requesterName || "there")},`)}
${p(
  approved
    ? `<strong>${esc(approverName)}</strong> has approved the ${esc(kindLabel.toLowerCase())} for <strong>${esc(candidateName)}</strong> and attached their signature. The letter is now finalized and ready to be sent to the candidate.`
    : `<strong>${esc(approverName)}</strong> has rejected the ${esc(kindLabel.toLowerCase())} for <strong>${esc(candidateName)}</strong>. Please regenerate it with the requested changes and send it for approval again.`
)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${row("Candidate", candidateName)}${row("Position", designation)}${row("Reference", refNo)}${approved ? "" : row("Reason", reason)}</table>`,
  }),
});

const interviewRows = ({ roundLabel, scheduledAt, durationMinutes, mode, platform, location, interviewerName }) =>
  `${row("Round", roundLabel)}${row("Date and time", fmtDateTimeIst(scheduledAt))}${row("Duration", durationMinutes ? `${durationMinutes} minutes` : "")}${row("Mode", mode)}${row("Platform", platform)}${row("Venue", location)}${row("Interviewer", interviewerName)}`;

const buildInterviewInviteEmail = ({ candidateName, companyName, designation, roundLabel, scheduledAt, durationMinutes, mode, platform, meetingLink, location, instructions, interviewerName, hrName, hrEmail }) => ({
  subject: `Interview scheduled: ${roundLabel} for ${designation} at ${companyName}`,
  html: shell({
    companyName,
    title: "Your interview has been scheduled",
    bodyHtml: `${p(`Dear ${esc(candidateName)},`)}
${p(`Thank you for your interest in the <strong>${esc(designation)}</strong> position at ${esc(companyName)}. We are pleased to invite you for the following interview round.`)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0;">${interviewRows({ roundLabel, scheduledAt, durationMinutes, mode, platform, location, interviewerName })}</table>
${meetingLink ? `<div style="margin:16px 0 8px 0;">${button(meetingLink, "Join Meeting", "#730042")}</div>${p(`<span style="color:#7a7a7a;font-size:12px;">If the button does not work, copy this link into your browser:<br><span style="color:#2b2b2b;word-break:break-all;">${esc(meetingLink)}</span></span>`)}` : ""}
${instructions ? `<div style="margin:12px 0;padding:12px 14px;background:#faf9f6;border-left:3px solid #730042;color:#2b2b2b;font-size:13px;line-height:1.6;white-space:pre-line;"><strong>Instructions</strong><br>${esc(instructions)}</div>` : ""}
${p(`A calendar invite is attached, you can add it to your calendar with one click. Please join a few minutes early and keep a copy of your resume handy.`)}
${hrName ? p(`For any questions, contact ${esc(hrName)}${hrEmail ? ` at <a href="mailto:${esc(hrEmail)}" style="color:#730042;">${esc(hrEmail)}</a>` : ""}.`) : ""}
${p("Best of luck!")}`,
  }),
});

const buildInterviewerInviteEmail = ({ interviewerName, companyName, candidateName, candidateEmail, designation, roundLabel, scheduledAt, durationMinutes, mode, platform, meetingLink, location, instructions }) => ({
  subject: `You are the interviewer: ${candidateName} (${roundLabel})`,
  html: shell({
    companyName,
    title: "You have an interview to conduct",
    bodyHtml: `${p(`Hi ${esc(interviewerName || "there")},`)}
${p(`You have been assigned to interview <strong>${esc(candidateName)}</strong> for the <strong>${esc(designation)}</strong> position.`)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0;">${row("Candidate", candidateName)}${row("Candidate email", candidateEmail)}${interviewRows({ roundLabel, scheduledAt, durationMinutes, mode, platform, location })}</table>
${meetingLink ? `<div style="margin:16px 0 8px 0;">${button(meetingLink, "Open Meeting Link", "#730042")}</div>` : ""}
${instructions ? `<div style="margin:12px 0;padding:12px 14px;background:#faf9f6;border-left:3px solid #730042;color:#2b2b2b;font-size:13px;line-height:1.6;white-space:pre-line;"><strong>Notes</strong><br>${esc(instructions)}</div>` : ""}
${p("Please add your feedback and score from the Rounds tab after the interview.")}`,
  }),
});

// Minimal RFC 5545 calendar event so the invite can be added to any calendar.
const buildInterviewIcs = ({ uid, title, description, location, start, durationMinutes = 45, organizerEmail }) => {
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc2 = (t) => String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const startDate = new Date(start);
  const end = new Date(startDate.getTime() + durationMinutes * 60000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TorchX Talent//Interview//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@torchx-talent`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startDate)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc2(title)}`,
    `DESCRIPTION:${esc2(description)}`,
    location ? `LOCATION:${esc2(location)}` : null,
    organizerEmail ? `ORGANIZER:mailto:${organizerEmail}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
};

module.exports = {
  buildApprovalRequestEmail,
  buildApprovalResultEmail,
  buildInterviewInviteEmail,
  buildInterviewerInviteEmail,
  buildInterviewIcs,
  buildOfferEmail,
  buildOfferReminderEmail,
  buildOfferConfirmationEmail,
  buildHrOfferResponseEmail,
  buildAppointmentEmail,
};