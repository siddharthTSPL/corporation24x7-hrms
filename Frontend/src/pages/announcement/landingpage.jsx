import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { RiDoubleQuotesL } from 'react-icons/ri'
import {
  FiMenu, FiX, FiArrowRight, FiCheck,
  FiLinkedin, FiInstagram, FiMail,
  FiShield, FiLink, FiActivity, FiBookOpen,
  FiHardDrive, FiUsers, FiStar, FiBarChart2,
  FiMapPin, FiCamera, FiNavigation, FiCalendar, FiDollarSign,
  FiCreditCard, FiMonitor, FiClock, FiRepeat, FiSearch, FiUserPlus, FiFolder,
  FiGitBranch, FiAlertCircle, FiPieChart, FiLock, FiPhoneCall,
  FiKey, FiCode, FiCloud, FiUserCheck, FiGift, FiBell,
} from 'react-icons/fi'
import { FaXTwitter, FaYoutube } from 'react-icons/fa6'
import { HiOutlineSparkles } from 'react-icons/hi'
import { BsPeopleFill, BsGraphUp, BsPersonBadge } from 'react-icons/bs'
import logo from '../../assets/TorchX.svg'
import heroBg from '../../assets/Hero-bg.png' // vector (crisp on every screen)
import { useAuth } from '../../auth/store/getmeauth/getmeauth'
import { fadeUp, fontStyles } from './animations'

export { fontStyles }

/* ==========================================================================
   SMOOTH SCROLL (GSAP) + SECTION NAVIGATION
   The page scrolls inside a custom container (height:100vh, overflow:auto),
   so smoothing and anchor jumps are driven on that container with GSAP.
========================================================================== */

const NAV_OFFSET = 72 // fixed navbar height

let scrollRoot = null // set by LandingPage
const scrollState = { tween: null, target: 0, animating: false }

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function smoothScrollTo(el, y, duration = 1.2) {
  if (!el) return
  const max = Math.max(0, el.scrollHeight - el.clientHeight)
  const to = Math.max(0, Math.min(y, max))

  scrollState.tween?.kill()
  scrollState.target = to

  if (prefersReducedMotion()) {
    scrollState.animating = false
    el.scrollTop = to
    return
  }

  const proxy = { y: el.scrollTop }
  scrollState.animating = true
  scrollState.tween = gsap.to(proxy, {
    y: to,
    duration,
    ease: 'power3.out',
    overwrite: true,
    onUpdate: () => {
      el.scrollTop = proxy.y
    },
    onComplete: () => {
      scrollState.animating = false
    },
  })
}

function scrollToSection(id, duration = 1.3) {
  const node = document.getElementById(id)
  if (!node) return
  if (scrollRoot) {
    const y =
      node.getBoundingClientRect().top -
      scrollRoot.getBoundingClientRect().top +
      scrollRoot.scrollTop -
      NAV_OFFSET
    smoothScrollTo(scrollRoot, y, duration)
  } else {
    window.scrollTo({
      top: node.getBoundingClientRect().top + window.scrollY - NAV_OFFSET,
      behavior: 'smooth',
    })
  }
}

function useSmoothScroll(ref) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    scrollRoot = el

    const stop = () => {
      scrollState.tween?.kill()
      scrollState.animating = false
    }

    const onWheel = (e) => {
      if (prefersReducedMotion() || e.ctrlKey || e.defaultPrevented) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (e.target instanceof Element && e.target.closest('[data-no-smooth]')) return

      e.preventDefault()
      let delta = e.deltaY
      if (e.deltaMode === 1) delta *= 32
      else if (e.deltaMode === 2) delta *= el.clientHeight

      const base = scrollState.animating ? scrollState.target : el.scrollTop
      smoothScrollTo(el, base + delta, 1.1)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('mousedown', stop)
    el.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('mousedown', stop)
      el.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
      stop()
      if (scrollRoot === el) scrollRoot = null
    }
  }, [ref])
}

function useSectionNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (e, id) => {
    e?.preventDefault()
    if (pathname === '/') {
      scrollToSection(id)
    } else {
      navigate('/', { state: { scrollTo: id } })
    }
  }
}

/* ==========================================================================
   LAYOUT HELPERS + BACKGROUNDS
========================================================================== */

export const Wrap = ({ children, className = '' }) => (
  <div className={`max-w-[1500px] mx-auto w-full px-5 sm:px-10 lg:px-16 ${className}`}>
    {children}
  </div>
)

function Divider() {
  return (
    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  )
}

function PageBackground() {
  return <div className="pointer-events-none fixed inset-0 -z-10 bg-[#2a000f]" />
}

// Reference-image look: crimson spotlight on top, dark band in the middle,
// red "floor" glow at the bottom and a soft vignette. Pixel based, so it
// looks the same on short (hero) and tall (features / pricing) sections.
function SectionBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{
        background:
          'linear-gradient(to bottom, #3f0819 0%, #34051a 45%, #260009 80%, #2b000e 100%)',
      }}
    >
      {/* 1. top spotlight */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 58% 520px at 50% 230px, rgba(146,26,54,0.95) 0%, rgba(120,20,44,0.75) 30%, rgba(80,10,30,0.4) 62%, transparent 100%)',
        }}
      />
      {/* 2. dark band */}
      <div
        className="absolute inset-x-0 bottom-0 h-[440px]"
        style={{
          background:
            'linear-gradient(to top, transparent 0px, rgba(28,0,8,0.6) 120px, rgba(28,0,8,0.95) 240px, rgba(28,0,8,0.6) 330px, transparent 440px)',
        }}
      />
      {/* 3. floor glow */}
      <div
        className="absolute inset-x-0 bottom-0 h-[220px]"
        style={{
          background:
            'radial-gradient(ellipse 70% 90px at 50% 130px, rgba(156,30,58,0.95) 0%, rgba(110,16,42,0.55) 50%, transparent 100%)',
        }}
      />
      {/* 4. vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(18,0,6,0.55) 100%)',
        }}
      />
    </div>
  )
}

/* ==========================================================================
   NAVBAR
========================================================================== */
export function Navbar({ accountLabel, onAccountClick, scrollContainerRef }) {
  const navigate = useNavigate()
  const goToSection = useSectionNav()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState(null)
  const links = ['Features', 'Testimonials', 'Pricing', 'About', 'Calculator']

  const BEET = '#8B1E4D' // beetroot

  // The page scrolls inside a container (not window), so listen there.
  // Scroll ke saath active link bhi update hota hai.
  useEffect(() => {
    const target = scrollContainerRef?.current || window
    const sectionIds = ['features', 'testimonials', 'pricing']

    const read = () => {
      const top = target === window ? window.scrollY : target.scrollTop
      setScrolled(top > 10)

      const rootTop = target === window ? 0 : target.getBoundingClientRect().top
      let current = null
      sectionIds.forEach((id) => {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top - rootTop <= 140) current = id
      })
      setActive(current)
    }

    read()
    target.addEventListener('scroll', read, { passive: true })
    return () => target.removeEventListener('scroll', read)
  }, [scrollContainerRef])

  const handleLinkClick = (e, label) => {
    if (label === 'About') {
      e.preventDefault()
      navigate('/about')
      return
    }
    if (label === 'Calculator') {
      e.preventDefault()
      navigate('/pricing-calculator')
      return
    }
    setActive(label.toLowerCase())
    goToSection(e, label.toLowerCase())
  }

  const hrefFor = (l) => (l === 'About' || l === 'Calculator' ? '#' : `#${l.toLowerCase()}`)

  return (
    <nav
      className={`fixed top-0 left-0 right-0 w-full z-[9999] bg-white transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_2px_16px_rgba(122,0,75,.08)]' : 'shadow-[0_1px_0_#f0e0e8]'
      }`}
    >
      <div className="max-w-[1500px] mx-auto px-5 sm:px-10 lg:px-16 h-[72px] flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            window.location.href = '/'
          }}
          className="bg-transparent border-none p-0 m-0 cursor-pointer"
          aria-label="Go to home"
        >
          <img src={logo} alt="TorchX Talent logo" className="h-9 sm:h-11 w-auto object-contain block" />
        </button>

        <div className="hidden lg:flex items-center h-full gap-2">
          {links.map((l) => {
            const isActive = active === l.toLowerCase()
            return (
              <a
                key={l}
                href={hrefFor(l)}
                onClick={(e) => handleLinkClick(e, l)}
                className="group relative flex h-full items-center px-5 text-[15px] font-ui font-medium no-underline transition-colors duration-300"
                style={{ color: isActive ? BEET : '#5C5C5C' }}
              >
                <span className="transition-colors duration-300 group-hover:text-[#8B1E4D]">{l}</span>
                {/* bottom bar - navbar ke edge par baithta hai */}
                <span
                  className={`pointer-events-none absolute bottom-0 left-1/2 h-[4px] w-[46px] -translate-x-1/2 rounded-t-full origin-center transition-transform duration-300 ease-out ${
                    isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                  }`}
                  style={{ background: BEET, boxShadow: `0 0 10px ${BEET}66` }}
                />
              </a>
            )
          })}
          <button
            onClick={onAccountClick}
            className="ml-4 bg-[#7A004B] text-white text-sm font-ui font-semibold px-7 py-2.5 rounded-full border-none cursor-pointer whitespace-nowrap shadow-[0_4px_18px_rgba(122,0,75,0.25)] transition-all hover:bg-[#5a0033] hover:-translate-y-0.5"
          >
            {accountLabel}
          </button>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden bg-transparent border-none text-2xl text-[#111111] cursor-pointer"
          aria-label="Toggle menu"
        >
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {open && (
        <div className="nav-mobile-menu bg-white border-t border-[#EAC7D7] px-5 sm:px-10 lg:px-16 py-5 flex flex-col gap-4.5">
          {links.map((l) => {
            const isActive = active === l.toLowerCase()
            return (
              <a
                key={l}
                href={hrefFor(l)}
                onClick={(e) => {
                  handleLinkClick(e, l)
                  setOpen(false)
                }}
                className="text-[17px] font-ui font-medium no-underline"
                style={{ color: isActive ? BEET : '#5C5C5C' }}
              >
                {l}
              </a>
            )
          })}
          <button
            onClick={() => {
              setOpen(false)
              onAccountClick()
            }}
            className="bg-[#7A004B] text-white text-sm font-ui font-semibold py-3 rounded-full border-none cursor-pointer text-center"
          >
            {accountLabel}
          </button>
        </div>
      )}
    </nav>
  )
}

/* ==========================================================================
   HERO
========================================================================== */

const freeForeverFeatures = [
  { text: 'Geo Tag Attendance' },
  { text: 'Face Attendance' },
  { text: 'Monitoring of Employee Active & Idle Time' },
  { text: 'Leave management' },
  { text: 'Basic payroll' },
  { text: 'Analytical and Digital Dashboard' },
  { text: 'Announcements' },
  { text: 'Team Documentation' },
  { text: 'Reimbursement' },
  { text: 'Employee Self-Service Portal' },
  { text: 'Policy Management' },
  { text: 'Grievance Management' },
  { text: 'Email support (24/7)' },
]

// Shortest names first, longest last — long ones take the full row.
const sortedFreeForeverFeatures = [...freeForeverFeatures].sort(
  (a, b) => a.text.length - b.text.length
)

/* ==========================================================================
   CARD BACKDROP — static vector design (NO animation)

   Design ka flower-center card ke center par baithta hai aur poore hero me
   faila rehta hai (section ka overflow-hidden hi isse clip karta hai).
   Left ka khaali hissa mask se fade hota hai, taaki left content ke upar
   design na aaye.
========================================================================== */

function CardBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <img
        src={heroBg}
        alt=""
        draggable={false}
        className="absolute left-1/2 top-1/2 max-w-none select-none opacity-60 w-[760px] sm:w-[900px] lg:w-[1150px] lg:opacity-100 [-webkit-mask-image:linear-gradient(to_right,transparent_30%,#000_44%)] [mask-image:linear-gradient(to_right,transparent_30%,#000_44%)]"
        style={{ transform: 'translate(-71.5%, -50%)' }}
      />
    </div>
  )
}

/* ==========================================================================
   PRICING CARD
========================================================================== */

function PricingFeatureRow({ text, span }) {
  return (
    <div className={`flex items-start gap-2 ${span ? 'sm:col-span-2' : ''}`}>
      {/* PINK tick — matches reference */}
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#fce4ee] text-[#c9184a]">
        <FiCheck strokeWidth={3} className="text-[9px]" />
      </span>
      <span className="text-[13px] font-medium leading-snug text-[#3a2a30]">{text}</span>
    </div>
  )
}

function PricingHeroCard({ cardRef, cardShapeRef }) {
  return (
    <div ref={cardRef} className="relative mx-auto w-full max-w-[480px]">
      {/* FLOATING MINI CARD — Attendance (fully above, top-left) */}
      <div className="pointer-events-none absolute -left-4 -top-12 z-30 hidden sm:flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-[0_12px_30px_rgba(122,0,75,0.18)] border border-white">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9f7ef] text-[#16a34a]">
          <FiActivity size={16} />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#999]">
            Attendance
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-display font-extrabold text-[#111]">98.4%</span>
            <span className="text-[10px] font-semibold text-[#16a34a]">Live On-Duty</span>
          </div>
        </div>
      </div>

      {/* FLOATING MINI CARD — Leave Balance (fully above, top-right) */}
      <div className="pointer-events-none absolute -right-6 -top-8 z-30 hidden sm:flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-[0_12px_30px_rgba(122,0,75,0.18)] border border-white">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fdeef5] text-[#7A004B]">
          <FiCalendar size={16} />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#999]">Leave Balance</div>
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-display font-extrabold text-[#111]">14 Days</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#fff4d6] text-[#a06b00]">
              2 In Review
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div
        ref={cardShapeRef}
        className="pricing-glass-card relative z-10 overflow-hidden rounded-[28px] border border-[#f0e0ea] bg-white px-7 py-7 sm:px-9 sm:py-8 shadow-[0_30px_90px_rgba(122,0,75,0.14),0_10px_30px_rgba(0,0,0,0.06)]"
      >
        {/* TOP: FREE FOREVER badge + STARTER PLAN tag */}
        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7A004B] px-3.5 py-1.5 font-ui text-[11px] font-bold text-white shadow-[0_6px_16px_rgba(122,0,75,0.35)]">
            ⚡ Free Forever
          </span>
          <span className="inline-flex items-center rounded-full bg-[#f2f2f2] px-3 py-1.5 font-ui text-[11px] font-semibold text-[#777]">
            Starter Plan
          </span>
        </div>

        {/* CARD CONTENT */}
        <div className="relative z-10">
          <h3 className="relative mt-6 font-display text-[19px] font-bold leading-snug text-[#2A1120] sm:text-[21px]">
            Great Start for Startup and Micro Teams
          </h3>

          <p className="relative mt-1.5 text-[13px] leading-relaxed text-[#8a6a7a]">
            Everything a small team needs to get started ── at no cost.
          </p>

          {/* PRICE */}
          <div className="relative mt-5 flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[34px] font-extrabold text-[#111]">₹0</span>
              <span className="font-body text-[12px] text-[#a08494]">/user/month</span>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <FiLock size={11} />
              100% Free Forever
            </span>
          </div>

          {/* DIVIDER */}
          <div className="relative my-5 h-px w-full bg-gradient-to-r from-transparent via-[#7A004B]/15 to-transparent" />

          {/* FEATURES */}
          <div className="relative grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {sortedFreeForeverFeatures.map((f) => (
              <PricingFeatureRow key={f.text} text={f.text} span={f.text.length > 28} />
            ))}
          </div>

          {/* CTA */}
          <a
            href="https://torchxsuite.com/signup"
            className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7A004B] py-3.5 font-ui text-sm font-bold text-white shadow-[0_10px_26px_rgba(122,0,75,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#5a0033] hover:shadow-[0_14px_32px_rgba(122,0,75,0.4)]"
          >
            Get Started Free <FiArrowRight />
          </a>

          <p className="relative mt-3 text-center text-[11px] text-[#a08494]">
            ✓ No credit card required • Instant automated onboarding
          </p>
        </div>
      </div>

      {/* FLOATING MINI CARD — Payroll Status (fully below, bottom-right) */}
      <div className="pointer-events-none absolute -right-4 -bottom-10 z-30 hidden sm:flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-[0_12px_30px_rgba(122,0,75,0.18)] border border-white">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fdeef5] text-[#7A004B]">
          <FiCreditCard size={16} />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#999]">
            Payroll Status
            <span className="text-[9px] font-bold text-emerald-600">⚡ Instant NEFT</span>
          </div>
          <div className="flex items-center gap-1 text-[12.5px] font-display font-bold text-[#111]">
            <span className="text-emerald-500">✓</span>
            Disbursed &amp; Auto-Reconciled
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   HERO SECTION
========================================================================== */

function Hero({ onOpenCalculator, scrollContainerRef }) {
  const reduceMotion = prefersReducedMotion()
  const cardRef = useRef(null)
  const cardShapeRef = useRef(null)
  const sectionRef = useRef(null)

  // Scroll-linked parallax on the card (uses the app's own scroll container)
  useEffect(() => {
    if (reduceMotion) return
    const scroller = scrollContainerRef?.current
    const section = sectionRef.current
    const card = cardRef.current
    if (!scroller || !section || !card) return

    let ticking = false
    const update = () => {
      ticking = false
      const rect = section.getBoundingClientRect()
      const scrollerRect = scroller.getBoundingClientRect()
      const progress = (scrollerRect.top - rect.top) / rect.height
      const clamped = Math.max(-1, Math.min(1, progress))
      gsap.to(card, { y: clamped * 40, duration: 0.6, ease: 'power3.out', overwrite: 'auto', force3D: true })
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [reduceMotion, scrollContainerRef])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-white pt-32 pb-0 lg:pt-30"
    >
      <Wrap className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] items-start gap-12 lg:gap-10">
          {/* LEFT: copy — apna top margin yahan control karo */}
          <div className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left mt-0 lg:mt-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[#EAC7D7] bg-[#FDF4F8] px-4 py-2 shadow-[0_8px_30px_rgba(122,0,75,0.08)]">
                <span className="h-2 w-2 rounded-full bg-[#730042] shadow-[0_0_12px_rgba(115,0,66,0.5)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#730042]">
                  TorchX Talent
                  <span className="mx-1.5 text-[#730042]/40">—</span>
                  HRMS Software
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-w-[560px] font-hero font-medium leading-[1.15] tracking-[-1.5px] text-[#2A1120] text-[clamp(2rem,5vw,3.4rem)]"
            >
              Manage Your Workforce With
              <br />
              Smart HR{' '}
              <span className="italic text-[#7A004B]">Solutions</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-[500px] font-hero text-[15px] leading-[1.75] text-[#5C5C5C] sm:text-[16px] lg:text-[17px]"
            >
              TorchX Talent is a complete Human Resource Management System (HRMS) that helps you optimize every stage of the employee lifecycle — from hiring to performance to payroll — with a robust and reliable platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
            >
              <a
                href="https://torchxsuite.com/signup"
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#7A004B] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(122,0,75,0.3)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#93005c] hover:shadow-[0_12px_40px_rgba(122,0,75,0.45)]"
              >
                Start Free Trial
                <FiArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>

              <a
                href="tel:+917454098820"
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-[#7A004B] bg-transparent px-7 py-3.5 text-sm font-semibold text-[#7A004B] transition-all duration-300 hover:-translate-y-1 hover:bg-[#FDF4F8]"
              >
                Talk To Expert
                <FiArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </motion.div>

            {onOpenCalculator && (
              <motion.button
                type="button"
                onClick={onOpenCalculator}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="group mt-5 flex items-center justify-center gap-2 rounded-full border border-[#7A004B]/25 bg-[#7A004B]/[0.06] px-4 py-2 text-[12px] font-medium text-[#7A004B] transition-all duration-300 hover:border-[#7A004B]/45 hover:bg-[#7A004B]/[0.12]"
              >
                Calculate Your Plan
                <FiArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </motion.button>
            )}
          </div>

          {/* RIGHT: card — static design backdrop + card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative mt-10 lg:mt-16"
          >
            <CardBackdrop />
            <div className="relative z-10 mx-auto w-full max-w-[480px]">
              <PricingHeroCard cardRef={cardRef} cardShapeRef={cardShapeRef} />
            </div>
          </motion.div>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 mt-16 lg:mt-20">
          <Stats />
        </div>
      </Wrap>
    </section>
  )
}

function Stats() {
  const stats = [
    { icon: <BsPeopleFill size={22} />, num: '100+', label: 'Happy customers of TorchX Talent' },
    { icon: <FiBarChart2 size={22} />, num: '1000+', label: 'No. of live demos' },
    { icon: <FiUsers size={22} />, num: '10+', label: 'Partners to collaborate' },
    { icon: <FiStar size={22} />, num: '98%', label: 'Customer satisfaction' },
  ]
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="grid grid-cols-1 max-[480px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-16 lg:pb-20"
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.num}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: i * 0.08 }}
          viewport={{ once: true }}
          className="bg-white rounded-[18px] p-6 border border-[#EAC7D7] shadow-[0_10px_30px_rgba(122,0,75,0.08)] flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(122,0,75,0.15)]"
        >
          <div className="w-13 h-13 rounded-full bg-[#7A004B] flex items-center justify-center shrink-0 text-white shadow-[0_6px_16px_rgba(122,0,75,0.45)]">
            {s.icon}
          </div>
          <div>
            <div className="text-[28px] font-display font-extrabold text-[#7A004B] leading-[1.1]">{s.num}</div>
            <div className="text-[13px] font-body font-semibold text-[#5C5C5C] leading-[1.4] mt-0.5">{s.label}</div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}z
/* ==========================================================================
   FEATURES
========================================================================== */

const featureCategories = [
  { key: 'attendance', label: 'Attendance & Tracking' },
  { key: 'payroll', label: 'Leave & Payroll' },
  { key: 'hiring', label: 'Hiring & Growth' },
  { key: 'workplace', label: 'Workplace' },
  { key: 'insights', label: 'Insights & Security' },
  { key: 'support', label: 'Support' },
  { key: 'enterprise', label: 'Enterprise' },
]

const featureItems = [
  {
    cat: 'hiring',
    icon: HiOutlineSparkles,
    title: 'AI Recruitment',
    desc: 'Screen, match, and shortlist candidates automatically — so your hiring team spends less time filtering resumes and more time talking to the right people.',
    highlights: ['AI-powered candidate screening', 'Smart skill-based matching', 'Automated shortlisting workflow'],
    featured: true,
  },
  { cat: 'hiring', icon: FiSearch, title: 'Applicant Tracking', desc: 'Follow every candidate from application to offer.' },
  { cat: 'hiring', icon: BsGraphUp, title: 'Performance Management', desc: 'Goals, KPIs and continuous feedback in one place.' },
  { cat: 'hiring', icon: FiUserPlus, title: 'Onboarding & Offboarding', desc: 'Guided checklists for every first day and last day.' },
  { cat: 'attendance', icon: FiMapPin, title: 'Geo Tag Attendance', desc: 'GPS-verified check-ins for every site and shift.' },
  { cat: 'attendance', icon: FiCamera, title: 'Face Attendance', desc: 'Contactless face recognition. No buddy punching.' },
  { cat: 'attendance', icon: FiNavigation, title: 'Live Map Tracking', desc: 'See field teams and visit routes in real time.' },
  { cat: 'attendance', icon: FiMonitor, title: 'Active & Idle Time', desc: 'Monitor active and idle time across your team.' },
  { cat: 'attendance', icon: FiClock, title: 'Timesheet', desc: 'Track working hours accurately for every employee.' },
  { cat: 'payroll', icon: FiCalendar, title: 'Leave Management', desc: 'Apply, approve and track balances in one click.' },
  { cat: 'payroll', icon: FiDollarSign, title: 'Basic Payroll', desc: 'Simple payslips and salary runs for small teams.' },
  { cat: 'payroll', icon: FiCreditCard, title: 'Advanced Payroll', desc: 'Payroll auto-synced with attendance and leave.' },
  { cat: 'payroll', icon: FiRepeat, title: 'Reimbursement & Expenses', desc: 'Submit expenses and get approvals in a few taps.' },
  { cat: 'workplace', icon: BsPersonBadge, title: 'Employee Self-Service', desc: 'Profiles, documents and requests, all in one place.' },
  { cat: 'workplace', icon: FiBell, title: 'Announcements', desc: 'Share company news with everyone instantly.' },
  { cat: 'workplace', icon: FiFolder, title: 'Team Documentation', desc: 'Keep team files and knowledge organised.' },
  { cat: 'workplace', icon: FiBookOpen, title: 'Policy Management', desc: 'Publish and update company policies centrally.' },
  { cat: 'workplace', icon: FiGitBranch, title: 'Custom Workflows', desc: 'Build approval flows that match your process.' },
  { cat: 'workplace', icon: FiAlertCircle, title: 'Grievance Management', desc: 'Raise, track and resolve employee concerns.' },
  { cat: 'insights', icon: FiBarChart2, title: 'Analytical Dashboard', desc: 'Live workforce metrics at a glance.' },
  { cat: 'insights', icon: FiPieChart, title: 'Reports & Analytics', desc: 'Exportable reports for smarter decisions.' },
  { cat: 'insights', icon: FiLock, title: 'Two-Factor Authentication', desc: 'Extra login protection for every account.' },
  { cat: 'support', icon: FiMail, title: 'Email Support 24/7', desc: 'Reach our team by email any time.' },
  { cat: 'support', icon: FiPhoneCall, title: 'Telephonic Support 24/7', desc: 'Talk to an expert whenever you need help.' },
  { cat: 'enterprise', icon: FiKey, title: 'Single Sign-On', desc: 'One secure login across your company tools.' },
  { cat: 'enterprise', icon: FiCode, title: 'API Access', desc: 'Connect TorchX Talent to your own systems.' },
  { cat: 'enterprise', icon: FiLink, title: 'Custom Integrations', desc: 'Integrations built around your tech stack.' },
  { cat: 'enterprise', icon: FiCloud, title: 'Private Cloud Hosting', desc: 'On-premises or private cloud deployment.' },
  { cat: 'enterprise', icon: FiUserCheck, title: 'Dedicated Account Manager', desc: 'A single point of contact for your team.' },
  { cat: 'enterprise', icon: FiGift, title: 'Free Smartphone Gift Hamper', desc: 'A welcome gift that comes with Enterprise.' },
]

const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.035 } } }
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

function FeatureCard({ f, tagLabel, showTag }) {
  const Icon = f.icon

  if (f.featured) {
    return (
      <motion.div variants={itemVariants} className="sm:col-span-2">
        <div className="group relative h-full overflow-hidden rounded-[20px] p-6 sm:p-7 flex flex-col gap-4 text-white bg-gradient-to-br from-[#7A004B]/70 via-[#5a0033]/60 to-[#3d0022]/70 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_28px_70px_rgba(122,0,75,0.30),0_20px_60px_rgba(0,0,0,0.35)]">
          {/* hover atmosphere */}
          <div className="pointer-events-none absolute inset-0 z-0 rounded-[20px] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.16),transparent_58%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {/* glass highlight */}
          <div className="pointer-events-none absolute inset-[1px] z-0 rounded-[19px] bg-gradient-to-br from-white/[0.10] via-white/[0.025] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {/* light sweep */}
          <div className="pointer-events-none absolute -left-[120%] top-0 z-20 h-full w-[70%] rotate-[12deg] bg-gradient-to-r from-transparent via-white/[0.14] to-transparent blur-[10px] transition-transform duration-[900ms] ease-out group-hover:translate-x-[330%]" />
          {/* top edge */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70 transition-all duration-500 group-hover:via-white/80" />
          {/* corner glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 z-0 h-48 w-48 rounded-full bg-[#ff9ec7]/10 blur-3xl opacity-70 transition-all duration-700 group-hover:bg-[#ffb0d0]/20 group-hover:scale-125" />

          <div className="relative z-30 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/10 transition-all duration-500 group-hover:bg-white group-hover:text-[#7A004B] group-hover:border-white/50 group-hover:shadow-[0_6px_22px_rgba(255,255,255,0.20)]">
              <Icon className="text-[22px]" />
            </div>
            <span className="text-[10px] font-ui font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-full bg-white/15 border border-white/10 transition-all duration-500 group-hover:bg-white/15 group-hover:border-white/25 group-hover:text-white">
              {tagLabel}
            </span>
          </div>

          <div className="relative z-30">
            <h3 className="font-display font-extrabold text-xl sm:text-2xl leading-snug tracking-tight transition-transform duration-500 group-hover:translate-x-[2px]">
              {f.title}
            </h3>
            <p className="font-body text-[13px] sm:text-[14px] leading-[1.6] text-white/80 mt-2 transition-colors duration-500 group-hover:text-white/90">
              {f.desc}
            </p>
          </div>

          <ul className="relative z-30 flex flex-wrap gap-x-5 gap-y-1.5 mt-auto">
            {f.highlights.map((h) => (
              <li
                key={h}
                className="flex items-center gap-2 text-[12px] sm:text-[12.5px] font-body text-white/85 transition-all duration-500 group-hover:text-white"
              >
                {/* GREEN tick — dark background, so green-400 */}
                <FiCheck strokeWidth={3} className="shrink-0 text-[13px] text-green-400 transition-transform duration-500 group-hover:scale-110" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={itemVariants}>
      <div className="group relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.15] via-white/[0.09] to-white/[0.05] backdrop-blur-xl border border-white/20 p-4 sm:p-5 flex flex-row sm:flex-col items-start gap-3.5 sm:gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all duration-500 ease-out hover:-translate-y-1 hover:from-white/[0.22] hover:via-white/[0.13] hover:to-white/[0.07] hover:border-white/35 hover:shadow-[0_20px_48px_rgba(122,0,75,0.25),0_12px_35px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]">
        <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.16),transparent_65%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-[1px] z-0 rounded-[15px] bg-gradient-to-br from-[#ffb0d0]/[0.07] via-white/[0.025] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute -left-[130%] top-0 z-20 h-full w-[75%] rotate-[12deg] bg-gradient-to-r from-transparent via-white/[0.13] to-transparent blur-[9px] transition-transform duration-[850ms] ease-out group-hover:translate-x-[330%]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent transition-all duration-500 group-hover:via-white/80" />
        <div className="pointer-events-none absolute -right-12 -top-12 z-0 h-32 w-32 rounded-full bg-[#ff9ec7]/[0.06] blur-3xl opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:scale-125" />

        <div className="relative z-30 flex items-center justify-between gap-2 shrink-0 sm:w-full">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/[0.18] text-white flex items-center justify-center shrink-0 border border-white/10 transition-all duration-500 group-hover:bg-white group-hover:text-[#7A004B] group-hover:border-white/40 group-hover:shadow-[0_6px_20px_rgba(255,255,255,0.18)]">
            <Icon className="text-[18px] sm:text-[20px]" />
          </div>

          {showTag && (
            <span className="hidden sm:inline-block max-w-[62%] truncate text-[9px] font-ui font-bold uppercase tracking-[0.8px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/5 transition-all duration-500 group-hover:bg-white/15 group-hover:text-white group-hover:border-white/20">
              {tagLabel}
            </span>
          )}
        </div>

        <div className="relative z-30 min-w-0">
          <h3 className="font-display font-bold text-[15px] sm:text-base leading-snug text-white transition-transform duration-500 group-hover:translate-x-[2px]">
            {f.title}
          </h3>
          <p className="font-body text-[12.5px] sm:text-[13px] leading-relaxed text-white/70 mt-1 transition-colors duration-500 group-hover:text-white/85">
            {f.desc}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function FeatureJourney() {
  const [active, setActive] = useState('all')

  const counts = featureItems.reduce((acc, f) => {
    acc[f.cat] = (acc[f.cat] || 0) + 1
    return acc
  }, {})
  const labelOf = Object.fromEntries(featureCategories.map((c) => [c.key, c.label]))
  const chips = [
    { key: 'all', label: 'All Features', count: featureItems.length },
    ...featureCategories.map((c) => ({ ...c, count: counts[c.key] || 0 })),
  ]
  const visible = active === 'all' ? featureItems : featureItems.filter((f) => f.cat === active)

  return (
    <>
      <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:justify-center pb-2 mb-8 -mx-5 px-5 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => {
          const isActive = active === c.key
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(c.key)}
              className={`shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-ui font-semibold cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'bg-[#7A004B] border-[#7A004B] text-white shadow-[0_6px_18px_rgba(122,0,75,0.25)]'
                  : 'bg-white border-[#EAC7D7] text-[#5C5C5C] hover:border-[#c88ba8] hover:text-[#7A004B]'
              }`}
            >
              {c.label}
              <span
                className={`min-w-[20px] rounded-full px-1.5 py-px text-center text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#7A004B]/[0.08] text-[#7A004B]'
                }`}
              >
                {c.count}
              </span>
            </button>
          )
        })}
      </div>

      <motion.div
        key={active}
        variants={gridVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid-flow-dense gap-3.5 sm:gap-5"
      >
        {visible.map((f) => (
          <FeatureCard key={f.title} f={f} tagLabel={labelOf[f.cat]} showTag={active === 'all'} />
        ))}
      </motion.div>
    </>
  )
}

function Features() {
  return (
    <section id="features" className="scroll-anchor relative overflow-hidden font-body pt-10 pb-28">
      <SectionBackdrop />
      <Wrap className="relative z-10">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="font-hero font-medium text-white leading-[1.1] mb-6 text-[clamp(32px,4vw,48px)]">
              Powerful <span className="text-[#ffb0d0]">Features</span>
              <br />
              Built for <span className="text-[#ffb0d0]">Modern</span> Teams
            </h2>
            <p className="text-lg sm:text-xl text-white/60 leading-relaxed max-w-[700px] mx-auto font-body">
              Everything TorchX Talent offers to help you hire smarter, evaluate better, and empower your employees.
            </p>
          </div>

          <FeatureJourney />
        </motion.div>
      </Wrap>
    </section>
  )
}

/* ==========================================================================
   PRICING
========================================================================== */

function Pricing() {
  const [billing, setBilling] = useState('monthly')

  const plans = [
    {
      name: 'Free Forever',
      desc: 'Everything a small team needs to get started ── at no cost.',
      inherits: null,
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        'Geo Tag Attendance',
        'Face Attendance',
        'Monitoring of Employee Active and Idle Time',
        'Leave management',
        'Basic payroll',
        'Analytical and Digital Dashboard',
        'Announcements',
        'Team Documentation',
        'Reimbursement',
        'Employee Self-Service Portal',
        'Policy Management',
        'Grievance Management',
        'Email support (24/7)',
      ],
      crossFeatures: [],
    },
    {
      name: 'Basic',
      desc: 'Perfect for small teams getting started',
      inherits: null,
      monthlyPrice: 39,
      yearlyPrice: Math.round(39 * 12 * 0.83),
      features: ['Geo Tag Attendance', 'Face Attendance', 'Monitoring of Employee Active and Idle Time', 'Leave management', 'Basic payroll', 'Analytical and Digital Dashboard', 'Announcements', 'Team Documentation', 'Employee Self-Service Portal', 'Policy Management', 'Reimbursement', 'Grievance Management', 'Email support (24/7)', 'Live Map Tracking', 'Performance Management', 'Timesheet', 'Custom Workflow', 'Recruitment Management', 'Telephonic Support (24/7)'],
      crossFeatures: ['Live Map Tracking', 'Performance Management', 'Recruitment Management', 'Timesheet', 'Custom Workflow', 'Telephonic Support (24/7)'],
    },
    {
      name: 'Advance',
      desc: 'For growing businesses that need more',
      inherits: 'Everything in Basic +',
      monthlyPrice: 99,
      yearlyPrice: Math.round(99 * 12 * 0.83),
      popular: true,
      features: ['Live Map Tracking', 'Recruitment / Applicant tracking', 'Face Attendance', 'Performance management', 'Integrated Advanced Payroll', 'Timesheet', 'Two-factor authentication', 'Custom workflow', 'Reports & analytics', 'Employee Self-Service Portal', 'Telephonic support (24/7)'],
      crossFeatures: [],
    },
    {
      name: 'Enterprise',
      desc: 'Ultimate power and flexibility',
      inherits: 'Everything in Advance +',
      monthlyPrice: null,
      yearlyPrice: null,
      features: [
        'Free Smartphone gift hamper',
        'Face Attendance',
        'Custom Integrations',
        'Single Sign-On',
        'API access',
        'On-premises/ Private cloud hosting',
        'Dedicated account manager',
      ],
      crossFeatures: [],
    },
  ]

  const storage = [
    { label: 'Free Forever', val: '5 MB' },
    { label: 'Basic', val: '2 GB' },
    { label: 'Advance', val: '20 GB' },
    { label: 'Enterprise', val: '100 GB' },
  ]

  const badges = [
    { icon: <FiShield size={20} />, label: 'Secure & Compliant', desc: 'Enterprise-grade security with regular backups.' },
    { icon: <FiLink size={20} />, label: 'Easy Integration', desc: 'Seamlessly integrates with your favorite tools.' },
    { icon: <FiActivity size={20} />, label: '99.9% Uptime', desc: 'Reliable performance you can count on.' },
    { icon: <FiBookOpen size={20} />, label: 'Free Onboarding', desc: 'We help you and your team get started.' },
  ]

  return (
    <section id="pricing" className="scroll-anchor relative overflow-hidden bg-white pt-10 pb-28">
      {/* <SectionBackdrop />  ← hata diya, ab white background */}
      <Wrap className="relative z-10">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="text-center mb-6">
            <h2 className="font-hero font-medium text-[#2A1120] mb-4 text-[clamp(28px,3.2vw,42px)]">
              Simple, Transparent <span className="text-[#7A004B]">Pricing</span>
              <br />
              That Grows With You
            </h2>
            <p className="text-lg font-body text-[#5C5C5C] max-w-[560px] mx-auto leading-relaxed mb-5">
              Choose the perfect TorchX Talent plan for your team. Upgrade or downgrade anytime as your needs change.
            </p>

            <div className="inline-flex items-center gap-3 bg-[#FDF4F8] border border-[#EAC7D7] rounded-full px-3 py-2">
              <span className={`text-sm font-ui font-semibold px-2 ${billing === 'monthly' ? 'text-[#111]' : 'text-[#aaa]'}`}>
                Monthly
              </span>
              <button
                type="button"
                onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
                className="relative w-12 h-6 rounded-full bg-[#7A004B] transition-colors duration-300 shrink-0"
                aria-label="Toggle billing period"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                    billing === 'yearly' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-sm font-ui font-semibold px-2 flex items-center gap-1.5 ${billing === 'yearly' ? 'text-[#111]' : 'text-[#aaa]'}`}>
                Yearly
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-opacity duration-300 bg-[#7A004B] text-white ${
                    billing === 'yearly' ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  Save 17%
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-5 items-stretch mb-6 pt-4">
            {plans.map((p) => {
              const price = billing === 'yearly' ? p.yearlyPrice : p.monthlyPrice
              const suffix = billing === 'yearly' ? '/user/year' : '/user/month'
              return (
                <div
                  key={p.name}
                  className={`relative rounded-3xl p-6 sm:p-8 xl:p-6 flex flex-col gap-5 bg-white border-2 border-[#7A004B] h-full transition-all duration-300 shadow-[0_10px_30px_rgba(122,0,75,0.08)] ${
                    p.popular
                      ? 'relative z-[5] shadow-[0_20px_50px_rgba(122,0,75,0.2)]'
                      : 'hover:scale-[1.02] hover:shadow-[0_16px_40px_rgba(122,0,75,0.15)]'
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-[2]">
                      <span className="bg-[#7A004B] text-white text-[11px] font-ui font-bold px-5 py-1.5 rounded-full whitespace-nowrap tracking-wide">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="text-lg font-display font-bold text-[#111] mb-1.5">{p.name}</div>
                    <div className="text-xs font-body text-[#999] leading-relaxed">{p.desc}</div>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-baseline gap-x-1">
                      <span className="text-[34px] sm:text-[38px] xl:text-[34px] font-display font-extrabold text-[#111] leading-tight">
                        {price !== null ? `₹${price}` : 'Custom'}
                      </span>
                      {price !== null && <span className="text-sm font-body text-[#999]">{suffix}</span>}
                    </div>
                    {p.inherits && (
                      <div className="text-[15px] font-display font-extrabold text-[#7A004B] mt-1.5">{p.inherits}</div>
                    )}
                  </div>
                  <ul className="list-none p-0 m-0 flex flex-col gap-2.5 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] font-body text-[#5C5C5C]">
                        {p.crossFeatures?.includes(f) ? (
                          <FiX strokeWidth={3} className="text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <FiCheck strokeWidth={3} className="text-green-600 shrink-0 mt-0.5" />
                        )}
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="https://torchxsuite.com/signup"
                    className="mt-auto w-full py-3 rounded-full text-sm font-ui font-bold cursor-pointer bg-[#7A004B] text-white border-none transition-all hover:bg-[#5a0033] text-center no-underline inline-block"
                  >
                    Start Free Trial
                  </a>
                </div>
              )
            })}
          </div>

          <div className="bg-[#FDF4F8] rounded-[20px] px-5 sm:px-8 py-6 mb-6 border-2 border-[#7A004B]">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-x-3 gap-y-6 sm:gap-4 items-center">
              <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-center gap-2.5">
                <FiHardDrive className="text-[#7A004B] text-[22px] shrink-0" />
                <div>
                  <div className="text-[13px] font-display font-bold text-[#111]">Storage Guidance</div>
                  <div className="text-[11px] font-body text-[#aaa] leading-snug">
                    Finance documents, invoices, receipts, ledgers grow fast.
                  </div>
                </div>
              </div>
              {storage.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-display font-extrabold text-[#111]">{s.val}</div>
                  <div className="text-[10px] text-[#aaa] font-body mb-1">Per company</div>
                  <span className="inline-block whitespace-nowrap text-[10px] bg-white text-[#7A004B] font-bold px-3.5 py-0.5 rounded-full border border-[#EAC7D7] font-ui">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {badges.map((b) => (
              <div key={b.label} className="flex items-start gap-3 px-4.5 py-4 bg-[#FDF4F8] rounded-2xl border border-[#EAC7D7]">
                <div className="text-[#7A004B] shrink-0 mt-0.5">{b.icon}</div>
                <div>
                  <div className="text-xs font-display font-bold text-[#111] mb-0.5">{b.label}</div>
                  <div className="text-[11px] font-body text-[#aaa] leading-relaxed">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#FDF4F8] rounded-[20px] px-5 sm:px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-[#EAC7D7]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-[#7A004B]/[0.09] rounded-full flex items-center justify-center shrink-0">
                <HiOutlineSparkles className="text-[#7A004B] text-xl" />
              </div>
              <div>
                <div className="text-sm font-display font-bold text-[#111]">Not sure which plan is right for you?</div>
                <div className="text-xs font-body text-[#aaa]">
                  Our experts can help you choose the perfect plan based on your requirements.
                </div>
              </div>
            </div>
            <a
              href="tel:+917454098820"
              className="inline-flex items-center gap-2 border-2 border-[#7A004B] text-[#7A004B] bg-transparent text-[15px] font-ui font-semibold px-7 py-3.5 rounded-full no-underline transition-all hover:bg-[#FDF4F8] hover:-translate-y-0.5"
            >
              Talk To Expert
            </a>
          </div>
        </motion.div>
      </Wrap>
    </section>
  )
}

function Testimonials() {
  const testimonials = [
    { quote: 'TorchX Talent has completely transformed our hiring process. The AI recruitment feature helps us find the right talent faster and with better accuracy.', name: 'KK Oberoi', role: 'HR Manager', initials: 'KO' },
    { quote: 'The employee portal is a game changer! Our team loves the easy access to documents, requests, and updates all in one place.', name: 'Anaya Varma', role: 'HR Director', initials: 'AV' },
    { quote: 'Performance reviews are now simple, transparent, and data-driven. TorchX Talent helps us build a culture of continuous feedback and growth.', name: 'Rohan Sharma', role: 'People Operations Lead', initials: 'RS' },
    { quote: 'TorchX Talent has significantly improved our workforce management. From onboarding to performance tracking, everything is streamlined and easy to manage.', name: 'Karan Malhotra', role: 'Head of Human Resources', initials: 'KM' },
    { quote: 'TorchX Talent has helped us centralize all HR operations in one platform. The automation features save countless hours every week and improve team productivity.', name: 'Meera Patel', role: 'Chief People Officer', initials: 'MP' },
  ]

  const loopTestimonials = [...testimonials, ...testimonials]

  return (
    <section id="testimonials" className="scroll-anchor relative overflow-hidden font-body pt-10 pb-28">
      <SectionBackdrop />

      {/* Left/right blur (fade) effect hatane ke liye override */}
      <style>{`
        .testimonial-marquee,
        .testimonial-track {
          -webkit-mask-image: none !important;
          mask-image: none !important;
        }
        .testimonial-marquee::before,
        .testimonial-marquee::after,
        .testimonial-track::before,
        .testimonial-track::after {
          content: none !important;
          display: none !important;
        }
      `}</style>

      <Wrap className="relative z-10">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="text-center mb-16">
            <h2 className="font-hero font-medium text-white leading-[1.1] mb-6 text-[clamp(32px,4vw,48px)]">
              Loved by <span className="text-[#ffb0d0]">Teams</span>, Trusted by <span className="text-[#ffb0d0]">Leaders</span>
            </h2>
            <p className="text-lg text-white/60 max-w-[440px] mx-auto leading-relaxed">
              See how organizations like yours are using TorchX Talent to streamline HR and achieve more every day.
            </p>
          </div>
        </motion.div>

        <div
          className="testimonial-marquee mb-12 -mx-5 sm:-mx-10 lg:-mx-16 px-5 sm:px-10 lg:px-16"
          style={{ WebkitMaskImage: 'none', maskImage: 'none' }}
        >
          <div className="testimonial-track">
            {loopTestimonials.map((t, i) => (
              <div
                key={`${t.name}-${i}`}
                className="testi-card-m w-[280px] sm:w-[320px] md:w-[340px] bg-white border border-[#DDB7CB] rounded-[14px] p-6 shadow-[0_6px_18px_rgba(122,0,75,0.08)] flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(90,0,51,0.18)] hover:border-[#5a0033]"
              >
                <RiDoubleQuotesL className="text-4xl text-[#7A004B] mb-3.5" />
                <p className="text-[13px] text-[#333] leading-[1.75] flex-1 mb-4">{t.quote}</p>
                <div className="border-t border-dotted border-[#c88ba8] mb-4" />
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#740042] to-[#740022] flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(122,0,75,0.25)]">
                    <span className="text-white text-xs font-display font-bold">{t.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-display font-bold text-[#7A004B] truncate">{t.name}</div>
                    <div className="text-[11px] text-[#777] mt-0.5 truncate">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="testimonial-cta flex flex-col md:flex-row flex-wrap w-full bg-gradient-to-br from-[#FFF7FA] to-[#F9EAF2] border border-[#E7CCD9] rounded-[22px] px-8 py-12 justify-between items-start md:items-center gap-5 shadow-[0_10px_30px_rgba(122,0,75,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(122,0,75,0.15)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7A004B] to-[#B00068] shadow-[0_8px_20px_rgba(122,0,75,0.25)] rounded-full flex items-center justify-center shrink-0">
                <HiOutlineSparkles className="text-white text-xl" />
              </div>
              <div>
                <div className="text-lg font-display font-extrabold text-[#2A1120] mb-1">
                  Join 100+ companies growing with TorchX Talent
                </div>
                <div className="text-[13px] text-[#666]">Powerful HR tools. Happy teams. Better results.</div>
              </div>
            </div>
            <a
              href="https://torchxsuite.com/signup"
              className="inline-flex items-center gap-2 bg-gradient-to-br from-[#7A004B] to-[#A60062] text-white text-[13px] font-ui font-bold px-6.5 py-3.5 rounded-xl no-underline whitespace-nowrap transition-all shadow-[0_8px_20px_rgba(122,0,75,0.25)] hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(122,0,75,0.35)]"
            >
              Book For Free Trial <FiArrowRight />
            </a>
          </div>
        </motion.div>
      </Wrap>
    </section>
  )
}

/* ==========================================================================
   LEGAL + FOOTER
========================================================================== */

const legalDocs = {
  privacy: {
    title: 'Privacy Policy',
    effective: 'April 01, 2026',
    sections: [
      { heading: 'Information We Collect', items: ['Personal Information: Name, email address, phone number, billing information, company details, and account credentials.', 'Usage Information: IP address, browser type, device information, login activity, usage analytics, cookies and tracking information.', 'Customer Data: Any data uploaded, processed, or stored by customers while using our Services.'] },
      { heading: 'How We Use Information', items: ['Provide and maintain Services, process subscriptions and payments, improve platform performance.', 'Offer customer support, prevent fraud and abuse, send service-related notifications, and comply with legal obligations.'] },
      { heading: 'Data Security & Sharing', items: ['We implement commercially reasonable administrative, technical, and organizational safeguards to protect user data.', 'We do not sell personal data. We may share with payment processors, cloud hosting providers, analytics providers, and legal authorities when required by law.'] },
      { heading: 'User Rights', items: ['Users may request access, correction, deletion, or export of personal data.', 'Send requests to: privacy@torchxsuite.com'] },
      { heading: 'Additional', items: ['Data may be processed and stored outside your country subject to applicable laws.', 'Our Services are not intended for individuals under 18 years of age.', 'We reserve the right to modify this policy at any time. Contact: legal@torchxsuite.com'] },
    ],
  },
  terms: {
    title: 'Terms of Service',
    effective: 'April 01, 2026',
    sections: [
      { heading: 'Eligibility & Account Responsibilities', items: ['You must be legally capable of entering into binding agreements to use our Services.', 'Users are responsible for maintaining account confidentiality and all activities under their account.', 'You agree not to use Services unlawfully, attempt unauthorized access, reverse engineer the platform, or upload malicious software.'] },
      { heading: 'Subscription & Billing', items: ['Services are offered on subscription plans billed monthly, quarterly, or annually.', 'Payments are non-refundable unless stated otherwise in our Refund Policy.', 'Failure to pay may result in suspension or termination.'] },
      { heading: 'Intellectual Property & Customer Data', items: ['All platform software, branding, designs, content, APIs, workflows, and technology remain the exclusive property of the Company.', 'Customers retain ownership of their uploaded data. You grant us limited rights necessary to host, process, and operate the Services.'] },
      { heading: 'Limitation of Liability & Termination', items: ['We are not liable for indirect, incidental, or consequential damages. Total liability shall not exceed the amount paid during the previous 3 months.', 'Accounts may be suspended or terminated for violation of Terms, fraudulent activity, non-payment, or abuse of Services.'] },
      { heading: 'Governing Law', items: ['These Terms shall be governed by the laws of India.', 'Disputes shall be subject to the jurisdiction of courts located in Bareilly, Uttar Pradesh, India.', 'Contact: legal@torchxsuite.com'] },
    ],
  },
  cookie: {
    title: 'Cookie Policy',
    effective: 'April 01, 2026',
    sections: [
      { heading: 'What Are Cookies?', items: ['Cookies are small text files stored on your device to improve website functionality and user experience.'] },
      { heading: 'Types of Cookies We Use', items: ['Essential Cookies: Required for authentication, security, and core functionality.', 'Analytics Cookies: Help us understand platform usage and improve performance.', 'Preference Cookies: Remember user settings and preferences.', 'Marketing Cookies: Used for relevant communication and advertising where permitted.'] },
      { heading: 'Managing Cookies', items: ['Some third-party services integrated into our platform may place cookies subject to their own privacy policies.', 'Users can manage or disable cookies through browser settings. Disabling cookies may affect platform functionality.', 'We may update this Cookie Policy periodically.'] },
    ],
  },
  refund: {
    title: 'Refund Policy',
    effective: 'April 01, 2026',
    sections: [
      { heading: 'Subscription Payments', items: ['All subscription payments are generally non-refundable once billed.', 'Where trial access is provided, users are encouraged to evaluate the Services before purchasing.'] },
      { heading: 'Exceptional Refunds', items: ['Refunds may be considered for: duplicate payment, incorrect billing due to system error, or service unavailable for an extended verified duration caused solely by us.', 'Approved refunds are processed within 7–15 business days.'] },
      { heading: 'Non-Refundable Situations', items: ['Refunds will not be issued for partial usage, change of mind, failure to cancel before renewal, account suspension due to policy violations, or third-party service interruptions.'] },
      { heading: 'Chargebacks', items: ['Initiating fraudulent chargebacks without contacting support may result in immediate account suspension, permanent service restriction, and legal recovery actions where applicable.', 'Contact: accounts@torchxsuite.com'] },
    ],
  },
}

function LegalModal({ docKey, onClose }) {
  const doc = legalDocs[docKey]
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      data-no-smooth
      className="fixed inset-0 bg-black/55 z-[9999] flex items-center justify-center p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-[14px] w-full max-w-[720px] max-h-[88vh] flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f0e6ec]">
          <p className="font-body text-base font-semibold text-[#730042] m-0">{doc.title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-none bg-[#f5f5f5] text-[#555] text-lg cursor-pointer flex items-center justify-center shrink-0 transition-colors hover:bg-[#ececec]"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          <p className="font-body text-xs text-[#aaa] mb-5">Effective Date: {doc.effective}</p>
          {doc.sections.map((sec, i) => (
            <div key={i} className="mb-5">
              <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#730042] mb-2.5">{sec.heading}</p>
              {sec.items.map((item, j) => (
                <div key={j} className="flex gap-2.5 mb-2 font-body text-[13.5px] text-[#444] leading-relaxed">
                  <span className="w-[5px] h-[5px] bg-[#730042] rounded-full mt-2 shrink-0 opacity-50" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Footer() {
  const goToSection = useSectionNav()
  const cols = [
    {
      title: 'Product',
      links: [
        { label: 'Talent', href: 'https://torchxsuite.com/talent/' },
        { label: 'Engage', href: '' },
        { label: 'Finance', href: '' },
        { label: 'Inventory', href: '' },
        { label: 'Payroll', href: '' },
      ],
    },
    {
      title: 'Solutions',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', to: '/documentation' },
        { label: 'Guide', to: '/guide' },
        { label: 'Blog', to: '/blog' },
      ],
    },
  ]
  const socials = [
    { icon: <FiLinkedin />, href: 'https://www.linkedin.com/company/torchx-talent/', label: 'LinkedIn' },
    { icon: <FiInstagram />, href: 'https://www.instagram.com/?hl=en', label: 'Instagram' },
    { icon: <FaXTwitter />, href: 'https://x.com/home', label: 'X' },
    { icon: <FaYoutube />, href: 'https://www.youtube.com/@techtorch_sol', label: 'YouTube' },
  ]
  const [activeDoc, setActiveDoc] = useState(null)
  const linkCls = 'text-base text-[#7A004B] no-underline transition-colors hover:text-[#5a0033]'

  return (
    <>
      <footer className="bg-[#F6EDF2] border-t border-[#E2C9D6] font-body">
        <Wrap className="pt-8 pb-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-10">
            <div>
              <img src={logo} alt="TorchX Talent" className="h-9 sm:h-11 w-auto object-contain block mb-1.5" />
              <p className="text-[15px] text-[#444] leading-[1.75] mb-5">
                TorchX Talent helps you hire smarter, faster, and with confidence using AI-powered talent solutions.
                Streamline recruitment, discover top candidates, and build high-performing teams effortlessly.
              </p>
              <div className="flex gap-2.5">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="text-[#7A004B] text-lg no-underline w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all hover:-translate-y-0.5 hover:text-[#5a0033]"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {cols.map((col) => (
              <div key={col.title}>
                <div className="text-2xl font-display font-bold text-[#7A004B] mb-4">{col.title}</div>
                <ul className="list-none p-0 m-0 flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.href && l.href.startsWith('#') ? (
                        <a
                          href={l.href}
                          onClick={(e) => goToSection(e, l.href.slice(1))}
                          className={linkCls}
                        >
                          {l.label}
                        </a>
                      ) : l.href ? (
                        <a href={l.href} className={linkCls}>
                          {l.label}
                        </a>
                      ) : (
                        <Link
                          to={l.to || `/coming-soon?product=${encodeURIComponent(l.label)}`}
                          className={linkCls}
                        >
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Wrap>

        <Wrap className="pt-9 pb-5">
          <div className="border-t border-[#E2C9D6] pt-5 flex flex-wrap justify-between items-center gap-3">
            <p className="text-sm text-[#555] m-0">
              TorchX Talent™ — A Product of Techtorch Solutions Private Limited.
            </p>
            <div className="flex flex-wrap gap-4.5">
              {[
                { label: 'Privacy Policy', key: 'privacy' },
                { label: 'Terms of Service', key: 'terms' },
                { label: 'Cookie Policy', key: 'cookie' },
                { label: 'Refund Policy', key: 'refund' },
              ].map((item) => (
                <span
                  key={item.key}
                  onClick={() => setActiveDoc(item.key)}
                  className="text-sm text-[#888] cursor-pointer transition-colors hover:text-[#7A004B]"
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </Wrap>

        <div className="h-3" />
      </footer>

      {activeDoc && <LegalModal docKey={activeDoc} onClose={() => setActiveDoc(null)} />}
    </>
  )
}

/* ==========================================================================
   SEO
========================================================================== */

function useSEO() {
  useEffect(() => {
    document.title = 'TorchX Talent — HRMS Software for Attendance, Payroll & Recruitment'

    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    const description =
      'TorchX Talent is an all-in-one HRMS for attendance, leave, payroll and recruitment. Free forever plan, GPS and face attendance, and plans that scale with your team.'

    setMeta('name', 'description', description)
    setMeta('name', 'robots', 'index, follow')
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:title', 'TorchX Talent — HRMS Software for Modern Teams')
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', 'https://torchxsuite.com/talent/')
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', 'TorchX Talent — HRMS Software for Modern Teams')
    setMeta('name', 'twitter:description', description)

    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', 'https://torchxsuite.com/talent/')

    let jsonLd = document.getElementById('torchx-talent-jsonld')
    if (!jsonLd) {
      jsonLd = document.createElement('script')
      jsonLd.type = 'application/ld+json'
      jsonLd.id = 'torchx-talent-jsonld'
      document.head.appendChild(jsonLd)
    }
    jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'TorchX Talent',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', reviewCount: '100' },
    })
  }, [])
}

/* ==========================================================================
   PAGE
========================================================================== */

export default function LandingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: auth } = useAuth()
  const isAuthenticated = !!auth
  const scrollContainerRef = useRef(null)

  useSEO()
  useSmoothScroll(scrollContainerRef)

  // Arriving from another page (or with #hash): scroll to the requested section
  useEffect(() => {
    const id = location.state?.scrollTo || location.hash.replace('#', '')
    if (!id) return
    const t = setTimeout(() => scrollToSection(id, 1.2), 400)
    return () => clearTimeout(t)
  }, [location.state, location.hash])

  const accountLabel = isAuthenticated ? 'Access Your Talent Account' : 'Sign in to your Talent Account'

  const handleAccountClick = () => {
    navigate(isAuthenticated ? '/redirect' : '/login')
  }

  return (
    <div
      ref={scrollContainerRef}
      style={{ height: '100vh', overflowY: 'auto', scrollBehavior: 'auto' }}
    >
      <style>{fontStyles}</style>
      <PageBackground />
      <Navbar
        accountLabel={accountLabel}
        onAccountClick={handleAccountClick}
        scrollContainerRef={scrollContainerRef}
      />
      <Hero
        onOpenCalculator={() => navigate('/pricing-calculator')}
        scrollContainerRef={scrollContainerRef}
      />
      <Divider />
      <Features />
      <Divider />
      <Pricing />
      <Divider />
      <Testimonials />
      <Footer />
    </div>
  )
}

                                                   
