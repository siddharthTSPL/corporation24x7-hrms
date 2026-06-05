import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion'
import {
  FiMenu, FiX, FiArrowRight, FiCheck,
  FiLinkedin, FiInstagram, FiTwitter, FiMail,
  FiShield, FiLink, FiActivity, FiBookOpen,
  FiUser, FiFileText, FiBell, FiHardDrive,
  FiUsers, FiStar, FiBarChart2,
  FiLogOut, FiSettings, FiMessageSquare
} from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi'
import {
  BsPeopleFill, BsGraphUp, BsPersonBadge, BsChatSquareText
} from 'react-icons/bs'
import {
  RadarChart as RechartsRadar, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer
} from 'recharts'
import logo from '../../assets/TorchX.svg'
import PlantImage from '../../assets/plant.png';

// ─────────────────────────────────────────────────────────────────────────────
// ██ LAYOUT DESIGN TOKENS — 8px base spacing system
// ─────────────────────────────────────────────────────────────────────────────
//
// Every spacing value below is a multiple of 8px.
// This is the single source of truth — no more scattered hardcoded px values.
//
// PHILOSOPHY:
//   - One container width cap  → all sections share the same left/right walls
//   - One horizontal gutter    → consistent page margins at every breakpoint
//   - Section spacing tiers    → lg / md / sm for visual hierarchy
//   - Grid gap tiers           → cards / stats / footer columns
//
// HOW TO READ:
//   SP.section.lg  = 96px top + bottom padding  (major sections: Features, Pricing)
//   SP.section.md  = 72px top + bottom padding  (stats, testimonials)
//   SP.section.sm  = 48px top + bottom padding  (dividers, utility rows)
//   SP.gutter       = 20px → 40px → 64px (mobile → tablet → desktop)
//   SP.maxW         = 1280px (Stripe/Vercel standard)
//   SP.navbarH      = 72px (sticky nav target height)
//
// ─────────────────────────────────────────────────────────────────────────────

const SP = {
  // ── Container ──────────────────────────────────────────────────────────────
  // 1280px is the industry-standard premium cap (Stripe ~1200px, Vercel 1280px)
  // mx-auto + w-full centers it on all screens
  maxW: '1500px',

  // ── Horizontal gutters — applied to EVERY section via <Wrap> ───────────────
  // 20px mobile / 40px tablet / 64px desktop
  // Previously inconsistent: navbar = 40px, hero = 40px, pricing = 40px,
  // footer = 40px BUT footer maxW was 1100px — now all unified at 1280px / 64px
  gutter: {
    x: 'clamp(20px, 5vw, 64px)',        // CSS clamp: fluid, no breakpoint jumps
    css: '0 clamp(20px, 5vw, 64px)',    // shorthand for padding shorthand
  },

  // ── Section vertical padding tiers ────────────────────────────────────────
  // lg  = 96px  (8 × 12) — Features, Pricing, Hero
  // md  = 72px  (8 × 9)  — Testimonials, Stats
  // sm  = 48px  (8 × 6)  — Footer top, utility rows
  // xs  = 24px  (8 × 3)  — Dividers, bottom bars
  section: {
    lg:  '96px',
    md:  '72px',
    sm:  '48px',
    xs:  '24px',
  },

  // ── Grid gaps ──────────────────────────────────────────────────────────────
  // card  = 28px  (8 × 3.5) — feature cards, pricing cards
  // stat  = 20px  (8 × 2.5) — compact stat row
  // inner = 16px  (8 × 2)   — within-card sub-grids
  // tight = 12px  (8 × 1.5) — badge rows, small icon grids
  gap: {
    card:  '28px',
    stat:  '20px',
    inner: '16px',
    tight: '12px',
  },

  // ── Navbar ─────────────────────────────────────────────────────────────────
  // Fixed 72px height (8 × 9). Previously height: 72 inline — now token-driven.
  navH: '72px',

  // ── Card padding ───────────────────────────────────────────────────────────
  // cardPad  = 32px (8 × 4) — outer feature/pricing card padding
  // cardInner= 16px (8 × 2) — inner card sub-section
  card: {
    pad:   '32px',
    padSm: '24px',
    inner: '16px',
  },

  // ── Heading gap ───────────────────────────────────────────────────────────
  // Space between section headline block and content grid below it
  // 64px (8 × 8) — matches Linear, Vercel
  headingGap: '64px',
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ GLOBAL WRAP COMPONENT
// Every single section renders its content inside <Wrap>.
// This enforces:
//   1. Consistent max-width (1280px) across all sections
//   2. Equal left/right margins via fluid clamp gutters
//   3. Zero drift between sections — all content aligns to the same invisible grid
// ─────────────────────────────────────────────────────────────────────────────
const Wrap = ({ children, style = {} }) => (
  <div style={{
    maxWidth: SP.maxW,
    margin: '0 auto',
    padding: SP.gutter.css,
    width: '100%',
    ...style,
  }}>
    {children}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// ██ BRAND TOKENS — unchanged from original
// ─────────────────────────────────────────────────────────────────────────────
const P  = '#7A004B'
const PH = '#5a0033'
const PL = '#FDF4F8'
const PB = '#EAC7D7'
const D  = '#111111'
const G  = '#5C5C5C'

// ── Animation variants — unchanged ───────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
}
const stagger    = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
const cardVariant = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

// ── Recharts data — unchanged ─────────────────────────────────────────────────
const radarData = [
  { metric: 'Leadership',     value: 85 },
  { metric: 'Teamwork',       value: 72 },
  { metric: 'Quality',        value: 90 },
  { metric: 'Problem Solving',value: 68 },
  { metric: 'Communication',  value: 80 },
]

// ─────────────────────────────────────────────────────────────────────────────
// ██ GLOBAL STYLES
// Key layout changes vs original:
//   - .section-container  → replaces ad-hoc maxWidth per section
//   - .section-pad-*      → token-driven section padding classes
//   - .grid-*             → unified gap values from SP.gap.*
//   - Responsive overrides now target consistent breakpoints: 1023, 767, 480
// ─────────────────────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Sans:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; overflow-x: hidden; }
  body { font-family: 'DM Sans', sans-serif; background: #fff; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  #root { overflow-x: hidden; }
  a { text-decoration: none; }
  button { outline: none; min-height: 44px; }
  img, svg { max-width: 100%; }
  img { display: block; height: auto; }

  /* ── Mobile nav animation — unchanged ── */
  .nav-mobile-menu { overflow: hidden; animation: menuDrop .24s ease both; }
  @keyframes menuDrop {
    from { opacity: 0; transform: translateY(-8px); max-height: 0; }
    to   { opacity: 1; transform: translateY(0);    max-height: 360px; }
  }

  /* ── Grid layouts ──────────────────────────────────────────────────────────
     All gaps now reference SP.gap values. Named for readability.
  ── */
  .hero-grid         { grid-template-columns: minmax(0,.95fr) minmax(0,1.05fr); gap: 60px; }
  .stats-grid        { grid-template-columns: repeat(4, minmax(0,1fr)); gap: 20px; }  /* SP.gap.stat */
  .feat-section-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; } /* SP.gap.card */
  .pricing-grid      { grid-template-columns: repeat(3, minmax(0,1fr)); gap: 28px; } /* SP.gap.card */
  .badge-grid        { grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; } /* SP.gap.inner */
  .storage-grid      { grid-template-columns: minmax(0,1.5fr) repeat(3,minmax(0,1fr)); gap: 16px; }
  .testi-grid        { grid-template-columns: repeat(3, minmax(0,1fr)); gap: 28px; } /* SP.gap.card */
  .footer-grid       { grid-template-columns: minmax(0,1.3fr) repeat(3,minmax(0,1fr)); gap: 40px; }

  /* ── Card interaction — unchanged ── */
  .pricing-card, .testi-card, .feat-card { min-width: 0; }
  .pricing-card {
    transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease !important;
    cursor: default;
  }
  @media (hover:hover) and (pointer:fine) {
    .pricing-card:hover  { transform: scale(1.045) !important; box-shadow: none !important; z-index:10; position:relative; }
    .testi-card:hover    { transform: translateY(-8px) !important; box-shadow: 0 20px 60px rgba(90,0,51,0.18) !important; border-color:#5a0033 !important; }
    .feat-card:hover     { transform: translateY(-8px) !important; box-shadow: 0 16px 48px rgba(122,0,75,0.18) !important; }
  }
  .pricing-card-popular { transform: scale(1.045); box-shadow: none !important; z-index:5; position:relative; }
  .testi-card  { transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease !important; }
  .feat-card   { transition: transform 0.3s ease, box-shadow 0.3s ease !important; }

  /* ── Tablet breakpoint: 1024px ─────────────────────────────────────────────
     feat-section-grid collapses to 2 cols (cards too narrow at 3)
  ── */
  @media (max-width:1024px) {
    .feat-section-grid { grid-template-columns: repeat(2,1fr) !important; }
  }

  /* ── Tablet breakpoint: 1023px ─────────────────────────────────────────────
     All major grids go 2-col. hero stacks. nav burger appears.
     Hero padding scales to mid value via clamp — no override needed.
  ── */
  @media (max-width:1023px) {
    .nav-links  { display:none !important; }
    .nav-burger { display:block !important; }

    /* Hero grid collapses to 1-col, gap reduced proportionally */
    .hero-grid  { grid-template-columns:1fr !important; gap: 40px !important; }

    /* 2-col grids on tablet */
    .feat-section-grid, .pricing-grid, .testi-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .stats-grid, .badge-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .storage-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .footer-grid  { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }

    /* CTA / expert banners: stack on tablet */
    .testi-cta, .expert-banner {
      flex-direction: column !important;
      align-items: flex-start !important;
    }
    .testimonial-cta {
      flex-direction: column !important;
      align-items: flex-start !important;
      text-align: left !important;
    }
    .testimonial-cta > div:first-child { width: 100%; }
  }

  /* ── Mobile breakpoint: 767px ──────────────────────────────────────────────
     All grids collapse to 1-col. CTA centers. Analytics overlay hidden.
  ── */
  @media (max-width:767px) {
    .feat-section-grid, .pricing-grid, .testi-grid,
    .badge-grid, .footer-grid, .storage-grid { grid-template-columns:1fr !important; }

    /* analytics floating card: hide on small screens — saves space */
    .analytics-card-wrap { display:none; }

  
  .hero-grid {
    margin-top: 20px !important;
  }


    /* Popular pricing card: disable scale on mobile (breaks layout) */
    .pricing-card-popular, .pricing-card:hover { transform:none !important; }

    /* CTA: center-stack on mobile */
    .testimonial-cta {
      flex-direction: column !important;
      align-items: center !important;
      text-align: center !important;
    }
    .testimonial-cta > div:first-child {
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
    }
    .testimonial-cta a { width: 100%; max-width: 320px; justify-content: center !important; }
    .testimonial-cta h3, .testimonial-cta div { text-align: center; }
  }

  /* ── Small mobile: 480px ───────────────────────────────────────────────────
     stats collapse to 1-col. CTA gets tighter padding.
  ── */
  @media (max-width:480px) {
    .stats-grid { grid-template-columns:1fr !important; }
    .testimonial-cta { border-radius: 18px !important; }
    .testimonial-cta a { font-size: 12px !important; padding: 13px 20px !important; }
    .testi-card { padding: 20px !important; }
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// ██ DIVIDER — unchanged content, padding now uses SP token
// ─────────────────────────────────────────────────────────────────────────────
function Divider() {
  return (
    // py = SP.section.xs / 2 = 12px — intentionally tight, just a visual breath
    <div style={{ background: PL, padding: '12px 0', display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '100%', height: '1px', background: `linear-gradient(to right, transparent 0%, ${PB} 20%, ${PB} 80%, transparent 100%)` }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ NAVBAR
// Layout changes:
//   - maxWidth: 1280px (was 1500px — too wide, content misaligned with sections)
//   - padding: 0 clamp(20px,5vw,64px) — matches Wrap gutter exactly
//   - height: SP.navH = 72px (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const links = ['Features', 'Testimonials', 'Pricing', 'About']

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
   <nav
  style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 9999,
    background: '#fff',

    boxShadow: scrolled
      ? '0 2px 16px rgba(122,0,75,.08)'
      : '0 1px 0 #f0e0e8',

    transition: 'box-shadow .3s',
  }}
>
      {/*
        ── Navbar inner: uses SP.maxW (1280px) and SP.gutter.css
        Previously was maxWidth:1500px with px:40px — too wide relative to
        all content sections which used maxWidth:1280px. This caused navbar
        links to float into the gutters of content below.
      */}
      <div style={{
        maxWidth: SP.maxW,         /* 1280px — matches every section */
        margin: '0 auto',
        padding: `0 ${SP.gutter.x}`,  /* fluid clamp gutter */
        height: SP.navH,           /* 72px */
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <img
          src={logo} alt="TorchX Logo"
          style={{ height: 'clamp(36px, 4vw, 48px)', width: 'auto', objectFit: 'contain', display: 'block' }}
        />

        {/* Desktop nav: gap 36px (SP.gap.card + 8) — comfortable link spacing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }} className="nav-links">
          {links.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{ fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 500, color: G, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.currentTarget.style.color = P}
              onMouseLeave={e => e.currentTarget.style.color = G}>{l}</a>
          ))}
          <a href="/login" style={{ background: P, color: '#fff', fontSize: 14, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600, padding: '10px 28px', borderRadius: 50, textDecoration: 'none', boxShadow: `0 4px 18px ${P}40`, transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = PH; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = P; e.currentTarget.style.transform = 'none' }}>Login</a>
        </div>

        <button onClick={() => setOpen(!open)} className="nav-burger"
          style={{ display: 'none', background: 'none', border: 'none', fontSize: 24, color: D, cursor: 'pointer' }}>
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* Mobile drawer: padding matches gutter for alignment */}
      {open && (
        <div style={{ background: '#fff', borderTop: `1px solid ${PB}`, padding: `20px ${SP.gutter.x}`, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {links.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)}
              style={{ fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 500, color: G, textDecoration: 'none' }}>{l}</a>
          ))}
          <a href="/login" style={{ background: P, color: '#fff', fontSize: 14, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600, padding: '12px 0', borderRadius: 50, textDecoration: 'none', textAlign: 'center' }}>Login</a>
        </div>
      )}
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ ANALYTICS FLOATING CARD — unchanged (purely decorative, no layout impact)
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsCard() {
  return (
    <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 12px 40px rgba(115,0,66,0.18)', width: 'clamp(140px,18vw,200px)', border: '1.5px solid #e0c8d8', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
      <div style={{ width: '12px', flexShrink: 0, background: P }} />
      <div style={{ flex: 1, padding: '10px 9px 10px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '8px', fontWeight: 700, color: '#999', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'Instrument Sans,sans-serif' }}>Analytics</div>
        <div style={{ border: '1px solid #e0c8d8', borderRadius: '7px', padding: '5px 5px 3px', background: '#fff' }}>
          <svg width="100%" height="44" viewBox="0 0 120 44">
            <line x1="10" y1="2"  x2="10"  y2="38" stroke="#e0c8d8" strokeWidth="0.8" />
            <line x1="10" y1="38" x2="118" y2="38" stroke="#e0c8d8" strokeWidth="0.8" />
            <polyline points="10,34 22,28 32,30 42,18 52,24 62,12 72,18 82,10 92,14 102,7 112,11" fill="none" stroke="#f0d0e4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <polyline points="10,34 22,28 32,30 42,18 52,24 62,12 72,18 82,10 92,14 102,7 112,11" fill="none" stroke={P} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="102" cy="7" r="2.5" fill={P} />
          </svg>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch' }}>
          <div style={{ border: '1px solid #e0c8d8', borderRadius: '7px', padding: '5px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="34" height="34" viewBox="0 0 34 34">
              <circle cx="17" cy="17" r="15" fill="#f0dcea" />
              <path d="M17,17 L17,2 A15,15 0 1,1 4.5,24.5 Z" fill={P} />
              <circle cx="17" cy="17" r="6" fill="white" />
            </svg>
          </div>
          <div style={{ flex: 1, border: '1px solid #e0c8d8', borderRadius: '7px', padding: '4px 5px', background: '#fff' }}>
            <svg width="100%" height="34" viewBox="0 0 80 34">
              <rect x="1"  y="22" width="8" height="10" rx="2" fill="#f0dcea" />
              <rect x="12" y="18" width="8" height="14" rx="2" fill="#f0dcea" />
              <rect x="23" y="12" width="8" height="20" rx="2" fill={P} opacity=".6" />
              <rect x="34" y="6"  width="8" height="26" rx="2" fill={P} />
              <rect x="45" y="10" width="8" height="22" rx="2" fill="#CD166E" />
              <rect x="56" y="14" width="8" height="18" rx="2" fill={P} opacity=".8" />
              <rect x="67" y="20" width="8" height="12" rx="2" fill="#f0dcea" />
            </svg>
          </div>
        </div>
        <div style={{ background: P, borderRadius: '6px', height: '14px', display: 'flex', alignItems: 'center', padding: '0 8px', gap: '4px' }}>
          {[55, 36, 22].map((w, i) => <div key={i} style={{ height: '3px', width: `${w}px`, borderRadius: '2px', background: 'rgba(255,255,255,0.25)' }} />)}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ DASHBOARD MOCKUP — unchanged (internal SVG layout unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div style={{ background:'white', position:'relative', overflow:'visible' }}>
      <div style={{ position:'relative', padding:'48px 24px 80px', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{
          position:'absolute', top:'10%', right:'8%',
          width:'420px', height:'480px',
          background:'radial-gradient(ellipse at 60% 40%, #f5d6e8 0%, #fdf0f7 60%, transparent 100%)',
          borderRadius:'60% 40% 55% 45% / 50% 55% 45% 50%',
          zIndex:0
        }}/>
        <div style={{ position:'relative', zIndex:2, width:'100%', maxWidth:'100%' }}>
          <div style={{ position:'absolute', bottom:'-28px', left:'-36px', zIndex:20 }}>
            <AnalyticsCard/>
          </div>
          <svg viewBox="0 0 960 660" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"
            style={{ width:'100%', maxWidth:'100%', height:'auto', borderRadius:'18px', display:'block', margin:'0 auto', overflow:'hidden', filter:'drop-shadow(0 24px 64px rgba(115,0,66,0.20))' }}>
            <rect width="960" height="660" rx="18" fill="#eef2f8"/>
            <rect x="0" y="0" width="210" height="660" rx="18" fill="#ffffff"/>
            <rect x="10" y="0" width="200" height="660" fill="#ffffff"/>
            <image href={logo} x="22" y="20" width="118" height="40" preserveAspectRatio="xMidYMid meet"/>
            <line x1="16" y1="70" x2="194" y2="70" stroke="#f0e8f0" strokeWidth="1"/>
            <rect x="14" y="78" width="13" height="13" rx="2" fill={P} opacity="0.18"/>
            <rect x="16" y="81" width="9" height="2" rx="1" fill={P}/>
            <rect x="16" y="85" width="7" height="2" rx="1" fill={P}/>
            <text x="33" y="90" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="600" fill="#111">Talent</text>
            <polyline points="182,82 186,86 190,82" fill="none" stroke={P} strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="8" y="98" width="194" height="34" rx="8" fill={P}/>
            <path d="M22,118 L27,113 L32,118 L32,125 L29,125 L29,121 L25,121 L25,125 L22,125 Z" fill="none" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
            <text x="40" y="120" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="600" fill="white">Dashboard</text>
            <rect x="20" y="144" width="13" height="13" rx="2" fill="none" stroke="#888" strokeWidth="1.5"/>
            <rect x="23" y="141" width="2" height="5" rx="1" fill="#888"/><rect x="28.5" y="141" width="2" height="5" rx="1" fill="#888"/>
            <line x1="23" y1="150" x2="31" y2="150" stroke="#888" strokeWidth="1"/>
            <text x="40" y="155" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Leave</text>
            <path d="M20,168 Q20,164 24,164 L31,164 Q35,164 35,168 L35,175 Q35,179 31,179 L26,179 L23,182 L23,179 Q20,179 20,175 Z" fill="none" stroke="#888" strokeWidth="1.5"/>
            <text x="40" y="176" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Announcement</text>
            <rect x="20" y="190" width="13" height="13" rx="2" fill="none" stroke="#888" strokeWidth="1.5"/>
            <rect x="23" y="193" width="7" height="2" rx="1" fill="#888"/><rect x="23" y="198" width="5" height="2" rx="1" fill="#888"/>
            <text x="40" y="201" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Organisation</text>
            <path d="M21,213 L21,226 Q21,227.5 22.5,227.5 L32.5,227.5 Q34,227.5 34,226 L34,217.5 L30,213 Z" fill="none" stroke="#888" strokeWidth="1.5"/>
            <polyline points="30,213 30,217.5 34,217.5" fill="none" stroke="#888" strokeWidth="1.5"/>
            <text x="40" y="224" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">File</text>
            <circle cx="27" cy="244" r="5" fill="none" stroke="#888" strokeWidth="1.5"/>
            <circle cx="27" cy="244" r="2" fill="#888"/>
            <text x="40" y="248" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Settings</text>
            <path d="M20,267 L20,277 Q20,279 22,279 L28,279" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
            <polyline points="26,276 30,279 26,282" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="40" y="276" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Logout</text>
            <text x="16" y="648" fontFamily="Instrument Sans,sans-serif" fontSize="8.5" fill="#ccc">Powered by TechTorch | © 2026</text>
            <rect x="210" y="0" width="750" height="660" fill="#eef2f8"/>
            <rect x="210" y="0" width="750" height="68" fill="#ffffff"/>
            <text x="228" y="28" fontFamily="Sora,sans-serif" fontSize="19" fontWeight="700" fill="#111">Dashboard</text>
            <text x="228" y="46" fontFamily="Instrument Sans,sans-serif" fontSize="11" fill="#888">Welcome back, Ashish · ENG01</text>
            <rect x="790" y="14" width="70" height="26" rx="13" fill="#f4eef8"/>
            <circle cx="803" cy="27" r="4" fill="none" stroke={P} strokeWidth="1.5"/>
            <circle cx="803" cy="26" r="1.5" fill={P}/>
            <path d="M803,30 L803,33" stroke={P} strokeWidth="1.5" strokeLinecap="round"/>
            <text x="812" y="31" fontFamily="Instrument Sans,sans-serif" fontSize="9.5" fill="#555">Bareilly</text>
            <path d="M868,18 Q868,13 873,13 Q878,13 878,18 L878,24 L881,27 L865,27 L868,24 Z" fill="none" stroke="#555" strokeWidth="1.5"/>
            <path d="M871,27 Q871,30 873,30 Q875,30 875,27" fill="none" stroke="#555" strokeWidth="1.5"/>
            <circle cx="879" cy="15" r="3" fill="#CD166E"/>
            <circle cx="910" cy="27" r="18" fill={P}/>
            <text x="910" y="32" fontFamily="Sora,sans-serif" fontSize="11" fontWeight="700" fill="white" textAnchor="middle">AG</text>
            <line x1="210" y1="68" x2="960" y2="68" stroke="#e8e2ee" strokeWidth="1"/>
            <rect x="224" y="80" width="712" height="58" rx="10" fill={P}/>
            <circle cx="880" cy="82" r="55" fill="rgba(255,255,255,0.04)"/>
            <circle cx="910" cy="118" r="42" fill="rgba(255,255,255,0.04)"/>
            <text x="242" y="102" fontFamily="Instrument Sans,sans-serif" fontSize="9" fontWeight="600" fill="rgba(255,255,255,0.6)" letterSpacing="1.5">THURSDAY</text>
            <text x="242" y="124" fontFamily="Sora,sans-serif" fontSize="22" fontWeight="700" fill="white">7 May 2026</text>
            <rect x="856" y="92" width="68" height="30" rx="15" fill="white"/>
            <text x="890" y="112" fontFamily="Instrument Sans,sans-serif" fontSize="10.5" fontWeight="600" fill={P} textAnchor="middle">Check In</text>
            <rect x="224" y="149" width="196" height="3" rx="1.5" fill={P}/>
            <rect x="224" y="152" width="196" height="156" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1"/>
            <text x="236" y="170" fontFamily="Instrument Sans,sans-serif" fontSize="9" fontWeight="600" fill="#999" letterSpacing="0.5">Employee</text>
            <rect x="236" y="178" width="28" height="28" rx="7" fill={P}/>
            <text x="250" y="197" fontFamily="Sora,sans-serif" fontSize="10" fontWeight="700" fill="white" textAnchor="middle">AG</text>
            <text x="272" y="193" fontFamily="Sora,sans-serif" fontSize="12" fontWeight="700" fill="#111">Ashish gangwar</text>
            <text x="272" y="206" fontFamily="Instrument Sans,sans-serif" fontSize="10" fill="#888">Sde</text>
            <rect x="236" y="216" width="38" height="16" rx="8" fill="#f0e8f0"/>
            <text x="255" y="228" fontFamily="Instrument Sans,sans-serif" fontSize="7.5" fontWeight="600" fill={P} textAnchor="middle">ENG01</text>
            <rect x="280" y="216" width="36" height="16" rx="8" fill="#d4f5e9"/>
            <text x="298" y="228" fontFamily="Instrument Sans,sans-serif" fontSize="7.5" fontWeight="600" fill="#1a7a4a" textAnchor="middle">Active</text>
            <rect x="322" y="216" width="28" height="16" rx="8" fill="#e8f0ff"/>
            <text x="336" y="228" fontFamily="Instrument Sans,sans-serif" fontSize="7.5" fontWeight="600" fill="#2a5fc4" textAnchor="middle">ENG</text>
            <circle cx="240" cy="248" r="4" fill="#f0e8f0"/>
            <text x="248" y="252" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="#555">ashishgangwar009@gmail.com</text>
            <circle cx="240" cy="264" r="4" fill="#f0e8f0"/>
            <text x="248" y="268" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="#555">+917017415604</text>
            <rect x="236" y="278" width="80" height="14" rx="4" fill="#f9f0f5"/>
            <text x="276" y="288" fontFamily="Instrument Sans,sans-serif" fontSize="7.5" fill={P} textAnchor="middle">View Profile →</text>
            <rect x="428" y="149" width="162" height="3" rx="1.5" fill="#4a90d9"/>
            <rect x="428" y="152" width="162" height="156" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1"/>
            <text x="440" y="170" fontFamily="Instrument Sans,sans-serif" fontSize="9" fontWeight="600" fill="#999" letterSpacing="0.5">Date of joining</text>
            <circle cx="509" cy="213" r="30" fill="none" stroke="#f0e8f0" strokeWidth="4"/>
            <circle cx="509" cy="213" r="30" fill="none" stroke={P} strokeWidth="4" strokeDasharray="6 182" strokeLinecap="round" transform="rotate(-90 509 213)"/>
            <text x="509" y="210" fontFamily="Sora,sans-serif" fontSize="15" fontWeight="800" fill={P} textAnchor="middle">0.0</text>
            <text x="509" y="224" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="#aaa" textAnchor="middle">yrs</text>
            <circle cx="479" cy="213" r="2.5" fill={P} opacity="0.3"/>
            <circle cx="509" cy="183" r="2.5" fill="#4a90d9"/>
            <text x="440" y="258" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="#aaa" letterSpacing="0.5">JOINED ON</text>
            <text x="440" y="270" fontFamily="Sora,sans-serif" fontSize="10.5" fontWeight="700" fill="#111">6 May 2026</text>
            <text x="440" y="283" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="#aaa" letterSpacing="0.5">EXPERIENCE</text>
            <text x="440" y="294" fontFamily="Sora,sans-serif" fontSize="10" fontWeight="600" fill="#111">0 yrs 0 mo</text>
            <text x="508" y="270" fontFamily="Instrument Sans,sans-serif" fontSize="7.5" fill="#aaa">NEXT MILESTONE</text>
            <text x="508" y="284" fontFamily="Instrument Sans,sans-serif" fontSize="8.5" fontWeight="600" fill="#4a90d9">1yr — May 2027</text>
            <rect x="440" y="298" width="134" height="3" rx="2" fill="#f0e8f0"/>
            <rect x="440" y="298" width="3" height="3" rx="2" fill={P}/>
            <rect x="598" y="149" width="168" height="3" rx="1.5" fill="#2ec27e"/>
            <rect x="598" y="152" width="168" height="156" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1"/>
            <text x="610" y="170" fontFamily="Instrument Sans,sans-serif" fontSize="9" fontWeight="600" fill="#999" letterSpacing="0.5">Leave overview</text>
            <text x="605" y="194" fontFamily="Sora,sans-serif" fontSize="20" fontWeight="800" fill="#2ec27e">15</text>
            <text x="643" y="192" fontFamily="Instrument Sans,sans-serif" fontSize="10" fill="#555">EL remaining</text>
            <text x="610" y="213" fontFamily="Instrument Sans,sans-serif" fontSize="8.5" fill="#888">Accrued this month:</text>
            <text x="610" y="225" fontFamily="Sora,sans-serif" fontSize="9.5" fontWeight="700" fill="#111">1.25 days</text>
            <rect x="610" y="235" width="56" height="4.5" rx="2.5" fill={P}/>
            <rect x="671" y="235" width="44" height="4.5" rx="2.5" fill="#4a90d9"/>
            <rect x="720" y="235" width="34" height="4.5" rx="2.5" fill="#f0a030"/>
            <rect x="610" y="247" width="6" height="6" rx="1.5" fill={P}/>
            <text x="620" y="254" fontFamily="Instrument Sans,sans-serif" fontSize="7.5" fill="#555">EL (15 left)</text>
            <rect x="658" y="247" width="6" height="6" rx="1.5" fill="#4a90d9"/>
            <text x="668" y="254" fontFamily="Instrument Sans,sans-serif" fontSize="7.5" fill="#555">SL (12 left)</text>
            <rect x="720" y="247" width="6" height="6" rx="1.5" fill="#f0a030"/>
            <text x="730" y="254" fontFamily="Instrument Sans,sans-serif" fontSize="7.5" fill="#555">PL (0)</text>
            <line x1="610" y1="263" x2="756" y2="263" stroke="#f0e8f0" strokeWidth="1"/>
            <text x="610" y="277" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="#888">Balance as of today</text>
            <text x="756" y="277" fontFamily="Sora,sans-serif" fontSize="10" fontWeight="700" fill={P} textAnchor="end">15.0</text>
            <text x="610" y="292" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="#aaa">0 taken · 15 remaining</text>
            <rect x="774" y="152" width="162" height="156" rx="10" fill={P}/>
            <circle cx="890" cy="158" r="52" fill="rgba(255,255,255,0.05)"/>
            <circle cx="920" cy="285" r="44" fill="rgba(255,255,255,0.04)"/>
            <text x="786" y="170" fontFamily="Instrument Sans,sans-serif" fontSize="9" fontWeight="600" fill="rgba(255,255,255,0.6)" letterSpacing="0.5">Reporting manager</text>
            <line x1="774" y1="176" x2="936" y2="176" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            <circle cx="800" cy="203" r="15" fill="rgba(255,255,255,0.18)"/>
            <text x="800" y="208" fontFamily="Sora,sans-serif" fontSize="10" fontWeight="700" fill="white" textAnchor="middle">AG</text>
            <text x="820" y="199" fontFamily="Sora,sans-serif" fontSize="12" fontWeight="700" fill="white">Ashish gangwar</text>
            <text x="820" y="213" fontFamily="Instrument Sans,sans-serif" fontSize="9.5" fill="rgba(255,255,255,0.6)">manager</text>
            <line x1="786" y1="226" x2="928" y2="226" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
            <text x="786" y="240" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="rgba(255,255,255,0.5)">Manager ID</text>
            <text x="928" y="240" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="rgba(255,255,255,0.4)" textAnchor="end">—</text>
            <text x="786" y="254" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="rgba(255,255,255,0.5)">Work email</text>
            <text x="786" y="266" fontFamily="Instrument Sans,sans-serif" fontSize="8.5" fill="rgba(255,255,255,0.85)">ashishgangwar009@gmail.com</text>
            <text x="786" y="280" fontFamily="Instrument Sans,sans-serif" fontSize="8" fill="rgba(255,255,255,0.5)">Work phone</text>
            <text x="786" y="294" fontFamily="Instrument Sans,sans-serif" fontSize="8.5" fill="rgba(255,255,255,0.85)">—</text>
            <rect x="224" y="318" width="496" height="330" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1"/>
            <text x="240" y="340" fontFamily="Sora,sans-serif" fontSize="14" fontWeight="700" fill="#111">Attendance</text>
            <rect x="618" y="327" width="64" height="26" rx="6" fill="#f4eef8"/>
            <text x="636" y="344" fontFamily="Instrument Sans,sans-serif" fontSize="10" fill={P}>May</text>
            <polyline points="651,337 655,342 659,337" fill="none" stroke={P} strokeWidth="1.5"/>
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <text key={i} x={252+i*64} y="368" fontFamily="Instrument Sans,sans-serif" fontSize="10" fontWeight="600" fill="#ccc" textAnchor="middle">{d}</text>
            ))}
            <line x1="232" y1="374" x2="710" y2="374" stroke="#f5f0f5" strokeWidth="1"/>
            {[{col:4,day:1},{col:5,day:2}].map(({col,day}) => (
              <g key={day}>
                <rect x={220+col*64} y="382" width="54" height="46" rx="8" fill="#fce8f0"/>
                <text x={247+col*64} y="408" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="500" fill={P} textAnchor="middle">{day}</text>
              </g>
            ))}
            {[3,4,5,6,7,8,9].map((day,i) => {
              const isToday = day===7; const marked = [3,4,5,6].includes(day)
              return (
                <g key={day}>
                  <rect x={220+i*64} y={436} width="54" height="46" rx="8" fill={marked?'#fce8f0':isToday?'#fffbe6':'white'} stroke={isToday?'#e6c030':'none'} strokeWidth={isToday?'2':'0'}/>
                  <text x={247+i*64} y={462} fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight={isToday?'700':'400'} fill={marked?P:isToday?'#b8860b':'#ccc'} textAnchor="middle">{day}</text>
                </g>
              )
            })}
            {[10,11,12,13,14,15,16].map((day,i) => (
              <g key={day}><rect x={220+i*64} y={490} width="54" height="46" rx="8" fill="white"/><text x={247+i*64} y={516} fontFamily="Instrument Sans,sans-serif" fontSize="13" fill="#ccc" textAnchor="middle">{day}</text></g>
            ))}
            {[17,18,19,20,21,22,23].map((day,i) => (
              <g key={day}><rect x={220+i*64} y={544} width="54" height="46" rx="8" fill="white"/><text x={247+i*64} y={570} fontFamily="Instrument Sans,sans-serif" fontSize="13" fill="#ccc" textAnchor="middle">{day}</text></g>
            ))}
            {[24,25,26,27,28,29,30].map((day,i) => (
              <g key={day}><rect x={220+i*64} y={596} width="54" height="42" rx="8" fill="white"/><text x={247+i*64} y={621} fontFamily="Instrument Sans,sans-serif" fontSize="13" fill="#ccc" textAnchor="middle">{day}</text></g>
            ))}
            <rect x="728" y="318" width="208" height="330" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1"/>
            <text x="744" y="340" fontFamily="Sora,sans-serif" fontSize="14" fontWeight="700" fill="#111">Announcements</text>
            <rect x="890" y="328" width="28" height="20" rx="5" fill="#fff3e0"/>
            <text x="904" y="342" fontFamily="Sora,sans-serif" fontSize="11" fontWeight="700" fill="#f0a030" textAnchor="middle">0</text>
            <line x1="728" y1="352" x2="936" y2="352" stroke="#f0e8f0" strokeWidth="1"/>
            <text x="832" y="450" fontFamily="Instrument Sans,sans-serif" fontSize="11" fill="#ccc" textAnchor="middle">No announcements</text>
            <image href={PlantImage} x="750" y="440" width="150" height="275" preserveAspectRatio="xMidYMid meet"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ HERO
// Layout changes vs original:
//   - padding: was '0px 40px 48px' — top was 0, bottom 48px
//     → now paddingTop: SP.section.lg (96px) + paddingBottom: SP.section.md (72px)
//     Hero gets the most generous vertical space on the page (Stripe/Linear pattern)
//   - inner Wrap handles horizontal gutter — no more hardcoded 40px
//   - hero-grid gap: 60px (unchanged from .hero-grid CSS class)
//   - copy block: maxWidth 520px (was uncapped) — prevents overly long lines
// ─────────────────────────────────────────────────────────────────────────────
function Hero() {
  const navigate = useNavigate();
  return (
    <section style={{
      background: '#fff',
      overflow: 'hidden',
      /* SP.section.lg top + SP.section.md bottom = 96px + 72px
         Hero breathes more at top (first impression) than bottom
         where Stats follows immediately */
      paddingTop: '80px',
      paddingBottom: SP.section.md,
    }}>
      <Wrap>
        <div style={{ display: 'grid', alignItems: 'center' }} className="hero-grid">

          {/* ── Left: copy block ─────────────────────────────────────────────
              maxWidth 520px caps line length — comfortable 60–70 char lines
              at desktop. Previously uncapped → text sprawled too wide.
          ── */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            style={{ maxWidth: '520px' }}
          ><h1
  style={{
    fontSize: 'clamp(1.8rem,5vw,4rem)',
    lineHeight: 1.08,
    marginBottom: '20px',
    fontFamily: 'Roboto, sans-serif',
    fontWeight: 500,
    color: '#111',
    letterSpacing: '-1px',
  }}
>
  Manage Your Workforce
  <br />
  With Smart <span style={{ color: P }}>HR Solutions</span>
</h1>

           <p
  style={{
    fontSize: 'clamp(0.9rem,1.8vw,1.1rem)',
    color: '#555',
    lineHeight: 1.75,
    marginBottom: '34px',
    fontFamily: 'Roboto, sans-serif',
    fontWeight: 400,
    maxWidth: '480px',
  }}
>
              Optimize every stage of the employee lifecycle with a robust and
              reliable Human Resource Management System.
            </p>

            {/* CTA row: gap 14px (SP.gap.tight + 2) — tight pairing */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              <button onClick={() => navigate('/signup')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: P, color: '#fff', fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600, padding: '13px 28px', borderRadius: 50, border: 'none', cursor: 'pointer', boxShadow: `0 8px 24px ${P}40`, transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = PH; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = P; e.currentTarget.style.transform = 'none' }}>
                Sign Up For Free Trial <FiArrowRight />
              </button>
              <a href="#expert"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `2px solid ${P}`, color: P, background: 'transparent', fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600, padding: '13px 28px', borderRadius: 50, textDecoration: 'none', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = PL; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none' }}>
                Talk To Expert
              </a>
            </div>
          </motion.div>

          {/* ── Right: dashboard mockup ───────────────────────────────────── */}
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            style={{ width: '100%', paddingBottom: 'clamp(15px,3vw,36px)', overflow: 'visible' }}>
            <DashboardMockup />
          </motion.div>
        </div>
      </Wrap>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ STATS
// Layout changes vs original:
//   - padding: was '40px 40px 60px' — top 40px, bottom 60px, hardcoded 40px gutter
//     → now paddingTop/Bottom: SP.section.sm (48px) via Wrap
//     Stats is a "bridge" section — intentionally tighter than full sections
//   - maxWidth: was 1280px inline → now handled by Wrap (same 1280px, consistent)
//   - gap: was 20px inline → now SP.gap.stat = '20px' (token)
// ─────────────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { icon: <BsPeopleFill size={22} />, num: '100+',  label: 'Happy customers of TorchX' },
    { icon: <FiBarChart2 size={22} />,  num: '1000+', label: 'No. of live demos' },
    { icon: <FiUsers size={22} />,      num: '10+',   label: 'Partners to collaborate' },
    { icon: <FiStar size={22} />,       num: '98%',   label: 'Customer satisfaction' },
  ]
  return (
    <section style={{
      background: '#fff',
      /* SP.section.sm = 48px — compact bridge between Hero and Features */
      paddingTop: SP.section.sm,
      paddingBottom: SP.section.sm,
    }}>
      <Wrap>
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          style={{ display: 'grid', gap: SP.gap.stat }} /* 20px */
          className="stats-grid"
        >
          {stats.map((s, i) => (
            <motion.div key={s.num}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.08 }} viewport={{ once: true }}
              style={{
                background: '#fff', borderRadius: 18,
                /* card padding: SP.card.padSm = 24px — compact for stat cards */
                padding: `${SP.card.padSm} ${SP.card.padSm}`,
                border: `1px solid ${PB}`, boxShadow: '0 2px 12px rgba(122,0,75,.06)',
                transition: 'all .3s', display: 'flex', alignItems: 'center',
                gap: SP.gap.inner, /* 16px between icon and text */
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 10px 32px ${P}1A`; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(122,0,75,.06)'; e.currentTarget.style.transform = 'none' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff' }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 28, fontFamily: 'Sora, sans-serif', fontWeight: 800, color: P, lineHeight: 1.1 }}>{s.num}</div>
                <div style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: D, lineHeight: 1.4, marginTop: 2 }}>{s.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Wrap>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ FEATURE CARD SUB-COMPONENTS
// Layout changes: card padding uses SP.card.pad (32px) instead of '24px 24px 16px'
// Inner card body uses SP.card.inner (16px) margin and padding
// ─────────────────────────────────────────────────────────────────────────────
function MiniSidebar() {
  const icons = [FiUser, FiMessageSquare, FiUsers, FiSettings, FiLogOut]
  return (
    <div style={{ width: 44, background: P, borderRadius: '12px 0 0 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 18, flexShrink: 0 }}>
      {icons.map((Icon, i) => <Icon key={i} style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 15 }} />)}
    </div>
  )
}

function AIRecruitmentCard() {
  const candidates = [
    { name: 'Baibhav Gangwar', role: 'UI/UX Designer',       pct: 96 },
    { name: 'Ashish Gangwar',  role: 'Full Stack Developer', pct: 92 },
    { name: 'Pawan Kumar',     role: 'Frontend Developer',   pct: 89 },
  ]
  return (
    <motion.div variants={cardVariant} whileHover={{ y: -10, boxShadow: '0 20px 40px rgba(122,0,75,0.15)' }}
      style={{ background: '#fff', border: `2px solid ${P}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 24px rgba(122,0,75,0.08)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
      {/* SP.card.pad = 32px top/sides, 16px bottom before inner mockup */}
      <div style={{ padding: `${SP.card.pad} ${SP.card.pad} ${SP.card.inner}` }}>
        <div style={{ width: 56, height: 56, background: PL, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <HiOutlineSparkles style={{ color: P, fontSize: 26 }} />
        </div>
        <h3 style={{ fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, margin: '0 0 8px' }}>AI Recruitment</h3>
        <p style={{ fontSize: 13, color: G, lineHeight: 1.65, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
          Find the right talent faster with AI-powered candidate screening, smart matching, and automated shortlisting.
        </p>
      </div>
      <motion.div style={{ margin: `0 ${SP.card.inner}`, background: PL, borderRadius: '12px 12px 0 0', overflow: 'hidden', display: 'flex', flex: 1 }}>
        <MiniSidebar />
        <div style={{ flex: 1, padding: '14px 12px 16px' }}>
          <div style={{ fontSize: 9, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Top Matched Candidates</div>
          {candidates.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: '#fff', borderRadius: 10, padding: '7px 10px', border: `1px solid ${PB}` }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${P}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FiUser style={{ color: P, fontSize: 12 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: D, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'DM Sans, sans-serif' }}>{c.role}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <div style={{ width: 42, height: 4, background: '#e8e0ec', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: '#00b050', borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#00b050', fontFamily: 'Instrument Sans, sans-serif' }}>{c.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      <div style={{ padding: `14px ${SP.card.pad}`, borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: P }}>Smart hiring. Better teams.</span>
        <div style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiArrowRight style={{ color: P, fontSize: 13 }} />
        </div>
      </div>
    </motion.div>
  )
}

function PerformanceCard() {
  return (
    <motion.div variants={cardVariant} whileHover={{ y: -10, boxShadow: '0 20px 40px rgba(122,0,75,0.15)' }}
      style={{ background: '#fff', border: `2px solid ${P}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 24px rgba(122,0,75,0.08)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
      <div style={{ padding: `${SP.card.pad} ${SP.card.pad} ${SP.card.inner}` }}>
        <div style={{ width: 56, height: 56, background: PL, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <BsGraphUp style={{ color: P, fontSize: 24 }} />
        </div>
        <h3 style={{ fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, margin: '0 0 8px' }}>Performance Reviews</h3>
        <p style={{ fontSize: 13, color: G, lineHeight: 1.65, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
          Simplify performance evaluations with customizable reviews, goal tracking, and actionable feedback.
        </p>
      </div>
      <motion.div style={{ margin: `0 ${SP.card.inner}`, background: PL, borderRadius: '12px 12px 0 0', padding: '14px 14px 10px', flex: 1 }}>
        <div style={{ fontSize: 9, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Performance Overview</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ minWidth: 80 }}>
            <div style={{ fontSize: 9, color: '#aaa', fontFamily: 'DM Sans, sans-serif', marginBottom: 2 }}>Avg Rating</div>
            <div style={{ fontSize: 30, fontFamily: 'Sora, sans-serif', fontWeight: 800, color: D, lineHeight: 1, marginBottom: 3 }}>4.6</div>
            <div style={{ color: P, fontSize: 13, letterSpacing: 1 }}>★★★★★</div>
          </div>
          <div style={{ flex: 1, height: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsRadar data={radarData} margin={{ top: 6, right: 10, bottom: 6, left: 10 }}>
                <PolarGrid stroke="#e8d0de" strokeWidth={0.8} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 7, fill: '#aaa', fontFamily: 'DM Sans, sans-serif' }} />
                <Radar dataKey="value" name="Score" stroke={P} fill={P} fillOpacity={0.15} strokeWidth={1.8} dot={{ r: 3, fill: P, strokeWidth: 1.5, stroke: '#fff' }} />
              </RechartsRadar>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, padding: '8px 10px', border: `1px solid ${PB}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', color: G, fontWeight: 600 }}>Goals Achieved</span>
            <span style={{ fontSize: 10, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: P }}>82%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: '#e8d8e8', borderRadius: 6 }}>
            <div style={{ width: '82%', height: '100%', background: P, borderRadius: 6 }} />
          </div>
        </div>
      </motion.div>
      <div style={{ padding: `14px ${SP.card.pad}`, borderTop: `2px solid ${P}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: P }}>Evaluate. Improve. Grow.</span>
        <div style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiArrowRight style={{ color: P, fontSize: 13 }} />
        </div>
      </div>
    </motion.div>
  )
}

function EmployeePortalCard() {
  const quickActions = [
    { icon: <FiUser />,     label: 'My\nProfile'   },
    { icon: <FiBell />,     label: 'Company\nNews' },
    { icon: <FiFileText />, label: 'My\nDocs'      },
    { icon: <FiUsers />,    label: 'Leave\nReqs'   },
  ]
  return (
    <motion.div variants={cardVariant} whileHover={{ y: -10, boxShadow: '0 20px 40px rgba(122,0,75,0.15)' }}
      style={{ background: '#fff', border: `2px solid ${P}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 24px rgba(122,0,75,0.08)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
      <div style={{ padding: `${SP.card.pad} ${SP.card.pad} ${SP.card.inner}` }}>
        <div style={{ width: 56, height: 56, background: PL, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <BsPersonBadge style={{ color: P, fontSize: 26 }} />
        </div>
        <h3 style={{ fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, margin: '0 0 8px' }}>Employee Portal</h3>
        <p style={{ fontSize: 13, color: G, lineHeight: 1.65, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
          Empower employees with a self-service portal for profiles, documents, requests, and company updates.
        </p>
      </div>
      <motion.div style={{ margin: `0 ${SP.card.inner}`, background: PL, borderRadius: '12px 12px 0 0', overflow: 'hidden', display: 'flex', flex: 1 }}>
        <MiniSidebar />
        <div style={{ flex: 1, padding: '12px 10px 14px' }}>
          <div style={{ fontSize: 11, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, marginBottom: 10 }}>Welcome back, Baibhav!</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            {quickActions.map(item => (
              <div key={item.label} style={{ background: '#fff', borderRadius: 10, padding: '7px 5px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: `1px solid ${PB}` }}>
                <div style={{ color: P, fontSize: 15 }}>{item.icon}</div>
                <div style={{ fontSize: 8, fontFamily: 'Instrument Sans, sans-serif', color: P, lineHeight: 1.3, fontWeight: 600, whiteSpace: 'pre-line' }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 10, padding: '7px 9px', marginBottom: 6, border: `1px solid ${PB}` }}>
            <div style={{ fontSize: 8, color: '#aaa', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, marginBottom: 2 }}>Upcoming Leave</div>
            <div style={{ fontSize: 10, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D }}>15 – 18 May 2024</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 10, padding: '7px 9px', border: `1px solid ${PB}` }}>
            <div style={{ fontSize: 8, color: '#aaa', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, marginBottom: 5 }}>Team Birthday 🎂</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FiUser style={{ color: '#fff', fontSize: 11 }} />
              </div>
              <div>
                <div style={{ fontSize: 9, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D }}>Baibhav Gangwar</div>
                <div style={{ fontSize: 7.5, color: '#bbb', fontFamily: 'DM Sans, sans-serif' }}>May 05</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <div style={{ padding: `14px ${SP.card.pad}`, borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: P }}>Everything you need, in one place.</span>
        <div style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiArrowRight style={{ color: P, fontSize: 13 }} />
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ FEATURES SECTION
// Layout changes vs original:
//   - padding: was '100px 40px' hardcoded → SP.section.lg (96px) + Wrap gutter
//   - section headline margin-bottom: was 64px → SP.headingGap (64px) — same but tokenized
//   - grid gap: was 28px inline → SP.gap.card via CSS class
//   - maxWidth: was 1280px inline → handled by Wrap
// ─────────────────────────────────────────────────────────────────────────────
function Features() {
  return (
    <section id="features" style={{
      background: '#F8F5F7',
      fontFamily: 'DM Sans, sans-serif',
      /* SP.section.lg = 96px — full section tier */
      paddingTop: SP.section.lg,
      paddingBottom: SP.section.lg,
    }}>
      <Wrap>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>

          {/* Section heading block: mb = SP.headingGap (64px) */}
          <div style={{ textAlign: 'center', marginBottom: SP.headingGap }}>
            <h2 style={{
              fontSize: 'clamp(42px,5vw,52px)',
              fontFamily: 'Roboto, sans-serif', fontWeight: 500,
              color: D, lineHeight: 1.1,
              margin: `0 0 ${SP.section.xs}`, /* 24px between h2 and p */
            }}>
              Powerful <span style={{ color: P }}>Features</span><br />Built for <span style={{ color: P }}>Modern</span> Teams
            </h2>
            <p style={{ fontSize: 20, color: '#555', lineHeight: 1.6, maxWidth: 700, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
              Everything you need to hire smarter, evaluate better, and empower your employees.
            </p>
          </div>

          {/* feat-section-grid: gap = SP.gap.card (28px) via CSS class */}
          <motion.div className="feat-section-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
            <AIRecruitmentCard />
            <PerformanceCard />
            <EmployeePortalCard />
          </motion.div>
        </motion.div>
      </Wrap>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ PRICING
// Layout changes vs original:
//   - padding: was '80px 40px' → SP.section.lg (96px) + Wrap gutter
//   - heading mb: was 56px → SP.headingGap (64px) for consistency with Features
//   - pricing-grid gap: was 24px → SP.gap.card (28px) — consistent with feat-grid
//   - badge-grid gap: was 16px → SP.gap.inner (16px) — same, now tokenized
//   - storage banner, badge grid, expert banner: 
//     gap between them = SP.section.xs (24px) instead of marginBottom:22px
//   - card padding: was '36px 30px' → SP.card.pad (32px) all around — unified
// ─────────────────────────────────────────────────────────────────────────────
function Pricing() {
  const plans = [
    { name: 'Startup',    desc: 'Perfect for small teams getting started',                       price: '₹109', features: ['Employee database','Attendance tracking','Leave management','Basic payroll','Employee self-service portal','Email support'] },
    { name: 'Business',   desc: 'For growing businesses that need more. Everything in Starter +', price: '₹249', popular: true, features: ['Recruitment / Applicant tracking','Performance management','Advanced payroll','Custom policies/workflows','Reports & analytics','Priority support'] },
    { name: 'Enterprise', desc: 'Ultimate power and flexibility. Everything in Growth +',         price: '₹499', features: ['Multi-company support','Role-based permissions','SSO','API access','Custom integrations','Dedicated account manager'] },
  ]
  const badges = [
    { icon: <FiShield size={20} />,   label: 'Secure & Compliant', desc: 'Enterprise-grade security with regular backups.' },
    { icon: <FiLink size={20} />,     label: 'Easy Integration',   desc: 'Seamlessly integrates with your favorite tools.' },
    { icon: <FiActivity size={20} />, label: '99.9% Uptime',       desc: 'Reliable performance you can count on.' },
    { icon: <FiBookOpen size={20} />, label: 'Free Onboarding',    desc: 'We help you and your team get started.' },
  ]
  return (
    <section id="pricing" style={{
      background: '#fff',
      paddingTop: SP.section.lg,   /* 96px */
      paddingBottom: SP.section.lg,
    }}>
      <Wrap>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>

          {/* Heading: mb = SP.headingGap (64px) — same as Features */}
          <div style={{ textAlign: 'center', marginBottom: SP.headingGap }}>
            <h2 style={{
              fontSize: 'clamp(28px,3.2vw,42px)',
              fontFamily: 'Roboto, sans-serif', fontWeight: 500,
              color: D, margin: `0 0 ${SP.section.xs}`, /* 24px */
            }}>
              Simple, Transparent <span style={{ color: P }}>Pricing</span><br />That Grows With You
            </h2>
            <p style={{ fontSize: 18, fontFamily: 'DM Sans, sans-serif', color: G, maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
              Choose the perfect plan for your team. Upgrade or downgrade anytime as your needs change.
            </p>
          </div>

          {/* Pricing cards: paddingTop 20px offset for popular badge overlap */}
          <div style={{ display: 'grid', gap: SP.gap.card, alignItems: 'center', marginBottom: SP.section.xs, paddingTop: '20px' }} className="pricing-grid">
            {plans.map(p => (
              <div key={p.name}
                className={`pricing-card${p.popular ? ' pricing-card-popular' : ''}`}
                style={{ position: 'relative', borderRadius: 24, padding: SP.card.pad, display: 'flex', flexDirection: 'column', gap: SP.gap.stat, background: '#fff', border: `2px solid ${P}`, boxShadow: 'none' }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                    <span style={{ background: P, color: '#fff', fontSize: 11, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, padding: '6px 20px', borderRadius: 50, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>Most Popular</span>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#999', lineHeight: 1.5 }}>{p.desc}</div>
                </div>
                <div>
                  <span style={{ fontSize: 38, fontFamily: 'Sora, sans-serif', fontWeight: 800, color: D }}>{p.price}</span>
                  <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#aaa', marginLeft: 4 }}>/user/mo</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: G }}>
                      <FiCheck style={{ color: P, flexShrink: 0, marginTop: 2 }} />{f}
                    </li>
                  ))}
                </ul>
                <button style={{ marginTop: 'auto', width: '100%', padding: '12px 0', borderRadius: 50, fontSize: 14, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, cursor: 'pointer', background: P, color: '#fff', border: 'none', transition: 'all .2s' }}>
                  Start Free Trial
                </button>
              </div>
            ))}
          </div>

          {/* Storage banner: mb = SP.section.xs (24px) */}
          <div style={{ background: PL, borderRadius: 20, padding: `${SP.card.padSm} ${SP.card.pad}`, marginBottom: SP.section.xs, border: `2px solid ${P}` }}>
            <div style={{ display: 'grid', gap: SP.gap.inner, alignItems: 'center' }} className="storage-grid">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FiHardDrive style={{ color: P, fontSize: 22, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D }}>Storage Guidance</div>
                  <div style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#aaa', lineHeight: 1.4 }}>Finance documents, invoices, receipts, ledgers grow fast.</div>
                </div>
              </div>
              {[{ label: 'Startup', val: '2 GB' }, { label: 'Business', val: '20 GB' }, { label: 'Enterprise', val: '100 GB' }].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontFamily: 'Sora, sans-serif', fontWeight: 800, color: D }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'DM Sans', marginBottom: 4 }}>Per company</div>
                  <span style={{ fontSize: 10, background: '#fff', color: P, fontWeight: 700, padding: '3px 14px', borderRadius: 20, border: `1px solid ${PB}`, fontFamily: 'Instrument Sans' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Badge grid: gap = SP.gap.inner (16px), mb = SP.section.xs (24px) */}
          <div style={{ display: 'grid', gap: SP.gap.inner, marginBottom: SP.section.xs }} className="badge-grid">
            {badges.map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: `${SP.card.inner} 18px`, background: PL, borderRadius: 16, border: `1px solid ${PB}` }}>
                <div style={{ color: P, flexShrink: 0, marginTop: 2 }}>{b.icon}</div>
                <div>
                  <div style={{ fontSize: 12, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, marginBottom: 3 }}>{b.label}</div>
                  <div style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#aaa', lineHeight: 1.5 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Expert banner: padding = SP.card.padSm (24px) SP.card.pad (32px) */}
          <div style={{ background: PL, borderRadius: 20, padding: `${SP.card.padSm} ${SP.card.pad}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: SP.gap.inner, border: `1px solid ${PB}` }} className="expert-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, background: `${P}18`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HiOutlineSparkles style={{ color: P, fontSize: 20 }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D }}>Not sure which plan is right for you?</div>
                <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#aaa' }}>Our experts can help you choose the perfect plan based on your requirements.</div>
              </div>
            </div>
            <a href="#expert" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: P, color: '#fff', fontSize: 13, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, padding: '12px 24px', borderRadius: 50, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background .2s' }}
              onMouseEnter={e => e.currentTarget.style.background = PH}
              onMouseLeave={e => e.currentTarget.style.background = P}>
              Talk to an Expert <FiArrowRight />
            </a>
          </div>
        </motion.div>
      </Wrap>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ TESTIMONIALS
// Layout changes vs original:
//   - padding: was '80px 40px' → SP.section.lg (96px) + Wrap gutter
//   - maxWidth: was 1100px → SP.maxW (1280px) via Wrap for alignment consistency
//     (1100px caused testimonials content to be narrower than all other sections)
//   - heading mb: was 52px → SP.headingGap (64px)
//   - testi-grid gap: was 20px → SP.gap.card (28px) for visual consistency with feat/pricing
//   - testimonial cards: padding 26px → SP.card.padSm (24px)
//   - CTA banner: padding '36px 40px' → SP.section.sm (48px) SP.card.pad (32px)
// ─────────────────────────────────────────────────────────────────────────────
function Testimonials() {
  const [active, setActive] = useState(1)
  const avatarGradients = [
    'linear-gradient(135deg, #740042)',
    'linear-gradient(135deg, #740042)',
    'linear-gradient(135deg, #740022)',
  ]
  const testimonials = [
    { quote: 'TorchX has completely transformed our hiring process. The AI recruitment feature helps us find the right talent faster and with better accuracy.', name: 'Alexa', role: 'HR Manager', co: 'LOGOIPSUM', initials: 'AL', grad: avatarGradients[0] },
    { quote: 'The employee portal is a game changer! Our team loves the easy access to documents, requests, and updates all in one place.', name: 'Anaya Varma', role: 'HR Director', co: 'LOGOIPSUM', initials: 'AV', grad: avatarGradients[1] },
    { quote: 'Performance reviews are now simple, transparent, and data-driven. TorchX helps us build a culture of continuous feedback and growth.', name: 'Rohan Sharma', role: 'People Operations Lead', co: 'LOGOIPSUM', initials: 'RS', grad: avatarGradients[2] },
  ]
  return (
    <section id="testimonials" style={{
      background: '#F6EDF2',
      fontFamily: 'DM Sans, sans-serif',
      paddingTop: SP.section.lg,   /* 96px */
      paddingBottom: SP.section.lg,
    }}>
      <Wrap>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>

          {/* Heading: mb = SP.headingGap (64px) */}
          <div style={{ textAlign: 'center', marginBottom: SP.headingGap }}>
            <h2 style={{
              fontSize: 'clamp(26px,3.2vw,40px)',
              fontFamily: 'Roboto, sans-serif', fontWeight: 500,
              color: '#111111', margin: `0 0 ${SP.section.xs}`, lineHeight: 1.2,
            }}>
              Loved by <span style={{ color: P }}>Teams</span>, Trusted by <span style={{ color: P }}>Leaders</span>
            </h2>
            <p style={{ fontSize: 18, color: '#555555', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
              See how organizations like yours are using TorchX to streamline HR and achieve more every day.
            </p>
          </div>

          {/* Testimonial cards: gap = SP.gap.card (28px), mb = SP.section.sm (48px) */}
          <div style={{ display: 'grid', gap: SP.gap.card, marginBottom: SP.section.sm }} className="testi-grid">
            {testimonials.map((t, i) => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.1 }} viewport={{ once: true }}
                className="testi-card"
                style={{
                  background: '#ffffff', border: '1px solid #DDB7CB', borderRadius: 14,
                  padding: SP.card.padSm, /* 24px — replaces '26px' */
                  boxShadow: i === active ? '0 10px 24px rgba(122,0,75,0.15)' : '0 6px 18px rgba(122,0,75,0.08)',
                  transform: i === active ? 'translateY(-4px)' : 'none',
                  display: 'flex', flexDirection: 'column'
                }}>
                <div style={{ fontSize: 48, fontFamily: 'Sora, sans-serif', fontWeight: 900, color: P, lineHeight: 0.7, marginBottom: 14 }}>"</div>
                <p style={{ fontSize: 13, color: '#333333', lineHeight: 1.75, flex: 1, margin: `0 0 ${SP.gap.stat}` }}>{t.quote}</p> {/* 20px */}
                <hr style={{ border: 'none', borderTop: '1px solid #E6D6DF', marginBottom: SP.gap.inner }} /> {/* 16px */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(122,0,75,0.25)' }}>
                    <span style={{ color: '#fff', fontSize: 12, fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>{t.initials}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: P }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#777777', marginTop: 2 }}>{t.role}</div>
                  </div>
                  <div style={{ fontSize: 9, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', borderLeft: '1px solid #E6D6DF', paddingLeft: 10 }}>{t.co}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination dots: mb = SP.section.sm (48px) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: SP.section.sm }}>
            <button onClick={() => setActive((active - 1 + testimonials.length) % testimonials.length)}
              style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #DDB7CB', background: 'transparent', color: P, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setActive(i)} style={{ width: i === active ? 26 : 8, height: 8, borderRadius: 10, border: 'none', cursor: 'pointer', background: i === active ? P : '#E7D6DF', padding: 0, transition: 'all .3s' }} />
              ))}
            </div>
            <button onClick={() => setActive((active + 1) % testimonials.length)}
              style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #DDB7CB', background: 'transparent', color: P, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
          </div>

          {/* CTA banner: padding SP.section.sm (48px) SP.card.pad (32px) */}
          <div className="testimonial-cta"
            style={{
              flexWrap: 'wrap', width: '100%',
              background: 'linear-gradient(135deg, #FFF7FA 0%, #F9EAF2 100%)',
              border: '1px solid #E7CCD9', borderRadius: 22,
              /* 48px top/bottom, 32px left/right — generous but proportional */
              padding: `${SP.section.sm} ${SP.card.pad}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: SP.gap.stat, /* 20px */
              boxShadow: '0 10px 30px rgba(122,0,75,0.08)',
              transition: 'all .35s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(122,0,75,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(122,0,75,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SP.gap.inner }}>
              <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #7A004B, #B00068)', boxShadow: '0 8px 20px rgba(122,0,75,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HiOutlineSparkles style={{ color: '#fff', fontSize: 22 }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#2A1120', marginBottom: 4 }}>Join 100+ companies growing with TorchX</div>
                <div style={{ fontSize: 13, color: '#666666' }}>Powerful HR tools. Happy teams. Better results.</div>
              </div>
            </div>
            <a href="#trial"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #7A004B, #A60062)', color: '#fff', fontSize: 13, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, padding: '14px 26px', borderRadius: 12, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all .3s ease', boxShadow: '0 8px 20px rgba(122,0,75,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 30px rgba(122,0,75,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(122,0,75,0.25)' }}>
              Book For Free Trial <FiArrowRight />
            </a>
          </div>
        </motion.div>
      </Wrap>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ LEGAL MODAL — unchanged content, padding uses SP tokens
// ─────────────────────────────────────────────────────────────────────────────
const legalDocs = {
  privacy: {
    title: 'Privacy Policy', effective: 'April 01, 2026',
    sections: [
      { heading:'Information We Collect', items:['Personal Information: Name, email address, phone number, billing information, company details, and account credentials.','Usage Information: IP address, browser type, device information, login activity, usage analytics, cookies and tracking information.','Customer Data: Any data uploaded, processed, or stored by customers while using our Services.'] },
      { heading:'How We Use Information', items:['Provide and maintain Services, process subscriptions and payments, improve platform performance.','Offer customer support, prevent fraud and abuse, send service-related notifications, and comply with legal obligations.'] },
      { heading:'Data Security & Sharing', items:['We implement commercially reasonable administrative, technical, and organizational safeguards to protect user data.','We do not sell personal data. We may share with payment processors, cloud hosting providers, analytics providers, and legal authorities when required by law.'] },
      { heading:'User Rights', items:['Users may request access, correction, deletion, or export of personal data.','Send requests to: privacy@torchxsuite.com'] },
      { heading:'Additional', items:['Data may be processed and stored outside your country subject to applicable laws.','Our Services are not intended for individuals under 18 years of age.','We reserve the right to modify this policy at any time. Contact: legal@torchxsuite.com'] },
    ],
  },
  terms: {
    title: 'Terms of Service', effective: 'April 01, 2026',
    sections: [
      { heading:'Eligibility & Account Responsibilities', items:['You must be legally capable of entering into binding agreements to use our Services.','Users are responsible for maintaining account confidentiality and all activities under their account.','You agree not to use Services unlawfully, attempt unauthorized access, reverse engineer the platform, or upload malicious software.'] },
      { heading:'Subscription & Billing', items:['Services are offered on subscription plans billed monthly, quarterly, or annually.','Payments are non-refundable unless stated otherwise in our Refund Policy.','Failure to pay may result in suspension or termination.'] },
      { heading:'Intellectual Property & Customer Data', items:['All platform software, branding, designs, content, APIs, workflows, and technology remain the exclusive property of the Company.','Customers retain ownership of their uploaded data. You grant us limited rights necessary to host, process, and operate the Services.'] },
      { heading:'Limitation of Liability & Termination', items:['We are not liable for indirect, incidental, or consequential damages. Total liability shall not exceed the amount paid during the previous 3 months.','Accounts may be suspended or terminated for violation of Terms, fraudulent activity, non-payment, or abuse of Services.'] },
      { heading:'Governing Law', items:['These Terms shall be governed by the laws of India.','Disputes shall be subject to the jurisdiction of courts located in Bareilly, Uttar Pradesh, India.','Contact: legal@torchxsuite.com'] },
    ],
  },
  cookie: {
    title: 'Cookie Policy', effective: 'April 01, 2026',
    sections: [
      { heading:'What Are Cookies?', items:['Cookies are small text files stored on your device to improve website functionality and user experience.'] },
      { heading:'Types of Cookies We Use', items:['Essential Cookies: Required for authentication, security, and core functionality.','Analytics Cookies: Help us understand platform usage and improve performance.','Preference Cookies: Remember user settings and preferences.','Marketing Cookies: Used for relevant communication and advertising where permitted.'] },
      { heading:'Managing Cookies', items:['Some third-party services integrated into our platform may place cookies subject to their own privacy policies.','Users can manage or disable cookies through browser settings. Disabling cookies may affect platform functionality.','We may update this Cookie Policy periodically.'] },
    ],
  },
  refund: {
    title: 'Refund Policy', effective: 'April 01, 2026',
    sections: [
      { heading:'Subscription Payments', items:['All subscription payments are generally non-refundable once billed.','Where trial access is provided, users are encouraged to evaluate the Services before purchasing.'] },
      { heading:'Exceptional Refunds', items:['Refunds may be considered for: duplicate payment, incorrect billing due to system error, or service unavailable for an extended verified duration caused solely by us.','Approved refunds are processed within 7–15 business days.'] },
      { heading:'Non-Refundable Situations', items:['Refunds will not be issued for partial usage, change of mind, failure to cancel before renewal, account suspension due to policy violations, or third-party service interruptions.'] },
      { heading:'Chargebacks', items:['Initiating fraudulent chargebacks without contacting support may result in immediate account suspension, permanent service restriction, and legal recovery actions where applicable.','Contact: accounts@torchxsuite.com'] },
    ],
  },
}

const modalStyles = `
  .torchx-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; }
  .torchx-modal { background:#fff; border-radius:14px; width:100%; max-width:720px; max-height:88vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,0.18); }
  .torchx-modal-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid #f0e6ec; }
  .torchx-modal-title { font-family:'DM Sans',sans-serif; font-size:16px; font-weight:600; color:#730042; margin:0; }
  .torchx-modal-close { width:32px; height:32px; border-radius:50%; border:none; background:#f5f5f5; color:#555; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.15s; }
  .torchx-modal-close:hover { background:#ececec; }
  .torchx-modal-body { overflow-y:auto; padding:24px; flex:1; }
  .torchx-modal-eff { font-family:'DM Sans',sans-serif; font-size:12px; color:#aaa; margin-bottom:20px; }
  .torchx-modal-section { margin-bottom:20px; }
  .torchx-modal-section-head { font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.6px; color:#730042; margin-bottom:10px; }
  .torchx-modal-item { display:flex; gap:10px; margin-bottom:8px; font-family:'DM Sans',sans-serif; font-size:13.5px; color:#444; line-height:1.6; }
  .torchx-modal-dot { width:5px; height:5px; background:#730042; border-radius:50%; margin-top:8px; flex-shrink:0; opacity:0.5; }
`

function LegalModal({ docKey, onClose }) {
  const doc = legalDocs[docKey]
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])
  return (
    <div className="torchx-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="torchx-modal">
        <div className="torchx-modal-header">
          <p className="torchx-modal-title">{doc.title}</p>
          <button className="torchx-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="torchx-modal-body">
          <p className="torchx-modal-eff">Effective Date: {doc.effective}</p>
          {doc.sections.map((sec,i) => (
            <div key={i} className="torchx-modal-section">
              <p className="torchx-modal-section-head">{sec.heading}</p>
              {sec.items.map((item,j) => (
                <div key={j} className="torchx-modal-item">
                  <span className="torchx-modal-dot"/>
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

// ─────────────────────────────────────────────────────────────────────────────
// ██ FOOTER
// Layout changes vs original:
//   - maxWidth: was 1100px → SP.maxW (1280px) via Wrap
//     This is the BIGGEST alignment bug in the original: footer was 180px
//     narrower than all other sections, creating a visible indent mismatch
//   - padding: was '60px 40px 0' → Wrap handles gutter, paddingTop: SP.section.sm (48px)
//   - footer-grid gap: was 40px → SP.gap.card + 12 = 40px (same, now via CSS class)
//   - bottom bar: padding '18px 40px' → Wrap with paddingTop: SP.gap.stat (20px)
// ─────────────────────────────────────────────────────────────────────────────
function Footer() {
  const FOOTER_BORDER = '#E2C9D6'
  const FOOTER_MUTED  = '#888888'
  const cols = [
    { title: 'Product',   links: ['Features', 'Pricing', 'Security', 'Roadmap', 'Status'] },
    { title: 'Solutions', links: ['Talent', 'Engage', 'Finance', 'Inventory', 'Pay'] },
    { title: 'Resources', links: ['Documentation', 'Api Reference', 'Guides', 'Blog', 'Community'] },
  ]
  const socials = [
    { icon: <FiLinkedin />, href: '#', label: 'LinkedIn' },
    { icon: <FiInstagram />, href: '#', label: 'Instagram' },
    { icon: <FiTwitter />, href: '#', label: 'Twitter' },
    { icon: <FiMail />, href: '#', label: 'Email' },
  ]
  const clickableLinks = { Features: '#features', Pricing: '#pricing' }
  const [activeDoc, setActiveDoc] = useState(null)

  return (
    <>
      <style>{modalStyles}</style>
      <footer style={{ background: '#F6EDF2', borderTop: `1px solid ${FOOTER_BORDER}`, fontFamily: 'DM Sans, sans-serif' }}>

        {/*
          ── Footer main: Wrap (1280px + clamp gutter)
          CRITICAL FIX: was maxWidth:1100px which caused footer content to be
          visually indented vs every other section's 1280px container.
          Now using Wrap → all sections share the same left/right walls.
          paddingTop: SP.section.sm (48px) — footer starts after a full breath
        */}
        <Wrap style={{ paddingTop: SP.section.sm, paddingBottom: 0 }}>
          <div style={{ display: 'grid', gap: '40px' }} className="footer-grid">

            {/* Logo + description */}
            <div>
              <img src={logo} alt="TorchX"
                style={{ height: 'clamp(36px,4vw,48px)', width: 'auto', objectFit: 'contain', display: 'block', marginBottom: 6 }} />
              <p style={{ fontSize: 15, color: '#444444', lineHeight: 1.75, margin: `0 0 ${SP.gap.stat}` }}>
                Hire smarter, faster, and with confidence using AI-powered talent solutions.
                Streamline recruitment, discover top candidates, and build high-performing teams effortlessly.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                {socials.map((s, i) => (
                  <a key={i} href={s.href} aria-label={s.label}
                    style={{ color: P, fontSize: 18, textDecoration: 'none', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .2s, color .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.color = PH }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.color = P }}>
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {cols.map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 24, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: P, marginBottom: SP.gap.inner }}>
                  {col.title}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {col.links.map(l => (
                    <li key={l}>
                      {clickableLinks[l] ? (
                        <a href={clickableLinks[l]} style={{ fontSize: 16, color: P, textDecoration: 'none', transition: 'color .2s' }}
                          onMouseEnter={e => e.currentTarget.style.color = PH}
                          onMouseLeave={e => e.currentTarget.style.color = P}>{l}</a>
                      ) : (
                        <span style={{ fontSize: 16, color: P, cursor: 'default' }}>{l}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Wrap>

        {/* Bottom bar: inside Wrap for gutter alignment, mt = SP.section.xs (24px) */}
        <Wrap style={{ paddingTop: SP.gap.stat, paddingBottom: SP.gap.stat }}>
          <div style={{ borderTop: `1px solid ${FOOTER_BORDER}`, paddingTop: SP.gap.stat, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ fontSize: 14, color: '#555555', margin: 0 }}>
              TorchX™ — A Product of Techtorch Solutions Private Limited.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
              {[
                { label: 'Privacy Policy', key: 'privacy' },
                { label: 'Terms of Service', key: 'terms' },
                { label: 'Cookie Policy', key: 'cookie' },
                { label: 'Refund Policy', key: 'refund' },
              ].map(item => (
                <span key={item.key} onClick={() => setActiveDoc(item.key)}
                  style={{ fontSize: 14, color: FOOTER_MUTED, cursor: 'pointer', transition: 'color .2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = P}
                  onMouseLeave={e => e.currentTarget.style.color = FOOTER_MUTED}>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </Wrap>

        {/* Final breath: SP.section.xs / 2 = 12px bottom padding */}
        <div style={{ height: '12px' }} />
      </footer>

      {activeDoc && <LegalModal docKey={activeDoc} onClose={() => setActiveDoc(null)} />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ██ ROOT EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style>{globalStyles}</style>
      <Navbar />
      <Hero />
      <Stats />
      <Divider />
      <Features />
      <Divider />
      <Pricing />
      <Divider />
      <Testimonials />
      <Footer />
    </>
  )
}