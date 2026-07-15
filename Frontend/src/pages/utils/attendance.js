const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getISTDayKey(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

const SOURCE_RANK = { manual: 3, face: 2, agent: 1 };

export function pickBetterAttendanceRecord(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.checkOut && !b.checkOut) return a;
  if (b.checkOut && !a.checkOut) return b;
  return (SOURCE_RANK[b.source] || 0) > (SOURCE_RANK[a.source] || 0) ? b : a;
}

export function buildAttendanceMap(records = []) {
  const map = new Map();
  records.forEach((rec) => {
    if (!rec?.date) return;
    const key = getISTDayKey(rec.date);
    if (!key) return;
    map.set(key, pickBetterAttendanceRecord(map.get(key), rec));
  });
  return map;
}

export function resolveAttendanceStatus(record, { isToday = false } = {}) {
  if (!record) return null;

  if (record.checkOut) {
    const s = (record.status || "").toLowerCase();
    if (s.includes("half")) return "halfday";
    if (s === "present") return "present";
    if (s === "late") return "late";
    return "absent";
  }

  if (isToday && record.checkIn) return "checkedin";

  return "absent";
}
