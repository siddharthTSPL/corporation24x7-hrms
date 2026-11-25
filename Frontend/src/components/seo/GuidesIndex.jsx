import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar, Footer, Wrap, fontStyles } from "../../pages/announcement/landingpage";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { articles } from "../../seo/articles";
import { seoRoutes } from "../../seo/seoRoutes";
import Breadcrumbs from "./Breadcrumbs";

export default function GuidesIndex() {
  const navigate = useNavigate();
  const { data: auth } = useAuth();
  const ref = useRef(null);
  const e = seoRoutes["/guides"];
  const accountLabel = auth ? "Access Your Talent Account" : "Sign in to your Talent Account";
  return (
    <div ref={ref} style={{ height: "100vh", overflowY: "auto" }}>
      <style>{fontStyles}</style>
      <Navbar accountLabel={accountLabel} onAccountClick={() => navigate(auth ? "/redirect" : "/login")} scrollContainerRef={ref} />
      <main>
        <section className="bg-[#F6EDF2] pb-12 pt-28 sm:pt-32">
          <Wrap>
            <Breadcrumbs path="/guides" className="mb-6" />
            <h1 className="font-hero max-w-[820px] text-[clamp(1.9rem,4.4vw,3.2rem)] font-medium leading-[1.15] tracking-[-1px] text-[#2A1120]">{e.h1}</h1>
            <p className="font-body mt-5 max-w-[720px] text-[17px] leading-[1.8] text-[#555]">{e.intro}</p>
          </Wrap>
        </section>
        <section className="py-14">
          <Wrap>
            <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2">
              {articles.map((a) => (
                <li key={a.slug}>
                  <Link to={`/guides/${a.slug}`} className="block h-full rounded-2xl border border-[#E2C9D6] bg-white p-6 no-underline hover:shadow-md">
                    <span className="font-display text-xl font-bold text-[#7A004B]">{a.h1}</span>
                    <span className="mt-2 block font-body text-[15px] leading-relaxed text-[#555]">{a.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Wrap>
        </section>
      </main>
      <Footer />
    </div>
  );
}
