import * as XLSX from "xlsx";

// Reads an attendance export from a biometric machine (.dat / .csv / .txt / .xls / .xlsx)
// and returns [{ userId, time }] with time like 2026-10-26T09:05:00+05:30.
const DT_RX = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?|(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/;
const p2 = (n) => String(n).padStart(2, "0");

function toIso(cell, tz) {
  if (cell instanceof Date && !isNaN(cell)) {
    return `${cell.getFullYear()}-${p2(cell.getMonth() + 1)}-${p2(cell.getDate())}T${p2(cell.getHours())}:${p2(cell.getMinutes())}:${p2(cell.getSeconds())}${tz}`;
  }
  const m = DT_RX.exec(String(cell));
  if (!m) return null;
  if (m[1]) return `${m[1]}-${p2(m[2])}-${p2(m[3])}T${p2(m[4])}:${m[5]}:${p2(m[6] || 0)}${tz}`;
  return `${m[9]}-${p2(m[8])}-${p2(m[7])}T${p2(m[10])}:${m[11]}:${p2(m[12] || 0)}${tz}`; // dd-mm-yyyy
}

export async function parseAttendanceFile(file, tz = "+05:30") {
  let rows;
  if (/\.(xls|xlsx)$/i.test(file.name)) {
    const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true });
  } else {
    const text = new TextDecoder("utf-8").decode(await file.arrayBuffer());
    rows = text.split(/\r?\n/).filter(Boolean).map((l) => l.split(/\t|,|;/).map((s) => s.trim().replace(/^"|"$/g, "")));
  }
  const punches = [];
  for (const r of rows) {
    if (!Array.isArray(r)) continue;
    let time = null, id = null;
    for (const cell of r) {
      if (!time) { const t = toIso(cell, tz); if (t) { time = t; continue; } }
      if (!id && /^\d{1,12}$/.test(String(cell).trim())) id = String(cell).trim();
    }
    if (time && id) punches.push({ userId: id, time });
  }
  return punches;
}