// Prevents CSV/Excel formula injection (=, +, -, @)
function cell(v) {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function sendCsv(res, result) {
  const header = result.columns.map((c) => cell(c.label)).join(",");
  const lines = result.rows.map((r) =>
    result.columns.map((c) => cell(r[c.key])).join(","),
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.reportKey}-${Date.now()}.csv"`,
  );
  res.send("\uFEFF" + [header, ...lines].join("\n"));
}

module.exports = { sendCsv };
