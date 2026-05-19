import React, { useState } from "react";
import {
  useGetAllTickets,
  useGetTicketById,
  useUpdateTicketStatus,
  useEscalateTicket,
  useDeleteTicket,
} from "../../auth/server-state/ticket/ticket.hook";

/* ═══════════════════════════════════════════════════════════════
   GLOBAL STYLES — Dark Luxury Aesthetic
   Palette: #730042 (burgundy), #CD166E (magenta), #0F0A1E (abyss)
   Fonts: Cormorant Garamond (display) + Syne (body)
═══════════════════════════════════════════════════════════════ */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap');

    :root {
      --burgundy:   #730042;
      --magenta:    #CD166E;
      --abyss:      #0F0A1E;
      --deep:       #1A0F2E;
      --surface:    #211535;
      --panel:      #2A1A42;
      --border:     rgba(115,0,66,.35);
      --border2:    rgba(205,22,110,.2);
      --text:       #F5EFFE;
      --muted:      #A889C3;
      --faint:      rgba(245,239,254,.08);
      --glow-b:     rgba(115,0,66,.5);
      --glow-m:     rgba(205,22,110,.4);
    }

    @keyframes spin        { to   { transform:rotate(360deg); } }
    @keyframes fadeUp      { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideRight  { from { opacity:0; transform:translateX(50px); } to { opacity:1; transform:translateX(0); } }
    @keyframes pulse       { 0%,100%{ opacity:1; } 50%{ opacity:.35; } }
    @keyframes shimmer     { 0%{ background-position:-400px 0; } 100%{ background-position:400px 0; } }
    @keyframes glow        { 0%,100%{ box-shadow:0 0 20px var(--glow-m); } 50%{ box-shadow:0 0 40px var(--glow-b),0 0 80px var(--glow-m); } }

    * { box-sizing:border-box; }

    .sa-page {
      background:var(--abyss);
      font-family:'Syne',sans-serif;
      min-height:100%;
      position:relative;
      overflow-x:hidden;
    }

    /* Ambient background */
    .sa-page::before {
      content:'';
      position:fixed; top:0; left:0; right:0; bottom:0; pointer-events:none; z-index:0;
      background:
        radial-gradient(ellipse 60% 50% at 10% 0%, rgba(115,0,66,.28) 0%, transparent 60%),
        radial-gradient(ellipse 40% 40% at 90% 100%, rgba(205,22,110,.18) 0%, transparent 60%),
        radial-gradient(ellipse 30% 30% at 50% 50%, rgba(42,26,66,.6) 0%, transparent 70%);
    }

    /* ── Cards ── */
    .tk-card {
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:14px;
      padding:16px 18px;
      margin-bottom:8px;
      cursor:pointer;
      position:relative;
      overflow:hidden;
      transition:all .25s cubic-bezier(.4,0,.2,1);
      animation:fadeUp .35s ease both;
    }
    .tk-card::before {
      content:'';
      position:absolute; left:0; top:0; bottom:0; width:3px;
      background:linear-gradient(180deg,var(--burgundy),var(--magenta));
      opacity:0; transition:opacity .25s;
    }
    .tk-card:hover { border-color:var(--border2); background:var(--panel); transform:translateX(3px); }
    .tk-card:hover::before { opacity:1; }
    .tk-card.selected { border-color:var(--magenta); background:var(--panel); box-shadow:0 0 0 1px rgba(205,22,110,.3), 0 8px 32px rgba(0,0,0,.4); }
    .tk-card.selected::before { opacity:1; }

    /* ── Buttons ── */
    .sa-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:9px 18px; border-radius:10px;
      font-size:12px; font-weight:600; font-family:'Syne',sans-serif;
      cursor:pointer; border:none;
      transition:all .2s cubic-bezier(.4,0,.2,1);
      position:relative; overflow:hidden;
    }
    .sa-btn:hover  { transform:translateY(-1px); }
    .sa-btn:active { transform:translateY(0); }
    .sa-btn:disabled { opacity:.4; cursor:not-allowed; transform:none!important; }
    .sa-btn-primary {
      background:linear-gradient(135deg,var(--burgundy),var(--magenta));
      color:#fff;
      box-shadow:0 4px 20px rgba(205,22,110,.3);
    }
    .sa-btn-primary:hover { box-shadow:0 6px 28px rgba(205,22,110,.5); }
    .sa-btn-ghost {
      background:var(--faint); color:var(--muted);
      border:1px solid var(--border);
    }
    .sa-btn-ghost:hover { border-color:var(--border2); color:var(--text); background:rgba(205,22,110,.1); }
    .sa-btn-danger {
      background:rgba(239,68,68,.12); color:#f87171;
      border:1px solid rgba(239,68,68,.25);
    }
    .sa-btn-danger:hover { background:rgba(239,68,68,.2); box-shadow:0 4px 16px rgba(239,68,68,.2); }
    .sa-btn-warn {
      background:rgba(245,158,11,.1); color:#fbbf24;
      border:1px solid rgba(245,158,11,.25);
    }

    /* ── Inputs ── */
    .sa-input {
      width:100%; padding:10px 14px; border-radius:10px;
      font-size:13px; font-family:'Syne',sans-serif; color:var(--text);
      background:var(--deep); border:1px solid var(--border); outline:none;
      transition:border .2s,box-shadow .2s;
    }
    .sa-input:focus { border-color:var(--magenta); box-shadow:0 0 0 3px rgba(205,22,110,.12); }
    .sa-input option { background:var(--deep); }

    /* ── Chips ── */
    .sa-chip {
      display:inline-flex; align-items:center; gap:4px;
      padding:3px 10px; border-radius:20px;
      font-size:10px; font-weight:700; font-family:'Syne',sans-serif;
      letter-spacing:.4px; white-space:nowrap;
    }

    /* ── Drawer ── */
    .sa-drawer-overlay {
      position:fixed; inset:0; z-index:200;
      background:rgba(15,10,30,.75); backdrop-filter:blur(6px);
    }
    .sa-drawer {
      position:fixed; top:0; right:0; bottom:0;
      background:var(--deep);
      border-left:1px solid var(--border);
      z-index:201;
      display:flex; flex-direction:column;
      animation:slideRight .3s cubic-bezier(.4,0,.2,1) both;
      box-shadow:-20px 0 80px rgba(0,0,0,.6);
    }

    /* ── Tabs ── */
    .sa-tab {
      padding:7px 16px; border-radius:8px; border:none; cursor:pointer;
      font-size:12px; font-weight:600; font-family:'Syne',sans-serif;
      transition:all .2s; white-space:nowrap; color:var(--muted); background:transparent;
    }
    .sa-tab.active { background:linear-gradient(135deg,var(--burgundy),var(--magenta)); color:#fff; box-shadow:0 3px 14px rgba(205,22,110,.35); }
    .sa-tab:not(.active):hover { color:var(--text); background:var(--faint); }

    /* ── Shimmer loader ── */
    .shimmer {
      background:linear-gradient(90deg,var(--panel) 25%,var(--surface) 50%,var(--panel) 75%);
      background-size:800px 100%;
      animation:shimmer 1.6s infinite linear;
      border-radius:8px;
    }

    /* ── SLA bar ── */
    .sla-bar { height:2px; background:rgba(255,255,255,.08); border-radius:4px; overflow:hidden; margin-top:10px; }
    .sla-fill { height:100%; border-radius:4px; transition:width .4s; }

    /* ── Timeline ── */
    .tl-dot  { width:9px; height:9px; border-radius:50%; flex-shrink:0; margin-top:5px; }
    .tl-line { width:1px; background:var(--border); flex:1; margin:4px auto; min-height:16px; }

    /* ── Stat card ── */
    .sa-stat {
      background:var(--surface); border:1px solid var(--border);
      border-radius:16px; padding:18px 20px;
      flex:1 1 140px; min-width:130px;
      position:relative; overflow:hidden;
      transition:all .25s; animation:fadeUp .4s ease both;
    }
    .sa-stat:hover { border-color:var(--border2); transform:translateY(-2px); }
    .sa-stat::after {
      content:''; position:absolute; top:-40px; right:-40px;
      width:100px; height:100px; border-radius:50%;
      background:radial-gradient(circle,var(--glow-m) 0%,transparent 70%);
      opacity:0; transition:opacity .3s;
    }
    .sa-stat:hover::after { opacity:.5; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar       { width:4px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:rgba(115,0,66,.4); border-radius:4px; }

    /* ── Divider ── */
    .sa-divider { height:1px; background:var(--border); margin:16px 0; }

    /* ── Section label ── */
    .sa-label {
      font-size:10px; font-weight:700; color:var(--muted);
      text-transform:uppercase; letter-spacing:.8px; margin-bottom:8px;
      font-family:'Syne',sans-serif;
    }
  `}</style>
);

/* ═══════════════════════════════════════════════════════════════
   META MAPS
═══════════════════════════════════════════════════════════════ */
const TYPE_META = {
  suggestion:    { label:"Suggestion",    bg:"rgba(34,197,94,.12)",  color:"#4ade80", dot:"#22C55E", icon:"💡" },
  complaint:     { label:"Complaint",     bg:"rgba(245,158,11,.12)", color:"#fbbf24", dot:"#F59E0B", icon:"📋" },
  posh:          { label:"POSH",          bg:"rgba(239,68,68,.15)",  color:"#f87171", dot:"#EF4444", icon:"🔴" },
  grievance:     { label:"Grievance",     bg:"rgba(139,92,246,.15)", color:"#a78bfa", dot:"#8B5CF6", icon:"⚖️" },
  whistleblower: { label:"Whistleblower", bg:"rgba(59,130,246,.12)", color:"#60a5fa", dot:"#3B82F6", icon:"🔒" },
};

const STATUS_META = {
  open:         { label:"Open",          bg:"rgba(245,158,11,.13)", color:"#fbbf24", dot:"#F59E0B" },
  acknowledged: { label:"Acknowledged",  bg:"rgba(59,130,246,.13)", color:"#60a5fa", dot:"#3B82F6" },
  under_review: { label:"Under Review",  bg:"rgba(139,92,246,.13)", color:"#a78bfa", dot:"#8B5CF6" },
  action_taken: { label:"Action Taken",  bg:"rgba(16,185,129,.13)", color:"#34d399", dot:"#10B981" },
  resolved:     { label:"Resolved",      bg:"rgba(34,197,94,.13)",  color:"#4ade80", dot:"#22C55E" },
  closed:       { label:"Closed",        bg:"rgba(156,163,175,.1)", color:"#9ca3af", dot:"#9CA3AF" },
  rejected:     { label:"Rejected",      bg:"rgba(239,68,68,.13)",  color:"#f87171", dot:"#EF4444" },
  reopened:     { label:"Reopened",      bg:"rgba(249,115,22,.13)", color:"#fb923c", dot:"#F97316" },
};

const SEV_META = {
  low:      { label:"Low",      color:"#4ade80", bg:"rgba(34,197,94,.1)"   },
  medium:   { label:"Medium",   color:"#fbbf24", bg:"rgba(245,158,11,.1)"  },
  high:     { label:"High",     color:"#fb923c", bg:"rgba(249,115,22,.1)"  },
  critical: { label:"Critical", color:"#f87171", bg:"rgba(239,68,68,.12)",  pulse:true },
};

const STATUS_FLOW = ["open","acknowledged","under_review","action_taken","resolved","closed","rejected","reopened"];

const CAT_LABELS = {
  sexual_harassment:"Sexual Harassment", hostile_work_environment:"Hostile Work Env.",
  inappropriate_behavior:"Inappropriate Behavior", manager_behavior:"Manager Behavior",
  colleague_behavior:"Colleague Behavior", discrimination:"Discrimination",
  workplace_violence:"Workplace Violence", policy_violation:"Policy Violation",
  compensation_issue:"Compensation Issue", workload_stress:"Workload / Stress",
  unfair_treatment:"Unfair Treatment", process_improvement:"Process Improvement",
  technology_tools:"Technology & Tools", policy_feedback:"Policy Feedback",
  culture_diversity:"Culture & Diversity", benefits_perks:"Benefits & Perks",
  training_development:"Training & Dev.", financial_fraud:"Financial Fraud",
  data_breach:"Data Breach", safety_violation:"Safety Violation",
  legal_compliance:"Legal Compliance", other:"Other",
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
const fmt     = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const fmtFull = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";
const initials = (f="",l="") => `${f[0]||""}${l[0]||""}`.toUpperCase() || "?";
const timeAgo = (d) => {
  if (!d) return "";
  const diff = Math.floor((Date.now()-new Date(d))/60000);
  if (diff < 1)    return "just now";
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
};

/* ═══════════════════════════════════════════════════════════════
   ATOMIC COMPONENTS
═══════════════════════════════════════════════════════════════ */
const TypeChip   = ({type})   => { const m=TYPE_META[type]||{label:type,bg:"rgba(255,255,255,.08)",color:"#9ca3af",icon:"📌"}; return <span className="sa-chip" style={{background:m.bg,color:m.color}}>{m.icon} {m.label}</span>; };
const StatusChip = ({status}) => { const m=STATUS_META[status]||{label:status,bg:"rgba(255,255,255,.08)",color:"#9ca3af",dot:"#9ca3af"}; return <span className="sa-chip" style={{background:m.bg,color:m.color}}><span style={{width:5,height:5,borderRadius:"50%",background:m.dot,display:"inline-block"}}/>{m.label}</span>; };
const SevChip    = ({sev})    => { const m=SEV_META[sev]||{label:sev,bg:"rgba(255,255,255,.08)",color:"#9ca3af"}; return <span className="sa-chip" style={{background:m.bg,color:m.color,animation:m.pulse?"pulse 1.5s infinite":undefined}}>{m.label}</span>; };

const Spinner = ({size=32}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"56px 0",gap:12}}>
    <div style={{width:size,height:size,border:"2px solid rgba(115,0,66,.3)",borderTop:"2px solid #CD166E",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    <span style={{fontSize:11,color:"var(--muted)",fontFamily:"'Syne',sans-serif"}}>Loading…</span>
  </div>
);

const Empty = ({msg="No tickets found"}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"64px 0",gap:12}}>
    <div style={{width:56,height:56,borderRadius:18,background:"var(--surface)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🎫</div>
    <span style={{fontSize:13,color:"var(--muted)",fontFamily:"'Syne',sans-serif",fontWeight:500}}>{msg}</span>
  </div>
);

const ShimmerCard = () => (
  <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:"16px 18px",marginBottom:8}}>
    <div className="shimmer" style={{height:10,width:120,marginBottom:12}}/>
    <div className="shimmer" style={{height:14,width:"75%",marginBottom:10}}/>
    <div className="shimmer" style={{height:10,width:"50%"}}/>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════════ */
const Toast = ({toast}) => {
  const s = {
    success:{bg:"rgba(34,197,94,.12)",color:"#4ade80",border:"rgba(34,197,94,.25)"},
    error:  {bg:"rgba(239,68,68,.12)",color:"#f87171",border:"rgba(239,68,68,.25)"},
    info:   {bg:"rgba(59,130,246,.12)",color:"#60a5fa",border:"rgba(59,130,246,.25)"},
  }[toast.type]||{bg:"var(--panel)",color:"var(--text)",border:"var(--border)"};
  return (
    <div style={{position:"fixed",bottom:28,right:28,zIndex:9999,padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:600,fontFamily:"'Syne',sans-serif",border:`1px solid ${s.border}`,background:s.bg,color:s.color,backdropFilter:"blur(16px)",boxShadow:"0 16px 48px rgba(0,0,0,.4)",display:"flex",alignItems:"center",gap:8,transition:"all .4s cubic-bezier(.34,1.56,.64,1)",transform:toast.visible?"translateY(0) scale(1)":"translateY(24px) scale(.92)",opacity:toast.visible?1:0,pointerEvents:toast.visible?"auto":"none"}}>
      {toast.type==="success"&&"✓"}{toast.type==="error"&&"✕"}{toast.type==="info"&&"ℹ"} {toast.message}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   STAT CARDS
═══════════════════════════════════════════════════════════════ */
const StatCards = ({stats,loading}) => {
  const byStatus = stats?.byStatus||{};
  const total   = Object.values(byStatus).reduce((a,b)=>a+b,0);
  const open    = (byStatus.open||0)+(byStatus.acknowledged||0)+(byStatus.under_review||0)+(byStatus.reopened||0);
  const overdue = stats?.overdue||0;
  const posh    = stats?.byType?.posh||0;
  const critical= stats?.bySeverity?.critical||0;
  const resolved= byStatus.resolved||0;

  const cards = [
    {label:"Total",    val:total,    sub:"All tickets",      accent:"#CD166E", icon:"🎫", delay:0    },
    {label:"Active",   val:open,     sub:"Need attention",   accent:"#60a5fa", icon:"⚡", delay:.05  },
    {label:"Overdue",  val:overdue,  sub:"SLA breached",     accent:"#f87171", icon:"⚠",  delay:.1,  pulse:overdue>0  },
    {label:"POSH",     val:posh,     sub:"Priority review",  accent:"#f87171", icon:"🔴", delay:.15, pulse:posh>0     },
    {label:"Critical", val:critical, sub:"Urgent",           accent:"#fb923c", icon:"🔥", delay:.2,  pulse:critical>0 },
    {label:"Resolved", val:resolved, sub:"This period",      accent:"#4ade80", icon:"✓",  delay:.25  },
  ];

  return (
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:24}}>
      {cards.map((c)=>(
        <div key={c.label} className="sa-stat" style={{animationDelay:`${c.delay}s`,borderTop:`2px solid ${c.accent}22`}}>
          {c.pulse&&c.val>0&&<div style={{position:"absolute",top:12,right:12,width:7,height:7,borderRadius:"50%",background:c.accent,animation:"pulse 1.4s ease infinite",boxShadow:`0 0 8px ${c.accent}`}}/>}
          <div style={{fontSize:10,marginBottom:6}}>{c.icon}</div>
          {loading
            ?<div className="shimmer" style={{height:32,width:60,marginBottom:6}}/>
            :<div style={{fontSize:30,fontWeight:800,color:c.accent,fontFamily:"'Cormorant Garamond',serif",lineHeight:1}}>{c.val}</div>
          }
          <div style={{fontSize:11,color:"var(--text)",fontWeight:700,marginTop:4}}>{c.label}</div>
          <div style={{fontSize:10,color:"var(--muted)",marginTop:1}}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   FILTER BAR
═══════════════════════════════════════════════════════════════ */
const FilterBar = ({filters,setFilters}) => {
  const hasActive = filters.search||filters.type||filters.status||filters.severity||filters.isOverdue;
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
      <div style={{position:"relative",flex:"1 1 200px",minWidth:180}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",opacity:.4}}>
          <circle cx="11" cy="11" r="8" stroke="var(--muted)" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input className="sa-input" style={{paddingLeft:34}} placeholder="Search ticket #, title…" value={filters.search||""} onChange={e=>setFilters(p=>({...p,search:e.target.value,page:1}))}/>
      </div>
      <select className="sa-input" style={{flex:"0 1 130px",width:"auto"}} value={filters.type||""} onChange={e=>setFilters(p=>({...p,type:e.target.value,page:1}))}>
        <option value="">All Types</option>
        {Object.entries(TYPE_META).map(([k,m])=><option key={k} value={k}>{m.icon} {m.label}</option>)}
      </select>
      <select className="sa-input" style={{flex:"0 1 145px",width:"auto"}} value={filters.status||""} onChange={e=>setFilters(p=>({...p,status:e.target.value,page:1}))}>
        <option value="">All Statuses</option>
        {STATUS_FLOW.map(s=><option key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
      </select>
      <select className="sa-input" style={{flex:"0 1 125px",width:"auto"}} value={filters.severity||""} onChange={e=>setFilters(p=>({...p,severity:e.target.value,page:1}))}>
        <option value="">All Severity</option>
        {["low","medium","high","critical"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
      </select>
      <button className={`sa-btn ${filters.isOverdue?"sa-btn-danger":"sa-btn-ghost"}`} onClick={()=>setFilters(p=>({...p,isOverdue:p.isOverdue?"":true,page:1}))}>
        ⚠ Overdue
      </button>
      {hasActive&&(
        <button className="sa-btn sa-btn-ghost" onClick={()=>setFilters({page:1,limit:20})}>
          ✕ Clear
        </button>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   TICKET CARD
═══════════════════════════════════════════════════════════════ */
const TicketCard = ({ticket,selectedId,onClick,idx}) => {
  const isSelected = selectedId===ticket._id;
  const tm = TYPE_META[ticket.type]||{dot:"#CD166E"};
  const overdue = ticket.isOverdue&&!["resolved","closed","rejected"].includes(ticket.status);
  const isPosh  = ticket.type==="posh";

  const slaProgress = ticket.slaDeadline&&ticket.createdAt
    ? Math.min(100,Math.max(0,((Date.now()-new Date(ticket.createdAt))/(new Date(ticket.slaDeadline)-new Date(ticket.createdAt)))*100))
    : null;
  const slaColor = slaProgress>=90?"#EF4444":slaProgress>=60?"#F59E0B":"#22C55E";

  return (
    <div
      className={`tk-card${isSelected?" selected":""}`}
      style={{animationDelay:`${idx*.04}s`}}
      onClick={()=>onClick(ticket._id)}
    >
      {/* Overdue / POSH badges */}
      {(overdue||isPosh||ticket.isEscalated)&&(
        <div style={{position:"absolute",top:10,right:10,display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {overdue&&<span className="sa-chip" style={{background:"rgba(239,68,68,.15)",color:"#f87171",border:"1px solid rgba(239,68,68,.3)",animation:"pulse 1.5s infinite",fontSize:9}}>OVERDUE</span>}
          {isPosh&&<span className="sa-chip" style={{background:"rgba(239,68,68,.15)",color:"#f87171",border:"1px solid rgba(239,68,68,.3)",fontSize:9}}>🔴 POSH</span>}
          {ticket.isEscalated&&<span className="sa-chip" style={{background:"rgba(249,115,22,.12)",color:"#fb923c",border:"1px solid rgba(249,115,22,.25)",fontSize:9}}>🔺 ESCALATED</span>}
        </div>
      )}

      <div style={{paddingRight:overdue||isPosh||ticket.isEscalated?100:0}}>
        {/* Row 1: chips */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:8}}>
          <span style={{fontSize:10,fontWeight:700,color:"var(--magenta)",letterSpacing:".5px",fontFamily:"'Syne',sans-serif"}}>{ticket.ticketNumber}</span>
          <TypeChip type={ticket.type}/>
          <StatusChip status={ticket.status}/>
          <SevChip sev={ticket.severity}/>
        </div>

        {/* Row 2: title */}
        <div style={{fontSize:13,fontWeight:600,color:"var(--text)",fontFamily:"'Syne',sans-serif",marginBottom:8,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {ticket.isAnonymous&&<span className="sa-chip" style={{background:"rgba(255,255,255,.07)",color:"var(--muted)",marginRight:6,fontSize:9}}>Anonymous</span>}
          {ticket.title}
        </div>

        {/* Row 3: meta */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          {ticket.submittedBy&&(
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:20,height:20,borderRadius:6,background:"linear-gradient(135deg,var(--burgundy),var(--magenta))",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",flexShrink:0}}>
                {initials(ticket.submittedBy?.f_name,ticket.submittedBy?.l_name)}
              </div>
              <span style={{fontSize:11,color:"var(--muted)"}}>{ticket.submittedBy?.f_name} {ticket.submittedBy?.l_name}</span>
            </div>
          )}
          {ticket.category&&<span style={{fontSize:11,color:"rgba(168,137,195,.6)"}}>{CAT_LABELS[ticket.category]||ticket.category}</span>}
          <span style={{fontSize:10,color:"rgba(168,137,195,.4)",marginLeft:"auto"}}>{timeAgo(ticket.createdAt)}</span>
        </div>

        {/* SLA bar */}
        {slaProgress!==null&&!["resolved","closed","rejected"].includes(ticket.status)&&(
          <div className="sla-bar">
            <div className="sla-fill" style={{width:`${slaProgress}%`,background:slaColor}}/>
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   DETAIL DRAWER
═══════════════════════════════════════════════════════════════ */
const DetailDrawer = ({ticketId,onClose,showToast,sidebarWidth=0}) => {
  const {data,isLoading}  = useGetTicketById(ticketId);
  const updateMut         = useUpdateTicketStatus();
  const escalateMut       = useEscalateTicket();
  const deleteMut         = useDeleteTicket();

  const [tab,        setTab]        = useState("overview");
  const [newStatus,  setNewStatus]  = useState("");
  const [pubNote,    setPubNote]    = useState("");
  const [intNote,    setIntNote]    = useState("");
  const [resolution, setResolution] = useState("");
  const [rejReason,  setRejReason]  = useState("");
  const [busy,       setBusy]       = useState(false);

  const ticket = data?.ticket;
  const TABS = [
    {key:"overview", label:"Overview"},
    {key:"timeline", label:"Timeline"},
    {key:"notes",    label:"Notes"},
    {key:"actions",  label:"Actions"},
  ];

  const handleUpdate = async () => {
    if (!newStatus&&!pubNote&&!intNote) return;
    setBusy(true);
    try {
      await updateMut.mutateAsync({
        id:ticketId,
        data:{
          ...(newStatus  &&{status:newStatus}),
          ...(pubNote    &&{note:pubNote}),
          ...(intNote    &&{internalNote:intNote}),
          ...(resolution &&{resolutionSummary:resolution}),
          ...(rejReason  &&{rejectionReason:rejReason}),
        },
      });
      showToast("Ticket updated successfully","success");
      setNewStatus(""); setPubNote(""); setIntNote(""); setResolution(""); setRejReason("");
    } catch(e) {
      showToast(e?.response?.data?.message||"Update failed","error");
    } finally { setBusy(false); }
  };

  const handleEscalate = async () => {
    setBusy(true);
    try { await escalateMut.mutateAsync({id:ticketId,data:{reason:"Manually escalated by Super Admin."}}); showToast("Ticket escalated","info"); }
    catch { showToast("Escalation failed","error"); }
    finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Archive this ticket? It will be hidden from the dashboard.")) return;
    setBusy(true);
    try { await deleteMut.mutateAsync(ticketId); showToast("Ticket archived","info"); onClose(); }
    catch { showToast("Archive failed","error"); }
    finally { setBusy(false); }
  };

  const drawerW = `min(660px,calc(100vw - ${sidebarWidth}px))`;

  /* ── Info row helper ── */
  const InfoRow = ({label,val}) => (
    <div style={{background:"var(--panel)",borderRadius:10,padding:"10px 14px"}}>
      <div className="sa-label" style={{marginBottom:3}}>{label}</div>
      <div style={{fontSize:12,color:"var(--text)",fontWeight:500}}>{val||"—"}</div>
    </div>
  );

  return (
    <>
      <div className="sa-drawer-overlay" style={{left:sidebarWidth}} onClick={onClose}/>
      <div className="sa-drawer" style={{width:drawerW}}>

        {/* ── Drawer Header ── */}
        <div style={{padding:"18px 22px",borderBottom:"1px solid var(--border)",flexShrink:0,background:"var(--abyss)"}}>
          {isLoading||!ticket
            ?<><div className="shimmer" style={{height:12,width:140,marginBottom:10}}/><div className="shimmer" style={{height:18,width:240}}/></>
            :<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:6}}>
                    <span style={{fontSize:11,fontWeight:700,color:"var(--magenta)",letterSpacing:".5px"}}>{ticket.ticketNumber}</span>
                    <TypeChip type={ticket.type}/>
                    <StatusChip status={ticket.status}/>
                    {ticket.isEscalated&&<span className="sa-chip" style={{background:"rgba(249,115,22,.12)",color:"#fb923c",border:"1px solid rgba(249,115,22,.3)"}}>🔺 Escalated</span>}
                    {ticket.isOverdue&&<span className="sa-chip" style={{background:"rgba(239,68,68,.12)",color:"#f87171",border:"1px solid rgba(239,68,68,.3)",animation:"pulse 1.5s infinite"}}>⚠ Overdue</span>}
                  </div>
                  <div style={{fontSize:16,fontWeight:700,color:"var(--text)",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.35,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ticket.title}</div>
                </div>
                <button onClick={onClose} style={{background:"var(--faint)",border:"1px solid var(--border)",borderRadius:8,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"var(--muted)"}}>✕</button>
              </div>
            </>
          }

          {/* Drawer tabs */}
          <div style={{display:"flex",gap:3,marginTop:14,background:"rgba(15,10,30,.6)",padding:3,borderRadius:10,width:"fit-content",border:"1px solid var(--border)"}}>
            {TABS.map(t=><button key={t.key} className={`sa-tab${tab===t.key?" active":""}`} onClick={()=>setTab(t.key)}>{t.label}</button>)}
          </div>
        </div>

        {/* ── Drawer Body ── */}
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
          {isLoading||!ticket ? <Spinner size={28}/> : <>

            {/* ══ OVERVIEW ══ */}
            {tab==="overview"&&(
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {/* Submitter card */}
                <div style={{background:"var(--panel)",borderRadius:14,padding:14,border:"1px solid var(--border)"}}>
                  <div className="sa-label">Submitted By</div>
                  {ticket.isAnonymous
                    ?<div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:12,background:"var(--surface)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:"1px solid var(--border)"}}>🎭</div>
                      <div><div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>Anonymous Submission</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Identity protected by policy</div></div>
                    </div>
                    :<div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--burgundy),var(--magenta))",color:"#fff",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 14px var(--glow-m)"}}>
                        {initials(ticket.submittedBy?.f_name,ticket.submittedBy?.l_name)}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{ticket.submittedBy?.f_name} {ticket.submittedBy?.l_name}</div>
                        <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{ticket.submittedBy?.work_email} · <span style={{textTransform:"capitalize"}}>{ticket.submitterRole}</span></div>
                      </div>
                    </div>
                  }
                </div>

                {/* Against */}
                {ticket.against&&(
                  <div style={{background:"rgba(239,68,68,.08)",borderRadius:14,padding:14,border:"1px solid rgba(239,68,68,.25)"}}>
                    <div className="sa-label" style={{color:"#f87171"}}>⚠ Complaint Against</div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:38,height:38,borderRadius:11,background:"rgba(239,68,68,.15)",color:"#f87171",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {initials(ticket.against?.f_name,ticket.against?.l_name)}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{ticket.against?.f_name} {ticket.against?.l_name}</div>
                        <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{ticket.against?.work_email}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <div className="sa-label">Description</div>
                  <div style={{fontSize:13,color:"rgba(245,239,254,.8)",lineHeight:1.75,background:"var(--panel)",borderRadius:12,padding:14,borderLeft:"3px solid var(--burgundy)",fontFamily:"'Syne',sans-serif"}}>{ticket.description}</div>
                </div>

                {/* Detail grid */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <InfoRow label="Category"        val={CAT_LABELS[ticket.category]||ticket.category}/>
                  <InfoRow label="Severity"        val={<SevChip sev={ticket.severity}/>}/>
                  <InfoRow label="Created"         val={fmtFull(ticket.createdAt)}/>
                  <InfoRow label="SLA Deadline"    val={fmt(ticket.slaDeadline)}/>
                  <InfoRow label="Incident Date"   val={ticket.incidentDate?fmt(ticket.incidentDate):"Not specified"}/>
                  <InfoRow label="Location"        val={ticket.incidentLocation||"Not specified"}/>
                  <InfoRow label="Confidentiality" val={(ticket.confidentialityLevel||"").replace(/_/g," ")}/>
                  <InfoRow label="Resolved At"     val={ticket.resolvedAt?fmt(ticket.resolvedAt):"Pending"}/>
                </div>

                {/* Witnesses */}
                {ticket.witnessNames?.length>0&&(
                  <div style={{background:"rgba(245,158,11,.08)",borderRadius:12,padding:14,border:"1px solid rgba(245,158,11,.2)"}}>
                    <div className="sa-label" style={{color:"#fbbf24"}}>Witnesses</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {ticket.witnessNames.map((w,i)=><span key={i} style={{fontSize:12,color:"rgba(251,191,36,.8)"}}>{w}</span>)}
                    </div>
                  </div>
                )}

                {/* Resolution / Rejection */}
                {ticket.resolutionSummary&&(
                  <div style={{background:"rgba(34,197,94,.08)",borderRadius:12,padding:14,border:"1px solid rgba(34,197,94,.2)"}}>
                    <div className="sa-label" style={{color:"#4ade80"}}>Resolution Summary</div>
                    <div style={{fontSize:13,color:"rgba(74,222,128,.85)",lineHeight:1.65}}>{ticket.resolutionSummary}</div>
                  </div>
                )}
                {ticket.rejectionReason&&(
                  <div style={{background:"rgba(239,68,68,.08)",borderRadius:12,padding:14,border:"1px solid rgba(239,68,68,.2)"}}>
                    <div className="sa-label" style={{color:"#f87171"}}>Rejection Reason</div>
                    <div style={{fontSize:13,color:"rgba(248,113,113,.85)",lineHeight:1.65}}>{ticket.rejectionReason}</div>
                  </div>
                )}

                {/* Rating */}
                {ticket.submitterRating&&(
                  <div style={{background:"rgba(245,158,11,.08)",borderRadius:12,padding:14,border:"1px solid rgba(245,158,11,.2)"}}>
                    <div className="sa-label" style={{color:"#fbbf24"}}>Submitter Rating</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:18,letterSpacing:2}}>{"★".repeat(ticket.submitterRating)}{"☆".repeat(5-ticket.submitterRating)}</span>
                      {ticket.submitterFeedback&&<span style={{fontSize:12,color:"rgba(251,191,36,.7)"}}>{ticket.submitterFeedback}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ TIMELINE ══ */}
            {tab==="timeline"&&(
              <div>
                {(!ticket.timeline||ticket.timeline.length===0)
                  ?<Empty msg="No timeline entries yet"/>
                  :[...ticket.timeline].reverse().map((e,i,arr)=>{
                    const COLOR_MAP={ticket_created:"#CD166E",status_changed:"#60a5fa",note_added:"#4ade80",internal_note_added:"#a78bfa",priority_changed:"#fb923c",escalated:"#f87171",resolved:"#4ade80",acknowledgement_sent:"#60a5fa",rating_submitted:"#fbbf24"};
                    const dot=COLOR_MAP[e.action]||"#CD166E";
                    const isLast=i===arr.length-1;
                    return (
                      <div key={e._id||i} style={{display:"flex",gap:12,marginBottom:isLast?0:4}}>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:9,flexShrink:0}}>
                          <div className="tl-dot" style={{background:dot,boxShadow:`0 0 8px ${dot}66`}}/>
                          {!isLast&&<div className="tl-line"/>}
                        </div>
                        <div style={{flex:1,paddingBottom:isLast?0:16}}>
                          <div style={{fontSize:11,fontWeight:700,color:dot,textTransform:"capitalize",letterSpacing:".3px"}}>{e.action.replace(/_/g," ")}</div>
                          {e.fromStatus&&e.toStatus&&(
                            <div style={{display:"flex",alignItems:"center",gap:4,marginTop:4,flexWrap:"wrap"}}>
                              <StatusChip status={e.fromStatus}/><span style={{color:"var(--muted)",fontSize:10}}>→</span><StatusChip status={e.toStatus}/>
                            </div>
                          )}
                          {(e.note||e.internalNote)&&(
                            <div style={{background:e.internalNote?"rgba(139,92,246,.08)":"var(--panel)",borderRadius:8,padding:"8px 12px",marginTop:6,fontSize:12,color:"rgba(245,239,254,.7)",lineHeight:1.55,borderLeft:`2px solid ${e.internalNote?"#8B5CF6":"var(--burgundy)"}`}}>
                              {e.internalNote&&<span style={{fontSize:9,fontWeight:700,color:"#a78bfa",display:"block",marginBottom:3}}>🔒 INTERNAL</span>}
                              {e.note||e.internalNote}
                            </div>
                          )}
                          <div style={{fontSize:10,color:"rgba(168,137,195,.45)",marginTop:4}}>
                            {fmtFull(e.timestamp)}{e.byName&&` · ${e.byName}`}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* ══ NOTES ══ */}
            {tab==="notes"&&(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{background:"rgba(139,92,246,.08)",borderRadius:10,padding:"10px 14px",border:"1px solid rgba(139,92,246,.2)",fontSize:12,color:"#a78bfa"}}>
                  🔒 Internal notes are only visible to Super Admin
                </div>
                {(!ticket.internalNotes||ticket.internalNotes.length===0)&&<Empty msg="No internal notes yet"/>}
                {[...(ticket.internalNotes||[])].reverse().map((n,i)=>(
                  <div key={i} style={{background:"rgba(139,92,246,.08)",borderRadius:12,padding:14,border:"1px solid rgba(139,92,246,.2)"}}>
                    <div style={{fontSize:12,color:"rgba(167,139,250,.9)",lineHeight:1.65}}>{n.note}</div>
                    <div style={{fontSize:10,color:"rgba(139,92,246,.5)",marginTop:6}}>{fmtFull(n.addedAt)} · {n.byName}</div>
                  </div>
                ))}
                {ticket.superAdminNote&&(
                  <div style={{background:"rgba(34,197,94,.08)",borderRadius:12,padding:14,border:"1px solid rgba(34,197,94,.2)"}}>
                    <div className="sa-label" style={{color:"#4ade80"}}>Last Public Reply to Submitter</div>
                    <div style={{fontSize:12,color:"rgba(74,222,128,.85)",lineHeight:1.65}}>{ticket.superAdminNote}</div>
                  </div>
                )}
              </div>
            )}

            {/* ══ ACTIONS ══ */}
            {tab==="actions"&&(
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                {/* Status change */}
                <div>
                  <div className="sa-label">Change Status</div>
                  <select className="sa-input" value={newStatus} onChange={e=>setNewStatus(e.target.value)}>
                    <option value="">— Keep current ({ticket.status.replace(/_/g," ")}) —</option>
                    {STATUS_FLOW.filter(s=>s!==ticket.status).map(s=><option key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                  </select>
                </div>

                {/* Public note */}
                <div>
                  <div className="sa-label">Public Reply to Submitter</div>
                  <textarea className="sa-input" rows={3} value={pubNote} onChange={e=>setPubNote(e.target.value)} placeholder="Write a response visible to the submitter…" style={{resize:"vertical",lineHeight:1.65}}/>
                </div>

                {/* Internal note */}
                <div>
                  <div className="sa-label" style={{color:"#a78bfa"}}>🔒 Internal Note (Private)</div>
                  <textarea className="sa-input" rows={3} value={intNote} onChange={e=>setIntNote(e.target.value)} placeholder="Evidence, investigation notes — not visible to submitter…" style={{resize:"vertical",lineHeight:1.65,borderColor:"rgba(139,92,246,.3)"}}/>
                </div>

                {/* Conditional fields */}
                {newStatus==="resolved"&&(
                  <div>
                    <div className="sa-label" style={{color:"#4ade80"}}>Resolution Summary</div>
                    <textarea className="sa-input" rows={3} value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Describe how this was resolved…" style={{resize:"vertical",lineHeight:1.65,borderColor:"rgba(34,197,94,.3)"}}/>
                  </div>
                )}
                {newStatus==="rejected"&&(
                  <div>
                    <div className="sa-label" style={{color:"#f87171"}}>Rejection Reason</div>
                    <textarea className="sa-input" rows={2} value={rejReason} onChange={e=>setRejReason(e.target.value)} placeholder="Explain the rejection…" style={{resize:"vertical",lineHeight:1.65,borderColor:"rgba(239,68,68,.3)"}}/>
                  </div>
                )}

                {/* Save */}
                <button
                  className="sa-btn sa-btn-primary"
                  disabled={busy||(!newStatus&&!pubNote&&!intNote)}
                  onClick={handleUpdate}
                  style={{padding:"12px 24px",fontSize:13,justifyContent:"center",borderRadius:12}}
                >
                  {busy
                    ?<><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .6s linear infinite"}}/>Saving…</>
                    :"Save Changes →"
                  }
                </button>

                <div className="sa-divider"/>

                {/* Quick actions */}
                <div>
                  <div className="sa-label">Quick Actions</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {!ticket.isEscalated&&(
                      <button className="sa-btn sa-btn-warn" disabled={busy} onClick={handleEscalate}>🔺 Escalate Ticket</button>
                    )}
                    <button className="sa-btn sa-btn-danger" disabled={busy} onClick={handleDelete}>🗑 Archive Ticket</button>
                  </div>
                </div>

                {/* SLA info */}
                <div style={{background:"var(--panel)",borderRadius:12,padding:14,border:"1px solid var(--border)"}}>
                  <div className="sa-label">SLA Metrics</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div style={{fontSize:12,color:"var(--muted)"}}>SLA Deadline<br/><span style={{color:"var(--text)",fontWeight:600}}>{fmt(ticket.slaDeadline)}</span></div>
                    <div style={{fontSize:12,color:"var(--muted)"}}>First Response<br/><span style={{color:"var(--text)",fontWeight:600}}>{ticket.acknowledgedAt?`${ticket.firstResponseHours}h`:"Pending"}</span></div>
                    {ticket.resolvedAt&&<div style={{fontSize:12,color:"var(--muted)"}}>Resolution Time<br/><span style={{color:"#4ade80",fontWeight:600}}>{ticket.resolutionTimeHours}h</span></div>}
                    <div style={{fontSize:12,color:"var(--muted)"}}>Reopen Count<br/><span style={{color:"var(--text)",fontWeight:600}}>{ticket.reopenCount||0}</span></div>
                  </div>
                </div>
              </div>
            )}
          </>}
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════ */
export default function SuperAdminTicketSystem({sidebarWidth=240}) {
  const [filters,    setFilters]    = useState({page:1,limit:20,sortBy:"createdAt",sortOrder:"desc"});
  const [activeTab,  setActiveTab]  = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [toast,      setToast]      = useState({visible:false,message:"",type:"success"});

  const TAB_PRESET = {
    all:{}, posh:{type:"posh"}, critical:{severity:"critical"},
    overdue:{isOverdue:"true"}, open:{status:"open"}, resolved:{status:"resolved"},
  };

  const {data,isLoading,isFetching} = useGetAllTickets({...filters,...TAB_PRESET[activeTab]});
  const tickets    = data?.tickets    || [];
  const stats      = data?.stats      || {};
  const pagination = data?.pagination || {};

  const showToast = (message,type="success") => {
    setToast({visible:true,message,type});
    setTimeout(()=>setToast(p=>({...p,visible:false})),3500);
  };

  const TABS = [
    {key:"all",      label:"All",        count:pagination.total||0},
    {key:"posh",     label:"🔴 POSH",    count:stats?.byType?.posh||0,              alert:true},
    {key:"critical", label:"⚡ Critical", count:stats?.bySeverity?.critical||0,      alert:(stats?.bySeverity?.critical||0)>0},
    {key:"overdue",  label:"⚠ Overdue",  count:stats?.overdue||0,                   alert:(stats?.overdue||0)>0},
    {key:"open",     label:"Open",       count:stats?.byStatus?.open||0},
    {key:"resolved", label:"Resolved",   count:stats?.byStatus?.resolved||0},
  ];

  return (
    <div className="sa-page" style={{padding:"28px 32px"}}>
      <GlobalStyles/>

      <div style={{position:"relative",zIndex:1,maxWidth:1080}}>

        {/* ── Header ── */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:52,height:52,borderRadius:17,background:"linear-gradient(135deg,var(--burgundy),var(--magenta))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 6px 28px var(--glow-m),0 0 0 1px rgba(205,22,110,.2)",flexShrink:0}}>
              🎫
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <h1 style={{fontSize:22,fontWeight:700,color:"var(--text)",margin:0,fontFamily:"'Cormorant Garamond',serif",letterSpacing:"-.2px"}}>
                  Tickets &amp; Grievances
                </h1>
                <span style={{padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,background:"linear-gradient(135deg,var(--burgundy),var(--magenta))",color:"#fff",letterSpacing:".4px",fontFamily:"'Syne',sans-serif",boxShadow:"0 2px 10px var(--glow-m)"}}>
                  SUPER ADMIN
                </span>
              </div>
              <p style={{fontSize:11,color:"var(--muted)",margin:"4px 0 0",fontWeight:400}}>
                Complaints · POSH · Grievances · Suggestions · Whistleblower
              </p>
            </div>
          </div>

          {isFetching&&!isLoading&&(
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:"var(--muted)",padding:"7px 14px",background:"var(--surface)",borderRadius:10,border:"1px solid var(--border)"}}>
              <div style={{width:11,height:11,border:"1.5px solid var(--border)",borderTop:"1.5px solid var(--magenta)",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
              Refreshing…
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <StatCards stats={stats} loading={isLoading}/>

        {/* ── Quick Tabs ── */}
        <div style={{display:"flex",gap:3,background:"rgba(15,10,30,.8)",backdropFilter:"blur(10px)",borderRadius:12,padding:3,marginBottom:16,width:"fit-content",border:"1px solid var(--border)",flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <button key={t.key} className={`sa-tab${activeTab===t.key?" active":""}`}
              style={{position:"relative"}}
              onClick={()=>{setActiveTab(t.key);setFilters(p=>({...p,page:1}));}}>
              {t.label}
              <span style={{background:activeTab===t.key?"rgba(255,255,255,.2)":"var(--faint)",color:activeTab===t.key?"rgba(255,255,255,.9)":"var(--muted)",borderRadius:8,padding:"1px 6px",fontSize:10,fontWeight:700,marginLeft:4}}>
                {t.count}
              </span>
              {t.alert&&t.count>0&&activeTab!==t.key&&(
                <span style={{position:"absolute",top:5,right:5,width:5,height:5,borderRadius:"50%",background:"#EF4444",animation:"pulse 1.4s infinite",boxShadow:"0 0 6px #EF4444"}}/>
              )}
            </button>
          ))}
        </div>

        {/* ── Filters (all tab only) ── */}
        {activeTab==="all"&&<FilterBar filters={filters} setFilters={setFilters}/>}

        {/* ── Ticket List ── */}
        {isLoading
          ?[...Array(5)].map((_,i)=><ShimmerCard key={i}/>)
          :tickets.length===0
            ?<Empty msg="No tickets match your criteria"/>
            :tickets.map((t,i)=>(
              <TicketCard
                key={t._id} ticket={t} idx={i}
                selectedId={selectedId}
                onClick={id=>setSelectedId(id===selectedId?null:id)}
              />
            ))
        }

        {/* ── Pagination ── */}
        {pagination.pages>1&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:20,flexWrap:"wrap"}}>
            <button className="sa-btn sa-btn-ghost" disabled={filters.page<=1} onClick={()=>setFilters(p=>({...p,page:p.page-1}))}>← Prev</button>
            <span style={{fontSize:12,color:"var(--muted)",padding:"0 12px"}}>
              Page {pagination.page} / {pagination.pages} · {pagination.total} total
            </span>
            <button className="sa-btn sa-btn-ghost" disabled={filters.page>=pagination.pages} onClick={()=>setFilters(p=>({...p,page:p.page+1}))}>Next →</button>
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {selectedId&&(
        <DetailDrawer
          ticketId={selectedId}
          onClose={()=>setSelectedId(null)}
          showToast={showToast}
          sidebarWidth={sidebarWidth}
        />
      )}

      <Toast toast={toast}/>
    </div>
  );
}