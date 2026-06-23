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
  draft: { text: "text-gray-400", bg: "bg-gray-50", label: "Draft" },
  pending_manager: { text: "text-amber-600", bg: "bg-amber-50", label: "Pending Manager" },
  pending_reporting_manager: { text: "text-amber-600", bg: "bg-amber-50", label: "Pending Review" },
  pending_admin: { text: "text-blue-600", bg: "bg-blue-50", label: "Pending Admin" },
  pending_superadmin: { text: "text-blue-600", bg: "bg-blue-50", label: "Pending SA" },
  approved: { text: "text-emerald-600", bg: "bg-emerald-50", label: "Approved" },
  rejected: { text: "text-red-600", bg: "bg-red-50", label: "Rejected" },
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

function TorchXLogo() {
  return (
    <div className="flex items-center gap-2.5">
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
  };
  return (
    <span className={`${map[color] || map.brand} rounded-md text-[10px] font-bold px-2 py-1 uppercase tracking-wide whitespace-nowrap`}>
      {children}
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

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[480px] shadow-2xl max-h-[88vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 flex-shrink-0">
          <span className="font-bold text-[14px] sm:text-[15px] text-gray-900">{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-gray-400 text-lg bg-gray-50 border-none rounded-lg cursor-pointer flex-shrink-0"
          >×</button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "bg-gray-50 border-[1.5px] border-gray-200 rounded-[10px] px-3.5 py-2.5 text-[16px] sm:text-[13px] text-gray-900 outline-none w-full box-border font-inherit focus:border-[#730042] transition-colors";

function Input({ label, ...props }) {
  return (
    <Field label={label}>
      <input {...props} className={inputClass} />
    </Field>
  );
}

function Select({ label, children, ...props }) {
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

function ModalFooter({ children }) {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-1">
      {children}
    </div>
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
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div
          className={`px-5 sm:px-6 py-4 flex items-center gap-2.5 ${isRunning ? "bg-gradient-to-br from-[#730042] to-[#CD166E]" : "bg-gray-50"}`}
        >
          {isRunning && (
            <div className="w-2 h-2 rounded-full bg-white/90 animate-[timerPulse_1.4s_ease-in-out_infinite] flex-shrink-0" />
          )}
          <span className={`${isRunning ? "text-white/90" : "text-gray-400"} text-[11px] font-bold uppercase tracking-wide`}>
            {isRunning ? "Timer Running" : isPaused ? "Timer Paused" : "No Active Timer"}
          </span>
          {timer?.job?.title && (
            <span className={`${isRunning ? "text-white/75" : "text-gray-400"} ml-auto text-xs overflow-hidden text-ellipsis whitespace-nowrap max-w-[120px] sm:max-w-[160px]`}>
              {timer.job.title}
            </span>
          )}
        </div>

        <div className="px-5 sm:px-7 pt-6 sm:pt-7 pb-5 sm:pb-6">
          <div
            className={`font-mono text-4xl sm:text-[56px] font-extrabold tracking-wider leading-none mb-5 sm:mb-6 select-none ${isRunning ? "text-[#730042]" : isPaused ? "text-amber-600" : "text-gray-200"}`}
          >
            {fmtSeconds(displaySecs)}
          </div>

          {!timer ? (
            <div>
              <p className="text-[13px] text-gray-400 mb-4 mt-0">
                Select a job and start tracking time.
              </p>
              <Btn onClick={() => setStartModal(true)} className="w-full sm:w-auto">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><polygon points="3,1 11,6 3,11" /></svg>
                Start Timer
              </Btn>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:flex gap-2 sm:flex-wrap">
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
        <div className="flex flex-col gap-4">
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
          <ModalFooter>
            <Btn variant="ghost" onClick={() => setStartModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn
              onClick={() =>
                startTimer.mutate({ job: startForm.job, note: startForm.note }, {
                  onSuccess: () => { setStartModal(false); setStartForm({ job: "", note: "" }); refetchTimer(); },
                })
              }
              disabled={!startForm.job || startTimer.isPending}
              className="w-full sm:w-auto"
            >
              {startTimer.isPending ? "Starting…" : "▶ Start"}
            </Btn>
          </ModalFooter>
        </div>
      </Modal>

      <Modal open={stopModal} onClose={() => setStopModal(false)} title="Stop & Log Time">
        <div className="flex flex-col gap-4">
          <div className="bg-[#730042]/[0.07] border-[1.5px] border-[#730042]/15 rounded-xl px-4 sm:px-5 py-3.5 flex justify-between items-center gap-3">
            <span className="text-xs text-[#730042] font-semibold">Elapsed Time</span>
            <span className="font-mono font-extrabold text-xl sm:text-[22px] text-[#730042]">{fmtSeconds(displaySecs)}</span>
          </div>
          <Input
            label="Note (optional)"
            placeholder="Brief description of work done…"
            value={stopNote}
            onChange={(e) => setStopNote(e.target.value)}
          />
          <ModalFooter>
            <Btn variant="ghost" onClick={() => setStopModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn
              variant="success"
              onClick={() =>
                stopTimer.mutate({ note: stopNote }, {
                  onSuccess: () => { setStopModal(false); setStopNote(""); refetchTimer(); },
                })
              }
              disabled={stopTimer.isPending}
              className="w-full sm:w-auto"
            >
              {stopTimer.isPending ? "Logging…" : "■ Log Time"}
            </Btn>
          </ModalFooter>
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

function CalendarWeekGrid({ weekStart, weekDays, onAddLog }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 border-b border-gray-200 min-w-[560px] sm:min-w-0 overflow-x-auto">
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === today;
          const dayData = weekDays[iso];
          const mins = dayData?.totalMinutes || 0;
          return (
            <div
              key={iso}
              className={`px-1 sm:px-2 pt-2.5 sm:pt-3 pb-2.5 text-center ${i < 6 ? "border-r border-gray-200" : ""} ${isToday ? "bg-[#730042]/[0.07]" : ""}`}
            >
              <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                {DAY_NAMES[i]}
              </div>
              <div className={`text-base sm:text-xl font-extrabold mt-1 ${isToday ? "text-[#730042]" : "text-gray-900"}`}>
                {d.getDate()}
              </div>
              {mins > 0 ? (
                <div className="mt-1.5 text-[9px] sm:text-[10px] font-bold text-[#730042] bg-[#730042]/[0.07] rounded px-1 py-0.5 whitespace-nowrap">
                  {fmtDuration(mins)}
                </div>
              ) : (
                <div className="mt-1.5 h-[18px]" />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 min-w-[560px] sm:min-w-0 overflow-x-auto min-h-[180px]">
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const dayData = weekDays[iso];
          const logs = dayData?.logs || [];
          const isToday = iso === today;

          return (
            <div
              key={iso}
              className={`${i < 6 ? "border-r border-gray-200" : ""} ${isToday ? "bg-[#730042]/[0.025]" : ""} px-1.5 sm:px-2 py-2.5 flex flex-col gap-1 min-h-[160px]`}
            >
              {logs.map((log) => (
                <div
                  key={log._id}
                  title={`${log.job?.title || "—"}\n${fmtDuration(log.duration_minutes)}\n${log.note || ""}`}
                  className={`${log.billable ? "bg-emerald-50 border-emerald-200" : "bg-[#730042]/[0.07] border-[#730042]/20"} border rounded-md px-2 py-1.5 ${log.billable ? "border-l-[3px] border-l-emerald-600" : "border-l-[3px] border-l-[#730042]"} cursor-default`}
                >
                  <div className="text-[11px] font-bold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">
                    {log.job?.title || "—"}
                  </div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${log.billable ? "text-emerald-600" : "text-[#730042]"}`}>
                    {fmtDuration(log.duration_minutes)}
                  </div>
                </div>
              ))}
              <button
                onClick={() => onAddLog(iso)}
                className="mt-auto bg-transparent border-[1.5px] border-dashed border-gray-200 rounded-md py-1.5 px-1 cursor-pointer text-gray-400 text-[11px] font-semibold w-full transition-colors hover:border-[#730042] hover:text-[#730042]"
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
    <div className="bg-white border border-gray-200 rounded-2xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 shadow-sm">
      <div className="flex items-center gap-2 justify-between sm:justify-start">
        <button
          onClick={onPrev}
          className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer text-gray-700 text-base flex items-center justify-center flex-shrink-0"
        >‹</button>
        <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap text-center flex-1 sm:flex-none">
          {start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — {end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <button
          onClick={onNext}
          className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer text-gray-700 text-base flex items-center justify-center flex-shrink-0"
        >›</button>
      </div>

      <div className="grid grid-cols-3 sm:flex gap-3 sm:gap-6">
        {[
          { label: "Total Hours", value: fmtDuration(totalWeekMins), color: "text-[#730042]" },
          { label: "Days Logged", value: `${daysWithLogs} / 7`, color: "text-gray-700" },
          { label: "Capacity", value: `${capacityPct}%`, color: capacityPct >= 80 ? "text-emerald-600" : capacityPct >= 50 ? "text-amber-600" : "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="min-w-0">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{s.label}</div>
            <div className={`text-base sm:text-lg font-extrabold mt-0.5 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="sm:ml-auto">
        <Btn onClick={onSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
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
    <div className="min-h-screen bg-[#F4F5F9] font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center gap-3 sm:gap-8 h-14 sm:h-[60px]">
          <TorchXLogo />

          <div className="hidden sm:block w-px h-7 bg-gray-200" />

          <nav className="flex gap-0.5 flex-1 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-2.5 sm:px-4 py-1.5 text-xs sm:text-[13px] cursor-pointer transition-all whitespace-nowrap border-b-2 ${
                  tab === t.id
                    ? "bg-[#730042]/10 text-[#730042] font-bold border-[#730042]"
                    : "bg-transparent text-gray-700 font-medium border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:block text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 font-medium whitespace-nowrap">
            My Workspace
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-7">

        {tab === "timer" && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,400px)_1fr] gap-4 sm:gap-5 items-start">
            <div className="flex flex-col gap-4">
              <TimerWidget jobs={activeJobs} />

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 sm:px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-gray-900">My Active Jobs</span>
                  <Chip color="brand">{activeJobs.length}</Chip>
                </div>
                <div className="max-h-[280px] overflow-y-auto">
                  {jobs.length === 0 ? (
                    <div className="py-8 px-5 text-center text-gray-400 text-[13px]">
                      No jobs assigned to you yet
                    </div>
                  ) : (
                    jobs.slice(0, 10).map((j) => {
                      const progPct = j.estimated_hours
                        ? Math.min(100, Math.round((j.logged_hours_cache / j.estimated_hours) * 100))
                        : 0;
                      const pColor = progPct >= 90 ? "bg-red-600" : progPct >= 70 ? "bg-amber-600" : "bg-emerald-600";
                      return (
                        <div key={j._id} className="px-4 sm:px-5 py-2.5 border-b border-gray-200 flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${JOB_STATUS_DOT[j.status] || "bg-gray-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-gray-900 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">{j.title}</div>
                            {j.estimated_hours > 0 && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-[3px] bg-gray-200 rounded-full">
                                  <div className={`h-full rounded-full ${pColor}`} style={{ width: `${progPct}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                  {j.logged_hours_cache}h / {j.estimated_hours}h
                                </span>
                              </div>
                            )}
                          </div>
                          <JobChip status={j.status} />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "This Week", value: fmtDuration(totalWeekMins), color: "text-[#730042]" },
                  { label: "Days Logged", value: `${daysWithLogs} / 5`, color: "text-emerald-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-white border border-gray-200 rounded-2xl px-4 sm:px-[22px] py-4 sm:py-5 shadow-sm">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">{s.label}</div>
                    <div className={`text-xl sm:text-[28px] font-black ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl px-4 sm:px-[22px] py-4 sm:py-5 shadow-sm">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3.5">
                  This Week at a Glance
                </div>
                <div className="flex gap-1 sm:gap-1.5">
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(weekStart);
                    d.setDate(d.getDate() + i);
                    const iso = d.toISOString().slice(0, 10);
                    const dayData = weekDays[iso];
                    const mins = dayData?.totalMinutes || 0;
                    const pct = Math.min(100, Math.round((mins / 480) * 100));
                    const today = new Date().toISOString().slice(0, 10) === iso;
                    return (
                      <div key={iso} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`text-[9px] font-bold uppercase ${today ? "text-[#730042]" : "text-gray-400"}`}>
                          {DAY_NAMES[i]}
                        </div>
                        <div className="w-full h-12 sm:h-[60px] bg-gray-50 rounded-md relative overflow-hidden">
                          <div
                            className={`absolute bottom-0 w-full rounded-t transition-[height] duration-300 ${
                              today
                                ? "bg-gradient-to-b from-[#CD166E] to-[#730042]"
                                : pct >= 80 ? "bg-emerald-600/80" : "bg-[#730042]/40"
                            }`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <div className={`text-[9px] font-bold ${mins > 0 ? "text-[#730042]" : "text-gray-400"}`}>
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">Weekly Time Log</h1>
                <p className="text-[13px] text-gray-400 mt-1 mb-0">
                  Click any day to add a time entry
                </p>
              </div>
              <Btn onClick={() => openLogForDate(new Date().toISOString().slice(0, 10))} className="w-full sm:w-auto">
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

            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <CalendarWeekGrid
                weekStart={weekStart}
                weekDays={weekDays}
                onAddLog={openLogForDate}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[13px] font-bold text-gray-700 mt-1">All Entries This Week</div>
              {Object.entries(weekDays)
                .sort(([a], [b]) => a.localeCompare(b))
                .flatMap(([date, data]) =>
                  (data.logs || []).map((log) => ({ ...log, _date: date }))
                )
                .map((log) => (
                  <div key={log._id} className="bg-white border border-gray-200 rounded-xl px-4 sm:px-[18px] py-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-1 h-10 rounded flex-shrink-0 ${log.billable ? "bg-emerald-600" : "bg-[#730042]"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-gray-900 truncate">{log.job?.title || "—"}</div>
                        <div className="flex gap-2 items-center mt-0.5 flex-wrap">
                          <span className="text-[11px] text-gray-400">
                            {new Date(log._date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                          {log.note && (
                            <span className="text-[11px] text-gray-400 truncate">· {log.note}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap flex-shrink-0 pl-4 sm:pl-0">
                      {log.billable && <Chip color="green">Billable</Chip>}
                      <span className="text-sm font-extrabold text-[#730042]">{fmtDuration(log.duration_minutes)}</span>
                      <Badge status={log.status} />
                      {log.status === "draft" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditModal({ open: true, log }); setEditForm({ duration_minutes: log.duration_minutes, note: log.note, reason: "" }); }}
                            className="bg-blue-50 text-blue-600 border-none rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                          >Edit</button>
                          <button
                            onClick={() => handleDelete(log._id)}
                            className="bg-red-50 text-red-600 border-none rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                          >Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {Object.values(weekDays).every((d) => !d.logs?.length) && (
                <div className="bg-white border border-gray-200 rounded-xl px-5 sm:px-6 py-10 text-center">
                  <div className="text-3xl mb-2.5">📋</div>
                  <div className="font-bold text-sm text-gray-900 mb-1.5">No entries this week</div>
                  <div className="text-[13px] text-gray-400 mb-4">Click any day cell or use the button above to log time.</div>
                  <Btn onClick={() => openLogForDate(new Date().toISOString().slice(0, 10))}>+ Log Time</Btn>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "timesheets" && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 m-0">My Timesheets</h1>
                <p className="text-[13px] text-gray-400 mt-1 mb-0">Track submission and approval status</p>
              </div>
              <Btn onClick={() => submitTS.mutate({ week_start: weekStart }, { onSuccess: refetchTS })} className="w-full sm:w-auto">
                Submit Current Week
              </Btn>
            </div>
            <div className="flex flex-col gap-2.5">
              {timesheets.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl px-6 sm:px-8 py-12 sm:py-16 text-center shadow-sm">
                  <div className="text-4xl mb-3">📄</div>
                  <div className="font-bold text-base text-gray-900 mb-1.5">No timesheets yet</div>
                  <div className="text-[13px] text-gray-400 mb-5">Log time this week, then submit for approval.</div>
                  <Btn onClick={() => setTab("log")}>Go to Time Log</Btn>
                </div>
              ) : (
                timesheets.map((ts) => (
                  <div key={ts._id} className="bg-white border border-gray-200 rounded-2xl px-4 sm:px-6 py-4 sm:py-[18px] flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-[#730042]/[0.07] rounded-xl flex items-center justify-center text-lg flex-shrink-0">📄</div>
                      <div className="flex-1 min-w-[180px] sm:hidden">
                        <div className="text-sm font-bold text-gray-900 mb-1.5">
                          Week of {fmtDate(ts.week_start)}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge status={ts.status} />
                          <Chip color="brand">{fmtDuration(ts.total_minutes)}</Chip>
                          {ts.billable_minutes > 0 && <Chip color="green">{fmtDuration(ts.billable_minutes)} billable</Chip>}
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:block flex-1 min-w-[180px]">
                      <div className="text-sm font-bold text-gray-900 mb-1.5">
                        Week of {fmtDate(ts.week_start)}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge status={ts.status} />
                        <Chip color="brand">{fmtDuration(ts.total_minutes)}</Chip>
                        {ts.billable_minutes > 0 && <Chip color="green">{fmtDuration(ts.billable_minutes)} billable</Chip>}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      {ts.submitted_at && (
                        <div className="text-[11px] text-gray-400">Submitted {fmtDate(ts.submitted_at)}</div>
                      )}
                      {ts.remarks && (
                        <div className="text-[11px] text-gray-700 mt-1 italic max-w-[200px] sm:ml-auto">"{ts.remarks}"</div>
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
        <div className="flex flex-col gap-4">
          <Select label="Job" value={logForm.job} onChange={(e) => setLogForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select a job…</option>
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Select>
          <Input label="Date" type="date" value={logForm.log_date} onChange={(e) => setLogForm((p) => ({ ...p, log_date: e.target.value }))} />
          <Input label="Duration (minutes)" type="number" placeholder="e.g. 90 for 1.5 hours" value={logForm.duration_minutes} onChange={(e) => setLogForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
          <Input label="Note" placeholder="What did you work on?" value={logForm.note} onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))} />
          <ModalFooter>
            <Btn variant="ghost" onClick={() => setLogModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleLogTime} disabled={!logForm.job || !logForm.duration_minutes || logTime.isPending} className="w-full sm:w-auto">
              {logTime.isPending ? "Saving…" : "Save Entry"}
            </Btn>
          </ModalFooter>
        </div>
      </Modal>

      <Modal open={editModal.open} onClose={() => setEditModal({ open: false, log: null })} title="Edit Time Entry">
        <div className="flex flex-col gap-4">
          <Input label="Duration (minutes)" type="number" value={editForm.duration_minutes} onChange={(e) => setEditForm((p) => ({ ...p, duration_minutes: e.target.value }))} />
          <Input label="Note" value={editForm.note} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} />
          <Input label="Reason for edit" placeholder="Required if duration changed…" value={editForm.reason} onChange={(e) => setEditForm((p) => ({ ...p, reason: e.target.value }))} />
          <ModalFooter>
            <Btn variant="ghost" onClick={() => setEditModal({ open: false, log: null })} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleUpdate} disabled={updateLog.isPending} className="w-full sm:w-auto">{updateLog.isPending ? "Saving…" : "Save Changes"}</Btn>
          </ModalFooter>
        </div>
      </Modal>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}