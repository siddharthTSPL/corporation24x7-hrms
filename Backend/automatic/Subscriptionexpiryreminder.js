const cron = require("node-cron");
const SuperAdminModel = require("../Models/superadmin.model");
const { sendEmail } = require("../utils/nodemailer.utils");
const { buildSubscriptionExpiringEmail } = require("../utils/helpers/emailtemp");

require("dotenv").config();

const PORTAL_BASE = process.env.TORCHX_TALENT_URL || "https://torchxsuite.com/talent";

// Reminder window: once an active license is within this many days of its
// expiresAt, its org's SuperAdmin starts getting a reminder email — one a
// day — until it's renewed or it actually expires.
const REMINDER_WINDOW_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysLeft = (expiresAt) => Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / MS_PER_DAY));

// Compares two dates on the Asia/Kolkata calendar day only, so a license
// reminded at 11:58 PM IST and checked again at 12:02 AM IST isn't treated
// as "already reminded today".
const isSameIstDay = (a, b) => {
  const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  return fmt(a) === fmt(b);
};

const sendSubscriptionExpiryReminders = async () => {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * MS_PER_DAY);

    // Pull every org with at least one active license landing inside the
    // reminder window — the per-license, per-day filtering happens below.
    const orgs = await SuperAdminModel.find({
      "licenses.isActive": true,
      "licenses.expiresAt": { $gte: now, $lte: windowEnd },
    }).select("email f_name l_name organisation_name licenses");

    let emailsSent = 0;
    let orgsChecked = 0;

    for (const org of orgs) {
      orgsChecked += 1;

      const dueLicenses = org.licenses.filter((license) => {
        if (!license.isActive) return false;
        const expiresAt = new Date(license.expiresAt);
        if (expiresAt < now || expiresAt > windowEnd) return false;
        // Already reminded today — keep it to one email per day per license.
        if (license.last_expiry_reminder_sent_at && isSameIstDay(license.last_expiry_reminder_sent_at, now)) {
          return false;
        }
        return true;
      });

      if (dueLicenses.length === 0) continue;

      if (!org.email) {
        console.warn(`[Subscription Expiry Reminder] Skipping ${org.organisation_name} — no SuperAdmin email on file`);
        continue;
      }

      const licenseDetails = dueLicenses.map((license) => ({
        product: license.product,
        plan: license.plan,
        planType: license.plan_type,
        expiresAt: license.expiresAt,
        daysLeft: daysLeft(license.expiresAt),
      }));

      const soonest = Math.min(...licenseDetails.map((l) => l.daysLeft));
      const recipientName = `${org.f_name || ""} ${org.l_name || ""}`.trim() || "there";

      try {
        const html = buildSubscriptionExpiringEmail({
          recipientName,
          orgName: org.organisation_name,
          licenses: licenseDetails,
          portalLink: `${PORTAL_BASE}/settings`,
        });

        await sendEmail({
          to: org.email,
          subject:
            licenseDetails.length > 1
              ? `Action Required: ${licenseDetails.length} Subscriptions Expiring Soon`
              : `Action Required: Your ${licenseDetails[0].product.replace("torchx_", "").replace(/^\w/, (c) => c.toUpperCase())} Subscription Expires in ${soonest} Day${soonest === 1 ? "" : "s"}`,
          html,
        });

        // Only stamp the licenses that were actually just emailed about.
        dueLicenses.forEach((license) => {
          license.last_expiry_reminder_sent_at = now;
        });
        await org.save();

        emailsSent += 1;
      } catch (mailErr) {
        console.error(`[Subscription Expiry Reminder] Failed to email ${org.email}:`, mailErr.message);
      }
    }

    console.log(
      `[Subscription Expiry Reminder] Sent ${emailsSent} reminder email(s) across ${orgsChecked} organisation(s) checked`
    );
  } catch (error) {
    console.error("[Subscription Expiry Reminder] Error:", error.message);
  }
};

// Runs once a day at 9:00 AM IST.
cron.schedule("0 9 * * *", sendSubscriptionExpiryReminders, { timezone: "Asia/Kolkata" });

module.exports = sendSubscriptionExpiryReminders;