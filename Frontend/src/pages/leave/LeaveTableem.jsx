import React, { useState } from "react";
import {
  useApplyLeave,
  useGetAllLeaves,
  useDeleteLeave,
  useEditLeave,
  useGetAllLeaveHistory,
} from "../../auth/server-state/employee/employeeleave/employeeleave.hook";
import { useGetMeUser } from "../../auth/server-state/employee/employeeauth/employeeauth.hook";

/* ── BRAND PALETTE — three colors only ────────
   #730042  deep wine
   #CD166E  vivid magenta
   #F9F8F2  cream paper
   Everything else is opacity variants.          */
const C = {
  deep:     "#730042",
  mid:      "#CD166E",
  cream:    "#F9F8F2",
  white:    "#ffffff",
  d08:      "rgba(115,0,66,.08)",
  d10:      "rgba(115,0,66,.10)",
  d12:      "rgba(115,0,66,.12)",
  d15:      "rgba(115,0,66,.15)",
  d20:      "rgba(115,0,66,.20)",
  d25:      "rgba(115,0,66,.25)",
  d35:      "rgba(115,0,66,.35)",
  d45:      "rgba(115,0,66,.45)",
  d55:      "rgba(115,0,66,.55)",
  m08:      "rgba(205,22,110,.08)",
  m15:      "rgba(205,22,110,.15)",
  m20:      "rgba(205,22,110,.20)",
  m25:      "rgba(205,22,110,.25)",
};

/* ── FONT INJECTOR ─────────────────────────── */
const Fonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');
    *{box-sizing:border-box;}
    select,input,textarea,button{font-family:'DM Sans',sans-serif;}
    input[type=date]::-webkit-calendar-picker-indicator{opacity:.35;cursor:pointer;}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-thumb{background:${C.d15};border-radius:99px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .lv-row:hover{background:rgba(249,248,242,.75)!important;}
    .lv-action:hover{background:${C.m08}!important;border-color:${C.m25}!important;color:${C.mid}!important;}
    .lv-apply:hover{background:${C.mid}!important;}
    .lv-submit:hover{background:${C.deep}!important;}
  `}</style>
);

/* ── LEAVE TYPE CONFIG ─────────────────────── */
const LEAVE_TYPES = [
  { value: "el",          label: "Earned Leave",    short: "EL"    },
  { value: "sl",          label: "Sick Leave",      short: "SL"    },
  { value: "ml",          label: "Maternity Leave", short: "ML",  restricted: "ml" },
  { value: "pl",          label: "Paternity Leave", short: "PL",  restricted: "pl" },
  { value: "half_day_el", label: "Half Day EL",     short: "½ EL" },
  { value: "half_day_sl", label: "Half Day SL",     short: "½ SL" },
];

/* ── STATUS CONFIG ─────────────────────────── */
const STATUS = {
  pending_manager:      { label: "Pending Manager", dot: C.deep, bg: C.d08,  border: C.d20 },
  "pending_r-manager":  { label: "Pending Manager", dot: C.deep, bg: C.d08,  border: C.d20 },
  forwarded_admin:      { label: "Forwarded HR",    dot: C.mid,  bg: C.m08,  border: C.m20 },
  forwarded_toHr:       { label: "Forwarded HR",    dot: C.mid,  bg: C.m08,  border: C.m20 },
  approved_manager:     { label: "Approved",        dot: C.mid,  bg: C.m08,  border: C.m20 },
  "approved_r-manager": { label: "Approved",        dot: C.mid,  bg: C.m08,  border: C.m20 },
  approved_by_hr:       { label: "Approved by HR",  dot: C.mid,  bg: C.m08,  border: C.m20 },
  approved_admin:       { label: "Approved",        dot: C.mid,  bg: C.m08,  border: C.m20 },
  rejected_manager:     { label: "Rejected",        dot: C.deep, bg: C.d08,  border: C.d15 },
  rejected_by_hr:       { label: "Rejected by HR",  dot: C.deep, bg: C.d08,  border: C.d15 },
  rejected_admin:       { label: "Rejected",        dot: C.deep, bg: C.d08,  border: C.d15 },
};

const JOURNEY = ["Submitted", "Manager Review", "HR / Admin", "Approved"];

/* ── HELPERS ───────────────────────────────── */
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const daysBetween = (s, e) => {
  if (!s || !e) return 0;
  const n = Math.floor((new Date(e) - new Date(s)) / 86400000) + 1;
  return n > 0 ? n : 0;
};

const isPending = (s) => s === "pending_manager" || s === "pending_r-manager";

const todayStr = () => new Date().toISOString().split("T")[0];

const stepIdx = (status) => {
  if (!status || status === "submitted") return 0;
  if (isPending(status)) return 1;
  if (status.includes("forwarded")) return 2;
  if (status.includes("approved")) return 3;
  return -1;
};

const EMPTY = { leaveType: "", startDate: "", endDate: "", reason: "" };

/* ── ATOMS ─────────────────────────────────── */
const StatusPill = ({ status }) => {
  const s = STATUS[status] || { label: status || "Unknown", dot: C.deep, bg: C.d08, border: C.d15 };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: s.bg, color: s.dot,
      padding: "4px 12px", borderRadius: 99,
      fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
      border: `.5px solid ${s.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {s.label}
    </span>
  );
};

const TypeTag = ({ value }) => {
  const t = LEAVE_TYPES.find((x) => x.value === value) || { short: (value || "?").toUpperCase() };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 500,
      background: C.d08, color: C.deep,
      border: `.5px solid ${C.d20}`,
    }}>
      {t.short}
    </span>
  );
};

const SectionLabel = ({ children }) => (
  <p style={{
    margin: "0 0 12px", fontSize: 10.5, fontWeight: 500,
    letterSpacing: ".18em", textTransform: "uppercase",
    color: C.d45, fontFamily: "'DM Sans', sans-serif",
  }}>
    {children}
  </p>
);

/* ── JOURNEY TRACKER ───────────────────────── */
const Journey = ({ leave }) => {
  if (!leave) return (
    <div style={{ textAlign: "center", padding: "44px 0" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        border: `.5px solid ${C.m25}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 14px",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.mid} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, fontStyle: "italic", color: C.deep, margin: "0 0 4px" }}>
        No applications yet
      </p>
      <p style={{ fontSize: 13, color: C.d45, margin: 0 }}>Submit your first leave request above.</p>
    </div>
  );

  const idx = stepIdx(leave.status);
  const rejected = leave.status?.includes("rejected");
  const leaveLabel = LEAVE_TYPES.find((t) => t.value === leave.leaveType)?.label || leave.leaveType;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: C.d35, marginBottom: 4 }}>
            Latest Application
          </p>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: C.deep, margin: "0 0 3px" }}>
            {leaveLabel}
          </h3>
          <p style={{ fontSize: 12, color: C.d45, margin: 0 }}>
            {fmt(leave.startDate)} → {fmt(leave.endDate)} · {leave.days} day{leave.days !== 1 ? "s" : ""}
          </p>
        </div>
        <StatusPill status={leave.status} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {JOURNEY.map((step, i) => {
          const done = !rejected && i < idx;
          const current = !rejected && i === idx;
          const isLast = i === JOURNEY.length - 1;
          const showRejected = rejected && i === JOURNEY.length - 1;

          return (
            <React.Fragment key={step}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: showRejected ? C.deep : (done || current) ? (current ? C.mid : C.deep) : C.d08,
                  border: `2.5px solid ${current ? C.deep : (done || showRejected) ? "transparent" : C.d15}`,
                  boxShadow: current ? `0 0 0 5px ${C.m15}` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .25s",
                }}>
                  {(done || current || showRejected) ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F9F8F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {showRejected
                        ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                        : <polyline points="20 6 9 17 4 12"/>}
                    </svg>
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.d25 }} />
                  )}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: current ? 500 : 400,
                  textAlign: "center", lineHeight: 1.3, paddingInline: 2,
                  color: showRejected ? C.deep : (done || current) ? (current ? C.mid : C.deep) : C.d35,
                }}>
                  {showRejected ? "Rejected" : step}
                </span>
              </div>
              {!isLast && (
                <div style={{
                  flex: 2, height: 2.5, marginTop: 18, borderRadius: 4,
                  background: C.d10, position: "relative", overflow: "hidden",
                }}>
                  {!rejected && i < idx && (
                    <div style={{ position: "absolute", inset: 0, background: C.deep, borderRadius: 4 }} />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {leave.reason && (
        <div style={{
          marginTop: 20, padding: "12px 16px",
          background: "rgba(249,248,242,.9)",
          borderLeft: `2px solid ${C.mid}`, borderRadius: "0 10px 10px 0",
          fontSize: 13, color: C.d55, lineHeight: 1.65,
        }}>
          <span style={{ fontWeight: 500, color: C.deep, marginRight: 4 }}>Reason:</span>
          {leave.reason}
        </div>
      )}
    </div>
  );
};

/* ── BALANCE CARD ──────────────────────────── */
const BalCard = ({ label, value, accent = "mid" }) => (
  <div style={{
    background: C.white, borderRadius: 14,
    border: `.5px solid ${C.d12}`,
    padding: "20px 18px", position: "relative", overflow: "hidden",
    transition: "border-color .18s",
  }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = C.m25}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = C.d12}
  >
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent === "mid" ? C.mid : C.deep }} />
    <p style={{ fontSize: 11, fontWeight: 400, color: C.d45, marginBottom: 6 }}>{label}</p>
    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 44, fontWeight: 700, color: C.deep, lineHeight: 1, margin: 0 }}>
      {value ?? 0}
    </p>
    <p style={{ fontSize: 11, color: C.d35, marginTop: 4 }}>days available</p>
  </div>
);

/* ── FORM FIELD ────────────────────────────── */
const Field = ({ label, error, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{
      display: "block", fontSize: 11, fontWeight: 500,
      letterSpacing: ".12em", textTransform: "uppercase",
      color: C.deep, marginBottom: 6,
    }}>
      {label} <span style={{ color: C.mid }}>*</span>
    </label>
    {children}
    {error && <p style={{ color: C.mid, fontSize: 12, marginTop: 4 }}>{error}</p>}
  </div>
);

const inputSt = (err) => ({
  width: "100%", padding: "10px 13px",
  border: `.5px solid ${err ? C.mid : C.d25}`,
  borderRadius: 10, fontSize: 13.5,
  color: C.deep, background: err ? C.m08 : C.white,
  outline: "none", fontFamily: "'DM Sans', sans-serif",
  transition: "border-color .15s",
});

const LeaveForm = ({ form, onChange, errors, types }) => {
  const days = daysBetween(form.startDate, form.endDate);
  return (
    <>
      {errors.submit && (
        <div style={{ marginBottom: 16, padding: "11px 14px", background: C.m08, border: `.5px solid ${C.m25}`, borderRadius: 10, color: C.deep, fontSize: 13 }}>
          {errors.submit}
        </div>
      )}
      <Field label="Leave type" error={errors.leaveType}>
        <select name="leaveType" value={form.leaveType} onChange={onChange} style={inputSt(errors.leaveType)}>
          <option value="">Select a type…</option>
          {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Field label="Start date" error={errors.startDate}>
          <input type="date" name="startDate" value={form.startDate}
            onChange={onChange} min={todayStr()} style={inputSt(errors.startDate)} />
        </Field>
        <Field label="End date" error={errors.endDate}>
          <input type="date" name="endDate" value={form.endDate}
            onChange={onChange} min={form.startDate || todayStr()} style={inputSt(errors.endDate)} />
        </Field>
      </div>
      {days > 0 && (
        <div style={{
          margin: "-4px 0 16px", padding: "10px 14px",
          background: C.m08, border: `.5px solid ${C.m20}`, borderRadius: 10,
          display: "flex", alignItems: "center", gap: 8,
          color: C.deep, fontWeight: 500, fontSize: 13,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.mid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {days} {days === 1 ? "day" : "days"} requested
        </div>
      )}
      <Field label="Reason" error={errors.reason}>
        <textarea name="reason" value={form.reason} onChange={onChange} rows={4}
          placeholder="Briefly explain the reason for your leave…"
          style={{ ...inputSt(errors.reason), resize: "vertical" }} />
      </Field>
      <p style={{ fontSize: 11, color: C.d35, marginTop: -8, marginBottom: 18 }}>
        {form.reason.length} / 500 chars (min 10)
      </p>
    </>
  );
};

/* ── MODAL ─────────────────────────────────── */
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(115,0,66,.16)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{
        background: C.cream, borderRadius: 20,
        border: `.5px solid ${C.m25}`,
        width: "100%", maxWidth: 520,
        maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{
          background: C.deep, padding: "18px 24px",
          borderRadius: "20px 20px 0 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, fontStyle: "italic", color: C.cream, margin: 0 }}>
            {title}
          </h2>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(249,248,242,.15)", border: "none", cursor: "pointer", color: C.cream, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>
        <div style={{ padding: "24px 24px 28px" }}>{children}</div>
      </div>
    </div>
  );
};

/* ── ICON COMPONENTS ───────────────────────── */
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);

/* ── MAIN ──────────────────────────────────── */
const LeaveTableem = () => {
  const [showApply, setShowApply] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const { data: userData }                           = useGetMeUser();
  const { data: balanceData, isLoading: balLoading } = useGetAllLeaves();
  const { data: historyData, isLoading: histLoading } = useGetAllLeaveHistory();
  const applyMut  = useApplyLeave();
  const deleteMut = useDeleteLeave();
  const editMut   = useEditLeave();

  const user    = userData?.user;
  const balance = balanceData || {};
  const history = historyData?.leaves || [];
  const latest  = history[0] || null;
  const loading = balLoading || histLoading;

  const availTypes = LEAVE_TYPES.filter((t) => {
    if (t.restricted === "ml") return user?.gender === "female" && user?.marital_status === "married";
    if (t.restricted === "pl") return user?.gender === "male" && user?.marital_status === "married";
    return true;
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.leaveType) e.leaveType = "Select a leave type";
    if (!form.startDate) e.startDate = "Required";
    if (!form.endDate) e.endDate = "Required";
    if ((form.reason || "").trim().length < 10) e.reason = "Minimum 10 characters";
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate))
      e.endDate = "End date cannot precede start date";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const closeApply = () => { setShowApply(false); setForm(EMPTY); setErrors({}); };
  const closeEdit  = () => { setShowEdit(false); setSelected(null); setForm(EMPTY); setErrors({}); };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try { await applyMut.mutateAsync(form); closeApply(); }
    catch (err) { setErrors({ submit: err.response?.data?.message || "Failed to submit leave" }); }
  };

  const openEdit = (leave) => {
    setSelected(leave);
    setForm({
      leaveType: leave.leaveType,
      startDate: new Date(leave.startDate).toISOString().split("T")[0],
      endDate:   new Date(leave.endDate).toISOString().split("T")[0],
      reason:    leave.reason,
    });
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try { await editMut.mutateAsync({ id: selected._id, ...form }); closeEdit(); }
    catch (err) { setErrors({ submit: err.response?.data?.message || "Failed to update" }); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this leave application?")) return;
    try { await deleteMut.mutateAsync(id); }
    catch (err) { alert(err.response?.data?.message || "Delete failed"); }
  };

  const balCards = [
    { label: "Earned Leave",     value: balance.EL,  accent: "deep" },
    { label: "Sick Leave",       value: balance.SL,  accent: "mid"  },
    ...(user?.gender === "female" && user?.marital_status === "married"
      ? [{ label: "Maternity Leave", value: balance.ML, accent: "mid" }] : []),
    ...(user?.gender === "male" && user?.marital_status === "married"
      ? [{ label: "Paternity Leave", value: balance.PL, accent: "deep" }] : []),
    { label: "Past Balance",       value: balance.pbc, accent: "deep" },
    { label: "Leave Without Pay",  value: balance.lwp, accent: "mid"  },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: C.cream }}>
      <Fonts />
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 38, height: 38, border: `3px solid ${C.d10}`, borderTopColor: C.mid, borderRadius: "50%", animation: "spin .75s linear infinite", margin: "0 auto 14px" }} />
        <p style={{ color: C.d45, fontSize: 13, margin: 0 }}>Loading…</p>
      </div>
    </div>
  );

  const TH = ({ children }) => (
    <th style={{ textAlign: "left", padding: "12px 18px", fontSize: 10.5, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", color: C.d45, whiteSpace: "nowrap" }}>
      {children}
    </th>
  );

  return (
    <div style={{ background: C.cream, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <Fonts />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 24px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: "2.5rem", animation: "fadeUp .4s ease both" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
              <div style={{ width: 28, height: 1, background: C.deep }} />
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".18em", textTransform: "uppercase", color: C.deep }}>
                Employee Portal
              </span>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 52, fontWeight: 300, fontStyle: "italic", color: C.deep, letterSpacing: "-1px", lineHeight: 1, margin: "0 0 .25rem" }}>
              Leave <span style={{ fontStyle: "normal", fontWeight: 700, color: C.mid }}>Management</span>
            </h1>
            <p style={{ fontSize: 13, color: C.d45, margin: 0 }}>
              Track balances · Apply · Monitor approvals
            </p>
          </div>
          <button
            className="lv-apply"
            onClick={() => setShowApply(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.deep, color: C.cream,
              border: "none", borderRadius: 12,
              padding: "11px 22px", fontSize: 13.5, fontWeight: 500,
              cursor: "pointer", transition: "background .18s",
            }}
          >
            <IconPlus /> Apply for leave
          </button>
        </div>

        {/* BALANCE */}
        <section style={{ marginBottom: "2.5rem", animation: "fadeUp .45s ease both" }}>
          <SectionLabel>Leave balance</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {balCards.map((c) => <BalCard key={c.label} {...c} />)}
          </div>
        </section>

        {/* JOURNEY */}
        <section style={{ marginBottom: "2.5rem", animation: "fadeUp .5s ease both" }}>
          <SectionLabel>Latest leave status</SectionLabel>
          <div style={{ background: C.white, borderRadius: 16, border: `.5px solid ${C.d12}`, padding: "26px 28px" }}>
            <Journey leave={latest} />
          </div>
        </section>

        {/* HISTORY */}
        <section style={{ animation: "fadeUp .55s ease both" }}>
          <SectionLabel>Leave history</SectionLabel>
          <div style={{ background: C.white, borderRadius: 16, border: `.5px solid ${C.d12}`, overflow: "hidden" }}>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 24px" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: `.5px solid ${C.m25}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.mid} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, fontStyle: "italic", color: C.deep, margin: "0 0 6px" }}>
                  No leave records yet
                </p>
                <p style={{ fontSize: 13, color: C.d45, margin: 0 }}>
                  Click <span style={{ color: C.deep, fontWeight: 500 }}>Apply for leave</span> to get started.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(249,248,242,.95)", borderBottom: `1px solid ${C.d10}` }}>
                      <TH>Type</TH><TH>Duration</TH><TH>Days</TH><TH>Reason</TH><TH>Status</TH><TH>Applied</TH><TH>Actions</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((leave, i) => (
                      <tr key={leave._id || i} className="lv-row" style={{ borderBottom: `.5px solid ${C.d08}` }}>
                        <td style={{ padding: "14px 18px" }}><TypeTag value={leave.leaveType} /></td>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: 500, color: C.deep, fontSize: 13 }}>{fmt(leave.startDate)}</div>
                          <div style={{ fontSize: 11.5, color: C.d35, marginTop: 2 }}>→ {fmt(leave.endDate)}</div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 700, color: C.deep, lineHeight: 1 }}>
                            {leave.days}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", maxWidth: 180 }}>
                          <span style={{ fontSize: 13, color: C.d55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                            title={leave.reason}>{leave.reason}</span>
                        </td>
                        <td style={{ padding: "14px 18px" }}><StatusPill status={leave.status} /></td>
                        <td style={{ padding: "14px 18px", fontSize: 12, color: C.d35, whiteSpace: "nowrap" }}>{fmt(leave.createdAt)}</td>
                        <td style={{ padding: "14px 18px" }}>
                          {isPending(leave.status) && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="lv-action" onClick={() => openEdit(leave)} title="Edit"
                                style={{ width: 30, height: 30, borderRadius: 8, border: `.5px solid ${C.d20}`, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.deep, transition: "all .15s" }}>
                                <IconEdit />
                              </button>
                              <button className="lv-action" onClick={() => handleDelete(leave._id)} title="Delete"
                                style={{ width: 30, height: 30, borderRadius: 8, border: `.5px solid ${C.d20}`, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: C.deep, transition: "all .15s" }}>
                                <IconTrash />
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
          </div>
        </section>
      </div>

      {/* APPLY MODAL */}
      <Modal open={showApply} onClose={closeApply} title="Apply for Leave">
        <form onSubmit={handleApply}>
          <LeaveForm form={form} onChange={onChange} errors={errors} types={availTypes} />
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={applyMut.isPending}
              className="lv-submit"
              style={{ flex: 1, background: C.mid, color: C.cream, border: "none", padding: 12, borderRadius: 11, fontSize: 14, fontWeight: 500, cursor: applyMut.isPending ? "not-allowed" : "pointer", opacity: applyMut.isPending ? .65 : 1, transition: "background .15s" }}>
              {applyMut.isPending ? "Submitting…" : "Submit request"}
            </button>
            <button type="button" onClick={closeApply}
              style={{ padding: "12px 20px", border: `.5px solid ${C.d25}`, background: "transparent", borderRadius: 11, fontSize: 14, fontWeight: 400, color: C.d45, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal open={showEdit} onClose={closeEdit} title="Edit Leave Request">
        <form onSubmit={handleEdit}>
          <LeaveForm form={form} onChange={onChange} errors={errors} types={availTypes} />
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={editMut.isPending}
              className="lv-submit"
              style={{ flex: 1, background: C.mid, color: C.cream, border: "none", padding: 12, borderRadius: 11, fontSize: 14, fontWeight: 500, cursor: editMut.isPending ? "not-allowed" : "pointer", opacity: editMut.isPending ? .65 : 1, transition: "background .15s" }}>
              {editMut.isPending ? "Updating…" : "Update request"}
            </button>
            <button type="button" onClick={closeEdit}
              style={{ padding: "12px 20px", border: `.5px solid ${C.d25}`, background: "transparent", borderRadius: 11, fontSize: 14, fontWeight: 400, color: C.d45, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveTableem;