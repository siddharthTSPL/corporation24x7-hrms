import React, { useState, useMemo } from "react";
import {
  useMyProjects, useCreateProject, useAssignableTargets,
  useCreateJob, useJobsCreatedByMe, useUpdateJobStatus, useArchiveJob,
  useOverrunRiskJobs, useIdleJobs, useTeamWorkloadHeatmap, useMyProductivitySummary,
  useMyTimesheets, usePendingApprovals, useApproveTimesheet, useRejectTimesheet, useForwardTimesheet,
  useMyDayLog, useMyWeekLog, useActiveTimer, useStartTimer, usePauseTimer, useResumeTimer, useStopTimer,
  useSubmitTimesheet, useLogTime,
} from "../../auth/server-state/timesheet/timesheet.hook";

const C = {
  bg: "#F6F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F2F8",
  border: "#E4E7F0",
  borderStrong: "#CBD0E0",
  accent: "#4F46E5",
  accentLight: "rgba(79,70,229,0.08)",
  accentMid: "rgba(79,70,229,0.15)",
  gold: "#D97706",
  goldLight: "rgba(217,119,6,0.08)",
  red: "#DC2626",
  redLight: "rgba(220,38,38,0.08)",
  green: "#059669",
  greenLight: "rgba(5,150,105,0.08)",
  blue: "#0284C7",
  blueLight: "rgba(2,132,199,0.08)",
  purple: "#7C3AED",
  text: "#0F172A",
  textMid: "#475569",
  textMuted: "#94A3B8",
};

function cn(...a) { return a.filter(Boolean).join(" "); }

function Tag({ color = C.accent, bg, children }) {
  return (
    <span style={{ color, background: bg || color + "15", borderRadius: 6 }}
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide">
      {children}
    </span>
  );
}

function Card({ children, className = "", style = {}, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, ...style }}
      className={cn("shadow-sm transition-shadow", onClick && "cursor-pointer hover:shadow-md", className)}>
      {children}
    </div>
  );
}

function Stat({ label, value, delta, color = C.accent, icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>{label}</div>
        {icon && <div style={{ background: color + "15", borderRadius: 10, width: 34, height: 34, color }} className="flex items-center justify-center text-lg">{icon}</div>}
      </div>
      <div className="text-[26px] font-black leading-none" style={{ color, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{value}</div>
      {delta && <div className="text-[11px] mt-1.5" style={{ color: C.textMuted }}>{delta}</div>}
    </Card>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, maxWidth: 520, width: "100%", borderRadius: 20 }} className="shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.border }}>
          <span className="font-bold text-[15px]" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ color: C.textMuted }} className="text-xl leading-none hover:text-gray-800">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>{label}</label>}
      <input {...props} style={{ background: C.surfaceAlt, border: `1.5px solid ${C.border}`, color: C.text, borderRadius: 10, outline: "none" }}
        className="px-3.5 py-2.5 text-[13px] w-full placeholder:text-slate-300 focus:border-indigo-400 transition-colors" />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>{label}</label>}
      <select {...props} style={{ background: C.surfaceAlt, border: `1.5px solid ${C.border}`, color: C.text, borderRadius: 10, outline: "none" }}
        className="px-3.5 py-2.5 text-[13px] w-full focus:border-indigo-400 transition-colors appearance-none">
        {children}
      </select>
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, disabled, type = "button", className = "" }) {
  const v = {
    primary: { background: C.accent, color: "#fff" },
    ghost: { background: C.surfaceAlt, color: C.textMid, border: `1px solid ${C.border}` },
    danger: { background: C.redLight, color: C.red },
    success: { background: C.greenLight, color: C.green },
    warning: { background: C.goldLight, color: C.gold },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...v[variant], borderRadius: 10, opacity: disabled ? 0.5 : 1 }}
      className={cn("px-4 py-2 text-[12px] font-semibold transition-all hover:opacity-80 active:scale-[0.97] whitespace-nowrap", className)}>
      {children}
    </button>
  );
}

function SectionHead({ title, sub, right }) {
  return (
    <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
      <div>
        <h2 className="text-[15px] font-bold" style={{ color: C.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{title}</h2>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

const NAV = [
  { id: "overview", label: "Overview", icon: "⊞" },
  { id: "team", label: "My Team", icon: "⊹" },
  { id: "jobs", label: "Jobs", icon: "◫" },
  { id: "approvals", label: "Approvals", icon: "◈" },
  { id: "timelog", label: "Time Log", icon: "◷" },
  { id: "timesheets", label: "Timesheets", icon: "◧" },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [sideOpen, setSideOpen] = useState(false);
  const [jobModal, setJobModal] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [jobForm, setJobForm] = useState({ title: "", assigned_to: "", priority: "medium", estimated_hours: "", billable: false, hourly_rate: "", currency: "INR" });
  const [logForm, setLogForm] = useState({ job: "", log_date: new Date().toISOString().slice(0,10), duration_minutes: "", note: "" });
  const [selectedDate] = useState(new Date().toISOString().slice(0,10));
  const [weekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); });

  const { data: jobsData } = useJobsCreatedByMe();
  const { data: approvalsData } = usePendingApprovals();
  const { data: overrunData } = useOverrunRiskJobs();
  const { data: idleData } = useIdleJobs(5);
  const { data: heatmapData } = useTeamWorkloadHeatmap(weekStart);
  const { data: prodData } = useMyProductivitySummary(weekStart);
  const { data: dayLogData } = useMyDayLog(selectedDate);
  const { data: weekLogData } = useMyWeekLog(weekStart);
  const { data: targetsData } = useAssignableTargets();
  const { data: mySheets } = useMyTimesheets();

  const createJob = useCreateJob();
  const logTime = useLogTime();
  const approveTS = useApproveTimesheet();
  const rejectTS = useRejectTimesheet();
  const forwardTS = useForwardTimesheet();
  const submitTS = useSubmitTimesheet();
  const archiveJob = useArchiveJob();
  const updateJobStatus = useUpdateJobStatus();

  const jobs = jobsData?.jobs ?? [];
  const approvals = approvalsData?.timesheets ?? [];
  const overrunJobs = overrunData?.jobs ?? [];
  const idleJobs = idleData?.jobs ?? [];
  const heatmap = heatmapData?.heatmap ?? [];
  const targets = targetsData?.targets ?? [];
  const dayLogs = dayLogData?.logs ?? [];
  const weekLogs = weekLogData?.days ?? {};
  const myTimesheets = mySheets?.timesheets ?? [];

  const weekTotal = useMemo(() => Object.values(weekLogs).reduce((s, d) => s + (d.totalMinutes || 0), 0), [weekLogs]);
  const completedJobs = useMemo(() => jobs.filter(j => j.status === "completed").length, [jobs]);

  const statusColor = { not_started: C.textMuted, in_progress: C.accent, on_hold: C.gold, completed: C.green, cancelled: C.red };
  const priorityColor = { low: C.green, medium: C.gold, high: C.red, urgent: "#9333EA" };

  const handleCreateJob = async () => {
    const target = targets.find(t => t.id.toString() === jobForm.assigned_to);
    await createJob.mutateAsync({ ...jobForm, assigned_to_model: target?.model || "User", estimated_hours: Number(jobForm.estimated_hours) || 0, hourly_rate: Number(jobForm.hourly_rate) || 0 });
    setJobModal(false);
  };

  const handleLogTime = async () => {
    await logTime.mutateAsync({ ...logForm, duration_minutes: Number(logForm.duration_minutes) });
    setLogModal(false);
    setLogForm({ job: "", log_date: new Date().toISOString().slice(0,10), duration_minutes: "", note: "" });
  };

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'Inter',sans-serif", color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');`}</style>

      {sideOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSideOpen(false)} />}

      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen w-60 z-40 flex flex-col transition-transform duration-300 lg:translate-x-0",
        sideOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ background: C.surface, borderRight: `1px solid ${C.border}` }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-2.5">
            <div style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, borderRadius: 10, width: 34, height: 34 }} className="flex items-center justify-center text-white font-black text-sm">A</div>
            <div>
              <div className="text-[14px] font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", color: C.text }}>TorchX</div>
              <div className="text-[10px]" style={{ color: C.textMuted }}>Admin Portal</div>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-auto">
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setTab(n.id); setSideOpen(false); }}
              style={{
                background: tab === n.id ? C.accentLight : "transparent",
                color: tab === n.id ? C.accent : C.textMid,
                borderRadius: 10, textAlign: "left",
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-slate-50">
              <span className="text-base leading-none w-4">{n.icon}</span>
              {n.label}
              {n.id === "approvals" && approvals.length > 0 && (
                <span style={{ background: C.red, color: "#fff" }} className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full">{approvals.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: C.border }}>
          <div style={{ background: `linear-gradient(135deg, ${C.accentLight}, ${C.blueLight})`, border: `1px solid ${C.border}`, borderRadius: 12 }} className="p-3">
            <div className="text-[11px] font-bold" style={{ color: C.accent }}>Admin Access</div>
            <div className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>Manage team & approvals</div>
          </div>
        </div>
      </aside>

      <div className="lg:ml-60 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b" style={{ background: C.surface + "f5", borderColor: C.border, backdropFilter: "blur(10px)" }}>
          <button onClick={() => setSideOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100" style={{ color: C.textMid }}>☰</button>
          <div className="flex-1">
            <h1 className="text-[16px] font-extrabold" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{NAV.find(n => n.id === tab)?.label}</h1>
          </div>
          <div className="flex gap-2">
            <Btn onClick={() => setLogModal(true)} variant="ghost">Log Time</Btn>
            <Btn onClick={() => setJobModal(true)}>＋ Job</Btn>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {tab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Jobs Created" value={jobs.length} delta={`${completedJobs} completed`} color={C.accent} icon="◫" />
                <Stat label="Week Hours" value={`${(weekTotal/60).toFixed(1)}h`} delta={`of 40h capacity`} color={C.blue} icon="◷" />
                <Stat label="Pending Reviews" value={approvals.length} delta="Timesheets" color={C.red} icon="◈" />
                <Stat label="At-Risk Jobs" value={overrunJobs.length} delta="Exceeding estimate" color={C.gold} icon="⚠" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <Card className="p-5">
                    <SectionHead title="Team Workload" sub={`Week of ${weekStart}`} />
                    {heatmap.length === 0 ? (
                      <div className="py-8 text-center" style={{ color: C.textMuted }}>
                        <div className="text-3xl mb-2">⊹</div>
                        <div className="text-[12px]">No team data this week</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {heatmap.slice(0, 5).map((row, i) => {
                          const days = Array.from({ length: 5 }, (_, idx) => {
                            const d = new Date(weekStart); d.setDate(d.getDate() + idx);
                            return row.days?.[d.toISOString().slice(0,10)];
                          });
                          const totalPct = days.reduce((s, d) => s + (d?.loadPercent ?? 0), 0) / 5;
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <div className="w-20 text-[11px] font-medium truncate" style={{ color: C.textMid }}>Member {i+1}</div>
                              <div className="flex-1 flex gap-1">
                                {days.map((day, j) => {
                                  const pct = day?.loadPercent ?? 0;
                                  const bg = pct === 0 ? C.surfaceAlt : pct < 60 ? C.green + "25" : pct < 90 ? C.gold + "25" : C.red + "25";
                                  const border = pct === 0 ? C.border : pct < 60 ? C.green + "50" : pct < 90 ? C.gold + "50" : C.red + "50";
                                  return (
                                    <div key={j} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8 }} className="flex-1 py-2 text-center text-[10px] font-bold" style2={{ color: pct === 0 ? C.textMuted : "inherit" }}>
                                      <span style={{ color: pct === 0 ? C.textMuted : pct < 60 ? C.green : pct < 90 ? C.gold : C.red }}>{pct > 0 ? `${pct}%` : "—"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="text-[11px] font-bold w-10 text-right" style={{ color: totalPct < 60 ? C.green : totalPct < 90 ? C.gold : C.red }}>
                                {Math.round(totalPct)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  <Card className="p-5">
                    <SectionHead title="My Productivity" sub={`Week of ${weekStart}`} />
                    {prodData ? (
                      <div>
                        <div className="flex items-baseline gap-3 mb-4">
                          <span className="text-3xl font-black" style={{ color: C.accent, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{(prodData.totalMinutes/60).toFixed(1)}h</span>
                          <span className="text-[12px]" style={{ color: C.textMuted }}>this week · {prodData.capacityPercent}% capacity</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: C.surfaceAlt }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(prodData.capacityPercent, 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.purple})` }} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            ["Total", `${(prodData.totalMinutes/60).toFixed(1)}h`, C.accent],
                            ["Billable", `${(prodData.billableMinutes/60).toFixed(1)}h`, C.green],
                            ["Non-Bill.", `${(prodData.nonBillableMinutes/60).toFixed(1)}h`, C.textMuted],
                          ].map(([l, v, c]) => (
                            <div key={l} style={{ background: C.surfaceAlt, borderRadius: 12 }} className="p-3 text-center">
                              <div className="text-[16px] font-bold" style={{ color: c, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{v}</div>
                              <div className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : <div className="py-6 text-center text-[12px]" style={{ color: C.textMuted }}>Loading productivity data…</div>}
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card className="p-5">
                    <SectionHead title="Today's Log" sub={selectedDate} />
                    {dayLogs.length === 0 ? (
                      <div className="py-6 text-center">
                        <div className="text-2xl mb-1.5">◷</div>
                        <div className="text-[12px]" style={{ color: C.textMuted }}>No time logged today</div>
                        <button onClick={() => setLogModal(true)} className="mt-2 text-[11px] font-semibold" style={{ color: C.accent }}>Log time →</button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-auto">
                        {dayLogs.map(log => (
                          <div key={log._id} style={{ background: C.surfaceAlt, borderRadius: 10 }} className="flex items-center gap-2.5 p-2.5">
                            <div style={{ background: C.accentLight, color: C.accent, borderRadius: 8, width: 34, height: 34 }} className="flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                              {log.duration_minutes}m
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold truncate">{log.job?.title || "—"}</div>
                              <div className="text-[10px]" style={{ color: C.textMuted }}>{log.billable ? "Billable" : "Non-billable"}</div>
                            </div>
                          </div>
                        ))}
                        <div className="pt-1 text-[11px] font-semibold" style={{ color: C.textMid }}>
                          Total: {dayLogData?.totalMinutes}m
                        </div>
                      </div>
                    )}
                  </Card>

                  <Card className="p-5">
                    <SectionHead title="Overrun Jobs" />
                    {overrunJobs.length === 0 ? (
                      <div className="py-4 text-center"><div className="text-[12px]" style={{ color: C.textMuted }}>All jobs on track ✓</div></div>
                    ) : (
                      <div className="space-y-2">
                        {overrunJobs.slice(0,4).map(j => (
                          <div key={j._id} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold truncate">{j.title}</div>
                              <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                                <div style={{ width: `${Math.min(j.riskPercent, 100)}%`, background: j.riskPercent >= 100 ? C.red : C.gold }} className="h-full rounded-full" />
                              </div>
                            </div>
                            <span className="text-[10px] font-bold flex-shrink-0" style={{ color: j.riskPercent >= 100 ? C.red : C.gold }}>{j.riskPercent}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          )}

          {tab === "team" && (
            <div className="space-y-4">
              <SectionHead title="Team Workload Heatmap" sub={`Week of ${weekStart}`} />
              <Card className="p-5 overflow-x-auto">
                <table className="w-full text-[11px] min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-6 font-semibold" style={{ color: C.textMuted }}>Member</th>
                      {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                        <th key={d} className="text-center py-2 px-2 font-semibold" style={{ color: C.textMuted }}>{d}</th>
                      ))}
                      <th className="text-right py-2 pl-2 font-semibold" style={{ color: C.textMuted }}>Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {heatmap.map((row, i) => {
                      const days = Array.from({ length: 7 }, (_, idx) => {
                        const d = new Date(weekStart); d.setDate(d.getDate() + idx);
                        return row.days?.[d.toISOString().slice(0,10)];
                      });
                      const avg = days.reduce((s, d) => s + (d?.loadPercent ?? 0), 0) / 7;
                      return (
                        <tr key={i} className="border-t" style={{ borderColor: C.border }}>
                          <td className="py-2.5 pr-6 font-medium" style={{ color: C.textMid }}>Member {i+1}</td>
                          {days.map((day, j) => {
                            const pct = day?.loadPercent ?? 0;
                            const bg = pct === 0 ? C.surfaceAlt : pct < 60 ? C.green + "20" : pct < 90 ? C.gold + "20" : C.red + "20";
                            const fc = pct === 0 ? C.textMuted : pct < 60 ? C.green : pct < 90 ? C.gold : C.red;
                            return (
                              <td key={j} className="text-center py-1.5 px-1">
                                <span style={{ background: bg, color: fc, borderRadius: 6 }} className="px-2 py-1 font-semibold inline-block w-full">
                                  {pct > 0 ? `${pct}%` : "—"}
                                </span>
                              </td>
                            );
                          })}
                          <td className="text-right py-1.5 pl-2 font-bold" style={{ color: avg < 60 ? C.green : avg < 90 ? C.gold : C.red }}>
                            {Math.round(avg)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-5">
                  <SectionHead title="Idle Jobs" sub={`No activity in 5+ days`} />
                  {idleJobs.length === 0 ? (
                    <div className="py-6 text-center text-[12px]" style={{ color: C.textMuted }}>All jobs are active</div>
                  ) : (
                    <div className="space-y-2">
                      {idleJobs.map(j => (
                        <div key={j._id} style={{ background: C.surfaceAlt, borderRadius: 10 }} className="flex items-center gap-3 p-3">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: C.gold }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold truncate">{j.title}</div>
                            <div className="text-[10px]" style={{ color: C.textMuted }}>Updated {new Date(j.updatedAt).toLocaleDateString("en-IN", {day:"numeric",month:"short"})}</div>
                          </div>
                          <Tag color={statusColor[j.status]}>{j.status.replace(/_/g," ")}</Tag>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                <Card className="p-5">
                  <SectionHead title="Overrun Risk" sub="Jobs ≥ 75% of estimate" />
                  {overrunJobs.length === 0 ? (
                    <div className="py-6 text-center text-[12px]" style={{ color: C.textMuted }}>No jobs at risk ✓</div>
                  ) : (
                    <div className="space-y-3">
                      {overrunJobs.map(j => (
                        <div key={j._id}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-semibold truncate max-w-[70%]">{j.title}</span>
                            <span className="font-bold" style={{ color: j.riskPercent >= 100 ? C.red : C.gold }}>{j.riskPercent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                            <div style={{ width: `${Math.min(j.riskPercent, 100)}%`, background: j.riskPercent >= 100 ? C.red : C.gold }} className="h-full rounded-full" />
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{j.logged_hours_cache}h / {j.estimated_hours}h</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {tab === "jobs" && (
            <div className="space-y-4">
              <SectionHead title="Jobs I Created" sub={`${jobs.length} total`} right={<Btn onClick={() => setJobModal(true)}>＋ Create Job</Btn>} />
              <div className="space-y-2">
                {jobs.map(job => (
                  <Card key={job._id} className="p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-bold">{job.title}</span>
                          <Tag color={priorityColor[job.priority]}>{job.priority}</Tag>
                          {job.billable && <Tag color={C.gold}>Billable</Tag>}
                          {job.overrun_flagged && <Tag color={C.red}>Overrun</Tag>}
                        </div>
                        <div className="text-[11px] mt-1 flex gap-3 flex-wrap" style={{ color: C.textMuted }}>
                          <span>{job.logged_hours_cache?.toFixed(1)}h logged</span>
                          {job.estimated_hours > 0 && <span>/ {job.estimated_hours}h est.</span>}
                          {job.due_date && <span>Due {new Date(job.due_date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>}
                        </div>
                        {job.estimated_hours > 0 && (
                          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: C.border }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min((job.logged_hours_cache/job.estimated_hours)*100,100)}%`, background: job.overrun_flagged ? C.red : C.accent }} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select value={job.status} onChange={e => updateJobStatus.mutate({ id: job._id, status: e.target.value })}
                          style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, color: statusColor[job.status], borderRadius: 8, fontSize: 11, outline: "none" }}
                          className="px-2.5 py-1.5 font-semibold">
                          {["not_started","in_progress","on_hold","completed","cancelled"].map(s => (
                            <option key={s} value={s} style={{ color: C.text }}>{s.replace(/_/g," ")}</option>
                          ))}
                        </select>
                        <Btn variant="ghost" onClick={() => archiveJob.mutate(job._id)}>Archive</Btn>
                      </div>
                    </div>
                  </Card>
                ))}
                {jobs.length === 0 && (
                  <Card className="py-14 text-center">
                    <div className="text-3xl mb-2">◫</div>
                    <div className="font-semibold mb-1">No jobs yet</div>
                    <div className="text-[12px] mb-3" style={{ color: C.textMuted }}>Create a job and assign it to your team</div>
                    <Btn onClick={() => setJobModal(true)}>Create Job</Btn>
                  </Card>
                )}
              </div>
            </div>
          )}

          {tab === "approvals" && (
            <div className="space-y-4">
              <SectionHead title="Pending Approvals" sub={`${approvals.length} timesheets`} />
              {approvals.length === 0 ? (
                <Card className="py-14 text-center">
                  <div className="text-3xl mb-2">◈</div>
                  <div className="font-semibold mb-1">All clear</div>
                  <div className="text-[12px]" style={{ color: C.textMuted }}>No timesheets pending your review</div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {approvals.map(ts => (
                    <Card key={ts._id} className="p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="text-[14px] font-bold">{ts.owner?.f_name} {ts.owner?.l_name}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>
                            {ts.owner?.work_email} · Week: {new Date(ts.week_start).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}–{new Date(ts.week_end).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
                          </div>
                          <div className="flex gap-3 mt-2">
                            <Tag color={C.accent}>{(ts.total_minutes/60).toFixed(1)}h total</Tag>
                            <Tag color={C.green}>{(ts.billable_minutes/60).toFixed(1)}h billable</Tag>
                            <Tag color={C.textMuted}>{ts.status?.replace(/_/g," ")}</Tag>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Btn variant="success" onClick={() => approveTS.mutate({ timesheetId: ts._id, remarks: "Approved" })}>Approve</Btn>
                          <Btn variant="warning" onClick={() => forwardTS.mutate({ timesheetId: ts._id, remarks: "Forwarded to reporting manager" })}>Forward</Btn>
                          <Btn variant="danger" onClick={() => rejectTS.mutate({ timesheetId: ts._id, remarks: "Rejected" })}>Reject</Btn>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "timelog" && (
            <div className="space-y-4">
              <SectionHead title="Time Log" sub="Your logged hours" right={<Btn onClick={() => setLogModal(true)}>＋ Log Time</Btn>} />
              <Card className="p-5">
                <SectionHead title={`Week of ${weekStart}`} />
                <div className="space-y-1">
                  {Object.entries(weekLogs).map(([date, data]) => (
                    <div key={date} style={{ borderRadius: 10, background: data.totalMinutes > 0 ? C.accentLight : C.surfaceAlt }} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-20 text-[11px] font-semibold" style={{ color: C.textMid }}>{new Date(date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</div>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                        <div style={{ width: `${Math.min((data.totalMinutes/480)*100, 100)}%`, background: C.accent }} className="h-full rounded-full" />
                      </div>
                      <div className="text-[12px] font-bold w-12 text-right" style={{ color: data.totalMinutes > 0 ? C.accent : C.textMuted }}>
                        {data.totalMinutes > 0 ? `${(data.totalMinutes/60).toFixed(1)}h` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {tab === "timesheets" && (
            <div className="space-y-4">
              <SectionHead title="My Timesheets" sub={`${myTimesheets.length} total`}
                right={<Btn onClick={() => submitTS.mutate({ week_start: weekStart })}>Submit Week</Btn>} />
              <div className="space-y-2">
                {myTimesheets.map(ts => {
                  const sc = { draft: C.textMuted, pending_manager: C.gold, pending_admin: C.blue, approved: C.green, rejected: C.red };
                  return (
                    <Card key={ts._id} className="p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-[13px] font-bold">Week of {new Date(ts.week_start).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
                          <div className="flex gap-2 mt-1.5">
                            <Tag color={sc[ts.status] || C.textMuted}>{ts.status?.replace(/_/g," ")}</Tag>
                            <Tag color={C.accent}>{(ts.total_minutes/60).toFixed(1)}h</Tag>
                            {ts.billable_minutes > 0 && <Tag color={C.green}>{(ts.billable_minutes/60).toFixed(1)}h bill.</Tag>}
                          </div>
                        </div>
                        {ts.remarks && <div className="text-[11px] italic" style={{ color: C.textMuted }}>"{ts.remarks}"</div>}
                      </div>
                    </Card>
                  );
                })}
                {myTimesheets.length === 0 && (
                  <Card className="py-12 text-center">
                    <div className="text-3xl mb-2">◧</div>
                    <div className="font-semibold mb-1">No timesheets yet</div>
                    <div className="text-[12px] mb-3" style={{ color: C.textMuted }}>Submit your week to start tracking</div>
                    <Btn onClick={() => submitTS.mutate({ week_start: weekStart })}>Submit Current Week</Btn>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <Modal open={jobModal} onClose={() => setJobModal(false)} title="Create Job">
        <div className="space-y-4">
          <Input label="Job Title" placeholder="e.g. API Integration" value={jobForm.title} onChange={e => setJobForm(p => ({...p,title:e.target.value}))} />
          <Select label="Assign To" value={jobForm.assigned_to} onChange={e => setJobForm(p => ({...p,assigned_to:e.target.value}))}>
            <option value="">Select member…</option>
            {targets.map(t => <option key={t.id} value={t.id}>{t.id} ({t.model})</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={jobForm.priority} onChange={e => setJobForm(p => ({...p,priority:e.target.value}))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </Select>
            <Input label="Est. Hours" type="number" placeholder="0" value={jobForm.estimated_hours} onChange={e => setJobForm(p => ({...p,estimated_hours:e.target.value}))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={jobForm.billable} onChange={e => setJobForm(p => ({...p,billable:e.target.checked}))} className="accent-indigo-600 w-4 h-4" />
            <span className="text-[13px]" style={{ color: C.textMid }}>Billable</span>
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <Btn variant="ghost" onClick={() => setJobModal(false)}>Cancel</Btn>
            <Btn onClick={handleCreateJob} disabled={!jobForm.title || !jobForm.assigned_to || createJob.isPending}>{createJob.isPending ? "Creating…" : "Create Job"}</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Time">
        <div className="space-y-4">
          <Select label="Job" value={logForm.job} onChange={e => setLogForm(p => ({...p,job:e.target.value}))}>
            <option value="">Select job…</option>
            {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Select>
          <Input label="Date" type="date" value={logForm.log_date} onChange={e => setLogForm(p => ({...p,log_date:e.target.value}))} />
          <Input label="Duration (minutes)" type="number" placeholder="e.g. 120" value={logForm.duration_minutes} onChange={e => setLogForm(p => ({...p,duration_minutes:e.target.value}))} />
          <Input label="Note" placeholder="What did you work on?" value={logForm.note} onChange={e => setLogForm(p => ({...p,note:e.target.value}))} />
          <div className="flex gap-2 justify-end pt-2">
            <Btn variant="ghost" onClick={() => setLogModal(false)}>Cancel</Btn>
            <Btn onClick={handleLogTime} disabled={!logForm.job || !logForm.duration_minutes || logTime.isPending}>{logTime.isPending ? "Logging…" : "Log Time"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}