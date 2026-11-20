import { Helmet } from "react-helmet-async";
import { SITE, BASE, OG_IMAGE } from "../../seo/seoRoutes";

// Generic meta tags for one-off pages that are NOT listed in src/seo/seoRoutes.js.
// (Pages listed there are handled automatically by RouteSeo.)
export default function SEO({ title, description, path = "/", image = OG_IMAGE, noindex = false }) {
  const url = `${SITE}${BASE}${path === "/" ? "/" : path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={noindex ? "noindex, follow" : "index, follow"} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
