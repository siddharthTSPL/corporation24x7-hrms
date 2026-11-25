const TimesheetNotificationSettings = require("../Models/Timesheetnotificationsettings.model");
const { resolveActor, resolveOrgId, httpError } = require("../utils/heirarchy.utils");
const { mergeSettings } = require("../utils/Timesheetnotify.utils");

const ALERT_KEYS = [
  "job_assigned",
  "project_member_added",
  "submission_reminder",
  "approver_on_submit",
  "decision_to_employee",
  "approval_reminder",
];

const parseInteger = (value, min, max, label) => {
  const num = Number(value);
  if (value === "" || value === null || !Number.isInteger(num) || num < min || num > max) {
    throw httpError(`${label} must be a whole number between ${min} and ${max}`, 400);
  }
  return num;
};

const getNotificationSettings = async (req, res) => {
  const organisation_id = resolveOrgId(req);
  const doc = await TimesheetNotificationSettings.findOne({ organisation_id }).lean();

  res.status(200).json({
    success: true,
    settings: mergeSettings(doc),
    defaults: mergeSettings(null),
    timezone: "Asia/Kolkata",
  });
};

const updateNotificationSettings = async (req, res, next) => {
  const organisation_id = resolveOrgId(req);
  const actor = resolveActor(req);
  const body = req.body || {};
  const set = {};

  try {
    if (body.alerts !== undefined) {
      if (typeof body.alerts !== "object" || body.alerts === null || Array.isArray(body.alerts)) {
        return next(httpError("alerts must be an object", 400));
      }
      for (const key of ALERT_KEYS) {
        if (!(key in body.alerts)) continue;
        if (typeof body.alerts[key] !== "boolean") {
          return next(httpError(`alerts.${key} must be true or false`, 400));
        }
        set[`alerts.${key}`] = body.alerts[key];
      }
    }

    if ("submission_deadline_weekday" in body) {
      set.submission_deadline_weekday = parseInteger(
        body.submission_deadline_weekday,
        1,
        7,
        "submission_deadline_weekday"
      );
    }
    if ("submission_deadline_hour" in body) {
      set.submission_deadline_hour = parseInteger(
        body.submission_deadline_hour,
        0,
        23,
        "submission_deadline_hour"
      );
    }
    if ("submission_deadline_minute" in body) {
      set.submission_deadline_minute = parseInteger(
        body.submission_deadline_minute,
        0,
        59,
        "submission_deadline_minute"
      );
    }

    if ("submission_reminder_hours_before" in body) {
      const raw = body.submission_reminder_hours_before;
      if (!Array.isArray(raw) || raw.length < 1 || raw.length > 4) {
        return next(httpError("submission_reminder_hours_before must list 1 to 4 values", 400));
      }
      const offsets = [
        ...new Set(raw.map((v) => parseInteger(v, 1, 168, "submission_reminder_hours_before"))),
      ].sort((a, b) => b - a);
      set.submission_reminder_hours_before = offsets;
    }

    if ("approval_review_hours" in body) {
      set.approval_review_hours = parseInteger(body.approval_review_hours, 1, 336, "approval_review_hours");
    }
    if ("approval_reminder_repeat_hours" in body) {
      set.approval_reminder_repeat_hours = parseInteger(
        body.approval_reminder_repeat_hours,
        1,
        168,
        "approval_reminder_repeat_hours"
      );
    }
    if ("approval_reminder_max_count" in body) {
      set.approval_reminder_max_count = parseInteger(
        body.approval_reminder_max_count,
        1,
        10,
        "approval_reminder_max_count"
      );
    }
  } catch (err) {
    return next(err);
  }

  if (!Object.keys(set).length) {
    return next(httpError("No valid settings supplied", 400));
  }

  set.updated_by = actor.id;
  set.updated_by_model = actor.model;

  const doc = await TimesheetNotificationSettings.findOneAndUpdate(
    { organisation_id },
    { $set: set },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  res.status(200).json({
    success: true,
    message: "Timesheet notification settings saved",
    settings: mergeSettings(doc),
  });
};

module.exports = { getNotificationSettings, updateNotificationSettings };
