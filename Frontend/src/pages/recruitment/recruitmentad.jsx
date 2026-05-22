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
  useGetRequisitionById,
  useUpdateCandidateStage,
  useScheduleInterview,
  useSubmitInterviewFeedback,
} from "../../auth/server-state/adminrecruitment/adrecruitment.hook";
import {
  FaBriefcase, FaClock, FaCheckCircle, FaTimesCircle,
  FaSearch, FaPlus, FaTimes, FaCheck, FaBan,
  FaUsers, FaExclamationTriangle, FaChevronRight,
  FaUserTie, FaStar, FaCalendarAlt, FaBuilding,
  FaPauseCircle, FaEdit, FaArrowRight,
} from "react-icons/fa";

const useInjectStyles = () => {
  React.useEffect(() => {
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@300;400;500;600&display=swap";
    document.head.appendChild(fontLink);

    const styleEl = document.createElement("style");
    styleEl.id = "rec-styles";
    styleEl.textContent = `
      :root {
        --p:       #730042;
        --p-dark:  #4a0029;
        --p-deep:  #2e0019;
        --p-mid:   #a0005c;
        --p-soft:  #c0527e;
        --p-wash:  #f7edf3;
        --p-pale:  #fdf5f9;
        --border:  #eedde8;
        --surface: #ffffff;
        --text:    #1a0010;
        --muted:   #8a6070;
        --light:   #c49ab2;
        --green:   #0d9e6e;
        --red:     #d93025;
        --gold:    #b8760a;
        --blue:    #185FA5;
        --orange:  #c2530a;
        --shadow:  0 2px 12px rgba(115,0,66,.09);
        --shadow-lg: 0 12px 40px rgba(115,0,66,.16);
        --r: 14px;
        --r-sm: 8px;
      }
      .rec-page { background: var(--p-pale); min-height: 100vh; padding: 24px 28px; font-family: 'Outfit', sans-serif; color: var(--text); }

      .rec-hero {
        background: linear-gradient(135deg, var(--p-deep) 0%, var(--p-dark) 40%, var(--p) 70%, var(--p-mid) 100%);
        border-radius: var(--r); padding: 28px 36px; margin-bottom: 26px;
        position: relative; overflow: hidden; box-shadow: var(--shadow-lg);
      }
      .rec-hero::before { content:''; position:absolute; width:360px; height:360px; border-radius:50%; top:-160px; right:-80px; background:rgba(255,255,255,.05); pointer-events:none; }
      .rec-hero-title { font-family:'Cormorant Garamond',serif; font-size:clamp(24px,3vw,34px); color:#fff; margin:0 0 5px; font-weight:700; }
      .rec-hero-sub { font-size:13px; color:rgba(255,255,255,.6); font-weight:300; }
      .rec-hero-chips { display:flex; gap:10px; margin-top:18px; flex-wrap:wrap; }
      .rec-hero-chip { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.18); border-radius:99px; padding:5px 14px; font-size:12px; color:rgba(255,255,255,.85); font-weight:500; }

      .rec-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
      @media(max-width:1000px){ .rec-stats { grid-template-columns:repeat(2,1fr); } }
      @media(max-width:600px){ .rec-stats { grid-template-columns:1fr; } }

      .rec-stat { background:var(--surface); border-radius:var(--r); border:1px solid var(--border); padding:20px; box-shadow:var(--shadow); position:relative; overflow:hidden; transition:transform .2s,box-shadow .2s; }
      .rec-stat:hover { transform:translateY(-2px); box-shadow:var(--shadow-lg); }
      .rec-stat-stripe { position:absolute; top:0; left:0; width:100%; height:3px; }
      .rec-stat-icon { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px; margin-bottom:14px; }
      .rec-stat-lbl { font-size:11px; font-weight:600; letter-spacing:.8px; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
      .rec-stat-val { font-family:'Cormorant Garamond',serif; font-size:34px; line-height:1; color:var(--text); font-weight:700; }

      .rec-grid { display:grid; grid-template-columns:1fr 360px; gap:20px; }
      @media(max-width:1100px){ .rec-grid { grid-template-columns:1fr; } }

      .rec-panel { background:var(--surface); border-radius:var(--r); border:1px solid var(--border); box-shadow:var(--shadow); overflow:hidden; }
      .rec-panel-head { padding:16px 22px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
      .rec-panel-title { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px; }

      .rec-search { position:relative; }
      .rec-search input { width:100%; padding:10px 14px 10px 38px; background:var(--p-pale); border:1px solid var(--border); border-radius:var(--r-sm); font-size:13px; color:var(--text); font-family:'Outfit',sans-serif; outline:none; transition:border-color .15s,box-shadow .15s; }
      .rec-search input:focus { border-color:var(--p); box-shadow:0 0 0 3px var(--p-wash); }
      .rec-search-ico { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--light); font-size:13px; }

      .rec-table { width:100%; border-collapse:collapse; }
      .rec-table th { text-align:left; padding:12px 18px; font-size:11px; font-weight:600; letter-spacing:.6px; text-transform:uppercase; color:var(--muted); background:var(--p-pale); border-bottom:1px solid var(--border); }
      .rec-table td { padding:14px 18px; border-bottom:1px solid var(--border); font-size:13px; color:var(--text); vertical-align:middle; }
      .rec-table tr:last-child td { border-bottom:none; }
      .rec-table tr:hover td { background:var(--p-pale); }

      .status-pill { display:inline-flex; align-items:center; gap:5px; font-size:10px; font-weight:700; letter-spacing:.4px; padding:3px 10px; border-radius:99px; text-transform:uppercase; }
      .sp-PENDING           { background:#fff8e1; color:var(--gold); }
      .sp-APPROVED          { background:#e8f7f1; color:var(--green); }
      .sp-REJECTED          { background:#fbeaea; color:var(--red); }
      .sp-ON_HOLD           { background:#fff3e0; color:var(--orange); }
      .sp-REVISION_REQUIRED { background:#e6f1fb; color:var(--blue); }

      .priority-pill { display:inline-block; font-size:10px; font-weight:600; padding:2px 9px; border-radius:99px; }
      .pp-Low    { background:#f1f5f9; color:#475569; }
      .pp-Medium { background:#fff8e1; color:var(--gold); }
      .pp-High   { background:#fbeaea; color:var(--red); }
      .pp-Urgent { background:var(--p-wash); color:var(--p); }

      .btn-p { background:var(--p); color:white; border:none; padding:8px 16px; border-radius:var(--r-sm); font-size:12px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-family:'Outfit',sans-serif; transition:all .2s; }
      .btn-p:hover { background:var(--p-dark); transform:translateY(-1px); box-shadow:0 4px 14px rgba(115,0,66,.3); }
      .btn-p:disabled { opacity:.6; cursor:not-allowed; transform:none; }
      .btn-ghost { background:none; color:var(--muted); border:1px solid var(--border); padding:7px 14px; border-radius:var(--r-sm); font-size:12px; font-weight:500; cursor:pointer; font-family:'Outfit',sans-serif; transition:all .2s; }
      .btn-ghost:hover { border-color:var(--p); color:var(--p); }
      .btn-green  { background:#e8f7f1; color:var(--green); border:1px solid #b8e8d4; border-radius:var(--r-sm); padding:8px 16px; font-size:12px; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s; }
      .btn-green:hover  { background:var(--green); color:white; }
      .btn-green:disabled { opacity:.6; cursor:not-allowed; }
      .btn-red    { background:#fbeaea; color:var(--red); border:1px solid #f0c5c5; border-radius:var(--r-sm); padding:8px 16px; font-size:12px; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s; }
      .btn-red:hover    { background:var(--red); color:white; }
      .btn-red:disabled { opacity:.6; cursor:not-allowed; }
      .btn-orange { background:#fff3e0; color:var(--orange); border:1px solid #ffd8a8; border-radius:var(--r-sm); padding:8px 16px; font-size:12px; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s; }
      .btn-orange:hover { background:var(--orange); color:white; }
      .btn-orange:disabled { opacity:.6; cursor:not-allowed; }
      .btn-blue   { background:#e6f1fb; color:var(--blue); border:1px solid #b8d4f5; border-radius:var(--r-sm); padding:8px 16px; font-size:12px; font-weight:600; cursor:pointer; font-family:'Outfit',sans-serif; transition:all .15s; }
      .btn-blue:hover   { background:var(--blue); color:white; }
      .btn-blue:disabled { opacity:.6; cursor:not-allowed; }

      .rec-pending-card { border:1px solid var(--border); border-radius:var(--r-sm); padding:14px; margin-bottom:10px; transition:all .2s; cursor:default; }
      .rec-pending-card:hover { border-color:var(--p-soft); box-shadow:var(--shadow); }

      .rec-flow-step { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border); }
      .rec-flow-step:last-child { border-bottom:none; }
      .rec-flow-num { width:32px; height:32px; border-radius:50%; background:var(--p); color:white; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }

      .overlay { position:fixed; inset:0; background:rgba(30,0,18,.6); backdrop-filter:blur(5px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; animation:ov .18s; overflow-y:auto; }
      @keyframes ov { from{opacity:0} to{opacity:1} }
      .modal { background:var(--surface); border-radius:var(--r); width:100%; max-width:640px; box-shadow:var(--shadow-lg); animation:mup .22s; max-height:90vh; overflow-y:auto; }
      .modal-lg { max-width:860px; }
      @keyframes mup { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      .modal-hd { padding:22px 26px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:white; z-index:10; }
      .modal-hd-title { font-family:'Cormorant Garamond',serif; font-size:22px; font-weight:700; color:var(--text); }
      .modal-x { background:none; border:none; cursor:pointer; color:var(--muted); font-size:15px; padding:5px; border-radius:6px; transition:all .15s; }
      .modal-x:hover { background:var(--p-wash); color:var(--p); }
      .modal-bd { padding:22px 26px; }
      .modal-ft { padding:14px 26px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:10px; flex-wrap:wrap; position:sticky; bottom:0; background:white; }

      .fld { margin-bottom:16px; }
      .flbl { display:block; font-size:11px; font-weight:600; letter-spacing:.6px; text-transform:uppercase; color:var(--muted); margin-bottom:5px; }
      .finp,.ftxt,.fsel { width:100%; padding:10px 13px; background:var(--p-pale); border:1px solid var(--border); border-radius:var(--r-sm); font-size:13px; color:var(--text); font-family:'Outfit',sans-serif; outline:none; transition:border-color .15s,box-shadow .15s; box-sizing:border-box; }
      .finp:focus,.ftxt:focus,.fsel:focus { border-color:var(--p); box-shadow:0 0 0 3px var(--p-wash); }
      .ftxt { resize:vertical; min-height:80px; line-height:1.6; }

      .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
      .info-box { background:var(--p-pale); border-radius:var(--r-sm); padding:12px 14px; }
      .info-box-lbl { font-size:10px; font-weight:600; letter-spacing:.5px; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
      .info-box-val { font-size:13px; font-weight:600; color:var(--text); }

      .skill-chip { display:inline-block; font-size:11px; font-weight:500; background:var(--p-wash); color:var(--p); padding:3px 10px; border-radius:99px; margin:3px 3px 3px 0; }

      .stage-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; letter-spacing:.3px; text-transform:uppercase; padding:3px 9px; border-radius:99px; }
      .sb-APPLIED       { background:#f1f5f9; color:#475569; }
      .sb-SCREENING     { background:#fff8e1; color:var(--gold); }
      .sb-SHORTLISTED   { background:var(--p-wash); color:var(--p); }
      .sb-INTERVIEW     { background:#e6f1fb; color:var(--blue); }
      .sb-HR_ROUND      { background:#f3e8ff; color:#5b21b6; }
      .sb-SELECTED      { background:#e8f7f1; color:var(--green); }
      .sb-REJECTED      { background:#fbeaea; color:var(--red); }
      .sb-OFFER_RELEASED{ background:#fff3e0; color:var(--orange); }
      .sb-JOINED        { background:#d1fae5; color:#065f46; }

      .cand-card { border:1px solid var(--border); border-radius:var(--r-sm); padding:14px 16px; margin-bottom:10px; transition:all .2s; }
      .cand-card:hover { border-color:var(--p-soft); box-shadow:var(--shadow); }

      .tab-bar { display:flex; gap:4px; padding:16px 22px 0; border-bottom:1px solid var(--border); }
      .tab-btn { padding:8px 16px; border:none; background:none; font-size:12px; font-weight:600; color:var(--muted); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; font-family:'Outfit',sans-serif; transition:all .15s; }
      .tab-btn.active { color:var(--p); border-bottom-color:var(--p); }
      .tab-btn:hover { color:var(--p); }

      .empty-state { text-align:center; padding:40px 20px; color:var(--light); }
      .empty-state-ico { font-size:30px; margin-bottom:10px; }
      .empty-state p { font-size:13px; }

      .round-card { border:1px solid var(--border); border-radius:var(--r-sm); padding:12px 14px; margin-bottom:8px; }
      .round-outcome-Pending { color:var(--gold); }
      .round-outcome-Passed  { color:var(--green); }
      .round-outcome-Failed  { color:var(--red); }
      .round-outcome-No\ Show { color:var(--muted); }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(fontLink);
      const el = document.getElementById("rec-styles");
      if (el) document.head.removeChild(el);
    };
  }, []);
};

const initials = (name = "") =>
  (name || "").trim().split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
};

const STAGE_ORDER = {
  APPLIED:       ["SCREENING", "REJECTED"],
  SCREENING:     ["SHORTLISTED", "REJECTED"],
  SHORTLISTED:   ["INTERVIEW", "REJECTED"],
  INTERVIEW:     ["HR_ROUND", "SELECTED", "REJECTED"],
  HR_ROUND:      ["SELECTED", "REJECTED"],
  SELECTED:      ["OFFER_RELEASED"],
  OFFER_RELEASED:["JOINED"],
  JOINED:        [],
  REJECTED:      [],
};

const StatusPill = ({ status }) => (
  <span className={`status-pill sp-${status}`}>{(status || "").replace(/_/g, " ")}</span>
);

const StageBadge = ({ stage }) => (
  <span className={`stage-badge sb-${stage}`}>{(stage || "").replace(/_/g, " ")}</span>
);

const PriorityPill = ({ priority }) => (
  <span className={`priority-pill pp-${priority}`}>{priority}</span>
);

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
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <h2 className="modal-hd-title">Add Candidate</h2>
          <button className="modal-x" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="modal-bd">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="fld">
              <label className="flbl">Full Name</label>
              <input className="finp" placeholder="John Doe" value={form.full_name} onChange={set("full_name")} />
            </div>
            <div className="fld">
              <label className="flbl">Email</label>
              <input className="finp" type="email" placeholder="john@example.com" value={form.email} onChange={set("email")} />
            </div>
            <div className="fld">
              <label className="flbl">Phone</label>
              <input className="finp" placeholder="+91 9876543210" value={form.phone} onChange={set("phone")} />
            </div>
            <div className="fld">
              <label className="flbl">Experience</label>
              <input className="finp" placeholder="3 years" value={form.experience} onChange={set("experience")} />
            </div>
            <div className="fld">
              <label className="flbl">Current Company</label>
              <input className="finp" placeholder="Acme Corp" value={form.current_company} onChange={set("current_company")} />
            </div>
            <div className="fld">
              <label className="flbl">Source</label>
              <select className="fsel" value={form.source} onChange={set("source")}>
                {["Portal", "Referral", "LinkedIn", "Walk-in", "Agency", "Other"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="fld">
            <label className="flbl">Skills (comma separated)</label>
            <input className="finp" placeholder="React, Node.js, MongoDB" value={form.skills} onChange={set("skills")} />
          </div>
          <div className="fld" style={{ marginBottom: 0 }}>
            <label className="flbl">Resume URL</label>
            <input className="finp" placeholder="https://…" value={form.resume_url} onChange={set("resume_url")} />
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-p" onClick={handleSubmit} disabled={addMut.isPending || !form.full_name || !form.email}>
            <FaPlus style={{ fontSize: 10 }} />
            {addMut.isPending ? "Adding…" : "Add Candidate"}
          </button>
        </div>
        {addMut.isError && (
          <div style={{ padding: "0 26px 14px", fontSize: 12, color: "var(--red)" }}>
            {addMut.error?.message || "Failed to add candidate."}
          </div>
        )}
      </div>
    </div>
  );
};

const ScheduleInterviewModal = ({ candidateId, onClose }) => {
  const schMut = useScheduleInterview();
  const [form, setForm] = useState({ round_type: "Screening", scheduled_at: "", conducted_by: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    await schMut.mutateAsync({ id: candidateId, data: form });
    onClose();
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <h2 className="modal-hd-title">Schedule Interview</h2>
          <button className="modal-x" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="modal-bd">
          <div className="fld">
            <label className="flbl">Round Type</label>
            <select className="fsel" value={form.round_type} onChange={set("round_type")}>
              {["Screening", "Technical", "HR Round", "Final Round", "Other"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label className="flbl">Scheduled At</label>
            <input className="finp" type="datetime-local" value={form.scheduled_at} onChange={set("scheduled_at")} />
          </div>
        </div>
        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-p" onClick={handleSubmit} disabled={schMut.isPending || !form.scheduled_at}>
            <FaCalendarAlt style={{ fontSize: 10 }} />
            {schMut.isPending ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
};

const CandidateDetailModal = ({ candidate, onClose, onStageUpdate, onFeedback }) => {
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

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-hd">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: "var(--p)",
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>
              {initials(candidate.full_name)}
            </div>
            <div>
              <h2 className="modal-hd-title" style={{ fontSize: 18 }}>{candidate.full_name}</h2>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {candidate.email} · <StageBadge stage={candidate.current_stage} />
              </div>
            </div>
          </div>
          <button className="modal-x" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="tab-bar">
          {["info", "rounds", "stage"].map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "info" ? "Profile" : t === "rounds" ? "Interview Rounds" : "Move Stage"}
            </button>
          ))}
        </div>

        <div className="modal-bd">
          {tab === "info" && (
            <>
              <div className="info-grid">
                <div className="info-box"><div className="info-box-lbl">Phone</div><div className="info-box-val">{candidate.phone || "—"}</div></div>
                <div className="info-box"><div className="info-box-lbl">Experience</div><div className="info-box-val">{candidate.experience || "—"}</div></div>
                <div className="info-box"><div className="info-box-lbl">Current Company</div><div className="info-box-val">{candidate.current_company || "Fresher"}</div></div>
                <div className="info-box"><div className="info-box-lbl">Source</div><div className="info-box-val">{candidate.source || "—"}</div></div>
              </div>
              {candidate.skills?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="flbl" style={{ marginBottom: 8 }}>Skills</div>
                  <div>{candidate.skills.map((s, i) => <span key={i} className="skill-chip">{s}</span>)}</div>
                </div>
              )}
              {candidate.overall_feedback && (
                <div style={{ background: "var(--p-pale)", borderRadius: "var(--r-sm)", padding: "12px 14px", borderLeft: "3px solid var(--p)" }}>
                  <div className="info-box-lbl" style={{ marginBottom: 4 }}>Overall Feedback</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{candidate.overall_feedback}</div>
                </div>
              )}
              {candidate.rejection_reason && (
                <div style={{ background: "#fbeaea", borderRadius: "var(--r-sm)", padding: "12px 14px", marginTop: 10, borderLeft: "3px solid var(--red)" }}>
                  <div className="info-box-lbl" style={{ marginBottom: 4, color: "var(--red)" }}>Rejection Reason</div>
                  <div style={{ fontSize: 13, color: "var(--red)", lineHeight: 1.6 }}>{candidate.rejection_reason}</div>
                </div>
              )}
            </>
          )}

          {tab === "rounds" && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button className="btn-p" onClick={() => setShowSchedule(true)}>
                  <FaCalendarAlt style={{ fontSize: 10 }} /> Schedule Round
                </button>
              </div>
              {candidate.interview_rounds?.length === 0 ? (
                <div className="empty-state"><div className="empty-state-ico">📅</div><p>No interview rounds scheduled yet.</p></div>
              ) : (
                candidate.interview_rounds.map((round) => (
                  <div className="round-card" key={round._id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Round {round.round_number} · {round.round_type}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                          Scheduled: {fmtDate(round.scheduled_at)}
                        </div>
                      </div>
                      <span className={`stage-badge round-outcome-${round.outcome}`} style={{ fontSize: 10, fontWeight: 700 }}>
                        {round.outcome}
                      </span>
                    </div>
                    {round.feedback && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, lineHeight: 1.5 }}>
                        {round.feedback}
                      </div>
                    )}
                    {round.score != null && (
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>Score: <strong style={{ color: "var(--text)" }}>{round.score}</strong></div>
                    )}
                    {selectedRound === round._id ? (
                      <div style={{ marginTop: 10, padding: 12, background: "var(--p-pale)", borderRadius: "var(--r-sm)" }}>
                        <div className="fld">
                          <label className="flbl">Outcome</label>
                          <select className="fsel" value={feedbackForm.outcome}
                            onChange={(e) => setFeedbackForm((f) => ({ ...f, outcome: e.target.value }))}>
                            {["Pending", "Passed", "Failed", "No Show"].map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="fld">
                          <label className="flbl">Score (0–10)</label>
                          <input className="finp" type="number" min="0" max="10" value={feedbackForm.score}
                            onChange={(e) => setFeedbackForm((f) => ({ ...f, score: e.target.value }))} />
                        </div>
                        <div className="fld" style={{ marginBottom: 10 }}>
                          <label className="flbl">Feedback</label>
                          <textarea className="ftxt" rows="3" value={feedbackForm.feedback}
                            onChange={(e) => setFeedbackForm((f) => ({ ...f, feedback: e.target.value }))} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-p" onClick={() => handleFeedback(round._id)} disabled={fbMut.isPending}>
                            {fbMut.isPending ? "Saving…" : "Save Feedback"}
                          </button>
                          <button className="btn-ghost" onClick={() => setSelectedRound(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn-ghost" style={{ marginTop: 8, fontSize: 11, padding: "5px 12px" }}
                        onClick={() => setSelectedRound(round._id)}>
                        <FaEdit style={{ fontSize: 10 }} /> Add Feedback
                      </button>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {tab === "stage" && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div className="flbl" style={{ marginBottom: 6 }}>Current Stage</div>
                <StageBadge stage={candidate.current_stage} />
              </div>
              {allowed.length > 0 ? (
                <>
                  <div className="fld">
                    <label className="flbl">Move To</label>
                    <select className="fsel" value={stageForm.stage}
                      onChange={(e) => setStageForm((f) => ({ ...f, stage: e.target.value }))}>
                      <option value="">— Select next stage —</option>
                      {allowed.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  {stageForm.stage === "REJECTED" && (
                    <div className="fld">
                      <label className="flbl">Rejection Reason</label>
                      <textarea className="ftxt" rows="3" value={stageForm.rejection_reason}
                        onChange={(e) => setStageForm((f) => ({ ...f, rejection_reason: e.target.value }))} />
                    </div>
                  )}
                  <div className="fld" style={{ marginBottom: 0 }}>
                    <label className="flbl">Overall Feedback (optional)</label>
                    <textarea className="ftxt" rows="3" value={stageForm.overall_feedback}
                      onChange={(e) => setStageForm((f) => ({ ...f, overall_feedback: e.target.value }))} />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
                  No further stage transitions available.
                </div>
              )}
            </>
          )}
        </div>

        {tab === "stage" && allowed.length > 0 && (
          <div className="modal-ft">
            <button className="btn-ghost" onClick={onClose}>Close</button>
            <button className="btn-p" disabled={!stageForm.stage}
              onClick={() => {
                onStageUpdate(candidate._id, stageForm);
                onClose();
              }}>
              <FaArrowRight style={{ fontSize: 10 }} /> Move Stage
            </button>
          </div>
        )}

        {showSchedule && (
          <ScheduleInterviewModal
            candidateId={candidate._id}
            onClose={() => setShowSchedule(false)}
          />
        )}
      </div>
    </div>
  );
};

const RequisitionDetailModal = ({ requisition, onClose }) => {
  const [tab, setTab] = useState("detail");
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const { data: candidateData, refetch: refetchCandidates } = useGetCandidatesByRequisition(requisition._id);
  const stageMut = useUpdateCandidateStage();

  const candidates = candidateData?.data || [];

  const handleStageUpdate = async (candidateId, form) => {
    await stageMut.mutateAsync({ id: candidateId, data: form });
    refetchCandidates();
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-hd">
          <div>
            <h2 className="modal-hd-title">{requisition.job_title}</h2>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, display: "flex", gap: 10, alignItems: "center" }}>
              <span>{requisition.department}</span>
              <span>·</span>
              <span>{requisition.openings} opening{requisition.openings !== 1 ? "s" : ""}</span>
              <span>·</span>
              <StatusPill status={requisition.status} />
            </div>
          </div>
          <button className="modal-x" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="tab-bar">
          {["detail", "candidates"].map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "detail" ? "Job Details" : `Candidates (${candidates.length})`}
            </button>
          ))}
        </div>

        <div className="modal-bd">
          {tab === "detail" && (
            <>
              <div className="info-grid">
                <div className="info-box"><div className="info-box-lbl">Employment Type</div><div className="info-box-val">{requisition.employment_type}</div></div>
                <div className="info-box"><div className="info-box-lbl">Work Mode</div><div className="info-box-val">{requisition.work_mode}</div></div>
                <div className="info-box"><div className="info-box-lbl">Experience Required</div><div className="info-box-val">{requisition.experience_required || "—"}</div></div>
                <div className="info-box"><div className="info-box-lbl">Priority</div><div className="info-box-val"><PriorityPill priority={requisition.priority} /></div></div>
                <div className="info-box"><div className="info-box-lbl">Hiring Reason</div><div className="info-box-val">{requisition.hiring_reason || "—"}</div></div>
                <div className="info-box"><div className="info-box-lbl">Expected Joining</div><div className="info-box-val">{fmtDate(requisition.expected_joining_date)}</div></div>
              </div>
              {(requisition.salary_range?.min || requisition.salary_range?.max) && (
                <div className="info-box" style={{ marginBottom: 12 }}>
                  <div className="info-box-lbl">Salary Range</div>
                  <div className="info-box-val">₹{requisition.salary_range?.min?.toLocaleString()} – ₹{requisition.salary_range?.max?.toLocaleString()}</div>
                </div>
              )}
              {requisition.job_description && (
                <div style={{ marginBottom: 14 }}>
                  <div className="flbl" style={{ marginBottom: 6 }}>Job Description</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, background: "var(--p-pale)", padding: "12px 14px", borderRadius: "var(--r-sm)" }}>
                    {requisition.job_description}
                  </div>
                </div>
              )}
              {requisition.skills_required?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="flbl" style={{ marginBottom: 6 }}>Skills Required</div>
                  <div>{requisition.skills_required.map((s, i) => <span key={i} className="skill-chip">{s}</span>)}</div>
                </div>
              )}
              {requisition.requested_by && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--p-pale)", borderRadius: "var(--r-sm)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--p)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                    {initials(`${requisition.requested_by.f_name} ${requisition.requested_by.l_name}`)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{requisition.requested_by.f_name} {requisition.requested_by.l_name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{requisition.requested_by.designation} · {requisition.requested_by.department}</div>
                  </div>
                </div>
              )}
              {requisition.admin_comment && (
                <div style={{ marginTop: 12, background: "#fff8e1", borderRadius: "var(--r-sm)", padding: "12px 14px", borderLeft: "3px solid var(--gold)" }}>
                  <div className="info-box-lbl" style={{ color: "var(--gold)", marginBottom: 4 }}>Admin Comment</div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{requisition.admin_comment}</div>
                </div>
              )}
            </>
          )}

          {tab === "candidates" && (
            <>
              {requisition.status === "APPROVED" && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                  <button className="btn-p" onClick={() => setShowAddCandidate(true)}>
                    <FaPlus style={{ fontSize: 10 }} /> Add Candidate
                  </button>
                </div>
              )}
              {candidates.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-ico"><FaUsers /></div>
                  <p>No candidates added yet.</p>
                </div>
              ) : (
                candidates.map((c) => (
                  <div className="cand-card" key={c._id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--p)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {initials(c.full_name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{c.full_name}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{c.email} · {c.experience || "—"}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StageBadge stage={c.current_stage} />
                        <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }}
                          onClick={() => setSelectedCandidate(c)}>
                          View
                        </button>
                      </div>
                    </div>
                    {c.skills?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {c.skills.slice(0, 4).map((s, i) => <span key={i} className="skill-chip">{s}</span>)}
                        {c.skills.length > 4 && <span style={{ fontSize: 11, color: "var(--muted)" }}>+{c.skills.length - 4} more</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {showAddCandidate && (
          <AddCandidateModal
            requisitionId={requisition._id}
            onClose={() => setShowAddCandidate(false)}
          />
        )}

        {selectedCandidate && (
          <CandidateDetailModal
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
            onStageUpdate={handleStageUpdate}
            onFeedback={refetchCandidates}
          />
        )}
      </div>
    </div>
  );
};

const ManageModal = ({ selected, onClose, approveMut, rejectMut, holdMut, revisionMut }) => {
  const [actionMessage, setActionMessage] = useState(selected.admin_comment || "");

  const handleApprove = async () => { await approveMut.mutateAsync({ id: selected._id, data: { admin_comment: actionMessage } }); onClose(); };
  const handleReject  = async () => { await rejectMut.mutateAsync({ id: selected._id, data: { admin_comment: actionMessage } }); onClose(); };
  const handleHold    = async () => { await holdMut.mutateAsync({ id: selected._id, data: { admin_comment: actionMessage } }); onClose(); };
  const handleRevision= async () => { await revisionMut.mutateAsync({ id: selected._id, data: { admin_comment: actionMessage } }); onClose(); };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hd">
          <div>
            <h2 className="modal-hd-title">Manage Requisition</h2>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{selected.job_title} · {selected.department}</div>
          </div>
          <button className="modal-x" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="modal-bd">
          <div className="info-grid" style={{ marginBottom: 14 }}>
            <div className="info-box"><div className="info-box-lbl">Employment</div><div className="info-box-val">{selected.employment_type}</div></div>
            <div className="info-box"><div className="info-box-lbl">Work Mode</div><div className="info-box-val">{selected.work_mode}</div></div>
            <div className="info-box"><div className="info-box-lbl">Experience</div><div className="info-box-val">{selected.experience_required || "—"}</div></div>
            <div className="info-box"><div className="info-box-lbl">Priority</div><div className="info-box-val"><PriorityPill priority={selected.priority} /></div></div>
          </div>

          {selected.job_description && (
            <div style={{ background: "var(--p-pale)", borderRadius: "var(--r-sm)", padding: "12px 14px", marginBottom: 14 }}>
              <div className="info-box-lbl" style={{ marginBottom: 6 }}>Job Description</div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>{selected.job_description}</div>
            </div>
          )}

          {selected.skills_required?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="flbl" style={{ marginBottom: 6 }}>Skills Required</div>
              <div>{selected.skills_required.map((s, i) => <span key={i} className="skill-chip">{s}</span>)}</div>
            </div>
          )}

          <div className="fld" style={{ marginBottom: 0 }}>
            <label className="flbl">Admin Comment</label>
            <textarea className="ftxt" rows="4" value={actionMessage}
              onChange={(e) => setActionMessage(e.target.value)}
              placeholder="Write your comment, reason, or feedback…" />
          </div>
        </div>

        <div className="modal-ft">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-blue" onClick={handleRevision} disabled={revisionMut.isPending || !actionMessage}>
            {revisionMut.isPending ? "…" : "Revision"}
          </button>
          <button className="btn-orange" onClick={handleHold} disabled={holdMut.isPending}>
            {holdMut.isPending ? "…" : "Hold"}
          </button>
          <button className="btn-red" onClick={handleReject} disabled={rejectMut.isPending || !actionMessage}>
            {rejectMut.isPending ? "…" : "Reject"}
          </button>
          <button className="btn-green" onClick={handleApprove} disabled={approveMut.isPending}>
            {approveMut.isPending ? "…" : "Approve"}
          </button>
        </div>

        {(approveMut.isError || rejectMut.isError || holdMut.isError || revisionMut.isError) && (
          <div style={{ padding: "0 26px 14px", fontSize: 12, color: "var(--red)" }}>
            Something went wrong while processing the request.
          </div>
        )}
      </div>
    </div>
  );
};

const RecruitmentAdmin = () => {
  useInjectStyles();

  const [search, setSearch]           = useState("");
  const [manageModal, setManageModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: requisitionData, isLoading } = useGetAllRequisitions();
  const { data: pendingData }                 = useGetPendingRequisitions();

  const approveMut  = useApproveRequisition();
  const rejectMut   = useRejectRequisition();
  const holdMut     = useHoldRequisition();
  const revisionMut = useRequestRevision();

  const requisitions = Array.isArray(requisitionData?.data) ? requisitionData.data : [];
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

  return (
    <div className="rec-page">
      <div className="rec-hero">
        <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,.5)", marginBottom: 6, fontWeight: 500 }}>{today}</p>
        <h1 className="rec-hero-title">Recruitment Management</h1>
        <p className="rec-hero-sub">Review hiring requisitions, manage candidates and track recruitment pipeline.</p>
        <div className="rec-hero-chips">
          <span className="rec-hero-chip">📋 {stats.total} Requisitions</span>
          <span className="rec-hero-chip">⏳ {stats.pending} Pending</span>
          <span className="rec-hero-chip">✅ {stats.approved} Approved</span>
          {stats.rejected > 0 && <span className="rec-hero-chip">❌ {stats.rejected} Rejected</span>}
        </div>
      </div>

      <div className="rec-stats">
        {[
          { label: "Total Requisitions", val: stats.total,    icon: <FaBriefcase />, color: "var(--p)",    bg: "var(--p-wash)" },
          { label: "Pending Review",     val: stats.pending,  icon: <FaClock />,     color: "var(--gold)", bg: "#fff8e1" },
          { label: "Approved",           val: stats.approved, icon: <FaCheckCircle />,color: "var(--green)",bg: "#e8f7f1" },
          { label: "Rejected",           val: stats.rejected, icon: <FaTimesCircle />,color: "var(--red)",  bg: "#fbeaea" },
        ].map((s, i) => (
          <div className="rec-stat" key={i}>
            <div className="rec-stat-stripe" style={{ background: s.color }} />
            <div className="rec-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="rec-stat-lbl">{s.label}</div>
            <div className="rec-stat-val">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="rec-grid">
        <div>
          <div className="rec-panel">
            <div className="rec-panel-head">
              <div className="rec-panel-title">
                <FaBriefcase style={{ color: "var(--p)", fontSize: 15 }} />
                All Requisitions
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <select className="fsel" style={{ width: "auto", padding: "7px 12px", fontSize: 12 }}
                  value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">All Status</option>
                  {["PENDING", "APPROVED", "REJECTED", "ON_HOLD", "REVISION_REQUIRED"].map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
                <div className="rec-search" style={{ width: 220 }}>
                  <FaSearch className="rec-search-ico" />
                  <input placeholder="Search job, dept…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="rec-table">
                <thead>
                  <tr>
                    <th>Job Role</th>
                    <th>Department</th>
                    <th>Openings</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Requested By</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan="8" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading requisitions…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No requisitions found.</td></tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.job_title}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{item.employment_type}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>{item.department}</td>
                        <td style={{ fontWeight: 600, textAlign: "center" }}>{item.openings}</td>
                        <td><PriorityPill priority={item.priority} /></td>
                        <td><StatusPill status={item.status} /></td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>
                            {item.requested_by?.f_name} {item.requested_by?.l_name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{item.requested_by?.designation}</div>
                        </td>
                        <td style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(item.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 10px" }}
                              onClick={() => setDetailModal(item)}>
                              <FaChevronRight style={{ fontSize: 9 }} /> Details
                            </button>
                            {item.status === "PENDING" && (
                              <button className="btn-p" style={{ fontSize: 11, padding: "5px 12px" }}
                                onClick={() => setManageModal(item)}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="rec-panel">
            <div className="rec-panel-head">
              <div className="rec-panel-title">
                <FaExclamationTriangle style={{ color: "var(--gold)", fontSize: 14 }} />
                Pending Requests
              </div>
              {pendingRequisitions.length > 0 && (
                <span style={{ background: "#fff8e1", color: "var(--gold)", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, border: "1px solid #f0d870" }}>
                  {pendingRequisitions.length}
                </span>
              )}
            </div>
            <div style={{ padding: "12px 18px", maxHeight: 420, overflowY: "auto" }}>
              {pendingRequisitions.length === 0 ? (
                <div className="empty-state"><div className="empty-state-ico">✅</div><p>No pending requisitions.</p></div>
              ) : (
                pendingRequisitions.map((item) => (
                  <div className="rec-pending-card" key={item._id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.job_title}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{item.department}</div>
                      </div>
                      <PriorityPill priority={item.priority} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
                      <FaUsers style={{ fontSize: 10 }} />
                      <span>{item.openings} opening{item.openings !== 1 ? "s" : ""}</span>
                      <span>·</span>
                      <span>{fmtDate(item.createdAt)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 10px", flex: 1 }}
                        onClick={() => setDetailModal(item)}>
                        Details
                      </button>
                      <button className="btn-p" style={{ fontSize: 11, padding: "5px 12px", flex: 1 }}
                        onClick={() => setManageModal(item)}>
                        Manage
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rec-panel">
            <div className="rec-panel-head">
              <div className="rec-panel-title">
                <FaArrowRight style={{ color: "var(--p)", fontSize: 13 }} />
                Recruitment Flow
              </div>
            </div>
            <div style={{ padding: "12px 18px 16px" }}>
              {[
                { step: "PENDING",            color: "var(--gold)",   desc: "Submitted by manager, awaits admin review" },
                { step: "APPROVED",           color: "var(--green)",  desc: "Approved — candidates can be added" },
                { step: "ON HOLD",            color: "var(--orange)", desc: "Temporarily paused by admin" },
                { step: "REVISION REQUIRED",  color: "var(--blue)",   desc: "Manager must revise and resubmit" },
                { step: "REJECTED",           color: "var(--red)",    desc: "Closed — requisition not accepted" },
              ].map((s, i) => (
                <div className="rec-flow-step" key={i}>
                  <div className="rec-flow-num" style={{ background: s.color }}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{s.step}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{s.desc}</div>
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
        <RequisitionDetailModal
          requisition={detailModal}
          onClose={() => setDetailModal(null)}
        />
      )}
    </div>
  );
};

export default RecruitmentAdmin;