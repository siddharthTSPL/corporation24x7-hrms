const cron = require("node-cron");
const mongoose = require("mongoose");
const FeatureLaunchModel = require("../Models/featureLaunch.model");
const SuperAdminModel = require("../Models/superadmin.model");
const AdminModel = require("../Models/Admin.model");
const { createBulkNotifications } = require("../utils/Notification.utils");
const { sendEmail } = require("../utils/nodemailer.utils");
const { buildFeatureLaunchEmail } = require("../utils/helpers/emailtemp");

require("dotenv").config();

const PORTAL_BASE = process.env.TORCHX_TALENT_URL || "https://torchxsuite.com/talent";
const STALE_CLAIM_MS = 30 * 60 * 1000;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

let running = false;

const fullName = (doc) => `${doc?.f_name || ""} ${doc?.l_name || ""}`.trim();

const buildAttachments = (launch) => {
  const data = launch.pdf && launch.pdf.data;
  if (!data || !data.length || data.length > MAX_ATTACHMENT_BYTES) return undefined;
  const rawName = (launch.pdf.name || `${launch.name}.pdf`).trim();
  const filename = rawName.toLowerCase().endsWith(".pdf") ? rawName : `${rawName}.pdf`;
  return [{ filename, content: data, contentType: launch.pdf.contentType || "application/pdf" }];
};

const claimNext = () =>
  FeatureLaunchModel.findOneAndUpdate(
    {
      notifiedAt: null,
      $or: [{ notifyClaimedAt: null }, { notifyClaimedAt: { $lt: new Date(Date.now() - STALE_CLAIM_MS) } }],
    },
    { $set: { notifyClaimedAt: new Date() } },
    { sort: { createdAt: 1 }, new: true }
  );

const announceLaunch = async (launch) => {
  const orgs = await SuperAdminModel.find({}).select("_id email f_name l_name organisation_name").lean();
  const attachments = buildAttachments(launch);
  const title = `New Feature: ${launch.name}`;
  const message = launch.description.length > 300 ? `${launch.description.slice(0, 297)}...` : launch.description;

  let bells = 0;
  let emails = 0;

  for (const org of orgs) {
    const admins = await AdminModel.find({
      organisation_id: org._id,
      status: "active",
      working_status: "working",
    })
      .select("_id f_name l_name work_email")
      .lean();

    const recipients = [
      { recipientModel: "SuperAdmin", recipientId: org._id },
      ...admins.map((a) => ({ recipientModel: "Admin", recipientId: a._id })),
    ];

    const created = await createBulkNotifications({
      recipients,
      organisation_id: org._id,
      type: "announcement",
      title,
      message,
      priority: "medium",
      createdByModel: "System",
      meta: { featureLaunchId: String(launch._id), featureName: launch.name },
    });
    bells += Array.isArray(created) ? created.length : 0;

    const mailTargets = [
      { email: org.email, name: fullName(org) || org.organisation_name || "there" },
      ...admins.map((a) => ({ email: a.work_email, name: fullName(a) || "there" })),
    ].filter((t) => t.email);

    const seen = new Set();
    for (const target of mailTargets) {
      const key = target.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        await sendEmail({
          to: target.email,
          subject: title,
          html: buildFeatureLaunchEmail({
            recipientName: target.name,
            featureName: launch.name,
            description: launch.description,
            hasAttachment: Boolean(attachments),
            portalLink: `${PORTAL_BASE}/login`,
          }),
          attachments,
        });
        emails += 1;
      } catch (err) {
        console.error(`[Feature Launch] Email to ${target.email} failed:`, err.message);
      }
    }
  }

  console.log(`[Feature Launch] "${launch.name}": ${bells} bell(s), ${emails} email(s) across ${orgs.length} organisation(s)`);
};

const notifyFeatureLaunches = async () => {
  if (running) return;
  running = true;
  try {
    let launch = await claimNext();
    while (launch) {
      try {
        await announceLaunch(launch);
        await FeatureLaunchModel.updateOne({ _id: launch._id }, { $set: { notifiedAt: new Date() } });
      } catch (err) {
        console.error(`[Feature Launch] "${launch.name}" failed:`, err.message);
        await FeatureLaunchModel.updateOne({ _id: launch._id }, { $set: { notifyClaimedAt: null } }).catch(() => {});
        break;
      }
      launch = await claimNext();
    }
  } catch (error) {
    console.error("[Feature Launch] Error:", error.message);
  } finally {
    running = false;
  }
};

cron.schedule("* * * * *", notifyFeatureLaunches, { timezone: "Asia/Kolkata" });

const runOnBoot = () => {
  notifyFeatureLaunches().catch((err) => console.error("[Feature Launch] Boot run failed:", err.message));
};
if (mongoose.connection.readyState === 1) runOnBoot();
else mongoose.connection.once("connected", runOnBoot);

module.exports = notifyFeatureLaunches;