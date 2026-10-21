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

import { useGetOrgInfoManager } from "../../auth/server-state/manager/managgerother/managerother.hook";
// Shared collapsible tree (put OrgChartTree.jsx in src/components, or fix this path)
import {
  OrgTreeView,
  collectMatches,
  exportOrgChartPng,
} from "../../components/OrgChartTree";

const FontLoader = () => (
  <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      rel="preconnect"
      href="https://fonts.gstatic.com"
      crossOrigin="anonymous"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&family=Syne:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
  </>
);

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
  line: "#dcc0d0",
  pill: "#730042",
  head: "'Syne',sans-serif",
  mono: "'DM Mono',monospace",
};

const STYLES = `
  /* Page never scrolls sideways: extra chart width scrolls INSIDE the chart block only */
  .mgr-org-root { contain: inline-size; }

  /* While scrolling, cards ignore the mouse so hover highlight can't make them jitter */
  .mgr-org-root.is-scrolling [class*="hover:-translate-y"],
  .mgr-org-root.is-scrolling .ot-card { pointer-events: none; }

  /* Chart scroll area: native bars hidden, the fixed bar at the bottom of the screen drives horizontal scroll */
  .mgr-scroll {
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }
  .mgr-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }

  /* Horizontal bar pinned to the bottom of the screen */
  .mgr-hbar { scrollbar-width: thin; scrollbar-color: #c9afc0 #f5edf2; }
  .mgr-hbar::-webkit-scrollbar { height: 12px; }
  .mgr-hbar::-webkit-scrollbar-track { background: #f5edf2; border-radius: 8px; }
  .mgr-hbar::-webkit-scrollbar-thumb { background: #c9afc0; border-radius: 8px; border: 2px solid #f5edf2; }
  .mgr-hbar::-webkit-scrollbar-thumb:hover { background: #730042; }
`;

// ---------------------------------------------------------------------------
// Build the tree from the same API data (nothing in the data is changed):
// Organisation -> Admin -> managers -> (sub-managers / employees)
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
  isYou: !!m.isCurrentManager,
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

function buildMgrTree(data) {
  if (!data) return null;
  const managers = (data.managers || []).map(mgrNode);
  const admin = data.admin
    ? {
        key: "admin",
        kind: "admin",
        name: data.admin.name,
        lines: [
          data.admin.department ? getDepartmentName(data.admin.department) : "—",
          data.admin.designation || "—",
        ],
        empid: data.admin.empid || "—",
        image: data.admin.profile_image,
        hay: [data.admin.department, data.admin.designation],
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

function StatCard({
  label,
  text,
  icon: Icon,
  barBg,
  iconBg,
  iconColor,
  delay = 0,
}) {
  return (
    <div className="bg-white border border-[#eedde8] rounded-[11px] p-3.5 sm:p-4 flex items-center gap-[11px] sm:gap-[13px] shadow-[0_1px_4px_rgba(115,0,66,0.04)] relative overflow-hidden transition-transform duration-[140ms] hover:-translate-y-0.5 min-w-0">
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${barBg}`} />
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg shrink-0 flex items-center justify-center ${iconBg}`}
      >
        <Icon size={14} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] sm:text-[13px] font-semibold text-[#1a0d14] leading-[1.2] m-0 truncate font-['Syne',sans-serif]">
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

export default function OrganizationPageManager() {
  const { data, isLoading: loading } = useGetOrgInfoManager();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportStatus, setExportStatus] = useState(null);
  const inputRef = useRef(null);
  const rootRef = useRef(null);

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
        if (mgr.isCurrentManager) return mgr;
        if (mgr.subManagers?.length) {
          const found = walk(mgr.subManagers);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(data.managers || []);
  }, [data]);

  const root = useMemo(() => buildMgrTree(data), [data]);
  const q = norm(searchQuery);
  const matches = useMemo(() => collectMatches(root, q), [root, q]);
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
    const root = rootRef.current;
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
      root?.classList.add("is-scrolling");
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(
        () => root?.classList.remove("is-scrolling"),
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
      className="mgr-org-root w-full max-w-full min-w-0 bg-[#faf5f8] font-['DM_Sans',sans-serif]"
    >
      <FontLoader />
      <style>{STYLES}</style>

      <div className="bg-white border-b border-[#eedde8] px-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 py-3 sm:py-0 sm:h-[54px]">
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <span className="text-xs text-[#b89aad] font-medium truncate">
            {orgName}
          </span>
          <span className="text-[#dcc0d0] shrink-0">›</span>
          <span className="text-[13px] text-[#1a0d14] font-semibold font-['Syne',sans-serif] whitespace-nowrap">
            Org Chart
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {searchOpen ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2 border border-[#730042] rounded-lg px-2.5 bg-white h-9 w-full sm:w-[260px] shadow-[0_0_0_3px_rgba(115,0,66,0.09)] focus-within:shadow-[0_0_0_4px_rgba(115,0,66,0.15)] transition-shadow duration-150">
                  <Search size={13} className="text-[#b89aad] shrink-0" />
                  <input
                    ref={inputRef}
                    className="border-none outline-none bg-transparent text-[13px] text-[#1e293b] font-['DM_Sans',sans-serif] flex-1 min-w-0 placeholder:text-[#b89aad]"
                    placeholder="Search name, role, department…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="bg-transparent border-none cursor-pointer text-[#b89aad] flex p-0 hover:text-[#730042] transition-colors"
                      onClick={() => setSearchQuery("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button
                  className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg border border-[#e8dde5] bg-white text-[#4a3542] text-[13px] font-medium cursor-pointer font-['DM_Sans',sans-serif] transition-colors duration-[130ms] whitespace-nowrap hover:bg-[#fdf6fa] hover:border-[#c9afc0] hover:text-[#730042] shrink-0"
                  onClick={closeSearch}
                >
                  <X size={13} /> Close
                </button>
              </div>
              {searchQuery && (
                <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#fdf0f7] text-[#730042] text-[11px] font-semibold w-fit">
                  {matchCount} match{matchCount !== 1 ? "es" : ""}
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg border border-[#e8dde5] bg-white text-[#4a3542] text-[13px] font-medium cursor-pointer font-['DM_Sans',sans-serif] transition-colors duration-[130ms] whitespace-nowrap hover:bg-[#fdf6fa] hover:border-[#c9afc0] hover:text-[#730042]"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={13} /> Search
              </button>
              <button
                className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-lg border border-[#730042] bg-[#730042] text-white text-[13px] font-medium cursor-pointer font-['DM_Sans',sans-serif] transition-colors duration-[130ms] whitespace-nowrap hover:bg-[#5a0033] hover:border-[#5a0033] disabled:opacity-45 disabled:cursor-not-allowed"
                onClick={handleExport}
                disabled={loading || exportStatus === "loading"}
              >
                {exportStatus === "loading" ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Exporting…
                  </>
                ) : (
                  <>
                    <Download size={13} /> Export PNG
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] w-full min-w-0 mx-auto py-5 px-3 sm:px-6 pb-12">
        <div className="mb-4">
          <h1 className="text-[19px] font-bold text-[#1a0d14] m-0 tracking-[-0.3px] font-['Syne',sans-serif]">
            Organisation Chart
          </h1>
          <p className="text-xs text-[#b89aad] mt-1 mb-0">
            {loading
              ? "Loading…"
              : `${orgName} · ${totalNodes} nodes · your reporting line is highlighted`}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 mb-5">
          <StatCard
            label="Organisation"
            text={orgName}
            icon={Building2}
            barBg="bg-[#1a0d14]"
            iconBg="bg-[#1a0d14]/10"
            iconColor="text-[#1a0d14]"
            delay={60}
          />
          <StatCard
            label="Your name"
            text={myInfo?.name}
            icon={User}
            barBg="bg-[#730042]"
            iconBg="bg-[#730042]/10"
            iconColor="text-[#730042]"
            delay={95}
          />
          <StatCard
            label="Department"
            text={
              myInfo?.department
                ? getDepartmentName(myInfo.department)
                : undefined
            }
            icon={Users}
            barBg="bg-[#CD166E]"
            iconBg="bg-[#CD166E]/10"
            iconColor="text-[#CD166E]"
            delay={130}
          />
          <StatCard
            label="Designation"
            text={myInfo?.designation}
            icon={Crown}
            barBg="bg-[#a8005c]"
            iconBg="bg-[#a8005c]/10"
            iconColor="text-[#a8005c]"
            delay={165}
          />
        </div>

        {searchOpen && searchQuery && matchCount === 0 && (
          <div className="mb-3.5 px-3.5 py-2.5 rounded-lg bg-[#fef9c3] border border-[#fde68a] text-xs text-[#92400e] flex items-center gap-2 break-words min-w-0">
            <Search size={13} className="shrink-0" />
            No results for{" "}
            <strong className="ml-0.5 break-all">"{searchQuery}"</strong>
          </div>
        )}

        <div className="w-full max-w-full min-w-0 bg-white border border-[#eedde8] rounded-[14px] shadow-[0_2px_10px_rgba(115,0,66,0.05)] overflow-hidden">
          <div className="px-3 py-2.5 sm:px-4 sm:py-[11px] border-b border-[#f5edf2] flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#fdf8fb] gap-2">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <Crown size={13} className="text-[#b89aad] shrink-0" />
              <span className="text-xs font-semibold text-[#4a3542] font-['Syne',sans-serif] whitespace-nowrap">
                Full hierarchy
              </span>
              <span className="text-[10px] py-0.5 px-[7px] rounded-full bg-[#f5edf2] text-[#b89aad] font-semibold font-['DM_Mono',monospace] whitespace-nowrap">
                {loading ? "—" : `${totalNodes} nodes`}
              </span>
              {searchQuery && matchCount > 0 && (
                <span className="text-[10px] py-0.5 px-[7px] rounded-full bg-[#fce7f3] text-[#730042] font-semibold whitespace-nowrap">
                  {matchCount} highlighted
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {[
                { dot: "bg-[#730042]", label: "You & your reporting line", ring: true },
                { dot: "bg-gray-300", label: "Others (hover to highlight)" },
              ].map(({ dot, label, ring }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-[11px] text-[#b89aad]"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${dot} ${ring ? "shadow-[0_0_0_2px_rgba(115,0,66,0.2)]" : ""}`}
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
            className="mgr-scroll w-full max-w-full min-w-0 bg-white"
            style={{ overflowX: "auto", overflowY: "hidden" }}
          >
            <div
              ref={exportRef}
              className="bg-white py-6 px-3 sm:p-9"
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
      </div>

      {/* Horizontal scrollbar: fixed at the bottom of the screen, never moves while the page scrolls */}
      <div
        ref={barRef}
        className="mgr-hbar"
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
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-[360px] z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-[10px] bg-[#1e0e17] text-white text-[13px] font-medium shadow-[0_8px_28px_rgba(0,0,0,0.22)] font-['DM_Sans',sans-serif] pointer-events-none">
          {exportStatus === "loading" ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Generating PNG…
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="text-[#4ade80]" /> Exported!
            </>
          )}
        </div>
      )}
    </div>
  );
}