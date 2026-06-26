import { useState, useCallback, useEffect } from "react";
import { useAttendanceTracker } from "../attendance/useattendanctracker";
import { useTodayAttendance } from "../../auth/server-state/attendance/attendance.hook";
import SelfieCapture from "../attendance/selfietracker";

const formatTime = (date) =>
  date ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";

function ArcGauge({ percent, color }) {
  const size = 160, sw = 12, r = (size - sw) / 2, circ = 2 * Math.PI * r, cx = size / 2;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={circ - (circ * percent) / 100}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 sm:px-8 py-4 sm:py-5 text-center">
      <p className="m-0 text-3xl sm:text-5xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="mt-1 text-[10px] sm:text-[11px] uppercase tracking-widest text-gray-400">
        {time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
      </p>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accentColor }) {
  return (
    <div className="bg-white border rounded-2xl p-2.5 sm:p-3 flex flex-col gap-1.5 sm:gap-2" style={{ borderColor: accentColor + "40" }}>
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs sm:text-sm" style={{ background: accentColor + "15", color: accentColor }}>
        {icon}
      </div>
      <div>
        <p className="m-0 font-bold text-xs sm:text-sm text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
        <p className="mt-0.5 text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
        {sub && <p className="mt-0.5 text-[9px] sm:text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function SessionItem({ label, value, accentColor }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2 sm:p-2.5 border border-gray-100">
      <p className="m-0 text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-[11px] sm:text-[12px] font-semibold truncate" style={{ color: accentColor ?? "#111827", fontFamily: "'JetBrains Mono', monospace" }}>
        {value || "—"}
      </p>
    </div>
  );
}

function AlreadyDoneScreen({ attendance, onClose }) {
  const statusColor =
    attendance?.status === "present"  ? "#16A34A" :
    attendance?.status === "half_day" ? "#D97706" : "#DC2626";
  const statusLabel =
    attendance?.status === "present"  ? "Present ✓" :
    attendance?.status === "half_day" ? "Half Day" : "Absent";

  const active  = attendance?.activeMinutes ?? 0;
  const idle    = attendance?.idleMinutes   ?? 0;
  const total   = active + idle;
  const pct     = total > 0 ? Math.round((active / total) * 100) : 0;
  const activeH = Math.floor(active / 60);
  const activeM = active % 60;
  const activeStr = activeH > 0 ? `${activeH}h ${activeM}m` : `${activeM}m`;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-3 sm:gap-4 shadow-sm text-center">
      <div className="text-4xl sm:text-5xl">✅</div>
      <div>
        <h2 className="m-0 text-lg sm:text-xl font-bold text-gray-900">Attendance Complete</h2>
        <p className="mt-1.5 text-xs sm:text-[13px] text-gray-500">Your attendance has been recorded for today.</p>
      </div>
      {attendance?.status && (
        <span className="text-xs sm:text-sm font-bold rounded-full px-4 sm:px-6 py-1.5 sm:py-2 border" style={{ background: statusColor + "18", color: statusColor, borderColor: statusColor + "30" }}>
          {statusLabel}
        </span>
      )}
      {attendance && (
        <>
          <div className="flex gap-2 sm:gap-2.5 justify-center flex-wrap w-full">
            <div className="flex items-center gap-2 sm:gap-2.5 bg-green-50 border border-green-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5">
              <span>🟢</span>
              <div className="text-left">
                <p className="m-0 text-xs sm:text-sm font-bold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(attendance.checkIn)}</p>
                <p className="mt-0.5 text-[9px] sm:text-[10px] text-gray-400">Check-in</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5">
              <span>🔴</span>
              <div className="text-left">
                <p className="m-0 text-xs sm:text-sm font-bold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(attendance.checkOut)}</p>
                <p className="mt-0.5 text-[9px] sm:text-[10px] text-gray-400">Check-out</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
            {[
              { label: "Active", value: activeStr, color: "#16A34A" },
              { label: "Idle",   value: `${idle}m`, color: "#9CA3AF" },
              { label: "Score",  value: `${pct}%`,  color: statusColor },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 sm:p-3 text-center">
                <p className="m-0 text-base sm:text-lg font-bold" style={{ color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
                <p className="mt-1 text-[10px] sm:text-[11px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
      <button
        onClick={onClose}
        className="w-full bg-gray-50 text-gray-600 border border-gray-200 rounded-2xl py-3 font-semibold text-sm cursor-pointer hover:bg-gray-100 transition-colors"
      >
        Close
      </button>
    </div>
  );
}

export default function AttendanceModal({ user, roleMeta, onClose }) {
  const { data: todayData } = useTodayAttendance();
  const tracker = useAttendanceTracker();
  const {
    isCheckedIn, checkInTime,
    activeMinutes, idleMinutes, totalMinutes, activePercent, productivityStatus,
    activityStatus, elapsedTime,
    showStillWorking, lastPingResult,
    isLoading, error,
    handleCheckin, handleCheckout, confirmStillWorking, clearError,
  } = tracker;

  const [showSelfie,      setShowSelfie]      = useState(false);
  const [checkoutConfirm, setCheckoutConfirm] = useState(false);
  const [checkoutResult,  setCheckoutResult]  = useState(null);
  const [locationError,   setLocationError]   = useState("");

  const startCheckin = useCallback(() => {
    setLocationError("");
    clearError();
    if (!navigator.geolocation) { setLocationError("Geolocation not supported."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window._pendingLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setShowSelfie(true);
      },
      (err) => setLocationError(err.code === 1 ? "Location permission denied." : "Could not get location."),
      { timeout: 10_000, maximumAge: 60_000 }
    );
  }, [clearError]);

  const onSelfieCapture = useCallback(async (base64) => {
    setShowSelfie(false);
    const loc = window._pendingLocation ?? { latitude: 0, longitude: 0 };
    try { await handleCheckin({ ...loc, selfie: base64 }); } catch (_) {}
    delete window._pendingLocation;
  }, [handleCheckin]);

  const onSelfieCancel = useCallback(async () => {
    setShowSelfie(false);
    const loc = window._pendingLocation ?? { latitude: 0, longitude: 0 };
    try { await handleCheckin({ ...loc, selfie: null }); } catch (_) {}
    delete window._pendingLocation;
  }, [handleCheckin]);

  const doCheckout = useCallback(async () => {
    setCheckoutConfirm(false);
    try { const r = await handleCheckout(); setCheckoutResult(r); } catch (_) {}
  }, [handleCheckout]);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const prodColor = productivityStatus === "High" ? "#16A34A" : productivityStatus === "Medium" ? "#D97706" : "#DC2626";
  const actColor  = activityStatus === "active" ? "#16A34A" : "#9CA3AF";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        className="bg-[#f9f8f2] w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col my-2 sm:my-0 max-h-[95vh]"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-[#ede5e0] flex-shrink-0">
          <div className="flex items-baseline gap-0">
            <span className="text-[18px] sm:text-[20px] font-bold text-gray-900 tracking-tight">Torch</span>
            <span className="text-[18px] sm:text-[20px] font-extrabold text-[#730042] tracking-tight">X</span>
            <span className="text-[8px] sm:text-[9px] font-semibold text-gray-400 tracking-[2px] sm:tracking-[3px] ml-1.5 self-end pb-0.5">ATTENDANCE</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white border border-[#ede5e0] text-gray-500 rounded-lg flex items-center justify-center cursor-pointer text-sm hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 sm:px-5 py-4 sm:py-5 flex flex-col gap-3 sm:gap-4">

          {checkoutResult ? (
            (() => {
              const sc = checkoutResult.status === "present" ? "#16A34A" : checkoutResult.status === "half_day" ? "#D97706" : "#DC2626";
              const sl = checkoutResult.status === "present" ? "Present ✓" : checkoutResult.status === "half_day" ? "Half Day" : "Absent";
              const am = checkoutResult.activeMinutes ?? 0;
              const im = checkoutResult.idleMinutes ?? 0;
              const score = am + im > 0 ? Math.round((am / (am + im)) * 100) : 0;
              return (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-3 sm:gap-4 shadow-sm text-center">
                  <div className="text-4xl sm:text-5xl">🏁</div>
                  <h2 className="m-0 text-lg sm:text-xl font-bold text-gray-900">Session Complete</h2>
                  <p className="m-0 text-xs sm:text-sm text-gray-500">{today}</p>
                  <span className="text-xs sm:text-sm font-bold rounded-full px-4 sm:px-6 py-1.5 sm:py-2 border" style={{ background: sc + "18", color: sc, borderColor: sc + "30" }}>{sl}</span>
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
                    {[
                      { label: "Active", value: `${am}m`, color: "#16A34A" },
                      { label: "Idle",   value: `${im}m`, color: "#9CA3AF" },
                      { label: "Score",  value: `${score}%`, color: sc },
                    ].map((s) => (
                      <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 sm:p-3 text-center">
                        <p className="m-0 text-base sm:text-lg font-bold" style={{ color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
                        <p className="mt-1 text-[10px] sm:text-[11px] text-gray-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full bg-gray-50 text-gray-600 border border-gray-200 rounded-2xl py-3 font-semibold text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    Close
                  </button>
                </div>
              );
            })()
          ) : todayData?.isCheckedOut && !isCheckedIn ? (
            <AlreadyDoneScreen attendance={todayData?.attendance} onClose={onClose} />
          ) : (
            <>
              {(error || locationError) && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-red-600 text-xs sm:text-[13px] flex justify-between items-center gap-2">
                  <span>⚠ {error || locationError}</span>
                  <button className="bg-transparent border-none text-red-600 cursor-pointer text-base p-0 flex-shrink-0" onClick={() => { clearError(); setLocationError(""); }}>✕</button>
                </div>
              )}

              {showStillWorking && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-amber-800 text-xs sm:text-[13px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
                  <span>💤 You've been idle for a while. Still working?</span>
                  <button className="bg-[#730042] text-white border-none rounded-lg px-3 py-1.5 font-bold text-[12px] cursor-pointer whitespace-nowrap w-full sm:w-auto" onClick={confirmStillWorking}>
                    Yes, I'm Here
                  </button>
                </div>
              )}

              {!isCheckedIn && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 shadow-sm">
                  <LiveClock />
                  <div className="flex gap-1.5 sm:gap-2 justify-center flex-wrap">
                    {["📍 Location", "📸 Selfie", "⏱ Activity tracking"].map((item) => (
                      <span key={item} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-gray-500">{item}</span>
                    ))}
                  </div>
                  <p className="m-0 text-[11px] sm:text-[12px] text-gray-400 text-center leading-relaxed">
                    Attendance is tracked via browser activity, tab focus, and mouse/keyboard events. Activity syncs every 60 seconds automatically.
                  </p>
                  <button
                    onClick={startCheckin}
                    disabled={isLoading}
                    className="w-full text-white border-none rounded-2xl py-3.5 sm:py-4 font-bold text-sm sm:text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:translate-y-0"
                    style={{ background: "linear-gradient(135deg, #730042 0%, #9B2554 100%)", boxShadow: "0 4px 18px rgba(115,0,66,0.28)" }}
                  >
                    {isLoading ? "Checking in…" : "🟢 Check In"}
                  </button>
                </div>
              )}

              {isCheckedIn && (
                <>
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-2.5 sm:gap-3 shadow-sm">
                    <div className="relative w-[150px] h-[150px] sm:w-[160px] sm:h-[160px] flex items-center justify-center">
                      <ArcGauge percent={activePercent} color={prodColor} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <p className="m-0 text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{elapsedTime}</p>
                        <p className="mt-1 text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400">Session Time</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-[12px] sm:text-[13px] font-semibold border flex-wrap justify-center"
                      style={{ background: actColor + "15", color: actColor, borderColor: actColor + "30" }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: actColor }} />
                      {activityStatus === "active" ? "Active" : "Idle"}
                      {lastPingResult && (
                        <span className="text-gray-400 font-normal text-[10px] sm:text-[11px]">· last sync {formatTime(lastPingResult.time)}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    <StatCard icon="⚡" label="Active"       value={`${activeMinutes}m`} sub={`${activePercent}%`}       accentColor="#16A34A" />
                    <StatCard icon="💤" label="Idle"         value={`${idleMinutes}m`}   sub={`${100-activePercent}%`}   accentColor="#9CA3AF" />
                    <StatCard icon="🏆" label="Productivity" value={productivityStatus}  sub={`${totalMinutes}m total`}  accentColor={prodColor} />
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3 shadow-sm">
                    <p className="m-0 text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Session Details</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <SessionItem label="Checked in"  value={formatTime(checkInTime)}  accentColor="#16A34A" />
                      <SessionItem label="Active time" value={`${activeMinutes} min`}   accentColor="#16A34A" />
                      <SessionItem label="Idle time"   value={`${idleMinutes} min`}     accentColor="#9CA3AF" />
                      <SessionItem label="Department"  value={user?.department} />
                      <SessionItem label="Location"    value={user?.office_location} />
                      <SessionItem label="Designation" value={user?.designation} />
                    </div>
                    <div className="h-px bg-gray-100" />
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
                      <span className="text-[10px] sm:text-[11px] text-gray-400 leading-relaxed">Browser activity tracking · Tab focus monitored · Syncing every 60s</span>
                    </div>
                  </div>

                  {!checkoutConfirm ? (
                    <button
                      onClick={() => setCheckoutConfirm(true)}
                      disabled={isLoading}
                      className="w-full bg-white text-red-600 border border-red-200 rounded-2xl py-3.5 sm:py-4 font-bold text-sm sm:text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:bg-red-50 transition-colors"
                    >
                      🔴 Check Out
                    </button>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3 shadow-sm">
                      <p className="m-0 text-sm sm:text-[15px] font-semibold text-gray-700 text-center">Confirm check out?</p>
                      <p className="m-0 text-[11px] sm:text-[12px] text-red-600 text-center font-medium">⚠ You cannot check in again today after this.</p>
                      <div className="flex gap-2 sm:gap-2.5">
                        <button onClick={() => setCheckoutConfirm(false)}
                          className="flex-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-2xl py-2.5 sm:py-3 font-semibold text-xs sm:text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                          Cancel
                        </button>
                        <button onClick={doCheckout} disabled={isLoading}
                          className="flex-1 bg-white text-red-600 border border-red-200 rounded-2xl py-2.5 sm:py-3 font-bold text-xs sm:text-sm cursor-pointer disabled:opacity-50 hover:bg-red-50 transition-colors">
                          {isLoading ? "Checking out…" : "Yes, Check Out"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showSelfie && <SelfieCapture onCapture={onSelfieCapture} onCancel={onSelfieCancel} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Sora:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}