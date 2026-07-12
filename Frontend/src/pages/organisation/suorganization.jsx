import { useState, useEffect, useMemo, useRef } from "react";
import {
  useGetMeSuperAdmin,
} from "../../auth/server-state/superadmin/auth/suauth.hook";
import {
  useGetAllEmployees,
  useGetAllManagers,
  useGetAllAdmins,
  useGetOrgInfo,
  useGetParticularEmployee,
  useGetParticularManager,
} from "../../auth/server-state/superadmin/other/suother.hook";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .su-org *, .su-org { font-family: 'Inter', sans-serif; box-sizing: border-box; }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn   { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
  @keyframes drawH     { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  @keyframes drawV     { from { transform:scaleY(0); } to { transform:scaleY(1); } }
  @keyframes slideR    { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }
  @keyframes ringPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(115,0,66,0.25), 0 4px 20px rgba(115,0,66,0.1); }
    50%      { box-shadow: 0 0 0 7px rgba(115,0,66,0.06), 0 8px 28px rgba(115,0,66,0.18); }
  }

  .su-card-hover { transition: transform 0.16s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.16s ease, border-color 0.14s ease; cursor: pointer; touch-action: manipulation; }
  .su-card-hover:hover { transform: translateY(-4px) scale(1.015); }
  .su-card-highlight { outline: 2px solid #730042 !important; outline-offset: 3px; box-shadow: 0 0 0 6px rgba(115,0,66,0.1) !important; }
  .su-card-dim { opacity: 0.15; filter: grayscale(0.5) blur(0.3px); transition: opacity 0.22s, filter 0.22s; }
  .su-card-sa  { animation: ringPulse 3s ease-in-out infinite !important; }

  .su-scroll::-webkit-scrollbar { height:5px; width:5px; }
  .su-scroll::-webkit-scrollbar-track { background:transparent; }
  .su-scroll::-webkit-scrollbar-thumb { background:#dde3ec; border-radius:6px; }
  .su-scroll { -webkit-overflow-scrolling: touch; }
`;

const BRAND       = "#730042";
const BRAND_LIGHT = "rgba(115,0,66,0.07)";
const REFRESH_MS  = 1000 * 60 * 2;
const HTML_TO_IMAGE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const getInitials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();
const normalize   = (s = "") => s.toLowerCase().trim();
const fullName    = (p) => `${p?.f_name || ""} ${p?.l_name || ""}`.trim();

function idStr(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v._id ? v._id.toString() : v.toString();
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
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

function Skeleton({ w, h, r = 8 }) {
  return (
    <div
      className="shrink-0 bg-gray-200 animate-pulse"
      style={{ width: w, height: h, borderRadius: r }}
    />
  );
}

function VLine({ h = 32, delay = 0 }) {
  return (
    <div
      className="shrink-0 origin-top mx-auto"
      style={{ width: 1.5, height: h, background: "linear-gradient(to bottom, #dde3ec, #c8d2e0)", animation: `drawV 0.25s ease ${delay}ms forwards`, transform: "scaleY(0)" }}
    />
  );
}

function HLine({ w, delay = 0 }) {
  return (
    <div
      className="shrink-0 origin-center"
      style={{ width: w, height: 1.5, background: "#dde3ec", animation: `drawH 0.3s ease ${delay}ms forwards`, transform: "scaleX(0)" }}
    />
  );
}

function Avatar({ initials, size = 48, bg = BRAND, fontSize = 16 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, background: bg, fontSize, boxShadow: `0 2px 8px ${bg}40`, letterSpacing: "0.02em" }}
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

function SuperAdminNode({ name, role, initials, delay = 0, onClick }) {
  return (
    <div className="opacity-0 shrink-0" style={{ animation: `scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms forwards` }}>
      <div
        className="su-card-hover su-card-sa w-[180px] sm:w-[210px] bg-white border-[1.5px] border-[#e8edf5] rounded-2xl p-3.5 sm:p-5 flex flex-col items-center relative overflow-hidden shadow-sm"
        onClick={onClick}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#730042] to-[#a8005a] rounded-t-2xl" />
        <span className="absolute top-3 right-3 text-[9px] font-bold tracking-widest text-gray-400 uppercase" style={{ fontFamily: "'JetBrains Mono',monospace" }}>SA</span>
        <Avatar initials={initials} size={48} bg={BRAND} fontSize={17} />
        <p className="text-sm sm:text-base font-bold text-slate-900 mt-3 text-center break-words">{name}</p>
        <p className="text-[11px] sm:text-xs text-gray-500 mt-1 text-center break-words">{role}</p>
      </div>
    </div>
  );
}

function AdminNode({ admin, delay = 0, dimmed, highlighted, onClick }) {
  const name = fullName(admin);
  return (
    <div className="opacity-0 shrink-0" style={{ animation: `scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms forwards` }}>
      <div
        className={`su-card-hover w-[150px] sm:w-[174px] bg-white border-[1.5px] border-[#e8edf5] rounded-xl p-3 sm:p-4 flex flex-col items-center relative overflow-hidden shadow-sm ${highlighted ? "su-card-highlight" : ""} ${dimmed ? "su-card-dim" : ""}`}
        onClick={onClick}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-t-xl" />
        <span className="absolute top-2.5 right-3 text-[9px] font-bold text-indigo-300 uppercase" style={{ fontFamily: "'JetBrains Mono',monospace" }}>ADM</span>
        <Avatar initials={getInitials(admin.f_name, admin.l_name)} size={40} bg="#6366f1" fontSize={13} />
        <p className="text-xs sm:text-[13px] font-semibold text-slate-900 mt-2.5 text-center max-w-[120px] sm:max-w-[140px] truncate w-full">{name}</p>
        <p className="text-[10px] sm:text-[11px] text-gray-400 mt-1 text-center max-w-[120px] sm:max-w-[140px] truncate w-full">{admin.designation || "—"}</p>
        <p className="text-[9.5px] sm:text-[10px] text-gray-400 mt-0.5 text-center max-w-[120px] sm:max-w-[140px] truncate w-full" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{admin.empid || "—"}</p>
      </div>
    </div>
  );
}

function ManagerNode({ manager, delay = 0, dimmed, highlighted, onClick }) {
  const name = fullName(manager);
  return (
    <div className="opacity-0 shrink-0" style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards` }}>
      <div
        className={`su-card-hover w-[132px] sm:w-[152px] bg-[#f9fbfe] border-[1.5px] border-[#e4edf6] rounded-lg p-2.5 sm:p-3 flex flex-col items-center relative overflow-hidden shadow-sm ${highlighted ? "su-card-highlight" : ""} ${dimmed ? "su-card-dim" : ""}`}
        onClick={onClick}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-sky-400 rounded-t-lg" />
        <Avatar initials={getInitials(manager.f_name, manager.l_name)} size={34} bg="#0ea5e9" fontSize={12} />
        <p className="text-[11px] sm:text-xs font-semibold text-slate-800 mt-2 text-center max-w-[104px] sm:max-w-[120px] truncate w-full">{name}</p>
        <p className="text-[9.5px] sm:text-[10.5px] text-slate-400 mt-0.5 text-center max-w-[104px] sm:max-w-[120px] truncate w-full">{manager.department || manager.designation || "—"}</p>
        <p className="text-[9px] sm:text-[9.5px] text-slate-400 mt-0.5 text-center max-w-[104px] sm:max-w-[120px] truncate w-full" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{manager.empid || "—"}</p>
      </div>
    </div>
  );
}

function EmployeeNode({ employee, delay = 0, dimmed, highlighted, onClick }) {
  const name = fullName(employee);
  return (
    <div className="opacity-0 shrink-0" style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards` }}>
      <div
        className={`su-card-hover w-[114px] sm:w-[132px] bg-[#fafbfc] border-[1.5px] border-[#e8edf5] rounded-lg p-2 sm:p-2.5 flex flex-col items-center relative ${highlighted ? "su-card-highlight" : ""} ${dimmed ? "su-card-dim" : ""}`}
        onClick={onClick}
      >
        <Avatar initials={getInitials(employee.f_name, employee.l_name)} size={28} bg="#e2e8f0" fontSize={9} />
        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-800 mt-1.5 text-center max-w-[88px] sm:max-w-[100px] truncate w-full">{name}</p>
        <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 text-center max-w-[88px] sm:max-w-[100px] truncate w-full">{employee.department || employee.designation || "—"}</p>
        <p className="text-[8.5px] sm:text-[9.5px] text-slate-400 mt-0.5 text-center max-w-[88px] sm:max-w-[100px] truncate w-full" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{employee.empid || "—"}</p>
      </div>
    </div>
  );
}

function SkeletonTree() {
  return (
    <div className="flex flex-col items-center gap-0 w-full min-w-0">
      <Skeleton w={180} h={120} r={16} />
      <div className="w-1.5 h-7 bg-gray-200 mx-auto" />
      <div className="flex gap-4 sm:gap-5 justify-center w-full min-w-0">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col items-center min-w-0">
            <div className="w-1.5 h-5 bg-gray-200 mx-auto" />
            <Skeleton w={150} h={100} r={13} />
            <div className="w-1.5 h-5 bg-gray-200 mx-auto" />
            <div className="flex gap-2.5 sm:gap-3.5 justify-center w-full min-w-0">
              {[1, 2].map(j => (
                <div key={j} className="flex flex-col items-center min-w-0">
                  <div className="w-1.5 h-4 bg-gray-200 mx-auto" />
                  <Skeleton w={114} h={78} r={10} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeDetailPanel({ person, type, onClose }) {
  const [tab, setTab] = useState("info");
  const isManager  = type === "manager";
  const isAdmin    = type === "admin";
  const isSA       = type === "superadmin";

  const name = fullName(person);

  const accentColor = isSA ? BRAND : isAdmin ? "#6366f1" : isManager ? "#0ea5e9" : "#64748b";
  const roleLabel   = isSA ? "Super Admin" : isAdmin ? "Admin" : isManager ? "Manager" : "Employee";

  const fields = useMemo(() => {
    if (isSA) return [
      ["Email",        person.email],
      ["Phone",        person.phone || "—"],
      ["Organisation", person.organisation_name],
      ["Domain",       person.company_domain || "—"],
      ["Address",      person.company_address || "—"],
      ["Industry",     person.industry || "—"],
      ["Plan",         person.plan || "—"],
      ["Plan expires", fmtDate(person.plan_expires_at)],
      ["Status",       person.status],
      ["Last login",   fmtDate(person.last_login)],
      ["Member since", fmtDate(person.createdAt)],
    ];
    if (isAdmin) return [
      ["Emp ID",      person.empid || "—"],
      ["Email",       person.work_email],
      ["Phone",       person.phone || "—"],
      ["Gender",      person.gender || "—"],
      ["Designation", person.designation || "—"],
      ["Status",      person.status || "—"],
    ];
    if (isManager) return [
      ["Emp ID",      person.empid || "—"],
      ["Email",       person.work_email],
      ["Phone",       person.personal_contact || "—"],
      ["Gender",      person.gender || "—"],
      ["Marital",     person.marital_status || "—"],
      ["Department",  person.department || "—"],
      ["Designation", person.designation || "—"],
      ["Location",    person.office_location || "—"],
    ];
    return [
      ["Emp ID",      person.empid || "—"],
      ["Email",       person.work_email],
      ["Phone",       person.personal_contact || "—"],
      ["Gender",      person.gender || "—"],
      ["Marital",     person.marital_status || "—"],
      ["Department",  person.department || "—"],
      ["Designation", person.designation || "—"],
      ["Location",    person.office_location || "—"],
    ];
  }, [person, isSA, isAdmin, isManager]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease_forwards]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full sm:max-w-md md:max-w-lg h-full bg-white shadow-2xl z-50 overflow-y-auto flex flex-col animate-[slideR_0.25s_cubic-bezier(0.22,1,0.36,1)_forwards]">

        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between z-10 min-w-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Profile details</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{roleLabel} · {name}</p>
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
            style={{ background: `linear-gradient(135deg, ${accentColor}0d, ${accentColor}05)`, borderColor: `${accentColor}20` }}
          >
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold text-white shrink-0"
              style={{ background: accentColor, boxShadow: `0 4px 16px ${accentColor}35` }}
            >
              {getInitials(person.f_name, person.l_name)}
            </div>
            <div className="text-center min-w-0 w-full">
              <div className="text-base font-bold text-slate-900 break-words">{name}</div>
              <div className="text-xs text-gray-500 mt-0.5 break-all">{person.work_email || person.email}</div>
            </div>
            <div className="flex gap-1.5 flex-wrap justify-center mt-1">
              <Badge color={accentColor} bg={`${accentColor}15`}>{roleLabel}</Badge>
              {(person.department || person.designation) && (
                <Badge color="#374151" bg="#f3f4f6">{person.department || person.designation}</Badge>
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
                  {t === "info" ? "Information" : t === "leave" ? "Leave" : "Reviews"}
                </button>
              ))}
            </div>
          )}

          {(tab === "info" || isSA) && (
            <div className="bg-[#fafbfc] rounded-xl p-4 sm:px-5 border border-gray-100 flex flex-col min-w-0">
              {fields.map(([label, val]) => (
                <div key={label} className="su-field-row py-2.5 border-b border-gray-100 last:border-b-0 text-xs sm:text-sm min-w-0">
                  <span className="text-gray-500 shrink-0">{label}</span>
                  <span className="su-field-val text-slate-900 font-medium text-right break-all min-w-0" style={{ maxWidth: "65%" }}>{val || "—"}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "leave"   && !isSA && <LeaveTab uid={person._id} />}
          {tab === "reviews" && !isSA && <ReviewsTab uid={person._id} role={type} />}
        </div>
      </div>
    </>
  );
}

function LeaveTab({ uid }) {
  const { data: empData, isLoading } = useGetParticularEmployee(uid);
  const lb = empData?.leaveBalance;

  if (isLoading) return (
    <div className="flex justify-center pt-9">
      <div className="w-6 h-6 rounded-full border-2 border-[#730042]/30 border-t-[#730042] animate-spin" />
    </div>
  );

  if (!lb) return (
    <div className="text-xs sm:text-sm text-gray-400 text-center pt-9">No leave data found.</div>
  );

  const leaveTypes = [
    ["Casual Leave",    lb.casualLeave,    lb.casualLeaveUsed,    "#10b981"],
    ["Sick Leave",      lb.sickLeave,      lb.sickLeaveUsed,      "#0ea5e9"],
    ["Earned Leave",    lb.earnedLeave,    lb.earnedLeaveUsed,    "#6366f1"],
    ["Maternity Leave", lb.maternityLeave, lb.maternityLeaveUsed, "#ec4899"],
  ].filter(([, total]) => total !== undefined && total !== null);

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {leaveTypes.map(([label, total, used, color]) => {
        const remaining = (total || 0) - (used || 0);
        const pct = total ? Math.round(((used || 0) / total) * 100) : 0;
        return (
          <div key={label} className="bg-[#fafbfc] rounded-xl border border-gray-100 p-3 sm:p-4 min-w-0">
            <div className="flex justify-between items-center mb-2 gap-2">
              <span className="text-xs sm:text-sm font-medium text-slate-900 truncate">{label}</span>
              <span className="text-[11.5px] text-gray-500 shrink-0" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{used || 0} / {total || 0}</span>
            </div>
            <div className="h-1.5 rounded bg-gray-100 overflow-hidden">
              <div className="h-full rounded transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
            </div>
            <div className="text-[11px] sm:text-xs text-gray-400 mt-1.5">{remaining} days remaining</div>
          </div>
        );
      })}
    </div>
  );
}

function ReviewsTab({ uid, role }) {
  const fetchFn = role === "manager" ? useGetParticularManager : useGetParticularEmployee;
  const { data, isLoading } = fetchFn(uid);
  const reviews = data?.reviews || [];

  if (isLoading) return (
    <div className="flex justify-center pt-9">
      <div className="w-6 h-6 rounded-full border-2 border-[#730042]/30 border-t-[#730042] animate-spin" />
    </div>
  );

  if (!reviews.length) return (
    <div className="text-xs sm:text-sm text-gray-400 text-center pt-9">No reviews yet.</div>
  );

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {reviews.map((r) => (
        <div key={r._id} className="bg-[#fafbfc] rounded-xl border border-gray-100 p-3 sm:p-4 min-w-0">
          <div className="flex justify-between items-start mb-2 gap-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate min-w-0">
              {r.reviewer?.f_name} {r.reviewer?.l_name}
            </span>
            <div className="flex gap-0.5 shrink-0">
              {[1,2,3,4,5].map(s => (
                <span key={s} className="text-sm" style={{ color: s <= r.rating ? "#f59e0b" : "#e2e8f0" }}>★</span>
              ))}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 m-0 leading-relaxed break-words">{r.comment}</p>
          <div className="text-[11px] text-gray-400 mt-1.5">{r.monthYear}</div>
        </div>
      ))}
    </div>
  );
}

function ManagerBranch({ manager, allManagers, employees, depth, delayBase, matchName, hasQ, parentMatched, onNodeClick }) {
  const mgrMatch  = hasQ && matchName(manager.f_name, manager.l_name, manager.department, manager.designation);
  const mgrDimmed = hasQ && !mgrMatch && !parentMatched;
  const mgrId = idStr(manager._id);

  const subManagers = allManagers.filter((m) => idStr(m.reporting_manager) === mgrId && m.reporting_manager_model === "Manager");
  const mgrEmps = employees.filter((e) => idStr(e.Under_manager) === mgrId);

  const childCount = subManagers.length + mgrEmps.length;
  const CHILD_GAP = depth > 0 ? 14 : 12;
  const SUB_W = 152;
  const EMP_W = 132;

  const subTotalW = subManagers.length > 1 ? (subManagers.length - 1) * (SUB_W + CHILD_GAP) : 0;
  const empTotalW = mgrEmps.length > 1 ? (mgrEmps.length - 1) * (EMP_W + CHILD_GAP) : 0;

  return (
    <div className="flex flex-col items-center min-w-0">
      <VLine h={18} delay={delayBase - 55} />
      <ManagerNode
        manager={manager}
        delay={delayBase}
        highlighted={mgrMatch}
        dimmed={mgrDimmed}
        onClick={() => onNodeClick(manager, "manager")}
      />

      {subManagers.length > 0 && (
        <>
          <VLine h={20} delay={delayBase + 100} />
          {subManagers.length > 1 && <HLine w={subTotalW} delay={delayBase + 140} />}
        </>
      )}

      {subManagers.length > 0 && (
        <div className="flex gap-3.5 justify-center items-start min-w-0">
          {subManagers.map((sub, si) => (
            <ManagerBranch
              key={sub._id}
              manager={sub}
              allManagers={allManagers}
              employees={employees}
              depth={depth + 1}
              delayBase={delayBase + 180 + si * 50}
              matchName={matchName}
              hasQ={hasQ}
              parentMatched={mgrMatch || parentMatched}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
      )}

      {mgrEmps.length > 0 && (
        <>
          <VLine h={20} delay={delayBase + 100} />
          {mgrEmps.length > 1 && <HLine w={empTotalW} delay={delayBase + 140} />}
        </>
      )}

      {mgrEmps.length > 0 && (
        <div className="flex gap-3 justify-center items-start min-w-0">
          {mgrEmps.map((emp, ei) => {
            const empMatch  = hasQ && matchName(emp.f_name, emp.l_name, emp.department, emp.designation);
            const empDimmed = hasQ && !empMatch && !mgrMatch && !parentMatched;
            const empDelay  = delayBase + 180 + ei * 45;
            return (
              <div key={emp._id} className="flex flex-col items-center min-w-0">
                <VLine h={16} delay={empDelay - 45} />
                <EmployeeNode
                  employee={emp}
                  delay={empDelay}
                  highlighted={empMatch}
                  dimmed={empDimmed}
                  onClick={() => onNodeClick(emp, "employee")}
                />
              </div>
            );
          })}
        </div>
      )}

      {childCount === 0 && null}
    </div>
  );
}

function OrgTree({ superAdmin, admins, managers, employees, loading, searchQuery, onNodeClick }) {
  if (loading) return <SkeletonTree />;

  const q    = normalize(searchQuery);
  const hasQ = q.length > 0;

  const matchName = (f = "", l = "", dept = "", desig = "") => {
    if (!hasQ) return false;
    return normalize(`${f} ${l}`).includes(q) ||
           normalize(dept).includes(q) ||
           normalize(desig).includes(q);
  };

  const ADM_GAP = 28;
  const ADM_W   = 174;

  return (
    <div className="w-max min-w-full flex flex-col items-center mx-auto">
      <SuperAdminNode
        name={fullName(superAdmin) || "Super Admin"}
        role={superAdmin?.organisation_name || "Super Admin"}
        initials={getInitials(superAdmin?.f_name, superAdmin?.l_name)}
        delay={60}
        onClick={() => onNodeClick(superAdmin, "superadmin")}
      />

      {admins.length > 0 && (
        <>
          <VLine h={30} delay={220} />
          {admins.length > 1 && <HLine w={(admins.length - 1) * (ADM_W + ADM_GAP)} delay={280} />}
        </>
      )}

      <div className="flex gap-5 sm:gap-7 justify-center items-start min-w-0">
        {admins.map((admin, ai) => {
          const admMatch  = hasQ && matchName(admin.f_name, admin.l_name, "", admin.designation);
          const admDimmed = hasQ && !admMatch;
          const admDelay  = 340 + ai * 60;
          const adminId   = idStr(admin._id);

          const admManagers = managers.filter(() => true);
          const MAN_GAP = 18;
          const MAN_W   = 152;
          const manTotal = admManagers.length > 1 ? (admManagers.length - 1) * (MAN_W + MAN_GAP) : 0;

          return (
            <div key={admin._id} className="flex flex-col items-center min-w-0">
              <VLine h={22} delay={admDelay - 60} />
              <AdminNode
                admin={admin}
                delay={admDelay}
                highlighted={admMatch}
                dimmed={admDimmed}
                onClick={() => onNodeClick(admin, "admin")}
              />

              {admManagers.length > 0 && (
                <>
                  <VLine h={26} delay={admDelay + 120} />
                  {admManagers.length > 1 && <HLine w={manTotal} delay={admDelay + 160} />}
                </>
              )}

              <div className="flex gap-4 justify-center items-start min-w-0">
                {admManagers.map((mgr, mi) => {
                  const mgrMatch  = hasQ && matchName(mgr.f_name, mgr.l_name, mgr.department, mgr.designation);
                  const mgrDimmed = hasQ && !mgrMatch && !admMatch;
                  const mgrDelay  = admDelay + 200 + mi * 55;

                  const mgrEmps = employees.filter(e =>
                    e.Under_manager?._id?.toString() === mgr._id?.toString() ||
                    e.Under_manager?.toString()      === mgr._id?.toString()
                  );
                  const EMP_GAP = 12;
                  const EMP_W   = 132;
                  const empTotal = mgrEmps.length > 1 ? (mgrEmps.length - 1) * (EMP_W + EMP_GAP) : 0;

                  return (
                    <div key={mgr._id} className="flex flex-col items-center min-w-0">
                      <VLine h={18} delay={mgrDelay - 55} />
                      <ManagerNode
                        manager={mgr}
                        delay={mgrDelay}
                        highlighted={mgrMatch}
                        dimmed={mgrDimmed}
                        onClick={() => onNodeClick(mgr, "manager")}
                      />

                      {mgrEmps.length > 0 && (
                        <>
                          <VLine h={20} delay={mgrDelay + 100} />
                          {mgrEmps.length > 1 && <HLine w={empTotal} delay={mgrDelay + 140} />}
                        </>
                      )}

                      <div className="flex gap-3 justify-center items-start min-w-0">
                        {mgrEmps.map((emp, ei) => {
                          const empMatch  = hasQ && matchName(emp.f_name, emp.l_name, emp.department, emp.designation);
                          const empDimmed = hasQ && !empMatch && !mgrMatch && !admMatch;
                          const empDelay  = mgrDelay + 180 + ei * 45;
                          return (
                            <div key={emp._id} className="flex flex-col items-center min-w-0">
                              <VLine h={16} delay={empDelay - 45} />
                              <EmployeeNode
                                employee={emp}
                                delay={empDelay}
                                highlighted={empMatch}
                                dimmed={empDimmed}
                                onClick={() => onNodeClick(emp, "employee")}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {admins.length === 0 && !loading && (
        <div className="mt-9 px-6 py-4 rounded-xl border-[1.5px] border-dashed border-gray-200 text-xs sm:text-sm text-gray-300 bg-[#fafbfc] min-w-0">
          No admins created yet
        </div>
      )}
    </div>
  );
}

export default function SuperAdminOrgChart() {
  const refetchOpts = { staleTime: 1000 * 60 * 5, refetchInterval: REFRESH_MS, refetchOnWindowFocus: false };

  const { data: saData,  isLoading: loadingSA  } = useGetMeSuperAdmin();
  const { data: admData, isLoading: loadingAdm } = useGetAllAdmins(refetchOpts);
  const { data: mgrData, isLoading: loadingMgr } = useGetAllManagers(refetchOpts);
  const { data: empData, isLoading: loadingEmp } = useGetAllEmployees(refetchOpts);
  const { data: orgData }                         = useGetOrgInfo();

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected,    setSelected]    = useState(null);
  const [exportOpen,  setExportOpen]  = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const inputRef = useRef(null);
  const exportBtnRef = useRef(null);
  const treeRef = useRef(null);

  const superAdmin = saData?.superAdmin || saData;
  const admins     = useMemo(() => admData?.admins || [], [admData]);
  const managers   = useMemo(() => {
    const raw = mgrData?.managers || mgrData || [];
    return Array.isArray(raw) ? raw : [];
  }, [mgrData]);
  const employees  = useMemo(() => {
    const raw = empData?.users || empData || [];
    return Array.isArray(raw) ? raw : [];
  }, [empData]);

  const orgName  = orgData?.organisation_name || superAdmin?.organisation_name || "Organisation";
  const loading  = loadingSA || loadingAdm || loadingMgr || loadingEmp;
  const totalNodes = 1 + admins.length + managers.length + employees.length;

  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    const q = normalize(searchQuery);
    let n = 0;
    const check = (f, l, dept, desig) => {
      if (normalize(`${f} ${l}`).includes(q) || normalize(dept||"").includes(q) || normalize(desig||"").includes(q)) n++;
    };
    if (superAdmin) check(superAdmin.f_name, superAdmin.l_name, "", "");
    admins.forEach(a   => check(a.f_name, a.l_name, "", a.designation));
    managers.forEach(m => check(m.f_name, m.l_name, m.department, m.designation));
    employees.forEach(e => check(e.f_name, e.l_name, e.department, e.designation));
    return n;
  }, [searchQuery, superAdmin, admins, managers, employees]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); setSelected(null); setExportOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [searchOpen]);

  useEffect(() => {
    if (!exportOpen) return;
    const onClickAway = (e) => {
      if (exportBtnRef.current && !exportBtnRef.current.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [exportOpen]);

  function buildCsvRows() {
    const rows = [["Role", "Emp ID", "Name", "Email", "Phone", "Department", "Designation", "Office Location", "Reports To"]];

    if (superAdmin) {
      rows.push(["Super Admin", "", fullName(superAdmin), superAdmin.email || "", "", "", "", "", ""]);
    }

    admins.forEach((a) => {
      rows.push(["Admin", a.empid || "", fullName(a), a.work_email || "", a.personal_contact || "", a.department || "", a.designation || "", a.office_location || "", "Super Admin"]);
    });

    managers.forEach((m) => {
      const parentLabel = m.reporting_manager_model === "Admin"
        ? (admins.find((a) => idStr(a._id) === idStr(m.reporting_manager)) ? `Admin: ${fullName(admins.find((a) => idStr(a._id) === idStr(m.reporting_manager)))}` : "Unassigned")
        : m.reporting_manager_model === "Manager"
          ? (managers.find((mm) => idStr(mm._id) === idStr(m.reporting_manager)) ? `Manager: ${fullName(managers.find((mm) => idStr(mm._id) === idStr(m.reporting_manager)))}` : "Unassigned")
          : "Unassigned";
      rows.push(["Manager", m.empid || "", fullName(m), m.work_email || "", m.personal_contact || "", m.department || "", m.designation || "", m.office_location || "", parentLabel]);
    });

    employees.forEach((e) => {
      const mgr = managers.find((m) => idStr(m._id) === idStr(e.Under_manager));
      rows.push(["Employee", e.empid || "", fullName(e), e.work_email || "", e.personal_contact || "", e.department || "", e.designation || "", e.office_location || "", mgr ? `Manager: ${fullName(mgr)}` : "Unassigned"]);
    });

    return rows;
  }

  function exportCsv() {
    const rows = buildCsvRows();
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${normalize(orgName).replace(/\s+/g, "-") || "organisation"}-org-chart-${Date.now()}.csv`);
    setExportOpen(false);
  }

  async function exportPng() {
    if (!treeRef.current) return;
    setExporting(true);
    try {
      await loadScript(HTML_TO_IMAGE_CDN);
      treeRef.current.classList.add("su-export-flat");
      const dataUrl = await window.htmlToImage.toPng(treeRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
      });
      treeRef.current.classList.remove("su-export-flat");
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlob(blob, `${normalize(orgName).replace(/\s+/g, "-") || "organisation"}-org-chart-${Date.now()}.png`);
    } catch (err) {
      treeRef.current?.classList.remove("su-export-flat");
      window.alert("Could not generate the image export. Please try again.");
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  }

  const statItems = [
    { label: "Admins",    value: admins.length,    color: "#6366f1" },
    { label: "Managers",  value: managers.length,  color: "#0ea5e9" },
    { label: "Employees", value: employees.length, color: "#10b981" },
    { label: "Total",     value: totalNodes,       color: BRAND     },
  ];

  return (
    <div className="su-org w-full max-w-full min-w-0 min-h-screen bg-[#f4f7fb] flex flex-col overflow-x-hidden">
      <style>{STYLES}</style>

      <header className="w-full max-w-full min-w-0 bg-white border-b border-gray-200 shadow-sm overflow-hidden">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 min-w-0">
          <div className={`flex items-center gap-2 sm:gap-3 min-w-0 flex-1 ${searchOpen ? "hidden sm:flex" : "flex"}`}>
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#730042] shrink-0 shadow-[0_0_0_3px_rgba(115,0,66,0.15)]"></div>
            <span className="hidden md:inline text-sm text-gray-400 font-medium truncate min-w-0">{orgName}</span>
            <svg className="hidden md:block w-3 h-3 shrink-0" viewBox="0 0 13 13" fill="none">
              <path d="M5 3l3 3.5L5 10" stroke="#d1d5db" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight truncate min-w-0">Org Chart</h1>
            <span className="hidden xs:inline-block px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10.5px] font-bold text-[#730042] bg-[#730042]/10 rounded-full shrink-0">
              Super Admin
            </span>
            {!loading && <div className="hidden sm:block shrink-0"><LiveDot /></div>}
          </div>

          <div className={`flex items-center gap-2 min-w-0 ${searchOpen ? "w-full sm:w-auto sm:flex-none sm:ml-auto" : "flex-none ml-auto"}`}>
            {searchOpen ? (
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto min-w-0">
                <div className="flex items-center gap-2 border-[1.5px] border-[#730042] rounded-lg px-3 h-10 sm:h-9 flex-1 sm:w-72 shadow-[0_0_0_4px_rgba(115,0,66,0.08)] min-w-0">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 13 13" fill="none">
                    <circle cx="5.5" cy="5.5" r="4" stroke="#9ca3af" strokeWidth="1.3" />
                    <path d="M9 9l2.5 2.5" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <input
                    ref={inputRef}
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-slate-900 placeholder:text-gray-400"
                    placeholder="Name, role, department…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="flex items-center justify-center h-full px-2 -mr-2 text-gray-400 shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 13 13" fill="none">
                        <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 13 13" fill="none">
                    <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
            ) : (
              <button
                className="flex items-center gap-1.5 px-3 sm:px-4 h-10 sm:h-9 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 shrink-0 min-w-[44px]"
                onClick={() => setSearchOpen(true)}
              >
                <svg className="w-3 h-3" viewBox="0 0 13 13" fill="none">
                  <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span>Search</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 flex-1">

        <div className="mb-6 lg:mb-8 min-w-0">
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight truncate">
            Organisation Chart
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
            {loading ? "Loading…" : `${orgName} · ${totalNodes} nodes · auto-refreshes every 2 min`}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8 min-w-0 max-w-full">
          {statItems.map(({ label, value, color }, i) => (
            <div
              key={label}
              className="relative bg-white border border-gray-200 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-5 flex items-center gap-2.5 sm:gap-4 lg:gap-4 shadow-sm overflow-hidden hover:shadow-md transition-shadow min-w-0"
              style={{ animation: `fadeUp 0.35s ease ${100 + i * 55}ms forwards`, opacity: 0 }}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }}></div>
              <div
                className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}12` }}
              >
                <div
                  className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full"
                  style={{ background: color, boxShadow: `0 2px 6px ${color}40` }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-xl lg:text-2xl font-bold text-slate-900 leading-none truncate" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  {loading ? "—" : value}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-400 mt-1 font-medium truncate">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full max-w-full min-w-0 bg-white border border-gray-200 rounded-xl lg:rounded-2xl shadow-sm overflow-hidden flex flex-col">

          <div className="w-full min-w-0 px-4 sm:px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100/50">
            <span className="text-sm font-semibold text-slate-700 truncate">Hierarchy</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold shrink-0" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {loading ? "…" : `${totalNodes} nodes`}
            </span>
            {searchQuery && matchCount > 0 && (
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-[#730042]/10 text-[#730042] font-semibold shrink-0">
                {matchCount} highlighted
              </span>
            )}
            <span className="hidden sm:block ml-auto text-xs text-gray-400 truncate">Click any card for details</span>
          </div>

          <div className="su-scroll w-full max-w-full min-w-0 overflow-x-auto bg-white p-4 sm:p-6 lg:p-8">
            <OrgTree
              superAdmin={superAdmin}
              admins={admins}
              managers={managers}
              employees={employees}
              loading={loading}
              searchQuery={searchQuery}
              onNodeClick={(person, type) => setSelected({ person, type })}
            />
          </div>
        </div>

        {!loading && (
          <div className="flex gap-2.5 sm:gap-4 lg:gap-6 mt-4 lg:mt-6 justify-center flex-wrap min-w-0 max-w-full">
            {[
              { dot: BRAND,     label: "Super Admin", glow: true },
              { dot: "#6366f1", label: "Admin"   },
              { dot: "#0ea5e9", label: "Manager" },
              { dot: "#cbd5e1", label: "Employee", border: "#b0b8c8" },
            ].map(({ dot, label, border, glow }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-400 shrink-0">
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

      {selected && (
        <EmployeeDetailPanel
          person={selected.person}
          type={selected.type}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}