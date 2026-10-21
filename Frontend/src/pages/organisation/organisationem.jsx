"use client";

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

import { useGetOrgInfoEmployee } from "../../auth/server-state/employee/employeeother/employeeother.hook";
// Shared collapsible tree (put OrgChartTree.jsx in src/components, or fix this path)
import {
  OrgTreeView,
  collectMatches,
  exportOrgChartPng,
} from "../../components/OrgChartTree";

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

const TREE_THEME = {
  acc: "#730042",
  ring: "rgba(115,0,66,0.12)",
  line: "#dcc0d0",
  pill: "#730042",
  head: "'Syne',sans-serif",
  mono: "'DM Mono',monospace",
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  .org-root, .org-root * { box-sizing: border-box; }

  /* Page never scrolls sideways: extra chart width scrolls INSIDE the chart block only */
  .org-root {
    font-family: 'DM Sans', sans-serif;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    contain: inline-size;
  }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes spin      { to { transform:rotate(360deg); } }
  @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }

  .stat-h { transition: transform 0.14s ease; }
  .stat-h:hover { transform: translateY(-2px); }

  /* Chart scroll area: native bars hidden, the fixed bar at the bottom of the screen drives horizontal scroll */
  .sc {
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }
  .sc::-webkit-scrollbar { display: none; width: 0; height: 0; }

  /* Horizontal bar pinned to the bottom of the screen */
  .hbar { scrollbar-width: thin; scrollbar-color: #c9afc0 #f5edf2; }
  .hbar::-webkit-scrollbar { height: 12px; }
  .hbar::-webkit-scrollbar-track { background: #f5edf2; border-radius: 8px; }
  .hbar::-webkit-scrollbar-thumb { background: #c9afc0; border-radius: 8px; border: 2px solid #f5edf2; }
  .hbar::-webkit-scrollbar-thumb:hover { background: #730042; }

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
  /* After the intro animations are done, drop them completely (smoother, crisper scrolling) */
  .org-root.org-settled [style*="animation"] { animation: none !important; opacity: 1 !important; }
  /* While scrolling, cards ignore the mouse so hover highlight can't make them jitter */
  .org-root.is-scrolling .ot-card, .org-root.is-scrolling .stat-h { pointer-events: none; }
  .export-mode, .export-mode * { animation:none!important;opacity:1!important;transform:none!important; }
`;

// ---------------------------------------------------------------------------
// Build the tree from the same API data (nothing in the data is changed):
// Organisation -> Admin -> managers -> (sub-managers / employees)
// ---------------------------------------------------------------------------
const subOf = (p) =>
  p.designation || (p.department ? getDepartmentName(p.department) : undefined);

const empNode = (e) => ({
  key: `e-${e.id}`,
  kind: "emp",
  isYou: !!e.isCurrentUser,
  name: e.name,
  lines: subOf(e) ? [subOf(e)] : [],
  empid: e.empid,
  image: e.profile_image,
  hay: [e.department, e.designation],
  children: [],
});

const mgrNode = (m) => ({
  key: `m-${m.id}`,
  kind: "mgr",
  name: m.name,
  lines: subOf(m) ? [subOf(m)] : [],
  empid: m.empid,
  image: m.profile_image,
  hay: [m.department, m.designation],
  children: [
    ...(m.subManagers || []).map(mgrNode),
    ...(m.employees || []).map(empNode),
  ],
});

function buildEmpTree(data) {
  if (!data) return null;
  const managers = (data.managers || []).map(mgrNode);
  const admin = data.admin
    ? {
        key: "admin",
        kind: "admin",
        name: data.admin.name,
        lines: data.admin.designation ? [data.admin.designation] : [],
        empid: data.admin.empid,
        image: data.admin.profile_image,
        hay: [data.admin.designation],
        children: managers,
      }
    : null;

  return {
    key: "org",
    kind: "org",
    name: data.organisation_name || "Organisation",
    lines: data.super_admin?.name ? [data.super_admin.name] : [],
    image: data.organisation_logo,
    hay: [data.super_admin?.name],
    children: admin ? [admin] : managers,
  };
}

function StatCard({ label, text, icon: Icon, accent, delay = 0 }) {
  return (
    <div
      className="stat-h relative overflow-hidden bg-white border border-[#eedde8] rounded-[11px] p-3.5 sm:p-4 flex items-center gap-2.5 sm:gap-[13px] shadow-[0_1px_4px_rgba(115,0,66,0.04)] min-w-0"
      style={{ animation: `fadeUp 0.3s ease ${delay}ms forwards`, opacity: 0 }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: accent }}
      />
      <div
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shrink-0 flex items-center justify-center"
        style={{ background: `${accent}18` }}
      >
        <Icon size={14} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p
          className="text-[12px] sm:text-[13px] font-semibold text-[#1a0d14] leading-[1.2] m-0 truncate"
          style={{ fontFamily: "'Syne',sans-serif" }}
        >
          {text || "—"}
        </p>
        <p className="text-[10px] sm:text-[11px] text-[#b89aad] font-medium mt-[3px] mb-0 truncate">
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

export default function OrganizationPageEmployee() {
  const { data, isLoading: loading } = useGetOrgInfoEmployee();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportStatus, setExportStatus] = useState(null);
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const [settled, setSettled] = useState(false);

  // chartRef = horizontally scrolling viewport, exportRef = full-width chart content inside it
  const chartRef = useRef(null);
  const exportRef = useRef(null);
  const barRef = useRef(null);
  const [bar, setBar] = useState({ sw: 0, show: false });
  const [pos, setPos] = useState({ left: 0, width: 0, visible: false });

  const orgName = data?.organisation_name || "My Organisation";

  const myInfo = useMemo(() => {
    if (!data) return null;
    const walk = (nodes) => {
      for (const mgr of nodes) {
        const emp = mgr.employees?.find((e) => e.isCurrentUser);
        if (emp) return { ...emp, managerName: mgr.name };
        if (mgr.subManagers?.length) {
          const found = walk(mgr.subManagers);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(data.managers || []);
  }, [data]);

  const tree = useMemo(() => buildEmpTree(data), [data]);
  const q = norm(searchQuery);
  const matches = useMemo(() => collectMatches(tree, q), [tree, q]);
  const matchCount = matches.size;

  const totalNodes = useMemo(() => {
    if (!data) return 0;
    let n = 1;
    if (data.admin) n++;
    n += countNodes(data.managers || []);
    return n;
  }, [data]);

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

  // Horizontal bar is pinned to the bottom of the SCREEN with CSS (bottom: 0), so it is perfectly static.
  // JS only measures left/width of the chart and whether the chart is on screen.
  useEffect(() => {
    const inner = exportRef.current;
    const sc = chartRef.current;
    const rootEl = rootRef.current;
    if (!inner || !sc) return undefined;
    const BAR_H = 14;
    let raf = 0;
    let scrollTimer = 0;
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
      const visible = r.bottom > BAR_H && r.top < vh - BAR_H;
      setPos((prev) =>
        prev.left === r.left &&
        prev.width === r.width &&
        prev.visible === visible
          ? prev
          : { left: r.left, width: r.width, visible },
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const onScroll = (e) => {
      // While scrolling, cards ignore the mouse so hover effects can't make them jitter
      rootEl?.classList.add("is-scrolling");
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(
        () => rootEl?.classList.remove("is-scrolling"),
        140,
      );
      // Horizontal scrolling of the chart/bar never changes layout, so no re-measure needed
      if (e.target !== sc && e.target !== barRef.current) schedule();
    };
    measure();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    ro?.observe(inner);
    ro?.observe(sc);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", onScroll, true); // capture: also catches the layout's own scroll container
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", onScroll, true);
      clearTimeout(scrollTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Once the intro animations have played, switch them off for good
  useEffect(() => {
    if (loading || !data || settled) return undefined;
    const t = setTimeout(() => setSettled(true), 3500);
    return () => clearTimeout(t);
  }, [loading, data, settled]);

  const syncScroll = (from, to) => {
    if (from && to && to.scrollLeft !== from.scrollLeft)
      to.scrollLeft = from.scrollLeft;
  };

  const handleExport = useCallback(async () => {
    if (exportStatus === "loading") return;
    setExportStatus("loading");
    try {
      // exports exactly what is expanded on screen, with full details
      await exportOrgChartPng({
        target: exportRef.current,
        scroller: chartRef.current,
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
    <div
      ref={rootRef}
      className={`org-root bg-[#faf5f8]${settled ? " org-settled" : ""}`}
    >
      <style>{STYLES}</style>

      <div
        className="bg-white border-b border-[#eedde8] px-3 sm:px-6 py-2.5 sm:py-0 sm:h-[54px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4"
        style={{ animation: "fadeIn 0.3s ease forwards" }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink min-w-0 overflow-hidden">
          <span className="text-[11px] sm:text-xs text-[#b89aad] font-medium truncate">
            {orgName}
          </span>
          <span className="text-[#dcc0d0] flex-shrink-0">›</span>
          <span
            className="text-[12px] sm:text-[13px] text-[#1a0d14] font-semibold flex-shrink-0"
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
                <Search size={13} style={{ color: "#b89aad", flexShrink: 0 }} />
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

      <div className="max-w-[1600px] w-full min-w-0 mx-auto px-3 sm:px-6 pt-4 sm:pt-[22px] pb-8 sm:pb-12">
        <div
          className="mb-4 sm:mb-[18px]"
          style={{ animation: "fadeUp 0.3s ease 50ms forwards", opacity: 0 }}
        >
          <h1
            className="text-[17px] sm:text-[19px] font-bold text-[#1a0d14] m-0 tracking-[-0.3px]"
            style={{ fontFamily: "'Syne',sans-serif" }}
          >
            Organisation Chart
          </h1>
          <p className="text-[11px] sm:text-xs text-[#b89aad] mt-1 mb-0">
            {loading
              ? "Loading…"
              : `${orgName} · ${totalNodes} nodes · your reporting line is highlighted`}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 mb-5 sm:mb-[22px]">
          <StatCard
            label="Organisation"
            text={orgName}
            icon={Building2}
            accent="#1a0d14"
            delay={60}
          />
          <StatCard
            label="Your name"
            text={myInfo?.name}
            icon={User}
            accent="#730042"
            delay={95}
          />
          <StatCard
            label="Reporting to"
            text={myInfo?.managerName}
            icon={Users}
            accent="#CD166E"
            delay={130}
          />
          <StatCard
            label="Designation"
            text={myInfo?.designation}
            icon={Crown}
            accent="#a8005c"
            delay={165}
          />
        </div>

        {searchOpen && searchQuery && matchCount === 0 && (
          <div
            className="mb-3.5 px-3 sm:px-3.5 py-2.5 rounded-lg bg-[#fef9c3] border border-[#fde68a] text-[12px] text-[#92400e] flex items-center gap-2 flex-wrap"
            style={{ animation: "slideDown 0.2s ease forwards" }}
          >
            <Search size={13} className="flex-shrink-0" />
            No results for{" "}
            <strong className="ml-0.5 break-all">"{searchQuery}"</strong>
          </div>
        )}

        <div
          className="w-full max-w-full min-w-0 bg-white border border-[#eedde8] rounded-2xl shadow-[0_2px_10px_rgba(115,0,66,0.05)] overflow-hidden"
          style={{ animation: "fadeIn 0.3s ease 240ms forwards", opacity: 0 }}
        >
          <div className="px-3 sm:px-4 py-2.5 sm:py-[11px] border-b border-[#f5edf2] flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#fdf8fb] flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
              <Crown
                size={13}
                style={{ color: "#b89aad" }}
                className="flex-shrink-0"
              />
              <span
                className="text-[12px] font-semibold text-[#4a3542] flex-shrink-0"
                style={{ fontFamily: "'Syne',sans-serif" }}
              >
                Full hierarchy
              </span>
              <span
                className="text-[10px] px-1.5 sm:px-[7px] py-0.5 rounded-full bg-[#f5edf2] text-[#b89aad] font-semibold flex-shrink-0"
                style={{ fontFamily: "'DM Mono',monospace" }}
              >
                {loading ? "—" : `${totalNodes} nodes`}
              </span>
              {searchQuery && matchCount > 0 && (
                <span className="text-[10px] px-1.5 sm:px-[7px] py-0.5 rounded-full bg-[#fce7f3] text-[#730042] font-semibold flex-shrink-0">
                  {matchCount} highlighted
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 sm:mt-0">
              {[
                { dot: "#730042", label: "You & your reporting line", ring: true },
                { dot: "#d4d4d8", label: "Others (hover to highlight)" },
              ].map(({ dot, label, ring }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-[11px] text-[#b89aad]"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: dot,
                      boxShadow: ring ? "0 0 0 2px rgba(115,0,66,0.2)" : "none",
                    }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Scroll viewport: width is capped to the page, extra width scrolls INSIDE this block (horizontal only) */}
          <div
            data-org-scroll
            ref={chartRef}
            onScroll={() => syncScroll(chartRef.current, barRef.current)}
            className="sc bg-white w-full max-w-full min-w-0"
            style={{ overflowX: "auto", overflowY: "hidden" }}
          >
            <div
              ref={exportRef}
              className="bg-white px-4 sm:px-10 py-7 sm:py-9"
              style={{ width: "max-content", minWidth: "100%" }}
            >
              <OrgTreeView
                root={tree}
                loading={loading}
                q={q}
                matches={matches}
                theme={TREE_THEME}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal scrollbar: fixed at the bottom of the screen, never moves while the page scrolls */}
      <div
        ref={barRef}
        className="hbar"
        onScroll={() => syncScroll(barRef.current, chartRef.current)}
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