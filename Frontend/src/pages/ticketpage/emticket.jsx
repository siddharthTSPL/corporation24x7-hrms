import React, { useState, useCallback } from "react";
import {
  useEmployeeSubmitTicket,
  useEmployeeGetMyTickets,
  useGetEmployeeTicketDetail,
} from "../../auth/server-state/employee/employeeticket/employeeticket.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

const TYPE_META = {
  suggestion: { label: "Suggestion", bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-400", icon: "💡" },
  complaint: { label: "Complaint", bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-400", icon: "📋" },
  posh: { label: "POSH", bg: "bg-red-50", text: "text-red-800", dot: "bg-red-400", icon: "🔴" },
  grievance: { label: "Grievance", bg: "bg-violet-50", text: "text-violet-800", dot: "bg-violet-500", icon: "⚖️" },
  whistleblower: { label: "Whistleblower", bg: "bg-blue-50", text: "text-blue-900", dot: "bg-blue-500", icon: "🔒" },
};

const STATUS_META = {
  open: { label: "Open", bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-400" },
  acknowledged: { label: "Acknowledged", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  under_review: { label: "Under Review", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  action_taken: { label: "Action Taken", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  resolved: { label: "Resolved", bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  closed: { label: "Closed", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  rejected: { label: "Rejected", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  reopened: { label: "Reopened", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
};

const SEV_META = {
  low: { label: "Low", bg: "bg-green-50", text: "text-green-700" },
  medium: { label: "Medium", bg: "bg-amber-50", text: "text-amber-800" },
  high: { label: "High", bg: "bg-orange-50", text: "text-orange-800" },
  critical: { label: "Critical", bg: "bg-red-50", text: "text-red-800" },
};

const TL_COLORS = {
  ticket_created: "#CD166E",
  status_changed: "#3B82F6",
  note_added: "#10B981",
  internal_note_added: "#7C3AED",
  priority_changed: "#F97316",
  escalated: "#EF4444",
  acknowledgement_sent: "#3B82F6",
  rating_submitted: "#F59E0B",
};

const CATEGORIES = {
  complaint: ["manager_behavior", "colleague_behavior", "discrimination", "workplace_violence", "hostile_work_environment", "inappropriate_behavior", "other"],
  posh: ["sexual_harassment", "inappropriate_behavior", "hostile_work_environment", "other"],
  grievance: ["compensation_issue", "workload_stress", "unfair_treatment", "policy_violation", "other"],
  suggestion: ["process_improvement", "technology_tools", "policy_feedback", "culture_diversity", "benefits_perks", "training_development", "other"],
  whistleblower: ["financial_fraud", "data_breach", "safety_violation", "legal_compliance", "other"],
};

const CAT_LABELS = {
  sexual_harassment: "Sexual Harassment",
  hostile_work_environment: "Hostile Work Env.",
  inappropriate_behavior: "Inappropriate Behavior",
  manager_behavior: "Manager Behavior",
  colleague_behavior: "Colleague Behavior",
  discrimination: "Discrimination",
  workplace_violence: "Workplace Violence",
  policy_violation: "Policy Violation",
  compensation_issue: "Compensation Issue",
  workload_stress: "Workload / Stress",
  unfair_treatment: "Unfair Treatment",
  process_improvement: "Process Improvement",
  technology_tools: "Technology & Tools",
  policy_feedback: "Policy Feedback",
  culture_diversity: "Culture & Diversity",
  benefits_perks: "Benefits & Perks",
  training_development: "Training & Dev.",
  financial_fraud: "Financial Fraud",
  data_breach: "Data Breach",
  safety_violation: "Safety Violation",
  legal_compliance: "Legal Compliance",
  other: "Other",
};

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtFull = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const timeAgo = (d) => {
  if (!d) return "";
  const diff = Math.floor((Date.now() - new Date(d)) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

function Chip({ bg, text, dot, children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${bg} ${text}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />}
      {children}
    </span>
  );
}

function TypeChip({ type }) {
  const m = TYPE_META[type] || { label: type, bg: "bg-gray-100", text: "text-gray-700", icon: "📌" };
  return <Chip bg={m.bg} text={m.text}>{m.icon} {m.label}</Chip>;
}

function StatusChip({ status }) {
  const m = STATUS_META[status] || { label: status, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return <Chip bg={m.bg} text={m.text} dot={m.dot}>{m.label}</Chip>;
}

function SevChip({ sev }) {
  const m = SEV_META[sev] || { label: sev, bg: "bg-gray-100", text: "text-gray-600" };
  return <Chip bg={m.bg} text={m.text}>{m.label}</Chip>;
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-7 h-7 rounded-full border-[3px] border-[rgba(115,0,66,0.15)] border-t-[#730042] animate-spin" />
      <p className="text-xs text-[#9B7A8E]">Loading…</p>
    </div>
  );
}

function InfoRow({ label, val }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-[#FBF8FE] border border-[rgba(115,0,66,0.1)]">
      <span className="text-[10px] font-semibold text-[#9B7A8E] uppercase tracking-wide">{label}</span>
      <span className="text-[12.5px] font-medium text-[#1A0A12]">{val || "—"}</span>
    </div>
  );
}

function AccessDeniedModal({ onClose }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 bg-[rgba(26,10,18,0.45)] z-[300] flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-sm border border-[rgba(115,0,66,0.12)] shadow-xl flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#730042]/10 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#730042" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h3 className="text-[17px] font-bold text-gray-700 mb-1.5">Access Restricted</h3>
        <p className="text-[13px] text-gray-400 leading-relaxed mb-5">
          You don't have permission to perform this action. Contact your admin to request access.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-[#730042] text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function NoPermission() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center text-center max-w-sm w-full">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#730042]/10 flex items-center justify-center mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#730042" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-700 mb-2 tracking-tight">Access Restricted</h2>
        <p className="text-sm sm:text-[15px] text-gray-400 leading-relaxed">
          You don't have permission to access this page. Contact your admin to request access.
        </p>
      </div>
    </div>
  );
}

const BLANK = {
  type: "complaint", category: "", subCategory: "", title: "",
  description: "", incidentDate: "", incidentLocation: "",
  witnessNames: "", severity: "medium", isAnonymous: false,
};

function SubmitForm({ onSuccess }) {
  const [form, setForm] = useState(BLANK);
  const [toast, setToast] = useState(null);
  const mut = useEmployeeSubmitTicket();

  const set = useCallback((k, v) =>
    setForm((p) => ({ ...p, [k]: v, ...(k === "type" ? { category: "", subCategory: "" } : {}) })),
  []);

  const showToast = useCallback((msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.category) {
      showToast("Please fill in all required fields.", "err");
      return;
    }
    try {
      await mut.mutateAsync({
        ...form,
        witnessNames: form.witnessNames
          ? form.witnessNames.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      });
      showToast("Ticket submitted successfully!");
      setForm(BLANK);
      onSuccess?.();
    } catch (e) {
      showToast(e?.response?.data?.message || "Submission failed.", "err");
    }
  };

  const cats = CATEGORIES[form.type] || [];
  const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-[13px] text-[#1A0A12] bg-[#FDFBFF] border border-[rgba(115,0,66,0.12)] outline-none focus:border-[#730042] transition-colors font-[inherit]";

  return (
    <div className="bg-white rounded-2xl border border-[rgba(115,0,66,0.1)] p-5 sm:p-6 shadow-[0_4px_24px_rgba(80,20,90,0.06)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#730042] to-[#CD166E] flex items-center justify-center text-lg flex-shrink-0">📝</div>
        <div>
          <div className="text-[15px] font-bold text-[#1A0A12]">New Ticket</div>
          <div className="text-[11px] text-[#9B7A8E] mt-0.5">Your submission is handled confidentially</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-[11px] font-semibold text-[#9B7A8E] uppercase tracking-wider mb-2">
          Ticket Type <span className="text-[#CD166E]">*</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_META).map(([k, m]) => (
            <button key={k} onClick={() => set("type", k)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all flex items-center gap-1.5 ${
                form.type === k
                  ? "bg-[#730042] text-white border-[#730042]"
                  : "bg-[#FBF8FE] text-[#5C3A50] border-[rgba(115,0,66,0.12)] hover:bg-[rgba(115,0,66,0.06)]"
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
        <div>
          <div className="text-[11px] font-semibold text-[#9B7A8E] uppercase tracking-wider mb-1.5">
            Category <span className="text-[#CD166E]">*</span>
          </div>
          <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select…</option>
            {cats.map((c) => <option key={c} value={c}>{CAT_LABELS[c] || c}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-[#9B7A8E] uppercase tracking-wider mb-1.5">Severity</div>
          <select className={inputCls} value={form.severity} onChange={(e) => set("severity", e.target.value)}>
            {Object.entries(SEV_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-3.5">
        <div className="text-[11px] font-semibold text-[#9B7A8E] uppercase tracking-wider mb-1.5">
          Title <span className="text-[#CD166E]">*</span>
        </div>
        <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Brief, clear title…" maxLength={120} />
      </div>

      <div className="mb-3.5">
        <div className="text-[11px] font-semibold text-[#9B7A8E] uppercase tracking-wider mb-1.5">
          Description <span className="text-[#CD166E]">*</span>
        </div>
        <textarea className={`${inputCls} resize-y leading-relaxed`} rows={4} value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe the issue with dates, people involved, and what happened…" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
        <div>
          <div className="text-[11px] font-semibold text-[#9B7A8E] uppercase tracking-wider mb-1.5">Incident Date</div>
          <input className={inputCls} type="date" value={form.incidentDate} onChange={(e) => set("incidentDate", e.target.value)} />
        </div>
        <div>
          <div className="text-[11px] font-semibold text-[#9B7A8E] uppercase tracking-wider mb-1.5">Location</div>
          <input className={inputCls} value={form.incidentLocation} onChange={(e) => set("incidentLocation", e.target.value)} placeholder="Office floor, remote…" />
        </div>
      </div>

      <div className="mb-5">
        <div className="text-[11px] font-semibold text-[#9B7A8E] uppercase tracking-wider mb-1.5">
          Witness Names <span className="text-[10px] normal-case font-normal">(comma-separated)</span>
        </div>
        <input className={inputCls} value={form.witnessNames} onChange={(e) => set("witnessNames", e.target.value)} placeholder="John Doe, Jane Smith" />
      </div>

      <div className="flex items-center gap-3 mb-5 bg-violet-50 rounded-xl p-3.5 border border-violet-100">
        <button onClick={() => set("isAnonymous", !form.isAnonymous)}
          className={`relative w-11 h-6 rounded-full border-none transition-colors flex-shrink-0 cursor-pointer ${form.isAnonymous ? "bg-[#730042]" : "bg-gray-300"}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isAnonymous ? "left-6" : "left-1"}`} />
        </button>
        <div>
          <div className="text-[12px] font-semibold text-violet-700">Submit Anonymously</div>
          <div className="text-[11px] text-violet-500 mt-0.5">Your identity will be hidden from Super Admin</div>
        </div>
      </div>

      <button onClick={submit} disabled={mut.isPending}
        className="w-full bg-gradient-to-r from-[#730042] to-[#CD166E] text-white rounded-xl py-3.5 text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        {mut.isPending ? (
          <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Submitting…</>
        ) : "Submit Ticket →"}
      </button>

      {toast && (
        <div className={`mt-3 px-4 py-2.5 rounded-xl text-[13px] font-medium border ${
          toast.kind === "ok" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {toast.kind === "ok" ? "✓ " : "✕ "}{toast.msg}
        </div>
      )}
    </div>
  );
}

function TicketDetail({ ticketNumber, onBack }) {
  const { data, isLoading } = useGetEmployeeTicketDetail(ticketNumber);
  const [tab, setTab] = useState("overview");
  const ticket = data?.ticket;

  const backBtn = (
    <button onClick={onBack} className="inline-flex items-center gap-1.5 bg-transparent border-none text-[#730042] text-[13px] font-semibold cursor-pointer mb-3.5 p-0">
      ← Back to My Tickets
    </button>
  );

  if (isLoading)
    return (
      <div>
        {backBtn}
        <div className="bg-white rounded-2xl border border-[rgba(115,0,66,0.1)] p-6 flex flex-col gap-3">
          {[200, 120, 80, 160, 100].map((w, i) => (
            <div key={i} className="h-3.5 rounded-lg bg-gradient-to-r from-[#f0e8ed] via-[#f8f3f6] to-[#f0e8ed] animate-pulse" style={{ width: w, maxWidth: "100%" }} />
          ))}
        </div>
      </div>
    );

  if (!ticket)
    return (
      <div>
        {backBtn}
        <div className="text-center py-10 text-[#9B7A8E]">Ticket not found.</div>
      </div>
    );

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "timeline", label: `Timeline (${ticket.timeline?.length || 0})` },
    { key: "updates", label: "Updates" },
  ];

  return (
    <div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {backBtn}
      <div className="bg-white rounded-2xl border border-[rgba(115,0,66,0.1)] overflow-hidden shadow-[0_4px_24px_rgba(80,20,90,0.06)]">
        <div className="bg-[rgba(115,0,66,0.03)] p-4 sm:p-5 border-b border-[rgba(115,0,66,0.1)]">
          <div className="flex items-start gap-3 flex-wrap mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex gap-1.5 flex-wrap mb-2.5 items-center">
                <span className="text-[10px] font-bold text-[#9B7A8E] tracking-wide">{ticket.ticketNumber}</span>
                <TypeChip type={ticket.type} />
                <StatusChip status={ticket.status} />
                <SevChip sev={ticket.severity} />
                {ticket.isOverdue && <Chip bg="bg-red-50" text="text-red-700">⚠ Overdue</Chip>}
                {ticket.isEscalated && <Chip bg="bg-orange-50" text="text-orange-700">🔺 Escalated</Chip>}
              </div>
              <div className="text-[16px] sm:text-[17px] font-bold text-[#1A0A12] leading-snug mb-1">{ticket.title}</div>
              <div className="text-[11px] text-[#9B7A8E]">Submitted {timeAgo(ticket.createdAt)} · SLA: {fmt(ticket.slaDeadline)}</div>
            </div>
          </div>
          <div className="flex gap-1 bg-white/70 rounded-xl p-1 w-fit border border-[rgba(115,0,66,0.1)] flex-wrap">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3.5 py-1.5 rounded-lg border-none cursor-pointer text-[12px] transition-all font-[inherit] ${
                  tab === t.key ? "bg-[#730042] text-white font-semibold" : "bg-transparent text-[#9B7A8E] font-normal"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {tab === "overview" && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-[10px] font-bold text-[#9B7A8E] uppercase tracking-wide mb-2">Description</div>
                <div className="text-[13px] text-[#5C3A50] leading-relaxed bg-[#FBF8FE] rounded-xl p-4 border border-[rgba(115,0,66,0.1)] border-l-4 border-l-[#730042]">
                  {ticket.description}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <InfoRow label="Category" val={CAT_LABELS[ticket.category] || ticket.category} />
                <InfoRow label="Severity" val={<SevChip sev={ticket.severity} />} />
                <InfoRow label="Created" val={fmtFull(ticket.createdAt)} />
                <InfoRow label="SLA Deadline" val={fmt(ticket.slaDeadline)} />
                <InfoRow label="Incident Date" val={ticket.incidentDate ? fmt(ticket.incidentDate) : "Not specified"} />
                <InfoRow label="Location" val={ticket.incidentLocation || "Not specified"} />
                <InfoRow label="Confidentiality" val={(ticket.confidentialityLevel || "").replace(/_/g, " ")} />
                <InfoRow label="Anonymous" val={ticket.isAnonymous ? "Yes" : "No"} />
              </div>
              {ticket.witnessNames?.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-100">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-2">Witnesses</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.witnessNames.map((w, i) => <Chip key={i} bg="bg-amber-100" text="text-amber-800">👤 {w}</Chip>)}
                  </div>
                </div>
              )}
              {ticket.resolutionSummary && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="text-[10px] font-bold text-green-800 uppercase tracking-wide mb-1.5">✓ Resolution Summary</div>
                  <div className="text-[13px] text-green-700 leading-relaxed">{ticket.resolutionSummary}</div>
                </div>
              )}
              {ticket.rejectionReason && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                  <div className="text-[10px] font-bold text-red-800 uppercase tracking-wide mb-1.5">✕ Rejection Reason</div>
                  <div className="text-[13px] text-red-700 leading-relaxed">{ticket.rejectionReason}</div>
                </div>
              )}
              <div className="bg-[#FBF8FE] rounded-xl p-4 border border-[rgba(115,0,66,0.1)]">
                <div className="text-[10px] font-bold text-[#9B7A8E] uppercase tracking-wide mb-3">SLA Metrics</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10px] text-[#9B7A8E] mb-1">First Response</div>
                    <div className="text-[16px] font-bold text-[#1A0A12]">{ticket.firstResponseHours != null ? `${ticket.firstResponseHours}h` : "Pending"}</div>
                  </div>
                  {ticket.resolutionTimeHours != null && (
                    <div>
                      <div className="text-[10px] text-[#9B7A8E] mb-1">Resolution</div>
                      <div className="text-[16px] font-bold text-green-700">{ticket.resolutionTimeHours}h</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] text-[#9B7A8E] mb-1">Reopened</div>
                    <div className="text-[16px] font-bold text-[#1A0A12]">{ticket.reopenCount || 0}×</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "timeline" && (
            <div>
              {!ticket.timeline?.length ? (
                <div className="text-center py-9 text-[13px] text-[#9B7A8E]">No timeline entries yet</div>
              ) : (
                [...ticket.timeline].reverse().map((e, i, arr) => {
                  const dot = TL_COLORS[e.action] || "#730042";
                  const isLast = i === arr.length - 1;
                  return (
                    <div key={e._id || i} className="flex gap-3">
                      <div className="flex flex-col items-center w-3 flex-shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: dot, boxShadow: `0 0 0 3px ${dot}22` }} />
                        {!isLast && <div className="w-px flex-1 mt-1 mb-0 min-h-[14px]" style={{ background: `${dot}30` }} />}
                      </div>
                      <div className={`flex-1 ${isLast ? "" : "pb-5"}`}>
                        <div className="text-[11px] font-bold capitalize tracking-wide" style={{ color: dot }}>{e.action.replace(/_/g, " ")}</div>
                        {e.fromStatus && e.toStatus && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <StatusChip status={e.fromStatus} />
                            <span className="text-[#9B7A8E] text-[11px]">→</span>
                            <StatusChip status={e.toStatus} />
                          </div>
                        )}
                        {e.note && (
                          <div className="bg-[#FBF8FE] rounded-lg px-3 py-2 mt-1.5 text-[12px] text-[#5C3A50] leading-relaxed border border-[rgba(115,0,66,0.1)]" style={{ borderLeft: `2px solid ${dot}` }}>
                            {e.note}
                          </div>
                        )}
                        <div className="text-[10px] text-[#9B7A8E] mt-1.5">{fmtFull(e.timestamp)}{e.byName && ` · ${e.byName}`}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "updates" && (
            <div className="flex flex-col gap-4">
              {ticket.superAdminNote ? (
                <div className="bg-green-50 rounded-xl p-4 sm:p-5 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📩</span>
                    <span className="text-[11px] font-bold text-green-800 uppercase tracking-wide">Admin Reply</span>
                  </div>
                  <div className="text-[13px] text-green-700 leading-relaxed">{ticket.superAdminNote}</div>
                </div>
              ) : (
                <div className="text-center py-6 text-[#9B7A8E] text-[13px]">
                  <div className="text-3xl mb-2">📭</div>
                  No public replies from admin yet.
                </div>
              )}
              {ticket.statusHistory?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-[#9B7A8E] uppercase tracking-wide mb-2.5">Status History</div>
                  {[...ticket.statusHistory].reverse().map((h, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 bg-[#FBF8FE] rounded-xl mb-1.5 border border-[rgba(115,0,66,0.1)] flex-wrap">
                      <StatusChip status={h.status} />
                      <div className="flex-1 text-[11px] text-[#9B7A8E] min-w-[100px]">
                        {h.note && <span className="text-[#5C3A50]">{h.note} · </span>}
                        {fmtFull(h.changedAt)}
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
  const { data, isLoading } = useEmployeeGetMyTickets();
  const [selected, setSelected] = useState(null);
  const tickets = data?.tickets || [];

  if (isLoading) return <Spinner />;

  if (selected) return <TicketDetail ticketNumber={selected} onBack={() => setSelected(null)} />;

  if (!tickets.length)
    return (
      <div className="flex items-center justify-center min-h-[280px]">
        <div className="text-center text-[#9B7A8E]">
          <div className="text-4xl mb-2.5">🎫</div>
          <div className="font-semibold text-[14px] text-[#5C3A50]">No tickets submitted yet</div>
          <div className="text-[12px] mt-1">Use the Submit New tab to raise a ticket</div>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-2">
      {tickets.map((t) => (
        <div key={t._id} onClick={() => setSelected(t.ticketNumber)}
          className="bg-white rounded-xl border border-[rgba(115,0,66,0.1)] border-l-4 p-3.5 sm:p-4 cursor-pointer transition-all hover:shadow-[0_6px_20px_rgba(115,0,66,0.1)] hover:-translate-y-px"
          style={{ borderLeftColor: "#730042" }}
        >
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex gap-1.5 flex-wrap mb-2 items-center">
                <span className="text-[10px] font-bold text-[#9B7A8E] tracking-wide">{t.ticketNumber}</span>
                <TypeChip type={t.type} />
                <StatusChip status={t.status} />
                {t.isAnonymous && <Chip bg="bg-gray-100" text="text-gray-500">Anonymous</Chip>}
                {t.isOverdue && <Chip bg="bg-red-50" text="text-red-700">⚠ Overdue</Chip>}
              </div>
              <div className="text-[13px] font-bold text-[#1A0A12] mb-1.5 truncate">{t.title}</div>
              <div className="text-[11px] text-[#9B7A8E]">
                {CAT_LABELS[t.category] || t.category} · SLA: {fmt(t.slaDeadline)} · {timeAgo(t.createdAt)}
              </div>
              {t.superAdminNote && (
                <div className="mt-2.5 bg-green-50 rounded-lg p-2.5 text-[12px] text-green-700 border-l-[3px] border-green-400">
                  <strong>Admin Reply:</strong> {t.superAdminNote}
                </div>
              )}
            </div>
            <span className="text-[10px] text-[#9B7A8E] flex-shrink-0">Tap to view →</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EmployeeTickets() {
  const can = usePermissionStore((s) => s.can);
  const canRaise = can("tickets.can_raise_ticket");
  const canView = can("tickets.can_view_all_tickets");

  const { data } = useEmployeeGetMyTickets();
  const count = data?.count || 0;

  const [tab, setTab] = useState("submit");
  const [accessDenied, setAccessDenied] = useState(false);

  if (!canRaise && !canView) return <NoPermission />;

  const handleTabClick = (key) => {
    if (key === "submit" && !canRaise) { setAccessDenied(true); return; }
    if (key === "mytickets" && !canView) { setAccessDenied(true); return; }
    setTab(key);
  };

  return (
    <div className="min-h-screen bg-[#F9F8F2] p-4 sm:p-6 lg:p-8">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {accessDenied && <AccessDeniedModal onClose={() => setAccessDenied(false)} />}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#730042] to-[#CD166E] flex items-center justify-center text-xl flex-shrink-0">🎫</div>
          <div>
            <h1 className="text-[18px] sm:text-[20px] font-extrabold text-[#1A0A12] m-0">TorchX Voice</h1>
            <p className="text-[12px] text-[#9B7A8E] mt-0.5 m-0">Submit & track your grievances, complaints, and suggestions</p>
          </div>
        </div>

        <div className="flex gap-1 bg-violet-50/50 rounded-xl p-1 mb-5 w-fit border border-[rgba(115,0,66,0.1)] flex-wrap">
          <button
            onClick={() => handleTabClick("submit")}
            className={`px-4 sm:px-5 py-2 rounded-lg border-none cursor-pointer text-[12.5px] transition-all font-[inherit] flex items-center gap-1.5 ${
              tab === "submit" && canRaise
                ? "bg-[#730042] text-white font-semibold"
                : !canRaise
                ? "text-gray-400 bg-gray-100/60"
                : "bg-transparent text-[#9B7A8E]"
            }`}
          >
            {!canRaise && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
            📝 Submit New
          </button>
          <button
            onClick={() => handleTabClick("mytickets")}
            className={`px-4 sm:px-5 py-2 rounded-lg border-none cursor-pointer text-[12.5px] transition-all font-[inherit] flex items-center gap-1.5 ${
              tab === "mytickets" && canView
                ? "bg-[#730042] text-white font-semibold"
                : !canView
                ? "text-gray-400 bg-gray-100/60"
                : "bg-transparent text-[#9B7A8E]"
            }`}
          >
            {!canView && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
            📋 My Tickets{count ? ` (${count})` : ""}
          </button>
        </div>

        {tab === "submit" && canRaise && <SubmitForm onSuccess={() => canView && setTab("mytickets")} />}
        {tab === "mytickets" && canView && <MyTickets />}
      </div>
    </div>
  );
}