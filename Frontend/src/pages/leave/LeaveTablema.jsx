"use client";

import React, { useState } from "react";
import {
  useGetAllManagerLeaves,
  useAcceptLeaveRequest,
  useRejectLeaveRequest,
  useForwardLeaveToReportingManager,
  useGetMyLeavesManager,
  useApplyLeaveManager,
  useGetLeaveHistory,
  useGetForwardedLeavesManager,
  useAcceptForwardedLeave,
  useRejectForwardedLeave,
  useForwardLeaveUpChain,
} from "../../auth/server-state/manager/managerleave/managerleave.hook";
import {
  useManagerApplyWFH,
  useManagerGetMyWFH,
  useManagerGetPendingWFH,
  useManagerGetAllTeamWFH,
  useManagerApproveWFH,
  useManagerRejectWFH,
  useManagerForwardWFH,
  useManagerGetForwardedWFH,
  useManagerApproveForwardedWFH,
  useManagerRejectForwardedWFH,
} from "../../auth/server-state/manager/managerwfh/managerwfh.hook";
import { useGetMeManager } from "../../auth/server-state/manager/managerauth/managerauth.hook";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeSlideUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes progressIn { from { width:0; } }

    .mlw-root {
      min-height: 100vh;
      background: linear-gradient(160deg,#F7F3FC 0%,#F0EBF8 50%,#F4F0FA 100%);
      font-family: 'DM Sans', sans-serif;
      padding: 28px 32px;
    }
    @media (max-width: 1024px) { .mlw-root { padding: 22px 20px; } }
    @media (max-width: 640px)  { .mlw-root { padding: 16px 14px; } }

    .mlw-inner { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; }

    .mlw-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 26px; flex-wrap: wrap; gap: 14px;
      animation: fadeSlideUp .3s ease both;
    }
    .mlw-header-left  { display: flex; align-items: center; gap: 14px; }
    .mlw-header-icon  {
      width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
      background: linear-gradient(135deg,#6B1A4A,#A8295E);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 5px 18px rgba(107,26,74,0.38);
    }
    @media (max-width: 480px) {
      .mlw-header-icon { width: 40px; height: 40px; border-radius: 12px; }
      .mlw-header h1 { font-size: 18px !important; }
    }
    .mlw-manager-chip {
      background: #fff; border: 1px solid rgba(200,185,220,0.45);
      border-radius: 12px; padding: 9px 14px;
      display: flex; align-items: center; gap: 10px;
      box-shadow: 0 2px 10px rgba(80,40,100,0.08);
    }
    .mlw-manager-avatar {
      width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
      background: linear-gradient(135deg,#6B1A4A,#A8295E);
      color: #fff; font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }

    .mlw-tabs-wrap {
      display: flex; gap: 3px;
      background: rgba(235,228,245,0.75);
      backdrop-filter: blur(8px);
      border-radius: 13px; padding: 4px;
      margin-bottom: 26px;
      border: 1px solid rgba(200,185,220,0.3);
      box-shadow: 0 2px 8px rgba(80,40,100,0.06);
      overflow-x: auto; -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .mlw-tabs-wrap::-webkit-scrollbar { display: none; }
    .mlw-tab-btn {
      padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 500;
      font-family: 'DM Sans', sans-serif; border: none; cursor: pointer;
      transition: all .2s ease; white-space: nowrap; flex-shrink: 0;
    }
    @media (max-width: 640px) { .mlw-tab-btn { padding: 8px 13px; font-size: 12px; } }

    .mlw-card {
      background: #fff; border-radius: 18px; border: 1px solid rgba(200,185,220,0.3);
      padding: 18px 20px; margin-bottom: 12px;
      box-shadow: 0 2px 10px rgba(80,40,100,0.07),0 1px 3px rgba(0,0,0,0.04);
      transition: box-shadow .22s ease, transform .22s ease;
      animation: fadeSlideUp .33s ease both; position: relative; overflow: hidden;
    }
    .mlw-card:hover { box-shadow: 0 7px 24px rgba(80,40,100,0.13),0 2px 6px rgba(0,0,0,0.06); transform: translateY(-1px); }

    .mlw-card-body {
      display: flex; justify-content: space-between;
      align-items: flex-start; gap: 14px; padding-left: 6px;
    }
    @media (max-width: 560px) {
      .mlw-card-body { flex-direction: column; gap: 14px; }
      .mlw-card-actions { flex-direction: row !important; flex-wrap: wrap; width: 100%; }
      .mlw-card-actions button { flex: 1 1 80px; justify-content: center; }
    }

    .mlw-action-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      padding: 7px 14px; border-radius: 9px; font-size: 12px; font-weight: 600;
      cursor: pointer; border: none; font-family: 'DM Sans', sans-serif;
      letter-spacing: .2px; transition: all .17s ease; white-space: nowrap;
    }
    .mlw-action-btn:hover  { transform: translateY(-1px); filter: brightness(1.06); }
    .mlw-action-btn:active { transform: translateY(0); }
    .mlw-action-btn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; }

    .mlw-chip-btn {
      border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer;
      font-family: 'DM Sans', sans-serif; transition: all .18s ease;
      display: inline-flex; align-items: center; gap: 5px; padding: 5px 13px;
    }

    .mlw-input {
      padding: 10px 14px; border-radius: 11px; font-size: 13px;
      font-family: 'DM Sans', sans-serif; color: #1C1028; background: #FDFBFF;
      outline: none; transition: border .2s, box-shadow .2s;
      width: 100%; box-sizing: border-box;
    }
    .mlw-input:focus { border-color: #8B3A8A !important; box-shadow: 0 0 0 3px rgba(139,58,138,0.10); }

    .mlw-btn-primary {
      padding: 10px 24px; border-radius: 11px; font-size: 13px; font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      background: linear-gradient(135deg,#6B1A4A,#9B2458);
      color: #fff; border: none; cursor: pointer;
      box-shadow: 0 4px 14px rgba(107,26,74,0.35);
      transition: all .18s ease; letter-spacing: .3px;
    }
    .mlw-btn-primary:hover    { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(107,26,74,0.4); }
    .mlw-btn-primary:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }

    .mlw-btn-secondary {
      padding: 10px 24px; border-radius: 11px; font-size: 13px; font-weight: 500;
      font-family: 'DM Sans', sans-serif; background: #F4EEF9; color: #6B1A4A;
      border: 1.5px solid #DFD0EC; cursor: pointer; transition: all .18s ease;
    }
    .mlw-btn-secondary:hover { background: #EDE4F5; }

    .mlw-section-box {
      background: #fff; border-radius: 18px; border: 1px solid rgba(200,185,220,0.3);
      overflow: hidden; box-shadow: 0 2px 10px rgba(80,40,100,0.07); margin-bottom: 18px;
    }
    .mlw-section-header {
      padding: 16px 20px 13px; border-bottom: 1px solid #F0EAF8;
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
    }
    .mlw-section-body { padding: 18px 20px 22px; }
    @media (max-width: 480px) {
      .mlw-section-body { padding: 14px 14px 18px; }
      .mlw-section-header { padding: 13px 14px 11px; }
    }

    .mlw-divider {
      display: inline-block; width: 3px; height: 17px;
      background: linear-gradient(180deg,#6B1A4A,#A8295E);
      border-radius: 3px; margin-right: 8px; vertical-align: middle;
    }

    .mlw-stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 14px; margin-bottom: 22px;
    }
    @media (max-width: 480px) { .mlw-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }

    .mlw-stat-card {
      background: #fff; border-radius: 18px; border: 1px solid rgba(200,185,220,0.3);
      padding: 18px 18px 15px; position: relative; overflow: hidden;
      box-shadow: 0 2px 10px rgba(80,40,100,0.07);
      transition: all .22s ease; animation: fadeSlideUp .4s ease both;
    }
    .mlw-stat-card:hover { box-shadow: 0 7px 24px rgba(80,40,100,0.12); transform: translateY(-2px); }

    .mlw-form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;
    }
    @media (max-width: 600px) { .mlw-form-grid { grid-template-columns: 1fr; } }

    .mlw-form-actions {
      display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; flex-wrap: wrap;
    }
    @media (max-width: 420px) {
      .mlw-form-actions { flex-direction: column; }
      .mlw-form-actions button { width: 100%; }
    }

    .mlw-summary-counters {
      display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
    }

    .mlw-progress-fill { height: 100%; border-radius: 8px; animation: progressIn .8s ease both; }

    .mlw-history-card {
      background: #fff; border-radius: 15px; border: 1px solid rgba(200,185,220,0.28);
      padding: 14px 16px; margin-bottom: 10px;
      box-shadow: 0 2px 9px rgba(80,40,100,0.06);
      transition: box-shadow .2s ease, transform .2s ease;
      animation: fadeSlideUp .3s ease both; position: relative; overflow: hidden;
    }
    .mlw-history-card:hover { box-shadow: 0 5px 20px rgba(80,40,100,0.11); transform: translateY(-1px); }

    .mlw-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .mlw-table { width: 100%; border-collapse: collapse; min-width: 480px; }
    .mlw-table th {
      text-align: left; padding: 9px 13px; font-size: 11px; font-weight: 600;
      color: #9B8BAE; text-transform: uppercase; letter-spacing: .7px;
      background: #FAF7FD; border-bottom: 1px solid #EDE6F5;
      font-family: 'DM Sans', sans-serif;
    }
    .mlw-table td {
      padding: 12px 13px; border-bottom: 1px solid #F5F0FA;
      color: #1C1028; vertical-align: middle;
      font-family: 'DM Sans', sans-serif; font-size: 13px;
    }
    .mlw-table tr:last-child td { border-bottom: none; }
    .mlw-table tr:hover td { background: #FDFBFF; }

    .mlw-toast {
      position: fixed; bottom: 26px; right: 22px; padding: 13px 20px;
      border-radius: 13px; font-size: 13px; font-weight: 500;
      font-family: 'DM Sans', sans-serif;
      box-shadow: 0 8px 28px rgba(0,0,0,0.13); z-index: 9999;
      display: flex; align-items: center; gap: 9px;
      transition: all .33s cubic-bezier(.34,1.56,.64,1);
      backdrop-filter: blur(8px);
      max-width: calc(100vw - 44px);
    }
    @media (max-width: 480px) { .mlw-toast { bottom: 16px; right: 14px; left: 14px; max-width: none; } }

    .mlw-info-banner {
      background: linear-gradient(135deg,#EFF6FF,#DBEAFE);
      border: 1px solid #BFDBFE; border-radius: 13px;
      padding: 11px 16px; margin-bottom: 18px;
      display: flex; align-items: flex-start; gap: 9px;
    }
    .mlw-inner-tabs { display: flex; gap: 7px; margin-bottom: 20px; flex-wrap: wrap; }

    .mlw-overlay {
      position: absolute; inset: 0; border-radius: 18px;
      background: rgba(255,255,255,0.72);
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(2px);
    }
    .mlw-spinner-sm {
      width: 20px; height: 20px; border-radius: 50%;
      border: 2px solid #EDE6F5; border-top-color: #8B3A8A;
      animation: spin .6s linear infinite;
    }
    .mlw-spinner-lg {
      width: 36px; height: 36px; border-radius: 50%;
      border: 3px solid #EDE6F5; border-top-color: #8B3A8A;
      animation: spin .7s linear infinite;
    }
  `}</style>
);

const LEAVE_META = {
  el:          { label:"Earned Leave",    short:"EL",  bg:"#DCFCE7", color:"#14803D", accent:"#22C55E", dot:"#16A34A" },
  sl:          { label:"Sick Leave",      short:"SL",  bg:"#DBEAFE", color:"#1D4ED8", accent:"#3B82F6", dot:"#2563EB" },
  ml:          { label:"Maternity Leave", short:"ML",  bg:"#F3E8FF", color:"#6B21A8", accent:"#A855F7", dot:"#7C3AED" },
  pl:          { label:"Paternity Leave", short:"PL",  bg:"#FEF3C7", color:"#92400E", accent:"#F59E0B", dot:"#D97706" },
  half_day_el: { label:"Half Day EL",     short:"½EL", bg:"#ECFDF5", color:"#065F46", accent:"#10B981", dot:"#059669" },
  half_day_sl: { label:"Half Day SL",     short:"½SL", bg:"#EFF6FF", color:"#1E40AF", accent:"#60A5FA", dot:"#3B82F6" },
  lwp:         { label:"Leave Without Pay", short:"LWP", bg:"#FCE7F3", color:"#9D174D", accent:"#DB2777", dot:"#DB2777" },
};

const LEAVE_STATUS_META = {
  pending_manager:             { label:"Pending Manager",            bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  pending_reporting_manager:   { label:"Pending Reporting Mgr",      bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  forwarded_reporting_manager: { label:"Forwarded Reporting Mgr",    bg:"#EFF6FF", color:"#1D4ED8", dot:"#3B82F6" },
  approved_manager:            { label:"Approved by Manager",        bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  approved_reporting_manager:  { label:"Approved Reporting Mgr",     bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_manager:            { label:"Rejected by Manager",        bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  rejected_reporting_manager:  { label:"Rejected Reporting Mgr",     bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  forwarded_admin:             { label:"Forwarded to Admin",         bg:"#EFF6FF", color:"#1D4ED8", dot:"#3B82F6" },
  approved_admin:              { label:"Approved by Admin",          bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_admin:              { label:"Rejected by Admin",          bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  approved_superadmin:         { label:"Approved Super Admin",       bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_superadmin:         { label:"Rejected Super Admin",       bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  pending_admin:               { label:"Pending Admin",              bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  pending_superadmin:          { label:"Pending Super Admin",        bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
};

const WFH_STATUS_META = {
  pending_manager:             { label:"Pending Manager",            bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  approved_manager:            { label:"Approved by Manager",        bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_manager:            { label:"Rejected by Manager",        bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  forwarded_reporting_manager: { label:"Forwarded Reporting Mgr",    bg:"#EFF6FF", color:"#1D4ED8", dot:"#3B82F6" },
  pending_reporting_manager:   { label:"Pending Reporting Mgr",      bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  approved_reporting_manager:  { label:"Approved Reporting Mgr",     bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_reporting_manager:  { label:"Rejected Reporting Mgr",     bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  pending_admin:               { label:"Pending Admin",              bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  approved_admin:              { label:"Approved by Admin",          bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_admin:              { label:"Rejected by Admin",          bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  pending_superadmin:          { label:"Pending Super Admin",        bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  approved_superadmin:         { label:"Approved Super Admin",       bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  rejected_superadmin:         { label:"Rejected Super Admin",       bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
};

const EMP_LEAVE_FILTERS = [
  { key:"all",              label:"All"       },
  { key:"pending_manager",  label:"Pending"   },
  { key:"approved_manager", label:"Approved"  },
  { key:"rejected_manager", label:"Rejected"  },
  { key:"forwarded_reporting_manager", label:"Forwarded" },
];

const NON_ACTIONABLE = [
  "approved_manager","rejected_manager","forwarded_admin",
  "approved_admin","rejected_admin","forwarded_reporting_manager",
  "approved_reporting_manager","rejected_reporting_manager",
];

const AVATAR_COLORS = [
  "linear-gradient(135deg,#6B1A4A,#A8295E)",
  "linear-gradient(135deg,#1D4ED8,#3B82F6)",
  "linear-gradient(135deg,#065F46,#10B981)",
  "linear-gradient(135deg,#92400E,#F59E0B)",
  "linear-gradient(135deg,#6B21A8,#A855F7)",
];

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";

const daysDiff = (s,e) => {
  if (!s||!e) return 0;
  const n = Math.floor((new Date(e)-new Date(s))/86400000)+1;
  return n>0?n:0;
};

const todayStr = () => new Date().toISOString().split("T")[0];
const avatarColor = (name="") => AVATAR_COLORS[name.charCodeAt(0)%AVATAR_COLORS.length];
const initials = (f="",l="") => `${f[0]||""}${l[0]||""}`.toUpperCase();

const normalizeLeave = (raw) => {
  if (!raw||typeof raw!=="object") return null;
  return {
    _id:       raw._id       || raw.id,
    leaveType: raw.leaveType || raw.leave_type || raw.type || "",
    status:    raw.status    || "",
    startDate: raw.startDate || raw.start_date || raw.from || "",
    endDate:   raw.endDate   || raw.end_date   || raw.to   || "",
    days:      raw.days      || raw.totalDays  || raw.total_days || 0,
    reason:    raw.reason    || raw.description || "",
    createdAt: raw.createdAt || raw.created_at  || raw.appliedAt || "",
  };
};

const extractArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.leaves))  return data.leaves;
  if (Array.isArray(data.data))    return data.data;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.list))    return data.list;
  if (data.leave&&Array.isArray(data.leave)) return data.leave;
  return [];
};

const Spinner = () => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 0",gap:12}}>
    <div className="mlw-spinner-lg"/>
    <p style={{fontSize:13,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif",fontWeight:500,margin:0}}>Loading…</p>
  </div>
);

const EmptyState = ({msg="No records found"}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"50px 0",gap:11}}>
    <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#F4EEF9,#EDE4F5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="5" width="20" height="19" rx="4" stroke="#C4AADA" strokeWidth="1.5" fill="none"/>
        <path d="M4 11h20" stroke="#C4AADA" strokeWidth="1.5"/>
        <path d="M9 8V5M19 8V5" stroke="#C4AADA" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 16h6M9 20h10" stroke="#D4BFEA" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </div>
    <p style={{fontSize:13,color:"#9B8BAE",fontWeight:500,fontFamily:"'DM Sans',sans-serif",margin:0}}>{msg}</p>
  </div>
);

const Toast = ({toast}) => {
  const colors = {
    success:{bg:"rgba(240,253,244,0.96)",color:"#14803D",border:"#86EFAC",icon:"#22C55E"},
    error:  {bg:"rgba(254,242,242,0.96)",color:"#991B1B",border:"#FCA5A5",icon:"#EF4444"},
    info:   {bg:"rgba(239,246,255,0.96)",color:"#1D4ED8",border:"#93C5FD",icon:"#3B82F6"},
  };
  const c = colors[toast.type]||colors.info;
  return (
    <div className="mlw-toast" style={{
      transform:toast.visible?"translateY(0) scale(1)":"translateY(22px) scale(.95)",
      opacity:toast.visible?1:0,
      pointerEvents:toast.visible?"auto":"none",
      background:c.bg,color:c.color,border:`1px solid ${c.border}`,
    }}>
      <div style={{width:19,height:19,borderRadius:"50%",background:c.icon,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        {toast.type==="success"&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type==="error"  &&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type==="info"   &&<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M5 4v4M5 3v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
      </div>
      {toast.message}
    </div>
  );
};

const TypeBadge = ({type}) => {
  const m = LEAVE_META[type]||{label:(type||"Leave").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()),bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF"};
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:18,fontSize:11,fontWeight:600,background:m.bg,color:m.color,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:m.dot,flexShrink:0}}/>
      {m.label}
    </span>
  );
};

const StatusBadge = ({status,meta}) => {
  const pool = meta||LEAVE_STATUS_META;
  const m = pool[status]||{label:(status||"Unknown").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()),bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF"};
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:18,fontSize:11,fontWeight:600,background:m.bg,color:m.color,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:m.dot,flexShrink:0}}/>
      {m.label}
    </span>
  );
};

const SectionBox = ({title,children,rightEl}) => (
  <div className="mlw-section-box">
    <div className="mlw-section-header">
      <div style={{display:"flex",alignItems:"center"}}>
        <span className="mlw-divider"/>
        <span style={{fontSize:14,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif"}}>{title}</span>
      </div>
      {rightEl}
    </div>
    <div className="mlw-section-body">{children}</div>
  </div>
);

const FormField = ({label,error,children}) => (
  <div style={{display:"flex",flexDirection:"column",gap:6}}>
    <label style={{fontSize:11,fontWeight:600,color:"#6B5080",textTransform:"uppercase",letterSpacing:".5px",fontFamily:"'DM Sans',sans-serif"}}>
      {label} <span style={{color:"#CD166E"}}>*</span>
    </label>
    {children}
    {error&&<span style={{fontSize:11,color:"#EF4444",fontFamily:"'DM Sans',sans-serif"}}>{error}</span>}
  </div>
);

const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l2.5 2.5 5.5-5" stroke="#14803D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconX = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M3 3l6 6M9 3l-6 6" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconForward = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2 6h8M7 3l3 3-3 3" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconForwardChain = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2 6h8M7 3l3 3-3 3" stroke="#6B21A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCal = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1"/>
    <path d="M1 6h11" stroke="#C4AADA" strokeWidth="1"/>
    <path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const DateRange = ({startDate,endDate}) => (
  <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif",flexWrap:"wrap"}}>
    <IconCal/>
    <span style={{fontWeight:500,color:"#4A3860"}}>{fmt(startDate)}</span>
    <span style={{color:"#D4BFEA",fontSize:10}}>→</span>
    <span style={{fontWeight:500,color:"#4A3860"}}>{fmt(endDate)}</span>
  </div>
);

const ReasonBox = ({reason,accent,accentBorder,accentLabel}) => (
  reason ? (
    <div style={{background:accent||"#FAF7FD",borderRadius:9,padding:"8px 13px",fontSize:12,color:"#4A3860",marginTop:10,borderLeft:`3px solid ${accentBorder||"#D4AECB"}`,lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>
      <span style={{color:accentLabel||"#6B1A4A",fontWeight:600}}>Reason — </span>{reason}
    </div>
  ) : null
);

const AvatarBox = ({name,subtext}) => (
  <div style={{display:"flex",alignItems:"center",gap:13}}>
    <div style={{width:42,height:42,borderRadius:13,background:avatarColor(name||"A"),color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"'DM Sans',sans-serif",boxShadow:"0 3px 9px rgba(0,0,0,0.14)"}}>
      {name?.charAt(0)?.toUpperCase()||"?"}
    </div>
    <div>
      <div style={{fontSize:14,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif"}}>{name}</div>
      {subtext&&<div style={{fontSize:11,color:"#9B8BAE",marginTop:2,fontFamily:"'DM Sans',sans-serif"}}>{subtext}</div>}
    </div>
  </div>
);

const DaysBadge = ({days,color,bg}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:18,fontSize:11,fontWeight:600,background:bg||"#F4EEF9",color:color||"#6B1A4A",fontFamily:"'DM Sans',sans-serif"}}>
    {days} day{days>1?"s":""}
  </span>
);

const EmployeeLeavesPanel = ({showToast}) => {
  const [filter,setFilter]         = useState("all");
  const [processingId,setProcessingId] = useState(null);
  const [localOverrides,setLocalOverrides] = useState({}); // leaveId -> status (optimistic)

  const {data:rawLeaves,isLoading,refetch} = useGetAllManagerLeaves();
  const acceptMut  = useAcceptLeaveRequest();
  const rejectMut  = useRejectLeaveRequest();
  const forwardMut = useForwardLeaveToReportingManager();

  const rawList = extractArray(rawLeaves);
  // apply optimistic overrides so UI updates instantly after an action
  const leaves = rawList.map(l =>
    localOverrides[l._id] ? { ...l, status: localOverrides[l._id] } : l
  );

  const filtered = filter==="all" ? leaves : leaves.filter(l=>l.status===filter);
  const count    = (key) => key==="all" ? leaves.length : leaves.filter(l=>l.status===key).length;

  const handleAction = async (leaveId,action) => {
    setProcessingId(leaveId);
    try {
      if (action==="accept")  {
        await acceptMut.mutateAsync({leaveId});
        setLocalOverrides(p=>({...p,[leaveId]:"approved_manager"}));
        showToast("Leave approved","success");
      }
      if (action==="reject")  {
        await rejectMut.mutateAsync({leaveId});
        setLocalOverrides(p=>({...p,[leaveId]:"rejected_manager"}));
        showToast("Leave rejected","error");
      }
      if (action==="forward") {
        await forwardMut.mutateAsync({leaveId});
        setLocalOverrides(p=>({...p,[leaveId]:"forwarded_reporting_manager"}));
        showToast("Forwarded to reporting manager","info");
      }
      refetch();
    } catch(err) {
      showToast(err?.response?.data?.message||err?.message||"Action failed","error");
    } finally { setProcessingId(null); }
  };

  if (isLoading) return <Spinner/>;

  return (
    <div>
      <div className="mlw-summary-counters">
        {[
          {label:"Total",    val:leaves.length,                                              color:"#6B1A4A",bg:"linear-gradient(135deg,#F9EFF5,#F4E6F0)"},
          {label:"Pending",  val:leaves.filter(l=>l.status==="pending_manager").length,      color:"#92400E",bg:"linear-gradient(135deg,#FFFBEB,#FEF3C7)"},
          {label:"Approved", val:leaves.filter(l=>l.status?.startsWith("approved")).length,  color:"#14803D",bg:"linear-gradient(135deg,#F0FDF4,#DCFCE7)"},
          {label:"Forwarded",val:leaves.filter(l=>l.status==="forwarded_reporting_manager"||l.status==="forwarded_admin").length,color:"#1D4ED8",bg:"linear-gradient(135deg,#EFF6FF,#DBEAFE)"},
        ].map((s,i)=>(
          <div key={s.label} style={{background:s.bg,borderRadius:13,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,border:"1px solid rgba(0,0,0,0.05)",boxShadow:"0 2px 7px rgba(0,0,0,0.04)",animation:`fadeSlideUp .3s ease ${i*.06}s both`,minWidth:90}}>
            <span style={{fontSize:24,fontWeight:800,color:s.color,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{s.val}</span>
            <span style={{fontSize:11,color:s.color,fontWeight:600,fontFamily:"'DM Sans',sans-serif",opacity:.8,lineHeight:1.3}}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:7,marginBottom:20,flexWrap:"wrap"}}>
        {EMP_LEAVE_FILTERS.map(f=>{
          const active = filter===f.key;
          return (
            <button key={f.key} className="mlw-chip-btn"
              style={{border:active?"1.5px solid #8B3A8A":"1.5px solid #E5DAF0",background:active?"linear-gradient(135deg,#6B1A4A,#9B2458)":"#fff",color:active?"#fff":"#8B7FA0",boxShadow:active?"0 2px 9px rgba(107,26,74,0.28)":"none"}}
              onClick={()=>setFilter(f.key)}>
              {f.label}
              <span style={{background:active?"rgba(255,255,255,0.22)":"#EDE6F5",color:active?"#fff":"#9B8BAE",borderRadius:9,padding:"1px 7px",fontSize:10,fontWeight:700}}>
                {count(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length===0
        ? <EmptyState msg="No leave requests found"/>
        : filtered.map((leave,idx)=>{
            const emp          = leave.employee||{};
            const isActionable = !NON_ACTIONABLE.includes(leave.status);
            const isProcessing = processingId===leave._id;
            const days         = leave.days||daysDiff(leave.startDate,leave.endDate);
            const accent       = (LEAVE_META[leave.leaveType]||{accent:"#8B3A8A"}).accent;
            return (
              <div key={leave._id||idx} className="mlw-card" style={{opacity:isProcessing?.6:1,pointerEvents:isProcessing?"none":"auto",animationDelay:`${idx*.05}s`}}>
                <div style={{position:"absolute",top:0,left:0,width:3,bottom:0,background:accent,borderRadius:"18px 0 0 18px"}}/>
                <div className="mlw-card-body">
                  <div style={{flex:1,minWidth:0}}>
                    <AvatarBox name={`${emp.f_name||""} ${emp.l_name||""}`} subtext={emp.role||emp.work_email}/>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:11}}>
                      <TypeBadge type={leave.leaveType}/>
                      <StatusBadge status={leave.status} meta={LEAVE_STATUS_META}/>
                      <DaysBadge days={days}/>
                    </div>
                    <div style={{marginTop:10}}><DateRange startDate={leave.startDate} endDate={leave.endDate}/></div>
                    <ReasonBox reason={leave.reason}/>
                  </div>
                  {isActionable&&(
                    <div className="mlw-card-actions" style={{display:"flex",flexDirection:"column",gap:7,flexShrink:0}}>
                      <button className="mlw-action-btn" style={{background:"#F0FDF4",color:"#14803D",boxShadow:"0 2px 7px rgba(34,197,94,0.14)"}} onClick={()=>handleAction(leave._id,"accept")}><IconCheck/>Approve</button>
                      <button className="mlw-action-btn" style={{background:"#FFF1F2",color:"#991B1B",boxShadow:"0 2px 7px rgba(239,68,68,0.11)"}} onClick={()=>handleAction(leave._id,"reject")}><IconX/>Reject</button>
                      <button className="mlw-action-btn" style={{background:"#EFF6FF",color:"#1D4ED8",boxShadow:"0 2px 7px rgba(59,130,246,0.11)"}} onClick={()=>handleAction(leave._id,"forward")}><IconForward/>Forward</button>
                    </div>
                  )}
                </div>
                {isProcessing&&<div className="mlw-overlay"><div className="mlw-spinner-sm"/></div>}
              </div>
            );
          })
      }
    </div>
  );
};

const ForwardedLeavesPanel = ({showToast}) => {
  const [activeTab,setActiveTab]       = useState("employee");
  const [processingId,setProcessingId] = useState(null);

  const {data:rawData,isLoading,refetch} = useGetForwardedLeavesManager();
  const acceptFwdMut    = useAcceptForwardedLeave();
  const rejectFwdMut    = useRejectForwardedLeave();
  const forwardChainMut = useForwardLeaveUpChain();

  const employeeLeaves = rawData?.employeeLeaves?.leaves || [];
  const managerLeaves  = rawData?.managerLeaves?.leaves  || [];

  const handleAction = async (leaveId,leaveFor,action) => {
    setProcessingId(leaveId);
    try {
      if (action==="accept")       { await acceptFwdMut.mutateAsync({leaveId,leaveFor});  showToast("Leave approved","success"); }
      if (action==="reject")       { await rejectFwdMut.mutateAsync({leaveId,leaveFor});  showToast("Leave rejected","error"); }
      if (action==="forwardChain") { await forwardChainMut.mutateAsync({leaveId});         showToast("Leave forwarded up the chain","info"); }
      refetch();
    } catch(err) {
      showToast(err?.response?.data?.message||err?.message||"Action failed","error");
    } finally { setProcessingId(null); }
  };

  const renderCard = (leave,idx,leaveFor) => {
    const person       = leaveFor==="employee" ? (leave.employee||{}) : (leave.manager||{});
    const isProcessing = processingId===leave._id;
    const days         = leave.days||daysDiff(leave.startDate,leave.endDate);
    const isMgrLeave   = leaveFor==="manager";
    const accent       = (LEAVE_META[leave.leaveType]||{accent:"#8B3A8A"}).accent;

    return (
      <div key={leave._id||idx} className="mlw-card" style={{opacity:isProcessing?.6:1,pointerEvents:isProcessing?"none":"auto",animationDelay:`${idx*.05}s`}}>
        <div style={{position:"absolute",top:0,left:0,width:3,bottom:0,background:accent,borderRadius:"18px 0 0 18px"}}/>
        <div className="mlw-card-body">
          <div style={{flex:1,minWidth:0}}>
            <AvatarBox
              name={`${person.f_name||""} ${person.l_name||""}`}
              subtext={[person.designation||person.work_email,isMgrLeave&&person.department?person.department:null].filter(Boolean).join(" · ")}
            />
            {isMgrLeave&&(
              <div style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:9,padding:"3px 9px",background:"linear-gradient(135deg,#F5F3FF,#EDE9FE)",borderRadius:7,border:"1px solid #DDD6FE"}}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="3.5" r="2" stroke="#6B21A8" strokeWidth="1.2"/>
                  <path d="M1 9c0-2 1.8-3 4-3s4 1 4 3" stroke="#6B21A8" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span style={{fontSize:10,fontWeight:600,color:"#6B21A8",fontFamily:"'DM Sans',sans-serif"}}>Manager Leave Request</span>
              </div>
            )}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
              <TypeBadge type={leave.leaveType}/>
              <StatusBadge status={leave.status} meta={LEAVE_STATUS_META}/>
              <DaysBadge days={days}/>
            </div>
            <div style={{marginTop:10}}><DateRange startDate={leave.startDate} endDate={leave.endDate}/></div>
            <ReasonBox reason={leave.reason}/>
          </div>

          <div className="mlw-card-actions" style={{display:"flex",flexDirection:"column",gap:7,flexShrink:0}}>
            <button className="mlw-action-btn" style={{background:"#F0FDF4",color:"#14803D",boxShadow:"0 2px 7px rgba(34,197,94,0.14)"}} onClick={()=>handleAction(leave._id,leaveFor,"accept")}><IconCheck/>Approve</button>
            <button className="mlw-action-btn" style={{background:"#FFF1F2",color:"#991B1B",boxShadow:"0 2px 7px rgba(239,68,68,0.11)"}} onClick={()=>handleAction(leave._id,leaveFor,"reject")}><IconX/>Reject</button>
            {isMgrLeave&&(
              <button className="mlw-action-btn" style={{background:"#F5F3FF",color:"#6B21A8",boxShadow:"0 2px 7px rgba(107,33,168,0.11)"}} onClick={()=>handleAction(leave._id,leaveFor,"forwardChain")}><IconForwardChain/>Forward Up</button>
            )}
          </div>
        </div>
        {isProcessing&&<div className="mlw-overlay"><div className="mlw-spinner-sm"/></div>}
      </div>
    );
  };

  if (isLoading) return <Spinner/>;

  const innerTabs = [
    {key:"employee", label:`Employee (${employeeLeaves.length})`},
    {key:"manager",  label:`Manager (${managerLeaves.length})`},
  ];

  return (
    <div>
      <div className="mlw-info-banner">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{flexShrink:0,marginTop:1}}>
          <circle cx="8" cy="8" r="6.5" stroke="#3B82F6" strokeWidth="1.2"/>
          <path d="M8 7v5M8 5.5v.5" stroke="#3B82F6" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <div style={{fontSize:12,color:"#1D4ED8",fontFamily:"'DM Sans',sans-serif",lineHeight:1.6}}>
          <strong>Manager leaves</strong> forwarded to you can be approved, rejected, or escalated further. Employee leaves can only be approved or rejected.
        </div>
      </div>

      <div className="mlw-inner-tabs">
        {innerTabs.map(t=>{
          const active = activeTab===t.key;
          return (
            <button key={t.key} className="mlw-chip-btn"
              style={{border:active?"1.5px solid #3B82F6":"1.5px solid #E5DAF0",background:active?"linear-gradient(135deg,#1D4ED8,#3B82F6)":"#fff",color:active?"#fff":"#8B7FA0",boxShadow:active?"0 2px 9px rgba(59,130,246,0.28)":"none"}}
              onClick={()=>setActiveTab(t.key)}>
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab==="employee" && (employeeLeaves.length===0 ? <EmptyState msg="No forwarded employee leaves"/> : employeeLeaves.map((l,i)=>renderCard(l,i,"employee")))}
      {activeTab==="manager"  && (managerLeaves.length===0  ? <EmptyState msg="No forwarded manager leaves"/>  : managerLeaves.map((l,i)=>renderCard(l,i,"manager")))}
    </div>
  );
};

const MyBalancePanel = ({manager,leavebalance}) => {
  const balance = Array.isArray(leavebalance) ? leavebalance[0] : leavebalance||{};

  const isMarried = manager?.marital_status==="married";
  const showML    = manager?.gender==="female" && isMarried;
  const showPL    = manager?.gender==="male"   && isMarried;

  const elEntitled = balance.EL?.entitled || 0;
  const elAvailed  = balance.EL?.availed  || 0;
  const elAccrued  = balance.EL?.accrued  || 0;
  const slEntitled = balance.SL?.entitled || 0;
  const slAvailed  = balance.SL?.availed  || 0;
  const slAccrued  = balance.SL?.accrued  || 0;

  const cards = [
    {key:"el",  label:"Earned Leave",      entitled:elEntitled, availed:elAvailed, accrued:elAccrued, remaining:Math.max(0, elAccrued - elAvailed), accent:"#22C55E", bg:"linear-gradient(135deg,#F0FDF4,#DCFCE7)"},
    {key:"sl",  label:"Sick Leave",        entitled:slEntitled, availed:slAvailed, accrued:slAccrued, remaining:Math.max(0, slAccrued - slAvailed), accent:"#3B82F6", bg:"linear-gradient(135deg,#EFF6FF,#DBEAFE)"},
    {key:"pbc", label:"Paid by Company",   entitled:balance.pbc||0, availed:0, accrued:0, remaining:balance.pbc||0,             accent:"#6B1A4A", bg:"linear-gradient(135deg,#F9EFF5,#F4E6F0)"},
    {key:"lwp", label:"Leave Without Pay", entitled:balance.lwp||0, availed:0, accrued:0, remaining:balance.lwp||0,             accent:"#CD166E", bg:"linear-gradient(135deg,#FDF2F8,#FCE7F3)"},
    ...(showML?[{key:"ml",label:"Maternity Leave",entitled:balance.ML||0,availed:0,accrued:0,remaining:balance.ML||0,accent:"#A855F7",bg:"linear-gradient(135deg,#FAF5FF,#F3E8FF)"}]:[]),
    ...(showPL?[{key:"pl",label:"Paternity Leave",entitled:balance.PL||0,availed:0,accrued:0,remaining:balance.PL||0,accent:"#F59E0B",bg:"linear-gradient(135deg,#FFFBEB,#FEF3C7)"}]:[]),
  ];

  return (
    <div>
      <div className="mlw-stat-grid">
        {cards.map((s,i)=>{
          const remaining = s.remaining;
          const pct       = s.entitled>0 ? Math.min((s.availed/s.entitled)*100,100) : 0;
          return (
            <div key={s.key} className="mlw-stat-card" style={{animationDelay:`${i*.07}s`}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:s.accent,borderRadius:"18px 18px 0 0"}}/>
              <div style={{position:"absolute",right:-6,top:10,fontSize:46,fontWeight:800,color:s.accent,opacity:.06,fontFamily:"'Playfair Display',serif",lineHeight:1,userSelect:"none",pointerEvents:"none"}}>
                {(LEAVE_META[s.key]||{short:s.key.toUpperCase().slice(0,2)}).short}
              </div>
              <div style={{fontSize:11,color:"#9B8BAE",fontWeight:600,fontFamily:"'DM Sans',sans-serif",marginTop:7,textTransform:"uppercase",letterSpacing:".5px"}}>{s.label}</div>
              <div style={{fontSize:36,fontWeight:700,color:s.accent,lineHeight:1,margin:"5px 0 2px",fontFamily:"'Playfair Display',serif"}}>{remaining}</div>
              <div style={{fontSize:10,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>of {s.entitled} days</div>
              <div style={{height:4,background:"#F0EAF8",borderRadius:7,marginTop:13,overflow:"hidden"}}>
                <div className="mlw-progress-fill" style={{width:`${Math.max(pct,3)}%`,background:s.accent,animationDelay:`${i*.09+.3}s`}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>
                {s.accrued>0&&<span>Accrued: {s.accrued}</span>}
                <span style={{marginLeft:"auto"}}>{s.availed} used</span>
              </div>
            </div>
          );
        })}
      </div>

      <SectionBox title="Leave Balance Summary">
        <div className="mlw-table-wrap">
          <table className="mlw-table">
            <thead>
              <tr>{["Leave Type","Entitled","Accrued","Used","Remaining","Usage"].map(h=><th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {cards.map(s=>{
                const rem = s.remaining;
                const pct = s.entitled>0 ? Math.round((rem/s.entitled)*100) : 0;
                const m   = LEAVE_META[s.key]||{label:s.label,bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF"};
                return (
                  <tr key={s.key}>
                    <td>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:18,fontSize:11,fontWeight:600,background:m.bg,color:m.color,fontFamily:"'DM Sans',sans-serif"}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:m.dot,flexShrink:0}}/>{s.label}
                      </span>
                    </td>
                    <td style={{fontWeight:600}}>{s.entitled}</td>
                    <td>{s.accrued||"—"}</td>
                    <td>{s.availed}</td>
                    <td style={{fontWeight:700,color:s.accent,fontFamily:"'Playfair Display',serif",fontSize:15}}>{rem}</td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:52,height:4,background:"#F0EAF8",borderRadius:7,overflow:"hidden"}}>
                          <div className="mlw-progress-fill" style={{width:`${pct}%`,background:s.accent}}/>
                        </div>
                        <span style={{fontSize:11,color:"#9B8BAE"}}>{pct}%</span>
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

const ApplyLeavePanel = ({manager,showToast}) => {
  const [form,setForm]     = useState({leaveType:"el",startDate:"",endDate:"",reason:""});
  const [errors,setErrors] = useState({});

  const {data:rawHistory,isLoading:histLoading,refetch} = useGetLeaveHistory();
  const applyMut = useApplyLeaveManager();

  const isMarried = manager?.marital_status==="married";
  const showML    = manager?.gender==="female" && isMarried;
  const showPL    = manager?.gender==="male"   && isMarried;

  const rawArr  = extractArray(rawHistory);
  const history = rawArr.map(normalizeLeave).filter(Boolean);

  const availTypes = [
    {value:"el",          label:"Earned Leave"},
    {value:"sl",          label:"Sick Leave"},
    {value:"half_day_el", label:"Half Day EL"},
    {value:"half_day_sl", label:"Half Day SL"},
    {value:"lwp",         label:"Leave Without Pay"},
    ...(showML?[{value:"ml",label:"Maternity Leave"}]:[]),
    ...(showPL?[{value:"pl",label:"Paternity Leave"}]:[]),
  ];

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const validate = () => {
    const e={};
    if (!form.leaveType) e.leaveType="Select a leave type";
    if (!form.startDate) e.startDate="Required";
    if (!form.endDate)   e.endDate="Required";
    if ((form.reason||"").trim().length<10) e.reason="Minimum 10 characters";
    if (form.startDate&&form.endDate&&new Date(form.endDate)<new Date(form.startDate)) e.endDate="End date cannot precede start date";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await applyMut.mutateAsync(form);
      showToast("Leave request submitted to your reporting manager","success");
      setForm({leaveType:"el",startDate:"",endDate:"",reason:""});
      setErrors({});
      refetch();
    } catch(err) {
      showToast(err?.response?.data?.message||err?.message||"Something went wrong","error");
    }
  };

  const days = daysDiff(form.startDate,form.endDate);
  const ib   = (k) => errors[k]?"#FCA5A5":"#E2D8EE";

  return (
    <div>
      <SectionBox title="New Leave Request">
        <div className="mlw-form-grid">
          <FormField label="Leave Type" error={errors.leaveType}>
            <select value={form.leaveType} onChange={e=>set("leaveType",e.target.value)} className="mlw-input" style={{border:`1.5px solid ${ib("leaveType")}`}}>
              {availTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)} min={todayStr()} className="mlw-input" style={{border:`1.5px solid ${ib("startDate")}`}}/>
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={e=>set("endDate",e.target.value)} min={form.startDate||todayStr()} className="mlw-input" style={{border:`1.5px solid ${ib("endDate")}`}}/>
          </FormField>
        </div>

        {days>0&&(
          <div style={{background:"linear-gradient(135deg,#F9EFF5,#F2E8F5)",border:"1px solid #DFD0EC",borderRadius:11,padding:"11px 16px",fontSize:13,color:"#6B1A4A",fontWeight:600,marginBottom:16,display:"flex",alignItems:"center",gap:8,fontFamily:"'DM Sans',sans-serif"}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="3" stroke="#9B2458" strokeWidth="1.3"/><path d="M1 6h12" stroke="#9B2458" strokeWidth="1.3"/><path d="M4 1v2M10 1v2" stroke="#9B2458" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <strong style={{fontFamily:"'Playfair Display',serif",fontSize:15}}>{days}</strong> day{days>1?"s":""} · {(LEAVE_META[form.leaveType]||{}).label||""}
          </div>
        )}

        <FormField label="Reason" error={errors.reason}>
          <textarea value={form.reason} onChange={e=>set("reason",e.target.value)} placeholder="Briefly explain the reason for your leave…" className="mlw-input" style={{border:`1.5px solid ${ib("reason")}`,minHeight:84,resize:"vertical",lineHeight:1.6}}/>
        </FormField>
        <p style={{fontSize:11,color:"#9B8BAE",margin:"4px 0 0",fontFamily:"'DM Sans',sans-serif"}}>{(form.reason||"").length}/500 chars (min 10)</p>

        <div className="mlw-form-actions">
          <button className="mlw-btn-secondary" onClick={()=>{setForm({leaveType:"el",startDate:"",endDate:"",reason:""});setErrors({});}}>Clear</button>
          <button className="mlw-btn-primary" onClick={handleSubmit} disabled={applyMut.isPending}>
            {applyMut.isPending?"Submitting…":"Submit Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox title="My Leave History" rightEl={
        history.length>0
          ? <span style={{background:"linear-gradient(135deg,#F9EFF5,#F4E6F0)",color:"#6B1A4A",fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:18,fontFamily:"'DM Sans',sans-serif"}}>{history.length} record{history.length!==1?"s":""}</span>
          : null
      }>
        {histLoading ? <Spinner/> : history.length===0 ? <EmptyState msg="No leave records yet"/> : (
          <div>
            {history.map((leave,idx)=>{
              const d      = leave.days||daysDiff(leave.startDate,leave.endDate);
              const accent = (LEAVE_META[leave.leaveType]||{accent:"#8B3A8A"}).accent;
              return (
                <div key={leave._id||idx} className="mlw-history-card" style={{animationDelay:`${idx*.04}s`}}>
                  <div style={{position:"absolute",top:0,left:0,width:3,bottom:0,background:accent,borderRadius:"15px 0 0 15px"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,paddingLeft:8,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:9}}>
                        {leave.leaveType&&<TypeBadge type={leave.leaveType}/>}
                        {leave.status&&<StatusBadge status={leave.status} meta={LEAVE_STATUS_META}/>}
                        <DaysBadge days={d}/>
                      </div>
                      <DateRange startDate={leave.startDate} endDate={leave.endDate}/>
                      <ReasonBox reason={leave.reason}/>
                    </div>
                    {leave.createdAt&&(
                      <div style={{fontSize:10,color:"#9B8BAE",textAlign:"right",lineHeight:1.4,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>
                        Applied<br/><span style={{fontWeight:600,color:"#7B6890"}}>{fmt(leave.createdAt)}</span>
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

const WFH_BLANK = {startDate:"",endDate:"",reason:""};

const MyWFHPanel = ({showToast}) => {
  const [form,setForm]     = useState(WFH_BLANK);
  const [errors,setErrors] = useState({});

  const {data:wfhData,isLoading} = useManagerGetMyWFH();
  const applyMut = useManagerApplyWFH();

  const raw  = wfhData?.wfhList||wfhData||[];
  const list = Array.isArray(raw) ? raw : [];

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const validate = () => {
    const e={};
    if (!form.startDate) e.startDate="Required";
    if (!form.endDate)   e.endDate="Required";
    if (!form.reason||form.reason.trim().length<5) e.reason="Minimum 5 characters";
    if (form.startDate&&form.endDate&&new Date(form.endDate)<new Date(form.startDate)) e.endDate="End date cannot precede start date";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await applyMut.mutateAsync(form);
      showToast("WFH request submitted","success");
      setForm(WFH_BLANK);
      setErrors({});
    } catch(err) {
      showToast(err?.response?.data?.message||err?.message||"Something went wrong","error");
    }
  };

  const days = daysDiff(form.startDate,form.endDate);
  const ib   = (k) => errors[k]?"#FCA5A5":"#E2D8EE";

  return (
    <div>
      <SectionBox title="Apply Work From Home">
        <div className="mlw-form-grid">
          <FormField label="Start Date" error={errors.startDate}>
            <input type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)} min={todayStr()} className="mlw-input" style={{border:`1.5px solid ${ib("startDate")}`}}/>
          </FormField>
          <FormField label="End Date" error={errors.endDate}>
            <input type="date" value={form.endDate} onChange={e=>set("endDate",e.target.value)} min={form.startDate||todayStr()} className="mlw-input" style={{border:`1.5px solid ${ib("endDate")}`}}/>
          </FormField>
        </div>

        {days>0&&(
          <div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",border:"1px solid #BFDBFE",borderRadius:11,padding:"11px 16px",fontSize:13,color:"#1D4ED8",fontWeight:600,marginBottom:16,display:"flex",alignItems:"center",gap:8,fontFamily:"'DM Sans',sans-serif"}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="3" stroke="#3B82F6" strokeWidth="1.3"/><path d="M4 7h2v4M8 4v7" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <strong style={{fontFamily:"'Playfair Display',serif",fontSize:15}}>{days}</strong> day{days>1?"s":""} · Work From Home
          </div>
        )}

        <FormField label="Reason" error={errors.reason}>
          <textarea value={form.reason} onChange={e=>set("reason",e.target.value)} placeholder="Briefly explain why you need to work from home…" className="mlw-input" style={{border:`1.5px solid ${ib("reason")}`,minHeight:84,resize:"vertical",lineHeight:1.6}}/>
        </FormField>

        <div className="mlw-form-actions">
          <button className="mlw-btn-secondary" onClick={()=>{setForm(WFH_BLANK);setErrors({});}}>Clear</button>
          <button className="mlw-btn-primary" onClick={handleSubmit} disabled={applyMut.isPending}>
            {applyMut.isPending?"Submitting…":"Submit WFH Request →"}
          </button>
        </div>
      </SectionBox>

      <SectionBox title="My WFH History" rightEl={
        list.length>0
          ? <span style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",color:"#1D4ED8",fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:18,fontFamily:"'DM Sans',sans-serif"}}>{list.length} record{list.length!==1?"s":""}</span>
          : null
      }>
        {isLoading ? <Spinner/> : list.length===0 ? <EmptyState msg="No WFH records yet"/> : (
          <div>
            {list.map((wfh,idx)=>{
              const d = wfh.days||daysDiff(wfh.startDate,wfh.endDate);
              return (
                <div key={wfh._id||idx} className="mlw-history-card" style={{animationDelay:`${idx*.04}s`}}>
                  <div style={{position:"absolute",top:0,left:0,width:3,bottom:0,background:"#3B82F6",borderRadius:"15px 0 0 15px"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,paddingLeft:8,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:9}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:18,fontSize:11,fontWeight:600,background:"#DBEAFE",color:"#1D4ED8",fontFamily:"'DM Sans',sans-serif"}}>
                          <span style={{width:5,height:5,borderRadius:"50%",background:"#3B82F6",flexShrink:0}}/>WFH
                        </span>
                        <StatusBadge status={wfh.status} meta={WFH_STATUS_META}/>
                        <DaysBadge days={d} color="#0369A1" bg="#F0F9FF"/>
                      </div>
                      <DateRange startDate={wfh.startDate} endDate={wfh.endDate}/>
                      <ReasonBox reason={wfh.reason} accent="#F0F9FF" accentBorder="#93C5FD" accentLabel="#1D4ED8"/>
                    </div>
                    {wfh.createdAt&&(
                      <div style={{fontSize:10,color:"#9B8BAE",textAlign:"right",lineHeight:1.4,fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>
                        Applied<br/><span style={{fontWeight:600,color:"#7B6890"}}>{fmt(wfh.createdAt)}</span>
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

const TeamWFHPanel = ({showToast}) => {
  const [activeTab,setActiveTab]       = useState("pending");
  const [processingId,setProcessingId] = useState(null);

  const {data:pendingData,isLoading:pendingLoading,refetch:refetchPending} = useManagerGetPendingWFH();
  const {data:teamData,   isLoading:teamLoading,   refetch:refetchTeam}    = useManagerGetAllTeamWFH();
  const {data:fwdData,    isLoading:fwdLoading,    refetch:refetchFwd}     = useManagerGetForwardedWFH();

  const approveMut    = useManagerApproveWFH();
  const rejectMut     = useManagerRejectWFH();
  const forwardMut    = useManagerForwardWFH();
  const approveFwdMut = useManagerApproveForwardedWFH();
  const rejectFwdMut  = useManagerRejectForwardedWFH();

  const pendingList   = Array.isArray(pendingData?.wfhList||pendingData) ? pendingData?.wfhList||pendingData : [];
  const teamList      = Array.isArray(teamData?.wfhList||teamData)       ? teamData?.wfhList||teamData       : [];
  const forwardedList = Array.isArray(fwdData?.wfhList||fwdData)         ? fwdData?.wfhList||fwdData         : [];

  const handleTeamAction = async (wfhId,action) => {
    setProcessingId(wfhId);
    try {
      if (action==="approve") { await approveMut.mutateAsync({wfhId}); showToast("WFH approved","success"); refetchPending(); refetchTeam(); }
      if (action==="reject")  { await rejectMut.mutateAsync({wfhId});  showToast("WFH rejected","error");   refetchPending(); refetchTeam(); }
      if (action==="forward") { await forwardMut.mutateAsync({wfhId}); showToast("WFH forwarded","info");   refetchPending(); refetchFwd(); }
    } catch(err) {
      showToast(err?.response?.data?.message||err?.message||"Action failed","error");
    } finally { setProcessingId(null); }
  };

  const handleFwdAction = async (wfhId,action) => {
    setProcessingId(wfhId);
    try {
      if (action==="approve") { await approveFwdMut.mutateAsync({wfhId}); showToast("WFH approved","success"); refetchFwd(); }
      if (action==="reject")  { await rejectFwdMut.mutateAsync({wfhId});  showToast("WFH rejected","error");   refetchFwd(); }
    } catch(err) {
      showToast(err?.response?.data?.message||err?.message||"Action failed","error");
    } finally { setProcessingId(null); }
  };

  const renderWFHCard = (wfh,idx,actions) => {
    const requester    = wfh.requester||{};
    const d            = wfh.days||daysDiff(wfh.startDate,wfh.endDate);
    const isProcessing = processingId===wfh._id;
    const fullName     = `${requester.f_name||""} ${requester.l_name||""}`.trim();

    return (
      <div key={wfh._id||idx} className="mlw-card" style={{opacity:isProcessing?.6:1,pointerEvents:isProcessing?"none":"auto",animationDelay:`${idx*.05}s`}}>
        <div style={{position:"absolute",top:0,left:0,width:3,bottom:0,background:"#3B82F6",borderRadius:"18px 0 0 18px"}}/>
        <div className="mlw-card-body">
          <div style={{flex:1,minWidth:0}}>
            <AvatarBox name={fullName||"—"} subtext={requester.designation||requester.work_email}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:11}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:18,fontSize:11,fontWeight:600,background:"#DBEAFE",color:"#1D4ED8",fontFamily:"'DM Sans',sans-serif"}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:"#3B82F6",flexShrink:0}}/>WFH
              </span>
              <StatusBadge status={wfh.status} meta={WFH_STATUS_META}/>
              <DaysBadge days={d} color="#0369A1" bg="#F0F9FF"/>
            </div>
            <div style={{marginTop:10}}><DateRange startDate={wfh.startDate} endDate={wfh.endDate}/></div>
            <ReasonBox reason={wfh.reason} accent="#F0F9FF" accentBorder="#93C5FD" accentLabel="#1D4ED8"/>
          </div>
          {actions&&(
            <div className="mlw-card-actions" style={{display:"flex",flexDirection:"column",gap:7,flexShrink:0}}>
              {actions.map(a=>(
                <button key={a.label} className="mlw-action-btn" style={{background:a.bg,color:a.color,boxShadow:a.shadow}} onClick={()=>a.handler(wfh._id,a.action)}>
                  {a.icon}{a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {isProcessing&&<div className="mlw-overlay"><div className="mlw-spinner-sm"/></div>}
      </div>
    );
  };

  const pendingActions = [
    {label:"Approve",action:"approve",bg:"#F0FDF4",color:"#14803D",shadow:"0 2px 7px rgba(34,197,94,0.14)",  handler:handleTeamAction,icon:<IconCheck/>},
    {label:"Reject", action:"reject", bg:"#FFF1F2",color:"#991B1B",shadow:"0 2px 7px rgba(239,68,68,0.11)",  handler:handleTeamAction,icon:<IconX/>},
    {label:"Forward",action:"forward",bg:"#EFF6FF",color:"#1D4ED8",shadow:"0 2px 7px rgba(59,130,246,0.11)", handler:handleTeamAction,icon:<IconForward/>},
  ];

  const fwdActions = [
    {label:"Approve",action:"approve",bg:"#F0FDF4",color:"#14803D",shadow:"0 2px 7px rgba(34,197,94,0.14)",handler:handleFwdAction,icon:<IconCheck/>},
    {label:"Reject", action:"reject", bg:"#FFF1F2",color:"#991B1B",shadow:"0 2px 7px rgba(239,68,68,0.11)",handler:handleFwdAction,icon:<IconX/>},
  ];

  const innerTabs = [
    {key:"pending",   label:`Pending (${pendingList.length})`},
    {key:"all",       label:`All Team (${teamList.length})`},
    {key:"forwarded", label:`Forwarded (${forwardedList.length})`},
  ];

  return (
    <div>
      <div className="mlw-inner-tabs">
        {innerTabs.map(t=>{
          const active = activeTab===t.key;
          return (
            <button key={t.key} className="mlw-chip-btn"
              style={{border:active?"1.5px solid #3B82F6":"1.5px solid #E5DAF0",background:active?"linear-gradient(135deg,#1D4ED8,#3B82F6)":"#fff",color:active?"#fff":"#8B7FA0",boxShadow:active?"0 2px 9px rgba(59,130,246,0.28)":"none"}}
              onClick={()=>setActiveTab(t.key)}>
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab==="pending"   && (pendingLoading  ? <Spinner/> : pendingList.length===0   ? <EmptyState msg="No pending WFH requests"/>  : pendingList.map((w,i)=>renderWFHCard(w,i,pendingActions)))}
      {activeTab==="all"       && (teamLoading     ? <Spinner/> : teamList.length===0      ? <EmptyState msg="No team WFH records"/>       : teamList.map((w,i)=>renderWFHCard(w,i,null)))}
      {activeTab==="forwarded" && (fwdLoading      ? <Spinner/> : forwardedList.length===0 ? <EmptyState msg="No forwarded WFH requests"/> : forwardedList.map((w,i)=>renderWFHCard(w,i,fwdActions)))}
    </div>
  );
};

const ManagerLeaveWFH = () => {
  const [tab,setTab]     = useState("employeeLeaves");
  const [toast,setToast] = useState({visible:false,message:"",type:"success"});

  const {data:meData} = useGetMeManager();
  const manager      = meData?.manager||null;
  const leavebalance = meData?.leavebalance||[];

  const showToast = (message,type="success") => {
    setToast({visible:true,message,type});
    setTimeout(()=>setToast(p=>({...p,visible:false})),3400);
  };

  const TABS = [
    {key:"employeeLeaves",  label:"Employee Leaves"},
    {key:"forwardedLeaves", label:"Forwarded Leaves"},
    {key:"myBalance",       label:"My Balance"},
    {key:"applyLeave",      label:"Apply Leave"},
    {key:"myWFH",           label:"My WFH"},
    {key:"teamWFH",         label:"Team WFH"},
  ];

  return (
    <div className="mlw-root">
      <GlobalStyles/>

      <div style={{position:"fixed",top:-80,right:-80,width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,41,94,0.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:-60,left:-60,width:260,height:260,borderRadius:"50%",background:"radial-gradient(circle,rgba(107,26,74,0.06) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      <div className="mlw-inner">
        <div className="mlw-header">
          <div className="mlw-header-left">
            <div className="mlw-header-icon">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="4" width="16" height="15" rx="3" stroke="white" strokeWidth="1.5"/>
                <path d="M3 9h16" stroke="white" strokeWidth="1.5"/>
                <path d="M7 2v4M15 2v4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 13h4M7 16h8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="mlw-header">
              <div>
                <h1 style={{fontSize:21,fontWeight:700,color:"#1C1028",margin:0,fontFamily:"'Playfair Display',serif",letterSpacing:"-.3px"}}>Leave & WFH</h1>
                <p style={{fontSize:12,color:"#9B8BAE",margin:"2px 0 0",fontWeight:400,fontFamily:"'DM Sans',sans-serif"}}>Manage team leaves · Track balance · Request WFH</p>
              </div>
            </div>
          </div>

          {manager&&(
            <div className="mlw-manager-chip">
              <div className="mlw-manager-avatar">
                {(manager.f_name?.[0]||"")}{(manager.l_name?.[0]||"")}
              </div>
              <div>
                <div style={{fontWeight:600,fontSize:12,color:"#1C1028",fontFamily:"'DM Sans',sans-serif"}}>{manager.f_name} {manager.l_name}</div>
                <div style={{fontSize:10,color:"#9B8BAE",marginTop:1,fontFamily:"'DM Sans',sans-serif"}}>{manager.designation||manager.role}</div>
              </div>
            </div>
          )}
        </div>

        <div className="mlw-tabs-wrap">
          {TABS.map(t=>{
            const active = tab===t.key;
            return (
              <button key={t.key} className="mlw-tab-btn"
                style={{color:active?"#fff":"#9B8BAE",background:active?"linear-gradient(135deg,#6B1A4A,#9B2458)":"transparent",fontWeight:active?600:400,boxShadow:active?"0 3px 11px rgba(107,26,74,0.3)":"none"}}
                onClick={()=>setTab(t.key)}>
                {t.label}
              </button>
            );
          })}
        </div>

        {tab==="employeeLeaves"  && <EmployeeLeavesPanel showToast={showToast}/>}
        {tab==="forwardedLeaves" && <ForwardedLeavesPanel showToast={showToast}/>}
        {tab==="myBalance"       && <MyBalancePanel manager={manager} leavebalance={leavebalance}/>}
        {tab==="applyLeave"      && <ApplyLeavePanel manager={manager} showToast={showToast}/>}
        {tab==="myWFH"           && <MyWFHPanel showToast={showToast}/>}
        {tab==="teamWFH"         && <TeamWFHPanel showToast={showToast}/>}
      </div>

      <Toast toast={toast}/>
    </div>
  );
};

export default ManagerLeaveWFH;