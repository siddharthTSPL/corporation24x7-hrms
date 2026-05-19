
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