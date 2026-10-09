const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Employment states that mean "no longer with the company" - anyone in one
// of these states must be hidden from every attendance view (live check-in
// list, map, monthly summary, day-wise history, bulk exports) even though
// their old records still exist in the database. Matches the same
// working_status vocabulary already used for assets (see adminasset.jsx /
// superadminasset.jsx) - "working" (or no value at all, for legacy records
// created before this field existed) is the only status that counts as
// currently employed.
const INACTIVE_WORKING_STATUSES = new Set(["resigned", "fired", "terminated"]);

// A person/record counts as active unless their working_status explicitly
// says otherwise. Missing/undefined is treated as "working" so legacy
// records without this field don't get wrongly filtered out.
export function isActiveWorkingStatus(workingStatus) {
  const ws = (workingStatus || "working").toString().trim().toLowerCase();
  return !INACTIVE_WORKING_STATUSES.has(ws);
}

// Drops any resigned/fired/terminated person from a list of
// employee/attendance rows. Works on any array whose items carry a
// working_status field (attendance overview rows, today's check-ins,
// employee records, etc). Safe to call on data that doesn't have the field
// at all - those rows are simply kept.
export function filterActiveOnly(list = []) {
  if (!Array.isArray(list)) return list;
  return list.filter((item) => isActiveWorkingStatus(item?.working_status));
}

// Fallback for when the attendance API's own rows don't carry a
// working_status field at all (this IS the case today - the
// attendance-overview response has no working_status key on any row, so
// filterActiveOnly() above is a no-op there). This takes a Set of
// employee/manager _id's that are known to be resigned/fired/terminated -
// built on the dashboard side from a separate employee-directory fetch
// that DOES carry working_status - and drops any attendance row whose
// `id` matches one of those _id's. Safe no-op when inactiveIds is empty
// or not provided.
export function excludeByIds(list = [], inactiveIds, idKey = "id") {
  if (!Array.isArray(list) || !inactiveIds || inactiveIds.size === 0) return list;
  return list.filter((item) => !inactiveIds.has(item?.[idKey]));
}

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