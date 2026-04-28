import React, { useState, useEffect } from "react";
import {
  useGetAllManagerLeaves,
  useAcceptLeaveRequest,
  useRejectLeaveRequest,
  useForwardLeaveToAdmin,
  useGetMyLeavesManager,
  useApplyLeaveManager,
} from "../../auth/server-state/manager/managerleave/managerleave.hook";

import { useNavigate } from "react-router-dom";
const S = {
  /* Layout */
  root: {
    minHeight: "100vh",
    background: "#F4F1F8",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: "28px 32px",
  },
  /* Top header */
  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "linear-gradient(135deg,#7B1A4B,#A8295E)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 14px rgba(123,26,75,0.35)",
  },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#1A1028", margin: 0 },
  pageSubtitle: { fontSize: 12, color: "#8B7FA0", marginTop: 2 },
  /* Tabs */
  tabBar: {
    display: "flex",
    gap: 4,
    background: "#EBE5F2",
    borderRadius: 12,
    padding: 4,
    marginBottom: 26,
    width: "fit-content",
  },
  tab: (active) => ({
    padding: "8px 20px",
    borderRadius: 9,
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    color: active ? "#fff" : "#8B7FA0",
    background: active ? "linear-gradient(135deg,#7B1A4B,#A8295E)" : "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all .2s",
    boxShadow: active ? "0 2px 10px rgba(123,26,75,0.3)" : "none",
    whiteSpace: "nowrap",
  }),
  /* Filter chips */
  filterRow: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  chip: (active) => ({
    padding: "5px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    border: active ? "1.5px solid #7B1A4B" : "1.5px solid #E0D8EE",
    background: active ? "#F5ECF2" : "#fff",
    color: active ? "#7B1A4B" : "#8B7FA0",
    transition: "all .15s",
  }),
  /* Cards */
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #EDE6F5",
    padding: "18px 20px",
    marginBottom: 12,
    boxShadow: "0 1px 4px rgba(123,26,75,0.06)",
  },
  /* Leave card inner */
  leaveTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  avatar: (color) => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    background: color,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  }),
  empName: { fontSize: 14, fontWeight: 600, color: "#1A1028" },
  empRole: { fontSize: 11, color: "#8B7FA0", marginTop: 1 },
  /* Badges */
  badge: (bg, color) => ({
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: bg,
    color: color,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  }),
  metaRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 },
  dateText: { fontSize: 12, color: "#8B7FA0", marginTop: 6 },
  reasonBox: {
    background: "#F8F5FC",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    color: "#4A3860",
    marginTop: 8,
    borderLeft: "3px solid #D4AECB",
  },
  /* Action buttons */
  actions: { display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" },
  actionBtn: (bg, color, hoverBg) => ({
    padding: "6px 13px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: bg,
    color: color,
    transition: "all .15s",
    display: "flex",
    alignItems: "center",
    gap: 4,
  }),
  /* Stats grid */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    marginBottom: 20,
  },
  statCard: (accent) => ({
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #EDE6F5",
    padding: "18px 20px",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(123,26,75,0.06)",
  }),
  statAccent: (color) => ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: color,
    borderRadius: "16px 16px 0 0",
  }),
  statNum: (color) => ({
    fontSize: 32,
    fontWeight: 800,
    color: color,
    lineHeight: 1,
    marginTop: 4,
  }),
  statLabel: { fontSize: 11, color: "#8B7FA0", marginTop: 4, fontWeight: 500 },
  progressTrack: {
    height: 5,
    background: "#F0EAF8",
    borderRadius: 10,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: (pct, color) => ({
    height: "100%",
    width: `${Math.max(pct, 4)}%`,
    background: color,
    borderRadius: 10,
    transition: "width .6s ease",
  }),
  /* Summary table */
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 600,
    color: "#8B7FA0",
    textTransform: "uppercase",
    letterSpacing: ".5px",
    background: "#FAF7FD",
    borderBottom: "1px solid #EDE6F5",
  },
  td: {
    padding: "11px 12px",
    borderBottom: "1px solid #F5F0FA",
    color: "#1A1028",
    verticalAlign: "middle",
  },
  /* Form */
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  formLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#4A3860",
    textTransform: "uppercase",
    letterSpacing: ".4px",
  },
  formInput: {
    padding: "10px 14px",
    border: "1.5px solid #E0D8EE",
    borderRadius: 10,
    fontSize: 13,
    color: "#1A1028",
    background: "#FDFBFF",
    outline: "none",
    transition: "border .2s",
    width: "100%",
    boxSizing: "border-box",
  },
  formTextarea: {
    padding: "10px 14px",
    border: "1.5px solid #E0D8EE",
    borderRadius: 10,
    fontSize: 13,
    color: "#1A1028",
    background: "#FDFBFF",
    outline: "none",
    minHeight: 90,
    resize: "vertical",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },
  /* Buttons */
  btnPrimary: {
    padding: "10px 24px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    background: "linear-gradient(135deg,#7B1A4B,#A8295E)",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 3px 12px rgba(123,26,75,0.3)",
    transition: "all .15s",
  },
  btnSecondary: {
    padding: "10px 24px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    background: "#F5ECF2",
    color: "#7B1A4B",
    border: "1.5px solid #D4AECB",
    cursor: "pointer",
    transition: "all .15s",
  },
  /* Info note */
  infoNote: {
    background: "#FFF8EC",
    border: "1px solid #F0D89A",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 12,
    color: "#7A5C1A",
    lineHeight: 1.6,
    marginTop: 16,
  },
  /* Loading / Empty */
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 0",
    gap: 14,
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #EDE6F5",
    borderTop: "3px solid #7B1A4B",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  emptyWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "50px 0",
    gap: 10,
  },
  /* Toast */
  toast: (visible, type) => ({
    position: "fixed",
    bottom: 28,
    right: 28,
    padding: "12px 20px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all .3s cubic-bezier(.34,1.56,.64,1)",
    transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(.95)",
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    background:
      type === "success" ? "#EDFFF5" : type === "error" ? "#FFF0F0" : "#EFF6FF",
    color:
      type === "success" ? "#166534" : type === "error" ? "#991B1B" : "#1E40AF",
    border: `1px solid ${
      type === "success" ? "#86EFAC" : type === "error" ? "#FCA5A5" : "#93C5FD"
    }`,
  }),
};

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const LEAVE_META = {
  el: { label: "Earned Leave", short: "EL", bg: "#DCFCE7", color: "#15803D", accent: "#22C55E" },
  sl: { label: "Sick Leave", short: "SL", bg: "#DBEAFE", color: "#1D4ED8", accent: "#3B82F6" },
  pl: { label: "Privilege Leave", short: "PL", bg: "#FEF3C7", color: "#92400E", accent: "#F59E0B" },
  ml: { label: "Maternity Leave", short: "ML", bg: "#F3E8FF", color: "#6B21A8", accent: "#A855F7" },
  cl: { label: "Casual Leave", short: "CL", bg: "#FCE7F3", color: "#9D174D", accent: "#EC4899" },
};

const STATUS_META = {
  pending: { label: "Pending", bg: "#FEF9C3", color: "#854D0E" },
  approved_manager: { label: "Approved", bg: "#DCFCE7", color: "#15803D" },
  rejected_manager: { label: "Rejected", bg: "#FEE2E2", color: "#991B1B" },
  forwarded_admin: { label: "Forwarded to Admin", bg: "#DBEAFE", color: "#1D4ED8" },
  approved_admin: { label: "Admin Approved", bg: "#DCFCE7", color: "#15803D" },
  rejected_admin: { label: "Admin Rejected", bg: "#FEE2E2", color: "#991B1B" },
};

const AVATAR_COLORS = [
  "linear-gradient(135deg,#7B1A4B,#A8295E)",
  "linear-gradient(135deg,#1D4ED8,#3B82F6)",
  "linear-gradient(135deg,#065F46,#10B981)",
  "linear-gradient(135deg,#92400E,#F59E0B)",
  "linear-gradient(135deg,#6B21A8,#A855F7)",
  "linear-gradient(135deg,#1E40AF,#60A5FA)",
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved_manager", label: "Approved" },
  { key: "rejected_manager", label: "Rejected" },
  { key: "forwarded_admin", label: "Forwarded" },
];

/* ─────────────────────────────────────────────
   HELPER FUNCTIONS
───────────────────────────────────────────── */
const initials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();
const avatarColor = (name = "") =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
const daysDiff = (s, e) => {
  if (!s || !e) return 0;
  const diff = (new Date(e) - new Date(s)) / 86400000;
  return Math.max(Math.round(diff) + 1, 1);
};

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

/* Spinner */
const Spinner = () => (
  <>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={S.loadingWrap}>
      <div style={S.spinner} />
      <p style={{ fontSize: 13, color: "#8B7FA0" }}>Loading leave requests…</p>
    </div>
  </>
);

/* Empty state */
const EmptyState = ({ msg = "No records found" }) => (
  <div style={S.emptyWrap}>
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <rect x="8" y="10" width="36" height="34" rx="6" stroke="#D4AECB" strokeWidth="1.5" fill="#FAF5FD" />
      <rect x="14" y="20" width="16" height="2" rx="1" fill="#D4AECB" />
      <rect x="14" y="26" width="24" height="2" rx="1" fill="#E8DEF0" />
      <rect x="14" y="32" width="20" height="2" rx="1" fill="#E8DEF0" />
    </svg>
    <p style={{ fontSize: 13, color: "#8B7FA0", fontWeight: 500 }}>{msg}</p>
  </div>
);

/* Toast */
const Toast = ({ toast }) => (
  <div style={S.toast(toast.visible, toast.type)}>
    {toast.type === "success" && (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="#22C55E" />
        <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )}
    {toast.type === "error" && (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="#EF4444" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )}
    {toast.type === "info" && (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="#3B82F6" />
        <path d="M8 7v5M8 5.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )}
    {toast.message}
  </div>
);

/* Leave type badge */
const TypeBadge = ({ type }) => {
  const m = LEAVE_META[type] || { label: type?.toUpperCase(), bg: "#F3F4F6", color: "#374151" };
  return <span style={S.badge(m.bg, m.color)}>{m.label}</span>;
};

/* Status badge */
const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, bg: "#F3F4F6", color: "#374151" };
  return <span style={S.badge(m.bg, m.color)}>{m.label}</span>;
};

/* ─────────────────────────────────────────────
   EMPLOYEE LEAVES PANEL
───────────────────────────────────────────── */
const EmployeeLeavesPanel = ({ showToast }) => {
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState(null);

  const { data: leaves = [], isLoading, refetch } = useGetAllManagerLeaves();
  const acceptMutation = useAcceptLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();
  const forwardMutation = useForwardLeaveToAdmin();

  const filtered =
    filter === "all"
      ? leaves
      : leaves.filter((l) => l.status === filter);

  const handleAction = async (leaveId, action) => {
    setProcessingId(leaveId);
    try {
      if (action === "accept") {
        await acceptMutation.mutateAsync({ leaveId });
        showToast("Leave approved successfully", "success");
      } else if (action === "reject") {
        await rejectMutation.mutateAsync({ leaveId });
        showToast("Leave request rejected", "error");
      } else if (action === "forward") {
        await forwardMutation.mutateAsync({ leaveId });
        showToast("Forwarded to admin", "info");
      }
      refetch();
    } catch (err) {
      showToast(err?.response?.data?.message || "Something went wrong", "error");
    } finally {
      setProcessingId(null);
    }
  };

  /* Counts for filter chip badges */
  const count = (key) =>
    key === "all" ? leaves.length : leaves.filter((l) => l.status === key).length;

  if (isLoading) return <Spinner />;

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total", val: leaves.length, color: "#7B1A4B" },
          {
            label: "Pending",
            val: leaves.filter((l) => l.status === "pending").length,
            color: "#B45309",
          },
          {
            label: "Approved",
            val: leaves.filter((l) => l.status.startsWith("approved")).length,
            color: "#15803D",
          },
          {
            label: "Forwarded",
            val: leaves.filter((l) => l.status === "forwarded_admin").length,
            color: "#1D4ED8",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              border: "1px solid #EDE6F5",
              borderRadius: 12,
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 1px 4px rgba(123,26,75,0.05)",
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</span>
            <span style={{ fontSize: 12, color: "#8B7FA0", fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={S.filterRow}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            style={S.chip(filter === f.key)}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span
              style={{
                marginLeft: 4,
                background: filter === f.key ? "#7B1A4B" : "#EDE6F5",
                color: filter === f.key ? "#fff" : "#8B7FA0",
                borderRadius: 10,
                padding: "0 6px",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {count(f.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Leave cards */}
      {filtered.length === 0 ? (
        <EmptyState msg={`No ${filter === "all" ? "" : filter.replace("_", " ")} leave requests`} />
      ) : (
        filtered.map((leave, idx) => {
          const emp = leave.employee || {};
          const isPending = leave.status === "pending";
          const isProcessing = processingId === leave._id;
          const days = leave.days || daysDiff(leave.startDate, leave.endDate);

          return (
            <div
              key={leave._id}
              style={{
                ...S.card,
                opacity: isProcessing ? 0.6 : 1,
                transition: "all .2s",
                pointerEvents: isProcessing ? "none" : "auto",
              }}
            >
              <div style={S.leaveTop}>
                {/* Left: employee info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={S.avatar(avatarColor(emp.f_name || "A"))}>
                      {initials(emp.f_name, emp.l_name)}
                    </div>
                    <div>
                      <div style={S.empName}>
                        {emp.f_name} {emp.l_name}
                      </div>
                      <div style={S.empRole}>{emp.role || emp.work_email}</div>
                    </div>
                  </div>

                  <div style={S.metaRow}>
                    <TypeBadge type={leave.leaveType} />
                    <StatusBadge status={leave.status} />
                    <span
                      style={S.badge("#F5F0FA", "#6B4E8A")}
                    >
                      {days} day{days > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div style={S.dateText}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{ marginRight: 4, verticalAlign: "middle" }}
                    >
                      <rect x="1" y="2" width="10" height="9" rx="2" stroke="#8B7FA0" strokeWidth="1" />
                      <path d="M1 5h10" stroke="#8B7FA0" strokeWidth="1" />
                      <path d="M4 1v2M8 1v2" stroke="#8B7FA0" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                    {formatDate(leave.startDate)} — {formatDate(leave.endDate)}
                  </div>

                  {leave.reason && (
                    <div style={S.reasonBox}>
                      <strong style={{ color: "#7B1A4B" }}>Reason: </strong>
                      {leave.reason}
                    </div>
                  )}
                </div>

                {/* Right: action buttons (only for pending) */}
                {isPending && (
                  <div style={S.actions}>
                    <button
                      style={S.actionBtn("#DCFCE7", "#15803D")}
                      onClick={() => handleAction(leave._id, "accept")}
                      title="Approve leave"
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 6.5l3 3 6-6" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Approve
                    </button>
                    <button
                      style={S.actionBtn("#FEE2E2", "#991B1B")}
                      onClick={() => handleAction(leave._id, "reject")}
                      title="Reject leave"
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M3 3l7 7M10 3l-7 7" stroke="#991B1B" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Reject
                    </button>
                    <button
                      style={S.actionBtn("#DBEAFE", "#1D4ED8")}
                      onClick={() => handleAction(leave._id, "forward")}
                      title="Forward to admin"
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 6.5h9M7 3l4 3.5L7 10" stroke="#1D4ED8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Forward
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   MY LEAVE BALANCE PANEL
───────────────────────────────────────────── */
const MyBalancePanel = () => {
  const { data: balances = [], isLoading } = useGetMyLeavesManager();

  if (isLoading) return <Spinner />;
  if (!balances.length) return <EmptyState msg="No leave balance found" />;

  const balance = balances[0];

  const leaveStats = [
    {
      key: "el",
      label: "Earned Leave",
      total: balance.elTotal ?? 18,
      used: balance.elUsed ?? 0,
      accrued: balance.elAccrued ?? 1.5,
      accent: "#22C55E",
    },
    {
      key: "sl",
      label: "Sick Leave",
      total: balance.slTotal ?? 12,
      used: balance.slUsed ?? 0,
      accrued: balance.slAccrued ?? 0,
      accent: "#3B82F6",
    },
    {
      key: "pl",
      label: "Privilege Leave",
      total: balance.plTotal ?? 0,
      used: balance.plUsed ?? 0,
      accrued: balance.plAccrued ?? 0,
      accent: "#F59E0B",
    },
    {
      key: "ml",
      label: "Maternity Leave",
      total: balance.mlTotal ?? 0,
      used: balance.mlUsed ?? 0,
      accrued: balance.mlAccrued ?? 0,
      accent: "#A855F7",
    },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div style={S.statsGrid}>
        {leaveStats.map((s) => {
          const remaining = s.total - s.used;
          const pct = s.total > 0 ? (s.used / s.total) * 100 : 0;
          return (
            <div key={s.key} style={S.statCard()}>
              <div style={S.statAccent(s.accent)} />
              <div style={{ fontSize: 11, color: "#8B7FA0", fontWeight: 600, marginTop: 6 }}>
                {s.label}
              </div>
              <div style={S.statNum(s.accent)}>{remaining}</div>
              <div style={{ fontSize: 10, color: "#8B7FA0", marginTop: 2 }}>
                remaining of {s.total}
              </div>
              <div style={S.progressTrack}>
                <div style={S.progressFill(pct, s.accent)} />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#8B7FA0",
                  marginTop: 5,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Accrued: {s.accrued}</span>
                <span>{s.used} used</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed table */}
      <div style={S.card}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#1A1028",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 4,
              height: 16,
              background: "linear-gradient(#7B1A4B,#A8295E)",
              borderRadius: 2,
              display: "inline-block",
            }}
          />
          Leave Balance — FY 2025–26
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              {["Leave Type", "Total", "Accrued", "Used", "Remaining", "Status"].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaveStats.map((s) => {
              const rem = s.total - s.used;
              const pct = s.total > 0 ? Math.round((rem / s.total) * 100) : 0;
              return (
                <tr key={s.key}>
                  <td style={S.td}>
                    <TypeBadge type={s.key} />
                  </td>
                  <td style={{ ...S.td, fontWeight: 600 }}>{s.total}</td>
                  <td style={S.td}>{s.accrued}</td>
                  <td style={S.td}>{s.used}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: s.accent }}>{rem}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, ...S.progressTrack }}>
                        <div style={S.progressFill(pct, s.accent)} />
                      </div>
                      <span style={{ fontSize: 11, color: "#8B7FA0" }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {balance.mlStartDate && (
        <div
          style={{
            ...S.card,
            background: "#F3E8FF",
            border: "1px solid #DDD6FE",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="#7C3AED" strokeWidth="1.5" />
            <path d="M10 6v5l3 2" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#6B21A8" }}>
              Active Maternity Leave
            </div>
            <div style={{ fontSize: 11, color: "#7C3AED", marginTop: 2 }}>
              {formatDate(balance.mlStartDate)} — {formatDate(balance.mlEndDate)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   APPLY LEAVE PANEL
───────────────────────────────────────────── */
const ApplyLeavePanel = ({ showToast }) => {
  const [form, setForm] = useState({
    leaveType: "el",
    durationType: "full",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [errors, setErrors] = useState({});
  const applyMutation = useApplyLeaveManager();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.startDate) e.startDate = "Start date is required";
    if (!form.endDate) e.endDate = "End date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "End date must be after start date";
    if (!form.reason.trim()) e.reason = "Please enter a reason";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await applyMutation.mutateAsync(form);
      showToast("Leave request submitted to admin", "success");
      setForm({ leaveType: "el", durationType: "full", startDate: "", endDate: "", reason: "" });
      setErrors({});
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to submit leave", "error");
    }
  };

  const days =
    form.startDate && form.endDate
      ? daysDiff(form.startDate, form.endDate)
      : 0;

  const inputStyle = (key) => ({
    ...S.formInput,
    borderColor: errors[key] ? "#FCA5A5" : "#E0D8EE",
  });

  return (
    <div>
      <div style={S.card}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#1A1028",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 4,
              height: 16,
              background: "linear-gradient(#7B1A4B,#A8295E)",
              borderRadius: 2,
              display: "inline-block",
            }}
          />
          New Leave Request
        </div>

        <div style={S.formGrid}>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Leave Type</label>
            <select
              value={form.leaveType}
              onChange={(e) => set("leaveType", e.target.value)}
              style={S.formInput}
            >
              {Object.entries(LEAVE_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} ({v.short})
                </option>
              ))}
            </select>
          </div>

          <div style={S.formGroup}>
            <label style={S.formLabel}>Duration</label>
            <select
              value={form.durationType}
              onChange={(e) => set("durationType", e.target.value)}
              style={S.formInput}
            >
              <option value="full">Full Day</option>
              <option value="half">Half Day</option>
            </select>
          </div>

          <div style={S.formGroup}>
            <label style={S.formLabel}>Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              style={inputStyle("startDate")}
            />
            {errors.startDate && (
              <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.startDate}</span>
            )}
          </div>

          <div style={S.formGroup}>
            <label style={S.formLabel}>End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              style={inputStyle("endDate")}
            />
            {errors.endDate && (
              <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.endDate}</span>
            )}
          </div>
        </div>

        {/* Duration preview */}
        {days > 0 && (
          <div
            style={{
              background: "#F5ECF2",
              border: "1px solid #D4AECB",
              borderRadius: 10,
              padding: "10px 16px",
              fontSize: 13,
              color: "#7B1A4B",
              fontWeight: 600,
              margin: "12px 0",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#7B1A4B" strokeWidth="1.2" />
              <path d="M7 4v3.5l2 1.5" stroke="#7B1A4B" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {days} day{days > 1 ? "s" : ""} · {form.durationType === "half" ? "Half day" : "Full day"} ·{" "}
            {LEAVE_META[form.leaveType]?.label}
          </div>
        )}

        <div style={{ ...S.formGroup, marginTop: 4 }}>
          <label style={S.formLabel}>Reason</label>
          <textarea
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
            placeholder="Briefly explain the reason for your leave..."
            style={{ ...S.formTextarea, borderColor: errors.reason ? "#FCA5A5" : "#E0D8EE" }}
          />
          {errors.reason && (
            <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.reason}</span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 18,
          }}
        >
          <button
            style={S.btnSecondary}
            onClick={() => {
              setForm({ leaveType: "el", durationType: "full", startDate: "", endDate: "", reason: "" });
              setErrors({});
            }}
          >
            Clear
          </button>
          <button
            style={{
              ...S.btnPrimary,
              opacity: applyMutation.isLoading ? 0.7 : 1,
              cursor: applyMutation.isLoading ? "not-allowed" : "pointer",
            }}
            onClick={handleSubmit}
            disabled={applyMutation.isLoading}
          >
            {applyMutation.isLoading ? "Submitting…" : "Submit to Admin →"}
          </button>
        </div>
      </div>

      {/* Note */}
      <div style={S.infoNote}>
        <strong>Note: </strong>As a manager (MGMT08), your leave requests are forwarded directly to
        the admin for approval. Please ensure adequate team coverage before applying. Emergency
        contact: 5256115615451.
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const LeaveTablema = () => {
  const [tab, setTab] = useState("employee");
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3200);
  };

  const TABS = [
    { key: "employee", label: "Employee Leaves" },
    { key: "mybalance", label: "My Balance" },
    { key: "apply", label: "Apply Leave" },
  ];

  return (
    <div style={S.root}>
      {/* Page header */}
      <div style={S.pageHeader}>
        <div style={S.headerLeft}>
          <div style={S.headerIcon}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="4" width="16" height="15" rx="3" stroke="white" strokeWidth="1.5" />
              <path d="M3 9h16" stroke="white" strokeWidth="1.5" />
              <path d="M7 2v4M15 2v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M7 13h4M7 16h8" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 style={S.pageTitle}>Leave Management</h1>
            <p style={S.pageSubtitle}>Manage employee leaves & track your balance</p>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #EDE6F5",
            borderRadius: 10,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#4A3860",
            boxShadow: "0 1px 4px rgba(123,26,75,0.06)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg,#7B1A4B,#A8295E)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            AG
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 12, color: "#1A1028" }}>ashish gangwar</div>
            <div style={{ fontSize: 10, color: "#8B7FA0" }}>MGMT08 · HR Executive</div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={S.tabBar}>
        {TABS.map((t) => (
          <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {tab === "employee" && <EmployeeLeavesPanel showToast={showToast} />}
      {tab === "mybalance" && <MyBalancePanel />}
      {tab === "apply" && <ApplyLeavePanel showToast={showToast} />}

      {/* Toast */}
      <Toast toast={toast} />
    </div>
  );
};

export default LeaveTablema;