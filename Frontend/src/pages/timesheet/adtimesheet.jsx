import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { OffDayTag, OffDayNotice, isOffDay } from "./OffDayTag";
import toast from "react-hot-toast";
import { generateCSV, downloadCSV, buildExportFilename } from "../utils/timesheetReportExport";
import {
  useMyAssignedJobs,
  useJobsCreatedByMe,
  useCreateJob,
  useUpdateJob,
  useAssignableTargets,
  useUpdateJobStatus,
  useMyWeekLog,
  useLogTime, useMyDayStatus,
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
  useOrgAllJobs,
  useMyProjects,
  useJobById,
  useTimesheetDetailedReport,
} from "../../auth/server-state/timesheet/timesheet.hook";
import { useGetAllDepartments } from "../../auth/server-state/department/department.hook";

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

const nonNegative = (v) => {
  if (v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n < 0 ? "0" : v;
};

const STATUS_STYLE = {
  draft:                     { tw: "text-gray-500 bg-gray-100 border-gray-200",              dot: "bg-gray-400",    label: "Draft" },
  pending_manager:           { tw: "text-amber-700 bg-amber-50 border-amber-200",            dot: "bg-amber-500",   label: "Pending Manager" },
  pending_reporting_manager: { tw: "text-amber-700 bg-amber-50 border-amber-200",            dot: "bg-amber-500",   label: "Pending Review" },
  pending_coadmin:           { tw: "text-purple-700 bg-purple-50 border-purple-200",         dot: "bg-purple-500",  label: "Pending Co-Admin" },
  pending_admin:             { tw: "text-blue-700 bg-blue-50 border-blue-200",               dot: "bg-blue-500",    label: "Pending Admin" },
  pending_superadmin:        { tw: "text-[#730042] bg-[#730042]/[0.07] border-[#730042]/20", dot: "bg-[#730042]",   label: "Pending SA" },
  approved:                  { tw: "text-emerald-700 bg-emerald-50 border-emerald-200",      dot: "bg-emerald-500", label: "Approved" },
  rejected:                  { tw: "text-red-700 bg-red-50 border-red-200",                  dot: "bg-red-500",     label: "Rejected" },
};

// status label used in the CSV (same wording as the on-screen badges)
const reportStatusLabel = (s) => (s === "off" ? "Off" : STATUS_STYLE[s]?.label || s || "");

const PRIORITY_CHIP = {
  low: "text-gray-500 bg-gray-100 border-gray-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  high: "text-red-700 bg-red-50 border-red-200",
  urgent: "text-[#730042] bg-[#730042]/[0.07] border-[#730042]/20",
};

const JOB_STATUS_DOT = {
  not_started: "bg-gray-300",
  in_progress: "bg-blue-500",
  on_hold: "bg-amber-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const JOB_STATUS_CHIP = {
  not_started: "text-gray-500 bg-gray-100 border-gray-200",
  in_progress: "text-blue-700 bg-blue-50 border-blue-200",
  on_hold: "text-amber-700 bg-amber-50 border-amber-200",
  completed: "text-emerald-700 bg-emerald-50 border-emerald-200",
  cancelled: "text-red-700 bg-red-50 border-red-200",
};

const JOB_STATUS_BLOCK = {
  not_started: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600" },
  in_progress: { bg: "bg-blue-50/60", border: "border-blue-100", text: "text-blue-700" },
  on_hold: { bg: "bg-amber-50/60", border: "border-amber-100", text: "text-amber-700" },
  completed: { bg: "bg-emerald-50/60", border: "border-emerald-100", text: "text-emerald-700" },
  cancelled: { bg: "bg-red-50/60", border: "border-red-100", text: "text-red-700" },
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TABS = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "team-jobs", label: "Team Jobs", icon: "jobs" },
  { id: "approvals", label: "Approvals", icon: "approvals" },
  { id: "insights", label: "Insights", icon: "insights" },
  { id: "my-work", label: "My Work", icon: "mywork" },
  { id: "timesheets", label: "Timesheets", icon: "timesheets" },
  { id: "org-logs", label: "All Logs", icon: "logs" },
  { id: "org-sheets", label: "All Timesheets", icon: "sheets" },
  { id: "report", label: "Time Sheet Report", icon: "report" },
];

function cn(...args) { return args.filter(Boolean).join(" "); }

// Delays a fast-changing value (typed text) so the report API isn't hit on every keystroke.
function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€" };
function fmtRate(rate, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency || ""} `;
  return `${symbol}${rate}/hr`;
}

// ─── Report helpers (UI only) ─────────────────────────────────────────────────
const fmtHrs = (n) => `${Math.round((Number(n) || 0) * 100) / 100}h`;
const isOffRow = (r) => r.day_type === "week_off" || r.day_type === "holiday";

const monthLabelOf = (key) => {
  const [y, m] = String(key).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
};

// last 24 months (current month first)
const buildMonthOptions = (count = 24) => {
  const [y, m] = todayISTKey().slice(0, 7).split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1 - i, 1));
    const value = dt.toISOString().slice(0, 7);
    return { value, label: monthLabelOf(value) };
  });
};

// all Mondays whose week touches the given month
const weekStartsOfMonth = (monthKey) => {
  const [y, m] = String(monthKey).split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const out = [];
  const cur = new Date(`${getMonday(first)}T00:00:00.000Z`);
  while (cur <= last) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return out;
};

// "YYYY-MM-DD" helpers (pure string/UTC maths, so they never shift with the browser timezone)
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtYMD = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd || "")) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTH_SHORT[m - 1]} ${y}`;
};
const addDaysYMD = (ymd, n) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const mondayOfYMD = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return dt.toISOString().slice(0, 10);
};

// Report types. "weekly" is the week-based report that used to be labelled "Detailed";
// "detailed" is now the full date-range history (defaults to the last DETAILED_DEFAULT_MONTHS months up to today).
const DETAILED_DEFAULT_MONTHS = 12;
const REPORT_VIEWS = [
  { id: "weekly",   label: "Weekly"   },
  { id: "weekend",  label: "Weekend"  },
  { id: "monthly",  label: "Monthly"  },
  { id: "detailed", label: "Detailed" },
];
const REPORT_TITLES = {
  weekly:   "Weekly Timesheet Report",
  weekend:  "Weekend Timesheet",
  monthly:  "Monthly Timesheet",
  detailed: "Detailed Timesheet Report",
};

const groupStatus = (rows) => {
  const list = rows.map((r) => r.timesheet_status).filter((s) => s && s !== "off");
  if (!list.length) return "draft";
  if (list.includes("rejected")) return "rejected";
  const pending = list.find((s) => String(s).startsWith("pending"));
  if (pending) return pending;
  if (list.includes("draft")) return "draft";
  return "approved";
};

function groupReportByEmployee(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const key = String(r.employee_id || r.name || "unknown");
    if (!map.has(key)) {
      map.set(key, { key, name: r.name || "—", designation: r.designation, department: r.department, rows: [] });
    }
    map.get(key).rows.push(r);
  });
  return Array.from(map.values())
    .map((g) => {
      const sorted = [...g.rows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
      const requiredByDate = new Map();
      sorted.forEach((r) => {
        if (!isOffRow(r)) {
          const d = String(r.date).slice(0, 10);
          if (!requiredByDate.has(d)) requiredByDate.set(d, Number(r.required_hours) || 0);
        }
      });
      const required = Array.from(requiredByDate.values()).reduce((s, v) => s + v, 0);
      const serving = sorted.reduce((s, r) => s + (Number(r.serving_hours) || 0), 0);
      const overtime = sorted.reduce((s, r) => s + (Number(r.overtime_hours) || 0), 0);
      const workedDays = new Set(
        sorted.filter((r) => Number(r.serving_hours) > 0).map((r) => String(r.date).slice(0, 10))
      ).size;
      return { ...g, rows: sorted, required, serving, overtime, workedDays, status: groupStatus(sorted) };
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

const initialsOf = (name = "") =>
  String(name).split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

// ─── Icons (inline, Lucide-style — no icon dependency needed) ────────────────
const ICON_PATHS = {
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  jobs: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
  approvals: <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>,
  insights: <><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>,
  mywork: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  timesheets: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  logs: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  sheets: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" /><path d="M14 2v5h5" /><path d="M9 13h6M9 17h6" /></>,
  report: <><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  chevron: <><path d="m6 9 6 6 6-6" /></>,
  left: <><path d="m15 18-6-6 6-6" /></>,
  right: <><path d="m9 18 6-6-6-6" /></>,
  alert: <><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z" /><path d="M12 9v4M12 17h.01" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  zap: <><path d="M13 2 3 14h9l-1 8 10-12h-9z" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M16 4a4 4 0 0 1 0 8" /><path d="M22 21a7 7 0 0 0-5-6.7" /></>,
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z" /></>,
  moon: <><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" /></>,
};

function Icon({ name, size = 16, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name] || null}
    </svg>
  );
}

function SpinnerIcon({ className = "" }) {
  return (
    <svg className={cn("animate-spin", className)} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Design-system primitives (SuperAdmin look) ──────────────────────────────
function TorchXLogo() {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-[#730042] to-[#94005a] flex items-center justify-center shrink-0 shadow-sm shadow-[#730042]/30">
        <span className="text-white text-[12px] sm:text-[13px] font-black">A</span>
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-gray-900 tracking-tight leading-none">TorchX</div>
        <div className="text-[9px] sm:text-[10px] text-[#730042] font-bold tracking-wide mt-0.5">ADMIN</div>
      </div>
    </div>
  );
}

function Badge({ status }) {
  const s = STATUS_STYLE[status] || { tw: "text-gray-600 bg-gray-100 border-gray-200", dot: "bg-gray-400", label: status };
  return (
    <span className={`${s.tw} inline-flex items-center gap-1.5 rounded-md border text-[11px] font-bold px-2 py-1 whitespace-nowrap shrink-0`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`} />
      {s.label}
    </span>
  );
}

function Chip({ color = "brand", children }) {
  const map = {
    brand: "text-[#730042] bg-[#730042]/[0.07] border-[#730042]/20",
    green: "text-emerald-700 bg-emerald-50 border-emerald-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    red: "text-red-700 bg-red-50 border-red-200",
    blue: "text-blue-700 bg-blue-50 border-blue-200",
    gray: "text-gray-600 bg-gray-100 border-gray-200",
  };
  return (
    <span className={`${map[color] || map.brand} rounded-md border text-[11px] font-bold px-2 py-1 whitespace-nowrap shrink-0`}>
      {children}
    </span>
  );
}

function PriorityChip({ priority }) {
  return (
    <span className={`${PRIORITY_CHIP[priority] || PRIORITY_CHIP.low} rounded-md border text-[11px] font-bold px-2 py-1 whitespace-nowrap shrink-0 capitalize`}>
      {priority}
    </span>
  );
}

function JobChip({ status }) {
  return (
    <span className={`${JOB_STATUS_CHIP[status] || "text-gray-600 bg-gray-100 border-gray-200"} rounded-md border text-[11px] font-bold px-2 py-1 whitespace-nowrap shrink-0 capitalize`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] min-w-0 ${className}`}>
      {children}
    </div>
  );
}

// Section heading inside a card (title + optional right-side content)
function CardHeader({ title, sub, right }) {
  return (
    <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 min-w-0">
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-gray-900 tracking-tight flex items-center gap-2 flex-wrap">{title}</div>
        {sub && <div className="text-[12px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

const STAT_BAR = {
  "text-[#730042]": "bg-[#730042]",
  "text-amber-600": "bg-amber-500",
  "text-red-600": "bg-red-500",
  "text-slate-500": "bg-gray-400",
  "text-slate-700": "bg-gray-500",
  "text-emerald-600": "bg-emerald-500",
  "text-blue-600": "bg-blue-500",
};
const STAT_TINT = {
  "text-[#730042]": "bg-[#730042]/10",
  "text-amber-600": "bg-amber-50",
  "text-red-600": "bg-red-50",
  "text-slate-500": "bg-gray-100",
  "text-slate-700": "bg-gray-100",
  "text-emerald-600": "bg-emerald-50",
  "text-blue-600": "bg-blue-50",
};

function StatCard({ label, value, color = "text-[#730042]", sub, icon }) {
  return (
    <Card className="relative overflow-hidden pl-4 pr-3.5 sm:pl-6 sm:pr-5 py-3.5 sm:py-5">
      <span className={`absolute top-0 left-0 h-full w-[3px] ${STAT_BAR[color] || "bg-[#730042]"}`} />
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 truncate">{label}</div>
          <div className={`text-xl sm:text-3xl font-bold tracking-tight leading-none truncate ${color}`}>{value}</div>
          {sub && <div className="text-[10px] sm:text-[12px] text-gray-400 mt-1.5 truncate">{sub}</div>}
        </div>
        {icon && (
          <span className={`hidden sm:flex w-9 h-9 rounded-lg items-center justify-center shrink-0 ${STAT_TINT[color] || "bg-gray-100"} ${color}`}>
            <Icon name={icon} size={17} />
          </span>
        )}
      </div>
    </Card>
  );
}

function PageHeader({ title, sub, actions, icon }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span aria-hidden="true" className="hidden sm:flex w-10 h-10 shrink-0 items-center justify-center rounded-xl bg-[#730042]/[0.06] text-[#730042] ring-1 ring-inset ring-[#730042]/10">
            <Icon name={icon} size={20} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.01em] leading-tight text-gray-900 m-0 break-words">{title}</h1>
          {sub && <p className="text-[12px] sm:text-[13px] text-gray-500 mt-0.5 mb-0 leading-snug">{sub}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap min-w-0 sm:shrink-0">{actions}</div>}
    </div>
  );
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="px-6 py-12 sm:py-14 text-center min-w-0">
      <span className="w-12 h-12 rounded-full bg-[#730042]/[0.06] text-[#730042] inline-flex items-center justify-center mb-3 ring-1 ring-inset ring-[#730042]/10">
        <Icon name={icon} size={22} />
      </span>
      <div className="font-bold text-[15px] text-gray-900">{title}</div>
      {sub && <div className="text-[13px] text-gray-400 mt-1">{sub}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Wraps a wide table: horizontal scroll stays INSIDE this box, never on the page.
function TableWrap({ children, className = "" }) {
  return (
    <div className={`w-full max-w-full min-w-0 overflow-hidden ${className}`}>
      <div className="ts-scroll w-full max-w-full overflow-x-auto">{children}</div>
    </div>
  );
}

const TH = "text-left px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap";

function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-900/45 backdrop-blur-[2px] flex items-center justify-center p-0 sm:p-4 overflow-hidden"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={cn(
        "bg-white border border-gray-200 rounded-t-2xl sm:rounded-xl w-full shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col mt-auto sm:mt-0 min-w-0 max-w-full overflow-hidden",
        wide ? "sm:w-[92%] sm:max-w-[980px]" : "sm:w-[80%] md:w-auto sm:max-w-[540px]"
      )}>
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 shrink-0 min-w-0">
          <span className="font-bold text-[14px] sm:text-[15px] text-gray-900 truncate min-w-0">{title}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 text-xl leading-none bg-transparent hover:bg-gray-100 hover:text-gray-700 border-none rounded-md cursor-pointer shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/30"
          >×</button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden min-w-0">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</label>}
      {children}
    </div>
  );
}

const inputClass = "bg-white border border-gray-300 rounded-md px-3.5 py-2.5 text-[13px] text-gray-900 outline-none w-full min-w-0 max-w-full box-border font-inherit placeholder:text-gray-400 hover:border-gray-400 focus:border-[#730042] focus:ring-1 focus:ring-[#730042] transition-colors min-h-[44px]";

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
    primary: "bg-[#730042] text-white border border-[#730042] shadow-sm hover:bg-[#5c0034]",
    ghost: "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50",
    danger: "bg-white text-red-600 border border-red-300 hover:bg-red-50",
    success: "bg-white text-emerald-600 border border-emerald-300 hover:bg-emerald-50",
    amber: "bg-white text-amber-600 border border-amber-300 hover:bg-amber-50",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} rounded-md px-4 py-2.5 min-h-[44px] sm:min-h-[40px] text-[13px] font-semibold whitespace-nowrap transition-colors inline-flex items-center justify-center gap-1.5 font-inherit focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/30 focus-visible:ring-offset-1 ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"} ${className}`}
    >
      {children}
    </button>
  );
}

// Compact action button for list rows (View / Edit / Complete)
function MiniBtn({ tone = "neutral", onClick, children }) {
  const tones = {
    neutral: "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300",
    blue: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${tones[tone]} border rounded-lg px-3 py-1.5 min-h-[34px] text-[11px] sm:text-[12px] font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/30`}
    >
      {children}
    </button>
  );
}

// Prev / label / next week control (Insights + My Work)
function WeekSwitcher({ label, onPrev, onNext }) {
  return (
    <div className="inline-flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden self-start max-w-full">
      <button type="button" onClick={onPrev} aria-label="Previous week" className="w-9 h-10 flex items-center justify-center text-gray-500 bg-transparent border-none cursor-pointer hover:bg-gray-50 hover:text-[#730042] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#730042]/40">
        <Icon name="left" size={16} />
      </button>
      <span className="px-3 text-[13px] font-semibold text-gray-800 whitespace-nowrap border-x border-gray-200 h-10 flex items-center">{label}</span>
      <button type="button" onClick={onNext} aria-label="Next week" className="w-9 h-10 flex items-center justify-center text-gray-500 bg-transparent border-none cursor-pointer hover:bg-gray-50 hover:text-[#730042] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#730042]/40">
        <Icon name="right" size={16} />
      </button>
    </div>
  );
}

// Shared job row used by "My Jobs" and "Assigned by Me"
function JobCard({ j, showAssignee, onView, onEdit, onComplete }) {
  const assigneeInfo = showAssignee ? j.assigned_to_info : null;
  const canEdit = onEdit && j.status !== "completed";
  const canComplete = onComplete && !["completed", "cancelled"].includes(j.status);
  return (
    <Card className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-start gap-3.5 hover:border-[#730042]/30 hover:shadow-md transition-all">
      <div className="flex gap-3.5 flex-1 min-w-0">
        <div className={`w-1 rounded-full ${JOB_STATUS_DOT[j.status] || "bg-gray-300"} shrink-0`} />
        <div className="flex-1 min-w-0">
          <button
            className="text-[14px] font-bold text-gray-900 hover:text-[#730042] transition-colors text-left mb-1.5 break-words bg-transparent border-none p-0 cursor-pointer"
            onClick={onView}
          >
            {j.title}
          </button>
          {assigneeInfo && (
            <div className="text-[12px] text-gray-400 mb-1.5 truncate">
              Assigned to <span className="font-semibold text-gray-700">{assigneeInfo.name}</span>
              <span className="text-[#730042] font-semibold"> · {assigneeInfo.role || assigneeInfo.model}</span>
            </div>
          )}
          <div className="flex gap-1.5 flex-wrap">
            <PriorityChip priority={j.priority} />
            <JobChip status={j.status} />
            {j.billable && <Chip color="green">Billable</Chip>}
            {j.estimated_hours > 0 && <Chip color="blue">{j.logged_hours_cache}h / {j.estimated_hours}h</Chip>}
          </div>
          {j.estimated_hours > 0 && (
            <div className="mt-2.5 flex items-center gap-2 min-w-0">
              <div className="w-24 sm:w-[140px] h-1.5 bg-gray-100 rounded-full shrink-0 overflow-hidden">
                <div className={`h-full rounded-full ${j.overrun_flagged ? "bg-red-500" : "bg-[#730042]"}`} style={{ width: `${Math.min(100, (j.logged_hours_cache / j.estimated_hours) * 100)}%` }} />
              </div>
              <span className={`text-[11px] shrink-0 ${j.overrun_flagged ? "text-red-600" : "text-gray-400"}`}>
                {Math.round((j.logged_hours_cache / j.estimated_hours) * 100)}% used
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap shrink-0 lg:self-start">
        <MiniBtn onClick={onView}>View</MiniBtn>
        {canEdit && <MiniBtn tone="blue" onClick={onEdit}>Edit</MiniBtn>}
        {canComplete && <MiniBtn tone="green" onClick={onComplete}>Complete</MiniBtn>}
      </div>
    </Card>
  );
}

// ─── Report: export button + filter controls ─────────────────────────────────
// One export button used for both "Bulk CSV" (solid) and per-employee "Export Data" (subtle)
function ExportButton({ label, loading, disabled, onClick, variant = "subtle", title, className = "" }) {
  const styles = {
    solid:  "bg-[#730042] text-white hover:bg-[#5c0034] border border-[#730042] shadow-sm px-4 min-h-[40px]",
    subtle: "bg-white text-[#730042] border border-[#730042]/30 hover:bg-[#730042]/[0.06] hover:border-[#730042]/60 px-3 min-h-[34px]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg text-[12px] sm:text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/40 focus-visible:ring-offset-1",
        "disabled:opacity-55 disabled:cursor-not-allowed",
        styles[variant], className
      )}
    >
      {loading ? <SpinnerIcon /> : <Icon name="download" size={14} />}
      <span>{loading ? "Preparing CSV…" : label}</span>
    </button>
  );
}

const FILTER_LABEL = "text-[11px] font-semibold text-gray-500";
const FILTER_CONTROL = "w-full min-w-0 rounded-lg border text-[13px] min-h-[40px] outline-none transition-colors hover:border-gray-400 focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/[0.15]";
const FILTER_IDLE = "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400";
const FILTER_ACTIVE = "border-[#730042]/60 bg-[#730042]/[0.04] text-[#730042] font-semibold";
const DATE_INPUT_CLS = cn(FILTER_CONTROL, FILTER_IDLE, "px-3 py-2 w-auto");
const STEP_BTN = "w-9 h-10 shrink-0 flex items-center justify-center text-gray-500 bg-transparent border-none cursor-pointer hover:bg-gray-50 hover:text-[#730042] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#730042]/40 transition-colors";
const STEPPER_WRAP = "ts-scroll inline-flex items-center max-w-full overflow-x-auto rounded-lg border border-gray-300 bg-white";
const LINK_BTN = "text-[12px] font-semibold text-[#730042] hover:underline bg-transparent border-none cursor-pointer p-0";

function FilterSelect({ label, active, children, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className={FILTER_LABEL}>{label}</label>
      <div className="relative">
        <select aria-label={label} {...props} className={cn(FILTER_CONTROL, "appearance-none cursor-pointer pl-3 pr-9 py-2", active ? FILTER_ACTIVE : FILTER_IDLE, className)}>
          {children}
        </select>
        <Icon name="chevron" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  );
}

function FilterInput({ label, active, icon, onClear, className = "", ...props }) {
  const hasValue = onClear && props.value;
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className={FILTER_LABEL}>{label}</label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input aria-label={label} {...props} className={cn(FILTER_CONTROL, "py-2", icon ? "pl-9" : "pl-3", hasValue ? "pr-9" : "pr-3", active ? FILTER_ACTIVE : FILTER_IDLE, className)} />
        {hasValue && (
          <button type="button" onClick={onClear} aria-label={`Clear ${label}`}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-base leading-none bg-transparent border-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/40">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Report: employee summary card ────────────────────────────────────────────
// Every card gets its own "Export" via onExport(emp) — nothing is hardcoded per employee.
function ReportEmployeeCard({ emp, view, onOpen, onExport, exporting, exportDisabled }) {
  const isWeekend = view === "weekend";
  const pct = emp.required > 0 ? Math.min(100, Math.round((emp.serving / emp.required) * 100)) : 0;
  const offLabel = emp.rows.find(isOffRow)?.day_label;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpen(); }
      }}
      className="group text-left bg-white border border-gray-200 rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 sm:p-5 min-w-0 w-full cursor-pointer transition-all hover:border-[#730042]/40 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/30"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#730042] to-[#94005a] text-white flex items-center justify-center text-[13px] font-bold shrink-0 shadow-sm shadow-[#730042]/30">
          {initialsOf(emp.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-gray-900 truncate group-hover:text-[#730042] transition-colors" title={emp.name}>{emp.name}</div>
          <div className="text-[11px] text-gray-400 truncate mt-0.5">{emp.designation || "—"}</div>
          <div className="text-[11px] text-gray-400 truncate">{emp.department || "—"}</div>
        </div>
        <Badge status={emp.status} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-gray-100">
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 truncate">{isWeekend ? "Off Days" : "Required"}</div>
          <div className="text-[15px] font-extrabold text-gray-900 mt-0.5 truncate">
            {isWeekend ? emp.rows.length : fmtHrs(emp.required)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 truncate">Served</div>
          <div className="text-[15px] font-extrabold text-emerald-600 mt-0.5 truncate">{fmtHrs(emp.serving)}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 truncate">Overtime</div>
          <div className={cn("text-[15px] font-extrabold mt-0.5 truncate", emp.overtime > 0 ? "text-amber-600" : "text-gray-300")}>{fmtHrs(emp.overtime)}</div>
        </div>
      </div>

      {!isWeekend && emp.required > 0 && (
        <div className="mt-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-400">Completion</span>
            <span className="text-[11px] font-bold text-gray-700">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#730042] to-[#94005a]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3.5 gap-2 text-[11px] text-gray-400">
        <span className="truncate min-w-0">
          {isWeekend && offLabel ? `${offLabel} · ` : ""}
          {emp.workedDays} day{emp.workedDays === 1 ? "" : "s"} logged
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onExport(emp); }}
            onKeyDown={(e) => e.stopPropagation()}
            disabled={exportDisabled || exporting}
            title={`Export ${emp.name}'s timesheet data`}
            aria-label={`Export ${emp.name}'s timesheet data`}
            className="inline-flex items-center gap-1 text-[#730042] font-semibold bg-transparent border-none p-0 cursor-pointer hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/40 rounded"
          >
            {exporting ? <SpinnerIcon className="w-3 h-3" /> : <Icon name="download" size={12} />}
            <span>{exporting ? "Preparing…" : "Export"}</span>
          </button>
          <span className="text-[#730042] font-semibold opacity-70 group-hover:opacity-100 transition-opacity">View details ›</span>
        </div>
      </div>
    </div>
  );
}

// ─── Report: employee detail modal ────────────────────────────────────────────
function ReportDetailModal({ emp, open, onClose, periodLabel, onExport, exporting, exportDisabled }) {
  if (!open || !emp) return null;
  return (
    <Modal open={open} onClose={onClose} title={`${emp.name} · ${periodLabel}`} wide>
      <div className="flex flex-col gap-5 min-w-0">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#730042] to-[#94005a] text-white flex items-center justify-center text-[12px] font-bold shrink-0">
            {initialsOf(emp.name)}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-gray-900 truncate">{emp.name}</div>
            <div className="text-[11px] text-gray-400 truncate">{emp.designation || "—"} · {emp.department || "—"}</div>
          </div>
          <div className="ml-auto flex items-center gap-2.5 flex-wrap justify-end">
            <Badge status={emp.status} />
            <ExportButton
              label="Export Data"
              loading={exporting}
              disabled={exportDisabled}
              onClick={() => onExport(emp)}
              title={`Export only ${emp.name}'s timesheet data for ${periodLabel}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: "Required", value: fmtHrs(emp.required), c: "text-gray-900" },
            { label: "Served", value: fmtHrs(emp.serving), c: "text-emerald-600" },
            { label: "Overtime", value: fmtHrs(emp.overtime), c: "text-amber-600" },
            { label: "Days Logged", value: emp.workedDays, c: "text-[#730042]" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50/80 ring-1 ring-gray-100 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{s.label}</div>
              <div className={cn("text-[18px] font-extrabold leading-none truncate", s.c)}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">History · {emp.rows.length} entries</div>

          <div className="sm:hidden flex flex-col gap-2">
            {emp.rows.map((r, i) => (
              <div key={r.time_log_id || `${r.date}-${i}`} className={`border border-gray-200 rounded-lg px-3 py-2.5 min-w-0 ${isOffRow(r) ? "bg-gray-50" : "bg-white"}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[12px] font-bold text-gray-900">{fmtDate(r.date)}</span>
                  {isOffRow(r) ? <Chip color="gray">{r.day_label}</Chip> : <Badge status={r.timesheet_status === "off" ? "draft" : r.timesheet_status} />}
                </div>
                {r.job && <div className="text-[12px] text-gray-700 truncate">{r.job.title}{r.project ? ` · ${r.project.name}` : ""}</div>}
                <div className="flex gap-3 text-[11px] mt-1.5 flex-wrap">
                  <span className="text-gray-400">Req {r.required_hours}h</span>
                  <span className="font-bold text-emerald-600">Served {r.serving_hours}h</span>
                  {r.overtime_hours > 0 && <span className="font-bold text-amber-600">Over Time {r.overtime_hours}h</span>}
                </div>
                {(r.approved_by || r.rejected_by) && (
                  <div className="text-[11px] text-gray-400 mt-1">
                    {r.timesheet_status === "approved" ? `Approved by ${r.approved_by}` : `Rejected by ${r.rejected_by}`}
                  </div>
                )}
              </div>
            ))}
          </div>

          <TableWrap className="hidden sm:block border border-gray-200 rounded-lg">
            <table className="w-full border-collapse text-[13px] min-w-[760px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Date", "Day", "Project", "Job", "Required", "Serving", "Overtime", "Status", "Approved/Rejected By"].map((h) => (
                    <th key={h} className={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emp.rows.map((r, i) => {
                  const off = isOffRow(r);
                  return (
                    <tr key={r.time_log_id || `${r.date}-${i}`} className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors ${off ? "bg-gray-50/60" : ""}`}>
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{fmtShort(r.date)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{off ? <Chip color="gray">{r.day_label}</Chip> : <Chip color="brand">Working</Chip>}</td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">{r.project?.name || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">{r.job?.title || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{r.required_hours}h</td>
                      <td className="px-4 py-2.5 font-semibold text-emerald-600 whitespace-nowrap">{r.serving_hours}h</td>
                      <td className="px-4 py-2.5 font-semibold whitespace-nowrap">
                        {r.overtime_hours > 0 ? <span className="text-amber-600">{r.overtime_hours}h</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap"><Badge status={r.timesheet_status === "off" ? "draft" : r.timesheet_status} /></td>
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                        {r.timesheet_status === "approved" && r.approved_by}
                        {r.timesheet_status === "rejected" && r.rejected_by}
                        {!["approved", "rejected"].includes(r.timesheet_status) && "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </div>
      </div>
    </Modal>
  );
}

// ─── All Timesheets: one card per person, click to see every timesheet they filled ───
const sheetOwnerName = (ts) => `${ts.owner?.f_name || ""} ${ts.owner?.l_name || ""}`.trim() || "—";
const sheetOwnerKey = (ts) =>
  `${ts.owner_model || ""}:${ts.owner?._id || ts.owner?.work_email || sheetOwnerName(ts)}`;

function groupSheetsByOwner(sheets) {
  const map = new Map();
  sheets.forEach((ts) => {
    const key = sheetOwnerKey(ts);
    if (!map.has(key)) {
      map.set(key, { key, name: sheetOwnerName(ts), email: ts.owner?.work_email || "", model: ts.owner_model, sheets: [] });
    }
    map.get(key).sheets.push(ts);
  });
  return Array.from(map.values())
    .map((g) => {
      const list = [...g.sheets].sort((a, b) => new Date(b.week_start) - new Date(a.week_start)); // newest first
      const statusCounts = {};
      list.forEach((ts) => { statusCounts[ts.status] = (statusCounts[ts.status] || 0) + 1; });
      const sum = (k) => list.reduce((acc, ts) => acc + (ts[k] || 0), 0);
      return { ...g, sheets: list, total: sum("total_minutes"), billable: sum("billable_minutes"), overtime: sum("overtime_minutes"), statusCounts, latest: list[0] };
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function SheetPersonCard({ person, onOpen }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onOpen(); }
      }}
      className="group text-left bg-white border border-gray-200 rounded-xl shadow-[0_1px_3px_rgba(16,24,40,0.06)] p-4 sm:p-5 min-w-0 w-full cursor-pointer transition-all hover:border-[#730042]/40 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/30"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#730042] to-[#94005a] text-white flex items-center justify-center text-[13px] font-bold shrink-0 shadow-sm shadow-[#730042]/30">
          {initialsOf(person.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[14px] text-gray-900 truncate group-hover:text-[#730042] transition-colors" title={person.name}>{person.name}</div>
          <div className="text-[11px] text-gray-400 truncate" title={person.email}>{person.email || "—"}</div>
          <div className="mt-1.5 flex gap-1.5 flex-wrap">
            <Chip color="brand">{person.model === "User" ? "Employee" : person.model}</Chip>
            {Object.entries(person.statusCounts).map(([st, n]) => {
              const ss = STATUS_STYLE[st] || STATUS_STYLE.draft;
              return (
                <span key={st} className={`${ss.tw} rounded-md border text-[11px] font-bold px-2 py-1 whitespace-nowrap shrink-0`}>
                  {ss.label}{person.sheets.length > 1 ? ` · ${n}` : ""}
                </span>
              );
            })}
          </div>
        </div>
        <span className="text-gray-300 group-hover:text-[#730042] transition-colors text-lg leading-none shrink-0">›</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-gray-100">
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Timesheets</div>
          <div className="text-[15px] font-extrabold text-gray-900 truncate">{person.sheets.length}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Total</div>
          <div className="text-[15px] font-extrabold text-[#730042] truncate">{fmtDuration(person.total)}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Billable</div>
          <div className="text-[15px] font-extrabold text-emerald-600 truncate">{fmtDuration(person.billable)}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-gray-400">
        <span className="truncate min-w-0">
          {person.latest ? `Latest: ${fmtShort(person.latest.week_start)} – ${fmtShort(person.latest.week_end)}` : ""}
        </span>
        <span className="text-[#730042] font-semibold opacity-70 group-hover:opacity-100 transition-opacity shrink-0">View timesheets ›</span>
      </div>
    </div>
  );
}

function SheetDetailModal({ person, onClose }) {
  if (!person) return null;
  return (
    <Modal open={!!person} onClose={onClose} title={`${person.name} · Timesheets`} wide>
      <div className="flex flex-col gap-5 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#730042] to-[#94005a] text-white flex items-center justify-center text-[12px] font-bold shrink-0">
            {initialsOf(person.name)}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-gray-900 truncate">{person.name}</div>
            <div className="text-[11px] text-gray-400 truncate">
              {person.email ? `${person.email} · ` : ""}{person.model === "User" ? "Employee" : person.model}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: "Timesheets", value: person.sheets.length, c: "text-gray-900" },
            { label: "Total", value: fmtDuration(person.total), c: "text-[#730042]" },
            { label: "Billable", value: fmtDuration(person.billable), c: "text-emerald-600" },
            { label: "Overtime", value: fmtDuration(person.overtime), c: "text-amber-600" },
          ].map((t) => (
            <div key={t.label} className="bg-gray-50/80 ring-1 ring-gray-100 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{t.label}</div>
              <div className={cn("text-[18px] font-extrabold leading-none truncate", t.c)}>{t.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Timesheets · {person.sheets.length} filled</div>
          {person.sheets.map((ts) => (
            <div key={ts._id} className="rounded-lg border border-gray-200 bg-white px-3.5 py-3 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2 min-w-0 flex-wrap">
                <span className="text-[12px] font-bold text-gray-900">{fmtDate(ts.week_start)} — {fmtDate(ts.week_end)}</span>
                <Badge status={ts.status} />
              </div>
              <div className="flex items-center gap-4 flex-wrap text-[11px]">
                <span className="text-gray-500">Total <span className="font-bold text-[#730042]">{fmtDuration(ts.total_minutes)}</span></span>
                {ts.billable_minutes > 0 && <span className="text-gray-500">Billable <span className="font-bold text-emerald-600">{fmtDuration(ts.billable_minutes)}</span></span>}
                {ts.overtime_minutes > 0 && <span className="text-gray-500">Overtime <span className="font-bold text-amber-600">{fmtDuration(ts.overtime_minutes)}</span></span>}
              </div>
              {ts.remarks && (
                <div className="mt-2 text-[12px] text-gray-500 px-3 py-2 bg-gray-50/80 rounded-lg border-l-[3px] border-l-[#730042] break-words">{ts.remarks}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
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
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <div className="bg-gray-50/80 ring-1 ring-gray-100 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Assigned To</div>
              <div className="text-[13px] font-bold text-gray-900 truncate">{job.assigned_to_info?.name || "—"}</div>
              <div className="text-[11px] text-[#730042] font-semibold truncate">{job.assigned_to_info?.model === "User" ? "Employee" : (job.assigned_to_info?.role || job.assigned_to_info?.model || "")}</div>
            </div>
            <div className="bg-gray-50/80 ring-1 ring-gray-100 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Assigned By</div>
              <div className="text-[13px] font-bold text-gray-900 truncate">{job.assigned_by_info?.name || "—"}</div>
              <div className="text-[11px] text-[#730042] font-semibold truncate">{job.assigned_by_info?.model === "User" ? "Employee" : (job.assigned_by_info?.role || job.assigned_by_info?.model || "")}</div>
            </div>
            <div className="bg-gray-50/80 ring-1 ring-gray-100 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Status</div>
              <JobChip status={job.status} />
            </div>
            <div className="bg-gray-50/80 ring-1 ring-gray-100 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Priority</div>
              <PriorityChip priority={job.priority} />
            </div>
            <div className="bg-gray-50/80 ring-1 ring-gray-100 rounded-xl p-3 min-w-0">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Logged</div>
              <div className="text-[15px] font-bold text-[#730042]">{job.logged_hours_cache?.toFixed(1) || 0}h</div>
            </div>
            <div className="bg-gray-50/80 ring-1 ring-gray-100 rounded-xl p-3 min-w-0">
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
  const { data: dayStatus } = useMyDayStatus();
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
        <div className={`px-4 sm:px-5 py-3.5 flex items-center gap-2.5 min-w-0 border-b ${isRunning ? "bg-gradient-to-r from-[#730042] to-[#94005a] border-[#730042]" : "bg-gray-50 border-gray-100"}`}>
          {isRunning && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
          <span className={`${isRunning ? "text-white/90" : isPaused ? "text-amber-600" : "text-gray-400"} text-[11px] font-bold uppercase tracking-wide shrink-0`}>
            {isRunning ? "Timer Running" : isPaused ? "Timer Paused" : "No Active Timer"}
          </span>
          {timer?.job?.title && (
            <span className={`${isRunning ? "text-white/80" : "text-gray-400"} ml-auto text-[11px] overflow-hidden text-ellipsis whitespace-nowrap min-w-0 max-w-[120px] sm:max-w-[140px]`}>
              {timer.job.title}
            </span>
          )}
        </div>
        <div className="px-5 sm:px-6 py-5 min-w-0">
          <div className={`font-mono text-3xl sm:text-[40px] font-extrabold tracking-wider leading-none mb-4 select-none tabular-nums ${isRunning ? "text-[#730042]" : isPaused ? "text-amber-600" : "text-gray-200"}`}>
            {fmtSeconds(displaySecs)}
          </div>
          {!timer ? (
            dayStatus?.isOff ? <OffDayTag info={dayStatus} /> : <Btn onClick={() => setStartModal(true)} className="w-full sm:w-auto">▶ Start Timer</Btn>
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
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
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
          <div className="bg-[#730042]/[0.07] border border-[#730042]/20 rounded-xl px-4 sm:px-[18px] py-3.5 flex justify-between items-center gap-3 flex-wrap">
            <span className="text-[12px] text-[#730042] font-semibold">Elapsed Time</span>
            <span className="font-mono font-extrabold text-lg sm:text-xl text-[#730042] tabular-nums">{fmtSeconds(displaySecs)}</span>
          </div>
          <Input label="Note (optional)" placeholder="Brief description…" value={stopNote} onChange={(e) => setStopNote(e.target.value)} />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
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
  const today = todayISTKey();

  return (
    <Card className="overflow-hidden">
      <div className="lg:hidden flex flex-col divide-y divide-gray-100">
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === today;
          const logs = weekDays[iso]?.logs || [];
          const mins = weekDays[iso]?.totalMinutes || 0;
          return (
            <div key={iso} className={`px-3.5 py-3 min-w-0 ${isToday ? "bg-[#730042]/[0.04]" : ""}`}>
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[11px] font-bold uppercase tracking-wide shrink-0 ${isToday ? "text-[#730042]" : "text-gray-400"}`}>{DAY_NAMES[i]}</span>
                  <span className={`text-[14px] font-extrabold ${isToday ? "text-[#730042]" : "text-gray-800"}`}>{d.getDate()}</span>
                </div>
                {mins > 0 && (
                  <span className="text-[10px] font-bold text-[#730042] bg-[#730042]/[0.08] rounded px-1.5 py-0.5 shrink-0">{fmtDuration(mins)}</span>
                )}
              </div>
              {logs.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2 min-w-0">
                  {logs.map((log) => (
                    <div key={log._id}
                      className={`${log.billable ? "bg-emerald-50 border-emerald-200 border-l-[3px] border-l-emerald-500" : "bg-[#730042]/[0.06] border-[#730042]/20 border-l-[3px] border-l-[#730042]"} border rounded-lg px-2.5 py-2 min-w-0`}>
                      <div className="text-[12px] font-semibold text-gray-900 truncate">{log.job?.title || "—"}</div>
                      <div className={`text-[11px] font-bold mt-0.5 ${log.billable ? "text-emerald-600" : "text-[#730042]"}`}>{fmtDuration(log.duration_minutes)}</div>
                    </div>
                  ))}
                </div>
              )}
              {isOffDay(weekDays[iso]) ? <OffDayTag info={weekDays[iso]} /> : iso <= today && (<button
                onClick={() => onAddLog(iso)}
                className="bg-transparent border border-dashed border-gray-200 rounded-lg py-1.5 px-2 cursor-pointer text-gray-400 text-[11px] font-semibold w-full transition-colors hover:border-[#730042]/50 hover:text-[#730042] min-h-[36px]"
              >+ Add</button>)}
            </div>
          );
        })}
      </div>

      <div className="hidden lg:block min-w-0">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {days.map((d, i) => {
            const iso = d.toISOString().slice(0, 10);
            const isToday = iso === today;
            const mins = weekDays[iso]?.totalMinutes || 0;
            return (
              <div key={iso} className={`px-2 pt-3 pb-2.5 text-center min-w-0 ${i < 6 ? "border-r border-gray-100" : ""} ${isToday ? "bg-[#730042]/[0.05]" : ""}`}>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{DAY_NAMES[i]}</div>
                <div className={`text-lg font-extrabold mt-0.5 ${isToday ? "text-[#730042]" : "text-gray-800"}`}>{d.getDate()}</div>
                {mins > 0
                  ? <div className="mt-1.5 text-[10px] font-bold text-[#730042] bg-[#730042]/[0.08] rounded px-1 py-0.5 truncate">{fmtDuration(mins)}</div>
                  : <div className="mt-1.5 h-[20px]" />}
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
              <div key={iso} className={`${i < 6 ? "border-r border-gray-100" : ""} ${isToday ? "bg-[#730042]/[0.02]" : ""} px-1.5 py-2 flex flex-col gap-1 min-w-0`}>
                {logs.map((log) => (
                  <div key={log._id} title={`${log.job?.title || "—"} · ${fmtDuration(log.duration_minutes)}`}
                    className={`${log.billable ? "bg-emerald-50 border-emerald-200 border-l-[3px] border-l-emerald-500" : "bg-[#730042]/[0.06] border-[#730042]/20 border-l-[3px] border-l-[#730042]"} border rounded-lg px-[7px] py-1.5 cursor-default min-w-0`}>
                    <div className="text-[11px] font-semibold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">{log.job?.title || "—"}</div>
                    <div className={`text-[10px] font-bold mt-0.5 ${log.billable ? "text-emerald-600" : "text-[#730042]"}`}>{fmtDuration(log.duration_minutes)}</div>
                  </div>
                ))}
                {isOffDay(weekDays[iso]) ? <OffDayTag info={weekDays[iso]} /> : iso <= today && (<button
                  onClick={() => onAddLog(iso)}
                  className="mt-auto bg-transparent border border-dashed border-gray-200 rounded-lg py-1 px-1 cursor-pointer text-gray-300 text-[11px] font-semibold w-full transition-colors hover:border-[#730042]/50 hover:text-[#730042]"
                >+ Add</button>)}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// Heat colour for a capacity percentage (shared by both heatmap layouts)
const heatBg = (pct) => (pct === 0 ? "bg-gray-50" : pct < 60 ? "bg-emerald-100" : pct < 90 ? "bg-amber-100" : "bg-red-100");
const heatText = (pct) => (pct === 0 ? "text-gray-400" : pct < 60 ? "text-emerald-700" : pct < 90 ? "text-amber-700" : "text-red-700");

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
  const [logForm, setLogForm] = useState({ job: "", log_date: todayISTKey(), duration_minutes: "", note: "" });
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
  const [selectedSheetKey, setSelectedSheetKey] = useState(null);

  const { data: orgLogsData } = useOrgAllTimeLogs({ week_start: logsWeek });
  const { data: orgSheetsData } = useOrgAllTimesheets({
    ...(sheetsStatus ? { status: sheetsStatus } : {}),
    ...(sheetsOwnerModel ? { owner_model: sheetsOwnerModel } : {}),
  });
  const orgLogs = orgLogsData?.logs ?? [];
  const orgSheets = orgSheetsData?.timesheets ?? [];
  const sheetPeople = useMemo(() => groupSheetsByOwner(orgSheets), [orgSheetsData]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedSheetPerson = sheetPeople.find((x) => x.key === selectedSheetKey) || null;

  // ─── Time Sheet Report (Weekly / Weekend / Monthly / Detailed, filterable) ───
  const monthOptions = useMemo(() => buildMonthOptions(24), []);
  const todayKey = todayISTKey();
  const currentWeekMonday = mondayOfYMD(todayKey);
  // Detailed default range: first day of the month DETAILED_DEFAULT_MONTHS-1 months ago -> today
  const detailedDefaultFrom = `${monthOptions[DETAILED_DEFAULT_MONTHS - 1].value}-01`;

  const [reportWeek, setReportWeek] = useState(() => mondayOfYMD(weekStart)); // always a Monday
  const [reportView, setReportView] = useState("weekly");
  const [reportMonth, setReportMonth] = useState(todayISTKey().slice(0, 7));
  const [reportFrom, setReportFrom] = useState(detailedDefaultFrom);
  const [reportTo, setReportTo] = useState(todayKey);
  const [reportEmployeeName, setReportEmployeeName] = useState("");
  const [reportEmployeeModel, setReportEmployeeModel] = useState("");
  const [reportDepartment, setReportDepartment] = useState("");
  const [reportDesignation, setReportDesignation] = useState("");
  const [reportProject, setReportProject] = useState("");
  const [reportJob, setReportJob] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportBillable, setReportBillable] = useState("");
  const [selectedReportEmp, setSelectedReportEmp] = useState(null);
  const [exportingKey, setExportingKey] = useState(null); // "bulk" | employee key | null

  const monthWeekStarts = useMemo(() => weekStartsOfMonth(reportMonth), [reportMonth]);

  // typed filters are debounced before they reach the API
  const debouncedEmployeeName = useDebouncedValue(reportEmployeeName.trim());
  const debouncedDesignation = useDebouncedValue(reportDesignation.trim());
  const filtersPending =
    reportEmployeeName.trim() !== debouncedEmployeeName || reportDesignation.trim() !== debouncedDesignation;

  const reportWeekEnd = addDaysYMD(reportWeek, 6);

  // period = { week_start } or { from, to }; filters are shared by screen + both exports
  const buildReportParams = (period) => ({
    ...period,
    ...(debouncedEmployeeName ? { employee_name: debouncedEmployeeName } : {}),
    ...(reportEmployeeModel ? { employee_model: reportEmployeeModel } : {}),
    ...(reportDepartment ? { department: reportDepartment } : {}),
    ...(debouncedDesignation ? { designation: debouncedDesignation } : {}),
    ...(reportProject ? { project_id: reportProject } : {}),
    ...(reportJob ? { job_id: reportJob } : {}),
    ...(reportStatus ? { status: reportStatus } : {}),
    ...(reportBillable ? { billable: reportBillable } : {}),
  });

  const reportParams = buildReportParams(
    reportView === "detailed" ? { from: reportFrom, to: reportTo } : { week_start: reportWeek }
  );

  // Monthly view = every week touching the month. Fixed 6 slots keep hook order stable;
  // outside monthly view all slots share the same params, so react-query dedupes them into one request.
  const slotParams = (i) =>
    reportView === "monthly"
      ? buildReportParams({ week_start: monthWeekStarts[i] ?? monthWeekStarts[0] })
      : reportParams;
  const rep0 = useTimesheetDetailedReport(slotParams(0));
  const rep1 = useTimesheetDetailedReport(slotParams(1));
  const rep2 = useTimesheetDetailedReport(slotParams(2));
  const rep3 = useTimesheetDetailedReport(slotParams(3));
  const rep4 = useTimesheetDetailedReport(slotParams(4));
  const rep5 = useTimesheetDetailedReport(slotParams(5));
  const reportSlots = [rep0, rep1, rep2, rep3, rep4, rep5];
  const reportLoading = reportSlots.some((s) => s.isFetching);
  const { data: departmentsData } = useGetAllDepartments();
  const reportDepartments = departmentsData?.departments ?? [];

  // code (ENG) / name / _id  ->  full department name (Engineering)
  const departmentNameMap = useMemo(() => {
    const map = new Map();
    (departmentsData?.departments ?? []).forEach((d) => {
      [d.code, d.name, d._id]
        .filter(Boolean)
        .forEach((k) => map.set(String(k).toLowerCase(), d.name));
    });
    return map;
  }, [departmentsData]);

  const getDeptName = useCallback(
    (value) => departmentNameMap.get(String(value || "").toLowerCase()) || value || "—",
    [departmentNameMap]
  );

  const allReportRows = useMemo(() => {
    let rawRows;
    if (reportView === "monthly") {
      const seen = new Set();
      rawRows = [];
      reportSlots.slice(0, monthWeekStarts.length).forEach((slot) => {
        (slot.data?.rows ?? []).forEach((r) => {
          if (!String(r.date).startsWith(reportMonth)) return;
          const k = r.time_log_id || `${r.employee_id || r.name}|${r.date}|${r.day_type}|${r.job?._id || ""}`;
          if (seen.has(k)) return;
          seen.add(k);
          rawRows.push(r);
        });
      });
    } else {
      rawRows = rep0.data?.rows ?? [];
    }
    return rawRows.map((r) => ({ ...r, department: getDeptName(r.department) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rep0.data, rep1.data, rep2.data, rep3.data, rep4.data, rep5.data, reportView, reportMonth, monthWeekStarts, getDeptName]);

  const weekendReportRows = allReportRows.filter((r) => r.day_type === "week_off" || r.day_type === "holiday");
  // rows used for the Bulk CSV (Weekend view exports the weekend/holiday rows, as before)
  const reportRows = reportView === "weekend" ? weekendReportRows : allReportRows;
  const reportEmployees = useMemo(() => groupReportByEmployee(reportRows), [reportRows]);
  const activeReportEmp = reportEmployees.find((e) => e.key === selectedReportEmp) || null;
  const reportMonthLabel = monthLabelOf(reportMonth);
  const reportPeriodLabel =
    reportView === "monthly"
      ? reportMonthLabel
      : reportView === "detailed"
        ? `${fmtYMD(reportFrom)} – ${fmtYMD(reportTo)}`
        : `${fmtYMD(reportWeek)} – ${fmtYMD(reportWeekEnd)}`;

  const activeFilterCount = [
    reportEmployeeName.trim(), reportEmployeeModel, reportDepartment, reportDesignation.trim(),
    reportProject, reportJob, reportStatus, reportBillable,
  ].filter(Boolean).length;

  const clearReportFilters = () => {
    setReportEmployeeName(""); setReportEmployeeModel(""); setReportDepartment(""); setReportDesignation("");
    setReportProject(""); setReportJob(""); setReportStatus(""); setReportBillable("");
  };

  // ─── Report period controls ───
  const changeReportView = (id) => { setReportView(id); setSelectedReportEmp(null); };
  const shiftReportWeek = (dir) => setReportWeek((w) => addDaysYMD(w, dir * 7));
  const monthIdx = monthOptions.findIndex((m) => m.value === reportMonth); // 0 = newest
  const shiftReportMonth = (dir) => {
    const next = monthOptions[monthIdx - dir]; // dir +1 = newer month
    if (next) setReportMonth(next.value);
  };
  const detailedIsDefault = reportFrom === detailedDefaultFrom && reportTo === todayKey;

  // ─── Export (Bulk CSV + individual Export Data share one pipeline) ───
  // Never export while the data on screen is still refreshing / filters are still settling.
  const exportBlocked = reportLoading || filtersPending;

  const runExport = async (key, rows, owner) => {
    if (exportingKey || exportBlocked) return;
    if (!rows.length) {
      toast("No timesheet data available for the selected period.", { icon: "ℹ️" });
      return;
    }
    setExportingKey(key);
    try {
      await new Promise((resolve) => setTimeout(resolve, 50)); // let the "Preparing CSV…" state paint
      const csv = generateCSV(rows, { statusLabel: reportStatusLabel });
      downloadCSV(
        csv,
        buildExportFilename({ owner, view: reportView, monthLabel: reportMonthLabel, weekStart: reportWeek, weekEnd: reportWeekEnd })
      );
      toast.success("CSV exported successfully.");
    } catch (err) {
      console.error("Timesheet CSV export failed:", err);
      toast.error("Unable to export timesheet data. Please try again.");
    } finally {
      setExportingKey(null);
    }
  };

  // All employees for the selected period (respects every active filter, same rows as the cards)
  const exportBulkTimesheetCSV = () => runExport("bulk", reportRows);
  // Only this employee, same period / view rules as the bulk export
  const exportEmployeeTimesheetCSV = (emp) =>
    runExport(emp.key, reportView === "weekend" ? emp.rows.filter(isOffRow) : emp.rows, emp.name);

  const { data: reportProjectsData } = useMyProjects();
  const reportProjectOptions = reportProjectsData?.projects ?? [];
  const { data: reportJobsData } = useOrgAllJobs(reportProject ? { project: reportProject } : {});
  const reportJobOptions = reportJobsData?.jobs ?? [];

  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const updateJobStatus = useUpdateJobStatus();
  const logTime = useLogTime();
  const { data: logDayStatus } = useMyDayStatus(logForm.log_date || undefined);
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
  const weekLabel = `${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`;

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
        setLogForm({ job: "", log_date: todayISTKey(), duration_minutes: "", note: "" });
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
  const navRef = useRef(null);

  // The page itself must never scroll: the <main> area below scrolls vertically on its own.
  // ROOT-CAUSE FIX for the browser-level horizontal scrollbar: when one overflow axis is not `visible`
  // the other axis computes to `auto`, so any 1px of overflow turned into a page-level horizontal
  // scrollbar. Both axes are locked together with `overflow: hidden` (wide tables scroll inside their
  // own <TableWrap> instead). The sidebar therefore stays fixed – only <main> scrolls.
  useEffect(() => {
    const locked = [];
    const lock = (el) => {
      if (!el) return;
      locked.push({
        el,
        overflow: el.style.overflow,
        overflowX: el.style.overflowX,
        overflowY: el.style.overflowY,
        height: el.style.height,
        maxHeight: el.style.maxHeight,
        maxWidth: el.style.maxWidth,
        margin: el.style.margin,
      });
      el.style.overflow = "hidden";
      el.style.height = "100%";
      el.style.maxHeight = "100%";
      el.style.maxWidth = "100%";
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

    const resetters = [];
    locked.forEach(({ el }) => {
      if (el === document.documentElement || el === document.body) return;
      const reset = () => { if (el.scrollLeft !== 0) el.scrollLeft = 0; if (el.scrollTop !== 0) el.scrollTop = 0; };
      el.addEventListener("scroll", reset);
      resetters.push([el, reset]);
    });

    return () => {
      resetters.forEach(([el, reset]) => el.removeEventListener("scroll", reset));
      locked.forEach(({ el, overflow, overflowX, overflowY, height, maxHeight, maxWidth, margin }) => {
        el.style.overflow = overflow;
        el.style.overflowX = overflowX;
        el.style.overflowY = overflowY;
        el.style.height = height;
        el.style.maxHeight = maxHeight;
        el.style.maxWidth = maxWidth;
        if (margin !== undefined) el.style.margin = margin;
      });
    };
  }, []);

  // Fit the page EXACTLY to the visible area right of the sidebar and below the app top bar.
  // If a parent layout is wider than the screen (it gets clipped), the page's own bottom scrollbar would
  // sit off-screen. Sizing the root from the real viewport keeps the bottom horizontal scrollbar visible,
  // and nothing can run past the right edge of the screen.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const fit = () => {
      const r = root.getBoundingClientRect();
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.max(280, Math.floor(vw - r.left));
      const h = Math.max(320, Math.floor(vh - r.top));
      root.style.width = `${w}px`;
      root.style.maxWidth = `${w}px`;
      root.style.height = `${h}px`;
      root.style.maxHeight = `${h}px`;
      root.style.flex = "none";
    };
    fit();
    window.addEventListener("resize", fit);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    let el = root.parentElement;
    while (el && ro) { ro.observe(el); el = el.parentElement; }
    const timer = setInterval(fit, 500); // catches sidebar collapse/expand animations
    return () => {
      window.removeEventListener("resize", fit);
      if (ro) ro.disconnect();
      clearInterval(timer);
      ["width", "maxWidth", "height", "maxHeight", "flex"].forEach((k) => { root.style[k] = ""; });
    };
  }, []);

  return (
    <div ref={rootRef} className="ts-root h-full w-full min-h-0 min-w-0 max-w-full bg-gray-50 font-sans text-gray-900 antialiased flex flex-col overflow-hidden">
      {/* ─── Top navigation ─── */}
      <header className="w-full bg-white border-b border-gray-200 shrink-0 z-20 min-w-0 max-w-full shadow-[0_10px_24px_-18px_rgba(115,0,66,0.35)]">
        <div className="w-full max-w-[1280px] mx-auto px-3 sm:px-6 min-w-0">
          <div className="flex items-center justify-between gap-3 py-2.5 sm:py-3 min-w-0">
            <TorchXLogo />
            <button
              onClick={() => setJobModal(true)}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-[#730042] hover:bg-[#5c0034] text-white font-semibold rounded-md shadow-sm px-3 sm:px-4 text-[12px] whitespace-nowrap transition-colors min-h-[40px] cursor-pointer border-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/40 focus-visible:ring-offset-2"
            >
              <Icon name="plus" size={15} />
              <span className="hidden xs:inline sm:inline">New Job</span>
            </button>
          </div>

          {/* Tabs: scroll inside this strip on small screens, never widen the page */}
          <nav ref={navRef} aria-label="Timesheet sections" className="ts-scroll w-full min-w-0 max-w-full overflow-x-auto border-t border-gray-100">
            <div className="flex flex-nowrap items-end gap-0.5 w-max min-w-full">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={(e) => {
                      setTab(t.id);
                      // scroll ONLY the tab strip (scrollIntoView would also scroll the app sidebar/layout)
                      const nav = navRef.current;
                      if (nav) {
                        const nr = nav.getBoundingClientRect();
                        const br = e.currentTarget.getBoundingClientRect();
                        nav.scrollBy({ left: br.left - nr.left - (nav.clientWidth - br.width) / 2, behavior: "smooth" });
                      }
                    }}
                    className={cn(
                      "group relative shrink-0 inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-3 text-[12.5px] lg:text-[13px] whitespace-nowrap bg-transparent border-none cursor-pointer transition-colors focus:outline-none focus-visible:bg-[#730042]/[0.06]",
                      active ? "text-[#730042] font-bold" : "text-gray-500 font-semibold hover:text-gray-900"
                    )}
                  >
                    <Icon name={t.icon} size={15} className={active ? "text-[#730042]" : "text-gray-400"} />
                    {t.label}
                    {t.id === "approvals" && approvals.length > 0 && (
                      <span className={cn("inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-black",
                        active ? "bg-[#730042] text-white" : "bg-red-500 text-white")}>
                        {approvals.length}
                      </span>
                    )}
                    <span aria-hidden="true" className={cn("absolute left-2.5 right-2.5 bottom-0 h-[3px] rounded-t-full transition-colors",
                      active ? "bg-[#730042]" : "bg-transparent group-hover:bg-gray-200")} />
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      <div className="shrink-0 bg-gradient-to-r from-[#730042]/[0.08] to-[#730042]/[0.03] border-b border-[#730042]/[0.15] px-3 sm:px-6 py-1.5 flex items-center gap-2 overflow-hidden min-w-0">
        <span className="text-[11px] font-bold text-[#730042] shrink-0">⬡ Admin</span>
        <span className="text-[11px] text-[#730042]/70 hidden sm:inline truncate">— Manage jobs, approvals and team timesheets</span>
      </div>

      {/* ─── Page content: the only vertical scroller. Wide tables scroll inside their own wrapper. ─── */}
      <main className="ts-scroll ts-main flex-1 min-h-0 min-w-0 overflow-auto w-full">
        <div className="max-w-[1280px] mx-auto px-3 sm:px-6 py-4 sm:py-7 w-full min-w-0 lg:min-w-[900px]">

          {tab === "overview" && (
            <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
              <PageHeader icon="overview" title="Overview" sub="Jobs, approvals and workload at a glance" />
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 -mt-2">
                <StatCard label="Jobs Created" value={createdJobs.length} color="text-[#730042]" icon="jobs" />
                <StatCard label="Pending Approvals" value={approvals.length} color="text-amber-600" icon="approvals" />
                <StatCard label="Overrun Risk" value={overrunJobs.length} color="text-red-600" sub="≥75% estimate used" icon="alert" />
                <StatCard label="Idle Jobs" value={idleJobs.length} color="text-slate-500" sub="7+ days inactive" icon="moon" />
                <StatCard label="My Hours This Week" value={fmtDuration(totalWeekMins)} color="text-emerald-600" icon="timesheets" />
              </div>

              {approvals.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader title="Pending Approvals" right={<Chip color="amber">{approvals.length} waiting</Chip>} />
                  {approvals.slice(0, 3).map((ts) => (
                    <div key={ts._id} className="px-4 sm:px-5 py-3 border-b border-gray-100 last:border-b-0 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-3.5 min-w-0">
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="w-9 h-9 bg-gradient-to-br from-[#730042] to-[#94005a] rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0">
                          {(ts.owner?.f_name?.[0] || "?")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-gray-900 truncate">{ts.owner?.f_name} {ts.owner?.l_name}</div>
                          <div className="text-[12px] text-gray-400 truncate">Week of {fmtDate(ts.week_start)} · {fmtDuration(ts.total_minutes)}</div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Btn variant="success" onClick={() => approveTS.mutate({ timesheetId: ts._id, remarks: "Approved" }, { onSuccess: refetchApprovals })} className="flex-1 sm:flex-none">Approve</Btn>
                        <Btn variant="danger" onClick={() => setRejectModal({ open: true, ts })} className="flex-1 sm:flex-none">Reject</Btn>
                      </div>
                    </div>
                  ))}
                  {approvals.length > 3 && (
                    <div className="px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50/60">
                      <button onClick={() => setTab("approvals")} className={LINK_BTN}>
                        View all {approvals.length} pending →
                      </button>
                    </div>
                  )}
                </Card>
              )}

              <Card className="overflow-hidden">
                <CardHeader title="Jobs by Status" />
                <div className="px-4 sm:px-5 py-4 grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
                  {["not_started", "in_progress", "on_hold", "completed", "cancelled"].map((s) => {
                    const count = createdJobs.filter((j) => j.status === s).length;
                    const block = JOB_STATUS_BLOCK[s];
                    return (
                      <div key={s} className={`${block.bg} border ${block.border} rounded-xl px-3 py-3.5 text-center min-w-0`}>
                        <div className={`text-2xl sm:text-3xl font-extrabold ${block.text}`}>{count}</div>
                        <div className={`text-[11px] font-medium mt-1 capitalize ${block.text} truncate`}>{s.replace(/_/g, " ")}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {tab === "team-jobs" && (
            <div className="min-w-0">
              <PageHeader
                icon="jobs"
                title="Team Jobs"
                sub={`${createdJobs.length} jobs created by you`}
                actions={<Btn onClick={() => setJobModal(true)} className="w-full sm:w-auto"><Icon name="plus" size={16} /> Create Job</Btn>}
              />

              <div className="mb-7">
                <div className="text-[15px] font-semibold text-gray-900 tracking-tight">My Jobs</div>
                <p className="text-[12px] text-gray-400 mt-0.5 mb-3">{assignedJobs.length} jobs assigned to you</p>
                {assignedJobs.length === 0 ? (
                  <Card>
                    <EmptyState icon="inbox" title="No jobs assigned to you" sub="Jobs assigned to you will show up here" />
                  </Card>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {assignedJobs.map((j) => (
                      <JobCard
                        key={j._id}
                        j={j}
                        onView={() => openJobDetail(j._id)}
                        onComplete={() => updateJobStatus.mutate({ id: j._id, status: "completed" }, { onSuccess: refetchCreated })}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[15px] font-semibold text-gray-900 tracking-tight mb-3">Assigned by Me</div>
              <div className="flex flex-col gap-2.5">
                {createdJobs.length === 0 ? (
                  <Card>
                    <EmptyState icon="jobs" title="No jobs created yet" action={<Btn onClick={() => setJobModal(true)}>+ Create First Job</Btn>} />
                  </Card>
                ) : (
                  createdJobs.map((j) => (
                    <JobCard
                      key={j._id}
                      j={j}
                      showAssignee
                      onView={() => openJobDetail(j._id)}
                      onEdit={() => openEditJob(j)}
                      onComplete={() => updateJobStatus.mutate({ id: j._id, status: "completed" }, { onSuccess: refetchCreated })}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "approvals" && (
            <div className="min-w-0">
              <PageHeader icon="approvals" title="Timesheet Approvals" sub={`${approvals.length} pending your review`} />
              {approvals.length === 0 ? (
                <Card>
                  <EmptyState icon="approvals" title="All clear — no pending approvals" />
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {approvals.map((ts) => (
                    <Card key={ts._id} className="px-4 sm:px-6 py-4 sm:py-5 hover:border-[#730042]/30 hover:shadow-md transition-all">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex gap-3.5 min-w-0">
                          <div className="w-11 h-11 bg-gradient-to-br from-[#730042] to-[#94005a] rounded-full flex items-center justify-center text-base font-bold text-white shrink-0 shadow-sm shadow-[#730042]/30">
                            {ts.owner?.f_name?.[0] || "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[15px] font-bold text-gray-900 truncate">{ts.owner?.f_name} {ts.owner?.l_name}</div>
                            <div className="text-[12px] text-gray-400 mt-0.5 break-all">{ts.owner?.work_email}</div>
                            <div className="text-[12px] text-gray-400 mt-0.5">Week: {fmtDate(ts.week_start)} – {fmtDate(ts.week_end)}</div>
                            <div className="flex gap-1.5 mt-2.5 flex-wrap items-center">
                              <Chip color="brand">{fmtDuration(ts.total_minutes)}</Chip>
                              {ts.overtime_minutes > 0 && <Chip color="amber">{fmtDuration(ts.overtime_minutes)} overtime</Chip>}
                              {ts.billable_minutes > 0 && <Chip color="green">{fmtDuration(ts.billable_minutes)} billable</Chip>}
                              <Badge status={ts.status} />
                            </div>
                            {ts.total_billed_amount > 0 && (
                              <div className="text-[13px] font-semibold text-emerald-600 mt-2">₹{ts.total_billed_amount.toFixed(2)} billed</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap shrink-0">
                          <Btn variant="success" onClick={() => approveTS.mutate({ timesheetId: ts._id, remarks: "Approved by Admin" }, { onSuccess: refetchApprovals })} className="flex-1 sm:flex-none">Approve</Btn>
                          <Btn variant="amber" onClick={() => forwardTS.mutate({ timesheetId: ts._id, remarks: ts.status === "pending_coadmin" ? "Forwarded to Main Admin" : "Forwarded to SuperAdmin" }, { onSuccess: refetchApprovals })} className="flex-1 sm:flex-none">{ts.status === "pending_coadmin" ? "Forward to Main Admin" : "Forward to SA"}</Btn>
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
            <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
              <PageHeader
                icon="insights"
                title="Insights"
                sub="Team workload, overrun risk and idle jobs"
                actions={<WeekSwitcher label={weekLabel} onPrev={() => shiftWeek(-1)} onNext={() => shiftWeek(1)} />}
              />

              <Card className="overflow-hidden -mt-2">
                <CardHeader title="Team Workload Heatmap" sub="Daily capacity usage (8h = 100%)" />
                <div className="px-3 sm:px-5 py-4 min-w-0">
                  {heatmap.length === 0 ? (
                    <div className="text-center text-gray-400 text-[13px] py-8">No team data for this week</div>
                  ) : (
                    <>
                      <div className="lg:hidden flex flex-col gap-3">
                        {heatmap.map((row, i) => {
                          const dayKeys = Array.from({ length: 7 }, (_, d) => {
                            const dt = new Date(weekStart);
                            dt.setDate(dt.getDate() + d);
                            return dt.toISOString().slice(0, 10);
                          });
                          const meta = [row.empid, row.department && getDeptName(row.department), row.designation].filter(Boolean).join(" • ");
                          return (
                            <div key={i} className="border border-gray-200 rounded-xl p-3 min-w-0">
                              <div className="flex items-center gap-2.5 mb-2.5 min-w-0">
                                <div className="w-8 h-8 bg-[#730042]/[0.08] rounded-full flex items-center justify-center text-[11px] font-bold text-[#730042] shrink-0">
                                  {row.name ? row.name.slice(0, 2).toUpperCase() : String(row.person).slice(-2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold text-gray-900 truncate">{row.name || row.person}</div>
                                  {meta && <div className="text-[10px] text-gray-400 truncate">{meta}</div>}
                                </div>
                              </div>
                              <div className="grid grid-cols-7 gap-1">
                                {dayKeys.map((dk, di) => {
                                  const pct = row.days[dk]?.loadPercent || 0;
                                  return (
                                    <div key={dk} className="flex flex-col items-center gap-0.5 min-w-0">
                                      <span className="text-[9px] text-gray-400 font-bold">{DAY_NAMES[di][0]}</span>
                                      <div title={`${pct}%`} className={`w-full aspect-square ${heatBg(pct)} rounded-md flex items-center justify-center text-[9px] font-bold ${heatText(pct)}`}>
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
                            <div key={d} className="flex-1 text-center text-[11px] text-gray-400 font-bold">{d}</div>
                          ))}
                        </div>
                        {heatmap.map((row, i) => {
                          const dayKeys = Array.from({ length: 7 }, (_, d) => {
                            const dt = new Date(weekStart);
                            dt.setDate(dt.getDate() + d);
                            return dt.toISOString().slice(0, 10);
                          });
                          const meta = [row.empid, row.department && getDeptName(row.department), row.designation].filter(Boolean).join(" • ");
                          return (
                            <div key={i} className="flex items-center gap-2.5 mb-2">
                              <div className="w-8 h-8 bg-[#730042]/[0.08] rounded-full flex items-center justify-center text-[11px] font-bold text-[#730042] shrink-0">
                                {row.name ? row.name.slice(0, 2).toUpperCase() : String(row.person).slice(-2).toUpperCase()}
                              </div>
                              <div className="w-[7.5rem] min-w-0 shrink-0 pr-2">
                                <div className="text-[12px] font-semibold text-gray-800 truncate">{row.name || row.person}</div>
                                {meta && <div className="text-[10px] text-gray-400 truncate">{meta}</div>}
                              </div>
                              {dayKeys.map((dk) => {
                                const pct = row.days[dk]?.loadPercent || 0;
                                return (
                                  <div key={dk} title={`${pct}%`} className={`flex-1 min-w-0 h-[34px] ${heatBg(pct)} rounded-lg flex items-center justify-center text-[11px] font-bold ${heatText(pct)}`}>
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
                <Card className="overflow-hidden">
                  <CardHeader title={<><span className="text-red-600">⚠ Overrun Risk</span><Chip color="red">{overrunJobs.length}</Chip></>} />
                  {overrunJobs.length === 0 ? (
                    <div className="px-4 sm:px-5 py-6 text-[13px] text-gray-400">No jobs at risk</div>
                  ) : overrunJobs.map((j) => (
                    <div key={j._id} className="px-4 sm:px-5 py-3 border-b border-gray-100 last:border-b-0 flex items-center gap-3 min-w-0 hover:bg-gray-50/60 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-gray-900 truncate">{j.title}</div>
                        <div className="text-[11px] text-gray-400">{j.logged_hours_cache}h / {j.estimated_hours}h</div>
                      </div>
                      <span className={`text-[13px] font-bold shrink-0 ${j.riskPercent >= 100 ? "text-red-600" : "text-amber-600"}`}>{j.riskPercent}%</span>
                    </div>
                  ))}
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader title={<><span className="text-gray-700">💤 Idle Jobs</span><Chip color="gray">{idleJobs.length}</Chip></>} />
                  {idleJobs.length === 0 ? (
                    <div className="px-4 sm:px-5 py-6 text-[13px] text-gray-400">No idle jobs</div>
                  ) : idleJobs.map((j) => (
                    <div key={j._id} className="px-4 sm:px-5 py-3 border-b border-gray-100 last:border-b-0 flex items-center gap-3 min-w-0 hover:bg-gray-50/60 transition-colors">
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
              <PageHeader
                icon="mywork"
                title="My Work"
                sub="Track time, log work and submit your weekly timesheet"
                actions={
                  <>
                    <WeekSwitcher label={weekLabel} onPrev={() => shiftWeek(-1)} onNext={() => shiftWeek(1)} />
                    <Btn onClick={() => setLogModal(true)}><Icon name="plus" size={16} /> Log Time</Btn>
                  </>
                }
              />

              <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 sm:gap-5 min-w-0 -mt-2">
                <TimerWidget jobs={assignedJobs} />
                <div className="flex flex-col gap-3.5 min-w-0">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: "Total", value: fmtDuration(totalWeekMins), color: "text-[#730042]" },
                      { label: "Billable", value: fmtDuration(prodData?.billableMinutes || 0), color: "text-emerald-600" },
                      { label: "Capacity", value: `${prodData?.capacityPercent || Math.round((totalWeekMins / 2400) * 100)}%`, color: "text-blue-600" },
                    ].map((s) => (
                      <Card key={s.label} className="px-2.5 sm:px-4 py-3 sm:py-4">
                        <div className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 sm:mb-1.5 truncate">{s.label}</div>
                        <div className={`text-lg sm:text-2xl font-extrabold leading-none ${s.color} truncate`}>{s.value}</div>
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
              <PageHeader icon="timesheets" title="My Timesheets" sub={`${timesheets.length} timesheet${timesheets.length === 1 ? "" : "s"}`} />
              <div className="flex flex-col gap-2.5 -mt-2">
                {timesheets.length === 0 ? (
                  <Card>
                    <EmptyState icon="timesheets" title="No timesheets yet" action={<Btn onClick={() => setTab("my-work")}>Go to My Work</Btn>} />
                  </Card>
                ) : timesheets.map((ts) => (
                  <Card key={ts._id} className="px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 hover:border-[#730042]/30 hover:shadow-md transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-gray-900 mb-2">Week of {fmtDate(ts.week_start)}</div>
                      <div className="flex gap-1.5 flex-wrap items-center">
                        <Badge status={ts.status} />
                        <Chip color="brand">{fmtDuration(ts.total_minutes)}</Chip>
                        {ts.billable_minutes > 0 && <Chip color="green">{fmtDuration(ts.billable_minutes)} billable</Chip>}
                      </div>
                    </div>
                    {ts.remarks && <div className="text-[13px] text-gray-500 italic break-words min-w-0">"{ts.remarks}"</div>}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tab === "org-logs" && (
            <div className="min-w-0">
              <PageHeader
                icon="logs"
                title="All Time Logs — Organisation"
                sub={`${orgLogs.length} entries · ${Math.floor((orgLogsData?.totalMinutes || 0) / 60)}h ${(orgLogsData?.totalMinutes || 0) % 60}m total`}
                actions={
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-[12px] text-gray-400 shrink-0">Week of</span>
                    <input type="date" value={logsWeek} onChange={e => setLogsWeek(e.target.value)} className={cn(FILTER_CONTROL, FILTER_IDLE, "px-3 py-2 sm:w-auto")} />
                  </div>
                }
              />
              {orgLogs.length === 0 ? (
                <Card>
                  <EmptyState icon="logs" title="No logs found" sub="No time entries across the org for this week" />
                </Card>
              ) : (
                <>
                  <div className="lg:hidden flex flex-col gap-2.5">
                    {orgLogs.map(log => (
                      <Card key={log._id} className="px-4 py-3.5">
                        <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
                          <span className="text-[14px] font-bold text-gray-900 truncate min-w-0">
                            {log.logged_by?.f_name || "—"} {log.logged_by?.l_name || ""}
                          </span>
                          <Badge status={log.status} />
                        </div>
                        <div className="text-[13px] text-gray-700 mb-2 truncate">{log.job?.title || "—"}</div>
                        <div className="flex items-center justify-between flex-wrap gap-1.5">
                          <div className="flex gap-1.5 flex-wrap">
                            <Chip color="brand">{log.logged_by_model === "User" ? "Employee" : log.logged_by_model}</Chip>
                            <Chip color={log.entry_mode === "timer" ? "blue" : "gray"}>{log.entry_mode}</Chip>
                          </div>
                          <div className="flex items-center gap-2 text-[12px]">
                            <span className="text-gray-400">{fmtDate(log.log_date)}</span>
                            <span className="font-bold text-emerald-600">{fmtDuration(log.duration_minutes)}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <Card className="hidden lg:block overflow-hidden">
                    <TableWrap>
                      <table className="w-full border-collapse text-[13px] min-w-[760px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            {["Member", "Role", "Job", "Date", "Duration", "Mode", "Status"].map(h => (
                              <th key={h} className={TH}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {orgLogs.map(log => (
                            <tr key={log._id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                {log.logged_by?.f_name || "—"} {log.logged_by?.l_name || ""}
                              </td>
                              <td className="px-4 py-3"><Chip color="brand">{log.logged_by_model === "User" ? "Employee" : log.logged_by_model}</Chip></td>
                              <td className="px-4 py-3 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap text-gray-700">{log.job?.title || "—"}</td>
                              <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(log.log_date)}</td>
                              <td className="px-4 py-3 font-semibold text-emerald-600 whitespace-nowrap">{fmtDuration(log.duration_minutes)}</td>
                              <td className="px-4 py-3"><Chip color={log.entry_mode === "timer" ? "blue" : "gray"}>{log.entry_mode}</Chip></td>
                              <td className="px-4 py-3"><Badge status={log.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableWrap>
                  </Card>
                </>
              )}
            </div>
          )}

          {tab === "org-sheets" && (
            <div className="min-w-0">
              <PageHeader
                icon="sheets"
                title="All Timesheets — Organisation"
                sub={`${sheetPeople.length} employee${sheetPeople.length === 1 ? "" : "s"} · ${orgSheets.length} timesheet${orgSheets.length === 1 ? "" : "s"}`}
                actions={
                  <div className="flex gap-2 flex-col xs:flex-row w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                      <select value={sheetsStatus} onChange={e => setSheetsStatus(e.target.value)} aria-label="Status" className={cn(FILTER_CONTROL, sheetsStatus ? FILTER_ACTIVE : FILTER_IDLE, "appearance-none cursor-pointer pl-3 pr-9 py-2")}>
                        <option value="">All Statuses</option>
                        {Object.entries(STATUS_STYLE).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      <Icon name="chevron" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    <div className="relative flex-1 sm:flex-none">
                      <select value={sheetsOwnerModel} onChange={e => setSheetsOwnerModel(e.target.value)} aria-label="Role" className={cn(FILTER_CONTROL, sheetsOwnerModel ? FILTER_ACTIVE : FILTER_IDLE, "appearance-none cursor-pointer pl-3 pr-9 py-2")}>
                        <option value="">All Roles</option>
                        <option value="User">Employee</option>
                        <option value="Manager">Manager</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <Icon name="chevron" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                }
              />
              {orgSheets.length === 0 ? (
                <Card>
                  <EmptyState icon="sheets" title="No timesheets found" sub="Adjust filters to view timesheets" />
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {sheetPeople.map((person) => (
                    <SheetPersonCard key={person.key} person={person} onOpen={() => setSelectedSheetKey(person.key)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "report" && (
            <div className="min-w-0">
              {/* ─── Header ─── */}
              <PageHeader
                icon="report"
                title={REPORT_TITLES[reportView]}
                sub={`${reportEmployees.length} employee${reportEmployees.length === 1 ? "" : "s"} · ${reportRows.length} row${reportRows.length === 1 ? "" : "s"} · ${reportPeriodLabel}${(reportLoading || filtersPending) ? " · refreshing…" : ""}`}
                actions={
                  <ExportButton
                    variant="solid"
                    label="Bulk CSV"
                    loading={exportingKey === "bulk"}
                    disabled={!reportRows.length || exportBlocked || (!!exportingKey && exportingKey !== "bulk")}
                    onClick={exportBulkTimesheetCSV}
                    title={reportRows.length
                      ? `Download ${reportRows.length} row${reportRows.length === 1 ? "" : "s"} for ${reportEmployees.length} employee${reportEmployees.length === 1 ? "" : "s"} · ${reportPeriodLabel}`
                      : "No timesheet data available for the selected period."}
                    className="w-full sm:w-auto"
                  />
                }
              />

              {/* ─── Filters ─── */}
              <Card className="mb-4">
                {/* Report type + period */}
                <div className="px-4 sm:px-5 py-4 bg-gray-50/70 border-b border-gray-100 flex flex-col xl:flex-row xl:items-end justify-between gap-4 rounded-t-xl">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <span className={FILTER_LABEL}>Report type</span>
                    <div className="inline-flex w-full sm:w-auto bg-gray-200/70 rounded-lg p-1 gap-1" role="group" aria-label="Report type">
                      {REPORT_VIEWS.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => changeReportView(v.id)}
                          aria-pressed={reportView === v.id}
                          className={cn(
                            "flex-1 sm:flex-none px-3.5 py-1.5 min-h-[34px] rounded-md text-[12px] sm:text-[13px] font-semibold transition-all border-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#730042]/40",
                            reportView === v.id ? "bg-white text-[#730042] shadow-sm" : "bg-transparent text-gray-500 hover:text-gray-900"
                          )}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-0">
                    {reportView === "monthly" ? (
                      <>
                        <span className={FILTER_LABEL}>Month</span>
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <div className={STEPPER_WRAP}>
                            <button type="button" onClick={() => shiftReportMonth(-1)} disabled={monthIdx >= monthOptions.length - 1} aria-label="Previous month" className={STEP_BTN}><Icon name="left" size={16} /></button>
                            <select
                              aria-label="Month"
                              value={reportMonth}
                              onChange={(e) => setReportMonth(e.target.value)}
                              className="h-10 px-2 text-[13px] font-semibold text-gray-900 bg-transparent outline-none cursor-pointer text-center border-x border-gray-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#730042]/40"
                            >
                              {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <button type="button" onClick={() => shiftReportMonth(1)} disabled={monthIdx <= 0} aria-label="Next month" className={STEP_BTN}><Icon name="right" size={16} /></button>
                          </div>
                          {monthIdx !== 0 && (
                            <button type="button" onClick={() => setReportMonth(monthOptions[0].value)} className={LINK_BTN}>
                              Current month
                            </button>
                          )}
                        </div>
                      </>
                    ) : reportView === "detailed" ? (
                      <>
                        <span className={FILTER_LABEL}>Date range (up to today)</span>
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <input
                            type="date"
                            aria-label="From date"
                            value={reportFrom}
                            max={reportTo}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              setReportFrom(v);
                              if (v > reportTo) setReportTo(v);
                            }}
                            className={DATE_INPUT_CLS}
                          />
                          <span className="text-[12px] text-gray-400">to</span>
                          <input
                            type="date"
                            aria-label="To date"
                            value={reportTo}
                            max={todayKey}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              setReportTo(v);
                              if (v < reportFrom) setReportFrom(v);
                            }}
                            className={DATE_INPUT_CLS}
                          />
                          {!detailedIsDefault && (
                            <button type="button" onClick={() => { setReportFrom(detailedDefaultFrom); setReportTo(todayKey); }} className={LINK_BTN}>
                              Reset range
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <span className={FILTER_LABEL}>Week</span>
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <div className={STEPPER_WRAP}>
                            <button type="button" onClick={() => shiftReportWeek(-1)} aria-label="Previous week" className={STEP_BTN}><Icon name="left" size={16} /></button>
                            <span className="px-3 text-[13px] font-semibold text-gray-900 whitespace-nowrap border-x border-gray-200 h-10 flex items-center">
                              {fmtYMD(reportWeek)} – {fmtYMD(reportWeekEnd)}
                            </span>
                            <button type="button" onClick={() => shiftReportWeek(1)} disabled={reportWeek >= currentWeekMonday} aria-label="Next week" className={STEP_BTN}><Icon name="right" size={16} /></button>
                          </div>
                          <input
                            type="date"
                            aria-label="Jump to a date (selects its week)"
                            value={reportWeek}
                            max={todayKey}
                            onChange={(e) => { if (e.target.value) setReportWeek(mondayOfYMD(e.target.value)); }}
                            className={DATE_INPUT_CLS}
                          />
                          {reportWeek !== currentWeekMonday && (
                            <button type="button" onClick={() => setReportWeek(currentWeekMonday)} className={LINK_BTN}>
                              This week
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Filters */}
                <div className="px-4 sm:px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 text-[13px] font-bold text-gray-900">
                      Filters
                      {activeFilterCount > 0 && <Chip color="brand">{activeFilterCount} active</Chip>}
                    </div>
                    {activeFilterCount > 0 && (
                      <button type="button" onClick={clearReportFilters} className={LINK_BTN}>
                        Clear all filters
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <FilterInput
                      label="Employee"
                      placeholder="Search by name"
                      icon={<Icon name="search" size={14} />}
                      value={reportEmployeeName}
                      active={!!reportEmployeeName.trim()}
                      onChange={(e) => setReportEmployeeName(e.target.value)}
                      onClear={() => setReportEmployeeName("")}
                    />
                    <FilterSelect label="Role" active={!!reportEmployeeModel} value={reportEmployeeModel} onChange={(e) => setReportEmployeeModel(e.target.value)}>
                      <option value="">All Roles</option>
                      <option value="User">Employee</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </FilterSelect>
                    <FilterSelect label="Department" active={!!reportDepartment} value={reportDepartment} onChange={(e) => setReportDepartment(e.target.value)}>
                      <option value="">All Departments</option>
                      {reportDepartments.map((department) => (
                        <option key={department._id} value={department.code || department.name}>{department.name}</option>
                      ))}
                    </FilterSelect>
                    <FilterInput
                      label="Designation"
                      placeholder="e.g. Software Engineer"
                      value={reportDesignation}
                      active={!!reportDesignation.trim()}
                      onChange={(e) => setReportDesignation(e.target.value)}
                      onClear={() => setReportDesignation("")}
                    />
                    <FilterSelect label="Project" active={!!reportProject} value={reportProject} onChange={(e) => { setReportProject(e.target.value); setReportJob(""); }}>
                      <option value="">All Projects</option>
                      {reportProjectOptions.map((p) => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </FilterSelect>
                    <FilterSelect label="Job" active={!!reportJob} value={reportJob} onChange={(e) => setReportJob(e.target.value)}>
                      <option value="">All Jobs</option>
                      {reportJobOptions.map((j) => (
                        <option key={j._id} value={j._id}>{j.title}</option>
                      ))}
                    </FilterSelect>
                    <FilterSelect label="Status" active={!!reportStatus} value={reportStatus} onChange={(e) => setReportStatus(e.target.value)}>
                      <option value="">All Statuses</option>
                      {Object.entries(STATUS_STYLE).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </FilterSelect>
                    <FilterSelect label="Billable" active={!!reportBillable} value={reportBillable} onChange={(e) => setReportBillable(e.target.value)}>
                      <option value="">All</option>
                      <option value="true">Billable only</option>
                      <option value="false">Non-billable only</option>
                    </FilterSelect>
                  </div>
                </div>
              </Card>

              {/* ─── Summary (same data as the cards + exports) ─── */}
              {reportRows.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
                  <StatCard label="Employees" value={reportEmployees.length} color="text-[#730042]" sub={reportPeriodLabel} icon="users" />
                  <StatCard label="Required" value={fmtHrs(reportEmployees.reduce((s, e) => s + e.required, 0))} color="text-slate-700" icon="timesheets" />
                  <StatCard label="Served" value={fmtHrs(reportEmployees.reduce((s, e) => s + e.serving, 0))} color="text-emerald-600" icon="check" />
                  <StatCard label="Overtime" value={fmtHrs(reportEmployees.reduce((s, e) => s + e.overtime, 0))} color="text-amber-600" icon="zap" />
                </div>
              )}

              {/* ─── Employee cards ─── */}
              {reportRows.length === 0 ? (
                <Card>
                  <EmptyState
                    icon="report"
                    title="No entries found"
                    sub={reportView === "monthly"
                      ? "Adjust the month or filters to view the report"
                      : reportView === "detailed"
                        ? "No timesheet entries in this date range — adjust the range or filters"
                        : "Adjust the week or filters to view the report"}
                  />
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {reportEmployees.map((emp) => (
                    <ReportEmployeeCard
                      key={emp.key}
                      emp={emp}
                      view={reportView}
                      onOpen={() => setSelectedReportEmp(emp.key)}
                      onExport={exportEmployeeTimesheetCSV}
                      exporting={exportingKey === emp.key}
                      exportDisabled={exportBlocked || (!!exportingKey && exportingKey !== emp.key)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ReportDetailModal
        emp={activeReportEmp}
        open={!!activeReportEmp}
        onClose={() => setSelectedReportEmp(null)}
        periodLabel={reportPeriodLabel}
        onExport={exportEmployeeTimesheetCSV}
        exporting={!!activeReportEmp && exportingKey === activeReportEmp.key}
        exportDisabled={exportBlocked || (!!exportingKey && exportingKey !== activeReportEmp?.key)}
      />

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
            <p className="text-[11px] text-gray-500 mt-1.5">Time logged beyond this per day is counted as overtime. Leave blank to use the employee's shift hours instead.</p>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer min-h-[24px]">
            <input type="checkbox" checked={jobForm.billable} onChange={(e) => setJobForm((p) => ({ ...p, billable: e.target.checked }))} className="w-4 h-4 accent-[#730042] shrink-0" />
            <span className="text-[13px] text-gray-600">Billable job</span>
          </label>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
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
            <p className="text-[11px] text-gray-500 mt-1.5">Time logged beyond this per day is counted as overtime. Leave blank to use the employee's shift hours instead.</p>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer min-h-[24px]">
            <input type="checkbox" checked={editJobForm.billable} onChange={(e) => setEditJobForm((p) => ({ ...p, billable: e.target.checked }))} className="w-4 h-4 accent-[#730042] shrink-0" />
            <span className="text-[13px] text-gray-600">Billable job</span>
          </label>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Btn variant="ghost" onClick={() => setEditJobModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleUpdateJob} disabled={!editJobForm.title || updateJob.isPending} className="w-full sm:w-auto">
              {updateJob.isPending ? "Saving…" : "Save Changes"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={logModal} onClose={() => setLogModal(false)} title="Log Time">
        <div className="flex flex-col gap-4">
          <OffDayNotice status={logDayStatus} />
          <Sel label="Job" value={logForm.job} onChange={(e) => setLogForm((p) => ({ ...p, job: e.target.value }))}>
            <option value="">Select job…</option>
            {assignedJobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </Sel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date" type="date" value={logForm.log_date} max={todayISTKey()} onChange={(e) => setLogForm((p) => ({ ...p, log_date: e.target.value }))} />
            <Input label="Duration (minutes)" type="number" min="1" placeholder="e.g. 90" value={logForm.duration_minutes} onChange={(e) => setLogForm((p) => ({ ...p, duration_minutes: nonNegative(e.target.value) }))} />
          </div>
          <Input label="Note" placeholder="What did you work on?" value={logForm.note} onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))} />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Btn variant="ghost" onClick={() => setLogModal(false)} className="w-full sm:w-auto">Cancel</Btn>
            <Btn onClick={handleLogTime} disabled={!logForm.job || !logForm.duration_minutes || logTime.isPending || logDayStatus?.isOff} className="w-full sm:w-auto">
              {logTime.isPending ? "Logging…" : "Save Entry"}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, ts: null })} title="Reject Timesheet">
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-gray-600 m-0">Provide a reason for rejection.</p>
          <Input label="Reason *" placeholder="Enter reason…" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
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

      <SheetDetailModal person={selectedSheetPerson} onClose={() => setSelectedSheetKey(null)} />

      <JobDetailModal jobId={selectedJobId} open={jobDetailOpen} onClose={() => setJobDetailOpen(false)} />

      {/* Scoped styles only: internal scrollbars for wide content + hidden-scrollbar helper. */}
      <style>{`
        .ts-root { overflow-wrap: break-word; }
        .ts-root table, .ts-root img { max-width: 100%; }
        .ts-scroll { scrollbar-width: thin; scrollbar-color: #d1b3c4 #f3f4f6; -webkit-overflow-scrolling: touch; }
        .ts-scroll::-webkit-scrollbar { height: 10px; width: 10px; }
        .ts-scroll::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 9999px; }
        .ts-scroll::-webkit-scrollbar-thumb { background: #d1b3c4; border-radius: 9999px; }
        .ts-scroll::-webkit-scrollbar-thumb:hover { background: #730042; }
      `}</style>
    </div>
  );
}