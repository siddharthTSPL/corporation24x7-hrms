import React, { useState } from "react";
import {
  useShowAllLeaves,
  useAcceptLeaveByAdmin,
  useRejectLeaveByAdmin,
} from "../../auth/server-state/superadmin/leave/suleave.hook";
import {
  useGetPendingWFHSuperAdmin,
  useApproveWFHSuperAdmin,
  useRejectWFHSuperAdmin,
} from "../../auth/server-state/superadmin/wfh/suwfh.hook";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .animate-fadeSlideUp { animation: fadeSlideUp .35s ease both; }
    .animate-spin-slow { animation: spin .7s linear infinite; }
  `}</style>
);

const LEAVE_META = {
  el:          { label: "Earned Leave",    bg: "#DCFCE7", color: "#14803D", accent: "#22C55E", dot: "#16A34A" },
  sl:          { label: "Sick Leave",      bg: "#DBEAFE", color: "#1D4ED8", accent: "#3B82F6", dot: "#2563EB" },
  pl:          { label: "Privilege Leave", bg: "#FEF3C7", color: "#92400E", accent: "#F59E0B", dot: "#D97706" },
  ml:          { label: "Maternity Leave", bg: "#F3E8FF", color: "#6B21A8", accent: "#A855F7", dot: "#7C3AED" },
  cl:          { label: "Casual Leave",    bg: "#FCE7F3", color: "#9D174D", accent: "#EC4899", dot: "#BE185D" },
  half_day_el: { label: "Half Day EL",     bg: "#D1FAE5", color: "#065F46", accent: "#10B981", dot: "#059669" },
  half_day_sl: { label: "Half Day SL",     bg: "#BFDBFE", color: "#1E40AF", accent: "#60A5FA", dot: "#3B82F6" },
};

const STATUS_META = {
  pending:                        { label: "Pending",           bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  forwarded_reporting_manager:    { label: "Fwd by Manager",    bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  approved_reporting_manager:     { label: "Approved",          bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_reporting_manager:     { label: "Rejected",          bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  pending_reporting_manager:      { label: "Pending Review",    bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  approved_manager:               { label: "Mgr Approved",      bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_manager:               { label: "Mgr Rejected",      bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  pending_manager:                { label: "Pending Manager",   bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  pending_admin:                  { label: "Pending Admin",     bg: "#FFF7ED", color: "#9A3412", dot: "#F97316" },
  approved_admin:                 { label: "Approved by Admin", bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_admin:                 { label: "Rejected by Admin", bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  pending_superadmin:             { label: "Awaiting Approval", bg: "#FFF7ED", color: "#9A3412", dot: "#F97316" },
  approved_superadmin:            { label: "Approved",          bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_superadmin:            { label: "Rejected",          bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
};

const AVATAR_COLORS = [
  "linear-gradient(135deg,#730042,#CD166E)",
  "linear-gradient(135deg,#1D4ED8,#3B82F6)",
  "linear-gradient(135deg,#065F46,#10B981)",
  "linear-gradient(135deg,#92400E,#F59E0B)",
  "linear-gradient(135deg,#6B21A8,#A855F7)",
  "linear-gradient(135deg,#1E3A5F,#60A5FA)",
];

const initials    = (f = "", l = "") => (`${f[0] || ""}${l[0] || ""}`.toUpperCase() || "?");
const avatarColor = (name = "") => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const formatDate  = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const daysDiff = (s, e) => {
  if (!s || !e) return 0;
  return Math.max(Math.round((new Date(e) - new Date(s)) / 86400000) + 1, 1);
};

const isTerminalStatus = (status) =>
  status?.startsWith("approved") || status?.startsWith("rejected");

const humanizeStatus = (s = "") =>
  s.split("_").filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const csvEscape = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

const downloadCSV = (headers, rows, filename) => {
  const csv = [headers.map(csvEscape).join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportLeavesToCSV = (leaves, filename, personKey) => {
  const headers = [
    "Name", "Employee ID", "Email", "Department", "Designation", "Leave Type", "Status",
    "Start Date", "End Date", "Days", "Reason", "Remarks", "Applied On", "Decided By", "Decision Remarks",
  ];
  const rows = leaves.map((l) => {
    const person = l[personKey] || l.employee || l.manager || l.admin || {};
    const decidedBy = l.approvedByModel || l.rejectedByModel || "—";
    return [
      csvEscape(`${person.f_name || ""} ${person.l_name || ""}`.trim() || "—"),
      csvEscape(person.empid || "—"),
      csvEscape(person.work_email || "—"),
      csvEscape(person.department || "—"),
      csvEscape(person.designation || "—"),
      csvEscape((LEAVE_META[l.leaveType] || {}).label || l.leaveType || "—"),
      csvEscape(humanizeStatus(l.status)),
      csvEscape(formatDate(l.startDate)),
      csvEscape(formatDate(l.endDate)),
      l.days || daysDiff(l.startDate, l.endDate),
      csvEscape(l.reason || ""),
      csvEscape(l.remarks || ""),
      csvEscape(formatDate(l.createdAt)),
      csvEscape(decidedBy),
      csvEscape(l.remarks || ""),
    ];
  });
  downloadCSV(headers, rows, filename);
};

const exportWFHToCSV = (wfhList, filename) => {
  const headers = [
    "Name", "Requester Type", "Email", "Designation", "Status",
    "Start Date", "End Date", "Days", "Reason", "Remarks", "Applied On",
  ];
  const rows = wfhList.map((w) => {
    const person = w.requester || {};
    return [
      csvEscape(`${person.f_name || ""} ${person.l_name || ""}`.trim() || "—"),
      csvEscape(w.requesterModel || "—"),
      csvEscape(person.work_email || "—"),
      csvEscape(person.designation || "—"),
      csvEscape(humanizeStatus(w.status)),
      csvEscape(formatDate(w.startDate)),
      csvEscape(formatDate(w.endDate)),
      w.days || daysDiff(w.startDate, w.endDate),
      csvEscape(w.reason || ""),
      csvEscape(w.remarks || ""),
      csvEscape(formatDate(w.createdAt)),
    ];
  });
  downloadCSV(headers, rows, `${filename}.csv`);
};

const ExportButton = ({ onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border-[1.5px] border-purple-100 bg-white text-[#730042] hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1.5 9.5v1a1 1 0 001 1h7a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
    Export CSV
  </button>
);

const FilterToolbar = ({ search, setSearch, typeFilter, setTypeFilter, dateFrom, setDateFrom, dateTo, setDateTo, onExport, exportDisabled, showType = true }) => (
  <div className="flex flex-wrap items-center gap-2.5 mb-4 bg-white border border-purple-100 rounded-xl p-3">
    <div className="relative flex-1 min-w-[160px]">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <circle cx="5.5" cy="5.5" r="4" stroke="#C4AADA" strokeWidth="1.3" />
        <path d="M8.5 8.5L11 11" stroke="#C4AADA" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, email, reason…"
        className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-purple-100 focus:outline-none focus:border-[#CD166E] text-gray-700 placeholder:text-gray-400"
      />
    </div>
    {showType && (
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-xs border border-purple-100 text-gray-600 focus:outline-none focus:border-[#CD166E] bg-white"
      >
        <option value="all">All Leave Types</option>
        {Object.entries(LEAVE_META).map(([key, m]) => (
          <option key={key} value={key}>{m.label}</option>
        ))}
      </select>
    )}
    <input
      type="date"
      value={dateFrom}
      onChange={(e) => setDateFrom(e.target.value)}
      className="px-3 py-1.5 rounded-lg text-xs border border-purple-100 text-gray-600 focus:outline-none focus:border-[#CD166E]"
    />
    <span className="text-xs text-gray-300">to</span>
    <input
      type="date"
      value={dateTo}
      onChange={(e) => setDateTo(e.target.value)}
      className="px-3 py-1.5 rounded-lg text-xs border border-purple-100 text-gray-600 focus:outline-none focus:border-[#CD166E]"
    />
    {(search || dateFrom || dateTo || (showType && typeFilter !== "all")) && (
      <button
        onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); if (showType) setTypeFilter("all"); }}
        className="text-xs font-medium text-gray-400 hover:text-[#730042] px-2"
      >
        Clear
      </button>
    )}
    <ExportButton onClick={onExport} disabled={exportDisabled} />
  </div>
);

const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3.5">
    <div className="w-9 h-9 border-[3px] border-purple-100 border-t-[#730042] rounded-full animate-spin-slow" />
    <p className="text-[13px] text-gray-400 font-medium">Loading…</p>
  </div>
);

const EmptyState = ({ msg = "No records found", icon = "calendar" }) => (
  <div className="flex flex-col items-center py-16 gap-3">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
      {icon === "wfh" ? (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M4 14L14 5l10 9" stroke="#C4AADA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 12v10h5v-6h4v6h5V12" stroke="#C4AADA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="4" y="5" width="20" height="19" rx="4" stroke="#C4AADA" strokeWidth="1.5" fill="none" />
          <path d="M4 11h20" stroke="#C4AADA" strokeWidth="1.5" />
          <path d="M9 8V5M19 8V5" stroke="#C4AADA" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 16h6M9 20h10" stroke="#D4BFEA" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
    </div>
    <p className="text-[13px] text-gray-400 font-medium">{msg}</p>
  </div>
);

const Pagination = ({ page, setPage, totalPages }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-purple-100">
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-[10px] text-xs font-semibold text-[#730042] bg-purple-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-100"
      >
        ← Prev
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => setPage(p)}
          className="w-[30px] h-[30px] rounded-[10px] text-xs font-semibold transition-all"
          style={p === page
            ? { background: "linear-gradient(135deg,#730042,#CD166E)", color: "#fff" }
            : { background: "#FAF5FB", color: "#730042" }}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded-[10px] text-xs font-semibold text-[#730042] bg-purple-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-100"
      >
        Next →
      </button>
    </div>
  );
};

const Toast = ({ toast }) => {
  const colors = {
    success: { bg: "bg-green-50/95", color: "text-green-700", border: "border-green-200", icon: "bg-green-500" },
    error:   { bg: "bg-red-50/95", color: "text-red-700", border: "border-red-200", icon: "bg-red-500" },
    info:    { bg: "bg-blue-50/95", color: "text-blue-700", border: "border-blue-200", icon: "bg-blue-500" },
  };
  const c = colors[toast.type] || colors.info;
  return (
    <div className={`fixed bottom-4 right-4 sm:bottom-8 sm:right-8 left-4 sm:left-auto px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl text-[13px] font-medium shadow-lg z-[9999] flex items-center gap-2.5 transition-all duration-300 backdrop-blur-md ${c.bg} ${c.color} ${c.border} border`}
      style={{
        transform: toast.visible ? "translateY(0) scale(1)" : "translateY(24px) scale(.94)",
        opacity: toast.visible ? 1 : 0,
        pointerEvents: toast.visible ? "auto" : "none",
      }}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${c.icon}`}>
        {toast.type === "success" && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>}
        {toast.type === "error"   && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>}
        {toast.type === "info"    && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 4v4M5 3v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>}
      </div>
      {toast.message}
    </div>
  );
};

const TypeBadge = ({ type }) => {
  const m = LEAVE_META[type] || { label: humanizeStatus(type || "other"), bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0" style={{ background: m.bg, color: m.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: humanizeStatus(status), bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0" style={{ background: m.bg, color: m.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
};

const SummaryStrip = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
    {stats.map((s, i) => (
      <div key={s.label} 
        className="rounded-2xl p-3 sm:p-4 flex items-center gap-3 border border-black/5 shadow-sm animate-fadeSlideUp overflow-hidden min-w-0"
        style={{ background: s.bg, animationDelay: `${i * .07}s` }}>
        <span className="text-2xl sm:text-3xl font-extrabold leading-none shrink-0" style={{ color: s.color, fontFamily: "'Playfair Display',serif" }}>{s.val}</span>
        <span className="text-[11px] sm:text-xs font-semibold leading-tight min-w-0" style={{ color: s.color, opacity: .8 }}>{s.label}</span>
      </div>
    ))}
  </div>
);

const PersonCard = ({ person, accentBadge, roleLabel = "Person" }) => {
  const name = `${person?.f_name || ""} ${person?.l_name || ""}`.trim();
  const displayName = name || `Unknown ${roleLabel}`;
  const isUnknown = !name;
  return (
    <div className="flex items-center gap-3 sm:gap-4 mb-3 min-w-0">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-md"
        style={{ background: avatarColor(person?.f_name || "A") }}>
        {initials(person?.f_name, person?.l_name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold truncate ${isUnknown ? "text-gray-400 italic" : "text-gray-800"}`}>
          {displayName}
        </div>
        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
          {isUnknown ? (
            <span className="truncate">{person?._id ? `ID: ${person._id}` : "Account no longer available"}</span>
          ) : (
            <span className="truncate">{person.work_email}</span>
          )}
          {person?.designation && (
            <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold shrink-0">
              {person.designation}
            </span>
          )}
          {accentBadge && (
            <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-br from-pink-50 to-pink-100 text-[#730042] text-[10px] font-bold border border-pink-200 shrink-0">
              {accentBadge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const ActionButtons = ({ onApprove, onReject }) => (
  <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0">
    <button className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-0.5 bg-green-50 text-green-700 shadow-sm"
      onClick={onApprove}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5 5.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      Approve
    </button>
    <button className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:-translate-y-0.5 bg-red-50 text-red-700 shadow-sm"
      onClick={onReject}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      Reject
    </button>
  </div>
);

const TerminalIcon = ({ status }) => {
  const sm = STATUS_META[status];
  if (!sm) return null;
  const isApproved = status.startsWith("approved");
  const isRejected = status.startsWith("rejected");
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2" style={{ background: sm.bg, borderColor: sm.dot }}>
      {isApproved && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l2.5 2.5 5.5-5" stroke={sm.dot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      {isRejected && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke={sm.dot} strokeWidth="2" strokeLinecap="round" /></svg>}
    </div>
  );
};

const ProcessingOverlay = () => (
  <div className="absolute inset-0 rounded-2xl bg-white/70 flex items-center justify-center backdrop-blur-sm z-10">
    <div className="w-6 h-6 border-2 border-purple-100 border-t-[#730042] rounded-full animate-spin-slow" />
  </div>
);

const LeaveCard = ({ leave, person, accentBadge, roleLabel, actionable, processingId, onApprove, onReject, idx }) => {
  const isProcessing = processingId === leave._id;
  const days = leave.days || daysDiff(leave.startDate, leave.endDate);
  const accent = (LEAVE_META[leave.leaveType] || { accent: "#730042" }).accent;

  return (
    <div className="bg-white rounded-2xl border border-purple-100 p-4 sm:p-5 mb-3.5 shadow-sm hover:shadow-md transition-all relative overflow-hidden animate-fadeSlideUp flex flex-col sm:flex-row justify-between items-start gap-4"
      style={{ opacity: isProcessing ? 0.6 : 1, pointerEvents: isProcessing ? "none" : "auto", animationDelay: `${idx * 0.06}s` }}>
      <div className="absolute top-0 left-0 w-1 bottom-0 rounded-l-2xl" style={{ background: accent }} />
      
      <div className="flex-1 min-w-0 w-full pl-2">
        <PersonCard person={person} accentBadge={accentBadge} roleLabel={roleLabel} />
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          <TypeBadge type={leave.leaveType} />
          <StatusBadge status={leave.status} />
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-[#6B1A4A]">
            {days} day{days > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1" /><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1" /><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round" /></svg>
          <span className="font-medium text-gray-600">{formatDate(leave.startDate)}</span>
          <span className="text-[10px]">→</span>
          <span className="font-medium text-gray-600">{formatDate(leave.endDate)}</span>
        </div>
        {leave.reason && (
          <div className="bg-purple-50/50 rounded-xl px-3.5 py-2.5 text-xs text-gray-600 mt-2.5 border-l-4 border-purple-300 leading-relaxed">
            <span className="text-[#730042] font-semibold">Reason — </span>{leave.reason}
          </div>
        )}
        {leave.remarks && (
          <div className="bg-blue-50/50 rounded-xl px-3.5 py-2.5 text-xs text-blue-800 mt-2 border-l-4 border-blue-300 leading-relaxed">
            <span className="text-blue-600 font-semibold">Remarks — </span>{leave.remarks}
          </div>
        )}
        {!isTerminalStatus(leave.status) && leave.directed_to && (
          <div className="bg-amber-50/60 rounded-xl px-3.5 py-2.5 text-xs text-amber-800 mt-2 border-l-4 border-amber-300 leading-relaxed">
            <span className="text-amber-700 font-semibold">Currently with — </span>
            {`${leave.directed_to.f_name || ""} ${leave.directed_to.l_name || ""}`.trim() || "Unknown"}
            {leave.directed_to_model ? ` (${leave.directed_to_model})` : ""}
          </div>
        )}
        {leave.status?.startsWith("approved") && leave.approvedBy && (
          <div className="bg-green-50/60 rounded-xl px-3.5 py-2.5 text-xs text-green-800 mt-2 border-l-4 border-green-300 leading-relaxed">
            <span className="text-green-700 font-semibold">Approved by — </span>
            {`${leave.approvedBy.f_name || ""} ${leave.approvedBy.l_name || ""}`.trim() || "Unknown"}
          </div>
        )}
        {leave.status?.startsWith("rejected") && leave.rejectedBy && (
          <div className="bg-red-50/60 rounded-xl px-3.5 py-2.5 text-xs text-red-800 mt-2 border-l-4 border-red-300 leading-relaxed">
            <span className="text-red-700 font-semibold">Rejected by — </span>
            {`${leave.rejectedBy.f_name || ""} ${leave.rejectedBy.l_name || ""}`.trim() || "Unknown"}
          </div>
        )}
      </div>
      
      <div className="w-full sm:w-auto shrink-0">
        {actionable && !isTerminalStatus(leave.status) ? (
          <ActionButtons onApprove={onApprove} onReject={onReject} />
        ) : (
          <div className="flex justify-end">
            <TerminalIcon status={leave.status} />
          </div>
        )}
      </div>

      {isProcessing && <ProcessingOverlay />}
    </div>
  );
};

const WFHCard = ({ wfh, processingId, onAction, idx }) => {
  const person = wfh.requester || {};
  const isProcessing = processingId === wfh._id;
  const days = wfh.days || daysDiff(wfh.startDate, wfh.endDate);
  const requesterModel = wfh.requesterModel || "User";
  const modelColors = {
    User:    "linear-gradient(135deg,#1D4ED8,#3B82F6)",
    Manager: "linear-gradient(135deg,#065F46,#10B981)",
    Admin:   "linear-gradient(135deg,#730042,#CD166E)",
  };
  const accent = modelColors[requesterModel] || modelColors.User;

  return (
    <div className="bg-white rounded-2xl border border-purple-100 p-4 sm:p-5 mb-3.5 shadow-sm hover:shadow-md transition-all relative overflow-hidden animate-fadeSlideUp flex flex-col sm:flex-row justify-between items-start gap-4"
      style={{ opacity: isProcessing ? 0.6 : 1, pointerEvents: isProcessing ? "none" : "auto", animationDelay: `${idx * 0.06}s` }}>
      <div className="absolute top-0 left-0 w-1 bottom-0 rounded-l-2xl" style={{ background: accent }} />
      
      <div className="flex-1 min-w-0 w-full pl-2">
        <PersonCard person={person} accentBadge={requesterModel} />
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Work From Home
          </span>
          <StatusBadge status={wfh.status} />
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-[#6B1A4A]">
            {days} day{days > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1" /><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1" /><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round" /></svg>
          <span className="font-medium text-gray-600">{formatDate(wfh.startDate)}</span>
          <span className="text-[10px]">→</span>
          <span className="font-medium text-gray-600">{formatDate(wfh.endDate)}</span>
        </div>
        {wfh.reason && (
          <div className="bg-blue-50/50 rounded-xl px-3.5 py-2.5 text-xs text-blue-800 mt-2.5 border-l-4 border-blue-300 leading-relaxed">
            <span className="text-blue-600 font-semibold">Reason — </span>{wfh.reason}
          </div>
        )}
        {wfh.remarks && (
          <div className="bg-purple-50/50 rounded-xl px-3.5 py-2.5 text-xs text-gray-600 mt-2 border-l-4 border-purple-300 leading-relaxed">
            <span className="text-[#730042] font-semibold">Remarks — </span>{wfh.remarks}
          </div>
        )}
      </div>
      
      <div className="w-full sm:w-auto shrink-0">
        {!isTerminalStatus(wfh.status) ? (
          <ActionButtons
            onApprove={() => onAction(wfh._id, "approve")}
            onReject={() => onAction(wfh._id, "reject")}
          />
        ) : (
          <div className="flex justify-end">
            <TerminalIcon status={wfh.status} />
          </div>
        )}
      </div>

      {isProcessing && <ProcessingOverlay />}
    </div>
  );
};

const EmployeeLeavesTab = ({ leaves, isLoading, processingId }) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const FILTERS = [
    { key: "all",                        label: "All" },
    { key: "forwarded_reporting_manager", label: "Forwarded" },
    { key: "approved_reporting_manager",  label: "Approved" },
    { key: "rejected_reporting_manager",  label: "Rejected" },
  ];

  const count    = (key) => key === "all" ? leaves.length : leaves.filter(l => l.status === key).length;
  const statusFiltered = filter === "all" ? leaves : leaves.filter(l => l.status === filter);

  const filtered = statusFiltered.filter((l) => {
    const person = l.employee || {};
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      `${person.f_name || ""} ${person.l_name || ""}`.toLowerCase().includes(q) ||
      (person.work_email || "").toLowerCase().includes(q) ||
      (l.reason || "").toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || l.leaveType === typeFilter;
    const start = l.startDate ? new Date(l.startDate) : null;
    const matchesFrom = !dateFrom || (start && start >= new Date(dateFrom));
    const matchesTo   = !dateTo   || (start && start <= new Date(dateTo));
    return matchesSearch && matchesType && matchesFrom && matchesTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    exportLeavesToCSV(filtered, `employee-leaves-${new Date().toISOString().slice(0, 10)}.csv`, "employee");
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <SummaryStrip stats={[
        { label: "Total",    val: leaves.length,                                                         color: "#730042", bg: "linear-gradient(135deg,#FFF0F7,#FFE4F2)" },
        { label: "Pending",  val: leaves.filter(l => l.status === "forwarded_reporting_manager").length, color: "#1D4ED8", bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
        { label: "Approved", val: leaves.filter(l => l.status === "approved_reporting_manager").length,  color: "#14803D", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
        { label: "Rejected", val: leaves.filter(l => l.status === "rejected_reporting_manager").length,  color: "#991B1B", bg: "linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
      ]} />

      <FilterToolbar
        search={search} setSearch={(v) => { setSearch(v); setPage(1); }}
        typeFilter={typeFilter} setTypeFilter={(v) => { setTypeFilter(v); setPage(1); }}
        dateFrom={dateFrom} setDateFrom={(v) => { setDateFrom(v); setPage(1); }}
        dateTo={dateTo} setDateTo={(v) => { setDateTo(v); setPage(1); }}
        onExport={handleExport}
        exportDisabled={filtered.length === 0}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button key={f.key}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border-[1.5px] ${active ? "text-white shadow-md" : "bg-white text-gray-500 border-purple-100 hover:bg-gray-50"}`}
              style={active ? { background: "linear-gradient(135deg,#730042,#CD166E)", borderColor: "#730042" } : {}}
              onClick={() => { setFilter(f.key); setPage(1); }}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${active ? "bg-white/25 text-white" : "bg-purple-50 text-gray-400"}`}>
                {count(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0
        ? <EmptyState msg="No employee leave requests found" />
        : paged.map((leave, idx) => (
          <LeaveCard
            key={leave._id}
            leave={leave}
            person={leave.employee || {}}
            roleLabel="Employee"
            accentBadge={null}
            actionable={false}
            processingId={processingId}
            idx={idx}
          />
        ))
      }
      <Pagination page={page} setPage={setPage} totalPages={totalPages} />
    </div>
  );
};

const ManagerLeavesTab = ({ leaves, isLoading, processingId }) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const FILTERS = [
    { key: "all",                        label: "All" },
    { key: "pending_reporting_manager",   label: "Pending" },
    { key: "approved_reporting_manager",  label: "Approved" },
    { key: "approved_admin",              label: "Approved by Admin" },
    { key: "rejected_reporting_manager",  label: "Rejected" },
    { key: "rejected_admin",              label: "Rejected by Admin" },
  ];

  const count    = (key) => key === "all" ? leaves.length : leaves.filter(l => l.status === key).length;
  const statusFiltered = filter === "all" ? leaves : leaves.filter(l => l.status === filter);

  const filtered = statusFiltered.filter((l) => {
    const person = l.manager || {};
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      `${person.f_name || ""} ${person.l_name || ""}`.toLowerCase().includes(q) ||
      (person.work_email || "").toLowerCase().includes(q) ||
      (l.reason || "").toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || l.leaveType === typeFilter;
    const start = l.startDate ? new Date(l.startDate) : null;
    const matchesFrom = !dateFrom || (start && start >= new Date(dateFrom));
    const matchesTo   = !dateTo   || (start && start <= new Date(dateTo));
    return matchesSearch && matchesType && matchesFrom && matchesTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    exportLeavesToCSV(filtered, `manager-leaves-${new Date().toISOString().slice(0, 10)}.csv`, "manager");
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <SummaryStrip stats={[
        { label: "Total",    val: leaves.length,                                                                                                                           color: "#065F46", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
        { label: "Pending",  val: leaves.filter(l => l.status === "pending_reporting_manager" || l.status === "pending_admin").length,                                    color: "#92400E", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
        { label: "Approved", val: leaves.filter(l => l.status === "approved_reporting_manager" || l.status === "approved_admin").length,                                  color: "#14803D", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
        { label: "Rejected", val: leaves.filter(l => l.status === "rejected_reporting_manager" || l.status === "rejected_admin").length,                                  color: "#991B1B", bg: "linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
      ]} />

      <div className="mb-5 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700 leading-relaxed flex gap-3 items-start">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-green-800 to-green-500 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3v3.5M6 8v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </div>
        <span><strong>Manager Leave Requests</strong> — Leave applications submitted by managers. These are handled by admins — shown here for your visibility.</span>
      </div>

      <FilterToolbar
        search={search} setSearch={(v) => { setSearch(v); setPage(1); }}
        typeFilter={typeFilter} setTypeFilter={(v) => { setTypeFilter(v); setPage(1); }}
        dateFrom={dateFrom} setDateFrom={(v) => { setDateFrom(v); setPage(1); }}
        dateTo={dateTo} setDateTo={(v) => { setDateTo(v); setPage(1); }}
        onExport={handleExport}
        exportDisabled={filtered.length === 0}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button key={f.key}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border-[1.5px] ${active ? "text-white shadow-md" : "bg-white text-gray-500 border-purple-100 hover:bg-gray-50"}`}
              style={active ? { background: "linear-gradient(135deg,#065F46,#10B981)", borderColor: "#065F46" } : {}}
              onClick={() => { setFilter(f.key); setPage(1); }}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${active ? "bg-white/25 text-white" : "bg-purple-50 text-gray-400"}`}>
                {count(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0
        ? <EmptyState msg="No manager leave requests found" />
        : paged.map((leave, idx) => (
          <LeaveCard
            key={leave._id}
            leave={leave}
            person={leave.manager || {}}
            roleLabel="Manager"
            accentBadge="Manager"
            actionable={false}
            processingId={processingId}
            idx={idx}
          />
        ))
      }
      <Pagination page={page} setPage={setPage} totalPages={totalPages} />
    </div>
  );
};

const AdminLeavesTab = ({ leaves, isLoading, processingId, onAction }) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const FILTERS = [
    { key: "all",                label: "All" },
    { key: "pending_superadmin",  label: "Pending" },
    { key: "approved_superadmin", label: "Approved" },
    { key: "rejected_superadmin", label: "Rejected" },
  ];

  const count    = (key) => key === "all" ? leaves.length : leaves.filter(l => l.status === key).length;
  const statusFiltered = filter === "all" ? leaves : leaves.filter(l => l.status === filter);

  const filtered = statusFiltered.filter((l) => {
    const person = l.admin || {};
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      `${person.f_name || ""} ${person.l_name || ""}`.toLowerCase().includes(q) ||
      (person.work_email || "").toLowerCase().includes(q) ||
      (l.reason || "").toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || l.leaveType === typeFilter;
    const start = l.startDate ? new Date(l.startDate) : null;
    const matchesFrom = !dateFrom || (start && start >= new Date(dateFrom));
    const matchesTo   = !dateTo   || (start && start <= new Date(dateTo));
    return matchesSearch && matchesType && matchesFrom && matchesTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    exportLeavesToCSV(filtered, `admin-leaves-${new Date().toISOString().slice(0, 10)}.csv`, "admin");
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <SummaryStrip stats={[
        { label: "Total",    val: leaves.length,                                                         color: "#730042", bg: "linear-gradient(135deg,#FFF0F7,#FFE4F2)" },
        { label: "Pending",  val: leaves.filter(l => l.status === "pending_superadmin").length,          color: "#92400E", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
        { label: "Approved", val: leaves.filter(l => l.status === "approved_superadmin").length,         color: "#14803D", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
        { label: "Rejected", val: leaves.filter(l => l.status === "rejected_superadmin").length,         color: "#991B1B", bg: "linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
      ]} />

      <div className="mb-5 bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl px-4 py-3 text-xs text-[#730042] leading-relaxed flex gap-3 items-start">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#730042] to-[#CD166E] flex items-center justify-center shrink-0 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 3v3.5M6 8v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </div>
        <span><strong>Admin Leave Requests</strong> — Leave applications submitted by admins awaiting your final approval.</span>
      </div>

      <FilterToolbar
        search={search} setSearch={(v) => { setSearch(v); setPage(1); }}
        typeFilter={typeFilter} setTypeFilter={(v) => { setTypeFilter(v); setPage(1); }}
        dateFrom={dateFrom} setDateFrom={(v) => { setDateFrom(v); setPage(1); }}
        dateTo={dateTo} setDateTo={(v) => { setDateTo(v); setPage(1); }}
        onExport={handleExport}
        exportDisabled={filtered.length === 0}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button key={f.key}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border-[1.5px] ${active ? "text-white shadow-md" : "bg-white text-gray-500 border-purple-100 hover:bg-gray-50"}`}
              style={active ? { background: "linear-gradient(135deg,#730042,#CD166E)", borderColor: "#730042" } : {}}
              onClick={() => { setFilter(f.key); setPage(1); }}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${active ? "bg-white/25 text-white" : "bg-purple-50 text-gray-400"}`}>
                {count(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0
        ? <EmptyState msg="No admin leave requests found" />
        : paged.map((leave, idx) => (
          <LeaveCard
            key={leave._id}
            leave={leave}
            person={leave.admin || {}}
            roleLabel="Admin"
            accentBadge="Admin"
            actionable={true}
            processingId={processingId}
            onApprove={() => onAction(leave._id, "accept")}
            onReject={() => onAction(leave._id, "reject")}
            idx={idx}
          />
        ))
      }
      <Pagination page={page} setPage={setPage} totalPages={totalPages} />
    </div>
  );
};

const WFHTab = ({ wfhList, isLoading, processingId, onAction }) => {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const FILTERS = [
    { key: "all",                label: "All" },
    { key: "pending_superadmin",  label: "Pending" },
    { key: "approved_superadmin", label: "Approved" },
    { key: "rejected_superadmin", label: "Rejected" },
  ];

  const count    = (key) => key === "all" ? wfhList.length : wfhList.filter(w => w.status === key).length;
  const statusFiltered = filter === "all" ? wfhList : wfhList.filter(w => w.status === filter);

  const filtered = statusFiltered.filter((w) => {
    const person = w.requester || {};
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      `${person.f_name || ""} ${person.l_name || ""}`.toLowerCase().includes(q) ||
      (person.work_email || "").toLowerCase().includes(q) ||
      (w.reason || "").toLowerCase().includes(q);
    const start = w.startDate ? new Date(w.startDate) : null;
    const matchesFrom = !dateFrom || (start && start >= new Date(dateFrom));
    const matchesTo   = !dateTo   || (start && start <= new Date(dateTo));
    return matchesSearch && matchesFrom && matchesTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    exportWFHToCSV(filtered, `wfh-requests-${new Date().toISOString().slice(0, 10)}`);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <SummaryStrip stats={[
        { label: "Total",    val: wfhList.length,                                                  color: "#1D4ED8", bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
        { label: "Pending",  val: wfhList.filter(w => w.status === "pending_superadmin").length,   color: "#92400E", bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
        { label: "Approved", val: wfhList.filter(w => w.status === "approved_superadmin").length,  color: "#14803D", bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
        { label: "Rejected", val: wfhList.filter(w => w.status === "rejected_superadmin").length,  color: "#991B1B", bg: "linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
      ]} />

      <div className="mb-5 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed flex gap-3 items-start">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10l5-8 5 8H2z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
        </div>
        <span><strong>WFH Requests</strong> — Work-from-home requests from admins, managers and employees requiring your final approval.</span>
      </div>

      <FilterToolbar
        search={search} setSearch={(v) => { setSearch(v); setPage(1); }}
        showType={false}
        dateFrom={dateFrom} setDateFrom={(v) => { setDateFrom(v); setPage(1); }}
        dateTo={dateTo} setDateTo={(v) => { setDateTo(v); setPage(1); }}
        onExport={handleExport}
        exportDisabled={filtered.length === 0}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button key={f.key}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border-[1.5px] ${active ? "text-white shadow-md" : "bg-white text-gray-500 border-purple-100 hover:bg-gray-50"}`}
              style={active ? { background: "linear-gradient(135deg,#1D4ED8,#3B82F6)", borderColor: "#1D4ED8" } : {}}
              onClick={() => { setFilter(f.key); setPage(1); }}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${active ? "bg-white/25 text-white" : "bg-purple-50 text-gray-400"}`}>
                {count(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0
        ? <EmptyState msg="No WFH requests found" icon="wfh" />
        : paged.map((wfh, idx) => (
          <WFHCard key={wfh._id} wfh={wfh} processingId={processingId} onAction={onAction} idx={idx} />
        ))
      }
      <Pagination page={page} setPage={setPage} totalPages={totalPages} />
    </div>
  );
};

const SuperAdminLeaveWFH = () => {
  const [tab, setTab]                   = useState("employee");
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast]               = useState({ visible: false, message: "", type: "success" });

  const { data: leaveData, isLoading: leaveLoading, refetch: refetchLeaves } = useShowAllLeaves();
  const { data: wfhData,   isLoading: wfhLoading,   refetch: refetchWFH   } = useGetPendingWFHSuperAdmin();

  const acceptLeaveMutation = useAcceptLeaveByAdmin();
  const rejectLeaveMutation = useRejectLeaveByAdmin();
  const approveWFHMutation  = useApproveWFHSuperAdmin();
  const rejectWFHMutation   = useRejectWFHSuperAdmin();

  const employeeLeaves = leaveData?.employeeLeaves?.leaves || [];
  const managerLeaves  = leaveData?.managerLeaves?.leaves  || [];
  const adminLeaves    = leaveData?.adminLeaves?.leaves    || [];
  const wfhList        = wfhData?.wfhList                 || [];

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(p => ({ ...p, visible: false })), 3400);
  };

  const handleAdminLeaveAction = async (leaveId, action) => {
    setProcessingId(leaveId);
    try {
      if (action === "accept") {
        await acceptLeaveMutation.mutateAsync({ id: leaveId });
        showToast("Leave approved successfully", "success");
      } else {
        await rejectLeaveMutation.mutateAsync({ id: leaveId });
        showToast("Leave rejected", "error");
      }
      refetchLeaves();
    } catch (err) {
      showToast(err?.response?.data?.message || "Something went wrong", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleWFHAction = async (wfhId, action) => {
    setProcessingId(wfhId);
    try {
      if (action === "approve") {
        await approveWFHMutation.mutateAsync({ wfhId });
        showToast("WFH request approved", "success");
      } else {
        await rejectWFHMutation.mutateAsync({ wfhId });
        showToast("WFH request rejected", "error");
      }
      refetchWFH();
    } catch (err) {
      showToast(err?.response?.data?.message || "Something went wrong", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const totalPending =
    adminLeaves.filter(l => l.status === "pending_superadmin").length +
    wfhList.filter(w => w.status === "pending_superadmin").length;

  const TABS = [
    { key: "employee", label: "Employee Leaves", count: employeeLeaves.length },
    { key: "manager",  label: "Manager Leaves",  count: managerLeaves.length  },
    { key: "admin",    label: "Admin Leaves",     count: adminLeaves.length    },
    { key: "wfh",      label: "WFH Requests",     count: wfhList.length        },
  ];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 flex flex-col">
      <GlobalStyles />

      {/* Background Blobs */}
      <div className="fixed top-[-80px] right-[-80px] w-80 h-80 rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle,rgba(205,22,110,0.07) 0%,transparent 70%)" }} />
      <div className="fixed bottom-[-60px] left-[-60px] w-72 h-72 rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle,rgba(115,0,66,0.06) 0%,transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 flex flex-col">
        
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 w-full">
          <div className="flex items-center gap-3 sm:gap-4 w-full min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#730042] to-[#CD166E] flex items-center justify-center shadow-lg shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="3.5" stroke="white" strokeWidth="1.6" />
                <path d="M3 10h18" stroke="white" strokeWidth="1.6" />
                <path d="M8 2v4M16 2v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M8 14h4M8 17h8" stroke="rgba(255,255,255,0.75)" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 tracking-tight" style={{ fontFamily: "'Playfair Display',serif" }}>
                  Leave & WFH Management
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-br from-[#730042] to-[#CD166E] shadow-md">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 8L2.5 3L5 6L7.5 2L9 8H1Z" fill="rgba(255,255,255,0.9)" /></svg>
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">
                Final approval authority · Leave requests & WFH across the organisation
              </p>
            </div>
          </div>

          {/* Right side stats and profile - Hidden on mobile to save space */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {totalPending > 0 && (
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-[#CD166E]" />
                <span className="text-xs font-semibold text-[#730042]">
                  {totalPending} pending action{totalPending > 1 ? "s" : ""}
                </span>
              </div>
            )}
            <div className="bg-white border border-purple-100 rounded-xl px-4 py-2 flex items-center gap-2.5 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#730042] to-[#CD166E] text-white text-xs font-bold flex items-center justify-center">SA</div>
              <div>
                <div className="font-semibold text-xs text-gray-800">Super Admin</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Full Access · Final Approver</div>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="flex flex-wrap gap-2 bg-purple-100/50 backdrop-blur-sm rounded-2xl p-1.5 mb-6 border border-purple-100 shadow-sm">
          {TABS.map(t => {
            const active  = tab === t.key;
            const isWFH   = t.key === "wfh";
            const isMgr   = t.key === "manager";
            const activeGrad = isWFH
              ? "linear-gradient(135deg,#1D4ED8,#3B82F6)"
              : isMgr
                ? "linear-gradient(135deg,#065F46,#10B981)"
                : "linear-gradient(135deg,#730042,#CD166E)";
            const activeShadow = isWFH
              ? "0 3px 12px rgba(29,78,216,0.32)"
              : isMgr
                ? "0 3px 12px rgba(6,95,70,0.32)"
                : "0 3px 12px rgba(115,0,66,0.32)";
            return (
              <button key={t.key}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 py-2 sm:px-5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  active ? "text-white" : "text-gray-500 hover:bg-white/50"
                }`}
                style={{
                  background: active ? activeGrad : "transparent",
                  fontWeight: active ? 600 : 400,
                  boxShadow: active ? activeShadow : "none",
                }}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${active ? "bg-white/25 text-white" : "bg-purple-100 text-gray-500"}`}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full min-w-0">
          {tab === "employee" && (
            <EmployeeLeavesTab
              leaves={employeeLeaves}
              isLoading={leaveLoading}
              processingId={processingId}
            />
          )}
          {tab === "manager" && (
            <ManagerLeavesTab
              leaves={managerLeaves}
              isLoading={leaveLoading}
              processingId={processingId}
            />
          )}
          {tab === "admin" && (
            <AdminLeavesTab
              leaves={adminLeaves}
              isLoading={leaveLoading}
              processingId={processingId}
              onAction={handleAdminLeaveAction}
            />
          )}
          {tab === "wfh" && (
            <WFHTab
              wfhList={wfhList}
              isLoading={wfhLoading}
              processingId={processingId}
              onAction={handleWFHAction}
            />
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  );
};

export default SuperAdminLeaveWFH;