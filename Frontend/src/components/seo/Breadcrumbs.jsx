import { Link } from "react-router-dom";
import { crumbsFor } from "../../seo/seoRoutes";

// Visible breadcrumbs that match the BreadcrumbList JSON-LD emitted by RouteSeo.
export default function Breadcrumbs({ path, className = "" }) {
  const trail = crumbsFor(path);
  if (!trail) return null;
  return (
    <nav aria-label="Breadcrumb" className={`font-body text-sm text-[#7A004B] ${className}`}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {trail.map((c, i) => (
          <li key={c.path} className="flex items-center gap-2">
            {i < trail.length - 1 ? (
              <Link to={c.path} className="text-[#7A004B] no-underline hover:underline">{c.name}</Link>
            ) : (
              <span aria-current="page" className="text-[#555]">{c.name}</span>
            )}
            {i < trail.length - 1 && <span aria-hidden="true" className="text-[#999]">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
