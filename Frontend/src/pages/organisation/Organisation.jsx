import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Crown,
  Users,
  Building2,
  User,
  Download,
  Search,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { useGetOrgInfo } from "../../auth/server-state/adminother/adminother.hook";
// Shared collapsible tree (put OrgChartTree.jsx in src/components, or fix this path)
import {
  OrgTreeView,
  collectMatches,
  exportOrgChartPng,
} from "../../components/OrgChartTree";

const norm = (s = "") => s.toLowerCase().trim();

const DEPT_FULL_FORMS = {
  OPR: "Operations",
  BPO: "Business Process Outsourcing",
  ENG: "Engineering",
  HR: "Human Resources",
  MGMT: "Management",
};

const getDepartmentName = (dept) => DEPT_FULL_FORMS[dept] || dept || "—";

const TREE_THEME = {
  acc: "#730042",
  ring: "rgba(115,0,66,0.12)",
  line: "#c9d2e0",
  pill: "#730042",
  head: "'Syne',sans-serif",
  mono: "'DM Mono',monospace",
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  .org-root, .org-root * { box-sizing: border-box; }

  /* Page scroll (vertical) is handled by MainLayout. The chart block never grows the page
     sideways: extra width scrolls horizontally via the sticky bar at the bottom of the UI. */
  .org-root {
    font-family: 'DM Sans', sans-serif;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    contain: inline-size;
  }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes spin      { to { transform:rotate(360deg); } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }

  .stat-h { transition: transform 0.14s ease; }
  .stat-h:hover { transform: translateY(-2px); }

  /* Chart block: native bar hidden, the sticky bar below drives horizontal scroll */
  .sc-hide { scrollbar-width: none; -ms-overflow-style: none; }
  .sc-hide::-webkit-scrollbar { display: none; width: 0; height: 0; }

  /* Sticky horizontal bar - always visible at the bottom of the page UI */
  .hbar { scrollbar-width: thin; scrollbar-color: #94a3b8 #e2e8f0; }
  .hbar::-webkit-scrollbar { height: 12px; }
  .hbar::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 8px; }
  .hbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 8px; border: 2px solid #e2e8f0; }
  .hbar::-webkit-scrollbar-thumb:hover { background: #64748b; }

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

// ---------------------------------------------------------------------------
// Build the tree from the same API data (nothing in the data is changed):
// Organisation -> Admin -> (managers + co-admins) -> (sub-managers / employees)
// ---------------------------------------------------------------------------
const empNode = (e) => ({
  key: `e-${e.id}`,
  kind: "emp",
  name: e.name,
  lines: [e.department ? getDepartmentName(e.department) : "—", e.designation || "—"],
  empid: e.empid || "—",
  image: e.profile_image,
  hay: [e.department, e.designation],
  children: [],
});

const mgrNode = (m) => ({
  key: `m-${m.id}`,
  kind: "mgr",
  name: m.name,
  lines: [m.department ? getDepartmentName(m.department) : "—", m.designation || "—"],
  empid: m.empid || "—",
  image: m.profile_image,
  hay: [m.department, m.designation],
  children: [
    ...(m.subManagers || []).map(mgrNode),
    ...(m.employees || []).map(empNode),
  ],
});

function buildAdminTree(data) {
  if (!data) return null;
  const managers = (data.managers || []).map(mgrNode);
  const coAdmins = (data.coAdmins || []).map((co) => ({
    key: `ca-${co.id}`,
    kind: "admin",
    isYou: !!co.isCurrentUser,
    name: co.name,
    lines: [co.department ? getDepartmentName(co.department) : "—", co.designation || "—"],
    empid: co.empid || "—",
    image: co.profile_image,
    hay: [co.department, co.designation],
    children: (co.managers || []).map(mgrNode),
  }));

  const admin = data.admin
    ? {
        key: "admin",
        kind: "admin",
        isYou: !!data.admin.isCurrentUser,
        name: data.admin.name,
        lines: [
          data.admin.department ? getDepartmentName(data.admin.department) : "—",
          data.admin.designation || "—",
        ],
        empid: data.admin.empid || "—",
        image: data.admin.profile_image,
        hay: [data.admin.department, data.admin.designation],
        children: [...managers, ...coAdmins],
      }
    : null;

  return {
    key: "org",
    kind: "org",
    name: data.organisation_name || "Organisation",
    lines: data.super_admin?.name ? [data.super_admin.name] : [],
    image: data.organisation_logo,
    hay: [data.super_admin?.name],
    children: admin ? [admin] : [...managers, ...coAdmins],
  };
}

function StatCard({ label, text, icon: Icon, accent, delay = 0 }) {
  return (
    <div
      className="stat-h"
      style={{
        animation: `fadeUp 0.3s ease ${delay}ms forwards`,
        opacity: 0,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 11,
        padding: "13px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accent,
        }}
      />
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          flexShrink: 0,
          background: `${accent}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={14} style={{ color: accent }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#0f172a",
            lineHeight: 1.2,
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "'Syne',sans-serif",
          }}
        >
          {text || "—"}
        </p>
        <p
          style={{
            fontSize: 10.5,
            color: "#94a3b8",
            fontWeight: 500,
            margin: "3px 0 0",
          }}
        >
          {label}
        </p>
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
  const scrollRef = useRef(null);
  const barRef = useRef(null);
  const [bar, setBar] = useState({ sw: 0, show: false });
  const [pos, setPos] = useState({ left: 0, width: 0, top: 0, visible: false });
  const inputRef = useRef(null);
  const exportRef = useRef(null);

  const orgName = data?.organisation_name || "Organisation";

  // Horizontal bar is pinned to the bottom of the SCREEN (fixed), aligned with the chart block.
  // If the chart's own bottom is on screen, the bar sits right at the chart's bottom edge instead.
  useEffect(() => {
    const inner = exportRef.current;
    const sc = scrollRef.current;
    if (!inner || !sc) return;
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
    window.addEventListener("scroll", schedule, true); // capture: catches the layout's scroll container too
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [data, loading, searchOpen]);

  const syncScroll = (from, to) => {
    if (from && to && to.scrollLeft !== from.scrollLeft)
      to.scrollLeft = from.scrollLeft;
  };

  const root = useMemo(() => buildAdminTree(data), [data]);
  const q = norm(searchQuery);
  const matches = useMemo(() => collectMatches(root, q), [root, q]);
  const matchCount = matches.size;

  const totalNodes = useMemo(() => {
    if (!data) return 0;
    let n = 1;
    if (data.admin) n++;
    n += (data.coAdmins || []).length;
    n += countNodes(data.managers || []);
    (data.coAdmins || []).forEach((coAdmin) => {
      n += countNodes(coAdmin.managers || []);
    });
    return n;
  }, [data]);

  const adminInfo = data?.admin || null;

  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 40);
  }, [searchOpen]);

  const handleExport = useCallback(async () => {
    if (exportStatus === "loading") return;
    setExportStatus("loading");
    try {
      // exports exactly what is expanded on screen, with full details
      await exportOrgChartPng({
        target: exportRef.current,
        scroller: scrollRef.current,
        filename: `org-chart-${orgName.replace(/\s+/g, "-").toLowerCase()}.png`,
      });
      setExportStatus("done");
      setTimeout(() => setExportStatus(null), 2600);
    } catch {
      setExportStatus(null);
    }
  }, [exportStatus, orgName]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="org-root">
      <style>{STYLES}</style>

      <div
        className="shrink-0 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 sm:py-0 sm:h-[54px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4"
        style={{ animation: "fadeIn 0.3s ease forwards" }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink min-w-0 overflow-hidden">
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
            {orgName}
          </span>
          <span className="text-slate-200 flex-shrink-0">›</span>
          <span
            className="text-[12px] sm:text-[13px] text-slate-900 font-semibold flex-shrink-0"
            style={{ fontFamily: "'Syne',sans-serif" }}
          >
            Org Chart
          </span>
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div
              className="flex items-center gap-2 w-full sm:w-auto flex-wrap"
              style={{ animation: "slideDown 0.2s ease forwards" }}
            >
              <div className="sw">
                <Search size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  className="si"
                  placeholder="Search name, role, department…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="cb" onClick={() => setSearchQuery("")}>
                    <X size={13} />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="mp">
                  {matchCount} match{matchCount !== 1 ? "es" : ""}
                </div>
              )}
              <button className="hb" onClick={closeSearch}>
                <X size={13} /> Close
              </button>
            </div>
          ) : (
            <button className="hb" onClick={() => setSearchOpen(true)}>
              <Search size={13} /> Search
            </button>
          )}
          <button
            className="hb hb-p"
            onClick={handleExport}
            disabled={loading || exportStatus === "loading"}
          >
            {exportStatus === "loading" ? (
              <>
                <Loader2
                  size={13}
                  style={{ animation: "spin 0.8s linear infinite" }}
                />{" "}
                <span className="hidden xs:inline">Exporting…</span>
              </>
            ) : (
              <>
                <Download size={13} />{" "}
                <span className="hidden xs:inline">Export PNG</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] w-full min-w-0 mx-auto px-3 sm:px-6 pt-4 sm:pt-[22px] pb-6 sm:pb-8">
        <div
          className="shrink-0 mb-4 sm:mb-[18px]"
          style={{ animation: "fadeUp 0.3s ease 50ms forwards", opacity: 0 }}
        >
          <h1
            className="text-[17px] sm:text-[19px] font-bold text-slate-900 m-0 tracking-[-0.3px]"
            style={{ fontFamily: "'Syne',sans-serif" }}
          >
            Organisation Chart
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 mb-0">
            {loading
              ? "Loading…"
              : `${orgName} · ${totalNodes} nodes · ${(data?.managers || []).length} top-level manager${(data?.managers || []).length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 mb-4 sm:mb-5">
          <StatCard
            label="Organisation"
            text={orgName}
            icon={Building2}
            accent="#0f172a"
            delay={60}
          />
          <StatCard
            label="Admin name"
            text={adminInfo?.name}
            icon={User}
            accent="#334155"
            delay={95}
          />
          <StatCard
            label="Department"
            text={
              adminInfo?.department
                ? getDepartmentName(adminInfo.department)
                : undefined
            }
            icon={Users}
            accent="#475569"
            delay={130}
          />
          <StatCard
            label="Designation"
            text={adminInfo?.designation}
            icon={Crown}
            accent="#64748b"
            delay={165}
          />
        </div>

        {searchOpen && searchQuery && matchCount === 0 && (
          <div
            className="shrink-0 mb-3.5 px-3 sm:px-3.5 py-2.5 rounded-lg bg-yellow-100 border border-yellow-200 text-[12px] text-amber-800 flex items-center gap-2 flex-wrap"
            style={{ animation: "slideDown 0.2s ease forwards" }}
          >
            <Search size={13} className="flex-shrink-0" />
            No results for{" "}
            <strong className="ml-0.5 break-all">"{searchQuery}"</strong>
          </div>
        )}

        {/* Full hierarchy block: width is capped to the page, extra width scrolls INSIDE this block */}
        <div
          className="bg-white border border-slate-200 rounded-2xl shadow-sm w-full max-w-full min-w-0 overflow-hidden"
          style={{ animation: "fadeIn 0.3s ease 240ms forwards", opacity: 0 }}
        >
          <div className="shrink-0 px-3 sm:px-4 py-2.5 sm:py-[11px] border-b border-slate-100 flex items-center justify-between bg-[#fafafa] flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <Crown
                size={13}
                style={{ color: "#94a3b8" }}
                className="flex-shrink-0"
              />
              <span
                className="text-[12px] font-semibold text-slate-600 flex-shrink-0"
                style={{ fontFamily: "'Syne',sans-serif" }}
              >
                Full hierarchy
              </span>
              <span
                className="text-[10px] px-1.5 sm:px-[7px] py-0.5 rounded-full bg-slate-100 text-slate-400 font-semibold flex-shrink-0"
                style={{ fontFamily: "'DM Mono',monospace" }}
              >
                {loading ? "—" : `${totalNodes} nodes`}
              </span>
              {searchQuery && matchCount > 0 && (
                <span className="text-[10px] px-1.5 sm:px-[7px] py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold flex-shrink-0">
                  {matchCount} highlighted
                </span>
              )}
            </div>
            <span className="hidden sm:block text-[11px] text-slate-400">
              Click + / − to expand or collapse
            </span>
          </div>

          <div
            data-org-scroll
            ref={scrollRef}
            onScroll={() => syncScroll(scrollRef.current, barRef.current)}
            className="sc-hide bg-white"
            style={{
              width: "100%",
              maxWidth: "100%",
              overflowX: "auto",
              overflowY: "hidden",
            }}
          >
            <div
              ref={exportRef}
              className="bg-white px-4 sm:px-10 py-7 sm:py-9"
              style={{ width: "max-content", minWidth: "100%" }}
            >
              <OrgTreeView
                root={root}
                loading={loading}
                q={q}
                matches={matches}
                theme={TREE_THEME}
              />
            </div>
          </div>
        </div>

        {/* Horizontal scrollbar: fixed at the bottom of the screen, never moves while the page scrolls */}
        <div
          ref={barRef}
          className="hbar"
          onScroll={() => syncScroll(barRef.current, scrollRef.current)}
          style={{
            position: "fixed",
            left: pos.left,
            bottom: 0,
            width: pos.width,
            height: 14,
            zIndex: 40,
            overflowX: "auto",
            overflowY: "hidden",
            display: bar.show && pos.visible ? "block" : "none",
            background: "transparent",
          }}
        >
          <div style={{ width: bar.sw, height: 1 }} />
        </div>
      </div>

      {exportStatus && (
        <div className="et">
          {exportStatus === "loading" ? (
            <>
              <Loader2
                size={14}
                style={{ animation: "spin 0.8s linear infinite" }}
              />{" "}
              Generating PNG…
            </>
          ) : (
            <>
              <CheckCircle2 size={14} style={{ color: "#4ade80" }} /> Exported!
            </>
          )}
        </div>
      )}
    </div>
  );
}