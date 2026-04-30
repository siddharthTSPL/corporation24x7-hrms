import { useState, useCallback, useEffect, useRef } from "react";
import { useAttendanceTracker } from "./useattendanctracker";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { useTodayAttendance } from "../../auth/server-state/attendance/attendance.hook";
import SelfieCapture from "./selfietracker";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (date) =>
  date ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const extractUser = (auth) => {
  if (!auth) return null;
  const r = auth.role;
  if (r === "manager")  return auth.data?.manager  ?? null;
  if (r === "employee") return auth.data?.employee ?? null;
  if (r === "admin")    return auth.data?.admin    ?? null;
  return null;
};

const extractName = (user) => {
  if (!user) return "User";
  const full = [user.f_name, user.l_name].filter(Boolean).join(" ");
  return full || user.name || user.username || user.work_email || user.email || "User";
};

const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

const ROLE_META = {
  admin:    { color: "#7B1C3E", label: "Admin",    bg: "#FDF2F8" },
  manager:  { color: "#1D4ED8", label: "Manager",  bg: "#EFF6FF" },
  employee: { color: "#065F46", label: "Employee", bg: "#F0FDF4" },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, color, src, size = 48, onClick }) {
  if (src) {
    return (
      <img src={src} alt={name} onClick={onClick}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${color}55`, cursor: onClick ? "pointer" : "default", flexShrink: 0 }}
      />
    );
  }
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", background: color + "18", color, border: `2px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0, cursor: onClick ? "pointer" : "default" }}>
      {initials || "U"}
    </div>
  );
}

// ─── Arc Gauge ────────────────────────────────────────────────────────────────
function ArcGauge({ percent, size = 200, strokeWidth = 14, color }) {
  const r = (size - strokeWidth) / 2, circ = 2 * Math.PI * r, cx = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={circ - (circ * percent) / 100}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ ...css.statCard, borderColor: accent + "40" }}>
      <div style={{ ...css.statIcon, background: accent + "15", color: accent }}>{icon}</div>
      <div>
        <p style={css.statValue}>{value}</p>
        <p style={css.statLabel}>{label}</p>
        {sub && <p style={css.statSub}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Session Info Item ────────────────────────────────────────────────────────
function SessionItem({ label, value, accent }) {
  return (
    <div style={{ ...css.sessionItem, borderColor: accent ? accent + "30" : "#F3F4F6" }}>
      <p style={css.sessionKey}>{label}</p>
      <p style={{ ...css.sessionVal, color: accent ?? "#111827" }}>{value || "—"}</p>
    </div>
  );
}

// ─── Live Clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={css.clockFace}>
      <p style={css.clockTime}>{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
      <p style={css.clockLabel}>{time.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</p>
    </div>
  );
}

// ─── Brand Strip ─────────────────────────────────────────────────────────────
function BrandStrip() {
  return (
    <div style={css.brandStrip}>
      <div style={css.brandLogo}>
        <span style={css.brandTorch}>Torch</span>
        <span style={css.brandX}>X</span>
        <span style={css.brandSub}>TALENT</span>
      </div>
      <span style={css.brandTagline}>Workforce Intelligence</span>
    </div>
  );
}

// ─── Profile Panel ────────────────────────────────────────────────────────────
function ProfilePanel({ user, userName, userRole, roleMeta }) {
  if (!user) return null;

  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const rows = [
    { icon: "🪪", label: "Employee ID",  value: user.uid },
    { icon: "🏢", label: "Department",   value: user.department },
    { icon: "💼", label: "Designation",  value: user.designation ?? user.position },
    { icon: "📧", label: "Work Email",   value: user.work_email ?? user.email },
    { icon: "📱", label: "Contact",      value: user.personal_contact },
    { icon: "📍", label: "Location",     value: user.office_location },
    { icon: "⚤",  label: "Gender",       value: cap(user.gender) },
    { icon: "💍", label: "Marital",      value: cap(user.marital_status) },
    { icon: "📅", label: "Joined",       value: joined },
    { icon: "🔵", label: "Status",       value: cap(user.status) },
  ].filter((r) => r.value && r.value !== "—");

  return (
    <div style={css.profilePanel}>
      {/* Profile header */}
      <div style={css.profilePanelHeader}>
        <Avatar name={userName} color={roleMeta.color} src={user.profile_image} size={56} />
        <div style={{ flex: 1 }}>
          <p style={css.profilePanelName}>{userName}</p>
          <p style={css.profilePanelDesig}>{user.designation ?? user.position ?? userRole}</p>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ ...css.chipBase, background: roleMeta.color + "15", color: roleMeta.color, border: `1px solid ${roleMeta.color}25` }}>
              {roleMeta.label}
            </span>
            <span style={{ ...css.chipBase, background: user.status === "active" ? "#DCFCE7" : "#FEF2F2", color: user.status === "active" ? "#16A34A" : "#DC2626", border: `1px solid ${user.status === "active" ? "#86EFAC" : "#FECACA"}` }}>
              {user.status === "active" ? "● Active" : "○ Inactive"}
            </span>
            {user.isverified && (
              <span style={{ ...css.chipBase, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE" }}>✓ Verified</span>
            )}
          </div>
        </div>
      </div>

      <div style={css.panelDivider} />

      {/* Info grid */}
      <div style={css.profileGrid}>
        {rows.map((r, i) => (
          <div key={i} style={css.profileRow}>
            <span style={css.profileRowIcon}>{r.icon}</span>
            <div>
              <p style={css.profileRowLabel}>{r.label}</p>
              <p style={css.profileRowValue}>{r.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quick Chips ──────────────────────────────────────────────────────────────
function QuickChips({ user }) {
  const items = [
    { icon: "🪪", v: user?.uid },
    { icon: "🏢", v: user?.department },
    { icon: "💼", v: user?.designation ?? user?.position },
    { icon: "📍", v: user?.office_location },
  ].filter((c) => c.v);
  if (!items.length) return null;
  return (
    <div style={css.quickChips}>
      {items.map((c, i) => (
        <div key={i} style={css.quickChip}>
          <span style={{ fontSize: 11 }}>{c.icon}</span>
          <span style={css.quickChipVal}>{c.v}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Already Done Screen ──────────────────────────────────────────────────────
function AlreadyDoneScreen({ attendance }) {
  const statusColor =
    attendance?.status === "present"  ? "#16A34A" :
    attendance?.status === "half_day" ? "#D97706" : "#DC2626";
  const statusLabel =
    attendance?.status === "present"  ? "Present ✓" :
    attendance?.status === "half_day" ? "Half Day"   : "Absent";

  const active   = attendance?.activeMinutes ?? 0;
  const idle     = attendance?.idleMinutes   ?? 0;
  const total    = active + idle;
  const pct      = total > 0 ? Math.round((active / total) * 100) : 0;
  const activeH  = Math.floor(active / 60);
  const activeM  = active % 60;
  const activeStr = activeH > 0 ? `${activeH}h ${activeM}m` : `${activeM}m`;

  return (
    <div style={{ ...css.card, textAlign: "center", gap: 18, zIndex: 1 }}>
      <div style={{ fontSize: 52 }}>✅</div>
      <div>
        <h2 style={{ ...css.heading, margin: 0 }}>Attendance Complete</h2>
        <p style={{ ...css.sub, marginTop: 6 }}>Your attendance has been recorded for today.</p>
      </div>

      {attendance?.status && (
        <div style={{ ...css.bigBadge, background: statusColor + "18", color: statusColor, border: `1px solid ${statusColor}30` }}>
          {statusLabel}
        </div>
      )}

      {attendance && (
        <>
          {/* Time row */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <div style={css.timeChip}>
              <span>🟢</span>
              <div>
                <p style={css.timeChipVal}>{formatTime(attendance.checkIn)}</p>
                <p style={css.timeChipKey}>Check-in</p>
              </div>
            </div>
            <div style={{ ...css.timeChip, background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <span>🔴</span>
              <div>
                <p style={css.timeChipVal}>{formatTime(attendance.checkOut)}</p>
                <p style={css.timeChipKey}>Check-out</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            <div style={css.resultTile}>
              <p style={{ ...css.resultVal, color: "#16A34A" }}>{activeStr}</p>
              <p style={css.resultKey}>Active</p>
            </div>
            <div style={css.resultTile}>
              <p style={{ ...css.resultVal, color: "#9CA3AF" }}>{idle}m</p>
              <p style={css.resultKey}>Idle</p>
            </div>
            <div style={css.resultTile}>
              <p style={{ ...css.resultVal, color: statusColor }}>{pct}%</p>
              <p style={css.resultKey}>Score</p>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF" }}>See you tomorrow! 👋</p>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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
  const [showProfile,     setShowProfile]     = useState(false);

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

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (authLoading || todayLoading) {
    return (
      <div style={{ ...css.page, alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={css.authSpinner} />
          <p style={{ color: "#9CA3AF", marginTop: 16, fontSize: 14 }}>Verifying session…</p>
        </div>
        <style>{keyframes}</style>
      </div>
    );
  }

  // ── Not logged in ───────────────────────────────────────────────────────────
  if (!auth) {
    return (
      <div style={{ ...css.page, alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...css.card, alignItems: "center", textAlign: "center", gap: 16 }}>
          <span style={{ fontSize: 44 }}>🔒</span>
          <p style={{ color: "#1F2937", fontWeight: 700, fontSize: 18, margin: 0 }}>Not logged in</p>
          <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>Please log in to access attendance.</p>
        </div>
        <style>{keyframes}</style>
      </div>
    );
  }

  // ── Post-checkout result (current session) ──────────────────────────────────
  if (checkoutResult) {
    const sc = checkoutResult.status === "present" ? "#16A34A" : checkoutResult.status === "half_day" ? "#D97706" : "#DC2626";
    const sl = checkoutResult.status === "present" ? "Present ✓" : checkoutResult.status === "half_day" ? "Half Day" : "Absent";
    return (
      <div style={css.page}>
        <BrandStrip />
        <div style={{ ...css.card, textAlign: "center", gap: 18, zIndex: 1 }}>
          <div style={{ fontSize: 52 }}>🏁</div>
          <h2 style={{ ...css.heading, margin: 0 }}>Session Complete</h2>
          <p style={css.sub}>{today}</p>
          <div style={{ ...css.bigBadge, background: sc + "18", color: sc, border: `1px solid ${sc}30` }}>{sl}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            <div style={css.resultTile}>
              <p style={{ ...css.resultVal, color: "#16A34A" }}>{checkoutResult.activeMinutes ?? 0}m</p>
              <p style={css.resultKey}>Active</p>
            </div>
            <div style={css.resultTile}>
              <p style={{ ...css.resultVal, color: "#9CA3AF" }}>{checkoutResult.idleMinutes ?? 0}m</p>
              <p style={css.resultKey}>Idle</p>
            </div>
            <div style={css.resultTile}>
              <p style={{ ...css.resultVal, color: sc }}>
                {(checkoutResult.activeMinutes ?? 0) + (checkoutResult.idleMinutes ?? 0) > 0
                  ? Math.round(((checkoutResult.activeMinutes ?? 0) / ((checkoutResult.activeMinutes ?? 0) + (checkoutResult.idleMinutes ?? 0))) * 100)
                  : 0}%
              </p>
              <p style={css.resultKey}>Score</p>
            </div>
          </div>
        </div>
        <style>{keyframes}</style>
      </div>
    );
  }

  // ── Already checked out today ───────────────────────────────────────────────
  if (todayData?.isCheckedOut && !isCheckedIn) {
    return (
      <div style={css.page}>
        <BrandStrip />
        <div style={css.header}>
          <div style={css.userInfo}>
            <Avatar name={userName} color={roleMeta.color} src={user?.profile_image}
              onClick={() => setShowProfile(!showProfile)} />
            <div>
              <p style={css.greeting}>{getGreeting()}, {userName.split(" ")[0]} 👋</p>
              <p style={css.date}>{today}</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ ...css.roleBadge, background: roleMeta.color + "15", color: roleMeta.color, border: `1px solid ${roleMeta.color}30` }}>{roleMeta.label}</div>
            <div style={{ ...css.statusBadge, background: "#DCFCE7", color: "#16A34A", border: "1px solid #86EFAC" }}>✓ Done</div>
          </div>
        </div>
        {showProfile && <ProfilePanel user={user} userName={userName} userRole={userRole} roleMeta={roleMeta} />}
        <AlreadyDoneScreen attendance={todayData?.attendance} />
        <style>{keyframes}</style>
      </div>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────────
  return (
    <div style={css.page}>
      <BrandStrip />

      {/* Header */}
      <div style={css.header}>
        <div style={css.userInfo}>
          <Avatar name={userName} color={roleMeta.color} src={user?.profile_image}
            onClick={() => setShowProfile(!showProfile)} />
          <div>
            <p style={css.greeting}>{getGreeting()}, {userName.split(" ")[0]} 👋</p>
            <p style={css.date}>{today}</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ ...css.roleBadge, background: roleMeta.color + "15", color: roleMeta.color, border: `1px solid ${roleMeta.color}30` }}>{roleMeta.label}</div>
          <div style={{ ...css.statusBadge, ...(isCheckedIn ? css.badgeIn : css.badgeOut) }}>
            {isCheckedIn ? "● In" : "○ Out"}
          </div>
        </div>
      </div>

      {/* Collapsible profile */}
      {showProfile && <ProfilePanel user={user} userName={userName} userRole={userRole} roleMeta={roleMeta} />}

      {/* Quick chips */}
      <QuickChips user={user} />

      {/* Error banner */}
      {(error || locationError) && (
        <div style={css.errorBanner}>
          ⚠ {error || locationError}
          <button style={css.errorClose} onClick={() => { clearError(); setLocationError(""); }}>✕</button>
        </div>
      )}

      {/* Still working */}
      {showStillWorking && (
        <div style={css.stillWorkingBanner}>
          <span>💤 You've been idle for a while. Still working?</span>
          <button style={css.confirmBtn} onClick={confirmStillWorking}>Yes, I'm Here</button>
        </div>
      )}

      {/* ── NOT CHECKED IN ── */}
      {!isCheckedIn && (
        <div style={{ ...css.card, alignItems: "center", gap: 20, zIndex: 1 }}>
          <LiveClock />
          <div style={css.infoRow}>
            <div style={css.infoItem}>📍 Location</div>
            <div style={css.infoItem}>📸 Selfie</div>
            <div style={css.infoItem}>⏱ Activity tracking</div>
          </div>
          <p style={css.hint}>
            Attendance is tracked via browser activity, tab focus, and mouse/keyboard events.
            Activity syncs every 60 seconds automatically.
          </p>
          <button style={{ ...css.primaryBtn, ...(isLoading ? css.btnDisabled : {}) }}
            onClick={startCheckin} disabled={isLoading}>
            {isLoading ? "Checking in…" : "🟢 Check In"}
          </button>
        </div>
      )}

      {/* ── CHECKED IN ── */}
      {isCheckedIn && (
        <>
          {/* Gauge card */}
          <div style={{ ...css.card, alignItems: "center", gap: 12, zIndex: 1 }}>
            <div style={css.gaugeWrapper}>
              <ArcGauge percent={activePercent} size={200} strokeWidth={14} color={prodColor} />
              <div style={css.gaugeCenter}>
                <p style={css.elapsedTime}>{elapsedTime}</p>
                <p style={css.elapsedLabel}>Session Time</p>
              </div>
            </div>
            <div style={{ ...css.activityPill, background: actColor + "15", color: actColor, border: `1px solid ${actColor}30` }}>
              <span style={{ ...css.pulseDot, background: actColor }} />
              {activityStatus === "active" ? "Active" : "Idle"}
              {lastPingResult && <span style={css.lastPing}>· last sync {formatTime(lastPingResult.time)}</span>}
            </div>
          </div>

          {/* Stats row */}
          <div style={css.statsRow}>
            <StatCard icon="⚡" label="Active"       value={`${activeMinutes}m`} sub={`${activePercent}%`}          accent="#16A34A" />
            <StatCard icon="💤" label="Idle"         value={`${idleMinutes}m`}   sub={`${100 - activePercent}%`}    accent="#9CA3AF" />
            <StatCard icon="🏆" label="Productivity" value={productivityStatus}  sub={`${totalMinutes}m total`}     accent={prodColor} />
          </div>

          {/* Session details */}
          <div style={{ ...css.card, gap: 14, zIndex: 1 }}>
            <p style={css.sectionLabel}>Session Details</p>
            <div style={css.sessionGrid}>
              <SessionItem label="Checked in"  value={formatTime(checkInTime)}       accent="#16A34A" />
              <SessionItem label="Active time" value={`${activeMinutes} min`}        accent="#16A34A" />
              <SessionItem label="Idle time"   value={`${idleMinutes} min`}          accent="#9CA3AF" />
              <SessionItem label="Department"  value={user?.department}              />
              <SessionItem label="Location"    value={user?.office_location}         />
              <SessionItem label="Designation" value={user?.designation}             />
            </div>
            <div style={css.divider} />
            <div style={css.trackingNote}>
              <span style={css.trackingDot} />
              <span style={css.trackingText}>Browser activity tracking · Tab focus monitored · Syncing every 60s</span>
            </div>
          </div>

          {/* Checkout */}
          {!checkoutConfirm ? (
            <button style={{ ...css.dangerBtn, ...(isLoading ? css.btnDisabled : {}), zIndex: 1 }}
              onClick={() => setCheckoutConfirm(true)} disabled={isLoading}>
              🔴 Check Out
            </button>
          ) : (
            <div style={{ ...css.confirmBox, zIndex: 1 }}>
              <p style={css.confirmText}>Confirm check out?</p>
              <p style={{ margin: 0, fontSize: 12, color: "#DC2626", textAlign: "center", fontWeight: 500 }}>
                ⚠ You cannot check in again today after this.
              </p>
              <div style={css.confirmActions}>
                <button style={css.secondaryBtn} onClick={() => setCheckoutConfirm(false)}>Cancel</button>
                <button style={{ ...css.dangerBtn, ...(isLoading ? css.btnDisabled : {}) }}
                  onClick={doCheckout} disabled={isLoading}>
                  {isLoading ? "Checking out…" : "Yes, Check Out"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showSelfie && <SelfieCapture onCapture={onSelfieCapture} onCancel={onSelfieCancel} />}

      <style>{keyframes}</style>
    </div>
  );
}

// ─── Keyframes ────────────────────────────────────────────────────────────────
const keyframes = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Sora:wght@400;500;600;700&display=swap');
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
  @keyframes slideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = {
  page:         { minHeight: "95vh", background: "#FFFFFF", color: "#1F2937", fontFamily: "'Sora', sans-serif", display: "flex", flexDirection: "column", gap: 14, padding: "24px 20px 48px", maxWidth: 560, margin: "0 auto", position: "relative", border: "2px solid #7B1C3E", borderRadius: 24 },
  brandStrip:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", zIndex: 1 },
  brandLogo:    { display: "flex", alignItems: "baseline", fontFamily: "'Sora', sans-serif" },
  brandTorch:   { fontSize: 22, fontWeight: 700, color: "#1F2937", letterSpacing: -0.5 },
  brandX:       { fontSize: 22, fontWeight: 800, color: "#7B1C3E", letterSpacing: -0.5 },
  brandSub:     { fontSize: 9, fontWeight: 600, color: "#9CA3AF", letterSpacing: 3, marginLeft: 6, alignSelf: "flex-end", paddingBottom: 2 },
  brandTagline: { fontSize: 11, color: "#9CA3AF", fontWeight: 500, letterSpacing: 0.3 },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 },
  userInfo:     { display: "flex", alignItems: "center", gap: 12 },
  greeting:     { margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" },
  date:         { margin: "3px 0 0", fontSize: 11, color: "#6B7280" },
  roleBadge:    { fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 10px", textTransform: "uppercase", letterSpacing: 1 },
  statusBadge:  { fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "4px 12px", whiteSpace: "nowrap" },
  badgeIn:      { background: "#DCFCE7", color: "#16A34A", border: "1px solid #86EFAC" },
  badgeOut:     { background: "#F3F4F6", color: "#9CA3AF", border: "1px solid #E5E7EB" },
  chipBase:     { fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "2px 8px", display: "inline-block" },
  quickChips:   { display: "flex", flexWrap: "wrap", gap: 7, zIndex: 1 },
  quickChip:    { display: "flex", alignItems: "center", gap: 5, background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 10px", fontSize: 11 },
  quickChipVal: { color: "#374151", fontWeight: 600 },
  profilePanel: { background: "#FAFAFA", border: "1px solid #E5E7EB", borderRadius: 18, padding: "18px", display: "flex", flexDirection: "column", gap: 14, zIndex: 1, animation: "slideIn 0.25s ease" },
  profilePanelHeader: { display: "flex", alignItems: "flex-start", gap: 14 },
  profilePanelName:   { margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" },
  profilePanelDesig:  { margin: "3px 0 0", fontSize: 12, color: "#6B7280" },
  panelDivider: { height: 1, background: "#E5E7EB" },
  profileGrid:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  profileRow:   { display: "flex", alignItems: "flex-start", gap: 8 },
  profileRowIcon:  { fontSize: 14, marginTop: 2, flexShrink: 0 },
  profileRowLabel: { margin: 0, fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 },
  profileRowValue: { margin: "2px 0 0", fontSize: 12, color: "#111827", fontWeight: 600 },
  authSpinner:  { width: 40, height: 40, margin: "0 auto", border: "3px solid #E5E7EB", borderTopColor: "#7B1C3E", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  errorBanner:  { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", color: "#DC2626", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", animation: "slideIn 0.3s ease", zIndex: 1 },
  errorClose:   { background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 16, padding: 0 },
  stillWorkingBanner: { background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "14px 16px", color: "#92400E", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, animation: "slideIn 0.3s ease", zIndex: 1 },
  confirmBtn:   { background: "#7B1C3E", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  card:         { background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 20, padding: "20px", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", zIndex: 1 },
  clockFace:    { textAlign: "center", background: "#F9FAFB", borderRadius: 16, padding: "20px 32px", border: "1px solid #E5E7EB", width: "100%" },
  clockTime:    { margin: 0, fontSize: 42, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: -1, color: "#111827" },
  clockLabel:   { margin: "4px 0 0", fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1.5 },
  infoRow:      { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  infoItem:     { background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "#6B7280" },
  hint:         { margin: 0, fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 1.65 },
  gaugeWrapper: { position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  gaugeCenter:  { position: "absolute", textAlign: "center" },
  elapsedTime:  { margin: 0, fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#111827" },
  elapsedLabel: { margin: "4px 0 0", fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1.5 },
  activityPill: { display: "flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "8px 18px", fontSize: 13, fontWeight: 600, alignSelf: "center" },
  pulseDot:     { width: 7, height: 7, borderRadius: "50%", animation: "pulse 1.5s ease-in-out infinite", flexShrink: 0 },
  lastPing:     { color: "#9CA3AF", fontWeight: 400, fontSize: 11 },
  statsRow:     { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, zIndex: 1 },
  statCard:     { background: "#FFFFFF", border: "1px solid", borderRadius: 14, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  statIcon:     { width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 },
  statValue:    { margin: 0, fontWeight: 700, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: "#111827" },
  statLabel:    { margin: "2px 0 0", fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 },
  statSub:      { margin: "2px 0 0", fontSize: 10, color: "#9CA3AF" },
  sectionLabel: { margin: 0, fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 },
  sessionGrid:  { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 },
  sessionItem:  { background: "#F9FAFB", borderRadius: 10, padding: "10px 10px", border: "1px solid" },
  sessionKey:   { margin: 0, fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 },
  sessionVal:   { margin: "4px 0 0", fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" },
  divider:      { height: 1, background: "#F3F4F6" },
  trackingNote: { display: "flex", alignItems: "center", gap: 8 },
  trackingDot:  { width: 6, height: 6, borderRadius: "50%", background: "#16A34A", flexShrink: 0, animation: "pulse 2s ease-in-out infinite" },
  trackingText: { fontSize: 11, color: "#9CA3AF", lineHeight: 1.5 },
  primaryBtn:   { width: "100%", background: "linear-gradient(135deg, #7B1C3E 0%, #9B2554 100%)", color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Sora', sans-serif", boxShadow: "0 4px 18px rgba(123,28,62,0.28)", zIndex: 1 },
  dangerBtn:    { width: "100%", background: "#FFFFFF", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 14, padding: "15px", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "'Sora', sans-serif", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  secondaryBtn: { flex: 1, background: "#F9FAFB", color: "#6B7280", border: "1px solid #E5E7EB", borderRadius: 14, padding: "13px", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'Sora', sans-serif" },
  btnDisabled:  { opacity: 0.5, cursor: "not-allowed" },
  confirmBox:   { background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, padding: "18px", display: "flex", flexDirection: "column", gap: 12, animation: "slideIn 0.2s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  confirmText:  { margin: 0, fontSize: 15, color: "#374151", textAlign: "center", fontWeight: 600 },
  confirmActions: { display: "flex", gap: 10 },
  bigBadge:     { fontSize: 16, fontWeight: 700, borderRadius: 999, padding: "10px 28px", alignSelf: "center" },
  resultTile:   { background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, padding: "12px", textAlign: "center" },
  resultVal:    { margin: 0, fontWeight: 700, fontSize: 18, fontFamily: "'JetBrains Mono', monospace" },
  resultKey:    { margin: "4px 0 0", fontSize: 11, color: "#9CA3AF" },
  timeChip:     { display: "flex", alignItems: "center", gap: 10, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "10px 16px" },
  timeChipVal:  { margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#111827" },
  timeChipKey:  { margin: "2px 0 0", fontSize: 11, color: "#9CA3AF" },
  heading:      { color: "#111827", fontSize: 22, fontWeight: 700 },
  sub:          { margin: 0, color: "#6B7280", fontSize: 13 },
};