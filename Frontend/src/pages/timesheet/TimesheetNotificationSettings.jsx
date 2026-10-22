import React, { useEffect, useMemo, useState } from "react";
import {
  useTimesheetNotificationSettings,
  useUpdateTimesheetNotificationSettings,
} from "../../auth/server-state/timesheet/timesheet.hook";

const ALERT_TYPES = [
  {
    key: "job_assigned",
    title: "Job assigned",
    description: "Email the assignee when a job is created and assigned to them.",
  },
  {
    key: "project_member_added",
    title: "Added to a project",
    description: "Email a person when they are added as a project member.",
  },
  {
    key: "submission_reminder",
    title: "Submission reminder",
    description: "Remind employees who still have unsubmitted time logs before the weekly deadline.",
  },
  {
    key: "approver_on_submit",
    title: "Approver notification",
    description: "Email the assigned approver when a timesheet is submitted, forwarded or escalated to them.",
  },
  {
    key: "decision_to_employee",
    title: "Approval or rejection result",
    description: "Email the employee when their timesheet is approved or rejected, with the rejection reason.",
  },
  {
    key: "approval_reminder",
    title: "Pending approval reminder",
    description: "Remind the approver when a submitted timesheet stays unreviewed past the review period.",
  },
];

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const pad2 = (n) => String(n).padStart(2, "0");

const toForm = (settings) => ({
  alerts: { ...settings.alerts },
  weekday: String(settings.submission_deadline_weekday),
  time: `${pad2(settings.submission_deadline_hour)}:${pad2(settings.submission_deadline_minute)}`,
  offsets: settings.submission_reminder_hours_before.join(", "),
  reviewHours: String(settings.approval_review_hours),
  repeatHours: String(settings.approval_reminder_repeat_hours),
  maxCount: String(settings.approval_reminder_max_count),
});

const parseWholeNumber = (value, min, max, label) => {
  const text = String(value).trim();
  const num = Number(text);
  if (text === "" || !Number.isInteger(num) || num < min || num > max) {
    return { error: `${label} must be a whole number between ${min} and ${max}.` };
  }
  return { value: num };
};

const buildPayload = (form) => {
  const [hourText, minuteText] = form.time.split(":");
  const hour = parseWholeNumber(hourText, 0, 23, "Deadline time");
  const minute = parseWholeNumber(minuteText, 0, 59, "Deadline time");
  if (hour.error || minute.error) return { error: "Choose a valid deadline time." };

  const offsetParts = form.offsets.split(",").map((p) => p.trim()).filter(Boolean);
  if (offsetParts.length < 1 || offsetParts.length > 4) {
    return { error: "Enter between 1 and 4 reminder times, separated by commas." };
  }
  const offsets = [];
  for (const part of offsetParts) {
    const parsed = parseWholeNumber(part, 1, 168, "Each reminder time (hours before deadline)");
    if (parsed.error) return { error: parsed.error };
    offsets.push(parsed.value);
  }

  const review = parseWholeNumber(form.reviewHours, 1, 336, "Review period");
  if (review.error) return { error: review.error };
  const repeat = parseWholeNumber(form.repeatHours, 1, 168, "Reminder repeat interval");
  if (repeat.error) return { error: repeat.error };
  const max = parseWholeNumber(form.maxCount, 1, 10, "Maximum reminders");
  if (max.error) return { error: max.error };

  return {
    payload: {
      alerts: form.alerts,
      submission_deadline_weekday: Number(form.weekday),
      submission_deadline_hour: hour.value,
      submission_deadline_minute: minute.value,
      submission_reminder_hours_before: offsets,
      approval_review_hours: review.value,
      approval_reminder_repeat_hours: repeat.value,
      approval_reminder_max_count: max.value,
    },
  };
};

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full border-none cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/40 focus-visible:ring-offset-2 ${
        checked ? "bg-[#730042]" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[12px] font-bold text-gray-700">{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-gray-500 leading-snug">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/20 disabled:bg-gray-100 disabled:text-gray-400";

function Section({ title, description, children }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
        <h3 className="m-0 text-[14px] font-bold text-gray-900">{title}</h3>
        {description ? <p className="m-0 mt-1 text-[12px] text-gray-500 leading-snug">{description}</p> : null}
      </div>
      <div className="px-4 sm:px-5 py-4">{children}</div>
    </section>
  );
}

export default function TimesheetNotificationSettings() {
  const { data, isLoading, isError, error, refetch } = useTimesheetNotificationSettings();
  const saveMutation = useUpdateTimesheetNotificationSettings();

  const [form, setForm] = useState(null);
  const [message, setMessage] = useState(null);

  const serverForm = useMemo(() => (data?.settings ? toForm(data.settings) : null), [data]);
  const defaultForm = useMemo(() => (data?.defaults ? toForm(data.defaults) : null), [data]);

  useEffect(() => {
    if (serverForm) setForm(serverForm);
  }, [serverForm]);

  const dirty = useMemo(
    () => !!form && !!serverForm && JSON.stringify(form) !== JSON.stringify(serverForm),
    [form, serverForm]
  );

  const setField = (key, value) => {
    setMessage(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setAlert = (key, value) => {
    setMessage(null);
    setForm((prev) => ({ ...prev, alerts: { ...prev.alerts, [key]: value } }));
  };

  const handleSave = async () => {
    const result = buildPayload(form);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    try {
      await saveMutation.mutateAsync(result.payload);
      setMessage({ type: "success", text: "Email alert settings saved." });
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Could not save settings. Please try again." });
    }
  };

  if (isLoading || (!form && !isError)) {
    return (
      <div className="py-16 text-center text-[13px] text-gray-500" role="status">
        Loading email alert settings...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
        <p className="m-0 text-[13px] text-gray-700">
          {error?.message || "Email alert settings could not be loaded."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 inline-flex items-center justify-center rounded-md bg-[#730042] hover:bg-[#5c0034] text-white font-semibold text-[12px] px-4 min-h-[36px] border-none cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  const submissionOn = form.alerts.submission_reminder;
  const approvalOn = form.alerts.approval_reminder;
  const saving = saveMutation.isPending;

  return (
    <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
      <div className="min-w-0">
        <h2 className="m-0 text-[16px] sm:text-[18px] font-bold text-gray-900">Email alerts</h2>
        <p className="m-0 mt-1 text-[12px] sm:text-[13px] text-gray-500 leading-snug">
          Choose which timesheet emails your company sends and when reminders go out. Timesheets are submitted
          weekly (Monday to Sunday) and all times are in IST.
        </p>
      </div>

      <Section title="Alert types" description="Turn individual emails on or off for your whole company.">
        <ul className="m-0 p-0 list-none flex flex-col divide-y divide-gray-100">
          {ALERT_TYPES.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-gray-900">{item.title}</div>
                <div className="text-[12px] text-gray-500 leading-snug">{item.description}</div>
              </div>
              <Toggle
                checked={!!form.alerts[item.key]}
                onChange={(value) => setAlert(item.key, value)}
                label={item.title}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Submission deadline and reminders"
        description="Employees with unsubmitted time logs for the week are reminded before this deadline."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Deadline day">
            <select
              className={inputClass}
              value={form.weekday}
              disabled={!submissionOn}
              onChange={(e) => setField("weekday", e.target.value)}
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Deadline time (IST)">
            <input
              type="time"
              className={inputClass}
              value={form.time}
              disabled={!submissionOn}
              onChange={(e) => setField("time", e.target.value)}
            />
          </Field>
          <Field
            label="Remind before deadline (hours)"
            hint="Up to 4 values, for example 24, 2."
          >
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              value={form.offsets}
              disabled={!submissionOn}
              onChange={(e) => setField("offsets", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Pending approval reminders"
        description="Approvers are reminded when a submitted timesheet is still waiting after the review period."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Review period (hours)" hint="Wait this long before the first reminder.">
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              value={form.reviewHours}
              disabled={!approvalOn}
              onChange={(e) => setField("reviewHours", e.target.value)}
            />
          </Field>
          <Field label="Repeat every (hours)" hint="Gap between follow-up reminders.">
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              value={form.repeatHours}
              disabled={!approvalOn}
              onChange={(e) => setField("repeatHours", e.target.value)}
            />
          </Field>
          <Field label="Maximum reminders" hint="Reminders stop after this many.">
            <input
              type="text"
              inputMode="numeric"
              className={inputClass}
              value={form.maxCount}
              disabled={!approvalOn}
              onChange={(e) => setField("maxCount", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {message ? (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-md px-4 py-3 text-[13px] ${
            message.type === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-[#730042]/[0.06] text-[#730042] border border-[#730042]/20"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={saving || !defaultForm}
          onClick={() => {
            setMessage(null);
            setForm(defaultForm);
          }}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-[12px] px-4 min-h-[40px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={handleSave}
          className="inline-flex items-center justify-center rounded-md bg-[#730042] hover:bg-[#5c0034] text-white font-semibold text-[12px] px-5 min-h-[40px] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
