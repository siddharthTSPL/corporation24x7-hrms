const cron = require("node-cron");
const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");
const { createNotification, createBulkNotifications } = require("../utils/Notification.utils");

const ROLE_MODELS = [
  { Model: Usermodel, recipientModel: "User" },
  { Model: Managermodel, recipientModel: "Manager" },
  { Model: AdminModel, recipientModel: "Admin" },
];

// Matches on month/day only (not year) — Mongo can't do that in a plain
// query, so we pull everyone with a date_of_birth set and filter in JS.
// Cheap enough for a once-a-day job even on a large roster.
const isBirthdayToday = (dob, today) => {
  if (!dob) return false;
  const d = new Date(dob);
  return d.getUTCMonth() === today.getUTCMonth() && d.getUTCDate() === today.getUTCDate();
};

const notifyBirthdays = async () => {
  try {
    const today = new Date();
    const birthdayPeople = [];

    for (const { Model, recipientModel } of ROLE_MODELS) {
      const people = await Model.find({
        date_of_birth: { $ne: null },
        working_status: "working",
      })
        .select("f_name l_name date_of_birth organisation_id")
        .lean();

      people.forEach((p) => {
        if (isBirthdayToday(p.date_of_birth, today)) {
          birthdayPeople.push({
            id: p._id,
            recipientModel,
            name: `${p.f_name || ""} ${p.l_name || ""}`.trim() || "A colleague",
            organisation_id: p.organisation_id,
          });
        }
      });
    }

    if (birthdayPeople.length === 0) return;

    // Group by org so birthday alerts only go to that person's own organisation.
    const byOrg = new Map();
    birthdayPeople.forEach((p) => {
      const key = String(p.organisation_id);
      if (!byOrg.has(key)) byOrg.set(key, []);
      byOrg.get(key).push(p);
    });

    for (const [orgId, people] of byOrg.entries()) {
      // Who should get the "X's birthday today" alert for this org?
      //   1. If SuperAdmin has chosen HR admin(s) (isHR = true) -> only them.
      //   2. If no HR is chosen                                  -> all admins.
      const orgAdmins = await AdminModel.find({ organisation_id: orgId, working_status: "working" })
        .select("_id isHR")
        .lean();

      const hrAdmins = orgAdmins.filter((a) => a.isHR === true);
      const alertAdmins = hrAdmins.length > 0 ? hrAdmins : orgAdmins;
      const alertRoster = alertAdmins.map((a) => ({ recipientId: a._id, recipientModel: "Admin" }));

      for (const person of people) {
        // Personal greeting to the birthday person (unchanged).
        await createNotification({
          recipientModel: person.recipientModel,
          recipientId: person.id,
          organisation_id: orgId,
          type: "birthday",
          title: "Happy Birthday! 🎉",
          message: `Wishing you a fantastic birthday, ${person.name.split(" ")[0]}! Have a great day.`,
          priority: "medium",
        });

        // Don't alert someone about their own birthday (they got the greeting above).
        const recipients = alertRoster.filter(
          (r) => !(String(r.recipientId) === String(person.id) && person.recipientModel === "Admin")
        );

        if (recipients.length > 0) {
          await createBulkNotifications({
            recipients,
            organisation_id: orgId,
            type: "birthday",
            title: "🎂 Birthday Today",
            message: `It's ${person.name}'s birthday today! Take a moment to wish them well.`,
            priority: "low",
            meta: { birthdayPersonId: person.id, birthdayPersonModel: person.recipientModel },
          });
        }
      }
    }

    console.log(`[Birthday Notify] Notified ${birthdayPeople.length} birthday(s) across ${byOrg.size} organisation(s)`);
  } catch (error) {
    console.error("[Birthday Notify] Error:", error.message);
  }
};

// Runs once a day at 8:00 AM server time.
cron.schedule("0 8 * * *", notifyBirthdays);

module.exports = notifyBirthdays;