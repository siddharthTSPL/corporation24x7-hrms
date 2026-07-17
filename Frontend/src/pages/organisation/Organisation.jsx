"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Crown, Users, Building2, User,
  Download, Search, X, Loader2, CheckCircle2,
} from "lucide-react";

import { useGetOrgInfo } from "../../auth/server-state/adminother/adminother.hook";

const initials = (name = "") =>
  name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();

const norm = (s = "") => s.toLowerCase().trim();

const DEPT_FULL_FORMS = {
  OPR: "Operations",
  BPO: "Business Process Outsourcing",
  ENG: "Engineering",
  HR: "Human Resources",
  MGMT: "Management",
};

const getDepartmentName = (dept) => DEPT_FULL_FORMS[dept] || dept || "—";

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
    0%,100% { box-shadow: 0 0 0 0 rgba(115,0,66,0.25); }
    50%      { box-shadow: 0 0 0 6px rgba(115,0,66,0.06); }
  }

  .nd { transition: transform 0.16s ease, box-shadow 0.16s ease; cursor: default; }
  .nd:hover { transform: translateY(-2px); }
  .nd-hl  { outline: 2px solid #1e293b !important; outline-offset: 2px; box-shadow: 0 0 0 5px rgba(30,41,59,0.1) !important; }
  .nd-dim { opacity: 0.15; filter: grayscale(0.4); transition: opacity 0.2s, filter 0.2s; }

  .you-pill {
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

  .stat-h { transition: transform 0.14s ease; }
  .stat-h:hover { transform: translateY(-2px); }

  .sc::-webkit-scrollbar { height: 5px; width: 5px; }
  .sc::-webkit-scrollbar-track { background: transparent; }
  .sc::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

  .hb {
    display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;
    border:1px solid #e2e8f0;background:#fff;color:#475569;
    font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;
    transition:background .13s,border-color .13s,color .13s;white-space:nowrap;
  }
  .hb:hover { background:#f8fafc;border-color:#cbd5e1;color:#1e293b; }
  .hb:disabled { opacity:.45;cursor:not-allowed; }
  .hb-p { background:#1e293b;color:#fff;border-color:#1e293b; }
  .hb-p:hover { background:#0f172a;border-color:#0f172a;color:#fff; }

  .sw {
    display:flex;align-items:center;gap:8px;
    border:1px solid #1e293b;border-radius:8px;
    padding:0 10px;background:#fff;height:36px;
    box-shadow:0 0 0 3px rgba(30,41,59,0.08);transition:box-shadow .15s;
    width:100%;
  }
  @media (min-width: 640px) { .sw { width:260px; } }
  .sw:focus-within { box-shadow:0 0 0 4px rgba(30,41,59,0.13); }
  .si { border:none;outline:none;background:transparent;font-size:13px;color:#1e293b;font-family:'DM Sans',sans-serif;flex:1;min-width:0; }
  .si::placeholder { color:#94a3b8; }
  .cb { background:none;border:none;cursor:pointer;color:#94a3b8;display:flex;padding:0; }
  .cb:hover { color:#1e293b; }

  .mp { animation:slideDown .18s ease forwards;display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;background:#f1f5f9;color:#1e293b;font-size:11px;font-weight:600;white-space:nowrap; }
  .et { position:fixed;bottom:16px;right:16px;left:16px;z-index:9999;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;background:#1e293b;color:#fff;font-size:13px;font-weight:500;box-shadow:0 8px 28px rgba(0,0,0,0.22);animation:slideDown .22s ease forwards;font-family:'DM Sans',sans-serif;pointer-events:none;justify-content:center; }
  @media (min-width: 640px) { .et { left:auto;right:24px;bottom:24px;justify-content:flex-start; } }
  .export-mode, .export-mode * { animation:none!important;opacity:1!important;transform:none!important; }

  @media (max-width: 480px) {
    .org-root .nd { padding-left: 8px !important; padding-right: 8px !important; }
  }
`;

function Sk({ w, h, r = 8 }) {
  return (
    <div style={{ width: w, height: h, borderRadius: r, flexShrink: 0, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "600px 100%", animation: "shimmer 1.4s infinite linear" }} />
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
      <mark style={{ background: "#fef08a", color: "#713f12", borderRadius: 2, padding: "0 1px" }}>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

function YouPill() {
  return <span className="you-pill"></span>;
}

const CFG = {
  org:     { accent: "#0f172a", avBg: "#0f172a", avColor: "#f8fafc" },
  admin:   { accent: "#334155", avBg: "#e2e8f0", avColor: "#334155" },
  manager: { accent: "#475569", avBg: "#f1f5f9", avColor: "#475569" },
  subMgr:  { accent: "#64748b", avBg: "#f8fafc", avColor: "#64748b" },
  emp:     { accent: "#94a3b8", avBg: "#f8fafc", avColor: "#64748b" },
};

function Card({ level, name, department, designation, empid, isOrg, width = 172, delay = 0, dim, hl, q, you, empCount }) {
  const c = CFG[level] || CFG.emp;
  return (
    <div style={{ animation: `scaleIn 0.26s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["nd", hl ? "nd-hl" : "", dim ? "nd-dim" : ""].filter(Boolean).join(" ")}
        style={{ width, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 11, padding: "14px 12px 11px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}
      >
        {you && <YouPill />}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: c.accent, borderRadius: "11px 11px 0 0" }} />
        <Avatar name={name} size={38} bg={c.avBg} color={c.avColor} />
        <div style={{ marginTop: 8, marginBottom: 6, textAlign: "center", width: "100%" }}>
          <Hi text={name} q={q} style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", lineHeight: 1.3, fontFamily: "'Syne',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
          {!isOrg && (
            <>
              <Hi text={department || "—"} q={q} style={{ fontSize: 10, color: "#64748b", display: "block", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
              <Hi text={designation || "—"} q={q} style={{ fontSize: 10, color: "#64748b", display: "block", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
              <span style={{ fontSize: 9, color: "#94a3b8", display: "block", marginTop: 2, fontFamily: "'DM Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{empid || "—"}</span>
            </>
          )}
          {empCount !== undefined && <span style={{ fontSize: 10, color: "#94a3b8", display: "block", marginTop: 2 }}>{empCount} report{empCount !== 1 ? "s" : ""}</span>}
        </div>
      </div>
    </div>
  );
}

function VLine({ h = 24 }) {
  return <div style={{ width: 1, height: h, background: "#e2e8f0", margin: "0 auto", flexShrink: 0 }} />;
}

function ManagerTBar({ mgrW, empCount, empW, empGap }) {
  if (empCount === 0) return null;
  const total = Math.max(mgrW, empCount * empW + (empCount - 1) * empGap);
  const barY = 14;
  const offset = (total - (empCount * empW + (empCount - 1) * empGap)) / 2;
  return (
    <svg width={total} height={barY + 4} style={{ display: "block", flexShrink: 0, overflow: "visible" }}>
      <line x1={total / 2} y1={0} x2={total / 2} y2={barY} stroke="#e2e8f0" strokeWidth={1} />
      {empCount > 1 && (
        <line x1={offset + empW / 2} y1={barY} x2={total - offset - empW / 2} y2={barY} stroke="#e2e8f0" strokeWidth={1} />
      )}
      {Array.from({ length: empCount }).map((_, i) => {
        const cx = offset + i * (empW + empGap) + empW / 2;
        return <line key={i} x1={cx} y1={barY} x2={cx} y2={barY + 4} stroke="#e2e8f0" strokeWidth={1} />;
      })}
    </svg>
  );
}

const CARD_W = 172;
const EMP_W  = 152;
const MGR_GAP = 28;
const EMP_GAP = 10;
const SUB_MGR_GAP = 20;

function collectMatchKeys(nodes, q, matches, prefix = "m") {
  if (!q) return;
  nodes.forEach((mgr) => {
    const key = `${prefix}-${mgr.id}`;
    if ([mgr.name, mgr.designation, mgr.department].some(s => s && norm(s).includes(q)))
      matches.add(key);
    (mgr.employees || []).forEach(e => {
      if ([e.name, e.designation, e.department].some(s => s && norm(s).includes(q)))
        matches.add(`e-${e.id}`);
    });
    if (mgr.subManagers?.length) collectMatchKeys(mgr.subManagers, q, matches, `m`);
  });
}

function colWOf(mgr) {
  const empCount = (mgr.employees || []).length;
  const empW = Math.max(CARD_W, empCount > 0 ? empCount * EMP_W + (empCount - 1) * EMP_GAP : 0);
  const subMgrs = mgr.subManagers || [];
  const subW = subMgrs.length > 0
    ? subMgrs.reduce((s, sm) => s + colWOf(sm), 0) + (subMgrs.length - 1) * SUB_MGR_GAP
    : 0;
  return Math.max(CARD_W, empW, subW);
}

function ManagerColumn({ mgr, q, matches, dim, delayRef, isSubMgr = false }) {
  const key = `m-${mgr.id}`;
  const emps = mgr.employees || [];
  const subMgrs = mgr.subManagers || [];
  const totalChildren = emps.length + subMgrs.length;
  const level = isSubMgr ? "subMgr" : "manager";

  const cw = colWOf(mgr);

  const mDelay = delayRef.current;
  delayRef.current += 55;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: cw, flexShrink: 0 }}>
      <Card
        level={level}
        name={mgr.name}
        department={mgr.department ? getDepartmentName(mgr.department) : "—"}
        designation={mgr.designation || "—"}
        empid={mgr.empid}
        width={CARD_W}
        delay={mDelay}
        dim={dim(key)}
        hl={matches.has(key)}
        q={q}
        empCount={totalChildren > 0 ? totalChildren : undefined}
      />

      {subMgrs.length > 0 && (
        <>
          <VLine h={18} />
          {subMgrs.length > 1 && (() => {
            const totalSubW = subMgrs.reduce((s, sm) => s + colWOf(sm), 0) + (subMgrs.length - 1) * SUB_MGR_GAP;
            return (
              <svg width={totalSubW} height={20} style={{ display: "block", flexShrink: 0, overflow: "visible" }}>
                <line x1={totalSubW / 2} y1={0} x2={totalSubW / 2} y2={10} stroke="#e2e8f0" strokeWidth={1} />
                <line x1={colWOf(subMgrs[0]) / 2} y1={10} x2={totalSubW - colWOf(subMgrs[subMgrs.length - 1]) / 2} y2={10} stroke="#e2e8f0" strokeWidth={1} />
                {subMgrs.map((sm, i) => {
                  let cx = 0;
                  for (let j = 0; j < i; j++) cx += colWOf(subMgrs[j]) + SUB_MGR_GAP;
                  cx += colWOf(sm) / 2;
                  return <line key={i} x1={cx} y1={10} x2={cx} y2={20} stroke="#e2e8f0" strokeWidth={1} />;
                })}
              </svg>
            );
          })()}
          <div style={{ display: "flex", gap: SUB_MGR_GAP, alignItems: "flex-start" }}>
            {subMgrs.map(sm => (
              <ManagerColumn key={sm.id} mgr={sm} q={q} matches={matches} dim={dim} delayRef={delayRef} isSubMgr />
            ))}
          </div>
        </>
      )}

      {emps.length > 0 && (
        <>
          <ManagerTBar mgrW={CARD_W} empCount={emps.length} empW={EMP_W} empGap={EMP_GAP} />
          <div style={{ display: "flex", gap: EMP_GAP, alignItems: "flex-start" }}>
            {emps.map(emp => {
              const eKey = `e-${emp.id}`;
              const eDelay = delayRef.current;
              delayRef.current += 18;
              return (
                <Card
                  key={emp.id}
                  level="emp"
                  name={emp.name}
                  department={emp.department ? getDepartmentName(emp.department) : "—"}
                  designation={emp.designation || "—"}
                  empid={emp.empid}
                  width={EMP_W}
                  delay={eDelay}
                  dim={dim(eKey)}
                  hl={matches.has(eKey)}
                  q={q}
                />
              );
            })}
          </div>
        </>
      )}

      {emps.length === 0 && subMgrs.length === 0 && (
        <div style={{ marginTop: 10, padding: "6px 14px", borderRadius: 8, border: "1px dashed #e2e8f0", fontSize: 11, color: "#cbd5e1", background: "#fafafa" }}>
          No reports
        </div>
      )}
    </div>
  );
}

function SkeletonTree() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Sk w={172} h={104} r={11} />
      <div style={{ width: 1, height: 24, background: "#e2e8f0" }} />
      <Sk w={172} h={96} r={11} />
      <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />
      <div style={{ display: "flex", gap: 28 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Sk w={172} h={96} r={11} />
            <div style={{ width: 1, height: 16, background: "#e2e8f0" }} />
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

function OrgTree({ data, loading, q }) {
  if (loading) return <SkeletonTree />;
  if (!data) return null;

  const hasQ = q.length > 0;
  const matches = new Set();

  if (hasQ) {
    const chk = (...ss) => ss.some(s => s && norm(s).includes(q));
    if (chk(data.organisation_name, data.super_admin?.name)) matches.add("org");
    if (chk(data.admin?.name, data.admin?.designation, data.admin?.department)) matches.add("admin");
    collectMatchKeys(data.managers || [], q, matches);
  }

  const anyMatch = matches.size > 0;
  const dim = (k) => hasQ && anyMatch && !matches.has(k);

  const managers = data.managers || [];
  const totalW = managers.reduce((s, m) => s + colWOf(m), 0) + Math.max(0, managers.length - 1) * MGR_GAP;
  const topBarW = Math.max(CARD_W, totalW);

  const delayRef = { current: 160 };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "max-content" }}>
      <div style={{ animation: `scaleIn 0.26s ease 40ms forwards`, opacity: 0 }}>
        <Card level="org" name={data.organisation_name || "Organisation"} department="—" designation={data.super_admin?.name || "—"} isOrg width={CARD_W} delay={0} dim={dim("org")} hl={matches.has("org")} q={q} />
      </div>
      <VLine h={22} />

      {data.admin && (
        <>
          <Card
            level="admin"
            name={data.admin.name}
            department={data.admin.department ? getDepartmentName(data.admin.department) : "—"}
            designation={data.admin.designation || "—"}
            empid={data.admin.empid}
            width={CARD_W}
            delay={80}
            dim={dim("admin")}
            hl={matches.has("admin")}
            q={q}
            you
          />
          <VLine h={22} />
        </>
      )}

      {managers.length > 1 && (
        <svg width={topBarW} height={20} style={{ display: "block", flexShrink: 0, overflow: "visible" }}>
          <line x1={topBarW / 2} y1={0} x2={topBarW / 2} y2={10} stroke="#e2e8f0" strokeWidth={1} />
          <line x1={colWOf(managers[0]) / 2} y1={10} x2={topBarW - colWOf(managers[managers.length - 1]) / 2} y2={10} stroke="#e2e8f0" strokeWidth={1} />
          {managers.map((mgr, i) => {
            let cx = 0;
            for (let j = 0; j < i; j++) cx += colWOf(managers[j]) + MGR_GAP;
            cx += colWOf(mgr) / 2;
            return <line key={i} x1={cx} y1={10} x2={cx} y2={20} stroke="#e2e8f0" strokeWidth={1} />;
          })}
        </svg>
      )}

      <div style={{ display: "flex", gap: MGR_GAP, alignItems: "flex-start" }}>
        {managers.map(mgr => (
          <ManagerColumn key={mgr.id} mgr={mgr} q={q} matches={matches} dim={dim} delayRef={delayRef} />
        ))}
        {managers.length === 0 && (
          <div style={{ padding: "14px 28px", borderRadius: 10, border: "1px dashed #e2e8f0", fontSize: 13, color: "#cbd5e1", background: "#fafafa" }}>
            No managers added yet
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, text, icon: Icon, accent, delay = 0 }) {
  return (
    <div className="stat-h" style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards`, opacity: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 11, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={14} style={{ color: accent }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a", lineHeight: 1.2, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Syne',sans-serif" }}>{text || "—"}</p>
        <p style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 500, margin: "3px 0 0" }}>{label}</p>
      </div>
    </div>
  );
}

function countNodes(managers) {
  let n = 0;
  for (const mgr of managers) {
    n += 1 + (mgr.employees?.length || 0);
    if (mgr.subManagers?.length) n += countNodes(mgr.subManagers);
  }
  return n;
}

export default function OrganizationPageAdmin() {
  const { data, isLoading: loading } = useGetOrgInfo();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportStatus, setExportStatus] = useState(null);
  const inputRef = useRef(null);
  const chartRef = useRef(null);

  const orgName = data?.organisation_name || "Organisation";

  const matchCount = useMemo(() => {
    if (!searchQuery || !data) return 0;
    const q = norm(searchQuery);
    let n = 0;
    const chk = (...ss) => ss.some(s => s && norm(s).includes(q));
    if (chk(data.organisation_name)) n++;
    if (chk(data.admin?.name, data.admin?.designation, data.admin?.department)) n++;
    const walk = (nodes) => nodes.forEach(mgr => {
      if (chk(mgr.name, mgr.department, mgr.designation)) n++;
      (mgr.employees || []).forEach(e => { if (chk(e.name, e.designation, e.department)) n++; });
      if (mgr.subManagers?.length) walk(mgr.subManagers);
    });
    walk(data.managers || []);
    return n;
  }, [searchQuery, data]);

  const totalNodes = useMemo(() => {
    if (!data) return 0;
    let n = 1;
    if (data.admin) n++;
    n += countNodes(data.managers || []);
    return n;
  }, [data]);

  const adminInfo = data?.admin || null;

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
    <div className="org-root min-h-screen bg-slate-50">
      <style>{STYLES}</style>

      <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-0 sm:h-[54px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4" style={{ animation: "fadeIn 0.3s ease forwards" }}>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink min-w-0 overflow-hidden">
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">{orgName}</span>
          <span className="text-slate-200 flex-shrink-0">›</span>
          <span className="text-[12px] sm:text-[13px] text-slate-900 font-semibold flex-shrink-0" style={{ fontFamily: "'Syne',sans-serif" }}>Org Chart</span>
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap" style={{ animation: "slideDown 0.2s ease forwards" }}>
              <div className="sw">
                <Search size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
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
              ? <><Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> <span className="hidden xs:inline">Exporting…</span></>
              : <><Download size={13} /> <span className="hidden xs:inline">Export PNG</span></>}
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 pt-4 sm:pt-[22px] pb-8 sm:pb-12">
        <div className="mb-4 sm:mb-[18px]" style={{ animation: "fadeUp 0.3s ease 50ms forwards", opacity: 0 }}>
          <h1 className="text-[17px] sm:text-[19px] font-bold text-slate-900 m-0 tracking-[-0.3px]" style={{ fontFamily: "'Syne',sans-serif" }}>Organisation Chart</h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 mb-0">
            {loading ? "Loading…" : `${orgName} · ${totalNodes} nodes · ${(data?.managers || []).length} top-level manager${(data?.managers || []).length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 mb-5 sm:mb-[22px]">
          <StatCard label="Organisation"  text={orgName}                                icon={Building2} accent="#0f172a" delay={60}  />
          <StatCard label="Admin name"    text={adminInfo?.name}                        icon={User}      accent="#334155" delay={95}  />
          <StatCard label="Department"    text={adminInfo?.department ? getDepartmentName(adminInfo.department) : undefined} icon={Users}     accent="#475569" delay={130} />
          <StatCard label="Designation"   text={adminInfo?.designation}                 icon={Crown}     accent="#64748b" delay={165} />
        </div>

        {searchOpen && searchQuery && matchCount === 0 && (
          <div className="mb-3.5 px-3 sm:px-3.5 py-2.5 rounded-lg bg-yellow-100 border border-yellow-200 text-[12px] text-amber-800 flex items-center gap-2 flex-wrap" style={{ animation: "slideDown 0.2s ease forwards" }}>
            <Search size={13} className="flex-shrink-0" />No results for <strong className="ml-0.5 break-all">"{searchQuery}"</strong>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" style={{ animation: "fadeIn 0.3s ease 240ms forwards", opacity: 0 }}>
          <div className="px-3 sm:px-4 py-2.5 sm:py-[11px] border-b border-slate-100 flex items-center justify-between bg-[#fafafa] flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <Crown size={13} style={{ color: "#94a3b8" }} className="flex-shrink-0" />
              <span className="text-[12px] font-semibold text-slate-600 flex-shrink-0" style={{ fontFamily: "'Syne',sans-serif" }}>Full hierarchy</span>
              <span className="text-[10px] px-1.5 sm:px-[7px] py-0.5 rounded-full bg-slate-100 text-slate-400 font-semibold flex-shrink-0" style={{ fontFamily: "'DM Mono',monospace" }}>
                {loading ? "—" : `${totalNodes} nodes`}
              </span>
              {searchQuery && matchCount > 0 && (
                <span className="text-[10px] px-1.5 sm:px-[7px] py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold flex-shrink-0">{matchCount} highlighted</span>
              )}
            </div>
          </div>

          <div ref={chartRef} className="sc bg-white px-4 sm:px-10 py-7 sm:py-9" style={{ overflowX: "auto" }}>
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