const cron = require("node-cron");
const mongoose = require("mongoose");
const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");
const SuperAdminModel = require("../Models/superadmin.model");
const NotificationModel = require("../Models/Notification.model");
const BirthdayReminderLog = require("../Models/Birthdayreminderlog.model");
const { createNotification, createBulkNotifications } = require("../utils/Notification.utils");
const { sendEmail } = require("../utils/nodemailer.utils");
const { buildBirthdayReminderEmail } = require("../utils/helpers/emailtemp");
const { getISTDateParts, IST_OFFSET_MS } = require("../utils/Istdate.utils");

require("dotenv").config();

const PORTAL_BASE = process.env.TORCHX_TALENT_URL || "https://torchxsuite.com/talent";

const ROLE_MODELS = [
  { Model: Usermodel, recipientModel: "User", roleLabel: "Employee" },
  { Model: Managermodel, recipientModel: "Manager", roleLabel: "Manager" },
  { Model: AdminModel, recipientModel: "Admin", roleLabel: "Admin" },
];

// Days BEFORE the birthday that SuperAdmin + all Admins get the in-app (bell)
// reminder. 0 = on the day itself.
const REMINDER_DAYS = [2, 1, 0];

// Days BEFORE the birthday that SuperAdmin + all Admins get an EMAIL.
// [2, 1] = two days before and the day before. Add 0 to also email on the day.
const EMAIL_REMINDER_DAYS = [2, 1];

// The job runs every hour inside this IST window (see schedule at the bottom).
// Re-running is safe - every send is claimed once in BirthdayReminderLog - so a
// restart / missed 8 AM run is simply picked up by the next hourly run.
const SEND_FROM_HOUR_IST = 8;
const SEND_UNTIL_HOUR_IST = 21; // last run at 20:00, boot catch-up allowed until 21:59

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// Calendar date (IST) that is `n` days after today (IST).
const istDatePlusDays = (n) => {
  const { year, month, day } = getISTDateParts(new Date());
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};

// "Saturday, 18 October" - no year, on purpose (never expose age).
const longDateLabel = (t) =>
  new Date(Date.UTC(t.year, t.month - 1, t.day)).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

// Month/day match only (year ignored). DOB is read in IST so it works whether
// it was saved as UTC-midnight or IST-midnight. A 29 Feb birthday is celebrated
// on 28 Feb in non-leap years.
const isBirthdayOn = (dob, target) => {
  if (!dob) return false;
  const { month, day } = getISTDateParts(dob);
  if (month === 2 && day === 29 && !isLeap(target.year)) {
    return target.month === 2 && target.day === 28;
  }
  return month === target.month && day === target.day;
};

const fullName = (doc) => `${doc?.f_name || ""} ${doc?.l_name || ""}`.trim();

const buildTemplate = (daysUntil, name, dateLabel) => {
  if (daysUntil === 0) {
    return {
      title: "🎂 Birthday Today",
      message: `It's ${name}'s birthday today (${dateLabel})! Take a moment to wish them well.`,
      priority: "medium",
    };
  }
  if (daysUntil === 1) {
    return {
      title: "🎈 Birthday Tomorrow",
      message: `${name}'s birthday is tomorrow (${dateLabel}). Get your wishes ready!`,
      priority: "low",
    };
  }
  return {
    title: "🎁 Upcoming Birthday",
    message: `${name}'s birthday is in ${daysUntil} days (${dateLabel}). Plan a wish or a small celebration!`,
    priority: "low",
  };
};

const emailSubject = (daysUntil, name, dateLabel) =>
  daysUntil === 1
    ? `Birthday reminder: ${name}'s birthday is tomorrow (${dateLabel})`
    : `Birthday reminder: ${name}'s birthday is in ${daysUntil} days (${dateLabel})`;

// ---- exactly-once claims ---------------------------------------------------
// true  -> this run owns the send.   false -> somebody already did it.
const claim = async (key) => {
  try {
    await BirthdayReminderLog.create({ key });
    return true;
  } catch (err) {
    if (err && err.code === 11000) return false;
    throw err;
  }
};
const release = (key) => BirthdayReminderLog.deleteOne({ key }).catch(() => {});

// SMTP 5xx (bad mailbox, rejected) will never succeed on retry; connection
// errors / 4xx might. Only the second kind is released for the next hourly run.
const isTransientMailError = (err) => !(err && Number(err.responseCode) >= 500);

let running = false;

const notifyBirthdays = async () => {
  if (running) return; // never overlap with a still-running pass
  running = true;
  try {
    const roster = []; // everyone with a birthday in the reminder window
    const everyone = [];

    for (const { Model, recipientModel, roleLabel } of ROLE_MODELS) {
      const people = await Model.find({ date_of_birth: { $ne: null }, working_status: "working" })
        .select("f_name l_name designation date_of_birth organisation_id")
        .lean();
      people.forEach((p) => everyone.push({ p, recipientModel, roleLabel }));
    }

    for (const daysUntil of REMINDER_DAYS) {
      const target = istDatePlusDays(daysUntil);
      const dateLabel = `${target.day} ${MONTHS[target.month - 1]}`;
      const dateLong = longDateLabel(target);
      const birthdayKey = `${target.year}-${String(target.month).padStart(2, "0")}-${String(target.day).padStart(2, "0")}`;

      everyone.forEach(({ p, recipientModel, roleLabel }) => {
        if (!p.organisation_id || !isBirthdayOn(p.date_of_birth, target)) return;
        roster.push({
          id: p._id,
          recipientModel,
          roleLabel,
          name: fullName(p) || "A colleague",
          designation: typeof p.designation === "string" ? p.designation : "",
          organisation_id: p.organisation_id,
          daysUntil,
          dateLabel,
          dateLong,
          birthdayKey,
        });
      });
    }

    if (roster.length === 0) return;

    // Group by organisation so alerts stay inside the person's own org.
    const byOrg = new Map();
    roster.forEach((r) => {
      const key = String(r.organisation_id);
      if (!byOrg.has(key)) byOrg.set(key, []);
      byOrg.get(key).push(r);
    });

    let bellsSent = 0;
    let emailsSent = 0;

    for (const [orgId, entries] of byOrg.entries()) {
      // SuperAdmin of the org (organisation id == SuperAdmin _id) + ALL working admins.
      const [superAdmin, admins] = await Promise.all([
        SuperAdminModel.findOne({ _id: orgId }).select("_id email f_name l_name organisation_name").lean(),
        AdminModel.find({ organisation_id: orgId, working_status: "working" })
          .select("_id work_email f_name l_name")
          .lean(),
      ]);

      const alertRoster = [
        ...(superAdmin
          ? [{
              recipientId: superAdmin._id,
              recipientModel: "SuperAdmin",
              email: superAdmin.email,
              name: fullName(superAdmin) || superAdmin.organisation_name || "there",
            }]
          : []),
        ...admins.map((a) => ({
          recipientId: a._id,
          recipientModel: "Admin",
          email: a.work_email,
          name: fullName(a) || "there",
        })),
      ];

      for (const person of entries) {
        const dedupKey = `birthday:${person.id}:${person.birthdayKey}:${person.daysUntil}`;

        // Personal greeting (bell) to the birthday person - only on the day itself.
        // The popup/template on login is separate (frontend BirthdayModal).
        if (person.daysUntil === 0) {
          const selfClaim = `self:${dedupKey}`;
          if (await claim(selfClaim)) {
            const greetKey = `${dedupKey}:self`;
            const already = await NotificationModel.exists({
              recipient: person.id, recipientModel: person.recipientModel, "meta.dedupKey": greetKey,
            });
            if (!already) {
              const created = await createNotification({
                recipientModel: person.recipientModel,
                recipientId: person.id,
                organisation_id: orgId,
                type: "birthday",
                title: "Happy Birthday! 🎉",
                message: `Wishing you a fantastic birthday, ${person.name.split(" ")[0]}! Have a great day.`,
                priority: "medium",
                meta: { dedupKey: greetKey, self: true },
              });
              if (!created) await release(selfClaim);
            }
          }
        }

        // Nobody gets a reminder about their own birthday.
        const recipients = alertRoster.filter(
          (r) => !(String(r.recipientId) === String(person.id) && r.recipientModel === person.recipientModel)
        );
        if (recipients.length === 0) continue;

        // ---- in-app bell: SuperAdmin + all Admins (2 days, 1 day, day-of) ----
        const bellKey = (r) => `bell:${dedupKey}:${r.recipientModel}:${r.recipientId}`;
        const claimedForBell = [];
        for (const r of recipients) {
          if (await claim(bellKey(r))) claimedForBell.push(r);
        }

        if (claimedForBell.length > 0) {
          // Skip anyone who already has this bell from before the claim log existed.
          const legacy = await NotificationModel.find({
            organisation_id: orgId, type: "birthday", "meta.dedupKey": dedupKey,
          }).select("recipient recipientModel").lean();
          const have = new Set(legacy.map((e) => `${e.recipientModel}:${e.recipient}`));
          const toCreate = claimedForBell.filter((r) => !have.has(`${r.recipientModel}:${r.recipientId}`));

          if (toCreate.length > 0) {
            const tpl = buildTemplate(person.daysUntil, person.name, person.dateLabel);
            const created = await createBulkNotifications({
              recipients: toCreate.map(({ recipientId, recipientModel }) => ({ recipientId, recipientModel })),
              organisation_id: orgId,
              type: "birthday",
              title: tpl.title,
              message: tpl.message,
              priority: tpl.priority,
              meta: {
                dedupKey,
                birthdayPersonId: person.id,
                birthdayPersonModel: person.recipientModel,
                birthdayPersonName: person.name,
                birthdayPersonRole: person.roleLabel,
                daysUntil: person.daysUntil,
                birthdayDate: person.birthdayKey,
                birthdayDateLabel: person.dateLabel,
              },
            });
            if (created) bellsSent += toCreate.length;
            else await Promise.all(toCreate.map((r) => release(bellKey(r)))); // retry next run
          }
        }

        // ---- email: SuperAdmin + all Admins (2 days, 1 day before) ----
        if (EMAIL_REMINDER_DAYS.includes(person.daysUntil)) {
          for (const r of recipients) {
            if (!r.email) {
              console.warn(`[Birthday Notify] No email on file for ${r.recipientModel} ${r.recipientId} - skipping mail`);
              continue;
            }
            const mailKey = `email:${dedupKey}:${r.recipientModel}:${r.recipientId}`;
            if (!(await claim(mailKey))) continue;

            try {
              await sendEmail({
                to: r.email,
                subject: emailSubject(person.daysUntil, person.name, person.dateLabel),
                html: buildBirthdayReminderEmail({
                  recipientName: r.name,
                  person: { name: person.name, roleLabel: person.roleLabel, designation: person.designation },
                  daysUntil: person.daysUntil,
                  dateLong: person.dateLong,
                  portalLink: PORTAL_BASE,
                }),
              });
              emailsSent += 1;
            } catch (err) {
              console.error(`[Birthday Notify] Email to ${r.email} failed:`, err.message);
              if (isTransientMailError(err)) await release(mailKey);
            }
          }
        }
      }
    }

    console.log(
      `[Birthday Notify] ${bellsSent} bell notification(s), ${emailsSent} email(s) sent across ${byOrg.size} organisation(s)`
    );
  } catch (error) {
    console.error("[Birthday Notify] Error:", error.message);
  } finally {
    running = false;
  }
};

// Every hour from 08:00 to 20:00 IST (explicit timezone - hosts usually run in UTC).
// The first run of the day does the sending; later runs only pick up anything a
// failure / restart left behind and are otherwise no-ops.
cron.schedule(`0 ${SEND_FROM_HOUR_IST}-${SEND_UNTIL_HOUR_IST - 1} * * *`, notifyBirthdays, {
  timezone: "Asia/Kolkata",
});

// Boot catch-up: if the server (re)starts after 08:00 IST, don't wait for the
// next hourly tick. Waits for the DB connection (app.js loads this file before
// server.js connects to Mongo).
const istHourNow = () => new Date(Date.now() + IST_OFFSET_MS).getUTCHours();
const runOnBoot = () => {
  const h = istHourNow();
  if (h >= SEND_FROM_HOUR_IST && h < SEND_UNTIL_HOUR_IST + 1) {
    notifyBirthdays().catch((err) => console.error("[Birthday Notify] Boot run failed:", err.message));
  }
};
if (mongoose.connection.readyState === 1) runOnBoot();
else mongoose.connection.once("connected", runOnBoot);

module.exports = notifyBirthdays;
module.exports._internals = { isBirthdayOn, istDatePlusDays, buildTemplate, emailSubject, longDateLabel };