"use client";

import React, { useState } from "react";
import { useGetMeAdmin } from "../../auth/server-state/adminauth/adminauth.hook";
import { useGetForwardedLeaves, useAcceptLeave, useRejectLeave } from "../../auth/server-state/adminleave/adminleave.hook";
import {
  useAdminApplyWFH,
  useAdminGetMyWFH,
  useAdminGetForwardedWFH,
  useAdminApproveForwardedWFH,
  useAdminRejectForwardedWFH,
} from "../../auth/server-state/adminwfh/adminwfh.hook";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes progressIn { from { width:0; } }
    .alw-card {
      background:#fff; border-radius:20px; border:1px solid rgba(200,185,220,0.3);
      padding:22px 24px; margin-bottom:14px;
      box-shadow:0 2px 12px rgba(80,40,100,0.07),0 1px 3px rgba(0,0,0,0.04);
      transition:box-shadow .25s ease,transform .25s ease; animation:fadeSlideUp .35s ease both;
    }
    .alw-card:hover { box-shadow:0 8px 28px rgba(80,40,100,0.13),0 2px 6px rgba(0,0,0,0.06); transform:translateY(-1px); }
    .alw-action-btn {
      display:inline-flex; align-items:center; gap:5px; padding:7px 15px;
      border-radius:10px; font-size:12px; font-weight:600; cursor:pointer; border:none;
      font-family:'DM Sans',sans-serif; letter-spacing:.2px; transition:all .18s ease;
    }
    .alw-action-btn:hover { transform:translateY(-1px); filter:brightness(1.05); }
    .alw-action-btn:disabled { opacity:.45; cursor:not-allowed; transform:none !important; }
    .alw-tab-btn {
      padding:9px 22px; border-radius:10px; font-size:13px; font-weight:500;
      font-family:'DM Sans',sans-serif; border:none; cursor:pointer;
      transition:all .2s ease; white-space:nowrap;
    }
    .alw-chip-btn {
      border-radius:22px; font-size:12px; font-weight:500; cursor:pointer;
      font-family:'DM Sans',sans-serif; transition:all .18s ease;
      display:inline-flex; align-items:center; gap:5px; padding:5px 14px;
    }
    .alw-input {
      padding:11px 15px; border-radius:12px; font-size:13px;
      font-family:'DM Sans',sans-serif; color:#1C1028; background:#FDFBFF;
      outline:none; transition:border .2s,box-shadow .2s; width:100%; box-sizing:border-box;
    }
    .alw-input:focus { border-color:#8B3A8A !important; box-shadow:0 0 0 3px rgba(139,58,138,0.10); }
    .alw-btn-primary {
      padding:11px 26px; border-radius:12px; font-size:13px; font-weight:600;
      font-family:'DM Sans',sans-serif; background:linear-gradient(135deg,#6B1A4A,#9B2458);
      color:#fff; border:none; cursor:pointer; box-shadow:0 4px 16px rgba(107,26,74,0.35);
      transition:all .18s ease; letter-spacing:.3px;
    }
    .alw-btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 22px rgba(107,26,74,0.4); }
    .alw-btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none !important; }
    .alw-btn-secondary {
      padding:11px 26px; border-radius:12px; font-size:13px; font-weight:500;
      font-family:'DM Sans',sans-serif; background:#F4EEF9; color:#6B1A4A;
      border:1.5px solid #DFD0EC; cursor:pointer; transition:all .18s ease;
    }
    .alw-btn-secondary:hover { background:#EDE4F5; }
    .alw-stat-card {
      background:#fff; border-radius:20px; border:1px solid rgba(200,185,220,0.3);
      padding:22px 22px 18px; position:relative; overflow:hidden;
      box-shadow:0 2px 12px rgba(80,40,100,0.07); transition:all .25s ease; animation:fadeSlideUp .4s ease both;
    }
    .alw-stat-card:hover { box-shadow:0 8px 28px rgba(80,40,100,0.12); transform:translateY(-2px); }
    .alw-progress-fill { height:100%; border-radius:8px; animation:progressIn .8s ease both; }
    .alw-toast {
      position:fixed; bottom:30px; right:30px; padding:14px 22px; border-radius:14px;
      font-size:13px; font-weight:500; font-family:'DM Sans',sans-serif;
      box-shadow:0 8px 30px rgba(0,0,0,0.14); z-index:9999;
      display:flex; align-items:center; gap:10px;
      transition:all .35s cubic-bezier(.34,1.56,.64,1); backdrop-filter:blur(8px);
    }
    .alw-history-card {
      background:#fff; border-radius:16px; border:1px solid rgba(200,185,220,0.28);
      padding:16px 18px; margin-bottom:10px; box-shadow:0 2px 10px rgba(80,40,100,0.06);
      transition:box-shadow .22s ease,transform .22s ease; animation:fadeSlideUp .3s ease both;
      position:relative; overflow:hidden;
    }
    .alw-history-card:hover { box-shadow:0 6px 22px rgba(80,40,100,0.11); transform:translateY(-1px); }
    .alw-divider { display:inline-block; width:3px; height:18px; background:linear-gradient(180deg,#6B1A4A,#A8295E); border-radius:3px; margin-right:8px; vertical-align:middle; }
    .alw-table th {
      text-align:left; padding:10px 14px; font-size:11px; font-weight:600;
      color:#9B8BAE; text-transform:uppercase; letter-spacing:.7px; background:#FAF7FD;
      border-bottom:1px solid #EDE6F5; font-family:'DM Sans',sans-serif;
    }
    .alw-table td {
      padding:13px 14px; border-bottom:1px solid #F5F0FA; color:#1C1028;
      vertical-align:middle; font-family:'DM Sans',sans-serif; font-size:13px;
    }
    .alw-table tr:last-child td { border-bottom:none; }
    .alw-table tr:hover td { background:#FDFBFF; }
  `}</style>
);

const LEAVE_META = {
  el:          { label:"Earned Leave",    short:"EL",  bg:"#DCFCE7", color:"#14803D", accent:"#22C55E", dot:"#16A34A" },
  sl:          { label:"Sick Leave",      short:"SL",  bg:"#DBEAFE", color:"#1D4ED8", accent:"#3B82F6", dot:"#2563EB" },
  ml:          { label:"Maternity Leave", short:"ML",  bg:"#F3E8FF", color:"#6B21A8", accent:"#A855F7", dot:"#7C3AED" },
  pl:          { label:"Paternity Leave", short:"PL",  bg:"#FEF3C7", color:"#92400E", accent:"#F59E0B", dot:"#D97706" },
  half_day_el: { label:"Half Day EL",     short:"½EL", bg:"#ECFDF5", color:"#065F46", accent:"#10B981", dot:"#059669" },
  half_day_sl: { label:"Half Day SL",     short:"½SL", bg:"#EFF6FF", color:"#1E40AF", accent:"#60A5FA", dot:"#3B82F6" },
};

const LEAVE_STATUS_META = {
  pending_manager:             { label:"Pending",        bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  approved_manager:            { label:"Approved",       bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_manager:            { label:"Rejected",       bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  forwarded_admin:             { label:"Fwd to Admin",   bg:"#EFF6FF", color:"#1D4ED8", dot:"#3B82F6" },
  forwarded_reporting_manager: { label:"Forwarded",      bg:"#EFF6FF", color:"#1D4ED8", dot:"#3B82F6" },
  approved_admin:              { label:"Admin Approved", bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_admin:              { label:"Admin Rejected", bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  approved_reporting_manager:  { label:"RM Approved",    bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_reporting_manager:  { label:"RM Rejected",    bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  pending_reporting_manager:   { label:"Pending",        bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
};

const WFH_STATUS_META = {
  pending_admin:               { label:"Pending",     bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  approved_admin:              { label:"Approved",    bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_admin:              { label:"Rejected",    bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  pending_superadmin:          { label:"Pending SA",  bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  approved_superadmin:         { label:"SA Approved", bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_superadmin:         { label:"SA Rejected", bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  forwarded_reporting_manager: { label:"Forwarded",   bg:"#EFF6FF", color:"#1D4ED8", dot:"#3B82F6" },
};

const LEAVE_FILTERS = [
  { key:"all",       label:"All"       },
  { key:"pending",   label:"Pending"   },
  { key:"approved",  label:"Approved"  },
  { key:"rejected",  label:"Rejected"  },
  { key:"forwarded", label:"Forwarded" },
];

const AVATAR_COLORS = [
  "linear-gradient(135deg,#6B1A4A,#A8295E)",
  "linear-gradient(135deg,#1D4ED8,#3B82F6)",
  "linear-gradient(135deg,#065F46,#10B981)",
  "linear-gradient(135deg,#92400E,#F59E0B)",
  "linear-gradient(135deg,#6B21A8,#A855F7)",
];

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—";

const daysDiff = (s, e) => {
  if (!s || !e) return 0;
  const n = Math.floor((new Date(e) - new Date(s)) / 86400000) + 1;
  return n > 0 ? n : 0;
};

const todayStr = () => new Date().toISOString().split("T")[0];
const avatarColor = (name = "") => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const initials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();

const Spinner = () => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"70px 0", gap:14 }}>
    <div style={{ width:38, height:38, border:"3px solid #EDE6F5", borderTop:"3px solid #8B3A8A", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
    <p style={{ fontSize:13, color:"#9B8BAE", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>Loading…</p>
  </div>
);

const EmptyState = ({ msg = "No records found" }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 0", gap:12 }}>
    <div style={{ width:60, height:60, borderRadius:18, background:"linear-gradient(135deg,#F4EEF9,#EDE4F5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="5" width="20" height="19" rx="4" stroke="#C4AADA" strokeWidth="1.5" fill="none"/>
        <path d="M4 11h20" stroke="#C4AADA" strokeWidth="1.5"/>
        <path d="M9 8V5M19 8V5" stroke="#C4AADA" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 16h6M9 20h10" stroke="#D4BFEA" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </div>
    <p style={{ fontSize:13, color:"#9B8BAE", fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>{msg}</p>
  </div>
);

const Toast = ({ toast }) => {
  const colors = {
    success: { bg:"rgba(240,253,244,0.95)", color:"#14803D", border:"#86EFAC", icon:"#22C55E" },
    error:   { bg:"rgba(254,242,242,0.95)", color:"#991B1B", border:"#FCA5A5", icon:"#EF4444" },
    info:    { bg:"rgba(239,246,255,0.95)", color:"#1D4ED8", border:"#93C5FD", icon:"#3B82F6" },
  };
  const c = colors[toast.type] || colors.info;
  return (
    <div className="alw-toast" style={{
      transform: toast.visible ? "translateY(0) scale(1)" : "translateY(24px) scale(.94)",
      opacity: toast.visible ? 1 : 0, pointerEvents: toast.visible ? "auto" : "none",
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      <div style={{ width:20, height:20, borderRadius:"50%", background:c.icon, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {toast.type === "success" && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type === "error"   && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type === "info"    && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 4v4M5 3v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
      </div>
      {toast.message}
    </div>
  );
};

const StatusBadge = ({ status, meta = LEAVE_STATUS_META }) => {
  const m = meta[status] || { label:status, bg:"#F3F4F6", color:"#374151", dot:"#9CA3AF" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:m.bg, color:m.color, fontFamily:"'DM Sans',sans-serif" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.dot, flexShrink:0 }}/>
      {m.label}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const m = LEAVE_META[type] || { label:(type||"").toUpperCase(), bg:"#F3F4F6", color:"#374151", dot:"#9CA3AF" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:m.bg, color:m.color, fontFamily:"'DM Sans',sans-serif" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.dot, flexShrink:0 }}/>
      {m.label}
    </span>
  );
};

const SectionBox = ({ title, children, rightEl }) => (
  <div style={{ background:"#fff", borderRadius:20, border:"1px solid rgba(200,185,220,0.3)", overflow:"hidden", boxShadow:"0 2px 12px rgba(80,40,100,0.07)", marginBottom:20 }}>
    <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #F0EAF8", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span className="alw-divider"/>
        <span style={{ fontSize:14, fontWeight:600, color:"#1C1028", fontFamily:"'DM Sans',sans-serif" }}>{title}</span>
      </div>
      {rightEl}
    </div>
    <div style={{ padding:"20px 22px 24px" }}>{children}</div>
  </div>
);

const FormField = ({ label, error, children }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
    <label style={{ fontSize:11, fontWeight:600, color:"#6B5080", textTransform:"uppercase", letterSpacing:".5px", fontFamily:"'DM Sans',sans-serif" }}>
      {label} <span style={{ color:"#CD166E" }}>*</span>
    </label>
    {children}
    {error && <span style={{ fontSize:11, color:"#EF4444", fontFamily:"'DM Sans',sans-serif" }}>{error}</span>}
  </div>
);

const LeaveCard = ({ leave, onApprove, onReject, isProcessing, showActions, accentColor, personLabel }) => {
  const person = leave.employee || leave.manager || {};
  const days = leave.days || daysDiff(leave.startDate, leave.endDate);
  const accent = accentColor || (LEAVE_META[leave.leaveType]||{accent:"#8B3A8A"}).accent;

  return (
    <div className="alw-card" style={{ opacity:isProcessing ? .6 : 1, pointerEvents:isProcessing ? "none" : "auto", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, width:3, bottom:0, background:accent, borderRadius:"20px 0 0 20px" }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, paddingLeft:6 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:avatarColor(person.f_name||"A"), color:"#fff", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontFamily:"'DM Sans',sans-serif", boxShadow:"0 3px 10px rgba(0,0,0,0.15)" }}>
              {initials(person.f_name, person.l_name)}
            </div>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ fontSize:14, fontWeight:600, color:"#1C1028", fontFamily:"'DM Sans',sans-serif" }}>{person.f_name} {person.l_name}</div>
                {personLabel && (
                  <span style={{ fontSize:10, fontWeight:700, background:"#F3E8FF", color:"#6B21A8", padding:"2px 8px", borderRadius:10, fontFamily:"'DM Sans',sans-serif" }}>{personLabel}</span>
                )}
              </div>
              <div style={{ fontSize:11, color:"#9B8BAE", marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>{person.work_email}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:12 }}>
            <TypeBadge type={leave.leaveType}/>
            <StatusBadge status={leave.status}/>
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"#F4EEF9", color:"#6B1A4A", fontFamily:"'DM Sans',sans-serif" }}>{days} day{days>1?"s":""}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#9B8BAE", marginTop:10, fontFamily:"'DM Sans',sans-serif" }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1"/><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1"/><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round"/></svg>
            <span style={{ fontWeight:500, color:"#4A3860" }}>{fmt(leave.startDate)}</span>
            <span style={{ color:"#D4BFEA", fontSize:10 }}>→</span>
            <span style={{ fontWeight:500, color:"#4A3860" }}>{fmt(leave.endDate)}</span>
          </div>
          {leave.reason && (
            <div style={{ background:"#FAF7FD", borderRadius:10, padding:"9px 14px", fontSize:12, color:"#4A3860", marginTop:10, borderLeft:"3px solid #D4AECB", lineHeight:1.6, fontFamily:"'DM Sans',sans-serif" }}>
              <span style={{ color:"#6B1A4A", fontWeight:600 }}>Reason — </span>{leave.reason}
            </div>
          )}
        </div>
        {showActions && (
          <div style={{ display:"flex", flexDirection:"column", gap:7, flexShrink:0 }}>
            <button className="alw-action-btn" style={{ background:"#F0FDF4", color:"#14803D", boxShadow:"0 2px 8px rgba(34,197,94,0.15)" }} onClick={onApprove}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5 5.5-5" stroke="#14803D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Approve
            </button>
            <button className="alw-action-btn" style={{ background:"#FFF1F2", color:"#991B1B", boxShadow:"0 2px 8px rgba(239,68,68,0.12)" }} onClick={onReject}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Reject
            </button>
          </div>
        )}
      </div>
      {isProcessing && (
        <div style={{ position:"absolute", inset:0, borderRadius:20, background:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(2px)" }}>
          <div style={{ width:22, height:22, border:"2px solid #EDE6F5", borderTop:"2px solid #8B3A8A", borderRadius:"50%", animation:"spin .6s linear infinite" }}/>
        </div>
      )}
    </div>
  );
};

const MyBalancePanel = ({ admin }) => {
  const { data: meData, isLoading } = useGetMeAdmin();
  if (isLoading) return <Spinner/>;

  const balance = meData?.leaveBalance || {};
  const showML = admin?.gender === "female" && admin?.marital_status === "married";
  const showPL = admin?.gender === "male"   && admin?.marital_status === "married";

  const cards = [
    { key:"el",  label:"Earned Leave",      entitled:balance.EL?.entitled||0, availed:balance.EL?.availed||0, accrued:balance.EL?.accrued||0, accent:"#22C55E", bg:"linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
    { key:"sl",  label:"Sick Leave",        entitled:balance.SL?.entitled||0, availed:balance.SL?.availed||0, accrued:0,                        accent:"#3B82F6", bg:"linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
    { key:"pbc", label:"Paid by Company",   entitled:balance.pbc||0,          availed:0,                       accrued:0,                        accent:"#6B1A4A", bg:"linear-gradient(135deg,#F9EFF5,#F4E6F0)" },
    { key:"lwp", label:"Leave Without Pay", entitled:balance.lwp||0,          availed:0,                       accrued:0,                        accent:"#CD166E", bg:"linear-gradient(135deg,#FDF2F8,#FCE7F3)" },
    ...(showML ? [{ key:"ml", label:"Maternity Leave", entitled:balance.ML||0, availed:0, accrued:0, accent:"#A855F7", bg:"linear-gradient(135deg,#FAF5FF,#F3E8FF)" }] : []),
    ...(showPL ? [{ key:"pl", label:"Paternity Leave", entitled:balance.PL||0, availed:0, accrued:0, accent:"#F59E0B", bg:"linear-gradient(135deg,#FFFBEB,#FEF3C7)" }] : []),
  ];

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:16, marginBottom:24 }}>
        {cards.map((s, i) => {
          const remaining = s.entitled - s.availed;
          const pct = s.entitled > 0 ? Math.min((s.availed / s.entitled) * 100, 100) : 0;
          return (
            <div key={s.key} className="alw-stat-card" style={{ animationDelay:`${i * .08}s` }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:s.accent, borderRadius:"20px 20px 0 0" }}/>
              <div style={{ position:"absolute", right:-8, top:10, fontSize:52, fontWeight:800, color:s.accent, opacity:.06, fontFamily:"'Playfair Display',serif", lineHeight:1, userSelect:"none" }}>
                {(LEAVE_META[s.key]||{short:s.key.toUpperCase().slice(0,2)}).short}
              </div>
              <div style={{ fontSize:11, color:"#9B8BAE", fontWeight:600, fontFamily:"'DM Sans',sans-serif", marginTop:8, textTransform:"uppercase", letterSpacing:".5px" }}>{s.label}</div>
              <div style={{ fontSize:38, fontWeight:700, color:s.accent, lineHeight:1, margin:"6px 0 2px", fontFamily:"'Playfair Display',serif" }}>{remaining}</div>
              <div style={{ fontSize:10, color:"#9B8BAE", fontFamily:"'DM Sans',sans-serif" }}>of {s.entitled} days</div>
              <div style={{ height:5, background:"#F0EAF8", borderRadius:8, marginTop:14, overflow:"hidden" }}>
                <div className="alw-progress-fill" style={{ width:`${Math.max(pct,3)}%`, background:s.accent, animationDelay:`${i*.1+.3}s` }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:7, fontSize:10, color:"#9B8BAE", fontFamily:"'DM Sans',sans-serif" }}>
                {s.accrued > 0 && <span>Accrued: {s.accrued}</span>}
                <span style={{ marginLeft:"auto" }}>{s.availed} used</span>
              </div>
            </div>
          );
        })}
      </div>

      <SectionBox title="Leave Balance Summary">
        <div style={{ overflowX:"auto" }}>
          <table className="alw-table" style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>{["Leave Type","Entitled","Accrued","Used","Remaining","Usage"].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {cards.map(s => {
                const rem = s.entitled - s.availed;
                const pct = s.entitled > 0 ? Math.round((rem / s.entitled) * 100) : 0;
                const m = LEAVE_META[s.key] || { label:s.label, bg:"#F3F4F6", color:"#374151", dot:"#9CA3AF" };
                return (
                  <tr key={s.key}>
                    <td>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:m.bg, color:m.color, fontFamily:"'DM Sans',sans-serif" }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:m.dot, flexShrink:0 }}/>{s.label}
                      </span>
                    </td>
                    <td style={{ fontWeight:600 }}>{s.entitled}</td>
                    <td>{s.accrued || "—"}</td>
                    <td>{s.availed}</td>
                    <td style={{ fontWeight:700, color:s.accent, fontFamily:"'Playfair Display',serif", fontSize:15 }}>{rem}</td>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:56, height:5, background:"#F0EAF8", borderRadius:8, overflow:"hidden" }}>
                          <div className="alw-progress-fill" style={{ width:`${pct}%`, background:s.accent }}/>
                        </div>
                        <span style={{ fontSize:11, color:"#9B8BAE" }}>{pct}%</span>
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

const AllLeavesPanel = ({ showToast }) => {
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState(null);

  const { data: rawData, isLoading, refetch } = useGetForwardedLeaves();
  const acceptMut = useAcceptLeave();
  const rejectMut = useRejectLeave();

  const employeeLeaves = Array.isArray(rawData?.employeeLeaves?.leaves)
    ? rawData.employeeLeaves.leaves
    : [];

  const isStatus = (leave, key) => {
    if (key === "pending")   return leave.status?.includes("pending");
    if (key === "approved")  return leave.status?.includes("approved");
    if (key === "rejected")  return leave.status?.includes("rejected");
    if (key === "forwarded") return leave.status?.includes("forwarded");
    return true;
  };

  const filtered = filter === "all" ? employeeLeaves : employeeLeaves.filter(l => isStatus(l, filter));
  const count = (key) => key === "all" ? employeeLeaves.length : employeeLeaves.filter(l => isStatus(l, key)).length;

  const isActionable = (status) =>
    status === "forwarded_reporting_manager" || status === "pending_manager";

  const handleAction = async (leave, action) => {
    setProcessingId(leave._id);
    try {
      if (action === "approve") { await acceptMut.mutateAsync({ leaveId: leave._id }); showToast("Leave approved", "success"); }
      if (action === "reject")  { await rejectMut.mutateAsync({ leaveId: leave._id }); showToast("Leave rejected", "error"); }
      refetch();
    } catch (err) {
      showToast(err?.message || "Something went wrong", "error");
    } finally { setProcessingId(null); }
  };

  if (isLoading) return <Spinner/>;

  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:22, flexWrap:"wrap" }}>
        {[
          { label:"Total",    val:employeeLeaves.length,                                  color:"#6B1A4A", bg:"linear-gradient(135deg,#F9EFF5,#F4E6F0)" },
          { label:"Pending",  val:employeeLeaves.filter(l=>isStatus(l,"pending")).length,  color:"#92400E", bg:"linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
          { label:"Approved", val:employeeLeaves.filter(l=>isStatus(l,"approved")).length, color:"#14803D", bg:"linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
          { label:"Forwarded",val:employeeLeaves.filter(l=>isStatus(l,"forwarded")).length,color:"#1D4ED8", bg:"linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
        ].map((s, i) => (
          <div key={s.label} style={{ background:s.bg, borderRadius:14, padding:"12px 20px", display:"flex", alignItems:"center", gap:12, border:"1px solid rgba(0,0,0,0.05)", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", animation:`fadeSlideUp .3s ease ${i*.07}s both`, minWidth:110 }}>
            <span style={{ fontSize:26, fontWeight:800, color:s.color, fontFamily:"'Playfair Display',serif", lineHeight:1 }}>{s.val}</span>
            <span style={{ fontSize:11, color:s.color, fontWeight:600, fontFamily:"'DM Sans',sans-serif", opacity:.8, lineHeight:1.3 }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:22, flexWrap:"wrap" }}>
        {LEAVE_FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button key={f.key} className="alw-chip-btn"
              style={{ border:active?"1.5px solid #8B3A8A":"1.5px solid #E5DAF0", background:active?"linear-gradient(135deg,#6B1A4A,#9B2458)":"#fff", color:active?"#fff":"#8B7FA0", boxShadow:active?"0 2px 10px rgba(107,26,74,0.3)":"none" }}
              onClick={() => setFilter(f.key)}>
              {f.label}
              <span style={{ background:active?"rgba(255,255,255,0.25)":"#EDE6F5", color:active?"#fff":"#9B8BAE", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700 }}>
                {count(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0
        ? <EmptyState msg="No leave requests found"/>
        : filtered.map((leave, idx) => (
          <div key={leave._id} style={{ animationDelay:`${idx*.06}s` }}>
            <LeaveCard
              leave={leave}
              isProcessing={processingId === leave._id}
              showActions={isActionable(leave.status)}
              onApprove={() => handleAction(leave, "approve")}
              onReject={() => handleAction(leave, "reject")}
            />
          </div>
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

  const managerLeaves = Array.isArray(rawData?.managerLeaves?.leaves)
    ? rawData.managerLeaves.leaves
    : [];

  const isActionable = (status) => status === "pending_reporting_manager";

  const handleAction = async (leave, action) => {
    setProcessingId(leave._id);
    try {
      if (action === "approve") { await acceptMut.mutateAsync({ leaveId: leave._id }); showToast("Leave approved", "success"); }
      if (action === "reject")  { await rejectMut.mutateAsync({ leaveId: leave._id }); showToast("Leave rejected", "error"); }
      refetch();
    } catch (err) {
      showToast(err?.message || "Something went wrong", "error");
    } finally { setProcessingId(null); }
  };

  if (isLoading) return <Spinner/>;

  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:22, flexWrap:"wrap" }}>
        {[
          { label:"Total",    val:managerLeaves.length,                                                            color:"#6B1A4A", bg:"linear-gradient(135deg,#F9EFF5,#F4E6F0)" },
          { label:"Pending",  val:managerLeaves.filter(l=>l.status?.includes("pending")).length,                   color:"#92400E", bg:"linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
          { label:"Approved", val:managerLeaves.filter(l=>l.status?.includes("approved")).length,                  color:"#14803D", bg:"linear-gradient(135deg,#F0FDF4,#DCFCE7)" },
          { label:"Rejected", val:managerLeaves.filter(l=>l.status?.includes("rejected")).length,                  color:"#991B1B", bg:"linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
        ].map((s, i) => (
          <div key={s.label} style={{ background:s.bg, borderRadius:14, padding:"12px 20px", display:"flex", alignItems:"center", gap:12, border:"1px solid rgba(0,0,0,0.05)", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", animation:`fadeSlideUp .3s ease ${i*.07}s both`, minWidth:110 }}>
            <span style={{ fontSize:26, fontWeight:800, color:s.color, fontFamily:"'Playfair Display',serif", lineHeight:1 }}>{s.val}</span>
            <span style={{ fontSize:11, color:s.color, fontWeight:600, fontFamily:"'DM Sans',sans-serif", opacity:.8, lineHeight:1.3 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {managerLeaves.length === 0
        ? <EmptyState msg="No manager leave requests"/>
        : managerLeaves.map((leave, idx) => (
          <div key={leave._id} style={{ animationDelay:`${idx*.06}s` }}>
            <LeaveCard
              leave={leave}
              isProcessing={processingId === leave._id}
              showActions={isActionable(leave.status)}
              onApprove={() => handleAction(leave, "approve")}
              onReject={() => handleAction(leave, "reject")}
              personLabel="Manager"
              accentColor="#A855F7"
            />
          </div>
        ))
      }
    </div>
  );
};

const WFH_BLANK = { startDate:"", endDate:"", reason:"" };

const MyWFHPanel = ({ showToast }) => {
  const [form, setForm] = useState(WFH_BLANK);
  const [errors, setErrors] = useState({});

  const { data: wfhData, isLoading } = useAdminGetMyWFH();
  const applyMut = useAdminApplyWFH();

  const raw = wfhData?.wfhList || wfhData || [];
  const wfhList = Array.isArray(raw) ? raw : [];

  const set = (k, v) => setForm(p => ({ ...p, [k]:v }));

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
  const ib = (k) => errors[k] ? "#FCA5A5" : "#E2D8EE";

  return (
    <div>
      <SectionBox title="Apply Work From Home">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
          <FormField label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} min={todayStr()} className="alw-input" style={{ border:`1.5px solid ${ib("startDate")}` }}/>
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} min={form.startDate || todayStr()} className="alw-input" style={{ border:`1.5px solid ${ib("endDate")}` }}/>
          </FormField>
        </div>
        {days > 0 && (
          <div style={{ background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", border:"1px solid #BFDBFE", borderRadius:12, padding:"12px 18px", fontSize:13, color:"#1D4ED8", fontWeight:600, marginBottom:18, display:"flex", alignItems:"center", gap:8, fontFamily:"'DM Sans',sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="3" stroke="#3B82F6" strokeWidth="1.3"/><path d="M4 7h2v4M8 4v7" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <strong style={{ fontFamily:"'Playfair Display',serif", fontSize:15 }}>{days}</strong> day{days>1?"s":""} · Work From Home
          </div>
        )}
        <FormField label="Reason" error={errors.reason}>
          <textarea value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="Briefly explain why you need to work from home…" className="alw-input" style={{ border:`1.5px solid ${ib("reason")}`, minHeight:88, resize:"vertical", lineHeight:1.6 }}/>
        </FormField>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:18 }}>
          <button className="alw-btn-secondary" onClick={() => { setForm(WFH_BLANK); setErrors({}); }}>Clear</button>
          <button className="alw-btn-primary" onClick={handleSubmit} disabled={applyMut.isPending}>
            {applyMut.isPending ? "Submitting…" : "Submit WFH Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox title="My WFH History" rightEl={
        wfhList.length > 0
          ? <span style={{ background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", color:"#1D4ED8", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, fontFamily:"'DM Sans',sans-serif" }}>{wfhList.length} record{wfhList.length!==1?"s":""}</span>
          : null
      }>
        {isLoading ? <Spinner/> : wfhList.length === 0 ? <EmptyState msg="No WFH records yet"/> : (
          <div>
            {wfhList.map((wfh, idx) => {
              const d = wfh.days || daysDiff(wfh.startDate, wfh.endDate);
              return (
                <div key={wfh._id || idx} className="alw-history-card" style={{ animationDelay:`${idx*.05}s` }}>
                  <div style={{ position:"absolute", top:0, left:0, width:3, bottom:0, background:"#3B82F6", borderRadius:"16px 0 0 16px" }}/>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, paddingLeft:8 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"#DBEAFE", color:"#1D4ED8", fontFamily:"'DM Sans',sans-serif" }}>
                          <span style={{ width:5, height:5, borderRadius:"50%", background:"#3B82F6", flexShrink:0 }}/>WFH
                        </span>
                        <StatusBadge status={wfh.status} meta={WFH_STATUS_META}/>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"#F0F9FF", color:"#0369A1", fontFamily:"'DM Sans',sans-serif" }}>{d} day{d>1?"s":""}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#9B8BAE", fontFamily:"'DM Sans',sans-serif" }}>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1"/><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1"/><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round"/></svg>
                        <span style={{ fontWeight:500, color:"#4A3860" }}>{fmt(wfh.startDate)}</span>
                        <span style={{ color:"#D4BFEA", fontSize:10 }}>→</span>
                        <span style={{ fontWeight:500, color:"#4A3860" }}>{fmt(wfh.endDate)}</span>
                      </div>
                      {wfh.reason && (
                        <div style={{ background:"#F0F9FF", borderRadius:10, padding:"8px 13px", fontSize:12, color:"#1E3A5F", marginTop:10, borderLeft:"3px solid #93C5FD", lineHeight:1.6, fontFamily:"'DM Sans',sans-serif" }}>
                          <span style={{ color:"#1D4ED8", fontWeight:600 }}>Reason — </span>{wfh.reason}
                        </div>
                      )}
                    </div>
                    {wfh.createdAt && (
                      <div style={{ fontSize:10, color:"#9B8BAE", textAlign:"right", lineHeight:1.4, fontFamily:"'DM Sans',sans-serif", flexShrink:0 }}>
                        Applied<br/><span style={{ fontWeight:600, color:"#7B6890" }}>{fmt(wfh.createdAt)}</span>
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

const ForwardedWFHPanel = ({ showToast }) => {
  const [processingId, setProcessingId] = useState(null);

  const { data: fwdData, isLoading, refetch } = useAdminGetForwardedWFH();
  const approveMut = useAdminApproveForwardedWFH();
  const rejectMut  = useAdminRejectForwardedWFH();

  const raw = fwdData?.wfhList || fwdData || [];
  const list = Array.isArray(raw) ? raw : [];

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

  if (isLoading) return <Spinner/>;

  return (
    <div>
      <div style={{ display:"flex", gap:12, marginBottom:22 }}>
        <div style={{ background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", borderRadius:14, padding:"12px 20px", display:"flex", alignItems:"center", gap:12, border:"1px solid rgba(0,0,0,0.05)", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize:26, fontWeight:800, color:"#1D4ED8", fontFamily:"'Playfair Display',serif", lineHeight:1 }}>{list.length}</span>
          <span style={{ fontSize:11, color:"#1D4ED8", fontWeight:600, fontFamily:"'DM Sans',sans-serif", opacity:.8 }}>Pending Review</span>
        </div>
      </div>

      {list.length === 0
        ? <EmptyState msg="No forwarded WFH requests"/>
        : list.map((wfh, idx) => {
          const requester = wfh.requester || {};
          const d = wfh.days || daysDiff(wfh.startDate, wfh.endDate);
          const isProcessing = processingId === wfh._id;
          return (
            <div key={wfh._id || idx} className="alw-card" style={{ opacity:isProcessing ? .6 : 1, pointerEvents:isProcessing ? "none" : "auto", animationDelay:`${idx*.06}s`, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, width:3, bottom:0, background:"#3B82F6", borderRadius:"20px 0 0 20px" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, paddingLeft:6 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:14, background:avatarColor(requester.f_name||"A"), color:"#fff", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontFamily:"'DM Sans',sans-serif", boxShadow:"0 3px 10px rgba(0,0,0,0.15)" }}>
                      {initials(requester.f_name, requester.l_name)}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:"#1C1028", fontFamily:"'DM Sans',sans-serif" }}>{requester.f_name} {requester.l_name}</div>
                      <div style={{ fontSize:11, color:"#9B8BAE", marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>{requester.designation || requester.work_email}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:12 }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"#DBEAFE", color:"#1D4ED8", fontFamily:"'DM Sans',sans-serif" }}>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:"#3B82F6", flexShrink:0 }}/>WFH
                    </span>
                    <StatusBadge status={wfh.status} meta={WFH_STATUS_META}/>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:"#F0F9FF", color:"#0369A1", fontFamily:"'DM Sans',sans-serif" }}>{d} day{d>1?"s":""}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#9B8BAE", marginTop:10, fontFamily:"'DM Sans',sans-serif" }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1"/><path d="M1 6h11" stroke="#C4AADA" strokeWidth="1"/><path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round"/></svg>
                    <span style={{ fontWeight:500, color:"#4A3860" }}>{fmt(wfh.startDate)}</span>
                    <span style={{ color:"#D4BFEA", fontSize:10 }}>→</span>
                    <span style={{ fontWeight:500, color:"#4A3860" }}>{fmt(wfh.endDate)}</span>
                  </div>
                  {wfh.reason && (
                    <div style={{ background:"#F0F9FF", borderRadius:10, padding:"9px 14px", fontSize:12, color:"#1E3A5F", marginTop:10, borderLeft:"3px solid #93C5FD", lineHeight:1.6, fontFamily:"'DM Sans',sans-serif" }}>
                      <span style={{ color:"#1D4ED8", fontWeight:600 }}>Reason — </span>{wfh.reason}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:7, flexShrink:0 }}>
                  <button className="alw-action-btn" style={{ background:"#F0FDF4", color:"#14803D", boxShadow:"0 2px 8px rgba(34,197,94,0.15)" }} onClick={() => handleAction(wfh._id, "approve")}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5 5.5-5" stroke="#14803D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Approve
                  </button>
                  <button className="alw-action-btn" style={{ background:"#FFF1F2", color:"#991B1B", boxShadow:"0 2px 8px rgba(239,68,68,0.12)" }} onClick={() => handleAction(wfh._id, "reject")}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Reject
                  </button>
                </div>
              </div>
              {isProcessing && (
                <div style={{ position:"absolute", inset:0, borderRadius:20, background:"rgba(255,255,255,0.7)", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(2px)" }}>
                  <div style={{ width:22, height:22, border:"2px solid #EDE6F5", borderTop:"2px solid #8B3A8A", borderRadius:"50%", animation:"spin .6s linear infinite" }}/>
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
};

const AdminLeaveWFH = () => {
  const [tab, setTab]     = useState("allLeaves");
  const [toast, setToast] = useState({ visible:false, message:"", type:"success" });

  const { data: meData } = useGetMeAdmin();
  const admin = meData?.user || meData;

  const showToast = (message, type = "success") => {
    setToast({ visible:true, message, type });
    setTimeout(() => setToast(p => ({ ...p, visible:false })), 3400);
  };

  const TABS = [
    { key:"allLeaves",     label:"Employee Leaves" },
    { key:"managerLeaves", label:"Manager Leaves"  },
    { key:"myBalance",     label:"My Balance"      },
    { key:"myWFH",         label:"My WFH"          },
    { key:"forwardedWFH",  label:"Forwarded WFH"   },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F7F3FC 0%,#F0EBF8 50%,#F4F0FA 100%)", fontFamily:"'DM Sans',sans-serif", padding:"32px 36px" }}>
      <GlobalStyles/>
      <div style={{ position:"fixed", top:-80, right:-80, width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle,rgba(168,41,94,0.07) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>
      <div style={{ position:"fixed", bottom:-60, left:-60, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(107,26,74,0.06) 0%,transparent 70%)", pointerEvents:"none", zIndex:0 }}/>

      <div style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:30, flexWrap:"wrap", gap:16, animation:"fadeSlideUp .3s ease both" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:50, height:50, borderRadius:16, background:"linear-gradient(135deg,#6B1A4A,#A8295E)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 20px rgba(107,26,74,0.38)" }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="4" width="16" height="15" rx="3" stroke="white" strokeWidth="1.5"/>
                <path d="M3 9h16" stroke="white" strokeWidth="1.5"/>
                <path d="M7 2v4M15 2v4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 13h4M7 16h8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:700, color:"#1C1028", margin:0, fontFamily:"'Playfair Display',serif", letterSpacing:"-.3px" }}>Leave & WFH</h1>
              <p style={{ fontSize:12, color:"#9B8BAE", margin:"3px 0 0", fontWeight:400 }}>Manage employee leaves · Track balance · Work from home</p>
            </div>
          </div>
          {admin && (
            <div style={{ background:"#fff", border:"1px solid rgba(200,185,220,0.4)", borderRadius:14, padding:"10px 16px", display:"flex", alignItems:"center", gap:10, boxShadow:"0 2px 12px rgba(80,40,100,0.08)" }}>
              <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#6B1A4A,#A8295E)", color:"#fff", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {(admin.f_name?.[0]||"")}{(admin.l_name?.[0]||"")}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:12, color:"#1C1028" }}>{admin.f_name} {admin.l_name}</div>
                <div style={{ fontSize:10, color:"#9B8BAE", marginTop:1 }}>{admin.designation || admin.role}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:4, background:"rgba(235,228,245,0.7)", backdropFilter:"blur(8px)", borderRadius:14, padding:4, marginBottom:28, width:"fit-content", border:"1px solid rgba(200,185,220,0.3)", boxShadow:"0 2px 8px rgba(80,40,100,0.06)", flexWrap:"wrap" }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} className="alw-tab-btn"
                style={{ color:active?"#fff":"#9B8BAE", background:active?"linear-gradient(135deg,#6B1A4A,#9B2458)":"transparent", fontWeight:active?600:400, boxShadow:active?"0 3px 12px rgba(107,26,74,0.32)":"none" }}
                onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "allLeaves"     && <AllLeavesPanel showToast={showToast}/>}
        {tab === "managerLeaves" && <ManagerLeavesPanel showToast={showToast}/>}
        {tab === "myBalance"     && <MyBalancePanel admin={admin}/>}
        {tab === "myWFH"         && <MyWFHPanel showToast={showToast}/>}
        {tab === "forwardedWFH"  && <ForwardedWFHPanel showToast={showToast}/>}
      </div>

      <Toast toast={toast}/>
    </div>
  );
};

export default AdminLeaveWFH;