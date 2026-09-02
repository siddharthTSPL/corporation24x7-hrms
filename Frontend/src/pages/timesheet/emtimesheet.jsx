import React, { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  useMyAssignedJobs,
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
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const fmtSeconds = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CONTAINER = "max-w-3xl lg:max-w-5xl mx-auto px-3 sm:px-5 lg:px-6";

const STATUS_META = {
  draft:                     { label: "Draft",           color: "text-gray-500",    bg: "bg-gray-100",     dot: "bg-gray-400"    },
  pending_manager:           { label: "Pending Manager", color: "text-amber-600",   bg: "bg-amber-50",     dot: "bg-amber-500"   },
  pending_reporting_manager: { label: "Pending Review",  color: "text-amber-600",   bg: "bg-amber-50",     dot: "bg-amber-500"   },
  pending_admin:             { label: "Pending Admin",   color: "text-blue-600",    bg: "bg-blue-50",      dot: "bg-blue-500"    },
  pending_superadmin:        { label: "Pending SA",      color: "text-purple-600",  bg: "bg-purple-50",    dot: "bg-purple-500"  },
  approved:                  { label: "Approved",        color: "text-emerald-600", bg: "bg-emerald-50",   dot: "bg-emerald-500" },
  rejected:                  { label: "Rejected",        color: "text-red-600",     bg: "bg-red-50",       dot: "bg-red-500"     },
};

const JOB_STATUS_META = {
  not_started: { label: "Not Started", color: "text-gray-500",    bg: "bg-gray-100"    },
  in_progress:  { label: "In Progress", color: "text-blue-600",    bg: "bg-blue-50"     },
  on_hold:      { label: "On Hold",     color: "text-amber-600",   bg: "bg-amber-50"    },
  completed:    { label: "Completed",   color: "text-emerald-600", bg: "bg-emerald-50"  },
  cancelled:    { label: "Cancelled",   color: "text-red-600",     bg: "bg-red-50"      },
};

const PRIORITY_META = {
  low:    { label: "Low",    color: "text-gray-500",   bg: "bg-gray-100"  },
  medium: { label: "Medium", color: "text-amber-600",  bg: "bg-amber-50"  },
  high:   { label: "High",   color: "text-red-600",    bg: "bg-red-50"    },
  urgent: { label: "Urgent", color: "text-[#730042]",  bg: "bg-[#730042]/10" },
};

const TABS = [
  { id: "work",       label: "My Work",   },
  { id: "jobs",       label: "My Jobs",  },
  { id: "timesheets", label: "Timesheets", },
];

function cn(...args) { return args.filter(Boolean).join(" "); }

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold", m.color, m.bg)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", m.dot)} />
      {m.label}
    </span>
  );
}

function Chip({ children, color = "gray", size = "sm" }) {
  const colors = {
    gray:    "text-gray-600 bg-gray-100",
    amber:   "text-amber-700 bg-amber-50",
    red:     "text-red-700 bg-red-50",
    green:   "text-emerald-700 bg-emerald-50",
    blue:    "text-blue-700 bg-blue-50",
    brand:   "text-[#730042] bg-[#730042]/[0.08]",
    purple:  "text-purple-700 bg-purple-50",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-md font-bold whitespace-nowrap",
      size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-1",
      colors[color] || colors.gray
    )}>
      {children}
    </span>
  );
}

function Btn({ children, variant = "primary", onClick, disabled, type = "button", className = "", size = "md" }) {
  const base = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors whitespace-nowrap",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    size === "sm" ? "text-[12px] px-3 py-1.5 min-h-[34px]" : "text-[13px] px-4 py-2 min-h-[40px]"
  );
  const variants = {
    primary: "bg-[#730042] text-white hover:bg-[#5c0034]",
    ghost:   "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    danger:  "bg-white text-red-600 border border-red-300 hover:bg-red-50",
    success: "bg-white text-emerald-600 border border-emerald-300 hover:bg-emerald-50",
    amber:   "bg-white text-amber-600 border border-amber-300 hover:bg-amber-50",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(base, variants[variant], className)}>
      {children}
    </button>
  );
}

function Input({ label, error, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</label>}
      <input
        {...props}
        className={cn(
          "bg-white border border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 outline-none w-full min-w-0",
          "focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors",
          "placeholder:text-gray-400",
          error && "border-red-400",
          className
        )}
      />
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  );
}

function Select({ label, children, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</label>}
      <select
        {...props}
        className={cn(
          "bg-white border border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 outline-none w-full min-w-0",
          "focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors appearance-none cursor-pointer",
          className
        )}
      >
        {children}
      </select>
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/45 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={cn("bg-white rounded-t-xl sm:rounded-xl w-full shadow-xl flex flex-col max-h-[90vh] min-w-0", width)}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <span className="font-bold text-[15px] text-gray-900 truncate min-w-0">{title}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-lg leading-none shrink-0"
          >×</button>
        </div>
        <div className="p-5 overflow-y-auto overflow-x-hidden min-w-0">{children}</div>
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
        <div className="flex flex-col gap-4 min-w-0">
          <div className="min-w-0">
            <div className="font-bold text-[17px] text-gray-900 mb-1 break-words">{job.title}</div>
            {job.description && <div className="text-[13px] text-gray-500 leading-relaxed break-words">{job.description}</div>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</div>
              <Chip color={job.status === "in_progress" ? "blue" : job.status === "completed" ? "green" : job.status === "on_hold" ? "amber" : job.status === "cancelled" ? "red" : "gray"}>
                {JOB_STATUS_META[job.status]?.label || job.status}
              </Chip>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Priority</div>
              <Chip color={job.priority === "urgent" ? "brand" : job.priority === "high" ? "red" : job.priority === "medium" ? "amber" : "gray"}>
                {PRIORITY_META[job.priority]?.label || job.priority}
              </Chip>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Logged</div>
              <div className="text-[15px] font-bold text-[#730042]">{job.logged_hours_cache?.toFixed(1) || 0}h</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Estimated</div>
              <div className="text-[15px] font-bold text-gray-900">{job.estimated_hours || 0}h</div>
            </div>
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
                <div
                  className={cn("h-full rounded-full transition-all", job.overrun_flagged ? "bg-red-500" : "bg-[#730042]")}
                  style={{ width: `${Math.min(100, (job.logged_hours_cache / job.estimated_hours) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {job.due_date && (
            <div className="flex items-center gap-2 text-[12px] text-gray-500">
              <span>Due:</span>
              <span className="font-semibold text-gray-700">{fmtDate(job.due_date)}</span>
            </div>
          )}

          {job.work_items?.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Work Items</div>
              <div className="flex flex-col gap-1.5">
                {job.work_items.map((wi, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13px] min-w-0">
                    <span className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 text-[10px]",
                      wi.is_completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"
                    )}>
                      {wi.is_completed && "✓"}
                    </span>
                    <span className={cn("min-w-0 break-words", wi.is_completed ? "line-through text-gray-400" : "text-gray-700")}>{wi.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {job.tags?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {job.tags.map((tag, i) => (
                <Chip key={i} color="gray" size="xs">{tag}</Chip>
              ))}
            </div>
          )}

          {job.billable && (
            <div className="flex items-center gap-2 text-[12px]">
              <Chip color="green">Billable</Chip>
            </div>
          )}

          {job.overrun_flagged && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-[12px] text-red-600">
              <span>⚠</span>
              <span className="font-semibold">This job has exceeded the estimated hours</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function TimerSection({ assignedJobs, onTimerLog }) {
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
  const [stopModal, setStopModal] = useState(false);
  const [startForm, setStartForm] = useState({ job: "", note: "" });
  const [stopNote, setStopNote] = useState("");

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
  }, [timer?.status]);

  const isRunning = timer?.status === "running";
  const isPaused = timer?.status === "paused";
  const displaySecs = isRunning ? elapsed : (timer?.accumulated_seconds || 0);
  const activeJobs = assignedJobs.filter((j) => !["completed", "cancelled"].includes(j.status));

  return (
    <>
      <div className={cn(
        "rounded-lg overflow-hidden border transition-colors min-w-0",
        isRunning
          ? "border-[#730042] bg-[#730042]"
          : isPaused
          ? "border-amber-200 bg-amber-50"
          : "border-gray-200 bg-white"
      )}>
        <div className="px-4 py-3 flex items-center gap-2.5 min-w-0">
          {isRunning && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
          <span className={cn("text-[11px] font-bold uppercase tracking-wide shrink-0",
            isRunning ? "text-white/80" : isPaused ? "text-amber-600" : "text-gray-400"
          )}>
            {isRunning ? "Timer Running" : isPaused ? "Timer Paused" : "No Active Timer"}
          </span>
          {timer?.job?.title && (
            <span className={cn("ml-auto text-[11px] truncate min-w-0",
              isRunning ? "text-white/60" : "text-gray-400"
            )}>
              {timer.job.title}
            </span>
          )}
        </div>

        <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
          <div className={cn(
            "font-mono text-3xl sm:text-4xl font-extrabold tracking-widest tabular-nums select-none",
            isRunning ? "text-white" : isPaused ? "text-amber-600" : "text-gray-200"
          )}>
            {fmtSeconds(displaySecs)}
          </div>

          <div className="flex gap-2 shrink-0 flex-wrap">
            {!timer ? (
              <Btn onClick={() => setStartModal(true)}>
                ▶ Start
              </Btn>
            ) : (
              <>
                {isRunning && (
                  <Btn variant="ghost" onClick={() => pauseTimer.mutate({}, { onSuccess: refetchTimer })}
                    className={isRunning ? "bg-white/20 text-white border-white/30 hover:bg-white/30" : ""}>
                    ⏸
                  </Btn>
                )}
                {isPaused && (
                  <Btn variant="ghost" onClick={() => resumeTimer.mutate({}, { onSuccess: refetchTimer })}>
                    ▶
                  </Btn>
                )}
                <Btn
                  variant="ghost"
                  onClick={() => setStopModal(true)}
                  className={isRunning ? "bg-white/20 text-white border-white/30 hover:bg-white/30" : ""}
                >
                  ■ Log
                </Btn>
                <Btn
                  variant="ghost"
                  onClick={() => discardTimer.mutate({}, { onSuccess: refetchTimer })}
                  className={isRunning ? "bg-white/10 text-white/70 border-white/20 hover:bg-white/20" : "text-red-500 border-red-200 hover:bg-red-50"}
                >
                  Discard
                </Btn>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Timer">
        <div className="flex flex-col gap-4">
          <Select
            label="Job"
            value={startForm.job}
            onChange={(e) => setStartForm((p) => ({ ...p, job: e.target.value }))}
          >
            <option value="">Select a job…</option>
            {activeJobs.map((j) => (
              <option key={j._id} value={j._id}>{j.title}</option>
            ))}
          </Select>
          <Input
            label="Note (optional)"
            placeholder="What are you working on?"
            value={startForm.note}
            onChange={(e) => setStartForm((p) => ({ ...p, note: e.target.value }))}
          />
          <div className="flex gap-2 justify-end flex-wrap">
            <Btn variant="ghost" onClick={() => setStartModal(false)}>Cancel</Btn>
            <Btn
              onClick={() => startTimer.mutate({ job: startForm.job, note: startForm.note }, {
                onSuccess: () => { setStartModal(false); setStartForm({ job: "", note: "" }); refetchTimer(); }
              })}
              disabled={!startForm.job || startTimer.isPending}
            >
              {startTimer.isPending ? "Starting…" : "▶ Start"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={stopModal} onClose={() => setStopModal(false)} title="Log Time">
        <div className="flex flex-col gap-4">
          <div className="bg-[#730042]/[0.07] border border-[#730042]/20 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
            <span className="text-[12px] text-[#730042] font-semibold">Elapsed</span>
            <span className="font-mono font-extrabold text-xl text-[#730042]">{fmtSeconds(displaySecs)}</span>
          </div>
          <Input
            label="Note (optional)"
            placeholder="Brief summary of work done…"
            value={stopNote}
            onChange={(e) => setStopNote(e.target.value)}
          />
          <div className="flex gap-2 justify-end flex-wrap">
            <Btn variant="ghost" onClick={() => setStopModal(false)}>Cancel</Btn>
            <Btn
              variant="success"
              onClick={() => stopTimer.mutate({ note: stopNote }, {
                onSuccess: () => {
                  setStopModal(false);
                  setStopNote("");
                  refetchTimer();
                  onTimerLog && onTimerLog();
                }
              })}
              disabled={stopTimer.isPending}
            >
              {stopTimer.isPending ? "Logging…" : "■ Log Time"}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}

function WeekGrid({ weekStart, weekDays, onAddLog, onEditLog, onDeleteLog }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden min-w-0">
      {/* Mobile: stacked day list — sized to the viewport, never scrolls sideways */}
      <div className="flex flex-col divide-y divide-gray-100 sm:hidden">
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === todayISO;
          const mins = weekDays[iso]?.totalMinutes || 0;
          const otMins = weekDays[iso]?.overtimeMinutes || 0;
          const logs = weekDays[iso]?.logs || [];
          return (
            <div key={iso} className={cn("p-3.5 min-w-0", isToday && "bg-[#730042]/[0.04]")}>
              <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("text-[11px] font-bold uppercase tracking-wide shrink-0", isToday ? "text-[#730042]" : "text-gray-400")}>{DAY_KEYS[i]}</span>
                  <span className={cn("text-[15px] font-extrabold shrink-0", isToday ? "text-[#730042]" : "text-gray-800")}>{d.getDate()}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {mins > 0 && <span className="text-[10px] font-bold text-[#730042] bg-[#730042]/[0.08] rounded-md px-1.5 py-0.5">{fmtDuration(mins)}</span>}
                  {otMins > 0 && <span className="text-[9px] font-bold text-amber-700 bg-amber-100 rounded-md px-1.5 py-0.5">+{fmtDuration(otMins)} OT</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                {logs.map((log) => (
                  <div key={log._id}
                    className={cn("border rounded-lg px-2.5 py-2 flex items-center justify-between gap-2 min-w-0",
                      log.billable ? "bg-emerald-50 border-emerald-200 border-l-[3px] border-l-emerald-500"
                        : "bg-[#730042]/[0.05] border-[#730042]/15 border-l-[3px] border-l-[#730042]")}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-gray-900 truncate">{log.job?.title || "—"}</div>
                      <div className={cn("text-[11px] font-bold mt-0.5", log.billable ? "text-emerald-600" : "text-[#730042]")}>{fmtDuration(log.duration_minutes)}</div>
                    </div>
                    {log.status === "draft" && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => onEditLog(log)} className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 text-[11px]">✎</button>
                        <button onClick={() => onDeleteLog(log._id)} className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 text-[12px]">×</button>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => onAddLog(iso)}
                  className="w-full border border-dashed border-gray-200 rounded-lg py-2 text-[11px] font-semibold text-gray-400 hover:border-[#730042]/40 hover:text-[#730042]/70 transition-colors"
                >
                  + Add entry
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tablet/desktop: 7-column grid that fits the container width — no forced min-width */}
      <div className="hidden sm:block min-w-0">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {days.map((d, i) => {
            const iso = d.toISOString().slice(0, 10);
            const isToday = iso === todayISO;
            const mins = weekDays[iso]?.totalMinutes || 0;
            const otMins = weekDays[iso]?.overtimeMinutes || 0;
            return (
              <div key={iso} className={cn("px-1 sm:px-2 pt-3 pb-2 text-center min-w-0", i < 6 && "border-r border-gray-100", isToday && "bg-[#730042]/[0.05]")}>
                <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide">{DAY_KEYS[i]}</div>
                <div className={cn("text-base sm:text-lg font-extrabold mt-0.5", isToday ? "text-[#730042]" : "text-gray-800")}>
                  {d.getDate()}
                </div>
                {mins > 0 ? (
                  <div className="mt-1 text-[9px] sm:text-[10px] font-bold text-[#730042] bg-[#730042]/[0.08] rounded px-1 py-0.5 truncate">
                    {fmtDuration(mins)}
                  </div>
                ) : (
                  <div className="mt-1 h-[18px]" />
                )}
                {otMins > 0 && (
                  <div className="mt-1 text-[8px] sm:text-[9px] font-bold text-amber-700 bg-amber-100 rounded px-1 py-0.5 truncate">
                    +{fmtDuration(otMins)} OT
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7" style={{ minHeight: 120 }}>
          {days.map((d, i) => {
            const iso = d.toISOString().slice(0, 10);
            const logs = weekDays[iso]?.logs || [];
            const isToday = iso === todayISO;
            return (
              <div
                key={iso}
                className={cn("px-1 sm:px-1.5 py-2 flex flex-col gap-1 min-w-0", i < 6 && "border-r border-gray-100", isToday && "bg-[#730042]/[0.02]")}
              >
                {logs.map((log) => (
                  <div
                    key={log._id}
                    className={cn(
                      "border rounded-lg px-1.5 sm:px-2 py-1.5 cursor-pointer group min-w-0",
                      log.billable
                        ? "bg-emerald-50 border-emerald-200 border-l-[3px] border-l-emerald-500"
                        : "bg-[#730042]/[0.05] border-[#730042]/15 border-l-[3px] border-l-[#730042]"
                    )}
                    title={`${log.job?.title || "—"} · ${fmtDuration(log.duration_minutes)}`}
                  >
                    <div className="text-[10px] sm:text-[11px] font-semibold text-gray-900 truncate leading-tight">{log.job?.title || "—"}</div>
                    <div className="flex items-center justify-between mt-0.5 gap-1 min-w-0">
                      <span className={cn("text-[9px] sm:text-[10px] font-bold truncate", log.billable ? "text-emerald-600" : "text-[#730042]")}>
                        {fmtDuration(log.duration_minutes)}
                      </span>
                      {log.status === "draft" && (
                        <div className="hidden group-hover:flex gap-0.5 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEditLog(log); }}
                            className="text-[9px] sm:text-[10px] text-gray-400 hover:text-blue-600 px-0.5"
                          >✎</button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteLog(log._id); }}
                            className="text-[9px] sm:text-[10px] text-gray-400 hover:text-red-500 px-0.5"
                          >×</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => onAddLog(iso)}
                  className="mt-auto w-full border border-dashed border-gray-200 rounded-lg py-1 text-[10px] sm:text-[11px] text-gray-300 hover:border-[#730042]/40 hover:text-[#730042]/60 transition-colors"
                >
                  + Add
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, valueColor = "text-[#730042]" }) {
  const barColor = valueColor.replace("text-", "bg-");
  return (
    <div className="relative overflow-hidden bg-white border border-gray-200 rounded-lg pl-4 pr-3 sm:pl-4 sm:pr-4 py-3.5 sm:py-4 min-w-0">
      <span className={cn("absolute top-0 left-0 h-full w-[3px]", barColor)} />
      <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 truncate">{label}</div>
      <div className={cn("text-lg sm:text-2xl font-bold tracking-tight leading-none truncate", valueColor)}>{value}</div>
      {sub && <div className="text-[10px] sm:text-[11px] text-gray-400 mt-1.5 truncate">{sub}</div>}
    </div>
  );
}

export default function EmployeeTimesheet() {
  const [tab, setTab] = useState("work");
  const [weekStart, setWeekStart] = useState(getMonday());
  const [logModal, setLogModal] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logForm, setLogForm] = useState({ job: "", log_date: "", duration_minutes: "", note: "" });
  const [editLog, setEditLog] = useState(null);
  const [editForm, setEditForm] = useState({ duration_minutes: "", note: "", reason: "" });
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const { data: assignedData } = useMyAssignedJobs();
  const assignedJobs = assignedData?.jobs || [];

  const { data: weekData, refetch: refetchWeek } = useMyWeekLog(weekStart);
  const weekDays = weekData?.days || {};
  const totalWeekMins = weekData?.totalMinutes || 0;
  const totalWorkingMins = weekData?.totalWorkingMinutes ?? totalWeekMins;
  const totalOvertimeMins = weekData?.totalOvertimeMinutes || 0;

  const { data: tsData, refetch: refetchTS } = useMyTimesheets();
  const timesheets = tsData?.timesheets || [];

  const { data: prodData } = useMyProductivitySummary(weekStart);

  const logTime = useLogTime();
  const updateTimeLog = useUpdateTimeLog();
  const deleteTimeLog = useDeleteTimeLog();
  const submitTS = useSubmitTimesheet();
  const recallTS = useRecallTimesheet();

  const shiftWeek = useCallback((dir) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }, [weekStart]);

  const openAddLog = (date) => {
    setLogForm({ job: "", log_date: date, duration_minutes: "", note: "" });
    setLogModal(true);
  };

  const openEditLog = (log) => {
    setEditLog(log);
    setEditForm({ duration_minutes: String(log.duration_minutes), note: log.note || "", reason: "" });
  };

  const handleLogTime = () => {
    if (!logForm.job || !logForm.duration_minutes) return;
    logTime.mutate({
      job: logForm.job,
      log_date: logForm.log_date,
      duration_minutes: Number(logForm.duration_minutes),
      note: logForm.note,
    }, {
      onSuccess: (res) => {
        setLogModal(false);
        setLogForm({ job: "", log_date: "", duration_minutes: "", note: "" });
        refetchWeek();
        if (res?.warning) toast(res.warning, { icon: "⏱️", duration: 6000 });
      }
    });
  };

  const handleUpdateLog = () => {
    if (!editLog) return;
    updateTimeLog.mutate({
      id: editLog._id,
      data: {
        duration_minutes: Number(editForm.duration_minutes),
        note: editForm.note,
        reason: editForm.reason,
      }
    }, {
      onSuccess: (res) => {
        setEditLog(null);
        refetchWeek();
        if (res?.warning) toast(res.warning, { icon: "⏱️", duration: 6000 });
      }
    });
  };

  const handleDeleteLog = (id) => {
    if (!window.confirm("Delete this time log?")) return;
    deleteTimeLog.mutate(id, { onSuccess: refetchWeek });
  };

  const handleSubmitWeek = () => {
    submitTS.mutate({ week_start: weekStart }, {
      onSuccess: () => { refetchTS(); refetchWeek(); }
    });
  };

  const currentWeekSheet = timesheets.find((ts) => {
    const ws = new Date(ts.week_start);
    const wss = new Date(weekStart);
    return ws.getFullYear() === wss.getFullYear() &&
      ws.getMonth() === wss.getMonth() &&
      ws.getDate() === wss.getDate();
  });

  const canSubmit = !currentWeekSheet || ["draft", "rejected"].includes(currentWeekSheet?.status);
  const isPendingOrApproved = currentWeekSheet && !["draft", "rejected"].includes(currentWeekSheet?.status);
  const canRecall = currentWeekSheet &&
    ["pending_manager", "pending_reporting_manager", "pending_admin", "pending_superadmin"].includes(currentWeekSheet?.status);

  const openJobDetail = (jobId) => {
    setSelectedJobId(jobId);
    setJobDetailOpen(true);
  };

  const rootRef = useRef(null);

  return (
    <div ref={rootRef} className="min-h-screen w-full max-w-full bg-gray-50 overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 min-w-0 max-w-full overflow-hidden">
        <div className={CONTAINER}>
          <div className="flex items-center h-14 gap-2 sm:gap-4 min-w-0 max-w-full">
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-md bg-[#730042] flex items-center justify-center">
                <span className="text-white text-[11px] font-black">T</span>
              </div>
              <span className="font-bold text-[14px] text-gray-900 hidden sm:block tracking-tight">TorchX Timesheet</span>
            </div>

            <nav className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 overflow-x-auto no-scrollbar h-full">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 h-full px-0.5 border-b-2 text-[12px] sm:text-[13px] font-medium transition-colors whitespace-nowrap shrink-0",
                    tab === t.id
                      ? "text-[#730042] font-bold border-[#730042]"
                      : "text-gray-500 border-transparent hover:text-gray-800"
                  )}
                >
                  <span className="text-[11px] sm:text-[12px]">{t.icon}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.label.split(" ")[1] || t.label}</span>
                </button>
              ))}
            </nav>

            <div className="shrink-0 flex items-center gap-2">
              {tab === "work" && (
                <div className="hidden sm:flex items-center gap-1.5 bg-white border border-gray-300 rounded-md px-2.5 py-1.5">
                  <button onClick={() => shiftWeek(-1)} className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 text-[15px] leading-none transition-colors">‹</button>
                  <span className="text-[12px] font-semibold text-gray-700 whitespace-nowrap">
                    {fmtShort(weekStart)} – {fmtShort(weekEnd)}
                  </span>
                  <button onClick={() => shiftWeek(1)} className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 text-[15px] leading-none transition-colors">›</button>
                </div>
              )}
              <Btn
                size="sm"
                onClick={() => openAddLog(new Date().toISOString().slice(0, 10))}
              >
                <span className="hidden sm:inline">+ Log Time</span>
                <span className="sm:hidden">+ Log</span>
              </Btn>
            </div>
          </div>
        </div>
      </header>

      <main className={cn(CONTAINER, "py-4 sm:py-6 lg:py-8 min-w-0")}>

        {tab === "work" && (
          <div className="flex flex-col gap-4 min-w-0">
            <div className="flex items-center gap-2 sm:hidden">
              <button onClick={() => shiftWeek(-1)} className="bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 text-[15px] shrink-0 transition-colors">‹</button>
              <span className="text-[13px] font-semibold text-gray-700 flex-1 text-center min-w-0 truncate">
                {fmtShort(weekStart)} – {fmtShort(weekEnd)}
              </span>
              <button onClick={() => shiftWeek(1)} className="bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 text-[15px] shrink-0 transition-colors">›</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              <StatCard
                label="This Week"
                value={fmtDuration(totalWeekMins)}
                sub={`${prodData?.capacityPercent || Math.round((totalWeekMins / 2400) * 100)}% capacity`}
                valueColor="text-[#730042]"
              />
              <StatCard
                label="Working Hours"
                value={fmtDuration(totalWorkingMins)}
                valueColor="text-emerald-600"
              />
              <StatCard
                label="Overtime"
                value={fmtDuration(totalOvertimeMins)}
                sub={totalOvertimeMins > 0 ? "Per company policy" : undefined}
                valueColor={totalOvertimeMins > 0 ? "text-amber-600" : "text-gray-600"}
              />
              <StatCard
                label="Billable"
                value={fmtDuration(prodData?.billableMinutes || 0)}
                valueColor="text-emerald-600"
              />
              <StatCard
                label="Non-Billable"
                value={fmtDuration(prodData?.nonBillableMinutes ?? (totalWeekMins - (prodData?.billableMinutes || 0)))}
                valueColor="text-gray-600"
              />
            </div>

            <TimerSection assignedJobs={assignedJobs} onTimerLog={refetchWeek} />

            <WeekGrid
              weekStart={weekStart}
              weekDays={weekDays}
              onAddLog={openAddLog}
              onEditLog={openEditLog}
              onDeleteLog={handleDeleteLog}
            />

            {prodData?.byJob?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-0">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Time by Job</div>
                <div className="flex flex-col gap-2">
                  {prodData.byJob.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="text-[13px] text-gray-700 flex-1 min-w-0 truncate">{b.title}</div>
                      <div className="text-[12px] font-semibold text-[#730042] shrink-0">{fmtDuration(b.minutes)}</div>
                      <div className="w-14 sm:w-20 h-1.5 bg-gray-100 rounded-full shrink-0">
                        <div
                          className="h-full bg-[#730042] rounded-full"
                          style={{ width: `${totalWeekMins > 0 ? Math.round((b.minutes / totalWeekMins) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-gray-900">
                    Week of {fmtShort(weekStart)} – {fmtShort(weekEnd)}
                  </div>
                  <div className="text-[12px] text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    {currentWeekSheet
                      ? <StatusBadge status={currentWeekSheet.status} />
                      : "No timesheet submitted for this week"
                    }
                  </div>
                  {currentWeekSheet?.remarks && (
                    <div className="text-[12px] text-gray-500 italic mt-1 break-words">"{currentWeekSheet.remarks}"</div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {canRecall && (
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => recallTS.mutate({ timesheetId: currentWeekSheet._id }, { onSuccess: () => { refetchTS(); refetchWeek(); } })}
                      disabled={recallTS.isPending}
                    >
                      Recall
                    </Btn>
                  )}
                  {canSubmit && (
                    <Btn
                      size="sm"
                      onClick={handleSubmitWeek}
                      disabled={submitTS.isPending || totalWeekMins === 0}
                    >
                      {submitTS.isPending ? "Submitting…" : "Submit Week"}
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "jobs" && (
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-[17px] text-gray-900">My Jobs</div>
                <div className="text-[12px] text-gray-400 mt-0.5">{assignedJobs.length} jobs assigned to you</div>
              </div>
            </div>

            {assignedJobs.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg py-12 text-center px-4">
                <div className="text-3xl mb-2">⬡</div>
                <div className="font-semibold text-gray-700 mb-1">No jobs assigned yet</div>
                <div className="text-[12px] text-gray-400">Jobs assigned to you will appear here</div>
              </div>
            ) : (
              assignedJobs.map((job) => {
                const pct = job.estimated_hours > 0
                  ? Math.round((job.logged_hours_cache / job.estimated_hours) * 100)
                  : 0;
                const jm = JOB_STATUS_META[job.status] || JOB_STATUS_META.not_started;
                const pm = PRIORITY_META[job.priority] || PRIORITY_META.low;
                return (
                  <div
                    key={job._id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-[#730042]/40 transition-colors min-w-0"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <button
                            className="font-semibold text-[14px] text-gray-900 hover:text-[#730042] transition-colors text-left break-words"
                            onClick={() => openJobDetail(job._id)}
                          >
                            {job.title}
                          </button>
                          {job.overrun_flagged && (
                            <Chip color="red" size="xs">Overrun ⚠</Chip>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Chip
                            color={job.status === "in_progress" ? "blue" : job.status === "completed" ? "green" : job.status === "on_hold" ? "amber" : job.status === "cancelled" ? "red" : "gray"}
                            size="xs"
                          >
                            {jm.label}
                          </Chip>
                          <Chip
                            color={job.priority === "urgent" ? "brand" : job.priority === "high" ? "red" : job.priority === "medium" ? "amber" : "gray"}
                            size="xs"
                          >
                            {pm.label}
                          </Chip>
                          {job.billable && <Chip color="green" size="xs">Billable</Chip>}
                          {job.due_date && (
                            <span className="text-[11px] text-gray-400">Due {fmtDate(job.due_date)}</span>
                          )}
                        </div>

                        {job.estimated_hours > 0 && (
                          <div className="mt-2.5">
                            <div className="flex items-center justify-between mb-1 gap-2">
                              <span className="text-[11px] text-gray-400 truncate">
                                {job.logged_hours_cache?.toFixed(1)}h / {job.estimated_hours}h
                              </span>
                              <span className={cn("text-[11px] font-bold shrink-0", job.overrun_flagged ? "text-red-600" : "text-gray-500")}>
                                {pct}%
                              </span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", job.overrun_flagged ? "bg-red-500" : "bg-[#730042]")}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Btn size="sm" variant="ghost" onClick={() => openJobDetail(job._id)}>
                          View
                        </Btn>
                        {!["completed", "cancelled"].includes(job.status) && (
                          <Btn size="sm" onClick={() => openAddLog(new Date().toISOString().slice(0, 10))}>
                            + Log
                          </Btn>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "timesheets" && (
          <div className="flex flex-col gap-3 min-w-0">
            <div className="font-bold text-[17px] text-gray-900">My Timesheets</div>

            {timesheets.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg py-12 text-center px-4">
                <div className="text-3xl mb-2">◈</div>
                <div className="font-semibold text-gray-700 mb-1">No timesheets yet</div>
                <div className="text-[12px] text-gray-400">Log time and submit a week to see timesheets</div>
                <Btn className="mt-4" size="sm" onClick={() => setTab("work")}>Go to My Work</Btn>
              </div>
            ) : (
              timesheets.map((ts) => {
                const isPending = ["pending_manager", "pending_reporting_manager", "pending_admin", "pending_superadmin"].includes(ts.status);
                return (
                  <div key={ts._id} className="bg-white border border-gray-200 rounded-lg p-4 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-semibold text-[14px] text-gray-900">
                            Week of {fmtDate(ts.week_start)}
                          </span>
                          <StatusBadge status={ts.status} />
                        </div>
                        <div className="flex items-center gap-3 text-[12px] text-gray-500 flex-wrap">
                          <span className="font-semibold text-[#730042]">{fmtDuration(ts.total_minutes)}</span>
                          {ts.overtime_minutes > 0 && (
                            <span className="text-amber-600 font-semibold">{fmtDuration(ts.overtime_minutes)} overtime</span>
                          )}
                          {ts.billable_minutes > 0 && (
                            <span className="text-emerald-600">{fmtDuration(ts.billable_minutes)} billable</span>
                          )}
                          <span className="text-gray-400">{fmtDate(ts.week_start)} – {fmtDate(ts.week_end)}</span>
                        </div>
                        {ts.remarks && (
                          <div className="mt-2 text-[12px] text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 break-words">
                            "{ts.remarks}"
                          </div>
                        )}
                      </div>
                      {isPending && (
                        <Btn
                          size="sm"
                          variant="ghost"
                          onClick={() => recallTS.mutate({ timesheetId: ts._id }, { onSuccess: refetchTS })}
                          disabled={recallTS.isPending}
                          className="shrink-0"
                        >
                          Recall
                        </Btn>
                      )}
                    </div>

                    {ts.status === "rejected" && (
                      <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[12px] text-red-600 flex-wrap">
                        <span>✕</span>
                        <span>Rejected — recall and revise, then resubmit</span>
                        <button
                          className="ml-auto font-semibold underline"
                          onClick={() => { setWeekStart(getMonday(ts.week_start)); setTab("work"); }}
                        >
                          Go to week →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Time">
        <div className="flex flex-col gap-3.5">
          <Select
            label="Job"
            value={logForm.job}
            onChange={(e) => setLogForm((p) => ({ ...p, job: e.target.value }))}
          >
            <option value="">Select job…</option>
            {assignedJobs.map((j) => (
              <option key={j._id} value={j._id}>{j.title}</option>
            ))}
          </Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={logForm.log_date}
              onChange={(e) => setLogForm((p) => ({ ...p, log_date: e.target.value }))}
            />
            <Input
              label="Duration (minutes)"
              type="number"
              placeholder="e.g. 90"
              min="1"
              max="1440"
              value={logForm.duration_minutes}
              onChange={(e) => setLogForm((p) => ({ ...p, duration_minutes: e.target.value }))}
            />
          </div>
          <Input
            label="Note (optional)"
            placeholder="What did you work on?"
            value={logForm.note}
            onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))}
          />
          <div className="flex gap-2 justify-end pt-1 flex-wrap">
            <Btn variant="ghost" onClick={() => setLogModal(false)}>Cancel</Btn>
            <Btn
              onClick={handleLogTime}
              disabled={!logForm.job || !logForm.log_date || !logForm.duration_minutes || logTime.isPending}
            >
              {logTime.isPending ? "Saving…" : "Save Entry"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!editLog} onClose={() => setEditLog(null)} title="Edit Time Log">
        <div className="flex flex-col gap-3.5">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-[12px] text-gray-500 min-w-0">
            <span className="font-semibold text-gray-700">{editLog?.job?.title || "—"}</span>
            {" · "}{fmtDate(editLog?.log_date)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Duration (minutes)"
              type="number"
              min="1"
              max="1440"
              value={editForm.duration_minutes}
              onChange={(e) => setEditForm((p) => ({ ...p, duration_minutes: e.target.value }))}
            />
            <Input
              label="Note"
              placeholder="Update note…"
              value={editForm.note}
              onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
            />
          </div>
          <Input
            label="Reason for edit"
            placeholder="Why are you editing this log?"
            value={editForm.reason}
            onChange={(e) => setEditForm((p) => ({ ...p, reason: e.target.value }))}
          />
          <div className="flex gap-2 justify-end pt-1 flex-wrap">
            <Btn variant="ghost" onClick={() => setEditLog(null)}>Cancel</Btn>
            <Btn
              onClick={handleUpdateLog}
              disabled={!editForm.duration_minutes || updateTimeLog.isPending}
            >
              {updateTimeLog.isPending ? "Saving…" : "Save Changes"}
            </Btn>
          </div>
        </div>
      </Modal>

      <JobDetailModal jobId={selectedJobId} open={jobDetailOpen} onClose={() => setJobDetailOpen(false)} />
    </div>
  );
}