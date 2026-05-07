import React, { useState, useEffect } from "react";
import {
  useGetAllManagerLeaves,
  useAcceptLeaveRequest,
  useRejectLeaveRequest,
  useForwardLeaveToAdmin,
  useGetMyLeavesManager,
  useApplyLeaveManager,
} from "../../auth/server-state/manager/managerleave/managerleave.hook";

/* ─────────────────────────────────────────────
   GOOGLE FONTS + GLOBAL STYLES
───────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: .5; }
    }
    @keyframes progressIn {
      from { width: 0; }
    }

    .lm-card {
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid rgba(200,185,220,0.3);
      padding: 22px 24px;
      margin-bottom: 14px;
      box-shadow: 0 2px 12px rgba(80,40,100,0.07), 0 1px 3px rgba(0,0,0,0.04);
      transition: box-shadow .25s ease, transform .25s ease;
      animation: fadeSlideUp .35s ease both;
    }
    .lm-card:hover {
      box-shadow: 0 8px 28px rgba(80,40,100,0.13), 0 2px 6px rgba(0,0,0,0.06);
      transform: translateY(-1px);
    }

    .lm-action-btn {
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
    .lm-action-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
    .lm-action-btn:active { transform: translateY(0); }

    .lm-tab-btn {
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

    .lm-chip-btn {
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

    .lm-input {
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
    .lm-input:focus {
      border-color: #8B3A8A !important;
      box-shadow: 0 0 0 3px rgba(139,58,138,0.10);
    }

    .lm-btn-primary {
      padding: 11px 26px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      background: linear-gradient(135deg,#6B1A4A,#9B2458);
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(107,26,74,0.35);
      transition: all .18s ease;
      letter-spacing: .3px;
    }
    .lm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(107,26,74,0.4); }
    .lm-btn-primary:active { transform: translateY(0); }

    .lm-btn-secondary {
      padding: 11px 26px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
      background: #F4EEF9;
      color: #6B1A4A;
      border: 1.5px solid #DFD0EC;
      cursor: pointer;
      transition: all .18s ease;
    }
    .lm-btn-secondary:hover { background: #EDE4F5; }

    .lm-stat-card {
      background: #fff;
      border-radius: 20px;
      border: 1px solid rgba(200,185,220,0.3);
      padding: 22px 22px 18px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(80,40,100,0.07);
      transition: all .25s ease;
      animation: fadeSlideUp .4s ease both;
    }
    .lm-stat-card:hover {
      box-shadow: 0 8px 28px rgba(80,40,100,0.12);
      transform: translateY(-2px);
    }

    .lm-progress-fill {
      height: 100%;
      border-radius: 8px;
      animation: progressIn .8s ease both;
    }

    .lm-toast {
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

    .lm-table th {
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
    .lm-table td {
      padding: 13px 14px;
      border-bottom: 1px solid #F5F0FA;
      color: #1C1028;
      vertical-align: middle;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
    }
    .lm-table tr:last-child td { border-bottom: none; }
    .lm-table tr:hover td { background: #FDFBFF; }

    .lm-divider {
      display: inline-block;
      width: 3px;
      height: 18px;
      background: linear-gradient(180deg,#6B1A4A,#A8295E);
      border-radius: 3px;
      margin-right: 8px;
      vertical-align: middle;
    }

    .lm-history-card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid rgba(200,185,220,0.28);
      padding: 16px 18px;
      margin-bottom: 10px;
      box-shadow: 0 2px 10px rgba(80,40,100,0.06);
      transition: box-shadow .22s ease, transform .22s ease;
      animation: fadeSlideUp .3s ease both;
      position: relative;
      overflow: hidden;
    }
    .lm-history-card:hover {
      box-shadow: 0 6px 22px rgba(80,40,100,0.11);
      transform: translateY(-1px);
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
  pending:          { label: "Pending",            bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  approved_manager: { label: "Approved",           bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_manager: { label: "Rejected",           bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  forwarded_admin:  { label: "Fwd to Admin",       bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  approved_admin:   { label: "Admin Approved",     bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  rejected_admin:   { label: "Admin Rejected",     bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  pending_admin:    { label: "Pending (Admin)",    bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
};

const NON_ACTIONABLE = [
  "approved_manager","rejected_manager","forwarded_admin","approved_admin","rejected_admin"
];

const AVATAR_COLORS = [
  "linear-gradient(135deg,#6B1A4A,#A8295E)",
  "linear-gradient(135deg,#1D4ED8,#3B82F6)",
  "linear-gradient(135deg,#065F46,#10B981)",
  "linear-gradient(135deg,#92400E,#F59E0B)",
  "linear-gradient(135deg,#6B21A8,#A855F7)",
  "linear-gradient(135deg,#1E3A5F,#60A5FA)",
];

const FILTERS = [
  { key: "all",              label: "All" },
  { key: "pending",          label: "Pending" },
  { key: "approved_manager", label: "Approved" },
  { key: "rejected_manager", label: "Rejected" },
  { key: "forwarded_admin",  label: "Forwarded" },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const initials  = (f="",l="") => `${f[0]||""}${l[0]||""}`.toUpperCase();
const avatarColor = (name="") => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
};
const daysDiff = (s,e) => {
  if (!s||!e) return 0;
  return Math.max(Math.round((new Date(e)-new Date(s))/86400000)+1,1);
};

/* ─────────────────────────────────────────────
   TINY SUB-COMPONENTS
───────────────────────────────────────────── */

const Spinner = () => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"70px 0",gap:14}}>
    <div style={{
      width:38,height:38,
      border:"3px solid #EDE6F5",
      borderTop:"3px solid #8B3A8A",
      borderRadius:"50%",
      animation:"spin .7s linear infinite"
    }}/>
    <p style={{fontSize:13,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>
      Loading…
    </p>
  </div>
);

const EmptyState = ({msg="No records found"}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"60px 0",gap:12}}>
    <div style={{
      width:64,height:64,
      borderRadius:18,
      background:"linear-gradient(135deg,#F4EEF9,#EDE4F5)",
      display:"flex",alignItems:"center",justifyContent:"center",
    }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="5" width="20" height="19" rx="4" stroke="#C4AADA" strokeWidth="1.5" fill="none"/>
        <path d="M4 11h20" stroke="#C4AADA" strokeWidth="1.5"/>
        <path d="M9 8V5M19 8V5" stroke="#C4AADA" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9 16h6M9 20h10" stroke="#D4BFEA" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    </div>
    <p style={{fontSize:13,color:"#9B8BAE",fontWeight:500,fontFamily:"'DM Sans',sans-serif"}}>{msg}</p>
  </div>
);

const Toast = ({toast}) => {
  const colors = {
    success:{bg:"rgba(240,253,244,0.95)",color:"#14803D",border:"#86EFAC",icon:"#22C55E"},
    error:  {bg:"rgba(254,242,242,0.95)",color:"#991B1B",border:"#FCA5A5",icon:"#EF4444"},
    info:   {bg:"rgba(239,246,255,0.95)",color:"#1D4ED8",border:"#93C5FD",icon:"#3B82F6"},
  };
  const c = colors[toast.type] || colors.info;
  return (
    <div className="lm-toast" style={{
      transform: toast.visible?"translateY(0) scale(1)":"translateY(24px) scale(.94)",
      opacity:   toast.visible?1:0,
      pointerEvents: toast.visible?"auto":"none",
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
    }}>
      <div style={{
        width:20,height:20,borderRadius:"50%",
        background:c.icon,
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
      }}>
        {toast.type==="success"&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type==="error"  &&<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type==="info"   &&<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 4v4M5 3v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
      </div>
      {toast.message}
    </div>
  );
};

const TypeBadge = ({type}) => {
  const m = LEAVE_META[type] || {label:(type||"").toUpperCase(),bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF"};
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:5,
      padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,
      background:m.bg,color:m.color,
      fontFamily:"'DM Sans',sans-serif",letterSpacing:".2px"
    }}>
      <span style={{width:5,height:5,borderRadius:"50%",background:m.dot,flexShrink:0}}/>
      {m.label}
    </span>
  );
};

const StatusBadge = ({status}) => {
  const m = STATUS_META[status] || {label:status,bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF"};
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:5,
      padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,
      background:m.bg,color:m.color,
      fontFamily:"'DM Sans',sans-serif",letterSpacing:".2px"
    }}>
      <span style={{width:5,height:5,borderRadius:"50%",background:m.dot,flexShrink:0}}/>
      {m.label}
    </span>
  );
};

/* ─────────────────────────────────────────────
   EMPLOYEE LEAVES PANEL
───────────────────────────────────────────── */
const EmployeeLeavesPanel = ({showToast}) => {
  const [filter, setFilter]           = useState("all");
  const [processingId, setProcessingId] = useState(null);

  const {data:leaves=[],isLoading,refetch} = useGetAllManagerLeaves();
  const acceptMutation  = useAcceptLeaveRequest();
  const rejectMutation  = useRejectLeaveRequest();
  const forwardMutation = useForwardLeaveToAdmin();

  const filtered = filter==="all" ? leaves : leaves.filter(l=>l.status===filter);
  const count    = (key) => key==="all" ? leaves.length : leaves.filter(l=>l.status===key).length;

  const handleAction = async (leaveId, action) => {
    setProcessingId(leaveId);
    try {
      if (action==="accept")   { await acceptMutation.mutateAsync({leaveId});  showToast("Leave approved","success"); }
      if (action==="reject")   { await rejectMutation.mutateAsync({leaveId});  showToast("Leave rejected","error");   }
      if (action==="forward")  { await forwardMutation.mutateAsync({leaveId}); showToast("Forwarded to admin","info"); }
      refetch();
    } catch(err) {
      showToast(err?.response?.data?.message||"Something went wrong","error");
    } finally { setProcessingId(null); }
  };

  if (isLoading) return <Spinner/>;

  return (
    <div>
      {/* Summary strip */}
      <div style={{display:"flex",gap:12,marginBottom:22,flexWrap:"wrap"}}>
        {[
          {label:"Total",    val:leaves.length,                                              color:"#6B1A4A", bg:"linear-gradient(135deg,#F9EFF5,#F4E6F0)"},
          {label:"Pending",  val:leaves.filter(l=>l.status==="pending").length,              color:"#92400E", bg:"linear-gradient(135deg,#FFFBEB,#FEF3C7)"},
          {label:"Approved", val:leaves.filter(l=>l.status.startsWith("approved")).length,   color:"#14803D", bg:"linear-gradient(135deg,#F0FDF4,#DCFCE7)"},
          {label:"Forwarded",val:leaves.filter(l=>l.status==="forwarded_admin").length,      color:"#1D4ED8", bg:"linear-gradient(135deg,#EFF6FF,#DBEAFE)"},
        ].map((s,i)=>(
          <div key={s.label} style={{
            background:s.bg,
            borderRadius:14,
            padding:"12px 20px",
            display:"flex",alignItems:"center",gap:12,
            border:"1px solid rgba(0,0,0,0.05)",
            boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
            animation:`fadeSlideUp .3s ease ${i*.07}s both`,
            minWidth:110,
          }}>
            <span style={{fontSize:26,fontWeight:800,color:s.color,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{s.val}</span>
            <span style={{fontSize:11,color:s.color,fontWeight:600,fontFamily:"'DM Sans',sans-serif",opacity:.8,lineHeight:1.3}}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={{display:"flex",gap:8,marginBottom:22,flexWrap:"wrap"}}>
        {FILTERS.map(f=>{
          const active = filter===f.key;
          return (
            <button key={f.key} className="lm-chip-btn"
              style={{
                border: active?"1.5px solid #8B3A8A":"1.5px solid #E5DAF0",
                background: active?"linear-gradient(135deg,#6B1A4A,#9B2458)":"#fff",
                color: active?"#fff":"#8B7FA0",
                boxShadow: active?"0 2px 10px rgba(107,26,74,0.3)":"none",
              }}
              onClick={()=>setFilter(f.key)}
            >
              {f.label}
              <span style={{
                background: active?"rgba(255,255,255,0.25)":"#EDE6F5",
                color: active?"#fff":"#9B8BAE",
                borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700,
              }}>
                {count(f.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length===0
        ? <EmptyState msg={`No ${filter==="all"?"":filter.replace(/_/g," ")} leave requests`}/>
        : filtered.map((leave,idx)=>{
            const emp = leave.employee||{};
            const isActionable = !NON_ACTIONABLE.includes(leave.status);
            const isProcessing  = processingId===leave._id;
            const days = leave.days||daysDiff(leave.startDate,leave.endDate);

            return (
              <div key={leave._id} className="lm-card"
                style={{
                  opacity: isProcessing?.6:1,
                  pointerEvents: isProcessing?"none":"auto",
                  animationDelay:`${idx*.06}s`,
                  position:"relative",overflow:"hidden",
                }}
              >
                {/* Accent stripe */}
                <div style={{
                  position:"absolute",top:0,left:0,width:3,bottom:0,
                  background: (LEAVE_META[leave.leaveType]||{accent:"#8B3A8A"}).accent,
                  borderRadius:"20px 0 0 20px",
                }}/>

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,paddingLeft:6}}>
                  {/* Left */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{
                        width:44,height:44,borderRadius:14,
                        background:avatarColor(emp.f_name||"A"),
                        color:"#fff",fontSize:14,fontWeight:700,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        flexShrink:0,fontFamily:"'DM Sans',sans-serif",
                        boxShadow:"0 3px 10px rgba(0,0,0,0.15)",
                      }}>
                        {initials(emp.f_name,emp.l_name)}
                      </div>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif"}}>
                          {emp.f_name} {emp.l_name}
                        </div>
                        <div style={{fontSize:11,color:"#9B8BAE",marginTop:2,fontFamily:"'DM Sans',sans-serif"}}>
                          {emp.role||emp.work_email}
                        </div>
                      </div>
                    </div>

                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:12}}>
                      <TypeBadge type={leave.leaveType}/>
                      <StatusBadge status={leave.status}/>
                      <span style={{
                        display:"inline-flex",alignItems:"center",gap:4,
                        padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,
                        background:"#F4EEF9",color:"#6B1A4A",fontFamily:"'DM Sans',sans-serif",
                      }}>
                        {days} day{days>1?"s":""}
                      </span>
                    </div>

                    <div style={{
                      display:"flex",alignItems:"center",gap:6,
                      fontSize:12,color:"#9B8BAE",marginTop:10,
                      fontFamily:"'DM Sans',sans-serif",
                    }}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1"/>
                        <path d="M1 6h11" stroke="#C4AADA" strokeWidth="1"/>
                        <path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round"/>
                      </svg>
                      {formatDate(leave.startDate)}
                      <span style={{color:"#D4BFEA",fontSize:10}}>→</span>
                      {formatDate(leave.endDate)}
                    </div>

                    {leave.reason&&(
                      <div style={{
                        background:"#FAF7FD",borderRadius:10,padding:"9px 14px",
                        fontSize:12,color:"#4A3860",marginTop:10,
                        borderLeft:"3px solid #D4AECB",lineHeight:1.6,
                        fontFamily:"'DM Sans',sans-serif",
                      }}>
                        <span style={{color:"#6B1A4A",fontWeight:600}}>Reason — </span>
                        {leave.reason}
                      </div>
                    )}
                  </div>

                  {/* Action buttons — shown for ANY non-terminal status */}
                  {isActionable&&(
                    <div style={{display:"flex",flexDirection:"column",gap:7,flexShrink:0}}>
                      <button className="lm-action-btn"
                        style={{background:"#F0FDF4",color:"#14803D",boxShadow:"0 2px 8px rgba(34,197,94,0.15)"}}
                        onClick={()=>handleAction(leave._id,"accept")}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l2.5 2.5 5.5-5" stroke="#14803D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Approve
                      </button>
                      <button className="lm-action-btn"
                        style={{background:"#FFF1F2",color:"#991B1B",boxShadow:"0 2px 8px rgba(239,68,68,0.12)"}}
                        onClick={()=>handleAction(leave._id,"reject")}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 3l6 6M9 3l-6 6" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        Reject
                      </button>
                      <button className="lm-action-btn"
                        style={{background:"#EFF6FF",color:"#1D4ED8",boxShadow:"0 2px 8px rgba(59,130,246,0.12)"}}
                        onClick={()=>handleAction(leave._id,"forward")}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6h8M7 3l3 3-3 3" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Forward
                      </button>
                    </div>
                  )}
                </div>

                {isProcessing&&(
                  <div style={{
                    position:"absolute",inset:0,borderRadius:20,
                    background:"rgba(255,255,255,0.7)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    backdropFilter:"blur(2px)",
                  }}>
                    <div style={{
                      width:22,height:22,
                      border:"2px solid #EDE6F5",borderTop:"2px solid #8B3A8A",
                      borderRadius:"50%",animation:"spin .6s linear infinite"
                    }}/>
                  </div>
                )}
              </div>
            );
          })
      }
    </div>
  );
};

/* ─────────────────────────────────────────────
   MY LEAVE BALANCE PANEL
───────────────────────────────────────────── */
const MyBalancePanel = () => {
  const {data:balances=[],isLoading} = useGetMyLeavesManager();

  if (isLoading) return <Spinner/>;
  if (!balances.length) return <EmptyState msg="No leave balance found"/>;

  const balance = balances[0];

  const leaveStats = [
    {key:"el",label:"Earned Leave",   total:balance.elTotal??18, used:balance.elUsed??0, accrued:balance.elAccrued??1.5, accent:"#22C55E",bg:"linear-gradient(135deg,#F0FDF4,#DCFCE7)"},
    {key:"sl",label:"Sick Leave",     total:balance.slTotal??12, used:balance.slUsed??0, accrued:balance.slAccrued??0,   accent:"#3B82F6",bg:"linear-gradient(135deg,#EFF6FF,#DBEAFE)"},
    {key:"pl",label:"Privilege Leave",total:balance.plTotal??0,  used:balance.plUsed??0, accrued:balance.plAccrued??0,  accent:"#F59E0B",bg:"linear-gradient(135deg,#FFFBEB,#FEF3C7)"},
    {key:"ml",label:"Maternity Leave",total:balance.mlTotal??0,  used:balance.mlUsed??0, accrued:balance.mlAccrued??0,  accent:"#A855F7",bg:"linear-gradient(135deg,#FAF5FF,#F3E8FF)"},
  ];

  return (
    <div>
      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16,marginBottom:24}}>
        {leaveStats.map((s,i)=>{
          const remaining = s.total-s.used;
          const pct = s.total>0?(s.used/s.total)*100:0;
          return (
            <div key={s.key} className="lm-stat-card" style={{animationDelay:`${i*.08}s`}}>
              {/* Top accent */}
              <div style={{
                position:"absolute",top:0,left:0,right:0,height:3,
                background:s.accent,borderRadius:"20px 20px 0 0",
              }}/>
              {/* Background watermark */}
              <div style={{
                position:"absolute",right:-8,top:10,
                fontSize:52,fontWeight:800,color:s.accent,opacity:.06,
                fontFamily:"'Playfair Display',serif",lineHeight:1,userSelect:"none",
              }}>
                {(LEAVE_META[s.key]||{short:"?"}).short}
              </div>

              <div style={{fontSize:11,color:"#9B8BAE",fontWeight:600,fontFamily:"'DM Sans',sans-serif",marginTop:8,textTransform:"uppercase",letterSpacing:".5px"}}>
                {s.label}
              </div>
              <div style={{fontSize:38,fontWeight:700,color:s.accent,lineHeight:1,margin:"6px 0 2px",fontFamily:"'Playfair Display',serif"}}>
                {remaining}
              </div>
              <div style={{fontSize:10,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>
                of {s.total} days
              </div>

              <div style={{height:5,background:"#F0EAF8",borderRadius:8,marginTop:14,overflow:"hidden"}}>
                <div className="lm-progress-fill" style={{width:`${Math.max(pct,3)}%`,background:s.accent,animationDelay:`${i*.1+.3}s`}}/>
              </div>

              <div style={{display:"flex",justifyContent:"space-between",marginTop:7,fontSize:10,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>
                <span>Accrued: {s.accrued}</span>
                <span>{s.used} used</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail table */}
      <div style={{
        background:"#fff",borderRadius:20,border:"1px solid rgba(200,185,220,0.3)",
        overflow:"hidden",boxShadow:"0 2px 12px rgba(80,40,100,0.07)",
      }}>
        <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #F0EAF8",display:"flex",alignItems:"center",gap:8}}>
          <span className="lm-divider"/>
          <span style={{fontSize:14,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif"}}>
            Leave Balance — FY 2025–26
          </span>
        </div>
        <table className="lm-table" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["Leave Type","Total","Accrued","Used","Remaining","Usage"].map(h=>(
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaveStats.map(s=>{
              const rem = s.total-s.used;
              const pct = s.total>0?Math.round((rem/s.total)*100):0;
              return (
                <tr key={s.key}>
                  <td><TypeBadge type={s.key}/></td>
                  <td style={{fontWeight:600}}>{s.total}</td>
                  <td>{s.accrued}</td>
                  <td>{s.used}</td>
                  <td style={{fontWeight:700,color:s.accent,fontFamily:"'Playfair Display',serif",fontSize:15}}>{rem}</td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:56,height:5,background:"#F0EAF8",borderRadius:8,overflow:"hidden"}}>
                        <div className="lm-progress-fill" style={{width:`${pct}%`,background:s.accent}}/>
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

      {balance.mlStartDate&&(
        <div style={{
          marginTop:14,background:"linear-gradient(135deg,#FAF5FF,#F3E8FF)",
          border:"1px solid #DDD6FE",borderRadius:16,padding:"16px 20px",
          display:"flex",alignItems:"center",gap:14,
          boxShadow:"0 2px 10px rgba(168,85,247,0.1)",
        }}>
          <div style={{width:38,height:38,borderRadius:12,background:"linear-gradient(135deg,#6B21A8,#A855F7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7.5" stroke="white" strokeWidth="1.2"/>
              <path d="M9 5.5v4l2.5 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"#6B21A8",fontFamily:"'DM Sans',sans-serif"}}>Active Maternity Leave</div>
            <div style={{fontSize:11,color:"#7C3AED",marginTop:2,fontFamily:"'DM Sans',sans-serif"}}>
              {formatDate(balance.mlStartDate)} — {formatDate(balance.mlEndDate)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   MY APPLIED LEAVE HISTORY  (new)
───────────────────────────────────────────── */
const MyAppliedLeaveHistory = () => {
  const { data: raw = [], isLoading } = useGetMyLeavesManager();

  // The API may return either:
  //   • an array of leave-request objects  (leaveType / status / startDate …)
  //   • or the balance object array used by MyBalancePanel
  // We only render records that look like leave requests.
  const leaveRequests = raw.filter(
    (item) => item.leaveType && item.status && item.startDate
  );

  return (
    <div style={{
      background:"#fff",
      borderRadius:20,
      border:"1px solid rgba(200,185,220,0.3)",
      overflow:"hidden",
      boxShadow:"0 2px 12px rgba(80,40,100,0.07)",
      marginTop:20,
    }}>
      {/* Header */}
      <div style={{
        padding:"18px 22px 14px",
        borderBottom:"1px solid #F0EAF8",
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span className="lm-divider"/>
          <span style={{fontSize:14,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif"}}>
            My Applied Leaves
          </span>
        </div>
        {leaveRequests.length > 0 && (
          <span style={{
            background:"linear-gradient(135deg,#F9EFF5,#F4E6F0)",
            color:"#6B1A4A",
            fontSize:11,fontWeight:700,
            padding:"3px 10px",borderRadius:20,
            fontFamily:"'DM Sans',sans-serif",
          }}>
            {leaveRequests.length} record{leaveRequests.length!==1?"s":""}
          </span>
        )}
      </div>

      <div style={{padding:"16px 20px"}}>
        {isLoading ? (
          <Spinner/>
        ) : leaveRequests.length === 0 ? (
          <EmptyState msg="No leave applications found"/>
        ) : (
          leaveRequests.map((leave, idx) => {
            const days = leave.days || daysDiff(leave.startDate, leave.endDate);
            const meta = LEAVE_META[leave.leaveType] || { accent:"#8B3A8A" };

            return (
              <div
                key={leave._id || idx}
                className="lm-history-card"
                style={{ animationDelay:`${idx * .055}s` }}
              >
                {/* Left accent stripe */}
                <div style={{
                  position:"absolute",top:0,left:0,width:3,bottom:0,
                  background:meta.accent,
                  borderRadius:"16px 0 0 16px",
                }}/>

                <div style={{
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"flex-start",
                  gap:14,
                  paddingLeft:8,
                }}>
                  {/* Left info */}
                  <div style={{flex:1,minWidth:0}}>
                    {/* Badges row */}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                      <TypeBadge type={leave.leaveType}/>
                      <StatusBadge status={leave.status}/>
                      <span style={{
                        display:"inline-flex",alignItems:"center",gap:4,
                        padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,
                        background:"#F4EEF9",color:"#6B1A4A",
                        fontFamily:"'DM Sans',sans-serif",
                      }}>
                        {days} day{days>1?"s":""}
                      </span>
                      {leave.durationType && (
                        <span style={{
                          display:"inline-flex",alignItems:"center",gap:4,
                          padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,
                          background:"#F0F9FF",color:"#0369A1",
                          fontFamily:"'DM Sans',sans-serif",
                        }}>
                          {leave.durationType === "half" ? "Half Day" : "Full Day"}
                        </span>
                      )}
                    </div>

                    {/* Date range */}
                    <div style={{
                      display:"flex",alignItems:"center",gap:6,
                      fontSize:12,color:"#9B8BAE",
                      fontFamily:"'DM Sans',sans-serif",
                    }}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <rect x="1" y="2" width="11" height="10" rx="2.5" stroke="#C4AADA" strokeWidth="1"/>
                        <path d="M1 6h11" stroke="#C4AADA" strokeWidth="1"/>
                        <path d="M4 1v2M9 1v2" stroke="#C4AADA" strokeWidth="1" strokeLinecap="round"/>
                      </svg>
                      <span style={{fontWeight:500,color:"#4A3860"}}>{formatDate(leave.startDate)}</span>
                      <span style={{color:"#D4BFEA",fontSize:10}}>→</span>
                      <span style={{fontWeight:500,color:"#4A3860"}}>{formatDate(leave.endDate)}</span>
                    </div>

                    {/* Reason */}
                    {leave.reason && (
                      <div style={{
                        background:"#FAF7FD",borderRadius:10,padding:"8px 13px",
                        fontSize:12,color:"#4A3860",marginTop:10,
                        borderLeft:"3px solid #D4AECB",lineHeight:1.6,
                        fontFamily:"'DM Sans',sans-serif",
                      }}>
                        <span style={{color:"#6B1A4A",fontWeight:600}}>Reason — </span>
                        {leave.reason}
                      </div>
                    )}
                  </div>

                  {/* Right — applied-on date + status icon */}
                  <div style={{
                    display:"flex",flexDirection:"column",alignItems:"flex-end",
                    gap:8,flexShrink:0,
                  }}>
                    {/* Status icon ring */}
                    {(() => {
                      const sm = STATUS_META[leave.status];
                      if (!sm) return null;
                      return (
                        <div style={{
                          width:36,height:36,borderRadius:"50%",
                          background:sm.bg,
                          border:`2px solid ${sm.dot}`,
                          display:"flex",alignItems:"center",justifyContent:"center",
                        }}>
                          {(leave.status==="approved_manager"||leave.status==="approved_admin") && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3 7l2.5 2.5 5.5-5" stroke={sm.dot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {(leave.status==="rejected_manager"||leave.status==="rejected_admin") && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M4 4l6 6M10 4l-6 6" stroke={sm.dot} strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          )}
                          {leave.status==="forwarded_admin" && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3 7h8M8 4l3 3-3 3" stroke={sm.dot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          {(leave.status==="pending"||leave.status==="pending_admin") && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="4.5" stroke={sm.dot} strokeWidth="1.5"/>
                              <path d="M7 5v2.5l1.5 1" stroke={sm.dot} strokeWidth="1.3" strokeLinecap="round"/>
                            </svg>
                          )}
                        </div>
                      );
                    })()}

                    {/* Applied on */}
                    {leave.createdAt && (
                      <div style={{
                        fontSize:10,color:"#9B8BAE",
                        fontFamily:"'DM Sans',sans-serif",
                        textAlign:"right",lineHeight:1.4,
                      }}>
                        Applied<br/>
                        <span style={{fontWeight:600,color:"#7B6890"}}>
                          {formatDate(leave.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   APPLY LEAVE PANEL
───────────────────────────────────────────── */
const ApplyLeavePanel = ({showToast}) => {
  const [form,setForm] = useState({leaveType:"el",durationType:"full",startDate:"",endDate:"",reason:""});
  const [errors,setErrors] = useState({});
  const applyMutation = useApplyLeaveManager();

  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const validate = () => {
    const e={};
    if (!form.startDate) e.startDate="Start date is required";
    if (!form.endDate)   e.endDate  ="End date is required";
    if (form.startDate&&form.endDate&&form.endDate<form.startDate)
      e.endDate="End date must be after start date";
    if (!form.reason.trim()) e.reason="Please enter a reason";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await applyMutation.mutateAsync(form);
      showToast("Leave request submitted to admin","success");
      setForm({leaveType:"el",durationType:"full",startDate:"",endDate:"",reason:""});
      setErrors({});
    } catch(err) {
      showToast(err?.response?.data?.message||"Failed to submit leave","error");
    }
  };

  const days = form.startDate&&form.endDate ? daysDiff(form.startDate,form.endDate) : 0;
  const inputBorder = (key) => errors[key]?"#FCA5A5":"#E2D8EE";

  return (
    <div>
      {/* ── Apply Form ── */}
      <div style={{
        background:"#fff",borderRadius:20,border:"1px solid rgba(200,185,220,0.3)",
        padding:"26px 28px",
        boxShadow:"0 2px 12px rgba(80,40,100,0.07)",
        animation:"fadeSlideUp .3s ease both",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:24}}>
          <span className="lm-divider"/>
          <span style={{fontSize:15,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif"}}>
            New Leave Request
          </span>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
          {/* Leave Type */}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            <label style={{fontSize:11,fontWeight:600,color:"#6B5080",textTransform:"uppercase",letterSpacing:".5px",fontFamily:"'DM Sans',sans-serif"}}>
              Leave Type
            </label>
            <select value={form.leaveType} onChange={e=>set("leaveType",e.target.value)}
              className="lm-input" style={{border:`1.5px solid ${inputBorder("leaveType")}`}}>
              {Object.entries(LEAVE_META).map(([k,v])=>(
                <option key={k} value={k}>{v.label} ({v.short})</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            <label style={{fontSize:11,fontWeight:600,color:"#6B5080",textTransform:"uppercase",letterSpacing:".5px",fontFamily:"'DM Sans',sans-serif"}}>
              Duration
            </label>
            <select value={form.durationType} onChange={e=>set("durationType",e.target.value)}
              className="lm-input" style={{border:"1.5px solid #E2D8EE"}}>
              <option value="full">Full Day</option>
              <option value="half">Half Day</option>
            </select>
          </div>

          {/* Start Date */}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            <label style={{fontSize:11,fontWeight:600,color:"#6B5080",textTransform:"uppercase",letterSpacing:".5px",fontFamily:"'DM Sans',sans-serif"}}>
              Start Date
            </label>
            <input type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)}
              className="lm-input" style={{border:`1.5px solid ${inputBorder("startDate")}`}}/>
            {errors.startDate&&<span style={{fontSize:11,color:"#EF4444",fontFamily:"'DM Sans',sans-serif"}}>{errors.startDate}</span>}
          </div>

          {/* End Date */}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            <label style={{fontSize:11,fontWeight:600,color:"#6B5080",textTransform:"uppercase",letterSpacing:".5px",fontFamily:"'DM Sans',sans-serif"}}>
              End Date
            </label>
            <input type="date" value={form.endDate} onChange={e=>set("endDate",e.target.value)}
              className="lm-input" style={{border:`1.5px solid ${inputBorder("endDate")}`}}/>
            {errors.endDate&&<span style={{fontSize:11,color:"#EF4444",fontFamily:"'DM Sans',sans-serif"}}>{errors.endDate}</span>}
          </div>
        </div>

        {/* Duration preview */}
        {days>0&&(
          <div style={{
            background:"linear-gradient(135deg,#F9EFF5,#F2E8F5)",
            border:"1px solid #DFD0EC",borderRadius:12,
            padding:"12px 18px",fontSize:13,color:"#6B1A4A",fontWeight:600,
            margin:"18px 0 0",display:"flex",alignItems:"center",gap:8,
            fontFamily:"'DM Sans',sans-serif",
          }}>
            <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6B1A4A,#9B2458)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.2"/>
                <path d="M7 4.5v3l1.5 1" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span>
              <strong style={{fontFamily:"'Playfair Display',serif",fontSize:15}}>{days}</strong> day{days>1?"s":""} ·{" "}
              {form.durationType==="half"?"Half day":"Full day"} ·{" "}
              {LEAVE_META[form.leaveType]?.label}
            </span>
          </div>
        )}

        {/* Reason */}
        <div style={{display:"flex",flexDirection:"column",gap:7,marginTop:18}}>
          <label style={{fontSize:11,fontWeight:600,color:"#6B5080",textTransform:"uppercase",letterSpacing:".5px",fontFamily:"'DM Sans',sans-serif"}}>
            Reason
          </label>
          <textarea value={form.reason} onChange={e=>set("reason",e.target.value)}
            placeholder="Briefly explain the reason for your leave…"
            className="lm-input"
            style={{
              border:`1.5px solid ${inputBorder("reason")}`,
              minHeight:96,resize:"vertical",lineHeight:1.6,
            }}
          />
          {errors.reason&&<span style={{fontSize:11,color:"#EF4444",fontFamily:"'DM Sans',sans-serif"}}>{errors.reason}</span>}
        </div>

        {/* Actions */}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:22}}>
          <button className="lm-btn-secondary"
            onClick={()=>{setForm({leaveType:"el",durationType:"full",startDate:"",endDate:"",reason:""});setErrors({});}}>
            Clear
          </button>
          <button className="lm-btn-primary"
            style={{opacity:applyMutation.isLoading?.7:1,cursor:applyMutation.isLoading?"not-allowed":"pointer"}}
            onClick={handleSubmit} disabled={applyMutation.isLoading}>
            {applyMutation.isLoading?"Submitting…":"Submit to Admin →"}
          </button>
        </div>
      </div>

      {/* Info note */}
      <div style={{
        marginTop:14,
        background:"linear-gradient(135deg,#FFFEF0,#FFFBEB)",
        border:"1px solid #F0D89A",borderRadius:14,
        padding:"14px 20px",fontSize:12,color:"#7A5C1A",lineHeight:1.7,
        fontFamily:"'DM Sans',sans-serif",
        display:"flex",gap:12,alignItems:"flex-start",
      }}>
        <div style={{width:20,height:20,borderRadius:6,background:"#F59E0B",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 3v3.5M5.5 8v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span>
          <strong>Note:</strong> As a manager (MGMT08), your leave requests are forwarded directly to the admin for approval.
          Please ensure adequate team coverage before applying.
        </span>
      </div>

      {/* ── My Applied Leave History (NEW) ── */}
      <MyAppliedLeaveHistory/>
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const LeaveTablema = () => {
  const [tab,setTab]     = useState("employee");
  const [toast,setToast] = useState({visible:false,message:"",type:"success"});

  const showToast = (message,type="success") => {
    setToast({visible:true,message,type});
    setTimeout(()=>setToast(p=>({...p,visible:false})),3400);
  };

  const TABS = [
    {key:"employee",label:"Employee Leaves"},
    {key:"mybalance",label:"My Balance"},
    {key:"apply",label:"Apply Leave"},
  ];

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#F7F3FC 0%,#F0EBF8 50%,#F4F0FA 100%)",
      fontFamily:"'DM Sans',sans-serif",
      padding:"32px 36px",
    }}>
      <GlobalStyles/>

      {/* Decorative bg blobs */}
      <div style={{position:"fixed",top:-80,right:-80,width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,41,94,0.07) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:-60,left:-60,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(107,26,74,0.06) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      <div style={{position:"relative",zIndex:1,maxWidth:1100,margin:"0 auto"}}>

        {/* Page header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:30}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{
              width:50,height:50,borderRadius:16,
              background:"linear-gradient(135deg,#6B1A4A,#A8295E)",
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:"0 6px 20px rgba(107,26,74,0.38)",
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="3" y="4" width="16" height="15" rx="3" stroke="white" strokeWidth="1.5"/>
                <path d="M3 9h16" stroke="white" strokeWidth="1.5"/>
                <path d="M7 2v4M15 2v4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 13h4M7 16h8" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 style={{
                fontSize:22,fontWeight:700,color:"#1C1028",margin:0,
                fontFamily:"'Playfair Display',serif",letterSpacing:"-.3px",
              }}>
                Leave Management
              </h1>
              <p style={{fontSize:12,color:"#9B8BAE",margin:"3px 0 0",fontWeight:400}}>
                Manage employee leaves &amp; track your balance
              </p>
            </div>
          </div>

          {/* Profile chip */}
          <div style={{
            background:"#fff",border:"1px solid rgba(200,185,220,0.4)",
            borderRadius:14,padding:"10px 16px",
            display:"flex",alignItems:"center",gap:10,
            boxShadow:"0 2px 12px rgba(80,40,100,0.08)",
          }}>
            <div style={{
              width:34,height:34,borderRadius:10,
              background:"linear-gradient(135deg,#6B1A4A,#A8295E)",
              color:"#fff",fontSize:12,fontWeight:700,
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>AG</div>
            <div>
              <div style={{fontWeight:600,fontSize:12,color:"#1C1028"}}>Ashish Gangwar</div>
              <div style={{fontSize:10,color:"#9B8BAE",marginTop:1}}>MGMT08 · HR Executive</div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{
          display:"flex",gap:4,
          background:"rgba(235,228,245,0.7)",
          backdropFilter:"blur(8px)",
          borderRadius:14,padding:4,
          marginBottom:28,width:"fit-content",
          border:"1px solid rgba(200,185,220,0.3)",
          boxShadow:"0 2px 8px rgba(80,40,100,0.06)",
        }}>
          {TABS.map(t=>{
            const active = tab===t.key;
            return (
              <button key={t.key} className="lm-tab-btn"
                style={{
                  color: active?"#fff":"#9B8BAE",
                  background: active?"linear-gradient(135deg,#6B1A4A,#9B2458)":"transparent",
                  fontWeight: active?600:400,
                  boxShadow: active?"0 3px 12px rgba(107,26,74,0.32)":"none",
                }}
                onClick={()=>setTab(t.key)}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Panels */}
        {tab==="employee" && <EmployeeLeavesPanel showToast={showToast}/>}
        {tab==="mybalance"&& <MyBalancePanel/>}
        {tab==="apply"    && <ApplyLeavePanel showToast={showToast}/>}
      </div>

      <Toast toast={toast}/>
    </div>
  );
};

export default LeaveTablema;