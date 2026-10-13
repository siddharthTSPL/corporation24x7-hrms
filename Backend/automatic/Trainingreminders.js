const cron = require("node-cron");
const Training = require("../Models/training.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const SuperAdmin = require("../Models/superadmin.model");
const { sendEmail } = require("../utils/nodemailer.utils");
const { createBulkNotifications } = require("../utils/Notification.utils");
const { buildTrainingEmail, dateTime } = require("../utils/trainingEmail.utils");

const PERSON_MODELS = { User, Manager, Admin };
const dayInIndia = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const dayNumber = (day) => {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date) / 86400000;
};

async function remindTrainingDueDates() {
  const today = dayInIndia(new Date());
  const todayNumber = dayNumber(today);
  const candidates = await Training.find({
    status: { $in: ["assigned", "in_progress", "rejected"] },
    due_at: { $ne: null },
  }).select("organisation_id title details due_at trainee trainer status due_reminder_offsets_sent").lean();

  for (const candidate of candidates) {
    const daysToDue = dayNumber(dayInIndia(candidate.due_at)) - todayNumber;
    if (![3, 1, 0].includes(daysToDue) || candidate.due_reminder_offsets_sent?.includes(daysToDue)) continue;
    const claimed = await Training.findOneAndUpdate(
      { _id: candidate._id, organisation_id: candidate.organisation_id, due_reminder_offsets_sent: { $ne: daysToDue }, status: { $in: ["assigned", "in_progress", "rejected"] } },
      { $addToSet: { due_reminder_offsets_sent: daysToDue } },
      { new: true },
    );
    if (!claimed) continue;

    try {
      const [traineeModel, trainerModel, company] = await Promise.all([
        PERSON_MODELS[candidate.trainee.model].findOne({ _id: candidate.trainee.id, organisation_id: candidate.organisation_id, working_status: "working" }).select("f_name l_name work_email").lean(),
        PERSON_MODELS[candidate.trainer.model].findOne({ _id: candidate.trainer.id, organisation_id: candidate.organisation_id, working_status: "working" }).select("f_name l_name work_email").lean(),
        SuperAdmin.findById(candidate.organisation_id).select("organisation_name").lean(),
      ]);
      const dueText = daysToDue === 0 ? "is due today" : `is due in ${daysToDue} days`;
      const recipients = [
        traineeModel && { recipientModel: candidate.trainee.model, recipientId: candidate.trainee.id },
        trainerModel && { recipientModel: candidate.trainer.model, recipientId: candidate.trainer.id },
      ].filter(Boolean);
      if (recipients.length) await createBulkNotifications({ recipients, organisation_id: candidate.organisation_id, type: "training", title: "Training due date reminder", message: `${candidate.title} ${dueText}.`, link: "/training" });
      const emailJobs = [[traineeModel, "Trainee"], [trainerModel, "Trainer"]].filter(([person]) => person?.work_email).map(async ([person, role]) => {
        const content = buildTrainingEmail({
          companyName: company?.organisation_name,
          recipientName: `${person.f_name || ""} ${person.l_name || ""}`.trim(),
          heading: "Training due date reminder",
          intro: `${candidate.title} ${dueText}. Please review the remaining learning levels in HRMS.`,
          training: candidate,
          rows: [["Your role", role], ["Trainee", `${traineeModel?.f_name || ""} ${traineeModel?.l_name || ""}`.trim()], ["Trainer", `${trainerModel?.f_name || ""} ${trainerModel?.l_name || ""}`.trim()], ["Due date", dateTime(candidate.due_at)]],
          action: "Open the Training section in HRMS to review progress and the next required action.",
        });
        try { await sendEmail({ to: person.work_email, subject: `Training due ${daysToDue === 0 ? "today" : `in ${daysToDue} days`} · ${candidate.title} · ${company?.organisation_name || "Your organisation"}`, html: content.html, text: content.text }); }
        catch (error) { console.error("[training] due reminder email failed:", error.message); }
      });
      await Promise.all(emailJobs);
    } catch (error) {
      console.error("[training] due reminder failed:", candidate._id, error.message);
    }
  }

  const expiringCertificates = await Training.find({ status: "approved", "certificate.valid_until": { $ne: null } })
    .select("organisation_id title trainee trainer certificate.valid_until certificate.expiry_reminder_offsets_sent").lean();
  for (const candidate of expiringCertificates) {
    const daysToExpiry = dayNumber(dayInIndia(candidate.certificate.valid_until)) - todayNumber;
    if (![30, 7, 0].includes(daysToExpiry) || candidate.certificate.expiry_reminder_offsets_sent?.includes(daysToExpiry)) continue;
    const claimed = await Training.findOneAndUpdate(
      { _id: candidate._id, organisation_id: candidate.organisation_id, "certificate.valid_until": candidate.certificate.valid_until, "certificate.expiry_reminder_offsets_sent": { $ne: daysToExpiry } },
      { $addToSet: { "certificate.expiry_reminder_offsets_sent": daysToExpiry } },
      { new: true },
    );
    if (!claimed) continue;
    try {
      const [trainee, trainer, company] = await Promise.all([
        PERSON_MODELS[candidate.trainee.model].findOne({ _id: candidate.trainee.id, organisation_id: candidate.organisation_id, working_status: "working" }).select("f_name l_name work_email").lean(),
        PERSON_MODELS[candidate.trainer.model].findOne({ _id: candidate.trainer.id, organisation_id: candidate.organisation_id, working_status: "working" }).select("f_name l_name work_email").lean(),
        SuperAdmin.findById(candidate.organisation_id).select("organisation_name").lean(),
      ]);
      const expiryText = daysToExpiry === 0 ? "expires today" : `expires in ${daysToExpiry} days`;
      const recipients = [trainee && { recipientModel: candidate.trainee.model, recipientId: candidate.trainee.id }, trainer && { recipientModel: candidate.trainer.model, recipientId: candidate.trainer.id }].filter(Boolean);
      if (recipients.length) await createBulkNotifications({ recipients, organisation_id: candidate.organisation_id, type: "training", title: "Certificate renewal reminder", message: `Your ${candidate.title} certificate ${expiryText}.`, link: "/training" });
      if (trainee?.work_email) {
        const content = buildTrainingEmail({ companyName: company?.organisation_name, recipientName: `${trainee.f_name || ""} ${trainee.l_name || ""}`.trim(), heading: "Certificate renewal reminder", intro: `Your certificate for ${candidate.title} ${expiryText}. Contact your trainer or HR team to arrange renewal training.`, training: candidate, rows: [["Certificate valid until", dateTime(candidate.certificate.valid_until)], ["Assigned trainer", `${trainer?.f_name || ""} ${trainer?.l_name || ""}`.trim()]], action: "Your organisation can assign the refresher programme from the Training section in HRMS." });
        try { await sendEmail({ to: trainee.work_email, subject: `Certificate expires ${daysToExpiry === 0 ? "today" : `in ${daysToExpiry} days`} · ${candidate.title} · ${company?.organisation_name || "Your organisation"}`, html: content.html, text: content.text }); }
        catch (error) { console.error("[training] certificate renewal email failed:", error.message); }
      }
    } catch (error) {
      console.error("[training] certificate expiry reminder failed:", candidate._id, error.message);
    }
  }
}

cron.schedule("0 9 * * *", remindTrainingDueDates, { timezone: "Asia/Kolkata" });
module.exports = { remindTrainingDueDates };
