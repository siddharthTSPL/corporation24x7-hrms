import React, { useState, useCallback } from "react";
import {
  useMyAssignedJobs,
  useJobsCreatedByMe,
  useCreateJob,
  useAssignableTargets,
  useUpdateJobStatus,
  useArchiveJob,
  useMyWeekLog,
  useLogTime,
  useActiveTimer,
  useStartTimer,
  usePauseTimer,
  useResumeTimer,
  useStopTimer,
  useDiscardTimer,
  useHeartbeatTimer,
  useMyTimesheets,
  useSubmitTimesheet,
  usePendingApprovals,
  useApproveTimesheet,
  useRejectTimesheet,
  useForwardTimesheet,
  useTeamWorkloadHeatmap,
  useOverrunRiskJobs,
  useIdleJobs,
  useMyProductivitySummary,
} from "../../auth/server-state/timesheet/timesheet.hook";

const C = {
  brand: "#730042",
  brandLight: "rgba(115,0,66,0.08)",
  bg: "#F7F8FC",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F3F9",
  border: "#E3E6F0",
  text: "#0F1729",
  textMid: "#4A5568",
  textMuted: "#94A3B8",
  green: "#059669",
  greenLight: "rgba(5,150,105,0.09)",
  amber: "#B45309",
  amberLight: "rgba(180,83,9,0.09)",
  red: "#DC2626",
  redLight: "rgba(220,38,38,0.09)",
  blue: "#2563EB",
  blueLight: "rgba(37,99,235,0.09)",
};

const getMonday = (d = new Date()) => {
  const dt = new Date(d); const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff); dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
};

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtDuration = (mins) => `${Math.floor(mins / 60)}h ${mins % 60}m`;
const fmtSeconds = (s) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; };

const STATUS_STYLE = {
  draft: { color: "#94A3B8", bg: "#F1F3F9", label: "Draft" },
  pending_manager: { color: "#B45309", bg: "rgba(180,83,9,0.09)", label: "Pending Manager" },
  pending_reporting_manager: { color: "#B45309", bg: "rgba(180,83,9,0.09)", label: "Pending Review" },
  pending_admin: { color: "#2563EB", bg: "rgba(37,99,235,0.09)", label: "Pending Admin" },
  pending_superadmin: { color: "#730042", bg: "rgba(115,0,66,0.08)", label: "Pending SA" },
  approved: { color: "#059669", bg: "rgba(5,150,105,0.09)", label: "Approved" },
  rejected: { color: "#DC2626", bg: "rgba(220,38,38,0.09)", label: "Rejected" },
};

const PRIORITY_COLOR = { low: "#94A3B8", medium: "#B45309", high: "#DC2626", urgent: "#730042" };
const JOB_STATUS_COLOR = { not_started: "#94A3B8", in_progress: "#2563EB", on_hold: "#B45309", completed: "#059669", cancelled: "#DC2626" };

const TABS = [
  { id: "overview", label: "Overview", icon: "⊞" },
  { id: "team-jobs", label: "Team Jobs", icon: "👥" },
  { id: "approvals", label: "Approvals", icon: "✅" },
  { id: "insights", label: "Insights", icon: "📊" },
  { id: "my-work", label: "My Work", icon: "⏱" },
  { id: "timesheets", label: "Timesheets", icon: "📄" },
];

function Badge({ status }) {
  const s = STATUS_STYLE[status] || { color: C.textMuted, bg: C.surfaceAlt, label: status };
  return <span style={{ color: s.color, background: s.bg, borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 10px", textTransform: "uppercase" }}>{s.label}</span>;
}

function Chip({ color = C.brand, children }) {
  return <span style={{ color, background: color + "14", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "2px 9px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</span>;
}

function Card({ children, style = {} }) {
  return <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)", ...style }}>{children}</div>;
}

function StatCard({ label, value, color = C.brand, sub }) {
  return (
    <Card style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function Modal({ open, onClose, title, width = 500, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,41,0.5)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, width: "100%", maxWidth: width, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ color: C.textMuted, fontSize: 20, lineHeight: 1, background: "none", border: "none", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>}
      <input {...props} style={{ background: C.surfaceAlt, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none", width: "100%", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = C.brand} onBlur={e => e.target.style.borderColor = C.border} />
    </div>
  );
}

function Sel({ label, children, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>}
      <select {...props} style={{ background: C.surfaceAlt, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none", width: "100%", appearance: "none", boxSizing: "border-box" }}>{children}</select>
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, disabled, style: ex = {} }) {
  const v = { primary: { background: C.brand, color: "#fff", border: "none" }, ghost: { background: C.surfaceAlt, color: C.textMid, border: `1px solid ${C.border}` }, danger: { background: C.redLight, color: C.red, border: `1px solid ${C.red}30` }, success: { background: C.greenLight, color: C.green, border: `1px solid ${C.green}30` }, amber: { background: C.amberLight, color: C.amber, border: `1px solid ${C.amber}30` } };
  return <button onClick={onClick} disabled={disabled} style={{ ...v[variant], borderRadius: 10, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap", transition: "opacity 0.15s", ...ex }}>{children}</button>;
}

import { useEffect } from "react";

function TimerWidget({ jobs }) {
  const { data: timerData, refetch: refetchTimer } = useActiveTimer({ refetchInterval: 10000 });
  const timer = timerData?.timer;
  const startTimer = useStartTimer(); const pauseTimer = usePauseTimer(); const resumeTimer = useResumeTimer(); const stopTimer = useStopTimer(); const discardTimer = useDiscardTimer(); const heartbeat = useHeartbeatTimer();
  const [elapsed, setElapsed] = useState(0);
  const [startModal, setStartModal] = useState(false);
  const [startForm, setStartForm] = useState({ job: "", note: "" });
  const [stopModal, setStopModal] = useState(false);
  const [stopNote, setStopNote] = useState("");

  useEffect(() => {
    if (!timer || timer.status !== "running") { setElapsed(timer?.accumulated_seconds || 0); return; }
    const tick = () => { const base = timer.accumulated_seconds || 0; const since = Math.floor((Date.now() - new Date(timer.last_heartbeat_at)) / 1000); setElapsed(base + Math.max(0, since)); };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (!timer || timer.status !== "running") return;
    const id = setInterval(() => heartbeat.mutate(), 60000); return () => clearInterval(id);
  }, [timer]);

  const isRunning = timer?.status === "running"; const isPaused = timer?.status === "paused";
  const displaySecs = isRunning ? elapsed : (timer?.accumulated_seconds || 0);

  return (
    <>
      <Card style={{ overflow: "hidden" }}>
        <div style={{ background: isRunning ? C.brand : C.surfaceAlt, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          {isRunning && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", animation: "pulse 1.5s infinite" }} />}
          <span style={{ color: isRunning ? "#fff" : C.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{isRunning ? "Timer Running" : isPaused ? "Timer Paused" : "No Active Timer"}</span>
          {timer?.job?.title && <span style={{ marginLeft: "auto", color: isRunning ? "rgba(255,255,255,0.75)" : C.textMuted, fontSize: 12 }}>{timer.job.title}</span>}
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ fontFamily: "monospace", fontSize: 40, fontWeight: 900, color: isRunning ? C.brand : isPaused ? C.amber : C.textMuted, letterSpacing: "0.05em", lineHeight: 1, marginBottom: 16 }}>{fmtSeconds(displaySecs)}</div>
          {!timer ? (
            <Btn onClick={() => setStartModal(true)}>▶ Start Timer</Btn>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isRunning && <Btn variant="amber" onClick={() => pauseTimer.mutate({}, { onSuccess: refetchTimer })}>⏸ Pause</Btn>}
              {isPaused && <Btn onClick={() => resumeTimer.mutate({}, { onSuccess: refetchTimer })}>▶ Resume</Btn>}
              <Btn variant="success" onClick={() => setStopModal(true)}>■ Stop & Log</Btn>
              <Btn variant="danger" onClick={() => discardTimer.mutate({}, { onSuccess: refetchTimer })}>✕ Discard</Btn>
            </div>
          )}
        </div>
      </Card>

      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Timer">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Sel label="Job (assigned to me)" value={startForm.job} onChange={e => setStartForm(p => ({ ...p, job: e.target.value }))}>
            <option value="">Select a job…</option>
            {(jobs||[]).filter(j=>!["completed","cancelled"].includes(j.status)).map(j=><option key={j._id} value={j._id}>{j.title}</option>)}
          </Sel>
          <Input label="Note (optional)" placeholder="What are you working on?" value={startForm.note} onChange={e => setStartForm(p => ({ ...p, note: e.target.value }))} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setStartModal(false)}>Cancel</Btn>
            <Btn onClick={() => startTimer.mutate({ job: startForm.job, note: startForm.note }, { onSuccess: () => { setStartModal(false); setStartForm({ job: "", note: "" }); refetchTimer(); } })} disabled={!startForm.job || startTimer.isPending}>▶ Start</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={stopModal} onClose={() => setStopModal(false)} title="Stop & Log Time">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>Elapsed</span>
            <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 20, color: C.brand }}>{fmtSeconds(displaySecs)}</span>
          </div>
          <Input label="Note (optional)" placeholder="Brief description…" value={stopNote} onChange={e => setStopNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setStopModal(false)}>Cancel</Btn>
            <Btn variant="success" onClick={() => stopTimer.mutate({ note: stopNote }, { onSuccess: () => { setStopModal(false); setStopNote(""); refetchTimer(); } })} disabled={stopTimer.isPending}>{stopTimer.isPending ? "Logging…" : "■ Log Time"}</Btn>
          </div>
        </div>
      </Modal>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}`}</style>
    </>
  );
}

export default function AdminTimesheet() {
  const [tab, setTab] = useState("overview");
  const [weekStart, setWeekStart] = useState(getMonday());
  const [jobModal, setJobModal] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [rejectModal, setRejectModal] = useState({ open: false, ts: null });
  const [rejectReason, setRejectReason] = useState("");
  const [jobForm, setJobForm] = useState({ title: "", description: "", assigned_to: "", priority: "medium", estimated_hours: "", billable: false, hourly_rate: "", due_date: "" });
  const [logForm, setLogForm] = useState({ job: "", log_date: new Date().toISOString().slice(0, 10), duration_minutes: "", note: "" });

  const { data: assignedJobsData } = useMyAssignedJobs();
  const assignedJobs = assignedJobsData?.jobs || [];

  const { data: createdJobsData, refetch: refetchCreated } = useJobsCreatedByMe();
  const createdJobs = createdJobsData?.jobs || [];

  const { data: targetsData } = useAssignableTargets();
  const targets = targetsData?.targets || [];

  const { data: weekData, refetch: refetchWeek } = useMyWeekLog(weekStart);
  const weekDays = weekData?.days || {};
  const totalWeekMins = Object.values(weekDays).reduce((s, d) => s + (d.totalMinutes || 0), 0);

  const { data: tsData, refetch: refetchTS } = useMyTimesheets();
  const timesheets = tsData?.timesheets || [];

  const { data: approvalsData, refetch: refetchApprovals } = usePendingApprovals();
  const approvals = approvalsData?.timesheets || [];

  const { data: heatmapData } = useTeamWorkloadHeatmap(weekStart);
  const heatmap = heatmapData?.heatmap || [];

  const { data: overrunData } = useOverrunRiskJobs();
  const overrunJobs = overrunData?.jobs || [];

  const { data: idleData } = useIdleJobs(7);
  const idleJobs = idleData?.jobs || [];

  const { data: prodData } = useMyProductivitySummary(weekStart);

  const createJob = useCreateJob();
  const updateJobStatus = useUpdateJobStatus();
  const archiveJob = useArchiveJob();
  const logTime = useLogTime();
  const submitTS = useSubmitTimesheet();
  const approveTS = useApproveTimesheet();
  const rejectTS = useRejectTimesheet();
  const forwardTS = useForwardTimesheet();

  const shiftWeek = useCallback((dir) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }, [weekStart]);

  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

  const handleCreateJob = () => {
    if (!jobForm.title || !jobForm.assigned_to) return;
    const target = targets.find(t => t.id === jobForm.assigned_to);
    createJob.mutate({
      title: jobForm.title, description: jobForm.description,
      assigned_to: jobForm.assigned_to, assigned_to_model: target?.model || "Manager",
      priority: jobForm.priority,
      estimated_hours: Number(jobForm.estimated_hours) || 0,
      billable: jobForm.billable, hourly_rate: Number(jobForm.hourly_rate) || 0,
      due_date: jobForm.due_date || null,
    }, {
      onSuccess: () => { setJobModal(false); setJobForm({ title: "", description: "", assigned_to: "", priority: "medium", estimated_hours: "", billable: false, hourly_rate: "", due_date: "" }); refetchCreated(); },
    });
  };

  const handleLogTime = () => {
    logTime.mutate({ ...logForm, duration_minutes: Number(logForm.duration_minutes) }, {
      onSuccess: () => { setLogModal(false); setLogForm({ job: "", log_date: new Date().toISOString().slice(0, 10), duration_minutes: "", note: "" }); refetchWeek(); },
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, height: 56, overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, background: C.brand, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 14 }}>⏱</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Timesheet</span>
              <span style={{ color: C.border, margin: "0 4px" }}>·</span>
              <span style={{ fontSize: 12, color: C.textMuted }}>Admin</span>
            </div>
            <nav style={{ display: "flex", gap: 2, flex: 1 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? C.brandLight : "none", color: tab === t.id ? C.brand : C.textMid, border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s", whiteSpace: "nowrap" }}>
                  <span>{t.icon}</span><span>{t.label}</span>
                  {t.id === "approvals" && approvals.length > 0 && <span style={{ background: C.brand, color: "#fff", borderRadius: 8, fontSize: 10, fontWeight: 800, padding: "1px 5px" }}>{approvals.length}</span>}
                </button>
              ))}
            </nav>
            <Btn onClick={() => setJobModal(true)} style={{ flexShrink: 0 }}>+ Create Job</Btn>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px" }}>
        {/* Overview */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <StatCard label="Jobs Created" value={createdJobs.length} color={C.brand} />
              <StatCard label="Pending Approvals" value={approvals.length} color={C.amber} />
              <StatCard label="Overrun Risk" value={overrunJobs.length} color={C.red} sub="≥75% estimate used" />
              <StatCard label="Idle Jobs" value={idleJobs.length} color={C.textMuted} sub="7+ days inactive" />
              <StatCard label="My Hours This Week" value={fmtDuration(totalWeekMins)} color={C.green} />
            </div>

            {approvals.length > 0 && (
              <Card>
                <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Pending Approvals</span>
                  <Chip color={C.amber}>{approvals.length} waiting</Chip>
                </div>
                {approvals.slice(0, 3).map(ts => (
                  <div key={ts._id} style={{ padding: "12px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{ts.owner?.f_name} {ts.owner?.l_name}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>Week of {fmtDate(ts.week_start)} · {fmtDuration(ts.total_minutes)}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn variant="success" onClick={() => approveTS.mutate({ timesheetId: ts._id, remarks: "Approved" }, { onSuccess: refetchApprovals })}>Approve</Btn>
                      <Btn variant="danger" onClick={() => setRejectModal({ open: true, ts })}>Reject</Btn>
                    </div>
                  </div>
                ))}
                {approvals.length > 3 && (
                  <div style={{ padding: "12px 22px" }}>
                    <button onClick={() => setTab("approvals")} style={{ fontSize: 12, color: C.brand, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View all {approvals.length} pending →</button>
                  </div>
                )}
              </Card>
            )}

            {/* Jobs by status */}
            <Card>
              <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Jobs by Status</span>
              </div>
              <div style={{ padding: "16px 22px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                {["not_started","in_progress","on_hold","completed","cancelled"].map(s => {
                  const count = createdJobs.filter(j => j.status === s).length;
                  const col = JOB_STATUS_COLOR[s];
                  return (
                    <div key={s} style={{ background: col + "10", border: `1px solid ${col}30`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: col }}>{count}</div>
                      <div style={{ fontSize: 10, color: col, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>{s.replace(/_/g, " ")}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Team Jobs */}
        {tab === "team-jobs" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Team Jobs</h1>
                <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>{createdJobs.length} jobs created by you</p>
              </div>
              <Btn onClick={() => setJobModal(true)}>+ Create Job</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {createdJobs.length === 0 ? (
                <Card style={{ padding: "60px 32px", textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>No jobs created yet</div>
                  <Btn onClick={() => setJobModal(true)}>+ Create First Job</Btn>
                </Card>
              ) : (
                createdJobs.map(j => (
                  <Card key={j._id} style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ width: 4, height: 44, background: JOB_STATUS_COLOR[j.status] || C.textMuted, borderRadius: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{j.title}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Chip color={PRIORITY_COLOR[j.priority]}>{j.priority}</Chip>
                        <Chip color={JOB_STATUS_COLOR[j.status]}>{j.status.replace(/_/g, " ")}</Chip>
                        {j.billable && <Chip color={C.green}>Billable</Chip>}
                        {j.estimated_hours > 0 && <Chip color={C.blue}>{j.logged_hours_cache}h / {j.estimated_hours}h</Chip>}
                      </div>
                      {j.estimated_hours > 0 && (
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 140, height: 4, background: C.surfaceAlt, borderRadius: 4 }}>
                            <div style={{ width: `${Math.min(100, (j.logged_hours_cache/j.estimated_hours)*100)}%`, height: "100%", background: j.overrun_flagged ? C.red : C.brand, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 10, color: j.overrun_flagged ? C.red : C.textMuted }}>{Math.round((j.logged_hours_cache/j.estimated_hours)*100)}% used</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {!["completed","cancelled"].includes(j.status) && (
                        <button onClick={() => updateJobStatus.mutate({ id: j._id, status: "completed" }, { onSuccess: refetchCreated })} style={{ background: C.greenLight, color: C.green, border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Complete</button>
                      )}
                      <button onClick={() => archiveJob.mutate(j._id, { onSuccess: refetchCreated })} style={{ background: C.surfaceAlt, color: C.textMid, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Archive</button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Approvals */}
        {tab === "approvals" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Timesheet Approvals</h1>
              <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>{approvals.length} pending your review</p>
            </div>
            {approvals.length === 0 ? (
              <Card style={{ padding: "60px 32px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>All clear — no pending approvals</div>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {approvals.map(ts => (
                  <Card key={ts._id} style={{ padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{ts.owner?.f_name} {ts.owner?.l_name}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{ts.owner?.work_email}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Week: {fmtDate(ts.week_start)} – {fmtDate(ts.week_end)}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <Chip color={C.brand}>{fmtDuration(ts.total_minutes)}</Chip>
                          {ts.billable_minutes > 0 && <Chip color={C.green}>{fmtDuration(ts.billable_minutes)} billable</Chip>}
                          <Badge status={ts.status} />
                        </div>
                        {ts.total_billed_amount > 0 && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginTop: 8 }}>₹{ts.total_billed_amount.toFixed(2)} billed</div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Btn variant="success" onClick={() => approveTS.mutate({ timesheetId: ts._id, remarks: "Approved by Admin" }, { onSuccess: refetchApprovals })}>Approve</Btn>
                        <Btn variant="amber" onClick={() => forwardTS.mutate({ timesheetId: ts._id, remarks: "Forwarded to SuperAdmin" }, { onSuccess: refetchApprovals })}>Forward to SA</Btn>
                        <Btn variant="danger" onClick={() => setRejectModal({ open: true, ts })}>Reject</Btn>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Insights */}
        {tab === "insights" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Insights</h1>
              <div style={{ display: "flex", gap: 8, alignItems: "center", background: C.surfaceAlt, borderRadius: 10, padding: "5px 10px" }}>
                <button onClick={() => shiftWeek(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 16 }}>‹</button>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.textMid }}>
                  {new Date(weekStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {weekEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                <button onClick={() => shiftWeek(1)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 16 }}>›</button>
              </div>
            </div>

            {/* Team heatmap */}
            <Card>
              <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.border}` }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>Team Workload Heatmap</h3>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textMuted }}>Daily capacity usage (8h = 100%)</p>
              </div>
              <div style={{ padding: "16px 22px" }}>
                {heatmap.length === 0 ? (
                  <div style={{ textAlign: "center", color: C.textMuted, fontSize: 13, padding: "24px 0" }}>No team data for this week</div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, paddingLeft: 40 }}>
                      {Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }).map((d, i) => (
                        <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: C.textMuted, fontWeight: 600 }}>{d.toLocaleDateString("en-IN", { weekday: "short" })}</div>
                      ))}
                    </div>
                    {heatmap.map((row, i) => {
                      const dayKeys = Array.from({ length: 7 }, (_, d) => { const dt = new Date(weekStart); dt.setDate(dt.getDate() + d); return dt.toISOString().slice(0, 10); });
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                          <div style={{ width: 28, height: 28, background: C.brandLight, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.brand, flexShrink: 0 }}>
                            {String(row.person).slice(-2).toUpperCase()}
                          </div>
                          {dayKeys.map(dk => {
                            const day = row.days[dk]; const pct = day?.loadPercent || 0;
                            const bg = pct === 0 ? C.surfaceAlt : pct < 60 ? "#d1fae5" : pct < 90 ? "#fef3c7" : "#fee2e2";
                            const col = pct === 0 ? C.textMuted : pct < 60 ? C.green : pct < 90 ? C.amber : C.red;
                            return (
                              <div key={dk} title={`${pct}%`} style={{ flex: 1, height: 34, background: bg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: col }}>
                                {pct > 0 ? `${pct}%` : "—"}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Overrun */}
              <Card>
                <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.red }}>⚠ Overrun Risk</span>
                  <Chip color={C.red}>{overrunJobs.length}</Chip>
                </div>
                {overrunJobs.length === 0 ? (
                  <div style={{ padding: "24px 22px", fontSize: 13, color: C.textMuted }}>No jobs at risk</div>
                ) : (
                  overrunJobs.map(j => (
                    <div key={j._id} style={{ padding: "12px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{j.logged_hours_cache}h / {j.estimated_hours}h</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: j.riskPercent >= 100 ? C.red : C.amber }}>{j.riskPercent}%</span>
                    </div>
                  ))
                )}
              </Card>

              {/* Idle */}
              <Card>
                <div style={{ padding: "14px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.textMid }}>💤 Idle Jobs</span>
                  <Chip color={C.textMuted}>{idleJobs.length}</Chip>
                </div>
                {idleJobs.length === 0 ? (
                  <div style={{ padding: "24px 22px", fontSize: 13, color: C.textMuted }}>No idle jobs</div>
                ) : (
                  idleJobs.map(j => (
                    <div key={j._id} style={{ padding: "12px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>Last updated {fmtDate(j.updatedAt)}</div>
                      </div>
                      <Chip color={JOB_STATUS_COLOR[j.status]}>{j.status.replace(/_/g, " ")}</Chip>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </div>
        )}

        {/* My Work */}
        {tab === "my-work" && (
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <TimerWidget jobs={assignedJobs} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>My Time This Week</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", background: C.surfaceAlt, borderRadius: 10, padding: "5px 10px" }}>
                    <button onClick={() => shiftWeek(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 16 }}>‹</button>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.textMid }}>{new Date(weekStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {weekEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <button onClick={() => shiftWeek(1)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 16 }}>›</button>
                  </div>
                  <Btn onClick={() => setLogModal(true)}>+ Log Time</Btn>
                </div>
              </div>
              <Card style={{ marginBottom: 12 }}>
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 24 }}>
                  <div><div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Total</div><div style={{ fontSize: 20, fontWeight: 800, color: C.brand }}>{fmtDuration(totalWeekMins)}</div></div>
                  {prodData && <>
                    <div><div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Billable</div><div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{fmtDuration(prodData.billableMinutes)}</div></div>
                    <div><div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Capacity</div><div style={{ fontSize: 20, fontWeight: 800, color: C.blue }}>{prodData.capacityPercent}%</div></div>
                  </>}
                </div>
                {Object.entries(weekDays).sort(([a],[b])=>a.localeCompare(b)).map(([date, data]) => {
                  const pct = Math.min(100, Math.round(((data.totalMinutes||0)/480)*100));
                  return (
                    <div key={date} style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.textMid, width: 100 }}>{new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                      <div style={{ flex: 1, height: 6, background: C.surfaceAlt, borderRadius: 4 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? C.green : C.brand, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: data.totalMinutes > 0 ? C.brand : C.textMuted, width: 50, textAlign: "right" }}>{data.totalMinutes > 0 ? fmtDuration(data.totalMinutes) : "—"}</span>
                    </div>
                  );
                })}
              </Card>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={() => submitTS.mutate({ week_start: weekStart }, { onSuccess: () => { refetchTS(); refetchWeek(); } })} disabled={submitTS.isPending}>
                  {submitTS.isPending ? "Submitting…" : "Submit Week for Approval"}
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* Timesheets */}
        {tab === "timesheets" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>My Timesheets</h1>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {timesheets.length === 0 ? (
                <Card style={{ padding: "60px 32px", textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>No timesheets yet</div>
                  <Btn onClick={() => setTab("my-work")}>Go to My Work</Btn>
                </Card>
              ) : timesheets.map(ts => (
                <Card key={ts._id} style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>Week of {fmtDate(ts.week_start)}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge status={ts.status} />
                      <Chip color={C.brand}>{fmtDuration(ts.total_minutes)}</Chip>
                      {ts.billable_minutes > 0 && <Chip color={C.green}>{fmtDuration(ts.billable_minutes)} billable</Chip>}
                    </div>
                  </div>
                  {ts.remarks && <div style={{ fontSize: 12, color: C.textMid, fontStyle: "italic" }}>"{ts.remarks}"</div>}
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Job Modal */}
      <Modal open={jobModal} onClose={() => setJobModal(false)} title="Create Job" width={540}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Job Title *" placeholder="e.g. Design Login Page" value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} />
          <Input label="Description" placeholder="Job details…" value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))} />
          <Sel label="Assign To *" value={jobForm.assigned_to} onChange={e => setJobForm(p => ({ ...p, assigned_to: e.target.value }))}>
            <option value="">Select team member…</option>
            {targets.map(t => <option key={t.id} value={t.id}>{t.id} ({t.model})</option>)}
          </Sel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Sel label="Priority" value={jobForm.priority} onChange={e => setJobForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </Sel>
            <Input label="Est. Hours" type="number" placeholder="0" value={jobForm.estimated_hours} onChange={e => setJobForm(p => ({ ...p, estimated_hours: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Hourly Rate (₹)" type="number" placeholder="0" value={jobForm.hourly_rate} onChange={e => setJobForm(p => ({ ...p, hourly_rate: e.target.value }))} />
            <Input label="Due Date" type="date" value={jobForm.due_date} onChange={e => setJobForm(p => ({ ...p, due_date: e.target.value }))} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={jobForm.billable} onChange={e => setJobForm(p => ({ ...p, billable: e.target.checked }))} style={{ width: 15, height: 15, accentColor: C.brand }} />
            <span style={{ fontSize: 13, color: C.textMid }}>Billable job</span>
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setJobModal(false)}>Cancel</Btn>
            <Btn onClick={handleCreateJob} disabled={!jobForm.title || !jobForm.assigned_to || createJob.isPending}>{createJob.isPending ? "Creating…" : "Create Job"}</Btn>
          </div>
        </div>
      </Modal>

      {/* Log Time Modal */}
      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Time">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Sel label="Job" value={logForm.job} onChange={e => setLogForm(p => ({ ...p, job: e.target.value }))}>
            <option value="">Select job…</option>
            {assignedJobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Sel>
          <Input label="Date" type="date" value={logForm.log_date} onChange={e => setLogForm(p => ({ ...p, log_date: e.target.value }))} />
          <Input label="Duration (minutes)" type="number" placeholder="e.g. 90" value={logForm.duration_minutes} onChange={e => setLogForm(p => ({ ...p, duration_minutes: e.target.value }))} />
          <Input label="Note" placeholder="What did you work on?" value={logForm.note} onChange={e => setLogForm(p => ({ ...p, note: e.target.value }))} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setLogModal(false)}>Cancel</Btn>
            <Btn onClick={handleLogTime} disabled={!logForm.job || !logForm.duration_minutes || logTime.isPending}>{logTime.isPending ? "Logging…" : "Save Entry"}</Btn>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, ts: null })} title="Reject Timesheet">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: C.textMid, margin: 0 }}>Provide a reason for rejection.</p>
          <Input label="Reason *" placeholder="Enter reason…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setRejectModal({ open: false, ts: null })}>Cancel</Btn>
            <Btn variant="danger" onClick={() => { rejectTS.mutate({ timesheetId: rejectModal.ts._id, remarks: rejectReason }, { onSuccess: () => { setRejectModal({ open: false, ts: null }); setRejectReason(""); refetchApprovals(); } }); }} disabled={!rejectReason || rejectTS.isPending}>{rejectTS.isPending ? "Rejecting…" : "Reject"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}