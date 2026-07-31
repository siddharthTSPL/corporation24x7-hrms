import React, { useState } from "react";
import {
  useApplyLeave,
  useGetAllLeaves,
  useDeleteLeave,
  useEditLeave,
  useGetAllLeaveHistory,
} from "../../auth/server-state/employee/employeeleave/employeeleave.hook";
import { useGetMeUser } from "../../auth/server-state/employee/employeeauth/employeeauth.hook";
import {
  useApplyWFH,
  useEditWFH,
  useDeleteWFH,
  useGetMyWFH,
} from "../../auth/server-state/employee/employeewfh/employeewfh.hook";

const FontLoader = () => (
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
  />
);

const LEAVE_META = {
  el:          { label: "Earned Leave",    bg: "bg-[#DCFCE7]", text: "text-[#14803D]", dot: "bg-[#16A34A]" },
  sl:          { label: "Sick Leave",      bg: "bg-[#DBEAFE]", text: "text-[#1D4ED8]", dot: "bg-[#2563EB]" },
  ml:          { label: "Maternity Leave", bg: "bg-[#F3E8FF]", text: "text-[#6B21A8]", dot: "bg-[#7C3AED]" },
  pl:          { label: "Paternity Leave", bg: "bg-[#FEF3C7]", text: "text-[#92400E]", dot: "bg-[#D97706]" },
  half_day_el: { label: "Half Day EL",     bg: "bg-[#ECFDF5]", text: "text-[#065F46]", dot: "bg-[#059669]" },
  half_day_sl: { label: "Half Day SL",     bg: "bg-[#EFF6FF]", text: "text-[#1E40AF]", dot: "bg-[#3B82F6]" },
  lwp:         { label: "Leave Without Pay", bg: "bg-[#FCE7F3]", text: "text-[#9D174D]", dot: "bg-[#DB2777]" },
};
const META_FALLBACK = { bg: "bg-[#F3F4F6]", text: "text-[#374151]", dot: "bg-[#9CA3AF]" };

const LEAVE_STATUS_META = {
  pending_manager:             { label: "Pending Manager",             bg: "bg-[#FFFBEB]", text: "text-[#92400E]", dot: "bg-[#F59E0B]" },
  forwarded_reporting_manager: { label: "Forwarded to Reporting Mgr",  bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]", dot: "bg-[#3B82F6]" },
  approved_manager:            { label: "Approved by Manager",         bg: "bg-[#F0FDF4]", text: "text-[#14803D]", dot: "bg-[#22C55E]" },
  approved_reporting_manager:  { label: "Approved by Reporting Mgr",   bg: "bg-[#F0FDF4]", text: "text-[#14803D]", dot: "bg-[#22C55E]" },
  rejected_manager:            { label: "Rejected by Manager",         bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", dot: "bg-[#EF4444]" },
  rejected_reporting_manager:  { label: "Rejected by Reporting Mgr",   bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", dot: "bg-[#EF4444]" },
  approved_admin:              { label: "Approved by Admin",           bg: "bg-[#F0FDF4]", text: "text-[#14803D]", dot: "bg-[#22C55E]" },
  rejected_admin:              { label: "Rejected by Admin",           bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", dot: "bg-[#EF4444]" },
  approved_superadmin:         { label: "Approved by Super Admin",     bg: "bg-[#F0FDF4]", text: "text-[#14803D]", dot: "bg-[#22C55E]" },
  rejected_superadmin:         { label: "Rejected by Super Admin",     bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", dot: "bg-[#EF4444]" },
  pending_admin:               { label: "Pending Admin",               bg: "bg-[#FFFBEB]", text: "text-[#92400E]", dot: "bg-[#F59E0B]" },
  pending_superadmin:          { label: "Pending Super Admin",         bg: "bg-[#FFFBEB]", text: "text-[#92400E]", dot: "bg-[#F59E0B]" },
};

const WFH_STATUS_META = {
  pending_manager:             { label: "Pending Manager",             bg: "bg-[#FFFBEB]", text: "text-[#92400E]", dot: "bg-[#F59E0B]" },
  approved_manager:            { label: "Approved by Manager",         bg: "bg-[#F0FDF4]", text: "text-[#14803D]", dot: "bg-[#22C55E]" },
  rejected_manager:            { label: "Rejected by Manager",         bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", dot: "bg-[#EF4444]" },
  forwarded_reporting_manager: { label: "Forwarded to Reporting Mgr",  bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]", dot: "bg-[#3B82F6]" },
  pending_reporting_manager:   { label: "Pending Reporting Mgr",       bg: "bg-[#FFFBEB]", text: "text-[#92400E]", dot: "bg-[#F59E0B]" },
  approved_reporting_manager:  { label: "Approved by Reporting Mgr",   bg: "bg-[#F0FDF4]", text: "text-[#14803D]", dot: "bg-[#22C55E]" },
  rejected_reporting_manager:  { label: "Rejected by Reporting Mgr",   bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", dot: "bg-[#EF4444]" },
  pending_admin:               { label: "Pending Admin",               bg: "bg-[#FFFBEB]", text: "text-[#92400E]", dot: "bg-[#F59E0B]" },
  approved_admin:              { label: "Approved by Admin",           bg: "bg-[#F0FDF4]", text: "text-[#14803D]", dot: "bg-[#22C55E]" },
  rejected_admin:              { label: "Rejected by Admin",           bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", dot: "bg-[#EF4444]" },
  pending_superadmin:          { label: "Pending Super Admin",         bg: "bg-[#FFFBEB]", text: "text-[#92400E]", dot: "bg-[#F59E0B]" },
  approved_superadmin:         { label: "Approved by Super Admin",     bg: "bg-[#F0FDF4]", text: "text-[#14803D]", dot: "bg-[#22C55E]" },
  rejected_superadmin:         { label: "Rejected by Super Admin",     bg: "bg-[#FEF2F2]", text: "text-[#991B1B]", dot: "bg-[#EF4444]" },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—";

const daysBetween = (s, e) => {
  if (!s || !e) return 0;
  const n = Math.floor((new Date(e) - new Date(s)) / 86400000) + 1;
  return n > 0 ? n : 0;
};

const todayStr = () => new Date().toISOString().split("T")[0];
const LEAVE_BLANK = { leaveType: "", startDate: "", endDate: "", reason: "" };
const WFH_BLANK   = { startDate: "", endDate: "", reason: "" };

const humanize = (s) => (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const DELAY_CLASSES = ["delay-0", "delay-75", "delay-150", "delay-200", "delay-300"];

const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-[70px] gap-[14px]">
    <div className="w-[38px] h-[38px] border-[3px] border-[#EDE6F5] border-t-[#8B3A8A] rounded-full animate-spin" />
    <p className="text-[13px] text-[#9B8BAE] font-['DM_Sans'] font-medium">Loading…</p>
  </div>
);

const EmptyState = ({ msg = "No records found" }) => (
  <div className="flex flex-col items-center py-14 gap-3">
    <div className="w-[60px] h-[60px] rounded-[18px] bg-gradient-to-br from-[#F4EEF9] to-[#EDE4F5] flex items-center justify-center">
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="5" width="20" height="19" rx="4" stroke="#C4AADA" strokeWidth="1.5" fill="none"/>
        <path d="M4 11h20" stroke="#C4AADA" strokeWidth="1.5"/>
        <path d="M9 8V5M19 8V5" stroke="#C4AADA" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 16h6M9 20h10" stroke="#D4BFEA" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </div>
    <p className="text-[13px] text-[#9B8BAE] font-medium font-['DM_Sans'] text-center px-4">{msg}</p>
  </div>
);

const Toast = ({ toast }) => {
  const colors = {
    success: { bg: "bg-[rgba(240,253,244,0.95)]", text: "text-[#14803D]", border: "border-[#86EFAC]", icon: "bg-[#22C55E]" },
    error:   { bg: "bg-[rgba(254,242,242,0.95)]", text: "text-[#991B1B]", border: "border-[#FCA5A5]", icon: "bg-[#EF4444]" },
    info:    { bg: "bg-[rgba(239,246,255,0.95)]", text: "text-[#1D4ED8]", border: "border-[#93C5FD]", icon: "bg-[#3B82F6]" },
  };
  const c = colors[toast.type] || colors.info;
  return (
    <div
      className={`fixed bottom-4 right-4 sm:bottom-[30px] sm:right-[30px] left-4 sm:left-auto max-w-[calc(100vw-32px)] sm:max-w-[360px] px-[22px] py-[14px] rounded-[14px] text-[13px] font-medium font-['DM_Sans'] shadow-[0_8px_30px_rgba(0,0,0,0.14)] z-[9999] flex items-center gap-[10px] transition-all duration-300 backdrop-blur-[8px] border ${c.bg} ${c.text} ${c.border} ${
        toast.visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-95 opacity-0 pointer-events-none"
      }`}
    >
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${c.icon}`}>
        {toast.type === "success" && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type === "error"   && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type === "info"    && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 4v4M5 3v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
      </div>
      <span className="break-words">{toast.message}</span>
    </div>
  );
};

const LeaveTypeBadge = ({ type }) => {
  const m = LEAVE_META[type] || { label: humanize(type), ...META_FALLBACK };
  return (
    <span className={`inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold font-['DM_Sans'] whitespace-nowrap ${m.bg} ${m.text}`}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
};

const StatusBadge = ({ status, meta }) => {
  const m = (meta || {})[status] || { label: humanize(status), ...META_FALLBACK };
  return (
    <span className={`inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold font-['DM_Sans'] whitespace-nowrap ${m.bg} ${m.text}`}>
      <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
};

const FormField = ({ label, error, children }) => (
  <div className="flex flex-col gap-[7px] min-w-0">
    <label className="text-[11px] font-semibold text-[#6B5080] uppercase tracking-[0.5px] font-['DM_Sans']">
      {label} <span className="text-[#CD166E]">*</span>
    </label>
    {children}
    {error && <span className="text-[11px] text-[#EF4444] font-['DM_Sans']">{error}</span>}
  </div>
);

const SectionBox = ({ title, children, rightEl }) => (
  <div className="bg-white rounded-[20px] border border-[rgba(200,185,220,0.3)] overflow-hidden shadow-[0_2px_12px_rgba(80,40,100,0.07)] mb-5">
    <div className="px-4 sm:px-[22px] pt-[18px] pb-[14px] border-b border-[#F0EAF8] flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <span className="inline-block w-[3px] h-[18px] bg-gradient-to-b from-[#6B1A4A] to-[#A8295E] rounded-[3px] align-middle" />
        <span className="text-[14px] font-semibold text-[#1C1028] font-['DM_Sans']">{title}</span>
      </div>
      {rightEl}
    </div>
    <div className="px-4 sm:px-[22px] pt-5 pb-6">{children}</div>
  </div>
);

const getLeaveJourneyConfig = (status) => {
  const isForwardedToReporting =
    status === "forwarded_reporting_manager" ||
    status === "approved_reporting_manager" ||
    status === "rejected_reporting_manager";

  const isAdminInvolved =
    status === "pending_admin" ||
    status === "approved_admin" ||
    status === "rejected_admin" ||
    status === "approved_superadmin" ||
    status === "rejected_superadmin" ||
    status === "pending_superadmin";

  if (isAdminInvolved || isForwardedToReporting) {
    return [
      { key: "submitted",         label: "Submitted"      },
      { key: "manager_review",    label: "Manager Review" },
      { key: "reporting_manager", label: "HR / Admin"     },
      { key: "final",             label: "Final Decision" },
    ];
  }

  return [
    { key: "submitted",      label: "Submitted"      },
    { key: "manager_review", label: "Manager Review" },
    { key: "final",          label: "Final Decision" },
  ];
};

const getWFHJourneyConfig = (status) => {
  const isForwardedToReporting =
    status === "forwarded_reporting_manager" ||
    status === "pending_reporting_manager" ||
    status === "approved_reporting_manager" ||
    status === "rejected_reporting_manager";

  const isAdminInvolved =
    status === "pending_admin" ||
    status === "approved_admin" ||
    status === "rejected_admin" ||
    status === "approved_superadmin" ||
    status === "rejected_superadmin" ||
    status === "pending_superadmin";

  if (isAdminInvolved || isForwardedToReporting) {
    return [
      { key: "submitted",         label: "Submitted"      },
      { key: "manager_review",    label: "Manager Review" },
      { key: "reporting_manager", label: "HR / Admin"     },
      { key: "final",             label: "Final Decision" },
    ];
  }

  return [
    { key: "submitted",      label: "Submitted"      },
    { key: "manager_review", label: "Manager Review" },
    { key: "final",          label: "Final Decision" },
  ];
};

const getJourneyActiveIdx = (status, steps) => {
  if (!status) return 0;

  const keyMap = {
    "pending_manager":             { 3: 1, 4: 1 },
    "forwarded_reporting_manager": { 4: 2 },
    "pending_reporting_manager":   { 4: 2 },
    "approved_manager":            { 3: 2, 4: 3 },
    "rejected_manager":            { 3: 2, 4: 3 },
    "approved_reporting_manager":  { 4: 3 },
    "rejected_reporting_manager":  { 4: 3 },
    "pending_admin":               { 4: 2 },
    "approved_admin":              { 4: 3 },
    "rejected_admin":              { 4: 3 },
    "pending_superadmin":          { 4: 2 },
    "approved_superadmin":         { 4: 3 },
    "rejected_superadmin":         { 4: 3 },
  };

  const len = steps.length;
  if (keyMap[status] && keyMap[status][len] !== undefined) return keyMap[status][len];
  if (status.startsWith("approved") || status.startsWith("rejected")) return steps.length - 1;
  return 0;
};

const JourneyTracker = ({ item, statusMeta, getJourneyConfig, titleLabel, isWFH = false }) => {
  if (!item) return <EmptyState msg={isWFH ? "No WFH applications yet" : "No leave applications yet"} />;

  const leaveMeta  = !isWFH ? (LEAVE_META[item.leaveType] || {}) : {};
  const itemLabel  = isWFH ? "Work From Home" : (leaveMeta.label || humanize(item.leaveType));

  const steps      = getJourneyConfig(item.status);
  const activeIdx  = getJourneyActiveIdx(item.status, steps);
  const isRejected = (item.status || "").startsWith("rejected");

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-7">
        <div className="min-w-0">
          <p className="text-[10.5px] font-medium tracking-[0.12em] uppercase text-[#9B8BAE] mb-1 font-['DM_Sans']">Latest Application</p>
          <h3 className="font-['Playfair_Display'] text-[20px] font-bold text-[#1C1028] mb-[3px]">{itemLabel}</h3>
          <p className="text-[12px] text-[#9B8BAE] m-0 font-['DM_Sans'] break-words">
            {fmt(item.startDate)} → {fmt(item.endDate)} · {item.days} day{item.days !== 1 ? "s" : ""}
          </p>
        </div>
        <StatusBadge status={item.status} meta={statusMeta} />
      </div>

      <div className="flex items-start overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const isLast      = i === steps.length - 1;
          const done        = i < activeIdx;
          const current     = i === activeIdx;
          const isFinalStep = isLast && current;

          let circleBg;
          if (isFinalStep && isRejected) circleBg = "bg-[#BE123C]";
          else if (isFinalStep && !isRejected) circleBg = "bg-[#15803D]";
          else if (done) circleBg = "bg-[#730042]";
          else if (current) circleBg = "bg-[#CD166E]";
          else circleBg = "bg-[rgba(115,0,66,0.08)]";

          const borderCol  = current ? "border-[#730042]" : done ? "border-transparent" : "border-[rgba(115,0,66,0.15)]";
          const labelColor = isFinalStep
            ? (isRejected ? "text-[#BE123C]" : "text-[#15803D]")
            : done ? "text-[#730042]" : current ? "text-[#CD166E]" : "text-[rgba(115,0,66,0.4)]";

          const displayLabel = isFinalStep ? (isRejected ? "Rejected" : "Approved") : step.label;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-2 flex-1 min-w-[48px] sm:min-w-[64px]">
                <div className={`w-[32px] h-[32px] sm:w-[38px] sm:h-[38px] rounded-full flex items-center justify-center transition-all duration-250 border-[2.5px] ${circleBg} ${borderCol} shadow-[0_0_0_3px_rgba(205,22,110,0.15)] sm:shadow-[0_0_0_5px_rgba(205,22,110,0.15)]`}>
                  {(done || current) ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {isFinalStep && isRejected
                        ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                        : <polyline points="20 6 9 17 4 12"/>}
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-[rgba(115,0,66,0.25)]" />
                  )}
                </div>
                <span className={`text-[10px] sm:text-[11px] text-center leading-[1.3] px-[2px] font-['DM_Sans'] ${current ? "font-semibold" : "font-normal"} ${labelColor}`}>
                  {displayLabel}
                </span>
              </div>
              {!isLast && (
                <div className="flex-[2] h-[2.5px] mt-[15px] sm:mt-[18px] rounded-[4px] bg-[rgba(115,0,66,0.1)] relative overflow-hidden min-w-[12px] sm:min-w-[24px]">
                  {i < activeIdx && (
                    <div className={`absolute inset-0 rounded-[4px] ${isRejected && i === activeIdx - 1 ? "bg-[#BE123C]" : "bg-[#730042]"}`} />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {item.reason && (
        <div className="mt-5 px-4 py-3 bg-[rgba(249,248,242,0.9)] border-l-2 border-[#CD166E] rounded-r-[10px] text-[13px] text-[rgba(115,0,66,0.55)] leading-[1.65] font-['DM_Sans'] break-words">
          <span className="font-medium text-[#730042] mr-1">Reason:</span>
          {item.reason}
        </div>
      )}
    </div>
  );
};

const BalCard = ({ label, value, accent }) => (
  <div className="min-w-0 bg-white rounded-[20px] border border-[rgba(200,185,220,0.3)] px-3 sm:px-[22px] pt-[22px] pb-[18px] relative overflow-hidden shadow-[0_2px_12px_rgba(80,40,100,0.07)] transition-all duration-300 hover:shadow-[0_8px_28px_rgba(80,40,100,0.12)] hover:-translate-y-[2px]">
    <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px] ${accent}`} />
    <p className="text-[11px] text-[#9B8BAE] font-semibold uppercase tracking-[0.5px] mb-[6px] font-['DM_Sans'] break-words">{label}</p>
    <p className="font-['Playfair_Display'] text-[32px] sm:text-[40px] font-bold text-[#1C1028] leading-none m-0 tracking-[-0.5px]">{value ?? 0}</p>
    <p className="text-[11px] text-[#9B8BAE] mt-1 font-['DM_Sans']">days available</p>
  </div>
);

const LeaveBalanceTab = ({ employee, balance, isLoading }) => {
  if (isLoading) return <Spinner />;

  const isFemaleMarried = employee?.gender === "female" && employee?.marital_status === "married";
  const isMaleMarried   = employee?.gender === "male"   && employee?.marital_status === "married";

  const slRemaining = balance.SL?.available ?? Math.max(0, Number(balance.SL?.entitled ?? 0) - Number(balance.SL?.availed ?? 0));

  const cards = [
    { label: "Earned Leave",      value: balance.EL?.available ?? 0, accent: "bg-[#22C55E]" },
    { label: "Sick Leave",        value: slRemaining, accent: "bg-[#3B82F6]" },
    ...(isFemaleMarried ? [{ label: "Maternity Leave", value: balance.ML, accent: "bg-[#A855F7]" }] : []),
    ...(isMaleMarried   ? [{ label: "Paternity Leave", value: balance.PL, accent: "bg-[#F59E0B]" }] : []),
    { label: "Paid Balance",      value: balance.pbc, accent: "bg-[#6B1A4A]" },
    { label: "Leave Without Pay", value: balance.lwp, accent: "bg-[#CD166E]" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(155px,1fr))] gap-[14px]">
      {cards.map(c => <BalCard key={c.label} {...c} />)}
    </div>
  );
};

const inputBase = "w-full box-border px-[15px] py-[11px] rounded-[12px] text-[13px] text-[#1C1028] bg-[#FDFBFF] outline-none transition-all duration-200 font-['DM_Sans'] border-[1.5px] focus:border-[#8B3A8A] focus:shadow-[0_0_0_3px_rgba(139,58,138,0.10)]";
const btnPrimary = "w-full sm:w-auto px-[26px] py-[11px] rounded-[12px] text-[13px] font-semibold bg-gradient-to-br from-[#6B1A4A] to-[#9B2458] text-white border-none cursor-pointer shadow-[0_4px_16px_rgba(107,26,74,0.35)] transition-all duration-[180ms] tracking-[0.3px] font-['DM_Sans'] hover:-translate-y-px hover:shadow-[0_6px_22px_rgba(107,26,74,0.4)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0";
const btnSecondary = "w-full sm:w-auto px-[26px] py-[11px] rounded-[12px] text-[13px] font-medium bg-[#F4EEF9] text-[#6B1A4A] border-[1.5px] border-[#DFD0EC] cursor-pointer transition-all duration-[180ms] font-['DM_Sans'] hover:bg-[#EDE4F5]";
const actionBtn = "inline-flex items-center gap-[5px] px-[13px] py-[6px] rounded-[9px] text-[12px] font-semibold cursor-pointer border-none tracking-[0.2px] transition-all duration-[180ms] font-['DM_Sans'] hover:-translate-y-px hover:brightness-105 active:translate-y-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:translate-y-0";

const LeaveApplyTab = ({ employee, showToast }) => {
  const [form, setForm]             = useState(LEAVE_BLANK);
  const [errors, setErrors]         = useState({});
  const [editTarget, setEditTarget] = useState(null);

  const { data: historyData, isLoading: histLoading } = useGetAllLeaveHistory();
  const applyMut  = useApplyLeave();
  const editMut   = useEditLeave();
  const deleteMut = useDeleteLeave();

  const history = historyData?.leaves || [];

  const isFemaleMarried = employee?.gender === "female" && employee?.marital_status === "married";
  const isMaleMarried   = employee?.gender === "male"   && employee?.marital_status === "married";

  const availTypes = [
    { value: "el",          label: "Earned Leave"    },
    { value: "sl",          label: "Sick Leave"      },
    { value: "ml",          label: "Maternity Leave" },
    { value: "pl",          label: "Paternity Leave" },
    { value: "half_day_el", label: "Half Day EL"     },
    { value: "half_day_sl", label: "Half Day SL"     },
    { value: "lwp",         label: "Leave Without Pay" },
  ].filter(t => {
    if (t.value === "ml") return isFemaleMarried;
    if (t.value === "pl") return isMaleMarried;
    return true;
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

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
      if (editTarget) {
        await editMut.mutateAsync({ id: editTarget._id, ...form });
        showToast("Leave updated successfully", "success");
      } else {
        await applyMut.mutateAsync(form);
        showToast("Leave request submitted", "success");
      }
      setForm(LEAVE_BLANK);
      setEditTarget(null);
      setErrors({});
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Something went wrong", "error");
    }
  };

  const openEdit = (leave) => {
    setEditTarget(leave);
    setForm({
      leaveType: leave.leaveType,
      startDate: new Date(leave.startDate).toISOString().split("T")[0],
      endDate:   new Date(leave.endDate).toISOString().split("T")[0],
      reason:    leave.reason,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this leave application?")) return;
    try {
      await deleteMut.mutateAsync(id);
      showToast("Leave deleted", "info");
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Delete failed", "error");
    }
  };

  const days = daysBetween(form.startDate, form.endDate);
  const ib   = (k) => errors[k] ? "border-[#FCA5A5]" : "border-[#E2D8EE]";

  return (
    <div>
      <SectionBox title={editTarget ? "Edit Leave Request" : "New Leave Request"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] mb-[18px]">
          <FormField label="Leave Type" error={errors.leaveType}>
            <select value={form.leaveType} onChange={e => set("leaveType", e.target.value)} className={`${inputBase} ${ib("leaveType")}`}>
              <option value="">Select a type…</option>
              {availTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} min={todayStr()} className={`${inputBase} ${ib("startDate")}`} />
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} min={form.startDate || todayStr()} className={`${inputBase} ${ib("endDate")}`} />
          </FormField>
        </div>

        {days > 0 && (
          <div className="bg-gradient-to-br from-[#F9EFF5] to-[#F2E8F5] border border-[#DFD0EC] rounded-[12px] px-4 sm:px-[18px] py-3 text-[13px] text-[#6B1A4A] font-semibold mb-[18px] flex items-center gap-2 font-['DM_Sans'] flex-wrap">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0"><rect x="1" y="2" width="12" height="11" rx="3" stroke="#9B2458" strokeWidth="1.3"/><path d="M1 6h12" stroke="#9B2458" strokeWidth="1.3"/><path d="M4 1v2M10 1v2" stroke="#9B2458" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <span className="break-words"><strong className="font-['Playfair_Display'] text-[15px]">{days}</strong>&nbsp;day{days > 1 ? "s" : ""}&nbsp;·&nbsp;{(LEAVE_META[form.leaveType] || {}).label || ""}</span>
          </div>
        )}

        <FormField label="Reason" error={errors.reason}>
          <textarea value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="Briefly explain the reason for your leave…" className={`${inputBase} ${ib("reason")} min-h-[88px] resize-y leading-[1.6]`} />
        </FormField>
        <p className="text-[11px] text-[#9B8BAE] mt-1 mb-[18px] font-['DM_Sans']">{(form.reason || "").length} / 500 chars (min 10)</p>

        <div className="flex flex-col sm:flex-row justify-end gap-[10px]">
          {editTarget && (
            <button className={btnSecondary} onClick={() => { setForm(LEAVE_BLANK); setEditTarget(null); setErrors({}); }}>Cancel Edit</button>
          )}
          <button className={btnPrimary} onClick={handleSubmit} disabled={applyMut.isPending || editMut.isPending}>
            {applyMut.isPending || editMut.isPending ? "Submitting…" : editTarget ? "Update Request →" : "Submit Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox title="Leave History" rightEl={
        history.length > 0
          ? <span className="bg-gradient-to-br from-[#F9EFF5] to-[#F4E6F0] text-[#6B1A4A] text-[11px] font-bold px-[10px] py-[3px] rounded-full font-['DM_Sans'] whitespace-nowrap">{history.length} record{history.length !== 1 ? "s" : ""}</span>
          : null
      }>
        {histLoading ? <Spinner /> : history.length === 0 ? <EmptyState msg="No leave records yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  {["Type", "Duration", "Days", "Reason", "Status", "Applied", "Actions"].map(h => (
                    <th key={h} className="text-left px-[14px] py-[10px] text-[11px] font-semibold text-[#9B8BAE] uppercase tracking-[0.7px] bg-[#FAF7FD] border-b border-[#EDE6F5] font-['DM_Sans'] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((leave, i) => (
                  <tr key={leave._id || i} className="group">
                    <td className="px-[14px] py-[13px] border-b border-[#F5F0FA] align-middle group-hover:bg-[#FDFBFF]"><LeaveTypeBadge type={leave.leaveType} /></td>
                    <td className="px-[14px] py-[13px] border-b border-[#F5F0FA] align-middle group-hover:bg-[#FDFBFF]">
                      <div className="font-medium text-[#1C1028] text-[13px] font-['DM_Sans'] whitespace-nowrap">{fmt(leave.startDate)}</div>
                      <div className="text-[11.5px] text-[#9B8BAE] mt-[2px] whitespace-nowrap">→ {fmt(leave.endDate)}</div>
                    </td>
                    <td className="px-[14px] py-[13px] border-b border-[#F5F0FA] align-middle group-hover:bg-[#FDFBFF] font-['Playfair_Display'] text-[28px] font-bold text-[#1C1028]">{leave.days}</td>
                    <td className="px-[14px] py-[13px] border-b border-[#F5F0FA] align-middle group-hover:bg-[#FDFBFF] max-w-[180px]">
                      <span className="text-[13px] text-[rgba(115,0,66,0.55)] line-clamp-2 font-['DM_Sans']" title={leave.reason}>{leave.reason}</span>
                    </td>
                    <td className="px-[14px] py-[13px] border-b border-[#F5F0FA] align-middle group-hover:bg-[#FDFBFF]"><StatusBadge status={leave.status} meta={LEAVE_STATUS_META} /></td>
                    <td className="px-[14px] py-[13px] border-b border-[#F5F0FA] align-middle group-hover:bg-[#FDFBFF] text-[12px] text-[#9B8BAE] whitespace-nowrap font-['DM_Sans']">{fmt(leave.createdAt)}</td>
                    <td className="px-[14px] py-[13px] border-b border-[#F5F0FA] align-middle group-hover:bg-[#FDFBFF]">
                      {leave.status === "pending_manager" && (
                        <div className="flex gap-[6px]">
                          <button className={`${actionBtn} bg-[#F0F9FF] text-[#0369A1]`} onClick={() => openEdit(leave)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                          </button>
                          <button className={`${actionBtn} bg-[#FFF1F2] text-[#991B1B]`} onClick={() => handleDelete(leave._id)} disabled={deleteMut.isPending}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBox>
    </div>
  );
};

const WFHTab = ({ showToast }) => {
  const [form, setForm]             = useState(WFH_BLANK);
  const [errors, setErrors]         = useState({});
  const [editTarget, setEditTarget] = useState(null);

  const { data: wfhData, isLoading } = useGetMyWFH();
  const applyMut  = useApplyWFH();
  const editMut   = useEditWFH();
  const deleteMut = useDeleteWFH();

  const wfhList = wfhData?.wfhList || [];

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

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
      if (editTarget) {
        await editMut.mutateAsync({ id: editTarget._id, data: form });
        showToast("WFH request updated", "success");
      } else {
        await applyMut.mutateAsync(form);
        showToast("WFH request submitted", "success");
      }
      setForm(WFH_BLANK);
      setEditTarget(null);
      setErrors({});
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Something went wrong", "error");
    }
  };

  const openEdit = (wfh) => {
    setEditTarget(wfh);
    setForm({
      startDate: new Date(wfh.startDate).toISOString().split("T")[0],
      endDate:   new Date(wfh.endDate).toISOString().split("T")[0],
      reason:    wfh.reason,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this WFH request?")) return;
    try {
      await deleteMut.mutateAsync(id);
      showToast("WFH request deleted", "info");
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || "Delete failed", "error");
    }
  };

  const days = daysBetween(form.startDate, form.endDate);
  const ib   = (k) => errors[k] ? "border-[#FCA5A5]" : "border-[#E2D8EE]";

  return (
    <div>
      <SectionBox title={editTarget ? "Edit WFH Request" : "New WFH Request"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] mb-[18px]">
          <FormField label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} min={todayStr()} className={`${inputBase} ${ib("startDate")}`} />
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} min={form.startDate || todayStr()} className={`${inputBase} ${ib("endDate")}`} />
          </FormField>
        </div>

        {days > 0 && (
          <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] border border-[#BFDBFE] rounded-[12px] px-4 sm:px-[18px] py-3 text-[13px] text-[#1D4ED8] font-semibold mb-[18px] flex items-center gap-2 font-['DM_Sans'] flex-wrap">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0"><rect x="1" y="1" width="12" height="12" rx="3" stroke="#3B82F6" strokeWidth="1.3"/><path d="M4 7h2v4M8 4v7" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <span className="break-words"><strong className="font-['Playfair_Display'] text-[15px]">{days}</strong>&nbsp;day{days > 1 ? "s" : ""}&nbsp;·&nbsp;Work From Home</span>
          </div>
        )}

        <FormField label="Reason" error={errors.reason}>
          <textarea value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="Briefly explain why you need to work from home…" className={`${inputBase} ${ib("reason")} min-h-[88px] resize-y leading-[1.6]`} />
        </FormField>

        <div className="flex flex-col sm:flex-row justify-end gap-[10px] mt-[18px]">
          {editTarget && (
            <button className={btnSecondary} onClick={() => { setForm(WFH_BLANK); setEditTarget(null); setErrors({}); }}>Cancel Edit</button>
          )}
          <button className={btnPrimary} onClick={handleSubmit} disabled={applyMut.isPending || editMut.isPending}>
            {applyMut.isPending || editMut.isPending ? "Submitting…" : editTarget ? "Update Request →" : "Submit WFH Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox title="WFH History" rightEl={
        wfhList.length > 0
          ? <span className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] text-[#1D4ED8] text-[11px] font-bold px-[10px] py-[3px] rounded-full font-['DM_Sans'] whitespace-nowrap">{wfhList.length} record{wfhList.length !== 1 ? "s" : ""}</span>
          : null
      }>
        {isLoading ? <Spinner /> : wfhList.length === 0 ? <EmptyState msg="No WFH records yet" /> : (
          <div className="flex flex-col">
            {wfhList.map((wfh, i) => {
              const canEdit = wfh.status === "pending_manager";
              const d       = wfh.days || daysBetween(wfh.startDate, wfh.endDate);
              return (
                <div key={wfh._id || i} className={`bg-white rounded-[16px] border border-[rgba(200,185,220,0.28)] px-4 sm:px-[18px] py-4 mb-[10px] shadow-[0_2px_10px_rgba(80,40,100,0.06)] transition-all duration-[220ms] hover:shadow-[0_6px_22px_rgba(80,40,100,0.11)] hover:-translate-y-px relative overflow-hidden ${DELAY_CLASSES[i % DELAY_CLASSES.length]}`}>
                  <div className="absolute top-0 left-0 w-[3px] bottom-0 bg-[#3B82F6] rounded-l-[16px]" />
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-[14px] pl-2">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex gap-[6px] flex-wrap mb-[10px]">
                        <span className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold bg-[#DBEAFE] text-[#1D4ED8] font-['DM_Sans']">
                          <span className="w-[5px] h-[5px] rounded-full bg-[#3B82F6] shrink-0" /> WFH
                        </span>
                        <StatusBadge status={wfh.status} meta={WFH_STATUS_META} />
                        <span className="inline-flex items-center gap-1 px-[10px] py-[3px] rounded-full text-[11px] font-semibold bg-[#F0F9FF] text-[#0369A1] font-['DM_Sans']">
                          {d} day{d > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-[6px] text-[12px] text-[#9B8BAE] font-['DM_Sans'] flex-wrap">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="shrink-0"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1"/><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1"/><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round"/></svg>
                        <span className="font-medium text-[#4A3860]">{fmt(wfh.startDate)}</span>
                        <span className="text-[#D4BFEA] text-[10px]">→</span>
                        <span className="font-medium text-[#4A3860]">{fmt(wfh.endDate)}</span>
                      </div>
                      {wfh.reason && (
                        <div className="bg-[#F0F9FF] rounded-[10px] px-[13px] py-2 text-[12px] text-[#1E3A5F] mt-[10px] border-l-[3px] border-[#93C5FD] leading-[1.6] font-['DM_Sans'] break-words">
                          <span className="text-[#1D4ED8] font-semibold">Reason — </span>{wfh.reason}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                      {canEdit && (
                        <div className="flex gap-[6px]">
                          <button className={`${actionBtn} bg-[#F0F9FF] text-[#0369A1]`} onClick={() => openEdit(wfh)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                          </button>
                          <button className={`${actionBtn} bg-[#FFF1F2] text-[#991B1B]`} onClick={() => handleDelete(wfh._id)} disabled={deleteMut.isPending}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                            Delete
                          </button>
                        </div>
                      )}
                      {wfh.createdAt && (
                        <div className="text-[10px] text-[#9B8BAE] text-right leading-[1.4] font-['DM_Sans']">
                          Applied<br /><span className="font-semibold text-[#7B6890]">{fmt(wfh.createdAt)}</span>
                        </div>
                      )}
                    </div>
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

const LeaveStatusTab = ({ histLoading, history, wfhLoading, wfhList }) => {
  const [activeTracker, setActiveTracker] = useState("leave");

  if (histLoading || wfhLoading) return <Spinner />;

  return (
    <div>
      <div className="flex gap-1 bg-[rgba(235,228,245,0.5)] rounded-[12px] p-1 mb-5 w-fit max-w-full border border-[rgba(200,185,220,0.25)] flex-wrap">
        {[{ key: "leave", label: "Leave Status" }, { key: "wfh", label: "WFH Status" }].map(t => {
          const active = activeTracker === t.key;
          return (
            <button key={t.key}
              className={`px-[18px] py-[7px] rounded-[9px] text-[12px] font-['DM_Sans'] border-none cursor-pointer transition-all duration-200 whitespace-nowrap ${
                active
                  ? "text-white font-semibold bg-gradient-to-br from-[#6B1A4A] to-[#9B2458] shadow-[0_3px_12px_rgba(107,26,74,0.32)]"
                  : "text-[#9B8BAE] font-normal bg-transparent"
              }`}
              onClick={() => setActiveTracker(t.key)}>
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTracker === "leave" && (
        <SectionBox title="Latest Leave Status">
          <JourneyTracker
            item={history[0] || null}
            statusMeta={LEAVE_STATUS_META}
            getJourneyConfig={getLeaveJourneyConfig}
            isWFH={false}
          />
        </SectionBox>
      )}

      {activeTracker === "wfh" && (
        <SectionBox title="Latest WFH Status">
          <JourneyTracker
            item={wfhList[0] || null}
            statusMeta={WFH_STATUS_META}
            getJourneyConfig={getWFHJourneyConfig}
            isWFH={true}
          />
        </SectionBox>
      )}
    </div>
  );
};

const EmployeeLeaveWFH = () => {
  const [tab, setTab]     = useState("status");
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const { data: meData }                              = useGetMeUser();
  const { data: balanceData, isLoading: balLoading }  = useGetAllLeaves();
  const { data: historyData, isLoading: histLoading } = useGetAllLeaveHistory();
  const { data: wfhData,     isLoading: wfhLoading }  = useGetMyWFH();

  const employee = meData?.employee ?? null;
  const balance  = balanceData || {};
  const history  = historyData?.leaves || [];
  const wfhList  = wfhData?.wfhList || [];

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(p => ({ ...p, visible: false })), 3400);
  };

  const TABS = [
    { key: "status",  label: "Leave Status"   },
    { key: "balance", label: "Leave Balance"  },
    { key: "apply",   label: "Apply Leave"    },
    { key: "wfh",     label: "Work From Home" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F3FC] via-[#F0EBF8] to-[#F4F0FA] font-['DM_Sans'] px-4 py-6 sm:px-6 sm:py-8 md:px-9 md:py-8 overflow-x-hidden relative">
      <FontLoader />

      <div className="fixed -top-20 -right-20 w-[220px] h-[220px] sm:w-[360px] sm:h-[360px] rounded-full bg-[radial-gradient(circle,rgba(168,41,94,0.07)_0%,transparent_70%)] pointer-events-none z-0" />
      <div className="fixed -bottom-16 -left-16 w-[180px] h-[180px] sm:w-[280px] sm:h-[280px] rounded-full bg-[radial-gradient(circle,rgba(107,26,74,0.06)_0%,transparent_70%)] pointer-events-none z-0" />

      <div className="relative z-[1] max-w-[1100px] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-[30px] flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-[50px] h-[50px] rounded-[16px] bg-gradient-to-br from-[#6B1A4A] to-[#A8295E] flex items-center justify-center shadow-[0_6px_20px_rgba(107,26,74,0.38)] shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="4" width="16" height="15" rx="3" stroke="white" strokeWidth="1.5"/>
                <path d="M3 9h16" stroke="white" strokeWidth="1.5"/>
                <path d="M7 2v4M15 2v4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 13h4M7 16h8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1C1028] m-0 font-['Playfair_Display'] tracking-[-0.3px]">Leave & WFH</h1>
              <p className="text-[12px] text-[#9B8BAE] mt-[3px] font-normal">Apply · Track balance · Request work from home</p>
            </div>
          </div>
          {employee && (
            <div className="bg-white border border-[rgba(200,185,220,0.4)] rounded-[14px] px-4 py-[10px] flex items-center gap-[10px] shadow-[0_2px_12px_rgba(80,40,100,0.08)] w-full sm:w-auto">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#6B1A4A] to-[#A8295E] text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                {(employee.f_name?.[0] || "")}{(employee.l_name?.[0] || "")}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[12px] text-[#1C1028] truncate">{employee.f_name} {employee.l_name}</div>
                <div className="text-[10px] text-[#9B8BAE] mt-[1px] truncate">{employee.designation || employee.role}</div>
              </div>
            </div>
          )}
        </div>

        <div data-tour="leave-tabs" className="flex flex-wrap gap-1 bg-[rgba(235,228,245,0.7)] backdrop-blur-[8px] rounded-[14px] p-1 mb-7 w-full sm:w-fit border border-[rgba(200,185,220,0.3)] shadow-[0_2px_8px_rgba(80,40,100,0.06)]">
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key}
                className={`flex-1 sm:flex-none px-[14px] sm:px-[22px] py-[9px] rounded-[10px] text-[13px] font-['DM_Sans'] border-none cursor-pointer transition-all duration-200 whitespace-nowrap ${
                  active
                    ? "text-white font-semibold bg-gradient-to-br from-[#6B1A4A] to-[#9B2458] shadow-[0_3px_12px_rgba(107,26,74,0.32)]"
                    : "text-[#9B8BAE] font-normal bg-transparent"
                }`}
                onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "status"  && <LeaveStatusTab histLoading={histLoading} history={history} wfhLoading={wfhLoading} wfhList={wfhList} />}
        {tab === "balance" && <LeaveBalanceTab employee={employee} balance={balance} isLoading={balLoading} />}
        {tab === "apply"   && <LeaveApplyTab employee={employee} showToast={showToast} />}
        {tab === "wfh"     && <WFHTab showToast={showToast} />}
      </div>

      <Toast toast={toast} />
    </div>
  );
};

export default EmployeeLeaveWFH;