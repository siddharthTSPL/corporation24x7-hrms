import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, Footer, Wrap, fontStyles } from "../../pages/announcement/landingpage";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { seoRoutes } from "../../seo/seoRoutes";
import Breadcrumbs from "./Breadcrumbs";
import SEOLinks from "./SEOLinks";

export default function SolutionsHub() {
  const navigate = useNavigate();
  const { data: auth } = useAuth();
  const ref = useRef(null);
  const e = seoRoutes["/solutions"];
  const accountLabel = auth ? "Access Your Talent Account" : "Sign in to your Talent Account";
  return (
    <div ref={ref} style={{ height: "100vh", overflowY: "auto" }}>
      <style>{fontStyles}</style>
      <Navbar accountLabel={accountLabel} onAccountClick={() => navigate(auth ? "/redirect" : "/login")} scrollContainerRef={ref} />
      <main>
        <section className="bg-[#F6EDF2] pb-12 pt-28 sm:pt-32">
          <Wrap>
            <Breadcrumbs path="/solutions" className="mb-6" />
            <h1 className="font-hero max-w-[820px] text-[clamp(1.9rem,4.4vw,3.2rem)] font-medium leading-[1.15] tracking-[-1px] text-[#2A1120]">{e.h1}</h1>
            <p className="font-body mt-5 max-w-[720px] text-[17px] leading-[1.8] text-[#555]">{e.intro}</p>
          </Wrap>
        </section>
        <section className="py-14"><Wrap><SEOLinks title="All solutions" /></Wrap></section>
      </main>
      <Footer />
    </div>
  );
}
