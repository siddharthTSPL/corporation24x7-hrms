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

// Backend stores short department codes (OPR, BPO, ENG, HR, MGMT). The UI
// should always show the full department name — for every current node and
// any new manager/employee added later — so this is a lookup keyed by the
// short code rather than anything hardcoded per-node.
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
    display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;
    border:1px solid #e8dde5;background:#fff;color:#4a3542;
    font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;
    transition:background .13s,border-color .13s,color .13s;white-space:nowrap;
  }
  .hb:hover { background:#fdf6fa;border-color:#c9afc0;color:#730042; }
  .hb:disabled { opacity:.45;cursor:not-allowed; }
  .hb-p { background:#730042;color:#fff;border-color:#730042; }
  .hb-p:hover { background:#5a0033;border-color:#5a0033;color:#fff; }

  .sw {
    display:flex;align-items:center;gap:8px;
    border:1px solid #730042;border-radius:8px;
    padding:0 10px;background:#fff;height:36px;
    box-shadow:0 0 0 3px rgba(115,0,66,0.09);transition:box-shadow .15s;
    width:100%;
  }
  @media (min-width: 640px) { .sw { width:260px; } }
  .sw:focus-within { box-shadow:0 0 0 4px rgba(115,0,66,0.15); }
  .si { border:none;outline:none;background:transparent;font-size:13px;color:#1e293b;font-family:'DM Sans',sans-serif;flex:1;min-width:0; }
  .si::placeholder { color:#b89aad; }
  .cb { background:none;border:none;cursor:pointer;color:#b89aad;display:flex;padding:0; }
  .cb:hover { color:#730042; }

  .mp { animation:slideDown .18s ease forwards;display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;background:#fdf0f7;color:#730042;font-size:11px;font-weight:600;white-space:nowrap; }
  .et { position:fixed;bottom:16px;right:16px;left:16px;z-index:9999;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:10px;background:#1e0e17;color:#fff;font-size:13px;font-weight:500;box-shadow:0 8px 28px rgba(0,0,0,0.22);animation:slideDown .22s ease forwards;font-family:'DM Sans',sans-serif;pointer-events:none;justify-content:center; }
  @media (min-width: 640px) { .et { left:auto;right:24px;bottom:24px;justify-content:flex-start; } }
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

// Colour is only applied when a node is on the viewer's own line: their manager
// chain going up to the org root, and themselves. Everyone else is black & white.
const CFG = {
  org:     { accentOn: "#1a0d14", avBgOn: "#1a0d14", avColorOn: "#f5edf2" },
  admin:   { accentOn: "#5a2240", avBgOn: "#f0e4ec", avColorOn: "#5a2240" },
  manager: { accentOn: "#a8005c", avBgOn: "#fce7f3", avColorOn: "#a8005c" },
  myMgr:   { accentOn: "#CD166E", avBgOn: "#fce7f3", avColorOn: "#CD166E" },
  subMgr:  { accentOn: "#be185d", avBgOn: "#fce7f3", avColorOn: "#be185d" },
  emp:     { accentOn: "#7c1f4a", avBgOn: "#fce7f3", avColorOn: "#7c1f4a" },
};
const OFF = { accent: "#d4d4d8", avBg: "#f1f5f9", avColor: "#94a3b8", text: "#94a3b8", sub: "#c2c2c8" };

function Card({ level, name, sub, empid, width = 172, delay = 0, dim, hl, chain, q, you = false, empCount }) {
  const c = CFG[level] || CFG.emp;
  const accent  = chain ? c.accentOn  : OFF.accent;
  const avBg    = chain ? c.avBgOn    : OFF.avBg;
  const avColor = chain ? c.avColorOn : OFF.avColor;
  const nameColor = chain ? "#1a0d14" : OFF.text;
  const subColor  = chain ? "#8a6878" : OFF.sub;
  const idColor   = chain ? "#c8a8bb" : OFF.sub;

  return (
    <div style={{ animation: `scaleIn 0.26s ease ${delay}ms forwards`, opacity: 0, flexShrink: 0 }}>
      <div
        className={["nd", hl ? "nd-hl" : "", dim ? "nd-dim" : "", you ? "nd-you" : ""].filter(Boolean).join(" ")}
        style={{ width, background: "#fff", border: `1px solid ${chain ? "#eedde8" : "#e5e7eb"}`, borderRadius: 11, padding: "14px 12px 11px", boxShadow: "0 2px 8px rgba(115,0,66,0.04)", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: you ? "linear-gradient(90deg,#730042,#CD166E)" : accent, borderRadius: "11px 11px 0 0" }} />
        {you && <div style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", fontSize: 7, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 8, background: "#730042", color: "#fff", whiteSpace: "nowrap", fontFamily: "'DM Mono',monospace" }}>YOU</div>}
        <Avatar name={name} size={38} bg={you ? "#fce7f3" : avBg} color={you ? "#730042" : avColor} />
        <div style={{ marginTop: 8, marginBottom: 6, textAlign: "center", width: "100%" }}>
          <Hi text={name} q={q} style={{ fontSize: 12, fontWeight: 600, color: nameColor, display: "block", lineHeight: 1.3, fontFamily: "'Syne',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
          {sub && <Hi text={sub} q={q} style={{ fontSize: 10, color: subColor, display: "block", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />}
          {empid && <span style={{ fontSize: 9, color: idColor, display: "block", marginTop: 2, fontFamily: "'DM Mono',monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{empid}</span>}
          {empCount !== undefined && <span style={{ fontSize: 10, color: idColor, display: "block", marginTop: 2 }}>{empCount} report{empCount !== 1 ? "s" : ""}</span>}
        </div>
      </div>
    </div>
  );
}

function VLine({ h = 24 }) {
  return <div style={{ width: 1, height: h, background: "#dcc0d0", margin: "0 auto", flexShrink: 0 }} />;
}

function ManagerTBar({ mgrW, empCount, empW, empGap }) {
  if (empCount === 0) return null;
  const total = Math.max(mgrW, empCount * empW + (empCount - 1) * empGap);
  const barY = 14;
  const offset = (total - (empCount * empW + (empCount - 1) * empGap)) / 2;
  return (
    <svg width={total} height={barY + 4} style={{ display: "block", flexShrink: 0, overflow: "visible" }}>
      <line x1={total / 2} y1={0} x2={total / 2} y2={barY} stroke="#dcc0d0" strokeWidth={1} />
      {empCount > 1 && (
        <line x1={offset + empW / 2} y1={barY} x2={total - offset - empW / 2} y2={barY} stroke="#dcc0d0" strokeWidth={1} />
      )}
      {Array.from({ length: empCount }).map((_, i) => {
        const cx = offset + i * (empW + empGap) + empW / 2;
        return <line key={i} x1={cx} y1={barY} x2={cx} y2={barY + 4} stroke="#dcc0d0" strokeWidth={1} />;
      })}
    </svg>
  );
}

const CARD_W = 172;
const EMP_W  = 152;
const MGR_GAP = 28;
const EMP_GAP = 10;
const SUB_MGR_GAP = 20;

function colWOf(mgr) {
  const empCount = (mgr.employees || []).length;
  const empW = Math.max(CARD_W, empCount > 0 ? empCount * EMP_W + (empCount - 1) * EMP_GAP : 0);
  const subMgrs = mgr.subManagers || [];
  const subW = subMgrs.length > 0
    ? subMgrs.reduce((s, sm) => s + colWOf(sm), 0) + (subMgrs.length - 1) * SUB_MGR_GAP
    : 0;
  return Math.max(CARD_W, empW, subW);
}

function collectMatchKeys(nodes, q, matches) {
  if (!q) return;
  nodes.forEach(mgr => {
    const key = `m-${mgr.id}`;
    if ([mgr.name, mgr.designation, mgr.department].some(s => s && norm(s).includes(q)))
      matches.add(key);
    (mgr.employees || []).forEach(e => {
      if ([e.name, e.designation, e.department].some(s => s && norm(s).includes(q)))
        matches.add(`e-${e.id}`);
    });
    if (mgr.subManagers?.length) collectMatchKeys(mgr.subManagers, q, matches);
  });
}

// Walk the tree to find "me" (isCurrentUser employee), then collect every manager
// id on the path from the org root down to my direct manager, plus my own id.
function findEmployeeChain(managers) {
  for (const mgr of managers) {
    const emp = (mgr.employees || []).find(e => e.isCurrentUser);
    if (emp) {
      return { path: new Set([`m-${mgr.id}`]), employeeId: `e-${emp.id}` };
    }
    if (mgr.subManagers?.length) {
      const found = findEmployeeChain(mgr.subManagers);
      if (found) {
        found.path.add(`m-${mgr.id}`);
        return found;
      }
    }
  }
  return null;
}

function buildChainIds(data) {
  const ids = new Set(["org", "admin"]);
  const found = findEmployeeChain(data?.managers || []);
  if (found) {
    found.path.forEach(id => ids.add(id));
    ids.add(found.employeeId);
  }
  return ids;
}

function ManagerColumn({ mgr, q, matches, dim, delayRef, chainIds, isSubMgr = false }) {
  const key = `m-${mgr.id}`;
  const emps = mgr.employees || [];
  const subMgrs = mgr.subManagers || [];

  let level = "manager";
  if (isSubMgr) level = mgr.isCurrentUserManager ? "myMgr" : "subMgr";
  else level = mgr.isCurrentUserManager ? "myMgr" : "manager";

  const cw = colWOf(mgr);
  const mDelay = delayRef.current;
  delayRef.current += 55;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: cw, flexShrink: 0 }}>
      <Card
        level={level}
        name={mgr.name}
        sub={mgr.designation || (mgr.department ? getDepartmentName(mgr.department) : undefined)}
        empid={mgr.empid}
        width={CARD_W}
        delay={mDelay}
        dim={dim(key)}
        hl={matches.has(key)}
        chain={chainIds.has(key)}
        q={q}
        empCount={(emps.length + subMgrs.length) > 0 ? emps.length + subMgrs.length : undefined}
      />

      {subMgrs.length > 0 && (
        <>
          <VLine h={18} />
          {subMgrs.length > 1 && (() => {
            const totalSubW = subMgrs.reduce((s, sm) => s + colWOf(sm), 0) + (subMgrs.length - 1) * SUB_MGR_GAP;
            return (
              <svg width={totalSubW} height={20} style={{ display: "block", flexShrink: 0, overflow: "visible" }}>
                <line x1={totalSubW / 2} y1={0} x2={totalSubW / 2} y2={10} stroke="#dcc0d0" strokeWidth={1} />
                <line x1={colWOf(subMgrs[0]) / 2} y1={10} x2={totalSubW - colWOf(subMgrs[subMgrs.length - 1]) / 2} y2={10} stroke="#dcc0d0" strokeWidth={1} />
                {subMgrs.map((sm, i) => {
                  let cx = 0;
                  for (let j = 0; j < i; j++) cx += colWOf(subMgrs[j]) + SUB_MGR_GAP;
                  cx += colWOf(sm) / 2;
                  return <line key={i} x1={cx} y1={10} x2={cx} y2={20} stroke="#dcc0d0" strokeWidth={1} />;
                })}
              </svg>
            );
          })()}
          <div style={{ display: "flex", gap: SUB_MGR_GAP, alignItems: "flex-start" }}>
            {subMgrs.map(sm => (
              <ManagerColumn key={sm.id} mgr={sm} q={q} matches={matches} dim={dim} delayRef={delayRef} chainIds={chainIds} isSubMgr />
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
                  sub={emp.designation || (emp.department ? getDepartmentName(emp.department) : undefined)}
                  empid={emp.empid}
                  width={EMP_W}
                  delay={eDelay}
                  dim={dim(eKey)}
                  hl={matches.has(eKey)}
                  chain={chainIds.has(eKey)}
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

function countNodes(managers) {
  let n = 0;
  for (const mgr of managers) {
    n += 1 + (mgr.employees?.length || 0);
    if (mgr.subManagers?.length) n += countNodes(mgr.subManagers);
  }
  return n;
}

function OrgTree({ data, loading, q }) {
  const chainIds = useMemo(() => buildChainIds(data), [data]);

  if (loading) return <SkeletonTree />;
  if (!data) return null;

  const hasQ = q.length > 0;
  const matches = new Set();

  if (hasQ) {
    const chk = (...ss) => ss.some(s => s && norm(s).includes(q));
    if (chk(data.organisation_name, data.super_admin?.name)) matches.add("org");
    if (chk(data.admin?.name, data.admin?.designation)) matches.add("admin");
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
        <Card level="org" name={data.organisation_name || "Organisation"} sub={data.super_admin?.name} width={CARD_W} delay={0} dim={dim("org")} hl={matches.has("org")} chain={chainIds.has("org")} q={q} />
      </div>
      <VLine h={22} />

      {data.admin && (
        <>
          <Card level="admin" name={data.admin.name} sub={data.admin.designation} empid={data.admin.empid} width={CARD_W} delay={80} dim={dim("admin")} hl={matches.has("admin")} chain={chainIds.has("admin")} q={q} />
          <VLine h={22} />
        </>
      )}

      {managers.length > 1 && (
        <svg width={topBarW} height={20} style={{ display: "block", flexShrink: 0, overflow: "visible" }}>
          <line x1={topBarW / 2} y1={0} x2={topBarW / 2} y2={10} stroke="#dcc0d0" strokeWidth={1} />
          <line x1={colWOf(managers[0]) / 2} y1={10} x2={topBarW - colWOf(managers[managers.length - 1]) / 2} y2={10} stroke="#dcc0d0" strokeWidth={1} />
          {managers.map((mgr, i) => {
            let cx = 0;
            for (let j = 0; j < i; j++) cx += colWOf(managers[j]) + MGR_GAP;
            cx += colWOf(mgr) / 2;
            return <line key={i} x1={cx} y1={10} x2={cx} y2={20} stroke="#dcc0d0" strokeWidth={1} />;
          })}
        </svg>
      )}

      <div style={{ display: "flex", gap: MGR_GAP, alignItems: "flex-start" }}>
        {managers.map(mgr => (
          <ManagerColumn key={mgr.id} mgr={mgr} q={q} matches={matches} dim={dim} delayRef={delayRef} chainIds={chainIds} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, text, icon: Icon, accent, delay = 0 }) {
  return (
    <div className="stat-h relative overflow-hidden bg-white border border-[#eedde8] rounded-[11px] p-3.5 sm:p-4 flex items-center gap-2.5 sm:gap-[13px] shadow-[0_1px_4px_rgba(115,0,66,0.04)] min-w-0" style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards`, opacity: 0 }}>
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shrink-0 flex items-center justify-center" style={{ background: `${accent}18` }}>
        <Icon size={14} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] sm:text-[13px] font-semibold text-[#1a0d14] leading-[1.2] m-0 truncate" style={{ fontFamily: "'Syne',sans-serif" }}>{text || "—"}</p>
        <p className="text-[10px] sm:text-[11px] text-[#b89aad] font-medium mt-[3px] mb-0 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function OrganizationPageEmployee() {
  const { data, isLoading: loading } = useGetOrgInfoEmployee();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportStatus, setExportStatus] = useState(null);
  const inputRef = useRef(null);
  const chartRef = useRef(null);

  const orgName = data?.organisation_name || "My Organisation";

  const myInfo = useMemo(() => {
    if (!data) return null;
    const walk = (nodes, mgrName = null) => {
      for (const mgr of nodes) {
        const emp = mgr.employees?.find(e => e.isCurrentUser);
        if (emp) return { ...emp, managerName: mgr.name };
        if (mgr.subManagers?.length) {
          const found = walk(mgr.subManagers, mgr.name);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(data.managers || []);
  }, [data]);

  const matchCount = useMemo(() => {
    if (!searchQuery || !data) return 0;
    const q = norm(searchQuery);
    let n = 0;
    const chk = (...ss) => ss.some(s => s && norm(s).includes(q));
    if (chk(data.organisation_name)) n++;
    if (chk(data.admin?.name, data.admin?.designation)) n++;
    const walk = (nodes) => nodes.forEach(mgr => {
      if (chk(mgr.name, mgr.department, mgr.designation)) n++;
      (mgr.employees || []).forEach(e => { if (chk(e.name, e.designation)) n++; });
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
    <div className="org-root min-h-screen bg-[#faf5f8] overflow-x-hidden">
      <style>{STYLES}</style>

      <div className="bg-white border-b border-[#eedde8] px-3 sm:px-6 py-2.5 sm:py-0 sm:h-[54px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4" style={{ animation: "fadeIn 0.3s ease forwards" }}>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink min-w-0 overflow-hidden">
          <span className="text-[11px] sm:text-xs text-[#b89aad] font-medium truncate">{orgName}</span>
          <span className="text-[#dcc0d0] flex-shrink-0">›</span>
          <span className="text-[12px] sm:text-[13px] text-[#1a0d14] font-semibold flex-shrink-0" style={{ fontFamily: "'Syne',sans-serif" }}>Org Chart</span>
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap" style={{ animation: "slideDown 0.2s ease forwards" }}>
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
              ? <><Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> <span className="hidden xs:inline">Exporting…</span></>
              : <><Download size={13} /> <span className="hidden xs:inline">Export PNG</span></>}
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 pt-4 sm:pt-[22px] pb-8 sm:pb-12">
        <div className="mb-4 sm:mb-[18px]" style={{ animation: "fadeUp 0.3s ease 50ms forwards", opacity: 0 }}>
          <h1 className="text-[17px] sm:text-[19px] font-bold text-[#1a0d14] m-0 tracking-[-0.3px]" style={{ fontFamily: "'Syne',sans-serif" }}>Organisation Chart</h1>
          <p className="text-[11px] sm:text-xs text-[#b89aad] mt-1 mb-0">
            {loading ? "Loading…" : `${orgName} · ${totalNodes} nodes · your reporting line is highlighted`}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 mb-5 sm:mb-[22px]">
          <StatCard label="Organisation"  text={orgName}                                                          icon={Building2} accent="#1a0d14" delay={60}  />
          <StatCard label="Your name"     text={myInfo?.name}                                                    icon={User}      accent="#730042" delay={95}  />
          <StatCard label="Reporting to"  text={myInfo?.managerName}                                             icon={Users}     accent="#CD166E" delay={130} />
          <StatCard label="Designation"   text={myInfo?.designation}                                             icon={Crown}     accent="#a8005c" delay={165} />
        </div>

        {searchOpen && searchQuery && matchCount === 0 && (
          <div className="mb-3.5 px-3 sm:px-3.5 py-2.5 rounded-lg bg-[#fef9c3] border border-[#fde68a] text-[12px] text-[#92400e] flex items-center gap-2 flex-wrap" style={{ animation: "slideDown 0.2s ease forwards" }}>
            <Search size={13} className="flex-shrink-0" />No results for <strong className="ml-0.5 break-all">"{searchQuery}"</strong>
          </div>
        )}

        <div className="bg-white border border-[#eedde8] rounded-2xl shadow-[0_2px_10px_rgba(115,0,66,0.05)] overflow-hidden" style={{ animation: "fadeIn 0.3s ease 240ms forwards", opacity: 0 }}>
          <div className="px-3 sm:px-4 py-2.5 sm:py-[11px] border-b border-[#f5edf2] flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#fdf8fb] flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
              <Crown size={13} style={{ color: "#b89aad" }} className="flex-shrink-0" />
              <span className="text-[12px] font-semibold text-[#4a3542] flex-shrink-0" style={{ fontFamily: "'Syne',sans-serif" }}>Full hierarchy</span>
              <span className="text-[10px] px-1.5 sm:px-[7px] py-0.5 rounded-full bg-[#f5edf2] text-[#b89aad] font-semibold flex-shrink-0" style={{ fontFamily: "'DM Mono',monospace" }}>
                {loading ? "—" : `${totalNodes} nodes`}
              </span>
              {searchQuery && matchCount > 0 && (
                <span className="text-[10px] px-1.5 sm:px-[7px] py-0.5 rounded-full bg-[#fce7f3] text-[#730042] font-semibold flex-shrink-0">{matchCount} highlighted</span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 sm:mt-0">
              {[
                { dot: "#730042", label: "You", ring: true },
                { dot: "#CD166E", label: "Your manager" },
                { dot: "#a8005c", label: "In your line" },
                { dot: "#d4d4d8", label: "Others" },
              ].map(({ dot, label, ring }) => (
                <div key={label} className="flex items-center gap-1.5 text-[11px] text-[#b89aad]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot, boxShadow: ring ? "0 0 0 2px rgba(115,0,66,0.2)" : "none" }} />
                  {label}
                </div>
              ))}
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