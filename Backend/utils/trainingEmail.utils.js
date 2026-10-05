const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const dateTime = (value) => {
  if (!value) return "To be scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "To be scheduled";
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" });
};

function buildTrainingEmail({ companyName, recipientName, heading, intro, training, rows = [], action, reason, certificate = false }) {
  const company = escapeHtml(companyName || "Your organisation");
  const details = [
    ["Training", training?.title],
    ...(training?.details ? [["Learning details", training.details]] : []),
    ...rows,
  ].filter(([, value]) => value).map(([label, value]) =>
    `<tr><td style="padding:10px 0;color:#7a6470;font-size:13px;border-bottom:1px solid #eee7eb;width:38%">${escapeHtml(label)}</td><td style="padding:10px 0;color:#2d0a1a;font-size:14px;font-weight:600;border-bottom:1px solid #eee7eb">${escapeHtml(value)}</td></tr>`
  ).join("");
  const textRows = [
    `Training: ${training?.title || "Training"}`,
    ...(training?.details ? [`Details: ${training.details}`] : []),
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(reason ? [`Reason: ${reason}`] : []),
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f0f2;font-family:Arial,Helvetica,sans-serif;color:#2d0a1a">
  <div style="padding:28px 12px"><table role="presentation" align="center" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;background:#fff;border:1px solid #eadde3;border-radius:14px;overflow:hidden">
  <tr><td style="background:#5c0f30;padding:22px 30px;color:#fff;font-size:18px;font-weight:700">${company}<div style="font-size:12px;font-weight:400;color:#f4dce7;margin-top:5px">Learning &amp; development</div></td></tr>
  <tr><td style="padding:30px"><p style="margin:0 0 8px;color:#8b1a4a;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Training update</p>
  <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#2d0a1a">${escapeHtml(heading)}</h1>
  <p style="margin:0 0 18px;font-size:14px;line-height:1.7">Hello ${escapeHtml(recipientName || "there")}, ${escapeHtml(intro)}</p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #eee7eb">${details}</table>
  ${reason ? `<p style="margin:18px 0 0;padding:13px 15px;background:#fff7ed;border-left:3px solid #c2410c;font-size:13px;line-height:1.6"><strong>Review note:</strong> ${escapeHtml(reason)}</p>` : ""}
  ${certificate ? `<p style="margin:20px 0 0;padding:14px 16px;background:#f8f1f5;border-radius:8px;font-size:13px;line-height:1.6">Your approved certificate is attached to this email. You can also access it from your Training page.</p>` : ""}
  ${action ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#68535e">${escapeHtml(action)}</p>` : ""}</td></tr>
  <tr><td style="padding:16px 30px;background:#faf8f9;color:#8a7b82;font-size:11px;line-height:1.6">This is an automated message from ${company}. Please do not reply to this email.</td></tr>
  </table></div></body></html>`;
  return { html, text: `Hello ${recipientName || "there"}, ${intro}\n\n${textRows}${reason ? `\nReview note: ${reason}` : ""}${certificate ? "\nYour approved certificate is attached." : ""}` };
}

module.exports = { buildTrainingEmail, dateTime };
