import React, { useMemo, useState } from "react";
import {
  useGetAllRequisitions,
  useGetPendingRequisitions,
  useApproveRequisition,
  useRejectRequisition,
  useHoldRequisition,
  useRequestRevision,
  useAddCandidate,
  useGetCandidatesByRequisition,
  useUpdateCandidateStage,
  useScheduleInterview,
  useSubmitInterviewFeedback,
} from "../../auth/server-state/adminrecruitment/adrecruitment.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";
import {
  FaBriefcase, FaClock, FaCheckCircle, FaTimesCircle,
  FaSearch, FaPlus, FaTimes, FaUsers,
  FaExclamationTriangle, FaChevronRight,
  FaCalendarAlt,
  FaEdit, FaArrowRight,
  FaUserCheck, FaBuilding, FaChartLine,
} from "react-icons/fa";

const initials = (name = "") =>
  (name || "").trim().split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

const PIPELINE_STAGES = [
  "APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW",
  "HR_ROUND", "SELECTED", "OFFER_RELEASED", "JOINED",
];

const STAGE_ORDER = {
  APPLIED:        ["SCREENING", "REJECTED"],
  SCREENING:      ["SHORTLISTED", "REJECTED"],
  SHORTLISTED:    ["INTERVIEW", "REJECTED"],
  INTERVIEW:      ["HR_ROUND", "SELECTED", "REJECTED"],
  HR_ROUND:       ["SELECTED", "REJECTED"],
  SELECTED:       ["OFFER_RELEASED"],
  OFFER_RELEASED: ["JOINED"],
  JOINED:         [],
  REJECTED:       [],
};

const STAGE_META = {
  APPLIED:        { color: "bg-slate-100 text-slate-600",        dot: "bg-slate-400",    label: "Applied" },
  SCREENING:      { color: "bg-amber-50 text-amber-700",         dot: "bg-amber-400",    label: "Screening" },
  SHORTLISTED:    { color: "bg-purple-50 text-purple-700",       dot: "bg-purple-400",   label: "Shortlisted" },
  INTERVIEW:      { color: "bg-blue-50 text-blue-700",           dot: "bg-blue-400",     label: "Interview" },
  HR_ROUND:       { color: "bg-violet-50 text-violet-700",       dot: "bg-violet-500",   label: "HR Round" },
  SELECTED:       { color: "bg-emerald-50 text-emerald-700",     dot: "bg-emerald-500",  label: "Selected" },
  REJECTED:       { color: "bg-red-50 text-red-600",             dot: "bg-red-400",      label: "Rejected" },
  OFFER_RELEASED: { color: "bg-orange-50 text-orange-700",       dot: "bg-orange-400",   label: "Offer Released" },
  JOINED:         { color: "bg-teal-50 text-teal-700",           dot: "bg-teal-500",     label: "Joined" },
};

const STAGE_TIMELINE_META = {
  APPLIED:        { icon: "📋", accent: "#64748b", light: "#f1f5f9" },
  SCREENING:      { icon: "🔍", accent: "#b45309", light: "#fffbeb" },
  SHORTLISTED:    { icon: "⭐", accent: "#7c3aed", light: "#f5f3ff" },
  INTERVIEW:      { icon: "💬", accent: "#1d4ed8", light: "#eff6ff" },
  HR_ROUND:       { icon: "🤝", accent: "#6d28d9", light: "#f5f3ff" },
  SELECTED:       { icon: "✅", accent: "#059669", light: "#ecfdf5" },
  OFFER_RELEASED: { icon: "📄", accent: "#d97706", light: "#fff7ed" },
  JOINED:         { icon: "🎉", accent: "#0d9488", light: "#f0fdfa" },
  REJECTED:       { icon: "❌", accent: "#dc2626", light: "#fef2f2" },
};

const STATUS_META = {
  PENDING:           { color: "bg-amber-50 text-amber-700 border border-amber-200" },
  APPROVED:          { color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  REJECTED:          { color: "bg-red-50 text-red-600 border border-red-200" },
  ON_HOLD:           { color: "bg-orange-50 text-orange-700 border border-orange-200" },
  REVISION_REQUIRED: { color: "bg-blue-50 text-blue-700 border border-blue-200" },
};

const PRIORITY_META = {
  Low:    "bg-slate-100 text-slate-600",
  Medium: "bg-amber-50 text-amber-700",
  High:   "bg-red-50 text-red-600",
  Urgent: "bg-[#f7edf3] text-[#730042]",
};

const DEPT_LABELS = {
  OPR: "Operations", BPO: "BPO", ENG: "Engineering",
  HR: "Human Resources", MGMT: "Management",
};

const StatusPill = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-full uppercase ${STATUS_META[status]?.color || "bg-slate-100 text-slate-600"}`}>
    {(status || "").replace(/_/g, " ")}
  </span>
);

const StageBadge = ({ stage }) => {
  const meta = STAGE_META[stage] || { color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-full uppercase ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
      {(stage || "").replace(/_/g, " ")}
    </span>
  );
};

const PriorityPill = ({ priority }) => (
  <span className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${PRIORITY_META[priority] || "bg-slate-100 text-slate-600"}`}>
    {priority}
  </span>
);

const CandidateTimeline = ({ currentStage }) => {
  if (currentStage === "REJECTED") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
        <span className="text-base">❌</span>
        <div>
          <div className="text-xs font-bold text-red-600">Rejected</div>
          <div className="text-[10px] text-red-400">This candidate was not selected</div>
        </div>
      </div>
    );
  }

  const currentIdx = PIPELINE_STAGES.indexOf(currentStage);

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100 z-0" />
        <div
          className="absolute top-4 left-0 h-0.5 z-0 transition-all duration-500"
          style={{
            background: "linear-gradient(90deg, #730042, #CD166E)",
            width: currentIdx <= 0 ? "0%" : `${(currentIdx / (PIPELINE_STAGES.length - 1)) * 100}%`,
          }}
        />
        {PIPELINE_STAGES.map((stage, idx) => {
          const meta = STAGE_TIMELINE_META[stage];
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={stage} className="relative z-10 flex flex-col items-center gap-1.5" style={{ flex: "0 0 auto" }}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                  isCurrent
                    ? "border-[#730042] shadow-lg scale-110"
                    : isDone
                    ? "border-[#730042]"
                    : "border-gray-200 bg-white"
                }`}
                style={
                  isCurrent
                    ? { background: `linear-gradient(135deg, #730042, #CD166E)` }
                    : isDone
                    ? { background: meta.light }
                    : {}
                }
              >
                {isCurrent ? (
                  <span className="text-white text-xs">{meta.icon}</span>
                ) : isDone ? (
                  <span className="text-xs">{meta.icon}</span>
                ) : (
                  <span className="text-xs opacity-30">{meta.icon}</span>
                )}
              </div>
              <span
                className={`text-[9px] font-semibold text-center leading-tight max-w-[52px] ${
                  isCurrent ? "text-[#730042]" : isDone ? "text-gray-500" : "text-gray-300"
                }`}
              >
                {STAGE_META[stage]?.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RequisitionProgressHeader = ({ requisition, candidates }) => {
  const filledCount = candidates.filter((c) =>
    ["SELECTED", "OFFER_RELEASED", "JOINED"].includes(c.current_stage)
  ).length;
  const remaining = Math.max(0, requisition.openings - filledCount);
  const pct = Math.min(100, Math.round((filledCount / requisition.openings) * 100));
  const deptLabel = DEPT_LABELS[requisition.department] || requisition.department;

  return (
    <div
      className="mx-4 sm:mx-6 mt-5 mb-1 rounded-2xl p-4 sm:p-5 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1a000d 0%, #2e0019 50%, #4a0029 100%)" }}
    >
      <div className="absolute w-40 h-40 rounded-full -top-20 -right-10 bg-white/5 pointer-events-none" />
      <div className="absolute w-24 h-24 rounded-full bottom-0 right-24 bg-white/5 pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
          <FaBuilding size={22} className="text-white/80" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-white/40">{deptLabel}</span>
            <span className="text-white/20">·</span>
            <span className="text-[10px] font-bold tracking-[2px] uppercase text-white/40">{requisition.employment_type}</span>
            <span className="text-white/20">·</span>
            <span className="text-[10px] font-bold tracking-[2px] uppercase text-white/40">{requisition.work_mode}</span>
          </div>
          <h3 className="text-white font-bold text-lg leading-tight mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {requisition.job_title}
          </h3>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct >= 100
                    ? "linear-gradient(90deg, #10b981, #34d399)"
                    : "linear-gradient(90deg, #CD166E, #f472b6)",
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-white/60 whitespace-nowrap">{pct}% filled</span>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-2 flex-shrink-0">
          <div className="text-center sm:text-right">
            <div
              className={`text-3xl sm:text-4xl font-black leading-none ${remaining === 0 ? "text-emerald-400" : "text-white"}`}
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {remaining}
            </div>
            <div className="text-[10px] font-semibold tracking-widest text-white/40 uppercase mt-0.5">
              {remaining === 0 ? "All filled!" : "Seats left"}
            </div>
          </div>
          <div className="hidden sm:block h-px w-16 bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-sm font-bold text-white/70">{filledCount}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wide">Selected</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-sm font-bold text-white/70">{requisition.openings}</div>
              <div className="text-[9px] text-white/30 uppercase tracking-wide">Total</div>
            </div>
          </div>
        </div>
      </div>

      {remaining === 0 && (
        <div className="relative z-10 mt-4 flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-4 py-2">
          <FaCheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-300">
            All {requisition.openings} position{requisition.openings !== 1 ? "s" : ""} have been filled for this requisition.
          </span>
        </div>
      )}
    </div>
  );
};

const AddCandidateModal = ({ requisitionId, onClose }) => {
  const addMut = useAddCandidate();
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", experience: "",
    current_company: "", skills: "", source: "Portal", resume_url: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    await addMut.mutateAsync({
      requisition_id: requisitionId,
      ...form,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-4 sm:px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Add Candidate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors">
            <FaTimes size={14} />
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Full Name", key: "full_name", placeholder: "John Doe", type: "text" },
              { label: "Email", key: "email", placeholder: "john@example.com", type: "email" },
              { label: "Phone", key: "phone", placeholder: "+91 9876543210", type: "text" },
              { label: "Experience", key: "experience", placeholder: "3 years", type: "text" },
              { label: "Current Company", key: "current_company", placeholder: "Acme Corp", type: "text" },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key}>
                <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">{label}</label>
                <input
                  type={type}
                  className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={set(key)}
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Source</label>
              <select
                className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all"
                value={form.source}
                onChange={set("source")}
              >
                {["Portal", "Referral", "LinkedIn", "Walk-in", "Agency", "Other"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Skills (comma separated)</label>
            <input
              className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all"
              placeholder="React, Node.js, MongoDB"
              value={form.skills}
              onChange={set("skills")}
            />
          </div>
          <div className="mt-4">
            <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Resume URL</label>
            <input
              className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all"
              placeholder="https://…"
              value={form.resume_url}
              onChange={set("resume_url")}
            />
          </div>
          {addMut.isError && (
            <p className="text-xs text-red-500 mt-3">{addMut.error?.message || "Failed to add candidate."}</p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:border-[#730042] hover:text-[#730042] transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={addMut.isPending || !form.full_name || !form.email}
            className="flex items-center gap-2 px-5 py-2 bg-[#730042] text-white text-sm font-semibold rounded-xl hover:bg-[#4a0029] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <FaPlus size={10} />
            {addMut.isPending ? "Adding…" : "Add Candidate"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ScheduleInterviewModal = ({ candidateId, onClose }) => {
  const schMut = useScheduleInterview();
  const [form, setForm] = useState({ round_type: "Screening", scheduled_at: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    await schMut.mutateAsync({ id: candidateId, data: form });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Schedule Interview</h2>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors"><FaTimes size={13} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Round Type</label>
            <select className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all" value={form.round_type} onChange={set("round_type")}>
              {["Screening", "Technical", "HR Round", "Final Round", "Other"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Scheduled At</label>
            <input type="datetime-local" className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all" value={form.scheduled_at} onChange={set("scheduled_at")} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:border-[#730042] hover:text-[#730042] transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={schMut.isPending || !form.scheduled_at} className="flex items-center gap-2 px-5 py-2 bg-[#730042] text-white text-sm font-semibold rounded-xl hover:bg-[#4a0029] disabled:opacity-60 disabled:cursor-not-allowed transition-all">
            <FaCalendarAlt size={10} />
            {schMut.isPending ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
};

const CandidateDetailModal = ({ candidate, onClose, onStageUpdate, onFeedback, canAddCandidate }) => {
  const [tab, setTab] = useState("info");
  const [stageForm, setStageForm] = useState({ stage: "", rejection_reason: "", overall_feedback: "" });
  const [feedbackForm, setFeedbackForm] = useState({ feedback: "", score: "", outcome: "Pending" });
  const [selectedRound, setSelectedRound] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const allowed = STAGE_ORDER[candidate.current_stage] || [];
  const fbMut = useSubmitInterviewFeedback();

  const handleFeedback = async (roundId) => {
    await fbMut.mutateAsync({ candidateId: candidate._id, roundId, data: feedbackForm });
    setSelectedRound(null);
    setFeedbackForm({ feedback: "", score: "", outcome: "Pending" });
    onFeedback?.();
  };

  const tabs = [
    { key: "info", label: "Profile" },
    { key: "timeline", label: "Timeline" },
    { key: "rounds", label: `Rounds (${candidate.interview_rounds?.length || 0})` },
    ...(canAddCandidate ? [{ key: "stage", label: "Move Stage" }] : []),
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1050] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-4 sm:px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#730042] to-[#CD166E] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initials(candidate.full_name)}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{candidate.full_name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{candidate.email}</span>
                <span className="text-gray-300">·</span>
                <StageBadge stage={candidate.current_stage} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors"><FaTimes size={13} /></button>
        </div>

        <div className="flex gap-0 px-4 sm:px-6 border-b border-gray-100 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all -mb-px whitespace-nowrap ${tab === t.key ? "border-[#730042] text-[#730042]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">

          {tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Phone", val: candidate.phone },
                  { label: "Experience", val: candidate.experience },
                  { label: "Current Company", val: candidate.current_company || "Fresher" },
                  { label: "Source", val: candidate.source },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-[#fdf5f9] rounded-xl p-3">
                    <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">{label}</div>
                    <div className="text-sm font-semibold text-gray-800">{val || "—"}</div>
                  </div>
                ))}
              </div>
              {candidate.skills?.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((s, i) => (
                      <span key={i} className="text-[11px] font-medium bg-[#f7edf3] text-[#730042] px-3 py-1 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {candidate.overall_feedback && (
                <div className="bg-[#fdf5f9] rounded-xl p-4 border-l-4 border-[#730042]">
                  <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Overall Feedback</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{candidate.overall_feedback}</p>
                </div>
              )}
              {candidate.rejection_reason && (
                <div className="bg-red-50 rounded-xl p-4 border-l-4 border-red-400">
                  <div className="text-[10px] font-semibold tracking-widest text-red-400 uppercase mb-2">Rejection Reason</div>
                  <p className="text-sm text-red-600 leading-relaxed">{candidate.rejection_reason}</p>
                </div>
              )}
            </div>
          )}

          {tab === "timeline" && (
            <div className="space-y-5">
              <div>
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-4">Recruitment Journey</div>
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[520px]">
                    <CandidateTimeline currentStage={candidate.current_stage} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Stage Details</div>
                {PIPELINE_STAGES.map((stage, idx) => {
                  const meta = STAGE_TIMELINE_META[stage];
                  const currentIdx = PIPELINE_STAGES.indexOf(candidate.current_stage);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  if (!isDone && !isCurrent) return null;
                  return (
                    <div
                      key={stage}
                      className="flex items-start gap-3 p-3 rounded-xl border transition-all"
                      style={
                        isCurrent
                          ? { borderColor: meta.accent + "40", background: meta.light }
                          : { borderColor: "#f3f4f6", background: "#fafafa" }
                      }
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                        style={{ background: isCurrent ? meta.accent : meta.light }}
                      >
                        <span className={isCurrent ? "text-white" : ""}>{meta.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700">{STAGE_META[stage]?.label}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: meta.accent }}>
                              CURRENT
                            </span>
                          )}
                          {isDone && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              COMPLETED
                            </span>
                          )}
                        </div>
                        {isCurrent && candidate.overall_feedback && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{candidate.overall_feedback}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {candidate.current_stage === "REJECTED" && (
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-red-100 bg-red-50">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 text-sm">
                      <span className="text-white">❌</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700">Rejected</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">FINAL</span>
                      </div>
                      {candidate.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">{candidate.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "rounds" && (
            <div>
              {canAddCandidate && (
                <div className="flex justify-end mb-4">
                  <button onClick={() => setShowSchedule(true)} className="flex items-center gap-2 px-4 py-2 bg-[#730042] text-white text-xs font-semibold rounded-xl hover:bg-[#4a0029] transition-all">
                    <FaCalendarAlt size={10} /> Schedule Round
                  </button>
                </div>
              )}
              {!candidate.interview_rounds?.length ? (
                <div className="text-center py-12 text-gray-400">
                  <FaCalendarAlt size={28} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No interview rounds scheduled yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidate.interview_rounds.map((round) => (
                    <div key={round._id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">Round {round.round_number} · {round.round_type}</div>
                          <div className="text-xs text-gray-400 mt-0.5">Scheduled: {fmtDate(round.scheduled_at)}</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          round.outcome === "Passed" ? "bg-emerald-50 text-emerald-600" :
                          round.outcome === "Failed" ? "bg-red-50 text-red-600" :
                          round.outcome === "No Show" ? "bg-gray-100 text-gray-500" :
                          "bg-amber-50 text-amber-600"
                        }`}>{round.outcome}</span>
                      </div>
                      {round.feedback && <p className="text-xs text-gray-500 mb-2 leading-relaxed">{round.feedback}</p>}
                      {round.score != null && <p className="text-xs text-gray-400">Score: <strong className="text-gray-700">{round.score}/10</strong></p>}
                      {canAddCandidate && (
                        selectedRound === round._id ? (
                          <div className="mt-3 p-4 bg-[#fdf5f9] rounded-xl space-y-3">
                            <div>
                              <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Outcome</label>
                              <select className="w-full px-3 py-2 bg-white border border-[#eedde8] rounded-lg text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all" value={feedbackForm.outcome} onChange={(e) => setFeedbackForm((f) => ({ ...f, outcome: e.target.value }))}>
                                {["Pending", "Passed", "Failed", "No Show"].map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Score (0–10)</label>
                              <input type="number" min="0" max="10" className="w-full px-3 py-2 bg-white border border-[#eedde8] rounded-lg text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all" value={feedbackForm.score} onChange={(e) => setFeedbackForm((f) => ({ ...f, score: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Feedback</label>
                              <textarea rows={3} className="w-full px-3 py-2 bg-white border border-[#eedde8] rounded-lg text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all resize-y" value={feedbackForm.feedback} onChange={(e) => setFeedbackForm((f) => ({ ...f, feedback: e.target.value }))} />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleFeedback(round._id)} disabled={fbMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-[#730042] text-white text-xs font-semibold rounded-lg hover:bg-[#4a0029] disabled:opacity-60 transition-all">
                                {fbMut.isPending ? "Saving…" : "Save Feedback"}
                              </button>
                              <button onClick={() => setSelectedRound(null)} className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setSelectedRound(round._id)} className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-[#730042] hover:text-[#730042] transition-colors">
                            <FaEdit size={10} /> Add Feedback
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "stage" && canAddCandidate && (
            <div className="space-y-5">
              <div className="p-4 bg-[#fdf5f9] rounded-xl border border-[#eedde8]">
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Current Position in Pipeline</div>
                <div className="overflow-x-auto pb-1">
                  <div className="min-w-[480px]">
                    <CandidateTimeline currentStage={candidate.current_stage} />
                  </div>
                </div>
              </div>

              {allowed.length > 0 ? (
                <>
                  <div>
                    <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Move To</label>
                    <div className="flex flex-wrap gap-2">
                      {allowed.map((s) => {
                        const meta = STAGE_TIMELINE_META[s] || {};
                        const isSelected = stageForm.stage === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setStageForm((f) => ({ ...f, stage: s }))}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                              isSelected
                                ? "text-white border-transparent"
                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                            }`}
                            style={isSelected ? { background: meta.accent || "#730042", borderColor: meta.accent || "#730042" } : {}}
                          >
                            <span>{meta.icon}</span>
                            {s.replace(/_/g, " ")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {stageForm.stage === "REJECTED" && (
                    <div>
                      <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Rejection Reason</label>
                      <textarea rows={3} className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all resize-y" value={stageForm.rejection_reason} onChange={(e) => setStageForm((f) => ({ ...f, rejection_reason: e.target.value }))} />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Overall Feedback (optional)</label>
                    <textarea rows={3} className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all resize-y" value={stageForm.overall_feedback} onChange={(e) => setStageForm((f) => ({ ...f, overall_feedback: e.target.value }))} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 py-4">No further stage transitions available.</p>
              )}
            </div>
          )}
        </div>

        {tab === "stage" && canAddCandidate && allowed.length > 0 && (
          <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors">Close</button>
            <button
              disabled={!stageForm.stage}
              onClick={() => { onStageUpdate(candidate._id, stageForm); onClose(); }}
              className="flex items-center gap-2 px-5 py-2 bg-[#730042] text-white text-sm font-semibold rounded-xl hover:bg-[#4a0029] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              <FaArrowRight size={10} /> Move to {stageForm.stage ? stageForm.stage.replace(/_/g, " ") : "Stage"}
            </button>
          </div>
        )}

        {showSchedule && canAddCandidate && (
          <ScheduleInterviewModal candidateId={candidate._id} onClose={() => setShowSchedule(false)} />
        )}
      </div>
    </div>
  );
};

const OpenHiringPanel = ({ requisition, onClose, canAddCandidate }) => {
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [stageFilter, setStageFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data: candidateData, refetch } = useGetCandidatesByRequisition(requisition._id);
  const stageMut = useUpdateCandidateStage();

  const candidates = candidateData?.data || [];

  const filledCount = useMemo(
    () => candidates.filter((c) => ["SELECTED", "OFFER_RELEASED", "JOINED"].includes(c.current_stage)).length,
    [candidates]
  );
  const remaining = Math.max(0, requisition.openings - filledCount);

  const handleStageUpdate = async (candidateId, form) => {
    if (!canAddCandidate) return;
    await stageMut.mutateAsync({ id: candidateId, data: form });
    refetch();
  };

  const pipeline = useMemo(() => {
    const stages = Object.keys(STAGE_META);
    return stages.map((stage) => ({
      stage,
      count: candidates.filter((c) => c.current_stage === stage).length,
    })).filter((s) => s.count > 0);
  }, [candidates]);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const matchStage = stageFilter === "ALL" || c.current_stage === stageFilter;
      const matchSearch = !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
      return matchStage && matchSearch;
    });
  }, [candidates, stageFilter, search]);

  const stages = ["ALL", ...Object.keys(STAGE_META)];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl my-4">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FaUserCheck size={13} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Hiring Pipeline</h2>
              <p className="text-xs text-gray-400 mt-0.5">{requisition.job_title} · {DEPT_LABELS[requisition.department] || requisition.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canAddCandidate && remaining > 0 ? (
              <button onClick={() => setShowAddCandidate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#730042] text-white text-xs font-semibold rounded-xl hover:bg-[#4a0029] transition-all shadow-sm whitespace-nowrap">
                <FaPlus size={9} /> Add Candidate
              </button>
            ) : remaining === 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                <FaCheckCircle size={11} className="text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">All Positions Filled</span>
              </div>
            ) : null}
            <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-2.5 rounded-xl transition-colors"><FaTimes size={13} /></button>
          </div>
        </div>

        <RequisitionProgressHeader requisition={requisition} candidates={candidates} />

        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-[#fdf5f9]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", val: candidates.length, icon: <FaUsers size={12} />, color: "text-[#730042]", bg: "bg-[#f7edf3]" },
              { label: "In Pipeline", val: candidates.filter((c) => !["REJECTED", "JOINED", "SELECTED", "OFFER_RELEASED"].includes(c.current_stage)).length, icon: <FaChartLine size={12} />, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Selected / Offered", val: filledCount, icon: <FaCheckCircle size={12} />, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Rejected", val: candidates.filter((c) => c.current_stage === "REJECTED").length, icon: <FaTimesCircle size={12} />, color: "text-red-500", bg: "bg-red-50" },
            ].map(({ label, val, icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center flex-shrink-0`}>{icon}</div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
                  <div className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {pipeline.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Pipeline Breakdown</div>
              <div className="flex flex-wrap gap-2">
                {pipeline.map(({ stage, count }) => (
                  <button
                    key={stage}
                    onClick={() => setStageFilter(stageFilter === stage ? "ALL" : stage)}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border transition-all ${stageFilter === stage ? "bg-[#730042] text-white border-[#730042]" : "bg-white text-gray-600 border-gray-200 hover:border-[#730042] hover:text-[#730042]"}`}
                  >
                    {STAGE_TIMELINE_META[stage]?.icon} {stage.replace(/_/g, " ")} <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${stageFilter === stage ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 pt-4 pb-2 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12} />
            <input
              placeholder="Search candidates…"
              className="w-full pl-9 pr-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-700 outline-none focus:border-[#730042] transition-all"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            {stages.map((s) => (
              <option key={s} value={s}>{s === "ALL" ? "All Stages" : s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <div className="p-4 sm:p-6 max-h-[50vh] overflow-y-auto space-y-2">
          {!candidates.length ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#f7edf3] flex items-center justify-center mx-auto mb-4">
                <FaUsers size={22} className="text-[#730042] opacity-50" />
              </div>
              <p className="text-sm font-semibold text-gray-500 mb-1">No candidates yet</p>
              <p className="text-xs text-gray-400">Add your first candidate to get started with the pipeline.</p>
              {canAddCandidate && (
                <button onClick={() => setShowAddCandidate(true)} className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-[#730042] text-white text-xs font-semibold rounded-xl hover:bg-[#4a0029] transition-all mx-auto">
                  <FaPlus size={9} /> Add First Candidate
                </button>
              )}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No candidates match your filter.</p>
            </div>
          ) : (
            filtered.map((c) => {
              const isFilled = ["SELECTED", "OFFER_RELEASED", "JOINED"].includes(c.current_stage);
              return (
                <div
                  key={c._id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-xl hover:shadow-sm transition-all group ${
                    isFilled ? "border-emerald-100 bg-emerald-50/30" : "border-gray-100 hover:border-[#eedde8]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#730042] to-[#CD166E] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {initials(c.full_name)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 group-hover:text-[#730042] transition-colors">{c.full_name}</span>
                        {isFilled && <FaCheckCircle size={11} className="text-emerald-500" />}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{c.email} · {c.experience || "—"} exp</div>
                      {c.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {c.skills.slice(0, 3).map((s, i) => (
                            <span key={i} className="text-[10px] font-medium bg-[#f7edf3] text-[#730042] px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                          {c.skills.length > 3 && <span className="text-[10px] text-gray-400">+{c.skills.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                    <StageBadge stage={c.current_stage} />
                    <span className="text-xs text-gray-400">{c.source}</span>
                    <button
                      onClick={() => setSelectedCandidate(c)}
                      className="text-xs font-semibold px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-[#730042] hover:text-[#730042] transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showAddCandidate && canAddCandidate && (
        <AddCandidateModal requisitionId={requisition._id} onClose={() => { setShowAddCandidate(false); refetch(); }} />
      )}

      {selectedCandidate && (
        <CandidateDetailModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onStageUpdate={handleStageUpdate}
          onFeedback={refetch}
          canAddCandidate={canAddCandidate}
        />
      )}
    </div>
  );
};

const RequisitionDetailModal = ({ requisition, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-4">
        <div className="flex items-start justify-between px-4 sm:px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{requisition.job_title}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
              <span>{DEPT_LABELS[requisition.department] || requisition.department}</span>
              <span>·</span>
              <span>{requisition.openings} opening{requisition.openings !== 1 ? "s" : ""}</span>
              <span>·</span>
              <StatusPill status={requisition.status} />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors mt-1"><FaTimes size={13} /></button>
        </div>

        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Employment Type", val: requisition.employment_type },
              { label: "Work Mode", val: requisition.work_mode },
              { label: "Experience", val: requisition.experience_required || "—" },
              { label: "Priority", val: <PriorityPill priority={requisition.priority} /> },
              { label: "Hiring Reason", val: requisition.hiring_reason || "—" },
              { label: "Expected Joining", val: fmtDate(requisition.expected_joining_date) },
            ].map(({ label, val }) => (
              <div key={label} className="bg-[#fdf5f9] rounded-xl p-3">
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">{label}</div>
                <div className="text-sm font-semibold text-gray-800">{val}</div>
              </div>
            ))}
          </div>

          {(requisition.salary_range?.min || requisition.salary_range?.max) && (
            <div className="bg-[#fdf5f9] rounded-xl p-4">
              <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Salary Range</div>
              <div className="text-sm font-semibold text-gray-800">₹{requisition.salary_range?.min?.toLocaleString()} – ₹{requisition.salary_range?.max?.toLocaleString()}</div>
            </div>
          )}

          {requisition.job_description && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Job Description</div>
              <div className="text-sm text-gray-600 leading-relaxed bg-[#fdf5f9] rounded-xl p-4">{requisition.job_description}</div>
            </div>
          )}

          {requisition.skills_required?.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Skills Required</div>
              <div className="flex flex-wrap gap-1.5">
                {requisition.skills_required.map((s, i) => (
                  <span key={i} className="text-[11px] font-medium bg-[#f7edf3] text-[#730042] px-3 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {requisition.requested_by && (
            <div className="flex items-center gap-3 p-4 bg-[#fdf5f9] rounded-xl">
              <div className="w-10 h-10 rounded-full bg-[#730042] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {initials(`${requisition.requested_by.f_name} ${requisition.requested_by.l_name}`)}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">{requisition.requested_by.f_name} {requisition.requested_by.l_name}</div>
                <div className="text-xs text-gray-400">{requisition.requested_by.designation} · {requisition.requested_by.department}</div>
              </div>
            </div>
          )}

          {requisition.admin_comment && (
            <div className="bg-amber-50 rounded-xl p-4 border-l-4 border-amber-400">
              <div className="text-[10px] font-semibold tracking-widest text-amber-600 uppercase mb-1">Admin Comment</div>
              <p className="text-sm text-gray-600">{requisition.admin_comment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ManageModal = ({ selected, onClose, approveMut, rejectMut, holdMut, revisionMut }) => {
  const [actionMessage, setActionMessage] = useState(selected.admin_comment || "");

  const handleApprove  = async () => { await approveMut.mutateAsync({ id: selected._id, data: { admin_comment: actionMessage } }); onClose(); };
  const handleReject   = async () => { await rejectMut.mutateAsync({ id: selected._id, data: { admin_comment: actionMessage } }); onClose(); };
  const handleHold     = async () => { await holdMut.mutateAsync({ id: selected._id, data: { admin_comment: actionMessage } }); onClose(); };
  const handleRevision = async () => { await revisionMut.mutateAsync({ id: selected._id, data: { admin_comment: actionMessage } }); onClose(); };

  const anyPending = approveMut.isPending || rejectMut.isPending || holdMut.isPending || revisionMut.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        <div className="flex items-start justify-between px-4 sm:px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Manage Requisition</h2>
            <p className="text-xs text-gray-400 mt-0.5">{selected.job_title} · {DEPT_LABELS[selected.department] || selected.department}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors mt-1"><FaTimes size={13} /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Employment", val: selected.employment_type },
              { label: "Work Mode", val: selected.work_mode },
              { label: "Experience", val: selected.experience_required || "—" },
              { label: "Priority", val: <PriorityPill priority={selected.priority} /> },
            ].map(({ label, val }) => (
              <div key={label} className="bg-[#fdf5f9] rounded-xl p-3">
                <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">{label}</div>
                <div className="text-sm font-semibold text-gray-800">{val}</div>
              </div>
            ))}
          </div>

          {selected.job_description && (
            <div className="bg-[#fdf5f9] rounded-xl p-4">
              <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Job Description</div>
              <p className="text-sm text-gray-600 leading-relaxed">{selected.job_description}</p>
            </div>
          )}

          {selected.skills_required?.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">Skills Required</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.skills_required.map((s, i) => (
                  <span key={i} className="text-[11px] font-medium bg-[#f7edf3] text-[#730042] px-3 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Admin Comment</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all resize-y"
              placeholder="Write your comment, reason, or feedback…"
              value={actionMessage}
              onChange={(e) => setActionMessage(e.target.value)}
            />
          </div>

          {(approveMut.isError || rejectMut.isError || holdMut.isError || revisionMut.isError) && (
            <p className="text-xs text-red-500">Something went wrong while processing the request.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose} disabled={anyPending} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:border-gray-400 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={handleRevision} disabled={revisionMut.isPending || !actionMessage} className="px-4 py-2 text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 transition-all">
            {revisionMut.isPending ? "…" : "Request Revision"}
          </button>
          <button onClick={handleHold} disabled={holdMut.isPending} className="px-4 py-2 text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200 rounded-xl hover:bg-orange-500 hover:text-white hover:border-orange-500 disabled:opacity-50 transition-all">
            {holdMut.isPending ? "…" : "Put on Hold"}
          </button>
          <button onClick={handleReject} disabled={rejectMut.isPending || !actionMessage} className="px-4 py-2 text-sm font-semibold bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-50 transition-all">
            {rejectMut.isPending ? "…" : "Reject"}
          </button>
          <button onClick={handleApprove} disabled={approveMut.isPending} className="px-4 py-2 text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 disabled:opacity-50 transition-all">
            {approveMut.isPending ? "…" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
};

const RecruitmentAdmin = () => {
  const can = usePermissionStore((s) => s.can);
  const canViewRequisitions = can("recruitment.can_view_hiring_requisitions");
  const canViewCandidates = can("recruitment.can_view_candidates");
  const canAddCandidate = can("recruitment.can_add_candidate");

  const [search, setSearch]           = useState("");
  const [manageModal, setManageModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [hiringModal, setHiringModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: requisitionData, isLoading } = useGetAllRequisitions();
  const { data: pendingData }                 = useGetPendingRequisitions();

  const approveMut  = useApproveRequisition();
  const rejectMut   = useRejectRequisition();
  const holdMut     = useHoldRequisition();
  const revisionMut = useRequestRevision();

  const requisitions        = Array.isArray(requisitionData?.data) ? requisitionData.data : [];
  const pendingRequisitions = pendingData?.data || [];

  const stats = useMemo(() => ({
    total:    requisitions.length,
    pending:  requisitions.filter((r) => r.status === "PENDING").length,
    approved: requisitions.filter((r) => r.status === "APPROVED").length,
    rejected: requisitions.filter((r) => r.status === "REJECTED").length,
  }), [requisitions]);

  const filtered = useMemo(() => {
    return requisitions.filter((item) => {
      const txt = `${item.job_title} ${item.department} ${item.priority}`.toLowerCase();
      const matchSearch = txt.includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [requisitions, search, statusFilter]);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (!canViewRequisitions) {
    return (
      <div className="min-h-screen bg-[#fdf5f9] flex items-center justify-center p-4">
        <div className="text-center text-gray-400 max-w-sm">
          <FaBriefcase size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-base font-semibold text-gray-500">Recruitment isn't available for your account</p>
          <p className="text-sm mt-1">Contact your Super Admin if you need access to this feature.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf5f9] p-4 sm:p-6 font-[Outfit,sans-serif]">

      <div className="bg-gradient-to-br from-[#2e0019] via-[#4a0029] to-[#CD166E] rounded-2xl px-4 sm:px-8 py-6 sm:py-7 mb-6 relative overflow-hidden shadow-xl">
        <div className="absolute w-72 h-72 rounded-full -top-36 -right-16 bg-white/5 pointer-events-none" />
        <div className="absolute w-48 h-48 rounded-full -bottom-24 right-32 bg-white/5 pointer-events-none" />
        <p className="text-[10px] tracking-[3px] uppercase text-white/50 mb-2 font-medium">{today}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Recruitment Management</h1>
        <p className="text-xs text-white/60 font-light">Review hiring requisitions, manage candidates and track recruitment pipeline.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            `📋 ${stats.total} Requisitions`,
            `⏳ ${stats.pending} Pending`,
            `✅ ${stats.approved} Approved`,
            ...(stats.rejected > 0 ? [`❌ ${stats.rejected} Rejected`] : []),
          ].map((chip) => (
            <span key={chip} className="bg-white/10 border border-white/15 rounded-full px-3.5 py-1 text-[11px] text-white/85 font-medium">{chip}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Requisitions", val: stats.total,    icon: <FaBriefcase size={15} />, color: "#730042", bg: "#f7edf3", stripe: "#730042" },
          { label: "Pending Review",     val: stats.pending,  icon: <FaClock size={15} />,     color: "#b8760a", bg: "#fff8e1", stripe: "#b8760a" },
          { label: "Approved",           val: stats.approved, icon: <FaCheckCircle size={15} />,color: "#0d9e6e", bg: "#e8f7f1", stripe: "#0d9e6e" },
          { label: "Rejected",           val: stats.rejected, icon: <FaTimesCircle size={15} />,color: "#d93025", bg: "#fbeaea", stripe: "#d93025" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: s.stripe }} />
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">{s.label}</div>
            <div className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">

        <div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FaBriefcase className="text-[#730042]" size={14} />
                <h2 className="font-bold text-gray-800" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>All Requisitions</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  className="px-3 py-2 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-xs text-gray-700 outline-none focus:border-[#730042] transition-all"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  {["PENDING", "APPROVED", "REJECTED", "ON_HOLD", "REVISION_REQUIRED"].map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={11} />
                  <input
                    placeholder="Search job, dept…"
                    className="pl-8 pr-3 py-2 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-xs text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all w-full sm:w-52"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-[#fdf5f9]">
                    {["Job Role", "Department", "Openings", "Priority", "Status", "Requested By", "Date", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold tracking-widest text-gray-400 uppercase border-b border-gray-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Loading requisitions…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No requisitions found.</td></tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item._id} className="border-b border-gray-50 hover:bg-[#fdf5f9] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="text-sm font-semibold text-gray-800">{item.job_title}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{item.employment_type}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-600">{DEPT_LABELS[item.department] || item.department}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-gray-800 text-sm">{item.openings}</td>
                        <td className="px-4 py-3.5"><PriorityPill priority={item.priority} /></td>
                        <td className="px-4 py-3.5"><StatusPill status={item.status} /></td>
                        <td className="px-4 py-3.5">
                          <div className="text-xs font-semibold text-gray-700">{item.requested_by?.f_name} {item.requested_by?.l_name}</div>
                          <div className="text-[11px] text-gray-400">{item.requested_by?.designation}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-400">{fmtDate(item.createdAt)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => setDetailModal(item)}
                              className="text-[11px] font-semibold px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-[#730042] hover:text-[#730042] transition-colors flex items-center gap-1"
                            >
                              <FaChevronRight size={8} /> Details
                            </button>
                            {canViewCandidates && item.status === "APPROVED" && (
                              <button
                                onClick={() => setHiringModal(item)}
                                className="text-[11px] font-semibold px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all flex items-center gap-1"
                              >
                                <FaUsers size={9} /> Hiring
                              </button>
                            )}
                            {item.status === "PENDING" && (
                              <button
                                onClick={() => setManageModal(item)}
                                className="text-[11px] font-semibold px-2.5 py-1.5 bg-[#730042] text-white rounded-lg hover:bg-[#4a0029] transition-all"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-amber-500" size={13} />
                <h2 className="font-bold text-gray-800" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17 }}>Pending Requests</h2>
              </div>
              {pendingRequisitions.length > 0 && (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  {pendingRequisitions.length}
                </span>
              )}
            </div>
            <div className="p-4 max-h-[420px] overflow-y-auto space-y-2">
              {pendingRequisitions.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <FaCheckCircle size={22} className="mx-auto mb-2 text-emerald-400" />
                  <p className="text-xs">No pending requisitions.</p>
                </div>
              ) : (
                pendingRequisitions.map((item) => (
                  <div key={item._id} className="border border-gray-100 rounded-xl p-3.5 hover:border-[#eedde8] hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{item.job_title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{DEPT_LABELS[item.department] || item.department}</div>
                      </div>
                      <PriorityPill priority={item.priority} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                      <FaUsers size={9} />
                      <span>{item.openings} opening{item.openings !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{fmtDate(item.createdAt)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setDetailModal(item)} className="flex-1 text-xs font-semibold py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-[#730042] hover:text-[#730042] transition-colors">Details</button>
                      <button onClick={() => setManageModal(item)} className="flex-1 text-xs font-semibold py-1.5 bg-[#730042] text-white rounded-lg hover:bg-[#4a0029] transition-all">Manage</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <FaArrowRight className="text-[#730042]" size={12} />
              <h2 className="font-bold text-gray-800" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17 }}>Recruitment Flow</h2>
            </div>
            <div className="p-4 space-y-0">
              {[
                { step: "PENDING",           color: "bg-amber-400",  desc: "Submitted by manager, awaits admin review" },
                { step: "APPROVED",          color: "bg-emerald-500", desc: "Approved — candidates can be added" },
                { step: "ON HOLD",           color: "bg-orange-400", desc: "Temporarily paused by admin" },
                { step: "REVISION REQUIRED", color: "bg-blue-500",   desc: "Manager must revise and resubmit" },
                { step: "REJECTED",          color: "bg-red-500",    desc: "Closed — requisition not accepted" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-b-0">
                  <div className={`w-7 h-7 rounded-full ${s.color} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}>{i + 1}</div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700">{s.step}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {manageModal && (
        <ManageModal
          selected={manageModal}
          onClose={() => setManageModal(null)}
          approveMut={approveMut}
          rejectMut={rejectMut}
          holdMut={holdMut}
          revisionMut={revisionMut}
        />
      )}

      {detailModal && (
        <RequisitionDetailModal requisition={detailModal} onClose={() => setDetailModal(null)} />
      )}

      {hiringModal && canViewCandidates && (
        <OpenHiringPanel requisition={hiringModal} onClose={() => setHiringModal(null)} canAddCandidate={canAddCandidate} />
      )}
    </div>
  );
};

export default RecruitmentAdmin;