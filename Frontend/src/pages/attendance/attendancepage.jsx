import { useState, useCallback, useEffect } from "react";
import { useAttendanceTracker } from "./useattendanctracker";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useTodayAttendance } from "../../auth/server-state/attendance/attendance.hook";
import SelfieCapture from "./selfietracker";
import CompanionLoginModal from "./CompanionLoginModal";

const formatTime = (date) =>
  date ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const extractUser = (auth) => {
  if (!auth) return null;
  const r = auth.role;
  if (r === "manager") return auth.data?.manager ?? null;
  if (r === "employee") return auth.data?.employee ?? null;
  if (r === "admin") return auth.data?.admin ?? null;
  return null;
};

const extractName = (user) => {
  if (!user) return "User";
  const full = [user.f_name, user.l_name].filter(Boolean).join(" ");
  return full || user.name || user.username || user.work_email || user.email || "User";
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

const ROLE_META = {
  admin:    { color: "text-[#7B1C3E]", bg: "bg-[#FDF2F8]", border: "border-[#7B1C3E]/20", label: "Admin",    dot: "#7B1C3E" },
  manager:  { color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",       label: "Manager",  dot: "#1D4ED8" },
  employee: { color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",    label: "Employee", dot: "#065F46" },
};

function Avatar({ name, src, dotColor, size = "w-12 h-12", onClick }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  if (src) {
    return (
      <img src={src} alt={name} onClick={onClick}
        className={`${size} rounded-full object-cover border-2 flex-shrink-0 ${onClick ? "cursor-pointer" : ""}`}
        style={{ borderColor: dotColor + "55" }} />
    );
  }
  return (
    <div onClick={onClick}
      className={`${size} rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 border-2 ${onClick ? "cursor-pointer" : ""}`}
      style={{ background: dotColor + "18", color: dotColor, borderColor: dotColor + "55" }}>
      {initials || "U"}
    </div>
  );
}

function ArcGauge({ percent, color }) {
  const size = 200, sw = 14, r = (size - sw) / 2, circ = 2 * Math.PI * r, cx = size / 2;
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
    <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-8 py-5 text-center">
      <p className="m-0 text-4xl sm:text-5xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-widest text-gray-400">
        {time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
      </p>
    </div>
  );
}

function BrandStrip() {
  return (
    <div className="flex justify-between items-center pb-1">
      <div className="flex items-baseline gap-0" style={{ fontFamily: "'Sora', sans-serif" }}>
        <span className="text-[22px] font-bold text-gray-900 tracking-tight">Torch</span>
        <span className="text-[22px] font-extrabold text-[#7B1C3E] tracking-tight">X</span>
        <span className="text-[9px] font-semibold text-gray-400 tracking-[3px] ml-1.5 self-end pb-0.5">TALENT</span>
      </div>
      <span className="text-[11px] text-gray-400 font-medium tracking-wide">Workforce Intelligence</span>
    </div>
  );
}

function ProfilePanel({ user, userName, userRole, roleMeta }) {
  if (!user) return null;
  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const rows = [
    { icon: "🪪", label: "Employee ID", value: user.uid },
    { icon: "🏢", label: "Department",  value: user.department },
    { icon: "💼", label: "Designation", value: user.designation ?? user.position },
    { icon: "📧", label: "Work Email",  value: user.work_email ?? user.email },
    { icon: "📱", label: "Contact",     value: user.personal_contact },
    { icon: "📍", label: "Location",    value: user.office_location },
    { icon: "⚤",  label: "Gender",      value: cap(user.gender) },
    { icon: "💍", label: "Marital",     value: cap(user.marital_status) },
    { icon: "📅", label: "Joined",      value: joined },
    { icon: "🔵", label: "Status",      value: cap(user.status) },
  ].filter((r) => r.value && r.value !== "—");

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-4 animate-[slideIn_0.25s_ease]">
      <div className="flex items-start gap-3">
        <Avatar name={userName} src={user.profile_image} dotColor={roleMeta.dot} size="w-14 h-14" />
        <div className="flex-1 min-w-0">
          <p className="m-0 text-[17px] font-bold text-gray-900 truncate">{userName}</p>
          <p className="mt-0.5 text-[12px] text-gray-500 truncate">{user.designation ?? user.position ?? userRole}</p>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 border ${roleMeta.bg} ${roleMeta.color} ${roleMeta.border}`}>
              {roleMeta.label}
            </span>
            <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 border ${user.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
              {user.status === "active" ? "● Active" : "○ Inactive"}
            </span>
            {user.isverified && (
              <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 border bg-blue-50 text-blue-700 border-blue-200">✓ Verified</span>
            )}
          </div>
        </div>
      </div>
      <div className="h-px bg-gray-200" />
      <div className="grid grid-cols-2 gap-2.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-sm mt-0.5 flex-shrink-0">{r.icon}</span>
            <div className="min-w-0">
              <p className="m-0 text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{r.label}</p>
              <p className="mt-0.5 text-[12px] text-gray-900 font-semibold truncate">{r.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickChips({ user }) {
  const items = [
    { icon: "🪪", v: user?.uid },
    { icon: "🏢", v: user?.department },
    { icon: "💼", v: user?.designation ?? user?.position },
    { icon: "📍", v: user?.office_location },
  ].filter((c) => c.v);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px]">
          <span>{c.icon}</span>
          <span className="text-gray-700 font-semibold">{c.v}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, sub, accentClass, accentColor }) {
  return (
    <div className="bg-white border rounded-2xl p-3 flex flex-col gap-2" style={{ borderColor: accentColor + "40" }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: accentColor + "15", color: accentColor }}>
        {icon}
      </div>
      <div>
        <p className={`m-0 font-bold text-sm text-gray-900`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
        <p className="mt-0.5 text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function SessionItem({ label, value, accentColor }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
      <p className="m-0 text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-[12px] font-semibold truncate" style={{ color: accentColor ?? "#111827", fontFamily: "'JetBrains Mono', monospace" }}>
        {value || "—"}
      </p>
    </div>
  );
}

function AlreadyDoneScreen({ attendance }) {
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-4 shadow-sm text-center">
      <div className="text-5xl">✅</div>
      <div>
        <h2 className="m-0 text-xl font-bold text-gray-900">Attendance Complete</h2>
        <p className="mt-1.5 text-[13px] text-gray-500">Your attendance has been recorded for today.</p>
      </div>
      {attendance?.status && (
        <span className="text-sm font-bold rounded-full px-6 py-2 border" style={{ background: statusColor + "18", color: statusColor, borderColor: statusColor + "30" }}>
          {statusLabel}
        </span>
      )}
      {attendance && (
        <>
          <div className="flex gap-1.5 justify-center flex-wrap w-full">
            <span className="text-[11px] font-semibold rounded-full px-3 py-1 bg-gray-50 border border-gray-200 text-gray-500">
              {attendance.source === "face" ? "🤳 Checked in via Face Attendance" : "📍 Checked in via System"}
              {attendance.checkInGate ? ` · ${attendance.checkInGate}` : ""}
            </span>
            {attendance.checkOut && (
              <span className="text-[11px] font-semibold rounded-full px-3 py-1 bg-gray-50 border border-gray-200 text-gray-500">
                {attendance.autoCheckedOut
                  ? "⏱️ Auto checked-out (overtime limit reached)"
                  : attendance.source === "face"
                    ? "🤳 Checked out via Face Attendance"
                    : "📍 Checked out via System"}
                {attendance.checkOutGate ? ` · ${attendance.checkOutGate}` : ""}
              </span>
            )}
            {(attendance.checkoutRemark === "overtime" || attendance.checkoutRemark === "auto_overtime") && attendance.overtimeMinutes > 0 && (
              <span className="text-[11px] font-semibold rounded-full px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700">
                ⏰ Overtime · {Math.floor(attendance.overtimeMinutes / 60) > 0 ? `${Math.floor(attendance.overtimeMinutes / 60)}h ` : ""}{attendance.overtimeMinutes % 60}m
              </span>
            )}
          </div>
          <div className="flex gap-2.5 justify-center flex-wrap w-full">
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
              <span>🟢</span>
              <div className="text-left">
                <p className="m-0 text-sm font-bold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(attendance.checkIn)}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">Check-in</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              <span>🔴</span>
              <div className="text-left">
                <p className="m-0 text-sm font-bold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(attendance.checkOut)}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">Check-out</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {[
              { label: "Active", value: activeStr, color: "#16A34A" },
              { label: "Idle",   value: `${idle}m`, color: "#9CA3AF" },
              { label: "Score",  value: `${pct}%`,  color: statusColor },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                <p className="m-0 text-lg font-bold" style={{ color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
                <p className="mt-1 text-[11px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="m-0 text-[12px] text-gray-400">See you tomorrow! 👋</p>
        </>
      )}
    </div>
  );
}

export default function AttendancePage() {
  const { data: auth,      isLoading: authLoading  } = useAuth();
  const { data: todayData, isLoading: todayLoading } = useTodayAttendance();

  const user     = extractUser(auth);
  const userName = extractName(user);
  const userRole = auth?.role ?? "employee";
  const roleMeta = ROLE_META[userRole] ?? ROLE_META.employee;

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
  const [acquiringLocation, setAcquiringLocation] = useState(false);
  const [showProfile,     setShowProfile]     = useState(false);
  const [showCompanionModal, setShowCompanionModal] = useState(false);

  const startCheckin = useCallback(() => {
    setLocationError("");
    clearError();
    if (!navigator.geolocation) { setLocationError("Geolocation not supported."); return; }
    setAcquiringLocation(true);

    // A single getCurrentPosition() call can return the FIRST fix the device
    // offers, which on laptops/phones without a quick GPS lock is often a
    // WiFi/cell/IP-based estimate - that's what causes "Bareilly shows as
    // Dehradun". So instead we watch for a few seconds and keep the most
    // accurate (lowest accuracy-radius, in metres) reading seen.
    const GOOD_ACCURACY_M = 50;       // this good -> stop early, no need to wait out the window
    const MAX_ACCEPTABLE_ACCURACY_M = 1500; // worse than this -> treat as a bad network/IP fix, reject it
    const WINDOW_MS = 12_000;

    let watchId = null;
    let best = null;
    let settled = false;

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      setAcquiringLocation(false);
    };

    const accept = (fix) => {
      if (settled) return;
      settled = true;
      cleanup();
      window._pendingLocation = fix;
      setShowSelfie(true);
    };

    const reject = (message) => {
      if (settled) return;
      settled = true;
      cleanup();
      setLocationError(message);
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (!best || accuracy < best.accuracy) best = { latitude, longitude, accuracy };
        if (accuracy <= GOOD_ACCURACY_M) accept(best);
      },
      (err) => {
        // A transient error shouldn't kill a watch that might still land a
        // good fix - only permission-denied is fatal immediately.
        if (err.code === 1) reject("Location permission denied.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: WINDOW_MS }
    );

    setTimeout(() => {
      if (settled) return;
      if (best && best.accuracy <= MAX_ACCEPTABLE_ACCURACY_M) {
        accept(best);
      } else {
        reject(
          best
            ? `Location isn't accurate enough (±${Math.round(best.accuracy)}m). Turn on precise/GPS location and disable any VPN, then try again.`
            : "Could not get an accurate location. Turn on precise/GPS location and disable any VPN, then try again."
        );
      }
    }, WINDOW_MS);
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

  if (authLoading || todayLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto border-[3px] border-gray-200 border-t-[#7B1C3E] rounded-full animate-spin" />
          <p className="mt-4 text-sm text-gray-400">Verifying session…</p>
        </div>
        <style>{fonts}</style>
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center shadow-sm max-w-xs w-full">
          <span className="text-5xl">🔒</span>
          <p className="m-0 text-lg font-bold text-gray-900">Not logged in</p>
          <p className="m-0 text-sm text-gray-500">Please log in to access attendance.</p>
        </div>
        <style>{fonts}</style>
      </div>
    );
  }

  if (checkoutResult) {
    const sc = checkoutResult.status === "present" ? "#16A34A" : checkoutResult.status === "half_day" ? "#D97706" : "#DC2626";
    const sl = checkoutResult.status === "present" ? "Present ✓" : checkoutResult.status === "half_day" ? "Half Day" : "Absent";
    const am = checkoutResult.activeMinutes ?? 0;
    const im = checkoutResult.idleMinutes ?? 0;
    const score = am + im > 0 ? Math.round((am / (am + im)) * 100) : 0;
    return (
      <div className="min-h-screen bg-white" style={{ fontFamily: "'Sora', sans-serif" }}>
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
          <BrandStrip />
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-4 shadow-sm text-center">
            <div className="text-5xl">🏁</div>
            <h2 className="m-0 text-xl font-bold text-gray-900">Session Complete</h2>
            <p className="m-0 text-sm text-gray-500">{today}</p>
            <span className="text-sm font-bold rounded-full px-6 py-2 border" style={{ background: sc + "18", color: sc, borderColor: sc + "30" }}>{sl}</span>
            <div className="grid grid-cols-3 gap-2.5 w-full">
              {[
                { label: "Active", value: `${am}m`, color: "#16A34A" },
                { label: "Idle",   value: `${im}m`, color: "#9CA3AF" },
                { label: "Score",  value: `${score}%`, color: sc },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                  <p className="m-0 text-lg font-bold" style={{ color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <style>{fonts}</style>
      </div>
    );
  }

  if (todayData?.attendance?.source === "face" && !todayData?.isCheckedOut && !isCheckedIn) {
    const att = todayData.attendance;
    return (
      <div className="min-h-screen bg-white" style={{ fontFamily: "'Sora', sans-serif" }}>
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
          <BrandStrip />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Avatar name={userName} src={user?.profile_image} dotColor={roleMeta.dot} size="w-11 h-11" onClick={() => setShowProfile(!showProfile)} />
              <div>
                <p className="m-0 text-base font-bold text-gray-900">{getGreeting()}, {userName.split(" ")[0]} 👋</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{today}</p>
              </div>
            </div>
            <span className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 border uppercase tracking-wide ${roleMeta.bg} ${roleMeta.color} ${roleMeta.border}`}>{roleMeta.label}</span>
          </div>
          {showProfile && <ProfilePanel user={user} userName={userName} userRole={userRole} roleMeta={roleMeta} />}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm text-center">
            <div className="text-5xl">🤳</div>
            <h2 className="m-0 text-lg font-bold text-gray-900">Already Checked In via Face Attendance</h2>
            <p className="m-0 text-[13px] text-gray-500">
              You checked in at {formatTime(att.checkIn)}{att.checkInGate ? ` · ${att.checkInGate}` : ""}. Please use the Face Kiosk to check out too — System (this app) can't act on this record.
            </p>
          </div>
        </div>
        <style>{fonts}</style>
      </div>
    );
  }

  if (todayData?.isCheckedOut && !isCheckedIn) {
    return (
      <div className="min-h-screen bg-white" style={{ fontFamily: "'Sora', sans-serif" }}>
        <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">
          <BrandStrip />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Avatar name={userName} src={user?.profile_image} dotColor={roleMeta.dot} size="w-11 h-11" onClick={() => setShowProfile(!showProfile)} />
              <div>
                <p className="m-0 text-base font-bold text-gray-900">{getGreeting()}, {userName.split(" ")[0]} 👋</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{today}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 border uppercase tracking-wide ${roleMeta.bg} ${roleMeta.color} ${roleMeta.border}`}>{roleMeta.label}</span>
              <span className="text-[12px] font-semibold rounded-full px-3 py-0.5 border bg-green-50 text-green-700 border-green-200">✓ Done</span>
            </div>
          </div>
          {showProfile && <ProfilePanel user={user} userName={userName} userRole={userRole} roleMeta={roleMeta} />}
          <AlreadyDoneScreen attendance={todayData?.attendance} />
        </div>
        <style>{fonts}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Sora', sans-serif" }}>
      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

        <BrandStrip />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Avatar name={userName} src={user?.profile_image} dotColor={roleMeta.dot} size="w-11 h-11" onClick={() => setShowProfile(!showProfile)} />
            <div>
              <p className="m-0 text-base font-bold text-gray-900">{getGreeting()}, {userName.split(" ")[0]} 👋</p>
              <p className="mt-0.5 text-[11px] text-gray-400">{today}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 border uppercase tracking-wide ${roleMeta.bg} ${roleMeta.color} ${roleMeta.border}`}>{roleMeta.label}</span>
            <span className={`text-[12px] font-semibold rounded-full px-3 py-0.5 border ${isCheckedIn ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
              {isCheckedIn ? "● In" : "○ Out"}
            </span>
          </div>
        </div>

        {showProfile && <ProfilePanel user={user} userName={userName} userRole={userRole} roleMeta={roleMeta} />}

        <QuickChips user={user} />

        {(error || locationError) && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-[13px] flex justify-between items-center">
            <span>⚠ {error || locationError}</span>
            <button className="bg-transparent border-none text-red-600 cursor-pointer text-base p-0 ml-2" onClick={() => { clearError(); setLocationError(""); }}>✕</button>
          </div>
        )}

        {showStillWorking && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-[13px] flex justify-between items-center gap-3">
            <span>💤 You've been idle for a while. Still working?</span>
            <button className="bg-[#7B1C3E] text-white border-none rounded-lg px-3 py-1.5 font-bold text-[12px] cursor-pointer whitespace-nowrap" onClick={confirmStillWorking}>
              Yes, I'm Here
            </button>
          </div>
        )}

        {!isCheckedIn && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <LiveClock />
            <div className="flex gap-2 justify-center flex-wrap">
              {["📍 Location", "📸 Selfie", "⏱ Activity tracking"].map((item) => (
                <span key={item} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] text-gray-500">{item}</span>
              ))}
            </div>
            <p className="m-0 text-[12px] text-gray-400 text-center leading-relaxed">
              Attendance is tracked via browser activity, tab focus, and mouse/keyboard events. Activity syncs every 60 seconds automatically.
            </p>
            <button
              onClick={startCheckin}
              disabled={isLoading || acquiringLocation}
              className="w-full text-white border-none rounded-2xl py-4 font-bold text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: "linear-gradient(135deg, #7B1C3E 0%, #9B2554 100%)", boxShadow: "0 4px 18px rgba(123,28,62,0.28)" }}>
              {acquiringLocation ? "📍 Getting precise location…" : isLoading ? "Checking in…" : "🟢 Check In"}
            </button>
          </div>
        )}

        {isCheckedIn && (
          <>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm">
              <div className="relative w-[200px] h-[200px] flex items-center justify-center">
                <ArcGauge percent={activePercent} color={prodColor} />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="m-0 text-2xl font-bold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{elapsedTime}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-400">Session Time</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold border"
                style={{ background: actColor + "15", color: actColor, borderColor: actColor + "30" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: actColor }} />
                {activityStatus === "active" ? "Active" : "Idle"}
                {lastPingResult && (
                  <span className="text-gray-400 font-normal text-[11px]">· last sync {formatTime(lastPingResult.time)}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <StatCard icon="⚡" label="Active"       value={`${activeMinutes}m`} sub={`${activePercent}%`}       accentColor="#16A34A" />
              <StatCard icon="💤" label="Idle"         value={`${idleMinutes}m`}   sub={`${100-activePercent}%`}   accentColor="#9CA3AF" />
              <StatCard icon="🏆" label="Productivity" value={productivityStatus}  sub={`${totalMinutes}m total`}  accentColor={prodColor} />
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
              <p className="m-0 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Session Details</p>
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
                <span className="text-[11px] text-gray-400 leading-relaxed">Browser activity tracking · Tab focus monitored · Syncing every 60s</span>
              </div>
              <div className="h-px bg-gray-100" />
              <button
                onClick={() => setShowCompanionModal(true)}
                className="w-full text-left flex items-center justify-between gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2.5 cursor-pointer transition-colors"
              >
                <span className="text-[12px] text-gray-600 font-medium">🌐 Also using another browser or device?</span>
                <span className="text-[11px] text-[#7B1C3E] font-bold whitespace-nowrap">Track it too →</span>
              </button>
            </div>

            {!checkoutConfirm ? (
              <button
                onClick={() => setCheckoutConfirm(true)}
                disabled={isLoading}
                className="w-full bg-white text-red-600 border border-red-200 rounded-2xl py-4 font-bold text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:bg-red-50 transition-colors">
                🔴 Check Out
              </button>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                <p className="m-0 text-[15px] font-semibold text-gray-700 text-center">Confirm check out?</p>
                <p className="m-0 text-[12px] text-red-600 text-center font-medium">⚠ You cannot check in again today after this.</p>
                <div className="flex gap-2.5">
                  <button onClick={() => setCheckoutConfirm(false)}
                    className="flex-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-2xl py-3 font-semibold text-sm cursor-pointer hover:bg-gray-100 transition-colors">
                    Cancel
                  </button>
                  <button onClick={doCheckout} disabled={isLoading}
                    className="flex-1 bg-white text-red-600 border border-red-200 rounded-2xl py-3 font-bold text-sm cursor-pointer disabled:opacity-50 hover:bg-red-50 transition-colors">
                    {isLoading ? "Checking out…" : "Yes, Check Out"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {showSelfie && <SelfieCapture onCapture={onSelfieCapture} onCancel={onSelfieCancel} />}

        {showCompanionModal && <CompanionLoginModal onClose={() => setShowCompanionModal(false)} />}

      </div>

      <style>{fonts}</style>
    </div>
  );
}

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Sora:wght@400;500;600;700&display=swap');
  @keyframes slideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
`;