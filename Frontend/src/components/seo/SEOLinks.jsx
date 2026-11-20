import { Link } from "react-router-dom";
import { landingPages } from "../../seo/landingPages";

// Crawlable internal links to solution pages. Pass `slugs` for a curated list,
// otherwise every solution except `exclude` is shown.
export default function SEOLinks({ slugs, exclude, title = "Explore more of TorchX Talent" }) {
  const items = (slugs ? slugs.map((s) => landingPages.find((p) => p.slug === s)).filter(Boolean) : landingPages).filter((p) => p.slug !== exclude);
  if (!items.length) return null;
  return (
    <section aria-labelledby="seo-links-heading">
      <h2 id="seo-links-heading" className="font-display text-2xl font-bold text-[#2A1120] sm:text-3xl">{title}</h2>
      <ul className="m-0 mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <li key={p.slug}>
            <Link to={`/${p.slug}`} className="block h-full rounded-2xl border border-[#E2C9D6] bg-white p-5 no-underline transition-shadow hover:shadow-md">
              <span className="font-display text-lg font-bold text-[#7A004B]">{p.nav}</span>
              <span className="mt-1 block font-body text-[15px] leading-relaxed text-[#555]">{p.card}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
