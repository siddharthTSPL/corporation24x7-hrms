import { useRef } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Navbar, Footer, Wrap, fontStyles } from "../../pages/announcement/landingpage";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { articles } from "../../seo/articles";
import { landingPages } from "../../seo/landingPages";
import Breadcrumbs from "./Breadcrumbs";
import SEOLinks from "./SEOLinks";

// Template for /guides/:slug. Meta + Article/Breadcrumb JSON-LD come from RouteSeo.
export default function ArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: auth } = useAuth();
  const ref = useRef(null);
  const a = articles.find((x) => x.slug === slug);
  if (!a) return <Navigate to="/guides" replace />;
  const solution = landingPages.find((p) => p.slug === a.solution);
  const accountLabel = auth ? "Access Your Talent Account" : "Sign in to your Talent Account";
  const date = new Date(a.updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div ref={ref} style={{ height: "100vh", overflowY: "auto" }}>
      <style>{fontStyles}</style>
      <Navbar accountLabel={accountLabel} onAccountClick={() => navigate(auth ? "/redirect" : "/login")} scrollContainerRef={ref} />
      <main>
        <article>
          <header className="bg-[#F6EDF2] pb-12 pt-28 sm:pt-32">
            <Wrap>
              <Breadcrumbs path={`/guides/${a.slug}`} className="mb-6" />
              <h1 className="font-hero max-w-[820px] text-[clamp(1.9rem,4.2vw,3rem)] font-medium leading-[1.15] tracking-[-1px] text-[#2A1120]">{a.h1}</h1>
              <p className="font-body mt-5 max-w-[720px] text-[17px] leading-[1.8] text-[#555]">{a.intro}</p>
              <p className="font-body mt-4 text-sm text-[#777]">By the TorchX Talent team · Updated <time dateTime={a.updated}>{date}</time></p>
            </Wrap>
          </header>
          <Wrap className="py-12">
            <div className="max-w-[760px]">
              {a.sections.map((s) => (
                <section key={s.h} className="mb-9">
                  <h2 className="font-display text-2xl font-bold text-[#2A1120]">{s.h}</h2>
                  {s.p.map((t, i) => (
                    <p key={i} className="font-body mt-3 text-[16px] leading-[1.9] text-[#444]">{t}</p>
                  ))}
                </section>
              ))}
              {solution && (
                <aside className="rounded-2xl bg-[#F6EDF2] p-6">
                  <p className="font-body m-0 text-[16px] leading-[1.8] text-[#444]">
                    Want this handled in software? See <Link to={`/${solution.slug}`} className="font-semibold text-[#7A004B]">{solution.nav}</Link> in TorchX Talent, or <Link to="/signup" className="font-semibold text-[#7A004B]">start a free 14-day trial</Link>.
                  </p>
                </aside>
              )}
            </div>
          </Wrap>
        </article>
        <section className="bg-[#FBF7F9] py-12"><Wrap><SEOLinks slugs={solution ? solution.related : undefined} title="Related solutions" /></Wrap></section>
      </main>
      <Footer />
    </div>
  );
}
