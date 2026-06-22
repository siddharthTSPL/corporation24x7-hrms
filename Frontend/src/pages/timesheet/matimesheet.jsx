import React, { useState, useEffect, useCallback } from "react";
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
const fmtDuration = (mins) => {
  if (!mins && mins !== 0) return "—";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};
const fmtSeconds = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const STATUS_STYLE = {
  draft: { text: "text-gray-400", bg: "bg-gray-50", label: "Draft" },
  pending_manager: { text: "text-amber-600", bg: "bg-amber-50", label: "Pending Manager" },
  pending_reporting_manager: { text: "text-amber-600", bg: "bg-amber-50", label: "Pending Review" },
  pending_admin: { text: "text-blue-600", bg: "bg-blue-50", label: "Pending Admin" },
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

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Team Jobs" },
  { id: "my-work", label: "My Work" },
  { id: "approvals", label: "Approvals" },
  { id: "timesheets", label: "Timesheets" },
];

function TorchXLogo() {
  return (
    <div className="flex items-center gap-2.5 flex-shrink-0">
      <div className="w-8 h-8 sm:w-[34px] sm:h-[34px] rounded-[10px] bg-gradient-to-br from-[#730042] to-[#CD166E] flex items-center justify-center shadow-[0_2px_8px_rgba(115,0,66,0.15)] flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z" fill="white" fillOpacity="0.9" />
          <circle cx="10" cy="8" r="2" fill="white" />
        </svg>
      </div>
      <div className="hidden sm:block">
        <div className="font-extrabold text-sm text-gray-900 tracking-tight leading-none">TorchX</div>
        <div className="text-[10px] text-gray-400 font-medium tracking-wide">TIMESHEET</div>
      </div>
    </div>
  );
}

function Badge({ status }) {
  const s = STATUS_STYLE[status] || { text: "text-gray-400", bg: "bg-gray-50", label: status };
  return (
    <span className={`${s.text} ${s.bg} rounded-md text-[10px] font-bold tracking-wide px-2 py-1 uppercase whitespace-nowrap`}>
      {s.label}
    </span>
  );
}

function Chip({ color = "brand", children }) {
  const map = {
    brand: "text-[#730042] bg-[#730042]/10",
    green: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    red: "text-red-600 bg-red-50",
    blue: "text-blue-600 bg-blue-50",
    gray: "text-gray-400 bg-gray-100",
  };
  return (
    <span className={`${map[color] || map.brand} rounded-md text-[10px] font-bold px-2 py-1 uppercase tracking-wide whitespace-nowrap`}>
      {children}
    </span>
  );
}

function PriorityChip({ priority }) {
  return (
    <span className={`${PRIORITY_CHIP[priority] || PRIORITY_CHIP.low} rounded-md text-[10px] font-bold px-2 py-1 uppercase tracking-wide whitespace-nowrap`}>
      {priority}
    </span>
  );
}

function JobChip({ status }) {
  return (
    <span className={`${JOB_STATUS_CHIP[status] || "text-gray-400 bg-gray-100"} rounded-md text-[10px] font-bold px-2 py-1 uppercase tracking-wide whitespace-nowrap`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
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
      className="fixed inset-0 z-[200] bg-gray-900/55 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[540px] shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col mt-auto sm:mt-0">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <span className="font-bold text-[15px] text-gray-900">{title}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 text-lg bg-gray-50 border-none rounded-lg cursor-pointer flex-shrink-0"
          >×</button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{label}</label>}
      {children}
    </div>
  );
}

const inputClass = "bg-gray-50 border-[1.5px] border-gray-200 rounded-[10px] px-3.5 py-2.5 text-[13px] text-gray-900 outline-none w-full box-border font-inherit focus:border-[#730042] transition-colors";

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
    primary: "bg-[#730042] text-white border border-transparent",
    ghost: "bg-transparent text-gray-700 border-[1.5px] border-gray-200",
    danger: "bg-red-50 text-red-600 border-[1.5px] border-red-200",
    success: "bg-emerald-50 text-emerald-600 border-[1.5px] border-emerald-200",
    amber: "bg-amber-50 text-amber-600 border-[1.5px] border-amber-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} rounded-[10px] px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-all inline-flex items-center justify-center gap-1.5 font-inherit ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}
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
  const [stopModal, setStopModal] = useState(false);
  const [stopNote, setStopNote] = useState("");

  useEffect(() => {
    if (!timer || timer.status !== "running") { setElapsed(timer?.accumulated_seconds || 0); return; }
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
      <Card className="overflow-hidden">
        <div
          className={`px-4 sm:px-5 py-3.5 flex items-center gap-2.5 ${isRunning ? "bg-gradient-to-br from-[#730042] to-[#CD166E]" : "bg-gray-50"}`}
        >
          {isRunning && (
            <div className="w-2 h-2 rounded-full bg-white/90 animate-[timerPulse_1.4s_ease-in-out_infinite] flex-shrink-0" />
          )}
          <span className={`${isRunning ? "text-white/90" : "text-gray-400"} text-[11px] font-bold uppercase tracking-wide`}>
            {isRunning ? "Timer Running" : isPaused ? "Timer Paused" : "No Active Timer"}
          </span>
          {timer?.job?.title && (
            <span className={`${isRunning ? "text-white/75" : "text-gray-400"} ml-auto text-xs overflow-hidden text-ellipsis whitespace-nowrap max-w-[110px] sm:max-w-[130px]`}>
              {timer.job.title}
            </span>
          )}
        </div>
        <div className="px-5 sm:px-6 py-5">
          <div className={`font-mono text-3xl sm:text-[42px] font-extrabold tracking-wider leading-none mb-4 select-none ${isRunning ? "text-[#730042]" : isPaused ? "text-amber-600" : "text-gray-200"}`}>
            {fmtSeconds(displaySecs)}
          </div>
          {!timer ? (
            <Btn onClick={() => setStartModal(true)} className="w-full sm:w-auto">▶ Start Timer</Btn>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {isRunning && <Btn variant="amber" onClick={() => pauseTimer.mutate({}, { onSuccess: refetchTimer })}>⏸ Pause</Btn>}
              {isPaused && <Btn onClick={() => resumeTimer.mutate({}, { onSuccess: refetchTimer })}>▶ Resume</Btn>}
              <Btn variant="success" onClick={() => setStopModal(true)}>■ Stop & Log</Btn>
              <Btn variant="danger" onClick={() => discardTimer.mutate({}, { onSuccess: refetchTimer })}>Discard</Btn>
            </div>
          )}
        </div>
      </Card>

      <Modal open={startModal} onClose={() => setStartModal(false)} title="Start Timer">
        <div className="flex flex-col gap-4">
          <Sel label="Job (assigned to me)" value={startForm.job} onChange={(e) => setStartForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select a job…</option>
            {(jobs || []).filter((j) => !["completed", "cancelled"].includes(j.status)).map((j) => (
              <option key={j._id} value={j._id}>{j.title}</option>
            ))}
          </Sel>
          <Input label="Note (optional)" placeholder="What are you working on?" value={startForm.note} onChange={(e) => setStartForm((p) => ({ ...p, note: e.target.value }))} />
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setStartModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={() => startTimer.mutate({ job: startForm.job, note: startForm.note }, { onSuccess: () => { setStartModal(false); setStartForm({ job: "", note: "" }); refetchTimer(); } })} disabled={!startForm.job || startTimer.isPending} className="w-full sm:w-auto">▶ Start</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={stopModal} onClose={() => setStopModal(false)} title="Stop & Log Time">
        <div className="flex flex-col gap-4">
          <div className="bg-[#730042]/[0.07] border-[1.5px] border-[#730042]/15 rounded-xl px-4 sm:px-[18px] py-3.5 flex justify-between items-center gap-3">
            <span className="text-xs text-[#730042] font-semibold">Elapsed Time</span>
            <span className="font-mono font-extrabold text-lg sm:text-xl text-[#730042]">{fmtSeconds(displaySecs)}</span>
          </div>
          <Input label="Note (optional)" placeholder="Brief description…" value={stopNote} onChange={(e) => setStopNote(e.target.value)} />
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setStopModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn variant="success" onClick={() => stopTimer.mutate({ note: stopNote }, { onSuccess: () => { setStopModal(false); setStopNote(""); refetchTimer(); } })} disabled={stopTimer.isPending} className="w-full sm:w-auto">{stopTimer.isPending ? "Logging…" : "■ Log Time"}</Btn>
          </div>
        </div>
      </Modal>
      <style>{`@keyframes timerPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}`}</style>
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
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 border-b border-gray-200 min-w-[560px]">
          {days.map((d, i) => {
            const iso = d.toISOString().slice(0, 10);
            const isToday = iso === today;
            const mins = weekDays[iso]?.totalMinutes || 0;
            return (
              <div key={iso} className={`px-1.5 sm:px-2 pt-2.5 sm:pt-3 pb-2.5 text-center ${i < 6 ? "border-r border-gray-200" : ""} ${isToday ? "bg-[#730042]/[0.07]" : ""}`}>
                <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide">{DAY_NAMES[i]}</div>
                <div className={`text-base sm:text-xl font-extrabold mt-1 ${isToday ? "text-[#730042]" : "text-gray-900"}`}>{d.getDate()}</div>
                {mins > 0
                  ? <div className="mt-1.5 text-[9px] sm:text-[10px] font-bold text-[#730042] bg-[#730042]/[0.07] rounded px-1 py-0.5 whitespace-nowrap">{fmtDuration(mins)}</div>
                  : <div className="mt-1.5 h-[18px]" />
                }
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 min-w-[560px] min-h-[140px]">
          {days.map((d, i) => {
            const iso = d.toISOString().slice(0, 10);
            const logs = weekDays[iso]?.logs || [];
            const isToday = iso === today;
            return (
              <div key={iso} className={`${i < 6 ? "border-r border-gray-200" : ""} ${isToday ? "bg-[#730042]/[0.02]" : ""} px-1.5 py-2 flex flex-col gap-1`}>
                {logs.map((log) => (
                  <div key={log._id} title={`${log.job?.title || "—"} · ${fmtDuration(log.duration_minutes)}`} className={`${log.billable ? "bg-emerald-50 border-emerald-200" : "bg-[#730042]/[0.07] border-[#730042]/20"} border rounded-md px-[7px] py-1.5 ${log.billable ? "border-l-[3px] border-l-emerald-600" : "border-l-[3px] border-l-[#730042]"}`}>
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

export default function ManagerTimesheet() {
  const [tab, setTab] = useState("overview");
  const [weekStart, setWeekStart] = useState(getMonday());
  const [jobModal, setJobModal] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [rejectModal, setRejectModal] = useState({ open: false, ts: null });
  const [rejectReason, setRejectReason] = useState("");
  const [jobForm, setJobForm] = useState({ title: "", description: "", assigned_to: "", assigned_to_model: "User", priority: "medium", estimated_hours: "", billable: false, hourly_rate: "", due_date: "" });
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

  const createJob = useCreateJob();
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

  const handleCreateJob = () => {
    if (!jobForm.title || !jobForm.assigned_to) return;
    const target = targets.find((t) => t.id === jobForm.assigned_to);
    createJob.mutate({
      title: jobForm.title, description: jobForm.description,
      assigned_to: jobForm.assigned_to, assigned_to_model: target?.model || "User",
      priority: jobForm.priority, estimated_hours: Number(jobForm.estimated_hours) || 0,
      billable: jobForm.billable, hourly_rate: Number(jobForm.hourly_rate) || 0,
      due_date: jobForm.due_date || null,
    }, {
      onSuccess: () => {
        setJobModal(false);
        setJobForm({ title: "", description: "", assigned_to: "", assigned_to_model: "User", priority: "medium", estimated_hours: "", billable: false, hourly_rate: "", due_date: "" });
        refetchCreated();
      },
    });
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

  return (
    <div className="min-h-screen bg-[#F4F5F9] font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 sm:h-[60px] gap-3 sm:gap-5">
            <TorchXLogo />
            <div className="hidden sm:block w-px h-7 bg-gray-200 flex-shrink-0" />
            <nav className="flex gap-0.5 flex-1 overflow-x-auto no-scrollbar">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-[13px] cursor-pointer transition-all whitespace-nowrap border-b-2 flex-shrink-0 ${
                    tab === t.id
                      ? "bg-[#730042]/10 text-[#730042] font-bold border-[#730042]"
                      : "bg-transparent text-gray-700 font-medium border-transparent"
                  }`}
                >
                  {t.label}
                  {t.id === "approvals" && approvals.length > 0 && (
                    <span className="absolute top-1 right-1 bg-red-600 text-white rounded-full text-[8px] font-extrabold w-3.5 h-3.5 flex items-center justify-center">
                      {approvals.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <Btn onClick={() => setJobModal(true)} className="hidden sm:inline-flex">+ Create Job</Btn>
            <button
              onClick={() => setJobModal(true)}
              className="sm:hidden flex-shrink-0 w-9 h-9 rounded-lg bg-[#730042] text-white flex items-center justify-center text-lg font-bold"
            >+</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-7">

        {tab === "overview" && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
              {[
                { label: "Jobs Created", value: createdJobs.length, color: "text-[#730042]" },
                { label: "Pending Approvals", value: approvals.length, color: "text-amber-600" },
                { label: "Overrun Risk", value: overrunJobs.length, color: "text-red-600" },
                { label: "My Hours This Week", value: fmtDuration(totalWeekMins), color: "text-emerald-600" },
              ].map((s) => (
                <Card key={s.label} className="px-4 sm:px-[22px] py-4 sm:py-5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">{s.label}</div>
                  <div className={`text-xl sm:text-[28px] font-black ${s.color}`}>{s.value}</div>
                </Card>
              ))}
            </div>

            <Card>
              <div className="px-4 sm:px-[22px] py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-gray-900">Team Workload</div>
                  <div className="text-[11px] text-gray-400">Weekly capacity per person</div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button onClick={() => shiftWeek(-1)} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 cursor-pointer text-gray-700">‹</button>
                  <span className="text-xs text-gray-700 font-semibold whitespace-nowrap">
                    {new Date(weekStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {weekEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <button onClick={() => shiftWeek(1)} className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 cursor-pointer text-gray-700">›</button>
                </div>
              </div>
              <div className="px-3 sm:px-[22px] py-4 overflow-x-auto">
                {heatmap.length === 0 ? (
                  <div className="text-center text-gray-400 text-[13px] py-6">No team data for this week</div>
                ) : (
                  <div className="flex flex-col gap-2.5 min-w-[480px]">
                    <div className="flex gap-1.5 pl-11">
                      {DAY_NAMES.map((d) => <div key={d} className="flex-1 text-center text-[10px] text-gray-400 font-bold">{d}</div>)}
                    </div>
                    {heatmap.map((row, i) => {
                      const dayKeys = Array.from({ length: 7 }, (_, d) => { const dt = new Date(weekStart); dt.setDate(dt.getDate() + d); return dt.toISOString().slice(0, 10); });
                      return (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-8 h-8 bg-[#730042]/[0.07] rounded-full flex items-center justify-center text-[11px] font-extrabold text-[#730042] flex-shrink-0">
                            {row.name ? row.name.slice(0, 2).toUpperCase() : String(row.person).slice(-2).toUpperCase()}
                          </div>
                          {dayKeys.map((dk) => {
                            const pct = row.days[dk]?.loadPercent || 0;
                            const bg = pct === 0 ? "bg-gray-50" : pct < 60 ? "bg-emerald-100" : pct < 90 ? "bg-amber-100" : "bg-red-100";
                            const col = pct === 0 ? "text-gray-400" : pct < 60 ? "text-emerald-600" : pct < 90 ? "text-amber-600" : "text-red-600";
                            return (
                              <div key={dk} title={`${pct}%`} className={`flex-1 h-8 ${bg} rounded-lg flex items-center justify-center text-[10px] font-bold ${col}`}>
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

            {overrunJobs.length > 0 && (
              <Card>
                <div className="px-4 sm:px-[22px] py-3.5 border-b border-gray-200 flex items-center gap-2">
                  <span className="text-sm font-bold text-red-600">⚠ Overrun Risk</span>
                  <Chip color="red">{overrunJobs.length}</Chip>
                </div>
                {overrunJobs.map((j) => (
                  <div key={j._id} className="px-4 sm:px-[22px] py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-gray-900 truncate">{j.title}</div>
                      <div className="text-[11px] text-gray-400">{j.logged_hours_cache}h logged / {j.estimated_hours}h estimated</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-[5px] bg-gray-50 rounded-full">
                        <div className={`h-full rounded-full ${j.riskPercent >= 100 ? "bg-red-600" : "bg-amber-600"}`} style={{ width: `${Math.min(100, j.riskPercent)}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${j.riskPercent >= 100 ? "text-red-600" : "text-amber-600"}`}>{j.riskPercent}%</span>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {tab === "team" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">Team Jobs</h1>
                <p className="text-[13px] text-gray-400 mt-1 mb-0">{createdJobs.length} jobs assigned to your team</p>
              </div>
              <Btn onClick={() => setJobModal(true)} className="w-full sm:w-auto">+ Create Job</Btn>
            </div>
            <div className="flex flex-col gap-2.5">
              {createdJobs.length === 0 ? (
                <Card className="px-6 sm:px-8 py-12 sm:py-16 text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <div className="font-bold text-base text-gray-900 mb-3">No jobs created yet</div>
                  <Btn onClick={() => setJobModal(true)}>+ Create Job</Btn>
                </Card>
              ) : (
                createdJobs.map((j) => (
                  <Card key={j._id} className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3.5">
                    <div className="flex gap-3.5">
                      <div className={`w-1 rounded ${JOB_STATUS_DOT[j.status] || "bg-gray-400"} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 mb-1.5">{j.title}</div>
                        {j.assigned_to_name && (
                          <div className="text-[11px] text-gray-400 mb-1.5">
                            Assigned to <span className="font-semibold text-gray-700">{j.assigned_to_name}</span>
                            {j.assigned_to_model && <span className="text-[#730042] font-semibold"> · {j.assigned_to_model}</span>}
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <PriorityChip priority={j.priority} />
                          <JobChip status={j.status} />
                          {j.billable && <Chip color="green">Billable</Chip>}
                          {j.estimated_hours > 0 && <Chip color="blue">{j.logged_hours_cache}h / {j.estimated_hours}h</Chip>}
                          {j.due_date && <Chip color="gray">Due {fmtDate(j.due_date)}</Chip>}
                        </div>
                        {j.estimated_hours > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="w-24 sm:w-[120px] h-1 bg-gray-50 rounded-full">
                              <div className={`h-full rounded-full ${j.overrun_flagged ? "bg-red-600" : "bg-[#730042]"}`} style={{ width: `${Math.min(100, (j.logged_hours_cache / j.estimated_hours) * 100)}%` }} />
                            </div>
                            <span className={`text-[10px] ${j.overrun_flagged ? "text-red-600" : "text-gray-400"}`}>{Math.round((j.logged_hours_cache / j.estimated_hours) * 100)}% logged</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 flex-wrap sm:self-start">
                      {!["completed", "cancelled"].includes(j.status) && (
                        <>
                          <button onClick={() => updateJobStatus.mutate({ id: j._id, status: "completed" }, { onSuccess: refetchCreated })} className="bg-emerald-50 text-emerald-600 border-none rounded-lg px-3 py-1.5 text-[11px] font-semibold cursor-pointer flex-1 sm:flex-none">Complete</button>
                          <button onClick={() => archiveJob.mutate(j._id, { onSuccess: refetchCreated })} className="bg-gray-50 text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] font-semibold cursor-pointer flex-1 sm:flex-none">Archive</button>
                        </>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "my-work" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">My Work</h1>
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-[10px] px-2.5 py-1.5">
                  <button onClick={() => shiftWeek(-1)} className="bg-transparent border-none cursor-pointer text-gray-700 text-base flex">‹</button>
                  <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                    {new Date(weekStart).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {weekEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                  <button onClick={() => shiftWeek(1)} className="bg-transparent border-none cursor-pointer text-gray-700 text-base flex">›</button>
                </div>
                <Btn onClick={() => setLogModal(true)}>+ Log Time</Btn>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 sm:gap-5">
              <div className="flex flex-col gap-3.5">
                <TimerWidget jobs={assignedJobs} />
                <Card className="px-3.5 sm:px-4 py-3.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">My Assigned Jobs</div>
                  {assignedJobs.length === 0 ? (
                    <div className="text-[13px] text-gray-400">No jobs assigned to you</div>
                  ) : assignedJobs.slice(0, 6).map((j) => (
                    <div key={j._id} className="py-2 border-b border-gray-200 flex items-center justify-between gap-2 last:border-b-0">
                      <div className="text-[13px] font-semibold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">{j.title}</div>
                      <JobChip status={j.status} />
                    </div>
                  ))}
                </Card>
              </div>
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="px-4 sm:px-[18px] py-4">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Total This Week</div>
                    <div className="text-lg sm:text-[22px] font-black text-[#730042]">{fmtDuration(totalWeekMins)}</div>
                  </Card>
                  <Card className="px-4 sm:px-[18px] py-4">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Capacity</div>
                    <div className="text-lg sm:text-[22px] font-black text-emerald-600">{Math.round((totalWeekMins / 2400) * 100)}%</div>
                  </Card>
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

        {tab === "approvals" && (
          <div>
            <div className="mb-5">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">Pending Approvals</h1>
              <p className="text-[13px] text-gray-400 mt-1 mb-0">{approvals.length} timesheet{approvals.length !== 1 ? "s" : ""} in your queue</p>
            </div>
            {approvals.length === 0 ? (
              <Card className="px-6 sm:px-8 py-12 sm:py-16 text-center">
                <div className="text-4xl mb-3">✅</div>
                <div className="font-bold text-base text-gray-900 mb-1.5">All clear!</div>
                <div className="text-[13px] text-gray-400">No timesheets pending your review</div>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {approvals.map((ts) => (
                  <Card key={ts._id} className="px-4 sm:px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex gap-3.5">
                        <div className="w-10 h-10 sm:w-[42px] sm:h-[42px] bg-[#730042]/[0.07] rounded-xl flex items-center justify-center text-base font-extrabold text-[#730042] flex-shrink-0">
                          {ts.owner?.f_name?.[0] || "?"}
                        </div>
                        <div>
                          <div className="text-[15px] font-bold text-gray-900">{ts.owner?.f_name} {ts.owner?.l_name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{ts.owner?.work_email}</div>
                          <div className="text-xs text-gray-400 mt-0.5">Week: {fmtDate(ts.week_start)} – {fmtDate(ts.week_end)}</div>
                          <div className="flex gap-2 mt-2.5 flex-wrap">
                            <Chip color="brand">{fmtDuration(ts.total_minutes)} total</Chip>
                            {ts.billable_minutes > 0 && <Chip color="green">{fmtDuration(ts.billable_minutes)} billable</Chip>}
                            <Badge status={ts.status} />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Btn variant="success" onClick={() => approveTS.mutate({ timesheetId: ts._id, remarks: "Approved" }, { onSuccess: refetchApprovals })} className="flex-1 sm:flex-none">Approve</Btn>
                        <Btn variant="amber" onClick={() => forwardTS.mutate({ timesheetId: ts._id, remarks: "Forwarded to reporting manager" }, { onSuccess: refetchApprovals })} className="flex-1 sm:flex-none">Forward</Btn>
                        <Btn variant="danger" onClick={() => setRejectModal({ open: true, ts })} className="flex-1 sm:flex-none">Reject</Btn>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "timesheets" && (
          <div>
            <div className="mb-5">
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">My Timesheets</h1>
            </div>
            <div className="flex flex-col gap-2.5">
              {timesheets.length === 0 ? (
                <Card className="px-6 sm:px-8 py-12 sm:py-16 text-center">
                  <div className="font-bold text-base text-gray-900 mb-1.5">No timesheets yet</div>
                  <Btn onClick={() => setTab("my-work")}>Go to My Work</Btn>
                </Card>
              ) : timesheets.map((ts) => (
                <Card key={ts._id} className="px-4 sm:px-6 py-4 sm:py-[18px] flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900 mb-1.5">Week of {fmtDate(ts.week_start)}</div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge status={ts.status} />
                      <Chip color="brand">{fmtDuration(ts.total_minutes)}</Chip>
                      {ts.billable_minutes > 0 && <Chip color="green">{fmtDuration(ts.billable_minutes)} billable</Chip>}
                    </div>
                  </div>
                  {ts.remarks && <div className="text-xs text-gray-700 italic">"{ts.remarks}"</div>}
                </Card>
              ))}
            </div>
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
                {t.name || t.full_name || `${t.f_name || ""} ${t.l_name || ""}`.trim() || t.id} — {t.role || t.model}
              </option>
            ))}
          </Sel>
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Priority" value={jobForm.priority} onChange={(e) => setJobForm((p) => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </Sel>
            <Input label="Estimated Hours" type="number" placeholder="0" value={jobForm.estimated_hours} onChange={(e) => setJobForm((p) => ({ ...p, estimated_hours: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Hourly Rate (₹)" type="number" placeholder="0" value={jobForm.hourly_rate} onChange={(e) => setJobForm((p) => ({ ...p, hourly_rate: e.target.value }))} />
            <Input label="Due Date" type="date" value={jobForm.due_date} onChange={(e) => setJobForm((p) => ({ ...p, due_date: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={jobForm.billable} onChange={(e) => setJobForm((p) => ({ ...p, billable: e.target.checked }))} className="w-[15px] h-[15px] accent-[#730042]" />
            <span className="text-[13px] text-gray-700">Billable job</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setJobModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleCreateJob} disabled={!jobForm.title || !jobForm.assigned_to || createJob.isPending} className="w-full sm:w-auto">{createJob.isPending ? "Creating…" : "Create Job"}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Time">
        <div className="flex flex-col gap-4">
          <Sel label="Job" value={logForm.job} onChange={(e) => setLogForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select job…</option>
            {assignedJobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Sel>
          <Input label="Date" type="date" value={logForm.log_date} onChange={(e) => setLogForm((p) => ({ ...p, log_date: e.target.value }))} />
          <Input label="Duration (minutes)" type="number" placeholder="e.g. 90" value={logForm.duration_minutes} onChange={(e) => setLogForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
          <Input label="Note" placeholder="What did you work on?" value={logForm.note} onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))} />
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setLogModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleLogTime} disabled={!logForm.job || !logForm.duration_minutes || logTime.isPending} className="w-full sm:w-auto">{logTime.isPending ? "Logging…" : "Save Entry"}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, ts: null })} title="Reject Timesheet">
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-gray-700 m-0">Provide a reason for rejection. This will be sent to the submitter.</p>
          <Input label="Reason *" placeholder="Enter reason for rejection…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Btn variant="ghost" onClick={() => setRejectModal({ open: false, ts: null })} className="w-full sm:w-auto">Cancel</Btn>
            <Btn variant="danger" onClick={() => { rejectTS.mutate({ timesheetId: rejectModal.ts._id, remarks: rejectReason }, { onSuccess: () => { setRejectModal({ open: false, ts: null }); setRejectReason(""); refetchApprovals(); } }); }} disabled={!rejectReason || rejectTS.isPending} className="w-full sm:w-auto">
              {rejectTS.isPending ? "Rejecting…" : "Reject"}
            </Btn>
          </div>
        </div>
      </Modal>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}