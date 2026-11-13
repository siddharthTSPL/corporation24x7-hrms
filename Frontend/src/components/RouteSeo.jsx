import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { seoRoutes, canonicalFor, OG_IMAGE, isPrivatePath, jsonLdFor } from "../seo/seoRoutes";

// Mount ONCE inside <BrowserRouter basename="/talent"> in App.jsx.
// - Public routes in seoRoutes: unique title/description/canonical/OG + JSON-LD
//   (BreadcrumbList, FAQPage, Article) generated from the same data as the page.
// - Token / session routes: noindex, nofollow.
// - Dashboards etc.: untouched (Protectedroute already adds noindex).
export default function RouteSeo() {
  const { pathname } = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

  if (isPrivatePath(path)) {
    return (
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
    );
  }

  const seo = seoRoutes[path];
  if (!seo) return null;

  const url = canonicalFor(path);
  return (
    <Helmet>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="robots" content={seo.noindex ? "noindex, follow" : "index, follow, max-image-preview:large"} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:type" content={seo.kind === "article" ? "article" : "website"} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      {jsonLdFor(path).map((d, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(d)}</script>
      ))}
    </Helmet>
  );
}
