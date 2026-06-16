import React, { useState, useCallback } from "react";
import { useSubmitTicket, useGetMyTickets, useRateTicket, useGetTicketDetail } from "../../auth/server-state/adminticket/adminticket.hook";

const TICKET_TYPES = {
  suggestion:    { label: "Suggestion",    icon: "💡", bg: "bg-emerald-50", color: "text-emerald-800", dot: "bg-emerald-400" },
  complaint:     { label: "Complaint",     icon: "📋", bg: "bg-amber-50",   color: "text-amber-800",   dot: "bg-amber-400" },
  posh:          { label: "POSH",          icon: "🔴", bg: "bg-red-50",     color: "text-red-900",     dot: "bg-red-500" },
  grievance:     { label: "Grievance",     icon: "⚖️", bg: "bg-violet-50",  color: "text-violet-900",  dot: "bg-violet-500" },
  whistleblower: { label: "Whistleblower", icon: "🔒", bg: "bg-blue-50",    color: "text-blue-900",    dot: "bg-blue-500" },
};

const STATUS_META = {
  open:         { label: "Open",         bg: "bg-amber-50",   color: "text-amber-800",  dot: "bg-amber-400" },
  acknowledged: { label: "Acknowledged", bg: "bg-blue-50",    color: "text-blue-800",   dot: "bg-blue-500" },
  under_review: { label: "Under Review", bg: "bg-violet-50",  color: "text-violet-800", dot: "bg-violet-500" },
  action_taken: { label: "Action Taken", bg: "bg-emerald-50", color: "text-emerald-800",dot: "bg-emerald-500" },
  resolved:     { label: "Resolved",     bg: "bg-green-50",   color: "text-green-800",  dot: "bg-green-500" },
  closed:       { label: "Closed",       bg: "bg-gray-100",   color: "text-gray-700",   dot: "bg-gray-400" },
  rejected:     { label: "Rejected",     bg: "bg-red-50",     color: "text-red-800",    dot: "bg-red-500" },
  reopened:     { label: "Reopened",     bg: "bg-orange-50",  color: "text-orange-800", dot: "bg-orange-400" },
};

const SEV_META = {
  low:      { label: "Low",      bg: "bg-green-50",  color: "text-green-800" },
  medium:   { label: "Medium",   bg: "bg-amber-50",  color: "text-amber-800" },
  high:     { label: "High",     bg: "bg-orange-50", color: "text-orange-800" },
  critical: { label: "Critical", bg: "bg-red-50",    color: "text-red-900" },
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

const TL_HEX = {
  ticket_created:"#CD166E", status_changed:"#3B82F6", note_added:"#10B981",
  internal_note_added:"#7C3AED", priority_changed:"#F97316",
  escalated:"#EF4444", acknowledgement_sent:"#3B82F6", rating_submitted:"#F59E0B",
};

const fmt     = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : "—";
const fmtFull = (d) => d ? new Date(d).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : "—";
const timeAgo = (d) => {
  if (!d) return "";
  const diff = Math.floor((Date.now() - new Date(d)) / 60000);
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
};

const Chip = ({ bg, color, dot, children }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${bg} ${color}`}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`}/>}
    {children}
  </span>
);

const TypeChip = ({ type }) => {
  const m = TICKET_TYPES[type] || { label:type, bg:"bg-gray-100", color:"text-gray-700", icon:"📌" };
  return <Chip bg={m.bg} color={m.color}>{m.icon} {m.label}</Chip>;
};

const StatusChip = ({ status }) => {
  const m = STATUS_META[status] || { label:status, bg:"bg-gray-100", color:"text-gray-700", dot:"bg-gray-400" };
  return <Chip bg={m.bg} color={m.color} dot={m.dot}>{m.label}</Chip>;
};

const SevChip = ({ sev }) => {
  const m = SEV_META[sev] || { label:sev, bg:"bg-gray-100", color:"text-gray-700" };
  return <Chip bg={m.bg} color={m.color}>{m.label}</Chip>;
};

const Lbl = ({ children, req }) => (
  <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide mb-1.5">
    {children}{req && <span className="text-pink-500 ml-0.5">*</span>}
  </p>
);

const InfoRow = ({ label, val }) => (
  <div className="flex flex-col gap-1 p-3 rounded-xl bg-purple-50/40 border border-purple-100">
    <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wide">{label}</span>
    <span className="text-xs text-gray-800 font-medium">{val || "—"}</span>
  </div>
);

const Spinner = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-purple-100 border-t-[#730042] animate-spin"/>
    <p className="text-xs text-purple-300">Loading…</p>
  </div>
);

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-purple-100 p-6 space-y-3">
    {[200,140,90,160,100].map((w,i) => (
      <div key={i} className="h-3 rounded-lg bg-purple-100 animate-pulse" style={{ width:w }}/>
    ))}
  </div>
);

const inputCls = "w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-purple-100 bg-purple-50/30 text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition placeholder:text-gray-400 font-[Instrument_Sans,sans-serif]";

const BLANK = {
  type:"complaint", category:"", subCategory:"", title:"", description:"",
  incidentDate:"", incidentLocation:"", witnessNames:"",
  severity:"medium", isAnonymous:false,
};

function SubmitForm({ onSuccess, canRaise }) {
  const [form,  setForm]  = useState(BLANK);
  const [toast, setToast] = useState(null);
  const mut = useSubmitTicket();

  const set = useCallback((k, v) =>
    setForm(p => ({ ...p, [k]:v, ...(k==="type" ? { category:"", subCategory:"" } : {}) }))
  , []);

  const toast$ = useCallback((msg, kind="ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.category) {
      toast$("Please fill in all required fields.", "err"); return;
    }
    try {
      await mut.mutateAsync({
        ...form,
        witnessNames: form.witnessNames
          ? form.witnessNames.split(",").map(s => s.trim()).filter(Boolean)
          : [],
      });
      toast$("Ticket submitted successfully! 🎉");
      setForm(BLANK);
      onSuccess?.();
    } catch (e) {
      toast$(e?.message || "Submission failed.", "err");
    }
  };

  if (!canRaise) return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-10 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-3xl border border-red-100">🔒</div>
      <p className="text-base font-bold text-gray-800">Permission Required</p>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
        You don't have permission to raise tickets. Contact your Super Admin to enable this feature.
      </p>
    </div>
  );

  const cats = CATEGORIES[form.type] || [];

  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5 sm:p-7">
      <div className="flex items-center gap-3.5 mb-7">
        <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl flex-shrink-0"
          style={{ background:"linear-gradient(135deg,#730042,#CD166E)", boxShadow:"0 4px 14px rgba(115,0,66,.28)" }}>
          📝
        </div>
        <div>
          <p className="text-base font-bold text-gray-900">New Ticket</p>
          <p className="text-xs text-purple-400 mt-0.5">Your submission is handled confidentially</p>
        </div>
        <span className="ml-auto text-[11px] font-semibold text-[#730042] bg-[#730042]/8 border border-[#730042]/15 px-3 py-1 rounded-full">Admin</span>
      </div>

      <div className="mb-5">
        <Lbl req>Ticket Type</Lbl>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(TICKET_TYPES).map(([k, m]) => (
            <button key={k} onClick={() => set("type", k)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5
                ${form.type===k
                  ? "text-white border-transparent"
                  : "border-purple-100 bg-purple-50/40 text-gray-600 hover:border-[#730042]/30"}`}
              style={form.type===k ? { background:"linear-gradient(135deg,#730042,#CD166E)", borderColor:"transparent" } : {}}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <Lbl req>Category</Lbl>
          <select className={inputCls} value={form.category} onChange={e => set("category", e.target.value)}>
            <option value="">Select category…</option>
            {cats.map(c => <option key={c} value={c}>{CAT_LABELS[c] || c}</option>)}
          </select>
        </div>
        <div>
          <Lbl>Severity</Lbl>
          <select className={inputCls} value={form.severity} onChange={e => set("severity", e.target.value)}>
            {Object.entries(SEV_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <Lbl req>Title</Lbl>
        <input className={inputCls} value={form.title} onChange={e => set("title", e.target.value)}
          placeholder="Brief, clear title for your ticket…" maxLength={120}/>
      </div>

      <div className="mb-4">
        <Lbl req>Description</Lbl>
        <textarea className={inputCls} rows={4} value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Describe the issue in detail…" style={{ resize:"vertical", lineHeight:1.7 }}/>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <Lbl>Incident Date</Lbl>
          <input className={inputCls} type="date" value={form.incidentDate}
            onChange={e => set("incidentDate", e.target.value)}/>
        </div>
        <div>
          <Lbl>Location</Lbl>
          <input className={inputCls} value={form.incidentLocation}
            onChange={e => set("incidentLocation", e.target.value)}
            placeholder="Office floor, remote, etc."/>
        </div>
      </div>

      <div className="mb-5">
        <Lbl>Witness Names <span className="normal-case text-[10px] font-normal">(comma-separated)</span></Lbl>
        <input className={inputCls} value={form.witnessNames}
          onChange={e => set("witnessNames", e.target.value)}
          placeholder="John Doe, Jane Smith"/>
      </div>

      <div className="flex items-center gap-3 mb-6 bg-violet-50 rounded-xl p-3.5 border border-violet-100">
        <button onClick={() => set("isAnonymous", !form.isAnonymous)}
          className="relative w-10 h-5 rounded-full border-none cursor-pointer flex-shrink-0 transition-all"
          style={{ background: form.isAnonymous ? "linear-gradient(135deg,#730042,#CD166E)" : "#DDD6F0" }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
            style={{ left: form.isAnonymous ? "22px" : "2px" }}/>
        </button>
        <div>
          <p className="text-xs font-semibold text-violet-700">Submit Anonymously</p>
          <p className="text-[11px] text-violet-400">Your identity will be hidden from Super Admin</p>
        </div>
      </div>

      <button onClick={submit} disabled={mut.isPending}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background:"linear-gradient(135deg,#730042,#CD166E)", boxShadow:"0 4px 16px rgba(115,0,66,.26)" }}>
        {mut.isPending
          ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/> Submitting…</>
          : "Submit Ticket →"}
      </button>

      {toast && (
        <div className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-medium border
          ${toast.kind==="ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {toast.kind==="ok" ? "✅" : "❌"} {toast.msg}
        </div>
      )}
    </div>
  );
}

function RateModal({ ticket, onClose }) {
  const [rating,   setRating]   = useState(0);
  const [feedback, setFeedback] = useState("");
  const mut = useRateTicket();

  const submit = async () => {
    if (!rating) return;
    try {
      await mut.mutateAsync({ ticketNumber:ticket.ticketNumber, rating, feedback });
      onClose();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl animate-[popIn_.26s_cubic-bezier(.34,1.56,.64,1)_both]"
        style={{ ['--tw-shadow']:"0 24px 64px rgba(0,0,0,.22)" }}>
        <p className="text-base font-bold text-gray-900 mb-0.5">Rate Your Experience</p>
        <p className="text-xs text-purple-400 mb-5">{ticket.ticketNumber} · {ticket.title}</p>
        <div className="flex gap-1 mb-5 justify-center">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setRating(n)}
              className="text-3xl border-none bg-transparent cursor-pointer transition-all"
              style={{ opacity:n<=rating?1:.25, transform:n<=rating?"scale(1.12)":"scale(1)", color:"#F59E0B" }}>★</button>
          ))}
        </div>
        <textarea className={`${inputCls} mb-5`} rows={3} value={feedback}
          onChange={e => setFeedback(e.target.value)} placeholder="Optional feedback…" style={{ resize:"none" }}/>
        <div className="flex gap-2.5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition">
            Cancel
          </button>
          <button onClick={submit} disabled={!rating || mut.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50"
            style={{ background:"linear-gradient(135deg,#730042,#CD166E)" }}>
            {mut.isPending ? "Submitting…" : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketDetail({ ticketNumber, onBack, onRate, canRate }) {
  const { data, isLoading } = useGetTicketDetail(ticketNumber);
  const [tab, setTab] = useState("overview");
  const ticket = data?.ticket;
  const canRateThis = canRate && ticket && ["resolved","closed"].includes(ticket.status) && !ticket.submitterRating;

  if (isLoading) return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[#730042] text-sm font-semibold mb-4 bg-transparent border-none cursor-pointer p-0">
        ← Back to My Tickets
      </button>
      <SkeletonCard/>
    </div>
  );

  if (!ticket) return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[#730042] text-sm font-semibold mb-4 bg-transparent border-none cursor-pointer p-0">
        ← Back to My Tickets
      </button>
      <p className="text-center py-12 text-gray-400 text-sm">Ticket not found.</p>
    </div>
  );

  const TABS = [
    { key:"overview", label:"Overview" },
    { key:"timeline", label:`Timeline (${ticket.timeline?.length||0})` },
    { key:"updates",  label:"Updates" },
  ];

  return (
    <div className="animate-[slideIn_.26s_ease_both]">
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[#730042] text-sm font-semibold mb-4 bg-transparent border-none cursor-pointer p-0 hover:opacity-70 transition">
        ← Back to My Tickets
      </button>

      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-purple-100" style={{ background:"linear-gradient(130deg,rgba(115,0,66,.05),rgba(205,22,110,.03))" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-2.5 items-center">
                <span className="text-[10px] font-bold text-purple-400 tracking-wide">{ticket.ticketNumber}</span>
                <TypeChip type={ticket.type}/>
                <StatusChip status={ticket.status}/>
                <SevChip sev={ticket.severity}/>
                {ticket.isOverdue   && <Chip bg="bg-red-50" color="text-red-800">⚠ Overdue</Chip>}
                {ticket.isEscalated && <Chip bg="bg-orange-50" color="text-orange-800">🔺 Escalated</Chip>}
              </div>
              <p className="text-lg font-bold text-gray-900 leading-snug mb-1">{ticket.title}</p>
              <p className="text-xs text-purple-400">Submitted {timeAgo(ticket.createdAt)} · SLA: {fmt(ticket.slaDeadline)}</p>
            </div>
            {canRateThis && (
              <button onClick={() => onRate(ticket)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0 transition hover:-translate-y-0.5"
                style={{ background:"linear-gradient(135deg,#D97706,#F59E0B)" }}>
                ⭐ Rate Resolution
              </button>
            )}
          </div>

          <div className="flex gap-1 mt-4 bg-white/70 rounded-xl p-1 w-fit border border-purple-100">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold transition-all
                  ${tab===t.key ? "text-white shadow" : "bg-transparent text-purple-400 hover:text-[#730042]"}`}
                style={tab===t.key ? { background:"linear-gradient(135deg,#730042,#CD166E)" } : {}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {tab === "overview" && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide mb-2">Description</p>
                <div className="text-sm text-gray-600 leading-relaxed bg-purple-50/40 rounded-xl p-4 border-l-[3px] border-[#730042] border border-purple-100">
                  {ticket.description}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <InfoRow label="Category"        val={CAT_LABELS[ticket.category]||ticket.category}/>
                <InfoRow label="Severity"        val={<SevChip sev={ticket.severity}/>}/>
                <InfoRow label="Created"         val={fmtFull(ticket.createdAt)}/>
                <InfoRow label="SLA Deadline"    val={fmt(ticket.slaDeadline)}/>
                <InfoRow label="Incident Date"   val={ticket.incidentDate ? fmt(ticket.incidentDate) : "Not specified"}/>
                <InfoRow label="Location"        val={ticket.incidentLocation||"Not specified"}/>
                <InfoRow label="Confidentiality" val={(ticket.confidentialityLevel||"").replace(/_/g," ")}/>
                <InfoRow label="Anonymous"       val={ticket.isAnonymous?"Yes":"No"}/>
              </div>

              {ticket.witnessNames?.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-2">Witnesses</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.witnessNames.map((w,i) => (
                      <Chip key={i} bg="bg-amber-100" color="text-amber-800">👤 {w}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {ticket.resolutionSummary && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <p className="text-[10px] font-bold text-green-800 uppercase tracking-wide mb-1.5">✓ Resolution Summary</p>
                  <p className="text-sm text-green-700 leading-relaxed">{ticket.resolutionSummary}</p>
                </div>
              )}

              {ticket.rejectionReason && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <p className="text-[10px] font-bold text-red-900 uppercase tracking-wide mb-1.5">✕ Rejection Reason</p>
                  <p className="text-sm text-red-800 leading-relaxed">{ticket.rejectionReason}</p>
                </div>
              )}

              {ticket.submitterRating && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1.5">Your Rating</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-amber-500 tracking-widest">
                      {"★".repeat(ticket.submitterRating)}{"☆".repeat(5-ticket.submitterRating)}
                    </span>
                    {ticket.submitterFeedback && <span className="text-xs text-amber-800">{ticket.submitterFeedback}</span>}
                  </div>
                </div>
              )}

              <div className="bg-purple-50/40 rounded-xl p-4 border border-purple-100">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide mb-3">SLA Metrics</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-purple-400 mb-1">First Response</p>
                    <p className="text-sm font-bold text-gray-900">{ticket.firstResponseHours!=null?`${ticket.firstResponseHours}h`:"Pending"}</p>
                  </div>
                  {ticket.resolutionTimeHours!=null && (
                    <div>
                      <p className="text-[10px] text-purple-400 mb-1">Resolution</p>
                      <p className="text-sm font-bold text-green-700">{ticket.resolutionTimeHours}h</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-purple-400 mb-1">Reopened</p>
                    <p className="text-sm font-bold text-gray-900">{ticket.reopenCount||0}×</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "timeline" && (
            <div>
              {!ticket.timeline?.length
                ? <p className="text-center py-10 text-gray-400 text-sm">No timeline entries yet</p>
                : [...ticket.timeline].reverse().map((e,i,arr) => {
                    const dot = TL_HEX[e.action] || "#730042";
                    const isLast = i===arr.length-1;
                    return (
                      <div key={e._id||i} className="flex gap-3.5" style={{ marginBottom:isLast?0:4, animation:`fadeUp .25s ease ${i*.04}s both` }}>
                        <div className="flex flex-col items-center w-2.5 flex-shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ background:dot, boxShadow:`0 0 0 3px ${dot}22` }}/>
                          {!isLast && <div className="w-px flex-1 my-1" style={{ background:`${dot}30`, minHeight:14 }}/>}
                        </div>
                        <div className={`flex-1 ${isLast?"pb-0":"pb-4"}`}>
                          <p className="text-[11px] font-bold capitalize tracking-wide" style={{ color:dot }}>
                            {e.action.replace(/_/g," ")}
                          </p>
                          {e.fromStatus && e.toStatus && (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <StatusChip status={e.fromStatus}/>
                              <span className="text-gray-400 text-xs">→</span>
                              <StatusChip status={e.toStatus}/>
                            </div>
                          )}
                          {e.note && (
                            <div className="bg-purple-50/40 rounded-lg px-3 py-2 mt-1.5 text-xs text-gray-600 leading-relaxed border-l-2 border border-purple-100" style={{ borderLeftColor:dot }}>
                              {e.note}
                            </div>
                          )}
                          <p className="text-[10px] text-purple-400 mt-1">
                            {fmtFull(e.timestamp)}{e.byName&&` · ${e.byName}`}
                          </p>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          )}

          {tab === "updates" && (
            <div className="space-y-4">
              {ticket.superAdminNote
                ? (
                  <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">📩</span>
                      <span className="text-[11px] font-bold text-green-800 uppercase tracking-wide">Admin Reply</span>
                    </div>
                    <p className="text-sm text-green-700 leading-relaxed">{ticket.superAdminNote}</p>
                  </div>
                )
                : (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-sm">No public replies from admin yet.</p>
                  </div>
                )
              }
              {ticket.statusHistory?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide mb-2.5">Status History</p>
                  {[...ticket.statusHistory].reverse().map((h,i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 bg-purple-50/40 rounded-xl mb-1.5 border border-purple-100"
                      style={{ animation:`fadeUp .2s ease ${i*.04}s both` }}>
                      <StatusChip status={h.status}/>
                      <span className="flex-1 text-[11px] text-gray-500">
                        {h.note && <span className="text-gray-700">{h.note} · </span>}
                        {fmtFull(h.changedAt)}
                      </span>
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

function MyTickets({ canRate }) {
  const { data, isLoading } = useGetMyTickets();
  const [selected,   setSelected]   = useState(null);
  const [rateTarget, setRateTarget] = useState(null);
  const tickets = data?.tickets || [];

  if (isLoading) return <Spinner/>;

  if (selected) return (
    <>
      <TicketDetail
        ticketNumber={selected}
        onBack={() => setSelected(null)}
        onRate={t => setRateTarget(t)}
        canRate={canRate}
      />
      {rateTarget && <RateModal ticket={rateTarget} onClose={() => setRateTarget(null)}/>}
    </>
  );

  if (!tickets.length) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center text-gray-400">
        <p className="text-5xl mb-3">🎫</p>
        <p className="font-semibold text-sm text-gray-600">No tickets submitted yet</p>
        <p className="text-xs mt-1">Use the Submit New tab to raise a ticket</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {tickets.map((t, i) => {
        const tm = TICKET_TYPES[t.type] || {};
        const canRateThis = canRate && ["resolved","closed"].includes(t.status) && !t.submitterRating;

        return (
          <div key={t._id}
            onClick={() => setSelected(t.ticketNumber)}
            className="bg-white rounded-2xl border border-purple-100 px-5 py-4 cursor-pointer shadow-sm hover:shadow-md hover:border-[#730042]/20 hover:-translate-y-0.5 transition-all"
            style={{ animationDelay:`${i*.05}s`, borderLeft:`3px solid ${tm.dot ? "" : "#730042"}` }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-2 items-center">
                  <span className="text-[10px] font-bold text-purple-400 tracking-wide">{t.ticketNumber}</span>
                  <TypeChip type={t.type}/>
                  <StatusChip status={t.status}/>
                  {t.isAnonymous  && <Chip bg="bg-gray-100" color="text-gray-500">Anonymous</Chip>}
                  {t.isOverdue    && <Chip bg="bg-red-50" color="text-red-800">⚠ Overdue</Chip>}
                  {t.isEscalated  && <Chip bg="bg-orange-50" color="text-orange-800">🔺 Escalated</Chip>}
                </div>
                <p className="text-sm font-bold text-gray-900 truncate mb-1">{t.title}</p>
                <p className="text-[11px] text-purple-400">
                  {CAT_LABELS[t.category]||t.category} · SLA: {fmt(t.slaDeadline)} · {timeAgo(t.createdAt)}
                </p>
                {t.superAdminNote && (
                  <div className="mt-2.5 bg-green-50 rounded-lg px-3 py-2 text-xs text-green-800 border-l-2 border-green-400">
                    <strong>Admin Reply:</strong> {t.superAdminNote}
                  </div>
                )}
                {t.submitterRating && (
                  <p className="mt-1.5 text-xs text-amber-600 tracking-widest">
                    {"★".repeat(t.submitterRating)}{"☆".repeat(5-t.submitterRating)}
                    <span className="tracking-normal text-[11px]"> You rated this</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-end flex-shrink-0">
                {canRateThis && (
                  <button onClick={e => { e.stopPropagation(); setRateTarget(t); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition hover:-translate-y-0.5"
                    style={{ background:"linear-gradient(135deg,#D97706,#F59E0B)" }}>
                    ⭐ Rate
                  </button>
                )}
                <span className="text-[10px] text-purple-300">Tap to view →</span>
              </div>
            </div>
          </div>
        );
      })}
      {rateTarget && <RateModal ticket={rateTarget} onClose={() => setRateTarget(null)}/>}
    </div>
  );
}

export default function AdminTickets({ permissions = {} }) {
  const [tab, setTab] = useState("submit");
  const { data } = useGetMyTickets();
  const count = data?.count || 0;

  const canRaise = !!permissions?.tickets?.can_raise_ticket;
  const canRate  = !!permissions?.tickets?.can_rate_ticket;

  return (
    <div className="min-h-screen bg-[#F8F4FB] p-4 sm:p-6 lg:p-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
        @keyframes popIn   { from{opacity:0;transform:scale(.88) translateY(18px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>

      <div className="flex flex-col items-center mb-7">
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background:"linear-gradient(135deg,#730042,#CD166E)", boxShadow:"0 6px 20px rgba(115,0,66,.30)" }}>
            🎫
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900" style={{ fontFamily:"'Syne',sans-serif" }}>My Tickets</h1>
            <p className="text-xs text-purple-400 mt-0.5">Submit &amp; track grievances, complaints, and suggestions</p>
          </div>
        </div>

        <div className="flex gap-1 bg-purple-100/60 rounded-xl p-1 border border-purple-100">
          {[
            ["submit",    `📝 Submit New${!canRaise?" 🔒":""}`],
            ["mytickets", `📋 My Tickets${count?` (${count})`:""}`],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-5 py-2 rounded-[10px] border-none cursor-pointer text-xs font-semibold transition-all
                ${tab===k ? "text-white shadow-md" : "bg-transparent text-purple-400 hover:text-[#730042]"}`}
              style={tab===k ? { background:"linear-gradient(135deg,#730042,#CD166E)" } : {}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {tab === "submit"    && <SubmitForm onSuccess={() => setTab("mytickets")} canRaise={canRaise}/>}
        {tab === "mytickets" && <MyTickets canRate={canRate}/>}
      </div>
    </div>
  );
}