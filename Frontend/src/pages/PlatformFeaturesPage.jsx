import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FiArrowRight, FiCheckCircle, FiShield, FiClock as FiClockIcon,
  FiUsers, FiTrendingUp, FiBriefcase, FiBarChart2, FiCode,
  FiLock, FiKey, FiFileText, FiRefreshCw, FiCheck,
} from 'react-icons/fi'

import { Navbar, Footer, Wrap, fontStyles } from './announcement/landingpage'
import { useAuth } from '../auth/store/getmeauth/getmeauth'

import slideNavyOffice from '../assets/slide_navy_office.png'
import slideWhiteOffice from '../assets/Office-work.jpg'
import work from '../assets/work.jpg'

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-2 bg-[#FDF4F8] border border-[#EAC7D7] text-[#7A004B] text-[12px] font-ui font-semibold uppercase tracking-[1px] px-4 py-2 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-[#7A004B]" />
      {children}
    </span>
  )
}

function PlatformHero() {
  return (
    <section className="bg-white pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16">
      <Wrap>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center max-w-[820px] mx-auto mb-10 sm:mb-12 px-4">
          <div className="flex justify-center mb-5"><Badge>TorchX Talent Platform Architecture</Badge></div>
          <h1 className="font-hero font-medium text-[#111] leading-[1.15] mb-5 text-[clamp(1.6rem,6vw,2.9rem)] tracking-[-1px]">
            Unified Human Capital HRMS Built for Enterprise Velocity
          </h1>
          <p className="font-body text-[#555] leading-[1.8] mb-8 text-[14px] sm:text-[15.5px] max-w-[680px] mx-auto">
            Discover how TorchX Talent streamlines the full employee lifecycle from talent acquisition to autonomous
            payroll and continuous performance intelligence — eliminating administrative friction.
          </p>
          <a
            href="tel:+917017415604"
            className="inline-flex items-center gap-2 bg-[#7A004B] text-white text-[14px] sm:text-[15px] font-ui font-semibold px-6 sm:px-7 py-3 sm:py-3.5 rounded-full shadow-[0_8px_24px_rgba(122,0,75,0.25)] transition-all hover:bg-[#5a0033] hover:-translate-y-0.5"
          >
            Talk to Experts <FiArrowRight />
          </a>
        </motion.div>

        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: 0.15 }}
          className="relative max-w-[980px] mx-auto px-4 sm:px-0"
        >
          {/* Frame: fixed, responsive aspect-ratio box. object-cover + h-full makes the image
              fill the frame completely at every breakpoint — no empty background peeking through. */}
          <div className="relative w-full aspect-[4/3] xs:aspect-[16/11] sm:aspect-[16/10] lg:aspect-[16/9] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#EAC7D7] shadow-[0_12px_32px_rgba(115,0,66,0.14)] sm:shadow-[0_24px_64px_rgba(115,0,66,0.16)]">
            <img
              src={slideNavyOffice}
              alt="TorchX Talent enterprise dashboard"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1.5 sm:gap-2 max-w-[85%]">
            {['Multi-tenant SaaS', 'Real-Time Biometric Sync', 'SOC-2 Type II Certified'].map(t => (
              <span key={t} className="inline-flex items-center gap-1.5 bg-[#111827]/90 text-white text-[9px] sm:text-[10.5px] font-ui font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" /> {t}
              </span>
            ))}
          </div>
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-[#111827]/90 text-white text-[9px] sm:text-[10.5px] font-ui font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur text-right">
            Enterprise AI Roster Sync · Live: 99.98% Throughput
          </div>
        </motion.div>
      </Wrap>
    </section>
  )
}

function CapabilitiesDirectory() {
  const cards = [
    {
      tag: '01 / PAYROLL', icon: <FiFileText />, title: 'Autonomous Payroll & Statutory Compliance',
      desc: 'Automated multi-tier salary disbursement with native tax computation, dynamic TDS filings, multi-currency wallets, and instant bank settlement protocols.',
      stats: [['One-Click Bank Rails', 'SEPA/ACH'], ['Tax Withholding Engine', 'Auto-v4']],
    },
    {
      tag: '02 / ROSTER', icon: <FiClockIcon />, title: 'Intelligent Attendance & Shift Roster',
      desc: 'Zero-friction employee check-in with biometric geo-fencing, AI-driven dynamic shift allocations, automated overtime tallies, and touchless mobile clock-in.',
      stats: [['Geofencing Verification', '± 5 meters'], ['Shift Auto-Substitution', 'AI Ranked']],
    },
    {
      tag: '03 / ONBOARD', icon: <FiUsers />, title: 'Talent Acquisition & Lifecycle Onboarding',
      desc: 'Algorithmic candidate screening radar, friction-free offer generation, automated KYC & credential validation, cutting onboarding from days to under 4 hours.',
      stats: [['Automated KYC Verification', 'Instant'], ['Document Signing Flow', 'e-Sign API']],
    },
    {
      tag: '04 / APPRAISAL', icon: <FiTrendingUp />, title: 'Performance Intelligence & OKRs',
      desc: 'Continuous 360 review pulses, transparent goal tree alignments, predictive retention risk heatmaps, and unbiased merit-based appraisal matrixes.',
      stats: [['Retention Risk Scoring', 'Real-time'], ['360 Feedback Loops', 'Anonymous']],
    },
    {
      tag: '05 / PORTAL', icon: <FiBriefcase />, title: 'Employee Self-Service (ESS) Portal',
      desc: 'Empower team members with instant leave requests, encrypted payslip downloads, dynamic expense filing with receipt OCR, and tax projection simulators.',
      stats: [['OCR Expense Processing', 'Instant'], ['Mobile PWA Native UI', 'iOS & Android']],
    },
    {
      tag: '06 / TELEMETRY', icon: <FiBarChart2 />, title: 'Workforce Analytics & Executive Board',
      desc: 'Live executive dashboards delivering head-count projections, predictive attrition triggers, compensation band balance, and operational labor cost analysis.',
      stats: [['Attrition Forecasting', '94.2% Acc.'], ['Departmental Cost Run', 'Bi-Weekly']],
    },
  ]
  return (
    <section className="bg-white py-12 sm:py-16">
      <Wrap>
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-12 px-4 sm:px-0"
        >
          <div>
            <p className="font-ui font-semibold text-[#7A004B] tracking-[1px] uppercase text-[11px] sm:text-[12px] mb-2">Capabilities Directory</p>
            <h2 className="font-hero font-medium text-[#111] leading-[1.2] text-[clamp(1.4rem,4.5vw,2.2rem)] max-w-[520px]">
              Modular Infrastructure for Complex Organizations
            </h2>
          </div>
          <p className="font-body text-[#555] leading-[1.75] text-[13.5px] sm:text-[14.5px] max-w-[420px]">
            Activate standalone modules or orchestrate the entire suite through unified API gateways and bi-directional
            directory synchronization.
          </p>
        </motion.div>

        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 px-4 sm:px-0"
        >
          {cards.map(c => (
            <motion.div
              key={c.title} variants={fadeUp}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAC7D7] shadow-[0_2px_12px_rgba(122,0,75,.06)] transition-all hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(122,0,75,0.14)] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FDF4F8] text-[#7A004B] flex items-center justify-center text-lg">{c.icon}</span>
                <span className="text-[10px] sm:text-[10.5px] font-ui font-bold text-[#b8869e] tracking-[1px]">{c.tag}</span>
              </div>
              <h3 className="font-display font-bold text-[#111] text-[15px] sm:text-[16px] mb-2.5 leading-snug">{c.title}</h3>
              <p className="font-body text-[12.5px] sm:text-[13px] text-[#5C5C5C] leading-[1.65] mb-5 flex-1">{c.desc}</p>
              <div className="border-t border-[#F0E0E8] pt-3.5 flex flex-col gap-1.5">
                {c.stats.map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] sm:text-[11.5px] font-body text-[#888] flex items-center gap-1.5">
                      <FiCheckCircle className="text-[#1a9c4b] shrink-0" size={12} /> {label}
                    </span>
                    <span className="text-[10.5px] sm:text-[11px] font-ui font-bold text-[#7A004B] text-right shrink-0">{val}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Wrap>
    </section>
  )
}

function EnterpriseArchitectureBanner() {
  const points = [
    { icon: <FiShield />, title: 'Granular Role-Based Access Control (RBAC)', desc: 'Safeguard salary indices and sensitive employee dossiers with field-level cryptographic permissions and dual-signoff protocols.' },
    { icon: <FiClockIcon />, title: 'Immutable Audit-Ready Logging', desc: 'Every change to compensation, tax declarations, or appraisals produces an immutable time-stamped log, simplifying annual SOC audits.' },
    { icon: <FiRefreshCw />, title: 'Zero-Downtime Data Sovereignty', desc: 'In-region tenant isolation guarantees strict adherence to GDPR, CCPA, and statutory localized employment regulations globally.' },
  ]
  return (
    <section className="bg-gradient-to-br from-[#7A004B] to-[#4a002d] py-12 sm:py-16">
      <Wrap>
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center px-4 sm:px-0"
        >
          <div>
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white text-[11px] sm:text-[12px] font-ui font-semibold uppercase tracking-[1px] px-4 py-2 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffd6ea]" /> Enterprise Architecture
            </span>
            <h2 className="font-hero font-medium text-white leading-[1.2] mb-4 text-[clamp(1.5rem,4.5vw,2.3rem)]">
              Designed for People Leaders, Engineered for Speed
            </h2>
            <p className="font-body text-white/85 leading-[1.8] mb-7 text-[13.5px] sm:text-[14.5px]">
              Eliminate cross-departmental silos. TorchX Talent consolidates payroll, talent development, compliance,
              and headcount forecasting into a unified single-source data model, giving HR executives actionable
              intelligence without spreadsheet wrestling.
            </p>
            <div className="flex flex-col gap-5">
              {points.map(p => (
                <div key={p.title} className="flex gap-3 sm:gap-3.5">
                  <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0 text-lg">
                    {p.icon}
                  </span>
                  <div>
                    <div className="font-display font-bold text-white text-[13.5px] sm:text-[14.5px] mb-1">{p.title}</div>
                    <div className="font-body text-[12px] sm:text-[12.5px] text-white/75 leading-[1.65]">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Frame: fixed aspect-ratio box that scales with the grid column. object-cover fills
                it edge-to-edge (cropping as needed) so no empty background shows around the photo. */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[5/4] rounded-2xl overflow-hidden border border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.25)] sm:shadow-[0_24px_64px_rgba(0,0,0,0.3)]">
              <img
                src={slideWhiteOffice}
                alt="Enterprise security architecture"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="absolute -top-3 -right-2 sm:-top-4 sm:-right-3 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)] px-3 sm:px-4 py-2 sm:py-2.5 max-w-[62%]">
              <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-ui font-semibold text-[#888] uppercase tracking-wide">
                <FiTrendingUp className="text-[#1a9c4b]" /> 70%
              </div>
              <div className="text-[11px] sm:text-[12px] font-display font-bold text-[#111] mt-0.5">Less HR administrative load across departments</div>
            </div>
            <div className="absolute -bottom-3 -left-2 sm:-bottom-4 sm:-left-3 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)] px-3 sm:px-4 py-2 sm:py-2.5 max-w-[62%]">
              <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-ui font-semibold text-[#888] uppercase tracking-wide">
                <FiCheckCircle className="text-[#1a9c4b]" /> 99.98%
              </div>
              <div className="text-[11px] sm:text-[12px] font-display font-bold text-[#111] mt-0.5">Payroll calculation and tax disbursement accuracy</div>
            </div>
          </div>
        </motion.div>
      </Wrap>
    </section>
  )
}

function TechnicalFoundations() {
  const items = [
    { icon: <FiCode />, title: 'REST API Ecosystem', desc: 'Comprehensive Webhooks, GraphQL queries, and pre-built connectors for Slack, Microsoft Teams, SAP, and Workday.', tag: 'OpenAPI 3.1 Spec' },
    { icon: <FiLock />, title: 'AES-256 Encryption', desc: 'End-to-end data encryption at rest and in transit via TLS 1.3 with customer-managed cryptographic key options (BYOK).', tag: 'FIPS 140-2 Validated' },
    { icon: <FiKey />, title: 'Enterprise SSO', desc: 'Out-of-the-box support for Okta, Azure AD (Entra ID), and Google Workspace with automated SCIM user provisioning.', tag: 'SAML 2.0 / SCIM 2.0' },
    { icon: <FiFileText />, title: 'Automated Audit Logs', desc: 'Complete non-repudiation audit trails for compliance audits, wage adjustments, and credential modifications.', tag: 'SIEM Streaming Ready' },
  ]
  return (
    <section className="bg-[#F8F5F7] py-12 sm:py-16">
      <Wrap>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-10 sm:mb-12 px-4 sm:px-0">
          <p className="font-ui font-semibold text-[#7A004B] tracking-[1px] uppercase text-[11px] sm:text-[12px] mb-2">Technical Foundations</p>
          <h2 className="font-hero font-medium text-[#111] leading-[1.2] mb-4 text-[clamp(1.5rem,4.5vw,2.3rem)]">
            Enterprise Trust &amp; Open Extensibility
          </h2>
          <p className="font-body text-[#555] leading-[1.75] max-w-[640px] mx-auto text-[13.5px] sm:text-[14.5px]">
            Built on a resilient micro-services stack designed for high throughput, seamless legacy HRIS integration,
            and military-grade encryption standards.
          </p>
        </motion.div>
        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 px-4 sm:px-0"
        >
          {items.map(it => (
            <motion.div key={it.title} variants={fadeUp} className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAC7D7] shadow-[0_2px_12px_rgba(122,0,75,.06)]">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FDF4F8] text-[#7A004B] flex items-center justify-center text-lg mb-4">{it.icon}</div>
              <h3 className="font-display font-bold text-[#111] text-[14px] sm:text-[14.5px] mb-2">{it.title}</h3>
              <p className="font-body text-[12px] sm:text-[12.5px] text-[#5C5C5C] leading-[1.65] mb-4">{it.desc}</p>
              <span className="inline-block text-[10px] sm:text-[10.5px] font-ui font-bold text-[#7A004B] bg-[#FDF4F8] border border-[#EAC7D7] px-2.5 py-1 rounded-full">
                {it.tag}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </Wrap>
    </section>
  )
}

function PlatformCTA() {
  return (
    <section className="bg-gradient-to-br from-[#7A004B] to-[#4a002d] py-12 sm:py-16">
      <Wrap>
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center px-4 sm:px-0"
        >
          <div>
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white text-[11px] sm:text-[12px] font-ui font-semibold uppercase tracking-[1px] px-4 py-2 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffd6ea]" /> Direct Engineer &amp; Solution Architect Access
            </span>
            <h2 className="font-hero font-medium text-white leading-[1.2] mb-4 text-[clamp(1.5rem,4.5vw,2.4rem)]">
              Ready to Experience TorchX Talent Live?
            </h2>
            <p className="font-body text-white/85 leading-[1.8] mb-7 text-[13.5px] sm:text-[14.5px] max-w-[520px]">
              See how leading modern organizations consolidate HR operations, reduce compliance risk, and empower
              global workforces with autonomous execution. Connect with our principal solution architects for a
              tailored system walkthrough.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4 mb-7">
              <a
                href="tel:+917017415604"
                className="inline-flex items-center gap-2 bg-white text-[#7A004B] text-[14px] sm:text-[15px] font-ui font-semibold px-6 sm:px-7 py-3 sm:py-3.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-0.5"
              >
                Talk to Experts <FiArrowRight />
              </a>
              <a
                href="https://torchxsuite.com/talent/"
                className="inline-flex items-center gap-2 border-2 border-white/70 text-white text-[14px] sm:text-[15px] font-ui font-semibold px-6 sm:px-7 py-3 sm:py-3.5 rounded-full transition-all hover:bg-white/10 hover:-translate-y-0.5"
              >
                Explore Documentation
              </a>
            </div>
            <div className="flex flex-wrap gap-x-6 sm:gap-x-7 gap-y-2">
              {['SOC 2 Type II Certified', 'GDPR Compliant', '99.99% Guaranteed SLA', 'Dedicated Support'].map(t => (
                <span key={t} className="inline-flex items-center gap-2 text-[12px] sm:text-[12.5px] font-body text-white/80">
                  <FiCheck /> {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Frame: fixed aspect-ratio box, image absolutely positioned + cropped to fill it.
                Scales cleanly on mobile with no empty background strip on any side. */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[5/4] rounded-2xl overflow-hidden border border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.25)] sm:shadow-[0_24px_64px_rgba(0,0,0,0.3)]">
              <img
                src={work}
                alt="Executive briefing"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.25)] px-4 sm:px-5 py-2 sm:py-2.5 flex items-center gap-2 whitespace-nowrap max-w-[92%]">
              <span className="w-2 h-2 rounded-full bg-[#1a9c4b] shrink-0" />
              <span className="text-[10.5px] sm:text-[12px] font-ui font-semibold text-[#111] truncate">Executive Briefing Center · SLA: &lt;1hr Response</span>
            </div>
          </div>
        </motion.div>
      </Wrap>
    </section>
  )
}

export default function PlatformFeaturesPage() {
  const navigate = useNavigate()
  const { data: auth } = useAuth()
  const isAuthenticated = !!auth
  const scrollContainerRef = useRef(null)

  const accountLabel = isAuthenticated ? 'Access Your Talent Account' : 'Sign in to your Talent Account'
  const handleAccountClick = () => navigate(isAuthenticated ? '/redirect' : '/login')

  return (
    <div ref={scrollContainerRef} style={{ height: '100vh', overflowY: 'auto' }}>
      <style>{fontStyles}</style>
      <Navbar accountLabel={accountLabel} onAccountClick={handleAccountClick} scrollContainerRef={scrollContainerRef} />
      <PlatformHero />
      <CapabilitiesDirectory />
      <EnterpriseArchitectureBanner />
      <TechnicalFoundations />
      <PlatformCTA />
      <Footer />
    </div>
  )
}