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

/*
  html2canvas places small text (avatar initials, "YOU", employee-ID) lower than
  the browser does, so it never looks centred inside its circle / pill. To fix
  that for good we do NOT let html2canvas draw those three texts: they are made
  transparent in the cloned DOM, and after the canvas is ready we draw them
  ourselves, mathematically centred in the exact box of their circle / pill.
*/
function collectCenteredTexts(target, badSrc) {
  const tr = target.getBoundingClientRect();
  const headFont =
    getComputedStyle(target.querySelector(".ot-name") || target).fontFamily;
  const out = [];
  const push = (el, text, font, color, ls = 0, shape = null) => {
    if (!text) return;
    const r = el.getBoundingClientRect();
    out.push({
      text,
      font,
      color,
      ls,
      // circle / pill behind the text: we draw it too, so shape and text always match
      shape: shape && {
        ...shape,
        x: r.left - tr.left,
        y: r.top - tr.top,
        w: r.width,
        h: r.height,
      },
      cx: r.left - tr.left + r.width / 2,
      cy: r.top - tr.top + r.height / 2,
    });
  };

  target.querySelectorAll(".ot-av").forEach((el) => {
    if (el.tagName === "IMG") {
      if (!badSrc.has(el.getAttribute("src"))) return; // real photo, nothing to draw
      const w = el.getBoundingClientRect().width;
      const size = w >= 48 ? 16 : w >= 36 ? 13 : 11;
      const card = el.closest(".ot-card");
      const wrap = el.closest(".ot-cardwrap");
      const bg =
        card && card.classList.contains("is-active") && wrap
          ? getComputedStyle(wrap).getPropertyValue("--ot-acc").trim() || "#64748b"
          : "#64748b";
      push(el, initialsOf(el.getAttribute("alt") || ""), `700 ${size}px ${headFont}`, "#ffffff", 0, {
        kind: "circle",
        bg,
      });
    } else {
      const cs = getComputedStyle(el);
      push(
        el,
        el.textContent.trim(),
        `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
        cs.color,
        0,
        { kind: "circle", bg: cs.backgroundColor },
      );
    }
  });

  target.querySelectorAll(".ot-you, .ot-id").forEach((el) => {
    const cs = getComputedStyle(el);
    let text = el.textContent.trim();
    if (cs.textTransform === "uppercase") text = text.toUpperCase();
    const ls = parseFloat(cs.letterSpacing) || 0;
    const isYou = el.classList.contains("ot-you");
    push(
      el,
      text,
      `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
      cs.color,
      ls,
      isYou ? { kind: "pill", bg: cs.backgroundColor, ring: true } : null,
    );
  });

  return out;
}

function drawCenteredTexts(canvas, scale, items) {
  const ctx = canvas.getContext("2d");
  ctx.save();
  // html2canvas leaves its own scale on this context, so set the transform
  // absolutely (ctx.scale() would multiply it again -> 2x size / wrong place)
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const rr = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  // shapes first (white ring + coloured circle / pill), then all texts on top
  items.forEach((it) => {
    const s = it.shape;
    if (!s) return;
    if (s.ring) {
      ctx.fillStyle = "#ffffff";
      rr(s.x - 2, s.y - 2, s.w + 4, s.h + 4, (s.h + 4) / 2);
      ctx.fill();
    }
    ctx.fillStyle = s.bg;
    if (s.kind === "circle") {
      ctx.beginPath();
      ctx.arc(s.x + s.w / 2, s.y + s.h / 2, Math.min(s.w, s.h) / 2, 0, Math.PI * 2);
      ctx.closePath();
    } else {
      rr(s.x, s.y, s.w, s.h, s.h / 2);
    }
    ctx.fill();
  });
  items.forEach((it) => {
    ctx.font = it.font;
    ctx.fillStyle = it.color;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${it.ls}px`;
    const m = ctx.measureText(it.text);
    // centre the visible glyphs (not the font's line box) inside the circle / pill
    const y = it.cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    ctx.fillText(it.text, it.cx + it.ls / 2, y);
  });
  ctx.restore();
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

    // texts that we draw ourselves (perfectly centred) after html2canvas is done
    const centered = collectCenteredTexts(target, badSrc);

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
          t.classList.add("ot-h2c"); // hides initials / YOU / emp-id text in the clone
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

    drawCenteredTexts(canvas, scale, centered);

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

/*
  Connector notes (why this version is export-safe):
  - No :first-child / :last-child / :only-child selectors any more. html2canvas
    clones the DOM and these pseudo-classes were the reason the Super Admin ->
    Admin line broke (an extra 20px gap appeared). Every position is now an
    explicit class (--first / --last / --only / --mid) set from JS.
  - The vertical stem under a card is its own real element (.ot-stem), not a
    pseudo-element, so it always reaches the next card.
  - The coloured line on top of a card is an inset "tab" (not full width), so
    it never pokes out of the rounded corners (overflow stays visible).
*/
export const TREE_STYLES = `
  @keyframes otIn    { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
  @keyframes otPulse { 0%,100% { opacity:1; } 50% { opacity:.45; } }

  .ot-root, .ot-root * { box-sizing: border-box; }
  .ot-root {
    --w-card: 176px;
    --w-emp: 152px;
    --gap: 24px;
    width: max-content;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ---------- layout + connectors ---------- */
  .ot-node { display:flex; flex-direction:column; align-items:center; position:relative; }
  .ot-node--v { align-items:flex-start; }

  /* vertical stem from a card down to its children */
  .ot-stem { width:0; height:var(--gap); border-left:1.5px solid var(--ot-line); flex-shrink:0; }

  .ot-row { display:flex; justify-content:center; align-items:flex-start; position:relative; animation:otIn .22s ease; }

  .ot-col { position:relative; display:flex; flex-direction:column; align-items:center; padding:var(--gap) 9px 0; }
  /* left half / right half of the horizontal bar + the drop line to the card */
  .ot-col::before, .ot-col::after { content:""; position:absolute; top:0; height:var(--gap); }
  .ot-col::before { right:50%; width:50%; border-top:1.5px solid var(--ot-line); }
  .ot-col::after  { left:50%;  width:50%; border-top:1.5px solid var(--ot-line); border-left:1.5px solid var(--ot-line); }
  .ot-col--first::before { border-top:0; }
  .ot-col--last::after   { border-top:0; }
  .ot-col--only { padding-top:0; }
  .ot-col--only::before, .ot-col--only::after { display:none; }

  /* employees: stacked vertically with a bracket line on the left */
  .ot-vlist { display:flex; flex-direction:column; gap:12px; position:relative; padding:18px 0 0 calc(var(--w-card) - var(--w-emp)); animation:otIn .22s ease; }
  .ot-vitem { position:relative; }
  .ot-vitem::before { content:""; position:absolute; top:50%; left:-13px; width:13px; border-top:1.5px solid var(--ot-line); }
  .ot-vitem::after { content:""; position:absolute; left:-13px; top:-12px; height:calc(100% + 12px); border-left:1.5px solid var(--ot-line); }
  .ot-vitem--first::after { top:-18px; height:calc(100% + 18px); }
  .ot-vitem--last::after  { height:calc(50% + 12px); }
  .ot-vitem--only::after  { top:-18px; height:calc(50% + 18px); }

  /* employees next to sub-managers: plain vertical chain under the shared connector */
  .ot-vlist--chain { align-items:center; padding:0; gap:14px; }
  .ot-vlist--chain .ot-vitem::before { top:-14px; left:50%; width:0; height:14px; border-top:0; border-left:1.5px solid var(--ot-line); }
  .ot-vlist--chain .ot-vitem::after { display:none; }
  .ot-vlist--chain .ot-vitem--first::before { display:none; }

  /* ---------- card ---------- */
  .ot-cardwrap { position:relative; flex-shrink:0; }
  /* Only the Super Admin / organisation node is highlighted in black; everyone else uses the theme colour */
  .ot-cardwrap--root { --ot-acc:#0f172a; --ot-ring:rgba(15,23,42,.12); }
  .ot-card {
    width:var(--w-card); background:#fff; border:1.5px solid #e5e7eb; border-radius:12px;
    padding:16px 10px 14px; display:flex; flex-direction:column; align-items:center;
    position:relative; overflow:visible; box-shadow:0 1px 4px rgba(15,23,42,.05);
    transition:opacity .18s, border-color .15s, box-shadow .15s;
  }
  .ot-card--emp { width:var(--w-emp); padding:14px 8px 10px; }

  /* Super Admin / organisation node: a bit bigger, full name shown (wraps, never cut) */
  .ot-card--root { width:240px; padding:22px 16px 16px; border-radius:14px; }
  .ot-card--root .ot-av { width:50px; height:50px; font-size:16px; }
  .ot-card--root .ot-name { margin-top:10px; font-size:14px; line-height:1.35; white-space:normal; overflow:visible; text-overflow:clip; text-align:center; overflow-wrap:anywhere; }
  .ot-card--root .ot-sub { margin-top:3px; font-size:11.5px; font-weight:600; line-height:1.35; white-space:normal; overflow:visible; text-overflow:clip; text-align:center; overflow-wrap:anywhere; }
  .ot-card--root .ot-rep { font-size:11px; }
  .ot-card.is-click { cursor:pointer; }

  /* top accent: a small inset tab sitting on the card's top border (never sticks out of the corners) */
  .ot-bar {
    position:absolute; top:-1.5px; left:50%; width:44px; height:4px; margin-left:-22px;
    border-radius:0 0 4px 4px; background:#d1d5db; transition:background .15s;
  }
  .ot-card--root .ot-bar { width:64px; margin-left:-32px; }
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

  /* Employee-ID pill: flex + fixed line-height keeps the grey background exactly behind the text */
  .ot-id {
    display:flex; align-items:center; justify-content:center;
    width:fit-content; max-width:100%; min-height:18px; margin-top:6px; padding:0 8px;
    border-radius:5px; background:#f3f4f6;
    font-family:var(--ot-mono); font-size:9px; line-height:1; letter-spacing:.02em; color:#b7bdc8;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .ot-rep  { display:block; margin-top:6px; font-size:10px; font-weight:500; color:#a8b0bd; transition:color .15s; }

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
    position:absolute; top:-10px; right:14px; z-index:6; background:var(--ot-pill); color:#fff;
    font-size:9px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; line-height:1;
    padding:5px 10px; border-radius:999px; white-space:nowrap; pointer-events:none;
    box-shadow:0 2px 8px rgba(115,0,66,.35), 0 0 0 2px #fff;
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
  .ot-exporting .ot-sub {
    white-space:normal !important; overflow:visible !important; text-overflow:clip !important;
    text-align:center; word-break:break-word; overflow-wrap:anywhere;
  }
  .ot-exporting .ot-id { white-space:nowrap !important; overflow:visible !important; text-overflow:clip !important; }
  .ot-exporting .ot-sub { font-size:10.5px; line-height:1.35; }
  .ot-exporting .ot-id { font-size:9.5px; }
  /* in the html2canvas clone these texts are transparent - they are drawn centred by drawCenteredTexts() */
  .ot-h2c .ot-av, .ot-h2c .ot-you, .ot-h2c .ot-id { color:transparent !important; }
  /* circle + YOU pill are drawn by drawCenteredTexts() together with their text */
  .ot-h2c div.ot-av, .ot-h2c .ot-you { background:transparent !important; box-shadow:none !important; }
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
  const isRoot = node.kind === "sa" || node.kind === "org";
  const cls = [
    "ot-card",
    emp ? "ot-card--emp" : "",
    isRoot ? "ot-card--root" : "",
    active ? "is-active" : "is-muted",
    hl ? "is-hl" : "",
    dim ? "is-dim" : "",
    node.onClick ? "is-click" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`ot-cardwrap${isRoot ? " ot-cardwrap--root" : ""}`}>
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

// position class used instead of :first-child / :last-child / :only-child
const posClass = (i, n) =>
  n === 1 ? "only" : i === 0 ? "first" : i === n - 1 ? "last" : "mid";

function EmpList({ emps, chain = false }) {
  return (
    <div className={`ot-vlist${chain ? " ot-vlist--chain" : ""}`}>
      {emps.map((e, i) => (
        <div
          className={`ot-vitem ot-vitem--${posClass(i, emps.length)}`}
          key={e.key}
        >
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

  // columns under this node: every sub-manager/admin + (optionally) one column holding the employees
  const colCount = hKids.length + (eKids.length > 0 ? 1 : 0);

  return (
    <div className={`ot-node${bracket ? " ot-node--v" : ""}`}>
      <OrgCard node={node} />
      {showKids &&
        (hKids.length === 0 ? (
          <EmpList emps={eKids} />
        ) : (
          <>
            <div className="ot-stem" />
            <div className="ot-row">
              {hKids.map((k, i) => (
                <div
                  className={`ot-col ot-col--${posClass(i, colCount)}`}
                  key={k.key}
                >
                  <TreeNode node={k} />
                </div>
              ))}
              {eKids.length > 0 && (
                <div
                  className={`ot-col ot-col--${posClass(hKids.length, colCount)}`}
                >
                  <EmpList emps={eKids} chain />
                </div>
              )}
            </div>
          </>
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