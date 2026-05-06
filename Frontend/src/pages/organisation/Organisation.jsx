"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Crown, Users, Building2, Shield, User,
  Download, Search, ChevronRight, X, Loader2, CheckCircle2,
} from "lucide-react";

import { useGetMeAdmin, useFindAllManagers } from "../../auth/server-state/adminauth/adminauth.hook";
import { useGetAllEmployee, useGetEmployeeStats, useGetOrgInfo } from "../../auth/server-state/adminother/adminother.hook";

// ── Helpers ───────────────────────────────────────────────────────
const getInitials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();
const normalize   = (s = "") => s.toLowerCase().trim();

const matchesPerson = (fname, lname, dept, desig, q) => {
  if (!q) return false;
  return (
    normalize(`${fname} ${lname}`).includes(q) ||
    normalize(dept).includes(q) ||
    normalize(desig).includes(q)
  );
};

// ── Department color palette ──────────────────────────────────────
const DEPT_COLORS = [
  { bar: "#6366f1", light: "#eef2ff", text: "#4338ca" },
  { bar: "#0ea5e9", light: "#e0f2fe", text: "#0369a1" },
  { bar: "#10b981", light: "#d1fae5", text: "#047857" },
  { bar: "#f59e0b", light: "#fef3c7", text: "#b45309" },
  { bar: "#ec4899", light: "#fce7f3", text: "#be185d" },
  { bar: "#8b5cf6", light: "#ede9fe", text: "#6d28d9" },
];

// ── Global CSS ────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  .org-root, .org-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn  { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
  @keyframes shimmer  { 0% { background-position:-600px 0; } 100% { background-position:600px 0; } }
  @keyframes drawH    { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  @keyframes drawV    { from { transform:scaleY(0); } to { transform:scaleY(1); } }
  @keyframes spin     { to { transform:rotate(360deg); } }
  @keyframes slideDown{ from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }

  .org-card-hover { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .org-card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08) !important; }

  .org-card-highlight {
    outline: 2px solid #6366f1 !important;
    outline-offset: 2px;
    box-shadow: 0 0 0 5px rgba(99,102,241,0.13) !important;
  }
  .org-card-dim { opacity: 0.22; filter: grayscale(0.3); transition: opacity 0.2s, filter 0.2s; }

  .stat-card-hover { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .stat-card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.06) !important; }

  .org-scroll::-webkit-scrollbar { height: 4px; width: 4px; }
  .org-scroll::-webkit-scrollbar-track { background: transparent; }
  .org-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

  .hdr-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px;
    border: 1px solid #e2e8f0; background: #fff; color: #475569;
    font-size: 13px; font-weight: 500; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.13s, border-color 0.13s, color 0.13s;
    white-space: nowrap;
  }
  .hdr-btn:hover { background: #f8fafc; border-color: #cbd5e1; color: #1e293b; }
  .hdr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .hdr-btn-primary { background: #1e293b; color: #fff; border-color: #1e293b; }
  .hdr-btn-primary:hover { background: #0f172a; border-color: #0f172a; color: #fff; }

  .search-wrap {
    display: flex; align-items: center; gap: 8px;
    border: 1px solid #6366f1; border-radius: 8px;
    padding: 0 10px; background: #fff; height: 36px; width: 268px;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
    transition: box-shadow 0.15s;
  }
  .search-wrap:focus-within { box-shadow: 0 0 0 4px rgba(99,102,241,0.18); }
  .search-input {
    border: none; outline: none; background: transparent;
    font-size: 13px; color: #1e293b; font-family: 'DM Sans', sans-serif;
    flex: 1; min-width: 0;
  }
  .search-input::placeholder { color: #94a3b8; }
  .clear-btn { background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; padding: 0; }
  .clear-btn:hover { color: #475569; }

  .match-pill {
    animation: slideDown 0.18s ease forwards;
    display: flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px;
    background: #eef2ff; color: #4338ca;
    font-size: 11px; font-weight: 600;
  }

  .export-toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px; border-radius: 10px;
    background: #1e293b; color: #fff;
    font-size: 13px; font-weight: 500;
    box-shadow: 0 8px 28px rgba(0,0,0,0.18);
    animation: slideDown 0.22s ease forwards;
    font-family: 'DM Sans', sans-serif;
    pointer-events: none;
  }

  .no-results-banner {
    margin-bottom: 16px; padding: 12px 16px; border-radius: 10px;
    background: #fef9c3; border: 1px solid #fde68a;
    font-size: 13px; color: #92400e;
    display: flex; align-items: center; gap: 8px;
    animation: slideDown 0.2s ease forwards;
  }
`;

// ── Skeleton ──────────────────────────────────────────────────────
function Skeleton({ w, h, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: "linear-gradient(90deg,#f1f5f9 25%,#e9eef5 50%,#f1f5f9 75%)",
      backgroundSize: "600px 100%",
      animation: "shimmer 1.4s infinite linear",
    }} />
  );
}

// ── Connectors ────────────────────────────────────────────────────
function VLine({ h = 32, delay = 0 }) {
  return (
    <div style={{
      width: 1, height: h, margin: "0 auto", flexShrink: 0,
      background: "#e2e8f0", transformOrigin: "top",
      animation: `drawV 0.25s ease ${delay}ms forwards`, transform: "scaleY(0)",
    }} />
  );
}

function HLine({ w, delay = 0 }) {
  return (
    <div style={{
      width: w, height: 1, flexShrink: 0,
      background: "#e2e8f0", transformOrigin: "center",
      animation: `drawH 0.3s ease ${delay}ms forwards`, transform: "scaleX(0)",
    }} />
  );
}

// ── Highlight text ────────────────────────────────────────────────
function Hi({ text = "", query = "", style = {} }) {
  if (!query) return <span style={style}>{text}</span>;
  const idx = normalize(text).indexOf(normalize(query));
  if (idx === -1) return <span style={style}>{text}</span>;
  return (
    <span style={style}>
      {text.slice(0, idx)}
      <mark style={{ background: "#fef08a", color: "#713f12", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

// ── CEO node ──────────────────────────────────────────────────────
function CeoNode({ name, initials, delay = 0, dimmed, highlighted }) {
  return (
    <div style={{ animation: `scaleIn 0.35s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div className={`org-card-hover${highlighted ? " org-card-highlight" : ""}${dimmed ? " org-card-dim" : ""}`} style={{ width: 200, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 16px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#1e293b", borderRadius: "14px 14px 0 0" }} />
        <span style={{ position: "absolute", top: 11, right: 12, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>ADMIN</span>
        <div style={{ width: 54, height: 54, borderRadius: "50%", background: "#1e293b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, marginBottom: 12, flexShrink: 0 }}>{initials}</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: 0, textAlign: "center" }}>{name}</p>
        <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0", textAlign: "center" }}>Administrator</p>
        <div style={{ marginTop: 12 }}>
          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 500 }}>Root</span>
        </div>
      </div>
    </div>
  );
}

// ── Manager node ──────────────────────────────────────────────────
function ManagerNode({ name, subtitle, initials, colorCfg, delay = 0, dimmed, highlighted, q }) {
  return (
    <div style={{ animation: `fadeUp 0.35s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div className={`org-card-hover${highlighted ? " org-card-highlight" : ""}${dimmed ? " org-card-dim" : ""}`} style={{ width: 156, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 12px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: colorCfg.bar, borderRadius: "12px 12px 0 0" }} />
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: colorCfg.light, color: colorCfg.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, marginBottom: 9, flexShrink: 0 }}>{initials}</div>
        <Hi text={name}     query={q} style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textAlign: "center", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }} />
        <Hi text={subtitle} query={q} style={{ fontSize: 11, color: "#64748b", marginTop: 3, textAlign: "center", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }} />
        <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: colorCfg.light, color: colorCfg.text, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 9 }}>Manager</span>
      </div>
    </div>
  );
}

// ── Employee node ─────────────────────────────────────────────────
function EmployeeNode({ name, subtitle, initials, delay = 0, dimmed, highlighted, q }) {
  return (
    <div style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div className={`org-card-hover${highlighted ? " org-card-highlight" : ""}${dimmed ? " org-card-dim" : ""}`} style={{ width: 120, background: "#f8fafc", border: "1px solid #e9eef5", borderRadius: 10, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#e2e8f0", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, marginBottom: 7, flexShrink: 0 }}>{initials}</div>
        <Hi text={name}     query={q} style={{ fontSize: 11, fontWeight: 600, color: "#1e293b", textAlign: "center", maxWidth: 106, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }} />
        <Hi text={subtitle} query={q} style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, textAlign: "center", maxWidth: 106, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }} />
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent, delay = 0 }) {
  const [count, setCount] = useState(0);
  const num = parseInt(value) || 0;
  useEffect(() => {
    if (!num) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(num / 18));
    const t = setInterval(() => { cur = Math.min(cur + step, num); setCount(cur); if (cur >= num) clearInterval(t); }, 40);
    return () => clearInterval(t);
  }, [num]);

  return (
    <div className="stat-card-hover" style={{ animation: `fadeUp 0.35s ease ${delay}ms forwards`, opacity: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent, borderRadius: "12px 12px 0 0" }} />
      <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 600, color: "#0f172a", lineHeight: 1, margin: 0 }}>{count}</p>
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 5, fontWeight: 500, margin: "5px 0 0" }}>{label}</p>
      </div>
    </div>
  );
}

// ── Skeleton tree ─────────────────────────────────────────────────
function SkeletonTree() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Skeleton w={200} h={116} r={14} />
      <div style={{ width: 1, height: 32, background: "#e2e8f0" }} />
      <div style={{ display: "flex", gap: 40 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 1, height: 22, background: "#e2e8f0" }} />
            <Skeleton w={156} h={96} r={12} />
            <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />
            <div style={{ display: "flex", gap: 10 }}>
              {[1, 2].map(j => (
                <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 1, height: 16, background: "#e2e8f0" }} />
                  <Skeleton w={120} h={72} r={10} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Org Tree ──────────────────────────────────────────────────────
function OrgTree({ adminName, orgName, managers, employeesByMgr, loading, searchQuery }) {
  if (loading) return <SkeletonTree />;

  const q = normalize(searchQuery);
  const hasQ = q.length > 0;

  const matchedMgrIds = useMemo(() => {
    if (!hasQ) return new Set();
    return new Set(
      managers
        .filter(mgr =>
          matchesPerson(mgr.f_name, mgr.l_name, mgr.department, mgr.designation, q) ||
          (employeesByMgr[mgr._id] || []).some(e =>
            matchesPerson(e.f_name, e.l_name, e.department, e.designation, q)
          )
        )
        .map(m => m._id)
    );
  }, [q, managers, employeesByMgr, hasQ]);

  const adminMatch = hasQ && normalize(orgName || adminName || "").includes(q);

  const MGR_GAP = managers.length > 4 ? 14 : 32;
  const EMP_GAP = 10;
  const mgrTotalW = managers.length > 1 ? (managers.length - 1) * (156 + MGR_GAP) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: Math.max(600, managers.length * 200) }}>

      <CeoNode
        name={orgName || adminName}
        initials={getInitials((orgName || adminName || "AD").split(" ")[0], (orgName || adminName || "AD").split(" ")[1] || "M")}
        delay={80}
        highlighted={adminMatch}
        dimmed={hasQ && !adminMatch && matchedMgrIds.size > 0}
      />

      {managers.length > 0 && (
        <>
          <VLine h={30} delay={300} />
          {managers.length > 1 && <HLine w={mgrTotalW} delay={360} />}
        </>
      )}

      <div style={{ display: "flex", gap: MGR_GAP, justifyContent: "center", alignItems: "flex-start" }}>
        {managers.map((mgr, mi) => {
          const emps = employeesByMgr[mgr._id] || [];
          const colorCfg = DEPT_COLORS[mi % DEPT_COLORS.length];
          const mgrDelay = 460 + mi * 80;
          const empTotalW = emps.length > 1 ? (emps.length - 1) * (120 + EMP_GAP) : 0;
          const mgrMatch     = hasQ && matchesPerson(mgr.f_name, mgr.l_name, mgr.department, mgr.designation, q);
          const branchMatch  = hasQ && matchedMgrIds.has(mgr._id);
          const mgrDimmed    = hasQ && !branchMatch;

          return (
            <div key={mgr._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <VLine h={22} delay={mgrDelay - 80} />
              <ManagerNode
                name={`${mgr.f_name} ${mgr.l_name}`}
                subtitle={mgr.department || mgr.designation || "Manager"}
                initials={getInitials(mgr.f_name, mgr.l_name)}
                colorCfg={colorCfg} delay={mgrDelay}
                highlighted={mgrMatch} dimmed={mgrDimmed} q={searchQuery}
              />

              {emps.length > 0 && (
                <>
                  <VLine h={20} delay={mgrDelay + 110} />
                  {emps.length > 1 && <HLine w={empTotalW} delay={mgrDelay + 160} />}
                </>
              )}

              <div style={{ display: "flex", gap: EMP_GAP, justifyContent: "center" }}>
                {emps.map((emp, ei) => {
                  const empMatch  = hasQ && matchesPerson(emp.f_name, emp.l_name, emp.department, emp.designation, q);
                  const empDimmed = hasQ && !empMatch && !mgrMatch;
                  return (
                    <div key={emp._id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <VLine h={16} delay={mgrDelay + 220 + ei * 40} />
                      <EmployeeNode
                        name={`${emp.f_name} ${emp.l_name}`}
                        subtitle={emp.department || emp.designation || "Employee"}
                        initials={getInitials(emp.f_name, emp.l_name)}
                        delay={mgrDelay + 260 + ei * 40}
                        highlighted={empMatch} dimmed={empDimmed} q={searchQuery}
                      />
                    </div>
                  );
                })}
                {emps.length === 0 && (
                  <div style={{ marginTop: 8, padding: "7px 14px", borderRadius: 8, border: "1px dashed #e2e8f0", fontSize: 11, color: "#cbd5e1", background: "#fafafa", animation: `fadeIn 0.35s ease ${mgrDelay + 160}ms forwards`, opacity: 0 }}>
                    No employees yet
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {managers.length === 0 && (
          <div style={{ marginTop: 16, padding: "14px 28px", borderRadius: 10, border: "1px dashed #e2e8f0", fontSize: 13, color: "#cbd5e1", background: "#fafafa" }}>
            No managers added yet
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function OrganizationPage() {
  const { data: adminData }   = useGetMeAdmin();
  const { data: orgData }     = useGetOrgInfo();
  const { data: managersRes, isLoading: loadingMgrs } = useFindAllManagers();
  const { data: employeesRes, isLoading: loadingEmps } = useGetAllEmployee();
  const { data: statsRes }    = useGetEmployeeStats();

  // ── Search ────────────────────────────────────────────────────
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef(null);

  // ── Export ────────────────────────────────────────────────────
  const [exportStatus, setExportStatus] = useState(null); // null | "loading" | "done"
  const chartRef = useRef(null);

  // ── Data ──────────────────────────────────────────────────────
  const managers  = managersRes?.managers || [];
  const employees = useMemo(() =>
    (employeesRes?.users || []).filter(u => u.Under_manager != null),
  [employeesRes]);

  const employeesByMgr = useMemo(() =>
    managers.reduce((acc, mgr) => {
      acc[mgr._id] = employees.filter(
        e => e.Under_manager?._id === mgr._id || e.Under_manager === mgr._id
      );
      return acc;
    }, {}),
  [managers, employees]);

  const totalEmps  = employees.length;
  const totalMgrs  = managers.length;
  const totalDepts = [...new Set(managers.map(m => m.department).filter(Boolean))].length;
  const totalAll   = statsRes?.totalEmployees || (totalEmps + totalMgrs);
  const loading    = loadingMgrs || loadingEmps;
  const orgName    = orgData?.organisation_name || adminData?.organisation_name;
  const adminName  = adminData?.username || adminData?.email?.split("@")[0] || "Admin";

  // ── Search match count ────────────────────────────────────────
  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    const q = normalize(searchQuery);
    let n = 0;
    managers.forEach(mgr => {
      if (matchesPerson(mgr.f_name, mgr.l_name, mgr.department, mgr.designation, q)) n++;
      (employeesByMgr[mgr._id] || []).forEach(emp => {
        if (matchesPerson(emp.f_name, emp.l_name, emp.department, emp.designation, q)) n++;
      });
    });
    return n;
  }, [searchQuery, managers, employeesByMgr]);

  // ── Keyboard: Escape closes search ───────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Auto-focus on open ────────────────────────────────────────
  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [searchOpen]);

  // ── Export PNG via html2canvas ────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!chartRef.current || exportStatus === "loading") return;
    setExportStatus("loading");
    try {
      if (!window.html2canvas) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const canvas = await window.html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });
      const link = document.createElement("a");
      link.download = `org-chart-${(orgName || "organization").replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setExportStatus("done");
      setTimeout(() => setExportStatus(null), 2600);
    } catch (err) {
      console.error("Export failed:", err);
      setExportStatus(null);
    }
  }, [exportStatus, orgName]);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };

  return (
    <div className="org-root" style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <style>{STYLES}</style>

      {/* ── Topbar ── */}
      <div style={{ animation: "fadeIn 0.4s ease forwards", background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, gap: 16 }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{orgName || "Organization"}</span>
          <ChevronRight size={13} style={{ color: "#cbd5e1" }} />
          <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>Org Chart</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

          {/* Search toggle → inline search bar */}
          {searchOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "slideDown 0.2s ease forwards" }}>
              <div className="search-wrap">
                <Search size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  className="search-input"
                  placeholder="Search name, role, department…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="clear-btn" onClick={() => setSearchQuery("")} title="Clear">
                    <X size={13} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="match-pill">
                  {matchCount} match{matchCount !== 1 ? "es" : ""}
                </div>
              )}
              <button className="hdr-btn" onClick={closeSearch}>
                <X size={13} /> Close
              </button>
            </div>
          ) : (
            <button className="hdr-btn" onClick={() => setSearchOpen(true)}>
              <Search size={13} /> Search
            </button>
          )}

          {/* Export */}
          <button
            className="hdr-btn hdr-btn-primary"
            onClick={handleExport}
            disabled={loading || exportStatus === "loading"}
          >
            {exportStatus === "loading"
              ? <><Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> Exporting…</>
              : <><Download size={13} /> Export PNG</>
            }
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 28px 40px" }}>

        {/* Page title */}
        <div style={{ animation: "fadeUp 0.35s ease 60ms forwards", opacity: 0, marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.3px" }}>Organization structure</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "5px 0 0" }}>
            {loading ? "Loading…" : `${totalAll} total members across ${totalDepts || managers.length} departments`}
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
          <StatCard label="Total members" value={totalAll}  icon={Users}     accent="#6366f1" delay={100} />
          <StatCard label="Managers"       value={totalMgrs} icon={Shield}    accent="#0ea5e9" delay={150} />
          <StatCard label="Employees"      value={totalEmps} icon={User}      accent="#10b981" delay={200} />
          <StatCard label="Departments"    value={totalDepts || statsRes?.departments?.length || 0} icon={Building2} accent="#f59e0b" delay={250} />
        </div>

        {/* No-results banner */}
        {searchOpen && searchQuery && matchCount === 0 && (
          <div className="no-results-banner">
            <Search size={14} />
            No results for <strong style={{ marginLeft: 3 }}>"{searchQuery}"</strong> — try a different name, role, or department.
          </div>
        )}

        {/* Chart panel */}
        <div style={{ animation: "fadeIn 0.4s ease 300ms forwards", opacity: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>

          {/* Panel header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Crown size={15} style={{ color: "#94a3b8" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Hierarchy view</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
                {loading ? "—" : `${totalAll} nodes`}
              </span>
              {searchQuery && matchCount > 0 && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#eef2ff", color: "#4338ca", fontWeight: 600 }}>
                  {matchCount} highlighted
                </span>
              )}
            </div>

            {/* Manager color pills */}
            {!loading && managers.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {managers.slice(0, 5).map((mgr, i) => (
                  <span key={mgr._id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b", padding: "3px 9px", borderRadius: 6, background: DEPT_COLORS[i % DEPT_COLORS.length].light, fontWeight: 500 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: DEPT_COLORS[i % DEPT_COLORS.length].bar, flexShrink: 0 }} />
                    {mgr.f_name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Chart canvas (ref = export target) */}
          <div ref={chartRef} className="org-scroll" style={{ overflowX: "auto", padding: "40px 32px 36px", background: "#fff" }}>
            <OrgTree
              adminName={adminName}
              orgName={orgName}
              managers={managers}
              employeesByMgr={employeesByMgr}
              loading={loading}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {/* Footer legend */}
        {!loading && (
          <div style={{ display: "flex", gap: 24, marginTop: 16, justifyContent: "center", flexWrap: "wrap", animation: "fadeIn 0.4s ease 600ms forwards", opacity: 0 }}>
            {[
              { dot: "#1e293b", label: "Administrator" },
              { dot: "#6366f1", label: "Manager" },
              { dot: "#e2e8f0", label: "Employee", border: "#cbd5e1" },
              { dot: "#6366f1", label: "Search match", ring: true },
            ].map(({ dot, label, border, ring }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#94a3b8" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0, border: border ? `1.5px solid ${border}` : "none", boxShadow: ring ? "0 0 0 3px rgba(99,102,241,0.2)" : "none" }} />
                {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export toast */}
      {exportStatus && (
        <div className="export-toast">
          {exportStatus === "loading"
            ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Generating PNG…</>
            : <><CheckCircle2 size={15} style={{ color: "#4ade80" }} /> Chart exported successfully!</>
          }
        </div>
      )}
    </div>
  );
}