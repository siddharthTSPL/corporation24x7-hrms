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

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes progressIn { from { width: 0; } }
    .elw-action-btn {
      display: inline-flex; align-items: center; gap: 5px; padding: 6px 13px;
      border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none;
      font-family: 'DM Sans', sans-serif; letter-spacing: .2px; transition: all .18s ease;
    }
    .elw-action-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
    .elw-action-btn:active { transform: translateY(0); }
    .elw-action-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }
    .elw-tab-btn {
      padding: 9px 22px; border-radius: 10px; font-size: 13px; font-weight: 500;
      font-family: 'DM Sans', sans-serif; border: none; cursor: pointer;
      transition: all .2s ease; white-space: nowrap;
    }
    .elw-input {
      padding: 11px 15px; border-radius: 12px; font-size: 13px;
      font-family: 'DM Sans', sans-serif; color: #1C1028; background: #FDFBFF;
      outline: none; transition: border .2s, box-shadow .2s; width: 100%; box-sizing: border-box;
    }
    .elw-input:focus { border-color: #8B3A8A !important; box-shadow: 0 0 0 3px rgba(139,58,138,0.10); }
    .elw-btn-primary {
      padding: 11px 26px; border-radius: 12px; font-size: 13px; font-weight: 600;
      font-family: 'DM Sans', sans-serif; background: linear-gradient(135deg,#6B1A4A,#9B2458);
      color: #fff; border: none; cursor: pointer; box-shadow: 0 4px 16px rgba(107,26,74,0.35);
      transition: all .18s ease; letter-spacing: .3px;
    }
    .elw-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(107,26,74,0.4); }
    .elw-btn-primary:active { transform: translateY(0); }
    .elw-btn-primary:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }
    .elw-btn-secondary {
      padding: 11px 26px; border-radius: 12px; font-size: 13px; font-weight: 500;
      font-family: 'DM Sans', sans-serif; background: #F4EEF9; color: #6B1A4A;
      border: 1.5px solid #DFD0EC; cursor: pointer; transition: all .18s ease;
    }
    .elw-btn-secondary:hover { background: #EDE4F5; }
    .elw-stat-card {
      background: #fff; border-radius: 20px; border: 1px solid rgba(200,185,220,0.3);
      padding: 22px 22px 18px; position: relative; overflow: hidden;
      box-shadow: 0 2px 12px rgba(80,40,100,0.07); transition: all .25s ease;
      animation: fadeSlideUp .4s ease both;
    }
    .elw-stat-card:hover { box-shadow: 0 8px 28px rgba(80,40,100,0.12); transform: translateY(-2px); }
    .elw-toast {
      position: fixed; bottom: 30px; right: 30px; padding: 14px 22px; border-radius: 14px;
      font-size: 13px; font-weight: 500; font-family: 'DM Sans', sans-serif;
      box-shadow: 0 8px 30px rgba(0,0,0,0.14); z-index: 9999;
      display: flex; align-items: center; gap: 10px;
      transition: all .35s cubic-bezier(.34,1.56,.64,1); backdrop-filter: blur(8px);
    }
    .elw-history-card {
      background: #ffffff; border-radius: 16px; border: 1px solid rgba(200,185,220,0.28);
      padding: 16px 18px; margin-bottom: 10px; box-shadow: 0 2px 10px rgba(80,40,100,0.06);
      transition: box-shadow .22s ease, transform .22s ease; animation: fadeSlideUp .3s ease both;
      position: relative; overflow: hidden;
    }
    .elw-history-card:hover { box-shadow: 0 6px 22px rgba(80,40,100,0.11); transform: translateY(-1px); }
    .elw-divider { display: inline-block; width: 3px; height: 18px; background: linear-gradient(180deg,#6B1A4A,#A8295E); border-radius: 3px; margin-right: 8px; vertical-align: middle; }
    .elw-table th {
      text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600;
      color: #9B8BAE; text-transform: uppercase; letter-spacing: .7px; background: #FAF7FD;
      border-bottom: 1px solid #EDE6F5; font-family: 'DM Sans', sans-serif;
    }
    .elw-table td {
      padding: 13px 14px; border-bottom: 1px solid #F5F0FA; color: #1C1028;
      vertical-align: middle; font-family: 'DM Sans', sans-serif; font-size: 13px;
    }
    .elw-table tr:last-child td { border-bottom: none; }
    .elw-table tr:hover td { background: #FDFBFF; }
  `}</style>
);

const LEAVE_META = {
  el:          { label: "Earned Leave",    bg: "#DCFCE7", color: "#14803D", dot: "#16A34A" },
  sl:          { label: "Sick Leave",      bg: "#DBEAFE", color: "#1D4ED8", dot: "#2563EB" },
  ml:          { label: "Maternity Leave", bg: "#F3E8FF", color: "#6B21A8", dot: "#7C3AED" },
  pl:          { label: "Paternity Leave", bg: "#FEF3C7", color: "#92400E", dot: "#D97706" },
  half_day_el: { label: "Half Day EL",     bg: "#ECFDF5", color: "#065F46", dot: "#059669" },
  half_day_sl: { label: "Half Day SL",     bg: "#EFF6FF", color: "#1E40AF", dot: "#3B82F6" },
};

const LEAVE_STATUS_META = {
  pending_manager:             { label: "Pending Manager",            bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  forwarded_reporting_manager: { label: "Forwarded to Reporting Mgr", bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  approved_manager:            { label: "Approved by Manager",        bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  approved_reporting_manager:  { label: "Approved by Reporting Mgr",  bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_manager:            { label: "Rejected by Manager",        bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  rejected_reporting_manager:  { label: "Rejected by Reporting Mgr",  bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
};

const WFH_STATUS_META = {
  pending_manager:             { label: "Pending Manager",            bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  approved_manager:            { label: "Approved by Manager",        bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_manager:            { label: "Rejected by Manager",        bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  forwarded_reporting_manager: { label: "Forwarded to Reporting Mgr", bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  pending_reporting_manager:   { label: "Pending Reporting Mgr",      bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  approved_reporting_manager:  { label: "Approved by Reporting Mgr",  bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_reporting_manager:  { label: "Rejected by Reporting Mgr",  bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  pending_admin:               { label: "Pending Admin",              bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  approved_admin:              { label: "Approved by Admin",          bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_admin:              { label: "Rejected by Admin",          bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  pending_superadmin:          { label: "Pending Super Admin",        bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  approved_superadmin:         { label: "Approved by Super Admin",    bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_superadmin:         { label: "Rejected by Super Admin",    bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const daysBetween = (s, e) => {
  if (!s || !e) return 0;
  const n = Math.floor((new Date(e) - new Date(s)) / 86400000) + 1;
  return n > 0 ? n : 0;
};

const todayStr = () => new Date().toISOString().split("T")[0];
const LEAVE_BLANK = { leaveType: "", startDate: "", endDate: "", reason: "" };
const WFH_BLANK   = { startDate: "", endDate: "", reason: "" };

const Spinner = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "70px 0", gap: 14 }}>
    <div style={{ width: 38, height: 38, border: "3px solid #EDE6F5", borderTop: "3px solid #8B3A8A", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    <p style={{ fontSize: 13, color: "#9B8BAE", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>Loading…</p>
  </div>
);

const EmptyState = ({ msg = "No records found" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 0", gap: 12 }}>
    <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg,#F4EEF9,#EDE4F5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="5" width="20" height="19" rx="4" stroke="#C4AADA" strokeWidth="1.5" fill="none"/>
        <path d="M4 11h20" stroke="#C4AADA" strokeWidth="1.5"/>
        <path d="M9 8V5M19 8V5" stroke="#C4AADA" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 16h6M9 20h10" stroke="#D4BFEA" strokeWidth="1.2" strokeLinecap="round"/>
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
    <div className="elw-toast" style={{
      transform: toast.visible ? "translateY(0) scale(1)" : "translateY(24px) scale(.94)",
      opacity: toast.visible ? 1 : 0,
      pointerEvents: toast.visible ? "auto" : "none",
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.icon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {toast.type === "success" && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type === "error"   && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type === "info"    && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 4v4M5 3v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
      </div>
      {toast.message}
    </div>
  );
};

const LeaveTypeBadge = ({ type }) => {
  const m = LEAVE_META[type] || { label: (type || "").toUpperCase(), bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color, fontFamily: "'DM Sans',sans-serif" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
};

const StatusBadge = ({ status, meta }) => {
  const m = (meta || {})[status] || { label: (status || "").replace(/_/g, " "), bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: m.bg, color: m.color, fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
};

const FormField = ({ label, error, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: "#6B5080", textTransform: "uppercase", letterSpacing: ".5px", fontFamily: "'DM Sans',sans-serif" }}>
      {label} <span style={{ color: "#CD166E" }}>*</span>
    </label>
    {children}
    {error && <span style={{ fontSize: 11, color: "#EF4444", fontFamily: "'DM Sans',sans-serif" }}>{error}</span>}
  </div>
);

const SectionBox = ({ title, children, rightEl }) => (
  <div style={{ background: "#fff", borderRadius: 20, border: "1px solid rgba(200,185,220,0.3)", overflow: "hidden", boxShadow: "0 2px 12px rgba(80,40,100,0.07)", marginBottom: 20 }}>
    <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #F0EAF8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="elw-divider" />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1C1028", fontFamily: "'DM Sans',sans-serif" }}>{title}</span>
      </div>
      {rightEl}
    </div>
    <div style={{ padding: "20px 22px 24px" }}>{children}</div>
  </div>
);

const JOURNEY_STEPS = ["Submitted", "Manager Review", "Reporting Manager", "Final Decision"];

const getJourneyIdx = (status) => {
  if (!status) return 0;
  if (status === "pending_manager") return 1;
  if (status === "forwarded_reporting_manager") return 2;
  if (status.startsWith("approved") || status.startsWith("rejected")) return 3;
  return 0;
};

const JourneyTracker = ({ leave }) => {
  if (!leave) return <EmptyState msg="No leave applications yet" />;
  const leaveMeta  = LEAVE_META[leave.leaveType] || {};
  const leaveLabel = leaveMeta.label || leave.leaveType;
  const activeIdx  = getJourneyIdx(leave.status);
  const isRejected = leave.status?.startsWith("rejected");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#9B8BAE", marginBottom: 4, fontFamily: "'DM Sans',sans-serif" }}>Latest Application</p>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: "#1C1028", margin: "0 0 3px" }}>{leaveLabel}</h3>
          <p style={{ fontSize: 12, color: "#9B8BAE", margin: 0, fontFamily: "'DM Sans',sans-serif" }}>
            {fmt(leave.startDate)} → {fmt(leave.endDate)} · {leave.days} day{leave.days !== 1 ? "s" : ""}
          </p>
        </div>
        <StatusBadge status={leave.status} meta={LEAVE_STATUS_META} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {JOURNEY_STEPS.map((step, i) => {
          const isLast          = i === JOURNEY_STEPS.length - 1;
          const done            = i < activeIdx;
          const current         = i === activeIdx;
          const isFinalStep     = isLast && current;
          const finalBg         = isFinalStep ? (isRejected ? "#BE123C" : "#15803D") : done ? "#730042" : current ? "#CD166E" : "rgba(115,0,66,.08)";
          const borderCol       = current ? "#730042" : done ? "transparent" : "rgba(115,0,66,.15)";
          const labelColor      = isFinalStep ? (isRejected ? "#BE123C" : "#15803D") : done ? "#730042" : current ? "#CD166E" : "rgba(115,0,66,.4)";
          const stepLabel       = isFinalStep ? (isRejected ? "Rejected" : "Approved") : step;

          return (
            <React.Fragment key={step}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: finalBg,
                  border: `2.5px solid ${borderCol}`,
                  boxShadow: current ? "0 0 0 5px rgba(205,22,110,.15)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all .25s",
                }}>
                  {(done || current) ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {isFinalStep && isRejected
                        ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                        : <polyline points="20 6 9 17 4 12"/>}
                    </svg>
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(115,0,66,.25)" }} />
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: current ? 600 : 400, textAlign: "center", lineHeight: 1.3, paddingInline: 2, color: labelColor, fontFamily: "'DM Sans',sans-serif" }}>
                  {stepLabel}
                </span>
              </div>
              {!isLast && (
                <div style={{ flex: 2, height: 2.5, marginTop: 18, borderRadius: 4, background: "rgba(115,0,66,.1)", position: "relative", overflow: "hidden" }}>
                  {i < activeIdx && !isRejected && <div style={{ position: "absolute", inset: 0, background: "#730042", borderRadius: 4 }} />}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {leave.reason && (
        <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(249,248,242,.9)", borderLeft: "2px solid #CD166E", borderRadius: "0 10px 10px 0", fontSize: 13, color: "rgba(115,0,66,.55)", lineHeight: 1.65, fontFamily: "'DM Sans',sans-serif" }}>
          <span style={{ fontWeight: 500, color: "#730042", marginRight: 4 }}>Reason:</span>
          {leave.reason}
        </div>
      )}
    </div>
  );
};

const BalCard = ({ label, value, accent }) => (
  <div className="elw-stat-card">
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "20px 20px 0 0" }} />
    <p style={{ fontSize: 11, color: "#9B8BAE", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }}>{label}</p>
    <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 40, fontWeight: 700, color: "#1C1028", lineHeight: 1, margin: 0, letterSpacing: "-0.5px" }}>{value ?? 0}</p>
    <p style={{ fontSize: 11, color: "#9B8BAE", marginTop: 4, fontFamily: "'DM Sans',sans-serif" }}>days available</p>
  </div>
);

const LeaveBalanceTab = ({ employee, balance, isLoading }) => {
  if (isLoading) return <Spinner />;

  const isFemaleMarried = employee?.gender === "female" && employee?.marital_status === "married";
  const isMaleMarried   = employee?.gender === "male"   && employee?.marital_status === "married";

  const cards = [
    { label: "Earned Leave",      value: balance.EL,  accent: "#22C55E" },
    { label: "Sick Leave",        value: balance.SL,  accent: "#3B82F6" },
    ...(isFemaleMarried ? [{ label: "Maternity Leave", value: balance.ML, accent: "#A855F7" }] : []),
    ...(isMaleMarried   ? [{ label: "Paternity Leave", value: balance.PL, accent: "#F59E0B" }] : []),
    { label: "Paid Balance",      value: balance.pbc, accent: "#6B1A4A" },
    { label: "Leave Without Pay", value: balance.lwp, accent: "#CD166E" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 14 }}>
      {cards.map(c => <BalCard key={c.label} {...c} />)}
    </div>
  );
};

const LeaveApplyTab = ({ employee, showToast }) => {
  const [form, setForm]         = useState(LEAVE_BLANK);
  const [errors, setErrors]     = useState({});
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
    ...(isFemaleMarried ? [{ value: "ml", label: "Maternity Leave" }] : []),
    ...(isMaleMarried   ? [{ value: "pl", label: "Paternity Leave" }] : []),
    { value: "half_day_el", label: "Half Day EL"     },
    { value: "half_day_sl", label: "Half Day SL"     },
  ];

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
      showToast(err?.response?.data?.message || "Something went wrong", "error");
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
      showToast("Leave deleted", "error");
    } catch (err) {
      showToast(err?.response?.data?.message || "Delete failed", "error");
    }
  };

  const days = daysBetween(form.startDate, form.endDate);
  const ib   = (k) => errors[k] ? "#FCA5A5" : "#E2D8EE";

  return (
    <div>
      <SectionBox title={editTarget ? "Edit Leave Request" : "New Leave Request"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
          <FormField label="Leave Type" error={errors.leaveType}>
            <select value={form.leaveType} onChange={e => set("leaveType", e.target.value)} className="elw-input" style={{ border: `1.5px solid ${ib("leaveType")}` }}>
              <option value="">Select a type…</option>
              {availTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} min={todayStr()} className="elw-input" style={{ border: `1.5px solid ${ib("startDate")}` }} />
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} min={form.startDate || todayStr()} className="elw-input" style={{ border: `1.5px solid ${ib("endDate")}` }} />
          </FormField>
        </div>

        {days > 0 && (
          <div style={{ background: "linear-gradient(135deg,#F9EFF5,#F2E8F5)", border: "1px solid #DFD0EC", borderRadius: 12, padding: "12px 18px", fontSize: 13, color: "#6B1A4A", fontWeight: 600, marginBottom: 18, display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans',sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="3" stroke="#9B2458" strokeWidth="1.3"/><path d="M1 6h12" stroke="#9B2458" strokeWidth="1.3"/><path d="M4 1v2M10 1v2" stroke="#9B2458" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <strong style={{ fontFamily: "'Playfair Display',serif", fontSize: 15 }}>{days}</strong>&nbsp;day{days > 1 ? "s" : ""}&nbsp;·&nbsp;{(LEAVE_META[form.leaveType] || {}).label || ""}
          </div>
        )}

        <FormField label="Reason" error={errors.reason}>
          <textarea value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="Briefly explain the reason for your leave…" className="elw-input" style={{ border: `1.5px solid ${ib("reason")}`, minHeight: 88, resize: "vertical", lineHeight: 1.6 }} />
        </FormField>
        <p style={{ fontSize: 11, color: "#9B8BAE", marginTop: 4, marginBottom: 18, fontFamily: "'DM Sans',sans-serif" }}>{(form.reason || "").length} / 500 chars (min 10)</p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {editTarget && (
            <button className="elw-btn-secondary" onClick={() => { setForm(LEAVE_BLANK); setEditTarget(null); setErrors({}); }}>Cancel Edit</button>
          )}
          <button className="elw-btn-primary" onClick={handleSubmit} disabled={applyMut.isPending || editMut.isPending}>
            {applyMut.isPending || editMut.isPending ? "Submitting…" : editTarget ? "Update Request →" : "Submit Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox title="Leave History" rightEl={
        history.length > 0
          ? <span style={{ background: "linear-gradient(135deg,#F9EFF5,#F4E6F0)", color: "#6B1A4A", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, fontFamily: "'DM Sans',sans-serif" }}>{history.length} record{history.length !== 1 ? "s" : ""}</span>
          : null
      }>
        {histLoading ? <Spinner /> : history.length === 0 ? <EmptyState msg="No leave records yet" /> : (
          <div style={{ overflowX: "auto" }}>
            <table className="elw-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Type", "Duration", "Days", "Reason", "Status", "Applied", "Actions"].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {history.map((leave, i) => (
                  <tr key={leave._id || i}>
                    <td><LeaveTypeBadge type={leave.leaveType} /></td>
                    <td>
                      <div style={{ fontWeight: 500, color: "#1C1028", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{fmt(leave.startDate)}</div>
                      <div style={{ fontSize: 11.5, color: "#9B8BAE", marginTop: 2 }}>→ {fmt(leave.endDate)}</div>
                    </td>
                    <td style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#1C1028" }}>{leave.days}</td>
                    <td style={{ maxWidth: 180 }}>
                      <span style={{ fontSize: 13, color: "rgba(115,0,66,.55)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontFamily: "'DM Sans',sans-serif" }} title={leave.reason}>{leave.reason}</span>
                    </td>
                    <td><StatusBadge status={leave.status} meta={LEAVE_STATUS_META} /></td>
                    <td style={{ fontSize: 12, color: "#9B8BAE", whiteSpace: "nowrap", fontFamily: "'DM Sans',sans-serif" }}>{fmt(leave.createdAt)}</td>
                    <td>
                      {leave.status === "pending_manager" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="elw-action-btn" style={{ background: "#F0F9FF", color: "#0369A1" }} onClick={() => openEdit(leave)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                          </button>
                          <button className="elw-action-btn" style={{ background: "#FFF1F2", color: "#991B1B" }} onClick={() => handleDelete(leave._id)} disabled={deleteMut.isPending}>
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
      showToast(err?.response?.data?.message || "Something went wrong", "error");
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
      showToast("WFH request deleted", "error");
    } catch (err) {
      showToast(err?.response?.data?.message || "Delete failed", "error");
    }
  };

  const days = daysBetween(form.startDate, form.endDate);
  const ib   = (k) => errors[k] ? "#FCA5A5" : "#E2D8EE";

  return (
    <div>
      <SectionBox title={editTarget ? "Edit WFH Request" : "New WFH Request"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
          <FormField label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} min={todayStr()} className="elw-input" style={{ border: `1.5px solid ${ib("startDate")}` }} />
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} min={form.startDate || todayStr()} className="elw-input" style={{ border: `1.5px solid ${ib("endDate")}` }} />
          </FormField>
        </div>

        {days > 0 && (
          <div style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", border: "1px solid #BFDBFE", borderRadius: 12, padding: "12px 18px", fontSize: 13, color: "#1D4ED8", fontWeight: 600, marginBottom: 18, display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans',sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="3" stroke="#3B82F6" strokeWidth="1.3"/><path d="M4 7h2v4M8 4v7" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <strong style={{ fontFamily: "'Playfair Display',serif", fontSize: 15 }}>{days}</strong>&nbsp;day{days > 1 ? "s" : ""}&nbsp;·&nbsp;Work From Home
          </div>
        )}

        <FormField label="Reason" error={errors.reason}>
          <textarea value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="Briefly explain why you need to work from home…" className="elw-input" style={{ border: `1.5px solid ${ib("reason")}`, minHeight: 88, resize: "vertical", lineHeight: 1.6 }} />
        </FormField>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          {editTarget && (
            <button className="elw-btn-secondary" onClick={() => { setForm(WFH_BLANK); setEditTarget(null); setErrors({}); }}>Cancel Edit</button>
          )}
          <button className="elw-btn-primary" onClick={handleSubmit} disabled={applyMut.isPending || editMut.isPending}>
            {applyMut.isPending || editMut.isPending ? "Submitting…" : editTarget ? "Update Request →" : "Submit WFH Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox title="WFH History" rightEl={
        wfhList.length > 0
          ? <span style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", color: "#1D4ED8", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, fontFamily: "'DM Sans',sans-serif" }}>{wfhList.length} record{wfhList.length !== 1 ? "s" : ""}</span>
          : null
      }>
        {isLoading ? <Spinner /> : wfhList.length === 0 ? <EmptyState msg="No WFH records yet" /> : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {wfhList.map((wfh, i) => {
              const canEdit = wfh.status === "pending_manager";
              const d = wfh.days || daysBetween(wfh.startDate, wfh.endDate);
              return (
                <div key={wfh._id || i} className="elw-history-card" style={{ animationDelay: `${i * .05}s` }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 3, bottom: 0, background: "#3B82F6", borderRadius: "16px 0 0 16px" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, paddingLeft: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#DBEAFE", color: "#1D4ED8", fontFamily: "'DM Sans',sans-serif" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#3B82F6", flexShrink: 0 }} /> WFH
                        </span>
                        <StatusBadge status={wfh.status} meta={WFH_STATUS_META} />
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#F0F9FF", color: "#0369A1", fontFamily: "'DM Sans',sans-serif" }}>
                          {d} day{d > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9B8BAE", fontFamily: "'DM Sans',sans-serif" }}>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1"/><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1"/><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round"/></svg>
                        <span style={{ fontWeight: 500, color: "#4A3860" }}>{fmt(wfh.startDate)}</span>
                        <span style={{ color: "#D4BFEA", fontSize: 10 }}>→</span>
                        <span style={{ fontWeight: 500, color: "#4A3860" }}>{fmt(wfh.endDate)}</span>
                      </div>
                      {wfh.reason && (
                        <div style={{ background: "#F0F9FF", borderRadius: 10, padding: "8px 13px", fontSize: 12, color: "#1E3A5F", marginTop: 10, borderLeft: "3px solid #93C5FD", lineHeight: 1.6, fontFamily: "'DM Sans',sans-serif" }}>
                          <span style={{ color: "#1D4ED8", fontWeight: 600 }}>Reason — </span>{wfh.reason}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      {canEdit && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="elw-action-btn" style={{ background: "#F0F9FF", color: "#0369A1" }} onClick={() => openEdit(wfh)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                          </button>
                          <button className="elw-action-btn" style={{ background: "#FFF1F2", color: "#991B1B" }} onClick={() => handleDelete(wfh._id)} disabled={deleteMut.isPending}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                            Delete
                          </button>
                        </div>
                      )}
                      {wfh.createdAt && (
                        <div style={{ fontSize: 10, color: "#9B8BAE", textAlign: "right", lineHeight: 1.4, fontFamily: "'DM Sans',sans-serif" }}>
                          Applied<br /><span style={{ fontWeight: 600, color: "#7B6890" }}>{fmt(wfh.createdAt)}</span>
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

const LeaveStatusTab = ({ histLoading, history }) => {
  if (histLoading) return <Spinner />;
  return (
    <SectionBox title="Latest Leave Status">
      <JourneyTracker leave={history[0] || null} />
    </SectionBox>
  );
};

const EmployeeLeaveWFH = () => {
  const [tab, setTab]     = useState("status");
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  const { data: meData }                              = useGetMeUser();
  const { data: balanceData, isLoading: balLoading }  = useGetAllLeaves();
  const { data: historyData, isLoading: histLoading } = useGetAllLeaveHistory();

  const employee = meData?.employee ?? null;
  const balance  = balanceData || {};
  const history  = historyData?.leaves || [];

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
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#F7F3FC 0%,#F0EBF8 50%,#F4F0FA 100%)", fontFamily: "'DM Sans',sans-serif", padding: "32px 36px" }}>
      <GlobalStyles />

      <div style={{ position: "fixed", top: -80, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle,rgba(168,41,94,0.07) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: -60, left: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(107,26,74,0.06) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30, flexWrap: "wrap", gap: 16, animation: "fadeSlideUp .3s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: "linear-gradient(135deg,#6B1A4A,#A8295E)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(107,26,74,0.38)" }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="4" width="16" height="15" rx="3" stroke="white" strokeWidth="1.5"/>
                <path d="M3 9h16" stroke="white" strokeWidth="1.5"/>
                <path d="M7 2v4M15 2v4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 13h4M7 16h8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C1028", margin: 0, fontFamily: "'Playfair Display',serif", letterSpacing: "-.3px" }}>Leave & WFH</h1>
              <p style={{ fontSize: 12, color: "#9B8BAE", margin: "3px 0 0", fontWeight: 400 }}>Apply · Track balance · Request work from home</p>
            </div>
          </div>
          {employee && (
            <div style={{ background: "#fff", border: "1px solid rgba(200,185,220,0.4)", borderRadius: 14, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 12px rgba(80,40,100,0.08)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#6B1A4A,#A8295E)", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(employee.f_name?.[0] || "")}{(employee.l_name?.[0] || "")}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#1C1028" }}>{employee.f_name} {employee.l_name}</div>
                <div style={{ fontSize: 10, color: "#9B8BAE", marginTop: 1 }}>{employee.designation || employee.role}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, background: "rgba(235,228,245,0.7)", backdropFilter: "blur(8px)", borderRadius: 14, padding: 4, marginBottom: 28, width: "fit-content", border: "1px solid rgba(200,185,220,0.3)", boxShadow: "0 2px 8px rgba(80,40,100,0.06)", flexWrap: "wrap" }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} className="elw-tab-btn"
                style={{ color: active ? "#fff" : "#9B8BAE", background: active ? "linear-gradient(135deg,#6B1A4A,#9B2458)" : "transparent", fontWeight: active ? 600 : 400, boxShadow: active ? "0 3px 12px rgba(107,26,74,0.32)" : "none" }}
                onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "status"  && <LeaveStatusTab histLoading={histLoading} history={history} />}
        {tab === "balance" && <LeaveBalanceTab employee={employee} balance={balance} isLoading={balLoading} />}
        {tab === "apply"   && <LeaveApplyTab employee={employee} showToast={showToast} />}
        {tab === "wfh"     && <WFHTab showToast={showToast} />}
      </div>

      <Toast toast={toast} />
    </div>
  );
};

export default EmployeeLeaveWFH;