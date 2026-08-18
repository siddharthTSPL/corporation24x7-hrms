import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  useMyAssignedJobs,
  useJobsCreatedByMe,
  useCreateJob,
  useUpdateJob,
  useAssignableTargets,
  useUpdateJobStatus,
  useArchiveJob,
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
  useRecallTimesheet,
  usePendingApprovals,
  useApproveTimesheet,
  useRejectTimesheet,
  useForwardTimesheet,
  useTeamWorkloadHeatmap,
  useOverrunRiskJobs,
  useIdleJobs,
  useMyProductivitySummary,
  useJobById,
} from "../../auth/server-state/timesheet/timesheet.hook";

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
const fmtShort = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtDuration = (mins) => {
  if (!mins && mins !== 0) return "—";
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};
const fmtSeconds = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const nonNegative = (v) => {
  if (v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n < 0 ? "0" : v;
};

const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CONTAINER = "max-w-[1100px] lg:max-w-[1200px] xl:max-w-[1320px] 2xl:max-w-[1500px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8";

const STATUS_META = {
  draft:                     { label: "Draft",           color: "text-gray-500",   bg: "bg-gray-100",   dot: "bg-gray-400"    },
  pending_manager:           { label: "Pending Manager", color: "text-amber-600",  bg: "bg-amber-50",   dot: "bg-amber-500"   },
  pending_reporting_manager: { label: "Pending Review",  color: "text-amber-600",  bg: "bg-amber-50",   dot: "bg-amber-500"   },
  pending_admin:             { label: "Pending Admin",   color: "text-blue-600",   bg: "bg-blue-50",    dot: "bg-blue-500"    },
  pending_superadmin:        { label: "Pending SA",      color: "text-purple-600", bg: "bg-purple-50",  dot: "bg-purple-500"  },
  approved:                  { label: "Approved",        color: "text-emerald-600",bg: "bg-emerald-50", dot: "bg-emerald-500" },
  rejected:                  { label: "Rejected",        color: "text-red-600",    bg: "bg-red-50",     dot: "bg-red-500"     },
};

const JOB_STATUS_META = {
  not_started: { label: "Not Started", color: "text-gray-500",    bg: "bg-gray-100"   },
  in_progress:  { label: "In Progress", color: "text-blue-600",    bg: "bg-blue-50"    },
  on_hold:      { label: "On Hold",     color: "text-amber-600",   bg: "bg-amber-50"   },
  completed:    { label: "Completed",   color: "text-emerald-600", bg: "bg-emerald-50" },
  cancelled:    { label: "Cancelled",   color: "text-red-600",     bg: "bg-red-50"     },
};

const PRIORITY_META = {
  low:    { label: "Low",    color: "text-gray-500",  bg: "bg-gray-100"      },
  medium: { label: "Medium", color: "text-amber-600", bg: "bg-amber-50"      },
  high:   { label: "High",   color: "text-red-600",   bg: "bg-red-50"        },
  urgent: { label: "Urgent", color: "text-[#730042]", bg: "bg-[#730042]/10"  },
};

const TABS = [
  { id: "work",      label: "My Work",    icon: "◷" },
  { id: "team",      label: "Team Jobs",  icon: "⬡" },
  { id: "approvals", label: "Approvals",  icon: "◈" },
  { id: "insights",  label: "Insights",   icon: "◎" },
  { id: "sheets",    label: "Timesheets", icon: "▦" },
];

function cn(...a) { return a.filter(Boolean).join(" "); }

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€" };
function fmtRate(rate, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency || ""} `;
  return `${symbol}${rate}/hr`;
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold", m.color, m.bg)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", m.dot)} />
      {m.label}
    </span>
  );
}

function Chip({ children, color = "gray", size = "sm" }) {
  const map = {
    gray:  "text-gray-500 bg-gray-100",
    amber: "text-amber-600 bg-amber-50",
    red:   "text-red-600 bg-red-50",
    green: "text-emerald-600 bg-emerald-50",
    blue:  "text-blue-600 bg-blue-50",
    brand: "text-[#730042] bg-[#730042]/10",
    purple:"text-purple-600 bg-purple-50",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-md font-semibold whitespace-nowrap",
      size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5",
      map[color] || map.gray
    )}>{children}</span>
  );
}

function Btn({ children, variant = "primary", onClick, disabled, type = "button", size = "md", className = "" }) {
  const base = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed",
    size === "sm" ? "text-[12px] px-3 py-1.5" : "text-[13px] px-4 py-2"
  );
  const v = {
    primary: "bg-[#730042] text-white hover:bg-[#5a0033]",
    ghost:   "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    danger:  "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    success: "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100",
    amber:   "bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(base, v[variant], className)}>
      {children}
    </button>
  );
}

function Input({ label, error, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>}
      <input {...props} className={cn(
        "bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none w-full",
        "focus:border-[#730042] focus:ring-1 focus:ring-[#730042]/20 transition-all placeholder:text-gray-300",
        error && "border-red-300", className
      )} />
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
}

function Sel({ label, children, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>}
      <select {...props} className={cn(
        "bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none w-full focus:border-[#730042] focus:ring-1 focus:ring-[#730042]/20 transition-all appearance-none cursor-pointer",
        className
      )}>{children}</select>
    </div>
  );
}

function Modal({ open, onClose, title, children, width = "max-w-[500px]" }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn("bg-white rounded-t-2xl sm:rounded-2xl w-full shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]", width)}>
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 shrink-0">
          <span className="font-bold text-[14px] sm:text-[15px] text-gray-900">{title}</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-lg shrink-0">×</button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function JobDetailModal({ jobId, open, onClose }) {
  const { data, isLoading } = useJobById(jobId);
  const job = data?.job;
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Job Details" width="max-w-[560px]">
      {isLoading ? (
        <div className="py-8 text-center text-gray-400 text-[13px]">Loading…</div>
      ) : !job ? (
        <div className="py-8 text-center text-gray-400 text-[13px]">Job not found</div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <div className="font-bold text-[16px] sm:text-[17px] text-gray-900 mb-1 break-words">{job.title}</div>
            {job.description && <div className="text-[13px] text-gray-500 leading-relaxed break-words">{job.description}</div>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Status", node: <Chip color={job.status === "in_progress" ? "blue" : job.status === "completed" ? "green" : job.status === "on_hold" ? "amber" : job.status === "cancelled" ? "red" : "gray"}>{JOB_STATUS_META[job.status]?.label || job.status}</Chip> },
              { label: "Priority", node: <Chip color={job.priority === "urgent" ? "brand" : job.priority === "high" ? "red" : job.priority === "medium" ? "amber" : "gray"}>{PRIORITY_META[job.priority]?.label || job.priority}</Chip> },
              { label: "Logged", node: <div className="text-[15px] font-bold text-[#730042]">{job.logged_hours_cache?.toFixed(1) || 0}h</div> },
              { label: "Estimated", node: <div className="text-[15px] font-bold text-gray-900">{job.estimated_hours || 0}h</div> },
            ].map((r, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 min-w-0">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{r.label}</div>
                {r.node}
              </div>
            ))}
          </div>
          {job.estimated_hours > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-gray-400">Progress</span>
                <span className={cn("text-[11px] font-bold", job.overrun_flagged ? "text-red-600" : "text-gray-600")}>
                  {Math.round((job.logged_hours_cache / job.estimated_hours) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", job.overrun_flagged ? "bg-red-500" : "bg-[#730042]")}
                  style={{ width: `${Math.min(100, (job.logged_hours_cache / job.estimated_hours) * 100)}%` }} />
              </div>
            </div>
          )}
          {job.due_date && (
            <div className="text-[12px] text-gray-500">Due: <span className="font-semibold text-gray-700">{fmtDate(job.due_date)}</span></div>
          )}
          {job.work_items?.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Work Items</div>
              <div className="flex flex-col gap-1.5">
                {job.work_items.map((wi, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13px]">
                    <span className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 text-[10px]",
                      wi.is_completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300")}>{wi.is_completed && "✓"}</span>
                    <span className={cn("break-words", wi.is_completed ? "line-through text-gray-400" : "text-gray-700")}>{wi.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {job.billable && (
            <div className="flex items-center gap-2 text-[12px] flex-wrap">
              <Chip color="green">Billable</Chip>
              {job.hourly_rate > 0 && <span className="text-gray-500">{fmtRate(job.hourly_rate, job.currency)}</span>}
            </div>
          )}
          {job.overrun_flagged && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-[12px] text-red-600">
              <span>⚠</span><span className="font-semibold">Exceeded estimated hours</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function TimerBlock({ assignedJobs, onTimerLog }) {
  const { data: timerData, refetch } = useActiveTimer({ refetchInterval: 10000 });
  const timer = timerData?.timer;
  const startTimer = useStartTimer();
  const pauseTimer = usePauseTimer();
  const resumeTimer = useResumeTimer();
  const stopTimer = useStopTimer();
  const discardTimer = useDiscardTimer();
  const heartbeat = useHeartbeatTimer();
  const [elapsed, setElapsed] = useState(0);
  const [startModal, setStartModal] = useState(false);
  const [stopModal, setStopModal] = useState(false);
  const [startForm, setStartForm] = useState({ job: "", note: "" });
  const [stopNote, setStopNote] = useState("");

  useEffect(() => {
    if (!timer || timer.status !== "running") { setElapsed(timer?.accumulated_seconds || 0); return; }
    const tick = () => setElapsed((timer.accumulated_seconds || 0) + Math.max(0, Math.floor((Date.now() - new Date(timer.last_heartbeat_at)) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timer]);

  useEffect(() => {
    if (!timer || timer.status !== "running") return;
    const id = setInterval(() => heartbeat.mutate(), 60000);
    return () => clearInterval(id);
  }, [timer?.status]);

  const isRunning = timer?.status === "running";
  const isPaused = timer?.status === "paused";
  const displaySecs = isRunning ? elapsed : (timer?.accumulated_seconds || 0);
  const activeJobs = (assignedJobs || []).filter((j) => !["completed", "cancelled"].includes(j.status));

  return (
    <>
      <div className={cn("rounded-2xl overflow-hidden border transition-all",
        isRunning ? "border-[#730042]/20 bg-gradient-to-br from-[#730042] to-[#9a0058]"
        : isPaused ? "border-amber-200 bg-amber-50"
        : "border-gray-200 bg-white")}>
        <div className="px-3 sm:px-4 py-3 flex items-center gap-2.5">
          {isRunning && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
          <span className={cn("text-[11px] font-bold uppercase tracking-wide",
            isRunning ? "text-white/80" : isPaused ? "text-amber-600" : "text-gray-400")}>
            {isRunning ? "Timer Running" : isPaused ? "Timer Paused" : "No Active Timer"}
          </span>
          {timer?.job?.title && (
            <span className={cn("ml-auto text-[11px] truncate max-w-[100px] sm:max-w-[160px] lg:max-w-[260px]",
              isRunning ? "text-white/60" : "text-gray-400")}>{timer.job.title}</span>
          )}
        </div>
        <div className="px-3 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className={cn("font-mono text-[28px] xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-widest tabular-nums select-none",
            isRunning ? "text-white" : isPaused ? "text-amber-600" : "text-gray-200")}>
            {fmtSeconds(displaySecs)}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-start sm:justify-end">
            {!timer ? (
              <Btn onClick={() => setStartModal(true)} className="bg-[#730042] text-white hover:bg-[#5a0033]">▶ Start</Btn>
            ) : (
              <>
                {isRunning && (
                  <Btn variant="ghost" onClick={() => pauseTimer.mutate({}, { onSuccess: refetch })}
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30">⏸</Btn>
                )}
                {isPaused && <Btn variant="ghost" onClick={() => resumeTimer.mutate({}, { onSuccess: refetch })}>▶</Btn>}
                <Btn variant="ghost" onClick={() => setStopModal(true)}
                  className={isRunning ? "bg-white/20 text-white border-white/30 hover:bg-white/30" : ""}>■ Log</Btn>
                <Btn variant="ghost" onClick={() => discardTimer.mutate({}, { onSuccess: refetch })}
                  className={isRunning ? "bg-white/10 text-white/70 border-white/20 hover:bg-white/20" : "text-red-500 border-red-200 hover:bg-red-50"}>Discard</Btn>
              </>
            )}
          </div>
        </div>
      </div>
      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Timer">
        <div className="flex flex-col gap-3.5">
          <Sel label="Job" value={startForm.job} onChange={(e) => setStartForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select a job…</option>
            {activeJobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Sel>
          <Input label="Note (optional)" placeholder="What are you working on?" value={startForm.note} onChange={(e) => setStartForm((p) => ({ ...p, note: e.target.value }))} />
          <div className="flex gap-2 justify-end flex-wrap">
            <Btn variant="ghost" onClick={() => setStartModal(false)}>Cancel</Btn>
            <Btn onClick={() => startTimer.mutate({ job: startForm.job, note: startForm.note }, { onSuccess: () => { setStartModal(false); setStartForm({ job: "", note: "" }); refetch(); } })}
              disabled={!startForm.job || startTimer.isPending}>
              {startTimer.isPending ? "Starting…" : "▶ Start"}
            </Btn>
          </div>
        </div>
      </Modal>
      <Modal open={stopModal} onClose={() => setStopModal(false)} title="Log Time">
        <div className="flex flex-col gap-3.5">
          <div className="bg-[#730042]/[0.07] border border-[#730042]/20 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[12px] text-[#730042] font-semibold">Elapsed</span>
            <span className="font-mono font-extrabold text-xl text-[#730042]">{fmtSeconds(displaySecs)}</span>
          </div>
          <Input label="Note (optional)" placeholder="Brief summary…" value={stopNote} onChange={(e) => setStopNote(e.target.value)} />
          <div className="flex gap-2 justify-end flex-wrap">
            <Btn variant="ghost" onClick={() => setStopModal(false)}>Cancel</Btn>
            <Btn variant="success" onClick={() => stopTimer.mutate({ note: stopNote }, { onSuccess: () => { setStopModal(false); setStopNote(""); refetch(); onTimerLog?.(); } })} disabled={stopTimer.isPending}>
              {stopTimer.isPending ? "Logging…" : "■ Log Time"}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}

function WeekGrid({ weekStart, weekDays, onAddLog, onEditLog, onDeleteLog }) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const todayISO = new Date().toISOString().slice(0, 10);
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100 min-w-[560px] md:min-w-0">
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === todayISO;
          const mins = weekDays[iso]?.totalMinutes || 0;
          return (
            <div key={iso} className={cn("px-1.5 sm:px-2 pt-3 pb-2 text-center", i < 6 ? "border-r border-gray-100" : "", isToday ? "bg-[#730042]/[0.05]" : "")}>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{DAY_KEYS[i]}</div>
              <div className={cn("text-base sm:text-lg font-extrabold mt-0.5", isToday ? "text-[#730042]" : "text-gray-800")}>{d.getDate()}</div>
              {mins > 0
                ? <div className="mt-1 text-[10px] font-bold text-[#730042] bg-[#730042]/[0.08] rounded px-1 py-0.5 truncate">{fmtDuration(mins)}</div>
                : <div className="mt-1 h-[18px]" />}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 min-w-[560px] md:min-w-0 min-h-[100px]">
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const logs = weekDays[iso]?.logs || [];
          const isToday = iso === todayISO;
          return (
            <div key={iso} className={cn("px-1 sm:px-1.5 py-2 flex flex-col gap-1", i < 6 ? "border-r border-gray-100" : "", isToday ? "bg-[#730042]/[0.02]" : "")}>
              {logs.map((log) => (
                <div key={log._id} className={cn("border rounded-lg px-1.5 sm:px-2 py-1.5 cursor-default group",
                  log.billable ? "bg-emerald-50 border-emerald-200 border-l-[3px] border-l-emerald-500"
                    : "bg-[#730042]/[0.06] border-[#730042]/20 border-l-[3px] border-l-[#730042]")}
                  title={`${log.job?.title || "—"} · ${fmtDuration(log.duration_minutes)}`}>
                  <div className="text-[11px] font-semibold text-gray-900 truncate leading-tight">{log.job?.title || "—"}</div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className={cn("text-[10px] font-bold", log.billable ? "text-emerald-600" : "text-[#730042]")}>{fmtDuration(log.duration_minutes)}</span>
                    {log.status === "draft" && (
                      <div className="hidden group-hover:flex gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); onEditLog?.(log); }} className="text-[10px] text-gray-400 hover:text-blue-600 px-1">✎</button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteLog?.(log._id); }} className="text-[10px] text-gray-400 hover:text-red-500 px-1">×</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={() => onAddLog(iso)} className="mt-auto w-full border border-dashed border-gray-200 rounded-lg py-1 text-[11px] text-gray-300 hover:border-[#730042]/40 hover:text-[#730042]/60 transition-colors">+ Add</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, valueColor = "text-[#730042]" }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-3 sm:px-4 py-3.5 sm:py-4 min-w-0">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 truncate">{label}</div>
      <div className={cn("text-xl sm:text-2xl font-extrabold leading-none truncate", valueColor)}>{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-1 truncate">{sub}</div>}
    </div>
  );
}

export default function ManagerTimesheet() {
  const [tab, setTab] = useState("work");
  const [weekStart, setWeekStart] = useState(getMonday());
  const [logModal, setLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ job: "", log_date: "", duration_minutes: "", note: "" });
  const [editLog, setEditLog] = useState(null);
  const [editForm, setEditForm] = useState({ duration_minutes: "", note: "", reason: "" });
  const [jobModal, setJobModal] = useState(false);
  const [jobForm, setJobForm] = useState({ title: "", description: "", assigned_to: "", priority: "medium", estimated_hours: "", max_hours_per_day: "", billable: false, hourly_rate: "", due_date: "" });
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [editJobModal, setEditJobModal] = useState(false);
  const [editJobForm, setEditJobForm] = useState({ id: "", title: "", description: "", priority: "medium", estimated_hours: "", max_hours_per_day: "", billable: false, hourly_rate: "", due_date: "" });

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const { data: assignedData } = useMyAssignedJobs();
  const assignedJobs = assignedData?.jobs || [];
  const { data: createdData, refetch: refetchCreated } = useJobsCreatedByMe();
  const createdJobs = createdData?.jobs || [];
  const { data: targetsData } = useAssignableTargets();
  const targets = targetsData?.targets || [];
  const { data: weekData, refetch: refetchWeek } = useMyWeekLog(weekStart);
  const weekDays = weekData?.days || {};
  const totalWeekMins = weekData?.totalMinutes || 0;
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

  const logTime = useLogTime();
  const updateTimeLog = useUpdateTimeLog();
  const deleteTimeLog = useDeleteTimeLog();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const updateJobStatus = useUpdateJobStatus();
  const archiveJob = useArchiveJob();
  const submitTS = useSubmitTimesheet();
  const recallTS = useRecallTimesheet();
  const approveTS = useApproveTimesheet();
  const rejectTS = useRejectTimesheet();
  const forwardTS = useForwardTimesheet();

  const shiftWeek = useCallback((dir) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }, [weekStart]);

  const handleLogTime = () => {
    if (!logForm.job || !logForm.duration_minutes) return;
    logTime.mutate({ job: logForm.job, log_date: logForm.log_date, duration_minutes: Number(logForm.duration_minutes), note: logForm.note }, {
      onSuccess: (res) => {
        setLogModal(false); setLogForm({ job: "", log_date: "", duration_minutes: "", note: "" }); refetchWeek();
        if (res?.warning) toast(res.warning, { icon: "⏱️", duration: 6000 });
      }
    });
  };

  const handleUpdateLog = () => {
    if (!editLog) return;
    updateTimeLog.mutate({ id: editLog._id, data: { duration_minutes: Number(editForm.duration_minutes), note: editForm.note, reason: editForm.reason } }, {
      onSuccess: (res) => {
        setEditLog(null); refetchWeek();
        if (res?.warning) toast(res.warning, { icon: "⏱️", duration: 6000 });
      }
    });
  };

  const handleDeleteLog = (id) => {
    if (!window.confirm("Delete this time log?")) return;
    deleteTimeLog.mutate(id, { onSuccess: refetchWeek });
  };

  const handleCreateJob = () => {
    if (!jobForm.title || !jobForm.assigned_to) return;
    const target = targets.find((t) => t.id === jobForm.assigned_to);
    createJob.mutate({
      title: jobForm.title, description: jobForm.description,
      assigned_to: jobForm.assigned_to, assigned_to_model: target?.model || "User",
      priority: jobForm.priority, estimated_hours: Number(jobForm.estimated_hours) || 0,
      max_hours_per_day: jobForm.max_hours_per_day === "" ? null : Number(jobForm.max_hours_per_day),
      billable: jobForm.billable, hourly_rate: Number(jobForm.hourly_rate) || 0,
      due_date: jobForm.due_date || null,
    }, {
      onSuccess: () => { setJobModal(false); setJobForm({ title: "", description: "", assigned_to: "", priority: "medium", estimated_hours: "", max_hours_per_day: "", billable: false, hourly_rate: "", due_date: "" }); refetchCreated(); }
    });
  };

  const openEditJob = (job) => {
    setEditJobForm({
      id: job._id,
      title: job.title || "",
      description: job.description || "",
      priority: job.priority || "medium",
      estimated_hours: job.estimated_hours || "",
      max_hours_per_day: job.max_hours_per_day || "",
      billable: !!job.billable,
      hourly_rate: job.hourly_rate || "",
      due_date: job.due_date ? job.due_date.slice(0, 10) : "",
    });
    setEditJobModal(true);
  };

  const handleUpdateJob = () => {
    if (!editJobForm.title) return;
    updateJob.mutate({
      id: editJobForm.id,
      data: {
        title: editJobForm.title,
        description: editJobForm.description,
        priority: editJobForm.priority,
        estimated_hours: Number(editJobForm.estimated_hours) || 0,
        max_hours_per_day: editJobForm.max_hours_per_day === "" ? null : Number(editJobForm.max_hours_per_day),
        billable: editJobForm.billable,
        hourly_rate: Number(editJobForm.hourly_rate) || 0,
        due_date: editJobForm.due_date || null,
      },
    }, {
      onSuccess: () => { setEditJobModal(false); refetchCreated(); },
    });
  };

  const currentWeekSheet = timesheets.find((ts) => {
    const ws = new Date(ts.week_start), wss = new Date(weekStart);
    return ws.getFullYear() === wss.getFullYear() && ws.getMonth() === wss.getMonth() && ws.getDate() === wss.getDate();
  });
  const canSubmit = !currentWeekSheet || ["draft", "rejected"].includes(currentWeekSheet?.status);
  const canRecall = currentWeekSheet && ["pending_manager", "pending_reporting_manager", "pending_admin", "pending_superadmin"].includes(currentWeekSheet?.status);

  return (
    <div className="min-h-screen bg-[#F5F6FA] font-['Inter',system-ui,sans-serif] overflow-x-hidden">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className={CONTAINER}>
          <div className="flex items-center h-14 sm:h-16 gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[#730042] flex items-center justify-center">
                <span className="text-white text-[11px] font-black">T</span>
              </div>
              <span className="font-bold text-[14px] text-gray-900 hidden sm:block">TorchX</span>
              <span className="hidden md:inline text-[11px] font-semibold text-[#730042] bg-[#730042]/10 px-1.5 py-0.5 rounded-md">Manager</span>
            </div>
            <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn("relative flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-lg text-[12px] sm:text-[13px] font-medium transition-all whitespace-nowrap shrink-0",
                    tab === t.id ? "bg-[#730042]/10 text-[#730042] font-semibold" : "text-gray-600 hover:bg-gray-100")}>
                  <span className="text-[11px]">{t.icon}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.id === "approvals" && approvals.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">{approvals.length}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="flex gap-1.5 sm:gap-2 shrink-0">
              <Btn size="sm" variant="ghost" onClick={() => setJobModal(true)} className="hidden md:inline-flex">+ Job</Btn>
              <Btn size="sm" onClick={() => { setLogForm({ job: "", log_date: new Date().toISOString().slice(0, 10), duration_minutes: "", note: "" }); setLogModal(true); }}>
                <span className="hidden sm:inline">+ Log</span>
                <span className="sm:hidden">+</span>
              </Btn>
            </div>
          </div>
        </div>
      </header>

      <main className={cn(CONTAINER, "py-4 sm:py-5 lg:py-6")}>

        {tab === "work" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button onClick={() => shiftWeek(-1)} className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500 hover:text-gray-900 text-[14px] shrink-0">‹</button>
              <span className="text-[13px] font-semibold text-gray-700 flex-1 text-center sm:text-left min-w-0 truncate">{fmtShort(weekStart)} – {fmtShort(weekEnd)}</span>
              <button onClick={() => shiftWeek(1)} className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500 hover:text-gray-900 text-[14px] shrink-0">›</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
              <StatCard label="This Week" value={fmtDuration(totalWeekMins)} sub={`${prodData?.capacityPercent || Math.round((totalWeekMins / 2400) * 100)}% capacity`} />
              <StatCard label="Billable" value={fmtDuration(prodData?.billableMinutes || 0)} valueColor="text-emerald-600" />
              <StatCard label="Team Jobs" value={createdJobs.length} valueColor="text-blue-600" />
              <StatCard label="Pending Approvals" value={approvals.length} valueColor={approvals.length > 0 ? "text-red-500" : "text-gray-400"} />
            </div>
            <TimerBlock assignedJobs={assignedJobs} onTimerLog={refetchWeek} />
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <WeekGrid weekStart={weekStart} weekDays={weekDays}
                onAddLog={(date) => { setLogForm({ job: "", log_date: date, duration_minutes: "", note: "" }); setLogModal(true); }}
                onEditLog={(log) => { setEditLog(log); setEditForm({ duration_minutes: String(log.duration_minutes), note: log.note || "", reason: "" }); }}
                onDeleteLog={handleDeleteLog} />
            </div>
            {prodData?.byJob?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Time by Job</div>
                <div className="flex flex-col gap-2">
                  {prodData.byJob.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-3">
                      <div className="text-[13px] text-gray-700 flex-1 min-w-0 truncate">{b.title}</div>
                      <div className="text-[12px] font-semibold text-[#730042] shrink-0">{fmtDuration(b.minutes)}</div>
                      <div className="w-14 sm:w-20 h-1.5 bg-gray-100 rounded-full shrink-0">
                        <div className="h-full bg-[#730042] rounded-full" style={{ width: `${totalWeekMins > 0 ? Math.round((b.minutes / totalWeekMins) * 100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-gray-900">Week of {fmtShort(weekStart)} – {fmtShort(weekEnd)}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {currentWeekSheet ? <StatusBadge status={currentWeekSheet.status} /> : <span className="text-[12px] text-gray-400">Not submitted</span>}
                    {currentWeekSheet?.remarks && <span className="text-[12px] text-gray-500 italic break-words">"{currentWeekSheet.remarks}"</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {canRecall && (
                    <Btn size="sm" variant="ghost" onClick={() => recallTS.mutate({ timesheetId: currentWeekSheet._id }, { onSuccess: () => { refetchTS(); refetchWeek(); } })} disabled={recallTS.isPending}>Recall</Btn>
                  )}
                  {canSubmit && (
                    <Btn size="sm" onClick={() => submitTS.mutate({ week_start: weekStart }, { onSuccess: () => { refetchTS(); refetchWeek(); } })} disabled={submitTS.isPending || totalWeekMins === 0}>
                      {submitTS.isPending ? "Submitting…" : "Submit Week"}
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "team" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-[16px] sm:text-[17px] text-gray-900">Team Jobs</div>
                <div className="text-[12px] text-gray-400 mt-0.5">{createdJobs.length} jobs assigned by you</div>
              </div>
              <Btn size="sm" onClick={() => setJobModal(true)} className="shrink-0">+ Create Job</Btn>
            </div>
            {createdJobs.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl py-12 text-center px-4">
                <div className="text-3xl mb-2">⬡</div>
                <div className="font-semibold text-gray-700 mb-3">No jobs created yet</div>
                <Btn size="sm" onClick={() => setJobModal(true)}>+ Create Job</Btn>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {createdJobs.map((j) => {
                  const pct = j.estimated_hours > 0 ? Math.round((j.logged_hours_cache / j.estimated_hours) * 100) : 0;
                  return (
                    <div key={j._id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#730042]/20 transition-colors">
                      <div className="flex flex-col gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <button className="font-semibold text-[14px] text-gray-900 hover:text-[#730042] transition-colors text-left break-words" onClick={() => { setSelectedJobId(j._id); setJobDetailOpen(true); }}>{j.title}</button>
                            {j.overrun_flagged && <Chip color="red" size="xs">Overrun ⚠</Chip>}
                          </div>
                          {j.assigned_to_name && (
                            <div className="text-[11px] text-gray-400 mb-1.5">
                              Assigned to <span className="font-semibold text-gray-700">{j.assigned_to_name}</span>
                              {j.assigned_to_model && <span className="text-[#730042]"> · {j.assigned_to_model === "User" ? "Employee" : j.assigned_to_model}</span>}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Chip size="xs" color={j.status === "in_progress" ? "blue" : j.status === "completed" ? "green" : j.status === "on_hold" ? "amber" : j.status === "cancelled" ? "red" : "gray"}>
                              {JOB_STATUS_META[j.status]?.label || j.status}
                            </Chip>
                            <Chip size="xs" color={j.priority === "urgent" ? "brand" : j.priority === "high" ? "red" : j.priority === "medium" ? "amber" : "gray"}>{j.priority}</Chip>
                            {j.billable && <Chip size="xs" color="green">Billable</Chip>}
                            {j.estimated_hours > 0 && <Chip size="xs" color="blue">{j.logged_hours_cache?.toFixed(1)}h / {j.estimated_hours}h</Chip>}
                            {j.due_date && <span className="text-[11px] text-gray-400">Due {fmtDate(j.due_date)}</span>}
                          </div>
                          {j.estimated_hours > 0 && (
                            <div className="mt-2">
                              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", j.overrun_flagged ? "bg-red-500" : "bg-[#730042]")} style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => openEditJob(j)} className="text-[11px] font-semibold rounded-lg px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">Edit</button>
                          <Sel value={j.status} onChange={(e) => updateJobStatus.mutate({ id: j._id, status: e.target.value }, { onSuccess: refetchCreated })}
                            className="text-[11px] py-1 px-2 w-full sm:w-auto sm:min-w-[100px]">
                            {["not_started", "in_progress", "on_hold", "completed", "cancelled"].map((s) => (
                              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                            ))}
                          </Sel>
                          <Btn size="sm" variant="ghost" onClick={() => { if (window.confirm("Archive this job?")) archiveJob.mutate(j._id, { onSuccess: refetchCreated }); }}>Archive</Btn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6">
              <div className="font-bold text-[16px] sm:text-[17px] text-gray-900 mb-0.5">My Jobs</div>
              <div className="text-[12px] text-gray-400 mb-3">{assignedJobs.length} job{assignedJobs.length !== 1 ? "s" : ""} assigned to you</div>
              {assignedJobs.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl py-12 text-center px-4">
                  <div className="text-3xl mb-2">📭</div>
                  <div className="font-semibold text-gray-700">No jobs assigned to you</div>
                  <div className="text-[12px] text-gray-400 mt-1">Jobs assigned to you will show up here</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {assignedJobs.map((j) => {
                    const pct = j.estimated_hours > 0 ? Math.round((j.logged_hours_cache / j.estimated_hours) * 100) : 0;
                    return (
                      <div key={j._id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#730042]/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-semibold text-[14px] text-gray-900 break-words">{j.title}</span>
                            {j.overrun_flagged && <Chip color="red" size="xs">Overrun ⚠</Chip>}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Chip size="xs" color={j.status === "in_progress" ? "blue" : j.status === "completed" ? "green" : j.status === "on_hold" ? "amber" : j.status === "cancelled" ? "red" : "gray"}>
                              {JOB_STATUS_META[j.status]?.label || j.status}
                            </Chip>
                            <Chip size="xs" color={j.priority === "urgent" ? "brand" : j.priority === "high" ? "red" : j.priority === "medium" ? "amber" : "gray"}>{j.priority}</Chip>
                            {j.estimated_hours > 0 && <Chip size="xs" color="blue">{j.logged_hours_cache?.toFixed(1)}h / {j.estimated_hours}h</Chip>}
                            {j.due_date && <span className="text-[11px] text-gray-400">Due {fmtDate(j.due_date)}</span>}
                          </div>
                          {j.estimated_hours > 0 && (
                            <div className="mt-2">
                              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", j.overrun_flagged ? "bg-red-500" : "bg-[#730042]")} style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "approvals" && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="font-bold text-[16px] sm:text-[17px] text-gray-900">Pending Approvals</div>
              <div className="text-[12px] text-gray-400 mt-0.5">{approvals.length} timesheet{approvals.length !== 1 ? "s" : ""} in your queue</div>
            </div>
            {approvals.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl py-12 text-center px-4">
                <div className="text-3xl mb-2">✓</div>
                <div className="font-semibold text-gray-700">All clear — no pending approvals</div>
              </div>
            ) : approvals.map((ts) => (
              <div key={ts._id} className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-10 h-10 bg-[#730042]/[0.08] rounded-xl flex items-center justify-center text-[14px] font-extrabold text-[#730042] shrink-0">
                      {ts.owner?.f_name?.[0] || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[15px] text-gray-900 break-words">{ts.owner?.f_name} {ts.owner?.l_name}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5 break-words">{ts.owner?.work_email}</div>
                      <div className="text-[11px] text-gray-400">Week: {fmtDate(ts.week_start)} – {fmtDate(ts.week_end)}</div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Chip color="brand">{fmtDuration(ts.total_minutes)}</Chip>
                        {ts.overtime_minutes > 0 && <Chip color="amber">{fmtDuration(ts.overtime_minutes)} overtime</Chip>}
                        {ts.billable_minutes > 0 && <Chip color="green">{fmtDuration(ts.billable_minutes)} billable</Chip>}
                        <StatusBadge status={ts.status} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    <Btn size="sm" variant="success" onClick={() => approveTS.mutate({ timesheetId: ts._id, remarks: "Approved" }, { onSuccess: refetchApprovals })}>Approve</Btn>
                    <Btn size="sm" variant="amber" onClick={() => forwardTS.mutate({ timesheetId: ts._id, remarks: "Forwarded to reporting manager" }, { onSuccess: refetchApprovals })}>Forward</Btn>
                    <Btn size="sm" variant="danger" onClick={() => { setRejectModal(ts); setRejectReason(""); }}>Reject</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "insights" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-bold text-[16px] sm:text-[17px] text-gray-900 flex-1 min-w-0">Team Insights</div>
              <button onClick={() => shiftWeek(-1)} className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500 hover:text-gray-900 text-[14px] shrink-0">‹</button>
              <span className="text-[12px] font-semibold text-gray-700 whitespace-nowrap">{fmtShort(weekStart)} – {fmtShort(weekEnd)}</span>
              <button onClick={() => shiftWeek(1)} className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500 hover:text-gray-900 text-[14px] shrink-0">›</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4">
              <StatCard label="Team Members" value={heatmap.length} valueColor="text-blue-600" />
              <StatCard label="Overrun Risk" value={overrunJobs.length} valueColor={overrunJobs.length > 0 ? "text-red-500" : "text-gray-400"} sub="≥75% estimate used" />
              <StatCard label="Idle Jobs" value={idleJobs.length} valueColor={idleJobs.length > 0 ? "text-amber-600" : "text-gray-400"} sub="7+ days no activity" />
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3.5 border-b border-gray-100">
                <div className="font-semibold text-[14px] text-gray-900">Workload Heatmap</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Daily capacity (8h = 100%)</div>
              </div>
              <div className="p-3 sm:p-4 overflow-x-auto">
                {heatmap.length === 0 ? (
                  <div className="text-center text-gray-400 text-[13px] py-4">No team data for this week</div>
                ) : (
                  <div className="min-w-[480px] lg:min-w-0">
                    <div className="flex items-center gap-2 mb-2 pl-10">
                      {DAY_KEYS.map((d) => <div key={d} className="flex-1 text-center text-[10px] text-gray-400 font-bold">{d}</div>)}
                    </div>
                    {heatmap.map((row, i) => {
                      const dayKeys = Array.from({ length: 7 }, (_, d) => { const dt = new Date(weekStart); dt.setDate(dt.getDate() + d); return dt.toISOString().slice(0, 10); });
                      const label = row.name ? row.name.slice(0, 2).toUpperCase() : String(row.person).slice(-2).toUpperCase();
                      return (
                        <div key={i} className="flex items-center gap-2 mb-1.5">
                          <div className="w-8 h-8 bg-[#730042]/[0.08] rounded-full flex items-center justify-center text-[11px] font-extrabold text-[#730042] shrink-0">{label}</div>
                          {dayKeys.map((dk) => {
                            const pct = row.days[dk]?.loadPercent || 0;
                            const bg = pct === 0 ? "bg-gray-50" : pct < 60 ? "bg-emerald-100" : pct < 90 ? "bg-amber-100" : "bg-red-100";
                            const col = pct === 0 ? "text-gray-300" : pct < 60 ? "text-emerald-600" : pct < 90 ? "text-amber-600" : "text-red-600";
                            return (
                              <div key={dk} className={cn("flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold", bg, col)}>
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <span className="font-semibold text-[14px] text-red-600">⚠ Overrun Risk</span>
                  <Chip color="red" size="xs">{overrunJobs.length}</Chip>
                </div>
                {overrunJobs.length === 0
                  ? <div className="px-4 py-5 text-[13px] text-gray-400">No jobs at risk</div>
                  : overrunJobs.map((j) => (
                    <div key={j._id} className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-gray-900 truncate">{j.title}</div>
                        <div className="text-[11px] text-gray-400">{j.logged_hours_cache}h / {j.estimated_hours}h</div>
                      </div>
                      <span className={cn("text-[13px] font-extrabold shrink-0", j.riskPercent >= 100 ? "text-red-600" : "text-amber-600")}>{j.riskPercent}%</span>
                    </div>
                  ))}
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <span className="font-semibold text-[14px] text-gray-700">💤 Idle Jobs</span>
                  <Chip color="gray" size="xs">{idleJobs.length}</Chip>
                </div>
                {idleJobs.length === 0
                  ? <div className="px-4 py-5 text-[13px] text-gray-400">No idle jobs</div>
                  : idleJobs.map((j) => (
                    <div key={j._id} className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-gray-900 truncate">{j.title}</div>
                        <div className="text-[11px] text-gray-400">Last updated {fmtDate(j.updatedAt)}</div>
                      </div>
                      <Chip size="xs" color={j.status === "in_progress" ? "blue" : j.status === "on_hold" ? "amber" : "gray"}>{JOB_STATUS_META[j.status]?.label || j.status}</Chip>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {tab === "sheets" && (
          <div className="flex flex-col gap-3">
            <div className="font-bold text-[16px] sm:text-[17px] text-gray-900">My Timesheets</div>
            {timesheets.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl py-12 text-center px-4">
                <div className="text-3xl mb-2">▦</div>
                <div className="font-semibold text-gray-700 mb-3">No timesheets yet</div>
                <Btn size="sm" onClick={() => setTab("work")}>Go to My Work</Btn>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {timesheets.map((ts) => {
                  const isPending = ["pending_manager", "pending_reporting_manager", "pending_admin", "pending_superadmin"].includes(ts.status);
                  return (
                    <div key={ts._id} className="bg-white border border-gray-200 rounded-2xl p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-semibold text-[14px] text-gray-900">Week of {fmtDate(ts.week_start)}</span>
                            <StatusBadge status={ts.status} />
                          </div>
                          <div className="flex gap-3 text-[12px] flex-wrap">
                            <span className="font-semibold text-[#730042]">{fmtDuration(ts.total_minutes)}</span>
                            {ts.overtime_minutes > 0 && <span className="font-semibold text-amber-600">{fmtDuration(ts.overtime_minutes)} overtime</span>}
                            {ts.billable_minutes > 0 && <span className="text-emerald-600">{fmtDuration(ts.billable_minutes)} billable</span>}
                            <span className="text-gray-400">{fmtDate(ts.week_start)} – {fmtDate(ts.week_end)}</span>
                          </div>
                        </div>
                        {isPending && (
                          <Btn size="sm" variant="ghost" onClick={() => recallTS.mutate({ timesheetId: ts._id }, { onSuccess: refetchTS })} disabled={recallTS.isPending} className="shrink-0">Recall</Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <button
        onClick={() => setJobModal(true)}
        className="md:hidden fixed bottom-5 right-4 z-40 w-12 h-12 rounded-full bg-[#730042] text-white shadow-lg shadow-[#730042]/30 flex items-center justify-center text-xl font-bold active:scale-95 transition-transform"
        aria-label="Create job"
      >
        ⬡
      </button>

      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Time">
        <div className="flex flex-col gap-3.5">
          <Sel label="Job" value={logForm.job} onChange={(e) => setLogForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select a job…</option>
            {assignedJobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Sel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date" type="date" value={logForm.log_date} onChange={(e) => setLogForm((p) => ({ ...p, log_date: e.target.value }))} />
            <Input label="Duration (minutes)" type="number" min="1" placeholder="e.g. 60" value={logForm.duration_minutes} onChange={(e) => setLogForm((p) => ({ ...p, duration_minutes: nonNegative(e.target.value) }))} />
          </div>
          <Input label="Note (optional)" placeholder="What did you work on?" value={logForm.note} onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))} />
          <div className="flex gap-2 justify-end flex-wrap">
            <Btn variant="ghost" onClick={() => setLogModal(false)}>Cancel</Btn>
            <Btn onClick={handleLogTime} disabled={!logForm.job || !logForm.duration_minutes || logTime.isPending}>
              {logTime.isPending ? "Logging…" : "Log Time"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!editLog} onClose={() => setEditLog(null)} title="Edit Time Log">
        <div className="flex flex-col gap-3.5">
          <Input label="Duration (minutes)" type="number" min="1" value={editForm.duration_minutes} onChange={(e) => setEditForm((p) => ({ ...p, duration_minutes: nonNegative(e.target.value) }))} />
          <Input label="Note" value={editForm.note} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} />
          <Input label="Reason for change" value={editForm.reason} onChange={(e) => setEditForm((p) => ({ ...p, reason: e.target.value }))} />
          <div className="flex gap-2 justify-end flex-wrap">
            <Btn variant="ghost" onClick={() => setEditLog(null)}>Cancel</Btn>
            <Btn onClick={handleUpdateLog} disabled={!editForm.duration_minutes || updateTimeLog.isPending}>
              {updateTimeLog.isPending ? "Updating…" : "Update"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={jobModal} onClose={() => setJobModal(false)} title="Create Job" width="max-w-[560px]">
        <div className="flex flex-col gap-3.5">
          <Input label="Title" placeholder="Job title" value={jobForm.title} onChange={(e) => setJobForm((p) => ({ ...p, title: e.target.value }))} />
          <Input label="Description" placeholder="Optional description" value={jobForm.description} onChange={(e) => setJobForm((p) => ({ ...p, description: e.target.value }))} />
          <Sel label="Assign To" value={jobForm.assigned_to} onChange={(e) => setJobForm((p) => ({ ...p, assigned_to: e.target.value }))}>
            <option value="">Select target…</option>
            {targets.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.model === "User" ? "Employee" : t.model})</option>)}
          </Sel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Sel label="Priority" value={jobForm.priority} onChange={(e) => setJobForm((p) => ({ ...p, priority: e.target.value }))}>
              {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{PRIORITY_META[p]?.label || p}</option>)}
            </Sel>
            <Input label="Estimated Hours" type="number" min="0" placeholder="0" value={jobForm.estimated_hours} onChange={(e) => setJobForm((p) => ({ ...p, estimated_hours: nonNegative(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Billable</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={jobForm.billable} onChange={(e) => setJobForm((p) => ({ ...p, billable: e.target.checked }))} className="rounded border-gray-300" />
                <span className="text-[13px] text-gray-700">Yes</span>
              </label>
            </div>
            <Input label="Hourly Rate" type="number" min="0" placeholder="0" value={jobForm.hourly_rate} onChange={(e) => setJobForm((p) => ({ ...p, hourly_rate: nonNegative(e.target.value) }))} disabled={!jobForm.billable} />
          </div>
          <Input label="Due Date" type="date" value={jobForm.due_date} onChange={(e) => setJobForm((p) => ({ ...p, due_date: e.target.value }))} />
          <div>
            <Input label="Max Hours / Day" type="number" step="0.5" min="0.5" max="24" placeholder="e.g. 7" value={jobForm.max_hours_per_day} onChange={(e) => setJobForm((p) => ({ ...p, max_hours_per_day: nonNegative(e.target.value) }))} />
            <p className="text-[11px] text-gray-500 mt-1">Time logged beyond this per day counts as overtime. Leave blank to use the employee's shift hours instead.</p>
          </div>
          <div className="flex gap-2 justify-end flex-wrap">
            <Btn variant="ghost" onClick={() => setJobModal(false)}>Cancel</Btn>
            <Btn onClick={handleCreateJob} disabled={!jobForm.title || !jobForm.assigned_to || createJob.isPending}>
              {createJob.isPending ? "Creating…" : "Create Job"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={editJobModal} onClose={() => setEditJobModal(false)} title="Edit Job" width="max-w-[560px]">
        <div className="flex flex-col gap-3.5">
          <Input label="Title" placeholder="Job title" value={editJobForm.title} onChange={(e) => setEditJobForm((p) => ({ ...p, title: e.target.value }))} />
          <Input label="Description" placeholder="Optional description" value={editJobForm.description} onChange={(e) => setEditJobForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Sel label="Priority" value={editJobForm.priority} onChange={(e) => setEditJobForm((p) => ({ ...p, priority: e.target.value }))}>
              {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{PRIORITY_META[p]?.label || p}</option>)}
            </Sel>
            <Input label="Estimated Hours" type="number" min="0" placeholder="0" value={editJobForm.estimated_hours} onChange={(e) => setEditJobForm((p) => ({ ...p, estimated_hours: nonNegative(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Billable</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editJobForm.billable} onChange={(e) => setEditJobForm((p) => ({ ...p, billable: e.target.checked }))} className="rounded border-gray-300" />
                <span className="text-[13px] text-gray-700">Yes</span>
              </label>
            </div>
            <Input label="Hourly Rate" type="number" min="0" placeholder="0" value={editJobForm.hourly_rate} onChange={(e) => setEditJobForm((p) => ({ ...p, hourly_rate: nonNegative(e.target.value) }))} disabled={!editJobForm.billable} />
          </div>
          <Input label="Due Date" type="date" value={editJobForm.due_date} onChange={(e) => setEditJobForm((p) => ({ ...p, due_date: e.target.value }))} />
          <div>
            <Input label="Max Hours / Day" type="number" step="0.5" min="0.5" max="24" placeholder="e.g. 7" value={editJobForm.max_hours_per_day} onChange={(e) => setEditJobForm((p) => ({ ...p, max_hours_per_day: nonNegative(e.target.value) }))} />
            <p className="text-[11px] text-gray-500 mt-1">Time logged beyond this per day counts as overtime. Leave blank to use the employee's shift hours instead.</p>
          </div>
          <div className="flex gap-2 justify-end flex-wrap">
            <Btn variant="ghost" onClick={() => setEditJobModal(false)}>Cancel</Btn>
            <Btn onClick={handleUpdateJob} disabled={!editJobForm.title || updateJob.isPending}>
              {updateJob.isPending ? "Saving…" : "Save Changes"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Timesheet">
        <div className="flex flex-col gap-3.5">
          <Input label="Reason" placeholder="Why are you rejecting this timesheet?" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex gap-2 justify-end flex-wrap">
            <Btn variant="ghost" onClick={() => setRejectModal(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => rejectTS.mutate({ timesheetId: rejectModal._id, remarks: rejectReason }, { onSuccess: () => { setRejectModal(null); setRejectReason(""); refetchApprovals(); } })} disabled={!rejectReason || rejectTS.isPending}>
              {rejectTS.isPending ? "Rejecting…" : "Reject"}
            </Btn>
          </div>
        </div>
      </Modal>

      <JobDetailModal jobId={selectedJobId} open={jobDetailOpen} onClose={() => setJobDetailOpen(false)} />
    </div>
  );
}