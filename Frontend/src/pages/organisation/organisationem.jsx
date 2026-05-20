"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Crown, Users, Building2, User, MapPin,
  Download, Search, ChevronRight, X, Loader2, CheckCircle2, Shield,
} from "lucide-react";

import { useGetOrgInfoEmployee }
  from "../../auth/server-state/employee/employeeother/employeeother.hook";

const getInitials = (name = "") =>
  name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();

const normalize = (s = "") => s.toLowerCase().trim();

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  .org-root, .org-root * { box-sizing: border-box; }
  .org-root { font-family: 'DM Sans', sans-serif; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
  @keyframes shimmer { 0% { background-position:-600px 0; } 100% { background-position:600px 0; } }
  @keyframes drawV   { from { transform:scaleY(0); } to { transform:scaleY(1); } }
  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulseYou {
    0%, 100% { box-shadow: 0 0 0 0 rgba(115,0,66,0.25), 0 4px 20px rgba(115,0,66,0.12); }
    50%       { box-shadow: 0 0 0 8px rgba(115,0,66,0.06), 0 8px 28px rgba(115,0,66,0.2); }
  }

  .node-hover { transition: transform 0.17s ease, box-shadow 0.17s ease; cursor: default; }
  .node-hover:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(0,0,0,0.09) !important; }

  .node-highlight { outline: 2.5px solid #730042 !important; outline-offset: 2px; box-shadow: 0 0 0 5px rgba(115,0,66,0.1) !important; }
  .node-dim { opacity: 0.18; filter: grayscale(0.4); transition: opacity 0.2s, filter 0.2s; }
  .node-you { animation: pulseYou 2.8s ease-in-out infinite !important; }

  .stat-hover { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .stat-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.07) !important; }

  .org-scroll::-webkit-scrollbar { height: 5px; width: 5px; }
  .org-scroll::-webkit-scrollbar-track { background: transparent; }
  .org-scroll::-webkit-scrollbar-thumb { background: #ddd0d8; border-radius: 4px; }

  .hdr-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px;
    border: 1px solid #e8dde5; background: #fff; color: #4a3542;
    font-size: 13px; font-weight: 500; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.13s, border-color 0.13s, color 0.13s;
    white-space: nowrap;
  }
  .hdr-btn:hover { background: #fdf6fa; border-color: #c9afc0; color: #730042; }
  .hdr-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .hdr-btn-primary { background: #730042; color: #fff; border-color: #730042; }
  .hdr-btn-primary:hover { background: #5a0033; border-color: #5a0033; color: #fff; }

  .search-wrap {
    display: flex; align-items: center; gap: 8px;
    border: 1px solid #730042; border-radius: 8px;
    padding: 0 10px; background: #fff; height: 36px; width: 268px;
    box-shadow: 0 0 0 3px rgba(115,0,66,0.09); transition: box-shadow 0.15s;
  }
  .search-wrap:focus-within { box-shadow: 0 0 0 4px rgba(115,0,66,0.15); }
  .search-input { border: none; outline: none; background: transparent; font-size: 13px; color: #1e293b; font-family: 'DM Sans', sans-serif; flex: 1; min-width: 0; }
  .search-input::placeholder { color: #b89aad; }
  .clear-btn { background: none; border: none; cursor: pointer; color: #b89aad; display: flex; padding: 0; }
  .clear-btn:hover { color: #730042; }

  .match-pill { animation: slideDown 0.18s ease forwards; display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; background: #fdf0f7; color: #730042; font-size: 11px; font-weight: 600; }

  .export-toast { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 10px; background: #1e0e17; color: #fff; font-size: 13px; font-weight: 500; box-shadow: 0 8px 28px rgba(0,0,0,0.22); animation: slideDown 0.22s ease forwards; font-family: 'DM Sans', sans-serif; pointer-events: none; }

  .export-mode, .export-mode * { animation: none !important; opacity: 1 !important; transform: none !important; }
`;

function Skeleton({ w, h, r = 8 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: "linear-gradient(90deg,#f5edf2 25%,#ecdce6 50%,#f5edf2 75%)", backgroundSize: "600px 100%", animation: "shimmer 1.4s infinite linear" }} />
  );
}

function VLine({ h = 32, delay = 0 }) {
  return (
    <div style={{ width: 2, height: h, margin: "0 auto", flexShrink: 0, background: "linear-gradient(to bottom, #d4a8c0, #e8d0de)", transformOrigin: "top", animation: `drawV 0.28s ease ${delay}ms forwards`, transform: "scaleY(0)" }} />
  );
}

function Hi({ text = "", query = "", style = {} }) {
  if (!query) return <span style={style}>{text}</span>;
  const idx = normalize(text).indexOf(normalize(query));
  if (idx === -1) return <span style={style}>{text}</span>;
  return (
    <span style={style}>
      {text.slice(0, idx)}
      <mark style={{ background: "#fde68a", color: "#78350f", borderRadius: 2, padding: "0 1px" }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

function NodeBadge({ label, bg, color, border }) {
  return (
    <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: bg, color, border: border || "none", fontWeight: 600, letterSpacing: "0.04em", fontFamily: "'DM Mono', monospace" }}>
      {label}
    </span>
  );
}

function Avatar({ initials, size = 46, bg, color, fontSize = 15 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize, fontWeight: 700, flexShrink: 0, fontFamily: "'Syne', sans-serif" }}>
      {initials}
    </div>
  );
}

function OrgNode({ name, badge, badgeBg, badgeColor, accentColor, avatarBg, avatarColor, icon: Icon, delay = 0, dimmed, highlighted, q, width = 200, tag, email, sub }) {
  return (
    <div style={{ animation: `scaleIn 0.32s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["node-hover", highlighted ? "node-highlight" : "", dimmed ? "node-dim" : ""].filter(Boolean).join(" ")}
        style={{ width, background: "#fff", border: "1px solid #eedde8", borderRadius: 14, padding: "20px 16px 16px", boxShadow: "0 2px 8px rgba(115,0,66,0.05)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentColor, borderRadius: "14px 14px 0 0" }} />
        {tag && <span style={{ position: "absolute", top: 11, right: 12, fontSize: 9, fontWeight: 600, letterSpacing: "0.09em", color: "#b89aad", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>{tag}</span>}

        {Icon
          ? <div style={{ width: 46, height: 46, borderRadius: "50%", background: avatarBg, color: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, flexShrink: 0 }}><Icon size={20} /></div>
          : <Avatar initials={getInitials(name)} size={46} bg={avatarBg} color={avatarColor} />
        }

        <div style={{ marginBottom: 8, textAlign: "center" }}>
          <Hi text={name} query={q} style={{ fontSize: 14, fontWeight: 600, color: "#1a0d14", display: "block", lineHeight: 1.3 }} />
          {sub && <Hi text={sub} query={q} style={{ fontSize: 11, color: "#8a6878", display: "block", marginTop: 3 }} />}
          {email && <p style={{ fontSize: 10, color: "#b89aad", margin: "2px 0 0", fontFamily: "'DM Mono', monospace", wordBreak: "break-all" }}>{email}</p>}
        </div>

        <NodeBadge label={badge} bg={badgeBg} color={badgeColor} />
      </div>
    </div>
  );
}

function YouNode({ name, designation, department, location, delay = 0, dimmed, highlighted }) {
  return (
    <div style={{ animation: `scaleIn 0.32s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["node-hover", "node-you", highlighted ? "node-highlight" : "", dimmed ? "node-dim" : ""].filter(Boolean).join(" ")}
        style={{ width: 168, background: "linear-gradient(145deg, #fff5fb, #fff)", border: "1.5px solid #cd166e60", borderRadius: 14, padding: "22px 14px 16px", boxShadow: "0 4px 16px rgba(115,0,66,0.1)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #730042, #CD166E)", borderRadius: "14px 14px 0 0" }} />
        <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 12px", borderRadius: 10, background: "#730042", color: "#fff", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace" }}>YOU</div>

        <Avatar initials={getInitials(name)} size={46} bg="#fce7f3" color="#730042" fontSize={15} />
        <div style={{ marginTop: 10, marginBottom: 8, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1a0d14", margin: 0, fontFamily: "'Syne', sans-serif" }}>{name}</p>
          {designation && <p style={{ fontSize: 11, color: "#730042", margin: "3px 0 0", fontWeight: 500 }}>{designation}</p>}
          {department && <p style={{ fontSize: 11, color: "#8a6878", margin: "2px 0 0" }}>{department}</p>}
          {location && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 5, fontSize: 10, color: "#b89aad" }}>
              <MapPin size={9} style={{ flexShrink: 0 }} />{location}
            </div>
          )}
        </div>
        <NodeBadge label="Employee" bg="#fce7f3" color="#730042" border="1px solid #f9a8d4" />
      </div>
    </div>
  );
}

function SkeletonTree() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {[120, 28, 110, 28, 110, 28, 110, 28, 108].map((h, i) =>
        i % 2 === 0
          ? <Skeleton key={i} w={i === 8 ? 168 : 200} h={h} r={14} />
          : <div key={i} style={{ width: 2, height: h, background: "#eed8e5", margin: "0 auto" }} />
      )}
    </div>
  );
}

function OrgTree({ data, loading, searchQuery }) {
  if (loading) return <SkeletonTree />;
  if (!data) return null;

  const q = normalize(searchQuery);
  const hasQ = q.length > 0;

  const nodes = [
    { key: "org",      label: data.organisation_name || "Organisation",  sub: null,                            badge: "Super Admin",       bg: "#1a0d14", accent: "#1a0d14", avBg: "#1a0d14",  avColor: "#fff",    badgeBg: "#f5edf2", badgeColor: "#4a3542", tag: "SA",  icon: Crown,   width: 210 },
    { key: "admin",    label: data.admin?.name || null,                   sub: data.admin?.designation,         badge: "Admin",             bg: "#3b1829", accent: "#5a2240", avBg: "#f5edf2",  avColor: "#5a2240", badgeBg: "#f0e4ec", badgeColor: "#5a2240", tag: "ADM", icon: null,   width: 200 },
    { key: "repman",   label: data.reporting_manager?.name || null,       sub: data.reporting_manager?.designation, badge: "Reporting Mgr", bg: "#7c1f4a", accent: "#7c1f4a", avBg: "#fce7f3",  avColor: "#7c1f4a", badgeBg: "#fce7f3", badgeColor: "#7c1f4a", tag: "RM",  icon: null,   width: 200 },
    { key: "manager",  label: data.manager?.name || null,                 sub: data.manager?.designation,       badge: "Your Manager",      bg: "#a8005c", accent: "#CD166E", avBg: "#fce7f3",  avColor: "#CD166E", badgeBg: "#fdf2f8", badgeColor: "#CD166E", tag: "MGR", icon: null,   width: 200 },
  ].filter(n => n.label);

  const matchKeys = new Set();
  if (hasQ) {
    nodes.forEach(n => { if (normalize(n.label).includes(q) || (n.sub && normalize(n.sub).includes(q))) matchKeys.add(n.key); });
    if (data.employee && (normalize(data.employee.name).includes(q) || normalize(data.employee.designation || "").includes(q) || normalize(data.employee.department || "").includes(q))) matchKeys.add("you");
  }
  const anyMatch = matchKeys.size > 0;

  let delay = 60;
  const items = [];

  nodes.forEach((n, idx) => {
    items.push(
      <OrgNode
        key={n.key}
        name={n.label}
        sub={n.sub}
        badge={n.badge}
        badgeBg={n.badgeBg}
        badgeColor={n.badgeColor}
        accentColor={n.accent}
        avatarBg={n.avBg}
        avatarColor={n.avColor}
        icon={n.icon}
        tag={n.tag}
        delay={delay}
        highlighted={hasQ && matchKeys.has(n.key)}
        dimmed={hasQ && anyMatch && !matchKeys.has(n.key)}
        q={searchQuery}
        width={n.width}
      />
    );
    delay += 120;
    items.push(<VLine key={`v${idx}`} h={28} delay={delay} />);
    delay += 60;
  });

  items.push(
    <YouNode
      key="you"
      name={data.employee?.name || "You"}
      designation={data.employee?.designation}
      department={data.employee?.department}
      location={data.employee?.office_location}
      delay={delay}
      highlighted={hasQ && matchKeys.has("you")}
      dimmed={hasQ && anyMatch && !matchKeys.has("you") && matchKeys.size > 0}
    />
  );

  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>{items}</div>;
}

function StatCard({ label, text, icon: Icon, accent, delay = 0 }) {
  return (
    <div className="stat-hover" style={{ animation: `fadeUp 0.35s ease ${delay}ms forwards`, opacity: 0, background: "#fff", border: "1px solid #eedde8", borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(115,0,66,0.04)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} style={{ color: accent }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#1a0d14", lineHeight: 1.2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Syne', sans-serif" }}>{text || "—"}</p>
        <p style={{ fontSize: 11, color: "#b89aad", fontWeight: 500, margin: "4px 0 0" }}>{label}</p>
      </div>
    </div>
  );
}

export default function OrganizationPageEmployee() {
  const { data, isLoading: loading } = useGetOrgInfoEmployee();

  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [exportStatus, setExportStatus] = useState(null);
  const inputRef = useRef(null);
  const chartRef = useRef(null);

  const orgName = data?.organisation_name || "My Organisation";

  const matchCount = useMemo(() => {
    if (!searchQuery || !data) return 0;
    const q = normalize(searchQuery);
    let n = 0;
    [
      data.organisation_name,
      data.admin?.name, data.admin?.designation,
      data.reporting_manager?.name, data.reporting_manager?.designation,
      data.manager?.name, data.manager?.designation,
      data.employee?.name, data.employee?.designation, data.employee?.department,
    ].forEach(s => { if (s && normalize(s).includes(q)) n++; });
    return Math.min(n, 5);
  }, [searchQuery, data]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [searchOpen]);

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
      const canvas = await window.html2canvas(target, { backgroundColor: "#ffffff", scale: 2, useCORS: true, allowTaint: false, logging: false });
      target.classList.remove("export-mode");
      const link = document.createElement("a");
      link.download = `org-chart-${orgName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setExportStatus("done");
      setTimeout(() => setExportStatus(null), 2600);
    } catch {
      chartRef.current?.classList.remove("export-mode");
      setExportStatus(null);
    }
  }, [exportStatus, orgName]);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };

  const nodeCount = [data?.admin, data?.reporting_manager, data?.manager].filter(Boolean).length + 2;

  return (
    <div className="org-root" style={{ minHeight: "100vh", background: "#faf5f8" }}>
      <style>{STYLES}</style>

      <div style={{ animation: "fadeIn 0.4s ease forwards", background: "#fff", borderBottom: "1px solid #eedde8", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#b89aad", fontWeight: 500 }}>{orgName}</span>
          <ChevronRight size={13} style={{ color: "#dcc0d0" }} />
          <span style={{ fontSize: 13, color: "#1a0d14", fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>Org Chart</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#fce7f3", color: "#730042", fontWeight: 600, marginLeft: 4 }}>Employee View</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {searchOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "slideDown 0.2s ease forwards" }}>
              <div className="search-wrap">
                <Search size={13} style={{ color: "#b89aad", flexShrink: 0 }} />
                <input ref={inputRef} className="search-input" placeholder="Search name, role, department…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                {searchQuery && <button className="clear-btn" onClick={() => setSearchQuery("")}><X size={13} /></button>}
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
              : <><Download size={13} /> Export PNG</>}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 28px 48px" }}>
        <div style={{ animation: "fadeUp 0.35s ease 60ms forwards", opacity: 0, marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a0d14", margin: 0, letterSpacing: "-0.3px", fontFamily: "'Syne', sans-serif" }}>My Organization</h1>
          <p style={{ fontSize: 13, color: "#b89aad", margin: "5px 0 0" }}>
            {loading ? "Loading hierarchy…" : `${orgName} · Full reporting chain · Your position is highlighted`}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
          <StatCard label="Your name"       text={data?.employee?.name}        icon={User}      accent="#730042" delay={80}  />
          <StatCard label="Department"      text={data?.employee?.department}   icon={Building2} accent="#CD166E" delay={130} />
          <StatCard label="Designation"     text={data?.employee?.designation}  icon={Crown}     accent="#a8005c" delay={180} />
          <StatCard label="Reporting to"    text={data?.manager?.name}          icon={Users}     accent="#7c1f4a" delay={230} />
        </div>

        {searchOpen && searchQuery && matchCount === 0 && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: "#fef9c3", border: "1px solid #fde68a", fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 8, animation: "slideDown 0.2s ease forwards" }}>
            <Search size={14} />
            No results for <strong style={{ marginLeft: 3 }}>"{searchQuery}"</strong>
          </div>
        )}

        <div style={{ animation: "fadeIn 0.4s ease 300ms forwards", opacity: 0, background: "#fff", border: "1px solid #eedde8", borderRadius: 16, boxShadow: "0 2px 8px rgba(115,0,66,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f5edf2", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fdf8fb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Crown size={14} style={{ color: "#b89aad" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#4a3542", fontFamily: "'Syne', sans-serif" }}>Hierarchy view</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#f5edf2", color: "#b89aad", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" }}>
                {loading ? "—" : `${nodeCount} nodes`}
              </span>
              {searchQuery && matchCount > 0 && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#fce7f3", color: "#730042", fontWeight: 600 }}>{matchCount} highlighted</span>
              )}
            </div>
            {!loading && data?.employee?.department && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#730042", padding: "3px 10px", borderRadius: 6, background: "#fce7f3", fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#730042", flexShrink: 0 }} />
                {data.employee.department}
              </span>
            )}
          </div>

          <div ref={chartRef} className="org-scroll" style={{ overflowX: "auto", padding: "44px 32px 40px", background: "#fff" }}>
            <OrgTree data={data} loading={loading} searchQuery={searchQuery} />
          </div>
        </div>

        {!loading && (
          <div style={{ display: "flex", gap: 20, marginTop: 16, justifyContent: "center", flexWrap: "wrap", animation: "fadeIn 0.4s ease 700ms forwards", opacity: 0 }}>
            {[
              { dot: "#1a0d14", label: "Organisation / Super Admin" },
              { dot: "#5a2240", label: "Admin" },
              { dot: "#7c1f4a", label: "Reporting Manager" },
              { dot: "#CD166E", label: "Your Manager" },
              { dot: "#730042", label: "You", ring: true },
            ].map(({ dot, label, ring }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#b89aad" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0, boxShadow: ring ? "0 0 0 3px rgba(115,0,66,0.18)" : "none" }} />
                {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {exportStatus && (
        <div className="export-toast">
          {exportStatus === "loading"
            ? <><Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> Generating PNG…</>
            : <><CheckCircle2 size={15} style={{ color: "#4ade80" }} /> Exported successfully!</>}
        </div>
      )}
    </div>
  );
}