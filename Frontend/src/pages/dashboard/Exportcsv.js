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
export const paidDayValue = (r) => {
  if (!r) return 0;
  const paidLeave = !!r.leaveType && r.leaveType !== "lwp";
  if (r.status === "present") return 1;
  if (r.status === "half_day") return paidLeave ? 1 : 0.5;
  if (r.status === "week_off" || r.status === "holiday") return 1;
  if (r.status === "leave") return r.isLwpDay || r.leaveType === "lwp" ? 0 : 1;
  if (r.status === "absent") return paidLeave ? 1 : 0;
  return 0;
};

export const sumPaidDays = (rows) => (rows || []).reduce((s, r) => s + paidDayValue(r), 0);

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

export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCsvCell(c.format ? c.format(row) : row[c.key]))
      .join(",")
  );
  const csv = [header, ...lines].join("\r\n");
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