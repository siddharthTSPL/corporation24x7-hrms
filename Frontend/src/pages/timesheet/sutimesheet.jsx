import React, { useState, useMemo } from "react";
import {
  useMyProjects, useCreateProject, useAssignableTargets,
  useCreateJob, useJobsCreatedByMe, useUpdateJob, useUpdateJobStatus, useArchiveJob,
  useOverrunRiskJobs, useIdleJobs, useTeamWorkloadHeatmap,
  useMyTimesheets, usePendingApprovals, useApproveTimesheet, useRejectTimesheet,
} from "../../auth/server-state/timesheet/timesheet.hook";

const C = {
  bg: "#0A0A0F",
  surface: "#13131A",
  surfaceUp: "#1C1C28",
  border: "#2A2A3D",
  borderHover: "#3D3D5C",
  accent: "#7C5CFC",
  accentHover: "#9B7FFF",
  accentGlow: "rgba(124,92,252,0.18)",
  gold: "#F0B429",
  goldGlow: "rgba(240,180,41,0.15)",
  red: "#F04438",
  redGlow: "rgba(240,68,56,0.15)",
  green: "#12B76A",
  greenGlow: "rgba(18,183,106,0.15)",
  text: "#F2F2FF",
  textMid: "#9898B8",
  textMuted: "#5C5C7A",
};

function cn(...args) { return args.filter(Boolean).join(" "); }

function Pill({ color = C.accent, children }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}44` }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide">
      {children}
    </span>
  );
}

function Card({ children, className = "", glow, onClick, style = {} }) {
  return (
    <div onClick={onClick}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        boxShadow: glow ? `0 0 24px ${glow}` : "none",
        ...style,
      }}
      className={cn("rounded-2xl overflow-hidden transition-all duration-200", onClick && "cursor-pointer hover:border-[#3D3D5C]", className)}>
      {children}
    </div>
  );
}

function StatTile({ label, value, sub, color = C.accent, glow }) {
  return (
    <Card glow={glow} className="p-5">
      <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: C.textMuted }}>{label}</div>
      <div className="text-3xl font-black leading-none mb-1" style={{ color, fontFamily: "'Space Grotesk',sans-serif" }}>{value}</div>
      {sub && <div className="text-[11px]" style={{ color: C.textMuted }}>{sub}</div>}
    </Card>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, maxWidth: 540, width: "100%", borderRadius: 20 }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: C.border }}>
          <span className="font-bold text-[15px]" style={{ color: C.text, fontFamily: "'Space Grotesk',sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ color: C.textMuted }} className="hover:text-white text-xl leading-none">×</button>
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
      <input
        {...props}
        style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, outline: "none" }}
        className="px-3.5 py-2.5 text-[13px] w-full placeholder:text-[#3a3a55] focus:border-[#7C5CFC] transition-colors"
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>{label}</label>}
      <select
        {...props}
        style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text, borderRadius: 10, outline: "none" }}
        className="px-3.5 py-2.5 text-[13px] w-full focus:border-[#7C5CFC] transition-colors appearance-none"
      >
        {children}
      </select>
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, type = "button", disabled, className = "" }) {
  const styles = {
    primary: { background: C.accent, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: C.textMid, border: `1px solid ${C.border}` },
    danger: { background: C.red + "22", color: C.red, border: `1px solid ${C.red}44` },
    success: { background: C.green + "22", color: C.green, border: `1px solid ${C.green}44` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], borderRadius: 10, opacity: disabled ? 0.5 : 1 }}
      className={cn("px-4 py-2 text-[12px] font-semibold transition-all hover:opacity-90 active:scale-95 whitespace-nowrap", className)}>
      {children}
    </button>
  );
}

function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex items-start justify-between mb-4 gap-3">
      <div>
        <h2 className="text-[16px] font-bold" style={{ color: C.text, fontFamily: "'Space Grotesk',sans-serif" }}>{title}</h2>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "◈" },
  { id: "projects", label: "Projects", icon: "⬡" },
  { id: "jobs", label: "Jobs", icon: "⬢" },
  { id: "approvals", label: "Approvals", icon: "✦" },
  { id: "analytics", label: "Analytics", icon: "◎" },
];

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", description: "", billing_type: "hourly", currency: "INR", default_hourly_rate: "" });
  const [jobForm, setJobForm] = useState({ title: "", description: "", assigned_to: "", assigned_to_model: "User", priority: "medium", estimated_hours: "", billable: true, hourly_rate: "", currency: "INR" });
  const [weekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); d.setHours(0,0,0,0); return d.toISOString().slice(0,10);
  });

  const { data: projectsData } = useMyProjects();
  const { data: jobsData } = useJobsCreatedByMe();
  const { data: approvalsData } = usePendingApprovals();
  const { data: overrunData } = useOverrunRiskJobs();
  const { data: idleData } = useIdleJobs(7);
  const { data: heatmapData } = useTeamWorkloadHeatmap(weekStart);
  const { data: targetsData } = useAssignableTargets();

  const createProject = useCreateProject();
  const createJob = useCreateJob();
  const approveTS = useApproveTimesheet();
  const rejectTS = useRejectTimesheet();
  const archiveJob = useArchiveJob();
  const updateJobStatus = useUpdateJobStatus();

  const projects = projectsData?.projects ?? [];
  const jobs = jobsData?.jobs ?? [];
  const approvals = approvalsData?.timesheets ?? [];
  const overrunJobs = overrunData?.jobs ?? [];
  const idleJobs = idleData?.jobs ?? [];
  const heatmap = heatmapData?.heatmap ?? [];
  const targets = targetsData?.targets ?? [];

  const totalHours = useMemo(() => jobs.reduce((s, j) => s + (j.logged_hours_cache || 0), 0), [jobs]);
  const billableJobs = useMemo(() => jobs.filter(j => j.billable).length, [jobs]);
  const completedJobs = useMemo(() => jobs.filter(j => j.status === "completed").length, [jobs]);

  const handleCreateProject = async () => {
    await createProject.mutateAsync({ ...projectForm, default_hourly_rate: Number(projectForm.default_hourly_rate) || 0 });
    setCreateProjectOpen(false);
    setProjectForm({ name: "", description: "", billing_type: "hourly", currency: "INR", default_hourly_rate: "" });
  };

  const handleCreateJob = async () => {
    const target = targets.find(t => t.id.toString() === jobForm.assigned_to);
    await createJob.mutateAsync({
      ...jobForm,
      assigned_to_model: target?.model || jobForm.assigned_to_model,
      estimated_hours: Number(jobForm.estimated_hours) || 0,
      hourly_rate: Number(jobForm.hourly_rate) || 0,
    });
    setCreateJobOpen(false);
    setJobForm({ title: "", description: "", assigned_to: "", assigned_to_model: "User", priority: "medium", estimated_hours: "", billable: true, hourly_rate: "", currency: "INR" });
  };

  const priorityColor = { low: C.green, medium: C.gold, high: C.red, urgent: "#FF4FA0" };
  const statusColor = { not_started: C.textMuted, in_progress: C.accent, on_hold: C.gold, completed: C.green, cancelled: C.red };

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'Inter',sans-serif", color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');`}</style>

      <div className="flex min-h-screen">
        <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-0 h-screen" style={{ background: C.surface, borderRight: `1px solid ${C.border}` }}>
          <div className="px-5 py-6 border-b" style={{ borderColor: C.border }}>
            <div className="flex items-center gap-2.5">
              <div style={{ background: C.accent, borderRadius: 10, width: 32, height: 32 }} className="flex items-center justify-center text-white font-black text-sm">S</div>
              <div>
                <div className="text-[13px] font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>TorchX</div>
                <div className="text-[10px]" style={{ color: C.textMuted }}>Super Admin</div>
              </div>
            </div>
          </div>
          <nav className="flex flex-col gap-1 p-3 flex-1">
            {NAV_ITEMS.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                style={{
                  background: tab === n.id ? C.accentGlow : "transparent",
                  color: tab === n.id ? C.accent : C.textMid,
                  border: tab === n.id ? `1px solid ${C.accent}33` : "1px solid transparent",
                  borderRadius: 10, textAlign: "left",
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium transition-all hover:text-white">
                <span className="text-base leading-none">{n.icon}</span>
                {n.label}
                {n.id === "approvals" && approvals.length > 0 && (
                  <span style={{ background: C.red, color: "#fff" }} className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full">{approvals.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t" style={{ borderColor: C.border }}>
            <div style={{ background: C.accentGlow, border: `1px solid ${C.accent}33`, borderRadius: 12 }} className="p-3">
              <div className="text-[11px] font-semibold" style={{ color: C.accent }}>Full Access</div>
              <div className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>All modules unlocked</div>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b" style={{ background: C.surface + "ee", borderColor: C.border, backdropFilter: "blur(12px)" }}>
            <div>
              <h1 className="text-[18px] font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                {NAV_ITEMS.find(n => n.id === tab)?.label}
              </h1>
              <p className="text-[11px]" style={{ color: C.textMuted }}>Super Admin · Full Control</p>
            </div>
            <div className="flex items-center gap-2">
              <Btn onClick={() => setCreateJobOpen(true)}>＋ New Job</Btn>
              <Btn variant="ghost" onClick={() => setCreateProjectOpen(true)}>＋ Project</Btn>
            </div>
          </header>

          <main className="flex-1 p-5 lg:p-6 overflow-auto">
            {tab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatTile label="Total Projects" value={projects.length} sub="Across all teams" color={C.accent} glow={C.accentGlow} />
                  <StatTile label="Active Jobs" value={jobs.filter(j => j.status === "in_progress").length} sub={`${completedJobs} completed`} color={C.green} glow={C.greenGlow} />
                  <StatTile label="Hours Logged" value={`${totalHours.toFixed(0)}h`} sub={`${billableJobs} billable jobs`} color={C.gold} glow={C.goldGlow} />
                  <StatTile label="Pending Reviews" value={approvals.length} sub="Timesheets awaiting" color={C.red} glow={C.redGlow} />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Card className="p-5">
                    <SectionHeader title="At-Risk Jobs" sub={`${overrunJobs.length} jobs exceeding estimate`} />
                    {overrunJobs.length === 0 ? (
                      <div className="py-8 text-center" style={{ color: C.textMuted }}>
                        <div className="text-3xl mb-2">✓</div>
                        <div className="text-[12px]">No jobs at risk</div>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-64 overflow-auto pr-1">
                        {overrunJobs.map(job => (
                          <div key={job._id} style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 12 }} className="flex items-center gap-3 p-3">
                            <div style={{ width: 36, height: 36, background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 10 }} className="flex items-center justify-center flex-shrink-0 text-xs font-bold" style2={{ color: C.red }}>
                              <span style={{ color: C.red }}>{job.riskPercent}%</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-semibold truncate">{job.title}</div>
                              <div className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{job.logged_hours_cache}h / {job.estimated_hours}h est.</div>
                            </div>
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(job.riskPercent, 100)}%`, background: job.riskPercent >= 100 ? C.red : C.gold }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card className="p-5">
                    <SectionHeader title="Idle Jobs" sub="No activity in 7+ days" />
                    {idleJobs.length === 0 ? (
                      <div className="py-8 text-center" style={{ color: C.textMuted }}>
                        <div className="text-3xl mb-2">🚀</div>
                        <div className="text-[12px]">All jobs are active</div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-auto pr-1">
                        {idleJobs.map(job => (
                          <div key={job._id} style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 12 }} className="flex items-center gap-3 p-3">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: C.gold }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-semibold truncate">{job.title}</div>
                              <div className="text-[10px]" style={{ color: C.textMuted }}>Last updated: {new Date(job.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                            </div>
                            <Pill color={job.status === "in_progress" ? C.accent : C.textMuted}>{job.status.replace("_", " ")}</Pill>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                <Card className="p-5">
                  <SectionHeader title="Team Workload Heatmap" sub={`Week of ${weekStart}`} />
                  {heatmap.length === 0 ? (
                    <div className="py-8 text-center" style={{ color: C.textMuted }}>No team data for this week</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr>
                            <th className="text-left py-2 pr-4 font-medium" style={{ color: C.textMuted }}>Member</th>
                            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                              <th key={d} className="text-center py-2 px-2 font-medium" style={{ color: C.textMuted }}>{d}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {heatmap.map((row, i) => {
                            const days = Array.from({ length: 7 }, (_, idx) => {
                              const d = new Date(weekStart); d.setDate(d.getDate() + idx);
                              const key = d.toISOString().slice(0, 10);
                              return row.days?.[key];
                            });
                            return (
                              <tr key={i} className="border-t" style={{ borderColor: C.border }}>
                                <td className="py-2.5 pr-4 font-medium text-[11px]" style={{ color: C.textMid }}>Member {i + 1}</td>
                                {days.map((day, j) => {
                                  const pct = day?.loadPercent ?? 0;
                                  const bg = pct === 0 ? C.surfaceUp : pct < 50 ? C.green + "33" : pct < 80 ? C.gold + "33" : C.red + "33";
                                  const fg = pct === 0 ? C.textMuted : pct < 50 ? C.green : pct < 80 ? C.gold : C.red;
                                  return (
                                    <td key={j} className="text-center py-2 px-2">
                                      <div style={{ background: bg, color: fg, borderRadius: 8 }} className="py-1.5 px-1 font-semibold">
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
                  )}
                </Card>
              </div>
            )}

            {tab === "projects" && (
              <div className="space-y-4">
                <SectionHeader title="All Projects" sub={`${projects.length} total`}
                  action={<Btn onClick={() => setCreateProjectOpen(true)}>＋ New Project</Btn>} />
                {projects.length === 0 ? (
                  <Card className="py-16 text-center">
                    <div className="text-4xl mb-3">⬡</div>
                    <div className="font-semibold mb-1">No projects yet</div>
                    <div className="text-[12px] mb-4" style={{ color: C.textMuted }}>Create your first project to start tracking</div>
                    <Btn onClick={() => setCreateProjectOpen(true)}>Create Project</Btn>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {projects.map(p => (
                      <Card key={p._id} className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div style={{ width: 36, height: 36, background: p.color_tag + "33", borderRadius: 10, border: `2px solid ${p.color_tag}` }} className="flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-bold truncate" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>{p.name}</div>
                            <div className="text-[11px]" style={{ color: C.textMuted }}>{p.code || "—"} · {p.billing_type}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap mt-2">
                          <Pill color={p.status === "active" ? C.green : C.textMuted}>{p.status}</Pill>
                          <Pill color={C.accent}>{p.visibility}</Pill>
                          <Pill color={C.gold}>{p.members?.length || 0} members</Pill>
                        </div>
                        {p.description && (
                          <div className="text-[11px] mt-3 line-clamp-2" style={{ color: C.textMuted }}>{p.description}</div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "jobs" && (
              <div className="space-y-4">
                <SectionHeader title="Jobs Created by Me" sub={`${jobs.length} total`}
                  action={<Btn onClick={() => setCreateJobOpen(true)}>＋ New Job</Btn>} />
                <div className="space-y-2">
                  {jobs.map(job => (
                    <Card key={job._id} className="p-4">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-semibold">{job.title}</span>
                            <Pill color={priorityColor[job.priority]}>{job.priority}</Pill>
                            {job.billable && <Pill color={C.gold}>Billable</Pill>}
                            {job.overrun_flagged && <Pill color={C.red}>Overrun</Pill>}
                          </div>
                          <div className="text-[11px] mt-1 flex items-center gap-3 flex-wrap" style={{ color: C.textMuted }}>
                            <span>{job.logged_hours_cache?.toFixed(1)}h logged</span>
                            {job.estimated_hours > 0 && <span>/ {job.estimated_hours}h est.</span>}
                            {job.due_date && <span>Due {new Date(job.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={job.status}
                            onChange={e => updateJobStatus.mutate({ id: job._id, status: e.target.value })}
                            style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, color: statusColor[job.status], borderRadius: 8, fontSize: 11, outline: "none" }}
                            className="px-2.5 py-1.5 font-semibold cursor-pointer"
                          >
                            {["not_started","in_progress","on_hold","completed","cancelled"].map(s => (
                              <option key={s} value={s} style={{ color: C.text, background: C.surfaceUp }}>{s.replace(/_/g," ")}</option>
                            ))}
                          </select>
                          <Btn variant="ghost" onClick={() => archiveJob.mutate(job._id)}>Archive</Btn>
                        </div>
                      </div>
                      {job.estimated_hours > 0 && (
                        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: C.border }}>
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${Math.min((job.logged_hours_cache / job.estimated_hours) * 100, 100)}%`,
                            background: job.overrun_flagged ? C.red : C.accent
                          }} />
                        </div>
                      )}
                    </Card>
                  ))}
                  {jobs.length === 0 && (
                    <Card className="py-16 text-center">
                      <div className="text-4xl mb-3">⬢</div>
                      <div className="font-semibold mb-1">No jobs yet</div>
                      <div className="text-[12px] mb-4" style={{ color: C.textMuted }}>Create a job to assign work to your team</div>
                      <Btn onClick={() => setCreateJobOpen(true)}>Create Job</Btn>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {tab === "approvals" && (
              <div className="space-y-4">
                <SectionHeader title="Pending Timesheets" sub={`${approvals.length} awaiting your review`} />
                {approvals.length === 0 ? (
                  <Card className="py-16 text-center">
                    <div className="text-4xl mb-3">✦</div>
                    <div className="font-semibold mb-1">All clear</div>
                    <div className="text-[12px]" style={{ color: C.textMuted }}>No timesheets pending review</div>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {approvals.map(ts => (
                      <Card key={ts._id} className="p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <div className="text-[14px] font-bold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>
                              {ts.owner?.f_name} {ts.owner?.l_name}
                            </div>
                            <div className="text-[11px] mt-1" style={{ color: C.textMuted }}>
                              Week: {new Date(ts.week_start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — {new Date(ts.week_end).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </div>
                            <div className="flex gap-3 mt-2 text-[11px]">
                              <span style={{ color: C.accent }}>{(ts.total_minutes / 60).toFixed(1)}h total</span>
                              <span style={{ color: C.gold }}>{(ts.billable_minutes / 60).toFixed(1)}h billable</span>
                              <Pill color={C.textMuted}>{ts.status?.replace(/_/g," ")}</Pill>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Btn variant="success" onClick={() => approveTS.mutate({ timesheetId: ts._id, remarks: "Approved by SuperAdmin" })}>Approve</Btn>
                            <Btn variant="danger" onClick={() => rejectTS.mutate({ timesheetId: ts._id, remarks: "Rejected by SuperAdmin" })}>Reject</Btn>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "analytics" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatTile label="Total Hours" value={`${totalHours.toFixed(0)}h`} sub="All time logged" color={C.accent} />
                  <StatTile label="Billable Jobs" value={billableJobs} sub={`of ${jobs.length} total`} color={C.gold} />
                  <StatTile label="Overrun Jobs" value={overrunJobs.length} sub="Exceeding estimate" color={C.red} />
                  <StatTile label="Idle Jobs" value={idleJobs.length} sub="7+ days inactive" color={C.textMid} />
                </div>
                <Card className="p-5">
                  <SectionHeader title="Jobs by Status" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {["not_started","in_progress","on_hold","completed","cancelled"].map(s => {
                      const count = jobs.filter(j => j.status === s).length;
                      return (
                        <div key={s} style={{ background: C.surfaceUp, border: `1px solid ${C.border}`, borderRadius: 12 }} className="p-4 text-center">
                          <div className="text-2xl font-black" style={{ color: statusColor[s], fontFamily: "'Space Grotesk',sans-serif" }}>{count}</div>
                          <div className="text-[10px] mt-1 capitalize" style={{ color: C.textMuted }}>{s.replace(/_/g," ")}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>

      <Modal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} title="Create Project">
        <div className="space-y-4">
          <Input label="Project Name" placeholder="e.g. Website Redesign" value={projectForm.name} onChange={e => setProjectForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Description" placeholder="Brief description..." value={projectForm.description} onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Billing Type" value={projectForm.billing_type} onChange={e => setProjectForm(p => ({ ...p, billing_type: e.target.value }))}>
              <option value="hourly">Hourly</option>
              <option value="fixed">Fixed</option>
              <option value="non_billable">Non Billable</option>
            </Select>
            <Select label="Currency" value={projectForm.currency} onChange={e => setProjectForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
          <Input label="Default Hourly Rate" type="number" placeholder="0.00" value={projectForm.default_hourly_rate} onChange={e => setProjectForm(p => ({ ...p, default_hourly_rate: e.target.value }))} />
          <div className="flex gap-2 justify-end pt-2">
            <Btn variant="ghost" onClick={() => setCreateProjectOpen(false)}>Cancel</Btn>
            <Btn onClick={handleCreateProject} disabled={!projectForm.name || createProject.isPending}>
              {createProject.isPending ? "Creating…" : "Create Project"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={createJobOpen} onClose={() => setCreateJobOpen(false)} title="Create Job">
        <div className="space-y-4">
          <Input label="Job Title" placeholder="e.g. Design Login Page" value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} />
          <Input label="Description" placeholder="Job details..." value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))} />
          <Select label="Assign To" value={jobForm.assigned_to} onChange={e => setJobForm(p => ({ ...p, assigned_to: e.target.value }))}>
            <option value="">Select team member…</option>
            {targets.map(t => (
              <option key={t.id} value={t.id}>{t.id} ({t.model})</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Priority" value={jobForm.priority} onChange={e => setJobForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Input label="Estimated Hours" type="number" placeholder="0" value={jobForm.estimated_hours} onChange={e => setJobForm(p => ({ ...p, estimated_hours: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Hourly Rate" type="number" placeholder="0.00" value={jobForm.hourly_rate} onChange={e => setJobForm(p => ({ ...p, hourly_rate: e.target.value }))} />
            <Select label="Currency" value={jobForm.currency} onChange={e => setJobForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={jobForm.billable} onChange={e => setJobForm(p => ({ ...p, billable: e.target.checked }))} className="accent-[#7C5CFC] w-4 h-4" />
            <span className="text-[13px]" style={{ color: C.textMid }}>Billable job</span>
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <Btn variant="ghost" onClick={() => setCreateJobOpen(false)}>Cancel</Btn>
            <Btn onClick={handleCreateJob} disabled={!jobForm.title || !jobForm.assigned_to || createJob.isPending}>
              {createJob.isPending ? "Creating…" : "Create Job"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}