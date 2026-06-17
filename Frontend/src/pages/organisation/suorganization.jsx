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

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const getInitials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();
const normalize   = (s = "") => s.toLowerCase().trim();

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
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color, background: bg, letterSpacing: "0.02em" }}
    >
      {children}
    </span>
  );
}

function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      Live
    </span>
  );
}

function SuperAdminNode({ name, role, initials, delay = 0, onClick }) {
  return (
    <div className="opacity-0 shrink-0" style={{ animation: `scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms forwards` }}>
      <div
        className="su-card-hover su-card-sa w-[210px] bg-white border-[1.5px] border-[#e8edf5] rounded-2xl p-4 sm:p-5 flex flex-col items-center relative overflow-hidden shadow-sm"
        onClick={onClick}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#730042] to-[#a8005a] rounded-t-2xl" />
        <span className="absolute top-3 right-3 text-[9px] font-bold tracking-widest text-gray-400 uppercase" style={{ fontFamily: "'JetBrains Mono',monospace" }}>SA</span>
        <Avatar initials={initials} size={56} bg={BRAND} fontSize={19} />
        <p className="text-base font-bold text-slate-900 mt-3 text-center break-words">{name}</p>
        <p className="text-xs text-gray-500 mt-1 text-center break-words">{role}</p>
        <div className="mt-3 flex gap-1.5">
          <Badge>Super Admin</Badge>
        </div>
      </div>
    </div>
  );
}

function AdminNode({ admin, delay = 0, dimmed, highlighted, onClick }) {
  const name = `${admin.f_name} ${admin.l_name}`.trim();
  return (
    <div className="opacity-0 shrink-0" style={{ animation: `scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms forwards` }}>
      <div
        className={`su-card-hover w-[174px] bg-white border-[1.5px] border-[#e8edf5] rounded-xl p-3 sm:p-4 flex flex-col items-center relative overflow-hidden shadow-sm ${highlighted ? "su-card-highlight" : ""} ${dimmed ? "su-card-dim" : ""}`}
        onClick={onClick}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-t-xl" />
        <span className="absolute top-2.5 right-3 text-[9px] font-bold text-indigo-300 uppercase" style={{ fontFamily: "'JetBrains Mono',monospace" }}>ADM</span>
        <Avatar initials={getInitials(admin.f_name, admin.l_name)} size={44} bg="#6366f1" fontSize={14} />
        <p className="text-[13px] font-semibold text-slate-900 mt-2.5 text-center max-w-[140px] truncate w-full">{name}</p>
        <p className="text-[11px] text-gray-400 mt-1 text-center max-w-[140px] truncate w-full">{admin.designation || "Admin"}</p>
        <div className="mt-2">
          <span className="text-[10px] px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-semibold">Admin</span>
        </div>
      </div>
    </div>
  );
}

function ManagerNode({ manager, delay = 0, dimmed, highlighted, onClick }) {
  const name = `${manager.f_name} ${manager.l_name}`.trim();
  return (
    <div className="opacity-0 shrink-0" style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards` }}>
      <div
        className={`su-card-hover w-[152px] bg-[#f9fbfe] border-[1.5px] border-[#e4edf6] rounded-lg p-3 flex flex-col items-center relative overflow-hidden shadow-sm ${highlighted ? "su-card-highlight" : ""} ${dimmed ? "su-card-dim" : ""}`}
        onClick={onClick}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-sky-400 rounded-t-lg" />
        <Avatar initials={getInitials(manager.f_name, manager.l_name)} size={38} bg="#0ea5e9" fontSize={13} />
        <p className="text-xs font-semibold text-slate-800 mt-2 text-center max-w-[120px] truncate w-full">{name}</p>
        <p className="text-[10.5px] text-slate-400 mt-0.5 text-center max-w-[120px] truncate w-full">{manager.department || manager.designation || "Manager"}</p>
        <div className="mt-1.5">
          <span className="text-[9.5px] px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold">Manager</span>
        </div>
      </div>
    </div>
  );
}

function EmployeeNode({ employee, delay = 0, dimmed, highlighted, onClick }) {
  const name = `${employee.f_name} ${employee.l_name}`.trim();
  return (
    <div className="opacity-0 shrink-0" style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards` }}>
      <div
        className={`su-card-hover w-[132px] bg-[#fafbfc] border-[1.5px] border-[#e8edf5] rounded-lg p-2.5 flex flex-col items-center relative ${highlighted ? "su-card-highlight" : ""} ${dimmed ? "su-card-dim" : ""}`}
        onClick={onClick}
      >
        <Avatar initials={getInitials(employee.f_name, employee.l_name)} size={32} bg="#e2e8f0" fontSize={10} />
        <p className="text-[11px] font-semibold text-slate-800 mt-1.5 text-center max-w-[100px] truncate w-full">{name}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 text-center max-w-[100px] truncate w-full">{employee.department || employee.designation || "Employee"}</p>
      </div>
    </div>
  );
}

function SkeletonTree() {
  return (
    <div className="flex flex-col items-center gap-0">
      <Skeleton w={210} h={130} r={16} />
      <div className="w-1.5 h-7 bg-gray-200 mx-auto" />
      <div className="flex gap-5 justify-center">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-1.5 h-5 bg-gray-200 mx-auto" />
            <Skeleton w={174} h={104} r={13} />
            <div className="w-1.5 h-5 bg-gray-200 mx-auto" />
            <div className="flex gap-3.5 justify-center">
              {[1, 2].map(j => (
                <div key={j} className="flex flex-col items-center">
                  <div className="w-1.5 h-4 bg-gray-200 mx-auto" />
                  <Skeleton w={132} h={82} r={10} />
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
  const isEmployee = type === "employee";
  const isManager  = type === "manager";
  const isAdmin    = type === "admin";
  const isSA       = type === "superadmin";

  const name = `${person.f_name || ""} ${person.l_name || ""}`.trim();

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
      ["Email",       person.work_email],
      ["Phone",       person.phone || "—"],
      ["Gender",      person.gender || "—"],
      ["Designation", person.designation || "—"],
      ["Status",      person.status || "—"],
    ];
    if (isManager) return [
      ["Email",       person.work_email],
      ["Phone",       person.personal_contact || "—"],
      ["Gender",      person.gender || "—"],
      ["Marital",     person.marital_status || "—"],
      ["Department",  person.department || "—"],
      ["Designation", person.designation || "—"],
      ["Location",    person.office_location || "—"],
    ];
    return [
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
        
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
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
            className="rounded-xl p-4 sm:p-6 mb-5 flex flex-col items-center gap-2.5 border"
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
            <div className="flex gap-2 mb-5 flex-wrap">
              {["info", "leave", "reviews"].map((t) => (
                <button 
                  key={t} 
                  className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all min-h-[40px] flex items-center ${tab === t ? "bg-[#730042] text-white border-[#730042] shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
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
                <div key={label} className="flex justify-between items-start py-2.5 border-b border-gray-100 last:border-b-0 text-xs sm:text-sm gap-4 min-w-0">
                  <span className="text-gray-500 shrink-0">{label}</span>
                  <span className="text-slate-900 font-medium text-right break-all min-w-0" style={{ maxWidth: "65%" }}>{val || "—"}</span>
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
            <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
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
    // Removed inline style minWidth. Using w-max min-w-full to prevent page cutoff and allow internal scrolling
    <div className="flex flex-col items-center w-max min-w-full">
      <SuperAdminNode
        name={`${superAdmin?.f_name || ""} ${superAdmin?.l_name || ""}`.trim() || "Super Admin"}
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

      <div className="flex gap-7 justify-center items-start">
        {admins.map((admin, ai) => {
          const admMatch  = hasQ && matchName(admin.f_name, admin.l_name, "", admin.designation);
          const admDimmed = hasQ && !admMatch;
          const admDelay  = 340 + ai * 60;

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

              <div className="flex gap-4 justify-center items-start">
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

                      <div className="flex gap-3 justify-center items-start">
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
        <div className="mt-9 px-6 py-4 rounded-xl border-[1.5px] border-dashed border-gray-200 text-xs sm:text-sm text-gray-300 bg-[#fafbfc]">
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
  const inputRef = useRef(null);

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
      if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); setSelected(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [searchOpen]);

  const statItems = [
    { label: "Admins",    value: admins.length,    color: "#6366f1" },
    { label: "Managers",  value: managers.length,  color: "#0ea5e9" },
    { label: "Employees", value: employees.length, color: "#10b981" },
    { label: "Total",     value: totalNodes,       color: BRAND     },
  ];

  return (
    <div className="su-org min-h-screen bg-[#f4f7fb] w-full overflow-x-hidden flex flex-col min-w-0">
      <style>{STYLES}</style>

      {/* Header / Navigation */}
      <header className="w-full bg-white border-b border-gray-200 shadow-sm overflow-hidden min-w-0">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4 min-w-0">
          
          {/* Left section - Adjusted for mobile */}
          <div className={`flex items-center gap-2 sm:gap-3 min-w-0 ${searchOpen ? "hidden sm:flex" : "flex"}`}>
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#730042] shrink-0 shadow-[0_0_0_3px_rgba(115,0,66,0.15)]"></div>
            {/* Org Name hidden on very small screens to save space */}
            <span className="hidden md:inline text-sm text-gray-400 font-medium truncate min-w-0">{orgName}</span>
            <svg className="hidden md:block w-3 h-3 shrink-0" viewBox="0 0 13 13" fill="none">
              <path d="M5 3l3 3.5L5 10" stroke="#d1d5db" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight truncate min-w-0">Org Chart</h1>
            <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10.5px] font-bold text-[#730042] bg-[#730042]/10 rounded-full shrink-0">
              Super Admin
            </span>
            {!loading && <div className="hidden sm:block shrink-0"><LiveDot /></div>}
          </div>

          {/* Right section */}
          <div className={`flex items-center gap-2 min-w-0 ${searchOpen ? "w-full sm:w-auto sm:ml-auto" : "ml-auto"}`}>
            {searchOpen ? (
              <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
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
                  className="flex items-center justify-center gap-1.5 px-3 sm:px-4 h-10 sm:h-9 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 shrink-0 min-w-[44px]"
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

      {/* Main Content */}
      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 flex-1">

        {/* Title Area */}
        <div className="mb-6 lg:mb-8 min-w-0">
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight truncate">
            Organisation Chart
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
            {loading ? "Loading…" : `${orgName} · ${totalNodes} nodes · auto-refreshes every 2 min`}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8 min-w-0">
          {statItems.map(({ label, value, color }, i) => (
            <div
              key={label}
              className="relative bg-white border border-gray-200 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-5 flex items-center gap-3 lg:gap-4 shadow-sm overflow-hidden hover:shadow-md transition-shadow min-w-0"
              style={{ animation: `fadeUp 0.35s ease ${100 + i * 55}ms forwards`, opacity: 0 }}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }}></div>
              <div
                className="w-9 h-9 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}12` }}
              >
                <div
                  className="w-4 h-4 lg:w-5 lg:h-5 rounded-full"
                  style={{ background: color, boxShadow: `0 2px 6px ${color}40` }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 leading-none truncate" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  {loading ? "—" : value}
                </div>
                <div className="text-[11px] sm:text-xs text-gray-400 mt-1 font-medium truncate">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tree Card */}
        <div className="bg-white border border-gray-200 rounded-xl lg:rounded-2xl shadow-sm overflow-hidden min-w-0">
          
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100/50 min-w-0">
            <span className="text-sm font-semibold text-slate-700 truncate">Hierarchy</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold shrink-0" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {loading ? "…" : `${totalNodes} nodes`}
            </span>
            {searchQuery && matchCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#730042]/10 text-[#730042] font-semibold shrink-0">
                {matchCount} highlighted
              </span>
            )}
            <span className="hidden sm:block ml-auto text-xs text-gray-400 truncate">Click any card for details</span>
          </div>

          {/* Tree Scroll Container - overflow-x-auto works perfectly with w-max min-w-full inside */}
          <div className="su-scroll w-full overflow-x-auto bg-white p-4 sm:p-6 lg:p-8 min-w-0">
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

        {/* Legend */}
        {!loading && (
          <div className="flex gap-3 sm:gap-4 lg:gap-6 mt-4 lg:mt-6 justify-center flex-wrap min-w-0">
            {[
              { dot: BRAND,     label: "Super Admin", glow: true },
              { dot: "#6366f1", label: "Admin"   },
              { dot: "#0ea5e9", label: "Manager" },
              { dot: "#cbd5e1", label: "Employee", border: "#b0b8c8" },
            ].map(({ dot, label, border, glow }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
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