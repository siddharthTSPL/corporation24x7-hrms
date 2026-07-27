import { useState, useEffect } from "react";
import { FaTimes, FaClock, FaCalendarAlt, FaDownload, FaUsers } from "react-icons/fa";
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

const STATUS_META = {
  present: { label: "Present", color: "#16A34A", bg: "#DCFCE7" },
  half_day: { label: "Half Day", color: "#B8760A", bg: "#FEF3C7" },
  absent: { label: "Absent", color: "#DC2626", bg: "#FEE2E2" },
};

const SOURCE_LABEL = {
  face: "Face",
  agent: "Agent",
  system: "System",
};

const PRESETS = [
  { key: "last_7", label: "Last 7 Days" },
  { key: "last_15", label: "Last 15 Days" },
  { key: "this_month", label: "This Month" },
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
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: toInputDate(start), endDate: toInputDate(now) };
}

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

/**
 * Bulk version of AttendanceHistoryModal — instead of pulling day-wise
 * history for one employee at a time, this fetches it for every employee
 * currently visible on the Monthly tab in one go (same 7/30/custom day
 * presets) and lets the admin export it all as a single CSV.
 */
export default function AttendanceBulkHistoryModal({ open, onClose, people, fetchHistory }) {
  const [preset, setPreset] = useState("this_month");
  const [range, setRange] = useState(() => presetRange("this_month"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [rows, setRows] = useState(null);
  const [perEmployee, setPerEmployee] = useState([]);
  const [failed, setFailed] = useState([]);

  const applyPreset = (key) => {
    setPreset(key);
    if (key !== "custom") {
      const r = presetRange(key);
      setRange(r);
      generate(r);
    } else {
      setRows(null);
      setPerEmployee([]);
      setFailed([]);
    }
  };

  const generate = async (rangeOverride) => {
    const useRange = rangeOverride || range;
    if (!people?.length || !fetchHistory || isGenerating) return;
    setIsGenerating(true);
    setRows(null);
    setPerEmployee([]);
    setFailed([]);
    setProgress({ done: 0, total: people.length });

    const failedNames = [];
    const summaries = [];
    const combined = [];

    await runWithConcurrency(people, CONCURRENCY, async (person) => {
      try {
        const res = await fetchHistory(person.id, { startDate: useRange.startDate, endDate: useRange.endDate });
        const dayRows = res?.data ?? [];
        let active = 0, idle = 0, present = 0;
        dayRows.forEach((r) => {
          active += r.activeMinutes || 0;
          idle += r.idleMinutes || 0;
          if (r.checkIn) present += 1;
          combined.push({
            employeeName: person.name || "Unknown",
            empid: person.empid || "—",
            date: fmtDate(r.date),
            checkIn: fmtTime(r.checkIn),
            checkOut: fmtTime(r.checkOut),
            via: SOURCE_LABEL[r.source] || "System",
            activeMinutes: Math.round(r.activeMinutes || 0),
            idleMinutes: Math.round(r.idleMinutes || 0),
            status: (STATUS_META[r.status] || STATUS_META.absent).label,
            isLate: r.isLate ? "Yes" : "No",
            overtimeMinutes: Math.round(r.overtimeMinutes || 0),
          });
        });
        summaries.push({ id: person.id, name: person.name, empid: person.empid, records: dayRows.length, active, idle, present });
      } catch {
        failedNames.push(person.name || person.empid || person.id);
      } finally {
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    });

    setRows(combined);
    setPerEmployee(summaries.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    setFailed(failedNames);
    setIsGenerating(false);
  };

  useEffect(() => {
    if (open && people?.length && fetchHistory) {
      generate(range);
    }
    // Auto-generate once when the modal opens, same as the individual
    // history modal fetching as soon as it's opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const exportCsv = () => {
    if (!rows?.length) return;
    downloadCsv(
      `attendance-history-all-${range.startDate}_to_${range.endDate}.csv`,
      [
        { key: "employeeName", label: "Employee" },
        { key: "empid", label: "Emp ID" },
        { key: "date", label: "Date" },
        { key: "checkIn", label: "Check-in" },
        { key: "checkOut", label: "Check-out" },
        { key: "via", label: "Via" },
        { key: "activeMinutes", label: "Active Minutes" },
        { key: "idleMinutes", label: "Idle Minutes" },
        { key: "status", label: "Status" },
        { key: "isLate", label: "Late" },
        { key: "overtimeMinutes", label: "Overtime Minutes" },
      ],
      rows
    );
  };

  if (!open) return null;

  const total = people?.length || 0;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(20,10,15,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3 text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #730042 0%, #9B2554 100%)" }}
        >
          <div className="min-w-0">
            <h2 className="m-0 text-base sm:text-lg font-bold flex items-center gap-2">
              <FaUsers size={15} /> Bulk Attendance History
            </h2>
            <p className="m-0 mt-0.5 text-[11px] sm:text-[12px] text-white/75">
              Generate day-wise history for all {total} listed employee{total === 1 ? "" : "s"} at once
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
                disabled={isGenerating}
                className="px-3 py-1.5 text-[11.5px] font-semibold rounded-lg transition-colors disabled:opacity-50"
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
                disabled={isGenerating}
                onChange={(e) => {
                  const r = { ...range, startDate: e.target.value };
                  setRange(r);
                  if (r.startDate && r.endDate && r.startDate <= r.endDate) generate(r);
                }}
                className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none"
              />
              <span className="text-[11px] text-gray-400">to</span>
              <input
                type="date"
                value={range.endDate}
                min={range.startDate}
                max={toInputDate(new Date())}
                disabled={isGenerating}
                onChange={(e) => {
                  const r = { ...range, endDate: e.target.value };
                  setRange(r);
                  if (r.startDate && r.endDate && r.startDate <= r.endDate) generate(r);
                }}
                className="text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none"
              />
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap border-b border-gray-100 flex-shrink-0 bg-gray-50/40">
          <button
            type="button"
            onClick={() => generate()}
            disabled={isGenerating || !total}
            className="flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: "#fff", background: "#730042" }}
          >
            <FaClock size={10} /> {isGenerating ? `Generating ${progress.done}/${progress.total}…` : "Refresh"}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!rows?.length}
            className="flex items-center gap-1.5 text-[12px] font-semibold rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: "#730042", background: "#fdf2f7", border: "1px solid #e8b8cf" }}
          >
            <FaDownload size={10} /> Export CSV
          </button>
          {!total && (
            <span className="text-[11.5px] text-gray-400">No employees in the current list to generate for.</span>
          )}
        </div>

        <div className="overflow-auto flex-1">
          {isGenerating && !rows && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-[13px] text-gray-400">
              <span className="text-lg">⏳</span>
              Fetching history for {progress.done}/{progress.total} employees…
            </div>
          )}

          {!isGenerating && rows === null && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="text-3xl">📋</span>
              <p className="text-[13px] text-gray-400">
                Pick a date range above — everyone's day-wise history is generated automatically.
              </p>
            </div>
          )}

          {!isGenerating && rows !== null && (
            <div className="px-4 sm:px-6 py-4 flex flex-col gap-3">
              <p className="m-0 text-[11.5px] text-gray-500">
                {rows.length} record{rows.length === 1 ? "" : "s"} across {perEmployee.length} employee{perEmployee.length === 1 ? "" : "s"}
                {failed.length ? `, ${failed.length} failed` : ""} — {range.startDate} → {range.endDate}
              </p>

              {failed.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11.5px] text-red-600">
                  Could not fetch history for: {failed.join(", ")}
                </div>
              )}

              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2 pr-2">Employee</th>
                    <th className="text-center text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2 px-2">Records</th>
                    <th className="text-center text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2 px-2">Days Present</th>
                    <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2 px-2">Active</th>
                    <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2 pl-2">Idle</th>
                  </tr>
                </thead>
                <tbody>
                  {perEmployee.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2 text-[12px] text-gray-800 font-medium">{e.name} <span className="text-gray-400 font-normal">({e.empid})</span></td>
                      <td className="py-2 px-2 text-[12px] text-gray-600 text-center">{e.records}</td>
                      <td className="py-2 px-2 text-[12px] text-gray-600 text-center">{e.present}</td>
                      <td className="py-2 px-2 text-[12px] text-emerald-700 font-mono">{fmtMinutes(e.active)}</td>
                      <td className="py-2 pl-2 text-[12px] text-amber-700 font-mono">{fmtMinutes(e.idle)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-2.5 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/60">
          <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <FaCalendarAlt size={9} />
            {range.startDate} → {range.endDate}
          </span>
        </div>
      </div>
    </div>
  );
}