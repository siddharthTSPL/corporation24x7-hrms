import { useMemo, useState } from "react";
import {
  FaTimes, FaSearch, FaMapMarkerAlt, FaIdCard, FaEnvelope,
  FaUserTie, FaBuilding, FaCalendarAlt, FaClock, FaDownload,
  FaFilter, FaCheckCircle, FaUserClock, FaBan, FaLayerGroup, FaUsers,
} from "react-icons/fa";
import AttendanceHistoryModal from "./AttendanceHistoryModal";
import { downloadCsv } from "./exportCsv";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ROLE_COLOR = {
  admin: "#4a0029",
  manager: "#730042",
  employee: "#a0005c",
};

// Fixed role list — always shown in full, regardless of who has a record
// in the currently loaded rows.
const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "senior_manager", label: "Senior Manager" },
  { value: "admin", label: "Admin" },
  { value: "senior_admin", label: "Senior Admin" },
  { value: "official", label: "Official" },
];

// Department short-code -> full form mapping.
const DEPT_FULL_FORMS = {
  OPR: "Operations",
  BPO: "Business Process Outsourcing",
  ENG: "Engineering",
  HR: "Human Resources",
  MGMT: "Management",
};

// Fixed department list — full forms, always shown in full.
const DEPT_OPTIONS = [
  { value: "all", label: "All Departments" },
  ...Object.entries(DEPT_FULL_FORMS).map(([code, label]) => ({ value: code, label })),
];

function getDeptFullForm(code) {
  if (!code) return "—";
  return DEPT_FULL_FORMS[code] || code;
}

const toInputDate = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const BULK_PRESETS = [
  { key: "last_7", label: "7 Days" },
  { key: "last_15", label: "15 Days" },
  { key: "last_30", label: "30 Days" },
  { key: "custom", label: "Custom" },
];

function bulkPresetRange(key) {
  const now = new Date();
  if (key === "last_15") {
    const start = new Date(now);
    start.setDate(start.getDate() - 14);
    return { startDate: toInputDate(start), endDate: toInputDate(now) };
  }
  if (key === "last_30") {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return { startDate: toInputDate(start), endDate: toInputDate(now) };
  }
  // last_7 (default)
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  return { startDate: toInputDate(start), endDate: toInputDate(now) };
}

const BULK_CONCURRENCY = 5;

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, runner);
  await Promise.all(runners);
  return results;
}

const HIST_STATUS_META = {
  present: "Present",
  half_day: "Half Day",
  absent: "Absent",
};

const HIST_SOURCE_LABEL = {
  face: "Face",
  agent: "Agent",
  system: "System",
};

const histFmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", weekday: "short" }) : "—";

const histFmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

const fmtMinutes = (mins) => {
  const m = Math.round(mins || 0);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h ${rem}m` : `${rem}m`;
};

const STATUS_META = {
  present: { label: "Present ✓", color: "#16A34A", bg: "#DCFCE7" },
  on_duty: { label: "On Duty 🟡", color: "#B8760A", bg: "#FEF3C7" },
  half_day: { label: "Half Day", color: "#B8760A", bg: "#FEF3C7" },
  absent: { label: "Not Checked In", color: "#DC2626", bg: "#FEE2E2" },
  // Checked in/out but active time was too low to count as present/half-day.
  absent_checked_in: { label: "Absent", color: "#DC2626", bg: "#FEE2E2" },
};

function Avatar({ name, role }) {
  const initials =
    (name || "?").trim().split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const color = ROLE_COLOR[role?.toLowerCase()] ?? ROLE_COLOR.employee;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
      style={{ background: color }}
    >
      {initials}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <span className="text-3xl">📍</span>
      <p className="text-[13px] text-gray-400">{text}</p>
    </div>
  );
}

function PersonMeta({ p }) {
  return (
    <div className="min-w-0">
      <p className="m-0 font-semibold text-[13px] text-gray-900 truncate">{p.name || "Unknown"}</p>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
        <span className="flex items-center gap-1 text-[10.5px] text-gray-400">
          <FaIdCard size={9} /> {p.empid || "—"}
        </span>
        <span className="flex items-center gap-1 text-[10.5px] text-gray-400 truncate max-w-[180px]">
          <FaEnvelope size={9} /> {p.email || "—"}
        </span>
      </div>
    </div>
  );
}

// Resolves which status pill to show for a person's "Today" row.
// Rule of thumb: "Not Checked In" is reserved ONLY for someone with no
// checkIn timestamp at all. Anyone with a real checkIn is, by definition,
// checked in - so from there we branch on checkOut/status instead of ever
// falling back to "Not Checked In" again.
function resolveTodayMeta(p) {
  if (!p.checkIn) return STATUS_META.absent; // truly never checked in
  if (!p.checkOut) return STATUS_META.on_duty; // checked in, still working
  const s = (p.status || "").toLowerCase();
  if (s === "present") return STATUS_META.present;
  if (s.includes("half")) return STATUS_META.half_day;
  // Checked in AND checked out, but the work session didn't meet the
  // present/half-day bar - still "Absent" for payroll purposes, but never
  // labeled "Not Checked In" since they demonstrably did check in.
  return STATUS_META.absent_checked_in;
}

// Same branching as resolveTodayMeta, but returns the STATUS_META *key*
// instead of the display object — used for the Status filter dropdown.
function resolveTodayStatusKey(p) {
  if (!p.checkIn) return "absent";
  if (!p.checkOut) return "on_duty";
  const s = (p.status || "").toLowerCase();
  if (s === "present") return "present";
  if (s.includes("half")) return "half_day";
  return "absent_checked_in";
}

function StatChip({ icon, label, value, color, bg }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-[110px]" style={{ background: bg }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] flex-shrink-0" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="m-0 text-[15px] font-bold leading-none" style={{ color }}>{value}</p>
        <p className="m-0 mt-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-gray-400 truncate">{label}</p>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none bg-white ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function TodayRow({ p }) {
  const meta = resolveTodayMeta(p);
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
      <td className="py-2.5 pl-3 pr-2">
        <div className="flex items-center gap-2.5">
          <Avatar name={p.name} role={p.role} />
          <PersonMeta p={p} />
        </div>
      </td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600 capitalize">{p.role}</td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600">
        <div className="flex items-center gap-1">
          <FaUserTie size={9} className="text-gray-300 flex-shrink-0" />
          <span className="truncate max-w-[140px]">{p.reportingManager || "—"}</span>
        </div>
      </td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600">
        <div className="flex items-center gap-1">
          <FaMapMarkerAlt size={9} className="text-gray-300 flex-shrink-0" />
          <span className="truncate max-w-[130px]">{p.office_location || "—"}</span>
        </div>
      </td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600 font-mono">{fmtTime(p.checkIn)}</td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600 font-mono">{fmtTime(p.checkOut)}</td>
      <td className="py-2.5 px-2">
        <span
          className="text-[10.5px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.label}
        </span>
      </td>
      <td className="py-2.5 pr-3 pl-2 text-[11px] text-gray-400 whitespace-nowrap">
        {p.source === "face" ? "🤳 Face" : p.source === "live" ? "📍 System" : "—"}
      </td>
    </tr>
  );
}

function MonthlyRow({ p, onHistoryClick }) {
  const pct = p.attendancePercent ?? 0;
  const pctColor = pct >= 90 ? "#16A34A" : pct >= 70 ? "#D97706" : "#DC2626";
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
      <td className="py-2.5 pl-3 pr-2">
        <div className="flex items-center gap-2.5">
          <Avatar name={p.name} role={p.role} />
          <PersonMeta p={p} />
        </div>
      </td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600 capitalize">{p.role}</td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600">
        <div className="flex items-center gap-1">
          <FaUserTie size={9} className="text-gray-300 flex-shrink-0" />
          <span className="truncate max-w-[140px]">{p.reportingManager || "—"}</span>
        </div>
      </td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600">
        <div className="flex items-center gap-1">
          <FaMapMarkerAlt size={9} className="text-gray-300 flex-shrink-0" />
          <span className="truncate max-w-[130px]">{p.office_location || "—"}</span>
        </div>
      </td>
      <td className="py-2.5 px-2 text-[12px] text-center text-green-700 font-semibold">{p.presentDays}</td>
      <td className="py-2.5 px-2 text-[12px] text-center text-amber-700 font-semibold">{p.halfDays}</td>
      <td className="py-2.5 px-2 text-[12px] text-center text-red-600 font-semibold">{p.absentDays}</td>
      <td className="py-2.5 px-2 text-[12px] text-center text-gray-500 font-semibold">{p.weekOffHolidayDays ?? 0}</td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600 font-mono whitespace-nowrap">{fmtMinutes(p.totalWorkingMinutes)}</td>
      <td className="py-2.5 px-2">
        <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: pctColor }}>
          {pct}%
        </span>
      </td>
      <td className="py-2.5 pr-3 pl-2">
        <button
          type="button"
          onClick={() => onHistoryClick?.(p)}
          className="flex items-center gap-1 text-[10.5px] font-semibold rounded-lg px-2.5 py-1.5 whitespace-nowrap transition-colors"
          style={{ color: "#730042", background: "#fdf2f7", border: "1px solid #e8b8cf" }}
        >
          <FaClock size={9} /> History
        </button>
      </td>
    </tr>
  );
}

/**
 * Attendance Details modal - opened from the Live Attendance Map card on
 * the admin / superadmin dashboards. Two tabs: Today (live check-in status)
 * and Monthly (rolled-up AttendanceSummary counts for a picked month/year).
 *
 * `useOverviewHook` must be the role-specific hook
 * (useGetAttendanceOverview from adminother.hook.js or suother.hook.js) -
 * passed in so this component stays shared between both dashboards.
 */
export default function AttendanceDetailsModal({ open, onClose, useOverviewHook, useHistoryHook, fetchHistory }) {
  const [tab, setTab] = useState("today");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // today tab only
  const [sourceFilter, setSourceFilter] = useState("all"); // today tab only
  const [historyModal, setHistoryModal] = useState({ open: false, person: null });
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  // Day-range bulk export (7/15/30/custom) — pulls day-wise history for
  // every currently filtered employee in one CSV, independent of the
  // month-summary "Export CSV" button above.
  const [bulkPreset, setBulkPreset] = useState("last_7");
  const [bulkRange, setBulkRange] = useState(() => bulkPresetRange("last_7"));
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  const applyBulkPreset = (key) => {
    setBulkPreset(key);
    if (key !== "custom") setBulkRange(bulkPresetRange(key));
  };

  const todayQuery = useOverviewHook(
    { type: "today" },
    { enabled: open && tab === "today" }
  );
  const monthlyQuery = useOverviewHook(
    { type: "monthly", month, year },
    { enabled: open && tab === "monthly" }
  );

  const activeQuery = tab === "today" ? todayQuery : monthlyQuery;
  const rows = activeQuery.data?.data ?? [];

  const STATUS_FILTER_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "present", label: "Present" },
    { value: "on_duty", label: "On Duty" },
    { value: "half_day", label: "Half Day" },
    { value: "absent_checked_in", label: "Absent (Checked In)" },
    { value: "absent", label: "Not Checked In" },
  ];

  const SOURCE_FILTER_OPTIONS = [
    { value: "all", label: "All Sources" },
    { value: "face", label: "🤳 Face" },
    { value: "live", label: "📍 System" },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (q) {
        const matches =
          p.name?.toLowerCase().includes(q) ||
          p.empid?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.office_location?.toLowerCase().includes(q) ||
          p.reportingManager?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (roleFilter !== "all" && p.role !== roleFilter) return false;
      if (deptFilter !== "all" && p.department !== deptFilter) return false;
      if (tab === "today") {
        if (statusFilter !== "all" && resolveTodayStatusKey(p) !== statusFilter) return false;
        if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
      }
      return true;
    });
  }, [rows, search, roleFilter, deptFilter, statusFilter, sourceFilter, tab]);

  // Quick counts for the stat strip — always computed off the currently
  // filtered set so the numbers match what's actually visible below.
  const todayStats = useMemo(() => {
    if (tab !== "today") return null;
    const acc = { present: 0, onDuty: 0, absentCheckedIn: 0, notCheckedIn: 0 };
    filtered.forEach((p) => {
      const key = resolveTodayStatusKey(p);
      if (key === "present" || key === "half_day") acc.present += 1;
      else if (key === "on_duty") acc.onDuty += 1;
      else if (key === "absent_checked_in") acc.absentCheckedIn += 1;
      else acc.notCheckedIn += 1;
    });
    return acc;
  }, [filtered, tab]);

  const monthlyStats = useMemo(() => {
    if (tab !== "monthly") return null;
    if (!filtered.length) return { avgPercent: 0, totalPresent: 0, totalAbsent: 0, totalHours: "0h 0m" };
    const totalPresent = filtered.reduce((s, p) => s + (p.presentDays || 0), 0);
    const totalAbsent = filtered.reduce((s, p) => s + (p.absentDays || 0), 0);
    const totalMins = filtered.reduce((s, p) => s + (p.totalWorkingMinutes || 0), 0);
    const avgPercent = Math.round(filtered.reduce((s, p) => s + (p.attendancePercent || 0), 0) / filtered.length);
    return { avgPercent, totalPresent, totalAbsent, totalHours: fmtMinutes(totalMins) };
  }, [filtered, tab]);

  const exportCsv = () => {
    const stamp = tab === "today" ? new Date().toISOString().slice(0, 10) : `${year}-${String(month).padStart(2, "0")}`;
    if (tab === "today") {
      downloadCsv(
        `attendance-today-${stamp}.csv`,
        [
          { key: "name", label: "Employee" },
          { key: "empid", label: "Emp ID" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "department", label: "Department", format: (r) => getDeptFullForm(r.department) },
          { key: "reportingManager", label: "Reporting Manager" },
          { key: "office_location", label: "Office Location" },
          { key: "checkIn", label: "Check-in", format: (r) => fmtTime(r.checkIn) },
          { key: "checkOut", label: "Check-out", format: (r) => fmtTime(r.checkOut) },
          { key: "status", label: "Status", format: (r) => resolveTodayMeta(r).label },
          { key: "source", label: "Via", format: (r) => (r.source === "face" ? "Face" : r.source === "live" ? "System" : "—") },
          { key: "activeMinutes", label: "Active Minutes", format: (r) => Math.round(r.activeMinutes || 0) },
          { key: "idleMinutes", label: "Idle Minutes", format: (r) => Math.round(r.idleMinutes || 0) },
        ],
        filtered
      );
    } else {
      downloadCsv(
        `attendance-monthly-${stamp}.csv`,
        [
          { key: "name", label: "Employee" },
          { key: "empid", label: "Emp ID" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "department", label: "Department", format: (r) => getDeptFullForm(r.department) },
          { key: "reportingManager", label: "Reporting Manager" },
          { key: "office_location", label: "Office Location" },
          { key: "presentDays", label: "Present Days" },
          { key: "halfDays", label: "Half Days" },
          { key: "absentDays", label: "Absent Days" },
          { key: "weekOffHolidayDays", label: "Weekoff/Holiday Days" },
          { key: "totalWorkingMinutes", label: "Total Hours", format: (r) => fmtMinutes(r.totalWorkingMinutes) },
          { key: "attendancePercent", label: "Attendance %", format: (r) => `${r.attendancePercent ?? 0}%` },
        ],
        filtered
      );
    }
  };

  // Day-wise export for ALL currently filtered employees at once, for the
  // 7/15/30/custom range picked above — unlike exportCsv() this pulls
  // per-day check-in/out rows via fetchHistory, not just the month summary.
  const exportAllDayWiseCsv = async () => {
    if (!filtered.length || !fetchHistory || isBulkExporting) return;
    setIsBulkExporting(true);
    setBulkProgress({ done: 0, total: filtered.length });

    const combined = [];
    const failedNames = [];

    await runWithConcurrency(filtered, BULK_CONCURRENCY, async (person) => {
      try {
        const res = await fetchHistory(person.id, { startDate: bulkRange.startDate, endDate: bulkRange.endDate });
        const dayRows = res?.data ?? [];
        dayRows.forEach((r) => {
          combined.push({ ...r, employeeName: person.name || "Unknown", empid: person.empid || "—" });
        });
      } catch {
        failedNames.push(person.name || person.empid || person.id);
      } finally {
        setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    });

    downloadCsv(
      `attendance-history-all-employees-${bulkRange.startDate}_to_${bulkRange.endDate}.csv`,
      [
        { key: "employeeName", label: "Employee", format: (r) => r.employeeName },
        { key: "empid", label: "Emp ID", format: (r) => r.empid },
        { key: "date", label: "Date", format: (r) => histFmtDate(r.date) },
        { key: "checkIn", label: "Check-in", format: (r) => histFmtTime(r.checkIn) },
        { key: "checkOut", label: "Check-out", format: (r) => histFmtTime(r.checkOut) },
        { key: "source", label: "Via", format: (r) => HIST_SOURCE_LABEL[r.source] || "System" },
        { key: "activeMinutes", label: "Active Minutes", format: (r) => Math.round(r.activeMinutes || 0) },
        { key: "idleMinutes", label: "Idle Minutes", format: (r) => Math.round(r.idleMinutes || 0) },
        { key: "status", label: "Status", format: (r) => HIST_STATUS_META[r.status] || "Absent" },
        { key: "isLate", label: "Late", format: (r) => (r.isLate ? "Yes" : "No") },
        { key: "overtimeMinutes", label: "Overtime Minutes", format: (r) => Math.round(r.overtimeMinutes || 0) },
      ],
      combined
    );

    setIsBulkExporting(false);
    if (failedNames.length) {
      console.warn("Could not fetch attendance history for:", failedNames.join(", "));
    }
  };

  if (!open) return null;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <>
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(20,10,15,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #730042 0%, #9B2554 100%)" }}
        >
          <div className="min-w-0">
            <h2 className="m-0 text-base sm:text-lg font-bold flex items-center gap-2">
              <FaMapMarkerAlt size={15} /> Attendance Details
            </h2>
            <p className="m-0 mt-0.5 text-[11px] sm:text-[12px] text-white/75">
              Full team check-in status and monthly attendance summary
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors"
          >
            <FaTimes size={13} />
          </button>
        </div>

        <div className="px-4 sm:px-6 pt-3.5 flex items-center justify-between gap-3 flex-wrap border-b border-gray-100 flex-shrink-0">
          <div className="flex gap-1.5">
            {[
              { key: "today", label: "Today" },
              { key: "monthly", label: "Monthly" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-4 py-2 text-[13px] font-semibold rounded-t-xl transition-colors"
                style={
                  tab === t.key
                    ? { color: "#730042", borderBottom: "2.5px solid #730042", background: "#fdf2f7" }
                    : { color: "#9CA3AF", borderBottom: "2.5px solid transparent" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pb-2.5 flex-wrap">
            {tab === "monthly" && (
              <>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            )}
            <button
              type="button"
              onClick={exportCsv}
              disabled={!filtered.length}
              className="flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: "#fff", background: "#730042" }}
            >
              <FaDownload size={10} /> Export CSV
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-2.5 flex items-center gap-2 flex-wrap border-b border-gray-100 flex-shrink-0 bg-gray-50/40">
          <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-gray-400 mr-0.5">
            <FaFilter size={9} /> Filters
          </span>
          <FilterSelect value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS} />
          <FilterSelect value={deptFilter} onChange={setDeptFilter} options={DEPT_OPTIONS} />
          {tab === "today" && (
            <>
              <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} />
              <FilterSelect value={sourceFilter} onChange={setSourceFilter} options={SOURCE_FILTER_OPTIONS} />
            </>
          )}
          {tab === "monthly" && fetchHistory && (
            <>
              <span className="w-px h-4 bg-gray-200 mx-0.5" />
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">Bulk export</span>
              <div className="flex gap-1">
                {BULK_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyBulkPreset(p.key)}
                    disabled={isBulkExporting}
                    className="px-2 py-1 text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50"
                    style={
                      bulkPreset === p.key
                        ? { color: "#730042", background: "#fdf2f7", border: "1px solid #e8b8cf" }
                        : { color: "#9CA3AF", background: "#fff", border: "1px solid #e5e7eb" }
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {bulkPreset === "custom" && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={bulkRange.startDate}
                    max={bulkRange.endDate}
                    disabled={isBulkExporting}
                    onChange={(e) => setBulkRange((r) => ({ ...r, startDate: e.target.value }))}
                    className="text-[11.5px] border border-gray-200 rounded-lg px-1.5 py-1 text-gray-600 outline-none"
                  />
                  <span className="text-[11px] text-gray-400">to</span>
                  <input
                    type="date"
                    value={bulkRange.endDate}
                    min={bulkRange.startDate}
                    max={toInputDate(new Date())}
                    disabled={isBulkExporting}
                    onChange={(e) => setBulkRange((r) => ({ ...r, endDate: e.target.value }))}
                    className="text-[11.5px] border border-gray-200 rounded-lg px-1.5 py-1 text-gray-600 outline-none"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={exportAllDayWiseCsv}
                disabled={isBulkExporting || !filtered.length}
                title="Export day-wise check-in/out history for every listed employee, for the selected range"
                className="flex items-center gap-1.5 text-[11.5px] font-semibold rounded-lg px-2.5 py-1.5 whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: "#fff", background: "#730042" }}
              >
                <FaUsers size={10} />
                {isBulkExporting ? `Exporting ${bulkProgress.done}/${bulkProgress.total}…` : "Export All"}
              </button>
            </>
          )}
          <div className="relative ml-auto">
            <FaSearch size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, empid, email…"
              className="text-[12px] border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 outline-none w-[190px] focus:border-[#c499b4]"
            />
          </div>
        </div>

        {tab === "today" && todayStats && (
          <div className="px-4 sm:px-6 py-2.5 flex items-center gap-2 flex-wrap border-b border-gray-100 flex-shrink-0">
            <StatChip icon={<FaCheckCircle size={11} />} label="Present" value={todayStats.present} color="#16A34A" bg="#DCFCE7" />
            <StatChip icon={<FaUserClock size={11} />} label="On Duty" value={todayStats.onDuty} color="#B8760A" bg="#FEF3C7" />
            <StatChip icon={<FaBan size={11} />} label="Absent" value={todayStats.absentCheckedIn} color="#DC2626" bg="#FEE2E2" />
            <StatChip icon={<FaLayerGroup size={11} />} label="Not Checked In" value={todayStats.notCheckedIn} color="#6B7280" bg="#F3F4F6" />
          </div>
        )}

        {tab === "monthly" && monthlyStats && (
          <div className="px-4 sm:px-6 py-2.5 flex items-center gap-2 flex-wrap border-b border-gray-100 flex-shrink-0">
            <StatChip icon={<FaCheckCircle size={11} />} label="Avg Attendance" value={`${monthlyStats.avgPercent}%`} color="#16A34A" bg="#DCFCE7" />
            <StatChip icon={<FaUserClock size={11} />} label="Total Present Days" value={monthlyStats.totalPresent} color="#0D9E6E" bg="#E8F7F1" />
            <StatChip icon={<FaBan size={11} />} label="Total Absent Days" value={monthlyStats.totalAbsent} color="#DC2626" bg="#FEE2E2" />
            <StatChip icon={<FaClock size={11} />} label="Total Hours" value={monthlyStats.totalHours} color="#730042" bg="#fdf2f7" />
          </div>
        )}

        <div className="overflow-auto flex-1">
          {activeQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-gray-400">
              <span className="text-lg">⏳</span> Loading attendance…
            </div>
          ) : activeQuery.isError ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-red-500">
              ⚠ Could not load attendance details.
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState text={rows.length ? "No matches for your filters" : "No team members found"} />
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#f1f1f1]">
                <tr>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 pl-3 pr-2">Employee</th>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Role</th>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Reporting Manager</th>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Office Location</th>
                  {tab === "today" ? (
                    <>
                      <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Check-in</th>
                      <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Check-out</th>
                      <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Status</th>
                      <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 pr-3 pl-2">Via</th>
                    </>
                  ) : (
                    <>
                      <th className="text-center text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Present</th>
                      <th className="text-center text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Half Day</th>
                      <th className="text-center text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Absent</th>
                      <th className="text-center text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Weekoff/Holiday</th>
                      <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Total Hours</th>
                      <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Attendance %</th>
                      <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 pr-3 pl-2">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) =>
                  tab === "today" ? (
                    <TodayRow key={p.id} p={p} />
                  ) : (
                    <MonthlyRow
                      key={p.id}
                      p={p}
                      onHistoryClick={(person) => setHistoryModal({ open: true, person })}
                    />
                  )
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 sm:px-6 py-2.5 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/60">
          <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
            {tab === "today" ? <FaClock size={9} /> : <FaCalendarAlt size={9} />}
            {tab === "today"
              ? "Live check-in status for today"
              : `Summary for ${MONTH_NAMES[month - 1]} ${year}`}
          </span>
          <span className="text-[11px] text-gray-400">
            <FaBuilding size={9} className="inline mr-1" />
            {filtered.length} of {rows.length} shown
          </span>
        </div>
      </div>
    </div>

      {useHistoryHook && (
        <AttendanceHistoryModal
          open={historyModal.open}
          onClose={() => setHistoryModal({ open: false, person: null })}
          employeeId={historyModal.person?.id}
          employeeName={historyModal.person?.name}
          useHistoryHook={useHistoryHook}
          people={filtered}
          fetchHistory={fetchHistory}
        />
      )}
    </>
  );
}