import React, { useState } from "react";
import {
  useShowAllLeaves,
  useAcceptLeaveByAdmin,
  useRejectLeaveByAdmin,
} from "../../auth/server-state/superadmin/leave/suleave.hook";

/* ─────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    @keyframes spin       { to { transform: rotate(360deg); } }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes progressIn { from { width: 0; } }

    .sa-card {
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid rgba(180,155,210,0.28);
      padding: 22px 24px;
      margin-bottom: 14px;
      box-shadow: 0 2px 12px rgba(60,20,80,0.07), 0 1px 3px rgba(0,0,0,0.04);
      transition: box-shadow .25s ease, transform .25s ease;
      animation: fadeSlideUp .35s ease both;
      position: relative;
      overflow: hidden;
    }
    .sa-card:hover {
      box-shadow: 0 8px 28px rgba(60,20,80,0.13), 0 2px 6px rgba(0,0,0,0.06);
      transform: translateY(-1px);
    }

    .sa-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 7px 15px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-family: 'DM Sans', sans-serif;
      letter-spacing: .2px;
      transition: all .18s ease;
    }
    .sa-action-btn:hover  { transform: translateY(-1px); filter: brightness(1.05); }
    .sa-action-btn:active { transform: translateY(0); }

    .sa-tab-btn {
      padding: 9px 22px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
      border: none;
      cursor: pointer;
      transition: all .2s ease;
      white-space: nowrap;
    }

    .sa-chip-btn {
      border-radius: 22px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: all .18s ease;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 14px;
    }

    .sa-input {
      padding: 11px 15px;
      border-radius: 12px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      color: #1C1028;
      background: #FDFBFF;
      outline: none;
      transition: border .2s, box-shadow .2s;
      width: 100%;
      box-sizing: border-box;
    }
    .sa-input:focus {
      border-color: #730042 !important;
      box-shadow: 0 0 0 3px rgba(115,0,66,0.10);
    }

    .sa-toast {
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 14px 22px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
      box-shadow: 0 8px 30px rgba(0,0,0,0.14);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all .35s cubic-bezier(.34,1.56,.64,1);
      backdrop-filter: blur(8px);
    }

    .sa-table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 600;
      color: #9B8BAE;
      text-transform: uppercase;
      letter-spacing: .7px;
      background: #FAF7FD;
      border-bottom: 1px solid #EDE6F5;
      font-family: 'DM Sans', sans-serif;
    }
    .sa-table td {
      padding: 13px 14px;
      border-bottom: 1px solid #F5F0FA;
      color: #1C1028;
      vertical-align: middle;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
    }
    .sa-table tr:last-child td { border-bottom: none; }
    .sa-table tr:hover td { background: #FDFBFF; }

    .sa-divider {
      display: inline-block;
      width: 3px;
      height: 18px;
      background: linear-gradient(180deg,#730042,#CD166E);
      border-radius: 3px;
      margin-right: 8px;
      vertical-align: middle;
    }
  `}</style>
);

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const LEAVE_META = {
  el: { label: "Earned Leave",    short: "EL", bg: "#DCFCE7", color: "#14803D", accent: "#22C55E", dot: "#16A34A" },
  sl: { label: "Sick Leave",      short: "SL", bg: "#DBEAFE", color: "#1D4ED8", accent: "#3B82F6", dot: "#2563EB" },
  pl: { label: "Privilege Leave", short: "PL", bg: "#FEF3C7", color: "#92400E", accent: "#F59E0B", dot: "#D97706" },
  ml: { label: "Maternity Leave", short: "ML", bg: "#F3E8FF", color: "#6B21A8", accent: "#A855F7", dot: "#7C3AED" },
  cl: { label: "Casual Leave",    short: "CL", bg: "#FCE7F3", color: "#9D174D", accent: "#EC4899", dot: "#BE185D" },
};

const STATUS_META = {
  pending:                        { label: "Pending",              bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  forwarded_reporting_manager:    { label: "Fwd by Manager",       bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  approved_reporting_manager:     { label: "Approved",             bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_reporting_manager:     { label: "Rejected",             bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  pending_reporting_manager:      { label: "Pending Review",       bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  approved_manager:               { label: "Mgr Approved",         bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_manager:               { label: "Mgr Rejected",         bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  forwarded_admin:                { label: "Fwd to Admin",         bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
};

const AVATAR_COLORS = [
  "linear-gradient(135deg,#730042,#CD166E)",
  "linear-gradient(135deg,#1D4ED8,#3B82F6)",
  "linear-gradient(135deg,#065F46,#10B981)",
  "linear-gradient(135deg,#92400E,#F59E0B)",
  "linear-gradient(135deg,#6B21A8,#A855F7)",
  "linear-gradient(135deg,#1E3A5F,#60A5FA)",
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const initials    = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();
const avatarColor = (name = "") => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const formatDate  = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const daysDiff = (s, e) => {
  if (!s || !e) return 0;
  return Math.max(Math.round((new Date(e) - new Date(s)) / 86400000) + 1, 1);
};

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
const Spinner = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "70px 0", gap: 14 }}>
    <div style={{
      width: 38, height: 38,
      border: "3px solid #EDE6F5",
      borderTop: "3px solid #730042",
      borderRadius: "50%",
      animation: "spin .7s linear infinite",
    }} />
    <p style={{ fontSize: 13, color: "#9B8BAE", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>Loading…</p>
  </div>
);

const EmptyState = ({ msg = "No records found" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 12 }}>
    <div style={{
      width: 64, height: 64, borderRadius: 18,
      background: "linear-gradient(135deg,#F4EEF9,#EDE4F5)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="5" width="20" height="19" rx="4" stroke="#C4AADA" strokeWidth="1.5" fill="none" />
        <path d="M4 11h20" stroke="#C4AADA" strokeWidth="1.5" />
        <path d="M9 8V5M19 8V5" stroke="#C4AADA" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 16h6M9 20h10" stroke="#D4BFEA" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
    <p style={{ fontSize: 13, color: "#9B8BAE", fontWeight: 500, fontFamily: "'DM Sans',sans-serif" }}>{msg}</p>
  </div>
);

const Toast = ({ toast }) => {
  const colors = {
    success: { bg: "rgba(240,253,244,0.95)", color: "#14803D", border: "#86EFAC", icon: "#22C55E" },
    error:   { bg: "rgba(254,242,242,0.95)", color: "#991B1B", border: "#FCA5A5", icon: "#EF4444" },
    info:    { bg: "rgba(239,246,255,0.95)", color: "#1D4ED8", border: "#93C5FD", icon: "#3B82F6" },
  };
  const c = colors[toast.type] || colors.info;
  return (
    <div className="sa-toast" style={{
      transform: toast.visible ? "translateY(0) scale(1)" : "translateY(24px) scale(.94)",
      opacity:   toast.visible ? 1 : 0,
      pointerEvents: toast.visible ? "auto" : "none",
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.icon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {toast.type === "success" && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>}
        {toast.type === "error"   && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>}
        {toast.type === "info"    && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 4v4M5 3v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>}
      </div>
      {toast.message}
    </div>
  );
};

const TypeBadge = ({ type }) => {
  const m = LEAVE_META[type] || { label: (type || "").toUpperCase(), bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color, fontFamily: "'DM Sans',sans-serif" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color, fontFamily: "'DM Sans',sans-serif" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
};

/* ─────────────────────────────────────────────
   SHARED LEAVE CARD
   leaveFor = "employee" | "admin"
───────────────────────────────────────────── */
const LeaveCard = ({ leave, leaveFor, processingId, onAction, idx }) => {
  const person    = leave.employee || leave.manager || {};
  const isProcessing = processingId === leave._id;
  const days      = leave.days || daysDiff(leave.startDate, leave.endDate);
  const accent    = (LEAVE_META[leave.leaveType] || { accent: "#730042" }).accent;

  /* Only allow action on leaves that haven't been fully processed */
  const terminal = ["approved_reporting_manager", "rejected_reporting_manager"].includes(leave.status);

  return (
    <div
      className="sa-card"
      style={{
        opacity: isProcessing ? 0.6 : 1,
        pointerEvents: isProcessing ? "none" : "auto",
        animationDelay: `${idx * 0.06}s`,
      }}
    >
      {/* Accent stripe */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, bottom: 0, background: accent, borderRadius: "20px 0 0 20px" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingLeft: 8 }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Person info */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: avatarColor(person.f_name || "A"),
              color: "#fff", fontSize: 14, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontFamily: "'DM Sans',sans-serif",
              boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
            }}>
              {initials(person.f_name, person.l_name)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1C1028", fontFamily: "'DM Sans',sans-serif" }}>
                {person.f_name} {person.l_name}
              </div>
              <div style={{ fontSize: 11, color: "#9B8BAE", marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>
                {person.work_email}
                {person.designation && <span style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 8, background: "#F4EEF9", color: "#6B1A4A", fontSize: 10, fontWeight: 600 }}>{person.designation}</span>}
                {leaveFor === "admin" && (
                  <span style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 8, background: "linear-gradient(135deg,#FFF0F7,#FFE4F2)", color: "#730042", fontSize: 10, fontWeight: 700, border: "1px solid #FFB3D9" }}>
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <TypeBadge type={leave.leaveType} />
            <StatusBadge status={leave.status} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#F4EEF9", color: "#6B1A4A", fontFamily: "'DM Sans',sans-serif" }}>
              {days} day{days > 1 ? "s" : ""}
            </span>
          </div>

          {/* Date range */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9B8BAE", fontFamily: "'DM Sans',sans-serif" }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1" />
              <path d="M1 6h11" stroke="#C4AADA" strokeWidth="1" />
              <path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span style={{ fontWeight: 500, color: "#4A3860" }}>{formatDate(leave.startDate)}</span>
            <span style={{ color: "#D4BFEA", fontSize: 10 }}>→</span>
            <span style={{ fontWeight: 500, color: "#4A3860" }}>{formatDate(leave.endDate)}</span>
          </div>

          {/* Reason */}
          {leave.reason && (
            <div style={{ background: "#FAF7FD", borderRadius: 10, padding: "9px 14px", fontSize: 12, color: "#4A3860", marginTop: 10, borderLeft: "3px solid #D4AECB", lineHeight: 1.6, fontFamily: "'DM Sans',sans-serif" }}>
              <span style={{ color: "#730042", fontWeight: 600 }}>Reason — </span>
              {leave.reason}
            </div>
          )}
        </div>

        {/* Right — actions */}
        {!terminal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7, flexShrink: 0 }}>
            <button className="sa-action-btn"
              style={{ background: "#F0FDF4", color: "#14803D", boxShadow: "0 2px 8px rgba(34,197,94,0.15)" }}
              onClick={() => onAction(leave._id, leaveFor, "accept")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5 5.5-5" stroke="#14803D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Approve
            </button>
            <button className="sa-action-btn"
              style={{ background: "#FFF1F2", color: "#991B1B", boxShadow: "0 2px 8px rgba(239,68,68,0.12)" }}
              onClick={() => onAction(leave._id, leaveFor, "reject")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round" /></svg>
              Reject
            </button>
          </div>
        )}

        {/* Terminal state icon */}
        {terminal && (() => {
          const sm = STATUS_META[leave.status];
          return sm ? (
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: sm.bg, border: `2px solid ${sm.dot}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {leave.status === "approved_reporting_manager" && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l2.5 2.5 5.5-5" stroke={sm.dot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
              {leave.status === "rejected_reporting_manager" && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke={sm.dot} strokeWidth="2" strokeLinecap="round" /></svg>
              )}
            </div>
          ) : null;
        })()}
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
          <div style={{ width: 22, height: 22, border: "2px solid #EDE6F5", borderTop: "2px solid #730042", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   EMPLOYEE LEAVES TAB
───────────────────────────────────────────── */
const EmployeeLeavesTab = ({ leaves, isLoading, processingId, onAction }) => {
  const [filter, setFilter] = useState("all");

  const FILTERS = [
    { key: "all",                        label: "All" },
    { key: "forwarded_reporting_manager", label: "Forwarded" },
    { key: "approved_reporting_manager",  label: "Approved" },
    { key: "rejected_reporting_manager",  label: "Rejected" },
  ];

  const count    = (key) => key === "all" ? leaves.length : leaves.filter(l => l.status === key).length;
  const filtered = filter === "all" ? leaves : leaves.filter(l => l.status === filter);

  if (isLoading) return <Spinner />;

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          { label: "Total",    val: leaves.length,                                                           color: "#730042", bg: "linear-gradient(135deg,#FFF0F7,#FFE4F2)" },
          { label: "Pending",  val: leaves.filter(l => l.status === "forwarded_reporting_manager").length,   color: "#1D4ED8", bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
          { label: "Approved", val: leaves.filter(l => l.status === "approved_reporting_manager").length,    color: "#14803D", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
          { label: "Rejected", val: leaves.filter(l => l.status === "rejected_reporting_manager").length,    color: "#991B1B", bg: "linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
        ].map((s, i) => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 14, padding: "12px 20px",
            display: "flex", alignItems: "center", gap: 12,
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            animation: `fadeSlideUp .3s ease ${i * .07}s both`,
            minWidth: 110,
          }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>{s.val}</span>
            <span style={{ fontSize: 11, color: s.color, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", opacity: .8, lineHeight: 1.3 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button key={f.key} className="sa-chip-btn"
              style={{
                border:   active ? "1.5px solid #730042"   : "1.5px solid #E5DAF0",
                background: active ? "linear-gradient(135deg,#730042,#CD166E)" : "#fff",
                color:    active ? "#fff"                   : "#8B7FA0",
                boxShadow: active ? "0 2px 10px rgba(115,0,66,0.3)" : "none",
              }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span style={{ background: active ? "rgba(255,255,255,0.25)" : "#EDE6F5", color: active ? "#fff" : "#9B8BAE", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                {count(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0
        ? <EmptyState msg="No employee leave requests found" />
        : filtered.map((leave, idx) => (
          <LeaveCard key={leave._id} leave={leave} leaveFor="employee" processingId={processingId} onAction={onAction} idx={idx} />
        ))
      }
    </div>
  );
};

/* ─────────────────────────────────────────────
   ADMIN LEAVES TAB
───────────────────────────────────────────── */
const AdminLeavesTab = ({ leaves, isLoading, processingId, onAction }) => {
  if (isLoading) return <Spinner />;

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          { label: "Total",          val: leaves.length,                                                        color: "#730042", bg: "linear-gradient(135deg,#FFF0F7,#FFE4F2)" },
          { label: "Pending Review", val: leaves.filter(l => l.status === "pending_reporting_manager").length,  color: "#92400E", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
          { label: "Approved",       val: leaves.filter(l => l.status === "approved_reporting_manager").length, color: "#14803D", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
          { label: "Rejected",       val: leaves.filter(l => l.status === "rejected_reporting_manager").length, color: "#991B1B", bg: "linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
        ].map((s, i) => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 14, padding: "12px 20px",
            display: "flex", alignItems: "center", gap: 12,
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            animation: `fadeSlideUp .3s ease ${i * .07}s both`,
            minWidth: 110,
          }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>{s.val}</span>
            <span style={{ fontSize: 11, color: s.color, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", opacity: .8, lineHeight: 1.3 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div style={{
        marginBottom: 20,
        background: "linear-gradient(135deg,#FFF0F7,#FFE4F2)",
        border: "1px solid #FFB3D9", borderRadius: 14,
        padding: "14px 20px", fontSize: 12, color: "#730042", lineHeight: 1.7,
        fontFamily: "'DM Sans',sans-serif",
        display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <div style={{ width: 22, height: 22, borderRadius: 7, background: "linear-gradient(135deg,#730042,#CD166E)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3v3.5M6 8v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </div>
        <span>
          <strong>Admin Leave Requests</strong> — These are leave applications submitted by admins in your organisation. As Super Admin, you have final approval authority.
        </span>
      </div>

      {/* Cards */}
      {leaves.length === 0
        ? <EmptyState msg="No admin leave requests found" />
        : leaves.map((leave, idx) => (
          <LeaveCard key={leave._id} leave={leave} leaveFor="admin" processingId={processingId} onAction={onAction} idx={idx} />
        ))
      }
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const SuperAdminLeaveTable = () => {
  const [tab, setTab]         = useState("employee");
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast]     = useState({ visible: false, message: "", type: "success" });

  const { data, isLoading, refetch } = useShowAllLeaves();
  const acceptMutation = useAcceptLeaveByAdmin();
  const rejectMutation = useRejectLeaveByAdmin();

  const employeeLeaves = data?.employeeLeaves?.leaves || [];
  const adminLeaves    = data?.adminLeaves?.leaves    || [];

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(p => ({ ...p, visible: false })), 3400);
  };

  const handleAction = async (leaveId, leaveFor, action) => {
    setProcessingId(leaveId);
    try {
      if (action === "accept") {
        await acceptMutation.mutateAsync({ id: leaveId, leaveFor });
        showToast("Leave approved successfully", "success");
      } else {
        await rejectMutation.mutateAsync({ id: leaveId, leaveFor });
        showToast("Leave rejected", "error");
      }
      refetch();
    } catch (err) {
      showToast(err?.response?.data?.message || "Something went wrong", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const TABS = [
    { key: "employee", label: "Employee Leaves", count: employeeLeaves.length },
    { key: "admin",    label: "Admin Leaves",    count: adminLeaves.length    },
  ];

  const totalPending =
    employeeLeaves.filter(l => l.status === "forwarded_reporting_manager").length +
    adminLeaves.filter(l => l.status === "pending_reporting_manager").length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#F7F3FC 0%,#F0EBF8 50%,#F4F0FA 100%)",
      fontFamily: "'DM Sans',sans-serif",
      padding: "32px 36px",
    }}>
      <GlobalStyles />

      {/* Decorative blobs */}
      <div style={{ position: "fixed", top: -80, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(205,22,110,0.07) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: -60, left: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(115,0,66,0.06) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Icon */}
            <div style={{
              width: 54, height: 54, borderRadius: 18,
              background: "linear-gradient(135deg,#730042,#CD166E)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 22px rgba(115,0,66,0.38)",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="3.5" stroke="white" strokeWidth="1.6" />
                <path d="M3 10h18" stroke="white" strokeWidth="1.6" />
                <path d="M8 2v4M16 2v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M8 14h4M8 17h8" stroke="rgba(255,255,255,0.75)" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C1028", margin: 0, fontFamily: "'Playfair Display',serif", letterSpacing: "-.3px" }}>
                  Leave Management
                </h1>
                {/* Super Admin crown badge */}
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: "linear-gradient(135deg,#730042,#CD166E)",
                  color: "#fff", fontFamily: "'DM Sans',sans-serif",
                  boxShadow: "0 2px 8px rgba(115,0,66,0.3)",
                }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1 8L2.5 3L5 6L7.5 2L9 8H1Z" fill="rgba(255,255,255,0.9)" />
                  </svg>
                  Super Admin
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#9B8BAE", margin: "3px 0 0", fontWeight: 400 }}>
                Final approval authority · All leave requests across the organisation
              </p>
            </div>
          </div>

          {/* Pending badge + profile chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {totalPending > 0 && (
              <div style={{
                background: "linear-gradient(135deg,#FFF0F7,#FFE4F2)",
                border: "1px solid #FFB3D9",
                borderRadius: 12, padding: "10px 16px",
                display: "flex", alignItems: "center", gap: 8,
                boxShadow: "0 2px 10px rgba(115,0,66,0.12)",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#CD166E", animation: "pulse 2s ease infinite" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#730042", fontFamily: "'DM Sans',sans-serif" }}>
                  {totalPending} pending action{totalPending > 1 ? "s" : ""}
                </span>
              </div>
            )}
            <div style={{
              background: "#fff", border: "1px solid rgba(200,185,220,0.4)",
              borderRadius: 14, padding: "10px 16px",
              display: "flex", alignItems: "center", gap: 10,
              boxShadow: "0 2px 12px rgba(80,40,100,0.08)",
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "linear-gradient(135deg,#730042,#CD166E)",
                color: "#fff", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>SA</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#1C1028" }}>Super Admin</div>
                <div style={{ fontSize: 10, color: "#9B8BAE", marginTop: 1 }}>Full Access · Final Approver</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display: "flex", gap: 4,
          background: "rgba(235,228,245,0.7)",
          backdropFilter: "blur(8px)",
          borderRadius: 14, padding: 4,
          marginBottom: 28, width: "fit-content",
          border: "1px solid rgba(200,185,220,0.3)",
          boxShadow: "0 2px 8px rgba(80,40,100,0.06)",
        }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} className="sa-tab-btn"
                style={{
                  color:      active ? "#fff"    : "#9B8BAE",
                  background: active ? "linear-gradient(135deg,#730042,#CD166E)" : "transparent",
                  fontWeight: active ? 600 : 400,
                  boxShadow:  active ? "0 3px 12px rgba(115,0,66,0.32)" : "none",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span style={{
                  background: active ? "rgba(255,255,255,0.22)" : "#EDE6F5",
                  color:      active ? "#fff" : "#9B8BAE",
                  borderRadius: 10, padding: "1px 7px",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Panels */}
        {tab === "employee" && (
          <EmployeeLeavesTab
            leaves={employeeLeaves}
            isLoading={isLoading}
            processingId={processingId}
            onAction={handleAction}
          />
        )}
        {tab === "admin" && (
          <AdminLeavesTab
            leaves={adminLeaves}
            isLoading={isLoading}
            processingId={processingId}
            onAction={handleAction}
          />
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
};

export default SuperAdminLeaveTable;