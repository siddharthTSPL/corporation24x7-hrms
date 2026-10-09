const cron = require("node-cron");
const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");
const SuperAdminModel = require("../Models/superadmin.model");
const NotificationModel = require("../Models/Notification.model");
const { createNotification, createBulkNotifications } = require("../utils/Notification.utils");
const { getISTDateParts } = require("../utils/Istdate.utils");

const ROLE_MODELS = [
  { Model: Usermodel, recipientModel: "User", roleLabel: "Employee" },
  { Model: Managermodel, recipientModel: "Manager", roleLabel: "Manager" },
  { Model: AdminModel, recipientModel: "Admin", roleLabel: "Admin" },
];

// How many days BEFORE the birthday a reminder goes out to SuperAdmin + all
// Admins. [2, 1, 0] = 2 days before, 1 day before (tomorrow) and on the day.
// Want only a single heads-up? Change this to [2].
const REMINDER_DAYS = [2, 1, 0];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// Calendar date (IST) that is `n` days after today (IST).
const istDatePlusDays = (n) => {
  const { year, month, day } = getISTDateParts(new Date());
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};

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

const notifyBirthdays = async () => {
  try {
    const roster = []; // everyone with a birthday in the reminder window
    const everyone = [];

    for (const { Model, recipientModel, roleLabel } of ROLE_MODELS) {
      const people = await Model.find({ date_of_birth: { $ne: null }, working_status: "working" })
        .select("f_name l_name date_of_birth organisation_id")
        .lean();
      people.forEach((p) => everyone.push({ p, recipientModel, roleLabel }));
    }

    for (const daysUntil of REMINDER_DAYS) {
      const target = istDatePlusDays(daysUntil);
      const dateLabel = `${target.day} ${MONTHS[target.month - 1]}`;
      const birthdayKey = `${target.year}-${String(target.month).padStart(2, "0")}-${String(target.day).padStart(2, "0")}`;

      everyone.forEach(({ p, recipientModel, roleLabel }) => {
        if (!p.organisation_id || !isBirthdayOn(p.date_of_birth, target)) return;
        roster.push({
          id: p._id,
          recipientModel,
          roleLabel,
          name: `${p.f_name || ""} ${p.l_name || ""}`.trim() || "A colleague",
          organisation_id: p.organisation_id,
          daysUntil,
          dateLabel,
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

    let sent = 0;
    for (const [orgId, entries] of byOrg.entries()) {
      // SuperAdmin of the org (organisation id == SuperAdmin _id) + ALL working admins.
      const [superAdmin, admins] = await Promise.all([
        SuperAdminModel.findOne({ _id: orgId }).select("_id").lean(),
        AdminModel.find({ organisation_id: orgId, working_status: "working" }).select("_id").lean(),
      ]);

      const alertRoster = [
        ...(superAdmin ? [{ recipientId: superAdmin._id, recipientModel: "SuperAdmin" }] : []),
        ...admins.map((a) => ({ recipientId: a._id, recipientModel: "Admin" })),
      ];

      for (const person of entries) {
        const dedupKey = `birthday:${person.id}:${person.birthdayKey}:${person.daysUntil}`;

        // Personal greeting to the birthday person - only on the day itself.
        if (person.daysUntil === 0) {
          const greetKey = `${dedupKey}:self`;
          const already = await NotificationModel.exists({
            recipient: person.id, recipientModel: person.recipientModel, "meta.dedupKey": greetKey,
          });
          if (!already) {
            await createNotification({
              recipientModel: person.recipientModel,
              recipientId: person.id,
              organisation_id: orgId,
              type: "birthday",
              title: "Happy Birthday! 🎉",
              message: `Wishing you a fantastic birthday, ${person.name.split(" ")[0]}! Have a great day.`,
              priority: "medium",
              meta: { dedupKey: greetKey, self: true },
            });
          }
        }

        // Nobody gets a reminder about their own birthday.
        let recipients = alertRoster.filter(
          (r) => !(String(r.recipientId) === String(person.id) && r.recipientModel === person.recipientModel)
        );

        // Idempotent: skip anyone already notified for this exact reminder (safe to re-run).
        const existing = await NotificationModel.find({
          organisation_id: orgId, type: "birthday", "meta.dedupKey": dedupKey,
        }).select("recipient recipientModel").lean();
        const done = new Set(existing.map((e) => `${e.recipientModel}:${e.recipient}`));
        recipients = recipients.filter((r) => !done.has(`${r.recipientModel}:${r.recipientId}`));

        if (recipients.length === 0) continue;

        const tpl = buildTemplate(person.daysUntil, person.name, person.dateLabel);
        await createBulkNotifications({
          recipients,
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
        sent += recipients.length;
      }
    }

    console.log(`[Birthday Notify] ${sent} notification(s) sent across ${byOrg.size} organisation(s)`);
  } catch (error) {
    console.error("[Birthday Notify] Error:", error.message);
  }
};

// Daily at 8:00 AM IST (explicit timezone - hosts usually run in UTC).
cron.schedule("0 8 * * *", notifyBirthdays, { timezone: "Asia/Kolkata" });

module.exports = notifyBirthdays;