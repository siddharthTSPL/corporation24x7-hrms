import React, { useState, useMemo } from "react";
import {
  useMyProjects, useCreateProject, useAssignableTargets,
  useCreateJob, useJobsCreatedByMe, useUpdateJobStatus, useArchiveJob,
  useOverrunRiskJobs, useIdleJobs, useTeamWorkloadHeatmap,
  usePendingApprovals, useApproveTimesheet, useRejectTimesheet,
  useOrgAllTimeLogs, useOrgAllTimesheets,
} from "../../auth/server-state/timesheet/timesheet.hook";

const C = {
  brand: "#730042",
  brandHover: "#8B0050",
  brandLight: "rgba(115,0,66,0.07)",
  brandMid: "rgba(115,0,66,0.18)",
  accent: "#CD166E",
  bg: "#F4F5F9",
  surface: "#FFFFFF",
  surfaceAlt: "#F8F9FC",
  border: "#E4E6EF",
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
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const STATUS_STYLE = {
  draft:                    { color: C.textMuted, bg: C.surfaceAlt,  label: "Draft" },
  pending_manager:          { color: C.amber,     bg: C.amberLight,  label: "Pending Manager" },
  pending_reporting_manager:{ color: C.amber,     bg: C.amberLight,  label: "Pending Review" },
  pending_admin:            { color: C.blue,      bg: C.blueLight,   label: "Pending Admin" },
  pending_superadmin:       { color: C.brand,     bg: C.brandLight,  label: "Pending SA" },
  approved:                 { color: C.green,     bg: C.greenLight,  label: "Approved" },
  rejected:                 { color: C.red,       bg: C.redLight,    label: "Rejected" },
};

const PRIORITY_COLOR = { low: C.textMuted, medium: C.amber, high: C.red, urgent: C.brand };
const JOB_STATUS_COLOR = {
  not_started: C.textMuted, in_progress: C.blue, on_hold: C.amber,
  completed: C.green, cancelled: C.red,
};

const NAV_TABS = [
  { id: "overview",    label: "Overview"     },
  { id: "projects",    label: "Projects"     },
  { id: "jobs",        label: "Jobs"         },
  { id: "approvals",   label: "Approvals"    },
  { id: "org-logs",    label: "All Logs"     },
  { id: "org-sheets",  label: "All Timesheets"},
  { id: "analytics",   label: "Analytics"    },
];

function cn(...args) { return args.filter(Boolean).join(" "); }

function Badge({ color, bg, children }) {
  return (
    <span style={{
      background: bg || color + "18", color,
      border: `1px solid ${color}30`, borderRadius: 6,
      padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Card({ children, style = {}, className = "", onClick }) {
  return (
    <div onClick={onClick} className={className} style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: "hidden", ...style,
      ...(onClick ? { cursor: "pointer" } : {}),
    }}>
      {children}
    </div>
  );
}

function StatTile({ label, value, sub, color = C.brand }) {
  return (
    <Card style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: C.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textMuted }}>{sub}</div>}
    </Card>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, width: "100%", maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.textMuted, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textMuted }}>{label}</label>}
      <input {...props} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none", width: "100%", boxSizing: "border-box" }} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.textMuted }}>{label}</label>}
      <select {...props} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.text, outline: "none", width: "100%", appearance: "none" }}>
        {children}
      </select>
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, disabled, type = "button" }) {
  const styles = {
    primary: { background: C.brand, color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: C.textMid, border: `1px solid ${C.border}` },
    danger:  { background: C.redLight, color: C.red, border: `1px solid ${C.red}30` },
    success: { background: C.greenLight, color: C.green, border: `1px solid ${C.green}30` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...styles[variant], borderRadius: 10, padding: "9px 18px",
      fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap",
      transition: "opacity .15s",
    }}>
      {children}
    </button>
  );
}

function SectionHeader({ title, sub, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.textMuted, marginBottom: action ? 16 : 0 }}>{sub}</div>
      {action}
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

  const [projectForm, setProjectForm] = useState({ name: "", description: "", billing_type: "hourly", currency: "INR", default_hourly_rate: "" });
  const [jobForm, setJobForm] = useState({ title: "", description: "", assigned_to: "", priority: "medium", estimated_hours: "", billable: true, hourly_rate: "", currency: "INR" });

  const [weekStart] = useState(getMonday);
  const [logsWeek, setLogsWeek]     = useState(weekStart);
  const [sheetsStatus, setSheetsStatus] = useState("");
  const [sheetsOwnerModel, setSheetsOwnerModel] = useState("");

  const { data: projectsData }  = useMyProjects();
  const { data: jobsData }      = useJobsCreatedByMe();
  const { data: approvalsData } = usePendingApprovals();
  const { data: overrunData }   = useOverrunRiskJobs();
  const { data: idleData }      = useIdleJobs(7);
  const { data: heatmapData }   = useTeamWorkloadHeatmap(weekStart);
  const { data: targetsData }   = useAssignableTargets();

  const { data: orgLogsData }   = useOrgAllTimeLogs({ week_start: logsWeek });
  const { data: orgSheetsData } = useOrgAllTimesheets({
    ...(sheetsStatus ? { status: sheetsStatus } : {}),
    ...(sheetsOwnerModel ? { owner_model: sheetsOwnerModel } : {}),
  });

  const createProject   = useCreateProject();
  const createJob       = useCreateJob();
  const approveTS       = useApproveTimesheet();
  const rejectTS        = useRejectTimesheet();
  const archiveJob      = useArchiveJob();
  const updateJobStatus = useUpdateJobStatus();

  const projects  = projectsData?.projects    ?? [];
  const jobs      = jobsData?.jobs            ?? [];
  const approvals = approvalsData?.timesheets ?? [];
  const overrunJobs = overrunData?.jobs       ?? [];
  const idleJobs    = idleData?.jobs          ?? [];
  const heatmap     = heatmapData?.heatmap    ?? [];
  const targets     = targetsData?.targets    ?? [];
  const orgLogs     = orgLogsData?.logs       ?? [];
  const orgSheets   = orgSheetsData?.timesheets ?? [];

  const totalHours   = useMemo(() => jobs.reduce((s, j) => s + (j.logged_hours_cache || 0), 0), [jobs]);
  const billableJobs = useMemo(() => jobs.filter(j => j.billable).length, [jobs]);
  const completedJobs= useMemo(() => jobs.filter(j => j.status === "completed").length, [jobs]);

  const handleCreateProject = async () => {
    await createProject.mutateAsync({ ...projectForm, default_hourly_rate: Number(projectForm.default_hourly_rate) || 0 });
    setCreateProjectOpen(false);
    setProjectForm({ name: "", description: "", billing_type: "hourly", currency: "INR", default_hourly_rate: "" });
  };

  const handleCreateJob = async () => {
    const target = targets.find(t => t.id.toString() === jobForm.assigned_to);
    await createJob.mutateAsync({
      ...jobForm,
      assigned_to_model: target?.model || "Admin",
      estimated_hours: Number(jobForm.estimated_hours) || 0,
      hourly_rate: Number(jobForm.hourly_rate) || 0,
    });
    setCreateJobOpen(false);
    setJobForm({ title: "", description: "", assigned_to: "", priority: "medium", estimated_hours: "", billable: true, hourly_rate: "", currency: "INR" });
  };

  const handleApprove = async (ts) => {
    await approveTS.mutateAsync({ timesheetId: ts._id, remarks: "Approved by Super Admin" });
    setApproveModal(null);
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await rejectTS.mutateAsync({ timesheetId: rejectModal._id, remarks: rejectRemarks || "Rejected by Super Admin" });
    setRejectModal(null);
    setRejectRemarks("");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', sans-serif", color: C.text }}>

      {/* ── Horizontal Nav ─────────────────────────────────────────────────── */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 24px", overflowX: "auto" }}>
          {/* Logo chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 24, borderRight: `1px solid ${C.border}`, marginRight: 8, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>S</span>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>TorchX</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>Super Admin</div>
            </div>
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
            {NAV_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "18px 14px", fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? C.brand : C.textMid,
                borderBottom: tab === t.id ? `2.5px solid ${C.brand}` : "2.5px solid transparent",
                whiteSpace: "nowrap", transition: "color .15s, border-color .15s",
                position: "relative",
              }}>
                {t.label}
                {t.id === "approvals" && approvals.length > 0 && (
                  <span style={{
                    position: "absolute", top: 12, right: 6,
                    background: C.red, color: "#fff", borderRadius: "50%",
                    width: 16, height: 16, fontSize: 9, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{approvals.length}</span>
                )}
              </button>
            ))}
          </nav>

          <div style={{ display: "flex", gap: 8, flexShrink: 0, paddingLeft: 16 }}>
            <Btn onClick={() => setCreateJobOpen(true)}>＋ New Job</Btn>
            <Btn variant="ghost" onClick={() => setCreateProjectOpen(true)}>＋ Project</Btn>
          </div>
        </div>
      </header>

      {/* ── Full-access banner ─────────────────────────────────────────────── */}
      <div style={{ background: C.brandLight, borderBottom: `1px solid ${C.brandMid}`, padding: "6px 24px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.brand }}>⬡ Super Admin</span>
        <span style={{ fontSize: 11, color: C.brand, opacity: 0.7 }}>— Organisation-wide visibility across all roles</span>
      </div>

      <main style={{ padding: "28px 24px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ── OVERVIEW ───────────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <StatTile label="Total Projects"   value={projects.length}                      sub="Across all teams"          color={C.brand} />
              <StatTile label="Active Jobs"      value={jobs.filter(j => j.status === "in_progress").length} sub={`${completedJobs} completed`} color={C.blue}  />
              <StatTile label="Hours Logged"     value={`${totalHours.toFixed(0)}h`}          sub={`${billableJobs} billable jobs`} color={C.green} />
              <StatTile label="Pending Reviews"  value={approvals.length}                     sub="Timesheets awaiting"       color={C.red}   />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card style={{ padding: 20 }}>
                <SectionHeader title="At-Risk Jobs" sub={`${overrunJobs.length} exceeding estimate`} />
                {overrunJobs.length === 0 ? (
                  <EmptyState icon="✓" title="No jobs at risk" sub="All jobs within estimate" />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                    {overrunJobs.map(job => (
                      <div key={job._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: C.red, minWidth: 36 }}>{job.riskPercent}%</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>{job.logged_hours_cache}h / {job.estimated_hours}h est.</div>
                        </div>
                        <div style={{ width: 60, height: 4, background: C.border, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                          <div style={{ width: `${Math.min(job.riskPercent, 100)}%`, height: "100%", background: job.riskPercent >= 100 ? C.red : C.amber, borderRadius: 4 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card style={{ padding: 20 }}>
                <SectionHeader title="Idle Jobs" sub="No activity in 7+ days" />
                {idleJobs.length === 0 ? (
                  <EmptyState icon="🚀" title="All jobs are active" sub="" />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                    {idleJobs.map(job => (
                      <div key={job._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>Last: {fmtDate(job.updatedAt)}</div>
                        </div>
                        <Badge color={JOB_STATUS_COLOR[job.status] || C.textMuted}>{job.status.replace(/_/g, " ")}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card style={{ padding: 20 }}>
              <SectionHeader title="Team Workload Heatmap" sub={`Week of ${weekStart}`} />
              {heatmap.length === 0 ? (
                <EmptyState icon="◎" title="No team data" sub="No time logs found for this week" />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: C.textMuted, fontWeight: 600 }}>Member</th>
                        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                          <th key={d} style={{ textAlign: "center", padding: "8px 6px", color: C.textMuted, fontWeight: 600 }}>{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmap.map((row, i) => {
                        const days = Array.from({ length: 7 }, (_, idx) => {
                          const d = new Date(weekStart); d.setDate(d.getDate() + idx);
                          return row.days?.[d.toISOString().slice(0, 10)];
                        });
                        return (
                          <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                            <td style={{ padding: "10px 12px 10px 0", color: C.textMid, fontWeight: 500 }}>Member {i + 1}</td>
                            {days.map((day, j) => {
                              const pct = day?.loadPercent ?? 0;
                              const bg  = pct === 0 ? C.surfaceAlt : pct < 50 ? C.greenLight : pct < 80 ? C.amberLight : C.redLight;
                              const fg  = pct === 0 ? C.textMuted  : pct < 50 ? C.green      : pct < 80 ? C.amber      : C.red;
                              return (
                                <td key={j} style={{ textAlign: "center", padding: "6px" }}>
                                  <div style={{ background: bg, color: fg, borderRadius: 8, padding: "6px 4px", fontWeight: 700, fontSize: 11 }}>
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

        {/* ── PROJECTS ───────────────────────────────────────────────────────── */}
        {tab === "projects" && (
          <div>
            <SectionHeader title="All Projects" sub={`${projects.length} total`}
              action={<Btn onClick={() => setCreateProjectOpen(true)}>＋ New Project</Btn>} />
            {projects.length === 0 ? (
              <Card><EmptyState icon="⬡" title="No projects yet" sub="Create your first project" action={<Btn onClick={() => setCreateProjectOpen(true)}>Create Project</Btn>} /></Card>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {projects.map(p => (
                  <Card key={p._id} style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: (p.color_tag || C.brand) + "22", border: `2px solid ${p.color_tag || C.brand}`, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{p.code || "—"} · {p.billing_type}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Badge color={p.status === "active" ? C.green : C.textMuted}>{p.status}</Badge>
                      <Badge color={C.brand}>{p.visibility}</Badge>
                      <Badge color={C.amber}>{p.members?.length || 0} members</Badge>
                    </div>
                    {p.description && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10 }}>{p.description}</div>}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── JOBS ───────────────────────────────────────────────────────────── */}
        {tab === "jobs" && (
          <div>
            <SectionHeader title="Jobs Created by Me" sub={`${jobs.length} total`}
              action={<Btn onClick={() => setCreateJobOpen(true)}>＋ New Job</Btn>} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {jobs.length === 0 ? (
                <Card><EmptyState icon="⬢" title="No jobs yet" sub="Create a job to assign work" action={<Btn onClick={() => setCreateJobOpen(true)}>Create Job</Btn>} /></Card>
              ) : jobs.map(job => (
                <Card key={job._id} style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{job.title}</span>
                        <Badge color={PRIORITY_COLOR[job.priority]}>{job.priority}</Badge>
                        {job.billable && <Badge color={C.amber}>Billable</Badge>}
                        {job.overrun_flagged && <Badge color={C.red}>Overrun</Badge>}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, display: "flex", gap: 12 }}>
                        <span>{job.logged_hours_cache?.toFixed(1)}h logged</span>
                        {job.estimated_hours > 0 && <span>/ {job.estimated_hours}h est.</span>}
                        {job.due_date && <span>Due {fmtDate(job.due_date)}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <select
                        value={job.status}
                        onChange={e => updateJobStatus.mutate({ id: job._id, status: e.target.value })}
                        style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 600, color: JOB_STATUS_COLOR[job.status] || C.text, outline: "none" }}
                      >
                        {["not_started","in_progress","on_hold","completed","cancelled"].map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                      <Btn variant="ghost" onClick={() => archiveJob.mutate(job._id)}>Archive</Btn>
                    </div>
                  </div>
                  {job.estimated_hours > 0 && (
                    <div style={{ height: 3, background: C.border, borderRadius: 4, marginTop: 12, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min((job.logged_hours_cache / job.estimated_hours) * 100, 100)}%`, height: "100%", background: job.overrun_flagged ? C.red : C.brand, borderRadius: 4 }} />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── APPROVALS ──────────────────────────────────────────────────────── */}
        {tab === "approvals" && (
          <div>
            <SectionHeader title="Pending Timesheets" sub={`${approvals.length} awaiting your review`} />
            {approvals.length === 0 ? (
              <Card><EmptyState icon="✦" title="All clear" sub="No timesheets pending review" /></Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {approvals.map(ts => (
                  <Card key={ts._id} style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{ts.owner?.f_name} {ts.owner?.l_name}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                          {ts.owner?.work_email} · {ts.owner_model}
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                          Week: {fmtDate(ts.week_start)} — {fmtDate(ts.week_end)}
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12 }}>
                          <span style={{ color: C.brand, fontWeight: 600 }}>{fmtDuration(ts.total_minutes)} total</span>
                          <span style={{ color: C.green }}>{fmtDuration(ts.billable_minutes)} billable</span>
                          <Badge color={(STATUS_STYLE[ts.status] || STATUS_STYLE.draft).color} bg={(STATUS_STYLE[ts.status] || STATUS_STYLE.draft).bg}>
                            {(STATUS_STYLE[ts.status] || STATUS_STYLE.draft).label}
                          </Badge>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <Btn variant="success" onClick={() => setApproveModal(ts)}>Approve</Btn>
                        <Btn variant="danger"  onClick={() => { setRejectModal(ts); setRejectRemarks(""); }}>Reject</Btn>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ORG ALL LOGS ───────────────────────────────────────────────────── */}
        {tab === "org-logs" && (
          <div>
            <SectionHeader
              title="All Time Logs — Organisation"
              sub={`${orgLogs.length} entries · ${fmtDuration(orgLogsData?.totalMinutes || 0)} total`}
              action={
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Input
                    type="date"
                    value={logsWeek}
                    onChange={e => setLogsWeek(e.target.value)}
                    style={{ fontSize: 12, padding: "7px 12px" }}
                  />
                  <span style={{ fontSize: 11, color: C.textMuted }}>week of</span>
                </div>
              }
            />
            {orgLogs.length === 0 ? (
              <Card><EmptyState icon="📋" title="No logs found" sub="No time entries for this week across the org" /></Card>
            ) : (
              <Card style={{ overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.surfaceAlt, borderBottom: `1px solid ${C.border}` }}>
                      {["Member", "Role", "Job", "Date", "Duration", "Mode", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontWeight: 700, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orgLogs.map(log => (
                      <tr key={log._id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                          {log.logged_by?.f_name || "—"} {log.logged_by?.l_name || ""}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Badge color={C.brand}>{log.logged_by_model}</Badge>
                        </td>
                        <td style={{ padding: "12px 16px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.job?.title || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: C.textMuted, whiteSpace: "nowrap" }}>
                          {fmtDate(log.log_date)}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: C.green, whiteSpace: "nowrap" }}>
                          {fmtDuration(log.duration_minutes)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Badge color={log.entry_mode === "timer" ? C.blue : C.textMuted}>{log.entry_mode}</Badge>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Badge color={(STATUS_STYLE[log.status] || STATUS_STYLE.draft).color} bg={(STATUS_STYLE[log.status] || STATUS_STYLE.draft).bg}>
                            {(STATUS_STYLE[log.status] || STATUS_STYLE.draft).label}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}

        {/* ── ORG ALL TIMESHEETS ─────────────────────────────────────────────── */}
        {tab === "org-sheets" && (
          <div>
            <SectionHeader
              title="All Timesheets — Organisation"
              sub={`${orgSheets.length} timesheets`}
              action={
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={sheetsStatus}
                    onChange={e => setSheetsStatus(e.target.value)}
                    style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 12px", fontSize: 12, color: C.text, outline: "none" }}
                  >
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_STYLE).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                  <select
                    value={sheetsOwnerModel}
                    onChange={e => setSheetsOwnerModel(e.target.value)}
                    style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "7px 12px", fontSize: 12, color: C.text, outline: "none" }}
                  >
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
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orgSheets.map(ts => {
                  const ss = STATUS_STYLE[ts.status] || STATUS_STYLE.draft;
                  return (
                    <Card key={ts._id} style={{ padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>
                              {ts.owner?.f_name} {ts.owner?.l_name}
                            </span>
                            <Badge color={C.brand}>{ts.owner_model}</Badge>
                            <Badge color={ss.color} bg={ss.bg}>{ss.label}</Badge>
                          </div>
                          <div style={{ fontSize: 12, color: C.textMuted }}>
                            {ts.owner?.work_email} · Week: {fmtDate(ts.week_start)} — {fmtDate(ts.week_end)}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 20, flexShrink: 0, textAlign: "right" }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: C.brand }}>{fmtDuration(ts.total_minutes)}</div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>total</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>{fmtDuration(ts.billable_minutes)}</div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>billable</div>
                          </div>
                        </div>
                      </div>
                      {ts.remarks && (
                        <div style={{ marginTop: 10, fontSize: 12, color: C.textMuted, padding: "8px 12px", background: C.surfaceAlt, borderRadius: 8, borderLeft: `3px solid ${ss.color}` }}>
                          {ts.remarks}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ──────────────────────────────────────────────────────── */}
        {tab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <StatTile label="Total Hours"    value={`${totalHours.toFixed(0)}h`}  sub="All time logged"      color={C.brand}    />
              <StatTile label="Billable Jobs"  value={billableJobs}                 sub={`of ${jobs.length} total`} color={C.green} />
              <StatTile label="Overrun Jobs"   value={overrunJobs.length}           sub="Exceeding estimate"   color={C.red}      />
              <StatTile label="Idle Jobs"      value={idleJobs.length}              sub="7+ days inactive"     color={C.amber}    />
            </div>
            <Card style={{ padding: 20 }}>
              <SectionHeader title="Jobs by Status" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                {["not_started","in_progress","on_hold","completed","cancelled"].map(s => {
                  const count = jobs.filter(j => j.status === s).length;
                  return (
                    <div key={s} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: JOB_STATUS_COLOR[s] || C.textMuted }}>{count}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, textTransform: "capitalize" }}>{s.replace(/_/g, " ")}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* ── Approve confirmation modal ─────────────────────────────────────── */}
      <Modal open={!!approveModal} onClose={() => setApproveModal(null)} title="Approve Timesheet">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, color: C.text }}>
            Approve the timesheet for <strong>{approveModal?.owner?.f_name} {approveModal?.owner?.l_name}</strong>?
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setApproveModal(null)}>Cancel</Btn>
            <Btn variant="success" onClick={() => handleApprove(approveModal)} disabled={approveTS.isPending}>
              {approveTS.isPending ? "Approving…" : "Approve"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Reject modal ───────────────────────────────────────────────────── */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Timesheet">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, color: C.text }}>
            Rejecting timesheet for <strong>{rejectModal?.owner?.f_name} {rejectModal?.owner?.l_name}</strong>
          </div>
          <Input
            label="Reason (required)"
            placeholder="Explain the issue…"
            value={rejectRemarks}
            onChange={e => setRejectRemarks(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setRejectModal(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={handleReject} disabled={!rejectRemarks.trim() || rejectTS.isPending}>
              {rejectTS.isPending ? "Rejecting…" : "Reject"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Create Project modal ───────────────────────────────────────────── */}
      <Modal open={createProjectOpen} onClose={() => setCreateProjectOpen(false)} title="Create Project">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Project Name" placeholder="e.g. Website Redesign" value={projectForm.name} onChange={e => setProjectForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Description" placeholder="Brief description…" value={projectForm.description} onChange={e => setProjectForm(p => ({ ...p, description: e.target.value }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
            <Btn variant="ghost" onClick={() => setCreateProjectOpen(false)}>Cancel</Btn>
            <Btn onClick={handleCreateProject} disabled={!projectForm.name || createProject.isPending}>
              {createProject.isPending ? "Creating…" : "Create Project"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ── Create Job modal ───────────────────────────────────────────────── */}
      <Modal open={createJobOpen} onClose={() => setCreateJobOpen(false)} title="Create Job">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Job Title" placeholder="e.g. Design Login Page" value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} />
          <Input label="Description" placeholder="Job details…" value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))} />
          <Select label="Assign To" value={jobForm.assigned_to} onChange={e => setJobForm(p => ({ ...p, assigned_to: e.target.value }))}>
            <option value="">Select team member…</option>
            {targets.map(t => (
              <option key={t.id} value={t.id}>{t.id} ({t.model})</option>
            ))}
          </Select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Select label="Priority" value={jobForm.priority} onChange={e => setJobForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
            <Input label="Estimated Hours" type="number" placeholder="0" value={jobForm.estimated_hours} onChange={e => setJobForm(p => ({ ...p, estimated_hours: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Hourly Rate" type="number" placeholder="0.00" value={jobForm.hourly_rate} onChange={e => setJobForm(p => ({ ...p, hourly_rate: e.target.value }))} />
            <Select label="Currency" value={jobForm.currency} onChange={e => setJobForm(p => ({ ...p, currency: e.target.value }))}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={jobForm.billable} onChange={e => setJobForm(p => ({ ...p, billable: e.target.checked }))} style={{ accentColor: C.brand, width: 15, height: 15 }} />
            <span style={{ fontSize: 13, color: C.textMid }}>Billable job</span>
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
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