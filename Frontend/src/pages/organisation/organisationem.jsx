"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Crown, Users, Building2, User, MapPin,
  Download, Search, ChevronRight, X, Loader2, CheckCircle2,
} from "lucide-react";

// ── Only hooks that actually exist ────────────────────────────────────────────
import { useGetMeUser }
  from "../../auth/server-state/employee/employeeauth/employeeauth.hook";
import { useGetOrgInfoEmployee }
  from "../../auth/server-state/employee/employeeother/employeeother.hook";

// ── Helpers ───────────────────────────────────────────────────────────────────
const getInitials = (f = "", l = "") => `${f[0] || ""}${l[0] || ""}`.toUpperCase();
const normalize   = (s = "") => s.toLowerCase().trim();

const matchesPerson = (fname, lname, dept, desig, q) => {
  if (!q) return false;
  return (
    normalize(`${fname} ${lname}`).includes(q) ||
    normalize(dept  || "").includes(q) ||
    normalize(desig || "").includes(q)
  );
};

// ── Color palette ─────────────────────────────────────────────────────────────
const DEPT_COLORS = [
  { bar: "#6366f1", light: "#eef2ff", text: "#4338ca" },
  { bar: "#0ea5e9", light: "#e0f2fe", text: "#0369a1" },
  { bar: "#10b981", light: "#d1fae5", text: "#047857" },
  { bar: "#f59e0b", light: "#fef3c7", text: "#b45309" },
];

// ── Global CSS ────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  .org-root, .org-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn   { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
  @keyframes shimmer   { 0% { background-position:-600px 0; } 100% { background-position:600px 0; } }
  @keyframes drawV     { from { transform:scaleY(0); } to { transform:scaleY(1); } }
  @keyframes spin      { to { transform:rotate(360deg); } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulseRing {
    0%, 100% { box-shadow: 0 0 0 0   rgba(99,102,241,0.35), 0 6px 20px rgba(99,102,241,0.18); }
    50%       { box-shadow: 0 0 0 7px rgba(99,102,241,0.08), 0 8px 26px rgba(99,102,241,0.24); }
  }

  .org-card-hover { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .org-card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08) !important; }
  .org-card-highlight { outline: 2.5px solid #6366f1 !important; outline-offset: 2px; box-shadow: 0 0 0 5px rgba(99,102,241,0.13) !important; }
  .org-card-dim { opacity: 0.22; filter: grayscale(0.3); transition: opacity 0.2s, filter 0.2s; }
  .org-card-me  { animation: pulseRing 2.6s ease-in-out infinite !important; }

  .stat-card-hover { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .stat-card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.06) !important; }

  .org-scroll::-webkit-scrollbar       { height: 4px; width: 4px; }
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
  .hdr-btn:hover    { background: #f8fafc; border-color: #cbd5e1; color: #1e293b; }
  .hdr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .hdr-btn-primary  { background: #1e293b; color: #fff; border-color: #1e293b; }
  .hdr-btn-primary:hover { background: #0f172a; border-color: #0f172a; color: #fff; }

  .search-wrap {
    display: flex; align-items: center; gap: 8px;
    border: 1px solid #6366f1; border-radius: 8px;
    padding: 0 10px; background: #fff; height: 36px; width: 268px;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1); transition: box-shadow 0.15s;
  }
  .search-wrap:focus-within { box-shadow: 0 0 0 4px rgba(99,102,241,0.18); }
  .search-input {
    border: none; outline: none; background: transparent;
    font-size: 13px; color: #1e293b; font-family: 'DM Sans', sans-serif; flex: 1; min-width: 0;
  }
  .search-input::placeholder { color: #94a3b8; }
  .clear-btn { background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; padding: 0; }
  .clear-btn:hover { color: #475569; }

  .match-pill {
    animation: slideDown 0.18s ease forwards;
    display: flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px;
    background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600;
  }

  .export-toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px; border-radius: 10px;
    background: #1e293b; color: #fff; font-size: 13px; font-weight: 500;
    box-shadow: 0 8px 28px rgba(0,0,0,0.18);
    animation: slideDown 0.22s ease forwards;
    font-family: 'DM Sans', sans-serif; pointer-events: none;
  }

  .no-results-banner {
    margin-bottom: 16px; padding: 12px 16px; border-radius: 10px;
    background: #fef9c3; border: 1px solid #fde68a;
    font-size: 13px; color: #92400e;
    display: flex; align-items: center; gap: 8px;
    animation: slideDown 0.2s ease forwards;
  }

  .export-mode, .export-mode * {
    animation: none !important; opacity: 1 !important; transform: none !important;
  }
`;

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ w, h, r = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
      background: "linear-gradient(90deg,#f1f5f9 25%,#e9eef5 50%,#f1f5f9 75%)",
      backgroundSize: "600px 100%", animation: "shimmer 1.4s infinite linear",
    }} />
  );
}

function VLine({ h = 32, delay = 0 }) {
  return (
    <div style={{
      width: 1, height: h, margin: "0 auto", flexShrink: 0,
      background: "#e2e8f0", transformOrigin: "top",
      animation: `drawV 0.25s ease ${delay}ms forwards`, transform: "scaleY(0)",
    }} />
  );
}

// ── Highlight text ────────────────────────────────────────────────────────────
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

// ── Org Header Node ───────────────────────────────────────────────────────────
function OrgHeaderNode({ orgName, orgLogo, delay = 0, dimmed, highlighted }) {
  const initials = orgName
    ? orgName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "ORG";
  return (
    <div style={{ animation: `scaleIn 0.35s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["org-card-hover", highlighted ? "org-card-highlight" : "", dimmed ? "org-card-dim" : ""].filter(Boolean).join(" ")}
        style={{ width: 210, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 16px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#1e293b", borderRadius: "14px 14px 0 0" }} />
        <span style={{ position: "absolute", top: 11, right: 12, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>ORG</span>
        {orgLogo ? (
          <img src={orgLogo} alt={orgName} style={{ width: 54, height: 54, borderRadius: 12, objectFit: "contain", marginBottom: 12, flexShrink: 0, border: "1px solid #e2e8f0" }} />
        ) : (
          <div style={{ width: 54, height: 54, borderRadius: 12, background: "#1e293b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, marginBottom: 12, flexShrink: 0 }}>{initials}</div>
        )}
        <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", margin: 0, textAlign: "center", lineHeight: 1.3 }}>{orgName || "Organisation"}</p>
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 500 }}>Organisation</span>
        </div>
      </div>
    </div>
  );
}

// ── Manager Node ──────────────────────────────────────────────────────────────
function ManagerNode({ name, subtitle, location, initials, colorCfg, delay = 0, dimmed, highlighted, q }) {
  return (
    <div style={{ animation: `fadeUp 0.35s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["org-card-hover", highlighted ? "org-card-highlight" : "", dimmed ? "org-card-dim" : ""].filter(Boolean).join(" ")}
        style={{ width: 200, background: "#fff", border: `1px solid ${colorCfg.bar}40`, borderRadius: 14, padding: "20px 16px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: colorCfg.bar, borderRadius: "14px 14px 0 0" }} />
        <span style={{ position: "absolute", top: 11, right: 12, fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>MGR</span>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: colorCfg.light, color: colorCfg.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, marginBottom: 10, flexShrink: 0 }}>{initials}</div>
        <Hi text={name}     query={q} style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", textAlign: "center", margin: 0 }} />
        <Hi text={subtitle} query={q} style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0", textAlign: "center" }} />
        {location && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 10, color: "#94a3b8" }}>
            <MapPin size={10} style={{ flexShrink: 0 }} />{location}
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: colorCfg.light, color: colorCfg.text, fontWeight: 600, letterSpacing: "0.04em" }}>Your Manager</span>
        </div>
      </div>
    </div>
  );
}

// ── Employee (Self) Node ──────────────────────────────────────────────────────
function EmployeeSelfNode({ name, subtitle, designation, location, initials, delay = 0, dimmed, highlighted }) {
  return (
    <div style={{ animation: `scaleIn 0.35s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["org-card-hover", "org-card-me", highlighted ? "org-card-highlight" : "", dimmed ? "org-card-dim" : ""].filter(Boolean).join(" ")}
        style={{ width: 160, background: "#f0f4ff", border: "1.5px solid #a5b4fc", borderRadius: 12, padding: "20px 12px 14px", boxShadow: "0 1px 4px rgba(99,102,241,0.12)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#6366f1", borderRadius: "12px 12px 0 0" }} />
        <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 700, letterSpacing: "0.07em", padding: "2px 10px", borderRadius: 10, background: "#6366f1", color: "#fff", whiteSpace: "nowrap" }}>YOU</div>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#c7d2fe", color: "#4338ca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, marginBottom: 10, flexShrink: 0 }}>{initials}</div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0, textAlign: "center" }}>{name}</p>
        {designation && <p style={{ fontSize: 11, color: "#6366f1", margin: "3px 0 0", textAlign: "center", fontWeight: 500 }}>{designation}</p>}
        {subtitle && subtitle !== designation && <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0", textAlign: "center" }}>{subtitle}</p>}
        {location && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 10, color: "#94a3b8" }}>
            <MapPin size={10} style={{ flexShrink: 0 }} />{location}
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "#eef2ff", border: "1px solid #c7d2fe", color: "#4338ca", fontWeight: 600 }}>Employee</span>
        </div>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent, delay = 0, text }) {
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
      <div style={{ minWidth: 0 }}>
        {text
          ? <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", lineHeight: 1.2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</p>
          : <p style={{ fontSize: 26, fontWeight: 600, color: "#0f172a", lineHeight: 1, margin: 0 }}>{count}</p>
        }
        <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, margin: "5px 0 0" }}>{label}</p>
      </div>
    </div>
  );
}

// ── Skeleton Tree ─────────────────────────────────────────────────────────────
function SkeletonTree() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Skeleton w={210} h={120} r={14} />
      <div style={{ width: 1, height: 28, background: "#e2e8f0" }} />
      <Skeleton w={200} h={116} r={14} />
      <div style={{ width: 1, height: 28, background: "#e2e8f0" }} />
      <Skeleton w={160} h={104} r={12} />
    </div>
  );
}

// ── Org Tree: Org → Manager → You ────────────────────────────────────────────
function OrgTree({ orgName, orgLogo, manager, employee, loading, searchQuery }) {
  if (loading) return <SkeletonTree />;

  const q        = normalize(searchQuery);
  const hasQ     = q.length > 0;
  const colorCfg = DEPT_COLORS[0];

  const orgMatch  = hasQ && normalize(orgName || "").includes(q);
  const mgrMatch  = hasQ && matchesPerson(manager?.f_name, manager?.l_name, manager?.department, manager?.designation, q);
  const selfMatch = hasQ && matchesPerson(employee?.f_name, employee?.l_name, employee?.department, employee?.designation, q);
  const anyMatch  = orgMatch || mgrMatch || selfMatch;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 400 }}>

      {/* Level 1 — Organisation */}
      <OrgHeaderNode
        orgName={orgName}
        orgLogo={orgLogo}
        delay={60}
        highlighted={orgMatch}
        dimmed={hasQ && !orgMatch && anyMatch}
      />

      <VLine h={28} delay={240} />

      {/* Level 2 — Manager */}
      {manager ? (
        <>
          <ManagerNode
            name={`${manager.f_name || ""} ${manager.l_name || ""}`.trim()}
            subtitle={manager.department || manager.designation || "Manager"}
            location={manager.office_location}
            initials={getInitials(manager.f_name, manager.l_name)}
            colorCfg={colorCfg}
            delay={320}
            highlighted={mgrMatch}
            dimmed={hasQ && !mgrMatch && anyMatch}
            q={searchQuery}
          />
          <VLine h={28} delay={480} />
        </>
      ) : (
        <>
          <div style={{ padding: "10px 20px", borderRadius: 8, border: "1px dashed #e2e8f0", fontSize: 12, color: "#cbd5e1", background: "#fafafa" }}>
            No manager assigned
          </div>
          <VLine h={20} delay={400} />
        </>
      )}

      {/* Level 3 — You */}
      <EmployeeSelfNode
        name={`${employee?.f_name || ""} ${employee?.l_name || ""}`.trim() || "You"}
        subtitle={employee?.department || ""}
        designation={employee?.designation || "Employee"}
        location={employee?.office_location}
        initials={getInitials(employee?.f_name, employee?.l_name)}
        delay={560}
        highlighted={selfMatch}
        dimmed={hasQ && !selfMatch && !mgrMatch}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrganizationPageEmployee() {
  // ── Only hooks that exist ─────────────────────────────────────────────────
  const { data: meData,  isLoading: loadingMe  } = useGetMeUser();
  const { data: orgData, isLoading: loadingOrg } = useGetOrgInfoEmployee();

  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [exportStatus, setExportStatus] = useState(null);
  const inputRef = useRef(null);
  const chartRef = useRef(null);

  // ── Derive everything from getme response ─────────────────────────────────
  // Backend getme returns: { employee: { ...fields, Under_manager: { f_name, l_name, work_email } } }
  const employee = meData?.employee || meData?.user || meData;
  const manager  = employee?.Under_manager || null;

  const orgName = orgData?.organisation_name
    || employee?.organisation_name
    || "My Organisation";
  const orgLogo = orgData?.profile_image || null;

  const loading = loadingMe || loadingOrg;
  const dept    = employee?.department || "";

  // ── Search match count ────────────────────────────────────────────────────
  const matchCount = useMemo(() => {
    if (!searchQuery) return 0;
    const q = normalize(searchQuery);
    let n = 0;
    if (normalize(orgName).includes(q)) n++;
    if (matchesPerson(manager?.f_name, manager?.l_name, manager?.department, manager?.designation, q)) n++;
    if (matchesPerson(employee?.f_name, employee?.l_name, employee?.department, employee?.designation, q)) n++;
    return n;
  }, [searchQuery, orgName, manager, employee]);

  // ── Keyboard: Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [searchOpen]);

  // ── Export PNG ────────────────────────────────────────────────────────────
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
      const target = chartRef.current;
      target.classList.add("export-mode");
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = await window.html2canvas(target, {
        backgroundColor: "#ffffff", scale: 2,
        useCORS: true, allowTaint: false, logging: false,
        scrollX: 0, scrollY: 0,
      });
      target.classList.remove("export-mode");
      const link    = document.createElement("a");
      link.download = `org-chart-${orgName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href     = canvas.toDataURL("image/png");
      link.click();
      setExportStatus("done");
      setTimeout(() => setExportStatus(null), 2600);
    } catch (err) {
      console.error("Export failed:", err);
      chartRef.current?.classList.remove("export-mode");
      setExportStatus(null);
    }
  }, [exportStatus, orgName]);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };

  return (
    <div className="org-root" style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <style>{STYLES}</style>

      {/* ── Topbar ── */}
      <div style={{ animation: "fadeIn 0.4s ease forwards", background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {orgLogo && <img src={orgLogo} alt={orgName} style={{ width: 24, height: 24, borderRadius: 5, objectFit: "contain", border: "1px solid #e2e8f0" }} />}
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{orgName}</span>
          <ChevronRight size={13} style={{ color: "#cbd5e1" }} />
          <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>Org Chart</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#f0f4ff", color: "#6366f1", fontWeight: 600, marginLeft: 4 }}>Employee View</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {searchOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "slideDown 0.2s ease forwards" }}>
              <div className="search-wrap">
                <Search size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
                <input ref={inputRef} className="search-input" placeholder="Search name, role, department…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                {searchQuery && <button className="clear-btn" onClick={() => setSearchQuery("")} title="Clear"><X size={13} /></button>}
              </div>
              {searchQuery && <div className="match-pill">{matchCount} match{matchCount !== 1 ? "es" : ""}</div>}
              <button className="hdr-btn" onClick={closeSearch}><X size={13} /> Close</button>
            </div>
          ) : (
            <button className="hdr-btn" onClick={() => setSearchOpen(true)}><Search size={13} /> Search</button>
          )}
          <button className="hdr-btn hdr-btn-primary" onClick={handleExport} disabled={loading || exportStatus === "loading"}>
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
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.3px" }}>My Organization</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "5px 0 0" }}>
            {loading
              ? "Loading…"
              : `${orgName} · Reporting to ${manager ? `${manager.f_name} ${manager.l_name}` : "—"} · Your position is highlighted`
            }
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
          <StatCard label="Your name"       text={loading ? "—" : `${employee?.f_name || ""} ${employee?.l_name || ""}`.trim() || "—"} icon={User}      accent="#6366f1" delay={100} />
          <StatCard label="Your department"  text={loading ? "—" : dept || "—"}                                                          icon={Building2} accent="#f59e0b" delay={150} />
          <StatCard label="Your designation" text={loading ? "—" : employee?.designation || "—"}                                         icon={Crown}     accent="#10b981" delay={200} />
          <StatCard label="Reporting to"     text={loading ? "—" : manager ? `${manager.f_name} ${manager.l_name}` : "—"}               icon={Users}     accent="#0ea5e9" delay={250} />
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
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Crown size={15} style={{ color: "#94a3b8" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Hierarchy view</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
                {loading ? "—" : "3 nodes"}
              </span>
              {searchQuery && matchCount > 0 && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#eef2ff", color: "#4338ca", fontWeight: 600 }}>{matchCount} highlighted</span>
              )}
            </div>
            {!loading && dept && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b", padding: "3px 9px", borderRadius: 6, background: DEPT_COLORS[0].light, fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: DEPT_COLORS[0].bar, flexShrink: 0 }} />
                {dept}
              </span>
            )}
          </div>

          <div ref={chartRef} className="org-scroll" style={{ overflowX: "auto", padding: "40px 32px 36px", background: "#fff" }}>
            <OrgTree
              orgName={orgName}
              orgLogo={orgLogo}
              manager={manager}
              employee={employee}
              loading={loading}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {/* Footer legend */}
        {!loading && (
          <div style={{ display: "flex", gap: 24, marginTop: 16, justifyContent: "center", flexWrap: "wrap", animation: "fadeIn 0.4s ease 600ms forwards", opacity: 0 }}>
            {[
              { dot: "#1e293b", label: "Organisation" },
              { dot: "#6366f1", label: "Your manager" },
              { dot: "#c7d2fe", label: "You", border: "1.5px solid #a5b4fc", ring: true },
              { dot: "#6366f1", label: "Search match", ring: true, dashed: true },
            ].map(({ dot, label, border, ring, dashed }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#94a3b8" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0, border: border ?? (dashed ? `1.5px dashed ${dot}` : "none"), boxShadow: ring ? "0 0 0 3px rgba(99,102,241,0.2)" : "none" }} />
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