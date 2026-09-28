import { useMemo, useState } from "react";
import { FaTimes, FaCalendarAlt, FaClock } from "react-icons/fa";
import { useGetAttendanceHistory } from "../../auth/server-state/adminother/adminother.hook";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_META = {
  present: { label: "Present", color: "#16A34A", bg: "#DCFCE7" },
  half_day: { label: "Half Day", color: "#B8760A", bg: "#FEF3C7" },
  absent: { label: "Absent", color: "#DC2626", bg: "#FEE2E2" },
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", weekday: "short",
      })
    : "—";

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

const fmtMinutes = (mins) => {
  const m = Math.round(mins || 0);
  if (!m) return "0m";
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
};

/**
 * "My Attendance" modal — opened from the Today banner on the admin
 * Dashboard. Shows the logged-in user's OWN attendance history (from
 * `admin/getattendance`), filterable by month/year.
 *
 * NOTE: this is NOT the team/organisation directory modal. That one lives in
 * Attendancedetailsmodal.jsx and needs the role-specific hook props.
 */
export default function AttendanceModal({ user, onClose }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isError } = useGetAttendanceHistory();

  const records = useMemo(
    () => (Array.isArray(data?.attendance) ? data.attendance : []),
    [data]
  );

  const yearOptions = useMemo(() => {
    const ys = new Set([now.getFullYear()]);
    records.forEach((r) => {
      const y = r?.date ? new Date(r.date).getFullYear() : null;
      if (y) ys.add(y);
    });
    return [...ys].sort((a, b) => b - a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  const rows = useMemo(
    () =>
      records
        .filter((r) => {
          if (!r?.date) return false;
          const d = new Date(r.date);
          return d.getMonth() === month && d.getFullYear() === year;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [records, month, year]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          if (r.status === "present") acc.present += 1;
          else if (r.status === "half_day") acc.half += 1;
          else if (r.status === "absent") acc.absent += 1;
          if (r.isLate) acc.late += 1;
          acc.active += r.activeMinutes || 0;
          return acc;
        },
        { present: 0, half: 0, absent: 0, late: 0, active: 0 }
      ),
    [rows]
  );

  const fullName = [user?.f_name, user?.l_name].filter(Boolean).join(" ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ede5e0]">
          <div>
            <h2 className="text-base font-semibold text-[#2a1a16] flex items-center gap-2">
              <FaCalendarAlt className="text-[#730042]" /> My Attendance
            </h2>
            {fullName && <p className="text-xs text-[#8a7a74] mt-0.5">{fullName}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f5eeea] text-[#730042]"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-[#f0e8e4]">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-[#ede5e0] rounded-lg px-2.5 py-1.5 text-sm bg-white"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-[#ede5e0] rounded-lg px-2.5 py-1.5 text-sm bg-white"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="ml-auto flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded-full" style={{ background: STATUS_META.present.bg, color: STATUS_META.present.color }}>
              Present {totals.present}
            </span>
            <span className="px-2 py-1 rounded-full" style={{ background: STATUS_META.half_day.bg, color: STATUS_META.half_day.color }}>
              Half Day {totals.half}
            </span>
            <span className="px-2 py-1 rounded-full" style={{ background: STATUS_META.absent.bg, color: STATUS_META.absent.color }}>
              Absent {totals.absent}
            </span>
            <span className="px-2 py-1 rounded-full bg-[#f5eeea] text-[#730042]">Late {totals.late}</span>
            <span className="px-2 py-1 rounded-full bg-[#f5eeea] text-[#730042] flex items-center gap-1">
              <FaClock /> {fmtMinutes(totals.active)}
            </span>
          </div>
        </div>

        <div className="overflow-auto flex-1">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-[#8a7a74]">Loading attendance…</p>
          ) : isError ? (
            <p className="p-8 text-center text-sm text-red-600">Couldn’t load your attendance. Please try again.</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#8a7a74]">
              No attendance records for {MONTH_NAMES[month]} {year}.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#fdfcfb] text-left text-xs text-[#8a7a74]">
                <tr>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Check-in</th>
                  <th className="px-3 py-2 font-medium">Check-out</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const meta = STATUS_META[r.status] || STATUS_META.absent;
                  return (
                    <tr key={r._id || `${r.date}-${i}`} className="border-t border-[#f5eeea]">
                      <td className="px-5 py-2 text-[#2a1a16]">{fmtDate(r.date)}</td>
                      <td className="px-3 py-2">
                        {fmtTime(r.checkIn)}
                        {r.isLate && <span className="ml-1 text-[10px] text-[#B8760A]">(late)</span>}
                      </td>
                      <td className="px-3 py-2">{fmtTime(r.checkOut)}</td>
                      <td className="px-3 py-2">{fmtMinutes(r.activeMinutes)}</td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}