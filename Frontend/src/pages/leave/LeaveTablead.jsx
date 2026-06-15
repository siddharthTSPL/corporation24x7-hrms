import React, { useState } from "react";
import { useGetMeAdmin } from "../../auth/server-state/adminauth/adminauth.hook";
import {
  useGetForwardedLeaves,
  useAcceptLeave,
  useRejectLeave,
  useAdminApplyLeave,
  useAdminGetMyLeaveHistory,
} from "../../auth/server-state/adminleave/adminleave.hook";
import {
  useAdminApplyWFH,
  useAdminGetMyWFH,
  useAdminGetForwardedWFH,
  useAdminApproveForwardedWFH,
  useAdminRejectForwardedWFH,
} from "../../auth/server-state/adminwfh/adminwfh.hook";

const LEAVE_META = {
  el:          { label: "Earned Leave",    short: "EL",  bg: "#DCFCE7", color: "#14803D", accent: "#22C55E", dot: "#16A34A" },
  sl:          { label: "Sick Leave",      short: "SL",  bg: "#DBEAFE", color: "#1D4ED8", accent: "#3B82F6", dot: "#2563EB" },
  ml:          { label: "Maternity Leave", short: "ML",  bg: "#F3E8FF", color: "#6B21A8", accent: "#A855F7", dot: "#7C3AED" },
  pl:          { label: "Paternity Leave", short: "PL",  bg: "#FEF3C7", color: "#92400E", accent: "#F59E0B", dot: "#D97706" },
  half_day_el: { label: "Half Day EL",     short: "½EL", bg: "#ECFDF5", color: "#065F46", accent: "#10B981", dot: "#059669" },
  half_day_sl: { label: "Half Day SL",     short: "½SL", bg: "#EFF6FF", color: "#1E40AF", accent: "#60A5FA", dot: "#3B82F6" },
};

const STATUS_LABEL_MAP = {
  pending_manager:             "Pending (Manager)",
  approved_manager:            "Approved by Manager",
  rejected_manager:            "Rejected by Manager",
  forwarded_admin:             "Forwarded to Admin",
  forwarded_reporting_manager: "Forwarded to Reporting Manager",
  approved_admin:              "Approved by Admin",
  rejected_admin:              "Rejected by Admin",
  approved_reporting_manager:  "Approved by RM",
  rejected_reporting_manager:  "Rejected by RM",
  pending_reporting_manager:   "Pending (Reporting Manager)",
  pending_admin:               "Pending (Admin)",
  pending_superadmin:          "Pending (Super Admin)",
  approved_superadmin:         "Approved by Super Admin",
  rejected_superadmin:         "Rejected by Super Admin",
};

const humanStatus = (status) =>
  STATUS_LABEL_MAP[status] || (status || "Unknown").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const LEAVE_STATUS_META = {
  pending_manager:             { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  approved_manager:            { bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_manager:            { bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  forwarded_admin:             { bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  forwarded_reporting_manager: { bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  approved_admin:              { bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_admin:              { bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  approved_reporting_manager:  { bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_reporting_manager:  { bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  pending_reporting_manager:   { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  pending_admin:               { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
};

const WFH_STATUS_META = {
  pending_admin:               { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  approved_admin:              { bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_admin:              { bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  pending_superadmin:          { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  approved_superadmin:         { bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_superadmin:         { bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  forwarded_reporting_manager: { bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
};

const LEAVE_FILTERS = [
  { key: "all",       label: "All"       },
  { key: "pending",   label: "Pending"   },
  { key: "approved",  label: "Approved"  },
  { key: "rejected",  label: "Rejected"  },
  { key: "forwarded", label: "Forwarded" },
];

const BASE_LEAVE_TYPES = [
  { value: "el",          label: "Earned Leave"  },
  { value: "sl",          label: "Sick Leave"    },
  { value: "half_day_el", label: "Half Day EL"   },
  { value: "half_day_sl", label: "Half Day SL"   },
];

const AVATAR_COLORS = [
  "linear-gradient(135deg,#6B1A4A,#A8295E)",
  "linear-gradient(135deg,#1D4ED8,#3B82F6)",
  "linear-gradient(135deg,#065F46,#10B981)",
  "linear-gradient(135deg,#92400E,#F59E0B)",
  "linear-gradient(135deg,#6B21A8,#A855F7)",
];

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const daysDiff = (s, e) => {
  if (!s || !e) return 0;
  const n = Math.floor((new Date(e) - new Date(s)) / 86400000) + 1;
  return n > 0 ? n : 0;
};

const todayStr = () => new Date().toISOString().split("T")[0];
const avatarColor = (name = "") => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();

const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div
      className="w-10 h-10 rounded-full border-[3px] border-[#EDE6F5] animate-spin"
      style={{ borderTopColor: "#8B3A8A" }}
    />
    <p className="text-[13px] text-[#9B8BAE] font-medium font-[DM_Sans,sans-serif]">Loading…</p>
  </div>
);

const EmptyState = ({ msg = "No records found" }) => (
  <div className="flex flex-col items-center py-14 gap-3">
    <div
      className="w-14 h-14 rounded-[18px] flex items-center justify-center"
      style={{ background: "linear-gradient(135deg,#F4EEF9,#EDE4F5)" }}
    >
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="5" width="20" height="19" rx="4" stroke="#C4AADA" strokeWidth="1.5" fill="none" />
        <path d="M4 11h20" stroke="#C4AADA" strokeWidth="1.5" />
        <path d="M9 8V5M19 8V5" stroke="#C4AADA" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 16h6M9 20h10" stroke="#D4BFEA" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
    <p className="text-[13px] text-[#9B8BAE] font-medium">{msg}</p>
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
    <div
      className="fixed bottom-7 right-7 z-[9999] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-[13px] font-medium shadow-2xl backdrop-blur-md transition-all duration-300"
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        transform: toast.visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.94)",
        opacity: toast.visible ? 1 : 0,
        pointerEvents: toast.visible ? "auto" : "none",
      }}
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: c.icon }}
      >
        {toast.type === "success" && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>}
        {toast.type === "error"   && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>}
        {toast.type === "info"    && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 4v4M5 3v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>}
      </div>
      {toast.message}
    </div>
  );
};

const StatusBadge = ({ status, meta = LEAVE_STATUS_META }) => {
  const m = meta[status] || { bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: m.bg, color: m.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.dot }} />
      {humanStatus(status)}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const m = LEAVE_META[type] || { label: (type || "").toUpperCase(), bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: m.bg, color: m.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
};

const SectionBox = ({ title, children, rightEl }) => (
  <div
    className="rounded-[20px] overflow-hidden mb-5"
    style={{ background: "#fff", border: "1px solid rgba(200,185,220,0.3)", boxShadow: "0 2px 12px rgba(80,40,100,0.07)" }}
  >
    <div
      className="flex items-center justify-between px-5 py-[18px]"
      style={{ borderBottom: "1px solid #F0EAF8" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-[3px] h-[18px] rounded-sm align-middle"
          style={{ background: "linear-gradient(180deg,#6B1A4A,#A8295E)" }}
        />
        <span className="text-[14px] font-semibold text-[#1C1028]">{title}</span>
      </div>
      {rightEl}
    </div>
    <div className="px-5 pt-5 pb-6">{children}</div>
  </div>
);

const FormField = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-semibold text-[#6B5080] uppercase tracking-[0.5px]">
      {label} <span className="text-[#CD166E]">*</span>
    </label>
    {children}
    {error && <span className="text-[11px] text-[#EF4444]">{error}</span>}
  </div>
);

const buildTimeline = (leave) => {
  const steps = [];
  const status = leave.status || "";
  steps.push({ label: "Applied", desc: "Leave request submitted", date: leave.createdAt, done: true, color: "#8B3A8A" });
  const isApprovedByManager = ["approved_manager","forwarded_admin","forwarded_reporting_manager","approved_admin","rejected_admin","approved_reporting_manager","rejected_reporting_manager"].includes(status);
  const isRejectedByManager = status === "rejected_manager";
  const isPendingManager    = status === "pending_manager";
  if (isPendingManager) {
    steps.push({ label: "Manager Review", desc: "Awaiting manager decision", date: null, done: false, pending: true, color: "#F59E0B" });
  } else if (isRejectedByManager) {
    steps.push({ label: "Manager Review", desc: "Rejected by manager", date: leave.updatedAt, done: true, color: "#EF4444" });
  } else if (isApprovedByManager) {
    steps.push({ label: "Manager Review", desc: "Approved by manager", date: leave.updatedAt, done: true, color: "#22C55E" });
  }
  const isAdminPending  = ["forwarded_admin","forwarded_reporting_manager","pending_admin","pending_reporting_manager"].includes(status);
  const isAdminApproved = ["approved_admin","approved_reporting_manager"].includes(status);
  const isAdminRejected = ["rejected_admin","rejected_reporting_manager"].includes(status);
  if (isAdminPending) {
    steps.push({ label: "Admin Review", desc: "Awaiting admin approval", date: null, done: false, pending: true, color: "#F59E0B" });
  } else if (isAdminApproved) {
    steps.push({ label: "Admin Review", desc: "Approved by admin", date: leave.updatedAt, done: true, color: "#22C55E" });
    steps.push({ label: "Completed", desc: "Leave has been approved", date: leave.updatedAt, done: true, color: "#22C55E" });
  } else if (isAdminRejected) {
    steps.push({ label: "Admin Review", desc: "Rejected by admin", date: leave.updatedAt, done: true, color: "#EF4444" });
  }
  return steps;
};

const LeaveTimeline = ({ leave }) => {
  const steps = buildTimeline(leave);
  return (
    <div className="mt-3.5 pt-3.5" style={{ borderTop: "1px dashed #EDE6F5" }}>
      <div className="text-[11px] font-semibold text-[#9B8BAE] uppercase tracking-[0.5px] mb-3">
        Application Timeline
      </div>
      <div className="flex flex-col">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3 relative">
            <div className="flex flex-col items-center w-[18px]">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 relative z-10"
                style={{
                  background: step.done ? step.color : "#E0D0F0",
                  border: step.pending ? `2px solid ${step.color}` : "none",
                  animation: step.pending ? "pulse 1.5s ease infinite" : "none",
                }}
              />
              {i < steps.length - 1 && (
                <div
                  className="flex-1 w-0.5 mt-0.5"
                  style={{ background: "linear-gradient(180deg,#E0D0F0,#F0EAF8)", minHeight: 24 }}
                />
              )}
            </div>
            <div className={`flex-1 ${i < steps.length - 1 ? "pb-4" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: step.done ? "#1C1028" : "#9B8BAE" }}
                >
                  {step.label}
                </span>
                {step.pending && (
                  <span className="text-[10px] font-bold bg-[#FFFBEB] text-[#92400E] px-1.5 py-px rounded-[10px]">
                    In Progress
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#9B8BAE] mt-px">{step.desc}</div>
              {step.date && <div className="text-[10px] text-[#C4AADA] mt-0.5">{fmtDateTime(step.date)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LeaveCard = ({ leave, onApprove, onReject, isProcessing, showActions, accentColor, personLabel, showTimeline }) => {
  const [expanded, setExpanded] = useState(false);
  const person = leave.employee || leave.manager || {};
  const days   = leave.days || daysDiff(leave.startDate, leave.endDate);
  const accent = accentColor || (LEAVE_META[leave.leaveType] || { accent: "#8B3A8A" }).accent;

  return (
    <div
      className="relative rounded-[20px] mb-3.5 overflow-hidden transition-all duration-[250ms] hover:-translate-y-px"
      style={{
        background: "#fff",
        border: "1px solid rgba(200,185,220,0.3)",
        padding: "22px 24px",
        boxShadow: "0 2px 12px rgba(80,40,100,0.07),0 1px 3px rgba(0,0,0,0.04)",
        opacity: isProcessing ? 0.6 : 1,
        pointerEvents: isProcessing ? "none" : "auto",
      }}
    >
      <div className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-[20px]" style={{ background: accent }} />
      <div className="flex justify-between items-start gap-4 pl-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0 text-[14px] font-bold text-white"
              style={{ background: avatarColor(person.f_name || "A"), boxShadow: "0 3px 10px rgba(0,0,0,0.15)" }}
            >
              {initials(person.f_name, person.l_name)}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="text-[14px] font-semibold text-[#1C1028]">{person.f_name} {person.l_name}</div>
                {personLabel && (
                  <span className="text-[10px] font-bold bg-[#F3E8FF] text-[#6B21A8] px-2 py-px rounded-[10px]">
                    {personLabel}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#9B8BAE] mt-0.5">{person.work_email}</div>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap mt-3">
            <TypeBadge type={leave.leaveType} />
            <StatusBadge status={leave.status} />
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: "#F4EEF9", color: "#6B1A4A" }}
            >
              {days} day{days > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#9B8BAE] mt-2.5">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1" /><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1" /><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round" /></svg>
            <span className="font-medium text-[#4A3860]">{fmt(leave.startDate)}</span>
            <span className="text-[10px] text-[#D4BFEA]">→</span>
            <span className="font-medium text-[#4A3860]">{fmt(leave.endDate)}</span>
          </div>
          {leave.reason && (
            <div
              className="rounded-[10px] px-3.5 py-2.5 text-[12px] text-[#4A3860] mt-2.5 leading-relaxed"
              style={{ background: "#FAF7FD", borderLeft: "3px solid #D4AECB" }}
            >
              <span className="font-semibold text-[#6B1A4A]">Reason — </span>{leave.reason}
            </div>
          )}
          {showTimeline && (
            <button
              onClick={() => setExpanded((p) => !p)}
              className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#8B3A8A] bg-transparent border-none cursor-pointer p-1 pl-0"
            >
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                className="transition-transform duration-200"
                style={{ transform: expanded ? "rotate(180deg)" : "none" }}
              >
                <path d="M2 4l4 4 4-4" stroke="#8B3A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {expanded ? "Hide timeline" : "View timeline"}
            </button>
          )}
          {showTimeline && expanded && <LeaveTimeline leave={leave} />}
        </div>
        {showActions && (
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={onApprove}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[12px] font-semibold cursor-pointer border-none transition-all duration-[180ms] hover:-translate-y-px"
              style={{ background: "#F0FDF4", color: "#14803D", boxShadow: "0 2px 8px rgba(34,197,94,0.15)" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5 5.5-5" stroke="#14803D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Approve
            </button>
            <button
              onClick={onReject}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[12px] font-semibold cursor-pointer border-none transition-all duration-[180ms] hover:-translate-y-px"
              style={{ background: "#FFF1F2", color: "#991B1B", boxShadow: "0 2px 8px rgba(239,68,68,0.12)" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round" /></svg>
              Reject
            </button>
          </div>
        )}
      </div>
      {isProcessing && (
        <div className="absolute inset-0 rounded-[20px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(2px)" }}>
          <div className="w-[22px] h-[22px] rounded-full border-2 border-[#EDE6F5] animate-spin" style={{ borderTopColor: "#8B3A8A" }} />
        </div>
      )}
    </div>
  );
};

const MyBalancePanel = ({ admin, leaveBalance }) => {
  if (!admin) return <Spinner />;
  const balance   = leaveBalance || {};
  const isMarried = admin.marital_status === "married";
  const showML    = admin.gender === "female" && isMarried;
  const showPL    = admin.gender === "male"   && isMarried;
  const cards = [
    { key: "el",  label: "Earned Leave",      entitled: balance.EL?.entitled || 0, availed: balance.EL?.availed || 0, accrued: balance.EL?.accrued || 0, accent: "#22C55E", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
    { key: "sl",  label: "Sick Leave",         entitled: balance.SL?.entitled || 0, availed: balance.SL?.availed || 0, accrued: 0,                         accent: "#3B82F6", bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
    { key: "pbc", label: "Paid by Company",    entitled: balance.pbc || 0,          availed: 0,                         accrued: 0,                         accent: "#6B1A4A", bg: "linear-gradient(135deg,#F9EFF5,#F4E6F0)" },
    { key: "lwp", label: "Leave Without Pay",  entitled: balance.lwp || 0,          availed: 0,                         accrued: 0,                         accent: "#CD166E", bg: "linear-gradient(135deg,#FDF2F8,#FCE7F3)" },
    ...(showML ? [{ key: "ml", label: "Maternity Leave", entitled: balance.ML || 0, availed: 0, accrued: 0, accent: "#A855F7", bg: "linear-gradient(135deg,#FAF5FF,#F3E8FF)" }] : []),
    ...(showPL ? [{ key: "pl", label: "Paternity Leave", entitled: balance.PL || 0, availed: 0, accrued: 0, accent: "#F59E0B", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" }] : []),
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((s, i) => {
          const remaining = s.entitled - s.availed;
          const pct = s.entitled > 0 ? Math.min((s.availed / s.entitled) * 100, 100) : 0;
          return (
            <div
              key={s.key}
              className="relative rounded-[20px] overflow-hidden transition-all duration-[250ms] hover:-translate-y-0.5"
              style={{
                background: "#fff",
                border: "1px solid rgba(200,185,220,0.3)",
                padding: "22px 22px 18px",
                boxShadow: "0 2px 12px rgba(80,40,100,0.07)",
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px]" style={{ background: s.accent }} />
              <div
                className="absolute right-[-8px] top-2.5 text-[52px] font-extrabold leading-none select-none"
                style={{ color: s.accent, opacity: 0.06, fontFamily: "Playfair Display, serif" }}
              >
                {(LEAVE_META[s.key] || { short: s.key.toUpperCase().slice(0, 2) }).short}
              </div>
              <div className="text-[11px] text-[#9B8BAE] font-semibold uppercase tracking-[0.5px] mt-2">{s.label}</div>
              <div className="text-[38px] font-bold leading-none my-1.5" style={{ color: s.accent, fontFamily: "Playfair Display, serif" }}>{remaining}</div>
              <div className="text-[10px] text-[#9B8BAE]">of {s.entitled} days</div>
              <div className="h-[5px] rounded-lg mt-3.5 overflow-hidden" style={{ background: "#F0EAF8" }}>
                <div className="h-full rounded-lg" style={{ width: `${Math.max(pct, 3)}%`, background: s.accent }} />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-[#9B8BAE]">
                {s.accrued > 0 && <span>Accrued: {s.accrued}</span>}
                <span className="ml-auto">{s.availed} used</span>
              </div>
            </div>
          );
        })}
      </div>

      <SectionBox title="Leave Balance Summary">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px]" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Leave Type", "Entitled", "Accrued", "Used", "Remaining", "Usage"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.7px]"
                    style={{ color: "#9B8BAE", background: "#FAF7FD", borderBottom: "1px solid #EDE6F5" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cards.map((s) => {
                const rem = s.entitled - s.availed;
                const pct = s.entitled > 0 ? Math.round((rem / s.entitled) * 100) : 0;
                const m   = LEAVE_META[s.key] || { label: s.label, bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };
                return (
                  <tr key={s.key} className="hover:bg-[#FDFBFF] transition-colors">
                    <td className="px-3.5 py-3" style={{ borderBottom: "1px solid #F5F0FA", color: "#1C1028", fontSize: 13 }}>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: m.bg, color: m.color }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.dot }} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-[13px]" style={{ borderBottom: "1px solid #F5F0FA", color: "#1C1028" }}>{s.entitled}</td>
                    <td className="px-3.5 py-3 text-[13px]" style={{ borderBottom: "1px solid #F5F0FA", color: "#1C1028" }}>{s.accrued || "—"}</td>
                    <td className="px-3.5 py-3 text-[13px]" style={{ borderBottom: "1px solid #F5F0FA", color: "#1C1028" }}>{s.availed}</td>
                    <td className="px-3.5 py-3 font-bold text-[15px]" style={{ borderBottom: "1px solid #F5F0FA", color: s.accent, fontFamily: "Playfair Display, serif" }}>{rem}</td>
                    <td className="px-3.5 py-3" style={{ borderBottom: "1px solid #F5F0FA" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-[5px] rounded-lg overflow-hidden" style={{ background: "#F0EAF8" }}>
                          <div className="h-full rounded-lg" style={{ width: `${pct}%`, background: s.accent }} />
                        </div>
                        <span className="text-[11px] text-[#9B8BAE]">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionBox>
    </div>
  );
};

const ApplyLeavePanel = ({ admin, leaveBalance, showToast }) => {
  const [form, setForm]     = useState({ leaveType: "el", startDate: "", endDate: "", reason: "" });
  const [errors, setErrors] = useState({});

  const { data: rawHistory, isLoading: histLoading, refetch } = useAdminGetMyLeaveHistory();
  const applyMut = useAdminApplyLeave();
  const history  = Array.isArray(rawHistory) ? rawHistory : [];

  const isMarried = admin?.marital_status === "married";
  const showML    = admin?.gender === "female" && isMarried;
  const showPL    = admin?.gender === "male"   && isMarried;

  const availTypes = [
    ...BASE_LEAVE_TYPES,
    ...(showML ? [{ value: "ml", label: "Maternity Leave" }] : []),
    ...(showPL ? [{ value: "pl", label: "Paternity Leave" }] : []),
  ];

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.leaveType) e.leaveType = "Select a leave type";
    if (!form.startDate) e.startDate = "Required";
    if (!form.endDate)   e.endDate   = "Required";
    if ((form.reason || "").trim().length < 10) e.reason = "Minimum 10 characters";
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) e.endDate = "End date cannot precede start date";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await applyMut.mutateAsync(form);
      showToast("Leave request submitted", "success");
      setForm({ leaveType: "el", startDate: "", endDate: "", reason: "" });
      setErrors({});
      refetch();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Something went wrong", "error");
    }
  };

  const days = daysDiff(form.startDate, form.endDate);
  const ib   = (k) => errors[k] ? "#FCA5A5" : "#E2D8EE";

  return (
    <div>
      <SectionBox title="New Leave Request">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <FormField label="Leave Type" error={errors.leaveType}>
            <select
              value={form.leaveType}
              onChange={(e) => set("leaveType", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[12px] text-[13px] text-[#1C1028] outline-none transition-all focus:ring-[3px] focus:ring-[rgba(139,58,138,0.10)]"
              style={{ background: "#FDFBFF", border: `1.5px solid ${ib("leaveType")}` }}
            >
              {availTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="Start Date" error={errors.startDate}>
            <input
              type="date" value={form.startDate} min={todayStr()}
              onChange={(e) => set("startDate", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[12px] text-[13px] text-[#1C1028] outline-none transition-all focus:ring-[3px] focus:ring-[rgba(139,58,138,0.10)]"
              style={{ background: "#FDFBFF", border: `1.5px solid ${ib("startDate")}` }}
            />
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input
              type="date" value={form.endDate} min={form.startDate || todayStr()}
              onChange={(e) => set("endDate", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[12px] text-[13px] text-[#1C1028] outline-none transition-all focus:ring-[3px] focus:ring-[rgba(139,58,138,0.10)]"
              style={{ background: "#FDFBFF", border: `1.5px solid ${ib("endDate")}` }}
            />
          </FormField>
        </div>
        {days > 0 && (
          <div
            className="flex items-center gap-2 rounded-[12px] px-4 py-3 text-[13px] font-semibold text-[#6B1A4A] mb-4"
            style={{ background: "linear-gradient(135deg,#F9EFF5,#F2E8F5)", border: "1px solid #DFD0EC" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="3" stroke="#9B2458" strokeWidth="1.3" /><path d="M1 6h12" stroke="#9B2458" strokeWidth="1.3" /><path d="M4 1v2M10 1v2" stroke="#9B2458" strokeWidth="1.3" strokeLinecap="round" /></svg>
            <strong style={{ fontFamily: "Playfair Display, serif", fontSize: 15 }}>{days}</strong>
            &nbsp;day{days > 1 ? "s" : ""} · {(LEAVE_META[form.leaveType] || {}).label || ""}
          </div>
        )}
        <FormField label="Reason" error={errors.reason}>
          <textarea
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
            placeholder="Briefly explain the reason for your leave…"
            className="w-full px-3.5 py-2.5 rounded-[12px] text-[13px] text-[#1C1028] outline-none transition-all resize-y leading-relaxed focus:ring-[3px] focus:ring-[rgba(139,58,138,0.10)]"
            style={{ background: "#FDFBFF", border: `1.5px solid ${ib("reason")}`, minHeight: 88 }}
          />
        </FormField>
        <p className="text-[11px] text-[#9B8BAE] mt-1 mb-4">{form.reason.length}/500 chars (min 10)</p>
        <div className="flex justify-end gap-2.5">
          <button
            onClick={() => { setForm({ leaveType: "el", startDate: "", endDate: "", reason: "" }); setErrors({}); }}
            className="px-6 py-2.5 rounded-[12px] text-[13px] font-medium cursor-pointer transition-all hover:brightness-95"
            style={{ background: "#F4EEF9", color: "#6B1A4A", border: "1.5px solid #DFD0EC" }}
          >
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={applyMut.isPending}
            className="px-6 py-2.5 rounded-[12px] text-[13px] font-semibold text-white cursor-pointer transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ background: "linear-gradient(135deg,#6B1A4A,#9B2458)", boxShadow: "0 4px 16px rgba(107,26,74,0.35)" }}
          >
            {applyMut.isPending ? "Submitting…" : "Submit Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox
        title="My Leave History"
        rightEl={
          history.length > 0 ? (
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-[#6B1A4A]"
              style={{ background: "linear-gradient(135deg,#F9EFF5,#F4E6F0)" }}>
              {history.length} record{history.length !== 1 ? "s" : ""}
            </span>
          ) : null
        }
      >
        {histLoading ? <Spinner /> : history.length === 0 ? <EmptyState msg="No leave records yet" /> : (
          <div>
            {history.map((leave, idx) => {
              const d      = leave.days || daysDiff(leave.startDate, leave.endDate);
              const accent = (LEAVE_META[leave.leaveType] || { accent: "#8B3A8A" }).accent;
              return (
                <div
                  key={leave._id || idx}
                  className="relative rounded-[16px] mb-2.5 overflow-hidden transition-all duration-[220ms] hover:-translate-y-px"
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(200,185,220,0.28)",
                    padding: "16px 18px",
                    boxShadow: "0 2px 10px rgba(80,40,100,0.06)",
                    animationDelay: `${idx * 0.05}s`,
                  }}
                >
                  <div className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-[16px]" style={{ background: accent }} />
                  <div className="flex justify-between items-start gap-3.5 pl-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-1.5 flex-wrap mb-2.5">
                        <TypeBadge type={leave.leaveType} />
                        <StatusBadge status={leave.status} />
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "#F4EEF9", color: "#6B1A4A" }}>
                          {d} day{d > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-[#9B8BAE]">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1" /><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1" /><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round" /></svg>
                        <span className="font-medium text-[#4A3860]">{fmt(leave.startDate)}</span>
                        <span className="text-[10px] text-[#D4BFEA]">→</span>
                        <span className="font-medium text-[#4A3860]">{fmt(leave.endDate)}</span>
                      </div>
                      {leave.reason && (
                        <div className="rounded-[10px] px-3.5 py-2 text-[12px] text-[#4A3860] mt-2.5 leading-relaxed" style={{ background: "#FAF7FD", borderLeft: "3px solid #D4AECB" }}>
                          <span className="font-semibold text-[#6B1A4A]">Reason — </span>{leave.reason}
                        </div>
                      )}
                      <LeaveTimeline leave={leave} />
                    </div>
                    {leave.createdAt && (
                      <div className="text-[10px] text-[#9B8BAE] text-right leading-relaxed flex-shrink-0">
                        Applied<br /><span className="font-semibold text-[#7B6890]">{fmt(leave.createdAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionBox>
    </div>
  );
};

const AllLeavesPanel = ({ showToast }) => {
  const [filter, setFilter]         = useState("all");
  const [processingId, setProcessingId] = useState(null);

  const { data: rawData, isLoading, refetch } = useGetForwardedLeaves();
  const acceptMut = useAcceptLeave();
  const rejectMut = useRejectLeave();

  const employeeLeaves = Array.isArray(rawData?.employeeLeaves?.leaves) ? rawData.employeeLeaves.leaves : [];

  const isStatus = (leave, key) => {
    if (key === "pending")   return leave.status?.includes("pending");
    if (key === "approved")  return leave.status?.includes("approved");
    if (key === "rejected")  return leave.status?.includes("rejected");
    if (key === "forwarded") return leave.status?.includes("forwarded");
    return true;
  };

  const filtered     = filter === "all" ? employeeLeaves : employeeLeaves.filter((l) => isStatus(l, filter));
  const count        = (key) => key === "all" ? employeeLeaves.length : employeeLeaves.filter((l) => isStatus(l, key)).length;
  const isActionable = (status) => status === "forwarded_reporting_manager" || status === "pending_manager";

  const handleAction = async (leave, action) => {
    setProcessingId(leave._id);
    try {
      if (action === "approve") { await acceptMut.mutateAsync({ id: leave._id, leaveFor: "employee" }); showToast("Leave approved", "success"); }
      if (action === "reject")  { await rejectMut.mutateAsync({ id: leave._id, leaveFor: "employee" }); showToast("Leave rejected", "error"); }
      refetch();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Something went wrong", "error");
    } finally { setProcessingId(null); }
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        {[
          { label: "Total",    val: employeeLeaves.length,                                    color: "#6B1A4A", bg: "linear-gradient(135deg,#F9EFF5,#F4E6F0)" },
          { label: "Pending",  val: employeeLeaves.filter((l) => isStatus(l,"pending")).length,  color: "#92400E", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
          { label: "Approved", val: employeeLeaves.filter((l) => isStatus(l,"approved")).length, color: "#14803D", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
          { label: "Forwarded",val: employeeLeaves.filter((l) => isStatus(l,"forwarded")).length,color: "#1D4ED8", bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-[14px] px-5 py-3 min-w-[110px]" style={{ background: s.bg, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <span className="text-[26px] font-extrabold leading-none" style={{ color: s.color, fontFamily: "Playfair Display, serif" }}>{s.val}</span>
            <span className="text-[11px] font-semibold leading-tight opacity-80" style={{ color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {LEAVE_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-[180ms]"
              style={{
                border: active ? "1.5px solid #8B3A8A" : "1.5px solid #E5DAF0",
                background: active ? "linear-gradient(135deg,#6B1A4A,#9B2458)" : "#fff",
                color: active ? "#fff" : "#8B7FA0",
                boxShadow: active ? "0 2px 10px rgba(107,26,74,0.3)" : "none",
              }}
            >
              {f.label}
              <span
                className="rounded-[10px] px-1.5 py-px text-[10px] font-bold"
                style={{
                  background: active ? "rgba(255,255,255,0.25)" : "#EDE6F5",
                  color: active ? "#fff" : "#9B8BAE",
                }}
              >
                {count(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? <EmptyState msg="No leave requests found" /> : filtered.map((leave) => (
        <LeaveCard
          key={leave._id}
          leave={leave}
          isProcessing={processingId === leave._id}
          showActions={isActionable(leave.status)}
          onApprove={() => handleAction(leave, "approve")}
          onReject={() => handleAction(leave, "reject")}
          showTimeline
        />
      ))}
    </div>
  );
};

const ManagerLeavesPanel = ({ showToast }) => {
  const [processingId, setProcessingId] = useState(null);

  const { data: rawData, isLoading, refetch } = useGetForwardedLeaves();
  const acceptMut = useAcceptLeave();
  const rejectMut = useRejectLeave();

  const managerLeaves = Array.isArray(rawData?.managerLeaves?.leaves) ? rawData.managerLeaves.leaves : [];
  const isActionable  = (status) => status === "pending_reporting_manager" || status === "pending_admin";

  const handleAction = async (leave, action) => {
    setProcessingId(leave._id);
    try {
      if (action === "approve") { await acceptMut.mutateAsync({ id: leave._id, leaveFor: "manager" }); showToast("Leave approved", "success"); }
      if (action === "reject")  { await rejectMut.mutateAsync({ id: leave._id, leaveFor: "manager" }); showToast("Leave rejected", "error"); }
      refetch();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Something went wrong", "error");
    } finally { setProcessingId(null); }
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        {[
          { label: "Total",    val: managerLeaves.length,                                           color: "#6B1A4A", bg: "linear-gradient(135deg,#F9EFF5,#F4E6F0)" },
          { label: "Pending",  val: managerLeaves.filter((l) => l.status?.includes("pending")).length,  color: "#92400E", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
          { label: "Approved", val: managerLeaves.filter((l) => l.status?.includes("approved")).length, color: "#14803D", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
          { label: "Rejected", val: managerLeaves.filter((l) => l.status?.includes("rejected")).length, color: "#991B1B", bg: "linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-[14px] px-5 py-3 min-w-[110px]" style={{ background: s.bg, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <span className="text-[26px] font-extrabold leading-none" style={{ color: s.color, fontFamily: "Playfair Display, serif" }}>{s.val}</span>
            <span className="text-[11px] font-semibold leading-tight opacity-80" style={{ color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>
      {managerLeaves.length === 0 ? <EmptyState msg="No manager leave requests" /> : managerLeaves.map((leave) => (
        <LeaveCard
          key={leave._id}
          leave={leave}
          isProcessing={processingId === leave._id}
          showActions={isActionable(leave.status)}
          onApprove={() => handleAction(leave, "approve")}
          onReject={() => handleAction(leave, "reject")}
          personLabel="Manager"
          accentColor="#A855F7"
          showTimeline
        />
      ))}
    </div>
  );
};

const WFH_BLANK = { startDate: "", endDate: "", reason: "" };

const MyWFHPanel = ({ showToast }) => {
  const [form, setForm]     = useState(WFH_BLANK);
  const [errors, setErrors] = useState({});

  const { data: wfhData, isLoading } = useAdminGetMyWFH();
  const applyMut = useAdminApplyWFH();
  const raw      = wfhData?.wfhList || wfhData || [];
  const wfhList  = Array.isArray(raw) ? raw : [];

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.startDate) e.startDate = "Required";
    if (!form.endDate)   e.endDate   = "Required";
    if (!form.reason || form.reason.trim().length < 5) e.reason = "Minimum 5 characters";
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) e.endDate = "End date cannot precede start date";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await applyMut.mutateAsync(form);
      showToast("WFH request submitted", "success");
      setForm(WFH_BLANK);
      setErrors({});
    } catch (err) {
      showToast(err?.message || "Something went wrong", "error");
    }
  };

  const days = daysDiff(form.startDate, form.endDate);
  const ib   = (k) => errors[k] ? "#FCA5A5" : "#E2D8EE";

  return (
    <div>
      <SectionBox title="Apply Work From Home">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <FormField label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} min={todayStr()} onChange={(e) => set("startDate", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[12px] text-[13px] text-[#1C1028] outline-none transition-all focus:ring-[3px] focus:ring-[rgba(139,58,138,0.10)]"
              style={{ background: "#FDFBFF", border: `1.5px solid ${ib("startDate")}` }} />
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} min={form.startDate || todayStr()} onChange={(e) => set("endDate", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[12px] text-[13px] text-[#1C1028] outline-none transition-all focus:ring-[3px] focus:ring-[rgba(139,58,138,0.10)]"
              style={{ background: "#FDFBFF", border: `1.5px solid ${ib("endDate")}` }} />
          </FormField>
        </div>
        {days > 0 && (
          <div className="flex items-center gap-2 rounded-[12px] px-4 py-3 text-[13px] font-semibold text-[#1D4ED8] mb-4"
            style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", border: "1px solid #BFDBFE" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="3" stroke="#3B82F6" strokeWidth="1.3" /><path d="M4 7h2v4M8 4v7" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" /></svg>
            <strong style={{ fontFamily: "Playfair Display, serif", fontSize: 15 }}>{days}</strong>&nbsp;day{days > 1 ? "s" : ""} · Work From Home
          </div>
        )}
        <FormField label="Reason" error={errors.reason}>
          <textarea value={form.reason} onChange={(e) => set("reason", e.target.value)}
            placeholder="Briefly explain why you need to work from home…"
            className="w-full px-3.5 py-2.5 rounded-[12px] text-[13px] text-[#1C1028] outline-none transition-all resize-y leading-relaxed focus:ring-[3px] focus:ring-[rgba(139,58,138,0.10)]"
            style={{ background: "#FDFBFF", border: `1.5px solid ${ib("reason")}`, minHeight: 88 }} />
        </FormField>
        <div className="flex justify-end gap-2.5 mt-4">
          <button onClick={() => { setForm(WFH_BLANK); setErrors({}); }}
            className="px-6 py-2.5 rounded-[12px] text-[13px] font-medium cursor-pointer transition-all hover:brightness-95"
            style={{ background: "#F4EEF9", color: "#6B1A4A", border: "1.5px solid #DFD0EC" }}>
            Clear
          </button>
          <button onClick={handleSubmit} disabled={applyMut.isPending}
            className="px-6 py-2.5 rounded-[12px] text-[13px] font-semibold text-white cursor-pointer transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ background: "linear-gradient(135deg,#6B1A4A,#9B2458)", boxShadow: "0 4px 16px rgba(107,26,74,0.35)" }}>
            {applyMut.isPending ? "Submitting…" : "Submit WFH Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox title="My WFH History" rightEl={
        wfhList.length > 0 ? (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-[#1D4ED8]"
            style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" }}>
            {wfhList.length} record{wfhList.length !== 1 ? "s" : ""}
          </span>
        ) : null
      }>
        {isLoading ? <Spinner /> : wfhList.length === 0 ? <EmptyState msg="No WFH records yet" /> : (
          <div>
            {wfhList.map((wfh, idx) => {
              const d = wfh.days || daysDiff(wfh.startDate, wfh.endDate);
              return (
                <div key={wfh._id || idx}
                  className="relative rounded-[16px] mb-2.5 overflow-hidden transition-all duration-[220ms] hover:-translate-y-px"
                  style={{ background: "#fff", border: "1px solid rgba(200,185,220,0.28)", padding: "16px 18px", boxShadow: "0 2px 10px rgba(80,40,100,0.06)", animationDelay: `${idx * 0.05}s` }}>
                  <div className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-[16px] bg-[#3B82F6]" />
                  <div className="flex justify-between items-start gap-3.5 pl-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-1.5 flex-wrap mb-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] flex-shrink-0" />WFH
                        </span>
                        <StatusBadge status={wfh.status} meta={WFH_STATUS_META} />
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "#F0F9FF", color: "#0369A1" }}>{d} day{d > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-[#9B8BAE]">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1" /><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1" /><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round" /></svg>
                        <span className="font-medium text-[#4A3860]">{fmt(wfh.startDate)}</span>
                        <span className="text-[10px] text-[#D4BFEA]">→</span>
                        <span className="font-medium text-[#4A3860]">{fmt(wfh.endDate)}</span>
                      </div>
                      {wfh.reason && (
                        <div className="rounded-[10px] px-3.5 py-2 text-[12px] text-[#1E3A5F] mt-2.5 leading-relaxed" style={{ background: "#F0F9FF", borderLeft: "3px solid #93C5FD" }}>
                          <span className="font-semibold text-[#1D4ED8]">Reason — </span>{wfh.reason}
                        </div>
                      )}
                    </div>
                    {wfh.createdAt && (
                      <div className="text-[10px] text-[#9B8BAE] text-right leading-relaxed flex-shrink-0">
                        Applied<br /><span className="font-semibold text-[#7B6890]">{fmt(wfh.createdAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionBox>
    </div>
  );
};

const TeamWFHPanel = ({ showToast }) => {
  const [processingId, setProcessingId] = useState(null);
  const [wfhFilter, setWfhFilter]       = useState("all");

  const { data: fwdData, isLoading, refetch } = useAdminGetForwardedWFH();
  const approveMut = useAdminApproveForwardedWFH();
  const rejectMut  = useAdminRejectForwardedWFH();

  const raw     = fwdData?.wfhList || fwdData || [];
  const allList = Array.isArray(raw) ? raw : [];

  const isWfhStatus = (wfh, key) => {
    if (key === "pending")  return wfh.status?.includes("pending");
    if (key === "approved") return wfh.status?.includes("approved");
    if (key === "rejected") return wfh.status?.includes("rejected");
    return true;
  };

  const list      = wfhFilter === "all" ? allList : allList.filter((w) => isWfhStatus(w, wfhFilter));
  const wfhCount  = (key) => key === "all" ? allList.length : allList.filter((w) => isWfhStatus(w, key)).length;
  const isActionable = (status) => status === "pending_admin" || status === "forwarded_reporting_manager";

  const handleAction = async (wfhId, action) => {
    setProcessingId(wfhId);
    try {
      if (action === "approve") { await approveMut.mutateAsync({ wfhId }); showToast("WFH approved", "success"); }
      if (action === "reject")  { await rejectMut.mutateAsync({ wfhId });  showToast("WFH rejected", "error"); }
      refetch();
    } catch (err) {
      showToast(err?.message || "Something went wrong", "error");
    } finally { setProcessingId(null); }
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex gap-3 mb-5 flex-wrap">
        {[
          { label: "Total",    val: allList.length,                                          color: "#1D4ED8", bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
          { label: "Pending",  val: allList.filter((w) => isWfhStatus(w,"pending")).length,  color: "#92400E", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
          { label: "Approved", val: allList.filter((w) => isWfhStatus(w,"approved")).length, color: "#14803D", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
          { label: "Rejected", val: allList.filter((w) => isWfhStatus(w,"rejected")).length, color: "#991B1B", bg: "linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-[14px] px-5 py-3 min-w-[110px]" style={{ background: s.bg, border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <span className="text-[26px] font-extrabold leading-none" style={{ color: s.color, fontFamily: "Playfair Display, serif" }}>{s.val}</span>
            <span className="text-[11px] font-semibold leading-tight opacity-80" style={{ color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[{ key: "all", label: "All" }, { key: "pending", label: "Pending" }, { key: "approved", label: "Approved" }, { key: "rejected", label: "Rejected" }].map((f) => {
          const active = wfhFilter === f.key;
          return (
            <button key={f.key} onClick={() => setWfhFilter(f.key)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-[180ms]"
              style={{
                border: active ? "1.5px solid #3B82F6" : "1.5px solid #E5DAF0",
                background: active ? "linear-gradient(135deg,#1D4ED8,#3B82F6)" : "#fff",
                color: active ? "#fff" : "#8B7FA0",
                boxShadow: active ? "0 2px 10px rgba(59,130,246,0.3)" : "none",
              }}>
              {f.label}
              <span className="rounded-[10px] px-1.5 py-px text-[10px] font-bold"
                style={{ background: active ? "rgba(255,255,255,0.25)" : "#DBEAFE", color: active ? "#fff" : "#1D4ED8" }}>
                {wfhCount(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? <EmptyState msg="No team WFH requests found" /> : list.map((wfh) => {
        const requester    = wfh.requester || {};
        const d            = wfh.days || daysDiff(wfh.startDate, wfh.endDate);
        const isProcessing = processingId === wfh._id;
        const actionable   = isActionable(wfh.status);
        return (
          <div key={wfh._id}
            className="relative rounded-[20px] mb-3.5 overflow-hidden transition-all duration-[250ms] hover:-translate-y-px"
            style={{
              background: "#fff",
              border: "1px solid rgba(200,185,220,0.3)",
              padding: "22px 24px",
              boxShadow: "0 2px 12px rgba(80,40,100,0.07),0 1px 3px rgba(0,0,0,0.04)",
              opacity: isProcessing ? 0.6 : 1,
              pointerEvents: isProcessing ? "none" : "auto",
            }}>
            <div className="absolute top-0 left-0 bottom-0 w-[3px] rounded-l-[20px] bg-[#3B82F6]" />
            <div className="flex justify-between items-start gap-4 pl-1.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0 text-[14px] font-bold text-white"
                    style={{ background: avatarColor(requester.f_name || "A"), boxShadow: "0 3px 10px rgba(0,0,0,0.15)" }}>
                    {initials(requester.f_name, requester.l_name)}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#1C1028]">{requester.f_name} {requester.l_name}</div>
                    <div className="text-[11px] text-[#9B8BAE] mt-0.5">{requester.designation || requester.work_email}</div>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap mt-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] flex-shrink-0" />WFH
                  </span>
                  <StatusBadge status={wfh.status} meta={WFH_STATUS_META} />
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: "#F0F9FF", color: "#0369A1" }}>{d} day{d > 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#9B8BAE] mt-2.5">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1" /><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1" /><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round" /></svg>
                  <span className="font-medium text-[#4A3860]">{fmt(wfh.startDate)}</span>
                  <span className="text-[10px] text-[#D4BFEA]">→</span>
                  <span className="font-medium text-[#4A3860]">{fmt(wfh.endDate)}</span>
                </div>
                {wfh.reason && (
                  <div className="rounded-[10px] px-3.5 py-2.5 text-[12px] text-[#1E3A5F] mt-2.5 leading-relaxed" style={{ background: "#F0F9FF", borderLeft: "3px solid #93C5FD" }}>
                    <span className="font-semibold text-[#1D4ED8]">Reason — </span>{wfh.reason}
                  </div>
                )}
                {wfh.createdAt && <div className="text-[10px] text-[#C4AADA] mt-2">Applied {fmtDateTime(wfh.createdAt)}</div>}
              </div>
              {actionable && (
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => handleAction(wfh._id, "approve")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[12px] font-semibold cursor-pointer border-none transition-all duration-[180ms] hover:-translate-y-px"
                    style={{ background: "#F0FDF4", color: "#14803D", boxShadow: "0 2px 8px rgba(34,197,94,0.15)" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5 5.5-5" stroke="#14803D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Approve
                  </button>
                  <button onClick={() => handleAction(wfh._id, "reject")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] text-[12px] font-semibold cursor-pointer border-none transition-all duration-[180ms] hover:-translate-y-px"
                    style={{ background: "#FFF1F2", color: "#991B1B", boxShadow: "0 2px 8px rgba(239,68,68,0.12)" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    Reject
                  </button>
                </div>
              )}
            </div>
            {isProcessing && (
              <div className="absolute inset-0 rounded-[20px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(2px)" }}>
                <div className="w-[22px] h-[22px] rounded-full border-2 border-[#EDE6F5] animate-spin" style={{ borderTopColor: "#8B3A8A" }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const TABS = [
  { key: "allLeaves",     label: "Employee Leaves" },
  { key: "managerLeaves", label: "Manager Leaves"  },
  { key: "myBalance",     label: "My Balance"       },
  { key: "applyLeave",    label: "Apply Leave"      },
  { key: "myWFH",         label: "My WFH"           },
  { key: "teamWFH",       label: "Team WFH"         },
];

const AdminLeaveWFH = () => {
  const [tab, setTab]     = useState("allLeaves");
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const { data: meData, isLoading: meLoading } = useGetMeAdmin();
  const admin        = meData?.user  || meData;
  const leaveBalance = meData?.leaveBalance || null;

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3400);
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "linear-gradient(160deg,#F7F3FC 0%,#F0EBF8 50%,#F4F0FA 100%)", fontFamily: "DM Sans, sans-serif" }}
    >
      <div className="fixed top-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle,rgba(168,41,94,0.07) 0%,transparent 70%)" }} />
      <div className="fixed bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle,rgba(107,26,74,0.06) 0%,transparent 70%)" }} />

      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <div className="flex items-center gap-4">
            <div
              className="w-[50px] h-[50px] rounded-[16px] flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#6B1A4A,#A8295E)", boxShadow: "0 6px 20px rgba(107,26,74,0.38)" }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="4" width="16" height="15" rx="3" stroke="white" strokeWidth="1.5" />
                <path d="M3 9h16" stroke="white" strokeWidth="1.5" />
                <path d="M7 2v4M15 2v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M7 13h4M7 16h8" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#1C1028] m-0 tracking-[-0.3px]" style={{ fontFamily: "Playfair Display, serif" }}>Leave & WFH</h1>
              <p className="text-[12px] text-[#9B8BAE] mt-0.5 font-normal">Manage employee leaves · Track balance · Work from home</p>
            </div>
          </div>
          {admin && (
            <div
              className="flex items-center gap-2.5 rounded-[14px] px-4 py-2.5 self-start sm:self-auto"
              style={{ background: "#fff", border: "1px solid rgba(200,185,220,0.4)", boxShadow: "0 2px 12px rgba(80,40,100,0.08)" }}
            >
              <div
                className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6B1A4A,#A8295E)" }}
              >
                {(admin.f_name?.[0] || "")}{(admin.l_name?.[0] || "")}
              </div>
              <div>
                <div className="font-semibold text-[12px] text-[#1C1028]">{admin.f_name} {admin.l_name}</div>
                <div className="text-[10px] text-[#9B8BAE] mt-px">{admin.designation || admin.role}</div>
              </div>
            </div>
          )}
        </div>

        <div
          className="flex gap-1 rounded-[14px] p-1 mb-7 overflow-x-auto flex-nowrap sm:flex-wrap scrollbar-none"
          style={{ background: "rgba(235,228,245,0.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(200,185,220,0.3)", boxShadow: "0 2px 8px rgba(80,40,100,0.06)", width: "fit-content", maxWidth: "100%" }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-5 py-2 rounded-[10px] text-[13px] font-medium cursor-pointer border-none whitespace-nowrap transition-all duration-200 flex-shrink-0"
                style={{
                  color: active ? "#fff" : "#9B8BAE",
                  background: active ? "linear-gradient(135deg,#6B1A4A,#9B2458)" : "transparent",
                  fontWeight: active ? 600 : 400,
                  boxShadow: active ? "0 3px 12px rgba(107,26,74,0.32)" : "none",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {meLoading && (tab === "myBalance" || tab === "applyLeave") ? <Spinner /> : (
          <>
            {tab === "allLeaves"     && <AllLeavesPanel showToast={showToast} />}
            {tab === "managerLeaves" && <ManagerLeavesPanel showToast={showToast} />}
            {tab === "myBalance"     && <MyBalancePanel admin={admin} leaveBalance={leaveBalance} />}
            {tab === "applyLeave"    && <ApplyLeavePanel admin={admin} leaveBalance={leaveBalance} showToast={showToast} />}
            {tab === "myWFH"         && <MyWFHPanel showToast={showToast} />}
            {tab === "teamWFH"       && <TeamWFHPanel showToast={showToast} />}
          </>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
};

export default AdminLeaveWFH;