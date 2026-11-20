import { useRef } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Navbar, Footer, Wrap, fontStyles } from "../../pages/announcement/landingpage";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { landingPages } from "../../seo/landingPages";
import Breadcrumbs from "./Breadcrumbs";
import SEOLinks from "./SEOLinks";

// One template, many pages: content comes from src/seo/landingPages.js.
// Meta tags + JSON-LD come from RouteSeo (same data), so nothing is duplicated here.
export default function SEOLandingPage({ slug }) {
  const navigate = useNavigate();
  const { data: auth } = useAuth();
  const scrollContainerRef = useRef(null);
  const page = landingPages.find((p) => p.slug === slug);
  if (!page) return <Navigate to="/" replace />;

  const isAuthenticated = !!auth;
  const accountLabel = isAuthenticated ? "Access Your Talent Account" : "Sign in to your Talent Account";
  const handleAccountClick = () => navigate(isAuthenticated ? "/redirect" : "/login");

  return (
    <div ref={scrollContainerRef} style={{ height: "100vh", overflowY: "auto" }}>
      <style>{fontStyles}</style>
      <Navbar accountLabel={accountLabel} onAccountClick={handleAccountClick} scrollContainerRef={scrollContainerRef} />

      <main>
        <section className="bg-[#F6EDF2] pb-14 pt-28 sm:pt-32">
          <Wrap>
            <Breadcrumbs path={`/${page.slug}`} className="mb-6" />
            <h1 className="font-hero max-w-[820px] text-[clamp(1.9rem,4.4vw,3.2rem)] font-medium leading-[1.15] tracking-[-1px] text-[#2A1120]">{page.h1}</h1>
            <p className="font-body mt-5 max-w-[720px] text-[16px] leading-[1.8] text-[#555] sm:text-[17px]">{page.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" className="rounded-full bg-[#7A004B] px-6 py-3 font-body text-[15px] font-semibold text-white no-underline hover:bg-[#5a0033]">Start your free 14-day trial</Link>
              <Link to="/pricing-calculator" className="rounded-full border border-[#7A004B] px-6 py-3 font-body text-[15px] font-semibold text-[#7A004B] no-underline hover:bg-white">See pricing</Link>
            </div>
          </Wrap>
        </section>

        <section className="py-14">
          <Wrap>
            <h2 className="font-display text-2xl font-bold text-[#2A1120] sm:text-3xl">Overview</h2>
            <p className="font-body mt-4 max-w-[820px] text-[16px] leading-[1.85] text-[#444]">{page.overview}</p>
          </Wrap>
        </section>

        <section className="bg-[#FBF7F9] py-14">
          <Wrap>
            <h2 className="font-display text-2xl font-bold text-[#2A1120] sm:text-3xl">What you can do</h2>
            <ul className="m-0 mt-8 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2 lg:grid-cols-3">
              {page.features.map((f) => (
                <li key={f.t} className="rounded-2xl border border-[#E2C9D6] bg-white p-6">
                  <h3 className="font-display m-0 text-lg font-bold text-[#7A004B]">{f.t}</h3>
                  <p className="font-body mb-0 mt-2 text-[15px] leading-[1.75] text-[#555]">{f.d}</p>
                </li>
              ))}
            </ul>
          </Wrap>
        </section>

        <section className="py-14">
          <Wrap>
            <h2 className="font-display text-2xl font-bold text-[#2A1120] sm:text-3xl">How it works</h2>
            <ol className="m-0 mt-8 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-3">
              {page.steps.map((s, i) => (
                <li key={s.t} className="rounded-2xl bg-[#F6EDF2] p-6">
                  <span className="font-display text-sm font-bold text-[#7A004B]">Step {i + 1}</span>
                  <h3 className="font-display mb-0 mt-1 text-lg font-bold text-[#2A1120]">{s.t}</h3>
                  <p className="font-body mb-0 mt-2 text-[15px] leading-[1.75] text-[#555]">{s.d}</p>
                </li>
              ))}
            </ol>
            <h2 className="font-display mt-12 text-2xl font-bold text-[#2A1120] sm:text-3xl">Who it is for</h2>
            <p className="font-body mt-4 max-w-[820px] text-[16px] leading-[1.85] text-[#444]">{page.audience}</p>
          </Wrap>
        </section>

        <section className="bg-[#FBF7F9] py-14">
          <Wrap>
            <h2 className="font-display text-2xl font-bold text-[#2A1120] sm:text-3xl">Frequently asked questions</h2>
            <div className="mt-8 max-w-[860px]">
              {page.faqs.map((f) => (
                <details key={f.q} className="mb-3 rounded-xl border border-[#E2C9D6] bg-white p-5">
                  <summary className="cursor-pointer font-display text-[17px] font-bold text-[#2A1120]">{f.q}</summary>
                  <p className="font-body mb-0 mt-3 text-[15px] leading-[1.8] text-[#555]">{f.a}</p>
                </details>
              ))}
            </div>
          </Wrap>
        </section>

        <section className="py-14">
          <Wrap>
            <SEOLinks slugs={page.related} title="Related solutions" />
            <p className="font-body mt-8 text-[15px] text-[#555]">
              Or <Link to="/solutions" className="font-semibold text-[#7A004B]">browse all solutions</Link> and <Link to="/guides" className="font-semibold text-[#7A004B]">read our HR guides</Link>.
            </p>
          </Wrap>
        </section>

        <section className="bg-[#2A1120] py-14 text-center">
          <Wrap>
            <h2 className="font-hero m-0 text-[clamp(1.6rem,3.4vw,2.4rem)] font-medium text-white">Try TorchX Talent with your own team</h2>
            <p className="font-body mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.8] text-[#E8C0D4]">Start a 14-day free trial. Plans are priced per employee per month.</p>
            <Link to="/signup" className="mt-7 inline-block rounded-full bg-white px-7 py-3 font-body text-[15px] font-semibold text-[#7A004B] no-underline">Start free trial</Link>
          </Wrap>
        </section>
      </main>
      <Footer />
    </div>
  );
}
