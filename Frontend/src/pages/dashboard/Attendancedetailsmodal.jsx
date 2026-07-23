import { useMemo, useState } from "react";
import {
  FaTimes, FaSearch, FaMapMarkerAlt, FaIdCard, FaEnvelope,
  FaUserTie, FaBuilding, FaCalendarAlt, FaClock,
} from "react-icons/fa";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ROLE_COLOR = {
  admin: "#4a0029",
  manager: "#730042",
  employee: "#a0005c",
};

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

function MonthlyRow({ p }) {
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
      <td className="py-2.5 pr-3 pl-2">
        <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: pctColor }}>
          {pct}%
        </span>
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
export default function AttendanceDetailsModal({ open, onClose, useOverviewHook }) {
  const [tab, setTab] = useState("today");
  const [search, setSearch] = useState("");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.empid?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.office_location?.toLowerCase().includes(q) ||
        p.reportingManager?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (!open) return null;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(20,10,15,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden"
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
            <div className="relative">
              <FaSearch size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, empid, email…"
                className="text-[12px] border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 outline-none w-[190px] focus:border-[#c499b4]"
              />
            </div>
          </div>
        </div>

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
            <EmptyState text={search ? "No matches for your search" : "No team members found"} />
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
                      <th className="text-left text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold py-2.5 pr-3 pl-2">Attendance %</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) =>
                  tab === "today" ? <TodayRow key={p.id} p={p} /> : <MonthlyRow key={p.id} p={p} />
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
  );
}