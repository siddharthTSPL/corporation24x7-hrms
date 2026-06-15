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
  el:          { label: "Earned Leave",    short: "EL",   bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  accent: "#22C55E" },
  sl:          { label: "Sick Leave",      short: "SL",   bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   accent: "#3B82F6" },
  ml:          { label: "Maternity Leave", short: "ML",   bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500", accent: "#A855F7" },
  pl:          { label: "Paternity Leave", short: "PL",   bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500",  accent: "#F59E0B" },
  half_day_el: { label: "Half Day EL",     short: "½EL",  bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500",accent: "#10B981" },
  half_day_sl: { label: "Half Day SL",     short: "½SL",  bg: "bg-sky-100",    text: "text-sky-700",    dot: "bg-sky-500",    accent: "#60A5FA" },
};

const STATUS_LABEL_MAP = {
  pending_manager:             "Pending (Manager)",
  approved_manager:            "Approved by Manager",
  rejected_manager:            "Rejected by Manager",
  forwarded_admin:             "Forwarded to Admin",
  forwarded_reporting_manager: "Forwarded to RM",
  approved_admin:              "Approved by Admin",
  rejected_admin:              "Rejected by Admin",
  approved_reporting_manager:  "Approved by RM",
  rejected_reporting_manager:  "Rejected by RM",
  pending_reporting_manager:   "Pending (RM)",
  pending_admin:               "Pending (Admin)",
  pending_superadmin:          "Pending (Super Admin)",
  approved_superadmin:         "Approved by Super Admin",
  rejected_superadmin:         "Rejected by Super Admin",
};

const STATUS_STYLE = {
  pending_manager:             "bg-amber-50 text-amber-800",
  approved_manager:            "bg-green-50 text-green-800",
  rejected_manager:            "bg-red-50 text-red-800",
  forwarded_admin:             "bg-blue-50 text-blue-800",
  forwarded_reporting_manager: "bg-blue-50 text-blue-800",
  approved_admin:              "bg-green-50 text-green-800",
  rejected_admin:              "bg-red-50 text-red-800",
  approved_reporting_manager:  "bg-green-50 text-green-800",
  rejected_reporting_manager:  "bg-red-50 text-red-800",
  pending_reporting_manager:   "bg-amber-50 text-amber-800",
  pending_admin:               "bg-amber-50 text-amber-800",
  pending_superadmin:          "bg-amber-50 text-amber-800",
  approved_superadmin:         "bg-green-50 text-green-800",
  rejected_superadmin:         "bg-red-50 text-red-800",
};

const WFH_STATUS_STYLE = {
  pending_admin:               "bg-amber-50 text-amber-800",
  approved_admin:              "bg-green-50 text-green-800",
  rejected_admin:              "bg-red-50 text-red-800",
  pending_superadmin:          "bg-amber-50 text-amber-800",
  approved_superadmin:         "bg-green-50 text-green-800",
  rejected_superadmin:         "bg-red-50 text-red-800",
  forwarded_reporting_manager: "bg-blue-50 text-blue-800",
};

const humanStatus = (s) =>
  STATUS_LABEL_MAP[s] || (s || "Unknown").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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

const initials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();

const AVATAR_GRADIENTS = [
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

const avatarGrad = (name = "") => AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];

const BASE_LEAVE_TYPES = [
  { value: "el",          label: "Earned Leave"  },
  { value: "sl",          label: "Sick Leave"    },
  { value: "half_day_el", label: "Half Day EL"   },
  { value: "half_day_sl", label: "Half Day SL"   },
];

const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="w-9 h-9 border-[3px] border-purple-100 border-t-purple-600 rounded-full animate-spin" />
    <p className="text-sm text-slate-400 font-medium">Loading…</p>
  </div>
);

const EmptyState = ({ msg = "No records found" }) => (
  <div className="flex flex-col items-center py-14 gap-3">
    <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center">
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="5" width="20" height="19" rx="4" stroke="#C4B5D9" strokeWidth="1.5" fill="none" />
        <path d="M4 11h20" stroke="#C4B5D9" strokeWidth="1.5" />
        <path d="M9 8V5M19 8V5" stroke="#C4B5D9" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9 16h6M9 20h10" stroke="#DDD0EE" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
    <p className="text-sm text-slate-400 font-medium">{msg}</p>
  </div>
);

const Toast = ({ toast }) => {
  const styles = {
    success: "bg-green-50 text-green-800 border-green-200",
    error:   "bg-red-50 text-red-800 border-red-200",
    info:    "bg-blue-50 text-blue-800 border-blue-200",
  };
  const dotStyles = {
    success: "bg-green-500",
    error:   "bg-red-500",
    info:    "bg-blue-500",
  };
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border text-sm font-medium shadow-xl backdrop-blur-sm transition-all duration-300 ${styles[toast.type] || styles.info} ${toast.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotStyles[toast.type] || dotStyles.info}`} />
      {toast.message}
    </div>
  );
};

const StatusBadge = ({ status, wfh = false }) => {
  const styleMap = wfh ? WFH_STATUS_STYLE : STATUS_STYLE;
  const cls = styleMap[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {humanStatus(status)}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const m = LEAVE_META[type] || { label: (type || "").toUpperCase(), bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
};

const SectionBox = ({ title, children, rightEl }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-5 overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
      <div className="flex items-center gap-2.5">
        <span className="w-0.5 h-5 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full" />
        <span className="text-sm font-semibold text-slate-800">{title}</span>
      </div>
      {rightEl}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const FormField = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
      {label} <span className="text-pink-500">*</span>
    </label>
    {children}
    {error && <span className="text-[11px] text-red-500">{error}</span>}
  </div>
);

const buildTimeline = (leave) => {
  const steps = [];
  const status = leave.status || "";
  steps.push({ label: "Applied", desc: "Leave request submitted", date: leave.createdAt, done: true, color: "bg-purple-500" });
  const approvedByMgr = ["approved_manager","forwarded_admin","forwarded_reporting_manager","approved_admin","rejected_admin","approved_reporting_manager","rejected_reporting_manager"].includes(status);
  const rejectedByMgr = status === "rejected_manager";
  const pendingMgr    = status === "pending_manager";
  if (pendingMgr)       steps.push({ label: "Manager Review", desc: "Awaiting manager decision", date: null, done: false, pending: true, color: "bg-amber-400" });
  else if (rejectedByMgr) steps.push({ label: "Manager Review", desc: "Rejected by manager", date: leave.updatedAt, done: true, color: "bg-red-500" });
  else if (approvedByMgr) steps.push({ label: "Manager Review", desc: "Approved by manager", date: leave.updatedAt, done: true, color: "bg-green-500" });
  const adminPending  = ["forwarded_admin","forwarded_reporting_manager","pending_admin","pending_reporting_manager"].includes(status);
  const adminApproved = ["approved_admin","approved_reporting_manager"].includes(status);
  const adminRejected = ["rejected_admin","rejected_reporting_manager"].includes(status);
  if (adminPending)       steps.push({ label: "Admin Review", desc: "Awaiting admin approval", date: null, done: false, pending: true, color: "bg-amber-400" });
  else if (adminApproved) { steps.push({ label: "Admin Review", desc: "Approved by admin", date: leave.updatedAt, done: true, color: "bg-green-500" }); steps.push({ label: "Completed", desc: "Leave approved", date: leave.updatedAt, done: true, color: "bg-green-500" }); }
  else if (adminRejected)   steps.push({ label: "Admin Review", desc: "Rejected by admin", date: leave.updatedAt, done: true, color: "bg-red-500" });
  return steps;
};

const LeaveTimeline = ({ leave }) => {
  const steps = buildTimeline(leave);
  return (
    <div className="mt-3 pt-3 border-t border-dashed border-slate-100">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Timeline</p>
      <div className="flex flex-col">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3 relative">
            <div className="flex flex-col items-center w-4 flex-shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 z-10 ${step.done ? step.color : "bg-slate-200 border-2 border-amber-400"} ${step.pending ? "animate-pulse" : ""}`} />
              {i < steps.length - 1 && <div className="flex-1 w-px bg-slate-100 mt-1" />}
            </div>
            <div className={`${i < steps.length - 1 ? "pb-4" : ""} flex-1`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold ${step.done ? "text-slate-800" : "text-slate-400"}`}>{step.label}</span>
                {step.pending && <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">In Progress</span>}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
              {step.date && <p className="text-[10px] text-slate-300 mt-0.5">{fmtDateTime(step.date)}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LeaveCard = ({ leave, onApprove, onReject, isProcessing, showActions, personLabel, showTimeline }) => {
  const [expanded, setExpanded] = useState(false);
  const person = leave.employee || leave.manager || {};
  const days   = leave.days || daysDiff(leave.startDate, leave.endDate);
  const accent = (LEAVE_META[leave.leaveType] || { accent: "#8B3A8A" }).accent;

  return (
    <div className={`relative bg-white rounded-2xl border border-slate-100 shadow-sm mb-3 overflow-hidden transition-all duration-200 hover:shadow-md ${isProcessing ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: accent }} />
      <div className="p-4 pl-5 sm:p-5 sm:pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${avatarGrad(person.f_name || "A")} text-white text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-sm`}>
              {initials(person.f_name, person.l_name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-800 truncate">{person.f_name} {person.l_name}</span>
                {personLabel && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{personLabel}</span>}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{person.work_email}</p>
            </div>
          </div>
          {showActions && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={onApprove} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5 5.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Approve
              </button>
              <button onClick={onReject} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                Reject
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <TypeBadge type={leave.leaveType} />
          <StatusBadge status={leave.status} />
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700">
            {days} day{days > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-500">
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#CBD5E1" strokeWidth="1" /><path d="M1 6h11" stroke="#CBD5E1" strokeWidth="1" /><path d="M4 1v2M9 1v2" stroke="#CBD5E1" strokeWidth="1" strokeLinecap="round" /></svg>
          <span className="font-medium text-slate-700">{fmt(leave.startDate)}</span>
          <span className="text-slate-300">→</span>
          <span className="font-medium text-slate-700">{fmt(leave.endDate)}</span>
        </div>

        {leave.reason && (
          <div className="mt-2.5 bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 border-l-2 border-purple-200 leading-relaxed">
            <span className="font-semibold text-purple-700">Reason — </span>{leave.reason}
          </div>
        )}

        {showTimeline && (
          <button onClick={() => setExpanded((p) => !p)} className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 hover:text-purple-800 transition-colors">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className={`transition-transform ${expanded ? "rotate-180" : ""}`}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {expanded ? "Hide timeline" : "View timeline"}
          </button>
        )}
        {showTimeline && expanded && <LeaveTimeline leave={leave} />}
      </div>

      {isProcessing && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <div className="w-6 h-6 border-2 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
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
    { key: "el",  label: "Earned Leave",      entitled: balance.EL?.entitled || 0, availed: balance.EL?.availed || 0, accrued: balance.EL?.accrued || 0, accent: "#22C55E", ring: "ring-green-200",  num: "text-green-600"  },
    { key: "sl",  label: "Sick Leave",         entitled: balance.SL?.entitled || 0, availed: balance.SL?.availed || 0, accrued: 0,                         accent: "#3B82F6", ring: "ring-blue-200",   num: "text-blue-600"   },
    { key: "pbc", label: "Paid by Company",    entitled: balance.pbc || 0,          availed: 0,                         accrued: 0,                         accent: "#8B5CF6", ring: "ring-purple-200", num: "text-purple-600" },
    { key: "lwp", label: "Leave Without Pay",  entitled: balance.lwp || 0,          availed: 0,                         accrued: 0,                         accent: "#EC4899", ring: "ring-pink-200",   num: "text-pink-600"   },
    ...(showML ? [{ key: "ml", label: "Maternity Leave", entitled: balance.ML || 0, availed: 0, accrued: 0, accent: "#A855F7", ring: "ring-violet-200", num: "text-violet-600" }] : []),
    ...(showPL ? [{ key: "pl", label: "Paternity Leave", entitled: balance.PL || 0, availed: 0, accrued: 0, accent: "#F59E0B", ring: "ring-amber-200",  num: "text-amber-600"  }] : []),
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
        {cards.map((s) => {
          const remaining = s.entitled - s.availed;
          const pct = s.entitled > 0 ? Math.min((s.availed / s.entitled) * 100, 100) : 0;
          return (
            <div key={s.key} className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 ring-1 ${s.ring} hover:shadow-md transition-shadow`}>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{s.label}</p>
              <p className={`text-3xl font-bold ${s.num} leading-none`}>{remaining}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">of {s.entitled} days</p>
              <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 2)}%`, background: s.accent }} />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
                {s.accrued > 0 && <span>Accrued: {s.accrued}</span>}
                <span className="ml-auto">{s.availed} used</span>
              </div>
            </div>
          );
        })}
      </div>

      <SectionBox title="Leave Balance Summary">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="bg-slate-50">
                {["Leave Type", "Entitled", "Accrued", "Used", "Remaining", "Usage"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cards.map((s) => {
                const rem = s.entitled - s.availed;
                const pct = s.entitled > 0 ? Math.round((rem / s.entitled) * 100) : 0;
                return (
                  <tr key={s.key} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3">
                      <TypeBadge type={s.key} />
                    </td>
                    <td className="px-3 py-3 text-sm font-semibold text-slate-700">{s.entitled}</td>
                    <td className="px-3 py-3 text-sm text-slate-500">{s.accrued || "—"}</td>
                    <td className="px-3 py-3 text-sm text-slate-500">{s.availed}</td>
                    <td className="px-3 py-3 text-base font-bold" style={{ color: s.accent }}>{rem}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.accent }} />
                        </div>
                        <span className="text-[11px] text-slate-400">{pct}%</span>
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

const ApplyLeavePanel = ({ admin, showToast }) => {
  const [form, setForm]     = useState({ leaveType: "el", startDate: "", endDate: "", reason: "" });
  const [errors, setErrors] = useState({});

  const { data: rawHistory, isLoading: histLoading, refetch } = useAdminGetMyLeaveHistory();
  const applyMut = useAdminApplyLeave();
  const history  = Array.isArray(rawHistory) ? rawHistory : [];

  const isMarried  = admin?.marital_status === "married";
  const availTypes = [
    ...BASE_LEAVE_TYPES,
    ...(admin?.gender === "female" && isMarried ? [{ value: "ml", label: "Maternity Leave" }] : []),
    ...(admin?.gender === "male"   && isMarried ? [{ value: "pl", label: "Paternity Leave" }] : []),
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
  const ib   = (k) => errors[k] ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-purple-100";

  return (
    <div>
      <SectionBox title="New Leave Request">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <FormField label="Leave Type" error={errors.leaveType}>
            <select value={form.leaveType} onChange={(e) => set("leaveType", e.target.value)} className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 transition-all ${ib("leaveType")}`}>
              {availTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} min={todayStr()} className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 transition-all ${ib("startDate")}`} />
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} min={form.startDate || todayStr()} className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 transition-all ${ib("endDate")}`} />
          </FormField>
        </div>

        {days > 0 && (
          <div className="flex items-center gap-2.5 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 text-sm text-purple-700 font-medium mb-4">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="3" stroke="#9B2458" strokeWidth="1.3" /><path d="M1 6h12" stroke="#9B2458" strokeWidth="1.3" /><path d="M4 1v2M10 1v2" stroke="#9B2458" strokeWidth="1.3" strokeLinecap="round" /></svg>
            <strong className="text-lg font-bold text-purple-800">{days}</strong> day{days > 1 ? "s" : ""} · {(LEAVE_META[form.leaveType] || {}).label || ""}
          </div>
        )}

        <FormField label="Reason" error={errors.reason}>
          <textarea value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Briefly explain the reason for your leave…" className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 transition-all resize-none min-h-[88px] leading-relaxed ${ib("reason")}`} />
        </FormField>
        <p className="text-[11px] text-slate-400 mt-1 mb-4">{form.reason.length}/500 chars (min 10)</p>

        <div className="flex justify-end gap-2.5">
          <button onClick={() => { setForm({ leaveType: "el", startDate: "", endDate: "", reason: "" }); setErrors({}); }} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            Clear
          </button>
          <button onClick={handleSubmit} disabled={applyMut.isPending} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-700 to-pink-600 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {applyMut.isPending ? "Submitting…" : "Submit Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox title="My Leave History" rightEl={
        history.length > 0
          ? <span className="text-[11px] font-semibold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full">{history.length} record{history.length !== 1 ? "s" : ""}</span>
          : null
      }>
        {histLoading ? <Spinner /> : history.length === 0 ? <EmptyState msg="No leave records yet" /> : (
          <div>
            {history.map((leave, idx) => {
              const d      = leave.days || daysDiff(leave.startDate, leave.endDate);
              const accent = (LEAVE_META[leave.leaveType] || { accent: "#8B3A8A" }).accent;
              return (
                <div key={leave._id || idx} className="relative bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-2.5 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ background: accent }} />
                  <div className="pl-3">
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <TypeBadge type={leave.leaveType} />
                      <StatusBadge status={leave.status} />
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700">{d} day{d > 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#CBD5E1" strokeWidth="1" /><path d="M1 6h11" stroke="#CBD5E1" strokeWidth="1" /><path d="M4 1v2M9 1v2" stroke="#CBD5E1" strokeWidth="1" strokeLinecap="round" /></svg>
                      <span className="font-medium text-slate-700">{fmt(leave.startDate)}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-medium text-slate-700">{fmt(leave.endDate)}</span>
                    </div>
                    {leave.reason && (
                      <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 border-l-2 border-purple-200 leading-relaxed">
                        <span className="font-semibold text-purple-700">Reason — </span>{leave.reason}
                      </div>
                    )}
                    <LeaveTimeline leave={leave} />
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

const LEAVE_FILTERS = [
  { key: "all",       label: "All"       },
  { key: "pending",   label: "Pending"   },
  { key: "approved",  label: "Approved"  },
  { key: "rejected",  label: "Rejected"  },
  { key: "forwarded", label: "Forwarded" },
];

const AllLeavesPanel = ({ showToast }) => {
  const [filter, setFilter]     = useState("all");
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

  const filtered      = filter === "all" ? employeeLeaves : employeeLeaves.filter((l) => isStatus(l, filter));
  const count         = (key) => key === "all" ? employeeLeaves.length : employeeLeaves.filter((l) => isStatus(l, key)).length;
  const isActionable  = (status) => status === "forwarded_reporting_manager" || status === "pending_manager";

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

  const statCards = [
    { label: "Total",     val: employeeLeaves.length,                                   cls: "text-purple-600" },
    { label: "Pending",   val: employeeLeaves.filter((l) => isStatus(l, "pending")).length,  cls: "text-amber-600"  },
    { label: "Approved",  val: employeeLeaves.filter((l) => isStatus(l, "approved")).length, cls: "text-green-600"  },
    { label: "Forwarded", val: employeeLeaves.filter((l) => isStatus(l, "forwarded")).length,cls: "text-blue-600"   },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <span className={`text-2xl font-bold ${s.cls}`}>{s.val}</span>
            <span className="text-[11px] text-slate-400 font-semibold leading-tight">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {LEAVE_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${active ? "bg-gradient-to-r from-purple-700 to-pink-600 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:border-purple-300"}`}>
              {f.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>{count(f.key)}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0
        ? <EmptyState msg="No leave requests found" />
        : filtered.map((leave) => (
          <LeaveCard
            key={leave._id}
            leave={leave}
            isProcessing={processingId === leave._id}
            showActions={isActionable(leave.status)}
            onApprove={() => handleAction(leave, "approve")}
            onReject={() => handleAction(leave, "reject")}
            showTimeline
          />
        ))
      }
    </div>
  );
};

const ManagerLeavesPanel = ({ showToast }) => {
  const [processingId, setProcessingId] = useState(null);

  const { data: rawData, isLoading, refetch } = useGetForwardedLeaves();
  const acceptMut = useAcceptLeave();
  const rejectMut = useRejectLeave();

  const managerLeaves = Array.isArray(rawData?.managerLeaves?.leaves) ? rawData.managerLeaves.leaves : [];

  const isActionable = (status) => status === "pending_reporting_manager" || status === "pending_admin";

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

  const statCards = [
    { label: "Total",    val: managerLeaves.length,                                                 cls: "text-purple-600" },
    { label: "Pending",  val: managerLeaves.filter((l) => l.status?.includes("pending")).length,   cls: "text-amber-600"  },
    { label: "Approved", val: managerLeaves.filter((l) => l.status?.includes("approved")).length,  cls: "text-green-600"  },
    { label: "Rejected", val: managerLeaves.filter((l) => l.status?.includes("rejected")).length,  cls: "text-red-600"    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <span className={`text-2xl font-bold ${s.cls}`}>{s.val}</span>
            <span className="text-[11px] text-slate-400 font-semibold leading-tight">{s.label}</span>
          </div>
        ))}
      </div>

      {managerLeaves.length === 0
        ? <EmptyState msg="No manager leave requests" />
        : managerLeaves.map((leave) => (
          <LeaveCard
            key={leave._id}
            leave={leave}
            isProcessing={processingId === leave._id}
            showActions={isActionable(leave.status)}
            onApprove={() => handleAction(leave, "approve")}
            onReject={() => handleAction(leave, "reject")}
            personLabel="Manager"
            showTimeline
          />
        ))
      }
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
  const ib   = (k) => errors[k] ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-blue-100";

  return (
    <div>
      <SectionBox title="Apply Work From Home">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <FormField label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} min={todayStr()} className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 transition-all ${ib("startDate")}`} />
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} min={form.startDate || todayStr()} className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 transition-all ${ib("endDate")}`} />
          </FormField>
        </div>

        {days > 0 && (
          <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700 font-medium mb-4">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="3" stroke="#3B82F6" strokeWidth="1.3" /><path d="M4 7h2v4M8 4v7" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" /></svg>
            <strong className="text-lg font-bold text-blue-800">{days}</strong> day{days > 1 ? "s" : ""} · Work From Home
          </div>
        )}

        <FormField label="Reason" error={errors.reason}>
          <textarea value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Briefly explain why you need to work from home…" className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 transition-all resize-none min-h-[88px] leading-relaxed ${ib("reason")}`} />
        </FormField>

        <div className="flex justify-end gap-2.5 mt-4">
          <button onClick={() => { setForm(WFH_BLANK); setErrors({}); }} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            Clear
          </button>
          <button onClick={handleSubmit} disabled={applyMut.isPending} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {applyMut.isPending ? "Submitting…" : "Submit WFH Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox title="My WFH History" rightEl={
        wfhList.length > 0
          ? <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full">{wfhList.length} record{wfhList.length !== 1 ? "s" : ""}</span>
          : null
      }>
        {isLoading ? <Spinner /> : wfhList.length === 0 ? <EmptyState msg="No WFH records yet" /> : (
          <div>
            {wfhList.map((wfh, idx) => {
              const d = wfh.days || daysDiff(wfh.startDate, wfh.endDate);
              return (
                <div key={wfh._id || idx} className="relative bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-2.5 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
                  <div className="pl-3">
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />WFH
                      </span>
                      <StatusBadge status={wfh.status} wfh />
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700">{d} day{d > 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#CBD5E1" strokeWidth="1" /><path d="M1 6h11" stroke="#CBD5E1" strokeWidth="1" /><path d="M4 1v2M9 1v2" stroke="#CBD5E1" strokeWidth="1" strokeLinecap="round" /></svg>
                      <span className="font-medium text-slate-700">{fmt(wfh.startDate)}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-medium text-slate-700">{fmt(wfh.endDate)}</span>
                    </div>
                    {wfh.reason && (
                      <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-900 border-l-2 border-blue-200 leading-relaxed">
                        <span className="font-semibold text-blue-700">Reason — </span>{wfh.reason}
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

  const wfhFilters = [
    { key: "all",      label: "All"      },
    { key: "pending",  label: "Pending"  },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  const statCards = [
    { label: "Total",    val: allList.length,                                         cls: "text-blue-600"   },
    { label: "Pending",  val: allList.filter((w) => isWfhStatus(w, "pending")).length, cls: "text-amber-600"  },
    { label: "Approved", val: allList.filter((w) => isWfhStatus(w, "approved")).length,cls: "text-green-600"  },
    { label: "Rejected", val: allList.filter((w) => isWfhStatus(w, "rejected")).length,cls: "text-red-600"    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <span className={`text-2xl font-bold ${s.cls}`}>{s.val}</span>
            <span className="text-[11px] text-slate-400 font-semibold leading-tight">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {wfhFilters.map((f) => {
          const active = wfhFilter === f.key;
          return (
            <button key={f.key} onClick={() => setWfhFilter(f.key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${active ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:border-blue-300"}`}>
              {f.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>{wfhCount(f.key)}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0
        ? <EmptyState msg="No team WFH requests found" />
        : list.map((wfh) => {
          const requester    = wfh.requester || {};
          const d            = wfh.days || daysDiff(wfh.startDate, wfh.endDate);
          const isProcessing = processingId === wfh._id;
          const actionable   = isActionable(wfh.status);
          return (
            <div key={wfh._id} className={`relative bg-white rounded-2xl border border-slate-100 shadow-sm mb-3 overflow-hidden transition-all duration-200 hover:shadow-md ${isProcessing ? "opacity-60 pointer-events-none" : ""}`}>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl" />
              <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${avatarGrad(requester.f_name || "A")} text-white text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      {initials(requester.f_name, requester.l_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{requester.f_name} {requester.l_name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{requester.designation || requester.work_email}</p>
                    </div>
                  </div>
                  {actionable && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => handleAction(wfh._id, "approve")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5 5.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Approve
                      </button>
                      <button onClick={() => handleAction(wfh._id, "reject")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />WFH
                  </span>
                  <StatusBadge status={wfh.status} wfh />
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700">{d} day{d > 1 ? "s" : ""}</span>
                </div>

                <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-500">
                  <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#CBD5E1" strokeWidth="1" /><path d="M1 6h11" stroke="#CBD5E1" strokeWidth="1" /><path d="M4 1v2M9 1v2" stroke="#CBD5E1" strokeWidth="1" strokeLinecap="round" /></svg>
                  <span className="font-medium text-slate-700">{fmt(wfh.startDate)}</span>
                  <span className="text-slate-300">→</span>
                  <span className="font-medium text-slate-700">{fmt(wfh.endDate)}</span>
                </div>

                {wfh.reason && (
                  <div className="mt-2.5 bg-blue-50 rounded-xl px-3.5 py-2.5 text-xs text-blue-900 border-l-2 border-blue-200 leading-relaxed">
                    <span className="font-semibold text-blue-700">Reason — </span>{wfh.reason}
                  </div>
                )}
                {wfh.createdAt && <p className="text-[10px] text-slate-300 mt-2">Applied {fmtDateTime(wfh.createdAt)}</p>}
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                  <div className="w-6 h-6 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          );
        })
      }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-purple-700 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="4" width="16" height="15" rx="3" stroke="white" strokeWidth="1.5" />
                <path d="M3 9h16" stroke="white" strokeWidth="1.5" />
                <path d="M7 2v4M15 2v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M7 13h4M7 16h8" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Leave & WFH</h1>
              <p className="text-xs text-slate-400 mt-0.5">Manage leaves · Track balance · Work from home</p>
            </div>
          </div>

          {admin && (
            <div className="flex items-center gap-2.5 bg-white border border-slate-100 shadow-sm rounded-xl px-3.5 py-2.5 self-start sm:self-auto">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGrad(admin.f_name || "A")} text-white text-xs font-bold flex items-center justify-center flex-shrink-0`}>
                {initials(admin.f_name, admin.l_name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{admin.f_name} {admin.l_name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{admin.designation || admin.role}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 bg-white/70 backdrop-blur-sm border border-slate-100 rounded-2xl p-1.5 mb-6 shadow-sm overflow-x-auto flex-nowrap sm:flex-wrap scrollbar-none">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${active ? "bg-gradient-to-r from-purple-700 to-pink-600 text-white shadow-sm font-semibold" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
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
            {tab === "applyLeave"    && <ApplyLeavePanel admin={admin} showToast={showToast} />}
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