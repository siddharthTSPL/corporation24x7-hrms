// Runs automatically after `vite build` (see "build" in package.json).
// Reads src/seo/seoRoutes.js (the single source of truth) and writes into dist/:
//   1. sitemap.xml            -> https://torchxsuite.com/talent/sitemap.xml
//   2. robots.txt             -> only used if the site is served from /talent root
//   3. robots.root.txt        -> copy this to https://torchxsuite.com/robots.txt
//   4. <route>/index.html     -> one HTML file per public page with its own
//                                title / description / canonical / JSON-LD / text,
//                                so crawlers and link previews see real content
//                                without running JavaScript.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seoRoutes, SITE, BASE, SITE_UPDATED, OG_IMAGE, canonicalFor, jsonLdFor } from "../src/seo/seoRoutes.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html not found. Run `vite build` first.");
  process.exit(1);
}

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const paths = Object.keys(seoRoutes);
const indexable = paths.filter((p) => !seoRoutes[p].noindex);

// ---------- 1. sitemap.xml ----------
const urls = indexable
  .map((p) => `  <url>\n    <loc>${esc(canonicalFor(p))}</loc>\n    <lastmod>${seoRoutes[p].updated || SITE_UPDATED}</lastmod>\n  </url>`)
  .join("\n");
writeFileSync(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

// ---------- 2 + 3. robots.txt ----------
// Private app areas. These are PREFIXES, so "/talent/leave" also matches
// "/talent/leave-management-software". The Allow lines below fix that:
// for Google/Bing the longest matching rule wins, and every public page's
// Allow line is longer than the prefix it collides with.
const PRIVATE = [
  "api", "dashboard", "employee-dashboard", "manager-dashboard", "employee", "leave", "file",
  "settings", "organisation", "review", "mark-attendance", "admin-", "manager-", "announcement",
  "document", "recruitment", "manager/", "superadmin", "redirect", "unauthorized", "offer-response",
  "meeting-guest", "live-attendance", "sso-callback", "companion-login",
  "payroll", "reimbursement", "overtime", "meetings", "training", "gamification", "notifications",
  "help-center", "self-service", "my-policies", "reports", "field-operations", "face-enrollment", "coming-soon",
];
const allowLines = indexable.filter((p) => p !== "/").map((p) => `Allow: ${BASE}${p}`);
const body = [
  "User-agent: *",
  `Allow: ${BASE}/$`,
  ...allowLines,
  ...PRIVATE.map((x) => `Disallow: ${BASE}/${x}`),
  "",
  `Sitemap: ${SITE}${BASE}/sitemap.xml`,
  "",
].join("\n");
writeFileSync(join(dist, "robots.txt"), body);
writeFileSync(join(dist, "robots.root.txt"), `# Must live at ${SITE}/robots.txt (domain ROOT). Crawlers ignore ${BASE}/robots.txt.\n${body}`);

// ---------- 4. per-route HTML ----------
const template = readFileSync(join(dist, "index.html"), "utf8");

const bodyHtml = (e) => {
  const sections = (e.sections || [])
    .map((s) => {
      const ps = (s.p || []).map((t) => `<p>${esc(t)}</p>`).join("");
      const list = s.list
        ? `<ul>${s.list.map((i) => `<li>${i.href ? `<a href="${esc(i.href)}">${esc(i.text)}</a>` : esc(i.text)}</li>`).join("")}</ul>`
        : "";
      return `<section><h2>${esc(s.h)}</h2>${ps}${list}</section>`;
    })
    .join("");
  return `<main data-prerendered="true"><h1>${esc(e.h1)}</h1>${e.intro ? `<p>${esc(e.intro)}</p>` : ""}${sections}</main>`;
};

const headTags = (path, e) => {
  const url = canonicalFor(path);
  const robots = e.noindex ? "noindex, follow" : "index, follow, max-image-preview:large";
  const t = [
    `<title data-rh="true">${esc(e.title)}</title>`,
    `<meta data-rh="true" name="description" content="${esc(e.description)}" />`,
    `<meta data-rh="true" name="robots" content="${robots}" />`,
    `<link data-rh="true" rel="canonical" href="${esc(url)}" />`,
    `<meta data-rh="true" property="og:title" content="${esc(e.title)}" />`,
    `<meta data-rh="true" property="og:description" content="${esc(e.description)}" />`,
    `<meta data-rh="true" property="og:url" content="${esc(url)}" />`,
    `<meta data-rh="true" property="og:image" content="${esc(OG_IMAGE)}" />`,
    `<meta data-rh="true" property="og:type" content="${e.kind === "article" ? "article" : "website"}" />`,
    `<meta data-rh="true" name="twitter:title" content="${esc(e.title)}" />`,
    `<meta data-rh="true" name="twitter:description" content="${esc(e.description)}" />`,
    `<meta data-rh="true" name="twitter:image" content="${esc(OG_IMAGE)}" />`,
    ...jsonLdFor(path).map((d) => `<script data-rh="true" type="application/ld+json">${JSON.stringify(d).replace(/</g, "\\u003c")}</script>`),
  ];
  return t.join("\n    ");
};

let written = 0;
for (const path of paths) {
  const e = seoRoutes[path];
  let html = template.replace(/<title>[\s\S]*?<\/title>/, "");
  html = html.replace("</head>", `    ${headTags(path, e)}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml(e)}</div>`);
  const file = path === "/" ? join(dist, "index.html") : join(dist, path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  written++;
}
console.log(`SEO build: ${written} pages prerendered, ${indexable.length} URLs in sitemap.xml, robots.txt + robots.root.txt written.`);
