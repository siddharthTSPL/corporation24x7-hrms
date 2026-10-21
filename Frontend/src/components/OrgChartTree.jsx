import {
  createContext,
  memo,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/*
  Shared org-chart tree (used by SuperAdmin / Admin / Manager / Employee pages).

  Node shape (built by each page from its own data, nothing is changed in the data):
  {
    key, kind ("emp" => shown vertically), name, initials?, lines: [string],
    empid?, image?, isYou?, onClick?, hay: [strings used for search],
    children: [node]
  }
*/

const norm = (s = "") => String(s).toLowerCase().trim();
const initialsOf = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// every node whose name / hay text contains q (q must already be normalised)
export function collectMatches(root, q) {
  const set = new Set();
  if (!q || !root) return set;
  const walk = (n) => {
    if ([n.name, ...(n.hay || [])].some((s) => s && norm(s).includes(q)))
      set.add(n.key);
    (n.children || []).forEach(walk);
  };
  walk(root);
  return set;
}

// keys from the root down to the logged-in person (node with isYou)
function selfPath(root) {
  if (!root) return null;
  const walk = (n, path) => {
    const p = [...path, n.key];
    if (n.isYou) return p;
    for (const k of n.children || []) {
      const r = walk(k, p);
      if (r) return r;
    }
    return null;
  };
  return walk(root, []);
}

/* ==========================================================================
   PNG EXPORT (shared by all roles)
   Exports EXACTLY what is expanded on screen - every visible node - with all
   details readable (nothing cut with "...", nothing faded/greyed out, no +/-
   buttons, avatars that cannot load fall back to initials).

   Usage:
     await exportOrgChartPng({
       target: exportRef.current,     // full-width content inside the scroller
       scroller: scrollRef.current,   // the horizontally scrolling viewport (optional)
       filename: "org-chart.png",
     });
   ========================================================================== */
const H2C_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";

function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve();
    const s = document.createElement("script");
    s.src = H2C_CDN;
    s.onload = resolve;
    s.onerror = () => reject(new Error("html2canvas failed to load"));
    document.head.appendChild(s);
  });
}

const twoFrames = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

function canLoadWithCors(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

export async function exportOrgChartPng({ target, scroller, filename }) {
  if (!target) throw new Error("Nothing to export");
  await loadHtml2Canvas();

  const prevScroll = scroller ? scroller.scrollLeft : 0;
  if (scroller) scroller.scrollLeft = 0;

  target.setAttribute("data-org-export", "1");
  target.classList.add("ot-exporting");

  try {
    await twoFrames();
    if (document.fonts?.ready) await document.fonts.ready;

    // avatars that the browser cannot read with CORS would be dropped by the
    // canvas -> swap those for the initials circle
    const imgs = Array.from(target.querySelectorAll("img.ot-av"));
    const badSrc = new Set();
    await Promise.all(
      imgs.map(async (im) => {
        const src = im.getAttribute("src");
        if (src && !(await canLoadWithCors(src))) badSrc.add(src);
      }),
    );

    // measure AFTER export styles are applied (text now wraps, so size changes)
    const w = Math.ceil(target.scrollWidth);
    const h = Math.ceil(target.scrollHeight);

    // big charts: keep the canvas inside browser limits so nothing gets cut off
    const scale = Math.max(
      0.3,
      Math.min(2, 16000 / w, 16000 / h, Math.sqrt(100e6 / (w * h))),
    );

    const canvas = await window.html2canvas(target, {
      backgroundColor: "#ffffff",
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: w,
      height: h,
      windowWidth: Math.max(w, window.innerWidth),
      windowHeight: Math.max(h, window.innerHeight),
      scrollX: 0,
      scrollY: 0,
      ignoreElements: (el) =>
        el.hasAttribute && el.hasAttribute("data-export-ignore"),
      onclone: (doc) => {
        const t = doc.querySelector("[data-org-export]");
        // un-clip / un-hide every ancestor so the whole chart is rendered
        let el = t;
        while (el && el !== doc.documentElement) {
          el.style.overflow = "visible";
          el.style.contain = "none";
          el.style.maxWidth = "none";
          el.style.opacity = "1";
          el.style.animation = "none";
          el = el.parentElement;
        }
        if (t) {
          t.querySelectorAll("img.ot-av").forEach((im) => {
            if (badSrc.has(im.getAttribute("src"))) {
              const d = doc.createElement("div");
              d.className = "ot-av";
              d.textContent = initialsOf(im.getAttribute("alt") || "");
              im.replaceWith(d);
            }
          });
        }
      },
    });

    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG too large"))),
        "image/png",
      ),
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "org-chart.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } finally {
    target.classList.remove("ot-exporting");
    target.removeAttribute("data-org-export");
    if (scroller) scroller.scrollLeft = prevScroll;
  }
}

export const TREE_STYLES = `
  @keyframes otIn    { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
  @keyframes otPulse { 0%,100% { opacity:1; } 50% { opacity:.45; } }

  .ot-root, .ot-root * { box-sizing: border-box; }
  .ot-root {
    --w-card: 176px;
    --w-emp: 152px;
    width: max-content;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ---------- layout + connectors ---------- */
  .ot-node { display:flex; flex-direction:column; align-items:center; position:relative; }
  .ot-node--v { align-items:flex-start; }

  .ot-row { display:flex; justify-content:center; align-items:flex-start; position:relative; padding-top:20px; animation:otIn .22s ease; }
  .ot-row::before { content:""; position:absolute; top:0; left:50%; height:20px; border-left:1.5px solid var(--ot-line); }

  .ot-col { position:relative; display:flex; flex-direction:column; align-items:center; padding:20px 9px 0; }
  .ot-col::before, .ot-col::after { content:""; position:absolute; top:0; right:50%; width:50%; height:20px; border-top:1.5px solid var(--ot-line); }
  .ot-col::after { right:auto; left:50%; border-left:1.5px solid var(--ot-line); }
  .ot-col:first-child::before, .ot-col:last-child::after { border:0 none; }
  .ot-col:last-child::before { right:calc(50% - 1.5px); width:calc(50% + 1.5px); border-right:1.5px solid var(--ot-line); }
  .ot-col:only-child { padding-top:0; }
  .ot-col:only-child::before, .ot-col:only-child::after { display:none; }

  /* employees: stacked vertically with a bracket line on the left */
  .ot-vlist { display:flex; flex-direction:column; gap:12px; position:relative; padding:18px 0 0 calc(var(--w-card) - var(--w-emp)); animation:otIn .22s ease; }
  .ot-vitem { position:relative; }
  .ot-vitem::before { content:""; position:absolute; top:50%; left:-13px; width:13px; border-top:1.5px solid var(--ot-line); }
  .ot-vitem::after { content:""; position:absolute; left:-13px; top:-12px; height:calc(100% + 12px); border-left:1.5px solid var(--ot-line); }
  .ot-vitem:first-child::after { top:-18px; height:calc(100% + 18px); }
  .ot-vitem:last-child::after { height:calc(50% + 12px); }
  .ot-vitem:first-child:last-child::after { top:-18px; height:calc(50% + 18px); }

  /* employees next to sub-managers: plain vertical chain under the shared connector */
  .ot-vlist--chain { align-items:center; padding:0; gap:14px; }
  .ot-vlist--chain .ot-vitem::before { top:-14px; left:50%; width:0; height:14px; border-top:0; border-left:1.5px solid var(--ot-line); }
  .ot-vlist--chain .ot-vitem::after { display:none; }
  .ot-vlist--chain .ot-vitem:first-child::before { display:none; }

  /* ---------- card ---------- */
  .ot-cardwrap { position:relative; flex-shrink:0; }
  /* Only the Super Admin / organisation node is highlighted in black; everyone else uses the theme colour (beetroot) */
  .ot-cardwrap--root { --ot-acc:#0f172a; --ot-ring:rgba(15,23,42,.12); }
  .ot-card {
    width:var(--w-card); background:#fff; border:1.5px solid #e5e7eb; border-radius:12px;
    padding:13px 10px 14px; display:flex; flex-direction:column; align-items:center;
    position:relative; overflow:hidden; box-shadow:0 1px 4px rgba(15,23,42,.05);
    transition:opacity .18s, border-color .15s, box-shadow .15s;
  }
  .ot-card--emp { width:var(--w-emp); padding:11px 8px 10px; }

  /* Super Admin / organisation node: a bit bigger, full organisation name shown (wraps, never cut) */
  .ot-card--root { width:240px; padding:18px 16px 16px; border-radius:14px; }
  .ot-card--root .ot-av { width:50px; height:50px; font-size:16px; }
  .ot-card--root .ot-name { margin-top:10px; font-size:14px; line-height:1.35; white-space:normal; overflow:visible; text-overflow:clip; text-align:center; overflow-wrap:anywhere; }
  .ot-card--root .ot-sub { margin-top:3px; font-size:11.5px; font-weight:600; line-height:1.35; white-space:normal; overflow:visible; text-overflow:clip; text-align:center; overflow-wrap:anywhere; }
  .ot-card--root .ot-rep { font-size:11px; }
  .ot-card.is-click { cursor:pointer; }

  .ot-bar { position:absolute; top:0; left:0; right:0; height:3px; background:#d1d5db; transition:background .15s; }
  .ot-av {
    width:38px; height:38px; border-radius:50%; object-fit:cover; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:13px; font-weight:700; background:#e5e7eb; color:#9ca3af;
    font-family:var(--ot-head); transition:background .15s, color .15s;
  }
  img.ot-av { display:block; }
  .ot-card--emp .ot-av { width:32px; height:32px; font-size:11px; }
  .ot-name { display:block; max-width:100%; margin-top:8px; font-size:12px; font-weight:600; line-height:1.3; color:#94a3b8; font-family:var(--ot-head); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; transition:color .15s; }
  .ot-sub  { display:block; max-width:100%; margin-top:2px; font-size:10px; color:#a8b0bd; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; transition:color .15s; }
  .ot-id   { display:block; max-width:100%; margin-top:4px; padding:1px 6px; border-radius:4px; background:#f3f4f6; font-family:var(--ot-mono); font-size:9px; color:#b7bdc8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .ot-rep  { display:block; margin-top:5px; font-size:10px; font-weight:500; color:#a8b0bd; transition:color .15s; }

  /* normal (not in the highlighted line) */
  .ot-card.is-muted { opacity:.8; }
  .ot-card.is-muted img.ot-av { filter:grayscale(1); }

  /* highlighted: viewer's own line, or whichever node is hovered */
  .ot-card.is-active, .ot-card.is-muted:hover {
    opacity:1; border-color:var(--ot-acc);
    box-shadow:0 0 0 3px var(--ot-ring), 0 8px 20px rgba(15,23,42,.10);
  }
  .ot-card.is-active .ot-bar, .ot-card.is-muted:hover .ot-bar { background:var(--ot-acc); }
  .ot-card.is-active .ot-av,  .ot-card.is-muted:hover .ot-av  { background:var(--ot-acc); color:#fff; }
  .ot-card.is-muted:hover img.ot-av { filter:none; }
  .ot-card.is-active .ot-name, .ot-card.is-muted:hover .ot-name { color:#0f172a; }
  .ot-card.is-active .ot-sub,  .ot-card.is-muted:hover .ot-sub  { color:#64748b; }
  .ot-card.is-active .ot-id,   .ot-card.is-muted:hover .ot-id   { color:#475569; }
  .ot-card.is-active .ot-rep,  .ot-card.is-muted:hover .ot-rep  { color:var(--ot-acc); }

  /* search */
  .ot-card.is-hl  { outline:2px solid var(--ot-acc); outline-offset:2px; }
  .ot-card.is-dim { opacity:.15; }
  .ot-card.is-dim:hover { opacity:1; }
  .ot-name mark, .ot-sub mark { background:#fde68a; color:#78350f; border-radius:2px; padding:0 1px; }

  .ot-you {
    position:absolute; top:-9px; right:-9px; z-index:6; background:var(--ot-pill); color:#fff;
    font-size:9px; font-weight:800; letter-spacing:.09em; text-transform:uppercase;
    padding:3px 9px; border-radius:999px; white-space:nowrap; pointer-events:none;
    box-shadow:0 2px 8px rgba(115,0,66,.45), 0 0 0 2px #fff;
  }

  /* + / - button, bottom centre of the card */
  .ot-toggle {
    position:absolute; left:calc(50% - 10px); bottom:-10px; z-index:5;
    width:20px; height:20px; padding:0; border-radius:50%;
    border:1.5px solid var(--ot-line); background:#fff; color:#475569;
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    box-shadow:0 1px 3px rgba(15,23,42,.12); transition:background .14s, color .14s, border-color .14s;
  }
  .ot-toggle:hover { background:var(--ot-acc); border-color:var(--ot-acc); color:#fff; }

  /* ---------- PNG export mode ----------
     Everything that is expanded is drawn at full strength with ALL text visible
     (wrapped, never cut with "..."), no faded / greyed cards, no +/- buttons. */
  .ot-exporting, .ot-exporting * { animation:none !important; transition:none !important; }
  .ot-exporting .ot-toggle { display:none !important; }
  .ot-exporting .ot-card { opacity:1 !important; overflow:visible; height:auto; box-shadow:none; }
  .ot-exporting .ot-card.is-active { box-shadow:0 0 0 3px var(--ot-ring); }
  .ot-exporting .ot-card.is-muted { border-color:#cbd5e1; }
  .ot-exporting .ot-card.is-muted img.ot-av { filter:none; }
  .ot-exporting .ot-card.is-muted .ot-bar { background:#94a3b8; }
  .ot-exporting .ot-card.is-muted .ot-av { background:#64748b; color:#fff; }
  .ot-exporting .ot-card.is-muted .ot-name { color:#0f172a; }
  .ot-exporting .ot-card.is-muted .ot-sub { color:#475569; }
  .ot-exporting .ot-card.is-muted .ot-id { color:#334155; background:#eef0f3; }
  .ot-exporting .ot-card.is-muted .ot-rep { color:#475569; }
  .ot-exporting .ot-name,
  .ot-exporting .ot-sub,
  .ot-exporting .ot-id {
    white-space:normal !important; overflow:visible !important; text-overflow:clip !important;
    text-align:center; word-break:break-word; overflow-wrap:anywhere;
  }
  .ot-exporting .ot-sub { font-size:10.5px; line-height:1.35; }
  .ot-exporting .ot-id { font-size:9.5px; }
  .ot-exporting .ot-card.is-hl { outline:0; }
  .ot-exporting .ot-card.is-dim { opacity:1 !important; }
`;

const Ctx = createContext(null);

function Hi({ text = "", q = "", className = "" }) {
  const idx = q ? norm(text).indexOf(q) : -1;
  if (idx === -1) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

function Av({ node }) {
  const [err, setErr] = useState(false);
  if (node.image && !err) {
    return (
      <img
        className="ot-av"
        src={node.image}
        alt={node.name}
        crossOrigin="anonymous"
        onError={() => setErr(true)}
      />
    );
  }
  return <div className="ot-av">{node.initials || initialsOf(node.name)}</div>;
}

function OrgCard({ node, emp = false }) {
  const c = useContext(Ctx);
  const kids = node.children || [];
  const isOpen = c.forceAll || c.open.has(node.key);
  const hl = c.hasQ && c.matches.has(node.key);
  const dim = c.hasQ && c.anyMatch && !hl;
  const active = c.chain.has(node.key) || hl;
  const cls = [
    "ot-card",
    emp ? "ot-card--emp" : "",
    node.kind === "sa" || node.kind === "org" ? "ot-card--root" : "",
    active ? "is-active" : "is-muted",
    hl ? "is-hl" : "",
    dim ? "is-dim" : "",
    node.onClick ? "is-click" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`ot-cardwrap${node.kind === "sa" || node.kind === "org" ? " ot-cardwrap--root" : ""}`}
    >
      {node.isYou && <span className="ot-you">You</span>}
      <div className={cls} onClick={node.onClick}>
        <span className="ot-bar" />
        <Av node={node} />
        <Hi text={node.name} q={c.q} className="ot-name" />
        {(node.lines || []).map((l, i) => (
          <Hi key={i} text={l} q={c.q} className="ot-sub" />
        ))}
        {node.empid && <span className="ot-id">{node.empid}</span>}
        <span className="ot-rep">
          {kids.length} Reportee{kids.length !== 1 ? "s" : ""}
        </span>
      </div>

      {kids.length > 0 && !c.forceAll && (
        <button
          type="button"
          className="ot-toggle"
          aria-label={isOpen ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            c.toggle(node.key);
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            {!isOpen && (
              <path d="M5 1.5v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}

function EmpList({ emps, chain = false }) {
  return (
    <div className={`ot-vlist${chain ? " ot-vlist--chain" : ""}`}>
      {emps.map((e) => (
        <div className="ot-vitem" key={e.key}>
          <OrgCard node={e} emp />
        </div>
      ))}
    </div>
  );
}

function TreeNode({ node }) {
  const c = useContext(Ctx);
  const kids = node.children || [];
  const isOpen = c.forceAll || c.open.has(node.key);
  const hKids = kids.filter((k) => k.kind !== "emp");
  const eKids = kids.filter((k) => k.kind === "emp");
  const showKids = isOpen && kids.length > 0;
  const bracket = showKids && hKids.length === 0;

  return (
    <div className={`ot-node${bracket ? " ot-node--v" : ""}`}>
      <OrgCard node={node} />
      {showKids &&
        (hKids.length === 0 ? (
          <EmpList emps={eKids} />
        ) : (
          <div className="ot-row">
            {hKids.map((k) => (
              <div className="ot-col" key={k.key}>
                <TreeNode node={k} />
              </div>
            ))}
            {eKids.length > 0 && (
              <div className="ot-col">
                <EmpList emps={eKids} chain />
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

function SkeletonTree() {
  const box = (w, h) => ({
    width: w,
    height: h,
    borderRadius: 12,
    background: "#e5e7eb",
    animation: "otPulse 1.4s ease-in-out infinite",
    flexShrink: 0,
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div style={box(176, 104)} />
      <div style={{ display: "flex", gap: 20 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={box(176, 96)} />
        ))}
      </div>
    </div>
  );
}

const DEFAULT_THEME = {
  acc: "#0f172a",
  ring: "rgba(15,23,42,0.10)",
  line: "#c9d2e0",
  pill: "#730042",
  head: "inherit",
  mono: "monospace",
};

export const OrgTreeView = memo(function OrgTreeView({
  root,
  loading = false,
  q = "",
  matches,
  theme,
}) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  const [open, setOpen] = useState(() => new Set());
  const seeded = useRef(false);

  const path = useMemo(() => selfPath(root), [root]);
  const chain = useMemo(() => new Set(path || []), [path]);
  const matchSet = useMemo(() => matches || new Set(), [matches]);

  // First time the data is ready: expand only the path that leads to the logged-in person
  // (the Super Admin starts with just their own node). After that the user is in control.
  useLayoutEffect(() => {
    if (loading || !root || seeded.current) return;
    seeded.current = true;
    setOpen(new Set(path ? path.slice(0, -1) : [root.key]));
  }, [loading, root, path]);

  const toggle = useCallback(
    (k) =>
      setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      }),
    [],
  );

  const hasQ = q.length > 0;
  const ctx = useMemo(
    () => ({
      open,
      toggle,
      chain,
      q,
      hasQ,
      matches: matchSet,
      anyMatch: matchSet.size > 0,
      forceAll: hasQ, // while searching show everything so a match is never hidden
    }),
    [open, toggle, chain, q, hasQ, matchSet],
  );

  return (
    <div
      className="ot-root"
      style={{
        "--ot-acc": t.acc,
        "--ot-ring": t.ring,
        "--ot-line": t.line,
        "--ot-pill": t.pill,
        "--ot-head": t.head,
        "--ot-mono": t.mono,
      }}
    >
      <style>{TREE_STYLES}</style>
      {loading ? (
        <SkeletonTree />
      ) : root ? (
        <Ctx.Provider value={ctx}>
          <TreeNode node={root} />
        </Ctx.Provider>
      ) : null}
    </div>
  );
});