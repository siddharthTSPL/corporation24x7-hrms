// Shared CSV export helper for the attendance modals. Turns an array of
// row objects into a CSV file and triggers a browser download — no server
// round-trip, works on whatever is currently filtered/visible on screen.

const escapeCsvCell = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

/**
 * @param {string} filename e.g. "attendance-today-2026-07-23.csv"
 * @param {{key:string, label:string, format?: (row:object)=>string}[]} columns
 * @param {object[]} rows
 */
// ── Day classification ───────────────────────────────────────────────
// Every day lands in exactly ONE bucket:
//   present | week_off | paid_leave | holiday | half_day | absent
// Present + Week Off + Paid Leave (+ Holiday, + Half Day as 0.5) are counted
// as paid days; EVERYTHING ELSE (no-show, LWP / unpaid leave, unknown) is Absent.
export const DAY_BUCKET_LABEL = {
  present: "Present",
  week_off: "Week Off",
  paid_leave: "Paid Leave",
  holiday: "Holiday",
  half_day: "Half Day",
  absent: "Absent",
};

export const dayBucket = (r) => {
  if (!r) return "absent";
  const paidLeave = !!r.leaveType && r.leaveType !== "lwp" && !r.isLwpDay;
  if (r.status === "present") return "present";
  if (r.status === "half_day") return paidLeave ? "paid_leave" : "half_day";
  if (r.status === "week_off") return "week_off";
  if (r.status === "holiday") return "holiday";
  if (r.status === "leave") return r.isLwpDay || r.leaveType === "lwp" ? "absent" : "paid_leave";
  if (r.status === "absent") return paidLeave ? "paid_leave" : "absent";
  return "absent";
};

const BUCKET_VALUE = { present: 1, week_off: 1, paid_leave: 1, holiday: 1, half_day: 0.5, absent: 0 };

export const paidDayValue = (r) => BUCKET_VALUE[dayBucket(r)] ?? 0;

export const sumPaidDays = (rows) => (rows || []).reduce((s, r) => s + paidDayValue(r), 0);

export const summarizeDays = (rows) => {
  const s = { totalDays: 0, present: 0, weekOff: 0, paidLeave: 0, holiday: 0, halfDay: 0, absent: 0, paidDays: 0 };
  (rows || []).forEach((r) => {
    const b = dayBucket(r);
    s.totalDays += 1;
    if (b === "present") s.present += 1;
    else if (b === "week_off") s.weekOff += 1;
    else if (b === "paid_leave") s.paidLeave += 1;
    else if (b === "holiday") s.holiday += 1;
    else if (b === "half_day") s.halfDay += 1;
    else s.absent += 1;
    s.paidDays += BUCKET_VALUE[b] ?? 0;
  });
  return s;
};

// Summary lines appended at the bottom of a single-employee CSV.
export const summaryFooterRows = (sum) => [
  [],
  ["SUMMARY"],
  ["Total Days", sum.totalDays],
  ["Present", sum.present],
  ["Week Off", sum.weekOff],
  ["Paid Leave", sum.paidLeave],
  ["Holiday", sum.holiday],
  ["Half Day", sum.halfDay],
  ["Absent (all others)", sum.absent],
  ["Total Paid Days", sum.paidDays],
];

// Per-employee summary table appended at the bottom of an all-employee CSV.
export const summaryTableRows = (list) => [
  [],
  ["SUMMARY PER EMPLOYEE"],
  ["Employee", "Emp ID", "Total Days", "Present", "Week Off", "Paid Leave", "Holiday", "Half Day", "Absent", "Total Paid Days"],
  ...list.map((e) => [e.name || "", e.empid || "", e.sum.totalDays, e.sum.present, e.sum.weekOff, e.sum.paidLeave, e.sum.holiday, e.sum.halfDay, e.sum.absent, e.sum.paidDays]),
];

export const withTotalRow = (columns) =>
  columns.map((c) => ({
    ...c,
    format: (r) => {
      if (!r.__total) return c.format ? c.format(r) : r[c.key];
      if (c.key === "date") return "TOTAL PAID DAYS";
      if (c.key === "paidDay") return r.paidDays;
      if (c.key === "employeeName") return r.employeeName || "";
      if (c.key === "empid") return r.empid || "";
      return "";
    },
  }));

export function downloadCsv(filename, columns, rows, footerRows = []) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCsvCell(c.format ? c.format(row) : row[c.key]))
      .join(",")
  );
  const footer = footerRows.map((cells) => cells.map(escapeCsvCell).join(","));
  const csv = [header, ...lines, ...footer].join("\r\n");
  // Leading BOM so Excel opens UTF-8 (₹, names with accents, etc.) correctly.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}