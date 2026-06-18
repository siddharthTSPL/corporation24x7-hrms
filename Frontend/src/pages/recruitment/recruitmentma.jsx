import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCreateRequisition,
  useGetMyRequisitions,
} from "../../auth/server-state/manager/managerrecruitment/marecruitment.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .rc-card {
      background: #fff;
      border-radius: 14px;
      border: 0.5px solid #ede5e0;
      overflow: hidden;
      position: relative;
      animation: fadeUp .35s ease both;
    }
    .rc-card:hover { box-shadow: 0 4px 20px rgba(42,26,22,0.08); }

    .rc-input {
      width: 100%;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      color: #2a1a16;
      background: #faf8f6;
      border: 0.5px solid #e0d5d0;
      border-radius: 9px;
      padding: 10px 13px;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
      resize: vertical;
    }
    .rc-input:focus {
      border-color: #730042;
      box-shadow: 0 0 0 3px rgba(115,0,66,0.09);
      background: #fff;
    }
    .rc-input::placeholder { color: #c4b0aa; }

    .rc-label {
      font-size: 11px;
      font-weight: 500;
      color: #b0948a;
      font-family: 'DM Sans', sans-serif;
      text-transform: uppercase;
      letter-spacing: .4px;
      display: block;
      margin-bottom: 5px;
    }

    .rc-btn-primary {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 24px;
      border-radius: 10px;
      cursor: pointer;
      border: none;
      background: #730042;
      color: #f9f8f2;
      transition: all .2s;
      letter-spacing: .2px;
    }
    .rc-btn-primary:hover:not(:disabled) {
      background: #8a0050;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(115,0,66,0.3);
    }
    .rc-btn-primary:disabled { opacity: .55; cursor: not-allowed; }

    .rc-btn-locked {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 24px;
      border-radius: 10px;
      border: none;
      background: rgba(115,0,66,0.08);
      color: #b0948a;
      cursor: not-allowed;
      letter-spacing: .2px;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .rc-btn-ghost {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 500;
      padding: 9px 20px;
      border-radius: 10px;
      cursor: pointer;
      border: 0.5px solid #e0d5d0;
      background: transparent;
      color: #730042;
      transition: all .2s;
    }
    .rc-btn-ghost:hover { background: rgba(115,0,66,0.05); border-color: #730042; }

    .rc-tab {
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      font-weight: 500;
      padding: 7px 16px;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      background: transparent;
      color: #b0948a;
      transition: all .18s;
    }
    .rc-tab.active {
      background: #730042;
      color: #f9f8f2;
      box-shadow: 0 2px 8px rgba(115,0,66,0.25);
    }
    .rc-tab:not(.active):hover { background: rgba(115,0,66,0.07); color: #730042; }

    .rc-req-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px 20px;
      border-bottom: 0.5px solid #f0e8e4;
      transition: background .15s;
      animation: slideIn .3s ease both;
      cursor: pointer;
    }
    .rc-req-row:last-child { border-bottom: none; }
    .rc-req-row:hover { background: #faf7f5; }

    .rc-skill-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 20px;
      font-size: 11px;
      font-family: 'DM Sans', sans-serif;
      font-weight: 500;
      background: rgba(115,0,66,0.07);
      color: #730042;
      border: 0.5px solid rgba(115,0,66,0.15);
    }
    .rc-skill-tag button {
      background: none;
      border: none;
      cursor: pointer;
      color: #730042;
      font-size: 13px;
      line-height: 1;
      padding: 0;
      opacity: .6;
      transition: opacity .15s;
    }
    .rc-skill-tag button:hover { opacity: 1; }

    .rc-section-title {
      font-size: 11px;
      font-weight: 600;
      color: #b0948a;
      font-family: 'DM Sans', sans-serif;
      text-transform: uppercase;
      letter-spacing: .5px;
      padding: 0 0 10px;
      border-bottom: 0.5px solid #f0e8e4;
      margin-bottom: 16px;
    }

    .rc-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(249,248,242,0.3);
      border-top-color: #f9f8f2;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      display: inline-block;
    }

    .rc-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      gap: 10px;
    }

    .rc-detail-overlay {
      position: fixed;
      inset: 0;
      background: rgba(42,26,22,0.35);
      backdrop-filter: blur(4px);
      z-index: 200;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
    }
    .rc-detail-panel {
      width: min(480px, 100vw);
      height: 100vh;
      background: #fff;
      overflow-y: auto;
      animation: slideIn .25s ease both;
      border-left: 0.5px solid #ede5e0;
    }

    .rc-form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .rc-form-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 14px;
    }

    @media (max-width: 640px) {
      .rc-form-grid-2, .rc-form-grid-3 { grid-template-columns: 1fr; }
    }
  `}</style>
);

const STATUS_META = {
  PENDING:           { label: "Pending",          color: "#92400E", bg: "#faeeda" },
  APPROVED:          { label: "Approved ✓",        color: "#1a6b48", bg: "#e8f5e9" },
  REJECTED:          { label: "Rejected ✗",        color: "#791F1F", bg: "#fcebeb" },
  ON_HOLD:           { label: "On Hold",           color: "#185FA5", bg: "#e6f1fb" },
  REVISION_REQUIRED: { label: "Revision Required", color: "#5b21b6", bg: "#f3e8ff" },
};

const PRIORITY_META = {
  Low:    { label: "Low",    color: "#475569", bg: "#f1f5f9" },
  Medium: { label: "Medium", color: "#92400E", bg: "#faeeda" },
  High:   { label: "High",   color: "#791F1F", bg: "#fcebeb" },
  Urgent: { label: "Urgent", color: "#730042", bg: "rgba(115,0,66,0.1)" },
};

const WORK_MODE_META = {
  Remote: { label: "Remote 🌐", color: "#185FA5", bg: "#e6f1fb" },
  Onsite: { label: "On-site 🏢", color: "#1a6b48", bg: "#e8f5e9" },
  Hybrid: { label: "Hybrid 🔀",  color: "#5b21b6", bg: "#f3e8ff" },
};

function Skeleton({ w = "100%", h = 16, radius = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: "linear-gradient(90deg,#f0e8e4 25%,#f9f4f2 50%,#f0e8e4 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }}/>
  );
}

function CardAccent({ color }) {
  return <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:color,borderRadius:"14px 14px 0 0" }}/>;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000)   return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
  return fmtDate(iso);
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <span style={{ fontSize:10, color:"#b0948a", fontFamily:"'DM Sans',sans-serif", textTransform:"uppercase", letterSpacing:".4px" }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:500, color:"#2a1a16", fontFamily:"'DM Sans',sans-serif" }}>{value || "—"}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label className="rc-label">{label}</label>
      {children}
    </div>
  );
}

function StatsBar({ reqs }) {
  const total    = reqs.length;
  const pending  = reqs.filter(r => r.status === "PENDING").length;
  const approved = reqs.filter(r => r.status === "APPROVED").length;
  const rejected = reqs.filter(r => r.status === "REJECTED").length;
  const onHold   = reqs.filter(r => r.status === "ON_HOLD").length;

  const stats = [
    { label: "Total",    value: total,    color: "#730042" },
    { label: "Pending",  value: pending,  color: "#BA7517" },
    { label: "Approved", value: approved, color: "#1D9E75" },
    { label: "Rejected", value: rejected, color: "#E24B4A" },
    { label: "On Hold",  value: onHold,   color: "#378ADD" },
  ];

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"repeat(auto-fit, minmax(110px, 1fr))",
      gap:10, marginBottom:16,
    }}>
      {stats.map(s => (
        <div key={s.label} className="rc-card" style={{ animationDelay:".05s" }}>
          <div style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:22, fontWeight:700, color:s.color, fontFamily:"'Lora',serif", lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#b0948a", marginTop:4, fontFamily:"'DM Sans',sans-serif" }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LockedPanel({ title, message, action }) {
  return (
    <div className="rc-empty-state">
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: "rgba(115,0,66,0.08)", display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 22,
      }}>
        🔒
      </div>
      <div style={{ fontSize:14, fontWeight:600, fontFamily:"'Lora',serif", color:"#2a1a16" }}>
        {title}
      </div>
      <div style={{ fontSize:12, color:"#b0948a", fontFamily:"'DM Sans',sans-serif", textAlign:"center", maxWidth:300 }}>
        {message}
      </div>
      {action}
    </div>
  );
}

function AccessDeniedFull() {
  return (
    <div style={{
      fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#f9f8f2",
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      padding:24,
    }}>
      <GlobalStyles/>
      <div style={{ textAlign:"center", maxWidth:360 }}>
        <div style={{
          width:84, height:84, borderRadius:"50%", background:"rgba(115,0,66,0.08)",
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 22px",
          fontSize:34,
        }}>
          🔒
        </div>
        <h2 style={{ fontSize:"clamp(20px,5vw,24px)", fontWeight:700, color:"#2a1a16", margin:"0 0 8px", fontFamily:"'Lora',serif" }}>
          Access Restricted
        </h2>
        <p style={{ fontSize:13, color:"#b0948a", lineHeight:1.7, margin:0, fontFamily:"'DM Sans',sans-serif" }}>
          You don't have permission to use recruitment. Contact your admin to request access.
        </p>
      </div>
    </div>
  );
}

function RequisitionDetail({ req, onClose }) {
  if (!req) return null;
  const sm = STATUS_META[req.status] || { label: req.status, color: "#475569", bg: "#f1f5f9" };
  const pm = PRIORITY_META[req.priority] || { label: req.priority, color: "#475569", bg: "#f1f5f9" };
  const wm = WORK_MODE_META[req.work_mode] || { label: req.work_mode, color: "#475569", bg: "#f1f5f9" };

  return (
    <div className="rc-detail-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rc-detail-panel">
        <div style={{ background:"linear-gradient(135deg,#730042,#a0004a)", padding:"22px 24px 18px", position:"sticky", top:0, zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
            <div>
              <div style={{ fontSize:11, color:"rgba(249,248,242,0.6)", fontFamily:"'DM Sans',sans-serif", marginBottom:4, textTransform:"uppercase", letterSpacing:".4px" }}>
                Requisition Detail
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:"#f9f8f2", fontFamily:"'Lora',serif", lineHeight:1.25 }}>
                {req.job_title}
              </div>
              <div style={{ fontSize:12, color:"rgba(249,248,242,0.65)", marginTop:5, fontFamily:"'DM Sans',sans-serif" }}>
                {req.department} · {req.openings} opening{req.openings !== 1 ? "s" : ""}
              </div>
            </div>
            <button onClick={onClose} style={{
              background:"rgba(249,248,242,0.15)", border:"none", cursor:"pointer",
              color:"#f9f8f2", width:32, height:32, borderRadius:8, fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>×</button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:12 }}>
            <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:600, background:sm.bg, color:sm.color }}>{sm.label}</span>
            <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:600, background:pm.bg, color:pm.color }}>{pm.label} Priority</span>
            <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:600, background:wm.bg, color:wm.color }}>{wm.label}</span>
          </div>
        </div>

        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:20 }}>
          {req.admin_comment && (
            <div style={{
              background: req.status === "APPROVED" ? "#e8f5e9" : req.status === "REJECTED" ? "#fcebeb" : "#faeeda",
              border: `0.5px solid ${req.status === "APPROVED" ? "#a5d6a7" : req.status === "REJECTED" ? "#ef9a9a" : "#f0c080"}`,
              borderRadius:10, padding:"12px 14px",
            }}>
              <div style={{ fontSize:10, color:"#b0948a", fontFamily:"'DM Sans',sans-serif", marginBottom:4, textTransform:"uppercase", letterSpacing:".4px" }}>Admin Comment</div>
              <div style={{ fontSize:13, color:"#2a1a16", fontFamily:"'DM Sans',sans-serif", lineHeight:1.6 }}>{req.admin_comment}</div>
            </div>
          )}

          <div>
            <div className="rc-section-title">Overview</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <InfoRow label="Employment Type" value={req.employment_type}/>
              <InfoRow label="Experience" value={req.experience_required ? `${req.experience_required} yrs` : "—"}/>
              <InfoRow label="Salary Range" value={req.salary_range?.min && req.salary_range?.max ? `₹${Number(req.salary_range.min).toLocaleString("en-IN")} – ₹${Number(req.salary_range.max).toLocaleString("en-IN")}` : "—"}/>
              <InfoRow label="Expected Joining" value={fmtDate(req.expected_joining_date)}/>
              <InfoRow label="Submitted" value={timeAgo(req.createdAt)}/>
              <InfoRow label="Last Updated" value={timeAgo(req.updatedAt)}/>
            </div>
          </div>

          {req.skills_required?.length > 0 && (
            <div>
              <div className="rc-section-title">Required Skills</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {req.skills_required.map((sk, i) => (
                  <span key={i} className="rc-skill-tag" style={{ cursor:"default" }}>{sk}</span>
                ))}
              </div>
            </div>
          )}

          {req.job_description && (
            <div>
              <div className="rc-section-title">Job Description</div>
              <div style={{ fontSize:13, color:"#4a3530", lineHeight:1.7, fontFamily:"'DM Sans',sans-serif", whiteSpace:"pre-wrap" }}>
                {req.job_description}
              </div>
            </div>
          )}

          {req.hiring_reason && (
            <div>
              <div className="rc-section-title">Hiring Reason</div>
              <div style={{ fontSize:13, color:"#4a3530", lineHeight:1.7, fontFamily:"'DM Sans',sans-serif" }}>
                {req.hiring_reason}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  job_title: "",
  department: "",
  openings: 1,
  employment_type: "Full Time",
  experience_required: "",
  skills_required: [],
  salary_range: { min: "", max: "" },
  priority: "Medium",
  work_mode: "Onsite",
  job_description: "",
  hiring_reason: "",
  expected_joining_date: "",
};

function CreateForm({ onSuccess, onCancel, allowCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [skillInput, setSkillInput] = useState("");
  const [error, setError] = useState("");
  const { mutateAsync, isPending } = useCreateRequisition();

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setSalary = (key, val) => setForm(f => ({ ...f, salary_range: { ...f.salary_range, [key]: val } }));

  const addSkill = () => {
    const sk = skillInput.trim();
    if (sk && !form.skills_required.includes(sk)) {
      setForm(f => ({ ...f, skills_required: [...f.skills_required, sk] }));
    }
    setSkillInput("");
  };

  const removeSkill = (sk) => setForm(f => ({ ...f, skills_required: f.skills_required.filter(s => s !== sk) }));

  const handleSkillKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(); }
  };

  const handleSubmit = async () => {
    if (!form.job_title.trim()) { setError("Job title is required."); return; }
    if (!form.department)       { setError("Department is required."); return; }
    if (!form.hiring_reason)    { setError("Hiring reason is required."); return; }
    setError("");
    try {
      await mutateAsync({
        ...form,
        openings: Number(form.openings),
        experience_required: form.experience_required || undefined,
        salary_range: form.salary_range.min && form.salary_range.max
          ? { min: Number(form.salary_range.min), max: Number(form.salary_range.max) }
          : undefined,
        expected_joining_date: form.expected_joining_date || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err?.message || "Failed to submit. Please try again.");
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <div className="rc-section-title">Basic Information</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="rc-form-grid-2">
            <Field label="Job Title *">
              <input
                className="rc-input"
                value={form.job_title}
                onChange={e => set("job_title", e.target.value)}
                placeholder="e.g. Senior Frontend Developer"
              />
            </Field>
            <Field label="Department *">
              <select className="rc-input" value={form.department} onChange={e => set("department", e.target.value)}>
                <option value="">Select department</option>
                <option value="OPR">OPR – Operations</option>
                <option value="BPO">BPO – Business Process</option>
                <option value="ENG">ENG – Engineering</option>
                <option value="HR">HR – Human Resources</option>
                <option value="MGMT">MGMT – Management</option>
              </select>
            </Field>
          </div>
          <div className="rc-form-grid-3">
            <Field label="Openings">
              <input
                className="rc-input"
                type="number"
                min={1}
                value={form.openings}
                onChange={e => set("openings", e.target.value)}
                placeholder="1"
              />
            </Field>
            <Field label="Employment Type">
              <select className="rc-input" value={form.employment_type} onChange={e => set("employment_type", e.target.value)}>
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </Field>
            <Field label="Experience (yrs)">
              <input
                className="rc-input"
                type="number"
                min={0}
                value={form.experience_required}
                onChange={e => set("experience_required", e.target.value)}
                placeholder="e.g. 3"
              />
            </Field>
          </div>
        </div>
      </div>

      <div>
        <div className="rc-section-title">Work Details</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="rc-form-grid-3">
            <Field label="Priority">
              <select className="rc-input" value={form.priority} onChange={e => set("priority", e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </Field>
            <Field label="Work Mode">
              <select className="rc-input" value={form.work_mode} onChange={e => set("work_mode", e.target.value)}>
                <option value="Onsite">On-site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </Field>
            <Field label="Expected Joining">
              <input
                className="rc-input"
                type="date"
                value={form.expected_joining_date}
                onChange={e => set("expected_joining_date", e.target.value)}
              />
            </Field>
          </div>
          <div className="rc-form-grid-2">
            <Field label="Salary Min (₹)">
              <input
                className="rc-input"
                type="number"
                min={0}
                value={form.salary_range.min}
                onChange={e => setSalary("min", e.target.value)}
                placeholder="e.g. 600000"
              />
            </Field>
            <Field label="Salary Max (₹)">
              <input
                className="rc-input"
                type="number"
                min={0}
                value={form.salary_range.max}
                onChange={e => setSalary("max", e.target.value)}
                placeholder="e.g. 1200000"
              />
            </Field>
          </div>
        </div>
      </div>

      <div>
        <div className="rc-section-title">Skills Required</div>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <input
            className="rc-input"
            style={{ flex:1 }}
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={handleSkillKey}
            placeholder="Type a skill and press Enter or comma"
          />
          <button className="rc-btn-ghost" type="button" onClick={addSkill} style={{ whiteSpace:"nowrap" }}>Add</button>
        </div>
        {form.skills_required.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {form.skills_required.map((sk, i) => (
              <span key={i} className="rc-skill-tag">
                {sk}
                <button type="button" onClick={() => removeSkill(sk)}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="rc-section-title">Description & Reason</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Field label="Job Description">
            <textarea
              className="rc-input"
              rows={5}
              value={form.job_description}
              onChange={e => set("job_description", e.target.value)}
              placeholder="Describe the role, responsibilities, and expectations..."
            />
          </Field>
          <Field label="Hiring Reason *">
            <select className="rc-input" value={form.hiring_reason} onChange={e => set("hiring_reason", e.target.value)}>
              <option value="">Select a reason</option>
              <option value="New Position">New Position</option>
              <option value="Replacement">Replacement</option>
              <option value="Team Expansion">Team Expansion</option>
              <option value="Project Requirement">Project Requirement</option>
              <option value="Urgent Requirement">Urgent Requirement</option>
            </select>
          </Field>
        </div>
      </div>

      {error && (
        <div style={{ background:"#fcebeb", border:"0.5px solid #ef9a9a", borderRadius:9, padding:"10px 14px",
          fontSize:12, color:"#791F1F", fontFamily:"'DM Sans',sans-serif" }}>
          {error}
        </div>
      )}

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:4, flexWrap:"wrap" }}>
        {allowCancel && (
          <button className="rc-btn-ghost" type="button" onClick={onCancel}>Cancel</button>
        )}
        <button className="rc-btn-primary" type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? <span style={{ display:"flex", alignItems:"center", gap:8 }}><span className="rc-spinner"/></span> : "Submit Requisition"}
        </button>
      </div>
    </div>
  );
}

function RequisitionRow({ req, onClick, delay }) {
  const sm = STATUS_META[req.status] || { label: req.status, color: "#475569", bg: "#f1f5f9" };
  const pm = PRIORITY_META[req.priority] || { label: req.priority, color: "#475569", bg: "#f1f5f9" };
  const wm = WORK_MODE_META[req.work_mode] || { label: req.work_mode, color: "#475569", bg: "#f1f5f9" };

  return (
    <div className="rc-req-row" onClick={onClick} style={{ animationDelay:`${delay}s` }}>
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: "rgba(115,0,66,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
      }}>
        💼
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:"#2a1a16", fontFamily:"'Lora',serif", lineHeight:1.25 }}>
              {req.job_title}
            </div>
            <div style={{ fontSize:11, color:"#b0948a", marginTop:3, fontFamily:"'DM Sans',sans-serif" }}>
              {req.department} · {req.openings} opening{req.openings !== 1 ? "s" : ""} · {req.employment_type}
            </div>
          </div>
          <span style={{ padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:600,
            background:sm.bg, color:sm.color, whiteSpace:"nowrap", flexShrink:0 }}>
            {sm.label}
          </span>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:9, alignItems:"center" }}>
          <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:500,
            background:pm.bg, color:pm.color, fontFamily:"'DM Sans',sans-serif" }}>
            {pm.label} Priority
          </span>
          <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:500,
            background:wm.bg, color:wm.color, fontFamily:"'DM Sans',sans-serif" }}>
            {wm.label}
          </span>
          {req.experience_required && (
            <span style={{ fontSize:11, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>
              {req.experience_required}+ yrs exp
            </span>
          )}
          {req.salary_range?.min && req.salary_range?.max && (
            <span style={{ fontSize:11, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>
              ₹{Number(req.salary_range.min/100000).toFixed(1)}L – ₹{Number(req.salary_range.max/100000).toFixed(1)}L
            </span>
          )}
          {req.skills_required?.slice(0,3).map((sk,i) => (
            <span key={i} className="rc-skill-tag" style={{ cursor:"default" }}>{sk}</span>
          ))}
          {req.skills_required?.length > 3 && (
            <span style={{ fontSize:10, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>+{req.skills_required.length - 3} more</span>
          )}
          <span style={{ fontSize:10, color:"#c9bab5", marginLeft:"auto", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>
            {timeAgo(req.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

const FILTER_TABS = ["All", "PENDING", "APPROVED", "REJECTED", "ON_HOLD", "REVISION_REQUIRED"];
const FILTER_LABELS = { All:"All", PENDING:"Pending", APPROVED:"Approved", REJECTED:"Rejected", ON_HOLD:"On Hold", REVISION_REQUIRED:"Revision" };

export default function RecruitmentMA() {
  const navigate = useNavigate();

  const can = usePermissionStore((state) => state.can);
  const canView   = can("recruitment.can_view_hiring_requisitions");
  const canCreate = can("recruitment.can_create_hiring_requisition");
  const hasAccess = canView || canCreate;

  const [view, setView] = useState(canView ? "list" : "create");
  const [filterTab, setFilterTab] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedReq, setSelectedReq] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const { data, isLoading, isError, error, refetch } = useGetMyRequisitions();

  if (!hasAccess) return <AccessDeniedFull/>;

  const reqs = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

  const handleSuccess = () => {
    setView(canView ? "list" : "create");
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 4000);
  };

  const filtered = reqs.filter(r => {
    const matchTab = filterTab === "All" || r.status === filterTab;
    const q = search.toLowerCase();
    const matchSearch = !q
      || r.job_title?.toLowerCase().includes(q)
      || r.department?.toLowerCase().includes(q)
      || r.skills_required?.some(s => s.toLowerCase().includes(q));
    return matchTab && matchSearch;
  });

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#f9f8f2",
      minHeight:"100vh", padding:"clamp(16px,4vw,24px) clamp(16px,4vw,28px)", color:"#2a1a16" }}>
      <GlobalStyles/>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => navigate(-1)} style={{
            background:"#fff", border:"0.5px solid #ede5e0", borderRadius:9,
            width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", color:"#730042", fontSize:16, flexShrink:0,
          }}>←</button>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0, letterSpacing:"-.3px", fontFamily:"'Lora',serif" }}>
              Recruitment
            </h1>
            <p style={{ fontSize:12, color:"#b0948a", margin:0, marginTop:2, fontFamily:"'DM Sans',sans-serif" }}>
              Manage your hiring requisitions
            </p>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {view === "list" && (
            canCreate ? (
              <button className="rc-btn-primary" onClick={() => { setView("create"); setSubmitSuccess(false); }}>
                + New Requisition
              </button>
            ) : (
              <button className="rc-btn-locked" disabled title="No permission to create requisitions">
                🔒 New Requisition
              </button>
            )
          )}
          {view === "create" && (
            <div style={{ fontSize:12, color:"#b0948a", fontFamily:"'DM Sans',sans-serif" }}>
              New Hiring Requisition
            </div>
          )}
        </div>
      </div>

      {submitSuccess && (
        <div style={{
          background:"#e8f5e9", border:"0.5px solid #a5d6a7", borderRadius:10,
          padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:10,
          animation:"fadeUp .3s ease both", fontFamily:"'DM Sans',sans-serif",
        }}>
          <span style={{ fontSize:18 }}>✅</span>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:"#1a6b48" }}>Requisition submitted successfully!</div>
            <div style={{ fontSize:11, color:"#2d8a60", marginTop:1 }}>It has been sent to admin for approval.</div>
          </div>
        </div>
      )}

      {view === "create" ? (
        canCreate ? (
          <div className="rc-card" style={{ animationDelay:".05s" }}>
            <CardAccent color="#730042"/>
            <div style={{ padding:"20px 24px 24px" }}>
              <div style={{ fontSize:16, fontWeight:700, fontFamily:"'Lora',serif", marginBottom:20, color:"#2a1a16" }}>
                New Hiring Requisition
              </div>
              <CreateForm
                onSuccess={handleSuccess}
                onCancel={() => setView("list")}
                allowCancel={canView}
              />
            </div>
          </div>
        ) : (
          <div className="rc-card">
            <CardAccent color="#730042"/>
            <LockedPanel
              title="Creating requisitions is restricted"
              message="You don't have permission to create hiring requisitions. Contact your admin to request access."
            />
          </div>
        )
      ) : (
        <>
          {!isLoading && reqs.length > 0 && <StatsBar reqs={reqs}/>}

          <div className="rc-card" style={{ animationDelay:".1s" }}>
            <CardAccent color="#730042"/>
            <div style={{ padding:"14px 20px 12px", borderBottom:"0.5px solid #ede5e0",
              display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab}
                    className={`rc-tab${filterTab === tab ? " active" : ""}`}
                    onClick={() => setFilterTab(tab)}
                  >
                    {FILTER_LABELS[tab]}
                    {tab !== "All" && reqs.filter(r => r.status === tab).length > 0 && (
                      <span style={{ marginLeft:5, fontSize:10, opacity:.8 }}>
                        {reqs.filter(r => r.status === tab).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <input
                className="rc-input"
                style={{ width:220, maxWidth:"100%", padding:"7px 12px" }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, dept, skill…"
              />
            </div>

            {isLoading ? (
              <div style={{ padding:"20px 20px", display:"flex", flexDirection:"column", gap:14 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <Skeleton w={42} h={42} radius={10}/>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
                      <Skeleton h={16} w="55%"/>
                      <Skeleton h={12} w="40%"/>
                      <Skeleton h={12} w="70%"/>
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div style={{ padding:"40px 20px", textAlign:"center" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>⚠️</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#791F1F", fontFamily:"'Lora',serif", marginBottom:4 }}>Failed to load</div>
                <div style={{ fontSize:12, color:"#b0948a", fontFamily:"'DM Sans',sans-serif", marginBottom:14 }}>{error?.message}</div>
                <button className="rc-btn-ghost" onClick={() => refetch()}>Retry</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rc-empty-state">
                <div style={{ fontSize:40 }}>📋</div>
                <div style={{ fontSize:14, fontWeight:600, fontFamily:"'Lora',serif", color:"#2a1a16" }}>
                  {reqs.length === 0 ? "No requisitions yet" : "No results found"}
                </div>
                <div style={{ fontSize:12, color:"#b0948a", fontFamily:"'DM Sans',sans-serif", textAlign:"center", maxWidth:260 }}>
                  {reqs.length === 0
                    ? "Submit your first hiring requisition to get started."
                    : "Try adjusting your search or filter."}
                </div>
                {reqs.length === 0 && (
                  canCreate ? (
                    <button className="rc-btn-primary" style={{ marginTop:8 }} onClick={() => setView("create")}>
                      + New Requisition
                    </button>
                  ) : (
                    <button className="rc-btn-locked" style={{ marginTop:8 }} disabled>
                      🔒 New Requisition
                    </button>
                  )
                )}
              </div>
            ) : (
              filtered.map((req, i) => (
                <RequisitionRow
                  key={req._id}
                  req={req}
                  delay={i * 0.04}
                  onClick={() => setSelectedReq(req)}
                />
              ))
            )}
          </div>
        </>
      )}

      {selectedReq && (
        <RequisitionDetail req={selectedReq} onClose={() => setSelectedReq(null)}/>
      )}
    </div>
  );
}