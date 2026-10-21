import { useState, useEffect, useMemo, useRef } from "react";
import { useGetMeSuperAdmin } from "../../auth/server-state/superadmin/auth/suauth.hook";
import {
  useGetAllEmployees,
  useGetAllManagers,
  useGetAllAdmins,
  useGetOrgInfo,
  useGetParticularEmployee,
  useGetParticularManager,
  useGetParticularAdmin,
} from "../../auth/server-state/superadmin/other/suother.hook";
// Shared collapsible tree (put OrgChartTree.jsx in src/components, or fix this path)
import {
  OrgTreeView,
  collectMatches,
  exportOrgChartPng,
} from "../../components/OrgChartTree";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .su-org *, .su-org { font-family: 'Inter', sans-serif; box-sizing: border-box; }

  /* Never let the chart widen the page: extra width scrolls INSIDE the chart block only. */
  .su-org { contain: inline-size; }
  .su-shell { min-height: 0; }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes slideR    { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }

  /* Chart scroll area: native bars hidden, the fixed bar at the bottom of the screen drives horizontal scroll */
  .su-scroll {
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }
  .su-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }

  /* Horizontal bar pinned to the bottom of the screen */
  .su-hbar { scrollbar-width: thin; scrollbar-color: #94a3b8 #e2e8f0; }
  .su-hbar::-webkit-scrollbar { height: 12px; }
  .su-hbar::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 8px; }
  .su-hbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 8px; border: 2px solid #e2e8f0; }
  .su-hbar::-webkit-scrollbar-thumb:hover { background: #64748b; }

  .su-field-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .su-field-val {
    flex: 1 1 auto;
  }
`;

const BRAND = "#730042";
const BRAND_LIGHT = "rgba(115,0,66,0.07)";
const REFRESH_MS = 1000 * 60 * 2;

const TREE_THEME = {
  acc: "#730042",
  ring: "rgba(115,0,66,0.12)",
  line: "#c9d2e0",
  pill: "#730042",
  head: "'Inter',sans-serif",
  mono: "'JetBrains Mono',monospace",
};

const NODE_COLOR = {
  sa: "#0f172a",
  admin: "#334155",
  manager: "#475569",
  employee: "#64748b",
};

const DEPT_FULL_FORMS = {
  OPR: "Operations",
  BPO: "Business Process Outsourcing",
  ENG: "Engineering",
  HR: "Human Resources",
  MGMT: "Management",
};

const getDepartmentName = (dept) => DEPT_FULL_FORMS[dept] || dept || "—";

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Date of birth for display. Formatted on the IST calendar (same clock the
// birthday reminders use) so it shows the intended day whether it was saved as
// UTC-midnight or IST-midnight. Returns null when there is no (valid) DOB so the
// caller can leave the row out entirely instead of showing "—".
const fmtDob = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
};

const getInitials = (f = "", l = "") =>
  `${f[0] || ""}${l[0] || ""}`.toUpperCase();
const normalize = (s = "") => s.toLowerCase().trim();
const fullName = (p) => `${p?.f_name || ""} ${p?.l_name || ""}`.trim();

function idStr(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v._id ? v._id.toString() : v.toString();
}

function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Avatar({
  initials,
  sizeClass = "w-11 h-11 sm:w-12 sm:h-12",
  textClass = "text-sm sm:text-base",
  bg = BRAND,
  image,
}) {
  const [errored, setErrored] = useState(false);
  if (image && !errored) {
    return (
      <img
        src={image}
        alt={initials}
        className={`rounded-full object-cover shrink-0 ${sizeClass}`}
        style={{ boxShadow: `0 2px 8px ${bg}40` }}
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white shrink-0 ${sizeClass} ${textClass}`}
      style={{
        background: bg,
        boxShadow: `0 2px 8px ${bg}40`,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}

function Badge({ children, color = BRAND, bg = BRAND_LIGHT }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
      style={{ color, background: bg, letterSpacing: "0.02em" }}
    >
      {children}
    </span>
  );
}

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      Live
    </span>
  );
}

const PRIMARY_ORDER = ["EL", "SL", "ML", "PL"];

const LEAVE_META = {
  EL: { label: "Earned Leave", color: "#730042" },
  SL: { label: "Sick Leave", color: "#2563eb" },
  ML: { label: "Maternity Leave", color: "#78716c" },
  PL: { label: "Paternity Leave", color: "#16a34a" },
  pbc: { label: "PBC (Paid Leave)" },
  lwp: { label: "LWP (Leave Without Pay)" },
};

const LEAVE_BALANCE_HIDDEN_KEYS = new Set([
  "_id",
  "__v",
  "employee",
  "organisation_id",
  "createdAt",
  "updatedAt",
  "mlStartDate",
  "mlEndDate",
  "lastAccrualDate",
]);

function humanizeKey(key) {
  if (LEAVE_META[key]?.label) return LEAVE_META[key].label;
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function fmtLeaveDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeBucket(val) {
  if (val && typeof val === "object") {
    return {
      entitled: Number(val.entitled ?? 0),
      availed: Number(val.availed ?? 0),
      accrued: val.accrued != null ? Number(val.accrued) : null,
      yearlyEntitled:
        val.yearlyEntitled != null ? Number(val.yearlyEntitled) : null,
    };
  }
  return {
    entitled: Number(val ?? 0),
    availed: 0,
    accrued: null,
    yearlyEntitled: null,
  };
}

function QuotaCard({ typeKey, rawValue }) {
  const meta = LEAVE_META[typeKey] || {
    label: humanizeKey(typeKey),
    color: "#730042",
  };
  const { entitled, availed, accrued } = normalizeBucket(rawValue);
  const remaining = entitled - availed;
  const pct =
    entitled > 0 ? Math.min(100, Math.max(0, (availed / entitled) * 100)) : 0;
  const isEmpty = entitled === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm font-semibold text-slate-900 truncate">
          {meta.label}
        </span>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
          style={{
            color: isEmpty ? "#9ca3af" : meta.color,
            background: isEmpty ? "#f3f4f6" : `${meta.color}18`,
          }}
        >
          {remaining} left
        </span>
      </div>

      <div className="w-full h-[5px] rounded-full bg-gray-100 overflow-hidden mb-3">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: isEmpty ? "#e5e7eb" : meta.color,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs sm:text-[13px] text-gray-500">
        <span>
          Entitled: <b className="text-slate-800 font-semibold">{entitled}</b>
        </span>
        <span>
          Availed: <b className="text-slate-800 font-semibold">{availed}</b>
        </span>
      </div>
      {accrued != null && (
        <div className="text-xs sm:text-[13px] text-gray-500 mt-1.5">
          Accrued: <b className="text-slate-800 font-semibold">{accrued}</b>
        </div>
      )}
    </div>
  );
}

function CounterTile({ typeKey, rawValue }) {
  const meta = LEAVE_META[typeKey];
  const value =
    rawValue && typeof rawValue === "object"
      ? (rawValue.entitled ?? 0)
      : rawValue;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 min-w-0">
      <div className="text-xs text-gray-400 mb-2 truncate">
        {meta?.label || humanizeKey(typeKey)}
      </div>
      <div
        className="text-xl sm:text-2xl font-bold text-slate-900"
        style={{ fontFamily: "'JetBrains Mono',monospace" }}
      >
        {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
      </div>
    </div>
  );
}

function LeaveBalanceTab({ leaveBalance, isLoading, showHeader = true }) {
  if (isLoading)
    return (
      <div className="flex justify-center pt-9">
        <div className="w-6 h-6 rounded-full border-2 border-[#730042]/30 border-t-[#730042] animate-spin" />
      </div>
    );

  if (!leaveBalance)
    return (
      <div className="text-xs sm:text-sm text-gray-400 text-center pt-9">
        No leave balance record found.
      </div>
    );

  const allKeys = Object.keys(leaveBalance).filter(
    (k) => !LEAVE_BALANCE_HIDDEN_KEYS.has(k),
  );
  const primaryKeys = PRIMARY_ORDER.filter((k) => allKeys.includes(k));
  const secondaryKeys = allKeys.filter(
    (k) =>
      !PRIMARY_ORDER.includes(k) &&
      (typeof leaveBalance[k] !== "object" || leaveBalance[k] === null),
  );

  if (!primaryKeys.length && !secondaryKeys.length)
    return (
      <div className="text-xs sm:text-sm text-gray-400 text-center pt-9">
        No leave balance fields to show.
      </div>
    );

  return (
    <div className="bg-[#fafbfc] rounded-2xl border border-gray-100 p-4 sm:p-6 min-w-0">
      {showHeader && (
        <div className="mb-4 sm:mb-5">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            Leave Balance
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            Your current leave entitlements
          </p>
        </div>
      )}

      {primaryKeys.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {primaryKeys.map((key) => (
            <QuotaCard key={key} typeKey={key} rawValue={leaveBalance[key]} />
          ))}
        </div>
      )}

      {secondaryKeys.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
          {secondaryKeys.map((key) => (
            <CounterTile key={key} typeKey={key} rawValue={leaveBalance[key]} />
          ))}
        </div>
      )}

      {leaveBalance.lastAccrualDate && (
        <div className="text-[11px] text-gray-400 text-right mt-3">
          Last accrual: {fmtLeaveDate(leaveBalance.lastAccrualDate)}
        </div>
      )}
    </div>
  );
}

function EmployeeDetailPanel({ person, type, onClose }) {
  const [tab, setTab] = useState("info");
  const isManager = type === "manager";
  const isAdmin = type === "admin";
  const isSA = type === "superadmin";

  const name = fullName(person);

  const accentColor = isSA
    ? NODE_COLOR.sa
    : isAdmin
      ? NODE_COLOR.admin
      : isManager
        ? NODE_COLOR.manager
        : NODE_COLOR.employee;
  const roleLabel = isSA
    ? "Super Admin"
    : isAdmin
      ? "Admin"
      : isManager
        ? "Manager"
        : "Employee";

  const detailFetchFn = isAdmin
    ? useGetParticularAdmin
    : isManager
      ? useGetParticularManager
      : !isSA
        ? useGetParticularEmployee
        : null;

  const { data: detailData, isLoading: detailLoading } = detailFetchFn
    ? detailFetchFn(person._id)
    : { data: null, isLoading: false };

  const leaveBalance = detailData?.leaveBalance || null;

  const baseFields = useMemo(() => {
    if (isSA) {
      const activeLicense = person.licenses?.find(
        (l) => l.isActive && new Date(l.expiresAt) > new Date(),
      );
      const isTrial =
        person.is_trial_active &&
        new Date() < new Date(person.trial_expires_at);

      const currentPlanLabel = isTrial
        ? "Trial"
        : activeLicense?.plan || person.plan || "—";

      const currentPlanExpiry = isTrial
        ? fmtDate(person.trial_expires_at)
        : activeLicense
          ? fmtDate(activeLicense.expiresAt)
          : fmtDate(person.plan_expires_at);

      return [
        ["Email", person.email],
        // ["Phone",        person.phone || "—"],
        ["Organisation", person.organisation_name],
        ["Domain", person.company_domain || "—"],
        // ["Address",      person.company_address || "—"],
        // ["Industry",     person.industry || "—"],
        ["Plan", currentPlanLabel],
        ["Plan expires", currentPlanExpiry],
        ["Status", person.status],
        // ["Last login",   fmtDate(person.last_login)],
        ["Member since", fmtDate(person.createdAt)],
      ];
    }
    if (isAdmin)
      return [
        ["Emp ID", person.empid || "—"],
        ["Email", person.work_email],
        ["Phone", person.personal_contact || "—"],
        ["Gender", person.gender || "—"],
        ["Marital", person.marital_status || "—"],
        ["Designation", person.designation || "—"],
        ["Status", person.status || "—"],
      ];
    if (isManager)
      return [
        ["Emp ID", person.empid || "—"],
        ["Email", person.work_email],
        ["Phone", person.personal_contact || "—"],
        ["Gender", person.gender || "—"],
        ["Marital", person.marital_status || "—"],
        ["Department", getDepartmentName(person.department)],
        ["Designation", person.designation || "—"],
        ["Location", person.office_location || "—"],
        [
          "DOJ",
          fmtDate(
            detailData?.manager?.date_of_joining ??
              detailData?.manager?.createdAt ??
              person.date_of_joining ??
              person.createdAt,
          ),
        ],
      ];
    return [
      ["Emp ID", person.empid || "—"],
      ["Email", person.work_email],
      ["Phone", person.personal_contact || "—"],
      ["Gender", person.gender || "—"],
      ["Marital", person.marital_status || "—"],
      ["Department", getDepartmentName(person.department)],
      ["Designation", person.designation || "—"],
      ["Location", person.office_location || "—"],
      [
        "DOJ",
        fmtDate(
          detailData?.user?.date_of_joining ??
            detailData?.user?.createdAt ??
            person.date_of_joining ??
            person.createdAt,
        ),
      ],
    ];
  }, [person, detailData, isSA, isAdmin, isManager]);

  // Date of birth: shown only if the person has filled it in. Admin/manager
  // lists already carry it; employees get it from the particular-user call.
  const dobIso = isSA
    ? null
    : isAdmin
      ? detailData?.admin?.date_of_birth ?? person.date_of_birth
      : isManager
        ? detailData?.manager?.date_of_birth ?? person.date_of_birth
        : detailData?.user?.date_of_birth ?? person.date_of_birth;
  const dobLabel = fmtDob(dobIso);

  const fields = useMemo(() => {
    if (!dobLabel) return baseFields; // no DOB on file -> no DOB row at all
    const row = ["Date of birth", dobLabel];
    const at = baseFields.findIndex(([label]) => label === "Marital");
    if (at === -1) return [...baseFields, row];
    return [...baseFields.slice(0, at + 1), row, ...baseFields.slice(at + 1)];
  }, [baseFields, dobLabel]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease_forwards]"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 bottom-0 w-full sm:max-w-md md:max-w-lg h-full bg-white shadow-2xl z-50 overflow-y-auto flex flex-col animate-[slideR_0.25s_cubic-bezier(0.22,1,0.36,1)_forwards]">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between z-10 min-w-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              Profile details
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {roleLabel} · {name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-gray-200 text-gray-500 text-xl hover:bg-gray-50 transition-colors shrink-0"
          >
            ×
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 min-w-0">
          <div
            className="rounded-xl p-4 sm:p-6 mb-5 flex flex-col items-center gap-2.5 border min-w-0"
            style={{
              background: `linear-gradient(135deg, ${accentColor}0d, ${accentColor}05)`,
              borderColor: `${accentColor}20`,
            }}
          >
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold text-white shrink-0"
              style={{ background: accentColor, boxShadow: `0 4px 16px ${accentColor}35` }}
            >
              {getInitials(person.f_name, person.l_name)}
            </div>
            <div className="text-center min-w-0 w-full">
              <div className="text-base font-bold text-slate-900 break-words">
                {name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 break-all">
                {person.work_email || person.email}
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-center mt-1">
              <Badge color={accentColor} bg={`${accentColor}15`}>
                {roleLabel}
              </Badge>
              {(person.department || person.designation) && (
                <Badge color="#374151" bg="#f3f4f6">
                  {person.department
                    ? getDepartmentName(person.department)
                    : person.designation}
                </Badge>
              )}
            </div>
          </div>

          {!isSA && (
            <div className="flex gap-2 mb-5 flex-wrap min-w-0">
              {["info", "leave", "reviews"].map((t) => (
                <button
                  key={t}
                  className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all min-h-[40px] flex items-center shrink-0 ${tab === t ? "bg-[#730042] text-white border-[#730042] shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                  onClick={() => setTab(t)}
                >
                  {t === "info"
                    ? "Information"
                    : t === "leave"
                      ? "Leave Balance"
                      : "Reviews"}
                </button>
              ))}
            </div>
          )}

          {(tab === "info" || isSA) && (
            <div className="bg-[#fafbfc] rounded-xl p-4 sm:px-5 border border-gray-100 flex flex-col min-w-0">
              {fields.map(([label, val]) => (
                <div
                  key={label}
                  className="su-field-row py-2.5 border-b border-gray-100 last:border-b-0 text-xs sm:text-sm min-w-0"
                >
                  <span className="text-gray-500 shrink-0">{label}</span>
                  <span
                    className="su-field-val text-slate-900 font-medium text-right break-all min-w-0"
                    style={{ maxWidth: "65%" }}
                  >
                    {val || "—"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === "leave" && !isSA && (
            <LeaveBalanceTab
              leaveBalance={leaveBalance}
              isLoading={detailLoading}
              showHeader={false}
            />
          )}

          {tab === "reviews" && !isSA && (
            <ReviewsTab uid={person._id} role={type} />
          )}
        </div>
      </div>
    </>
  );
}

function ReviewsTab({ uid, role }) {
  const fetchFn =
    role === "manager"
      ? useGetParticularManager
      : role === "admin"
        ? useGetParticularAdmin
        : useGetParticularEmployee;
  const { data, isLoading } = fetchFn(uid);
  const reviews = data?.reviews || [];

  if (isLoading)
    return (
      <div className="flex justify-center pt-9">
        <div className="w-6 h-6 rounded-full border-2 border-[#730042]/30 border-t-[#730042] animate-spin" />
      </div>
    );

  if (!reviews.length)
    return (
      <div className="text-xs sm:text-sm text-gray-400 text-center pt-9">
        No reviews yet.
      </div>
    );

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {reviews.map((r) => (
        <div
          key={r._id}
          className="bg-[#fafbfc] rounded-xl border border-gray-100 p-3 sm:p-4 min-w-0"
        >
          <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar
                initials={getInitials(r.reviewer?.f_name, r.reviewer?.l_name)}
                image={r.reviewer?.profile_image}
                sizeClass="w-7 h-7"
                textClass="text-[9px]"
              />
              <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate min-w-0">
                {r.reviewer?.f_name} {r.reviewer?.l_name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                {r.overallScore != null ? r.overallScore.toFixed(1) : "–"}/5
              </span>
              {r.overallRating && (
                <span className="text-[11px] text-gray-400">
                  · {r.overallRating}
                </span>
              )}
            </div>
          </div>
          {(r.taskSubmission || r.behaviourEthics || r.attendance) && (
            <div className="flex flex-wrap gap-2 mb-1.5 text-[11px] text-gray-500">
              {r.taskSubmission && (
                <span>
                  Task: {r.taskSubmission.percentage}% (
                  {r.taskSubmission.rating})
                </span>
              )}
              {r.behaviourEthics && (
                <span>Behaviour: {r.behaviourEthics.score}/5</span>
              )}
              {r.attendance && (
                <span>Attendance: {r.attendance.percentage}%</span>
              )}
            </div>
          )}
          <p className="text-xs sm:text-sm text-gray-600 m-0 leading-relaxed break-words">
            {r.comment}
          </p>
          <div className="text-[11px] text-gray-400 mt-1.5">{r.monthYear}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build the tree (same relations as before, nothing in the data is changed):
// Super Admin -> admins -> (co-admins / managers) -> (sub-managers / employees)
// ---------------------------------------------------------------------------
function buildOrgTree({ superAdmin, admins, managers, employees, open }) {
  const seen = new Set(); // guards against a bad reporting loop in the data

  const empNode = (e) => ({
    key: `e-${idStr(e._id)}`,
    kind: "emp",
    name: fullName(e),
    initials: getInitials(e.f_name, e.l_name),
    lines: [e.department ? getDepartmentName(e.department) : "—", e.designation || "—"],
    empid: e.empid || "—",
    image: e.profile_image,
    hay: [e.department, e.designation],
    onClick: () => open(e, "employee"),
    children: [],
  });

  const mgrNode = (m) => {
    const id = idStr(m._id);
    const key = `m-${id}`;
    if (seen.has(key)) return null;
    seen.add(key);
    const subs = managers
      .filter(
        (x) =>
          idStr(x.reporting_manager) === id &&
          x.reporting_manager_model === "Manager",
      )
      .map(mgrNode)
      .filter(Boolean);
    const emps = employees
      .filter((e) => idStr(e.Under_manager) === id)
      .map(empNode);
    return {
      key,
      kind: "mgr",
      name: fullName(m),
      initials: getInitials(m.f_name, m.l_name),
      lines: [m.department ? getDepartmentName(m.department) : "—", m.designation || "—"],
      empid: m.empid || "—",
      image: m.profile_image,
      hay: [m.department, m.designation],
      onClick: () => open(m, "manager"),
      children: [...subs, ...emps],
    };
  };

  const adminNode = (a) => {
    const id = idStr(a._id);
    const key = `a-${id}`;
    if (seen.has(key)) return null;
    seen.add(key);

    const coAdmins = admins.filter(
      (x) =>
        idStr(x.reporting_manager) === id &&
        x.reporting_manager_model === "Admin",
    );
    const coAdminParent =
      a.reporting_manager_model === "Admin"
        ? admins.find((x) => idStr(x._id) === idStr(a.reporting_manager))
        : null;
    const parentCoAdmins = coAdminParent
      ? admins.filter(
          (x) =>
            idStr(x.reporting_manager) === idStr(coAdminParent._id) &&
            x.reporting_manager_model === "Admin",
        )
      : [];
    const isOnlyCoAdminForParent =
      parentCoAdmins.length === 1 && idStr(parentCoAdmins[0]._id) === id;
    const managerAdminId = isOnlyCoAdminForParent
      ? idStr(coAdminParent._id)
      : id;
    const admManagers = managers.filter(
      (m) =>
        idStr(m.reporting_manager) === managerAdminId &&
        m.reporting_manager_model === "Admin",
    );
    const showManagersHere = coAdmins.length === 0 || coAdmins.length > 1;

    return {
      key,
      kind: "admin",
      name: fullName(a),
      initials: getInitials(a.f_name, a.l_name),
      lines: [getDepartmentName(a.department), a.designation || "—"],
      empid: a.empid || "—",
      image: a.profile_image,
      hay: [a.department, a.designation],
      onClick: () => open(a, "admin"),
      children: [
        ...coAdmins.map(adminNode).filter(Boolean),
        ...(showManagersHere ? admManagers.map(mgrNode).filter(Boolean) : []),
      ],
    };
  };

  const rootAdmins = admins.filter(
    (admin) =>
      admin.reporting_manager_model !== "Admin" ||
      !admins.some(
        (parent) => idStr(parent._id) === idStr(admin.reporting_manager),
      ),
  );

  return {
    key: "sa",
    kind: "sa",
    isYou: true,
    name: fullName(superAdmin) || "Super Admin",
    initials: getInitials(superAdmin?.f_name, superAdmin?.l_name),
    lines: [superAdmin?.organisation_name || "Super Admin"],
    image: superAdmin?.profile_image,
    hay: [],
    onClick: () => open(superAdmin, "superadmin"),
    children: rootAdmins.map(adminNode).filter(Boolean),
  };
}

function OrgTree({
  root,
  loading,
  q,
  matches,
  admins,
  managers,
  employees,
  onNodeClick,
}) {
  return (
    <>
      <OrgTreeView
        root={root}
        loading={loading}
        q={q}
        matches={matches}
        theme={TREE_THEME}
      />

      {!loading && root && root.children.length === 0 && (
        <div data-export-ignore className="mt-9 mx-auto w-fit px-6 py-4 rounded-xl border-[1.5px] border-dashed border-gray-200 text-xs sm:text-sm text-gray-300 bg-[#fafbfc] min-w-0">
          No admins created yet
        </div>
      )}

      <OrphanNotice
        admins={admins}
        managers={managers}
        employees={employees}
        onNodeClick={onNodeClick}
      />
    </>
  );
}

function OrphanNotice({ admins, managers, employees, onNodeClick }) {
  const adminIdSet = new Set(admins.map((a) => idStr(a._id)));
  const managerIdSet = new Set(managers.map((m) => idStr(m._id)));

  const orphanManagers = managers.filter((m) => {
    if (m.reporting_manager_model === "Admin")
      return !adminIdSet.has(idStr(m.reporting_manager));
    if (m.reporting_manager_model === "Manager")
      return !managerIdSet.has(idStr(m.reporting_manager));
    return true;
  });

  const orphanEmployees = employees.filter(
    (e) => !managerIdSet.has(idStr(e.Under_manager)),
  );

  const total = orphanManagers.length + orphanEmployees.length;
  if (total === 0) return null;

  return (
    <div data-export-ignore className="mt-9 w-full max-w-xl px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-[1.5px] border-dashed border-amber-300 bg-amber-50 min-w-0">
      <p className="text-xs sm:text-sm font-semibold text-amber-800">
        {total} unassigned {total === 1 ? "record" : "records"} not shown in the
        chart above
      </p>
      <p className="text-[11px] sm:text-xs text-amber-700 mt-1">
        {orphanManagers.length > 0 &&
          `${orphanManagers.length} manager${orphanManagers.length !== 1 ? "s" : ""}`}
        {orphanManagers.length > 0 && orphanEmployees.length > 0 && " and "}
        {orphanEmployees.length > 0 &&
          `${orphanEmployees.length} employee${orphanEmployees.length !== 1 ? "s" : ""}`}{" "}
        reference a manager/admin that no longer exists or was never set. Click
        a name to open and reassign.
      </p>
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {orphanManagers.map((m) => (
          <button
            key={m._id}
            onClick={() => onNodeClick(m, "manager")}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-amber-300 text-amber-800 font-medium hover:bg-amber-100 transition-colors"
          >
            {fullName(m)} · Manager
          </button>
        ))}
        {orphanEmployees.map((e) => (
          <button
            key={e._id}
            onClick={() => onNodeClick(e, "employee")}
            className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-amber-300 text-amber-800 font-medium hover:bg-amber-100 transition-colors"
          >
            {fullName(e)} · Employee
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminOrgChart() {
  const refetchOpts = {
    staleTime: 1000 * 60 * 5,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
  };

  const { data: saData, isLoading: loadingSA } = useGetMeSuperAdmin();
  const { data: admData, isLoading: loadingAdm } = useGetAllAdmins(refetchOpts);
  const { data: mgrData, isLoading: loadingMgr } =
    useGetAllManagers(refetchOpts);
  const { data: empData, isLoading: loadingEmp } =
    useGetAllEmployees(refetchOpts);
  const { data: orgData } = useGetOrgInfo();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const inputRef = useRef(null);

  // treeRef = the horizontally scrolling viewport, exportRef = the full-width chart content inside it
  const treeRef = useRef(null);
  const exportRef = useRef(null);
  const barRef = useRef(null);
  const [bar, setBar] = useState({ sw: 0, show: false });
  const [pos, setPos] = useState({ left: 0, width: 0, top: 0, visible: false });

  const superAdmin = saData?.superAdmin || saData;
  const admins = useMemo(() => admData?.admins || [], [admData]);
  const managers = useMemo(() => {
    const raw = mgrData?.managers || mgrData || [];
    return Array.isArray(raw) ? raw : [];
  }, [mgrData]);
  const employees = useMemo(() => {
    const raw = empData?.users || empData || [];
    const list = Array.isArray(raw) ? raw : [];
    return list.some((p) => p?.type)
      ? list.filter((p) => p.type === "employee")
      : list;
  }, [empData]);

  const orgName =
    orgData?.organisation_name ||
    superAdmin?.organisation_name ||
    "Organisation";
  const loading = loadingSA || loadingAdm || loadingMgr || loadingEmp;
  const totalNodes = 1 + admins.length + managers.length + employees.length;

  const handleNodeClick = (person, type) => setSelected({ person, type });

  const root = useMemo(
    () =>
      superAdmin
        ? buildOrgTree({
            superAdmin,
            admins,
            managers,
            employees,
            open: (person, type) => setSelected({ person, type }),
          })
        : null,
    [superAdmin, admins, managers, employees],
  );

  const q = normalize(searchQuery);
  const matches = useMemo(() => collectMatches(root, q), [root, q]);
  const matchCount = matches.size;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [searchOpen]);

  // Horizontal bar pinned to the bottom of the SCREEN (fixed), aligned with the chart block.
  // If the chart's own bottom edge is on screen, the bar sits right at that edge instead.
  useEffect(() => {
    const inner = exportRef.current;
    const sc = treeRef.current;
    if (!inner || !sc) return undefined;
    const BAR_H = 14;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = sc.getBoundingClientRect();
      const vh = window.innerHeight;
      setBar((prev) => {
        const next = {
          sw: inner.scrollWidth,
          show: inner.scrollWidth > sc.clientWidth + 1,
        };
        return prev.sw === next.sw && prev.show === next.show ? prev : next;
      });
      // Bar is always pinned to the bottom edge of the screen; only shown while the chart block is on screen
      const visible = r.bottom > 0 && r.top < vh - BAR_H;
      setPos((prev) =>
        prev.left === r.left &&
        prev.width === r.width &&
        prev.visible === visible
          ? prev
          : { left: r.left, width: r.width, top: 0, visible },
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    ro?.observe(inner);
    ro?.observe(sc);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true); // capture: also catches the layout's own scroll container
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const syncScroll = (from, to) => {
    if (from && to && to.scrollLeft !== from.scrollLeft)
      to.scrollLeft = from.scrollLeft;
  };

  function buildCsvRows() {
    const rows = [
      [
        "Role",
        "Emp ID",
        "Name",
        "Email",
        "Phone",
        "Department",
        "Designation",
        "Office Location",
        "Reports To",
      ],
    ];

    if (superAdmin) {
      rows.push([
        "Super Admin",
        "",
        fullName(superAdmin),
        superAdmin.email || "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }

    admins.forEach((a) => {
      rows.push([
        "Admin",
        a.empid || "",
        fullName(a),
        a.work_email || "",
        a.personal_contact || "",
        a.department ? getDepartmentName(a.department) : "",
        a.designation || "",
        a.office_location || "",
        "Super Admin",
      ]);
    });

    managers.forEach((m) => {
      const parentLabel =
        m.reporting_manager_model === "Admin"
          ? admins.find((a) => idStr(a._id) === idStr(m.reporting_manager))
            ? `Admin: ${fullName(admins.find((a) => idStr(a._id) === idStr(m.reporting_manager)))}`
            : "Unassigned"
          : m.reporting_manager_model === "Manager"
            ? managers.find(
                (mm) => idStr(mm._id) === idStr(m.reporting_manager),
              )
              ? `Manager: ${fullName(managers.find((mm) => idStr(mm._id) === idStr(m.reporting_manager)))}`
              : "Unassigned"
            : "Unassigned";
      rows.push([
        "Manager",
        m.empid || "",
        fullName(m),
        m.work_email || "",
        m.personal_contact || "",
        m.department ? getDepartmentName(m.department) : "",
        m.designation || "",
        m.office_location || "",
        parentLabel,
      ]);
    });

    employees.forEach((e) => {
      const mgr = managers.find((m) => idStr(m._id) === idStr(e.Under_manager));
      rows.push([
        "Employee",
        e.empid || "",
        fullName(e),
        e.work_email || "",
        e.personal_contact || "",
        e.department ? getDepartmentName(e.department) : "",
        e.designation || "",
        e.office_location || "",
        mgr ? `Manager: ${fullName(mgr)}` : "Unassigned",
      ]);
    });

    return rows;
  }

  function exportCsv() {
    const rows = buildCsvRows();
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(
      blob,
      `${normalize(orgName).replace(/\s+/g, "-") || "organisation"}-org-chart-${Date.now()}.csv`,
    );
  }

  async function exportPng() {
    if (exporting) return;
    setExporting(true);
    try {
      // exports exactly what is expanded on screen, with full details
      await exportOrgChartPng({
        target: exportRef.current,
        scroller: treeRef.current,
        filename: `${normalize(orgName).replace(/\s+/g, "-") || "organisation"}-org-chart-${Date.now()}.png`,
      });
      setExportDone(true);
      setTimeout(() => setExportDone(false), 2600);
    } catch (err) {
      window.alert("Could not generate the image export. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const statItems = [
    { label: "Admins", value: admins.length, color: "#334155" },
    { label: "Managers", value: managers.length, color: "#475569" },
    { label: "Employees", value: employees.length, color: "#64748b" },
    { label: "Total", value: totalNodes, color: "#0f172a" },
  ];

  return (
    <div className="su-org su-shell w-full max-w-full min-w-0 bg-[#f4f7fb] flex flex-col">
      <style>{STYLES}</style>

      <header className="w-full max-w-full min-w-0 bg-white border-b border-gray-200 shadow-sm overflow-hidden">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 h-14 sm:h-16 flex items-center justify-between gap-4 min-w-0">
          <div
            className={`flex items-center gap-2 sm:gap-3 min-w-0 flex-1 ${searchOpen ? "hidden sm:flex" : "flex"}`}
          >
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#730042] shrink-0 shadow-[0_0_0_3px_rgba(115,0,66,0.15)]"></div>
            <span className="hidden md:inline text-sm text-gray-400 font-medium truncate min-w-0">
              {orgName}
            </span>
            <svg
              className="hidden md:block w-3 h-3 shrink-0"
              viewBox="0 0 13 13"
              fill="none"
            >
              <path
                d="M5 3l3 3.5L5 10"
                stroke="#d1d5db"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight truncate min-w-0">
              Org Chart
            </h1>
            <span className="hidden xs:inline-block px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10.5px] font-bold text-[#730042] bg-[#730042]/10 rounded-full shrink-0">
              Super Admin
            </span>
            {!loading && (
              <div className="hidden sm:block shrink-0">
                <LiveDot />
              </div>
            )}
          </div>

          <div
            className={`flex items-center gap-2 min-w-0 ${searchOpen ? "w-full sm:w-auto sm:flex-none sm:ml-auto" : "flex-none ml-auto"}`}
          >
            {searchOpen ? (
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto min-w-0">
                <div className="flex items-center gap-2 border-[1.5px] border-[#730042] rounded-lg px-3 h-10 sm:h-9 flex-1 sm:w-72 shadow-[0_0_0_4px_rgba(115,0,66,0.08)] min-w-0">
                  <svg
                    className="w-3 h-3 shrink-0"
                    viewBox="0 0 13 13"
                    fill="none"
                  >
                    <circle
                      cx="5.5"
                      cy="5.5"
                      r="4"
                      stroke="#9ca3af"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M9 9l2.5 2.5"
                      stroke="#9ca3af"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    ref={inputRef}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-gray-400"
                    placeholder="Name, role, department…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="flex items-center justify-center h-full px-2 -mr-2 text-gray-400 shrink-0"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 13 13" fill="none">
                        <path
                          d="M2 2l9 9M11 2l-9 9"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <span className="hidden sm:inline-block text-xs font-semibold text-[#730042] bg-[#730042]/10 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
                    {matchCount} match{matchCount !== 1 ? "es" : ""}
                  </span>
                )}
                <button
                  className="flex items-center justify-center gap-1.5 px-3 sm:px-4 h-10 sm:h-9 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 shrink-0 min-w-[40px] sm:min-w-[44px]"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 13 13" fill="none">
                    <path
                      d="M2 2l9 9M11 2l-9 9"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  className="flex items-center gap-1.5 px-3 sm:px-4 h-10 sm:h-9 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 shrink-0 min-w-[44px]"
                  onClick={() => setSearchOpen(true)}
                >
                  <svg className="w-3 h-3" viewBox="0 0 13 13" fill="none">
                    <circle
                      cx="5.5"
                      cy="5.5"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M9 9l2.5 2.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>Search</span>
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 sm:px-4 h-10 sm:h-9 rounded-lg border border-black bg-black/10 text-black text-xs font-medium transition-all duration-300 hover:bg-black hover:text-white hover:border-black shrink-0 min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={exportPng}
                  disabled={loading || exporting}
                >
                  {exporting ? (
                    <>
                      <svg
                        className="w-3.5 h-3.5 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3"
                          opacity="0.25"
                        />
                        <path
                          d="M12 2a10 10 0 0 1 10 10"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="hidden sm:inline">Exporting…</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M8 2v8m0 0L5 7m3 3l3-3M3 12.5h10"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="hidden sm:inline">Export PNG</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-6 lg:py-8 min-w-0 flex-1">
        <div className="mb-5 sm:mb-6 lg:mb-8 min-w-0">
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight truncate">
            Organisation Chart
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
            {loading
              ? "Loading…"
              : `${orgName} · ${totalNodes} nodes · auto-refreshes every 2 min`}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 xl:gap-8 mb-5 sm:mb-6 lg:mb-8 min-w-0 max-w-full">
          {statItems.map(({ label, value, color }, i) => (
            <div
              key={label}
              className="relative bg-white border border-gray-200 rounded-xl lg:rounded-2xl p-2.5 sm:p-4 lg:p-5 flex items-center gap-2 sm:gap-4 lg:gap-4 shadow-sm overflow-hidden hover:shadow-md transition-shadow min-w-0"
              style={{
                animation: `fadeUp 0.35s ease ${100 + i * 55}ms forwards`,
                opacity: 0,
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: color }}
              ></div>
              <div
                className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}12` }}
              >
                <div
                  className="w-3 h-3 sm:w-5 sm:h-5 rounded-full"
                  style={{
                    background: color,
                    boxShadow: `0 2px 6px ${color}40`,
                  }}
                />
              </div>
              <div className="min-w-0">
                <div
                  className="text-sm sm:text-xl lg:text-2xl font-bold text-slate-900 leading-none truncate"
                  style={{ fontFamily: "'JetBrains Mono',monospace" }}
                >
                  {loading ? "—" : value}
                </div>
                <div className="text-[9px] sm:text-xs text-gray-400 mt-1 font-medium truncate">
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full max-w-full min-w-0 bg-white border border-gray-200 rounded-xl lg:rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="w-full min-w-0 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100/50">
            <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">
              Hierarchy
            </span>
            <span
              className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold shrink-0"
              style={{ fontFamily: "'JetBrains Mono',monospace" }}
            >
              {loading ? "…" : `${totalNodes} nodes`}
            </span>
            {searchQuery && matchCount > 0 && (
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-[#730042]/10 text-[#730042] font-semibold shrink-0">
                {matchCount} highlighted
              </span>
            )}
            <span className="hidden sm:block ml-auto text-xs text-gray-400 truncate">
              Click + / − to expand · click any card for details
            </span>
          </div>

          {/* Scroll viewport: width is capped to the page, extra width scrolls INSIDE this block (horizontal only) */}
          <div
            ref={treeRef}
            onScroll={() => syncScroll(treeRef.current, barRef.current)}
            className="su-scroll w-full max-w-full min-w-0 bg-white"
            style={{ overflowX: "auto", overflowY: "hidden" }}
          >
            <div
              ref={exportRef}
              className="bg-white p-3 sm:p-6 lg:p-8"
              style={{ width: "max-content", minWidth: "100%" }}
            >
              <OrgTree
                root={root}
                loading={loading}
                q={q}
                matches={matches}
                admins={admins}
                managers={managers}
                employees={employees}
                onNodeClick={handleNodeClick}
              />
            </div>
          </div>
        </div>

        {!loading && (
          <div className="flex gap-2 sm:gap-4 lg:gap-6 mt-4 lg:mt-6 justify-center flex-wrap min-w-0 max-w-full">
            {[
              { dot: NODE_COLOR.sa, label: "Super Admin", glow: true },
              { dot: NODE_COLOR.admin, label: "Admin" },
              { dot: NODE_COLOR.manager, label: "Manager" },
              {
                dot: NODE_COLOR.employee,
                label: "Employee",
                border: "#b0b8c8",
              },
            ].map(({ dot, label, border, glow }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 shrink-0"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    background: dot,
                    border: border ? `1.5px solid ${border}` : "none",
                    boxShadow: glow ? `0 0 0 3px ${dot}28` : "none",
                  }}
                />
                {label}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Horizontal scrollbar: fixed at the bottom of the screen, never moves while the page scrolls */}
      <div
        ref={barRef}
        className="su-hbar"
        onScroll={() => syncScroll(barRef.current, treeRef.current)}
        style={{
          position: "fixed",
          left: pos.left,
          bottom: 0,
          width: pos.width,
          height: 14,
          zIndex: 30,
          overflowX: "auto",
          overflowY: "hidden",
          display: bar.show && pos.visible ? "block" : "none",
          background: "transparent",
        }}
      >
        <div style={{ width: bar.sw, height: 1 }} />
      </div>

      {selected && (
        <EmployeeDetailPanel
          person={selected.person}
          type={selected.type}
          onClose={() => setSelected(null)}
        />
      )}

      {exportDone && (
        <div
          className="fixed bottom-4 right-4 left-4 sm:left-auto z-[9999] flex items-center justify-center sm:justify-start gap-2 px-4 py-3 rounded-lg bg-slate-900 text-white text-sm font-medium shadow-2xl"
          style={{ animation: "fadeIn 0.2s ease forwards" }}
        >
          <svg
            className="w-4 h-4 text-green-400 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
              clipRule="evenodd"
            />
          </svg>
          PNG exported!
        </div>
      )}
    </div>
  );
}