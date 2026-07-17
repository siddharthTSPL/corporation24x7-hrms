import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
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

  .su-shell { min-height: 100vh; }
  @supports (height: 100dvh) {
    .su-shell { min-height: 100dvh; }
  }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn   { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
  @keyframes slideR    { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }
  @keyframes ringPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(15,23,42,0.2), 0 4px 20px rgba(15,23,42,0.08); }
    50%      { box-shadow: 0 0 0 7px rgba(15,23,42,0.05), 0 8px 28px rgba(15,23,42,0.15); }
  }
  @keyframes pulseYou {
    0%,100% { box-shadow: 0 0 0 0 rgba(115,0,66,0.25); }
    50%      { box-shadow: 0 0 0 6px rgba(115,0,66,0.06); }
  }

  .su-card-hover { transition: transform 0.16s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.16s ease, border-color 0.14s ease; cursor: pointer; touch-action: manipulation; }
  .su-card-hover:hover { transform: translateY(-4px) scale(1.015); }
  .su-card-highlight { outline: 2px solid #0f172a !important; outline-offset: 3px; box-shadow: 0 0 0 6px rgba(15,23,42,0.08) !important; }
  .su-card-dim { opacity: 0.15; filter: grayscale(0.5) blur(0.3px); transition: opacity 0.22s, filter 0.22s; }
  .su-card-sa  { animation: ringPulse 3s ease-in-out infinite !important; }

  .su-you-pill {
    position: absolute;
    top: -9px;
    right: -9px;
    z-index: 30;
    background: #730042;
    color: #ffffff;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(115,0,66,0.45), 0 0 0 2px #ffffff;
    white-space: nowrap;
    animation: pulseYou 2.6s ease-in-out infinite;
    pointer-events: none;
  }

  .su-scroll {
    touch-action: pan-x;
    overscroll-behavior-x: contain;
  }
  .su-scroll::-webkit-scrollbar { height:5px; width:5px; }
  .su-scroll::-webkit-scrollbar-track { background:transparent; }
  .su-scroll::-webkit-scrollbar-thumb { background:#dde3ec; border-radius:6px; }
  .su-scroll { -webkit-overflow-scrolling: touch; }

  /* ---------- Profile detail panel field rows ----------
     These classes are used in EmployeeDetailPanel's info list. They
     were previously referenced in JSX but never given rules here, so
     the label span and value span rendered back-to-back with no gap
     (e.g. "Emp IDENG05"). Flex + space-between fixes the layout. */
  .su-field-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .su-field-val {
    flex: 1 1 auto;
  }

  /* ---------- Org-chart connector lines ----------
     Lines are drawn with a measured SVG overlay (see OrgConnectorGroup
     below) instead of CSS width/gap math, so they are always pixel-
     perfect regardless of card width, text truncation, breakpoint, or
     how many siblings are rendered - no seams, no misaligned elbows. */

  .org-tree-root { display: flex; flex-direction: column; align-items: center; }
  .org-branch { display: flex; flex-direction: column; align-items: center; position: relative; min-width: 0; }
`;

const BRAND       = "#730042";
const BRAND_LIGHT = "rgba(115,0,66,0.07)";
const REFRESH_MS  = 1000 * 60 * 2;
const HTML_TO_IMAGE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
const LINE_COLOR = "#c9d2e0";

const NODE_COLOR = { sa: "#0f172a", admin: "#334155", manager: "#475569", employee: "#64748b" };

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

/* ---------- Measured SVG connector system ----------
   OrgConnectorGroup draws the lines from one parent node down to a row
   of children by actually measuring their rendered positions on screen
   (getBoundingClientRect), instead of guessing pixel widths from CSS.
   That's what makes every elbow/spine align exactly under each card,
   at any breakpoint, with any number of siblings, any text length -
   there's nothing to get out of sync.

   parentRef  - ref to the DOM node of the single parent card above this row
   children   - array of React nodes, one per sibling in the row (each can
                itself be a full nested branch - only its OWN top card's
                position is used as the anchor, because that's always the
                first element painted inside each row item)               */
function OrgConnectorGroup({ parentRef, children, gapClassName = "gap-4" }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  const containerRef = useRef(null);
  const rowRef = useRef(null);
  const [lines, setLines] = useState(null);

  useLayoutEffect(() => {
    if (!containerRef.current || !rowRef.current || !parentRef.current) return undefined;

    const measure = () => {
      if (!containerRef.current || !rowRef.current || !parentRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const pRect = parentRef.current.getBoundingClientRect();
      const parentX = pRect.left + pRect.width / 2 - cRect.left;
      const parentY = pRect.bottom - cRect.top;

      const kids = Array.from(rowRef.current.children)
        .map((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) return null;
          return { x: r.left + r.width / 2 - cRect.left, y: r.top - cRect.top };
        })
        .filter(Boolean);

      if (!kids.length) { setLines(null); return; }

      const minKidY = Math.min(...kids.map((k) => k.y));
      const busY = parentY + Math.max(12, (minKidY - parentY) / 2);
      const minX = Math.min(...kids.map((k) => k.x));
      const maxX = Math.max(...kids.map((k) => k.x));

      setLines({ parentX, parentY, busY, kids, minX, maxX });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    ro.observe(rowRef.current);
    ro.observe(parentRef.current);

    window.addEventListener("resize", measure);
    // Catch late layout shifts: web-font swap, entrance animations
    // (scaleIn/fadeUp) settling, and images/avatars finishing paint.
    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 450);
    document.fonts?.ready?.then(measure).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center">
      <div aria-hidden style={{ height: 26 }} />
      {lines && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ overflow: "visible", width: "100%", height: "100%" }}
        >
          <line x1={lines.parentX} y1={lines.parentY} x2={lines.parentX} y2={lines.busY} stroke={LINE_COLOR} strokeWidth="1.5" />
          {lines.kids.length > 1 && (
            <line x1={lines.minX} y1={lines.busY} x2={lines.maxX} y2={lines.busY} stroke={LINE_COLOR} strokeWidth="1.5" />
          )}
          {lines.kids.map((k, i) => (
            <line
              key={i}
              x1={k.x}
              y1={lines.kids.length > 1 ? lines.busY : lines.parentY}
              x2={k.x}
              y2={k.y}
              stroke={LINE_COLOR}
              strokeWidth="1.5"
            />
          ))}
        </svg>
      )}
      <div ref={rowRef} className={`flex flex-row flex-nowrap items-start justify-center ${gapClassName}`}>
        {items.map((item, i) => (
          <div key={item?.key ?? i} className="min-w-0">{item}</div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ initials, sizeClass = "w-11 h-11 sm:w-12 sm:h-12", textClass = "text-sm sm:text-base", bg = BRAND }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white shrink-0 ${sizeClass} ${textClass}`}
      style={{ background: bg, boxShadow: `0 2px 8px ${bg}40`, letterSpacing: "0.02em" }}
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

function YouPill() {
  return <span className="su-you-pill"></span>;
}

const SuperAdminNode = ({ nodeRef, name, role, initials, delay = 0, onClick, isYou }) => {
  return (
    <div ref={nodeRef} className="opacity-0 shrink-0" style={{ animation: `scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms forwards` }}>
      <div
        className="su-card-hover su-card-sa w-[164px] sm:w-[190px] md:w-[210px] lg:w-[225px] bg-white border-[1.5px] border-[#e8edf5] rounded-2xl p-3 sm:p-4 md:p-5 flex flex-col items-center relative overflow-hidden shadow-sm"
        onClick={onClick}
      >
        {isYou && <YouPill />}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0f172a] to-[#334155] rounded-t-2xl" />
        <Avatar
          initials={initials}
          sizeClass="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-[52px] lg:h-[52px]"
          textClass="text-sm sm:text-base md:text-lg"
          bg={NODE_COLOR.sa}
        />
        <p className="text-xs sm:text-sm md:text-base font-bold text-slate-900 mt-2.5 sm:mt-3 text-center break-words">{name}</p>
        <p className="text-[10px] sm:text-[11px] md:text-xs text-gray-500 mt-1 text-center break-words">{role}</p>
      </div>
    </div>
  );
};

const AdminNode = ({ nodeRef, admin, delay = 0, dimmed, highlighted, onClick }) => {
  const name = fullName(admin);
  return (
    <div ref={nodeRef} className="opacity-0 shrink-0" style={{ animation: `scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms forwards` }}>
      <div
        className={`su-card-hover w-[136px] sm:w-[158px] md:w-[174px] lg:w-[184px] bg-white border-[1.5px] border-[#e8edf5] rounded-xl p-2.5 sm:p-3 md:p-4 flex flex-col items-center relative overflow-hidden shadow-sm ${highlighted ? "su-card-highlight" : ""} ${dimmed ? "su-card-dim" : ""}`}
        onClick={onClick}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-500 to-slate-400 rounded-t-xl" />
        <Avatar
          initials={getInitials(admin.f_name, admin.l_name)}
          sizeClass="w-9 h-9 sm:w-10 sm:h-10 md:w-10 md:h-10 lg:w-11 lg:h-11"
          textClass="text-xs sm:text-[13px]"
          bg={NODE_COLOR.admin}
        />
        <p className="text-[11px] sm:text-xs md:text-[13px] font-semibold text-slate-900 mt-2 sm:mt-2.5 text-center max-w-[108px] sm:max-w-[130px] md:max-w-[140px] truncate w-full">{name}</p>
        <p className="text-[9.5px] sm:text-[10px] md:text-[11px] text-gray-400 mt-1 text-center max-w-[108px] sm:max-w-[130px] md:max-w-[140px] truncate w-full">{getDepartmentName(admin.department)}</p>
        <p className="text-[9.5px] sm:text-[10px] md:text-[11px] text-gray-400 mt-0.5 text-center max-w-[108px] sm:max-w-[130px] md:max-w-[140px] truncate w-full">{admin.designation || "—"}</p>
        <p className="text-[9px] sm:text-[9.5px] md:text-[10px] text-gray-400 mt-0.5 text-center max-w-[108px] sm:max-w-[130px] md:max-w-[140px] truncate w-full" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{admin.empid || "—"}</p>
      </div>
    </div>
  );
};

const ManagerNode = ({ nodeRef, manager, delay = 0, dimmed, highlighted, onClick }) => {
  const name = fullName(manager);
  return (
    <div ref={nodeRef} className="opacity-0 shrink-0" style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards` }}>
      <div
        className={`su-card-hover w-[118px] sm:w-[138px] md:w-[152px] lg:w-[160px] bg-[#f9fbfe] border-[1.5px] border-[#e4edf6] rounded-lg p-2 sm:p-2.5 md:p-3 flex flex-col items-center relative overflow-hidden shadow-sm ${highlighted ? "su-card-highlight" : ""} ${dimmed ? "su-card-dim" : ""}`}
        onClick={onClick}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-300 rounded-t-lg" />
        <Avatar
          initials={getInitials(manager.f_name, manager.l_name)}
          sizeClass="w-7 h-7 sm:w-8 sm:h-8 md:w-[34px] md:h-[34px]"
          textClass="text-[10px] sm:text-[11px] md:text-xs"
          bg={NODE_COLOR.manager}
        />
        <p className="text-[10px] sm:text-[11px] md:text-xs font-semibold text-slate-800 mt-1.5 sm:mt-2 text-center max-w-[94px] sm:max-w-[110px] md:max-w-[120px] truncate w-full">{name}</p>
        <p className="text-[9px] sm:text-[9.5px] md:text-[10.5px] text-slate-400 mt-0.5 text-center max-w-[94px] sm:max-w-[110px] md:max-w-[120px] truncate w-full">{manager.department ? getDepartmentName(manager.department) : "—"}</p>
        <p className="text-[9px] sm:text-[9.5px] md:text-[10.5px] text-slate-400 mt-0.5 text-center max-w-[94px] sm:max-w-[110px] md:max-w-[120px] truncate w-full">{manager.designation || "—"}</p>
        <p className="text-[8.5px] sm:text-[9px] md:text-[9.5px] text-slate-400 mt-0.5 text-center max-w-[94px] sm:max-w-[110px] md:max-w-[120px] truncate w-full" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{manager.empid || "—"}</p>
      </div>
    </div>
  );
};

const EmployeeNode = ({ nodeRef, employee, delay = 0, dimmed, highlighted, onClick }) => {
  const name = fullName(employee);
  return (
    <div ref={nodeRef} className="opacity-0 shrink-0" style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards` }}>
      <div
        className={`su-card-hover w-[100px] sm:w-[116px] md:w-[132px] lg:w-[140px] bg-[#fafbfc] border-[1.5px] border-[#e8edf5] rounded-lg p-1.5 sm:p-2 md:p-2.5 flex flex-col items-center relative ${highlighted ? "su-card-highlight" : ""} ${dimmed ? "su-card-dim" : ""}`}
        onClick={onClick}
      >
        <Avatar
          initials={getInitials(employee.f_name, employee.l_name)}
          sizeClass="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7"
          textClass="text-[8px] sm:text-[9px]"
          bg={NODE_COLOR.employee}
        />
        <p className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-slate-800 mt-1 sm:mt-1.5 text-center max-w-[80px] sm:max-w-[92px] md:max-w-[100px] truncate w-full">{name}</p>
        <p className="text-[8.5px] sm:text-[9px] md:text-[10px] text-slate-400 mt-0.5 text-center max-w-[80px] sm:max-w-[92px] md:max-w-[100px] truncate w-full">{employee.department ? getDepartmentName(employee.department) : "—"}</p>
        <p className="text-[8.5px] sm:text-[9px] md:text-[10px] text-slate-400 mt-0.5 text-center max-w-[80px] sm:max-w-[92px] md:max-w-[100px] truncate w-full">{employee.designation || "—"}</p>
        <p className="text-[8px] sm:text-[8.5px] md:text-[9.5px] text-slate-400 mt-0.5 text-center max-w-[80px] sm:max-w-[92px] md:max-w-[100px] truncate w-full" style={{ fontFamily: "'JetBrains Mono',monospace" }}>{employee.empid || "—"}</p>
      </div>
    </div>
  );
};

function SkeletonTree() {
  return (
    <div className="flex flex-col items-center gap-0 w-full min-w-0">
      <Skeleton w={164} h={110} r={16} />
      <div className="w-1.5 h-6 sm:h-7 bg-gray-200 mx-auto" />
      <div className="flex gap-3 sm:gap-4 md:gap-5 justify-center w-full min-w-0">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col items-center min-w-0">
            <div className="w-1.5 h-4 sm:h-5 bg-gray-200 mx-auto" />
            <Skeleton w={136} h={92} r={13} />
            <div className="w-1.5 h-4 sm:h-5 bg-gray-200 mx-auto" />
            <div className="flex gap-2 sm:gap-2.5 md:gap-3.5 justify-center w-full min-w-0">
              {[1, 2].map(j => (
                <div key={j} className="flex flex-col items-center min-w-0">
                  <div className="w-1.5 h-3 sm:h-4 bg-gray-200 mx-auto" />
                  <Skeleton w={100} h={70} r={10} />
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

  const accentColor = isSA ? NODE_COLOR.sa : isAdmin ? NODE_COLOR.admin : isManager ? NODE_COLOR.manager : NODE_COLOR.employee;
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
      ["Phone",       person.personal_contact || "—"],
      ["Gender",      person.gender || "—"],
      ["Marital",     person.marital_status || "—"],
      ["Designation", person.designation || "—"],
      ["Status",      person.status || "—"],
    ];
    if (isManager) return [
      ["Emp ID",      person.empid || "—"],
      ["Email",       person.work_email],
      ["Phone",       person.personal_contact || "—"],
      ["Gender",      person.gender || "—"],
      ["Marital",     person.marital_status || "—"],
      ["Department",  getDepartmentName(person.department)],
      ["Designation", person.designation || "—"],
      ["Location",    person.office_location || "—"],
    ];
    return [
      ["Emp ID",      person.empid || "—"],
      ["Email",       person.work_email],
      ["Phone",       person.personal_contact || "—"],
      ["Gender",      person.gender || "—"],
      ["Marital",     person.marital_status || "—"],
      ["Department",  getDepartmentName(person.department)],
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
                <Badge color="#374151" bg="#f3f4f6">{person.department ? getDepartmentName(person.department) : person.designation}</Badge>
              )}
            </div>
          </div>

          {!isSA && (
            <div className="flex gap-2 mb-5 flex-wrap min-w-0">
              {["info", "reviews"].map((t) => (
                <button
                  key={t}
                  className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all min-h-[40px] flex items-center shrink-0 ${tab === t ? "bg-[#730042] text-white border-[#730042] shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                  onClick={() => setTab(t)}
                >
                  {t === "info" ? "Information" : "Reviews"}
                </button>
              ))}
            </div>
          )}

          {(tab === "info" || isSA) && !isSA && !isAdmin && (
            <ReportingChain uid={person._id} role={type} />
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

          {tab === "reviews" && !isSA && <ReviewsTab uid={person._id} role={type} />}
        </div>
      </div>
    </>
  );
}

// Shows who this employee/manager reports to (manager, then the admin
// that manager sits under). Relies on the manager/admin fields the
// getperticularemployee/getperticularemanager endpoints now return -
// previously the employee endpoint's manager lookup was broken (queried
// Managermodel by the employee's own _id) so this was never renderable.
function ReportingChain({ uid, role }) {
  const fetchFn = role === "manager" ? useGetParticularManager : useGetParticularEmployee;
  const { data, isLoading } = fetchFn(uid);

  if (isLoading) return null;

  const manager = data?.manager;
  const admin   = data?.admin;

  if (!manager && !admin) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3 min-w-0">
      <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium shrink-0">Reports to</span>
      {manager && (
        <button
          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 transition-colors max-w-full truncate"
          title={`${fullName(manager)} · Manager`}
        >
          {fullName(manager)} <span className="text-slate-400">· Manager</span>
        </button>
      )}
      {admin && (
        <>
          <span className="text-gray-300 text-xs shrink-0">→</span>
          <button
            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 transition-colors max-w-full truncate"
            title={`${fullName(admin)} · Admin`}
          >
            {fullName(admin)} <span className="text-slate-400">· Admin</span>
          </button>
        </>
      )}
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

/* ManagerBranch renders a manager node plus (recursively) any sub-managers
   and employees under it. It owns its own node ref so OrgConnectorGroup
   can measure exactly where this manager's card sits, and draws its own
   OrgConnectorGroup for whatever is nested beneath it. */
function ManagerBranch({ manager, allManagers, employees, matchName, hasQ, parentMatched, onNodeClick, delay = 0 }) {
  const nodeRef = useRef(null);
  const mgrMatch  = hasQ && matchName(manager.f_name, manager.l_name, manager.department, manager.designation);
  const mgrDimmed = hasQ && !mgrMatch && !parentMatched;
  const mgrId = idStr(manager._id);

  const subManagers = allManagers.filter((m) => idStr(m.reporting_manager) === mgrId && m.reporting_manager_model === "Manager");
  const mgrEmps = employees.filter((e) => idStr(e.Under_manager) === mgrId);

  const hasChildren = subManagers.length > 0 || mgrEmps.length > 0;

  return (
    <div className="org-branch">
      <ManagerNode
        nodeRef={nodeRef}
        manager={manager}
        delay={delay}
        highlighted={mgrMatch}
        dimmed={mgrDimmed}
        onClick={() => onNodeClick(manager, "manager")}
      />

      {hasChildren && (
        <OrgConnectorGroup parentRef={nodeRef} gapClassName="gap-1.5 sm:gap-2 md:gap-2.5">
          {[
            ...subManagers.map((sub, i) => (
              <ManagerBranch
                key={sub._id}
                manager={sub}
                allManagers={allManagers}
                employees={employees}
                matchName={matchName}
                hasQ={hasQ}
                parentMatched={mgrMatch || parentMatched}
                onNodeClick={onNodeClick}
                delay={i * 50}
              />
            )),
            ...mgrEmps.map((emp, i) => {
              const empMatch  = hasQ && matchName(emp.f_name, emp.l_name, emp.department, emp.designation);
              const empDimmed = hasQ && !empMatch && !mgrMatch && !parentMatched;
              return (
                <EmployeeBranch
                  key={emp._id}
                  employee={emp}
                  delay={i * 45}
                  highlighted={empMatch}
                  dimmed={empDimmed}
                  onClick={() => onNodeClick(emp, "employee")}
                />
              );
            }),
          ]}
        </OrgConnectorGroup>
      )}
    </div>
  );
}

// Thin wrapper so a leaf employee card also owns a ref the same way a
// branch does - keeps OrgConnectorGroup's "measure my first child" rule
// consistent whether the row item is a leaf or a whole nested branch.
function EmployeeBranch({ employee, delay, highlighted, dimmed, onClick }) {
  const nodeRef = useRef(null);
  return (
    <div className="org-branch">
      <EmployeeNode nodeRef={nodeRef} employee={employee} delay={delay} highlighted={highlighted} dimmed={dimmed} onClick={onClick} />
    </div>
  );
}

// AdminBranch mirrors ManagerBranch one level up: an admin card plus
// (via OrgConnectorGroup) the row of managers reporting to it.
function AdminBranch({ admin, managers, employees, matchName, hasQ, onNodeClick, delay = 0 }) {
  const nodeRef = useRef(null);
  const admMatch  = hasQ && matchName(admin.f_name, admin.l_name, "", admin.designation);
  const admDimmed = hasQ && !admMatch;
  const adminId   = idStr(admin._id);

  const admManagers = managers.filter(
    (m) => idStr(m.reporting_manager) === adminId && m.reporting_manager_model === "Admin"
  );

  return (
    <div className="org-branch">
      <AdminNode
        nodeRef={nodeRef}
        admin={admin}
        delay={delay}
        highlighted={admMatch}
        dimmed={admDimmed}
        onClick={() => onNodeClick(admin, "admin")}
      />

      {admManagers.length > 0 ? (
        <OrgConnectorGroup parentRef={nodeRef} gapClassName="gap-2 sm:gap-3 md:gap-3.5">
          {admManagers.map((mgr, mi) => (
            <ManagerBranch
              key={mgr._id}
              manager={mgr}
              allManagers={managers}
              employees={employees}
              matchName={matchName}
              hasQ={hasQ}
              parentMatched={admMatch}
              onNodeClick={onNodeClick}
              delay={mi * 55}
            />
          ))}
        </OrgConnectorGroup>
      ) : (
        <p className="mt-3 text-[10px] sm:text-[11px] text-gray-300 italic">No managers under this admin</p>
      )}
    </div>
  );
}

function OrgTree({ superAdmin, admins, managers, employees, loading, searchQuery, onNodeClick }) {
  const saRef = useRef(null);

  if (loading) return <SkeletonTree />;

  const q    = normalize(searchQuery);
  const hasQ = q.length > 0;

  const matchName = (f = "", l = "", dept = "", desig = "") => {
    if (!hasQ) return false;
    return normalize(`${f} ${l}`).includes(q) ||
           normalize(dept).includes(q) ||
           normalize(desig).includes(q);
  };

  return (
    <div className="org-tree-root w-max min-w-full mx-auto">
      <SuperAdminNode
        nodeRef={saRef}
        name={fullName(superAdmin) || "Super Admin"}
        role={superAdmin?.organisation_name || "Super Admin"}
        initials={getInitials(superAdmin?.f_name, superAdmin?.l_name)}
        delay={60}
        isYou
        onClick={() => onNodeClick(superAdmin, "superadmin")}
      />

      {admins.length > 0 ? (
        <OrgConnectorGroup parentRef={saRef} gapClassName="gap-3 sm:gap-4 md:gap-5">
          {admins.map((admin, ai) => (
            <AdminBranch
              key={admin._id}
              admin={admin}
              managers={managers}
              employees={employees}
              matchName={matchName}
              hasQ={hasQ}
              onNodeClick={onNodeClick}
              delay={340 + ai * 60}
            />
          ))}
        </OrgConnectorGroup>
      ) : (
        !loading && (
          <div className="mt-9 px-6 py-4 rounded-xl border-[1.5px] border-dashed border-gray-200 text-xs sm:text-sm text-gray-300 bg-[#fafbfc] min-w-0">
            No admins created yet
          </div>
        )
      )}

      <OrphanNotice admins={admins} managers={managers} employees={employees} onNodeClick={onNodeClick} />
    </div>
  );
}

// Surfaces any manager/employee whose reporting_manager / Under_manager
// doesn't resolve to a node that's actually in the current admins/
// managers arrays (deleted parent, bad id, mismatched
// reporting_manager_model, etc). Previously these records were just
// dropped from the tree with no indication anything was missing, while
// still being counted in the header stats - the exact mismatch reported
// against this chart ("6 Employees" stat vs. only 2 cards visible).
function OrphanNotice({ admins, managers, employees, onNodeClick }) {
  const adminIdSet   = new Set(admins.map((a) => idStr(a._id)));
  const managerIdSet = new Set(managers.map((m) => idStr(m._id)));

  const orphanManagers = managers.filter((m) => {
    if (m.reporting_manager_model === "Admin")   return !adminIdSet.has(idStr(m.reporting_manager));
    if (m.reporting_manager_model === "Manager") return !managerIdSet.has(idStr(m.reporting_manager));
    return true; // no recognizable parent reference at all
  });

  const orphanEmployees = employees.filter((e) => !managerIdSet.has(idStr(e.Under_manager)));

  const total = orphanManagers.length + orphanEmployees.length;
  if (total === 0) return null;

  return (
    <div className="mt-9 w-full max-w-xl mx-auto px-4 sm:px-5 py-3 sm:py-4 rounded-xl border-[1.5px] border-dashed border-amber-300 bg-amber-50 min-w-0">
      <p className="text-xs sm:text-sm font-semibold text-amber-800">
        {total} unassigned {total === 1 ? "record" : "records"} not shown in the chart above
      </p>
      <p className="text-[11px] sm:text-xs text-amber-700 mt-1">
        {orphanManagers.length > 0 && `${orphanManagers.length} manager${orphanManagers.length !== 1 ? "s" : ""}`}
        {orphanManagers.length > 0 && orphanEmployees.length > 0 && " and "}
        {orphanEmployees.length > 0 && `${orphanEmployees.length} employee${orphanEmployees.length !== 1 ? "s" : ""}`}
        {" "}reference a manager/admin that no longer exists or was never set. Click a name to open and reassign.
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
  const refetchOpts = { staleTime: 1000 * 60 * 5, refetchInterval: REFRESH_MS, refetchOnWindowFocus: false };

  const { data: saData,  isLoading: loadingSA  } = useGetMeSuperAdmin();
  const { data: admData, isLoading: loadingAdm } = useGetAllAdmins(refetchOpts);
  const { data: mgrData, isLoading: loadingMgr } = useGetAllManagers(refetchOpts);
  const { data: empData, isLoading: loadingEmp } = useGetAllEmployees(refetchOpts);
  const { data: orgData }                         = useGetOrgInfo();

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected,    setSelected]    = useState(null);
  const [exporting,   setExporting]   = useState(false);
  const [exportDone,  setExportDone]  = useState(false);
  const inputRef = useRef(null);
  const treeRef = useRef(null);

  const superAdmin = saData?.superAdmin || saData;
  const admins     = useMemo(() => admData?.admins || [], [admData]);
  const managers   = useMemo(() => {
    const raw = mgrData?.managers || mgrData || [];
    return Array.isArray(raw) ? raw : [];
  }, [mgrData]);
  const employees  = useMemo(() => {
    // /superadmin/getallemployee returns a MERGED directory list under
    // `users`: admins + managers + employees, each tagged with `type`.
    // That shape is intentional (Payroll, dashboard, and the people-
    // management pages all consume the merged list for search/lookup),
    // but the org chart specifically needs only employee-level nodes -
    // admins/managers are already fetched from their own endpoints
    // above. Without this filter, admins/managers get double-counted
    // in the "Employees"/"Total" stats even though they never render
    // as duplicate cards in the tree (they lack Under_manager).
    const raw = empData?.users || empData || [];
    const list = Array.isArray(raw) ? raw : [];
    return list.some((p) => p?.type)
      ? list.filter((p) => p.type === "employee")
      : list;
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

  function buildCsvRows() {
    const rows = [["Role", "Emp ID", "Name", "Email", "Phone", "Department", "Designation", "Office Location", "Reports To"]];

    if (superAdmin) {
      rows.push(["Super Admin", "", fullName(superAdmin), superAdmin.email || "", "", "", "", "", ""]);
    }

    admins.forEach((a) => {
      rows.push(["Admin", a.empid || "", fullName(a), a.work_email || "", a.personal_contact || "", a.department ? getDepartmentName(a.department) : "", a.designation || "", a.office_location || "", "Super Admin"]);
    });

    managers.forEach((m) => {
      const parentLabel = m.reporting_manager_model === "Admin"
        ? (admins.find((a) => idStr(a._id) === idStr(m.reporting_manager)) ? `Admin: ${fullName(admins.find((a) => idStr(a._id) === idStr(m.reporting_manager)))}` : "Unassigned")
        : m.reporting_manager_model === "Manager"
          ? (managers.find((mm) => idStr(mm._id) === idStr(m.reporting_manager)) ? `Manager: ${fullName(managers.find((mm) => idStr(mm._id) === idStr(m.reporting_manager)))}` : "Unassigned")
          : "Unassigned";
      rows.push(["Manager", m.empid || "", fullName(m), m.work_email || "", m.personal_contact || "", m.department ? getDepartmentName(m.department) : "", m.designation || "", m.office_location || "", parentLabel]);
    });

    employees.forEach((e) => {
      const mgr = managers.find((m) => idStr(m._id) === idStr(e.Under_manager));
      rows.push(["Employee", e.empid || "", fullName(e), e.work_email || "", e.personal_contact || "", e.department ? getDepartmentName(e.department) : "", e.designation || "", e.office_location || "", mgr ? `Manager: ${fullName(mgr)}` : "Unassigned"]);
    });

    return rows;
  }

  function exportCsv() {
    const rows = buildCsvRows();
    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${normalize(orgName).replace(/\s+/g, "-") || "organisation"}-org-chart-${Date.now()}.csv`);
  }

  async function exportPng() {
    if (!treeRef.current || exporting) return;
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
      setExportDone(true);
      setTimeout(() => setExportDone(false), 2600);
    } catch (err) {
      treeRef.current?.classList.remove("su-export-flat");
      window.alert("Could not generate the image export. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const statItems = [
    { label: "Admins",    value: admins.length,    color: "#334155" },
    { label: "Managers",  value: managers.length,  color: "#475569" },
    { label: "Employees", value: employees.length, color: "#64748b" },
    { label: "Total",     value: totalNodes,       color: "#0f172a" },
  ];

  return (
    <div className="su-org su-shell w-full max-w-full min-w-0 bg-[#f4f7fb] flex flex-col overflow-x-hidden">
      <style>{STYLES}</style>

      <header className="w-full max-w-full min-w-0 bg-white border-b border-gray-200 shadow-sm overflow-hidden">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 h-14 sm:h-16 flex items-center justify-between gap-4 min-w-0">
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
              <>
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
            {loading ? "Loading…" : `${orgName} · ${totalNodes} nodes · auto-refreshes every 2 min`}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6 xl:gap-8 mb-5 sm:mb-6 lg:mb-8 min-w-0 max-w-full">
          {statItems.map(({ label, value, color }, i) => (
            <div
              key={label}
              className="relative bg-white border border-gray-200 rounded-xl lg:rounded-2xl p-2.5 sm:p-4 lg:p-5 flex items-center gap-2 sm:gap-4 lg:gap-4 shadow-sm overflow-hidden hover:shadow-md transition-shadow min-w-0"
              style={{ animation: `fadeUp 0.35s ease ${100 + i * 55}ms forwards`, opacity: 0 }}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: color }}></div>
              <div
                className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg lg:rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}12` }}
              >
                <div
                  className="w-3 h-3 sm:w-5 sm:h-5 rounded-full"
                  style={{ background: color, boxShadow: `0 2px 6px ${color}40` }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-xl lg:text-2xl font-bold text-slate-900 leading-none truncate" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
                  {loading ? "—" : value}
                </div>
                <div className="text-[9px] sm:text-xs text-gray-400 mt-1 font-medium truncate">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full max-w-full min-w-0 bg-white border border-gray-200 rounded-xl lg:rounded-2xl shadow-sm overflow-hidden flex flex-col">

          <div className="w-full min-w-0 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100/50">
            <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">Hierarchy</span>
            <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold shrink-0" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
              {loading ? "…" : `${totalNodes} nodes`}
            </span>
            {searchQuery && matchCount > 0 && (
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-[#730042]/10 text-[#730042] font-semibold shrink-0">
                {matchCount} highlighted
              </span>
            )}
            <span className="hidden sm:block ml-auto text-xs text-gray-400 truncate">Click any card for details</span>
          </div>

          <div
            ref={treeRef}
            className="su-scroll w-full max-w-full min-w-0 overflow-x-auto overflow-y-visible bg-white p-3 sm:p-6 lg:p-8"
          >
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
          <div className="flex gap-2 sm:gap-4 lg:gap-6 mt-4 lg:mt-6 justify-center flex-wrap min-w-0 max-w-full">
            {[
              { dot: NODE_COLOR.sa,       label: "Super Admin", glow: true },
              { dot: NODE_COLOR.admin,    label: "Admin"   },
              { dot: NODE_COLOR.manager,  label: "Manager" },
              { dot: NODE_COLOR.employee, label: "Employee", border: "#b0b8c8" },
            ].map(({ dot, label, border, glow }) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gray-400 shrink-0">
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

      {exportDone && (
        <div
          className="fixed bottom-4 right-4 left-4 sm:left-auto z-[9999] flex items-center justify-center sm:justify-start gap-2 px-4 py-3 rounded-lg bg-slate-900 text-white text-sm font-medium shadow-2xl"
          style={{ animation: "fadeIn 0.2s ease forwards" }}
        >
          <svg className="w-4 h-4 text-green-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
          </svg>
          PNG exported!
        </div>
      )}
    </div>
  );
}