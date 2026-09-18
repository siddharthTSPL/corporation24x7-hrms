import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FiArrowRight, FiCheck, FiShield, FiLock, FiHardDrive,
  FiFileText, FiZap, FiEye, FiClock,
} from 'react-icons/fi'
import { BsPeopleFill, BsGraphUp } from 'react-icons/bs'
import { FiStar, FiUsers } from 'react-icons/fi'

import { Navbar, Footer, Wrap, fontStyles } from './announcement/landingpage'
import { useAuth } from '../auth/store/getmeauth/getmeauth'


import slideWhiteOffice from '../assets/Office-meeting.png'
import slideTeam from '../assets/Team-work.jpg'

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }

function HeroBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-2 bg-[#FDF4F8] border border-[#EAC7D7] text-[#7A004B] text-[12px] font-ui font-semibold uppercase tracking-[1px] px-4 py-2 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-[#7A004B]" />
      {children}
    </span>
  )
}

function AboutHero({ onExplore }) {
 
  return (
    <section className="bg-white pt-24 pb-12 overflow-hidden">
      <Wrap>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] items-center gap-12">
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <div className="mb-5"><HeroBadge>About TorchX Talent — People-First HRMS Architecture</HeroBadge></div>
            <h1 className="font-hero font-medium text-[#111] leading-[1.12] mb-6 text-[clamp(1.9rem,4.2vw,3.2rem)] tracking-[-1px]">
              Empowering Modern Workforces Through <span className="text-[#7A004B]">Intelligent HR</span> Solutions
            </h1>
            <p className="font-body text-[#555] leading-[1.8] mb-8 text-[15.5px] max-w-[540px]">
              At TorchX Talent, we believe that an organization's greatest asset is its people. We architected a unified,
              next-generation Human Resource Management System (HRMS) that eliminates administrative friction, automates
              the complete employee lifecycle from hiring to payroll, and transforms workforce data into actionable growth.
            </p>
            <button
              onClick={onExplore}
              className="inline-flex items-center gap-2 bg-[#7A004B] text-white text-[15px] font-ui font-semibold px-7 py-3.5 rounded-full border-none cursor-pointer shadow-[0_8px_24px_rgba(122,0,75,0.25)] transition-all hover:bg-[#5a0033] hover:-translate-y-0.5"
            >
              Explore Platform Features <FiArrowRight />
            </button>
            <div className="flex flex-wrap gap-x-8 gap-y-2 mt-6">
              {['Enterprise Grade Security', 'Rapid 14-Day Deployment'].map(t => (
                <span key={t} className="inline-flex items-center gap-2 text-[13.5px] font-body text-[#444]">
                  <FiCheck className="text-[#1a9c4b]" /> {t}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.15 }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden border border-[#EAC7D7] shadow-[0_24px_64px_rgba(115,0,66,0.16)] aspect-[4/3]">
              <img
                src={slideWhiteOffice}
                alt="TorchX Talent workforce analytics"
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>

            <div className="absolute -top-4 -left-4 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-[#EAC7D7] px-4 py-2.5 hidden sm:block">
              <div className="flex items-center gap-1.5 text-[10px] font-ui font-semibold text-[#888] uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#1a9c4b]" /> Service Availability
              </div>
              <div className="text-sm font-display font-bold text-[#111] mt-0.5">99.9% Enterprise Uptime</div>
            </div>

            <div className="absolute -top-4 -right-2 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-[#EAC7D7] px-4 py-2.5 hidden sm:flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#7A004B] text-white text-[11px] font-bold flex items-center justify-center shrink-0">40%</span>
              <div>
                <div className="text-[9px] font-ui font-semibold text-[#888] uppercase tracking-wide">Efficiency Gain</div>
                <div className="text-[12.5px] font-display font-bold text-[#111]">Admin Time Saved</div>
              </div>
            </div>

            <div className="absolute -bottom-4 left-4 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-[#EAC7D7] px-4 py-2.5 flex items-center gap-2">
              <FiShield className="text-[#7A004B]" />
              <div>
                <div className="text-[9px] font-ui font-semibold text-[#888] uppercase tracking-wide">Compliance</div>
                <div className="text-[12px] font-display font-bold text-[#111]">ISO 27001 &amp; SOC 2 Ready</div>
              </div>
            </div>
          </motion.div>
        </div>
      </Wrap>
    </section>
  )
}

function TrackRecord({ scrollContainerRef }) {
  const stats = [
    { icon: <BsPeopleFill size={20} />, num: '100+', label: 'Happy customers of TorchX Talent' },
    { icon: <BsGraphUp size={20} />, num: '100+', label: 'No. of live executive demos' },
    { icon: <FiUsers size={20} />, num: '10+', label: 'Partners to collaborate & integrate' },
    { icon: <FiStar size={20} />, num: '97.36%', label: 'Customer satisfaction & retention' },
  ]
  return (
    <section className="bg-white py-10">
      <Wrap>
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show"
          viewport={{ once: true, root: scrollContainerRef, amount: 0.2 }}
          className="text-center mb-8"
        >
          <p className="font-ui font-semibold text-[#7A004B] tracking-[1px] uppercase text-[12.5px] mb-2">Proven Track Record</p>
          <h2 className="font-hero font-medium text-[#111] text-[clamp(1.6rem,3vw,2.2rem)]">Trusted by Forward-Thinking HR Leaders</h2>
        </motion.div>
        <motion.div
          variants={stagger} initial="hidden" whileInView="show"
          viewport={{ once: true, root: scrollContainerRef, amount: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {stats.map(s => (
            <motion.div
              key={s.label} variants={fadeUp}
              className="bg-white rounded-[18px] p-6 border border-[#EAC7D7] shadow-[0_2px_12px_rgba(122,0,75,.06)] flex items-center gap-4 transition-all hover:shadow-[0_10px_32px_rgba(122,0,75,0.10)] hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-full bg-[#7A004B] flex items-center justify-center shrink-0 text-white">
                {s.icon}
              </div>
              <div>
                <div className="text-[24px] font-display font-extrabold text-[#7A004B] leading-[1.1]">{s.num}</div>
                <div className="text-[12.5px] font-body font-semibold text-[#444] leading-[1.4] mt-0.5">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Wrap>
    </section>
  )
}

function OriginStory({ scrollContainerRef }) {
  const points = [
    'Single pane of glass across the entire workforce journey—hiring, payroll, attendance & appraisal.',
    'Real-time attendance biometrics & cloud self-service for effortless employee autonomy.',
    'Built-in statutory compliance keeping your company audit-ready 365 days a year.',
  ]
  return (
    <section className="bg-[#F8F5F7] py-12">
      <Wrap>
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
         
          <div className="relative">
            <div className="rounded-2xl overflow-hidden border border-[#EAC7D7] shadow-[0_16px_48px_rgba(115,0,66,0.12)] aspect-[4/3]">
              <img
                src={slideTeam}
                alt="TorchX Talent engineering lab"
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="inline-flex items-center gap-2 text-[12.5px] font-body text-[#555]">
                <span className="w-2 h-2 rounded-full bg-[#7A004B]" /> Built by TechTorch Solutions Engineering Lab
              </span>
              <span className="text-[11px] font-ui font-semibold text-[#7A004B] bg-[#FDF4F8] border border-[#EAC7D7] px-3 py-1 rounded-full">
                Est. Enterprise Hub
              </span>
            </div>
          </div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show"
            viewport={{ once: true, root: scrollContainerRef, amount: 0.2 }}
            transition={{ delay: 0.1 }}
          >
            <div className="mb-4"><HeroBadge>Our Origin &amp; Purpose</HeroBadge></div>
            <h2 className="font-hero font-medium text-[#111] leading-[1.2] mb-5 text-[clamp(1.6rem,3vw,2.2rem)]">
              Born to Eliminate Legacy HR Friction and Unleash True Human Potential
            </h2>
            <p className="font-body text-[#555] leading-[1.8] mb-4 text-[15px]">
              TorchX Talent originated within <span className="font-semibold text-[#111]">TechTorch Solutions</span> out of a genuine
              enterprise frustration: traditional HR software had grown bloated, siloed, and punitive. HR managers were drowning
              in disconnected spreadsheets for leaves, attendance, documentation, and performance reviews.
            </p>
            <p className="font-body text-[#555] leading-[1.8] mb-6 text-[15px]">
              We assembled a multidisciplinary collective of senior enterprise systems architects, intuitive UX designers, and
              veteran HR consultants to build a platform that people genuinely love using every morning.
            </p>
            <div className="flex flex-col gap-3">
              {points.map(p => (
                <div key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#e9f8ee] text-[#1a9c4b] flex items-center justify-center shrink-0">
                    <FiCheck size={12} />
                  </span>
                  <span className="font-body text-[14px] text-[#444] leading-[1.6]">{p}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </Wrap>
    </section>
  )
}

function GuidingPhilosophy({ scrollContainerRef }) {
  const cards = [
    {
      icon: <FiZap />, title: 'Our Mission', tag: 'Zero-Friction Administration',
      desc: 'To streamline every stage of the employee journey—from talent acquisition and automated onboarding to attendance, performance reviews, and compliance—with uncompromising speed, precision, and human-centric design.',
    },
    {
      icon: <FiEye />, title: 'Our Vision', tag: 'Next-Gen Workforce Evolution',
      desc: 'To set the global standard in enterprise human capital management, building an ecosystem where AI-assisted predictive analytics empowers people leaders to foster genuine culture and retain stellar global talent.',
    },
    {
      icon: <FiClock />, title: 'Our Core Pillars', tag: 'Security, Simplicity & Scale',
      desc: 'Rooted in absolute data sovereignty, high-speed cloud reliability, role-based security, and an intuitive user experience that requires virtually zero training for your employees to master.',
    },
  ]
  return (
    <section className="bg-white py-12">
      <Wrap>
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show"
          viewport={{ once: true, root: scrollContainerRef, amount: 0.2 }}
          className="text-center mb-10"
        >
          <p className="font-ui font-semibold text-[#7A004B] tracking-[1px] uppercase text-[12.5px] mb-2">Our Guiding Philosophy</p>
          <h2 className="font-hero font-medium text-[#111] leading-[1.15] mb-4 text-[clamp(1.8rem,3.6vw,2.6rem)]">
            Architected for Scalability, Guided by Empathy
          </h2>
          <p className="font-body text-[#555] leading-[1.75] max-w-[640px] mx-auto text-[15px]">
            Our mission and core pillars define how we build features, safeguard employee data, and support our partners worldwide.
          </p>
        </motion.div>
        <motion.div
          variants={stagger} initial="hidden" whileInView="show"
          viewport={{ once: true, root: scrollContainerRef, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-7"
        >
          {cards.map(c => (
            <motion.div
              key={c.title} variants={fadeUp}
              className="bg-white rounded-2xl p-7 border border-[#EAC7D7] shadow-[0_2px_12px_rgba(122,0,75,.06)] transition-all hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(122,0,75,0.14)]"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FDF4F8] text-[#7A004B] flex items-center justify-center text-xl mb-4">
                {c.icon}
              </div>
              <h3 className="font-display font-bold text-[#111] text-lg mb-2.5">{c.title}</h3>
              <p className="font-body text-[13.5px] text-[#5C5C5C] leading-[1.7] mb-4">{c.desc}</p>
              <span className="text-[13px] font-ui font-bold text-[#7A004B]">{c.tag}</span>
            </motion.div>
          ))}
        </motion.div>
      </Wrap>
    </section>
  )
}

function SecuritySection({ scrollContainerRef }) {
  const items = [
    { icon: <FiLock />, title: 'AES-256 Cloud Encryption', desc: 'High-standard cryptographic security applied for both data at rest and in transit.' },
    { icon: <FiShield />, title: 'Granular RBAC Controls', desc: 'Role-based access ensures sensitive payroll & appraisals remain strictly confidential.' },
    { icon: <FiHardDrive />, title: 'Dedicated Cloud Instances', desc: 'Isolated database architectures tailored to enterprise compliance parameters.' },
    { icon: <FiFileText />, title: 'GDPR & DPDP Ready', desc: 'Strict adherence to data privacy acts, right-to-be-forgotten, and full audit logs.' },
  ]
  return (
    <section className="bg-[#F8F5F7] py-12">
      <Wrap>
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show"
          viewport={{ once: true, root: scrollContainerRef, amount: 0.15 }}
          className="bg-white rounded-3xl border border-[#EAC7D7] shadow-[0_8px_32px_rgba(122,0,75,0.08)] p-8 md:p-10 grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 items-center"
        >
          <div>
            <p className="font-ui font-semibold text-[#7A004B] tracking-[1px] uppercase text-[12px] mb-3">Enterprise Security &amp; Compliance</p>
            <h2 className="font-hero font-medium text-[#111] leading-[1.2] mb-4 text-[clamp(1.5rem,2.8vw,2rem)]">
              Your Workforce Data, Fully Sovereign and Fortified
            </h2>
            <p className="font-body text-[#555] leading-[1.75] text-[14.5px]">
              We handle mission-critical employee records with bank-level encryption protocols, strictly isolated
              environments, and continuous audits.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {items.map(it => (
              <div key={it.title} className="flex gap-3">
                <span className="w-10 h-10 rounded-lg bg-[#FDF4F8] text-[#7A004B] flex items-center justify-center shrink-0 text-lg">
                  {it.icon}
                </span>
                <div>
                  <div className="font-display font-bold text-[#111] text-[14.5px] mb-1">{it.title}</div>
                  <div className="font-body text-[12.5px] text-[#666] leading-[1.6]">{it.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </Wrap>
    </section>
  )
}

function AboutCTA({ scrollContainerRef }) {
  return (
    <section className="bg-gradient-to-br from-[#7A004B] to-[#4a002d] py-12">
      <Wrap>
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show"
          viewport={{ once: true, root: scrollContainerRef, amount: 0.2 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white text-[12px] font-ui font-semibold uppercase tracking-[1px] px-4 py-2 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffd6ea]" /> Transform Your Workplace Operations Today
          </span>
          <h2 className="font-hero font-medium text-white leading-[1.15] mb-4 text-[clamp(1.8rem,3.6vw,2.6rem)]">
            Ready to Modernize Your Workforce Management?
          </h2>
          <p className="font-body text-white/85 leading-[1.75] max-w-[620px] mx-auto mb-8 text-[15px]">
            Join over 100+ innovative enterprises accelerating HR productivity, eliminating payroll bottlenecks, and
            empowering their teams with TorchX Talent.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <a
              href="https://torchxsuite.com/signup"
              className="inline-flex items-center gap-2 bg-white text-[#7A004B] text-[15px] font-ui font-semibold px-7 py-3.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-0.5"
            >
              Start Free Talent Trial <FiArrowRight />
            </a>
            <a
              href="tel:+917017415604"
              className="inline-flex items-center gap-2 border-2 border-white/70 text-white text-[15px] font-ui font-semibold px-7 py-3.5 rounded-full transition-all hover:bg-white/10 hover:-translate-y-0.5"
            >
              Talk To An HR Expert
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            {['No credit card required', 'Seamless data migration', 'Dedicated enterprise onboarding specialist'].map(t => (
              <span key={t} className="inline-flex items-center gap-2 text-[13px] font-body text-white/80">
                <FiCheck /> {t}
              </span>
            ))}
          </div>
        </motion.div>
      </Wrap>
    </section>
  )
}

export default function AboutPage() {
  const navigate = useNavigate()
  const { data: auth } = useAuth()
  const isAuthenticated = !!auth
  const scrollContainerRef = useRef(null)

  const accountLabel = isAuthenticated ? 'Access Your Talent Account' : 'Sign in to your Talent Account'
  const handleAccountClick = () => navigate(isAuthenticated ? '/redirect' : '/login')
  const handleExplore = () => navigate('/platform-features')

  return (
    <div ref={scrollContainerRef} style={{ height: '100vh', overflowY: 'auto' }}>
      <style>{fontStyles}</style>
      <Navbar accountLabel={accountLabel} onAccountClick={handleAccountClick} scrollContainerRef={scrollContainerRef} />
      <AboutHero onExplore={handleExplore} />
      <TrackRecord scrollContainerRef={scrollContainerRef} />
      <OriginStory scrollContainerRef={scrollContainerRef} />
      <GuidingPhilosophy scrollContainerRef={scrollContainerRef} />
      <SecuritySection scrollContainerRef={scrollContainerRef} />
      <AboutCTA scrollContainerRef={scrollContainerRef} />
      <Footer />
    </div>
  )
}