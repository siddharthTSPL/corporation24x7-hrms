import React, { useState, useCallback } from "react";
import { useManagerSubmitTicket, useManagerGetMyTickets, useManagerRateTicket, useGetManagerTicketDetail } from "../../auth/server-state/manager/managerticket/managerticket";

const C = {
  primary:  "#730042",
  accent:   "#CD166E",
  bg:       "#F8F4FB",
  card:     "#ffffff",
  border:   "rgba(115,0,66,.1)",
  muted:    "#A08CB8",
  text:     "#160D22",
  subtext:  "#5C4470",
  surface:  "#FBF8FE",
};

const TYPE_META = {
  suggestion:    { label:"Suggestion",    bg:"#ECFDF5", color:"#065F46", dot:"#10B981", icon:"💡" },
  complaint:     { label:"Complaint",     bg:"#FFFBEB", color:"#78350F", dot:"#F59E0B", icon:"📋" },
  posh:          { label:"POSH",          bg:"#FEF2F2", color:"#7F1D1D", dot:"#EF4444", icon:"🔴" },
  grievance:     { label:"Grievance",     bg:"#EDE9FE", color:"#4C1D95", dot:"#7C3AED", icon:"⚖️" },
  whistleblower: { label:"Whistleblower", bg:"#EFF6FF", color:"#1E3A5F", dot:"#3B82F6", icon:"🔒" },
};

const STATUS_META = {
  open:         { label:"Open",          bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  acknowledged: { label:"Acknowledged",  bg:"#EFF6FF", color:"#1D4ED8", dot:"#3B82F6" },
  under_review: { label:"Under Review",  bg:"#F5F3FF", color:"#5B21B6", dot:"#8B5CF6" },
  action_taken: { label:"Action Taken",  bg:"#ECFDF5", color:"#065F46", dot:"#10B981" },
  resolved:     { label:"Resolved",      bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  closed:       { label:"Closed",        bg:"#F3F4F6", color:"#374151", dot:"#9CA3AF" },
  rejected:     { label:"Rejected",      bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
  reopened:     { label:"Reopened",      bg:"#FFF7ED", color:"#9A3412", dot:"#F97316" },
};

const SEV_META = {
  low:      { label:"Low",      bg:"#F0FDF4", color:"#065F46" },
  medium:   { label:"Medium",   bg:"#FFFBEB", color:"#78350F" },
  high:     { label:"High",     bg:"#FFF7ED", color:"#9A3412" },
  critical: { label:"Critical", bg:"#FEF2F2", color:"#7F1D1D" },
};

const CATEGORIES = {
  complaint:     ["manager_behavior","colleague_behavior","discrimination","workplace_violence","hostile_work_environment","inappropriate_behavior","other"],
  posh:          ["sexual_harassment","inappropriate_behavior","hostile_work_environment","other"],
  grievance:     ["compensation_issue","workload_stress","unfair_treatment","policy_violation","other"],
  suggestion:    ["process_improvement","technology_tools","policy_feedback","culture_diversity","benefits_perks","training_development","other"],
  whistleblower: ["financial_fraud","data_breach","safety_violation","legal_compliance","other"],
};

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

const TL_COLORS = {
  ticket_created:"#CD166E", status_changed:"#3B82F6", note_added:"#10B981",
  internal_note_added:"#7C3AED", priority_changed:"#F97316",
  escalated:"#EF4444", acknowledgement_sent:"#3B82F6", rating_submitted:"#F59E0B",
};

const fmt     = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const fmtFull = (d) => d ? new Date(d).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";
const timeAgo = (d) => {
  if (!d) return "";
  const diff = Math.floor((Date.now()-new Date(d))/60000);
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
};

const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    @keyframes spin    { to { transform:rotate(360deg); } }
    @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideIn { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }

    .m-card {
      background:#fff; border-radius:14px; border:1px solid rgba(115,0,66,.08);
      padding:16px 20px; margin-bottom:8px;
      box-shadow:0 1px 6px rgba(80,20,90,.05);
      transition:box-shadow .2s,border-color .2s,transform .2s;
      animation:fadeUp .3s ease both; cursor:pointer;
    }
    .m-card:hover { box-shadow:0 6px 24px rgba(115,0,66,.12); border-color:rgba(115,0,66,.22); transform:translateY(-2px); }
    .m-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:9px 18px; border-radius:10px; border:none;
      font-size:13px; font-weight:600; cursor:pointer;
      font-family:'Instrument Sans',sans-serif; transition:all .18s ease;
    }
    .m-btn:hover  { transform:translateY(-1px); filter:brightness(1.06); }
    .m-btn:active { transform:translateY(0); }
    .m-btn:disabled { opacity:.45; cursor:not-allowed; transform:none!important; filter:none!important; }
    .m-input {
      width:100%; padding:10px 14px; border-radius:10px;
      font-size:13px; font-family:'Instrument Sans',sans-serif; color:#160D22;
      background:#FDFBFF; border:1.5px solid rgba(115,0,66,.12); outline:none;
      transition:border .2s,box-shadow .2s;
    }
    .m-input:focus { border-color:#730042; box-shadow:0 0 0 3px rgba(115,0,66,.08); }
    .m-chip {
      display:inline-flex; align-items:center; gap:4px;
      padding:3px 9px; border-radius:20px;
      font-size:11px; font-weight:600; font-family:'Instrument Sans',sans-serif;
    }
    .m-detail { animation:slideIn .26s ease both; }
    .m-tab-active { background:#730042; color:#fff; box-shadow:0 2px 10px rgba(115,0,66,.3); }
    .m-tab-idle   { background:transparent; color:#A08CB8; }
    .m-tab-idle:hover { background:rgba(115,0,66,.06); color:#730042; }
    .m-skeleton {
      background:linear-gradient(90deg,#EDE6F5 25%,#F5F0FC 50%,#EDE6F5 75%);
      background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:8px;
    }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-thumb { background:#DDD4EE; border-radius:4px; }
  `}</style>
);

const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"64px 0",flexDirection:"column",gap:10}}>
    <div style={{width:32,height:32,border:"2.5px solid #EDE6F5",borderTop:`2.5px solid ${C.primary}`,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    <p style={{fontSize:12,color:C.muted,fontFamily:"'Instrument Sans',sans-serif",margin:0}}>Loading…</p>
  </div>
);

const SkeletonDetail = () => (
  <div style={{display:"flex",flexDirection:"column",gap:12,padding:24}}>
    {[200,120,80,160,100].map((w,i)=>(
      <div key={i} className="m-skeleton" style={{height:16,width:`${w}px`,maxWidth:"100%"}}/>
    ))}
  </div>
);

const Lbl = ({children,req}) => (
  <div style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:".6px",marginBottom:6,fontFamily:"'Instrument Sans',sans-serif"}}>
    {children}{req&&<span style={{color:C.accent,marginLeft:2}}>*</span>}
  </div>
);

const TypeChip = ({type}) => {
  const m = TYPE_META[type]||{label:type,bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF",icon:"📌"};
  return <span className="m-chip" style={{background:m.bg,color:m.color}}>{m.icon} {m.label}</span>;
};

const StatusChip = ({status}) => {
  const m = STATUS_META[status]||{label:status,bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF"};
  return <span className="m-chip" style={{background:m.bg,color:m.color}}><span style={{width:5,height:5,borderRadius:"50%",background:m.dot,display:"inline-block"}}/>{m.label}</span>;
};

const SevChip = ({sev}) => {
  const m = SEV_META[sev]||{label:sev,bg:"#F3F4F6",color:"#374151"};
  return <span className="m-chip" style={{background:m.bg,color:m.color}}>{m.label}</span>;
};

const InfoRow = ({label,val}) => (
  <div style={{display:"flex",flexDirection:"column",gap:3,padding:"10px 14px",borderRadius:10,background:C.surface,border:`1px solid ${C.border}`}}>
    <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",fontFamily:"'Instrument Sans',sans-serif"}}>{label}</span>
    <span style={{fontSize:12.5,color:C.text,fontWeight:500,fontFamily:"'Instrument Sans',sans-serif"}}>{val||"—"}</span>
  </div>
);

const BLANK = {
  type:"complaint",category:"",subCategory:"",title:"",description:"",
  incidentDate:"",incidentLocation:"",witnessNames:"",severity:"medium",isAnonymous:false,
};

function SubmitForm({onSuccess}) {
  const [form,setForm]   = useState(BLANK);
  const [toast,setToast] = useState(null);
  const mut = useManagerSubmitTicket();

  const set = useCallback((k,v)=>setForm(p=>({...p,[k]:v,...(k==="type"?{category:"",subCategory:""}:{})})),[]);

  const toast$ = useCallback((msg,kind="ok")=>{
    setToast({msg,kind});
    setTimeout(()=>setToast(null),3500);
  },[]);

  const submit = async () => {
    if (!form.title.trim()||!form.description.trim()||!form.category){
      toast$("Please fill in all required fields.","err"); return;
    }
    try {
      await mut.mutateAsync({
        ...form,
        witnessNames:form.witnessNames?form.witnessNames.split(",").map(s=>s.trim()).filter(Boolean):[],
      });
      toast$("Ticket submitted successfully! 🎉");
      setForm(BLANK);
      onSuccess?.();
    } catch(e){
      toast$(e?.response?.data?.message||"Submission failed.","err");
    }
  };

  const cats = CATEGORIES[form.type]||[];

  return (
    <div style={{background:"#fff",borderRadius:18,border:`1px solid ${C.border}`,padding:28,boxShadow:"0 4px 24px rgba(80,20,90,.06)"}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:26}}>
        <div style={{width:46,height:46,borderRadius:14,background:`linear-gradient(135deg,${C.primary},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 16px rgba(115,0,66,.28)",flexShrink:0}}>📝</div>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:"'Syne',sans-serif",lineHeight:1.2}}>New Ticket</div>
          <div style={{fontSize:12,color:C.muted,fontFamily:"'Instrument Sans',sans-serif",marginTop:2}}>Your submission is handled confidentially</div>
        </div>
        <span style={{marginLeft:"auto",padding:"4px 12px",borderRadius:20,background:"rgba(115,0,66,.07)",color:C.primary,fontSize:11,fontWeight:600,fontFamily:"'Instrument Sans',sans-serif",border:`1px solid rgba(115,0,66,.14)`}}>Manager</span>
      </div>

      <div style={{marginBottom:18}}>
        <Lbl req>Ticket Type</Lbl>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {Object.entries(TYPE_META).map(([k,m])=>(
            <button key={k} onClick={()=>set("type",k)}
              style={{padding:"7px 14px",borderRadius:10,border:`1.5px solid ${form.type===k?C.primary:"rgba(115,0,66,.12)"}`,background:form.type===k?`linear-gradient(135deg,${C.primary},${C.accent})`:C.surface,color:form.type===k?"#fff":C.subtext,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Instrument Sans',sans-serif",transition:"all .18s",display:"flex",alignItems:"center",gap:5}}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <div>
          <Lbl req>Category</Lbl>
          <select className="m-input" value={form.category} onChange={e=>set("category",e.target.value)}>
            <option value="">Select category…</option>
            {cats.map(c=><option key={c} value={c}>{CAT_LABELS[c]||c}</option>)}
          </select>
        </div>
        <div>
          <Lbl>Severity</Lbl>
          <select className="m-input" value={form.severity} onChange={e=>set("severity",e.target.value)}>
            {Object.entries(SEV_META).map(([k,m])=><option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{marginBottom:16}}>
        <Lbl req>Title</Lbl>
        <input className="m-input" value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Brief, clear title for your ticket…" maxLength={120}/>
      </div>

      <div style={{marginBottom:16}}>
        <Lbl req>Description</Lbl>
        <textarea className="m-input" rows={4} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Describe the issue in detail. Include dates, people involved, and what happened…" style={{resize:"vertical",lineHeight:1.7}}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <div>
          <Lbl>Incident Date</Lbl>
          <input className="m-input" type="date" value={form.incidentDate} onChange={e=>set("incidentDate",e.target.value)}/>
        </div>
        <div>
          <Lbl>Location</Lbl>
          <input className="m-input" value={form.incidentLocation} onChange={e=>set("incidentLocation",e.target.value)} placeholder="Office floor, remote, etc."/>
        </div>
      </div>

      <div style={{marginBottom:20}}>
        <Lbl>Witness Names <span style={{fontWeight:400,textTransform:"none",fontSize:10}}>(comma-separated)</span></Lbl>
        <input className="m-input" value={form.witnessNames} onChange={e=>set("witnessNames",e.target.value)} placeholder="John Doe, Jane Smith"/>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24,background:"#F5F0FE",borderRadius:12,padding:"12px 16px",border:"1px solid rgba(124,58,237,.12)"}}>
        <button onClick={()=>set("isAnonymous",!form.isAnonymous)}
          style={{width:42,height:24,borderRadius:12,border:"none",cursor:"pointer",background:form.isAnonymous?`linear-gradient(135deg,${C.primary},${C.accent})`:"#DDD6F0",transition:"background .2s",position:"relative",flexShrink:0}}>
          <span style={{position:"absolute",top:3,left:form.isAnonymous?20:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.18)"}}/>
        </button>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:"#5B21B6",fontFamily:"'Instrument Sans',sans-serif"}}>Submit Anonymously</div>
          <div style={{fontSize:11,color:"#8B5CF6",fontFamily:"'Instrument Sans',sans-serif"}}>Your identity will be hidden from Super Admin</div>
        </div>
      </div>

      <button className="m-btn" onClick={submit} disabled={mut.isPending}
        style={{background:`linear-gradient(135deg,${C.primary},${C.accent})`,color:"#fff",width:"100%",justifyContent:"center",padding:"13px",borderRadius:12,fontSize:14,boxShadow:"0 4px 18px rgba(115,0,66,.28)"}}>
        {mut.isPending
          ?<><div style={{width:15,height:15,border:"2px solid rgba(255,255,255,.35)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .6s linear infinite"}}/>Submitting…</>
          :"Submit Ticket →"}
      </button>

      {toast&&(
        <div style={{marginTop:12,padding:"10px 16px",borderRadius:10,fontSize:13,fontFamily:"'Instrument Sans',sans-serif",fontWeight:500,background:toast.kind==="ok"?"#F0FDF4":"#FEF2F2",color:toast.kind==="ok"?"#065F46":"#991B1B",border:`1px solid ${toast.kind==="ok"?"#86EFAC":"#FCA5A5"}`}}>
          {toast.kind==="ok"?"✅":"❌"} {toast.msg}
        </div>
      )}
    </div>
  );
}

function RateModal({ticket,onClose}) {
  const [rating,setRating]     = useState(0);
  const [feedback,setFeedback] = useState("");
  const mut = useManagerRateTicket();

  const submit = async () => {
    if (!rating) return;
    try {
      await mut.mutateAsync({ticketNumber:ticket.ticketNumber,rating,feedback});
      onClose();
    } catch(e){ console.error(e); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(16,4,28,.55)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)"}}>
      <div style={{background:"#fff",borderRadius:20,padding:28,width:380,boxShadow:"0 24px 64px rgba(0,0,0,.22)",animation:"fadeUp .24s ease both"}}>
        <div style={{fontSize:17,fontWeight:700,color:C.text,fontFamily:"'Syne',sans-serif",marginBottom:3}}>Rate Your Experience</div>
        <div style={{fontSize:12,color:C.muted,fontFamily:"'Instrument Sans',sans-serif",marginBottom:22}}>{ticket.ticketNumber} · {ticket.title}</div>
        <div style={{display:"flex",gap:4,marginBottom:18,justifyContent:"center"}}>
          {[1,2,3,4,5].map(n=>(
            <button key={n} onClick={()=>setRating(n)}
              style={{fontSize:32,background:"none",border:"none",cursor:"pointer",opacity:n<=rating?1:.25,transition:"all .15s",transform:n<=rating?"scale(1.12)":"scale(1)",color:"#F59E0B"}}>★</button>
          ))}
        </div>
        <textarea className="m-input" rows={3} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Optional feedback…" style={{marginBottom:18,resize:"none"}}/>
        <div style={{display:"flex",gap:10}}>
          <button className="m-btn" onClick={onClose} style={{background:C.surface,color:C.subtext,flex:1,justifyContent:"center",border:`1px solid ${C.border}`}}>Cancel</button>
          <button className="m-btn" onClick={submit} disabled={!rating||mut.isPending}
            style={{background:`linear-gradient(135deg,${C.primary},${C.accent})`,color:"#fff",flex:1,justifyContent:"center"}}>
            {mut.isPending?"Submitting…":"Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketDetail({ticketNumber,onBack,onRate}) {
  const {data,isLoading} = useGetManagerTicketDetail(ticketNumber);
  const [tab,setTab]     = useState("overview");
  const ticket = data?.ticket;
  const canRate = ticket&&["resolved","closed"].includes(ticket.status)&&!ticket.submitterRating;

  if (isLoading) return (
    <div className="m-detail">
      <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.primary,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Instrument Sans',sans-serif",marginBottom:16,padding:0}}>← Back to My Tickets</button>
      <div style={{background:"#fff",borderRadius:18,border:`1px solid ${C.border}`,overflow:"hidden",boxShadow:"0 4px 24px rgba(80,20,90,.06)"}}><SkeletonDetail/></div>
    </div>
  );

  if (!ticket) return (
    <div className="m-detail">
      <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.primary,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Instrument Sans',sans-serif",marginBottom:16,padding:0}}>← Back to My Tickets</button>
      <div style={{textAlign:"center",padding:"48px 0",color:C.muted,fontFamily:"'Instrument Sans',sans-serif"}}>Ticket not found.</div>
    </div>
  );

  const tm = TYPE_META[ticket.type]||{dot:C.primary};
  const TABS = [{key:"overview",label:"Overview"},{key:"timeline",label:`Timeline (${ticket.timeline?.length||0})`},{key:"updates",label:"Updates"}];

  return (
    <div className="m-detail">
      <button onClick={onBack} style={{display:"inline-flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.primary,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Instrument Sans',sans-serif",marginBottom:16,padding:0}}>← Back to My Tickets</button>

      <div style={{background:"#fff",borderRadius:18,border:`1px solid ${C.border}`,overflow:"hidden",boxShadow:"0 4px 24px rgba(80,20,90,.06)"}}>
        <div style={{background:`linear-gradient(130deg,${C.primary}12,${C.accent}08)`,padding:"22px 26px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10,alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:C.muted,fontFamily:"'Instrument Sans',sans-serif",letterSpacing:".5px"}}>{ticket.ticketNumber}</span>
                <TypeChip type={ticket.type}/>
                <StatusChip status={ticket.status}/>
                <SevChip sev={ticket.severity}/>
                {ticket.isOverdue&&<span className="m-chip" style={{background:"#FEF2F2",color:"#991B1B",animation:"pulse 1.5s infinite"}}>⚠ Overdue</span>}
                {ticket.isEscalated&&<span className="m-chip" style={{background:"#FFF7ED",color:"#9A3412"}}>🔺 Escalated</span>}
              </div>
              <div style={{fontSize:19,fontWeight:700,color:C.text,fontFamily:"'Syne',sans-serif",lineHeight:1.3,marginBottom:4}}>{ticket.title}</div>
              <div style={{fontSize:12,color:C.muted,fontFamily:"'Instrument Sans',sans-serif"}}>Submitted {timeAgo(ticket.createdAt)} · SLA: {fmt(ticket.slaDeadline)}</div>
            </div>
            {canRate&&(
              <button className="m-btn" onClick={()=>onRate(ticket)} style={{background:"linear-gradient(135deg,#D97706,#F59E0B)",color:"#fff",flexShrink:0}}>⭐ Rate Resolution</button>
            )}
          </div>

          <div style={{display:"flex",gap:3,marginTop:18,background:"rgba(255,255,255,.7)",borderRadius:10,padding:3,width:"fit-content",border:`1px solid ${C.border}`}}>
            {TABS.map(t=>(
              <button key={t.key} onClick={()=>setTab(t.key)} className={tab===t.key?"m-tab-active":"m-tab-idle"}
                style={{padding:"6px 15px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:tab===t.key?600:400,fontFamily:"'Instrument Sans',sans-serif",transition:"all .18s"}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{padding:"22px 26px"}}>
          {tab==="overview"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,fontFamily:"'Instrument Sans',sans-serif"}}>Description</div>
                <div style={{fontSize:13,color:C.subtext,lineHeight:1.8,background:C.surface,borderRadius:12,padding:16,borderLeft:`3px solid ${tm.dot}`,border:`1px solid ${C.border}`,fontFamily:"'Instrument Sans',sans-serif"}}>{ticket.description}</div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <InfoRow label="Category"        val={CAT_LABELS[ticket.category]||ticket.category}/>
                <InfoRow label="Severity"        val={<SevChip sev={ticket.severity}/>}/>
                <InfoRow label="Created"         val={fmtFull(ticket.createdAt)}/>
                <InfoRow label="SLA Deadline"    val={fmt(ticket.slaDeadline)}/>
                <InfoRow label="Incident Date"   val={ticket.incidentDate?fmt(ticket.incidentDate):"Not specified"}/>
                <InfoRow label="Location"        val={ticket.incidentLocation||"Not specified"}/>
                <InfoRow label="Confidentiality" val={(ticket.confidentialityLevel||"").replace(/_/g," ")}/>
                <InfoRow label="Anonymous"       val={ticket.isAnonymous?"Yes":"No"}/>
              </div>

              {ticket.witnessNames?.length>0&&(
                <div style={{background:"#FFFBEB",borderRadius:12,padding:14,border:"1px solid rgba(245,158,11,.18)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#78350F",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,fontFamily:"'Instrument Sans',sans-serif"}}>Witnesses</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {ticket.witnessNames.map((w,i)=><span key={i} className="m-chip" style={{background:"#FEF3C7",color:"#78350F"}}>👤 {w}</span>)}
                  </div>
                </div>
              )}

              {ticket.resolutionSummary&&(
                <div style={{background:"#F0FDF4",borderRadius:12,padding:16,border:"1px solid rgba(34,197,94,.18)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#065F46",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,fontFamily:"'Instrument Sans',sans-serif"}}>✓ Resolution Summary</div>
                  <div style={{fontSize:13,color:"#166534",lineHeight:1.7,fontFamily:"'Instrument Sans',sans-serif"}}>{ticket.resolutionSummary}</div>
                </div>
              )}

              {ticket.rejectionReason&&(
                <div style={{background:"#FEF2F2",borderRadius:12,padding:16,border:"1px solid rgba(239,68,68,.18)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#7F1D1D",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,fontFamily:"'Instrument Sans',sans-serif"}}>✕ Rejection Reason</div>
                  <div style={{fontSize:13,color:"#7F1D1D",lineHeight:1.7,fontFamily:"'Instrument Sans',sans-serif"}}>{ticket.rejectionReason}</div>
                </div>
              )}

              {ticket.submitterRating&&(
                <div style={{background:"#FFFBEB",borderRadius:12,padding:14,border:"1px solid rgba(245,158,11,.18)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#78350F",textTransform:"uppercase",letterSpacing:".5px",marginBottom:6,fontFamily:"'Instrument Sans',sans-serif"}}>Your Rating</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18,color:"#D97706",letterSpacing:2}}>{"★".repeat(ticket.submitterRating)}{"☆".repeat(5-ticket.submitterRating)}</span>
                    {ticket.submitterFeedback&&<span style={{fontSize:12,color:"#78350F",fontFamily:"'Instrument Sans',sans-serif"}}>{ticket.submitterFeedback}</span>}
                  </div>
                </div>
              )}

              <div style={{background:C.surface,borderRadius:12,padding:16,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:12,fontFamily:"'Instrument Sans',sans-serif"}}>SLA Metrics</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:"'Instrument Sans',sans-serif",marginBottom:4}}>First Response</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Syne',sans-serif"}}>{ticket.firstResponseHours!=null?`${ticket.firstResponseHours}h`:"Pending"}</div>
                  </div>
                  {ticket.resolutionTimeHours!=null&&(
                    <div>
                      <div style={{fontSize:10,color:C.muted,fontFamily:"'Instrument Sans',sans-serif",marginBottom:4}}>Resolution</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#065F46",fontFamily:"'Syne',sans-serif"}}>{ticket.resolutionTimeHours}h</div>
                    </div>
                  )}
                  <div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:"'Instrument Sans',sans-serif",marginBottom:4}}>Reopened</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Syne',sans-serif"}}>{ticket.reopenCount||0}×</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab==="timeline"&&(
            <div>
              {!ticket.timeline?.length
                ?<div style={{textAlign:"center",padding:"40px 0",color:C.muted,fontFamily:"'Instrument Sans',sans-serif",fontSize:13}}>No timeline entries yet</div>
                :[...ticket.timeline].reverse().map((e,i,arr)=>{
                  const dot = TL_COLORS[e.action]||C.primary;
                  const isLast = i===arr.length-1;
                  return (
                    <div key={e._id||i} style={{display:"flex",gap:14,marginBottom:isLast?0:4,animation:`fadeUp .25s ease ${i*.04}s both`}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:10,flexShrink:0}}>
                        <div style={{width:10,height:10,borderRadius:"50%",background:dot,flexShrink:0,marginTop:4,boxShadow:`0 0 0 3px ${dot}22`}}/>
                        {!isLast&&<div style={{width:1.5,background:`${dot}30`,flex:1,margin:"4px auto",minHeight:14}}/>}
                      </div>
                      <div style={{flex:1,paddingBottom:isLast?0:18}}>
                        <div style={{fontSize:11,fontWeight:700,color:dot,textTransform:"capitalize",letterSpacing:".3px",fontFamily:"'Instrument Sans',sans-serif"}}>{e.action.replace(/_/g," ")}</div>
                        {e.fromStatus&&e.toStatus&&(
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5,flexWrap:"wrap"}}>
                            <StatusChip status={e.fromStatus}/><span style={{color:C.muted,fontSize:11}}>→</span><StatusChip status={e.toStatus}/>
                          </div>
                        )}
                        {e.note&&(
                          <div style={{background:C.surface,borderRadius:8,padding:"8px 12px",marginTop:6,fontSize:12,color:C.subtext,lineHeight:1.6,borderLeft:`2px solid ${dot}`,border:`1px solid ${C.border}`,fontFamily:"'Instrument Sans',sans-serif"}}>{e.note}</div>
                        )}
                        <div style={{fontSize:10,color:C.muted,marginTop:5,fontFamily:"'Instrument Sans',sans-serif"}}>
                          {fmtFull(e.timestamp)}{e.byName&&` · ${e.byName}`}
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}

          {tab==="updates"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {ticket.superAdminNote
                ?(
                  <div style={{background:"#F0FDF4",borderRadius:14,padding:18,border:"1px solid rgba(34,197,94,.2)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <span style={{fontSize:16}}>📩</span>
                      <span style={{fontSize:11,fontWeight:700,color:"#065F46",textTransform:"uppercase",letterSpacing:".5px",fontFamily:"'Instrument Sans',sans-serif"}}>Admin Reply</span>
                    </div>
                    <div style={{fontSize:13,color:"#166534",lineHeight:1.75,fontFamily:"'Instrument Sans',sans-serif"}}>{ticket.superAdminNote}</div>
                  </div>
                ):(
                  <div style={{textAlign:"center",padding:"28px 0",color:C.muted,fontFamily:"'Instrument Sans',sans-serif",fontSize:13}}>
                    <div style={{fontSize:28,marginBottom:8}}>📭</div>
                    No public replies from admin yet.
                  </div>
                )
              }

              {ticket.statusHistory?.length>0&&(
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10,fontFamily:"'Instrument Sans',sans-serif"}}>Status History</div>
                  {[...ticket.statusHistory].reverse().map((h,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.surface,borderRadius:10,marginBottom:6,border:`1px solid ${C.border}`,animation:`fadeUp .2s ease ${i*.04}s both`}}>
                      <StatusChip status={h.status}/>
                      <div style={{flex:1,fontSize:11,color:C.muted,fontFamily:"'Instrument Sans',sans-serif"}}>
                        {h.note&&<span style={{color:C.subtext}}>{h.note} · </span>}{fmtFull(h.changedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MyTickets() {
  const {data,isLoading}           = useManagerGetMyTickets();
  const [selected,setSelected]     = useState(null);
  const [rateTarget,setRateTarget] = useState(null);
  const tickets = data?.tickets||[];

  if (isLoading) return <Spinner/>;

  if (selected) return (
    <>
      <TicketDetail ticketNumber={selected} onBack={()=>setSelected(null)} onRate={t=>setRateTarget(t)}/>
      {rateTarget&&<RateModal ticket={rateTarget} onClose={()=>setRateTarget(null)}/>}
    </>
  );

  if (!tickets.length) return (
    <div style={{textAlign:"center",padding:"56px 0",color:C.muted,fontFamily:"'Instrument Sans',sans-serif"}}>
      <div style={{fontSize:44,marginBottom:12}}>🎫</div>
      <div style={{fontWeight:600,fontSize:14,color:C.subtext}}>No tickets submitted yet</div>
      <div style={{fontSize:12,marginTop:4}}>Use the Submit New tab to raise a ticket</div>
    </div>
  );

  return (
    <>
      {tickets.map((t,i)=>{
        const tm = TYPE_META[t.type]||{dot:C.primary};
        const canRate = ["resolved","closed"].includes(t.status)&&!t.submitterRating;
        return (
          <div key={t._id} className="m-card" style={{animationDelay:`${i*.05}s`,borderLeft:`3px solid ${tm.dot}`}} onClick={()=>setSelected(t.ticketNumber)}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8,alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:C.muted,fontFamily:"'Instrument Sans',sans-serif",letterSpacing:".4px"}}>{t.ticketNumber}</span>
                  <TypeChip type={t.type}/>
                  <StatusChip status={t.status}/>
                  {t.isAnonymous&&<span className="m-chip" style={{background:"#F3F4F6",color:"#6B7280"}}>Anonymous</span>}
                  {t.isOverdue&&<span className="m-chip" style={{background:"#FEF2F2",color:"#991B1B",animation:"pulse 1.5s infinite"}}>⚠ Overdue</span>}
                  {t.isEscalated&&<span className="m-chip" style={{background:"#FFF7ED",color:"#9A3412"}}>🔺 Escalated</span>}
                </div>
                <div style={{fontSize:13.5,fontWeight:600,color:C.text,fontFamily:"'Syne',sans-serif",marginBottom:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                <div style={{fontSize:11,color:C.muted,fontFamily:"'Instrument Sans',sans-serif"}}>
                  {CAT_LABELS[t.category]||t.category} · SLA: {fmt(t.slaDeadline)} · {timeAgo(t.createdAt)}
                </div>
                {t.superAdminNote&&(
                  <div style={{marginTop:10,background:"#F0FDF4",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#065F46",fontFamily:"'Instrument Sans',sans-serif",borderLeft:"3px solid #22C55E"}}>
                    <strong>Admin Reply:</strong> {t.superAdminNote}
                  </div>
                )}
                {t.submitterRating&&(
                  <div style={{marginTop:6,fontSize:11,color:"#92400E",fontFamily:"'Instrument Sans',sans-serif",letterSpacing:1}}>
                    {"★".repeat(t.submitterRating)}{"☆".repeat(5-t.submitterRating)} <span style={{letterSpacing:0}}>You rated this</span>
                  </div>
                )}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0}}>
                {canRate&&(
                  <button className="m-btn" onClick={e=>{e.stopPropagation();setRateTarget(t);}}
                    style={{background:"linear-gradient(135deg,#D97706,#F59E0B)",color:"#fff",fontSize:11,padding:"6px 12px"}}>⭐ Rate</button>
                )}
                <span style={{fontSize:10,color:C.muted,fontFamily:"'Instrument Sans',sans-serif"}}>Tap to view →</span>
              </div>
            </div>
          </div>
        );
      })}
      {rateTarget&&<RateModal ticket={rateTarget} onClose={()=>setRateTarget(null)}/>}
    </>
  );
}

export default function ManagerTickets() {
  const [tab,setTab] = useState("submit");
  const {data}       = useManagerGetMyTickets();
  const count        = data?.count||0;

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Instrument Sans',sans-serif",padding:"32px 36px"}}>
      <G/>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
        <div style={{width:50,height:50,borderRadius:16,background:`linear-gradient(135deg,${C.primary},${C.accent})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 6px 22px rgba(115,0,66,.32)",flexShrink:0}}>🎫</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:C.text,margin:0,fontFamily:"'Syne',sans-serif"}}>My Tickets</h1>
          <p style={{fontSize:12,color:C.muted,margin:"3px 0 0",fontFamily:"'Instrument Sans',sans-serif"}}>Manager · Submit &amp; track your grievances, complaints, and suggestions</p>
        </div>
      </div>

      <div style={{display:"flex",gap:3,background:"rgba(230,220,245,.55)",borderRadius:12,padding:4,marginBottom:26,width:"fit-content",border:`1px solid ${C.border}`}}>
        {[["submit","📝 Submit New"],["mytickets",`📋 My Tickets${count?` (${count})`:""}`]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className={tab===k?"m-tab-active":"m-tab-idle"}
            style={{padding:"8px 20px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12.5,fontWeight:tab===k?600:400,fontFamily:"'Instrument Sans',sans-serif",transition:"all .2s"}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{maxWidth:720}}>
        {tab==="submit"    &&<SubmitForm onSuccess={()=>setTab("mytickets")}/>}
        {tab==="mytickets" &&<MyTickets/>}
      </div>
    </div>
  );
}