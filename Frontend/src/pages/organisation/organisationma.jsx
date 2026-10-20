"use client";

import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
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

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
  @keyframes pulseYou  {
    0%,100% { box-shadow: 0 0 0 0 rgba(115,0,66,0.25); }
    50%      { box-shadow: 0 0 0 6px rgba(115,0,66,0.06); }
  }
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

  /* Page never scrolls sideways: extra chart width scrolls INSIDE the chart block only */
  .mgr-org-root { contain: inline-size; }

  /* While scrolling, cards ignore the mouse so hover lift can't make them jitter */
  .mgr-org-root.is-scrolling [class*="hover:-translate-y"] { pointer-events: none; }

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

function Sk({ w, h, r = 8 }) {
  return (
    <div
      className="shrink-0 animate-pulse bg-gradient-to-r from-[#f5edf2] via-[#ecdce6] to-[#f5edf2] bg-[length:600px_100%]"
      style={{ width: w, height: h, borderRadius: r }}
    />
  );
}

function Avatar({ name, size = 40, bg, color, image }) {
  const [errored, setErrored] = useState(false);
  if (image && !errored) {
    return (
      <img
        src={image}
        alt={name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <div
      className={`${bg} ${color} shrink-0 flex items-center justify-center rounded-full text-[13px] font-bold font-['Syne',sans-serif]`}
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </div>
  );
}

function Hi({ text = "", q = "", className = "" }) {
  if (!q) return <span className={className}>{text}</span>;
  const idx = norm(text).indexOf(q);
  if (idx === -1) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {text.slice(0, idx)}
      <mark className="bg-[#fde68a] text-[#78350f] rounded-[2px] px-[1px]">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

function YouPill() {
  return <span className="you-pill"></span>;
}

const CFG = {
  org: {
    accentOn: "bg-[#1a0d14]",
    avBgOn: "bg-[#1a0d14]",
    avColorOn: "text-[#f5edf2]",
  },
  admin: {
    accentOn: "bg-[#5a2240]",
    avBgOn: "bg-[#f0e4ec]",
    avColorOn: "text-[#5a2240]",
  },
  manager: {
    accentOn: "bg-[#a8005c]",
    avBgOn: "bg-[#fce7f3]",
    avColorOn: "text-[#a8005c]",
  },
  subMgr: {
    accentOn: "bg-[#be185d]",
    avBgOn: "bg-[#fce7f3]",
    avColorOn: "text-[#be185d]",
  },
  emp: {
    accentOn: "bg-[#7c1f4a]",
    avBgOn: "bg-[#fce7f3]",
    avColorOn: "text-[#7c1f4a]",
  },
};
const OFF = {
  accent: "bg-gray-300",
  avBg: "bg-gray-100",
  avColor: "text-gray-400",
};

function Card({
  level,
  name,
  department,
  designation,
  empid,
  isOrg,
  width = 172,
  delay = 0,
  dim,
  hl,
  chain,
  q,
  you = false,
  empCount,
  image,
}) {
  const c = CFG[level] || CFG.emp;
  const accentCls = chain ? c.accentOn : OFF.accent;
  const avBgCls = chain ? c.avBgOn : OFF.avBg;
  const avColorCls = chain ? c.avColorOn : OFF.avColor;

  return (
    <div className="shrink-0">
      <div
        className={[
          "bg-white border rounded-[11px] py-3.5 px-3 pb-[11px] shadow-[0_2px_8px_rgba(115,0,66,0.04)] flex flex-col items-center relative overflow-hidden transition-transform duration-150 ease hover:-translate-y-0.5 cursor-default",
          chain ? "border-[#eedde8]" : "border-gray-200",
          hl
            ? "outline outline-2 outline-[#730042] outline-offset-2 shadow-[0_0_0_5px_rgba(115,0,66,0.1)]"
            : "",
          dim ? "opacity-[0.15] grayscale" : "",
          you ? "ring-4 ring-[#730042]/15" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width }}
      >
        {you && <YouPill />}
        <div
          className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-[11px] ${you ? "bg-gradient-to-r from-[#730042] to-[#CD166E]" : accentCls}`}
        />
        <Avatar
          name={name}
          size={38}
          bg={you ? "bg-[#fce7f3]" : avBgCls}
          color={you ? "text-[#730042]" : avColorCls}
          image={image}
        />
        <div className="mt-2 mb-1.5 text-center w-full">
          <Hi
            text={name}
            q={q}
            className={`block text-xs font-semibold leading-[1.3] font-['Syne',sans-serif] truncate ${chain ? "text-[#1a0d14]" : "text-gray-400"}`}
          />
          {!isOrg && (
            <>
              <Hi
                text={department || "—"}
                q={q}
                className={`block text-[10px] mt-0.5 truncate ${chain ? "text-[#8a6878]" : "text-gray-300"}`}
              />
              <Hi
                text={designation || "—"}
                q={q}
                className={`block text-[10px] mt-0.5 truncate ${chain ? "text-[#8a6878]" : "text-gray-300"}`}
              />
              <span
                className={`block text-[9px] mt-0.5 font-['DM_Mono',monospace] truncate ${chain ? "text-[#c8a8bb]" : "text-gray-300"}`}
              >
                {empid || "—"}
              </span>
            </>
          )}
          {empCount !== undefined && (
            <span
              className={`text-[10px] block mt-0.5 ${chain ? "text-[#c8a8bb]" : "text-gray-300"}`}
            >
              {empCount} report{empCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const CARD_W = 172;
const EMP_W = 152;
const MGR_GAP = 28;
const EMP_GAP = 10;
const SUB_MGR_GAP = 20;
const LIMIT = 2; // employees / sub-managers rows
const ROOT_LIMIT = 3; // top row of managers: the button only appears from the 4th card
const BTN_W = 112;
const BTN_SPACE = BTN_W + 12;

const limitOf = (key) => (key === "more-root" ? ROOT_LIMIT : LIMIT);

const visibleOf = (list, key, expanded, forceAll) =>
  forceAll || expanded.has(key) ? list : list.slice(0, limitOf(key));

const btnSpace = (total, forceAll) =>
  !forceAll && total > LIMIT ? BTN_SPACE : 0;

const hasBtn = (total, forceAll, limit = LIMIT) => !forceAll && total > limit;

// reserve = true when this column also carries a "See more" button beside its card
function colWOf(mgr, expanded, forceAll, reserve = false) {
  const emps = mgr.employees || [];
  const subs = mgr.subManagers || [];
  const vEmps = visibleOf(emps, `more-emp-${mgr.id}`, expanded, forceAll);
  const vSubs = visibleOf(subs, `more-sub-${mgr.id}`, expanded, forceAll);
  const empW = vEmps.length
    ? vEmps.length * EMP_W +
      (vEmps.length - 1) * EMP_GAP +
      btnSpace(emps.length, forceAll)
    : 0;
  const subW = vSubs.length
    ? vSubs.reduce(
        (s, sm, i) =>
          s +
          colWOf(
            sm,
            expanded,
            forceAll,
            i === vSubs.length - 1 && hasBtn(subs.length, forceAll),
          ),
        0,
      ) +
      (vSubs.length - 1) * SUB_MGR_GAP
    : 0;
  return Math.max(CARD_W + (reserve ? BTN_SPACE : 0), empW, subW);
}

// Vertical stub, placed under the card's center (left-aligned layout)
function VLine({ h = 24, x = CARD_W / 2 }) {
  return (
    <div
      className="w-px bg-[#dcc0d0] shrink-0"
      style={{ height: h, marginLeft: x }}
    />
  );
}

// Parent card center -> bus line -> a stem down to each child card center
function Connector({ parentX = CARD_W / 2, xs, h = 20 }) {
  if (!xs.length) return null;
  const mid = h / 2;
  const minX = Math.min(parentX, ...xs);
  const maxX = Math.max(parentX, ...xs);
  const needBus = xs.length > 1 || Math.abs(xs[0] - parentX) > 1;
  return (
    <svg
      width={maxX + 1}
      height={h}
      className="block shrink-0 overflow-visible"
    >
      <line
        x1={parentX}
        y1={0}
        x2={parentX}
        y2={needBus ? mid : h}
        stroke="#dcc0d0"
        strokeWidth={1}
      />
      {needBus && (
        <line
          x1={minX}
          y1={mid}
          x2={maxX}
          y2={mid}
          stroke="#dcc0d0"
          strokeWidth={1}
        />
      )}
      {needBus &&
        xs.map((x, i) => (
          <line
            key={i}
            x1={x}
            y1={mid}
            x2={x}
            y2={h}
            stroke="#dcc0d0"
            strokeWidth={1}
          />
        ))}
    </svg>
  );
}

function MoreBtn({ total, k, expanded, toggle, forceAll, absolute = false }) {
  const limit = limitOf(k);
  if (forceAll || total <= limit) return null;
  const open = expanded.has(k);
  return (
    <div
      className={absolute ? "" : "shrink-0 self-start pt-12"}
      style={
        absolute
          ? { position: "absolute", left: CARD_W + 12, top: 48, width: BTN_W }
          : { width: BTN_W, marginLeft: 12 }
      }
      data-html2canvas-ignore
    >
      <button
        type="button"
        onClick={() => toggle(k)}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#e8dde5] bg-white px-3 py-1.5 text-xs font-semibold text-[#4a3542] shadow-sm hover:bg-[#fdf6fa] hover:text-[#730042]"
      >
        {open ? "← See less" : `See ${total - limit} more →`}
      </button>
    </div>
  );
}

function collectMatchKeys(nodes, q, matches) {
  if (!q) return;
  nodes.forEach((mgr) => {
    const key = `m-${mgr.id}`;
    if (
      [mgr.name, mgr.designation, mgr.department].some(
        (s) => s && norm(s).includes(q),
      )
    )
      matches.add(key);
    (mgr.employees || []).forEach((e) => {
      if (
        [e.name, e.designation, e.department].some(
          (s) => s && norm(s).includes(q),
        )
      )
        matches.add(`e-${e.id}`);
    });
    if (mgr.subManagers?.length) collectMatchKeys(mgr.subManagers, q, matches);
  });
}

function collectDescendants(mgr, set) {
  (mgr.employees || []).forEach((e) => set.add(`e-${e.id}`));
  (mgr.subManagers || []).forEach((sm) => {
    set.add(`m-${sm.id}`);
    collectDescendants(sm, set);
  });
}

function findSelfChain(managers) {
  for (const mgr of managers) {
    if (mgr.isCurrentManager) {
      const descendants = new Set();
      collectDescendants(mgr, descendants);
      return { path: new Set([`m-${mgr.id}`]), descendants };
    }
    if (mgr.subManagers?.length) {
      const found = findSelfChain(mgr.subManagers);
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
  const self = findSelfChain(data?.managers || []);
  if (self) {
    self.path.forEach((id) => ids.add(id));
    self.descendants.forEach((id) => ids.add(id));
  }
  return ids;
}

function ManagerColumn({
  mgr,
  q,
  matches,
  dim,
  delayRef,
  chainIds,
  expanded,
  toggle,
  forceAll,
  isSubMgr = false,
  moreBtn = null,
}) {
  const key = `m-${mgr.id}`;
  const emps = mgr.employees || [];
  const subMgrs = mgr.subManagers || [];
  const subKey = `more-sub-${mgr.id}`;
  const empKey = `more-emp-${mgr.id}`;
  const visSubs = visibleOf(subMgrs, subKey, expanded, forceAll);
  const visEmps = visibleOf(emps, empKey, expanded, forceAll);

  const mDelay = delayRef.current;
  delayRef.current += 55;

  // x of each child card's center, measured from the left edge of this column
  let off = 0;
  const subXs = visSubs.map((sm, i) => {
    const last = i === visSubs.length - 1 && hasBtn(subMgrs.length, forceAll);
    const x = off + CARD_W / 2;
    off += colWOf(sm, expanded, forceAll, last) + SUB_MGR_GAP;
    return x;
  });
  const empXs = visEmps.map((_, i) => i * (EMP_W + EMP_GAP) + EMP_W / 2);

  return (
    <div
      className="flex flex-col items-start shrink-0 relative"
      style={{ width: colWOf(mgr, expanded, forceAll, !!moreBtn) }}
    >
      <Card
        level={isSubMgr ? "subMgr" : "manager"}
        name={mgr.name}
        department={mgr.department ? getDepartmentName(mgr.department) : "—"}
        designation={mgr.designation || "—"}
        empid={mgr.empid}
        image={mgr.profile_image}
        width={CARD_W}
        delay={mDelay}
        dim={dim(key)}
        hl={matches.has(key)}
        chain={chainIds.has(key)}
        q={q}
        you={mgr.isCurrentManager}
        empCount={
          emps.length + subMgrs.length > 0
            ? emps.length + subMgrs.length
            : undefined
        }
      />

      {moreBtn}

      {subMgrs.length > 0 && (
        <>
          <Connector xs={subXs} h={20} />
          <div className="flex items-start">
            <div className="flex items-start" style={{ gap: SUB_MGR_GAP }}>
              {visSubs.map((sm, i) => (
                <ManagerColumn
                  key={sm.id}
                  mgr={sm}
                  q={q}
                  matches={matches}
                  dim={dim}
                  delayRef={delayRef}
                  chainIds={chainIds}
                  expanded={expanded}
                  toggle={toggle}
                  forceAll={forceAll}
                  isSubMgr
                  moreBtn={
                    i === visSubs.length - 1 &&
                    hasBtn(subMgrs.length, forceAll) ? (
                      <MoreBtn
                        absolute
                        total={subMgrs.length}
                        k={subKey}
                        expanded={expanded}
                        toggle={toggle}
                        forceAll={forceAll}
                      />
                    ) : null
                  }
                />
              ))}
            </div>
          </div>
        </>
      )}

      {emps.length > 0 && (
        <>
          <Connector xs={empXs} h={18} />
          <div className="flex items-start">
            <div className="flex items-start" style={{ gap: EMP_GAP }}>
              {visEmps.map((emp) => {
                const eKey = `e-${emp.id}`;
                const eDelay = delayRef.current;
                delayRef.current += 18;
                return (
                  <Card
                    key={emp.id}
                    level="emp"
                    name={emp.name}
                    department={
                      emp.department ? getDepartmentName(emp.department) : "—"
                    }
                    designation={emp.designation || "—"}
                    empid={emp.empid}
                    image={emp.profile_image}
                    width={EMP_W}
                    delay={eDelay}
                    dim={dim(eKey)}
                    hl={matches.has(eKey)}
                    chain={chainIds.has(eKey)}
                    q={q}
                  />
                );
              })}
            </div>
            <MoreBtn
              total={emps.length}
              k={empKey}
              expanded={expanded}
              toggle={toggle}
              forceAll={forceAll}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SkeletonTree() {
  return (
    <div className="flex flex-col items-center">
      <Sk w={172} h={104} r={11} />
      <div className="w-px h-6 bg-[#eed8e5]" />
      <Sk w={172} h={96} r={11} />
      <div className="w-px h-5 bg-[#eed8e5]" />
      <div className="flex gap-7">
        {[1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <Sk w={172} h={96} r={11} />
            <div className="w-px h-4 bg-[#eed8e5]" />
            <div className="flex gap-2.5">
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

function OrgTreeInner({ data, loading, q }) {
  const chainIds = useMemo(() => buildChainIds(data), [data]);
  // Which "See more" rows are open. Must stay above the early returns.
  const [expanded, setExpanded] = useState(() => new Set());
  const toggle = (k) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  if (loading) return <SkeletonTree />;
  if (!data) return null;

  const hasQ = q.length > 0;
  const forceAll = hasQ; // while searching, show everything so a match is never hidden
  const matches = new Set();

  if (hasQ) {
    const chk = (...ss) => ss.some((s) => s && norm(s).includes(q));
    if (chk(data.organisation_name, data.super_admin?.name)) matches.add("org");
    if (chk(data.admin?.name, data.admin?.designation)) matches.add("admin");
    collectMatchKeys(data.managers || [], q, matches);
  }

  const anyMatch = matches.size > 0;
  const dim = (k) => hasQ && anyMatch && !matches.has(k);

  const managers = data.managers || [];
  const rootKey = "more-root";
  const visMgrs = visibleOf(managers, rootKey, expanded, forceAll);

  let off = 0;
  const rootXs = visMgrs.map((m, i) => {
    const last =
      i === visMgrs.length - 1 && hasBtn(managers.length, forceAll, ROOT_LIMIT);
    const x = off + CARD_W / 2;
    off += colWOf(m, expanded, forceAll, last) + MGR_GAP;
    return x;
  });

  const delayRef = { current: 160 };

  return (
    <div className="flex flex-col items-start min-w-max">
      <Card
        level="org"
        name={data.organisation_name || "Organisation"}
        department="—"
        designation={data.super_admin?.name || "—"}
        image={data.organisation_logo}
        isOrg
        width={CARD_W}
        delay={0}
        dim={dim("org")}
        hl={matches.has("org")}
        chain={chainIds.has("org")}
        q={q}
      />
      <VLine h={22} />

      {data.admin && (
        <>
          <Card
            level="admin"
            name={data.admin.name}
            department={
              data.admin.department
                ? getDepartmentName(data.admin.department)
                : "—"
            }
            designation={data.admin.designation || "—"}
            empid={data.admin.empid}
            image={data.admin.profile_image}
            width={CARD_W}
            delay={80}
            dim={dim("admin")}
            hl={matches.has("admin")}
            chain={chainIds.has("admin")}
            q={q}
          />
          <VLine h={22} />
        </>
      )}

      {managers.length > 0 && <Connector xs={rootXs} h={20} />}

      <div className="flex items-start">
        <div className="flex items-start" style={{ gap: MGR_GAP }}>
          {visMgrs.map((mgr, i) => (
            <ManagerColumn
              key={mgr.id}
              mgr={mgr}
              q={q}
              matches={matches}
              dim={dim}
              delayRef={delayRef}
              chainIds={chainIds}
              expanded={expanded}
              toggle={toggle}
              forceAll={forceAll}
              moreBtn={
                i === visMgrs.length - 1 &&
                hasBtn(managers.length, forceAll, ROOT_LIMIT) ? (
                  <MoreBtn
                    absolute
                    total={managers.length}
                    k={rootKey}
                    expanded={expanded}
                    toggle={toggle}
                    forceAll={forceAll}
                  />
                ) : null
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Memoised so scroll-driven state changes never re-render the whole tree
const OrgTree = memo(OrgTreeInner);

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

  const matchCount = useMemo(() => {
    if (!searchQuery || !data) return 0;
    const q = norm(searchQuery);
    let n = 0;
    const chk = (...ss) => ss.some((s) => s && norm(s).includes(q));
    if (chk(data.organisation_name)) n++;
    if (chk(data.admin?.name, data.admin?.designation)) n++;
    const walk = (nodes) =>
      nodes.forEach((mgr) => {
        if (chk(mgr.name, mgr.department, mgr.designation)) n++;
        (mgr.employees || []).forEach((e) => {
          if (chk(e.name, e.designation, e.department)) n++;
        });
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
      // While scrolling, cards ignore the mouse so hover lift effects can't make them jitter
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
    // Export the full-width inner content (not the clipped scroll viewport)
    const target = exportRef.current;
    if (!target || exportStatus === "loading") return;
    setExportStatus("loading");
    try {
      if (!window.html2canvas) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const canvas = await window.html2canvas(target, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: target.scrollWidth,
        height: target.scrollHeight,
        windowWidth: Math.max(target.scrollWidth, window.innerWidth),
        windowHeight: Math.max(target.scrollHeight, window.innerHeight),
        scrollX: 0,
        scrollY: 0,
        onclone: (doc) => {
          const sc = doc.querySelector("[data-org-scroll]");
          if (sc) {
            sc.style.overflow = "visible";
            sc.style.maxWidth = "none";
          }
        },
      });
      const link = document.createElement("a");
      link.download = `org-chart-${orgName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
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
                { dot: "bg-[#730042]", label: "You", ring: true },
                { dot: "bg-[#a8005c]", label: "In your reporting line" },
                { dot: "bg-gray-300", label: "Others" },
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
              <OrgTree data={data} loading={loading} q={norm(searchQuery)} />
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
