export function downloadReportCSV(rows, columns, filename) {
  if (!rows || !rows.length) return;

  const escapeCell = (value) => {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const lines = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(","));
  const csv = [header, ...lines].join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const TIMESHEET_REPORT_CSV_COLUMNS = [
  { label: "Name", value: (r) => (r.__isTotal ? "TOTAL" : r.name) },
  { label: "Designation", value: (r) => (r.__isTotal ? "" : r.designation) },
  { label: "Department", value: (r) => (r.__isTotal ? "" : r.department) },
  { label: "Project", value: (r) => (r.__isTotal ? "" : r.project?.name || "") },
  { label: "Job", value: (r) => (r.__isTotal ? "" : r.job?.title || "") },
  { label: "Date", value: (r) => (r.__isTotal ? "" : r.date) },
  { label: "Day Type", value: (r) => (r.__isTotal ? `${r.count} row(s)` : r.day_label) },
  { label: "Required Hours", value: (r) => r.required_hours },
  { label: "Serving Hours", value: (r) => r.serving_hours },
  { label: "Overtime Hours", value: (r) => r.overtime_hours },
  { label: "Billable", value: (r) => (r.__isTotal ? "" : r.billable ? "Yes" : "No") },
  { label: "Timesheet Status", value: (r) => (r.__isTotal ? "" : r.timesheet_status) },
  { label: "Approved By", value: (r) => (r.__isTotal ? "" : r.approved_by || "") },
  { label: "Rejected By", value: (r) => (r.__isTotal ? "" : r.rejected_by || "") },
  { label: "Remarks", value: (r) => (r.__isTotal ? "" : r.remarks || "") },
];

// Appended as the last row of a Timesheet Report CSV export so Required /
// Serving (overall) / Overtime hours have at least a total, instead of the
// export ending mid-list with nothing summed up.
export function buildReportTotalsRow(rows) {
  const sum = (key) =>
    Math.round(rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0) * 100) / 100;
  return {
    __isTotal: true,
    count: rows.length,
    required_hours: sum("required_hours"),
    serving_hours: sum("serving_hours"),
    overtime_hours: sum("overtime_hours"),
  };
}