import React, { useState, useEffect, useRef } from "react";
import {
  useGetAllTickets,
  useGetTicketById,
  useUpdateTicketStatus,
  useEscalateTicket,
  useDeleteTicket,
} from "../../auth/server-state/ticket/ticket.hook";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    @keyframes spin        { to   { transform: rotate(360deg); } }
    @keyframes fadeSlideUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes slideInRight{ from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }
    @keyframes pulse       { 0%,100%{ opacity:1; } 50%{ opacity:.45; } }

    .tk-card {
      background:#fff;
      border-radius:16px;
      border:1px solid rgba(180,155,210,.25);
      padding:18px 20px;
      margin-bottom:10px;
      box-shadow:0 2px 10px rgba(60,20,80,.06);
      transition:all .22s ease;
      animation:fadeSlideUp .3s ease both;
      cursor:pointer;
      position:relative;
      overflow:hidden;
    }
    .tk-card:hover {
      box-shadow:0 6px 24px rgba(60,20,80,.12);
      transform:translateY(-1px);
      border-color:rgba(115,0,66,.2);
    }
    .tk-card.selected {
      border-color:#730042;
      box-shadow:0 0 0 2px rgba(115,0,66,.15), 0 6px 24px rgba(60,20,80,.12);
    }

    .tk-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:8px 16px; border-radius:10px;
      font-size:12px; font-weight:600;
      cursor:pointer; border:none;
      font-family:'DM Sans',sans-serif;
      transition:all .18s ease;
    }
    .tk-btn:hover  { transform:translateY(-1px); filter:brightness(1.05); }
    .tk-btn:active { transform:translateY(0); }

    .tk-input {
      width:100%; box-sizing:border-box;
      padding:10px 14px; border-radius:10px;
      font-size:13px; font-family:'DM Sans',sans-serif;
      color:#1C1028; background:#FDFBFF;
      border:1.5px solid #E2D8EE;
      outline:none; transition:border .2s, box-shadow .2s;
    }
    .tk-input:focus { border-color:#730042!important; box-shadow:0 0 0 3px rgba(115,0,66,.09); }

    .tk-chip {
      display:inline-flex; align-items:center; gap:5px;
      padding:4px 12px; border-radius:20px;
      font-size:11px; font-weight:600;
      font-family:'DM Sans',sans-serif;
    }

    .drawer-overlay {
      position:fixed; inset:0; z-index:200;
      background:rgba(20,0,30,.45);
      backdrop-filter:blur(3px);
      transition:opacity .3s;
    }
    .drawer {
      position:fixed; top:0; right:0; bottom:0;
      width:min(640px,100vw);
      background:#fff; z-index:201;
      box-shadow:-8px 0 40px rgba(0,0,0,.18);
      display:flex; flex-direction:column;
      animation:slideInRight .3s ease both;
      overflow:hidden;
    }

    .timeline-dot {
      width:10px; height:10px; border-radius:50%;
      flex-shrink:0; margin-top:4px;
    }
    .timeline-line {
      width:2px; background:#F0EAF8;
      flex:1; margin:4px auto;
    }

    ::-webkit-scrollbar       { width:5px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:#DDD6EC; border-radius:4px; }

    .tk-tab {
      padding:8px 20px; border-radius:10px;
      font-size:12px; font-weight:500;
      font-family:'DM Sans',sans-serif;
      border:none; cursor:pointer; transition:all .2s;
      white-space:nowrap;
    }
  `}</style>
);

/* ═══════════════════════════════════════════════
   META — colours, labels, icons
═══════════════════════════════════════════════ */
const TYPE_META = {
  suggestion:    { label:"Suggestion",    short:"SUGG", bg:"#DCFCE7", color:"#14803D", dot:"#22C55E",  border:"#86EFAC", icon:"💡" },
  complaint:     { label:"Complaint",     short:"CMPL", bg:"#FEF3C7", color:"#92400E", dot:"#F59E0B",  border:"#FCD34D", icon:"📋" },
  posh:          { label:"POSH",          short:"POSH", bg:"#FEE2E2", color:"#991B1B", dot:"#EF4444",  border:"#FCA5A5", icon:"🔴" },
  grievance:     { label:"Grievance",     short:"GRIV", bg:"#EDE9FE", color:"#5B21B6", dot:"#8B5CF6",  border:"#C4B5FD", icon:"⚖️" },
  whistleblower: { label:"Whistleblower", short:"WBTL", bg:"#DBEAFE", color:"#1D4ED8", dot:"#3B82F6",  border:"#93C5FD", icon:"🔒" },
};

const STATUS_META = {
  open:          { label:"Open",           bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  acknowledged:  { label:"Acknowledged",   bg:"#EFF6FF", color:"#1D4ED8", dot:"#3B82F6" },
  under_review:  { label:"Under Review",   bg:"#F5F3FF", color:"#5B21B6", dot:"#8B5CF6" },
  action_taken:  { label:"Action Taken",   bg:"#ECFDF5", color:"#065F46", dot:"#10B981" },
  resolved:      { label:"Resolved",       bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  closed:        { label:"Closed",         bg:"#F3F4F6", color:"#374151", dot:"#9CA3AF" },
  rejected:      { label:"Rejected",       bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  reopened:      { label:"Reopened",       bg:"#FFF7ED", color:"#9A3412", dot:"#F97316" },
};

const SEV_META = {
  low:      { label:"Low",      bg:"#F0FDF4", color:"#14803D", bar:"#22C55E" },
  medium:   { label:"Medium",   bg:"#FFFBEB", color:"#92400E", bar:"#F59E0B" },
  high:     { label:"High",     bg:"#FFF7ED", color:"#9A3412", bar:"#F97316" },
  critical: { label:"Critical", bg:"#FEF2F2", color:"#991B1B", bar:"#EF4444" },
};

const STATUS_FLOW = ["open","acknowledged","under_review","action_taken","resolved","closed","rejected","reopened"];

const CATEGORY_LABELS = {
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

/* ═══════════════════════════════════════════════
   SMALL HELPERS
═══════════════════════════════════════════════ */
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";
const initials = (f="",l="") => `${f[0]||""}${l[0]||""}`.toUpperCase();
const timeAgo = (d) => {
  if (!d) return "";
  const diff = Math.floor((Date.now()-new Date(d))/60000);
  if (diff < 60)    return `${diff}m ago`;
  if (diff < 1440)  return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
};

/* ═══════════════════════════════════════════════
   SMALL COMPONENTS
═══════════════════════════════════════════════ */
const Spinner = ({size=36}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"60px 0",gap:12}}>
    <div style={{width:size,height:size,border:"3px solid #EDE6F5",borderTop:"3px solid #730042",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    <p style={{fontSize:12,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>Loading…</p>
  </div>
);

const Empty = ({msg}) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"56px 0",gap:10}}>
    <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#F4EEF9,#EDE4F5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🎫</div>
    <p style={{fontSize:13,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>{msg||"No tickets found"}</p>
  </div>
);

const TypeChip = ({type}) => {
  const m = TYPE_META[type]||{label:type,bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF",icon:"📌"};
  return <span className="tk-chip" style={{background:m.bg,color:m.color,border:`1px solid ${m.border||m.dot}22`}}><span>{m.icon}</span>{m.label}</span>;
};

const StatusChip = ({status}) => {
  const m = STATUS_META[status]||{label:status,bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF"};
  return <span className="tk-chip" style={{background:m.bg,color:m.color}}><span style={{width:6,height:6,borderRadius:"50%",background:m.dot}}/>{m.label}</span>;
};

const SevChip = ({sev}) => {
  const m = SEV_META[sev]||{label:sev,bg:"#F3F4F6",color:"#374151"};
  return <span className="tk-chip" style={{background:m.bg,color:m.color,fontWeight:700}}>{m.label}</span>;
};

const Toast = ({toast}) => {
  const c = {success:{bg:"rgba(240,253,244,.97)",color:"#14803D",border:"#86EFAC",icon:"#22C55E"},error:{bg:"rgba(254,242,242,.97)",color:"#991B1B",border:"#FCA5A5",icon:"#EF4444"},info:{bg:"rgba(239,246,255,.97)",color:"#1D4ED8",border:"#93C5FD",icon:"#3B82F6"}}[toast.type]||{bg:"#fff",color:"#333",border:"#ccc",icon:"#888"};
  return (
    <div style={{position:"fixed",bottom:28,right:28,padding:"13px 20px",borderRadius:13,fontSize:13,fontWeight:500,fontFamily:"'DM Sans',sans-serif",boxShadow:"0 8px 30px rgba(0,0,0,.14)",zIndex:9999,display:"flex",alignItems:"center",gap:10,transition:"all .35s cubic-bezier(.34,1.56,.64,1)",backdropFilter:"blur(8px)",transform:toast.visible?"translateY(0) scale(1)":"translateY(22px) scale(.94)",opacity:toast.visible?1:0,pointerEvents:toast.visible?"auto":"none",background:c.bg,color:c.color,border:`1px solid ${c.border}`}}>
      <div style={{width:20,height:20,borderRadius:"50%",background:c.icon,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        {toast.type==="success"&&<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type==="error"  &&<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 3l4 4M7 3l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        {toast.type==="info"   &&<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 4v4M5 3v.01" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>}
      </div>
      {toast.message}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   STAT CARDS (top of page)
═══════════════════════════════════════════════ */
const StatCards = ({stats,loading}) => {
  const total   = Object.values(stats?.byStatus||{}).reduce((a,b)=>a+b,0);
  const open    = (stats?.byStatus?.open||0)+(stats?.byStatus?.acknowledged||0)+(stats?.byStatus?.under_review||0)+(stats?.byStatus?.reopened||0);
  const overdue = stats?.overdue||0;
  const critical= stats?.criticalOrPosh||0;

  const cards = [
    {label:"Total Tickets",  val:total,   color:"#730042", bg:"linear-gradient(135deg,#FFF0F7,#FFE4F2)", sub:"All time"},
    {label:"Open / Active",  val:open,    color:"#1D4ED8", bg:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", sub:"Needs attention"},
    {label:"Overdue",        val:overdue, color:"#991B1B", bg:"linear-gradient(135deg,#FEF2F2,#FEE2E2)", sub:"SLA breached", pulse:overdue>0},
    {label:"Critical / POSH",val:critical,color:"#9A3412", bg:"linear-gradient(135deg,#FFF7ED,#FFEDD5)", sub:"Urgent review", pulse:critical>0},
    {label:"Resolved",val:stats?.byStatus?.resolved||0,color:"#14803D",bg:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",sub:"This period"},
  ];

  return (
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:24}}>
      {cards.map((c,i)=>(
        <div key={c.label} style={{background:c.bg,borderRadius:16,padding:"14px 20px",minWidth:120,flex:"1 1 120px",border:"1px solid rgba(0,0,0,.05)",boxShadow:"0 2px 8px rgba(0,0,0,.04)",animation:`fadeSlideUp .3s ease ${i*.06}s both`,position:"relative",overflow:"hidden"}}>
          {c.pulse&&<div style={{position:"absolute",top:10,right:10,width:8,height:8,borderRadius:"50%",background:c.color,animation:"pulse 1.5s ease infinite"}}/>}
          {loading
            ?<div style={{height:34,background:"rgba(0,0,0,.06)",borderRadius:8,animation:"pulse 1.5s infinite"}}/>
            :<div style={{fontSize:32,fontWeight:800,color:c.color,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{c.val}</div>
          }
          <div style={{fontSize:11,color:c.color,fontWeight:600,fontFamily:"'DM Sans',sans-serif",marginTop:4,opacity:.8}}>{c.label}</div>
          <div style={{fontSize:10,color:c.color,fontFamily:"'DM Sans',sans-serif",opacity:.5,marginTop:1}}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   TICKET CARD (list item)
═══════════════════════════════════════════════ */
const TicketCard = ({ticket,selected,onClick,idx}) => {
  const isSelected = selected?._id===ticket._id;
  const tm = TYPE_META[ticket.type]||{};
  const sm = STATUS_META[ticket.status]||{};
  const overdue = ticket.isOverdue && !["resolved","closed","rejected"].includes(ticket.status);
  const isPosh  = ticket.type==="posh";

  return (
    <div className={`tk-card${isSelected?" selected":""}`} style={{animationDelay:`${idx*.05}s`}} onClick={()=>onClick(ticket)}>
      {/* Left accent */}
      <div style={{position:"absolute",top:0,left:0,width:3,bottom:0,background:tm.dot||"#730042",borderRadius:"16px 0 0 16px"}}/>
      {/* Overdue / POSH flag */}
      {(overdue||isPosh)&&<div style={{position:"absolute",top:10,right:10,display:"flex",gap:4}}>
        {overdue&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:8,background:"#FEF2F2",color:"#991B1B",border:"1px solid #FCA5A5"}}>OVERDUE</span>}
        {isPosh &&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:8,background:"#FEE2E2",color:"#991B1B",border:"1px solid #FCA5A5"}}>🔴 POSH</span>}
      </div>}

      <div style={{paddingLeft:10}}>
        {/* Row 1: ticket number + badges */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <span style={{fontSize:10,fontWeight:700,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif",letterSpacing:".5px"}}>{ticket.ticketNumber}</span>
          <TypeChip type={ticket.type}/>
          <StatusChip status={ticket.status}/>
          <SevChip sev={ticket.severity}/>
        </div>

        {/* Row 2: title */}
        <div style={{fontSize:13,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif",marginBottom:6,lineHeight:1.4,paddingRight:60,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {ticket.isAnonymous&&<span style={{fontSize:10,marginRight:6,padding:"1px 7px",borderRadius:8,background:"#F3F4F6",color:"#6B7280",fontWeight:600}}>Anonymous</span>}
          {ticket.title}
        </div>

        {/* Row 3: submitter + category + time */}
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          {ticket.submittedBy&&(
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:20,height:20,borderRadius:6,background:"linear-gradient(135deg,#730042,#CD166E)",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
                {initials(ticket.submittedBy?.f_name,ticket.submittedBy?.l_name)}
              </div>
              <span style={{fontSize:11,color:"#6B5080",fontFamily:"'DM Sans',sans-serif"}}>{ticket.submittedBy?.f_name} {ticket.submittedBy?.l_name}</span>
            </div>
          )}
          {ticket.category&&<span style={{fontSize:11,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>{CATEGORY_LABELS[ticket.category]||ticket.category}</span>}
          <span style={{fontSize:11,color:"#C4AADA",fontFamily:"'DM Sans',sans-serif",marginLeft:"auto"}}>{timeAgo(ticket.createdAt)}</span>
        </div>

        {/* SLA bar */}
        {ticket.slaDeadline&&!["resolved","closed","rejected"].includes(ticket.status)&&(()=>{
          const created   = new Date(ticket.createdAt).getTime();
          const deadline  = new Date(ticket.slaDeadline).getTime();
          const now       = Date.now();
          const pct       = Math.min(100, Math.max(0, ((now - created)/(deadline - created)) * 100));
          const barColor  = pct >= 90 ? "#EF4444" : pct >= 60 ? "#F59E0B" : "#22C55E";
          return (
            <div style={{marginTop:10}}>
              <div style={{height:3,background:"#F0EAF8",borderRadius:4,overflow:"hidden"}}>
                <div style={{width:`${pct}%`,height:"100%",background:barColor,borderRadius:4,transition:"width 1s"}}/>
              </div>
              <div style={{fontSize:9,color:overdue?"#EF4444":"#9B8BAE",fontFamily:"'DM Sans',sans-serif",marginTop:3}}>
                SLA: {overdue?"Breached":"Due"} {fmt(ticket.slaDeadline)}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   DETAIL DRAWER
═══════════════════════════════════════════════ */
const DetailDrawer = ({ticketId,onClose,showToast}) => {
  const {data,isLoading}  = useGetTicketById(ticketId);
  const updateMut         = useUpdateTicketStatus();
  const escalateMut       = useEscalateTicket();
  const deleteMut         = useDeleteTicket();

  const [drawerTab, setDrawerTab]       = useState("overview");
  const [newStatus,  setNewStatus]      = useState("");
  const [pubNote,    setPubNote]        = useState("");
  const [intNote,    setIntNote]        = useState("");
  const [resolution, setResolution]     = useState("");
  const [rejReason,  setRejReason]      = useState("");
  const [processing, setProcessing]     = useState(false);

  const ticket = data?.ticket;

  const handleUpdate = async () => {
    if (!newStatus && !pubNote && !intNote) return;
    setProcessing(true);
    try {
      await updateMut.mutateAsync({
        id: ticketId,
        ...(newStatus  && { status: newStatus }),
        ...(pubNote    && { note: pubNote }),
        ...(intNote    && { internalNote: intNote }),
        ...(resolution && { resolutionSummary: resolution }),
        ...(rejReason  && { rejectionReason: rejReason }),
      });
      showToast("Ticket updated successfully","success");
      setNewStatus(""); setPubNote(""); setIntNote(""); setResolution(""); setRejReason("");
    } catch(e) {
      showToast(e?.response?.data?.message||"Update failed","error");
    } finally { setProcessing(false); }
  };

  const handleEscalate = async () => {
    setProcessing(true);
    try {
      await escalateMut.mutateAsync({id:ticketId,reason:"Manually escalated by Super Admin."});
      showToast("Ticket escalated and priority upgraded","info");
    } catch(e) { showToast("Escalation failed","error"); }
    finally { setProcessing(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Archive this ticket? It will be hidden from the dashboard.")) return;
    setProcessing(true);
    try {
      await deleteMut.mutateAsync(ticketId);
      showToast("Ticket archived","info");
      onClose();
    } catch(e) { showToast("Failed to archive","error"); }
    finally { setProcessing(false); }
  };

  const DRAWER_TABS = ["overview","timeline","notes","actions"];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="drawer">
        {/* Drawer header */}
        <div style={{padding:"20px 24px",borderBottom:"1px solid #F0EAF8",flexShrink:0}}>
          {isLoading||!ticket
            ?<div style={{height:22,background:"#F0EAF8",borderRadius:6,width:180,animation:"pulse 1.5s infinite"}}/>
            :<div>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#730042",fontFamily:"'DM Sans',sans-serif",letterSpacing:".5px"}}>{ticket.ticketNumber}</span>
                    <TypeChip type={ticket.type}/>
                    <StatusChip status={ticket.status}/>
                    {ticket.isEscalated&&<span className="tk-chip" style={{background:"#FFF7ED",color:"#9A3412",border:"1px solid #FED7AA"}}>🔺 Escalated</span>}
                    {ticket.isOverdue&&<span className="tk-chip" style={{background:"#FEF2F2",color:"#991B1B",border:"1px solid #FCA5A5",animation:"pulse 1.5s infinite"}}>⚠ Overdue</span>}
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:"#1C1028",fontFamily:"'Playfair Display',serif",lineHeight:1.35}}>{ticket.title}</div>
                </div>
                <button onClick={onClose} style={{background:"#F4EEF9",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="#6B5080" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
          }

          {/* Drawer tabs */}
          <div style={{display:"flex",gap:3,marginTop:14,background:"rgba(235,228,245,.5)",padding:3,borderRadius:10,width:"fit-content"}}>
            {DRAWER_TABS.map(t=>{
              const active=drawerTab===t;
              return <button key={t} className="tk-tab" style={{color:active?"#fff":"#9B8BAE",background:active?"linear-gradient(135deg,#730042,#CD166E)":"transparent",fontWeight:active?600:400,boxShadow:active?"0 2px 10px rgba(115,0,66,.28)":"none",textTransform:"capitalize"}} onClick={()=>setDrawerTab(t)}>{t}</button>;
            })}
          </div>
        </div>

        {/* Drawer body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          {isLoading||!ticket ? <Spinner size={28}/> : (
            <>
              {/* ── OVERVIEW TAB ── */}
              {drawerTab==="overview"&&(
                <div>
                  {/* Submitter */}
                  <div style={{background:"#FAF7FD",borderRadius:14,padding:"16px",marginBottom:16}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#9B8BAE",textTransform:"uppercase",letterSpacing:".6px",marginBottom:10,fontFamily:"'DM Sans',sans-serif"}}>Submitted By</div>
                    {ticket.isAnonymous
                      ?<div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:38,height:38,borderRadius:10,background:"#E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🎭</div>
                        <div><div style={{fontSize:13,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif"}}>Anonymous</div><div style={{fontSize:11,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>Identity protected</div></div>
                      </div>
                      :<div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#730042,#CD166E)",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
                          {initials(ticket.submittedBy?.f_name,ticket.submittedBy?.l_name)}
                        </div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif"}}>{ticket.submittedBy?.f_name} {ticket.submittedBy?.l_name}</div>
                          <div style={{fontSize:11,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>{ticket.submittedBy?.work_email} · {ticket.submitterRole}</div>
                        </div>
                      </div>
                    }
                  </div>

                  {/* Against (if any) */}
                  {ticket.against&&(
                    <div style={{background:"#FFF1F2",borderRadius:14,padding:"14px 16px",marginBottom:16,border:"1px solid #FCA5A5"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#991B1B",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>⚠ Complaint Against</div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif"}}>{ticket.against?.f_name} {ticket.against?.l_name}</div>
                      <div style={{fontSize:11,color:"#6B7280",fontFamily:"'DM Sans',sans-serif"}}>{ticket.against?.work_email} · {ticket.againstDept}</div>
                    </div>
                  )}

                  {/* Description */}
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#9B8BAE",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>Description</div>
                    <div style={{fontSize:13,color:"#3A2C50",lineHeight:1.7,fontFamily:"'DM Sans',sans-serif",background:"#FAF7FD",borderRadius:12,padding:"14px",borderLeft:"3px solid #D4AECB"}}>{ticket.description}</div>
                  </div>

                  {/* Details grid */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                    {[
                      {l:"Category",    v:CATEGORY_LABELS[ticket.category]||ticket.category},
                      {l:"Severity",    v:<SevChip sev={ticket.severity}/>},
                      {l:"Created",     v:fmtTime(ticket.createdAt)},
                      {l:"SLA Deadline",v:fmt(ticket.slaDeadline)},
                      {l:"Incident Date",v:ticket.incidentDate?fmt(ticket.incidentDate):"Not specified"},
                      {l:"Location",    v:ticket.incidentLocation||"Not specified"},
                      {l:"Confidentiality",v:ticket.confidentialityLevel?.replace(/_/g," ")},
                      {l:"Resolved",    v:ticket.resolvedAt?fmt(ticket.resolvedAt):"Pending"},
                    ].map(({l,v})=>(
                      <div key={l} style={{background:"#FAF7FD",borderRadius:10,padding:"10px 14px"}}>
                        <div style={{fontSize:10,fontWeight:600,color:"#9B8BAE",textTransform:"uppercase",letterSpacing:".4px",fontFamily:"'DM Sans',sans-serif",marginBottom:4}}>{l}</div>
                        <div style={{fontSize:12,color:"#3A2C50",fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>{typeof v==="string"?v:v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Witnesses */}
                  {ticket.witnessNames?.length>0&&(
                    <div style={{background:"#FFFBEB",borderRadius:12,padding:"12px 14px",marginBottom:16,border:"1px solid #FCD34D"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#92400E",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Witnesses</div>
                      {ticket.witnessNames.map((w,i)=><div key={i} style={{fontSize:12,color:"#7A5C1A",fontFamily:"'DM Sans',sans-serif"}}>• {w}</div>)}
                    </div>
                  )}

                  {/* Attachments */}
                  {ticket.attachments?.length>0&&(
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:"#9B8BAE",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>Attachments ({ticket.attachments.length})</div>
                      {ticket.attachments.map((a,i)=>(
                        <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:10,background:"#F4EEF9",border:"1px solid #E5DAF0",textDecoration:"none",color:"#4A3860",fontSize:12,fontFamily:"'DM Sans',sans-serif",marginBottom:6}}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 12V2a1 1 0 011-1h6l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1z" stroke="#8B3A8A" strokeWidth="1" fill="none"/><path d="M8 1v3h3" stroke="#8B3A8A" strokeWidth="1"/></svg>
                          {a.originalName||"Attachment"}
                          {a.sizeKb&&<span style={{marginLeft:"auto",fontSize:10,color:"#9B8BAE"}}>{a.sizeKb}KB</span>}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Resolution / rejection */}
                  {ticket.resolutionSummary&&(
                    <div style={{background:"#F0FDF4",borderRadius:12,padding:"14px",border:"1px solid #86EFAC",marginTop:12}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#14803D",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Resolution Summary</div>
                      <div style={{fontSize:13,color:"#065F46",fontFamily:"'DM Sans',sans-serif",lineHeight:1.6}}>{ticket.resolutionSummary}</div>
                    </div>
                  )}
                  {ticket.rejectionReason&&(
                    <div style={{background:"#FEF2F2",borderRadius:12,padding:"14px",border:"1px solid #FCA5A5",marginTop:12}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#991B1B",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Rejection Reason</div>
                      <div style={{fontSize:13,color:"#7F1D1D",fontFamily:"'DM Sans',sans-serif",lineHeight:1.6}}>{ticket.rejectionReason}</div>
                    </div>
                  )}

                  {/* Submitter rating */}
                  {ticket.submitterRating&&(
                    <div style={{background:"#FFFBEB",borderRadius:12,padding:"14px",border:"1px solid #FCD34D",marginTop:12}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#92400E",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Submitter Rating</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:20}}>{"★".repeat(ticket.submitterRating)}{"☆".repeat(5-ticket.submitterRating)}</span>
                        <span style={{fontSize:12,color:"#92400E",fontFamily:"'DM Sans',sans-serif"}}>{ticket.submitterFeedback}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TIMELINE TAB ── */}
              {drawerTab==="timeline"&&(
                <div>
                  {(!ticket.timeline||ticket.timeline.length===0)
                    ?<Empty msg="No timeline entries yet"/>
                    :[...ticket.timeline].reverse().map((entry,i,arr)=>{
                      const actionColors = {
                        ticket_created:      "#730042",
                        status_changed:      "#1D4ED8",
                        note_added:          "#065F46",
                        internal_note_added: "#6B21A8",
                        priority_changed:    "#9A3412",
                        escalated:           "#991B1B",
                        reopened:            "#F59E0B",
                        resolved:            "#14803D",
                        acknowledgement_sent:"#3B82F6",
                        rating_submitted:    "#F59E0B",
                      };
                      const dotColor = actionColors[entry.action]||"#730042";
                      const isLast   = i===arr.length-1;
                      return (
                        <div key={entry._id||i} style={{display:"flex",gap:12,marginBottom:isLast?0:4}}>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:10,flexShrink:0}}>
                            <div className="timeline-dot" style={{background:dotColor,border:`2px solid white`,boxShadow:`0 0 0 2px ${dotColor}44`}}/>
                            {!isLast&&<div className="timeline-line"/>}
                          </div>
                          <div style={{flex:1,paddingBottom:isLast?0:16}}>
                            <div style={{fontSize:11,fontWeight:700,color:dotColor,textTransform:"capitalize",letterSpacing:".3px",fontFamily:"'DM Sans',sans-serif"}}>
                              {entry.action.replace(/_/g," ")}
                            </div>
                            {entry.fromStatus&&entry.toStatus&&(
                              <div style={{fontSize:11,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif",marginTop:2,display:"flex",alignItems:"center",gap:4}}>
                                <StatusChip status={entry.fromStatus}/>
                                <span style={{color:"#C4AADA"}}>→</span>
                                <StatusChip status={entry.toStatus}/>
                              </div>
                            )}
                            {(entry.note||entry.internalNote)&&(
                              <div style={{background: entry.internalNote?"#FAF5FF":"#FAF7FD",borderRadius:8,padding:"8px 12px",marginTop:6,fontSize:12,color:"#4A3860",fontFamily:"'DM Sans',sans-serif",lineHeight:1.5,borderLeft:`3px solid ${entry.internalNote?"#8B5CF6":"#D4AECB"}`}}>
                                {entry.internalNote&&<span style={{fontSize:10,fontWeight:700,color:"#6B21A8",display:"block",marginBottom:3}}>🔒 Internal</span>}
                                {entry.note||entry.internalNote}
                              </div>
                            )}
                            <div style={{fontSize:10,color:"#C4AADA",fontFamily:"'DM Sans',sans-serif",marginTop:4,display:"flex",gap:6}}>
                              <span>{fmtTime(entry.timestamp)}</span>
                              {entry.byName&&<span>· {entry.byName}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}

              {/* ── NOTES TAB ── */}
              {drawerTab==="notes"&&(
                <div>
                  <div style={{background:"#FAF5FF",borderRadius:12,padding:"12px 14px",marginBottom:16,border:"1px solid #DDD6FE",fontSize:12,color:"#5B21B6",fontFamily:"'DM Sans',sans-serif"}}>
                    🔒 Internal notes are only visible to Super Admin. They are part of the audit trail.
                  </div>
                  {ticket.internalNotes?.length===0&&<Empty msg="No internal notes yet"/>}
                  {[...(ticket.internalNotes||[])].reverse().map((n,i)=>(
                    <div key={i} style={{background:"#FAF5FF",borderRadius:12,padding:"14px",border:"1px solid #DDD6FE",marginBottom:10}}>
                      <div style={{fontSize:12,color:"#3730A3",fontFamily:"'DM Sans',sans-serif",lineHeight:1.6}}>{n.note}</div>
                      <div style={{fontSize:10,color:"#8B5CF6",fontFamily:"'DM Sans',sans-serif",marginTop:6}}>{fmtTime(n.addedAt)} · {n.byName}</div>
                    </div>
                  ))}
                  {ticket.superAdminNote&&(
                    <div style={{background:"#F0FDF4",borderRadius:12,padding:"14px",border:"1px solid #86EFAC",marginTop:12}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#14803D",textTransform:"uppercase",letterSpacing:".4px",marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Last Public Note to Submitter</div>
                      <div style={{fontSize:12,color:"#065F46",fontFamily:"'DM Sans',sans-serif",lineHeight:1.6}}>{ticket.superAdminNote}</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ACTIONS TAB ── */}
              {drawerTab==="actions"&&(
                <div style={{display:"flex",flexDirection:"column",gap:18}}>
                  {/* Change status */}
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#9B8BAE",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>Change Status</div>
                    <select className="tk-input" value={newStatus} onChange={e=>setNewStatus(e.target.value)} style={{marginBottom:0}}>
                      <option value="">— Keep current ({ticket.status}) —</option>
                      {STATUS_FLOW.filter(s=>s!==ticket.status).map(s=><option key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                    </select>
                  </div>

                  {/* Public note */}
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#9B8BAE",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>Reply / Public Note <span style={{fontWeight:400,textTransform:"none"}}>(visible to submitter)</span></div>
                    <textarea className="tk-input" rows={3} value={pubNote} onChange={e=>setPubNote(e.target.value)} placeholder="Write a response to the submitter…" style={{resize:"vertical",lineHeight:1.6}}/>
                  </div>

                  {/* Internal note */}
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#6B21A8",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>🔒 Internal Note <span style={{fontWeight:400,textTransform:"none",color:"#9B8BAE"}}>(superadmin only, audit trail)</span></div>
                    <textarea className="tk-input" rows={3} value={intNote} onChange={e=>setIntNote(e.target.value)} placeholder="Private notes about this ticket (evidence, investigation details)…" style={{resize:"vertical",lineHeight:1.6,borderColor:"#DDD6FE"}}/>
                  </div>

                  {/* Resolution summary (if resolving) */}
                  {newStatus==="resolved"&&(
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:"#14803D",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>Resolution Summary</div>
                      <textarea className="tk-input" rows={3} value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Describe how this ticket was resolved…" style={{resize:"vertical",lineHeight:1.6,borderColor:"#86EFAC"}}/>
                    </div>
                  )}

                  {/* Rejection reason */}
                  {newStatus==="rejected"&&(
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:"#991B1B",textTransform:"uppercase",letterSpacing:".6px",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>Rejection Reason</div>
                      <textarea className="tk-input" rows={2} value={rejReason} onChange={e=>setRejReason(e.target.value)} placeholder="Explain why this ticket is being rejected…" style={{resize:"vertical",lineHeight:1.6,borderColor:"#FCA5A5"}}/>
                    </div>
                  )}

                  {/* Submit update */}
                  <button className="tk-btn" disabled={processing||(!newStatus&&!pubNote&&!intNote)} onClick={handleUpdate}
                    style={{background:"linear-gradient(135deg,#730042,#CD166E)",color:"#fff",padding:"12px 24px",borderRadius:12,fontSize:13,opacity:(!newStatus&&!pubNote&&!intNote)||processing?.6:1,cursor:(!newStatus&&!pubNote&&!intNote)||processing?"not-allowed":"pointer",boxShadow:"0 4px 16px rgba(115,0,66,.3)"}}>
                    {processing
                      ?<><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .6s linear infinite"}}/>Updating…</>
                      :"Save Changes →"
                    }
                  </button>

                  <div style={{height:1,background:"#F0EAF8"}}/>

                  {/* Danger zone */}
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#9B8BAE",textTransform:"uppercase",letterSpacing:".6px",marginBottom:10,fontFamily:"'DM Sans',sans-serif"}}>Quick Actions</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {!ticket.isEscalated&&(
                        <button className="tk-btn" onClick={handleEscalate} disabled={processing}
                          style={{background:"#FFF7ED",color:"#9A3412",border:"1px solid #FED7AA"}}>
                          🔺 Escalate
                        </button>
                      )}
                      <button className="tk-btn" onClick={handleDelete} disabled={processing}
                        style={{background:"#FEF2F2",color:"#991B1B",border:"1px solid #FCA5A5"}}>
                        🗑 Archive
                      </button>
                    </div>
                  </div>

                  {/* SLA info */}
                  <div style={{background:"#FFFBEB",borderRadius:12,padding:"12px 14px",border:"1px solid #FCD34D",fontSize:12,color:"#92400E",fontFamily:"'DM Sans',sans-serif",lineHeight:1.6}}>
                    <strong>SLA Deadline:</strong> {fmt(ticket.slaDeadline)}<br/>
                    <strong>First Response:</strong> {ticket.acknowledgedAt?`${ticket.firstResponseHours}h`:"Not yet acknowledged"}<br/>
                    {ticket.resolvedAt&&<><strong>Resolution Time:</strong> {ticket.resolutionTimeHours}h</>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════
   FILTER BAR
═══════════════════════════════════════════════ */
const FilterBar = ({filters,setFilters}) => {
  const TYPE_OPTS   = ["","suggestion","complaint","posh","grievance","whistleblower"];
  const STATUS_OPTS = ["","open","acknowledged","under_review","action_taken","resolved","closed","rejected","reopened"];
  const SEV_OPTS    = ["","low","medium","high","critical"];

  return (
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18,alignItems:"center"}}>
      {/* Search */}
      <div style={{position:"relative",flex:"1 1 200px",minWidth:180}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
          <circle cx="11" cy="11" r="8" stroke="#C4AADA" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="#C4AADA" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input className="tk-input" style={{paddingLeft:30}} placeholder="Search ticket number, title…" value={filters.search||""} onChange={e=>setFilters(p=>({...p,search:e.target.value,page:1}))}/>
      </div>

      {/* Type */}
      <select className="tk-input" style={{flex:"0 1 140px",width:"auto"}} value={filters.type||""} onChange={e=>setFilters(p=>({...p,type:e.target.value,page:1}))}>
        <option value="">All Types</option>
        {TYPE_OPTS.filter(Boolean).map(t=><option key={t} value={t}>{TYPE_META[t]?.label||t}</option>)}
      </select>

      {/* Status */}
      <select className="tk-input" style={{flex:"0 1 150px",width:"auto"}} value={filters.status||""} onChange={e=>setFilters(p=>({...p,status:e.target.value,page:1}))}>
        <option value="">All Statuses</option>
        {STATUS_OPTS.filter(Boolean).map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
      </select>

      {/* Severity */}
      <select className="tk-input" style={{flex:"0 1 130px",width:"auto"}} value={filters.severity||""} onChange={e=>setFilters(p=>({...p,severity:e.target.value,page:1}))}>
        <option value="">All Severities</option>
        {SEV_OPTS.filter(Boolean).map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
      </select>

      {/* Overdue toggle */}
      <button className="tk-btn" onClick={()=>setFilters(p=>({...p,isOverdue:p.isOverdue?"":true,page:1}))}
        style={{background:filters.isOverdue?"#FEF2F2":"#fff",color:filters.isOverdue?"#991B1B":"#9B8BAE",border:`1.5px solid ${filters.isOverdue?"#FCA5A5":"#E2D8EE"}`}}>
        ⚠ Overdue
      </button>

      {/* Reset */}
      {(filters.search||filters.type||filters.status||filters.severity||filters.isOverdue)&&(
        <button className="tk-btn" onClick={()=>setFilters({page:1,limit:20})} style={{background:"#F4EEF9",color:"#6B1A4A",border:"1.5px solid #DFD0EC"}}>
          ✕ Clear
        </button>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function SuperAdminTicketSystem() {
  const [filters,     setFilters]     = useState({ page:1, limit:20, sortBy:"createdAt", sortOrder:"desc" });
  const [selectedId,  setSelectedId]  = useState(null);
  const [activeTab,   setActiveTab]   = useState("all");
  const [toast,       setToast]       = useState({ visible:false, message:"", type:"success" });

  // Map quick-tab to filter
  const TAB_FILTERS = {
    all:           {},
    posh:          { type:"posh" },
    critical:      { severity:"critical" },
    overdue:       { isOverdue:"true" },
    open:          { status:"open" },
    resolved:      { status:"resolved" },
  };

  const activeFilters = { ...filters, ...TAB_FILTERS[activeTab] };
  const { data, isLoading, isFetching } = useGetAllTickets(activeFilters);

  const tickets = data?.tickets || [];
  const stats   = data?.stats   || {};
  const pagination = data?.pagination || {};

  const showToast = (message, type="success") => {
    setToast({ visible:true, message, type });
    setTimeout(()=>setToast(p=>({...p,visible:false})), 3500);
  };

  const TABS = [
    { key:"all",      label:"All Tickets",  count: pagination.total },
    { key:"posh",     label:"🔴 POSH",      count: stats.byType?.posh||0, alert:true },
    { key:"critical", label:"⚡ Critical",   count: stats.byType?.complaint||0 },
    { key:"overdue",  label:"⚠ Overdue",    count: stats.overdue||0, alert:(stats.overdue||0)>0 },
    { key:"open",     label:"Open",         count: stats.byStatus?.open||0 },
    { key:"resolved", label:"Resolved",     count: stats.byStatus?.resolved||0 },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F7F3FC 0%,#F0EBF8 50%,#F4F0FA 100%)", fontFamily:"'DM Sans',sans-serif", padding:"32px 36px" }}>
      <GlobalStyles/>

      {/* Decorative blobs */}
      <div style={{position:"fixed",top:-80,right:-80,width:360,height:360,borderRadius:"50%",background:"radial-gradient(circle,rgba(205,22,110,.06) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:-60,left:-60,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,rgba(115,0,66,.05) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      <div style={{position:"relative",zIndex:1,maxWidth:1200,margin:"0 auto"}}>

        {/* ── Page Header ── */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:54,height:54,borderRadius:18,background:"linear-gradient(135deg,#730042,#CD166E)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 6px 22px rgba(115,0,66,.38)",fontSize:22}}>🎫</div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <h1 style={{fontSize:22,fontWeight:700,color:"#1C1028",margin:0,fontFamily:"'Playfair Display',serif",letterSpacing:"-.3px"}}>Tickets & Grievances</h1>
                <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"linear-gradient(135deg,#730042,#CD166E)",color:"#fff",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 2px 8px rgba(115,0,66,.3)"}}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 8L2.5 3L5 6L7.5 2L9 8H1Z" fill="rgba(255,255,255,.9)"/></svg>
                  Super Admin
                </span>
              </div>
              <p style={{fontSize:12,color:"#9B8BAE",margin:"3px 0 0",fontWeight:400}}>Suggestions · Complaints · POSH · Grievances · Whistleblower</p>
            </div>
          </div>

          {isFetching&&!isLoading&&(
            <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif",padding:"8px 14px",background:"#fff",borderRadius:10,border:"1px solid #E5DAF0"}}>
              <div style={{width:12,height:12,border:"2px solid #E5DAF0",borderTop:"2px solid #730042",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
              Refreshing…
            </div>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <StatCards stats={stats} loading={isLoading}/>

        {/* ── Quick Tabs ── */}
        <div style={{display:"flex",gap:4,background:"rgba(235,228,245,.6)",backdropFilter:"blur(8px)",borderRadius:14,padding:4,marginBottom:20,width:"fit-content",border:"1px solid rgba(200,185,220,.3)",boxShadow:"0 2px 8px rgba(80,40,100,.06)",flexWrap:"wrap"}}>
          {TABS.map(t=>{
            const active = activeTab===t.key;
            return (
              <button key={t.key} className="tk-tab" style={{color:active?"#fff":"#9B8BAE",background:active?"linear-gradient(135deg,#730042,#CD166E)":"transparent",fontWeight:active?600:400,boxShadow:active?"0 2px 10px rgba(115,0,66,.28)":"none",display:"inline-flex",alignItems:"center",gap:6,position:"relative"}}
                onClick={()=>{setActiveTab(t.key);setFilters(p=>({...p,page:1}));}}>
                {t.label}
                <span style={{background:active?"rgba(255,255,255,.22)":"#EDE6F5",color:active?"#fff":"#9B8BAE",borderRadius:10,padding:"1px 7px",fontSize:11,fontWeight:700}}>{t.count||0}</span>
                {t.alert&&(t.count||0)>0&&!active&&<span style={{position:"absolute",top:4,right:4,width:6,height:6,borderRadius:"50%",background:"#EF4444",animation:"pulse 1.5s infinite"}}/>}
              </button>
            );
          })}
        </div>

        {/* ── Filter Bar ── */}
        {activeTab==="all"&&<FilterBar filters={filters} setFilters={setFilters}/>}

        {/* ── List + Detail layout ── */}
        <div style={{display:"grid",gridTemplateColumns:selectedId?"1fr":"1fr",gap:20}}>
          {/* List */}
          <div>
            {isLoading ? <Spinner/>
              : tickets.length===0 ? <Empty msg="No tickets match your filters"/>
              : tickets.map((t,i)=>(
                <TicketCard key={t._id} ticket={t} selected={selectedId?{_id:selectedId}:null} onClick={tk=>{setSelectedId(tk._id);}} idx={i}/>
              ))
            }

            {/* Pagination */}
            {pagination.pages>1&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:20}}>
                <button className="tk-btn" disabled={filters.page<=1} onClick={()=>setFilters(p=>({...p,page:p.page-1}))}
                  style={{background:"#fff",color:"#730042",border:"1.5px solid #E2D8EE",opacity:filters.page<=1?.4:1}}>← Prev</button>
                <span style={{fontSize:13,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif",padding:"0 12px"}}>
                  Page {pagination.page} of {pagination.pages} · {pagination.total} tickets
                </span>
                <button className="tk-btn" disabled={filters.page>=pagination.pages} onClick={()=>setFilters(p=>({...p,page:p.page+1}))}
                  style={{background:"#fff",color:"#730042",border:"1.5px solid #E2D8EE",opacity:filters.page>=pagination.pages?.4:1}}>Next →</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Drawer ── */}
      {selectedId&&<DetailDrawer ticketId={selectedId} onClose={()=>setSelectedId(null)} showToast={showToast}/>}

      <Toast toast={toast}/>
    </div>
  );
}