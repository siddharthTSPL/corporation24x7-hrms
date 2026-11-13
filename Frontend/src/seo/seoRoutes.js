// Single source of truth for SEO of every PUBLIC route.
// Imported by React (RouteSeo, templates) AND by Node build scripts.
// Keep it free of JSX / browser APIs.
import { landingPages } from "./landingPages.js";
import { articles } from "./articles.js";

export const SITE = "https://torchxsuite.com";
export const BASE = "/talent";
export const OG_IMAGE = `${SITE}${BASE}/og-image.png`;
export const SITE_UPDATED = "2026-11-13"; // fallback <lastmod>; bump when site content changes
export const ORG_ID = `${SITE}/#org`;

const core = {
  "/": {
    crumb: "TorchX Talent",
    title: "TorchX Talent — HRMS Software for Attendance, Payroll & Recruitment",
    description: "TorchX Talent is an all-in-one HRMS for employee management, attendance, leave, payroll, timesheets, recruitment and performance reviews. Start a free 14-day trial.",
    h1: "Manage Your Workforce With Smart HR Solutions",
    intro: "TorchX Talent is a complete Human Resource Management System (HRMS) covering hiring, attendance, leave, timesheets, payroll, reimbursements and employee self-service.",
  },
  "/about": {
    crumb: "About",
    title: "About TorchX Talent — Intelligent HRMS by TechTorch Solutions",
    description: "Learn about TorchX Talent and TechTorch Solutions Private Limited — the team building an intelligent HRMS for modern, growing organisations.",
    h1: "Empowering Modern Workforces Through Intelligent HR Solutions",
    intro: "TorchX Talent is built by TechTorch Solutions Private Limited.",
  },
  "/platform-features": {
    crumb: "Platform features",
    title: "HRMS Features — Attendance, Payroll, Recruitment | TorchX Talent",
    description: "Explore TorchX Talent features: attendance and face check-in, leave management, payroll, timesheets, recruitment, reviews, assets, documents and reports.",
    h1: "Unified Human Capital HRMS Built for Enterprise Velocity",
    intro: "Attendance, leave, payroll, timesheets, recruitment, performance reviews, assets, documents and analytics in one platform.",
  },
  "/solutions": {
    crumb: "Solutions",
    title: "HR Software Solutions — Attendance, Leave, Payroll | TorchX Talent",
    description: "Browse TorchX Talent HR software solutions: attendance, leave, timesheets, payroll, recruitment, field force, reimbursements and workflow automation.",
    h1: "HR software solutions for every part of people operations",
    intro: "Pick the area you want to improve. Each solution works on its own and connects to the rest of TorchX Talent.",
    kind: "hub",
  },
  "/documentation": {
    crumb: "Documentation",
    title: "Documentation — Getting Started with TorchX Talent HRMS",
    description: "Step-by-step TorchX Talent documentation for admins, managers and employees: setup, attendance, leave, payroll and more.",
    h1: "TorchX Talent Documentation",
    intro: "Guides for admins, managers and employees.",
  },
  "/guides": {
    crumb: "Guides",
    title: "HR Guides — HRMS, Leave, Attendance | TorchX Talent",
    description: "Practical HR guides from the TorchX Talent team: what HRMS software is, how to write a leave policy and how to calculate attendance.",
    h1: "HR guides for growing teams",
    intro: "Plain-English explanations of HR software and everyday people operations.",
    kind: "guides",
  },
  "/blog": {
    crumb: "Blog",
    title: "HR & Hiring Blog — Insights from TorchX Talent",
    description: "Notes on hiring, HR operations, payroll and building great teams from the TorchX Talent team.",
    h1: "Notes on hiring, HR, and building great teams",
    intro: "Articles on hiring, HR operations and workforce management.",
  },
  "/pricing-calculator": {
    crumb: "Pricing calculator",
    title: "HRMS Pricing Calculator — Per-Employee Pricing | TorchX Talent",
    description: "Estimate your TorchX Talent cost per employee per month and compare plans with our HRMS pricing calculator.",
    h1: "TorchX Talent Pricing Calculator",
    intro: "Pricing is per employee per month. Prices are exclusive of GST.",
  },
  "/login": {
    crumb: "Log in",
    title: "Log in — TorchX Talent",
    description: "Log in to your TorchX Talent HRMS workspace.",
    h1: "Log in to TorchX Talent",
    intro: "",
    noindex: true, // login screens should not rank
  },
  "/signup": {
    crumb: "Sign up",
    title: "Sign up — Start your free TorchX Talent trial",
    description: "Create your TorchX Talent account and start a free 14-day HRMS trial for your organisation.",
    h1: "Start your free TorchX Talent trial",
    intro: "",
  },
};

const link = (slug) => landingPages.find((p) => p.slug === slug);

const fromLanding = Object.fromEntries(
  landingPages.map((p) => [
    `/${p.slug}`,
    {
      kind: "solution",
      crumb: p.nav,
      title: p.title,
      description: p.description,
      h1: p.h1,
      intro: p.intro,
      faqs: p.faqs,
      sections: [
        { h: "Overview", p: [p.overview] },
        { h: "What you can do", list: p.features.map((f) => ({ text: `${f.t}: ${f.d}` })) },
        { h: "How it works", list: p.steps.map((s) => ({ text: `${s.t}: ${s.d}` })) },
        { h: "Who it is for", p: [p.audience] },
        { h: "Frequently asked questions", list: p.faqs.map((f) => ({ text: `${f.q} ${f.a}` })) },
        { h: "Related solutions", list: p.related.filter(link).map((s) => ({ text: link(s).nav, href: `${BASE}/${s}` })) },
      ],
    },
  ])
);

const fromArticles = Object.fromEntries(
  articles.map((a) => [
    `/guides/${a.slug}`,
    {
      kind: "article",
      crumb: a.crumb,
      title: a.title,
      description: a.description,
      h1: a.h1,
      intro: a.intro,
      published: a.published,
      updated: a.updated,
      sections: [
        ...a.sections.map((s) => ({ h: s.h, p: s.p })),
        ...(link(a.solution) ? [{ h: "Related solution", list: [{ text: link(a.solution).nav, href: `${BASE}/${a.solution}` }] }] : []),
      ],
    },
  ])
);

export const seoRoutes = { ...core, ...fromLanding, ...fromArticles };

// Token / session URLs: always noindex + disallowed in robots.txt.
export const PRIVATE_PREFIXES = ["/meeting-guest", "/offer-response", "/live-attendance", "/sso-callback", "/companion-login"];
export const isPrivatePath = (p) => PRIVATE_PREFIXES.some((x) => p === x || p.startsWith(x + "/"));

export const canonicalFor = (path) => `${SITE}${BASE}${path === "/" ? "/" : path}`;

// Visible breadcrumb trail (also used for BreadcrumbList JSON-LD).
export const crumbsFor = (path) => {
  const e = seoRoutes[path];
  if (!e || path === "/") return null;
  const trail = [{ name: "TorchX Talent", path: "/" }];
  if (e.kind === "solution") trail.push({ name: "Solutions", path: "/solutions" });
  if (e.kind === "article") trail.push({ name: "Guides", path: "/guides" });
  trail.push({ name: e.crumb || e.h1, path });
  return trail;
};

// JSON-LD blocks for a path (BreadcrumbList, FAQPage, Article). Must match visible content.
export const jsonLdFor = (path) => {
  const e = seoRoutes[path];
  if (!e) return [];
  const out = [];
  const trail = crumbsFor(path);
  if (trail) {
    out.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: canonicalFor(c.path) })),
    });
  }
  if (e.faqs?.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: e.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }
  if (e.kind === "article") {
    out.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: e.h1,
      description: e.description,
      datePublished: e.published,
      dateModified: e.updated,
      mainEntityOfPage: canonicalFor(path),
      image: OG_IMAGE,
      author: { "@type": "Organization", name: "TorchX Talent", url: `${SITE}${BASE}/` },
      publisher: { "@id": ORG_ID },
    });
  }
  return out;
};
