import React, { useState, useEffect, useCallback } from "react";
import {
  useMyAssignedJobs,
  useMyDayLog,
  useMyWeekLog,
  useLogTime,
  useUpdateTimeLog,
  useDeleteTimeLog,
  useActiveTimer,
  useStartTimer,
  usePauseTimer,
  useResumeTimer,
  useStopTimer,
  useDiscardTimer,
  useHeartbeatTimer,
  useMyTimesheets,
  useSubmitTimesheet,
} from "../../auth/server-state/timesheet/timesheet.hook";

const C = {
  brand: "#730042",
  brandLight: "rgba(115,0,66,0.08)",
  brandMid: "rgba(115,0,66,0.18)",
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
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const fmtDuration = (mins) => {
  if (!mins) return "0h 0m";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const fmtSeconds = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const TABS = [
  { id: "timer", label: "Timer", icon: "⏱" },
  { id: "log", label: "Time Log", icon: "📋" },
  { id: "timesheets", label: "Timesheets", icon: "📄" },
];

const STATUS_STYLE = {
  draft: { color: C.textMuted, bg: C.surfaceAlt, label: "Draft" },
  pending_manager: { color: C.amber, bg: C.amberLight, label: "Pending Manager" },
  pending_reporting_manager: { color: C.amber, bg: C.amberLight, label: "Pending Review" },
  pending_admin: { color: C.blue, bg: C.blueLight, label: "Pending Admin" },
  pending_superadmin: { color: C.blue, bg: C.blueLight, label: "Pending SA" },
  approved: { color: C.green, bg: C.greenLight, label: "Approved" },
  rejected: { color: C.red, bg: C.redLight, label: "Rejected" },
};

function Badge({ status }) {
  const s = STATUS_STYLE[status] || { color: C.textMuted, bg: C.surfaceAlt, label: status };
  return (
    <span
      style={{ color: s.color, background: s.bg, borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", padding: "2px 10px", textTransform: "uppercase" }}
    >
      {s.label}
    </span>
  );
}

function Chip({ color = C.brand, children }) {
  return (
    <span style={{ color, background: color + "14", borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "2px 9px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {children}
    </span>
  );
}

function Modal({ open, onClose, title, width = 480, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,41,0.5)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
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

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <Field label={label}>
      <input
        {...props}
        style={{ background: C.surfaceAlt, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none", width: "100%", boxSizing: "border-box" }}
        onFocus={(e) => { e.target.style.borderColor = C.brand; }}
        onBlur={(e) => { e.target.style.borderColor = C.border; }}
      />
    </Field>
  );
}

function Select({ label, children, ...props }) {
  return (
    <Field label={label}>
      <select
        {...props}
        style={{ background: C.surfaceAlt, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none", width: "100%", appearance: "none", boxSizing: "border-box" }}
      >
        {children}
      </select>
    </Field>
  );
}

function Btn({ children, variant = "primary", onClick, disabled, type = "button", style: extraStyle = {} }) {
  const variants = {
    primary: { background: C.brand, color: "#fff", border: "none" },
    ghost: { background: C.surfaceAlt, color: C.textMid, border: `1px solid ${C.border}` },
    danger: { background: C.redLight, color: C.red, border: `1px solid ${C.red}30` },
    success: { background: C.greenLight, color: C.green, border: `1px solid ${C.green}30` },
    amber: { background: C.amberLight, color: C.amber, border: `1px solid ${C.amber}30` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...variants[variant], borderRadius: 10, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap", transition: "opacity 0.15s", ...extraStyle }}
    >
      {children}
    </button>
  );
}

function TimerWidget({ jobs }) {
  const { data: timerData, refetch: refetchTimer } = useActiveTimer({ refetchInterval: 10000 });
  const timer = timerData?.timer;

  const startTimer = useStartTimer();
  const pauseTimer = usePauseTimer();
  const resumeTimer = useResumeTimer();
  const stopTimer = useStopTimer();
  const discardTimer = useDiscardTimer();
  const heartbeat = useHeartbeatTimer();

  const [elapsed, setElapsed] = useState(0);
  const [startModal, setStartModal] = useState(false);
  const [startForm, setStartForm] = useState({ job: "", note: "" });
  const [stopNote, setStopNote] = useState("");
  const [stopModal, setStopModal] = useState(false);

  useEffect(() => {
    if (!timer || timer.status !== "running") {
      setElapsed(timer?.accumulated_seconds || 0);
      return;
    }
    const tick = () => {
      const base = timer.accumulated_seconds || 0;
      const since = Math.floor((Date.now() - new Date(timer.last_heartbeat_at)) / 1000);
      setElapsed(base + Math.max(0, since));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (!timer || timer.status !== "running") return;
    const id = setInterval(() => heartbeat.mutate(), 60000);
    return () => clearInterval(id);
  }, [timer]);

  const handleStart = () => {
    if (!startForm.job) return;
    startTimer.mutate({ job: startForm.job, note: startForm.note }, {
      onSuccess: () => { setStartModal(false); setStartForm({ job: "", note: "" }); refetchTimer(); },
    });
  };

  const handleStop = () => {
    stopTimer.mutate({ note: stopNote }, {
      onSuccess: () => { setStopModal(false); setStopNote(""); refetchTimer(); },
    });
  };

  const displaySecs = timer?.status === "running" ? elapsed : (timer?.accumulated_seconds || 0);
  const isRunning = timer?.status === "running";
  const isPaused = timer?.status === "paused";

  return (
    <>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 0, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ background: isRunning ? C.brand : C.surfaceAlt, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          {isRunning && (
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", animation: "pulse 1.5s infinite" }} />
          )}
          <span style={{ color: isRunning ? "#fff" : C.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {isRunning ? "Timer Running" : isPaused ? "Timer Paused" : "No Active Timer"}
          </span>
          {timer?.job?.title && (
            <span style={{ marginLeft: "auto", color: isRunning ? "rgba(255,255,255,0.75)" : C.textMuted, fontSize: 12 }}>
              {timer.job.title}
            </span>
          )}
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div style={{ fontFamily: "monospace", fontSize: 52, fontWeight: 900, color: isRunning ? C.brand : isPaused ? C.amber : C.textMuted, letterSpacing: "0.05em", lineHeight: 1, marginBottom: 24 }}>
            {fmtSeconds(displaySecs)}
          </div>

          {!timer ? (
            <div>
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Select a job and start tracking time.</p>
              <Btn onClick={() => setStartModal(true)}>▶ Start Timer</Btn>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isRunning && (
                <Btn variant="amber" onClick={() => pauseTimer.mutate({}, { onSuccess: refetchTimer })}>⏸ Pause</Btn>
              )}
              {isPaused && (
                <Btn onClick={() => resumeTimer.mutate({}, { onSuccess: refetchTimer })}>▶ Resume</Btn>
              )}
              <Btn variant="success" onClick={() => setStopModal(true)}>■ Stop & Log</Btn>
              <Btn variant="danger" onClick={() => discardTimer.mutate({}, { onSuccess: refetchTimer })}>✕ Discard</Btn>
            </div>
          )}
        </div>
      </div>

      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Timer">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select label="Job" value={startForm.job} onChange={(e) => setStartForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select a job assigned to you…</option>
            {(jobs || []).filter(j => !["completed", "cancelled"].includes(j.status)).map((j) => (
              <option key={j._id} value={j._id}>{j.title}</option>
            ))}
          </Select>
          <Input label="Note (optional)" placeholder="What are you working on?" value={startForm.note} onChange={(e) => setStartForm((p) => ({ ...p, note: e.target.value }))} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setStartModal(false)}>Cancel</Btn>
            <Btn onClick={handleStart} disabled={!startForm.job || startTimer.isPending}>{startTimer.isPending ? "Starting…" : "▶ Start"}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={stopModal} onClose={() => setStopModal(false)} title="Stop & Log Time">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>Elapsed</span>
            <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 20, color: C.brand }}>{fmtSeconds(displaySecs)}</span>
          </div>
          <Input label="Add a note (optional)" placeholder="Brief description of work done…" value={stopNote} onChange={(e) => setStopNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setStopModal(false)}>Cancel</Btn>
            <Btn variant="success" onClick={handleStop} disabled={stopTimer.isPending}>{stopTimer.isPending ? "Logging…" : "■ Log Time"}</Btn>
          </div>
        </div>
      </Modal>

      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>
    </>
  );
}

function WeekNav({ weekStart, onPrev, onNext }) {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.surfaceAlt, borderRadius: 10, padding: "6px 10px" }}>
      <button onClick={onPrev} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 16, padding: "2px 6px" }}>‹</button>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid, whiteSpace: "nowrap" }}>
        {start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </span>
      <button onClick={onNext} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMid, fontSize: 16, padding: "2px 6px" }}>›</button>
    </div>
  );
}

export default function EmployeeTimesheet() {
  const [tab, setTab] = useState("timer");
  const [weekStart, setWeekStart] = useState(getMonday());
  const [logModal, setLogModal] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, log: null });
  const [logForm, setLogForm] = useState({ job: "", log_date: new Date().toISOString().slice(0, 10), duration_minutes: "", note: "" });
  const [editForm, setEditForm] = useState({ duration_minutes: "", note: "", reason: "" });

  const { data: jobsData } = useMyAssignedJobs({ status: "in_progress" });
  const jobs = jobsData?.jobs || [];

  const { data: weekData, refetch: refetchWeek } = useMyWeekLog(weekStart);
  const weekDays = weekData?.days || {};

  const { data: tsData, refetch: refetchTS } = useMyTimesheets();
  const timesheets = tsData?.timesheets || [];

  const logTime = useLogTime();
  const updateLog = useUpdateTimeLog();
  const deleteLog = useDeleteTimeLog();
  const submitTS = useSubmitTimesheet();

  const totalWeekMins = Object.values(weekDays).reduce((s, d) => s + (d.totalMinutes || 0), 0);
  const daysWithLogs = Object.values(weekDays).filter((d) => d.totalMinutes > 0).length;

  const shiftWeek = useCallback((dir) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }, [weekStart]);

  const handleLogTime = () => {
    logTime.mutate({ ...logForm, duration_minutes: Number(logForm.duration_minutes) }, {
      onSuccess: () => { setLogModal(false); setLogForm({ job: "", log_date: new Date().toISOString().slice(0, 10), duration_minutes: "", note: "" }); refetchWeek(); },
    });
  };

  const handleUpdate = () => {
    updateLog.mutate({ id: editModal.log._id, data: { duration_minutes: Number(editForm.duration_minutes), note: editForm.note, reason: editForm.reason } }, {
      onSuccess: () => { setEditModal({ open: false, log: null }); refetchWeek(); },
    });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this time entry?")) return;
    deleteLog.mutate(id, { onSuccess: refetchWeek });
  };

  const handleSubmitWeek = () => {
    submitTS.mutate({ week_start: weekStart }, {
      onSuccess: () => { refetchTS(); refetchWeek(); },
    });
  };

  const allAssignedJobs = useMyAssignedJobs().data?.jobs || [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top Navbar */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, background: C.brand, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 14 }}>⏱</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Timesheet</span>
            <span style={{ color: C.border, margin: "0 4px" }}>·</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>My Workspace</span>
          </div>
          <nav style={{ display: "flex", gap: 2 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: tab === t.id ? C.brandLight : "none",
                  color: tab === t.id ? C.brand : C.textMid,
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: tab === t.id ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>
        {/* Timer Tab */}
        {tab === "timer" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            <div>
              <TimerWidget jobs={allAssignedJobs} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Quick stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "This Week", value: fmtDuration(totalWeekMins), color: C.brand },
                  { label: "Days Logged", value: `${daysWithLogs} / 5`, color: C.green },
                ].map((s) => (
                  <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {/* My jobs */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>My Active Jobs</span>
                  <Chip color={C.brand}>{allAssignedJobs.filter(j => j.status === "in_progress").length}</Chip>
                </div>
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {allAssignedJobs.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: C.textMuted, fontSize: 13 }}>No jobs assigned to you yet</div>
                  ) : (
                    allAssignedJobs.slice(0, 8).map((j) => {
                      const progPct = j.estimated_hours ? Math.min(100, Math.round((j.logged_hours_cache / j.estimated_hours) * 100)) : 0;
                      const pColor = progPct >= 90 ? C.red : progPct >= 70 ? C.amber : C.green;
                      return (
                        <div key={j._id} style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</div>
                            {j.estimated_hours > 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 4, background: C.surfaceAlt, borderRadius: 4 }}>
                                  <div style={{ width: `${progPct}%`, height: "100%", background: pColor, borderRadius: 4 }} />
                                </div>
                                <span style={{ fontSize: 10, color: C.textMuted, whiteSpace: "nowrap" }}>{j.logged_hours_cache}h / {j.estimated_hours}h</span>
                              </div>
                            )}
                          </div>
                          <Chip color={j.status === "in_progress" ? C.green : C.textMuted}>{j.status.replace(/_/g, " ")}</Chip>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time Log Tab */}
        {tab === "log" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Weekly Time Log</h1>
                <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>Log and manage your time entries</p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <WeekNav weekStart={weekStart} onPrev={() => shiftWeek(-1)} onNext={() => shiftWeek(1)} />
                <Btn onClick={() => setLogModal(true)}>+ Log Time</Btn>
              </div>
            </div>

            {/* Week summary bar */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
              {[
                { label: "Total Hours", value: fmtDuration(totalWeekMins) },
                { label: "Days Logged", value: `${daysWithLogs} / 7` },
                { label: "Capacity", value: `${Math.round((totalWeekMins / 2400) * 100)}%` },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: C.brand, marginTop: 2 }}>{s.value}</div>
                </div>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                <Btn onClick={handleSubmitWeek} disabled={submitTS.isPending}>
                  {submitTS.isPending ? "Submitting…" : "Submit for Approval"}
                </Btn>
              </div>
            </div>

            {/* Day-by-day logs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(weekDays).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => {
                const dayName = new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
                const pct = Math.min(100, Math.round(((data.totalMinutes || 0) / 480) * 100));
                return (
                  <div key={date} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ padding: "12px 20px", borderBottom: data.logs?.length ? `1px solid ${C.border}` : "none", display: "flex", alignItems: "center", gap: 12, background: data.totalMinutes > 0 ? C.brandLight : "transparent" }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{dayName}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 80, height: 5, background: C.surfaceAlt, borderRadius: 4 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? C.green : pct >= 60 ? C.brand : C.textMuted, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: data.totalMinutes > 0 ? C.brand : C.textMuted, minWidth: 42, textAlign: "right" }}>
                          {data.totalMinutes > 0 ? fmtDuration(data.totalMinutes) : "—"}
                        </span>
                      </div>
                    </div>
                    {(data.logs || []).map((log) => (
                      <div key={log._id} style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, transition: "background 0.1s" }}>
                        <div style={{ width: 4, height: 36, background: log.billable ? C.green : C.brand, borderRadius: 4, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.job?.title || "—"}</div>
                          {log.note && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.note}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                          {log.billable && <Chip color={C.green}>Billable</Chip>}
                          <span style={{ fontSize: 13, fontWeight: 800, color: C.brand }}>{fmtDuration(log.duration_minutes)}</span>
                          <Badge status={log.status} />
                          {log.status === "draft" && (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                onClick={() => { setEditModal({ open: true, log }); setEditForm({ duration_minutes: log.duration_minutes, note: log.note, reason: "" }); }}
                                style={{ background: C.blueLight, color: C.blue, border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                              >Edit</button>
                              <button
                                onClick={() => handleDelete(log._id)}
                                style={{ background: C.redLight, color: C.red, border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                              >Del</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timesheets Tab */}
        {tab === "timesheets" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>My Timesheets</h1>
                <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0" }}>Track submission and approval status</p>
              </div>
              <Btn onClick={() => submitTS.mutate({ week_start: weekStart }, { onSuccess: refetchTS })}>
                Submit Current Week
              </Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {timesheets.length === 0 ? (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "60px 32px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 6 }}>No timesheets yet</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Log time this week, then submit for approval.</div>
                  <Btn onClick={() => setTab("log")}>Go to Time Log</Btn>
                </div>
              ) : (
                timesheets.map((ts) => (
                  <div key={ts._id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                        Week of {fmtDate(ts.week_start)}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Badge status={ts.status} />
                        <Chip color={C.brand}>{fmtDuration(ts.total_minutes)}</Chip>
                        {ts.billable_minutes > 0 && <Chip color={C.green}>{fmtDuration(ts.billable_minutes)} billable</Chip>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {ts.submitted_at && (
                        <div style={{ fontSize: 11, color: C.textMuted }}>Submitted {fmtDate(ts.submitted_at)}</div>
                      )}
                      {ts.remarks && (
                        <div style={{ fontSize: 11, color: C.textMid, marginTop: 4, fontStyle: "italic" }}>"{ts.remarks}"</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Log Time Modal */}
      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Time Manually">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select label="Job" value={logForm.job} onChange={(e) => setLogForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select a job…</option>
            {allAssignedJobs.map((j) => (
              <option key={j._id} value={j._id}>{j.title}</option>
            ))}
          </Select>
          <Input label="Date" type="date" value={logForm.log_date} onChange={(e) => setLogForm((p) => ({ ...p, log_date: e.target.value }))} />
          <Input label="Duration (minutes)" type="number" placeholder="e.g. 90" value={logForm.duration_minutes} onChange={(e) => setLogForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
          <Input label="Note" placeholder="What did you work on?" value={logForm.note} onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setLogModal(false)}>Cancel</Btn>
            <Btn onClick={handleLogTime} disabled={!logForm.job || !logForm.duration_minutes || logTime.isPending}>
              {logTime.isPending ? "Logging…" : "Save Entry"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Edit Log Modal */}
      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, log: null })} title="Edit Time Entry">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Duration (minutes)" type="number" value={editForm.duration_minutes} onChange={(e) => setEditForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
          <Input label="Note" value={editForm.note} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} />
          <Input label="Reason for edit" placeholder="Required if duration changed…" value={editForm.reason} onChange={(e) => setEditForm((p) => ({ ...p, reason: e.target.value }))} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setEditModal({ open: false, log: null })}>Cancel</Btn>
            <Btn onClick={handleUpdate} disabled={updateLog.isPending}>{updateLog.isPending ? "Saving…" : "Save Changes"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}