

import React, { useState } from "react";
import { useSubmitTicket, useGetMyTickets, useRateTicket } from "../../auth/server-state/ticket/ticket.hook";

/* ─── palette matches TorchX brand ──────────────────────────────── */
const C = {
  primary:   "#730042",
  accent:    "#CD166E",
  bg:        "linear-gradient(160deg,#F7F3FC 0%,#F0EBF8 50%,#F4F0FA 100%)",
  card:      "#fff",
  border:    "rgba(180,155,210,.25)",
  muted:     "#9B8BAE",
  text:      "#1C1028",
  subtext:   "#6B5080",
};

/* ─── Global styles ──────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    @keyframes spin        { to { transform:rotate(360deg); } }
    @keyframes fadeSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:.45} }

    .emp-card {
      background:#fff; border-radius:16px; border:1px solid rgba(180,155,210,.25);
      padding:18px 20px; margin-bottom:10px;
      box-shadow:0 2px 10px rgba(60,20,80,.06);
      transition:all .22s ease; animation:fadeSlideUp .3s ease both;
    }
    .emp-btn {
      display:inline-flex; align-items:center; gap:6px;
      padding:9px 18px; border-radius:10px;
      font-size:13px; font-weight:600; cursor:pointer; border:none;
      font-family:'DM Sans',sans-serif; transition:all .18s ease;
    }
    .emp-btn:hover  { transform:translateY(-1px); filter:brightness(1.05); }
    .emp-btn:active { transform:translateY(0); }
    .emp-input {
      width:100%; box-sizing:border-box; padding:10px 14px; border-radius:10px;
      font-size:13px; font-family:'DM Sans',sans-serif; color:#1C1028;
      background:#FDFBFF; border:1.5px solid #E2D8EE; outline:none;
      transition:border .2s, box-shadow .2s;
    }
    .emp-input:focus { border-color:#730042!important; box-shadow:0 0 0 3px rgba(115,0,66,.09); }
    .emp-chip {
      display:inline-flex; align-items:center; gap:5px;
      padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600;
      font-family:'DM Sans',sans-serif;
    }
    ::-webkit-scrollbar { width:5px; }
    ::-webkit-scrollbar-thumb { background:#DDD6EC; border-radius:4px; }
  `}</style>
);

/* ─── Meta maps ──────────────────────────────────────────────────── */
const TYPE_META = {
  suggestion:    { label:"Suggestion",    bg:"#DCFCE7", color:"#14803D", dot:"#22C55E", icon:"💡" },
  complaint:     { label:"Complaint",     bg:"#FEF3C7", color:"#92400E", dot:"#F59E0B", icon:"📋" },
  posh:          { label:"POSH",          bg:"#FEE2E2", color:"#991B1B", dot:"#EF4444", icon:"🔴" },
  grievance:     { label:"Grievance",     bg:"#EDE9FE", color:"#5B21B6", dot:"#8B5CF6", icon:"⚖️" },
  whistleblower: { label:"Whistleblower", bg:"#DBEAFE", color:"#1D4ED8", dot:"#3B82F6", icon:"🔒" },
};

const STATUS_META = {
  open:         { label:"Open",          bg:"#FFFBEB", color:"#92400E", dot:"#F59E0B" },
  acknowledged: { label:"Acknowledged",  bg:"#EFF6FF", color:"#1D4ED8", dot:"#3B82F6" },
  under_review: { label:"Under Review",  bg:"#F5F3FF", color:"#5B21B6", dot:"#8B5CF6" },
  action_taken: { label:"Action Taken",  bg:"#ECFDF5", color:"#065F46", dot:"#10B981" },
  resolved:     { label:"Resolved",      bg:"#F0FDF4", color:"#14803D", dot:"#22C55E" },
  closed:       { label:"Closed",        bg:"#F3F4F6", color:"#374151", dot:"#9CA3AF" },
  rejected:     { label:"Rejected",      bg:"#FEF2F2", color:"#991B1B", dot:"#EF4444" },
};

const SEV_META = {
  low:      { label:"Low",      bg:"#F0FDF4", color:"#14803D" },
  medium:   { label:"Medium",   bg:"#FFFBEB", color:"#92400E" },
  high:     { label:"High",     bg:"#FFF7ED", color:"#9A3412" },
  critical: { label:"Critical", bg:"#FEF2F2", color:"#991B1B" },
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

/* ─── Helpers ────────────────────────────────────────────────────── */
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const timeAgo = (d) => {
  if (!d) return "";
  const diff = Math.floor((Date.now()-new Date(d))/60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
};

/* ─── Sub-components ─────────────────────────────────────────────── */
const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"48px 0",flexDirection:"column",gap:12}}>
    <div style={{width:34,height:34,border:"3px solid #EDE6F5",borderTop:"3px solid #730042",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
    <p style={{fontSize:12,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>Loading…</p>
  </div>
);

const Label = ({children,required}) => (
  <div style={{fontSize:11,fontWeight:700,color:"#9B8BAE",textTransform:"uppercase",letterSpacing:".5px",marginBottom:7,fontFamily:"'DM Sans',sans-serif"}}>
    {children}{required&&<span style={{color:"#CD166E",marginLeft:3}}>*</span>}
  </div>
);

const TypeChip = ({type}) => {
  const m = TYPE_META[type]||{label:type,bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF",icon:"📌"};
  return <span className="emp-chip" style={{background:m.bg,color:m.color}}><span>{m.icon}</span>{m.label}</span>;
};

const StatusChip = ({status}) => {
  const m = STATUS_META[status]||{label:status,bg:"#F3F4F6",color:"#374151",dot:"#9CA3AF"};
  return <span className="emp-chip" style={{background:m.bg,color:m.color}}><span style={{width:6,height:6,borderRadius:"50%",background:m.dot,display:"inline-block"}}/>{m.label}</span>;
};

/* ─── Submit Form ────────────────────────────────────────────────── */
const INITIAL = {
  type:"complaint", category:"", subCategory:"", title:"", description:"",
  incidentDate:"", incidentLocation:"", witnessNames:"",
  severity:"medium", isAnonymous:false,
};

function SubmitForm({ onSuccess }) {
  const [form, setForm] = useState(INITIAL);
  const [toast, setToast] = useState(null);
  const submitMut = useSubmitTicket();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v, ...(k==="type"?{category:"",subCategory:""}:{}) }));

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.category) {
      showToast("Please fill in all required fields.","error"); return;
    }
    try {
      const payload = {
        ...form,
        witnessNames: form.witnessNames ? form.witnessNames.split(",").map(s=>s.trim()).filter(Boolean) : [],
      };
      await submitMut.mutateAsync(payload);
      showToast("Ticket submitted successfully! 🎉","success");
      setForm(INITIAL);
      onSuccess?.();
    } catch(e) {
      showToast(e?.response?.data?.message || "Submission failed.","error");
    }
  };

  const cats = CATEGORIES[form.type] || [];

  return (
    <div style={{background:"#fff",borderRadius:20,border:"1px solid rgba(180,155,210,.25)",padding:28,boxShadow:"0 4px 20px rgba(60,20,80,.07)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#730042,#CD166E)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 14px rgba(115,0,66,.3)"}}>📝</div>
        <div>
          <div style={{fontSize:17,fontWeight:700,color:"#1C1028",fontFamily:"'Playfair Display',serif"}}>New Ticket</div>
          <div style={{fontSize:12,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>Your submission is confidential</div>
        </div>
      </div>

      {/* Type */}
      <div style={{marginBottom:16}}>
        <Label required>Ticket Type</Label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {Object.entries(TYPE_META).map(([k,m]) => (
            <button key={k} onClick={()=>set("type",k)} style={{padding:"7px 14px",borderRadius:10,border:`1.5px solid ${form.type===k?"#730042":"#E2D8EE"}`,background:form.type===k?"linear-gradient(135deg,#730042,#CD166E)":"#FDFBFF",color:form.type===k?"#fff":"#6B5080",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all .18s",display:"flex",alignItems:"center",gap:5}}>
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: category + severity */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <div>
          <Label required>Category</Label>
          <select className="emp-input" value={form.category} onChange={e=>set("category",e.target.value)}>
            <option value="">Select category…</option>
            {cats.map(c=><option key={c} value={c}>{CAT_LABELS[c]||c}</option>)}
          </select>
        </div>
        <div>
          <Label>Severity</Label>
          <select className="emp-input" value={form.severity} onChange={e=>set("severity",e.target.value)}>
            {Object.entries(SEV_META).map(([k,m])=><option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Title */}
      <div style={{marginBottom:16}}>
        <Label required>Title</Label>
        <input className="emp-input" value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Brief, clear title for your ticket…" maxLength={120}/>
      </div>

      {/* Description */}
      <div style={{marginBottom:16}}>
        <Label required>Description</Label>
        <textarea className="emp-input" rows={4} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Describe the issue in detail. Include dates, people involved, and what happened…" style={{resize:"vertical",lineHeight:1.7}}/>
      </div>

      {/* Incident details */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        <div>
          <Label>Incident Date</Label>
          <input className="emp-input" type="date" value={form.incidentDate} onChange={e=>set("incidentDate",e.target.value)}/>
        </div>
        <div>
          <Label>Location</Label>
          <input className="emp-input" value={form.incidentLocation} onChange={e=>set("incidentLocation",e.target.value)} placeholder="Office floor, remote, etc."/>
        </div>
      </div>

      {/* Witnesses */}
      <div style={{marginBottom:20}}>
        <Label>Witness Names <span style={{fontWeight:400,textTransform:"none",fontSize:10}}>(comma-separated)</span></Label>
        <input className="emp-input" value={form.witnessNames} onChange={e=>set("witnessNames",e.target.value)} placeholder="John Doe, Jane Smith"/>
      </div>

      {/* Anonymous toggle */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:24,background:"#FAF5FF",borderRadius:12,padding:"12px 16px",border:"1px solid #DDD6FE"}}>
        <button onClick={()=>set("isAnonymous",!form.isAnonymous)} style={{width:42,height:24,borderRadius:12,border:"none",cursor:"pointer",background:form.isAnonymous?"linear-gradient(135deg,#730042,#CD166E)":"#E5E7EB",transition:"background .2s",position:"relative",flexShrink:0}}>
          <span style={{position:"absolute",top:3,left:form.isAnonymous?20:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
        </button>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:"#5B21B6",fontFamily:"'DM Sans',sans-serif"}}>Submit Anonymously</div>
          <div style={{fontSize:11,color:"#8B5CF6",fontFamily:"'DM Sans',sans-serif"}}>Your identity will be hidden from Super Admin</div>
        </div>
      </div>

      {/* Submit */}
      <button className="emp-btn" onClick={handleSubmit} disabled={submitMut.isPending}
        style={{background:"linear-gradient(135deg,#730042,#CD166E)",color:"#fff",width:"100%",justifyContent:"center",padding:"13px",borderRadius:12,fontSize:14,boxShadow:"0 4px 16px rgba(115,0,66,.3)",opacity:submitMut.isPending?.7:1}}>
        {submitMut.isPending
          ? <><div style={{width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .6s linear infinite"}}/>Submitting…</>
          : "Submit Ticket →"
        }
      </button>

      {/* Toast */}
      {toast&&(
        <div style={{marginTop:14,padding:"10px 16px",borderRadius:10,fontSize:13,fontFamily:"'DM Sans',sans-serif",fontWeight:500,background:toast.type==="success"?"#F0FDF4":"#FEF2F2",color:toast.type==="success"?"#14803D":"#991B1B",border:`1px solid ${toast.type==="success"?"#86EFAC":"#FCA5A5"}`}}>
          {toast.type==="success"?"✅":"❌"} {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ─── Rate Modal ─────────────────────────────────────────────────── */
function RateModal({ ticket, onClose }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const rateMut = useRateTicket();

  const submit = async () => {
    if (!rating) return;
    await rateMut.mutateAsync({ ticketNumber: ticket.ticketNumber, rating, feedback });
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(20,0,30,.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div style={{background:"#fff",borderRadius:20,padding:28,width:380,boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{fontSize:16,fontWeight:700,color:"#1C1028",fontFamily:"'Playfair Display',serif",marginBottom:4}}>Rate Your Experience</div>
        <div style={{fontSize:12,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif",marginBottom:20}}>{ticket.ticketNumber} · {ticket.title}</div>

        <div style={{display:"flex",gap:6,marginBottom:16,justifyContent:"center"}}>
          {[1,2,3,4,5].map(n=>(
            <button key={n} onClick={()=>setRating(n)} style={{fontSize:30,background:"none",border:"none",cursor:"pointer",opacity:n<=rating?1:.3,transition:"opacity .15s,transform .15s",transform:n<=rating?"scale(1.1)":"scale(1)"}}>★</button>
          ))}
        </div>

        <textarea className="emp-input" rows={3} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Optional feedback…" style={{marginBottom:16,resize:"none"}}/>

        <div style={{display:"flex",gap:10}}>
          <button className="emp-btn" onClick={onClose} style={{background:"#F4EEF9",color:"#6B5080",flex:1,justifyContent:"center"}}>Cancel</button>
          <button className="emp-btn" onClick={submit} disabled={!rating||rateMut.isPending} style={{background:"linear-gradient(135deg,#730042,#CD166E)",color:"#fff",flex:1,justifyContent:"center",opacity:(!rating||rateMut.isPending)?.6:1}}>
            {rateMut.isPending?"Submitting…":"Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── My Tickets List ────────────────────────────────────────────── */
function MyTickets() {
  const { data, isLoading } = useGetMyTickets();
  const [rateTarget, setRateTarget] = useState(null);
  const tickets = data?.tickets || [];

  if (isLoading) return <Spinner/>;
  if (!tickets.length) return (
    <div style={{textAlign:"center",padding:"48px 0",color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{fontSize:40,marginBottom:12}}>🎫</div>
      <div style={{fontWeight:500}}>No tickets submitted yet</div>
    </div>
  );

  return (
    <>
      {tickets.map((t,i) => {
        const tm = TYPE_META[t.type]||{};
        const canRate = ["resolved","closed"].includes(t.status) && !t.submitterRating;
        return (
          <div key={t._id} className="emp-card" style={{animationDelay:`${i*.05}s`,borderLeft:`3px solid ${tm.dot||"#730042"}`}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:7,alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>{t.ticketNumber}</span>
                  <TypeChip type={t.type}/>
                  <StatusChip status={t.status}/>
                  {t.isAnonymous&&<span className="emp-chip" style={{background:"#F3F4F6",color:"#6B7280"}}>Anonymous</span>}
                </div>
                <div style={{fontSize:13,fontWeight:600,color:"#1C1028",fontFamily:"'DM Sans',sans-serif",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                <div style={{fontSize:11,color:"#9B8BAE",fontFamily:"'DM Sans',sans-serif"}}>
                  {CAT_LABELS[t.category]||t.category} · SLA: {fmt(t.slaDeadline)} · {timeAgo(t.createdAt)}
                </div>
                {t.superAdminNote&&(
                  <div style={{marginTop:8,background:"#F0FDF4",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#065F46",fontFamily:"'DM Sans',sans-serif",borderLeft:"3px solid #22C55E"}}>
                    <strong>Admin Reply:</strong> {t.superAdminNote}
                  </div>
                )}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0}}>
                {canRate&&(
                  <button className="emp-btn" onClick={()=>setRateTarget(t)} style={{background:"linear-gradient(135deg,#F59E0B,#D97706)",color:"#fff",fontSize:11,padding:"6px 12px"}}>
                    ⭐ Rate
                  </button>
                )}
                {t.submitterRating&&(
                  <div style={{fontSize:11,color:"#92400E",fontFamily:"'DM Sans',sans-serif"}}>{"★".repeat(t.submitterRating)} {t.submitterFeedback}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {rateTarget&&<RateModal ticket={rateTarget} onClose={()=>setRateTarget(null)}/>}
    </>
  );
}

/* ─── Main Export ────────────────────────────────────────────────── */
export default function EmployeeTickets() {
  const [tab, setTab] = useState("submit");
  const { data } = useGetMyTickets();
  const count = data?.count || 0;

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",padding:"32px 36px"}}>
      <GlobalStyles/>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
        <div style={{width:50,height:50,borderRadius:16,background:"linear-gradient(135deg,#730042,#CD166E)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:"0 6px 22px rgba(115,0,66,.35)"}}>🎫</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1C1028",margin:0,fontFamily:"'Playfair Display',serif"}}>My Tickets</h1>
          <p style={{fontSize:12,color:"#9B8BAE",margin:"3px 0 0"}}>Submit & track your grievances, complaints, and suggestions</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,background:"rgba(235,228,245,.6)",borderRadius:12,padding:4,marginBottom:24,width:"fit-content",border:"1px solid rgba(200,185,220,.3)"}}>
        {[["submit","📝 Submit New"],["mytickets",`📋 My Tickets (${count})`]].map(([k,l])=>{
          const active=tab===k;
          return <button key={k} onClick={()=>setTab(k)} style={{padding:"8px 20px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:active?600:400,fontFamily:"'DM Sans',sans-serif",color:active?"#fff":"#9B8BAE",background:active?"linear-gradient(135deg,#730042,#CD166E)":"transparent",boxShadow:active?"0 2px 10px rgba(115,0,66,.28)":"none",transition:"all .2s"}}>{l}</button>;
        })}
      </div>

      <div style={{maxWidth:720}}>
        {tab==="submit" && <SubmitForm onSuccess={()=>setTab("mytickets")}/>}
        {tab==="mytickets" && <MyTickets/>}
      </div>
    </div>
  );
}