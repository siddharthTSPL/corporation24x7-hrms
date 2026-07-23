import { useMemo, useState } from "react";
import { FaTimes, FaClock, FaCalendarAlt, FaMapMarkerAlt } from "react-icons/fa";

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
  { key: "this_month", label: "This Month" },
  { key: "last_7", label: "Last 7 Days" },
  { key: "last_30", label: "Last 30 Days" },
  { key: "custom", label: "Custom" },
];

function presetRange(key) {
  const now = new Date();
  if (key === "last_7") {
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
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
export default function AttendanceHistoryModal({ open, onClose, employeeId, employeeName, useHistoryHook }) {
  const [preset, setPreset] = useState("this_month");
  const [range, setRange] = useState(() => presetRange("this_month"));

  const applyPreset = (key) => {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  };

  const { data, isLoading, isError } = useHistoryHook(
    employeeId,
    { startDate: range.startDate, endDate: range.endDate },
    { enabled: open && !!employeeId }
  );

  const rows = data?.data ?? [];

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
              <p className="text-[13px] text-gray-400">No attendance records in this range</p>
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