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
    if (s === "present") return record.isLate ? "late" : "present";
    return "absent";
  }

  // An "agent" record is just a background activity ping from the desktop
  // app - it is NOT a real, window-validated check-in (see
  // attendance.controller.js getToday(), which excludes source "agent"
  // from isCheckedIn the same way). Without this check, the calendar was
  // marking today green as soon as the desktop app sent its first ping,
  // even though the person never actually checked in.
  if (isToday && record.checkIn && record.source !== "agent") return "checkedin";

  // For TODAY specifically, an agent-only ping or no real check-in yet
  // does NOT mean absent - the day isn't over. Return null here so the
  // caller can show a neutral "pending" state until the shift actually
  // ends, instead of jumping straight to red "absent" first thing in
  // the morning. For any past day, no real check-in really does mean absent.
  if (isToday) return null;

  return "absent";
}

// Shift end times ("HH:MM") are stored/compared in IST since that's the
// org's operating timezone; the browser clock is assumed to already be
// IST for the India-based user base (consistent with how "today" is
// rendered elsewhere in this file with toLocaleDateString("en-IN")).
export function isPastShiftEnd(endTime) {
  if (!endTime) return false; // unknown shift -> don't force "absent" early
  const [h, m] = endTime.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  return now >= end;
}