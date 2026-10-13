// Reusable CSV helpers for the Time Sheet Report.
// Both "Bulk CSV" and the per-employee "Export Data" use generateCSV() +
// downloadCSV(), so the output format is identical everywhere.
//
// Only fields that already exist on the report rows returned by
// GET /timesheet/report (getTimesheetDetailedReport) are used.

const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ROLE_LABEL = { User: "Employee", Manager: "Manager", Admin: "Admin" };

const round2 = (n) => Math.round(n * 100) / 100;
const num = (v) => Number(v) || 0;
// The API uses "—" as a placeholder for missing designation/department.
const clean = (v) => (v === "—" || v === null || v === undefined ? "" : v);
const empKey = (r) => `${r.employee_model}:${r.employee_id}`;

const dayOfWeek = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || "")) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return DAY_NAMES_FULL[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

// ─── columns ─────────────────────────────────────────────────────────────────
// value(row, ctx) -> string | number. total(rows) -> number (optional).
const COLUMNS = [
  { header: "Employee Name", value: (r) => clean(r.name) },
  { header: "Role", value: (r) => ROLE_LABEL[r.employee_model] || clean(r.employee_model) },
  { header: "Work Email", value: (r, ctx) => r.work_email || ctx.emailByEmp.get(empKey(r)) || "" },
  { header: "Designation", value: (r) => clean(r.designation) },
  { header: "Department", value: (r) => clean(r.department) },
  { header: "Date", value: (r) => clean(r.date) },
  { header: "Day", value: (r) => dayOfWeek(r.date) },
  { header: "Day Type", value: (r) => clean(r.day_label) },
  { header: "Project", value: (r) => r.project?.name || "" },
  { header: "Project Code", value: (r) => r.project?.code || "" },
  { header: "Job", value: (r) => r.job?.title || "" },
  { header: "Required Hours", value: (r) => num(r.required_hours), total: (rows) => round2(rows.reduce((s, r) => s + num(r.required_hours), 0)) },
  { header: "Served Hours", value: (r) => num(r.serving_hours), total: (rows) => round2(rows.reduce((s, r) => s + num(r.serving_hours), 0)) },
  { header: "Overtime Hours", value: (r) => num(r.overtime_hours), total: (rows) => round2(rows.reduce((s, r) => s + num(r.overtime_hours), 0)) },
  { header: "Billable", value: (r) => (r.billable ? "Yes" : "No") },
  { header: "Timesheet Status", value: (r, ctx) => ctx.statusLabel(r.timesheet_status) },
  { header: "Approved By", value: (r) => r.approved_by || "" },
  { header: "Rejected By", value: (r) => r.rejected_by || "" },
  { header: "Remarks", value: (r) => r.remarks || "" },
];

// ─── CSV cell escaping ───────────────────────────────────────────────────────
// - quotes are doubled, cells with comma / quote / newline are wrapped in quotes
// - text beginning with = + - @ is prefixed with ' so Excel/Sheets never run it as a formula
const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
};

// ─── generateCSV ─────────────────────────────────────────────────────────────
// rows    : report rows (same shape the Time Sheet Report already uses)
// options : { statusLabel?: (status) => string }
// Returns the CSV text (CRLF line endings, header row, data rows grouped by
// employee then date, and a final Total row).
export const generateCSV = (rows, options = {}) => {
  const statusLabel = options.statusLabel || ((s) => s || "");

  // "Off" placeholder rows carry no email — borrow it from the same employee's other rows.
  const emailByEmp = new Map();
  rows.forEach((r) => {
    if (r.work_email && !emailByEmp.has(empKey(r))) emailByEmp.set(empKey(r), r.work_email);
  });
  const ctx = { emailByEmp, statusLabel };

  const sorted = [...rows].sort(
    (a, b) =>
      (a.name || "").localeCompare(b.name || "") ||
      empKey(a).localeCompare(empKey(b)) ||
      (a.date || "").localeCompare(b.date || "")
  );

  const lines = [COLUMNS.map((c) => csvCell(c.header)).join(",")];
  sorted.forEach((r) => lines.push(COLUMNS.map((c) => csvCell(c.value(r, ctx))).join(",")));

  if (sorted.length) {
    lines.push(
      COLUMNS.map((c, i) => csvCell(c.total ? c.total(sorted) : i === 0 ? "Total" : "")).join(",")
    );
  }
  return lines.join("\r\n") + "\r\n";
};

// ─── downloadCSV ─────────────────────────────────────────────────────────────
// A UTF-8 BOM is prepended so Excel opens Unicode names (e.g. Hindi) correctly;
// Google Sheets / LibreOffice ignore it.
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ─── filenames ───────────────────────────────────────────────────────────────
// Keeps letters/digits from any language, turns everything else into "_".
export const toSafeFilePart = (value, fallback = "Employee") => {
  const s = String(value ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return s || fallback;
};

// owner      : employee name for an individual export, omit for Bulk
// view       : "weekly" | "weekend" | "monthly" | "detailed"
// monthLabel : e.g. "October 2026"
// weekStart / weekEnd : "YYYY-MM-DD"
//
//   Timesheet_Bulk_October_2026.csv
//   Timesheet_Bulk_Week_2026-10-05_to_2026-10-11.csv
//   Timesheet_Bulk_Detailed.csv
//   Timesheet_Rahul_Sharma_October_2026.csv
export const buildExportFilename = ({ owner, view, monthLabel, weekStart, weekEnd }) => {
  const parts = ["Timesheet", owner ? toSafeFilePart(owner) : "Bulk"];
  if (view === "monthly") {
    parts.push(toSafeFilePart(monthLabel, "Month"));
  } else if (view === "detailed") {
    parts.push("Detailed");
  } else {
    if (view === "weekend") parts.push("Weekend");
    parts.push("Week", weekStart, "to", weekEnd);
  }
  return `${parts.join("_")}.csv`;
};