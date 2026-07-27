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