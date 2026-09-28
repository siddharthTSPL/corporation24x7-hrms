import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaTimes, FaCalendarAlt, FaClock, FaSignInAlt, FaSignOutAlt, FaHistory } from "react-icons/fa";
import { useGetAttendanceHistory } from "../../auth/server-state/adminother/adminother.hook";
import { useTodayAttendance } from "../../auth/server-state/attendance/attendance.hook";
import { useAttendanceTracker } from "../attendance/useattendanctracker";
import SelfieCapture from "../attendance/selfietracker";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_META = {
  present: { label: "Present", color: "#16A34A", bg: "#DCFCE7" },
  half_day: { label: "Half Day", color: "#B8760A", bg: "#FEF3C7" },
  absent: { label: "Absent", color: "#DC2626", bg: "#FEE2E2" },
};

// Same GPS rules as pages/attendance/attendancepage.jsx
const GOOD_ACCURACY_M = 50;
const MAX_ACCEPTABLE_ACCURACY_M = 1500;
const LOCATION_WINDOW_MS = 30_000;
const GEOLOCATION_TIMEOUT_MS = 35_000;

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

/* ───────────────────────── Check In / Check Out tab ───────────────────────── */
function CheckInOutTab({ onDone }) {
  const { data: todayData, isLoading: todayLoading } = useTodayAttendance();
  const tracker = useAttendanceTracker();
  const {
    isCheckedIn, checkInTime, activeMinutes, idleMinutes, activityStatus, elapsedTime,
    showStillWorking, isLoading, error,
    handleCheckin, handleCheckout, confirmStillWorking, clearError,
  } = tracker;

  const [showSelfie, setShowSelfie] = useState(false);
  const [acquiringLocation, setAcquiringLocation] = useState(false);
  const [bestAccuracy, setBestAccuracy] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [checkoutConfirm, setCheckoutConfirm] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);

  const pendingLocationRef = useRef(null);
  const watchIdRef = useRef(null);
  const timeoutRef = useRef(null);

  const stopLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    clearTimeout(timeoutRef.current);
  }, []);

  // Don't leave a GPS watch running if the modal is closed mid-lookup.
  useEffect(() => stopLocationWatch, [stopLocationWatch]);

  const startCheckin = useCallback(() => {
    setLocationError("");
    setBestAccuracy(null);
    clearError();
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }
    setAcquiringLocation(true);

    let best = null;
    let settled = false;

    const accept = (fix) => {
      if (settled) return;
      settled = true;
      stopLocationWatch();
      setAcquiringLocation(false);
      pendingLocationRef.current = fix;
      setShowSelfie(true);
    };

    const reject = (message) => {
      if (settled) return;
      settled = true;
      stopLocationWatch();
      setAcquiringLocation(false);
      setLocationError(message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (!best || accuracy < best.accuracy) {
          best = { latitude, longitude, accuracy };
          setBestAccuracy(Math.round(accuracy));
        }
        if (accuracy <= GOOD_ACCURACY_M) accept(best);
      },
      (err) => {
        if (err.code === 1) reject("Location permission denied. Please allow location access and try again.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: GEOLOCATION_TIMEOUT_MS }
    );

    timeoutRef.current = setTimeout(() => {
      if (settled) return;
      if (best && best.accuracy <= MAX_ACCEPTABLE_ACCURACY_M) {
        accept(best);
      } else {
        reject(
          best
            ? `Location isn't accurate enough (±${Math.round(best.accuracy)}m). Turn on precise/GPS location and disable any VPN, then try again.`
            : "Couldn't get a GPS fix. Make sure precise/GPS location is on and you're not under a VPN, then try again."
        );
      }
    }, LOCATION_WINDOW_MS);
  }, [clearError, stopLocationWatch]);

  // SelfieCapture calls onCapture from an effect keyed on this callback, so it must stay stable.
  const onSelfieCapture = useCallback(async (base64) => {
    setShowSelfie(false);
    const loc = pendingLocationRef.current ?? { latitude: 0, longitude: 0 };
    try { await handleCheckin({ ...loc, selfie: base64 }); } catch { /* error shown via tracker.error */ }
    pendingLocationRef.current = null;
  }, [handleCheckin]);

  const onSelfieCancel = useCallback(async () => {
    setShowSelfie(false);
    const loc = pendingLocationRef.current ?? { latitude: 0, longitude: 0 };
    try { await handleCheckin({ ...loc, selfie: null }); } catch { /* error shown via tracker.error */ }
    pendingLocationRef.current = null;
  }, [handleCheckin]);

  const doCheckout = useCallback(async () => {
    setCheckoutConfirm(false);
    try {
      const r = await handleCheckout();
      setCheckoutResult(r);
      onDone?.();
    } catch { /* error shown via tracker.error */ }
  }, [handleCheckout, onDone]);

  if (todayLoading) {
    return <p className="p-8 text-center text-sm text-[#8a7a74]">Checking today's status…</p>;
  }

  const att = todayData?.attendance;
  const isFaceSession = att?.source === "face" && !todayData?.isCheckedOut;

  const Banner = (
    <>
      {(error || locationError) && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          ⚠ {error || locationError}
        </div>
      )}
      {showStillWorking && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center justify-between gap-2">
          <span>Are you still working?</span>
          <button onClick={confirmStillWorking} className="px-2.5 py-1 rounded-md bg-amber-600 text-white font-semibold">
            Yes, I'm here
          </button>
        </div>
      )}
    </>
  );

  let body;
  if (checkoutResult || (todayData?.isCheckedOut && !isCheckedIn)) {
    const r = checkoutResult ?? att ?? {};
    const meta = STATUS_META[r.status] || STATUS_META.absent;
    body = (
      <div className="text-center">
        <div className="text-4xl mb-2">🏁</div>
        <h3 className="text-base font-bold text-[#2a1a16]">Today's session is complete</h3>
        <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          {[
            ["Check-in", fmtTime(att?.checkIn ?? checkInTime)],
            ["Check-out", fmtTime(att?.checkOut) !== "—" ? fmtTime(att?.checkOut) : fmtTime(new Date())],
            ["Active", fmtMinutes(r.activeMinutes ?? att?.activeMinutes)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-[#fdfcfb] border border-[#f0e8e4] p-3">
              <div className="text-sm font-bold text-[#730042]">{v}</div>
              <div className="text-[11px] text-[#8a7a74] mt-0.5">{k}</div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (isFaceSession && !isCheckedIn) {
    body = (
      <div className="text-center">
        <div className="text-4xl mb-2">🤳</div>
        <h3 className="text-base font-bold text-[#2a1a16]">Checked in via Face Attendance</h3>
        <p className="text-xs text-[#8a7a74] mt-1.5">
          You checked in at {fmtTime(att?.checkIn)}. Please use the Face Kiosk to check out as well.
        </p>
      </div>
    );
  } else if (isCheckedIn) {
    const isActive = activityStatus === "active";
    body = (
      <div>
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-wide text-[#8a7a74]">Time on shift</div>
          <div className="text-3xl font-bold text-[#730042] font-mono mt-1">{elapsedTime}</div>
          <div className="text-xs text-[#8a7a74] mt-1">
            Checked in at <strong className="text-[#2a1a16]">{fmtTime(checkInTime)}</strong>
            <span className="ml-2 inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: isActive ? "#16A34A" : "#9CA3AF" }} />
              {isActive ? "Active" : "Idle"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4 text-center">
          <div className="rounded-xl bg-[#DCFCE7] p-3">
            <div className="text-sm font-bold text-[#16A34A]">{fmtMinutes(activeMinutes)}</div>
            <div className="text-[11px] text-[#8a7a74]">Active</div>
          </div>
          <div className="rounded-xl bg-gray-100 p-3">
            <div className="text-sm font-bold text-gray-500">{fmtMinutes(idleMinutes)}</div>
            <div className="text-[11px] text-[#8a7a74]">Idle</div>
          </div>
        </div>
        <div className="mt-5">
          {!checkoutConfirm ? (
            <button
              onClick={() => setCheckoutConfirm(true)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#DC2626] text-white text-sm font-semibold disabled:opacity-60"
            >
              <FaSignOutAlt /> Check Out
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
              <p className="text-sm text-[#2a1a16] mb-2">End today's session and check out?</p>
              <div className="flex gap-2">
                <button onClick={() => setCheckoutConfirm(false)} className="flex-1 py-2 rounded-lg border border-[#ede5e0] bg-white text-sm">
                  Cancel
                </button>
                <button onClick={doCheckout} disabled={isLoading} className="flex-1 py-2 rounded-lg bg-[#DC2626] text-white text-sm font-semibold disabled:opacity-60">
                  {isLoading ? "Checking out…" : "Yes, Check Out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="text-center">
        <div className="text-4xl mb-2">📍</div>
        <h3 className="text-base font-bold text-[#2a1a16]">Ready to start your day?</h3>
        <p className="text-xs text-[#8a7a74] mt-1.5">
          We'll capture your location and a quick selfie to record your check-in.
        </p>
        <button
          onClick={startCheckin}
          disabled={isLoading || acquiringLocation}
          className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#730042] text-white text-sm font-semibold disabled:opacity-60"
        >
          <FaSignInAlt />
          {acquiringLocation
            ? `Getting location…${bestAccuracy ? ` (±${bestAccuracy}m)` : ""}`
            : isLoading
              ? "Checking in…"
              : "Check In"}
        </button>
      </div>
    );
  }

  return (
    <div className="p-5">
      {Banner}
      {body}
      {showSelfie && <SelfieCapture onCapture={onSelfieCapture} onCancel={onSelfieCancel} />}
    </div>
  );
}

/* ───────────────────────────── History tab ───────────────────────────── */
function HistoryTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isError } = useGetAttendanceHistory();

  const records = useMemo(
    () => (Array.isArray(data?.attendance) ? data.attendance : []),
    [data]
  );

  const yearOptions = useMemo(() => {
    const ys = new Set([new Date().getFullYear()]);
    records.forEach((r) => {
      const y = r?.date ? new Date(r.date).getFullYear() : null;
      if (y) ys.add(y);
    });
    return [...ys].sort((a, b) => b - a);
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

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-[#f0e8e4]">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-[#ede5e0] rounded-lg px-2.5 py-1.5 text-sm bg-white">
          {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}
          className="border border-[#ede5e0] rounded-lg px-2.5 py-1.5 text-sm bg-white">
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-full" style={{ background: STATUS_META.present.bg, color: STATUS_META.present.color }}>Present {totals.present}</span>
          <span className="px-2 py-1 rounded-full" style={{ background: STATUS_META.half_day.bg, color: STATUS_META.half_day.color }}>Half Day {totals.half}</span>
          <span className="px-2 py-1 rounded-full" style={{ background: STATUS_META.absent.bg, color: STATUS_META.absent.color }}>Absent {totals.absent}</span>
          <span className="px-2 py-1 rounded-full bg-[#f5eeea] text-[#730042]">Late {totals.late}</span>
          <span className="px-2 py-1 rounded-full bg-[#f5eeea] text-[#730042] flex items-center gap-1"><FaClock /> {fmtMinutes(totals.active)}</span>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-[#8a7a74]">Loading attendance…</p>
        ) : isError ? (
          <p className="p-8 text-center text-sm text-red-600">Couldn’t load your attendance. Please try again.</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#8a7a74]">No attendance records for {MONTH_NAMES[month]} {year}.</p>
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs" style={{ background: meta.bg, color: meta.color }}>
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
    </>
  );
}

/**
 * "My Attendance" modal — opened from the Check In / Check Out button on the
 * admin Dashboard's Today banner.
 *   • "Check In / Out" tab: GPS + selfie check-in, live timer, check-out
 *     (same flow as /mark-attendance, via useAttendanceTracker).
 *   • "History" tab: the logged-in user's own attendance by month.
 *
 * NOT the team directory modal — that is Attendancedetailsmodal.jsx.
 */
export default function AttendanceModal({ user, onClose }) {
  const [tab, setTab] = useState("checkin");
  const fullName = [user?.f_name, user?.l_name].filter(Boolean).join(" ");

  const tabBtn = (key, icon, label) => (
    <button
      onClick={() => setTab(key)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
        tab === key ? "border-[#730042] text-[#730042]" : "border-transparent text-[#8a7a74] hover:text-[#2a1a16]"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
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
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f5eeea] text-[#730042]">
            <FaTimes />
          </button>
        </div>

        <div className="flex border-b border-[#f0e8e4]">
          {tabBtn("checkin", <FaSignInAlt />, "Check In / Out")}
          {tabBtn("history", <FaHistory />, "History")}
        </div>

        {/* Keep the check-in tab mounted so an in-progress GPS/selfie flow isn't lost on tab switch. */}
        <div className={tab === "checkin" ? "overflow-auto" : "hidden"}>
          <CheckInOutTab />
        </div>
        {tab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}