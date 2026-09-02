import React, { useState, useCallback, useEffect, useRef } from "react";
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
  useOrgAllTimeLogs,
  useOrgAllTimesheets,
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
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
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

const STATUS_STYLE = {
  draft: { text: "text-gray-400", bg: "bg-gray-50", label: "Draft" },
  pending_manager: { text: "text-amber-600", bg: "bg-amber-50", label: "Pending Manager" },
  pending_reporting_manager: { text: "text-amber-600", bg: "bg-amber-50", label: "Pending Review" },
  pending_admin: { text: "text-blue-600", bg: "bg-blue-50", label: "Pending Admin" },
  pending_superadmin: { text: "text-[#730042]", bg: "bg-[#730042]/[0.07]", label: "Pending SA" },
  approved: { text: "text-emerald-600", bg: "bg-emerald-50", label: "Approved" },
  rejected: { text: "text-red-600", bg: "bg-red-50", label: "Rejected" },
};

const PRIORITY_CHIP = {
  low: "text-gray-400 bg-gray-100",
  medium: "text-amber-600 bg-amber-50",
  high: "text-red-600 bg-red-50",
  urgent: "text-[#730042] bg-[#730042]/10",
};

const JOB_STATUS_DOT = {
  not_started: "bg-gray-400",
  in_progress: "bg-blue-600",
  on_hold: "bg-amber-600",
  completed: "bg-emerald-600",
  cancelled: "bg-red-600",
};

const JOB_STATUS_CHIP = {
  not_started: "text-gray-400 bg-gray-100",
  in_progress: "text-blue-600 bg-blue-50",
  on_hold: "text-amber-600 bg-amber-50",
  completed: "text-emerald-600 bg-emerald-50",
  cancelled: "text-red-600 bg-red-50",
};

const JOB_STATUS_BLOCK = {
  not_started: { bg: "bg-gray-400/10", border: "border-gray-400/30", text: "text-gray-400" },
  in_progress: { bg: "bg-blue-600/10", border: "border-blue-600/30", text: "text-blue-600" },
  on_hold: { bg: "bg-amber-600/10", border: "border-amber-600/30", text: "text-amber-600" },
  completed: { bg: "bg-emerald-600/10", border: "border-emerald-600/30", text: "text-emerald-600" },
  cancelled: { bg: "bg-red-600/10", border: "border-red-600/30", text: "text-red-600" },
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "team-jobs", label: "Team Jobs" },
  { id: "approvals", label: "Approvals" },
  { id: "insights", label: "Insights" },
  { id: "my-work", label: "My Work" },
  { id: "timesheets", label: "Timesheets" },
  { id: "org-logs", label: "All Logs" },
  { id: "org-sheets", label: "All Timesheets" },
];

function cn(...args) { return args.filter(Boolean).join(" "); }

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€" };
function fmtRate(rate, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency || ""} `;
  return `${symbol}${rate}/hr`;
}

function TorchXLogo() {
  return (
    <div className="flex items-center gap-2.5 shrink-0 min-w-0">
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#730042] flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z" fill="white" fillOpacity="0.95" />
          <circle cx="10" cy="8" r="2" fill="white" />
        </svg>
      </div>
      <div className="hidden sm:block min-w-0">
        <div className="font-bold text-[14px] text-gray-900 tracking-tight leading-none truncate">TorchX</div>
        <div className="text-[10px] text-gray-400 font-semibold tracking-[0.14em] truncate mt-0.5">TIMESHEET</div>
      </div>
    </div>
  );
}

function Badge({ status }) {
  const s = STATUS_STYLE[status] || { text: "text-gray-500", bg: "bg-gray-100", label: status };
  const dot = s.text.replace("text-", "bg-");
  return (
    <span className={`${s.text} ${s.bg} inline-flex items-center gap-1.5 rounded-md text-[10px] font-bold tracking-wide px-2 py-1 whitespace-nowrap shrink-0`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {s.label}
    </span>
  );
}

function Chip({ color = "brand", children }) {
  const map = {
    brand: "text-[#730042] bg-[#730042]/[0.08]",
    green: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    red: "text-red-700 bg-red-50",
    blue: "text-blue-700 bg-blue-50",
    gray: "text-gray-600 bg-gray-100",
  };
  return (
    <span className={`${map[color] || map.brand} rounded-md text-[10px] font-bold px-2 py-1 tracking-wide whitespace-nowrap shrink-0`}>
      {children}
    </span>
  );
}

function PriorityChip({ priority }) {
  return (
    <span className={`${PRIORITY_CHIP[priority] || PRIORITY_CHIP.low} rounded-md text-[10px] font-bold px-2 py-1 tracking-wide whitespace-nowrap shrink-0 capitalize`}>
      {priority}
    </span>
  );
}

function JobChip({ status }) {
  return (
    <span className={`${JOB_STATUS_CHIP[status] || "text-gray-600 bg-gray-100"} rounded-md text-[10px] font-bold px-2 py-1 tracking-wide whitespace-nowrap shrink-0 capitalize`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg min-w-0 ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ label, value, color = "text-[#730042]", sub }) {
  const barColor = color.replace("text-", "bg-");
  return (
    <Card className="relative overflow-hidden pl-4 pr-3.5 sm:pl-5 sm:pr-5 py-3.5 sm:py-5">
      <span className={`absolute top-0 left-0 h-full w-[3px] ${barColor}`} />
      <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 sm:mb-2.5 truncate">{label}</div>
      <div className={`text-xl sm:text-[26px] font-bold tracking-tight ${color} truncate`}>{value}</div>
      {sub && <div className="text-[10px] sm:text-[11px] text-gray-400 mt-1.5 truncate">{sub}</div>}
    </Card>
  );
}

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-900/45 flex items-center justify-center p-0 sm:p-4 overflow-hidden"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-gray-200 rounded-t-xl sm:rounded-xl w-full sm:w-[80%] md:w-auto sm:max-w-[540px] shadow-xl max-h-[92vh] sm:max-h-[90vh] flex flex-col mt-auto sm:mt-0 min-w-0">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-200 shrink-0 min-w-0">
          <span className="font-bold text-[15px] text-gray-900 truncate min-w-0">{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 text-lg bg-gray-100 hover:bg-gray-200 hover:text-gray-600 border-none rounded-md cursor-pointer shrink-0 transition-colors"
          >×</button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto overflow-x-hidden min-w-0">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</label>}
      {children}
    </div>
  );
}

const inputClass = "bg-white border border-gray-300 rounded-md px-3.5 py-2.5 text-[13px] text-gray-900 outline-none w-full max-w-full box-border font-inherit focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors min-h-[44px]";

function Input({ label, ...props }) {
  return (
    <Field label={label}>
      <input {...props} className={inputClass} />
    </Field>
  );
}

function Sel({ label, children, ...props }) {
  return (
    <Field label={label}>
      <select {...props} className={`${inputClass} appearance-none cursor-pointer`}>
        {children}
      </select>
    </Field>
  );
}

function Btn({ children, variant = "primary", onClick, disabled, className = "" }) {
  const variants = {
    primary: "bg-[#730042] text-white border border-transparent hover:bg-[#5c0034]",
    ghost: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    danger: "bg-white text-red-600 border border-red-300 hover:bg-red-50",
    success: "bg-white text-emerald-600 border border-emerald-300 hover:bg-emerald-50",
    amber: "bg-white text-amber-600 border border-amber-300 hover:bg-amber-50",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} rounded-md px-4 py-2.5 min-h-[44px] text-[13px] font-semibold whitespace-nowrap transition-colors inline-flex items-center justify-center gap-1.5 font-inherit ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
    >
      {children}
    </button>
  );
}

function JobDetailModal({ jobId, open, onClose }) {
  const { data, isLoading } = useJobById(jobId);
  const job = data?.job;
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Job Details">
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
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Assigned To</div>
              <div className="text-[13px] font-bold text-gray-900 truncate">{job.assigned_to_info?.name || "—"}</div>
              <div className="text-[11px] text-[#730042] font-semibold truncate">{job.assigned_to_info?.model === "User" ? "Employee" : (job.assigned_to_info?.role || job.assigned_to_info?.model || "")}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Assigned By</div>
              <div className="text-[13px] font-bold text-gray-900 truncate">{job.assigned_by_info?.name || "—"}</div>
              <div className="text-[11px] text-[#730042] font-semibold truncate">{job.assigned_by_info?.model === "User" ? "Employee" : (job.assigned_by_info?.role || job.assigned_by_info?.model || "")}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</div>
              <JobChip status={job.status} />
            </div>
            <div className="bg-gray-50 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Priority</div>
              <PriorityChip priority={job.priority} />
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
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-[11px] text-gray-400">Progress</span>
                <span className={cn("text-[11px] font-bold shrink-0", job.overrun_flagged ? "text-red-600" : "text-gray-600")}>
                  {Math.round((job.logged_hours_cache / job.estimated_hours) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", job.overrun_flagged ? "bg-red-500" : "bg-[#730042]")}
                  style={{ width: `${Math.min(100, (job.logged_hours_cache / job.estimated_hours) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {job.due_date && (
            <div className="text-[12px] text-gray-500">Due: <span className="font-semibold text-gray-700">{fmtDate(job.due_date)}</span></div>
          )}
          {job.work_items?.length > 0 && (
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Work Items</div>
              <div className="flex flex-col gap-1.5">
                {job.work_items.map((wi, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13px] min-w-0">
                    <span className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 text-[10px]",
                      wi.is_completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300")}>
                      {wi.is_completed && "✓"}
                    </span>
                    <span className={cn("min-w-0 break-words", wi.is_completed ? "line-through text-gray-400" : "text-gray-700")}>{wi.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {job.billable && (
            <div className="flex items-center gap-2 flex-wrap">
              <Chip color="green">Billable</Chip>
              {job.hourly_rate > 0 && <span className="text-[12px] text-gray-500">{fmtRate(job.hourly_rate, job.currency)}</span>}
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

function TimerWidget({ jobs }) {
  const { data: timerData, refetch: refetchTimer } = useActiveTimer({ refetchInterval: 30000 });
  const timer = timerData?.timer;
  const startTimerMut = useStartTimer();
  const pauseTimerMut = usePauseTimer();
  const resumeTimerMut = useResumeTimer();
  const stopTimerMut = useStopTimer();
  const discardTimerMut = useDiscardTimer();
  const heartbeat = useHeartbeatTimer();

  const [displaySecs, setDisplaySecs] = useState(0);
  const [startModal, setStartModal] = useState(false);
  const [startForm, setStartForm] = useState({ job: "", note: "" });
  const [stopModal, setStopModal] = useState(false);
  const [stopNote, setStopNote] = useState("");

  const tickRef = useRef(null);
  const heartbeatRef = useRef(null);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!timer) { setDisplaySecs(0); return; }
    if (timer.status === "paused") { setDisplaySecs(timer.accumulated_seconds || 0); return; }
    const compute = () => {
      const base = timer.accumulated_seconds || 0;
      const since = Math.floor((Date.now() - new Date(timer.last_heartbeat_at).getTime()) / 1000);
      setDisplaySecs(base + Math.max(0, since));
    };
    compute();
    tickRef.current = setInterval(compute, 1000);
    return () => clearInterval(tickRef.current);
  }, [timer?._id, timer?.status, timer?.accumulated_seconds, timer?.last_heartbeat_at]);

  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (!timer || timer.status !== "running") return;
    heartbeatRef.current = setInterval(() => heartbeat.mutate(), 60000);
    return () => clearInterval(heartbeatRef.current);
  }, [timer?._id, timer?.status]);

  const isRunning = timer?.status === "running";
  const isPaused = timer?.status === "paused";
  const activeJobs = (jobs || []).filter((j) => !["completed", "cancelled"].includes(j.status));

  return (
    <>
      <Card className="overflow-hidden">
        <div className={`px-4 sm:px-5 py-3.5 flex items-center gap-2.5 min-w-0 ${isRunning ? "bg-[#730042]" : "bg-gray-50"}`}>
          {isRunning && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
          <span className={`${isRunning ? "text-white/90" : "text-gray-400"} text-[11px] font-bold uppercase tracking-wide shrink-0`}>
            {isRunning ? "Timer Running" : isPaused ? "Timer Paused" : "No Active Timer"}
          </span>
          {timer?.job?.title && (
            <span className={`${isRunning ? "text-white/75" : "text-gray-400"} ml-auto text-xs overflow-hidden text-ellipsis whitespace-nowrap min-w-0 max-w-[120px] sm:max-w-[140px]`}>
              {timer.job.title}
            </span>
          )}
        </div>
        <div className="px-5 sm:px-6 py-5 min-w-0">
          <div className={`font-mono text-3xl sm:text-[42px] font-extrabold tracking-wider leading-none mb-4 select-none ${isRunning ? "text-[#730042]" : isPaused ? "text-amber-600" : "text-gray-200"}`}>
            {fmtSeconds(displaySecs)}
          </div>
          {!timer ? (
            <Btn onClick={() => setStartModal(true)} className="w-full sm:w-auto">▶ Start Timer</Btn>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {isRunning && <Btn variant="amber" onClick={() => pauseTimerMut.mutate({}, { onSuccess: refetchTimer })}>⏸ Pause</Btn>}
              {isPaused && <Btn onClick={() => resumeTimerMut.mutate({}, { onSuccess: refetchTimer })}>▶ Resume</Btn>}
              <Btn variant="success" onClick={() => setStopModal(true)}>■ Stop & Log</Btn>
              <Btn variant="danger" onClick={() => discardTimerMut.mutate({}, { onSuccess: refetchTimer })}>Discard</Btn>
            </div>
          )}
        </div>
      </Card>

      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Timer">
        <div className="flex flex-col gap-4">
          <Sel label="Job (assigned to me)" value={startForm.job} onChange={(e) => setStartForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select a job…</option>
            {activeJobs.map((j) => (
              <option key={j._id} value={j._id}>{j.title}</option>
            ))}
          </Sel>
          <Input label="Note (optional)" placeholder="What are you working on?" value={startForm.note} onChange={(e) => setStartForm((p) => ({ ...p, note: e.target.value }))} />
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setStartModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn
              onClick={() => startTimerMut.mutate({ job: startForm.job, note: startForm.note }, {
                onSuccess: () => { setStartModal(false); setStartForm({ job: "", note: "" }); refetchTimer(); }
              })}
              disabled={!startForm.job || startTimerMut.isPending}
              className="w-full sm:w-auto"
            >
              {startTimerMut.isPending ? "Starting…" : "▶ Start"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={stopModal} onClose={() => setStopModal(false)} title="Stop & Log Time">
        <div className="flex flex-col gap-4">
          <div className="bg-[#730042]/[0.07] border-[1.5px] border-[#730042]/15 rounded-xl px-4 sm:px-[18px] py-3.5 flex justify-between items-center gap-3 flex-wrap">
            <span className="text-xs text-[#730042] font-semibold">Elapsed Time</span>
            <span className="font-mono font-extrabold text-lg sm:text-xl text-[#730042]">{fmtSeconds(displaySecs)}</span>
          </div>
          <Input label="Note (optional)" placeholder="Brief description…" value={stopNote} onChange={(e) => setStopNote(e.target.value)} />
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setStopModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn
              variant="success"
              onClick={() => stopTimerMut.mutate({ note: stopNote }, {
                onSuccess: () => { setStopModal(false); setStopNote(""); refetchTimer(); }
              })}
              disabled={stopTimerMut.isPending}
              className="w-full sm:w-auto"
            >
              {stopTimerMut.isPending ? "Logging…" : "■ Log Time"}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}

function CalendarWeekGrid({ weekStart, weekDays, onAddLog }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card className="overflow-hidden">
      <div className="lg:hidden flex flex-col divide-y divide-gray-200">
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === today;
          const logs = weekDays[iso]?.logs || [];
          const mins = weekDays[iso]?.totalMinutes || 0;
          return (
            <div key={iso} className={`px-3.5 py-3 min-w-0 ${isToday ? "bg-[#730042]/[0.04]" : ""}`}>
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">{DAY_NAMES[i]}</span>
                  <span className={`text-sm font-extrabold ${isToday ? "text-[#730042]" : "text-gray-900"}`}>{d.getDate()}</span>
                </div>
                {mins > 0 && (
                  <span className="text-[10px] font-bold text-[#730042] bg-[#730042]/[0.07] rounded px-1.5 py-0.5 shrink-0">{fmtDuration(mins)}</span>
                )}
              </div>
              {logs.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2 min-w-0">
                  {logs.map((log) => (
                    <div key={log._id}
                      className={`${log.billable ? "bg-emerald-50 border-emerald-200 border-l-[3px] border-l-emerald-600" : "bg-[#730042]/[0.07] border-[#730042]/20 border-l-[3px] border-l-[#730042]"} border rounded-md px-2.5 py-2 min-w-0`}>
                      <div className="text-[12px] font-bold text-gray-900 truncate">{log.job?.title || "—"}</div>
                      <div className={`text-[11px] font-semibold mt-0.5 ${log.billable ? "text-emerald-600" : "text-[#730042]"}`}>{fmtDuration(log.duration_minutes)}</div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => onAddLog(iso)}
                className="bg-transparent border-[1.5px] border-dashed border-gray-200 rounded-md py-1.5 px-2 cursor-pointer text-gray-400 text-[11px] font-semibold w-full transition-colors hover:border-[#730042] hover:text-[#730042] min-h-[36px]"
              >+ Add</button>
            </div>
          );
        })}
      </div>

      <div className="hidden lg:block min-w-0">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {days.map((d, i) => {
            const iso = d.toISOString().slice(0, 10);
            const isToday = iso === today;
            const mins = weekDays[iso]?.totalMinutes || 0;
            return (
              <div key={iso} className={`px-2 pt-3 pb-2.5 text-center min-w-0 ${i < 6 ? "border-r border-gray-200" : ""} ${isToday ? "bg-[#730042]/[0.07]" : ""}`}>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{DAY_NAMES[i]}</div>
                <div className={`text-xl font-extrabold mt-1 ${isToday ? "text-[#730042]" : "text-gray-900"}`}>{d.getDate()}</div>
                {mins > 0
                  ? <div className="mt-1.5 text-[10px] font-bold text-[#730042] bg-[#730042]/[0.07] rounded px-1 py-0.5 truncate">{fmtDuration(mins)}</div>
                  : <div className="mt-1.5 h-[18px]" />}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 min-h-[160px]">
          {days.map((d, i) => {
            const iso = d.toISOString().slice(0, 10);
            const logs = weekDays[iso]?.logs || [];
            const isToday = iso === today;
            return (
              <div key={iso} className={`${i < 6 ? "border-r border-gray-200" : ""} ${isToday ? "bg-[#730042]/[0.02]" : ""} px-1.5 py-2 flex flex-col gap-1 min-w-0`}>
                {logs.map((log) => (
                  <div key={log._id} title={`${log.job?.title || "—"} · ${fmtDuration(log.duration_minutes)}`}
                    className={`${log.billable ? "bg-emerald-50 border-emerald-200 border-l-[3px] border-l-emerald-600" : "bg-[#730042]/[0.07] border-[#730042]/20 border-l-[3px] border-l-[#730042]"} border rounded-md px-[7px] py-1.5 cursor-default min-w-0`}>
                    <div className="text-[11px] font-bold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">{log.job?.title || "—"}</div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${log.billable ? "text-emerald-600" : "text-[#730042]"}`}>{fmtDuration(log.duration_minutes)}</div>
                  </div>
                ))}
                <button
                  onClick={() => onAddLog(iso)}
                  className="mt-auto bg-transparent border-[1.5px] border-dashed border-gray-200 rounded-md py-1 px-1 cursor-pointer text-gray-400 text-[11px] font-semibold w-full transition-colors hover:border-[#730042] hover:text-[#730042]"
                >+ Add</button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default function AdminTimesheet() {
  const [tab, setTab] = useState("overview");
  const [weekStart, setWeekStart] = useState(getMonday());
  const [jobModal, setJobModal] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [rejectModal, setRejectModal] = useState({ open: false, ts: null });
  const [rejectReason, setRejectReason] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [jobForm, setJobForm] = useState({ title: "", description: "", assigned_to: "", priority: "medium", estimated_hours: "", max_hours_per_day: "", billable: false, hourly_rate: "", due_date: "" });
  const [logForm, setLogForm] = useState({ job: "", log_date: new Date().toISOString().slice(0, 10), duration_minutes: "", note: "" });
  const [editJobModal, setEditJobModal] = useState(false);
  const [editJobForm, setEditJobForm] = useState({ id: "", title: "", description: "", priority: "medium", estimated_hours: "", max_hours_per_day: "", billable: false, hourly_rate: "", due_date: "" });

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

  const [logsWeek, setLogsWeek] = useState(weekStart);
  const [sheetsStatus, setSheetsStatus] = useState("");
  const [sheetsOwnerModel, setSheetsOwnerModel] = useState("");

  const { data: orgLogsData } = useOrgAllTimeLogs({ week_start: logsWeek });
  const { data: orgSheetsData } = useOrgAllTimesheets({
    ...(sheetsStatus ? { status: sheetsStatus } : {}),
    ...(sheetsOwnerModel ? { owner_model: sheetsOwnerModel } : {}),
  });
  const orgLogs = orgLogsData?.logs ?? [];
  const orgSheets = orgSheetsData?.timesheets ?? [];

  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const updateJobStatus = useUpdateJobStatus();
  const archiveJob = useArchiveJob();
  const logTime = useLogTime();
  const submitTS = useSubmitTimesheet();
  const approveTS = useApproveTimesheet();
  const rejectTS = useRejectTimesheet();
  const forwardTS = useForwardTimesheet();

  const shiftWeek = useCallback((dir) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  }, [weekStart]);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const openJobDetail = (jobId) => {
    setSelectedJobId(jobId);
    setJobDetailOpen(true);
  };

  const handleCreateJob = () => {
    if (!jobForm.title || !jobForm.assigned_to) return;
    const target = targets.find((t) => t.id === jobForm.assigned_to);
    createJob.mutate({
      title: jobForm.title, description: jobForm.description,
      assigned_to: jobForm.assigned_to, assigned_to_model: target?.model || "Manager",
      priority: jobForm.priority, estimated_hours: Number(jobForm.estimated_hours) || 0,
      max_hours_per_day: jobForm.max_hours_per_day === "" ? null : Number(jobForm.max_hours_per_day),
      billable: jobForm.billable, hourly_rate: Number(jobForm.hourly_rate) || 0,
      due_date: jobForm.due_date || null,
    }, {
      onSuccess: () => {
        setJobModal(false);
        setJobForm({ title: "", description: "", assigned_to: "", priority: "medium", estimated_hours: "", max_hours_per_day: "", billable: false, hourly_rate: "", due_date: "" });
        refetchCreated();
      },
    });
  };

  const handleLogTime = () => {
    logTime.mutate({ ...logForm, duration_minutes: Number(logForm.duration_minutes) }, {
      onSuccess: (res) => {
        setLogModal(false);
        setLogForm({ job: "", log_date: new Date().toISOString().slice(0, 10), duration_minutes: "", note: "" });
        refetchWeek();
        if (res?.warning) toast(res.warning, { icon: "⏱️", duration: 6000 });
      },
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

  const rootRef = useRef(null);

  useEffect(() => {
    const locked = [];
    const lock = (el) => {
      if (!el) return;
      locked.push({
        el,
        overflow: el.style.overflow,
        overflowY: el.style.overflowY,
        height: el.style.height,
        maxHeight: el.style.maxHeight,
        margin: el.style.margin,
      });
      el.style.overflow = "";
      el.style.overflowY = "hidden";
      el.style.height = "100%";
      el.style.maxHeight = "100%";
    };

    lock(document.documentElement);
    lock(document.body);
    document.body.style.margin = "0";

    let el = rootRef.current ? rootRef.current.parentElement : null;
    while (el && el !== document.body) {
      const cs = window.getComputedStyle(el);
      const isVerticallyScrollable =
        el.scrollHeight > el.clientHeight + 1 ||
        ["auto", "scroll"].includes(cs.overflowY) ||
        ["auto", "scroll"].includes(cs.overflow);
      if (isVerticallyScrollable) lock(el);
      el = el.parentElement;
    }

    return () => {
      locked.forEach(({ el, overflow, overflowY, height, maxHeight, margin }) => {
        el.style.overflow = overflow;
        el.style.overflowY = overflowY;
        el.style.height = height;
        el.style.maxHeight = maxHeight;
        if (margin !== undefined) el.style.margin = margin;
      });
    };
  }, []);

  return (
    <div ref={rootRef} className="h-full w-full min-h-0 min-w-0 max-w-full bg-gray-50 font-sans flex flex-col overflow-hidden">
    <header className="w-full bg-white border-b border-gray-200 shrink-0 z-20 min-w-0 max-w-full overflow-hidden">
  <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0 max-w-full">
    <div className="flex items-center h-14 sm:h-16 gap-3 min-w-0 max-w-full">

      <div className="shrink-0">
        <TorchXLogo />
      </div>

      <div className="hidden md:block w-px h-7 bg-gray-200 shrink-0" />

      <div className="flex-1 min-w-0 overflow-hidden self-stretch">
        <nav className="flex items-center gap-4 sm:gap-5 overflow-x-auto whitespace-nowrap no-scrollbar scroll-smooth h-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative shrink-0 h-full flex items-center px-0.5 text-xs sm:text-sm border-b-2 transition-colors ${
                tab === t.id
                  ? "text-[#730042] font-bold border-[#730042]"
                  : "text-gray-500 font-medium border-transparent hover:text-gray-800"
              }`}
            >
              {t.label}

              {t.id === "approvals" && approvals.length > 0 && (
                <span className="absolute -top-1 -right-2.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold">
                  {approvals.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

     
     
<div className="shrink-0">
  <button
    onClick={() => setJobModal(true)}
    className="
      flex items-center justify-center gap-2
      bg-[#730042] hover:bg-[#5c0034]
      text-white font-semibold
      rounded-md
      px-3 py-2
      sm:px-4 sm:py-2.5
      text-xs sm:text-sm
      whitespace-nowrap
      transition-colors
      min-h-[40px]
    "
  >
    <span className="text-base font-bold leading-none">+</span>
    <span className="hidden xs:inline">Create Job</span>
  </button>
</div>

    </div>
  </div>
</header>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-w-[1280px] mx-auto px-3 sm:px-6 py-5 sm:py-7 w-full min-w-0">

        {tab === "overview" && (
          <div className="flex flex-col gap-5 min-w-0">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 lg:gap-3.5">
              <StatCard label="Jobs Created" value={createdJobs.length} color="text-[#730042]" />
              <StatCard label="Pending Approvals" value={approvals.length} color="text-amber-600" />
              <StatCard label="Overrun Risk" value={overrunJobs.length} color="text-red-600" sub="≥75% estimate used" />
              <StatCard label="Idle Jobs" value={idleJobs.length} color="text-gray-400" sub="7+ days inactive" />
              <StatCard label="My Hours This Week" value={fmtDuration(totalWeekMins)} color="text-emerald-600" />
            </div>

            {approvals.length > 0 && (
              <Card>
                <div className="px-4 sm:px-[22px] py-3.5 border-b border-gray-200 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900">Pending Approvals</span>
                  <Chip color="amber">{approvals.length} waiting</Chip>
                </div>
                {approvals.slice(0, 3).map((ts) => (
                  <div key={ts._id} className="px-4 sm:px-[22px] py-3 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-3.5 min-w-0">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-[#730042]/[0.07] rounded-[10px] flex items-center justify-center text-[13px] font-extrabold text-[#730042] shrink-0">
                        {(ts.owner?.f_name?.[0] || "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-gray-900 truncate">{ts.owner?.f_name} {ts.owner?.l_name}</div>
                        <div className="text-[11px] text-gray-400 truncate">Week of {fmtDate(ts.week_start)} · {fmtDuration(ts.total_minutes)}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Btn variant="success" onClick={() => approveTS.mutate({ timesheetId: ts._id, remarks: "Approved" }, { onSuccess: refetchApprovals })} className="flex-1 sm:flex-none">Approve</Btn>
                      <Btn variant="danger" onClick={() => setRejectModal({ open: true, ts })} className="flex-1 sm:flex-none">Reject</Btn>
                    </div>
                  </div>
                ))}
                {approvals.length > 3 && (
                  <div className="px-4 sm:px-[22px] py-3">
                    <button onClick={() => setTab("approvals")} className="text-xs text-[#730042] bg-transparent border-none cursor-pointer font-semibold">
                      View all {approvals.length} pending →
                    </button>
                  </div>
                )}
              </Card>
            )}

            <Card>
              <div className="px-4 sm:px-[22px] py-3.5 border-b border-gray-200">
                <span className="text-sm font-bold text-gray-900">Jobs by Status</span>
              </div>
              <div className="px-4 sm:px-[22px] py-4 grid grid-cols-2 lg:grid-cols-5 gap-2.5">
                {["not_started", "in_progress", "on_hold", "completed", "cancelled"].map((s) => {
                  const count = createdJobs.filter((j) => j.status === s).length;
                  const block = JOB_STATUS_BLOCK[s];
                  return (
                    <div key={s} className={`${block.bg} border ${block.border} rounded-xl px-3 py-3.5 text-center min-w-0`}>
                      <div className={`text-xl sm:text-[22px] font-black ${block.text}`}>{count}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${block.text} truncate`}>{s.replace(/_/g, " ")}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === "team-jobs" && (
          <div className="min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-5 gap-3">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">Team Jobs</h1>
                <p className="text-[13px] text-gray-400 mt-1 mb-0">{createdJobs.length} jobs created by you</p>
              </div>
              <Btn onClick={() => setJobModal(true)} className="w-full sm:w-auto">+ Create Job</Btn>
            </div>

            <div className="mb-6">
              <div className="text-sm font-bold text-gray-900 mb-2.5">My Jobs</div>
              <p className="text-[12px] text-gray-400 -mt-2 mb-2.5">{assignedJobs.length} jobs assigned to you</p>
              {assignedJobs.length === 0 ? (
                <Card className="px-6 sm:px-8 py-8 sm:py-10 text-center">
                  <div className="text-3xl mb-2">📭</div>
                  <div className="font-bold text-sm text-gray-900">No jobs assigned to you</div>
                  <div className="text-[12px] text-gray-400 mt-1">Jobs assigned to you will show up here</div>
                </Card>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {assignedJobs.map((j) => (
                    <Card key={j._id} className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-start gap-3.5">
                      <div className="flex gap-3.5 flex-1 min-w-0">
                        <div className={`w-1 rounded ${JOB_STATUS_DOT[j.status] || "bg-gray-400"} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <button
                            className="text-sm font-bold text-gray-900 hover:text-[#730042] transition-colors text-left mb-1.5"
                            onClick={() => openJobDetail(j._id)}
                          >
                            {j.title}
                          </button>
                          <div className="flex gap-2 flex-wrap">
                            <PriorityChip priority={j.priority} />
                            <JobChip status={j.status} />
                            {j.billable && <Chip color="green">Billable</Chip>}
                            {j.estimated_hours > 0 && <Chip color="blue">{j.logged_hours_cache}h / {j.estimated_hours}h</Chip>}
                          </div>
                          {j.estimated_hours > 0 && (
                            <div className="mt-2 flex items-center gap-2 min-w-0">
                              <div className="w-20 sm:w-[120px] h-1 bg-gray-50 rounded-full shrink-0">
                                <div className={`h-full rounded-full ${j.overrun_flagged ? "bg-red-600" : "bg-[#730042]"}`} style={{ width: `${Math.min(100, (j.logged_hours_cache / j.estimated_hours) * 100)}%` }} />
                              </div>
                              <span className={`text-[10px] shrink-0 ${j.overrun_flagged ? "text-red-600" : "text-gray-400"}`}>
                                {Math.round((j.logged_hours_cache / j.estimated_hours) * 100)}% used
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 sm:self-start">
                        <button onClick={() => openJobDetail(j._id)} className="bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors px-3 py-1.5 text-[11px] font-semibold cursor-pointer">View</button>
                        {!["completed", "cancelled"].includes(j.status) && (
                          <button onClick={() => updateJobStatus.mutate({ id: j._id, status: "completed" }, { onSuccess: refetchCreated })} className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors px-3 py-1.5 text-[11px] font-semibold cursor-pointer">Complete</button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="text-sm font-bold text-gray-900 mb-2.5">Assigned by Me</div>
            <div className="flex flex-col gap-2.5">
              {createdJobs.length === 0 ? (
                <Card className="px-6 sm:px-8 py-12 sm:py-16 text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <div className="font-bold text-base text-gray-900 mb-3">No jobs created yet</div>
                  <Btn onClick={() => setJobModal(true)}>+ Create First Job</Btn>
                </Card>
              ) : (
                createdJobs.map((j) => {
                  const assigneeInfo = j.assigned_to_info;
                  return (
                    <Card key={j._id} className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-start gap-3.5">
                      <div className="flex gap-3.5 flex-1 min-w-0">
                        <div className={`w-1 rounded ${JOB_STATUS_DOT[j.status] || "bg-gray-400"} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <button
                            className="text-sm font-bold text-gray-900 hover:text-[#730042] transition-colors text-left mb-1.5 break-words"
                            onClick={() => openJobDetail(j._id)}
                          >
                            {j.title}
                          </button>
                          {assigneeInfo && (
                            <div className="text-[11px] text-gray-400 mb-1.5 truncate">
                              Assigned to <span className="font-semibold text-gray-700">{assigneeInfo.name}</span>
                              <span className="text-[#730042] font-semibold"> · {assigneeInfo.role || assigneeInfo.model}</span>
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            <PriorityChip priority={j.priority} />
                            <JobChip status={j.status} />
                            {j.billable && <Chip color="green">Billable</Chip>}
                            {j.estimated_hours > 0 && <Chip color="blue">{j.logged_hours_cache}h / {j.estimated_hours}h</Chip>}
                          </div>
                          {j.estimated_hours > 0 && (
                            <div className="mt-2 flex items-center gap-2 min-w-0">
                              <div className="w-20 sm:w-[120px] h-1 bg-gray-50 rounded-full shrink-0">
                                <div className={`h-full rounded-full ${j.overrun_flagged ? "bg-red-600" : "bg-[#730042]"}`} style={{ width: `${Math.min(100, (j.logged_hours_cache / j.estimated_hours) * 100)}%` }} />
                              </div>
                              <span className={`text-[10px] shrink-0 ${j.overrun_flagged ? "text-red-600" : "text-gray-400"}`}>
                                {Math.round((j.logged_hours_cache / j.estimated_hours) * 100)}% used
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap shrink-0 sm:self-start">
                        <button onClick={() => openJobDetail(j._id)} className="bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors px-3 py-1.5 min-h-[36px] text-[11px] font-semibold cursor-pointer">View</button>
                        <button onClick={() => openEditJob(j)} className="bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 min-h-[36px] text-[11px] font-semibold cursor-pointer">Edit</button>
                        {!["completed", "cancelled"].includes(j.status) && (
                          <button onClick={() => updateJobStatus.mutate({ id: j._id, status: "completed" }, { onSuccess: refetchCreated })} className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors px-3 py-1.5 min-h-[36px] text-[11px] font-semibold cursor-pointer">Complete</button>
                        )}
                        <button onClick={() => archiveJob.mutate(j._id, { onSuccess: refetchCreated })} className="bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors px-3 py-1.5 min-h-[36px] text-[11px] font-semibold cursor-pointer">Archive</button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tab === "approvals" && (
          <div className="min-w-0">
            <div className="mb-5">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">Timesheet Approvals</h1>
              <p className="text-[13px] text-gray-400 mt-1 mb-0">{approvals.length} pending your review</p>
            </div>
            {approvals.length === 0 ? (
              <Card className="px-6 sm:px-8 py-12 sm:py-16 text-center">
                <div className="text-4xl mb-3">✅</div>
                <div className="font-bold text-base text-gray-900">All clear — no pending approvals</div>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {approvals.map((ts) => (
                  <Card key={ts._id} className="px-4 sm:px-6 py-5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex gap-3.5 min-w-0">
                        <div className="w-10 h-10 sm:w-[42px] sm:h-[42px] bg-[#730042]/[0.07] rounded-xl flex items-center justify-center text-base font-extrabold text-[#730042] shrink-0">
                          {ts.owner?.f_name?.[0] || "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold text-gray-900 truncate">{ts.owner?.f_name} {ts.owner?.l_name}</div>
                          <div className="text-xs text-gray-400 mt-0.5 break-all">{ts.owner?.work_email}</div>
                          <div className="text-xs text-gray-400 mt-0.5">Week: {fmtDate(ts.week_start)} – {fmtDate(ts.week_end)}</div>
                          <div className="flex gap-2 mt-2.5 flex-wrap">
                            <Chip color="brand">{fmtDuration(ts.total_minutes)}</Chip>
                            {ts.overtime_minutes > 0 && <Chip color="amber">{fmtDuration(ts.overtime_minutes)} overtime</Chip>}
                            {ts.billable_minutes > 0 && <Chip color="green">{fmtDuration(ts.billable_minutes)} billable</Chip>}
                            <Badge status={ts.status} />
                          </div>
                          {ts.total_billed_amount > 0 && (
                            <div className="text-xs font-bold text-emerald-600 mt-2">₹{ts.total_billed_amount.toFixed(2)} billed</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap shrink-0">
                        <Btn variant="success" onClick={() => approveTS.mutate({ timesheetId: ts._id, remarks: "Approved by Admin" }, { onSuccess: refetchApprovals })} className="flex-1 sm:flex-none">Approve</Btn>
                        <Btn variant="amber" onClick={() => forwardTS.mutate({ timesheetId: ts._id, remarks: "Forwarded to SuperAdmin" }, { onSuccess: refetchApprovals })} className="flex-1 sm:flex-none">Forward to SA</Btn>
                        <Btn variant="danger" onClick={() => setRejectModal({ open: true, ts })} className="flex-1 sm:flex-none">Reject</Btn>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "insights" && (
          <div className="flex flex-col gap-5 min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">Insights</h1>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-[10px] px-2.5 py-1.5 self-start sm:self-auto">
                <button onClick={() => shiftWeek(-1)} className="bg-transparent border-none cursor-pointer text-gray-700 text-base flex items-center min-h-[28px] min-w-[28px] justify-center">‹</button>
                <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                  {fmtShort(weekStart)} – {fmtShort(weekEnd)}
                </span>
                <button onClick={() => shiftWeek(1)} className="bg-transparent border-none cursor-pointer text-gray-700 text-base flex items-center min-h-[28px] min-w-[28px] justify-center">›</button>
              </div>
            </div>

            <Card>
              <div className="px-4 sm:px-[22px] py-3.5 border-b border-gray-200">
                <div className="text-sm font-bold text-gray-900">Team Workload Heatmap</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Daily capacity usage (8h = 100%)</div>
              </div>
              <div className="px-3 sm:px-[22px] py-4 min-w-0">
                {heatmap.length === 0 ? (
                  <div className="text-center text-gray-400 text-[13px] py-6">No team data for this week</div>
                ) : (
                  <>
                    <div className="lg:hidden flex flex-col gap-3">
                      {heatmap.map((row, i) => {
                        const dayKeys = Array.from({ length: 7 }, (_, d) => {
                          const dt = new Date(weekStart);
                          dt.setDate(dt.getDate() + d);
                          return dt.toISOString().slice(0, 10);
                        });
                        const meta = [row.empid, row.department, row.designation].filter(Boolean).join(" • ");
                        return (
                          <div key={i} className="border border-gray-100 rounded-xl p-2.5 min-w-0">
                            <div className="flex items-center gap-2 mb-2 min-w-0">
                              <div className="w-7 h-7 bg-[#730042]/[0.07] rounded-full flex items-center justify-center text-[10px] font-extrabold text-[#730042] shrink-0">
                                {row.name ? row.name.slice(0, 2).toUpperCase() : String(row.person).slice(-2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[12px] font-semibold text-gray-900 truncate">{row.name || row.person}</div>
                                {meta && <div className="text-[10px] text-gray-400 truncate">{meta}</div>}
                              </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {dayKeys.map((dk, di) => {
                                const pct = row.days[dk]?.loadPercent || 0;
                                const bg = pct === 0 ? "bg-gray-50" : pct < 60 ? "bg-emerald-100" : pct < 90 ? "bg-amber-100" : "bg-red-100";
                                const col = pct === 0 ? "text-gray-400" : pct < 60 ? "text-emerald-600" : pct < 90 ? "text-amber-600" : "text-red-600";
                                return (
                                  <div key={dk} className="flex flex-col items-center gap-0.5 min-w-0">
                                    <span className="text-[8px] text-gray-400 font-bold">{DAY_NAMES[di][0]}</span>
                                    <div title={`${pct}%`} className={`w-full aspect-square ${bg} rounded flex items-center justify-center text-[8px] font-bold ${col}`}>
                                      {pct > 0 ? pct : "—"}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="hidden lg:block min-w-0">
                      <div className="flex items-center gap-2.5 mb-2.5 pl-[7.5rem]">
                        {DAY_NAMES.map((d) => (
                          <div key={d} className="flex-1 text-center text-[10px] text-gray-400 font-bold">{d}</div>
                        ))}
                      </div>
                      {heatmap.map((row, i) => {
                        const dayKeys = Array.from({ length: 7 }, (_, d) => {
                          const dt = new Date(weekStart);
                          dt.setDate(dt.getDate() + d);
                          return dt.toISOString().slice(0, 10);
                        });
                        const meta = [row.empid, row.department, row.designation].filter(Boolean).join(" • ");
                        return (
                          <div key={i} className="flex items-center gap-2.5 mb-2">
                            <div className="w-8 h-8 bg-[#730042]/[0.07] rounded-full flex items-center justify-center text-[11px] font-extrabold text-[#730042] shrink-0">
                              {row.name ? row.name.slice(0, 2).toUpperCase() : String(row.person).slice(-2).toUpperCase()}
                            </div>
                            <div className="w-[7.5rem] min-w-0 shrink-0 pr-2">
                              <div className="text-[11px] font-semibold text-gray-800 truncate">{row.name || row.person}</div>
                              {meta && <div className="text-[9px] text-gray-400 truncate">{meta}</div>}
                            </div>
                            {dayKeys.map((dk) => {
                              const pct = row.days[dk]?.loadPercent || 0;
                              const bg = pct === 0 ? "bg-gray-50" : pct < 60 ? "bg-emerald-100" : pct < 90 ? "bg-amber-100" : "bg-red-100";
                              const col = pct === 0 ? "text-gray-400" : pct < 60 ? "text-emerald-600" : pct < 90 ? "text-amber-600" : "text-red-600";
                              return (
                                <div key={dk} title={`${pct}%`} className={`flex-1 h-[34px] ${bg} rounded-lg flex items-center justify-center text-[10px] font-bold ${col}`}>
                                  {pct > 0 ? `${pct}%` : "—"}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <div className="px-4 sm:px-[22px] py-3.5 border-b border-gray-200 flex items-center gap-2">
                  <span className="text-sm font-bold text-red-600">⚠ Overrun Risk</span>
                  <Chip color="red">{overrunJobs.length}</Chip>
                </div>
                {overrunJobs.length === 0 ? (
                  <div className="px-4 sm:px-[22px] py-5 text-[13px] text-gray-400">No jobs at risk</div>
                ) : overrunJobs.map((j) => (
                  <div key={j._id} className="px-4 sm:px-[22px] py-3 border-b border-gray-200 flex items-center gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-gray-900 truncate">{j.title}</div>
                      <div className="text-[11px] text-gray-400">{j.logged_hours_cache}h / {j.estimated_hours}h</div>
                    </div>
                    <span className={`text-[13px] font-extrabold shrink-0 ${j.riskPercent >= 100 ? "text-red-600" : "text-amber-600"}`}>{j.riskPercent}%</span>
                  </div>
                ))}
              </Card>

              <Card>
                <div className="px-4 sm:px-[22px] py-3.5 border-b border-gray-200 flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">💤 Idle Jobs</span>
                  <Chip color="gray">{idleJobs.length}</Chip>
                </div>
                {idleJobs.length === 0 ? (
                  <div className="px-4 sm:px-[22px] py-5 text-[13px] text-gray-400">No idle jobs</div>
                ) : idleJobs.map((j) => (
                  <div key={j._id} className="px-4 sm:px-[22px] py-3 border-b border-gray-200 flex items-center gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-gray-900 truncate">{j.title}</div>
                      <div className="text-[11px] text-gray-400">Last updated {fmtDate(j.updatedAt)}</div>
                    </div>
                    <JobChip status={j.status} />
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {tab === "my-work" && (
          <div className="flex flex-col gap-4 min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">My Work</h1>
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-[10px] px-2.5 py-1.5">
                  <button onClick={() => shiftWeek(-1)} className="bg-transparent border-none cursor-pointer text-gray-700 text-base flex min-h-[28px] min-w-[28px] justify-center items-center">‹</button>
                  <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                    {fmtShort(weekStart)} – {fmtShort(weekEnd)}
                  </span>
                  <button onClick={() => shiftWeek(1)} className="bg-transparent border-none cursor-pointer text-gray-700 text-base flex min-h-[28px] min-w-[28px] justify-center items-center">›</button>
                </div>
                <Btn onClick={() => setLogModal(true)}>+ Log Time</Btn>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 sm:gap-5 min-w-0">
              <TimerWidget jobs={assignedJobs} />
              <div className="flex flex-col gap-3.5 min-w-0">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: "Total", value: fmtDuration(totalWeekMins), color: "text-[#730042]" },
                    { label: "Billable", value: fmtDuration(prodData?.billableMinutes || 0), color: "text-emerald-600" },
                    { label: "Capacity", value: `${prodData?.capacityPercent || Math.round((totalWeekMins / 2400) * 100)}%`, color: "text-blue-600" },
                  ].map((s) => (
                    <Card key={s.label} className="px-2 sm:px-[18px] py-3 sm:py-4">
                      <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 truncate">{s.label}</div>
                      <div className={`text-sm sm:text-[22px] font-black ${s.color} truncate`}>{s.value}</div>
                    </Card>
                  ))}
                </div>
                <CalendarWeekGrid
                  weekStart={weekStart}
                  weekDays={weekDays}
                  onAddLog={(date) => { setLogForm((p) => ({ ...p, log_date: date })); setLogModal(true); }}
                />
                <div className="flex justify-end">
                  <Btn onClick={() => submitTS.mutate({ week_start: weekStart }, { onSuccess: () => { refetchTS(); refetchWeek(); } })} disabled={submitTS.isPending} className="w-full sm:w-auto">
                    {submitTS.isPending ? "Submitting…" : "Submit Week for Approval"}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "timesheets" && (
          <div className="min-w-0">
            <div className="mb-5">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">My Timesheets</h1>
            </div>
            <div className="flex flex-col gap-2.5">
              {timesheets.length === 0 ? (
                <Card className="px-6 sm:px-8 py-12 sm:py-16 text-center">
                  <div className="font-bold text-base text-gray-900 mb-3">No timesheets yet</div>
                  <Btn onClick={() => setTab("my-work")}>Go to My Work</Btn>
                </Card>
              ) : timesheets.map((ts) => (
                <Card key={ts._id} className="px-4 sm:px-6 py-4 sm:py-[18px] flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 mb-1.5">Week of {fmtDate(ts.week_start)}</div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge status={ts.status} />
                      <Chip color="brand">{fmtDuration(ts.total_minutes)}</Chip>
                      {ts.billable_minutes > 0 && <Chip color="green">{fmtDuration(ts.billable_minutes)} billable</Chip>}
                    </div>
                  </div>
                  {ts.remarks && <div className="text-xs text-gray-700 italic break-words min-w-0">"{ts.remarks}"</div>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {tab === "org-logs" && (
          <div className="min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-5 gap-3">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">All Time Logs — Organisation</h1>
                <p className="text-xs text-gray-400 mt-1 mb-0">
                  {orgLogs.length} entries · {Math.floor((orgLogsData?.totalMinutes || 0) / 60)}h {(orgLogsData?.totalMinutes || 0) % 60}m total
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 shrink-0">Week of</span>
                <input type="date" value={logsWeek} onChange={e => setLogsWeek(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-1.5 min-h-[36px] text-xs text-gray-900 outline-none w-full sm:w-auto focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors" />
              </div>
            </div>
            {orgLogs.length === 0 ? (
              <Card className="px-6 sm:px-8 py-12 sm:py-16 text-center">
                <div className="font-bold text-base text-gray-900 mb-2">No logs found</div>
                <div className="text-gray-400 text-[13px]">No time entries across the org for this week</div>
              </Card>
            ) : (
              <>
                <div className="lg:hidden flex flex-col gap-2.5">
                  {orgLogs.map(log => (
                    <Card key={log._id} className="px-3.5 py-3">
                      <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
                        <span className="text-[13px] font-bold text-gray-900 truncate min-w-0">
                          {log.logged_by?.f_name || "—"} {log.logged_by?.l_name || ""}
                        </span>
                        <Badge status={log.status} />
                      </div>
                      <div className="text-[12px] text-gray-700 mb-2 truncate">{log.job?.title || "—"}</div>
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex gap-1.5 flex-wrap">
                          <Chip color="brand">{log.logged_by_model === "User" ? "Employee" : log.logged_by_model}</Chip>
                          <Chip color={log.entry_mode === "timer" ? "blue" : "gray"}>{log.entry_mode}</Chip>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-gray-400">{fmtDate(log.log_date)}</span>
                          <span className="font-bold text-emerald-600">{fmtDuration(log.duration_minutes)}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="hidden lg:block overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px] min-w-[760px]">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200">
                          {["Member", "Role", "Job", "Date", "Duration", "Mode", "Status"].map(h => (
                            <th key={h} className="text-left px-4 py-3 font-bold text-[11px] text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orgLogs.map(log => (
                          <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                              {log.logged_by?.f_name || "—"} {log.logged_by?.l_name || ""}
                            </td>
                            <td className="px-4 py-3"><Chip color="brand">{log.logged_by_model === "User" ? "Employee" : log.logged_by_model}</Chip></td>
                            <td className="px-4 py-3 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap text-gray-700">{log.job?.title || "—"}</td>
                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(log.log_date)}</td>
                            <td className="px-4 py-3 font-bold text-emerald-600 whitespace-nowrap">{fmtDuration(log.duration_minutes)}</td>
                            <td className="px-4 py-3"><Chip color={log.entry_mode === "timer" ? "blue" : "gray"}>{log.entry_mode}</Chip></td>
                            <td className="px-4 py-3"><Badge status={log.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {tab === "org-sheets" && (
          <div className="min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-5 gap-3">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">All Timesheets — Organisation</h1>
                <p className="text-xs text-gray-400 mt-1 mb-0">{orgSheets.length} timesheets</p>
              </div>
              <div className="flex gap-2 flex-col xs:flex-row">
                <select value={sheetsStatus} onChange={e => setSheetsStatus(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-1.5 min-h-[40px] text-xs text-gray-900 outline-none flex-1 sm:flex-none focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors">
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_STYLE).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <select value={sheetsOwnerModel} onChange={e => setSheetsOwnerModel(e.target.value)} className="bg-white border border-gray-300 rounded-md px-3 py-1.5 min-h-[40px] text-xs text-gray-900 outline-none flex-1 sm:flex-none focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors">
                  <option value="">All Roles</option>
                  <option value="User">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            {orgSheets.length === 0 ? (
              <Card className="px-6 sm:px-8 py-12 sm:py-16 text-center">
                <div className="font-bold text-base text-gray-900 mb-2">No timesheets found</div>
                <div className="text-gray-400 text-[13px]">Adjust filters to view timesheets</div>
              </Card>
            ) : (
              <div className="flex flex-col gap-2.5">
                {orgSheets.map(ts => (
                  <Card key={ts._id} className="px-4 sm:px-6 py-4 sm:py-[18px]">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[15px] text-gray-900 truncate">{ts.owner?.f_name} {ts.owner?.l_name}</span>
                          <Chip color="brand">{ts.owner_model === "User" ? "Employee" : ts.owner_model}</Chip>
                          <Badge status={ts.status} />
                        </div>
                        <div className="text-xs text-gray-400 break-all">{ts.owner?.work_email} · Week of {fmtDate(ts.week_start)}</div>
                        {ts.remarks && <div className="text-xs text-gray-700 italic mt-1.5 break-words">"{ts.remarks}"</div>}
                      </div>
                      <div className="flex gap-4 shrink-0 flex-wrap">
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-extrabold text-[#730042]">{fmtDuration(ts.total_minutes)}</div>
                          <div className="text-[11px] text-gray-400">total</div>
                        </div>
                        {ts.overtime_minutes > 0 && (
                          <div className="text-right">
                            <div className="text-base sm:text-lg font-extrabold text-amber-600">{fmtDuration(ts.overtime_minutes)}</div>
                            <div className="text-[11px] text-gray-400">overtime</div>
                          </div>
                        )}
                        {ts.billable_minutes > 0 && (
                          <div className="text-right">
                            <div className="text-base sm:text-lg font-extrabold text-emerald-600">{fmtDuration(ts.billable_minutes)}</div>
                            <div className="text-[11px] text-gray-400">billable</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Modal open={jobModal} onClose={() => setJobModal(false)} title="Create Job">
        <div className="flex flex-col gap-4">
          <Input label="Job Title *" placeholder="e.g. Design Login Page" value={jobForm.title} onChange={(e) => setJobForm((p) => ({ ...p, title: e.target.value }))} />
          <Input label="Description" placeholder="Job details…" value={jobForm.description} onChange={(e) => setJobForm((p) => ({ ...p, description: e.target.value }))} />
          <Sel label="Assign To *" value={jobForm.assigned_to} onChange={(e) => setJobForm((p) => ({ ...p, assigned_to: e.target.value }))}>
            <option value="">Select team member…</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.model === "User" ? "Employee" : (t.role || t.model)}
              </option>
            ))}
          </Sel>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <Sel label="Priority" value={jobForm.priority} onChange={(e) => setJobForm((p) => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Sel>
            <Input label="Est. Hours" type="number" min="0" placeholder="0" value={jobForm.estimated_hours} onChange={(e) => setJobForm((p) => ({ ...p, estimated_hours: nonNegative(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <Input label="Hourly Rate (₹)" type="number" min="0" placeholder="0" value={jobForm.hourly_rate} onChange={(e) => setJobForm((p) => ({ ...p, hourly_rate: nonNegative(e.target.value) }))} />
            <Input label="Due Date" type="date" value={jobForm.due_date} onChange={(e) => setJobForm((p) => ({ ...p, due_date: e.target.value }))} />
          </div>
          <div>
            <Input label="Max Hours / Day" type="number" step="0.5" min="0.5" max="24" placeholder="e.g. 7" value={jobForm.max_hours_per_day} onChange={(e) => setJobForm((p) => ({ ...p, max_hours_per_day: nonNegative(e.target.value) }))} />
            <p className="text-[11px] text-gray-500 mt-1">Time logged beyond this per day is counted as overtime. Leave blank to use the employee's shift hours instead.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={jobForm.billable} onChange={(e) => setJobForm((p) => ({ ...p, billable: e.target.checked }))} className="w-[15px] h-[15px] accent-[#730042] shrink-0" />
            <span className="text-[13px] text-gray-700">Billable job</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setJobModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleCreateJob} disabled={!jobForm.title || !jobForm.assigned_to || createJob.isPending} className="w-full sm:w-auto">
              {createJob.isPending ? "Creating…" : "Create Job"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={editJobModal} onClose={() => setEditJobModal(false)} title="Edit Job">
        <div className="flex flex-col gap-4">
          <Input label="Job Title *" placeholder="e.g. Design Login Page" value={editJobForm.title} onChange={(e) => setEditJobForm((p) => ({ ...p, title: e.target.value }))} />
          <Input label="Description" placeholder="Job details…" value={editJobForm.description} onChange={(e) => setEditJobForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <Sel label="Priority" value={editJobForm.priority} onChange={(e) => setEditJobForm((p) => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Sel>
            <Input label="Est. Hours" type="number" min="0" placeholder="0" value={editJobForm.estimated_hours} onChange={(e) => setEditJobForm((p) => ({ ...p, estimated_hours: nonNegative(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <Input label="Hourly Rate (₹)" type="number" min="0" placeholder="0" value={editJobForm.hourly_rate} onChange={(e) => setEditJobForm((p) => ({ ...p, hourly_rate: nonNegative(e.target.value) }))} />
            <Input label="Due Date" type="date" value={editJobForm.due_date} onChange={(e) => setEditJobForm((p) => ({ ...p, due_date: e.target.value }))} />
          </div>
          <div>
            <Input label="Max Hours / Day" type="number" step="0.5" min="0.5" max="24" placeholder="e.g. 7" value={editJobForm.max_hours_per_day} onChange={(e) => setEditJobForm((p) => ({ ...p, max_hours_per_day: nonNegative(e.target.value) }))} />
            <p className="text-[11px] text-gray-500 mt-1">Time logged beyond this per day is counted as overtime. Leave blank to use the employee's shift hours instead.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={editJobForm.billable} onChange={(e) => setEditJobForm((p) => ({ ...p, billable: e.target.checked }))} className="w-[15px] h-[15px] accent-[#730042] shrink-0" />
            <span className="text-[13px] text-gray-700">Billable job</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setEditJobModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleUpdateJob} disabled={!editJobForm.title || updateJob.isPending} className="w-full sm:w-auto">
              {updateJob.isPending ? "Saving…" : "Save Changes"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Time">
        <div className="flex flex-col gap-4">
          <Sel label="Job" value={logForm.job} onChange={(e) => setLogForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select job…</option>
            {assignedJobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Sel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date" type="date" value={logForm.log_date} onChange={(e) => setLogForm((p) => ({ ...p, log_date: e.target.value }))} />
            <Input label="Duration (minutes)" type="number" min="1" placeholder="e.g. 90" value={logForm.duration_minutes} onChange={(e) => setLogForm((p) => ({ ...p, duration_minutes: nonNegative(e.target.value) }))} />
          </div>
          <Input label="Note" placeholder="What did you work on?" value={logForm.note} onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))} />
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setLogModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleLogTime} disabled={!logForm.job || !logForm.duration_minutes || logTime.isPending} className="w-full sm:w-auto">
              {logTime.isPending ? "Logging…" : "Save Entry"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, ts: null })} title="Reject Timesheet">
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-gray-700 m-0">Provide a reason for rejection.</p>
          <Input label="Reason *" placeholder="Enter reason…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setRejectModal({ open: false, ts: null })} className="w-full sm:w-auto">Cancel</Btn>
            <Btn variant="danger"
              onClick={() => rejectTS.mutate({ timesheetId: rejectModal.ts._id, remarks: rejectReason }, {
                onSuccess: () => { setRejectModal({ open: false, ts: null }); setRejectReason(""); refetchApprovals(); }
              })}
              disabled={!rejectReason || rejectTS.isPending}
              className="w-full sm:w-auto"
            >
              {rejectTS.isPending ? "Rejecting…" : "Reject"}
              
            </Btn>
          </div>
        </div>
      </Modal>

      <JobDetailModal jobId={selectedJobId} open={jobDetailOpen} onClose={() => setJobDetailOpen(false)} />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}