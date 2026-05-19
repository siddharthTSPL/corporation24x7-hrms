import React, { useState, useCallback } from "react";
import { useSubmitTicket, useGetMyTickets, useRateTicket } from "../../auth/server-state/adminticket/adminticket.hook";

const COLOR = {
  primary: "#065F46",
  primaryLight: "#10B981",
  accent: "#CD166E",
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#22C55E",
  info: "#3B82F6",
  neutral: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
  },
};

const TICKET_TYPES = {
  suggestion: { label: "Suggestion", icon: "💡", color: "#22C55E" },
  complaint: { label: "Complaint", icon: "📋", color: "#F59E0B" },
  posh: { label: "POSH", icon: "🔴", color: "#EF4444" },
  grievance: { label: "Grievance", icon: "⚖️", color: "#8B5CF6" },
  whistleblower: { label: "Whistleblower", icon: "🔒", color: "#3B82F6" },
};

const TICKET_STATUSES = {
  open: { label: "Open", dot: "#F59E0B" },
  acknowledged: { label: "Acknowledged", dot: "#3B82F6" },
  under_review: { label: "Under Review", dot: "#8B5CF6" },
  action_taken: { label: "Action Taken", dot: "#10B981" },
  resolved: { label: "Resolved", dot: "#22C55E" },
  closed: { label: "Closed", dot: "#6B7280" },
  rejected: { label: "Rejected", dot: "#EF4444" },
};

const CATEGORIES = {
  complaint: ["manager_behavior", "colleague_behavior", "discrimination", "workplace_violence", "hostile_work_environment", "inappropriate_behavior", "other"],
  posh: ["sexual_harassment", "inappropriate_behavior", "hostile_work_environment", "other"],
  grievance: ["compensation_issue", "workload_stress", "unfair_treatment", "policy_violation", "other"],
  suggestion: ["process_improvement", "technology_tools", "policy_feedback", "culture_diversity", "benefits_perks", "training_development", "other"],
  whistleblower: ["financial_fraud", "data_breach", "safety_violation", "legal_compliance", "other"],
};

const CATEGORY_LABELS = {
  sexual_harassment: "Sexual Harassment",
  hostile_work_environment: "Hostile Work Environment",
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
  training_development: "Training & Development",
  financial_fraud: "Financial Fraud",
  data_breach: "Data Breach",
  safety_violation: "Safety Violation",
  legal_compliance: "Legal Compliance",
  other: "Other",
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const timeAgo = (d) => {
  if (!d) return "";
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
      
      @keyframes slideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-thumb { background: ${COLOR.neutral[300]}; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: ${COLOR.neutral[400]}; }
    `}</style>
  );
}

function TicketTypeChip({ type }) {
  const meta = TICKET_TYPES[type] || { label: type, icon: "📌", color: COLOR.neutral[400] };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", fontFamily: "Inter, sans-serif", backgroundColor: `${meta.color}15`, color: meta.color }}>
      <span>{meta.icon}</span>{meta.label}
    </div>
  );
}

function StatusChip({ status }) {
  const meta = TICKET_STATUSES[status] || { label: status, dot: COLOR.neutral[400] };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", fontFamily: "Inter, sans-serif", backgroundColor: `${meta.dot}15`, color: meta.dot }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: meta.dot, display: "inline-block" }} />
      {meta.label}
    </div>
  );
}

function SeverityBadge({ severity }) {
  const map = { low: { color: "#22C55E", label: "Low" }, medium: { color: "#F59E0B", label: "Medium" }, high: { color: "#EF4444", label: "High" }, critical: { color: "#991B1B", label: "Critical" } };
  const meta = map[severity] || map.medium;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", fontFamily: "Inter, sans-serif", backgroundColor: `${meta.color}20`, color: meta.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
      ⚠️ {meta.label}
    </span>
  );
}

function SubmitTicketForm({ onSuccess }) {
  const [form, setForm] = useState({
    type: "complaint",
    category: "",
    subCategory: "",
    title: "",
    description: "",
    incidentDate: "",
    incidentLocation: "",
    witnessNames: "",
    severity: "medium",
    isAnonymous: false,
  });
  const [toast, setToast] = useState(null);
  const submitMut = useSubmitTicket();

  const set = useCallback((field, value) => {
    setForm((p) => {
      const n = { ...p, [field]: value };
      if (field === "type") {
        n.category = "";
        n.subCategory = "";
      }
      return n;
    });
  }, []);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.category) {
      showToast("Please fill all required fields", "error");
      return;
    }
    try {
      await submitMut.mutateAsync({
        ...form,
        witnessNames: form.witnessNames ? form.witnessNames.split(",").map(s => s.trim()).filter(Boolean) : [],
      });
      showToast("Ticket submitted successfully! 🎉", "success");
      setForm({
        type: "complaint",
        category: "",
        subCategory: "",
        title: "",
        description: "",
        incidentDate: "",
        incidentLocation: "",
        witnessNames: "",
        severity: "medium",
        isAnonymous: false,
      });
      onSuccess?.();
    } catch (e) {
      showToast(e?.response?.data?.message || "Submission failed", "error");
    }
  };

  const cats = CATEGORIES[form.type] || [];

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${COLOR.neutral[200]}`, padding: 28, boxShadow: "0 4px 20px rgba(60,20,80,.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${COLOR.primary},${COLOR.primaryLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 4px 14px ${COLOR.primary}40` }}>📝</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: COLOR.neutral[800], fontFamily: "Outfit, sans-serif" }}>New Ticket</div>
          <div style={{ fontSize: 12, color: COLOR.neutral[500], fontFamily: "Inter, sans-serif" }}>Submit confidential ticket</div>
        </div>
        <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, background: `${COLOR.primaryLight}20`, color: COLOR.primary, fontSize: 11, fontWeight: 700, fontFamily: "Inter, sans-serif" }}>Admin</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.neutral[500], textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7, display: "block", fontFamily: "Inter, sans-serif" }}>
          Ticket Type <span style={{ color: COLOR.danger }}>*</span>
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(TICKET_TYPES).map(([k, m]) => (
            <button
              key={k}
              onClick={() => set("type", k)}
              style={{
                padding: "7px 14px",
                borderRadius: 10,
                border: `1.5px solid ${form.type === k ? COLOR.primary : COLOR.neutral[200]}`,
                background: form.type === k ? `linear-gradient(135deg,${COLOR.primary},${COLOR.primaryLight})` : "#fff",
                color: form.type === k ? "#fff" : COLOR.neutral[600],
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                transition: "all .18s",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.neutral[500], textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7, display: "block", fontFamily: "Inter, sans-serif" }}>Category <span style={{ color: COLOR.danger }}>*</span></label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
              color: COLOR.neutral[800],
              background: COLOR.neutral[50],
              border: `1.5px solid ${COLOR.neutral[200]}`,
              outline: "none",
              transition: "border .2s",
              cursor: "pointer",
            }}
          >
            <option value="">Select category…</option>
            {cats.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] || c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.neutral[500], textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7, display: "block", fontFamily: "Inter, sans-serif" }}>Severity</label>
          <select
            value={form.severity}
            onChange={(e) => set("severity", e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
              color: COLOR.neutral[800],
              background: COLOR.neutral[50],
              border: `1.5px solid ${COLOR.neutral[200]}`,
              outline: "none",
              transition: "border .2s",
              cursor: "pointer",
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.neutral[500], textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7, display: "block", fontFamily: "Inter, sans-serif" }}>Title <span style={{ color: COLOR.danger }}>*</span></label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Brief, clear title…"
          maxLength={120}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            color: COLOR.neutral[800],
            background: COLOR.neutral[50],
            border: `1.5px solid ${COLOR.neutral[200]}`,
            outline: "none",
            transition: "border .2s",
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.neutral[500], textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7, display: "block", fontFamily: "Inter, sans-serif" }}>Description <span style={{ color: COLOR.danger }}>*</span></label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe in detail…"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            color: COLOR.neutral[800],
            background: COLOR.neutral[50],
            border: `1.5px solid ${COLOR.neutral[200]}`,
            outline: "none",
            transition: "border .2s",
            resize: "vertical",
            lineHeight: 1.7,
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.neutral[500], textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7, display: "block", fontFamily: "Inter, sans-serif" }}>Incident Date</label>
          <input
            type="date"
            value={form.incidentDate}
            onChange={(e) => set("incidentDate", e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
              color: COLOR.neutral[800],
              background: COLOR.neutral[50],
              border: `1.5px solid ${COLOR.neutral[200]}`,
              outline: "none",
              cursor: "pointer",
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.neutral[500], textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7, display: "block", fontFamily: "Inter, sans-serif" }}>Location</label>
          <input
            type="text"
            value={form.incidentLocation}
            onChange={(e) => set("incidentLocation", e.target.value)}
            placeholder="Office, floor, remote…"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
              color: COLOR.neutral[800],
              background: COLOR.neutral[50],
              border: `1.5px solid ${COLOR.neutral[200]}`,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: COLOR.neutral[500], textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 7, display: "block", fontFamily: "Inter, sans-serif" }}>Witness Names</label>
        <input
          type="text"
          value={form.witnessNames}
          onChange={(e) => set("witnessNames", e.target.value)}
          placeholder="John Doe, Jane Smith"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            color: COLOR.neutral[800],
            background: COLOR.neutral[50],
            border: `1.5px solid ${COLOR.neutral[200]}`,
            outline: "none",
          }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, background: "#FAF5FF", borderRadius: 12, padding: "12px 16px", border: `1px solid ${COLOR.neutral[200]}` }}>
        <button
          onClick={() => set("isAnonymous", !form.isAnonymous)}
          style={{
            width: 42,
            height: 24,
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            background: form.isAnonymous ? `linear-gradient(135deg,${COLOR.primary},${COLOR.primaryLight})` : COLOR.neutral[200],
            transition: "background .2s",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <span style={{ position: "absolute", top: 3, left: form.isAnonymous ? 20 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} />
        </button>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLOR.accent, fontFamily: "Inter, sans-serif" }}>Submit Anonymously</div>
          <div style={{ fontSize: 11, color: COLOR.neutral[500], fontFamily: "Inter, sans-serif" }}>Identity not disclosed</div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitMut.isPending}
        style={{
          width: "100%",
          background: `linear-gradient(135deg,${COLOR.primary},${COLOR.primaryLight})`,
          color: "#fff",
          padding: 13,
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          border: "none",
          cursor: submitMut.isPending ? "not-allowed" : "pointer",
          fontFamily: "Outfit, sans-serif",
          boxShadow: `0 4px 16px ${COLOR.primary}40`,
          opacity: submitMut.isPending ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "all .2s",
        }}
      >
        {submitMut.isPending ? (
          <>
            <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.4)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
            Submitting…
          </>
        ) : (
          <>📤 Submit Ticket</>
        )}
      </button>

      {toast && (
        <div style={{ marginTop: 14, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontFamily: "Inter, sans-serif", fontWeight: 500, background: toast.type === "success" ? `${COLOR.primaryLight}20` : `${COLOR.danger}20`, color: toast.type === "success" ? COLOR.primaryLight : COLOR.danger, border: `1px solid ${toast.type === "success" ? COLOR.primaryLight : COLOR.danger}40` }}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}
    </div>
  );
}

function RateModal({ ticket, onClose }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const rateMut = useRateTicket();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,0,30,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: COLOR.neutral[800], fontFamily: "Outfit, sans-serif", marginBottom: 4 }}>Rate Your Experience</div>
        <div style={{ fontSize: 12, color: COLOR.neutral[500], fontFamily: "Inter, sans-serif", marginBottom: 20 }}>{ticket.ticketNumber}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, justifyContent: "center" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              style={{ fontSize: 30, background: "none", border: "none", cursor: "pointer", opacity: n <= rating ? 1 : 0.3, transition: "opacity .15s,transform .15s", transform: n <= rating ? "scale(1.1)" : "scale(1)" }}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional feedback…"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            color: COLOR.neutral[800],
            background: COLOR.neutral[50],
            border: `1.5px solid ${COLOR.neutral[200]}`,
            outline: "none",
            marginBottom: 16,
            resize: "none",
          }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ background: COLOR.neutral[100], color: COLOR.neutral[600], padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Inter, sans-serif", flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (!rating) return;
              await rateMut.mutateAsync({ ticketNumber: ticket.ticketNumber, rating, feedback });
              onClose();
            }}
            disabled={!rating || rateMut.isPending}
            style={{
              background: `linear-gradient(135deg,${COLOR.primary},${COLOR.primaryLight})`,
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              cursor: !rating || rateMut.isPending ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "Inter, sans-serif",
              flex: 1,
              opacity: !rating || rateMut.isPending ? 0.6 : 1,
            }}
          >
            {rateMut.isPending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MyTickets() {
  const { data, isLoading } = useGetMyTickets();
  const [rateTarget, setRateTarget] = useState(null);
  const tickets = data?.tickets || [];

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <div style={{ width: 34, height: 34, border: `3px solid ${COLOR.neutral[200]}`, borderTop: `3px solid ${COLOR.primary}`, borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto", marginBottom: 12 }} />
        <p style={{ fontSize: 12, color: COLOR.neutral[500], fontFamily: "Inter, sans-serif" }}>Loading…</p>
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: COLOR.neutral[500], fontFamily: "Inter, sans-serif" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
        <div style={{ fontWeight: 500 }}>No tickets yet</div>
      </div>
    );
  }

  return (
    <>
      {tickets.map((t, i) => {
        const tm = TICKET_TYPES[t.type] || {};
        const canRate = ["resolved", "closed"].includes(t.status) && !t.submitterRating;
        return (
          <div
            key={t._id}
            style={{
              background: "#fff",
              borderRadius: 16,
              border: `1px solid ${COLOR.neutral[200]}`,
              padding: "18px 20px",
              marginBottom: 10,
              boxShadow: "0 2px 10px rgba(60,20,80,.06)",
              transition: "all .22s ease",
              animation: `slideIn .3s ease both`,
              animationDelay: `${i * 0.05}s`,
              borderLeft: `3px solid ${tm.color || COLOR.primary}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 7, alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: COLOR.neutral[500], fontFamily: "Inter, sans-serif" }}>{t.ticketNumber}</span>
                  <TicketTypeChip type={t.type} />
                  <StatusChip status={t.status} />
                  {t.isAnonymous && <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", fontFamily: "Inter, sans-serif", backgroundColor: `${COLOR.neutral[400]}15`, color: COLOR.neutral[600] }}>🔒 Anonymous</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.neutral[800], fontFamily: "Outfit, sans-serif", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                <div style={{ fontSize: 11, color: COLOR.neutral[500], fontFamily: "Inter, sans-serif" }}>
                  {CATEGORY_LABELS[t.category] || t.category} · SLA: {fmt(t.slaDeadline)} · {timeAgo(t.createdAt)}
                </div>
                {t.superAdminNote && (
                  <div style={{ marginTop: 8, background: `${COLOR.primaryLight}20`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: COLOR.primary, fontFamily: "Inter, sans-serif", borderLeft: `3px solid ${COLOR.primaryLight}` }}>
                    <strong>Admin Reply:</strong> {t.superAdminNote}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                {canRate && (
                  <button
                    onClick={() => setRateTarget(t)}
                    style={{
                      background: `linear-gradient(135deg,${COLOR.warning},${COLOR.warning}cc)`,
                      color: "#fff",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    ⭐ Rate
                  </button>
                )}
                {t.submitterRating && <div style={{ fontSize: 11, color: COLOR.neutral[600], fontFamily: "Inter, sans-serif" }}>{"★".repeat(t.submitterRating)}</div>}
              </div>
            </div>
          </div>
        );
      })}
      {rateTarget && <RateModal ticket={rateTarget} onClose={() => setRateTarget(null)} />}
    </>
  );
}

export default function AdminTickets() {
  const [tab, setTab] = useState("submit");
  const { data } = useGetMyTickets();
  const count = data?.count || 0;

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg,#F0FDF4 0%,#ECFDF5 50%,#F0FDF4 100%)`, fontFamily: "Inter, sans-serif", padding: "32px 36px", marginLeft: 0 }}>
      <GlobalStyles />

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div style={{ width: 50, height: 50, borderRadius: 16, background: `linear-gradient(135deg,${COLOR.primary},${COLOR.primaryLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: `0 6px 22px ${COLOR.primary}40` }}>🎫</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.neutral[800], margin: 0, fontFamily: "Outfit, sans-serif" }}>My Tickets</h1>
          <p style={{ fontSize: 12, color: COLOR.neutral[500], margin: "3px 0 0" }}>Admin · Submit & track tickets</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, background: `${COLOR.primaryLight}15`, borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content", border: `1px solid ${COLOR.primaryLight}40` }}>
        {[
          ["submit", "📝 Submit New"],
          ["mytickets", `📋 My Tickets (${count})`],
        ].map(([k, l]) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: "8px 20px",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                fontFamily: "Inter, sans-serif",
                color: active ? "#fff" : COLOR.neutral[600],
                background: active ? `linear-gradient(135deg,${COLOR.primary},${COLOR.primaryLight})` : "transparent",
                boxShadow: active ? `0 2px 10px ${COLOR.primary}40` : "none",
                transition: "all .2s",
              }}
            >
              {l}
            </button>
          );
        })}
      </div>

      <div style={{ maxWidth: 720 }}>
        {tab === "submit" && <SubmitTicketForm onSuccess={() => setTab("mytickets")} />}
        {tab === "mytickets" && <MyTickets />}
      </div>
    </div>
  );
}