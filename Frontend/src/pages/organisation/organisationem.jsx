"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Crown, Users, Building2, User,
  Download, Search, X, Loader2, CheckCircle2,
} from "lucide-react";

import { useGetOrgInfoEmployee }
  from "../../auth/server-state/employee/employeeother/employeeother.hook";

const initials = (name = "") =>
  name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();

const norm = (s = "") => s.toLowerCase().trim();

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  .org-root, .org-root * { box-sizing: border-box; }
  .org-root { font-family: 'DM Sans', sans-serif; }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes scaleIn   { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
  @keyframes shimmer   { 0% { background-position:-600px 0; } 100% { background-position:600px 0; } }
  @keyframes spin      { to { transform:rotate(360deg); } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulseYou  {
    0%,100% { box-shadow: 0 0 0 0 rgba(115,0,66,0.22), 0 4px 16px rgba(115,0,66,0.1); }
    50%      { box-shadow: 0 0 0 8px rgba(115,0,66,0.05), 0 8px 28px rgba(115,0,66,0.18); }
  }

  .nd { transition: transform 0.16s ease, box-shadow 0.16s ease; cursor: default; }
  .nd:hover { transform: translateY(-2px); }
  .nd-hl  { outline: 2px solid #730042 !important; outline-offset: 2px; box-shadow: 0 0 0 5px rgba(115,0,66,0.1) !important; }
  .nd-dim { opacity: 0.15; filter: grayscale(0.4); transition: opacity 0.2s, filter 0.2s; }
  .nd-you { animation: pulseYou 2.8s ease-in-out infinite !important; }

  .stat-h { transition: transform 0.14s ease; }
  .stat-h:hover { transform: translateY(-2px); }

  .sc::-webkit-scrollbar { height: 5px; width: 5px; }
  .sc::-webkit-scrollbar-track { background: transparent; }
  .sc::-webkit-scrollbar-thumb { background: #ddd0d8; border-radius: 4px; }

  .hb {
    display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;
    border:1px solid #e8dde5;background:#fff;color:#4a3542;
    font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;
    transition:background .13s,border-color .13s,color .13s;white-space:nowrap;
  }
  .hb:hover { background:#fdf6fa;border-color:#c9afc0;color:#730042; }
  .hb:disabled { opacity:.45;cursor:not-allowed; }
  .hb-p { background:#730042;color:#fff;border-color:#730042; }
  .hb-p:hover { background:#5a0033;border-color:#5a0033;color:#fff; }

  .sw {
    display:flex;align-items:center;gap:8px;
    border:1px solid #730042;border-radius:8px;
    padding:0 10px;background:#fff;height:36px;width:260px;
    box-shadow:0 0 0 3px rgba(115,0,66,0.09);transition:box-shadow .15s;
  }
  .sw:focus-within { box-shadow:0 0 0 4px rgba(115,0,66,0.15); }
  .si { border:none;outline:none;background:transparent;font-size:13px;color:#1e293b;font-family:'DM Sans',sans-serif;flex:1;min-width:0; }
  .si::placeholder { color:#b89aad; }
  .cb { background:none;border:none;cursor:pointer;color:#b89aad;display:flex;padding:0; }
  .cb:hover { color:#730042; }

  .mp { animation:slideDown .18s ease forwards;display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;background:#fdf0f7;color:#730042;font-size:11px;font-weight:600; }
  .et { position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;background:#1e0e17;color:#fff;font-size:13px;font-weight:500;box-shadow:0 8px 28px rgba(0,0,0,0.22);animation:slideDown .22s ease forwards;font-family:'DM Sans',sans-serif;pointer-events:none; }
  .export-mode, .export-mode * { animation:none!important;opacity:1!important;transform:none!important; }
`;

function Sk({ w, h, r = 8 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: "linear-gradient(90deg,#f5edf2 25%,#ecdce6 50%,#f5edf2 75%)", backgroundSize: "600px 100%", animation: "shimmer 1.4s infinite linear" }} />
  );
}

function Avatar({ name, size = 40, bg, color }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: "'Syne',sans-serif" }}>
      {initials(name)}
    </div>
  );
}

function Hi({ text = "", q = "", style = {} }) {
  if (!q) return <span style={style}>{text}</span>;
  const idx = norm(text).indexOf(q);
  if (idx === -1) return <span style={style}>{text}</span>;
  return (
    <span style={style}>
      {text.slice(0, idx)}
      <mark style={{ background: "#fde68a", color: "#78350f", borderRadius: 2, padding: "0 1px" }}>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

const CFG = {
  org:     { accent: "#1a0d14", avBg: "#1a0d14", avColor: "#f5edf2", badge: "Organisation",  badgeBg: "#f5edf2", badgeColor: "#4a3542", tag: "ORG" },
  admin:   { accent: "#5a2240", avBg: "#f0e4ec", avColor: "#5a2240", badge: "Admin",          badgeBg: "#f0e4ec", badgeColor: "#5a2240", tag: "ADM" },
  manager: { accent: "#a8005c", avBg: "#fce7f3", avColor: "#a8005c", badge: "Manager",        badgeBg: "#fce7f3", badgeColor: "#a8005c", tag: "MGR" },
  myMgr:   { accent: "#CD166E", avBg: "#fce7f3", avColor: "#CD166E", badge: "Your Manager",   badgeBg: "#fdf2f8", badgeColor: "#CD166E", tag: "MGR" },
  emp:     { accent: "#7c1f4a", avBg: "#fce7f3", avColor: "#7c1f4a", badge: "Employee",       badgeBg: "#fce7f3", badgeColor: "#7c1f4a", tag: "EMP" },
};

function Card({ level, name, sub, width = 172, delay = 0, dim, hl, q, you = false, empCount }) {
  const c = CFG[level] || CFG.emp;
  return (
    <div style={{ animation: `scaleIn 0.26s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["nd", hl ? "nd-hl" : "", dim ? "nd-dim" : "", you ? "nd-you" : ""].filter(Boolean).join(" ")}
        style={{ width, background: "#fff", border: "1px solid #eedde8", borderRadius: 11, padding: "14px 12px 11px", boxShadow: "0 2px 8px rgba(115,0,66,0.04)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: you ? "linear-gradient(90deg,#730042,#CD166E)" : c.accent, borderRadius: "11px 11px 0 0" }} />
        <span style={{ position: "absolute", top: 8, right: 9, fontSize: 8, fontWeight: 600, letterSpacing: "0.1em", color: "#c8a8bb", fontFamily: "'DM Mono',monospace" }}>{c.tag}</span>
        {you && <div style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 8, background: "#730042", color: "#fff", whiteSpace: "nowrap", fontFamily: "'DM Mono',monospace" }}>YOU</div>}

        <Avatar name={name} size={38} bg={you ? "#fce7f3" : c.avBg} color={you ? "#730042" : c.avColor} />

        <div style={{ marginTop: 8, marginBottom: 6, textAlign: "center", width: "100%" }}>
          <Hi text={name} q={q} style={{ fontSize: 12, fontWeight: 600, color: "#1a0d14", display: "block", lineHeight: 1.3, fontFamily: "'Syne',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
          {sub && <Hi text={sub} q={q} style={{ fontSize: 10, color: "#8a6878", display: "block", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />}
          {empCount !== undefined && <span style={{ fontSize: 10, color: "#c8a8bb", display: "block", marginTop: 2 }}>{empCount} report{empCount !== 1 ? "s" : ""}</span>}
        </div>

        <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 20, background: you ? "#fce7f3" : c.badgeBg, color: you ? "#730042" : c.badgeColor, fontWeight: 600, letterSpacing: "0.04em", border: you ? "1px solid #f9a8d4" : "none", fontFamily: "'DM Mono',monospace" }}>
          {you ? "You" : c.badge}
        </span>
      </div>
    </div>
  );
}

function VLine({ h = 24 }) {
  return <div style={{ width: 1, height: h, background: "#dcc0d0", margin: "0 auto", flexShrink: 0 }} />;
}

// Horizontal T-bar connector above a row of N cards each cardW wide with gap spacing
function TBar({ count, cardW, gap }) {
  if (count <= 1) return <VLine h={20} />;
  const total = count * cardW + (count - 1) * gap;
  const midY = 16;
  return (
    <svg width={total} height={midY + 4} style={{ display: "block", flexShrink: 0, overflow: "visible" }}>
      {/* vertical from above down to the T */}
      <line x1={total / 2} y1={0} x2={total / 2} y2={midY} stroke="#dcc0d0" strokeWidth={1} />
      {/* horizontal bar */}
      <line x1={cardW / 2} y1={midY} x2={total - cardW / 2} y2={midY} stroke="#dcc0d0" strokeWidth={1} />
      {/* vertical drops to each card */}
      {Array.from({ length: count }).map((_, i) => {
        const cx = i * (cardW + gap) + cardW / 2;
        return <line key={i} x1={cx} y1={midY} x2={cx} y2={midY + 4} stroke="#dcc0d0" strokeWidth={1} />;
      })}
    </svg>
  );
}

// Below-manager T-bar: stem comes from the center of the manager card
function ManagerTBar({ mgrW, empCount, empW, empGap }) {
  if (empCount === 0) return null;
  const total = Math.max(mgrW, empCount * empW + (empCount - 1) * empGap);
  const mgrCenter = total / 2;
  const barY = 14;
  return (
    <svg width={total} height={barY + 4} style={{ display: "block", flexShrink: 0, overflow: "visible" }}>
      <line x1={mgrCenter} y1={0} x2={mgrCenter} y2={barY} stroke="#dcc0d0" strokeWidth={1} />
      {empCount > 1 && (
        <line x1={empW / 2 + (total - (empCount * empW + (empCount - 1) * empGap)) / 2} y1={barY} x2={total - empW / 2 - (total - (empCount * empW + (empCount - 1) * empGap)) / 2} y2={barY} stroke="#dcc0d0" strokeWidth={1} />
      )}
      {Array.from({ length: empCount }).map((_, i) => {
        const offset = (total - (empCount * empW + (empCount - 1) * empGap)) / 2;
        const cx = offset + i * (empW + empGap) + empW / 2;
        return <line key={i} x1={cx} y1={barY} x2={cx} y2={barY + 4} stroke="#dcc0d0" strokeWidth={1} />;
      })}
    </svg>
  );
}

function SkeletonTree() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Sk w={172} h={104} r={11} />
      <div style={{ width: 1, height: 24, background: "#eed8e5" }} />
      <Sk w={172} h={96} r={11} />
      <div style={{ width: 1, height: 20, background: "#eed8e5" }} />
      <div style={{ display: "flex", gap: 28 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Sk w={172} h={96} r={11} />
            <div style={{ width: 1, height: 16, background: "#eed8e5" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <Sk w={152} h={92} r={11} />
              <Sk w={152} h={92} r={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CARD_W = 172;
const EMP_W  = 152;
const MGR_GAP = 28;
const EMP_GAP = 10;

function OrgTree({ data, loading, q }) {
  if (loading) return <SkeletonTree />;
  if (!data)   return null;

  const hasQ   = q.length > 0;
  const matches = new Set();

  if (hasQ) {
    const chk = (...ss) => ss.some(s => s && norm(s).includes(q));
    if (chk(data.organisation_name, data.super_admin?.name)) matches.add("org");
    if (chk(data.admin?.name, data.admin?.designation))       matches.add("admin");
    (data.managers || []).forEach(mgr => {
      if (chk(mgr.name, mgr.designation, mgr.department)) matches.add(`m-${mgr.id}`);
      (mgr.employees || []).forEach(e => {
        if (chk(e.name, e.designation, e.department)) matches.add(`e-${e.id}`);
      });
    });
  }

  const anyMatch = matches.size > 0;
  const dim = (k) => hasQ && anyMatch && !matches.has(k);

  const managers = data.managers || [];

  // column width = wide enough for all employees below
  const colW = (mgr) => {
    const ec = (mgr.employees || []).length;
    if (ec === 0) return CARD_W;
    const empTotal = ec * EMP_W + (ec - 1) * EMP_GAP;
    return Math.max(CARD_W, empTotal);
  };

  const totalW = managers.reduce((s, m) => s + colW(m), 0) + Math.max(0, managers.length - 1) * MGR_GAP;
  const topBarW = Math.max(CARD_W, totalW);

  let delay = 40;
  const d = (add = 70) => { delay += add; return delay; };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "max-content" }}>

      {/* Org */}
      <div style={{ animation: `scaleIn 0.26s ease 40ms forwards`, opacity: 0 }}>
        <Card level="org" name={data.organisation_name || "Organisation"} sub={data.super_admin?.name} width={CARD_W} delay={0} dim={dim("org")} hl={matches.has("org")} q={q} />
      </div>
      <VLine h={22} />

      {/* Admin */}
      {data.admin && (
        <>
          <Card level="admin" name={data.admin.name} sub={data.admin.designation} width={CARD_W} delay={d()} dim={dim("admin")} hl={matches.has("admin")} q={q} />
          <VLine h={22} />
        </>
      )}

      {/* T-bar spanning managers row */}
      {managers.length > 1 && (
        <svg width={topBarW} height={20} style={{ display: "block", flexShrink: 0, overflow: "visible" }}>
          <line x1={topBarW / 2} y1={0} x2={topBarW / 2} y2={10} stroke="#dcc0d0" strokeWidth={1} />
          <line x1={colW(managers[0]) / 2} y1={10} x2={topBarW - colW(managers[managers.length - 1]) / 2} y2={10} stroke="#dcc0d0" strokeWidth={1} />
          {managers.map((mgr, i) => {
            let cx = 0;
            for (let j = 0; j < i; j++) cx += colW(managers[j]) + MGR_GAP;
            cx += colW(mgr) / 2;
            return <line key={i} x1={cx} y1={10} x2={cx} y2={20} stroke="#dcc0d0" strokeWidth={1} />;
          })}
        </svg>
      )}

      {/* Managers row */}
      <div style={{ display: "flex", gap: MGR_GAP, alignItems: "flex-start", animation: `fadeIn 0.28s ease ${delay + 50}ms forwards`, opacity: 0 }}>
        {managers.map((mgr, mi) => {
          const mKey   = `m-${mgr.id}`;
          const emps   = mgr.employees || [];
          const cw     = colW(mgr);
          const isMyMgr = mgr.isCurrentUserManager;
          const mDelay  = d(mi === 0 ? 60 : 25);

          return (
            <div key={mgr.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: cw, flexShrink: 0 }}>
              <Card
                level={isMyMgr ? "myMgr" : "manager"}
                name={mgr.name}
                sub={mgr.designation || mgr.department}
                width={CARD_W}
                delay={mDelay}
                dim={dim(mKey)}
                hl={matches.has(mKey)}
                q={q}
                empCount={emps.length}
              />

              {emps.length > 0 && (
                <>
                  <ManagerTBar mgrW={CARD_W} empCount={emps.length} empW={EMP_W} empGap={EMP_GAP} />
                  <div style={{ display: "flex", gap: EMP_GAP, alignItems: "flex-start" }}>
                    {emps.map((emp, ei) => {
                      const eKey = `e-${emp.id}`;
                      return (
                        <Card
                          key={emp.id}
                          level="emp"
                          name={emp.name}
                          sub={emp.designation || emp.department}
                          width={EMP_W}
                          delay={d(ei === 0 ? 40 : 18)}
                          dim={dim(eKey)}
                          hl={matches.has(eKey)}
                          q={q}
                          you={emp.isCurrentUser}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, text, icon: Icon, accent, delay = 0 }) {
  return (
    <div className="stat-h" style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards`, opacity: 0, background: "#fff", border: "1px solid #eedde8", borderRadius: 11, padding: "15px 16px", display: "flex", alignItems: "center", gap: 13, boxShadow: "0 1px 4px rgba(115,0,66,0.04)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={15} style={{ color: accent }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1a0d14", lineHeight: 1.2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Syne',sans-serif" }}>{text || "—"}</p>
        <p style={{ fontSize: 11, color: "#b89aad", fontWeight: 500, margin: "3px 0 0" }}>{label}</p>
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

  const myInfo = useMemo(() => {
    if (!data) return null;
    for (const mgr of (data.managers || [])) {
      const emp = mgr.employees?.find(e => e.isCurrentUser);
      if (emp) return { ...emp, managerName: mgr.name };
    }
    return null;
  }, [data]);

  const matchCount = useMemo(() => {
    if (!searchQuery || !data) return 0;
    const q = norm(searchQuery);
    let n = 0;
    const chk = (...ss) => ss.some(s => s && norm(s).includes(q));
    if (chk(data.organisation_name)) n++;
    if (chk(data.admin?.name, data.admin?.designation)) n++;
    (data.managers || []).forEach(mgr => {
      if (chk(mgr.name, mgr.department, mgr.designation)) n++;
      (mgr.employees || []).forEach(e => { if (chk(e.name, e.designation)) n++; });
    });
    return n;
  }, [searchQuery, data]);

  const totalNodes = useMemo(() => {
    if (!data) return 0;
    let n = 1;
    if (data.admin) n++;
    (data.managers || []).forEach(mgr => { n++; n += (mgr.employees || []).length; });
    return n;
  }, [data]);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
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

  return (
    <div className="org-root" style={{ minHeight: "100vh", background: "#faf5f8" }}>
      <style>{STYLES}</style>

      {/* Topbar */}
      <div style={{ animation: "fadeIn 0.3s ease forwards", background: "#fff", borderBottom: "1px solid #eedde8", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#b89aad", fontWeight: 500 }}>{orgName}</span>
          <span style={{ color: "#dcc0d0" }}>›</span>
          <span style={{ fontSize: 13, color: "#1a0d14", fontWeight: 600, fontFamily: "'Syne',sans-serif" }}>Org Chart</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#fce7f3", color: "#730042", fontWeight: 600, marginLeft: 2 }}>Full View</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {searchOpen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "slideDown 0.2s ease forwards" }}>
              <div className="sw">
                <Search size={13} style={{ color: "#b89aad", flexShrink: 0 }} />
                <input ref={inputRef} className="si" placeholder="Search name, role, department…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                {searchQuery && <button className="cb" onClick={() => setSearchQuery("")}><X size={13} /></button>}
              </div>
              {searchQuery && <div className="mp">{matchCount} match{matchCount !== 1 ? "es" : ""}</div>}
              <button className="hb" onClick={closeSearch}><X size={13} /> Close</button>
            </div>
          ) : (
            <button className="hb" onClick={() => setSearchOpen(true)}><Search size={13} /> Search</button>
          )}
          <button className="hb hb-p" onClick={handleExport} disabled={loading || exportStatus === "loading"}>
            {exportStatus === "loading"
              ? <><Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> Exporting…</>
              : <><Download size={13} /> Export PNG</>}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "22px 24px 48px" }}>

        <div style={{ animation: "fadeUp 0.3s ease 50ms forwards", opacity: 0, marginBottom: 18 }}>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: "#1a0d14", margin: 0, letterSpacing: "-0.3px", fontFamily: "'Syne',sans-serif" }}>Organisation Chart</h1>
          <p style={{ fontSize: 12, color: "#b89aad", margin: "4px 0 0" }}>
            {loading ? "Loading…" : `${orgName} · ${totalNodes} nodes · ${(data?.managers || []).length} manager${(data?.managers || []).length !== 1 ? "s" : ""} · You are highlighted`}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 22 }}>
          <StatCard label="Organisation"  text={orgName}              icon={Building2} accent="#1a0d14" delay={60}  />
          <StatCard label="Your name"     text={myInfo?.name}         icon={User}      accent="#730042" delay={95}  />
          <StatCard label="Reporting to"  text={myInfo?.managerName}  icon={Users}     accent="#CD166E" delay={130} />
          <StatCard label="Designation"   text={myInfo?.designation}  icon={Crown}     accent="#a8005c" delay={165} />
        </div>

        {searchOpen && searchQuery && matchCount === 0 && (
          <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "#fef9c3", border: "1px solid #fde68a", fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 8, animation: "slideDown 0.2s ease forwards" }}>
            <Search size={13} />No results for <strong style={{ marginLeft: 2 }}>"{searchQuery}"</strong>
          </div>
        )}

        {/* Chart panel */}
        <div style={{ animation: "fadeIn 0.3s ease 240ms forwards", opacity: 0, background: "#fff", border: "1px solid #eedde8", borderRadius: 14, boxShadow: "0 2px 10px rgba(115,0,66,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "11px 16px", borderBottom: "1px solid #f5edf2", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fdf8fb", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Crown size={13} style={{ color: "#b89aad" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#4a3542", fontFamily: "'Syne',sans-serif" }}>Full hierarchy</span>
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#f5edf2", color: "#b89aad", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>
                {loading ? "—" : `${totalNodes} nodes`}
              </span>
              {searchQuery && matchCount > 0 && (
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#fce7f3", color: "#730042", fontWeight: 600 }}>{matchCount} highlighted</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { dot: "#1a0d14", label: "Organisation" },
                { dot: "#5a2240", label: "Admin" },
                { dot: "#a8005c", label: "Manager" },
                { dot: "#CD166E", label: "Your manager" },
                { dot: "#730042", label: "You", ring: true },
              ].map(({ dot, label, ring }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#b89aad" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0, boxShadow: ring ? "0 0 0 2px rgba(115,0,66,0.2)" : "none" }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div ref={chartRef} className="sc" style={{ overflowX: "auto", padding: "36px 40px 36px", background: "#fff" }}>
            <OrgTree data={data} loading={loading} q={norm(searchQuery)} />
          </div>
        </div>
      </div>

      {exportStatus && (
        <div className="et">
          {exportStatus === "loading"
            ? <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Generating PNG…</>
            : <><CheckCircle2 size={14} style={{ color: "#4ade80" }} /> Exported!</>}
        </div>
      )}
    </div>
  );
}