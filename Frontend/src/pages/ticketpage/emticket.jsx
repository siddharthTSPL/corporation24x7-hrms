import React, { useState, useCallback } from "react";
import {
  useEmployeeSubmitTicket,
  useEmployeeGetMyTickets,
  useEmployeeRateTicket,
  useGetEmployeeTicketDetail,
} from "../../auth/server-state/employee/employeeticket/employeeticket.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

const C = {
  primary: "#730042",
  accent: "#CD166E",
  bg: "#F9F8F2",
  card: "#ffffff",
  border: "rgba(115,0,66,0.1)",
  muted: "#9B7A8E",
  text: "#1A0A12",
  sub: "#5C3A50",
  surface: "#FBF8FE",
};

const TYPE_META = {
  suggestion:    { label: "Suggestion",    bg: "#ECFDF5", color: "#065F46", dot: "#10B981", icon: "💡" },
  complaint:     { label: "Complaint",     bg: "#FFFBEB", color: "#78350F", dot: "#F59E0B", icon: "📋" },
  posh:          { label: "POSH",          bg: "#FEF2F2", color: "#7F1D1D", dot: "#EF4444", icon: "🔴" },
  grievance:     { label: "Grievance",     bg: "#EDE9FE", color: "#4C1D95", dot: "#7C3AED", icon: "⚖️" },
  whistleblower: { label: "Whistleblower", bg: "#EFF6FF", color: "#1E3A5F", dot: "#3B82F6", icon: "🔒" },
};

const STATUS_META = {
  open:         { label: "Open",          bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  acknowledged: { label: "Acknowledged",  bg: "#EFF6FF", color: "#1D4ED8", dot: "#3B82F6" },
  under_review: { label: "Under Review",  bg: "#F5F3FF", color: "#5B21B6", dot: "#8B5CF6" },
  action_taken: { label: "Action Taken",  bg: "#ECFDF5", color: "#065F46", dot: "#10B981" },
  resolved:     { label: "Resolved",      bg: "#F0FDF4", color: "#14803D", dot: "#22C55E" },
  closed:       { label: "Closed",        bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" },
  rejected:     { label: "Rejected",      bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  reopened:     { label: "Reopened",      bg: "#FFF7ED", color: "#9A3412", dot: "#F97316" },
};

const SEV_META = {
  low:      { label: "Low",      bg: "#F0FDF4", color: "#065F46" },
  medium:   { label: "Medium",   bg: "#FFFBEB", color: "#78350F" },
  high:     { label: "High",     bg: "#FFF7ED", color: "#9A3412" },
  critical: { label: "Critical", bg: "#FEF2F2", color: "#7F1D1D" },
};

const CATEGORIES = {
  complaint:     ["manager_behavior","colleague_behavior","discrimination","workplace_violence","hostile_work_environment","inappropriate_behavior","other"],
  posh:          ["sexual_harassment","inappropriate_behavior","hostile_work_environment","other"],
  grievance:     ["compensation_issue","workload_stress","unfair_treatment","policy_violation","other"],
  suggestion:    ["process_improvement","technology_tools","policy_feedback","culture_diversity","benefits_perks","training_development","other"],
  whistleblower: ["financial_fraud","data_breach","safety_violation","legal_compliance","other"],
};

const CAT_LABELS = {
  sexual_harassment: "Sexual Harassment", hostile_work_environment: "Hostile Work Env.",
  inappropriate_behavior: "Inappropriate Behavior", manager_behavior: "Manager Behavior",
  colleague_behavior: "Colleague Behavior", discrimination: "Discrimination",
  workplace_violence: "Workplace Violence", policy_violation: "Policy Violation",
  compensation_issue: "Compensation Issue", workload_stress: "Workload / Stress",
  unfair_treatment: "Unfair Treatment", process_improvement: "Process Improvement",
  technology_tools: "Technology & Tools", policy_feedback: "Policy Feedback",
  culture_diversity: "Culture & Diversity", benefits_perks: "Benefits & Perks",
  training_development: "Training & Dev.", financial_fraud: "Financial Fraud",
  data_breach: "Data Breach", safety_violation: "Safety Violation",
  legal_compliance: "Legal Compliance", other: "Other",
};

const TL_COLORS = {
  ticket_created: "#CD166E", status_changed: "#3B82F6", note_added: "#10B981",
  internal_note_added: "#7C3AED", priority_changed: "#F97316",
  escalated: "#EF4444", acknowledgement_sent: "#3B82F6", rating_submitted: "#F59E0B",
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

const Chip = ({ bg, color, dot, children }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 9px", borderRadius: 20,
    fontSize: 11, fontWeight: 600, background: bg, color,
    flexShrink: 0,
  }}>
    {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot, display: "inline-block", flexShrink: 0 }} />}
    {children}
  </span>
);

const TypeChip = ({ type }) => {
  const m = TYPE_META[type] || { label: type, bg: "#F3F4F6", color: "#374151", icon: "📌" };
  return <Chip bg={m.bg} color={m.color}>{m.icon} {m.label}</Chip>;
};

const StatusChip = ({ status }) => {
  const m = STATUS_META[status] || { label: status, bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };
  return <Chip bg={m.bg} color={m.color} dot={m.dot}>{m.label}</Chip>;
};

const SevChip = ({ sev }) => {
  const m = SEV_META[sev] || { label: sev, bg: "#F3F4F6", color: "#374151" };
  return <Chip bg={m.bg} color={m.color}>{m.label}</Chip>;
};

const InfoRow = ({ label, val }) => (
  <div style={{
    display: "flex", flexDirection: "column", gap: 3,
    padding: "10px 14px", borderRadius: 10,
    background: C.surface, border: `1px solid ${C.border}`,
  }}>
    <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</span>
    <span style={{ fontSize: 12.5, color: C.text, fontWeight: 500 }}>{val || "—"}</span>
  </div>
);

const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", flexDirection: "column", gap: 10 }}>
    <div style={{ width: 28, height: 28, border: `2.5px solid rgba(115,0,66,0.15)`, borderTop: `2.5px solid ${C.primary}`, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Loading…</p>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const BLANK = {
  type: "complaint", category: "", subCategory: "", title: "", description: "",
  incidentDate: "", incidentLocation: "", witnessNames: "", severity: "medium", isAnonymous: false,
};

function SubmitForm({ onSuccess }) {
  const [form, setForm] = useState(BLANK);
  const [toast, setToast] = useState(null);
  const mut = useEmployeeSubmitTicket();

  const set = useCallback(
    (k, v) => setForm((p) => ({ ...p, [k]: v, ...(k === "type" ? { category: "", subCategory: "" } : {}) })),
    []
  );

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
  const inp = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    fontSize: 13, color: C.text, background: "#FDFBFF",
    border: `1.5px solid ${C.border}`, outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{ background: "#fff", borderRadius: 18, border: `1px solid ${C.border}`, padding: "1.5rem", boxShadow: "0 4px 24px rgba(80,20,90,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📝</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>New Ticket</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Your submission is handled confidentially</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>
          Ticket Type <span style={{ color: C.accent }}>*</span>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {Object.entries(TYPE_META).map(([k, m]) => (
            <button
              key={k}
              onClick={() => set("type", k)}
              style={{
                padding: "7px 12px", borderRadius: 10,
                border: `1.5px solid ${form.type === k ? C.primary : C.border}`,
                background: form.type === k ? C.primary : C.surface,
                color: form.type === k ? "#fff" : C.sub,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
                fontFamily: "inherit", transition: "all .18s",
              }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>
            Category <span style={{ color: C.accent }}>*</span>
          </div>
          <select style={inp} value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select…</option>
            {cats.map((c) => <option key={c} value={c}>{CAT_LABELS[c] || c}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>Severity</div>
          <select style={inp} value={form.severity} onChange={(e) => set("severity", e.target.value)}>
            {Object.entries(SEV_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>
          Title <span style={{ color: C.accent }}>*</span>
        </div>
        <input style={inp} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Brief, clear title…" maxLength={120} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>
          Description <span style={{ color: C.accent }}>*</span>
        </div>
        <textarea style={{ ...inp, resize: "vertical", lineHeight: 1.7 }} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the issue with dates, people involved, and what happened…" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>Incident Date</div>
          <input style={inp} type="date" value={form.incidentDate} onChange={(e) => set("incidentDate", e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>Location</div>
          <input style={inp} value={form.incidentLocation} onChange={(e) => set("incidentLocation", e.target.value)} placeholder="Office floor, remote…" />
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6 }}>Witness Names <span style={{ fontWeight: 400, textTransform: "none", fontSize: 10 }}>(comma-separated)</span></div>
        <input style={inp} value={form.witnessNames} onChange={(e) => set("witnessNames", e.target.value)} placeholder="John Doe, Jane Smith" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, background: "#F5F0FE", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(124,58,237,0.12)" }}>
        <button
          onClick={() => set("isAnonymous", !form.isAnonymous)}
          style={{ width: 42, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: form.isAnonymous ? C.primary : "#DDD6F0", transition: "background .2s", position: "relative", flexShrink: 0 }}
        >
          <span style={{ position: "absolute", top: 3, left: form.isAnonymous ? 20 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }} />
        </button>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#5B21B6" }}>Submit Anonymously</div>
          <div style={{ fontSize: 11, color: "#8B5CF6", marginTop: 1 }}>Your identity will be hidden from Super Admin</div>
        </div>
      </div>

      <button
        onClick={submit}
        disabled={mut.isPending}
        style={{ background: `linear-gradient(135deg,${C.primary},${C.accent})`, color: "#fff", width: "100%", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 600, cursor: mut.isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit", opacity: mut.isPending ? 0.7 : 1 }}
      >
        {mut.isPending
          ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.35)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin .6s linear infinite" }} />Submitting…</>
          : "Submit Ticket →"}
      </button>

      {toast && (
        <div style={{ marginTop: 12, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, background: toast.kind === "ok" ? "#F0FDF4" : "#FEF2F2", color: toast.kind === "ok" ? "#065F46" : "#991B1B", border: `1px solid ${toast.kind === "ok" ? "#86EFAC" : "#FCA5A5"}` }}>
          {toast.kind === "ok" ? "✓ " : "✕ "}{toast.msg}
        </div>
      )}
    </div>
  );
}

function RateModal({ ticket, onClose }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const mut = useEmployeeRateTicket();

  const submit = async () => {
    if (!rating) return;
    try {
      await mut.mutateAsync({ ticketNumber: ticket.ticketNumber, rating, feedback });
      onClose();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(16,4,28,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "1.75rem", width: "min(380px,100%)", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", animation: "fadeUp .24s ease both" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 3 }}>Rate Your Experience</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>{ticket.ticketNumber} · {ticket.title}</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 18, justifyContent: "center" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)}
              style={{ fontSize: 32, background: "none", border: "none", cursor: "pointer", opacity: n <= rating ? 1 : 0.25, color: "#F59E0B", transition: "all .15s", transform: n <= rating ? "scale(1.12)" : "scale(1)", padding: "0 2px" }}
            >★</button>
          ))}
        </div>
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional feedback…"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13, border: `1.5px solid ${C.border}`, outline: "none", resize: "none", marginBottom: 18, fontFamily: "inherit", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.sub, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={submit} disabled={!rating || mut.isPending}
            style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.primary},${C.accent})`, color: "#fff", fontSize: 13, fontWeight: 600, cursor: !rating || mut.isPending ? "not-allowed" : "pointer", opacity: !rating ? 0.5 : 1, fontFamily: "inherit" }}
          >
            {mut.isPending ? "Submitting…" : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketDetail({ ticketNumber, onBack, onRate }) {
  const { data, isLoading } = useGetEmployeeTicketDetail(ticketNumber);
  const [tab, setTab] = useState("overview");
  const ticket = data?.ticket;
  const canRate = ticket && ["resolved", "closed"].includes(ticket.status) && !ticket.submitterRating;

  const backBtn = (
    <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.primary, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 14, padding: 0, fontFamily: "inherit" }}>
      ← Back to My Tickets
    </button>
  );

  if (isLoading) return (
    <div>
      {backBtn}
      <div style={{ background: "#fff", borderRadius: 18, border: `1px solid ${C.border}`, padding: 24 }}>
        {[200, 120, 80, 160, 100].map((w, i) => (
          <div key={i} style={{ height: 14, width: w, maxWidth: "100%", borderRadius: 8, background: "linear-gradient(90deg,#f0e8ed 25%,#f8f3f6 50%,#f0e8ed 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", marginBottom: 12 }} />
        ))}
      </div>
    </div>
  );

  if (!ticket) return (
    <div>
      {backBtn}
      <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>Ticket not found.</div>
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

      <div style={{ background: "#fff", borderRadius: 18, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 4px 24px rgba(80,20,90,0.06)" }}>
        <div style={{ background: `rgba(115,0,66,0.04)`, padding: "20px 22px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".5px" }}>{ticket.ticketNumber}</span>
                <TypeChip type={ticket.type} />
                <StatusChip status={ticket.status} />
                <SevChip sev={ticket.severity} />
                {ticket.isOverdue && <Chip bg="#FEF2F2" color="#991B1B">⚠ Overdue</Chip>}
                {ticket.isEscalated && <Chip bg="#FFF7ED" color="#9A3412">🔺 Escalated</Chip>}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text, lineHeight: 1.3, marginBottom: 4 }}>{ticket.title}</div>
              <div style={{ fontSize: 11, color: C.muted }}>Submitted {timeAgo(ticket.createdAt)} · SLA: {fmt(ticket.slaDeadline)}</div>
            </div>
            {canRate && (
              <button onClick={() => onRate(ticket)}
                style={{ background: "linear-gradient(135deg,#D97706,#F59E0B)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}
              >⭐ Rate Resolution</button>
            )}
          </div>

          <div style={{ display: "flex", gap: 3, marginTop: 16, background: "rgba(255,255,255,0.7)", borderRadius: 10, padding: 3, width: "fit-content", border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === t.key ? 600 : 400, fontFamily: "inherit", background: tab === t.key ? C.primary : "transparent", color: tab === t.key ? "#fff" : C.muted, transition: "all .18s" }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "20px 22px" }}>
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Description</div>
                <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.8, background: C.surface, borderRadius: 12, padding: 16, borderLeft: `3px solid ${TYPE_META[ticket.type]?.dot || C.primary}`, border: `1px solid ${C.border}` }}>
                  {ticket.description}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
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
                <div style={{ background: "#FFFBEB", borderRadius: 12, padding: 14, border: "1px solid rgba(245,158,11,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#78350F", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Witnesses</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ticket.witnessNames.map((w, i) => (
                      <Chip key={i} bg="#FEF3C7" color="#78350F">👤 {w}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {ticket.resolutionSummary && (
                <div style={{ background: "#F0FDF4", borderRadius: 12, padding: 16, border: "1px solid rgba(34,197,94,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#065F46", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>✓ Resolution Summary</div>
                  <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.7 }}>{ticket.resolutionSummary}</div>
                </div>
              )}

              {ticket.rejectionReason && (
                <div style={{ background: "#FEF2F2", borderRadius: 12, padding: 16, border: "1px solid rgba(239,68,68,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#7F1D1D", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>✕ Rejection Reason</div>
                  <div style={{ fontSize: 13, color: "#7F1D1D", lineHeight: 1.7 }}>{ticket.rejectionReason}</div>
                </div>
              )}

              {ticket.submitterRating && (
                <div style={{ background: "#FFFBEB", borderRadius: 12, padding: 14, border: "1px solid rgba(245,158,11,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#78350F", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Your Rating</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 18, color: "#D97706", letterSpacing: 2 }}>{"★".repeat(ticket.submitterRating)}{"☆".repeat(5 - ticket.submitterRating)}</span>
                    {ticket.submitterFeedback && <span style={{ fontSize: 12, color: "#78350F" }}>{ticket.submitterFeedback}</span>}
                  </div>
                </div>
              )}

              <div style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 12 }}>SLA Metrics</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>First Response</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{ticket.firstResponseHours != null ? `${ticket.firstResponseHours}h` : "Pending"}</div>
                  </div>
                  {ticket.resolutionTimeHours != null && (
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Resolution</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#065F46" }}>{ticket.resolutionTimeHours}h</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Reopened</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{ticket.reopenCount || 0}×</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "timeline" && (
            <div>
              {!ticket.timeline?.length ? (
                <div style={{ textAlign: "center", padding: "36px 0", color: C.muted, fontSize: 13 }}>No timeline entries yet</div>
              ) : (
                [...ticket.timeline].reverse().map((e, i, arr) => {
                  const dot = TL_COLORS[e.action] || C.primary;
                  const isLast = i === arr.length - 1;
                  return (
                    <div key={e._id || i} style={{ display: "flex", gap: 12, marginBottom: isLast ? 0 : 4 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10, flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 4, boxShadow: `0 0 0 3px ${dot}22` }} />
                        {!isLast && <div style={{ width: 1.5, background: `${dot}30`, flex: 1, margin: "4px auto", minHeight: 14 }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 18 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: dot, textTransform: "capitalize", letterSpacing: ".3px" }}>{e.action.replace(/_/g, " ")}</div>
                        {e.fromStatus && e.toStatus && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                            <StatusChip status={e.fromStatus} /><span style={{ color: C.muted, fontSize: 11 }}>→</span><StatusChip status={e.toStatus} />
                          </div>
                        )}
                        {e.note && (
                          <div style={{ background: C.surface, borderRadius: 8, padding: "8px 12px", marginTop: 6, fontSize: 12, color: C.sub, lineHeight: 1.6, borderLeft: `2px solid ${dot}`, border: `1px solid ${C.border}` }}>{e.note}</div>
                        )}
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>
                          {fmtFull(e.timestamp)}{e.byName && ` · ${e.byName}`}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "updates" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {ticket.superAdminNote ? (
                <div style={{ background: "#F0FDF4", borderRadius: 14, padding: 18, border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>📩</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#065F46", textTransform: "uppercase", letterSpacing: ".5px" }}>Admin Reply</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.75 }}>{ticket.superAdminNote}</div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                  No public replies from admin yet.
                </div>
              )}

              {ticket.statusHistory?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>Status History</div>
                  {[...ticket.statusHistory].reverse().map((h, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.surface, borderRadius: 10, marginBottom: 6, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                      <StatusChip status={h.status} />
                      <div style={{ flex: 1, fontSize: 11, color: C.muted, minWidth: 100 }}>
                        {h.note && <span style={{ color: C.sub }}>{h.note} · </span>}{fmtFull(h.changedAt)}
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

function MyTickets({ canRaise }) {
  const { data, isLoading } = useEmployeeGetMyTickets();
  const [selected, setSelected] = useState(null);
  const [rateTarget, setRateTarget] = useState(null);
  const tickets = data?.tickets || [];

  if (isLoading) return <Spinner />;

  if (selected) return (
    <>
      <TicketDetail ticketNumber={selected} onBack={() => setSelected(null)} onRate={(t) => setRateTarget(t)} />
      {rateTarget && <RateModal ticket={rateTarget} onClose={() => setRateTarget(null)} />}
    </>
  );

  if (!tickets.length) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
      <div style={{ textAlign: "center", color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎫</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.sub }}>No tickets submitted yet</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{canRaise ? "Use the Submit New tab to raise a ticket" : "You don't have permission to submit tickets"}</div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tickets.map((t, i) => {
          const tm = TYPE_META[t.type] || { dot: C.primary };
          const canRate = ["resolved", "closed"].includes(t.status) && !t.submitterRating;
          return (
            <div
              key={t._id}
              onClick={() => setSelected(t.ticketNumber)}
              style={{
                background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${tm.dot}`, padding: "14px 16px",
                cursor: "pointer", transition: "box-shadow 0.18s, transform 0.18s",
                boxShadow: "0 1px 6px rgba(80,20,90,0.05)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(115,0,66,0.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 6px rgba(80,20,90,0.05)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: ".4px" }}>{t.ticketNumber}</span>
                    <TypeChip type={t.type} />
                    <StatusChip status={t.status} />
                    {t.isAnonymous && <Chip bg="#F3F4F6" color="#6B7280">Anonymous</Chip>}
                    {t.isOverdue && <Chip bg="#FEF2F2" color="#991B1B">⚠ Overdue</Chip>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {CAT_LABELS[t.category] || t.category} · SLA: {fmt(t.slaDeadline)} · {timeAgo(t.createdAt)}
                  </div>
                  {t.superAdminNote && (
                    <div style={{ marginTop: 10, background: "#F0FDF4", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#065F46", borderLeft: "3px solid #22C55E" }}>
                      <strong>Admin Reply:</strong> {t.superAdminNote}
                    </div>
                  )}
                  {t.submitterRating && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "#92400E", letterSpacing: 1 }}>
                      {"★".repeat(t.submitterRating)}{"☆".repeat(5 - t.submitterRating)} <span style={{ letterSpacing: 0 }}>You rated this</span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                  {canRate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setRateTarget(t); }}
                      style={{ background: "linear-gradient(135deg,#D97706,#F59E0B)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >⭐ Rate</button>
                  )}
                  <span style={{ fontSize: 10, color: C.muted }}>Tap to view →</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {rateTarget && <RateModal ticket={rateTarget} onClose={() => setRateTarget(null)} />}
    </div>
  );
}

export default function EmployeeTickets() {
  const can = usePermissionStore((s) => s.can);
  const canRaise = can("tickets.can_raise_ticket");
  const canRate = can("tickets.can_rate_ticket");

  const defaultTab = canRaise ? "submit" : "mytickets";
  const [tab, setTab] = useState(defaultTab);
  const { data } = useEmployeeGetMyTickets();
  const count = data?.count || 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "inherit", padding: "clamp(16px,4vw,32px)" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}}
      `}</style>

      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: `linear-gradient(135deg,${C.primary},${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎫</div>
          <div>
            <h1 style={{ fontSize: "clamp(16px,4vw,20px)", fontWeight: 800, color: C.text, margin: 0 }}>TorchX Voice</h1>
            <p style={{ fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Submit & track your grievances, complaints, and suggestions</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 3, background: "rgba(230,220,245,0.5)", borderRadius: 12, padding: 4, marginBottom: 22, width: "fit-content", border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          {canRaise && (
            <button onClick={() => setTab("submit")}
              style={{ padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: tab === "submit" ? 600 : 400, fontFamily: "inherit", background: tab === "submit" ? C.primary : "transparent", color: tab === "submit" ? "#fff" : C.muted, transition: "all .2s" }}
            >📝 Submit New</button>
          )}
          <button onClick={() => setTab("mytickets")}
            style={{ padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: tab === "mytickets" ? 600 : 400, fontFamily: "inherit", background: tab === "mytickets" ? C.primary : "transparent", color: tab === "mytickets" ? "#fff" : C.muted, transition: "all .2s" }}
          >📋 My Tickets{count ? ` (${count})` : ""}</button>
        </div>

        {!canRaise && tab === "submit" && (
          <div style={{ background: "#FEF2F2", borderRadius: 12, padding: "16px 20px", border: "1px solid rgba(239,68,68,0.2)", marginBottom: 16, fontSize: 13, color: "#991B1B" }}>
            You don't have permission to submit tickets. Contact your admin.
          </div>
        )}

        {tab === "submit" && canRaise && <SubmitForm onSuccess={() => setTab("mytickets")} />}
        {tab === "mytickets" && <MyTickets canRaise={canRaise} canRate={canRate} />}
      </div>
    </div>
  );
}