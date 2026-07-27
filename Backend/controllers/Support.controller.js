const SuperAdminModel = require("../Models/superadmin.model");
const { sendEmail } = require("../utils/nodemailer.utils");
const {
  buildSupportRequestEmail,
  buildSupportAckEmail,
} = require("../utils/helpers/emailtemp");

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || process.env.ZOHO_EMAIL;

// Any logged-in role (superadmin/admin/manager/employee) hits this via its
// own route + own auth middleware — req.user is set by all four middlewares.
const sendSupportRequest = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { subject, message, page } = req.body;

  if (!subject || !subject.trim()) {
    return res.status(400).json({ success: false, message: "Subject is required" });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: "Please describe the problem" });
  }

  const name = [user.f_name, user.l_name].filter(Boolean).join(" ") || user.organisation_name || "";
  const email = user.work_email || user.email;
  const role = user.role || (req.superAdmin ? "superadmin" : undefined);

  let organisationName = user.organisation_name;
  if (!organisationName && user.organisation_id) {
    try {
      const org = await SuperAdminModel.findById(user.organisation_id).select("organisation_name");
      organisationName = org?.organisation_name;
    } catch {
      // Non-fatal — the support mail can still go out without this.
    }
  }

  if (!SUPPORT_EMAIL) {
    return res.status(500).json({
      success: false,
      message: "Support inbox isn't configured yet. Please contact your administrator.",
    });
  }

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[TorchX Talent Support] ${subject.trim()}`,
    html: buildSupportRequestEmail({
      name,
      email,
      role,
      uid: user.uid,
      organisationName,
      subject: subject.trim(),
      message: message.trim(),
      page,
    }),
  });

  if (email) {
    try {
      await sendEmail({
        to: email,
        subject: `We've received your request: ${subject.trim()}`,
        html: buildSupportAckEmail({ name, subject: subject.trim() }),
      });
    } catch (err) {
      // Acknowledgement failing shouldn't fail the whole request — the
      // support team already has the report in their inbox.
      console.error("Support ack email failed:", err.message);
    }
  }

  return res.status(200).json({
    success: true,
    message: "Your message has been sent to our support team.",
  });
};

module.exports = { sendSupportRequest };