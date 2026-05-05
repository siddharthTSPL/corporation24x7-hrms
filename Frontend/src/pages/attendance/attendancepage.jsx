import { useState, useCallback } from "react";
import { useAttendanceTracker } from "./useattendanctracker";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import SelfieCapture from "./selfietracker";

// ─── Utility ──────────────────────────────────────────────────────────────────
const formatTime = (date) =>
  date
    ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--:--";

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const extractName = (data) =>
  data?.name ?? data?.fullName ?? data?.username ?? data?.email ?? "User";

const ROLE_META = {
  admin:    { color: "#7B1C3E", label: "Admin" },
  manager:  { color: "#7B1C3E", label: "Manager" },
  employee: { color: "#7B1C3E", label: "Employee" },
};

function Avatar({ name, color }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div style={{ ...css.avatar, background: color + "18", color, border: `1.5px solid ${color}55` }}>
      {initials || "U"}
    </div>
  );
}

// ─── Circular progress ────────────────────────────────────────────────────────
function ArcGauge({ percent, size = 180, strokeWidth = 12, color }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * percent) / 100;
  const cx = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { data: auth, isLoading: authLoading } = useAuth();

  // FIX: unwrap nested data shape before extracting name
  const userName = extractName(auth?.data);
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

  const startCheckin = useCallback(() => {
    setLocationError("");
    clearError();
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window._pendingLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setShowSelfie(true);
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? "Location permission denied. Please enable location access."
            : "Could not get location. Please try again."
        );
      },
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
    try {
      const result = await handleCheckout();
      setCheckoutResult(result);
    } catch (_) {}
  }, [handleCheckout]);

  if (authLoading) {
    return (
      <div style={{ ...css.page, alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={css.bgPattern} />
        <div style={{ textAlign: "center", zIndex: 1 }}>
          <div style={css.authSpinner} />
          <p style={{ color: "#9CA3AF", marginTop: 16, fontSize: 14 }}>Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!auth) {
    return (
      <div style={{ ...css.page, alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={css.bgPattern} />
        <div style={{ ...css.card, alignItems: "center", textAlign: "center", gap: 16, zIndex: 1 }}>
          <span style={{ fontSize: 40 }}>🔒</span>
          <p style={{ color: "#1F2937", fontWeight: 700, fontSize: 18, margin: 0 }}>Not logged in</p>
          <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>Please log in to access attendance.</p>
        </div>
      </div>
    );
  }

  const prodColor =
    productivityStatus === "High"   ? "#16A34A" :
    productivityStatus === "Medium" ? "#D97706" : "#DC2626";

  const actColor = activityStatus === "active" ? "#16A34A" : "#9CA3AF";
  const actLabel = activityStatus === "active" ? "Active" : "Idle";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (checkoutResult) {
    const statusColor =
      checkoutResult.status === "present"  ? "#16A34A" :
      checkoutResult.status === "half_day" ? "#D97706" : "#DC2626";
    const statusLabel =
      checkoutResult.status === "present"  ? "Present ✓" :
      checkoutResult.status === "half_day" ? "Half Day" : "Absent";

    return (
      <div style={css.page}>
        <div style={css.bgPattern} />
        <div style={{ ...css.card, maxWidth: 440, textAlign: "center", gap: 20, zIndex: 1 }}>
          <div style={{ fontSize: 64 }}>🏁</div>
          <h2 style={{ ...css.heading, margin: 0 }}>Session Complete</h2>
          <p style={css.sub}>{today}</p>
          <div style={{ ...css.statusBadge, background: statusColor + "18", color: statusColor, fontSize: 18, padding: "10px 28px", border: `1px solid ${statusColor}30` }}>
            {statusLabel}
          </div>
          <div style={css.resultGrid}>
            <div style={css.resultItem}>
              <span style={{ color: "#16A34A", fontSize: 22 }}>⚡</span>
              <p style={css.resultVal}>{checkoutResult.activeMinutes ?? 0} min</p>
              <p style={css.resultKey}>Active</p>
            </div>
            <div style={css.resultItem}>
              <span style={{ color: "#9CA3AF", fontSize: 22 }}>💤</span>
              <p style={css.resultVal}>{checkoutResult.idleMinutes ?? 0} min</p>
              <p style={css.resultKey}>Idle</p>
            </div>
          </div>
          <button style={css.primaryBtn} onClick={() => setCheckoutResult(null)}>
            Back to Attendance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={css.page}>
      <div style={css.bgPattern} />

      {/* Top brand strip */}
      <div style={css.brandStrip}>
        <div style={css.brandLogo}>
          <span style={css.brandTorch}>Torch</span><span style={css.brandX}>X</span>
          <span style={css.brandSub}>TALENT</span>
        </div>
        <span style={css.brandTagline}>Workforce Intelligence</span>
      </div>

      {/* ── User identity header ── */}
      <div style={css.header}>
        <div style={css.userInfo}>
          <Avatar name={userName} color={roleMeta.color} />
          <div>
            <p style={css.greeting}>{getGreeting()}, {userName.split(" ")[0]} 👋</p>
            <p style={css.date}>{today}</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ ...css.roleBadge, background: roleMeta.color + "15", color: roleMeta.color, border: `1px solid ${roleMeta.color}30` }}>
            {roleMeta.label}
          </div>
          <div style={{ ...css.statusBadge, ...(isCheckedIn ? css.badgeIn : css.badgeOut) }}>
            {isCheckedIn ? "● In" : "○ Out"}
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {(error || locationError) && (
        <div style={css.errorBanner}>
          ⚠ {error || locationError}
          <button style={css.errorClose} onClick={() => { clearError(); setLocationError(""); }}>✕</button>
        </div>
      )}

      {/* ── Still Working? prompt ── */}
      {showStillWorking && (
        <div style={css.stillWorkingBanner}>
          <span>💤 You've been idle for a while. Still working?</span>
          <button style={css.confirmBtn} onClick={confirmStillWorking}>
            Yes, I'm Working
          </button>
        </div>
      )}

      {/* ── NOT CHECKED IN ── */}
      {!isCheckedIn && (
        <div style={{ ...css.card, alignItems: "center", gap: 28, zIndex: 1 }}>
          <div style={css.clockFace}>
            <p style={css.clockTime}>
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p style={css.clockLabel}>Current Time</p>
          </div>

          <div style={css.infoRow}>
            <div style={css.infoItem}>📍 Location required</div>
            <div style={css.infoItem}>📸 Selfie verification</div>
          </div>

          <p style={css.hint}>
            Your attendance is tracked by browser activity, tab focus, and mouse/keyboard events.
            Activity is synced every minute.
          </p>

          <button
            style={{ ...css.primaryBtn, ...(isLoading ? css.btnDisabled : {}) }}
            onClick={startCheckin}
            disabled={isLoading}
          >
            {isLoading ? "Checking in…" : "🟢 Check In"}
          </button>
        </div>
      )}

      {/* ── CHECKED IN ── */}
      {isCheckedIn && (
        <>
          <div style={{ ...css.card, alignItems: "center", gap: 0, zIndex: 1 }}>
            <div style={css.gaugeWrapper}>
              <ArcGauge percent={activePercent} size={200} strokeWidth={14} color={prodColor} />
              <div style={css.gaugeCenter}>
                <p style={css.elapsedTime}>{elapsedTime}</p>
                <p style={css.elapsedLabel}>Total Time</p>
              </div>
            </div>
            <div style={{ ...css.activityPill, background: actColor + "15", color: actColor, border: `1px solid ${actColor}30` }}>
              <span style={{ ...css.pulseDot, background: actColor }} />
              {actLabel}
              {lastPingResult && (
                <span style={css.lastPing}>· last sync {formatTime(lastPingResult.time)}</span>
              )}
            </div>
          </div>

          <div style={css.statsRow}>
            <StatCard icon="⚡" label="Active" value={`${activeMinutes} min`}
              sub={`${activePercent}% of session`} accent="#16A34A" />
            <StatCard icon="💤" label="Idle" value={`${idleMinutes} min`}
              sub={`${100 - activePercent}% of session`} accent="#9CA3AF" />
            <StatCard icon="🏆" label="Productivity" value={productivityStatus}
              sub={`${totalMinutes} min total`} accent={prodColor} />
          </div>

          <div style={{ ...css.card, zIndex: 1 }}>
            <div style={css.infoLine}>
              <span style={css.infoKey}>Checked in at</span>
              <span style={css.infoVal}>{formatTime(checkInTime)}</span>
            </div>
            <div style={css.divider} />
            <div style={css.trackingNote}>
              <span style={css.trackingDot} />
              <span style={css.trackingText}>
                Tracking browser activity · Tab focus monitored · Syncing every 60s
              </span>
            </div>
          </div>

          {!checkoutConfirm ? (
            <button
              style={{ ...css.dangerBtn, ...(isLoading ? css.btnDisabled : {}), zIndex: 1 }}
              onClick={() => setCheckoutConfirm(true)}
              disabled={isLoading}
            >
              🔴 Check Out
            </button>
          ) : (
            <div style={{ ...css.confirmBox, zIndex: 1 }}>
              <p style={css.confirmText}>Are you sure you want to check out?</p>
              <div style={css.confirmActions}>
                <button style={css.secondaryBtn} onClick={() => setCheckoutConfirm(false)}>
                  Cancel
                </button>
                <button style={{ ...css.dangerBtn, ...(isLoading ? css.btnDisabled : {}) }}
                  onClick={doCheckout} disabled={isLoading}>
                  {isLoading ? "Checking out…" : "Yes, Check Out"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showSelfie && (
        <SelfieCapture onCapture={onSelfieCapture} onCancel={onSelfieCancel} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Sora:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes diag { 0% { background-position: 0 0; } 100% { background-position: 40px 40px; } }
      `}</style>
    </div>
  );
}

// ─── Styles — TorchX Talent Palette ──────────────────────────────────────────
const css = {
  page: {
    minHeight: "95vh",
    background: "#FFFFFF",
    color: "#1F2937",
    fontFamily: "'Sora', sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "24px 20px 48px",
    maxWidth: 600,
    margin: "0 auto",
    position: "relative",
    overflow: "hidden",
    border: "2px solid #7B1C3E",
    borderRadius: 24,
  },

  bgPattern: {
    display: "none",
  },

  // ── Brand strip ──
  brandStrip: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0 4px",
    zIndex: 1,
  },
  brandLogo: {
    display: "flex",
    alignItems: "baseline",
    gap: 0,
    fontFamily: "'Sora', sans-serif",
  },
  brandTorch: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1F2937",
    letterSpacing: -0.5,
  },
  brandX: {
    fontSize: 22,
    fontWeight: 800,
    color: "#7B1C3E",
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: 600,
    color: "#9CA3AF",
    letterSpacing: 3,
    marginLeft: 6,
    alignSelf: "flex-end",
    paddingBottom: 2,
  },
  brandTagline: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: 500,
    letterSpacing: 0.3,
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "4px 0",
    zIndex: 1,
  },
  userInfo: {
    display: "flex", alignItems: "center", gap: 12,
  },
  avatar: {
    width: 46, height: 46, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 16, flexShrink: 0,
    fontFamily: "'Sora', sans-serif",
  },
  greeting: { margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" },
  date:     { margin: "3px 0 0", fontSize: 11, color: "#6B7280" },

  roleBadge: {
    fontSize: 11, fontWeight: 700, borderRadius: 999,
    padding: "3px 10px", textTransform: "uppercase", letterSpacing: 1,
  },
  statusBadge: {
    fontSize: 12, fontWeight: 600, borderRadius: 999,
    padding: "4px 12px", whiteSpace: "nowrap",
  },
  badgeIn:  { background: "#DCFCE7", color: "#16A34A", border: "1px solid #86EFAC" },
  badgeOut: { background: "#F3F4F6", color: "#9CA3AF", border: "1px solid #E5E7EB" },

  authSpinner: {
    width: 40, height: 40, margin: "0 auto",
    border: "3px solid #E5E7EB",
    borderTopColor: "#7B1C3E",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBanner: {
    background: "#FEF2F2", border: "1px solid #FECACA",
    borderRadius: 12, padding: "12px 16px",
    color: "#DC2626", fontSize: 14,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    animation: "slideIn 0.3s ease",
    zIndex: 1,
  },
  errorClose: {
    background: "none", border: "none", color: "#DC2626",
    cursor: "pointer", fontSize: 16, padding: 0,
  },
  stillWorkingBanner: {
    background: "#FFFBEB", border: "1px solid #FDE68A",
    borderRadius: 12, padding: "14px 16px",
    color: "#92400E", fontSize: 14,
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
    animation: "slideIn 0.3s ease",
    zIndex: 1,
  },
  confirmBtn: {
    background: "#7B1C3E", color: "#fff", border: "none",
    borderRadius: 8, padding: "8px 16px",
    fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
  },
  card: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 20,
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    position: "relative",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(123,28,62,0.04)",
    zIndex: 1,
  },
  clockFace: {
    textAlign: "center",
    background: "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)",
    borderRadius: 16,
    padding: "24px 40px",
    border: "1px solid #E5E7EB",
  },
  clockTime:  { margin: 0, fontSize: 48, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: -2, color: "#111827" },
  clockLabel: { margin: "4px 0 0", fontSize: 12, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 2 },

  infoRow: { display: "flex", gap: 12, justifyContent: "center" },
  infoItem: {
    background: "#F9FAFB", border: "1px solid #E5E7EB",
    borderRadius: 8, padding: "6px 14px",
    fontSize: 13, color: "#6B7280",
  },

  hint: { margin: 0, fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 1.6 },

  gaugeWrapper: {
    position: "relative", width: 200, height: 200,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  gaugeCenter: {
    position: "absolute", textAlign: "center",
  },
  elapsedTime:  { margin: 0, fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#111827" },
  elapsedLabel: { margin: "4px 0 0", fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1.5 },

  activityPill: {
    display: "flex", alignItems: "center", gap: 8,
    borderRadius: 999, padding: "8px 18px",
    fontSize: 14, fontWeight: 600,
    alignSelf: "center",
  },
  pulseDot: {
    width: 8, height: 8, borderRadius: "50%",
    animation: "pulse 1.5s ease-in-out infinite",
    flexShrink: 0,
  },
  lastPing: { color: "#9CA3AF", fontWeight: 400, fontSize: 12 },

  statsRow: {
    display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10,
    zIndex: 1,
  },
  statCard: {
    background: "#FFFFFF", border: "1px solid",
    borderRadius: 14, padding: "14px 12px",
    display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
  },
  statValue: { margin: 0, fontWeight: 700, fontSize: 16, fontFamily: "'JetBrains Mono', monospace", color: "#111827" },
  statLabel: { margin: "2px 0 0", fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 },
  statSub:   { margin: "2px 0 0", fontSize: 10, color: "#9CA3AF" },

  infoLine: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  infoKey: { fontSize: 13, color: "#6B7280" },
  infoVal: { fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: "#111827" },
  divider: { height: 1, background: "#F3F4F6" },
  trackingNote: {
    display: "flex", alignItems: "center", gap: 8,
  },
  trackingDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#16A34A",
    flexShrink: 0, animation: "pulse 2s ease-in-out infinite",
  },
  trackingText: { fontSize: 11, color: "#9CA3AF", lineHeight: 1.5 },

  primaryBtn: {
    width: "100%",
    background: "linear-gradient(135deg, #7B1C3E 0%, #9B2554 100%)",
    color: "#fff", border: "none", borderRadius: 14,
    padding: "16px", fontWeight: 700, fontSize: 16,
    cursor: "pointer", fontFamily: "'Sora', sans-serif",
    boxShadow: "0 4px 20px rgba(123,28,62,0.28)",
    transition: "opacity 0.2s, transform 0.15s",
    zIndex: 1,
  },
  dangerBtn: {
    width: "100%",
    background: "#FFFFFF",
    color: "#DC2626", border: "1px solid #FECACA", borderRadius: 14,
    padding: "16px", fontWeight: 700, fontSize: 16,
    cursor: "pointer", fontFamily: "'Sora', sans-serif",
    transition: "all 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  secondaryBtn: {
    flex: 1,
    background: "#F9FAFB", color: "#6B7280",
    border: "1px solid #E5E7EB", borderRadius: 14,
    padding: "14px", fontWeight: 600, fontSize: 15,
    cursor: "pointer", fontFamily: "'Sora', sans-serif",
  },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  confirmBox: {
    background: "#FFFFFF", border: "1px solid #E5E7EB",
    borderRadius: 16, padding: "20px",
    display: "flex", flexDirection: "column", gap: 14,
    animation: "slideIn 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  confirmText:    { margin: 0, fontSize: 15, color: "#374151", textAlign: "center" },
  confirmActions: { display: "flex", gap: 10 },
  resultGrid: {
    display: "flex", gap: 24, justifyContent: "center",
  },
  resultItem: {
    textAlign: "center", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4,
  },
  resultVal: { margin: 0, fontWeight: 700, fontSize: 20, fontFamily: "'JetBrains Mono', monospace", color: "#111827" },
  resultKey: { margin: 0, fontSize: 12, color: "#9CA3AF" },

  heading: { color: "#111827", fontSize: 24, fontWeight: 700 },
  sub:     { margin: 0, color: "#6B7280", fontSize: 13 },
};
