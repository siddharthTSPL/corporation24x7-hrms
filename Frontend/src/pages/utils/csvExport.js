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
  { label: "Name", value: (r) => r.name },
  { label: "Designation", value: (r) => r.designation },
  { label: "Department", value: (r) => r.department },
  { label: "Project", value: (r) => r.project?.name || "" },
  { label: "Job", value: (r) => r.job?.title || "" },
  { label: "Date", value: (r) => r.date },
  { label: "Day Type", value: (r) => r.day_label },
  { label: "Required Hours", value: (r) => r.required_hours },
  { label: "Serving Hours", value: (r) => r.serving_hours },
  { label: "Overtime Hours", value: (r) => r.overtime_hours },
  { label: "Billable", value: (r) => (r.billable ? "Yes" : "No") },
  { label: "Timesheet Status", value: (r) => r.timesheet_status },
  { label: "Approved By", value: (r) => r.approved_by || "" },
  { label: "Rejected By", value: (r) => r.rejected_by || "" },
  { label: "Remarks", value: (r) => r.remarks || "" },
];