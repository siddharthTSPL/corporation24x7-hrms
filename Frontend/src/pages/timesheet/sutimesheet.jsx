import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  useMyProjects, useCreateProject, useAddProjectMembers, useRemoveProjectMember, useAssignableTargets,
  useCreateJob, useUpdateJob, useJobsCreatedByMe, useUpdateJobStatus,
  useOverrunRiskJobs, useIdleJobs, useTeamWorkloadHeatmap,
  usePendingApprovals, useApproveTimesheet, useRejectTimesheet,
  useOrgAllTimeLogs, useOrgAllTimesheets,
  useMyAssignedJobs, useActiveTimer, useStartTimer, usePauseTimer,
  useResumeTimer, useStopTimer, useDiscardTimer, useHeartbeatTimer,
  useMyWeekLog, useLogTime, useSubmitTimesheet, useMyTimesheets,
  useRecallTimesheet, useMyProductivitySummary, useJobById,
  useForwardTimesheet, useTimesheetDetailedReport, useOrgAllJobs,
} from "../../auth/server-state/timesheet/timesheet.hook";
import { downloadReportCSV, TIMESHEET_REPORT_CSV_COLUMNS, buildReportTotalsRow } from "../utils/csvExport";
import { useGetAllDepartmentsSuperAdmin } from "../../auth/server-state/superadmin/department/Sudepartment.hook";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const todayISTKey = (d = new Date()) =>
  new Date(new Date(d).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

const getMonday = (d = new Date()) => {
  const dt = new Date(`${todayISTKey(d)}T00:00:00.000Z`);
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
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

// Guard used on numeric inputs (Estimated Hours / Hourly Rate / Default Hourly Rate)
// so a user can never type or paste a negative number into these fields.
const nonNegative = (v) => {
  if (v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n < 0 ? "0" : v;
};

const clampMaxHoursPerDay = (v) => {
  if (v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  if (n < 0) return "0";
  if (n > 24) return "24";
  return v;
};

const STATUS_STYLE = {
  draft:                     { tw: "text-gray-400 bg-gray-100 border-gray-200",              label: "Draft" },
  pending_manager:           { tw: "text-amber-600 bg-amber-50 border-amber-200",            label: "Pending Manager" },
  pending_reporting_manager: { tw: "text-amber-600 bg-amber-50 border-amber-200",            label: "Pending Review" },
  pending_admin:             { tw: "text-blue-600 bg-blue-50 border-blue-200",               label: "Pending Admin" },
  pending_superadmin:        { tw: "text-[#730042] bg-[#730042]/[0.07] border-[#730042]/20", label: "Pending SA" },
  approved:                  { tw: "text-emerald-600 bg-emerald-50 border-emerald-200",      label: "Approved" },
  rejected:                  { tw: "text-red-600 bg-red-50 border-red-200",                  label: "Rejected" },
};

const PRIORITY_TW = {
  low:    "text-gray-400 bg-gray-100 border-gray-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  high:   "text-red-600 bg-red-50 border-red-200",
  urgent: "text-[#730042] bg-[#730042]/[0.07] border-[#730042]/20",
};

const JOB_STATUS_TW = {
  not_started: "text-gray-400",
  in_progress: "text-blue-600",
  on_hold:     "text-amber-600",
  completed:   "text-emerald-600",
  cancelled:   "text-red-600",
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const NAV_TABS = [
  { id: "overview",   label: "Overview"       },
  { id: "projects",   label: "Projects"       },
  { id: "jobs",       label: "Jobs"           },
  { id: "approvals",  label: "Approvals"      },
  { id: "my-work",    label: "My Work"        },
  { id: "org-logs",   label: "All Logs"       },
  { id: "org-sheets", label: "All Timesheets" },
  { id: "analytics",  label: "Analytics"      },
  { id: "report",     label: "Time Sheet Report" },
];

function cn(...args) { return args.filter(Boolean).join(" "); }

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€" };
function fmtRate(rate, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency || ""} `;
  return `${symbol}${rate}/hr`;
}

function Badge({ tw = "text-gray-500 bg-gray-100 border-gray-200", children }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold border whitespace-nowrap shrink-0", tw)}>
      {children}
    </span>
  );
}

function Card({ children, className = "", onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn("bg-white border border-gray-200 rounded-lg min-w-0 overflow-hidden", onClick && "cursor-pointer hover:border-[#730042]/40 transition-colors", className)}
    >
      {children}
    </div>
  );
}

function StatTile({ label, value, sub, colorClass = "text-[#730042]" }) {
  const barColor = colorClass.replace("text-", "bg-");
  return (
    <Card className="relative pl-4 pr-3.5 sm:pl-6 sm:pr-6 py-3.5 sm:py-5">
      <span className={cn("absolute top-0 left-0 h-full w-[3px]", barColor)} />
      <div className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 sm:mb-1.5 truncate">{label}</div>
      <div className={cn("text-lg sm:text-3xl lg:text-4xl font-bold tracking-tight leading-none mb-1 truncate", colorClass)}>{value}</div>
      {sub && <div className="text-[10px] sm:text-[12px] text-gray-400 truncate">{sub}</div>}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/45 overflow-hidden">
      <div className="bg-white border border-gray-200 sm:rounded-xl w-full h-full sm:h-auto sm:w-[95vw] md:w-[80vw] lg:max-w-[520px] max-h-full sm:max-h-[90vh] flex flex-col min-w-0 overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 shrink-0 min-w-0">
          <span className="font-bold text-[14px] sm:text-[15px] text-gray-900 truncate min-w-0">{title}</span>
          <button onClick={onClose} className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none shrink-0">×</button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden min-w-0">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</label>}
      <input {...props} className={cn("bg-white border border-gray-300 rounded-md px-3.5 py-2.5 text-[13px] text-gray-900 outline-none w-full min-w-0 focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors placeholder:text-gray-400 min-h-[44px]", className)} />
    </div>
  );
}

function Select({ label, children, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</label>}
      <select {...props} className={cn("bg-white border border-gray-300 rounded-md px-3.5 py-2.5 text-[13px] text-gray-900 outline-none w-full min-w-0 appearance-none cursor-pointer focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors min-h-[44px]", className)}>
        {children}
      </select>
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, disabled, type = "button", className = "" }) {
  const base = cn(
    "inline-flex items-center justify-center rounded-md px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors disabled:opacity-55 disabled:cursor-not-allowed min-h-[44px]"
  );
  const variants = {
    primary: "bg-[#730042] text-white hover:bg-[#5c0034]",
    ghost:   "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50",
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

function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 sm:mb-5 min-w-0">
      <div className="min-w-0">
        <div className="text-[15px] sm:text-[16px] font-bold text-gray-900 truncate tracking-tight">{title}</div>
        {sub && <div className="text-[12px] text-gray-400 mt-0.5 truncate">{sub}</div>}
      </div>
      {action && <div className="shrink-0 w-full sm:w-auto min-w-0">{action}</div>}
    </div>
  );
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="py-10 sm:py-12 text-center px-4 sm:px-6">
      <div className="text-4xl mb-2.5">{icon}</div>
      <div className="font-bold text-[15px] text-gray-900 mb-1">{title}</div>
      <div className="text-[13px] text-gray-400 mb-4">{sub}</div>
      {action}
    </div>
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
            <div className="font-bold text-[16px] sm:text-[17px] text-gray-900 mb-1 break-words">{job.title}</div>
            {job.description && <div className="text-[13px] text-gray-500 leading-relaxed break-words">{job.description}</div>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50/80 rounded-xl p-3 min-w-0 ring-1 ring-gray-100">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Assigned To</div>
              <div className="text-[13px] font-bold text-gray-900 truncate">{job.assigned_to_info?.name || "—"}</div>
              <div className="text-[11px] text-[#730042] font-semibold truncate">{job.assigned_to_info?.model === "User" ? "Employee" : (job.assigned_to_info?.role || job.assigned_to_info?.model || "")}</div>
            </div>
            <div className="bg-gray-50/80 rounded-xl p-3 min-w-0 ring-1 ring-gray-100">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Assigned By</div>
              <div className="text-[13px] font-bold text-gray-900 truncate">{job.assigned_by_info?.name || "—"}</div>
              <div className="text-[11px] text-[#730042] font-semibold truncate">{job.assigned_by_info?.model === "User" ? "Employee" : (job.assigned_by_info?.role || job.assigned_by_info?.model || "")}</div>
            </div>
            <div className="bg-gray-50/80 rounded-xl p-3 min-w-0 ring-1 ring-gray-100">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</div>
              <Badge tw={JOB_STATUS_TW[job.status] ? `${JOB_STATUS_TW[job.status]} bg-gray-50 border-gray-200` : "text-gray-400 bg-gray-50 border-gray-200"}>
                {job.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="bg-gray-50/80 rounded-xl p-3 min-w-0 ring-1 ring-gray-100">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Priority</div>
              <Badge tw={PRIORITY_TW[job.priority] || PRIORITY_TW.medium}>{job.priority}</Badge>
            </div>
            <div className="bg-gray-50/80 rounded-xl p-3 min-w-0 ring-1 ring-gray-100">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Logged</div>
              <div className="text-[15px] font-bold text-[#730042]">{job.logged_hours_cache?.toFixed(1) || 0}h</div>
            </div>
            <div className="bg-gray-50/80 rounded-xl p-3 min-w-0 ring-1 ring-gray-100">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Estimated</div>
              <div className="text-[15px] font-bold text-gray-900">{job.estimated_hours || 0}h</div>
            </div>
          </div>
          {job.estimated_hours > 0 && (
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-gray-400">Progress</span>
                <span className={cn("text-[11px] font-bold", job.overrun_flagged ? "text-red-600" : "text-gray-600")}>
                  {Math.round((job.logged_hours_cache / job.estimated_hours) * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (job.logged_hours_cache / job.estimated_hours) * 100)}%`, background: job.overrun_flagged ? "#DC2626" : "#730042" }}
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
                    <span className={cn("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 text-[10px]", wi.is_completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300")}>
                      {wi.is_completed && "✓"}
                    </span>
                    <span className={cn("break-words min-w-0", wi.is_completed ? "line-through text-gray-400" : "text-gray-700")}>{wi.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {job.billable && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tw="text-emerald-600 bg-emerald-50 border-emerald-200">Billable</Badge>
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

function TimerWidget({ assignedJobs }) {
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
  const activeJobs = (assignedJobs || []).filter((j) => !["completed", "cancelled"].includes(j.status));

  return (
    <>
      <div className={cn("rounded-lg overflow-hidden border transition-colors min-w-0",
        isRunning ? "border-[#730042] bg-[#730042]"
        : isPaused ? "border-amber-200 bg-amber-50"
        : "border-gray-200 bg-white")}>
        <div className="px-4 py-3 flex items-center gap-2.5 min-w-0">
          {isRunning && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
          <span className={cn("text-[11px] font-bold uppercase tracking-wide shrink-0",
            isRunning ? "text-white/80" : isPaused ? "text-amber-600" : "text-gray-400")}>
            {isRunning ? "Timer Running" : isPaused ? "Timer Paused" : "No Active Timer"}
          </span>
          {timer?.job?.title && (
            <span className={cn("ml-auto text-[11px] truncate min-w-0",
              isRunning ? "text-white/60" : "text-gray-400")}>{timer.job.title}</span>
          )}
        </div>
        <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
          <div className={cn("font-mono text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-widest tabular-nums select-none text-center sm:text-left",
            isRunning ? "text-white" : isPaused ? "text-amber-600" : "text-gray-200")}>
            {fmtSeconds(displaySecs)}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-center sm:justify-end">
            {!timer ? (
              <Btn onClick={() => setStartModal(true)} className="w-full sm:w-auto">▶ Start</Btn>
            ) : (
              <>
                {isRunning && (
                  <Btn variant="ghost" onClick={() => pauseTimerMut.mutate({}, { onSuccess: refetchTimer })}
                    className="bg-white/20 text-white border-white/30 hover:bg-white/30">⏸</Btn>
                )}
                {isPaused && <Btn variant="ghost" onClick={() => resumeTimerMut.mutate({}, { onSuccess: refetchTimer })}>▶</Btn>}
                <Btn variant="ghost" onClick={() => setStopModal(true)}
                  className={isRunning ? "bg-white/20 text-white border-white/30 hover:bg-white/30" : ""}>■ Log</Btn>
                <Btn variant="ghost" onClick={() => discardTimerMut.mutate({}, { onSuccess: refetchTimer })}
                  className={isRunning ? "bg-white/10 text-white/70 border-white/20 hover:bg-white/20" : "text-red-500 border-red-200 hover:bg-red-50"}>Discard</Btn>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Timer">
        <div className="flex flex-col gap-3.5">
          <Select label="Job (assigned to me)" value={startForm.job} onChange={(e) => setStartForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select a job…</option>
            {activeJobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Select>
          <Input label="Note (optional)" placeholder="What are you working on?" value={startForm.note} onChange={(e) => setStartForm((p) => ({ ...p, note: e.target.value }))} />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Btn variant="ghost" onClick={() => setStartModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={() => startTimerMut.mutate({ job: startForm.job, note: startForm.note }, {
              onSuccess: () => { setStartModal(false); setStartForm({ job: "", note: "" }); refetchTimer(); }
            })} disabled={!startForm.job || startTimerMut.isPending} className="w-full sm:w-auto">
              {startTimerMut.isPending ? "Starting…" : "▶ Start"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={stopModal} onClose={() => setStopModal(false)} title="Log Time">
        <div className="flex flex-col gap-3.5">
          <div className="bg-[#730042]/[0.07] border border-[#730042]/20 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
            <span className="text-[12px] text-[#730042] font-semibold">Elapsed</span>
            <span className="font-mono font-extrabold text-lg sm:text-xl text-[#730042]">{fmtSeconds(displaySecs)}</span>
          </div>
          <Input label="Note (optional)" placeholder="Brief summary…" value={stopNote} onChange={(e) => setStopNote(e.target.value)} />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Btn variant="ghost" onClick={() => setStopModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn variant="success" onClick={() => stopTimerMut.mutate({ note: stopNote }, {
              onSuccess: () => { setStopModal(false); setStopNote(""); refetchTimer(); }
            })} disabled={stopTimerMut.isPending} className="w-full sm:w-auto">
              {stopTimerMut.isPending ? "Logging…" : "■ Log Time"}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}

function WeekGrid({ weekStart, weekDays, onAddLog }) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const todayISO = todayISTKey();
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden min-w-0">
      {/* Mobile: stacked day-by-day list — no horizontal scroll needed */}
      <div className="flex flex-col divide-y divide-gray-100 sm:hidden">
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === todayISO;
          const mins = weekDays[iso]?.totalMinutes || 0;
          const logs = weekDays[iso]?.logs || [];
          return (
            <div key={iso} className={cn("p-3 min-w-0", isToday ? "bg-[#730042]/[0.04]" : "")}>
              <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("text-[11px] font-bold uppercase tracking-wide shrink-0", isToday ? "text-[#730042]" : "text-gray-400")}>{DAY_NAMES[i]}</span>
                  <span className={cn("text-[14px] font-extrabold shrink-0", isToday ? "text-[#730042]" : "text-gray-800")}>{d.getDate()}</span>
                </div>
                {mins > 0 && <span className="text-[10px] font-bold text-[#730042] bg-[#730042]/[0.08] rounded px-1.5 py-0.5 shrink-0">{fmtDuration(mins)}</span>}
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                {logs.map((log) => (
                  <div key={log._id}
                    className={cn("border rounded-lg px-2.5 py-2 flex items-center justify-between gap-2 min-w-0",
                      log.billable ? "bg-emerald-50 border-emerald-200 border-l-[3px] border-l-emerald-500"
                        : "bg-[#730042]/[0.06] border-[#730042]/20 border-l-[3px] border-l-[#730042]")}>
                    <div className="text-[12px] font-semibold text-gray-900 truncate min-w-0">{log.job?.title || "—"}</div>
                    <div className={cn("text-[11px] font-bold shrink-0", log.billable ? "text-emerald-600" : "text-[#730042]")}>{fmtDuration(log.duration_minutes)}</div>
                  </div>
                ))}
                <button onClick={() => onAddLog(iso)} className="w-full border border-dashed border-gray-200 rounded-lg py-1.5 text-[11px] text-gray-400 hover:border-[#730042]/40 hover:text-[#730042]/60 transition-colors min-h-[32px]">+ Add</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tablet/desktop: 7-column grid */}
      <div className="hidden sm:block min-w-0">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {days.map((d, i) => {
            const iso = d.toISOString().slice(0, 10);
            const isToday = iso === todayISO;
            const mins = weekDays[iso]?.totalMinutes || 0;
            return (
              <div key={iso} className={cn("px-1 sm:px-2 pt-3 pb-2 text-center min-w-0", i < 6 ? "border-r border-gray-100" : "", isToday ? "bg-[#730042]/[0.05]" : "")}>
                <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide">{DAY_NAMES[i]}</div>
                <div className={cn("text-base sm:text-lg font-extrabold mt-0.5", isToday ? "text-[#730042]" : "text-gray-800")}>{d.getDate()}</div>
                {mins > 0
                  ? <div className="mt-1 text-[9px] sm:text-[10px] font-bold text-[#730042] bg-[#730042]/[0.08] rounded px-1 py-0.5 truncate">{fmtDuration(mins)}</div>
                  : <div className="mt-1 h-[18px]" />}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 min-h-[120px]">
          {days.map((d, i) => {
            const iso = d.toISOString().slice(0, 10);
            const logs = weekDays[iso]?.logs || [];
            const isToday = iso === todayISO;
            return (
              <div key={iso} className={cn("px-1 sm:px-1.5 py-2 flex flex-col gap-1 min-w-0", i < 6 ? "border-r border-gray-100" : "", isToday ? "bg-[#730042]/[0.02]" : "")}>
                {logs.map((log) => (
                  <div key={log._id}
                    className={cn("border rounded-lg px-1.5 sm:px-2 py-1.5 cursor-default min-w-0",
                      log.billable ? "bg-emerald-50 border-emerald-200 border-l-[3px] border-l-emerald-500"
                        : "bg-[#730042]/[0.06] border-[#730042]/20 border-l-[3px] border-l-[#730042]")}
                    title={`${log.job?.title || "—"} · ${fmtDuration(log.duration_minutes)}`}>
                    <div className="text-[10px] sm:text-[11px] font-semibold text-gray-900 truncate leading-tight">{log.job?.title || "—"}</div>
                    <div className={cn("text-[9px] sm:text-[10px] font-bold mt-0.5", log.billable ? "text-emerald-600" : "text-[#730042]")}>{fmtDuration(log.duration_minutes)}</div>
                  </div>
                ))}
                <button onClick={() => onAddLog(iso)} className="mt-auto w-full border border-dashed border-gray-200 rounded-lg py-1 text-[10px] sm:text-[11px] text-gray-300 hover:border-[#730042]/40 hover:text-[#730042]/60 transition-colors min-h-[28px]">+ Add</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminTimesheet() {
  const [tab, setTab] = useState("overview");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ job: "", log_date: todayISTKey(), duration_minutes: "", note: "" });
  const [editJobOpen, setEditJobOpen] = useState(false);
  const [editJobForm, setEditJobForm] = useState({ id: "", title: "", description: "", priority: "medium", estimated_hours: "", max_hours_per_day: "", billable: true, hourly_rate: "", currency: "INR", due_date: "" });

  const [projectForm, setProjectForm] = useState({ name: "", description: "", billing_type: "billable", currency: "INR", default_hourly_rate: "", member_ids: [] });
  const [jobForm, setJobForm] = useState({ title: "", description: "", project: "", assigned_to: "", priority: "medium", estimated_hours: "", max_hours_per_day: "", billable: true, hourly_rate: "", currency: "INR" });
  const [membersModal, setMembersModal] = useState(null);
  const [membersSelection, setMembersSelection] = useState([]);

  const [weekStart, setWeekStart] = useState(getMonday());
  const [logsWeek, setLogsWeek] = useState(getMonday());
  const [sheetsStatus, setSheetsStatus] = useState("");
  const [sheetsOwnerModel, setSheetsOwnerModel] = useState("");

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const shiftWeek = (dir) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  const { data: projectsData, refetch: refetchProjects }  = useMyProjects();
  const { data: jobsData, refetch: refetchJobs } = useJobsCreatedByMe();
  const { data: approvalsData, refetch: refetchApprovals } = usePendingApprovals();
  const { data: overrunData }   = useOverrunRiskJobs();
  const { data: idleData }      = useIdleJobs(7);
  const { data: heatmapData }   = useTeamWorkloadHeatmap(weekStart);
  const { data: targetsData }   = useAssignableTargets();
  const { data: orgLogsData }   = useOrgAllTimeLogs({ week_start: logsWeek });
  const { data: orgSheetsData } = useOrgAllTimesheets({
    ...(sheetsStatus ? { status: sheetsStatus } : {}),
    ...(sheetsOwnerModel ? { owner_model: sheetsOwnerModel } : {}),
  });
  const { data: assignedJobsData } = useMyAssignedJobs();
  const { data: weekData, refetch: refetchWeek } = useMyWeekLog(weekStart);
  const { data: tsData, refetch: refetchTS } = useMyTimesheets();
  const { data: prodData } = useMyProductivitySummary(weekStart);

  // ─── Time Sheet Report (detailed + weekend, filterable, org-wide) ────────
  const [reportWeek, setReportWeek] = useState(weekStart);
  const [reportView, setReportView] = useState("detailed");
  const [reportEmployeeName, setReportEmployeeName] = useState("");
  const [reportEmployeeModel, setReportEmployeeModel] = useState("");
  const [reportDepartment, setReportDepartment] = useState("");
  const [reportDesignation, setReportDesignation] = useState("");
  const [reportProject, setReportProject] = useState("");
  const [reportJob, setReportJob] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportBillable, setReportBillable] = useState("");

  const reportParams = {
    week_start: reportWeek,
    ...(reportEmployeeName.trim() ? { employee_name: reportEmployeeName.trim() } : {}),
    ...(reportEmployeeModel ? { employee_model: reportEmployeeModel } : {}),
    ...(reportDepartment ? { department: reportDepartment } : {}),
    ...(reportDesignation ? { designation: reportDesignation } : {}),
    ...(reportProject ? { project_id: reportProject } : {}),
    ...(reportJob ? { job_id: reportJob } : {}),
    ...(reportStatus ? { status: reportStatus } : {}),
    ...(reportBillable ? { billable: reportBillable } : {}),
  };
  const { data: reportData, isFetching: reportLoading } = useTimesheetDetailedReport(reportParams);
  const { data: departmentsData } = useGetAllDepartmentsSuperAdmin();
  const reportDepartments = departmentsData?.departments ?? [];
  const allReportRows = reportData?.rows ?? [];
  const weekendReportRows = allReportRows.filter((r) => r.day_type === "week_off" || r.day_type === "holiday");
  const reportRows = reportView === "weekend" ? weekendReportRows : allReportRows;

  const { data: reportJobsData } = useOrgAllJobs(reportProject ? { project: reportProject } : {});
  const reportJobOptions = reportJobsData?.jobs ?? [];

  const exportReportCSV = () => {
    downloadReportCSV(
      reportRows.length ? [...reportRows, buildReportTotalsRow(reportRows)] : reportRows,
      TIMESHEET_REPORT_CSV_COLUMNS,
      `${reportView === "weekend" ? "weekend" : "detailed"}-timesheet-${reportWeek}.csv`
    );
  };

  const createProject   = useCreateProject();
  const addProjectMembers = useAddProjectMembers();
  const removeProjectMember = useRemoveProjectMember();
  const createJob       = useCreateJob();
  const updateJob       = useUpdateJob();
  const approveTS       = useApproveTimesheet();
  const rejectTS        = useRejectTimesheet();
  const updateJobStatus = useUpdateJobStatus();
  const logTime         = useLogTime();
  const submitTS        = useSubmitTimesheet();
  const recallTS        = useRecallTimesheet();

  const projects    = projectsData?.projects      ?? [];
  const jobs        = jobsData?.jobs              ?? [];
  const approvals   = approvalsData?.timesheets   ?? [];
  const overrunJobs = overrunData?.jobs           ?? [];
  const idleJobs    = idleData?.jobs              ?? [];
  const heatmap     = heatmapData?.heatmap        ?? [];
  const targets     = targetsData?.targets        ?? [];
  const orgLogs     = orgLogsData?.logs           ?? [];
  const orgSheets   = orgSheetsData?.timesheets   ?? [];
  const assignedJobs = assignedJobsData?.jobs     ?? [];
  const weekDays    = weekData?.days              ?? {};
  const totalWeekMins = weekData?.totalMinutes    ?? 0;
  const timesheets  = tsData?.timesheets          ?? [];

  const totalHours    = useMemo(() => jobs.reduce((s, j) => s + (j.logged_hours_cache || 0), 0), [jobs]);
  const billableJobs  = useMemo(() => jobs.filter(j => j.billable).length, [jobs]);
  const completedJobs = useMemo(() => jobs.filter(j => j.status === "completed").length, [jobs]);

  const currentWeekSheet = timesheets.find((ts) => {
    const ws = new Date(ts.week_start), wss = new Date(weekStart);
    return ws.getFullYear() === wss.getFullYear() && ws.getMonth() === wss.getMonth() && ws.getDate() === wss.getDate();
  });
  const canSubmit = !currentWeekSheet || ["draft", "rejected"].includes(currentWeekSheet?.status);
  const canRecall = currentWeekSheet && ["pending_manager", "pending_reporting_manager", "pending_admin", "pending_superadmin"].includes(currentWeekSheet?.status);

  const handleCreateProject = async () => {
    await createProject.mutateAsync({ ...projectForm, default_hourly_rate: Number(projectForm.default_hourly_rate) || 0 });
    setCreateProjectOpen(false);
    setProjectForm({ name: "", description: "", billing_type: "billable", currency: "INR", default_hourly_rate: "", member_ids: [] });
    refetchProjects();
  };

  const handleCreateJob = async () => {
    const target = targets.find(t => t.id.toString() === jobForm.assigned_to);
    await createJob.mutateAsync({
      ...jobForm,
      project: jobForm.project || null,
      assigned_to_model: target?.model || "Admin",
      estimated_hours: Number(jobForm.estimated_hours) || 0,
      max_hours_per_day: jobForm.max_hours_per_day === "" ? null : Number(jobForm.max_hours_per_day),
      hourly_rate: Number(jobForm.hourly_rate) || 0,
    });
    setCreateJobOpen(false);
    setJobForm({ title: "", description: "", project: "", assigned_to: "", priority: "medium", estimated_hours: "", max_hours_per_day: "", billable: true, hourly_rate: "", currency: "INR" });
    refetchJobs();
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
      currency: job.currency || "INR",
      due_date: job.due_date ? job.due_date.slice(0, 10) : "",
    });
    setEditJobOpen(true);
  };

  const handleUpdateJob = async () => {
    if (!editJobForm.title) return;
    await updateJob.mutateAsync({
      id: editJobForm.id,
      data: {
        title: editJobForm.title,
        description: editJobForm.description,
        priority: editJobForm.priority,
        estimated_hours: Number(editJobForm.estimated_hours) || 0,
        max_hours_per_day: editJobForm.max_hours_per_day === "" ? null : Number(editJobForm.max_hours_per_day),
        billable: editJobForm.billable,
        hourly_rate: Number(editJobForm.hourly_rate) || 0,
        currency: editJobForm.currency,
        due_date: editJobForm.due_date || null,
      },
    });
    setEditJobOpen(false);
    refetchJobs();
  };

  const openMembersModal = (project) => {
    setMembersModal(project);
    setMembersSelection([]);
  };

  const toggleMemberSelection = (id) => {
    setMembersSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAddMembers = async () => {
    if (!membersModal || !membersSelection.length) return;
    const updated = await addProjectMembers.mutateAsync({ id: membersModal._id, member_ids: membersSelection });
    setMembersSelection([]);
    setMembersModal(updated?.project || membersModal);
    refetchProjects();
  };

  const handleRemoveMember = async (memberId) => {
    if (!membersModal) return;
    await removeProjectMember.mutateAsync({ id: membersModal._id, memberId });
    setMembersModal(prev => prev ? { ...prev, members: (prev.members || []).filter(m => (m.member?._id || m.member)?.toString() !== memberId) } : prev);
    refetchProjects();
  };

  const handleApprove = async (ts) => {
    await approveTS.mutateAsync({ timesheetId: ts._id, remarks: "Approved by Super Admin" });
    setApproveModal(null);
    refetchApprovals();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await rejectTS.mutateAsync({ timesheetId: rejectModal._id, remarks: rejectRemarks || "Rejected by Super Admin" });
    setRejectModal(null);
    setRejectRemarks("");
    refetchApprovals();
  };

  const handleLogTime = () => {
    logTime.mutate({ ...logForm, duration_minutes: Number(logForm.duration_minutes) }, {
      onSuccess: () => {
        setLogModal(false);
        setLogForm({ job: "", log_date: todayISTKey(), duration_minutes: "", note: "" });
        refetchWeek();
      }
    });
  };

  const openJobDetail = (jobId) => {
    setSelectedJobId(jobId);
    setJobDetailOpen(true);
  };

  const currentTabLabel = NAV_TABS.find(t => t.id === tab)?.label ?? "";

  return (
    <div className="min-h-screen w-full max-w-full bg-gray-50 overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 min-w-0 max-w-full">
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 min-w-0">
          <div className="flex items-center justify-between gap-3 py-2.5 sm:py-3 min-w-0">
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-[#730042] to-[#94005a] flex items-center justify-center shrink-0 shadow-sm shadow-[#730042]/30">
                <span className="text-white text-[12px] sm:text-[13px] font-black">S</span>
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-gray-900 tracking-tight leading-none">TorchX</div>
                <div className="text-[9px] sm:text-[10px] text-[#730042] font-bold tracking-wide mt-0.5">SUPER ADMIN</div>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Btn onClick={() => setCreateJobOpen(true)} className="text-[12px] px-3 sm:px-4">
                <span className="hidden sm:inline">＋ New Job</span>
                <span className="sm:hidden">＋ Job</span>
              </Btn>
              <Btn variant="ghost" onClick={() => setCreateProjectOpen(true)} className="text-[12px] px-3 sm:px-4 hidden sm:inline-flex">＋ Project</Btn>
            </div>
          </div>

          <div className="pb-2.5 sm:pb-3">
            <nav className="flex flex-wrap items-center gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1 min-w-0">
              {NAV_TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn("flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg text-[12px] lg:text-[13px] font-semibold whitespace-nowrap transition-all",
                    tab === t.id
                      ? "bg-[#730042] text-white shadow-sm shadow-[#730042]/30"
                      : "text-gray-500 hover:text-gray-900 hover:bg-white")}>
                  {t.label}
                  {t.id === "approvals" && approvals.length > 0 && (
                    <span className={cn("inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black",
                      tab === t.id ? "bg-white/25 text-white" : "bg-red-500 text-white")}>
                      {approvals.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-[#730042]/[0.08] to-[#730042]/[0.03] border-b border-[#730042]/[0.15] px-3 sm:px-6 py-1.5 flex items-center gap-2 overflow-hidden min-w-0">
        <span className="text-[11px] font-bold text-[#730042] shrink-0">⬡ Super Admin</span>
        <span className="text-[11px] text-[#730042]/70 hidden sm:inline truncate">— Organisation-wide visibility across all roles</span>
      </div>

      <main className="px-3 sm:px-6 py-4 sm:py-7 w-full max-w-[1280px] mx-auto min-w-0">

        {tab === "overview" && (
          <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <StatTile label="Total Projects"  value={projects.length}                                     sub="Across all teams"           colorClass="text-[#730042]"    />
              <StatTile label="Active Jobs"     value={jobs.filter(j => j.status === "in_progress").length} sub={`${completedJobs} completed`} colorClass="text-blue-600"  />
              <StatTile label="Hours Logged"    value={`${totalHours.toFixed(0)}h`}                        sub={`${billableJobs} billable jobs`} colorClass="text-emerald-600" />
              <StatTile label="Pending Reviews" value={approvals.length}                                    sub="Timesheets awaiting"        colorClass="text-red-600"      />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card className="p-4 sm:p-5">
                <SectionHeader title="At-Risk Jobs" sub={`${overrunJobs.length} exceeding estimate`} />
                {overrunJobs.length === 0 ? (
                  <EmptyState icon="✓" title="No jobs at risk" sub="All jobs within estimate" />
                ) : (
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto overflow-x-hidden pr-0.5">
                    {overrunJobs.map(job => (
                      <div key={job._id} className="flex items-center gap-3 px-3 sm:px-3.5 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl min-w-0">
                        <span className="text-[12px] font-black text-red-600 min-w-[36px] shrink-0">{job.riskPercent}%</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold truncate">{job.title}</div>
                          <div className="text-[11px] text-gray-400">{job.logged_hours_cache}h / {job.estimated_hours}h est.</div>
                        </div>
                        <div className="w-12 sm:w-16 h-1 bg-gray-100 rounded-full overflow-hidden shrink-0">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(job.riskPercent, 100)}%`, background: job.riskPercent >= 100 ? "#DC2626" : "#D97706" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4 sm:p-5">
                <SectionHeader title="Idle Jobs" sub="No activity in 7+ days" />
                {idleJobs.length === 0 ? (
                  <EmptyState icon="🚀" title="All jobs are active" sub="" />
                ) : (
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto overflow-x-hidden pr-0.5">
                    {idleJobs.map(job => (
                      <div key={job._id} className="flex items-center gap-3 px-3 sm:px-3.5 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl min-w-0">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold truncate">{job.title}</div>
                          <div className="text-[11px] text-gray-400">Last: {fmtDate(job.updatedAt)}</div>
                        </div>
                        <Badge tw={JOB_STATUS_TW[job.status] ? `${JOB_STATUS_TW[job.status]} bg-gray-50 border-gray-200` : "text-gray-400 bg-gray-50 border-gray-200"}>
                          {job.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card className="p-4 sm:p-5">
              <SectionHeader title="Team Workload Heatmap" sub={`Week of ${weekStart}`} />
              {heatmap.length === 0 ? (
                <EmptyState icon="◎" title="No team data" sub="No time logs found for this week" />
              ) : (
                <>
                  {/* Below lg: one card per member, 7 cells laid out with CSS grid so they always fit the screen width — no horizontal scroll */}
                  <div className="flex flex-col gap-3 lg:hidden">
                    {heatmap.map((row, i) => {
                      const days = Array.from({ length: 7 }, (_, idx) => {
                        const d = new Date(weekStart);
                        d.setDate(d.getDate() + idx);
                        return row.days?.[d.toISOString().slice(0, 10)];
                      });
                      const memberName = row.name || row.member_name || `Member ${i + 1}`;
                      const memberMeta = [row.empid, row.department, row.designation].filter(Boolean).join(" • ");
                      return (
                        <div key={i} className="min-w-0">
                          <div className="text-[12px] font-semibold text-gray-700 truncate">{memberName}</div>
                          {memberMeta && <div className="text-[10px] text-gray-400 truncate mb-1.5">{memberMeta}</div>}
                          <div className="grid grid-cols-7 gap-1">
                            {days.map((day, j) => {
                              const pct = day?.loadPercent ?? 0;
                              const cellClass = pct === 0 ? "bg-gray-50 text-gray-400" : pct < 50 ? "bg-emerald-50 text-emerald-600" : pct < 80 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600";
                              return (
                                <div key={j} className="min-w-0 text-center">
                                  <div className="text-[8px] font-bold text-gray-400 mb-0.5">{DAY_NAMES[j][0]}</div>
                                  <div className={cn("rounded-md py-1 px-0.5 text-[9px] font-bold truncate", cellClass)}>
                                    {pct > 0 ? `${pct}%` : "—"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* lg+: full table, fits the container width — no forced min-width */}
                  <div className="hidden lg:block min-w-0">
                    <table className="w-full border-collapse text-[12px] table-fixed">
                      <thead>
                        <tr>
                          <th className="text-left py-2 pr-4 pl-1 text-gray-400 font-semibold w-[24%]">Member</th>
                          {DAY_NAMES.map(d => (
                            <th key={d} className="text-center py-2 px-1.5 text-gray-400 font-semibold">{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmap.map((row, i) => {
                          const days = Array.from({ length: 7 }, (_, idx) => {
                            const d = new Date(weekStart);
                            d.setDate(d.getDate() + idx);
                            return row.days?.[d.toISOString().slice(0, 10)];
                          });
                          const memberName = row.name || row.member_name || `Member ${i + 1}`;
                          const memberMeta = [row.empid, row.department, row.designation].filter(Boolean).join(" • ");
                          return (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="py-2.5 pr-4 pl-1 text-gray-700 min-w-0">
                                <div className="font-medium truncate">{memberName}</div>
                                {memberMeta && <div className="text-[10px] text-gray-400 truncate">{memberMeta}</div>}
                              </td>
                              {days.map((day, j) => {
                                const pct = day?.loadPercent ?? 0;
                                const cellClass = pct === 0 ? "bg-gray-50 text-gray-400" : pct < 50 ? "bg-emerald-50 text-emerald-600" : pct < 80 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600";
                                return (
                                  <td key={j} className="text-center py-1.5 px-1.5">
                                    <div className={cn("rounded-lg py-1.5 px-1 text-[11px] font-bold", cellClass)}>
                                      {pct > 0 ? `${pct}%` : "—"}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}

        {tab === "projects" && (
          <div className="min-w-0">
            <SectionHeader title="All Projects" sub={`${projects.length} total`} action={<Btn onClick={() => setCreateProjectOpen(true)} className="w-full sm:w-auto">＋ New Project</Btn>} />
            {projects.length === 0 ? (
              <Card><EmptyState icon="⬡" title="No projects yet" sub="Create your first project" action={<Btn onClick={() => setCreateProjectOpen(true)}>Create Project</Btn>} /></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {projects.map(p => (
                  <Card key={p._id} className="p-4 sm:p-5">
                    <div className="flex items-center gap-3 mb-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] shrink-0 border-2" style={{ background: (p.color_tag || "#730042") + "22", borderColor: p.color_tag || "#730042" }} />
                      <div className="min-w-0">
                        <div className="font-bold text-[14px] truncate text-gray-900">{p.name}</div>
                        <div className="text-[11px] text-gray-400 truncate">{p.code || "—"} · {p.billing_type}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge tw={p.status === "active" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-gray-400 bg-gray-100 border-gray-200"}>{p.status}</Badge>
                      <Badge tw="text-[#730042] bg-[#730042]/[0.07] border-[#730042]/20">{p.visibility}</Badge>
                      <Badge tw="text-amber-600 bg-amber-50 border-amber-200">{p.members?.length || 0} members</Badge>
                    </div>
                    {p.description && <div className="text-[12px] text-gray-400 mt-3 line-clamp-2 break-words">{p.description}</div>}
                    <Btn variant="ghost" onClick={() => openMembersModal(p)} className="mt-3 w-full text-[12px]">Manage Members</Btn>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "jobs" && (
          <div className="min-w-0">
            <SectionHeader title="Jobs Created by Me" sub={`${jobs.length} total`} action={<Btn onClick={() => setCreateJobOpen(true)} className="w-full sm:w-auto">＋ New Job</Btn>} />
            <div className="flex flex-col gap-2.5">
              {jobs.length === 0 ? (
                <Card><EmptyState icon="⬢" title="No jobs yet" sub="Create a job to assign work" action={<Btn onClick={() => setCreateJobOpen(true)}>Create Job</Btn>} /></Card>
              ) : jobs.map(job => {
                const assigneeInfo = job.assigned_to_info;
                return (
                  <Card key={job._id} className="p-3.5 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <button className="font-bold text-[13px] sm:text-[14px] text-gray-900 hover:text-[#730042] transition-colors text-left break-words" onClick={() => openJobDetail(job._id)}>
                            {job.title}
                          </button>
                          <Badge tw={PRIORITY_TW[job.priority] || PRIORITY_TW.medium}>{job.priority}</Badge>
                          {job.billable && <Badge tw="text-amber-600 bg-amber-50 border-amber-200">Billable</Badge>}
                          {job.overrun_flagged && <Badge tw="text-red-600 bg-red-50 border-red-200">Overrun</Badge>}
                        </div>
                        {assigneeInfo && (
                          <div className="text-[11px] text-gray-400 mb-1 truncate">
                            Assigned to <span className="font-semibold text-gray-700">{assigneeInfo.name}</span>
                            <span className="text-[#730042] font-semibold"> · {assigneeInfo.role || assigneeInfo.model}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                          <span>{job.logged_hours_cache?.toFixed(1)}h logged</span>
                          {job.estimated_hours > 0 && <span>/ {job.estimated_hours}h est.</span>}
                          {job.due_date && <span>Due {fmtDate(job.due_date)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
  <button onClick={() => openJobDetail(job._id)} className="bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-gray-700 cursor-pointer min-h-[36px] hover:bg-gray-50 hover:border-gray-300 transition-colors">View</button>
  <button onClick={() => openEditJob(job)} className="bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-blue-600 cursor-pointer min-h-[36px]">Edit</button>
  <select value={job.status} onChange={e => updateJobStatus.mutate({ id: job._id, status: e.target.value }, { onSuccess: refetchJobs })}
    className={cn("bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-[11px] font-semibold outline-none cursor-pointer min-h-[36px] hover:bg-gray-50 transition-colors", JOB_STATUS_TW[job.status] || "text-gray-900")}>
    {["not_started", "in_progress", "on_hold", "completed", "cancelled"].map(s => (
      <option key={s} value={s} className="text-gray-900">{s.replace(/_/g, " ")}</option>
    ))}
  </select>
</div>
                    </div>
                    {job.estimated_hours > 0 && (
                      <div className="h-0.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min((job.logged_hours_cache / job.estimated_hours) * 100, 100)}%`, background: job.overrun_flagged ? "#DC2626" : "#730042" }} />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {tab === "approvals" && (
          <div className="min-w-0">
            <SectionHeader title="Pending Timesheets" sub={`${approvals.length} awaiting your review`} />
            {approvals.length === 0 ? (
              <Card><EmptyState icon="✦" title="All clear" sub="No timesheets pending review" /></Card>
            ) : (
              <div className="flex flex-col gap-3">
                {approvals.map(ts => (
                  <Card key={ts._id} className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px] text-gray-900 truncate">{ts.owner?.f_name} {ts.owner?.l_name}</div>
                        <div className="text-[12px] text-gray-400 mt-0.5 truncate">{ts.owner?.work_email} · {ts.owner_model === "User" ? "Employee" : ts.owner_model}</div>
                        <div className="text-[12px] text-gray-400 mt-1">Week: {fmtDate(ts.week_start)} — {fmtDate(ts.week_end)}</div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap text-[12px]">
                          <span className="text-[#730042] font-semibold">{fmtDuration(ts.total_minutes)} total</span>
                          {ts.overtime_minutes > 0 && <span className="text-amber-600 font-semibold">{fmtDuration(ts.overtime_minutes)} overtime</span>}
                          <span className="text-emerald-600">{fmtDuration(ts.billable_minutes)} billable</span>
                          <Badge tw={(STATUS_STYLE[ts.status] || STATUS_STYLE.draft).tw}>{(STATUS_STYLE[ts.status] || STATUS_STYLE.draft).label}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                        <Btn variant="success" onClick={() => setApproveModal(ts)} className="flex-1 sm:flex-initial">Approve</Btn>
                        <Btn variant="danger" onClick={() => { setRejectModal(ts); setRejectRemarks(""); }} className="flex-1 sm:flex-initial">Reject</Btn>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "my-work" && (
          <div className="flex flex-col gap-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">My Work</h1>
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-md px-2.5 py-1.5">
                  <button onClick={() => shiftWeek(-1)} className="bg-transparent border-none cursor-pointer text-gray-700 text-base flex w-6 h-6 items-center justify-center shrink-0">‹</button>
                  <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{fmtShort(weekStart)} – {fmtShort(weekEnd)}</span>
                  <button onClick={() => shiftWeek(1)} className="bg-transparent border-none cursor-pointer text-gray-700 text-base flex w-6 h-6 items-center justify-center shrink-0">›</button>
                </div>
                <Btn onClick={() => setLogModal(true)} className="w-full sm:w-auto">+ Log Time</Btn>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "This Week", value: fmtDuration(totalWeekMins), color: "text-[#730042]" },
                { label: "Billable", value: fmtDuration(prodData?.billableMinutes || 0), color: "text-emerald-600" },
                { label: "Capacity", value: `${prodData?.capacityPercent || Math.round((totalWeekMins / 2400) * 100)}%`, color: "text-blue-600" },
              ].map(s => (
                <Card key={s.label} className="px-2.5 sm:px-4 py-3 sm:py-4">
                  <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 sm:mb-1.5 truncate">{s.label}</div>
                  <div className={cn("text-lg sm:text-2xl font-extrabold leading-none truncate", s.color)}>{s.value}</div>
                </Card>
              ))}
            </div>

            <TimerWidget assignedJobs={assignedJobs} />

            <WeekGrid weekStart={weekStart} weekDays={weekDays}
              onAddLog={(date) => { setLogForm({ job: "", log_date: date, duration_minutes: "", note: "" }); setLogModal(true); }} />

            <div className="bg-white border border-gray-200 rounded-lg p-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-gray-900">Week of {fmtShort(weekStart)} – {fmtShort(weekEnd)}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {currentWeekSheet
                      ? <Badge tw={(STATUS_STYLE[currentWeekSheet.status] || STATUS_STYLE.draft).tw}>{(STATUS_STYLE[currentWeekSheet.status] || STATUS_STYLE.draft).label}</Badge>
                      : <span className="text-[12px] text-gray-400">Not submitted</span>}
                    {currentWeekSheet?.remarks && <span className="text-[12px] text-gray-500 italic truncate">"{currentWeekSheet.remarks}"</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                  {canRecall && (
                    <Btn variant="ghost" onClick={() => recallTS.mutate({ timesheetId: currentWeekSheet._id }, { onSuccess: () => { refetchTS(); refetchWeek(); } })} disabled={recallTS.isPending} className="text-[13px] px-3 py-2 flex-1 sm:flex-initial">Recall</Btn>
                  )}
                  {canSubmit && (
                    <Btn onClick={() => submitTS.mutate({ week_start: weekStart }, { onSuccess: () => { refetchTS(); refetchWeek(); } })} disabled={submitTS.isPending || totalWeekMins === 0} className="text-[13px] px-3 py-2 flex-1 sm:flex-initial">
                      {submitTS.isPending ? "Submitting…" : "Submit Week"}
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "org-logs" && (
          <div className="min-w-0">
            <SectionHeader
              title="All Time Logs — Organisation"
              sub={`${orgLogs.length} entries · ${fmtDuration(orgLogsData?.totalMinutes || 0)} total`}
              action={
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input type="date" value={logsWeek} onChange={e => setLogsWeek(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md px-3 py-2 text-[12px] text-gray-900 outline-none min-w-0 focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors min-h-[40px] flex-1 sm:flex-initial" />
                  <span className="text-[11px] text-gray-400 hidden sm:inline shrink-0">week of</span>
                </div>
              }
            />
            {orgLogs.length === 0 ? (
              <Card><EmptyState icon="📋" title="No logs found" sub="No time entries for this week across the org" /></Card>
            ) : (
              <>
                <Card className="hidden lg:block">
                  <table className="w-full border-collapse text-[13px] table-fixed">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[16%]">Member</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[12%]">Role</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[26%]">Job</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[14%]">Date</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[12%]">Duration</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[10%]">Mode</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-[10%]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgLogs.map(log => (
                        <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900 truncate">{log.logged_by?.f_name || "—"} {log.logged_by?.l_name || ""}</td>
                          <td className="px-4 py-3"><Badge tw="text-[#730042] bg-[#730042]/[0.07] border-[#730042]/20">{log.logged_by_model === "User" ? "Employee" : log.logged_by_model}</Badge></td>
                          <td className="px-4 py-3 truncate text-gray-700">{log.job?.title || "—"}</td>
                          <td className="px-4 py-3 text-gray-400 truncate">{fmtDate(log.log_date)}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-600 truncate">{fmtDuration(log.duration_minutes)}</td>
                          <td className="px-4 py-3">
                            <Badge tw={log.entry_mode === "timer" ? "text-blue-600 bg-blue-50 border-blue-200" : "text-gray-400 bg-gray-100 border-gray-200"}>{log.entry_mode}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tw={(STATUS_STYLE[log.status] || STATUS_STYLE.draft).tw}>{(STATUS_STYLE[log.status] || STATUS_STYLE.draft).label}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <div className="flex flex-col gap-2.5 lg:hidden">
                  {orgLogs.map(log => (
                    <Card key={log._id} className="p-3.5">
                      <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                        <div className="min-w-0">
                          <div className="font-bold text-[13px] text-gray-900 truncate">{log.logged_by?.f_name || "—"} {log.logged_by?.l_name || ""}</div>
                          <div className="text-[11px] text-gray-400 truncate">{log.job?.title || "—"}</div>
                        </div>
                        <Badge tw="text-[#730042] bg-[#730042]/[0.07] border-[#730042]/20">{log.logged_by_model === "User" ? "Employee" : log.logged_by_model}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 mb-2">
                        <div className="truncate">Date: <span className="font-semibold text-gray-700">{fmtDate(log.log_date)}</span></div>
                        <div className="truncate">Duration: <span className="font-semibold text-emerald-600">{fmtDuration(log.duration_minutes)}</span></div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tw={log.entry_mode === "timer" ? "text-blue-600 bg-blue-50 border-blue-200" : "text-gray-400 bg-gray-100 border-gray-200"}>{log.entry_mode}</Badge>
                        <Badge tw={(STATUS_STYLE[log.status] || STATUS_STYLE.draft).tw}>{(STATUS_STYLE[log.status] || STATUS_STYLE.draft).label}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "org-sheets" && (
          <div className="min-w-0">
            <SectionHeader
              title="All Timesheets — Organisation"
              sub={`${orgSheets.length} timesheets`}
              action={
                <div className="flex gap-2 flex-wrap">
                  <select value={sheetsStatus} onChange={e => setSheetsStatus(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors cursor-pointer appearance-none min-h-[40px] flex-1 sm:flex-initial min-w-0">
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <select value={sheetsOwnerModel} onChange={e => setSheetsOwnerModel(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md px-3 py-2 text-[12px] text-gray-900 outline-none focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors cursor-pointer appearance-none min-h-[40px] flex-1 sm:flex-initial min-w-0">
                    <option value="">All Roles</option>
                    <option value="User">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              }
            />
            {orgSheets.length === 0 ? (
              <Card><EmptyState icon="📄" title="No timesheets found" sub="Adjust filters to view timesheets" /></Card>
            ) : (
              <div className="flex flex-col gap-2.5">
                {orgSheets.map(ts => {
                  const ss = STATUS_STYLE[ts.status] || STATUS_STYLE.draft;
                  return (
                    <Card key={ts._id} className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-[14px] text-gray-900 truncate">{ts.owner?.f_name} {ts.owner?.l_name}</span>
                            <Badge tw="text-[#730042] bg-[#730042]/[0.07] border-[#730042]/20">{ts.owner_model === "User" ? "Employee" : ts.owner_model}</Badge>
                            <Badge tw={ss.tw}>{ss.label}</Badge>
                          </div>
                          <div className="text-[12px] text-gray-400 truncate">{ts.owner?.work_email} · Week: {fmtDate(ts.week_start)} — {fmtDate(ts.week_end)}</div>
                        </div>
                        <div className="flex gap-4 sm:gap-5 shrink-0">
                          <div className="text-right">
                            <div className="text-[15px] sm:text-[16px] font-extrabold text-[#730042]">{fmtDuration(ts.total_minutes)}</div>
                            <div className="text-[11px] text-gray-400">total</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[15px] sm:text-[16px] font-extrabold text-emerald-600">{fmtDuration(ts.billable_minutes)}</div>
                            <div className="text-[11px] text-gray-400">billable</div>
                          </div>
                        </div>
                      </div>
                      {ts.remarks && (
                        <div className="mt-3 text-[12px] text-gray-500 px-3 py-2 bg-gray-50/80 rounded-lg border-l-[3px] border-l-[#730042] break-words">{ts.remarks}</div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "analytics" && (
          <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <StatTile label="Total Hours"   value={`${totalHours.toFixed(0)}h`} sub="All time logged"       colorClass="text-[#730042]"   />
              <StatTile label="Billable Jobs" value={billableJobs}                sub={`of ${jobs.length} total`} colorClass="text-emerald-600" />
              <StatTile label="Overrun Jobs"  value={overrunJobs.length}          sub="Exceeding estimate"    colorClass="text-red-600"     />
              <StatTile label="Idle Jobs"     value={idleJobs.length}             sub="7+ days inactive"      colorClass="text-amber-600"   />
            </div>
            <Card className="p-4 sm:p-5">
              <SectionHeader title="Jobs by Status" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {["not_started", "in_progress", "on_hold", "completed", "cancelled"].map(s => {
                  const count = jobs.filter(j => j.status === s).length;
                  return (
                    <div key={s} className="bg-gray-50/80 border border-gray-200 rounded-xl p-3 sm:p-4 text-center min-w-0">
                      <div className={cn("text-2xl sm:text-3xl font-extrabold", JOB_STATUS_TW[s] || "text-gray-400")}>{count}</div>
                      <div className="text-[11px] text-gray-400 mt-1 capitalize truncate">{s.replace(/_/g, " ")}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === "report" && (
          <div className="min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-5 gap-3">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">
                  {reportView === "weekend" ? "Weekend Timesheet" : "Time Sheet Report"}
                </h1>
                <p className="text-xs text-gray-400 mt-1 mb-0">
                  {reportRows.length} row{reportRows.length === 1 ? "" : "s"} · Week of {fmtDate(reportWeek)}
                  {reportLoading && " · refreshing…"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setReportView("detailed")}
                    className={cn("text-xs font-bold px-3 py-1.5 rounded-md border-none cursor-pointer", reportView === "detailed" ? "bg-white text-[#730042] shadow-sm" : "bg-transparent text-gray-500")}
                  >
                    Detailed
                  </button>
                  <button
                    onClick={() => setReportView("weekend")}
                    className={cn("text-xs font-bold px-3 py-1.5 rounded-md border-none cursor-pointer", reportView === "weekend" ? "bg-white text-[#730042] shadow-sm" : "bg-transparent text-gray-500")}
                  >
                    Weekend
                  </button>
                </div>
                <span className="text-xs text-gray-400 shrink-0">Week of</span>
                <input
                  type="date"
                  value={reportWeek}
                  onChange={(e) => setReportWeek(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 min-h-[36px] text-xs text-gray-900 outline-none w-full sm:w-auto"
                />
                <Btn variant="ghost" onClick={exportReportCSV} disabled={!reportRows.length} className="!min-h-[36px] !py-1.5">Export CSV</Btn>
              </div>
            </div>

            <Card className="px-4 sm:px-5 py-4 mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2.5">
                <Input label="Employee Name" placeholder="Search employee" value={reportEmployeeName} onChange={(e) => setReportEmployeeName(e.target.value)} />
                <Select label="Role" value={reportEmployeeModel} onChange={(e) => setReportEmployeeModel(e.target.value)}>
                  <option value="">All Roles</option>
                  <option value="User">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </Select>
                <Select label="Department" value={reportDepartment} onChange={(e) => setReportDepartment(e.target.value)}>
                  <option value="">All Departments</option>
                  {reportDepartments.map((department) => (
                    <option key={department._id} value={department.code || department.name}>{department.name}</option>
                  ))}
                </Select>
                <Input label="Designation" placeholder="e.g. Software Engineer" value={reportDesignation} onChange={(e) => setReportDesignation(e.target.value)} />
                <Select label="Project" value={reportProject} onChange={(e) => { setReportProject(e.target.value); setReportJob(""); }}>
                  <option value="">All Projects</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </Select>
                <Select label="Job" value={reportJob} onChange={(e) => setReportJob(e.target.value)}>
                  <option value="">All Jobs</option>
                  {reportJobOptions.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
                </Select>
                <Select label="Status" value={reportStatus} onChange={(e) => setReportStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
                <Select label="Billable" value={reportBillable} onChange={(e) => setReportBillable(e.target.value)}>
                  <option value="">All</option>
                  <option value="true">Billable only</option>
                  <option value="false">Non-billable only</option>
                </Select>
              </div>
              {(reportEmployeeName || reportEmployeeModel || reportDepartment || reportDesignation || reportProject || reportJob || reportStatus || reportBillable) && (
                <button
                  onClick={() => {
                    setReportEmployeeName(""); setReportEmployeeModel(""); setReportDepartment(""); setReportDesignation("");
                    setReportProject(""); setReportJob(""); setReportStatus(""); setReportBillable("");
                  }}
                  className="mt-3 text-[11px] font-bold text-[#730042] bg-transparent border-none cursor-pointer p-0"
                >
                  Clear all filters
                </button>
              )}
            </Card>

            {reportRows.length === 0 ? (
              <Card className="px-6 sm:px-8 py-12 sm:py-16 text-center">
                <div className="font-bold text-base text-gray-900 mb-2">No entries found</div>
                <div className="text-gray-400 text-[13px]">Adjust the week or filters to view the report</div>
              </Card>
            ) : (
              <div className="flex flex-col gap-2.5">
                {reportRows.map((r, i) => (
                  <Card
                    key={r.time_log_id || `${r.employee_id}-${r.date}-${i}`}
                    className={cn("px-3.5 py-3", (r.day_type === "week_off" || r.day_type === "holiday") && "bg-gray-50/70")}
                  >
                    <div className="flex items-center justify-between mb-1.5 gap-2 min-w-0">
                      <span className="text-[13px] font-bold text-gray-900 truncate min-w-0">{r.name}</span>
                      {r.day_type === "week_off" || r.day_type === "holiday" ? (
                        <Badge>{r.day_label}</Badge>
                      ) : (
                        <Badge tw={(STATUS_STYLE[r.timesheet_status === "off" ? "draft" : r.timesheet_status] || STATUS_STYLE.draft).tw}>
                          {(STATUS_STYLE[r.timesheet_status === "off" ? "draft" : r.timesheet_status] || STATUS_STYLE.draft).label}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 mb-2">{r.designation} · {r.department}</div>
                    {r.job && <div className="text-[12px] text-gray-700 mb-2 truncate">{r.job.title}{r.project ? ` · ${r.project.name}` : ""}</div>}
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <span className="text-[11px] text-gray-400">{fmtShort(r.date)}</span>
                      <div className="flex gap-1.5 flex-wrap items-center text-[11px]">
                        <span className="text-gray-400">Req {r.required_hours}h</span>
                        <span className="font-bold text-emerald-600">Served {r.serving_hours}h</span>
                        {r.overtime_hours > 0 && <span className="font-bold text-amber-600">Over Time {r.overtime_hours}h</span>}
                      </div>
                    </div>
                    {(r.approved_by || r.rejected_by) && (
                      <div className="text-[11px] text-gray-400 mt-1.5">
                        {r.timesheet_status === "approved" ? `Approved by ${r.approved_by}` : `Rejected by ${r.rejected_by}`}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Modal open={!!approveModal} onClose={() => setApproveModal(null)} title="Approve Timesheet">
        <div className="flex flex-col gap-4">
          <div className="text-[14px] text-gray-700">
            Approve the timesheet for <strong className="text-gray-900">{approveModal?.owner?.f_name} {approveModal?.owner?.l_name}</strong>?
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Btn variant="ghost" onClick={() => setApproveModal(null)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn variant="success" onClick={() => handleApprove(approveModal)} disabled={approveTS.isPending} className="w-full sm:w-auto">
              {approveTS.isPending ? "Approving…" : "Approve"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Timesheet">
        <div className="flex flex-col gap-4">
          <div className="text-[14px] text-gray-700">
            Rejecting timesheet for <strong className="text-gray-900">{rejectModal?.owner?.f_name} {rejectModal?.owner?.l_name}</strong>
          </div>
          <Input label="Reason (required)" placeholder="Explain the issue…" value={rejectRemarks} onChange={e => setRejectRemarks(e.target.value)} />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Btn variant="ghost" onClick={() => setRejectModal(null)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn variant="danger" onClick={handleReject} disabled={!rejectRemarks.trim() || rejectTS.isPending} className="w-full sm:w-auto">
              {rejectTS.isPending ? "Rejecting…" : "Reject"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} title="Create Project">
        <div className="flex flex-col gap-3.5">
          <Input label="Project Name" placeholder="e.g. Website Redesign" value={projectForm.name} onChange={e => setProjectForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Description" placeholder="Brief description…" value={projectForm.description} onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Select label="Billing Type" value={projectForm.billing_type} onChange={e => setProjectForm(p => ({ ...p, billing_type: e.target.value }))}>
              <option value="billable">Hourly</option>
              <option value="fixed_cost">Fixed</option>
              <option value="non_billable">Non Billable</option>
            </Select>
            <Select label="Currency" value={projectForm.currency} onChange={e => setProjectForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
          <Input label="Default Hourly Rate" type="number" min="0" placeholder="0.00" value={projectForm.default_hourly_rate} onChange={e => setProjectForm(p => ({ ...p, default_hourly_rate: nonNegative(e.target.value) }))} />
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Add Members (optional)</label>
            <div className="border border-gray-200 rounded-xl max-h-[160px] overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-1">
              {targets.length === 0 ? (
                <div className="text-[12px] text-gray-400 px-1.5 py-1">No team members found</div>
              ) : targets.map(t => (
                <label key={t.id} className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer min-h-[32px] min-w-0">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#730042] shrink-0"
                    checked={projectForm.member_ids.includes(t.id.toString())}
                    onChange={() => setProjectForm(p => ({
                      ...p,
                      member_ids: p.member_ids.includes(t.id.toString())
                        ? p.member_ids.filter(id => id !== t.id.toString())
                        : [...p.member_ids, t.id.toString()],
                    }))}
                  />
                  <span className="text-[13px] text-gray-700 truncate min-w-0">{t.name} — {t.model === "User" ? "Employee" : (t.role || t.model)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
            <Btn variant="ghost" onClick={() => setCreateProjectOpen(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleCreateProject} disabled={!projectForm.name || createProject.isPending} className="w-full sm:w-auto">
              {createProject.isPending ? "Creating…" : "Create Project"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!membersModal} onClose={() => { setMembersModal(null); setMembersSelection([]); }} title={`Manage Members — ${membersModal?.name || ""}`}>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Current Members</label>
            {(!membersModal?.members || membersModal.members.length === 0) ? (
              <div className="text-[12px] text-gray-400 px-1">No members yet</div>
            ) : (
              <div className="flex flex-col gap-1">
                {membersModal.members.map((m) => {
                  const mid = (m.member?._id || m.member || "").toString();
                  const info = targets.find(t => t.id.toString() === mid);
                  return (
                    <div key={mid} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-gray-50/80 border border-gray-200 min-w-0">
                      <span className="text-[13px] text-gray-700 truncate min-w-0">{info?.name || mid} — {m.member_model}</span>
                      <button onClick={() => handleRemoveMember(mid)} className="text-red-500 hover:text-red-700 text-[12px] font-semibold shrink-0">Remove</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Add Members</label>
            <div className="border border-gray-200 rounded-xl max-h-[160px] overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-1">
              {targets
                .filter(t => !(membersModal?.members || []).some(m => (m.member?._id || m.member || "").toString() === t.id.toString()))
                .map(t => (
                  <label key={t.id} className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer min-h-[32px] min-w-0">
                    <input type="checkbox" className="w-4 h-4 accent-[#730042] shrink-0" checked={membersSelection.includes(t.id.toString())} onChange={() => toggleMemberSelection(t.id.toString())} />
                    <span className="text-[13px] text-gray-700 truncate min-w-0">{t.name} — {t.model === "User" ? "Employee" : (t.role || t.model)}</span>
                  </label>
                ))}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
            <Btn variant="ghost" onClick={() => { setMembersModal(null); setMembersSelection([]); }} className="w-full sm:w-auto">Close</Btn>
            <Btn onClick={handleAddMembers} disabled={!membersSelection.length || addProjectMembers.isPending} className="w-full sm:w-auto">
              {addProjectMembers.isPending ? "Adding…" : "Add Selected"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={createJobOpen} onClose={() => setCreateJobOpen(false)} title="Create Job">
        <div className="flex flex-col gap-3.5">
          <Input label="Job Title" placeholder="e.g. Design Login Page" value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} />
          <Input label="Description" placeholder="Job details…" value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))} />
          <Select label="Project (optional)" value={jobForm.project} onChange={e => setJobForm(p => ({ ...p, project: e.target.value }))}>
            <option value="">No project</option>
            {projects.map(pr => (
              <option key={pr._id} value={pr._id}>{pr.name}</option>
            ))}
          </Select>
          <Select label="Assign To" value={jobForm.assigned_to} onChange={e => setJobForm(p => ({ ...p, assigned_to: e.target.value }))}>
            <option value="">Select team member…</option>
            {targets.map(t => (
              <option key={t.id} value={t.id}>{t.name} — {t.model === "User" ? "Employee" : (t.role || t.model)}</option>
            ))}
          </Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Select label="Priority" value={jobForm.priority} onChange={e => setJobForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Input label="Estimated Hours" type="number" min="0" placeholder="0" value={jobForm.estimated_hours} onChange={e => setJobForm(p => ({ ...p, estimated_hours: nonNegative(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input label="Hourly Rate" type="number" min="0" placeholder="0.00" value={jobForm.hourly_rate} onChange={e => setJobForm(p => ({ ...p, hourly_rate: nonNegative(e.target.value) }))} />
            <Select label="Currency" value={jobForm.currency} onChange={e => setJobForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
          <div>
          <Input label="Max Hours / Day" type="number" step="0.5" min="0.5" max="24" placeholder="e.g. 7" value={jobForm.max_hours_per_day} onChange={e => setJobForm(p => ({ ...p, max_hours_per_day: clampMaxHoursPerDay(e.target.value) }))} />
            <p className="text-[11px] text-gray-500 mt-1">Time logged beyond this per day counts as overtime. Leave blank to use the employee's shift hours instead.</p>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer min-h-[24px]">
            <input type="checkbox" checked={jobForm.billable} onChange={e => setJobForm(p => ({ ...p, billable: e.target.checked }))} className="w-4 h-4 accent-[#730042] shrink-0" />
            <span className="text-[13px] text-gray-600">Billable job</span>
          </label>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
            <Btn variant="ghost" onClick={() => setCreateJobOpen(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleCreateJob} disabled={!jobForm.title || !jobForm.assigned_to || createJob.isPending} className="w-full sm:w-auto">
              {createJob.isPending ? "Creating…" : "Create Job"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={editJobOpen} onClose={() => setEditJobOpen(false)} title="Edit Job">
        <div className="flex flex-col gap-3.5">
          <Input label="Job Title" placeholder="e.g. Design Login Page" value={editJobForm.title} onChange={e => setEditJobForm(p => ({ ...p, title: e.target.value }))} />
          <Input label="Description" placeholder="Job details…" value={editJobForm.description} onChange={e => setEditJobForm(p => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Select label="Priority" value={editJobForm.priority} onChange={e => setEditJobForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Input label="Estimated Hours" type="number" min="0" placeholder="0" value={editJobForm.estimated_hours} onChange={e => setEditJobForm(p => ({ ...p, estimated_hours: nonNegative(e.target.value) }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input label="Hourly Rate" type="number" min="0" placeholder="0.00" value={editJobForm.hourly_rate} onChange={e => setEditJobForm(p => ({ ...p, hourly_rate: nonNegative(e.target.value) }))} />
            <Select label="Currency" value={editJobForm.currency} onChange={e => setEditJobForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
          <Input label="Due Date" type="date" value={editJobForm.due_date} onChange={e => setEditJobForm(p => ({ ...p, due_date: e.target.value }))} />
          <div>
            <Input label="Max Hours / Day" type="number" step="0.5" min="0.5" max="24" placeholder="e.g. 7" value={editJobForm.max_hours_per_day} onChange={e => setEditJobForm(p => ({ ...p, max_hours_per_day: clampMaxHoursPerDay(e.target.value) }))} />
            <p className="text-[11px] text-gray-500 mt-1">Time logged beyond this per day counts as overtime. Leave blank to use the employee's shift hours instead.</p>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer min-h-[24px]">
            <input type="checkbox" checked={editJobForm.billable} onChange={e => setEditJobForm(p => ({ ...p, billable: e.target.checked }))} className="w-4 h-4 accent-[#730042] shrink-0" />
            <span className="text-[13px] text-gray-600">Billable job</span>
          </label>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
            <Btn variant="ghost" onClick={() => setEditJobOpen(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleUpdateJob} disabled={!editJobForm.title || updateJob.isPending} className="w-full sm:w-auto">
              {updateJob.isPending ? "Saving…" : "Save Changes"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Time">
        <div className="flex flex-col gap-3.5">
          <Select label="Job" value={logForm.job} onChange={e => setLogForm(p => ({ ...p, job: e.target.value }))}>
            <option value="">Select job…</option>
            {assignedJobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date" type="date" value={logForm.log_date} onChange={e => setLogForm(p => ({ ...p, log_date: e.target.value }))} />
            <Input label="Duration (minutes)" type="number" placeholder="e.g. 90" min="1" value={logForm.duration_minutes} onChange={e => setLogForm(p => ({ ...p, duration_minutes: nonNegative(e.target.value) }))} />
          </div>
          <Input label="Note (optional)" placeholder="What did you work on?" value={logForm.note} onChange={e => setLogForm(p => ({ ...p, note: e.target.value }))} />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
            <Btn variant="ghost" onClick={() => setLogModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleLogTime} disabled={!logForm.job || !logForm.duration_minutes || logTime.isPending} className="w-full sm:w-auto">
              {logTime.isPending ? "Saving…" : "Save Entry"}
            </Btn>
          </div>
        </div>
      </Modal>

      <JobDetailModal jobId={selectedJobId} open={jobDetailOpen} onClose={() => setJobDetailOpen(false)} />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        html, body { overflow-x: hidden !important; max-width: 100%; }
        * { box-sizing: border-box; min-width: 0; word-break: break-word; }
        table, img, svg { max-width: 100%; }
      `}</style>
    </div>
  );
}