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
  brandHover: "#8B0050",
  brandLight: "rgba(115,0,66,0.07)",
  brandMid: "rgba(115,0,66,0.15)",
  accent: "#CD166E",
  bg: "#F4F5F9",
  surface: "#FFFFFF",
  surfaceAlt: "#F8F9FC",
  surfaceHover: "#F0F1F6",
  border: "#E4E6EF",
  borderFocus: "#730042",
  text: "#111827",
  textMid: "#374151",
  textMuted: "#9CA3AF",
  green: "#059669",
  greenLight: "rgba(5,150,105,0.08)",
  amber: "#D97706",
  amberLight: "rgba(217,119,6,0.08)",
  red: "#DC2626",
  redLight: "rgba(220,38,38,0.08)",
  blue: "#2563EB",
  blueLight: "rgba(37,99,235,0.08)",
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
  if (!mins && mins !== 0) return "—";
  if (mins === 0) return "0h 0m";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const fmtSeconds = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const TABS = [
  { id: "timer", label: "Timer" },
  { id: "log", label: "Time Log" },
  { id: "timesheets", label: "Timesheets" },
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

const JOB_STATUS_COLOR = {
  not_started: C.textMuted,
  in_progress: C.blue,
  on_hold: C.amber,
  completed: C.green,
  cancelled: C.red,
};

const PRIORITY_COLOR = { low: C.textMuted, medium: C.amber, high: C.red, urgent: C.brand };

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function TorchXLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <div style={{
        width: 34, height: 34, background: `linear-gradient(135deg, ${C.brand} 0%, ${C.accent} 100%)`,
        borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 2px 8px ${C.brandMid}`,
      }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z" fill="white" fillOpacity="0.9" />
          <circle cx="10" cy="8" r="2" fill="white" />
        </svg>
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, letterSpacing: "-0.02em", lineHeight: 1 }}>TorchX</div>
        <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 500, letterSpacing: "0.04em" }}>TIMESHEET</div>
      </div>
    </div>
  );
}

function Badge({ status }) {
  const s = STATUS_STYLE[status] || { color: C.textMuted, bg: C.surfaceAlt, label: status };
  return (
    <span style={{
      color: s.color, background: s.bg, borderRadius: 6, fontSize: 10,
      fontWeight: 700, letterSpacing: "0.04em", padding: "3px 8px", textTransform: "uppercase",
    }}>
      {s.label}
    </span>
  );
}

function Chip({ color = C.brand, bg, children }) {
  return (
    <span style={{
      color, background: bg || color + "14", borderRadius: 6, fontSize: 10,
      fontWeight: 700, padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.04em",
    }}>
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
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(17,24,39,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
        width: "100%", maxWidth: width, boxShadow: "0 24px 64px rgba(0,0,0,0.16)",
        maxHeight: "90vh", display: "flex", flexDirection: "column",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{
            width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.textMuted, fontSize: 18, background: C.surfaceAlt, border: "none",
            borderRadius: 8, cursor: "pointer",
          }}>×</button>
        </div>
        <div style={{ padding: 24, overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.textMid, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: C.surfaceAlt, border: `1.5px solid ${C.border}`, borderRadius: 10,
  padding: "10px 14px", fontSize: 13, color: C.text, outline: "none",
  width: "100%", boxSizing: "border-box", fontFamily: "inherit",
};

function Input({ label, ...props }) {
  return (
    <Field label={label}>
      <input
        {...props}
        style={inputStyle}
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
        style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
      >
        {children}
      </select>
    </Field>
  );
}

function Btn({ children, variant = "primary", onClick, disabled, style: ex = {} }) {
  const variants = {
    primary: { background: C.brand, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: C.textMid, border: `1.5px solid ${C.border}` },
    danger: { background: C.redLight, color: C.red, border: `1.5px solid ${C.red}30` },
    success: { background: C.greenLight, color: C.green, border: `1.5px solid ${C.green}30` },
    amber: { background: C.amberLight, color: C.amber, border: `1.5px solid ${C.amber}30` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant], borderRadius: 10, padding: "9px 18px",
        fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap", transition: "all 0.15s",
        display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit", ...ex,
      }}
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

  const isRunning = timer?.status === "running";
  const isPaused = timer?.status === "paused";
  const displaySecs = isRunning ? elapsed : (timer?.accumulated_seconds || 0);

  return (
    <>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      }}>
        <div style={{
          background: isRunning
            ? `linear-gradient(135deg, ${C.brand} 0%, ${C.accent} 100%)`
            : C.surfaceAlt,
          padding: "16px 24px", display: "flex", alignItems: "center", gap: 10,
        }}>
          {isRunning && (
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.9)",
              animation: "timerPulse 1.4s ease-in-out infinite",
            }} />
          )}
          <span style={{
            color: isRunning ? "rgba(255,255,255,0.9)" : C.textMuted,
            fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            {isRunning ? "Timer Running" : isPaused ? "Timer Paused" : "No Active Timer"}
          </span>
          {timer?.job?.title && (
            <span style={{
              marginLeft: "auto",
              color: isRunning ? "rgba(255,255,255,0.75)" : C.textMuted,
              fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160,
            }}>
              {timer.job.title}
            </span>
          )}
        </div>

        <div style={{ padding: "28px 28px 24px" }}>
          <div style={{
            fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 56,
            fontWeight: 800, letterSpacing: "0.04em", lineHeight: 1,
            color: isRunning ? C.brand : isPaused ? C.amber : C.border,
            marginBottom: 24, userSelect: "none",
          }}>
            {fmtSeconds(displaySecs)}
          </div>

          {!timer ? (
            <div>
              <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, marginTop: 0 }}>
                Select a job and start tracking time.
              </p>
              <Btn onClick={() => setStartModal(true)}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><polygon points="3,1 11,6 3,11" /></svg>
                Start Timer
              </Btn>
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
              <Btn variant="danger" onClick={() => discardTimer.mutate({}, { onSuccess: refetchTimer })}>Discard</Btn>
            </div>
          )}
        </div>
      </div>

      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Timer">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select
            label="Job"
            value={startForm.job}
            onChange={(e) => setStartForm((p) => ({ ...p, job: e.target.value }))}
          >
            <option value="">Select a job assigned to you…</option>
            {(jobs || [])
              .filter((j) => !["completed", "cancelled"].includes(j.status))
              .map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Select>
          <Input
            label="Note (optional)"
            placeholder="What are you working on?"
            value={startForm.note}
            onChange={(e) => setStartForm((p) => ({ ...p, note: e.target.value }))}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setStartModal(false)}>Cancel</Btn>
            <Btn
              onClick={() =>
                startTimer.mutate({ job: startForm.job, note: startForm.note }, {
                  onSuccess: () => { setStartModal(false); setStartForm({ job: "", note: "" }); refetchTimer(); },
                })
              }
              disabled={!startForm.job || startTimer.isPending}
            >
              {startTimer.isPending ? "Starting…" : "▶ Start"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={stopModal} onClose={() => setStopModal(false)} title="Stop & Log Time">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: C.brandLight, border: `1.5px solid ${C.brandMid}`, borderRadius: 12,
            padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: C.brand, fontWeight: 600 }}>Elapsed Time</span>
            <span style={{
              fontFamily: "'SF Mono', monospace", fontWeight: 800, fontSize: 22, color: C.brand,
            }}>{fmtSeconds(displaySecs)}</span>
          </div>
          <Input
            label="Note (optional)"
            placeholder="Brief description of work done…"
            value={stopNote}
            onChange={(e) => setStopNote(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setStopModal(false)}>Cancel</Btn>
            <Btn
              variant="success"
              onClick={() =>
                stopTimer.mutate({ note: stopNote }, {
                  onSuccess: () => { setStopModal(false); setStopNote(""); refetchTimer(); },
                })
              }
              disabled={stopTimer.isPending}
            >
              {stopTimer.isPending ? "Logging…" : "■ Log Time"}
            </Btn>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes timerPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }
      `}</style>
    </>
  );
}

function CalendarWeekGrid({ weekStart, weekDays, jobs, onAddLog }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
      overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === today;
          const dayData = weekDays[iso];
          const mins = dayData?.totalMinutes || 0;
          return (
            <div
              key={iso}
              style={{
                padding: "12px 8px 10px",
                borderRight: i < 6 ? `1px solid ${C.border}` : "none",
                background: isToday ? C.brandLight : "transparent",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {DAY_NAMES[i]}
              </div>
              <div style={{
                fontSize: 20, fontWeight: 800, marginTop: 4,
                color: isToday ? C.brand : C.text,
              }}>
                {d.getDate()}
              </div>
              {mins > 0 && (
                <div style={{
                  marginTop: 6, fontSize: 10, fontWeight: 700,
                  color: C.brand, background: C.brandLight, borderRadius: 4, padding: "2px 6px",
                }}>
                  {fmtDuration(mins)}
                </div>
              )}
              {mins === 0 && (
                <div style={{ marginTop: 6, height: 18 }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", minHeight: 180 }}>
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const dayData = weekDays[iso];
          const logs = dayData?.logs || [];
          const isToday = iso === today;

          return (
            <div
              key={iso}
              style={{
                borderRight: i < 6 ? `1px solid ${C.border}` : "none",
                background: isToday ? "rgba(115,0,66,0.025)" : "transparent",
                padding: "10px 8px",
                display: "flex", flexDirection: "column", gap: 4, minHeight: 160,
              }}
            >
              {logs.map((log) => (
                <div
                  key={log._id}
                  title={`${log.job?.title || "—"}\n${fmtDuration(log.duration_minutes)}\n${log.note || ""}`}
                  style={{
                    background: log.billable ? C.greenLight : C.brandLight,
                    border: `1px solid ${log.billable ? C.green + "30" : C.brand + "25"}`,
                    borderLeft: `3px solid ${log.billable ? C.green : C.brand}`,
                    borderRadius: 6, padding: "5px 8px", cursor: "default",
                  }}
                >
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {log.job?.title || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: log.billable ? C.green : C.brand, fontWeight: 600, marginTop: 2 }}>
                    {fmtDuration(log.duration_minutes)}
                  </div>
                </div>
              ))}
              <button
                onClick={() => onAddLog(iso)}
                style={{
                  marginTop: "auto", background: "none", border: `1.5px dashed ${C.border}`,
                  borderRadius: 6, padding: "5px 4px", cursor: "pointer", color: C.textMuted,
                  fontSize: 11, fontWeight: 600, width: "100%",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.brand; e.currentTarget.style.color = C.brand; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
              >
                + Add
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekSummaryBar({ weekStart, onPrev, onNext, totalWeekMins, daysWithLogs, onSubmit, isSubmitting }) {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const capacityPct = Math.round((totalWeekMins / 2400) * 100);

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
      padding: "16px 24px", display: "flex", alignItems: "center", gap: 20,
      flexWrap: "wrap", boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={onPrev}
          style={{
            width: 32, height: 32, background: C.surfaceAlt, border: `1px solid ${C.border}`,
            borderRadius: 8, cursor: "pointer", color: C.textMid, fontSize: 16, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >‹</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textMid, whiteSpace: "nowrap" }}>
          {start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — {end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <button
          onClick={onNext}
          style={{
            width: 32, height: 32, background: C.surfaceAlt, border: `1px solid ${C.border}`,
            borderRadius: 8, cursor: "pointer", color: C.textMid, fontSize: 16, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}
        >›</button>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {[
          { label: "Total Hours", value: fmtDuration(totalWeekMins), color: C.brand },
          { label: "Days Logged", value: `${daysWithLogs} / 7`, color: C.textMid },
          { label: "Capacity", value: `${capacityPct}%`, color: capacityPct >= 80 ? C.green : capacityPct >= 50 ? C.amber : C.textMuted },
        ].map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginLeft: "auto" }}>
        <Btn onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit for Approval"}
        </Btn>
      </div>
    </div>
  );
}

export default function EmployeeTimesheet() {
  const [tab, setTab] = useState("timer");
  const [weekStart, setWeekStart] = useState(getMonday());
  const [logModal, setLogModal] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [editModal, setEditModal] = useState({ open: false, log: null });
  const [logForm, setLogForm] = useState({ job: "", log_date: new Date().toISOString().slice(0, 10), duration_minutes: "", note: "" });
  const [editForm, setEditForm] = useState({ duration_minutes: "", note: "", reason: "" });

  const { data: jobsData } = useMyAssignedJobs();
  const jobs = jobsData?.jobs || [];
  const activeJobs = jobs.filter((j) => !["completed", "cancelled"].includes(j.status));

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

  const openLogForDate = (date) => {
    setLogForm((p) => ({ ...p, log_date: date, job: "", duration_minutes: "", note: "" }));
    setLogDate(date);
    setLogModal(true);
  };

  const handleLogTime = () => {
    logTime.mutate({ ...logForm, duration_minutes: Number(logForm.duration_minutes) }, {
      onSuccess: () => {
        setLogModal(false);
        setLogForm({ job: "", log_date: new Date().toISOString().slice(0, 10), duration_minutes: "", note: "" });
        refetchWeek();
      },
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

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 50,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "0 24px",
          display: "flex", alignItems: "center", gap: 32, height: 60,
        }}>
          <TorchXLogo />

          <div style={{ width: 1, height: 28, background: C.border }} />

          <nav style={{ display: "flex", gap: 2, flex: 1 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: tab === t.id ? C.brandLight : "transparent",
                  color: tab === t.id ? C.brand : C.textMid,
                  border: "none", borderRadius: 8, padding: "7px 16px",
                  fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                  cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                  borderBottom: tab === t.id ? `2px solid ${C.brand}` : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div style={{
            fontSize: 12, color: C.textMuted, background: C.surfaceAlt,
            border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 12px", fontWeight: 500,
          }}>
            My Workspace
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>

        {tab === "timer" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 20, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <TimerWidget jobs={activeJobs} />

              <div style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
                overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
              }}>
                <div style={{
                  padding: "14px 20px", borderBottom: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>My Active Jobs</span>
                  <Chip color={C.brand}>{activeJobs.length}</Chip>
                </div>
                <div style={{ maxHeight: 280, overflowY: "auto" }}>
                  {jobs.length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                      No jobs assigned to you yet
                    </div>
                  ) : (
                    jobs.slice(0, 10).map((j) => {
                      const progPct = j.estimated_hours
                        ? Math.min(100, Math.round((j.logged_hours_cache / j.estimated_hours) * 100))
                        : 0;
                      const pColor = progPct >= 90 ? C.red : progPct >= 70 ? C.amber : C.green;
                      return (
                        <div key={j._id} style={{
                          padding: "10px 20px", borderBottom: `1px solid ${C.border}`,
                          display: "flex", alignItems: "center", gap: 12,
                        }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: JOB_STATUS_COLOR[j.status] || C.textMuted, flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{j.title}</div>
                            {j.estimated_hours > 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 4 }}>
                                  <div style={{ width: `${progPct}%`, height: "100%", background: pColor, borderRadius: 4 }} />
                                </div>
                                <span style={{ fontSize: 10, color: C.textMuted, whiteSpace: "nowrap" }}>
                                  {j.logged_hours_cache}h / {j.estimated_hours}h
                                </span>
                              </div>
                            )}
                          </div>
                          <Chip color={JOB_STATUS_COLOR[j.status] || C.textMuted}>
                            {j.status.replace(/_/g, " ")}
                          </Chip>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {[
                  { label: "This Week", value: fmtDuration(totalWeekMins), color: C.brand },
                  { label: "Days Logged", value: `${daysWithLogs} / 5`, color: C.green },
                ].map((s) => (
                  <div key={s.label} style={{
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
                    padding: "20px 22px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>{s.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
                  This Week at a Glance
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(weekStart);
                    d.setDate(d.getDate() + i);
                    const iso = d.toISOString().slice(0, 10);
                    const dayData = weekDays[iso];
                    const mins = dayData?.totalMinutes || 0;
                    const pct = Math.min(100, Math.round((mins / 480) * 100));
                    const today = new Date().toISOString().slice(0, 10) === iso;
                    return (
                      <div key={iso} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: today ? C.brand : C.textMuted, textTransform: "uppercase" }}>
                          {DAY_NAMES[i]}
                        </div>
                        <div style={{
                          width: "100%", height: 60, background: C.surfaceAlt, borderRadius: 6,
                          position: "relative", overflow: "hidden",
                        }}>
                          <div style={{
                            position: "absolute", bottom: 0, width: "100%",
                            height: `${pct}%`,
                            background: today
                              ? `linear-gradient(180deg, ${C.accent} 0%, ${C.brand} 100%)`
                              : pct >= 80 ? C.green + "cc" : C.brand + "66",
                            borderRadius: "4px 4px 0 0",
                            transition: "height 0.3s ease",
                          }} />
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: mins > 0 ? C.brand : C.textMuted }}>
                          {mins > 0 ? `${Math.floor(mins / 60)}h` : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "log" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>Weekly Time Log</h1>
                <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>
                  Click any day to add a time entry
                </p>
              </div>
              <Btn onClick={() => openLogForDate(new Date().toISOString().slice(0, 10))}>
                + Log Time
              </Btn>
            </div>

            <WeekSummaryBar
              weekStart={weekStart}
              onPrev={() => shiftWeek(-1)}
              onNext={() => shiftWeek(1)}
              totalWeekMins={totalWeekMins}
              daysWithLogs={daysWithLogs}
              onSubmit={() => submitTS.mutate({ week_start: weekStart }, { onSuccess: () => { refetchTS(); refetchWeek(); } })}
              isSubmitting={submitTS.isPending}
            />

            <CalendarWeekGrid
              weekStart={weekStart}
              weekDays={weekDays}
              jobs={jobs}
              onAddLog={openLogForDate}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textMid, marginTop: 4 }}>All Entries This Week</div>
              {Object.entries(weekDays)
                .sort(([a], [b]) => a.localeCompare(b))
                .flatMap(([date, data]) =>
                  (data.logs || []).map((log) => ({ ...log, _date: date }))
                )
                .map((log) => (
                  <div key={log._id} style={{
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: "12px 18px", display: "flex", alignItems: "center", gap: 12,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{
                      width: 4, height: 40, borderRadius: 4,
                      background: log.billable ? C.green : C.brand, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{log.job?.title || "—"}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: C.textMuted }}>
                          {new Date(log._date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        {log.note && (
                          <span style={{ fontSize: 11, color: C.textMuted }}>· {log.note}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {log.billable && <Chip color={C.green}>Billable</Chip>}
                      <span style={{ fontSize: 14, fontWeight: 800, color: C.brand }}>{fmtDuration(log.duration_minutes)}</span>
                      <Badge status={log.status} />
                      {log.status === "draft" && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => { setEditModal({ open: true, log }); setEditForm({ duration_minutes: log.duration_minutes, note: log.note, reason: "" }); }}
                            style={{
                              background: C.blueLight, color: C.blue, border: "none",
                              borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}
                          >Edit</button>
                          <button
                            onClick={() => handleDelete(log._id)}
                            style={{
                              background: C.redLight, color: C.red, border: "none",
                              borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                            }}
                          >Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {Object.values(weekDays).every((d) => !d.logs?.length) && (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: "40px 24px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 6 }}>No entries this week</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>Click any day cell or use the button above to log time.</div>
                  <Btn onClick={() => openLogForDate(new Date().toISOString().slice(0, 10))}>+ Log Time</Btn>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "timesheets" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>My Timesheets</h1>
                <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>Track submission and approval status</p>
              </div>
              <Btn onClick={() => submitTS.mutate({ week_start: weekStart }, { onSuccess: refetchTS })}>
                Submit Current Week
              </Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {timesheets.length === 0 ? (
                <div style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
                  padding: "60px 32px", textAlign: "center", boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
                }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 6 }}>No timesheets yet</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>Log time this week, then submit for approval.</div>
                  <Btn onClick={() => setTab("log")}>Go to Time Log</Btn>
                </div>
              ) : (
                timesheets.map((ts) => (
                  <div key={ts._id} style={{
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
                    padding: "18px 24px", display: "flex", alignItems: "center", gap: 16,
                    flexWrap: "wrap", boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{
                      width: 44, height: 44, background: C.brandLight, borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0,
                    }}>📄</div>
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
                        <div style={{ fontSize: 11, color: C.textMid, marginTop: 4, fontStyle: "italic", maxWidth: 200 }}>"{ts.remarks}"</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Time">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select label="Job" value={logForm.job} onChange={(e) => setLogForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select a job…</option>
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Select>
          <Input label="Date" type="date" value={logForm.log_date} onChange={(e) => setLogForm((p) => ({ ...p, log_date: e.target.value }))} />
          <Input label="Duration (minutes)" type="number" placeholder="e.g. 90 for 1.5 hours" value={logForm.duration_minutes} onChange={(e) => setLogForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
          <Input label="Note" placeholder="What did you work on?" value={logForm.note} onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setLogModal(false)}>Cancel</Btn>
            <Btn onClick={handleLogTime} disabled={!logForm.job || !logForm.duration_minutes || logTime.isPending}>
              {logTime.isPending ? "Saving…" : "Save Entry"}
            </Btn>
          </div>
        </div>
      </Modal>

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

      <style>{`
        @media (max-width: 768px) {
          .ts-timer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}