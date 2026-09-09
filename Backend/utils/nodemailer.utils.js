const nodemailer = require("nodemailer");
require("dotenv").config();

// Two mailboxes:
//   "noreply"  — OTPs, password resets, account verification/welcome,
//                leave/WFH/asset notifications. One-way, automated,
//                no reply expected. This is the DEFAULT mailbox.
//   "support"  — support requests, their acknowledgements, and ticket
//                status updates. The person may reasonably hit "reply"
//                and expect a human on the other end to see it.
//
// Falls back to the original single ZOHO_EMAIL/ZOHO_APP_PASSWORD mailbox
// for whichever of NOREPLY_EMAIL / SUPPORT_EMAIL isn't configured yet, so
// nothing breaks before both are set up in .env.
const MAILBOXES = {
  noreply: {
    user: process.env.NOREPLY_EMAIL || process.env.ZOHO_EMAIL,
    pass: process.env.NOREPLY_EMAIL_PASSWORD || process.env.ZOHO_APP_PASSWORD,
  },
  support: {
    user: process.env.SUPPORT_EMAIL || process.env.ZOHO_EMAIL,
    pass: process.env.SUPPORT_EMAIL_PASSWORD || process.env.ZOHO_APP_PASSWORD,
  },
};

// One transporter per distinct mailbox login, created lazily and cached —
// if noreply/support end up pointing at the same address (env vars not
// set yet) they'll happily share a single transporter.
const transporters = {};

const getTransporter = (mailbox) => {
  const config = MAILBOXES[mailbox] || MAILBOXES.noreply;
  const cacheKey = config.user;

  if (!transporters[cacheKey]) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: { user: config.user, pass: config.pass },
    });

    transporter
      .verify()
      .then(() => console.log(`Email transporter (${cacheKey}) is ready to send emails`))
      .catch((err) => console.error(`Email transporter (${cacheKey}) verification failed:`, err));

    transporters[cacheKey] = transporter;
  }

  return { transporter: transporters[cacheKey], from: config.user };
};

/**
 * @param {string} to
 * @param {string} subject
 * @param {string} [html]
 * @param {string} [text]
 * @param {Array}  [attachments]
 * @param {"noreply"|"support"} [mailbox="noreply"] - which mailbox to send
 *   from. Defaults to "noreply" so every existing call site that doesn't
 *   pass this keeps working exactly as before.
 * @param {string} [replyTo] - optional Reply-To override, e.g. the
 *   requester's own email address so a support agent can hit reply and
 *   land straight in the user's inbox instead of the shared support inbox.
 */
async function sendEmail({ to, subject, html, text, attachments, mailbox = "noreply", replyTo }) {
  const { transporter, from } = getTransporter(mailbox);

  const mailOptions = {
    from,
    to,
    subject,
    html,
    text,
    ...(attachments?.length && { attachments }),
    ...(replyTo && { replyTo }),
  };

  const details = await transporter.sendMail(mailOptions);
  console.log("Email sent:", details);
}

module.exports = { sendEmail };