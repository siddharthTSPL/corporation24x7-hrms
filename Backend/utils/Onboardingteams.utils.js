const OrgTeam = require("../Models/orgteam.model");
const emailtemp = require("./helpers/emailtemp");
const { sendEmail } = require("./nodemailer.utils");
const { createBulkNotifications } = require("./Notification.utils");

require("dotenv").config();

const PORTAL_BASE = process.env.TORCHX_TALENT_URL || "https://torchxsuite.com/talent";
const NOTICE_DELAY_MS = 5000;

const getModel = (name) => {
  // Lazy: these model files install the hook that requires this util.
  if (name === "User") return require("../Models/user.model");
  if (name === "Manager") return require("../Models/manager.model");
  return require("../Models/Admin.model");
};

const ROLE_LABEL = { User: "Employee", Manager: "Manager", Admin: "Admin" };

const nameOf = (d) => `${d?.f_name || ""} ${d?.l_name || ""}`.trim();

const loadMembers = async (organisation_id, team) => {
  const doc = await OrgTeam.findOne({ organisation_id, team }).lean();
  if (!doc?.members?.length) return [];
  const out = [];
  for (const m of doc.members) {
    const person = await getModel(m.memberModel)
      .findById(m.member)
      .select("f_name l_name work_email working_status")
      .lean();
    if (!person) continue;
    if (person.working_status && person.working_status !== "working") continue;
    out.push({ id: m.member, model: m.memberModel, name: nameOf(person) || "there", email: person.work_email });
  }
  return out;
};

const safeSend = async ({ to, subject, html }) => {
  if (!to) return;
  try {
    await sendEmail({ to, subject, html });
  } catch (err) {
    console.error(`[onboarding-teams] email failed (${to}):`, err.message);
  }
};

const resolveReportingTo = async (doc) => {
  const id = doc.Under_manager || doc.reporting_manager;
  if (!id) return "";
  const modelName = doc.reporting_manager_model || "Manager";
  try {
    const p = await getModel(modelName === "SuperAdmin" ? "Admin" : modelName).findById(id).select("f_name l_name").lean();
    return nameOf(p);
  } catch {
    return "";
  }
};

// Sends the hand-off mails for ONE newly created person. A team with no
// members configured is skipped completely (no mail, no error).
const notifyTeamsOfOnboarding = async (modelName, id) => {
  const doc = await getModel(modelName).findById(id).lean();
  if (!doc || !doc.organisation_id) return; // creation was rolled back
  const organisation_id = doc.organisation_id;

  const [itTeam, accountsTeam] = await Promise.all([
    loadMembers(organisation_id, "it"),
    loadMembers(organisation_id, "accounts"),
  ]);
  if (!itTeam.length && !accountsTeam.length) return;

  const joiner = {
    name: nameOf(doc),
    uid: doc.uid,
    roleLabel: ROLE_LABEL[modelName],
    designation: doc.designation,
    department: doc.department,
    workEmail: doc.work_email,
    officeLocation: doc.office_location,
    reportingTo: await resolveReportingTo(doc),
    dateOfJoining: doc.date_of_joining,
    bankName: doc.bank_name,
    accountNumber: doc.account_number,
  };

  const jobs = [
    {
      team: itTeam,
      subject: `New joiner onboarded: ${joiner.name} - IT setup required`,
      title: "New joiner - IT setup",
      message: `${joiner.name} has been onboarded. Please arrange assets and system access.`,
      link: "/login",
      html: (m) => emailtemp.buildOnboardingItEmail({ recipientName: m.name, joiner, portalLink: `${PORTAL_BASE}/login` }),
    },
    {
      team: accountsTeam,
      subject: `New joiner onboarded: ${joiner.name} - payroll setup required`,
      title: "New joiner - payroll setup",
      message: `${joiner.name} has been onboarded. Please set up their salary structure and payroll.`,
      link: "/payroll",
      html: (m) =>
        emailtemp.buildOnboardingAccountsEmail({
          recipientName: m.name,
          joiner,
          bankDetailsAvailable: !!(doc.bank_name && doc.account_number),
          portalLink: `${PORTAL_BASE}/login`,
        }),
    },
  ];

  for (const job of jobs) {
    if (!job.team.length) continue;
    await createBulkNotifications({
      recipients: job.team.map((m) => ({ recipientModel: m.model, recipientId: m.id })),
      organisation_id,
      type: "system",
      title: job.title,
      message: job.message,
      link: job.link,
    });
    for (const m of job.team) {
      await safeSend({ to: m.email, subject: job.subject, html: job.html(m) });
    }
  }
};

// Called from the post-save hook on User / Manager / Admin. Runs a few
// seconds later and re-reads the record so that (a) transactional creates
// that were rolled back never send mail and (b) generated fields such as
// uid are already filled in. Never throws into the caller.
const scheduleOnboardingTeamNotice = (modelName, id) => {
  const timer = setTimeout(() => {
    notifyTeamsOfOnboarding(modelName, id).catch((err) =>
      console.error("[onboarding-teams] failed:", err && err.stack ? err.stack : err)
    );
  }, NOTICE_DELAY_MS);
  if (typeof timer.unref === "function") timer.unref();
};

module.exports = { notifyTeamsOfOnboarding, scheduleOnboardingTeamNotice };