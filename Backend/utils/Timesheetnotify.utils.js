const Timesheet = require("../Models/Timesheet.model");
const TimeLog = require("../Models/Timelog.model");
const TSJob = require("../Models/Tsjob.model");
const TSProject = require("../Models/tsproject.model");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const SuperAdmin = require("../Models/superadmin.model");
const TimesheetNotificationSettings = require("../Models/Timesheetnotificationsettings.model");
const TimesheetNotificationLog = require("../Models/Timesheetnotificationlog.model");
const { sendEmail } = require("./nodemailer.utils");
const { getISTDateParts, istDateFromYMD } = require("./Istdate.utils");
const { formatDate, escapeHtml } = require("./helpers/emailtemp");
const { buildTimesheetAlertEmail, statusLabel } = require("./helpers/timesheetemailtemp");

require("dotenv").config();

const PORTAL_BASE = (
  process.env.TORCHX_TALENT_URL ||
  process.env.FRONTEND_URL ||
  "https://torchxsuite.com/talent"
).replace(/\/+$/, "");

const PAGE_BY_MODEL = {
  User: "/employee-timesheet",
  Manager: "/manager-timesheet",
  Admin: "/admin-timesheet",
  SuperAdmin: "/superadmin-timesheet",
};

const PENDING_STATUSES = [
  "pending_manager",
  "pending_reporting_manager",
  "pending_coadmin",
  "pending_admin",
  "pending_superadmin",
];

const INACTIVE_STATUSES = ["resigned", "fired", "terminated"];
const PERSON_MODELS = { User, Manager, Admin };
const MAX_SEND_ATTEMPTS = 3;
const STALE_PENDING_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const DEFAULT_ALERTS = {
  job_assigned: true,
  project_member_added: true,
  submission_reminder: true,
  approver_on_submit: true,
  decision_to_employee: true,
  approval_reminder: true,
};

const DEFAULT_SETTINGS = {
  alerts: DEFAULT_ALERTS,
  submission_deadline_weekday: 5,
  submission_deadline_hour: 18,
  submission_deadline_minute: 0,
  submission_reminder_hours_before: [24, 2],
  approval_review_hours: 24,
  approval_reminder_repeat_hours: 24,
  approval_reminder_max_count: 3,
};

const mergeSettings = (doc) => {
  const source = doc || {};
  return {
    alerts: { ...DEFAULT_ALERTS, ...(source.alerts || {}) },
    submission_deadline_weekday:
      source.submission_deadline_weekday ?? DEFAULT_SETTINGS.submission_deadline_weekday,
    submission_deadline_hour:
      source.submission_deadline_hour ?? DEFAULT_SETTINGS.submission_deadline_hour,
    submission_deadline_minute:
      source.submission_deadline_minute ?? DEFAULT_SETTINGS.submission_deadline_minute,
    submission_reminder_hours_before:
      Array.isArray(source.submission_reminder_hours_before) &&
      source.submission_reminder_hours_before.length
        ? source.submission_reminder_hours_before
        : DEFAULT_SETTINGS.submission_reminder_hours_before,
    approval_review_hours:
      source.approval_review_hours ?? DEFAULT_SETTINGS.approval_review_hours,
    approval_reminder_repeat_hours:
      source.approval_reminder_repeat_hours ?? DEFAULT_SETTINGS.approval_reminder_repeat_hours,
    approval_reminder_max_count:
      source.approval_reminder_max_count ?? DEFAULT_SETTINGS.approval_reminder_max_count,
  };
};

const getSettings = async (organisation_id) => {
  const doc = await TimesheetNotificationSettings.findOne({ organisation_id }).lean();
  return mergeSettings(doc);
};

const guarded = (fn, label) => async (payload) => {
  try {
    return await fn(payload);
  } catch (err) {
    console.error(`[timesheet-notify] ${label} failed:`, err && err.stack ? err.stack : err);
    return null;
  }
};

const fullName = (doc) => `${doc.f_name || ""} ${doc.l_name || ""}`.trim();

const loadPerson = async (model, id, organisation_id) => {
  if (!model || !id || !organisation_id) return null;

  if (model === "SuperAdmin") {
    if (String(id) !== String(organisation_id)) return null;
    const doc = await SuperAdmin.findById(id).select("f_name l_name email organisation_name").lean();
    if (!doc) return null;
    return {
      id,
      model,
      name: fullName(doc) || doc.organisation_name || "there",
      email: doc.email || "",
      active: true,
    };
  }

  const Model = PERSON_MODELS[model];
  if (!Model) return null;

  const doc = await Model.findOne({ _id: id, organisation_id })
    .select("f_name l_name work_email working_status")
    .lean();
  if (!doc) return null;

  return {
    id,
    model,
    name: fullName(doc) || "there",
    email: doc.work_email || "",
    active: !INACTIVE_STATUSES.includes(doc.working_status),
  };
};

const canEmail = (person) => !!(person && person.email && person.active);

const resolveNameAnyModel = async (id, organisation_id) => {
  if (!id) return "";
  for (const model of ["Manager", "Admin", "User", "SuperAdmin"]) {
    const person = await loadPerson(model, id, organisation_id);
    if (person) return person.name;
  }
  return "";
};

const linkFor = (model) => `${PORTAL_BASE}${PAGE_BY_MODEL[model] || "/login"}`;

const periodLabel = (ts) => {
  const lastDay = new Date(new Date(ts.week_end).getTime() - DAY_MS);
  return `${formatDate(ts.week_start)} - ${formatDate(lastDay)}`;
};

const hoursLabel = (minutes) => {
  const total = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const totalsLabel = (ts) => {
  const base = hoursLabel(ts.total_minutes);
  if (!ts.overtime_minutes) return base;
  return `${base} (${hoursLabel(ts.working_minutes)} working, ${hoursLabel(ts.overtime_minutes)} overtime)`;
};

const approverTargets = (ts) => {
  if (Array.isArray(ts.approverPool) && ts.approverPool.length) {
    return ts.approverPool.map((id) => ({ model: "Admin", id }));
  }
  if (ts.currentHandler && ts.currentHandlerModel) {
    return [{ model: ts.currentHandlerModel, id: ts.currentHandler }];
  }
  return [];
};

const claim = async ({ organisation_id, eventKey, type, recipient, refs }) => {
  try {
    return await TimesheetNotificationLog.create({
      organisation_id,
      event_key: eventKey,
      type,
      recipient_id: recipient.id,
      recipient_model: recipient.model,
      recipient_email: recipient.email,
      timesheet: refs.timesheet || null,
      job: refs.job || null,
      project: refs.project || null,
      status: "pending",
      attempts: 1,
    });
  } catch (err) {
    if (!err || err.code !== 11000) throw err;
    return TimesheetNotificationLog.findOneAndUpdate(
      {
        organisation_id,
        event_key: eventKey,
        attempts: { $lt: MAX_SEND_ATTEMPTS },
        $or: [
          { status: "failed" },
          { status: "pending", updatedAt: { $lt: new Date(Date.now() - STALE_PENDING_MS) } },
        ],
      },
      { $set: { status: "pending" }, $inc: { attempts: 1 } },
      { new: true }
    );
  }
};

const dispatch = async ({ organisation_id, eventKey, type, recipient, build, refs = {} }) => {
  let entry;
  try {
    entry = await claim({ organisation_id, eventKey, type, recipient, refs });
  } catch (err) {
    console.error(`[timesheet-notify] could not record ${type} (${eventKey}):`, err.message);
    return false;
  }
  if (!entry) return false;

  let subject = "";
  try {
    const built = build();
    subject = built.subject;
    await sendEmail({ to: recipient.email, subject, html: built.html });
    await TimesheetNotificationLog.updateOne(
      { _id: entry._id },
      { $set: { status: "sent", subject, sent_at: new Date(), error: "" } }
    );
    return true;
  } catch (err) {
    console.error(`[timesheet-notify] ${type} email to ${recipient.email} failed:`, err.message);
    await TimesheetNotificationLog.updateOne(
      { _id: entry._id },
      { $set: { status: "failed", subject, error: String(err.message || err).slice(0, 500) } }
    ).catch((logErr) => console.error("[timesheet-notify] failed to store error:", logErr.message));
    return false;
  }
};

const submittedAtMs = (ts) => (ts.submitted_at ? new Date(ts.submitted_at).getTime() : 0);

const _notifyTimesheetPending = async ({ timesheetId, escalated = false }) => {
  const ts = await Timesheet.findById(timesheetId).lean();
  if (!ts || !PENDING_STATUSES.includes(ts.status)) return 0;

  const settings = await getSettings(ts.organisation_id);
  if (!settings.alerts.approver_on_submit) return 0;

  const owner = await loadPerson(ts.owner_model, ts.owner, ts.organisation_id);
  const ownerName = owner ? owner.name : "An employee";
  const period = periodLabel(ts);
  let sent = 0;

  for (const target of approverTargets(ts)) {
    const approver = await loadPerson(target.model, target.id, ts.organisation_id);
    if (!canEmail(approver)) continue;

    const eventKey = `pending:${ts._id}:${submittedAtMs(ts)}:${(ts.handlerChain || []).length}:${target.id}`;
    const ok = await dispatch({
      organisation_id: ts.organisation_id,
      eventKey,
      type: "approver_on_submit",
      recipient: approver,
      refs: { timesheet: ts._id },
      build: () => ({
        subject: `Timesheet from ${ownerName} awaiting your review (${period})`,
        html: buildTimesheetAlertEmail({
          preheader: `${ownerName} submitted a timesheet for ${period}`,
          headerTitle: "Timesheet Awaiting Your Review",
          recipientName: approver.name,
          intro: `<strong>${escapeHtml(ownerName)}</strong> has submitted a timesheet for <strong>${escapeHtml(period)}</strong>${
            escalated
              ? ", and it has been escalated to you because the previous approver did not review it in time"
              : ""
          }. It is now waiting for your review.`,
          rows: [
            ["Employee", ownerName],
            ["Timesheet period", period],
            ["Total hours", totalsLabel(ts)],
            ["Status", statusLabel(ts.status)],
            ["Submitted on", formatDate(ts.submitted_at)],
          ],
          actionText: "Review the logged time and approve or reject this timesheet.",
          link: linkFor(approver.model),
          linkLabel: "Review timesheet",
        }),
      }),
    });
    if (ok) sent += 1;
  }

  return sent;
};

const _notifyTimesheetDecision = async ({ timesheetId }) => {
  const ts = await Timesheet.findById(timesheetId).lean();
  if (!ts || !["approved", "rejected"].includes(ts.status)) return 0;

  const settings = await getSettings(ts.organisation_id);
  if (!settings.alerts.decision_to_employee) return 0;

  const owner = await loadPerson(ts.owner_model, ts.owner, ts.organisation_id);
  if (!canEmail(owner)) return 0;

  const isApproved = ts.status === "approved";
  const reviewerId = isApproved ? ts.approved_by : ts.rejected_by;
  const reviewerName = reviewerId
    ? await resolveNameAnyModel(reviewerId, ts.organisation_id)
    : "";
  const reviewedBy = reviewerName || (isApproved ? "Approved automatically" : "Your approver");
  const period = periodLabel(ts);
  const remarks = ts.remarks || "";

  return (await dispatch({
    organisation_id: ts.organisation_id,
    eventKey: `decision:${ts._id}:${ts.status}:${submittedAtMs(ts)}`,
    type: "decision_to_employee",
    recipient: owner,
    refs: { timesheet: ts._id },
    build: () => ({
      subject: `Timesheet ${isApproved ? "approved" : "rejected"} (${period})`,
      html: buildTimesheetAlertEmail({
        preheader: `Your timesheet for ${period} was ${ts.status}`,
        headerTitle: `Timesheet ${isApproved ? "Approved" : "Rejected"}`,
        recipientName: owner.name,
        intro: `Your timesheet for <strong>${escapeHtml(period)}</strong> has been <strong>${ts.status}</strong>${
          reviewerName ? ` by <strong>${escapeHtml(reviewerName)}</strong>` : ""
        }.`,
        pill: { label: isApproved ? "Approved" : "Rejected", tone: ts.status },
        rows: [
          ["Employee", owner.name],
          ["Timesheet period", period],
          ["Total hours", totalsLabel(ts)],
          ["Status", statusLabel(ts.status)],
          ["Reviewed by", reviewedBy],
          ["Reviewed on", formatDate(ts.updatedAt)],
          ...(isApproved && remarks ? [["Approver note", remarks]] : []),
        ],
        reasonTitle: isApproved ? "" : "Reason for rejection",
        reasonText: isApproved ? "" : remarks,
        actionText: isApproved
          ? ""
          : "Review the feedback, correct your time logs and submit the timesheet again.",
        link: linkFor(owner.model),
        linkLabel: isApproved ? "View timesheet" : "Correct and resubmit timesheet",
      }),
    }),
  })) ? 1 : 0;
};

const sendApprovalReminder = async ({ timesheetId, sequence, since, settings }) => {
  const ts = await Timesheet.findOne({ _id: timesheetId, status: { $in: PENDING_STATUSES } }).lean();
  if (!ts) return 0;
  if (new Date(ts.updatedAt).getTime() !== since.getTime()) return 0;

  const owner = await loadPerson(ts.owner_model, ts.owner, ts.organisation_id);
  const ownerName = owner ? owner.name : "An employee";
  const period = periodLabel(ts);
  const waitingHours = Math.floor((Date.now() - since.getTime()) / HOUR_MS);
  const waiting = waitingHours >= 48 ? `${Math.floor(waitingHours / 24)} days` : `${waitingHours} hours`;
  let sent = 0;

  for (const target of approverTargets(ts)) {
    const approver = await loadPerson(target.model, target.id, ts.organisation_id);
    if (!canEmail(approver)) continue;

    const ok = await dispatch({
      organisation_id: ts.organisation_id,
      eventKey: `appr_reminder:${ts._id}:${since.getTime()}:${sequence}:${target.id}`,
      type: "approval_reminder",
      recipient: approver,
      refs: { timesheet: ts._id },
      build: () => ({
        subject: `Reminder: timesheet from ${ownerName} is awaiting your review (${period})`,
        html: buildTimesheetAlertEmail({
          preheader: `${ownerName}'s timesheet for ${period} is still pending`,
          headerTitle: "Timesheet Review Reminder",
          recipientName: approver.name,
          intro: `The timesheet submitted by <strong>${escapeHtml(ownerName)}</strong> for <strong>${escapeHtml(period)}</strong> has been waiting for your review for about ${escapeHtml(waiting)}.`,
          rows: [
            ["Employee", ownerName],
            ["Timesheet period", period],
            ["Total hours", totalsLabel(ts)],
            ["Status", statusLabel(ts.status)],
            ["Waiting since", formatDate(since)],
            ["Reminder", `${sequence} of ${settings.approval_reminder_max_count}`],
          ],
          actionText: "Approve or reject this timesheet so the employee is not left waiting.",
          link: linkFor(approver.model),
          linkLabel: "Review timesheet",
        }),
      }),
    });
    if (ok) sent += 1;
  }

  return sent;
};

const getWeekBoundsIST = (anchor = new Date()) => {
  const { year, month, day, weekday } = getISTDateParts(anchor);
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  const start = new Date(istDateFromYMD(year, month, day).getTime() + diffToMonday * DAY_MS);
  return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
};

const deadlineFor = (settings, weekStart) =>
  new Date(
    weekStart.getTime() +
      (settings.submission_deadline_weekday - 1) * DAY_MS +
      settings.submission_deadline_hour * HOUR_MS +
      settings.submission_deadline_minute * 60 * 1000
  );

const pickOffset = (offsets, hoursLeft) => {
  if (hoursLeft <= 0) return null;
  const eligible = offsets.filter((o) => hoursLeft <= o);
  return eligible.length ? Math.min(...eligible) : null;
};

const runSubmissionReminders = async (now = new Date()) => {
  const { start, end } = getWeekBoundsIST(now);

  const groups = await TimeLog.aggregate([
    { $match: { status: "draft", log_date: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { org: "$organisation_id", by: "$logged_by", model: "$logged_by_model" },
        minutes: { $sum: "$duration_minutes" },
      },
    },
  ]);
  if (!groups.length) return 0;

  const orgIds = [...new Set(groups.map((g) => String(g._id.org)))];
  const alreadySubmitted = await Timesheet.find({
    organisation_id: { $in: orgIds },
    week_start: start,
    status: { $nin: ["draft", "rejected"] },
  })
    .select("organisation_id owner")
    .lean();
  const submittedSet = new Set(alreadySubmitted.map((t) => `${t.organisation_id}:${t.owner}`));

  const settingsCache = new Map();
  let sent = 0;

  for (const group of groups) {
    try {
      const orgKey = String(group._id.org);
      if (!settingsCache.has(orgKey)) settingsCache.set(orgKey, await getSettings(group._id.org));
      const settings = settingsCache.get(orgKey);

      if (!settings.alerts.submission_reminder) continue;
      if (submittedSet.has(`${orgKey}:${group._id.by}`)) continue;

      const deadline = deadlineFor(settings, start);
      const offset = pickOffset(
        settings.submission_reminder_hours_before,
        (deadline.getTime() - now.getTime()) / HOUR_MS
      );
      if (offset === null) continue;

      const person = await loadPerson(group._id.model, group._id.by, group._id.org);
      if (!canEmail(person)) continue;

      const period = `${formatDate(start)} - ${formatDate(new Date(end.getTime() - DAY_MS))}`;
      const deadlineText = deadline.toLocaleString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });

      const ok = await dispatch({
        organisation_id: group._id.org,
        eventKey: `sub_reminder:${group._id.by}:${start.getTime()}:${offset}`,
        type: "submission_reminder",
        recipient: person,
        build: () => ({
          subject: `Reminder: submit your timesheet for ${period}`,
          html: buildTimesheetAlertEmail({
            preheader: `Your timesheet for ${period} is due ${deadlineText} IST`,
            headerTitle: "Timesheet Submission Reminder",
            recipientName: person.name,
            intro: `Your timesheet for <strong>${escapeHtml(period)}</strong> has not been submitted yet. The submission deadline is <strong>${escapeHtml(deadlineText)} IST</strong>.`,
            rows: [
              ["Employee", person.name],
              ["Timesheet period", period],
              ["Logged so far", hoursLabel(group.minutes)],
              ["Status", "Not submitted"],
              ["Deadline", `${deadlineText} IST`],
            ],
            actionText: "Review your time logs and submit your timesheet before the deadline.",
            link: linkFor(person.model),
            linkLabel: "Submit timesheet",
          }),
        }),
      });
      if (ok) sent += 1;
    } catch (err) {
      console.error("[timesheet-notify] submission reminder error:", err.message);
    }
  }

  return sent;
};

const runApprovalReminders = async (now = new Date()) => {
  const pending = await Timesheet.find({ status: { $in: PENDING_STATUSES } })
    .select("_id organisation_id updatedAt submitted_at")
    .lean();
  if (!pending.length) return 0;

  const settingsCache = new Map();
  let sent = 0;

  for (const item of pending) {
    try {
      const orgKey = String(item.organisation_id);
      if (!settingsCache.has(orgKey)) {
        settingsCache.set(orgKey, await getSettings(item.organisation_id));
      }
      const settings = settingsCache.get(orgKey);
      if (!settings.alerts.approval_reminder) continue;

      const since = new Date(item.updatedAt || item.submitted_at);
      const elapsedHours = (now.getTime() - since.getTime()) / HOUR_MS;
      if (elapsedHours < settings.approval_review_hours) continue;

      const sequence =
        1 +
        Math.floor(
          (elapsedHours - settings.approval_review_hours) / settings.approval_reminder_repeat_hours
        );
      if (sequence > settings.approval_reminder_max_count) continue;

      sent += await sendApprovalReminder({ timesheetId: item._id, sequence, since, settings });
    } catch (err) {
      console.error("[timesheet-notify] approval reminder error:", err.message);
    }
  }

  return sent;
};

const _notifyJobAssigned = async ({ jobId }) => {
  const job = await TSJob.findById(jobId).lean();
  if (!job || job.is_self_assigned || job.archived_at) return 0;

  const settings = await getSettings(job.organisation_id);
  if (!settings.alerts.job_assigned) return 0;

  const assignee = await loadPerson(job.assigned_to_model, job.assigned_to, job.organisation_id);
  if (!canEmail(assignee)) return 0;

  const assigner = await loadPerson(job.assigned_by_model, job.assigned_by, job.organisation_id);
  const assignerName = assigner ? assigner.name : "Your manager";
  const project = job.project
    ? await TSProject.findOne({ _id: job.project, organisation_id: job.organisation_id })
        .select("name")
        .lean()
    : null;
  const description = job.description ? String(job.description).slice(0, 300) : "";

  return (await dispatch({
    organisation_id: job.organisation_id,
    eventKey: `job_assigned:${job._id}:${job.assigned_to}`,
    type: "job_assigned",
    recipient: assignee,
    refs: { job: job._id, project: job.project || null },
    build: () => ({
      subject: `New job assigned: ${job.title}`,
      html: buildTimesheetAlertEmail({
        preheader: `${assignerName} assigned you a job`,
        headerTitle: "New Job Assigned",
        recipientName: assignee.name,
        intro: `<strong>${escapeHtml(assignerName)}</strong> has assigned you a new job${
          project ? ` under the project <strong>${escapeHtml(project.name)}</strong>` : ""
        }.`,
        rows: [
          ["Job", job.title],
          ["Project", project ? project.name : ""],
          ["Assigned by", assignerName],
          ["Priority", job.priority ? job.priority.charAt(0).toUpperCase() + job.priority.slice(1) : ""],
          ["Due date", job.due_date ? formatDate(job.due_date) : ""],
          ["Estimated hours", job.estimated_hours ? `${job.estimated_hours}h` : ""],
          ["Description", description],
        ],
        actionText: "Open your timesheet and start logging time against this job.",
        link: linkFor(assignee.model),
        linkLabel: "Open timesheet",
      }),
    }),
  })) ? 1 : 0;
};

const _notifyProjectMembersAdded = async ({ projectId, memberIds }) => {
  const project = await TSProject.findById(projectId).lean();
  if (!project) return 0;

  const settings = await getSettings(project.organisation_id);
  if (!settings.alerts.project_member_added) return 0;

  const wanted = new Set((memberIds || []).map(String));
  const targets = (project.members || []).filter((m) => wanted.has(String(m.member)));
  if (!targets.length) return 0;

  const owner = await loadPerson(project.owner_model, project.owner, project.organisation_id);
  const ownerName = owner ? owner.name : "The project owner";
  let sent = 0;

  for (const target of targets) {
    const member = await loadPerson(target.member_model, target.member, project.organisation_id);
    if (!canEmail(member)) continue;

    const ok = await dispatch({
      organisation_id: project.organisation_id,
      eventKey: `project_member:${project._id}:${target.member}`,
      type: "project_member_added",
      recipient: member,
      refs: { project: project._id },
      build: () => ({
        subject: `You were added to the project: ${project.name}`,
        html: buildTimesheetAlertEmail({
          preheader: `${ownerName} added you to ${project.name}`,
          headerTitle: "Added to a Project",
          recipientName: member.name,
          intro: `<strong>${escapeHtml(ownerName)}</strong> has added you as a member of the project <strong>${escapeHtml(project.name)}</strong>.`,
          rows: [
            ["Project", project.name],
            ["Project code", project.code],
            ["Added by", ownerName],
            ["Start date", project.start_date ? formatDate(project.start_date) : ""],
            ["End date", project.end_date ? formatDate(project.end_date) : ""],
          ],
          actionText: "Watch for jobs assigned under this project and log your time against them.",
          link: linkFor(member.model),
          linkLabel: "Open timesheet",
        }),
      }),
    });
    if (ok) sent += 1;
  }

  return sent;
};

module.exports = {
  DEFAULT_SETTINGS,
  mergeSettings,
  getSettings,
  runSubmissionReminders,
  runApprovalReminders,
  notifyTimesheetPending: guarded(_notifyTimesheetPending, "notifyTimesheetPending"),
  notifyTimesheetDecision: guarded(_notifyTimesheetDecision, "notifyTimesheetDecision"),
  notifyJobAssigned: guarded(_notifyJobAssigned, "notifyJobAssigned"),
  notifyProjectMembersAdded: guarded(_notifyProjectMembersAdded, "notifyProjectMembersAdded"),
};
