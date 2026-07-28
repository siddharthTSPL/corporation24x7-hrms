import { useMemo, useState } from "react";
import { FaTimes, FaClock, FaCalendarAlt, FaMapMarkerAlt, FaDownload, FaFilter, FaUsers } from "react-icons/fa";
import { downloadCsv } from "./exportCsv";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", weekday: "short" }) : "—";

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

const fmtMinutes = (mins) => {
  const m = Math.round(mins || 0);
  if (!m) return "0m";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return h > 0 ? `${h}h ${rem}m` : `${rem}m`;
};

const toInputDate = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const CONCURRENCY = 5;

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

const STATUS_META = {
  present: { label: "Present", color: "#16A34A", bg: "#DCFCE7" },
  half_day: { label: "Half Day", color: "#B8760A", bg: "#FEF3C7" },
  absent: { label: "Absent", color: "#DC2626", bg: "#FEE2E2" },
};

const SOURCE_META = {
  face: { label: "🤳 Face", color: "#9B2554", bg: "#FDF2F7" },
  agent: { label: "💻 Agent", color: "#2563EB", bg: "#EFF6FF" },
  system: { label: "📍 System", color: "#0D9E6E", bg: "#E8F7F1" },
};

const PRESETS = [
  { key: "last_7", label: "Last 7 Days" },
  { key: "last_15", label: "Last 15 Days" },
  { key: "this_month", label: "This Month" },
  { key: "last_30", label: "Last 30 Days" },
  { key: "custom", label: "Custom" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "present", label: "Present" },
  { value: "half_day", label: "Half Day" },
  { value: "absent", label: "Absent" },
];

const SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "face", label: "🤳 Face" },
  { value: "system", label: "📍 System" },
  { value: "agent", label: "💻 Agent" },
];

function presetRange(key) {
  const now = new Date();
  if (key === "last_7") {
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { startDate: toInputDate(start), endDate: toInputDate(end) };
  }
  if (key === "last_15") {
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 14);
    return { startDate: toInputDate(start), endDate: toInputDate(end) };
  }
  if (key === "last_30") {
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return { startDate: toInputDate(start), endDate: toInputDate(end) };
  }
  // this_month (default)
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: toInputDate(start), endDate: toInputDate(now) };
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none bg-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function HistoryRow({ r }) {
  const meta = STATUS_META[r.status] || STATUS_META.absent;
  const src = SOURCE_META[r.source] || SOURCE_META.system;
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors">
      <td className="py-2.5 pl-3 pr-2 text-[12px] font-medium text-gray-800 whitespace-nowrap">{fmtDate(r.date)}</td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600 font-mono">{fmtTime(r.checkIn)}</td>
      <td className="py-2.5 px-2 text-[12px] text-gray-600 font-mono">{fmtTime(r.checkOut)}</td>
      <td className="py-2.5 px-2">
        <span
          className="text-[10.5px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap"
          style={{ color: src.color, background: src.bg }}
        >
          {src.label}
        </span>
      </td>
      <td className="py-2.5 px-2 text-[12px] text-emerald-700 font-mono whitespace-nowrap">{fmtMinutes(r.activeMinutes)}</td>
      <td className="py-2.5 px-2 text-[12px] text-amber-700 font-mono whitespace-nowrap">{fmtMinutes(r.idleMinutes)}</td>
      <td className="py-2.5 pr-3 pl-2">
        <span
          className="text-[10.5px] font-semibold rounded-full px-2.5 py-1 whitespace-nowrap"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.label}
          {r.isLate ? " · Late" : ""}
        </span>
      </td>
    </tr>
  );
}

/**
 * Day-wise attendance history for a single employee — opened via the
 * "History" button on the Monthly tab of AttendanceDetailsModal.
 *
 * `useHistoryHook` is the role-specific hook (useGetAttendanceHistory from
 * suother.hook.js, or useGetEmployeeAttendanceHistory from
 * adminother.hook.js) so this stays shared between both dashboards.
 */
export default function AttendanceHistoryModal({ open, onClose, employeeId, employeeName, useHistoryHook, people, fetchHistory }) {
  const [preset, setPreset] = useState("this_month");
  const [range, setRange] = useState(() => presetRange("this_month"));
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportAllProgress, setExportAllProgress] = useState({ done: 0, total: 0 });

  const applyPreset = (key) => {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  };

  const { data, isLoading, isError } = useHistoryHook(
    employeeId,
    { startDate: range.startDate, endDate: range.endDate },
    { enabled: open && !!employeeId }
  );

  const allRows = data?.data ?? [];

  const rows = useMemo(() => {
    return allRows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      return true;
    });
  }, [allRows, statusFilter, sourceFilter]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.active += r.activeMinutes || 0;
        acc.idle += r.idleMinutes || 0;
        if (r.checkIn) acc.daysPresentish += 1;
        return acc;
      },
      { active: 0, idle: 0, daysPresentish: 0 }
    );
  }, [rows]);

  const exportCsv = () => {
    downloadCsv(
      `attendance-history-${(employeeName || employeeId || "employee").replace(/\s+/g, "_")}-${range.startDate}_to_${range.endDate}.csv`,
      [
        { key: "date", label: "Date", format: (r) => fmtDate(r.date) },
        { key: "checkIn", label: "Check-in", format: (r) => fmtTime(r.checkIn) },
        { key: "checkOut", label: "Check-out", format: (r) => fmtTime(r.checkOut) },
        { key: "source", label: "Via", format: (r) => (SOURCE_META[r.source] || SOURCE_META.system).label.replace(/^\S+\s/, "") },
        { key: "activeMinutes", label: "Active Minutes", format: (r) => Math.round(r.activeMinutes || 0) },
        { key: "idleMinutes", label: "Idle Minutes", format: (r) => Math.round(r.idleMinutes || 0) },
        { key: "status", label: "Status", format: (r) => (STATUS_META[r.status] || STATUS_META.absent).label },
        { key: "isLate", label: "Late", format: (r) => (r.isLate ? "Yes" : "No") },
        { key: "overtimeMinutes", label: "Overtime Minutes", format: (r) => Math.round(r.overtimeMinutes || 0) },
      ],
      rows
    );
  };

  // "Export All" beside the per-employee export — reuses the SAME date
  // range/preset currently picked here (7/15/30/this-month/custom), but
  // pulls every employee's full history for it instead of just this one.
  const exportAllUsersCsv = async () => {
    if (!people?.length || !fetchHistory || isExportingAll) return;
    setIsExportingAll(true);
    setExportAllProgress({ done: 0, total: people.length });

    const combined = [];
    const failedNames = [];

    await runWithConcurrency(people, CONCURRENCY, async (person) => {
      try {
        const res = await fetchHistory(person.id, { startDate: range.startDate, endDate: range.endDate });
        const dayRows = res?.data ?? [];
        dayRows.forEach((r) => {
          if (statusFilter !== "all" && r.status !== statusFilter) return;
          if (sourceFilter !== "all" && r.source !== sourceFilter) return;
          combined.push({ ...r, employeeName: person.name || "Unknown", empid: person.empid || "—" });
        });
      } catch {
        failedNames.push(person.name || person.empid || person.id);
      } finally {
        setExportAllProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    });

    downloadCsv(
      `attendance-history-all-employees-${range.startDate}_to_${range.endDate}.csv`,
      [
        { key: "employeeName", label: "Employee", format: (r) => r.employeeName },
        { key: "empid", label: "Emp ID", format: (r) => r.empid },
        { key: "date", label: "Date", format: (r) => fmtDate(r.date) },
        { key: "checkIn", label: "Check-in", format: (r) => fmtTime(r.checkIn) },
        { key: "checkOut", label: "Check-out", format: (r) => fmtTime(r.checkOut) },
        { key: "source", label: "Via", format: (r) => (SOURCE_META[r.source] || SOURCE_META.system).label.replace(/^\S+\s/, "") },
        { key: "activeMinutes", label: "Active Minutes", format: (r) => Math.round(r.activeMinutes || 0) },
        { key: "idleMinutes", label: "Idle Minutes", format: (r) => Math.round(r.idleMinutes || 0) },
        { key: "status", label: "Status", format: (r) => (STATUS_META[r.status] || STATUS_META.absent).label },
        { key: "isLate", label: "Late", format: (r) => (r.isLate ? "Yes" : "No") },
        { key: "overtimeMinutes", label: "Overtime Minutes", format: (r) => Math.round(r.overtimeMinutes || 0) },
      ],
      combined
    );

    setIsExportingAll(false);
    if (failedNames.length) {
      console.warn("Could not fetch attendance history for:", failedNames.join(", "));
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(20,10,15,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #730042 0%, #9B2554 100%)" }}
        >
          <div className="min-w-0">
            <h2 className="m-0 text-base sm:text-lg font-bold flex items-center gap-2 truncate">
              <FaClock size={15} /> Attendance History{employeeName ? ` — ${employeeName}` : ""}
            </h2>
            <p className="m-0 mt-0.5 text-[11px] sm:text-[12px] text-white/75">
              Day-wise check-in / check-out, source and active-idle time
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors"
          >
            <FaTimes size={13} />
          </button>
        </div>

        <div className="px-4 sm:px-6 pt-3.5 pb-3 flex items-center justify-between gap-3 flex-wrap border-b border-gray-100 flex-shrink-0">
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className="px-3 py-1.5 text-[11.5px] font-semibold rounded-lg transition-colors"
                style={
                  preset === p.key
                    ? { color: "#730042", background: "#fdf2f7", border: "1px solid #e8b8cf" }
                    : { color: "#9CA3AF", background: "#fff", border: "1px solid #e5e7eb" }
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={range.startDate}
                max={range.endDate}
                onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))}
                className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none"
              />
              <span className="text-[11px] text-gray-400">to</span>
              <input
                type="date"
                value={range.endDate}
                min={range.startDate}
                max={toInputDate(new Date())}
                onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
                className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none"
              />
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-2.5 flex items-center gap-2 flex-wrap border-b border-gray-100 flex-shrink-0 bg-gray-50/40">
          <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-gray-400 mr-0.5">
            <FaFilter size={9} /> Filters
          </span>
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} />
          <FilterSelect value={sourceFilter} onChange={setSourceFilter} options={SOURCE_FILTER_OPTIONS} />
          <button
            type="button"
            onClick={exportCsv}
            disabled={!rows.length}
            className="ml-auto flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: "#fff", background: "#730042" }}
          >
            <FaDownload size={10} /> Export CSV
          </button>
          {people?.length > 0 && fetchHistory && (
            <button
              type="button"
              onClick={exportAllUsersCsv}
              disabled={isExportingAll}
              title={`Export this same ${PRESETS.find((p) => p.key === preset)?.label || "range"} for every employee`}
              className="flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ color: "#730042", background: "#fdf2f7", border: "1px solid #e8b8cf" }}
            >
              <FaUsers size={10} />
              {isExportingAll
                ? `Exporting ${exportAllProgress.done}/${exportAllProgress.total}…`
                : `Export All (${PRESETS.find((p) => p.key === preset)?.label || "range"})`}
            </button>
          )}
        </div>

        <div className="px-4 sm:px-6 py-2.5 flex items-center gap-4 flex-wrap flex-shrink-0 bg-gray-50/60 border-b border-gray-100">
          <span className="text-[11.5px] text-gray-500">
            Active: <strong className="text-emerald-700">{fmtMinutes(totals.active)}</strong>
          </span>
          <span className="text-[11.5px] text-gray-500">
            Idle: <strong className="text-amber-700">{fmtMinutes(totals.idle)}</strong>
          </span>
          <span className="text-[11.5px] text-gray-500">
            Days with check-in: <strong className="text-gray-800">{totals.daysPresentish}</strong>
          </span>
        </div>

        <div className="overflow-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-gray-400">
              <span className="text-lg">⏳</span> Loading history…
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-red-500">
              ⚠ Could not load attendance history.
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <span className="text-3xl">📍</span>
              <p className="text-[13px] text-gray-400">
                {allRows.length ? "No records match your filters" : "No attendance records in this range"}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#f1f1f1]">
                <tr>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 pl-3 pr-2">Date</th>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Check-in</th>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Check-out</th>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Via</th>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Active</th>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 px-2">Idle</th>
                  <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 pr-3 pl-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <HistoryRow key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 sm:px-6 py-2.5 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/60">
          <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <FaCalendarAlt size={9} />
            {range.startDate} → {range.endDate}
          </span>
          <span className="text-[11px] text-gray-400">
            <FaMapMarkerAlt size={9} className="inline mr-1" />
            {rows.length} record{rows.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  );
}