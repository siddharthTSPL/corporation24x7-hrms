import { useState, useEffect } from 'react'
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

// ── Brand tokens ──────────────────────────────────────────────
const P  = '#7A004B'
const PH = '#5a0033'
const PL = '#FDF4F8'
const PB = '#EAC7D7'
const D  = '#111111'
const G  = '#5C5C5C'

// ── Animation variants ────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
}

const stagger    = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
const cardVariant = {
  hidden: { opacity: 0, y: 40 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

// ── Recharts radar data ───────────────────────────────────────
const radarData = [
  { metric: 'Leadership',     value: 85 },
  { metric: 'Teamwork',       value: 72 },
  { metric: 'Quality',        value: 90 },
  { metric: 'Problem Solving',value: 68 },
  { metric: 'Communication',  value: 80 },
]

// ── Global styles ─────────────────────────────────────────────
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

  .nav-mobile-menu { overflow: hidden; animation: menuDrop .24s ease both; }
  @keyframes menuDrop {
    from { opacity: 0; transform: translateY(-8px); max-height: 0; }
    to   { opacity: 1; transform: translateY(0);    max-height: 360px; }
  }

  .hero-grid { grid-template-columns: minmax(0,.95fr) minmax(0,1.05fr); }
  .stats-grid  { grid-template-columns: repeat(4, minmax(0,1fr)); }
  .feat-grid   { grid-template-columns: repeat(3, minmax(0,1fr)); }
  .feat-section-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; }
  .pricing-grid  { grid-template-columns: repeat(3, minmax(0,1fr)); }
  .badge-grid    { grid-template-columns: repeat(4, minmax(0,1fr)); }
  .storage-grid  { grid-template-columns: minmax(0,1.5fr) repeat(3,minmax(0,1fr)); }
  .testi-grid    { grid-template-columns: repeat(3, minmax(0,1fr)); }
  .footer-grid   { grid-template-columns: minmax(0,1.3fr) repeat(3,minmax(0,1fr)); }

  .pricing-card, .testi-card, .feat-card { min-width: 0; }
  .pricing-card {
    transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease !important;
    cursor: default;
  }
  @media (hover:hover) and (pointer:fine) {
    .pricing-card:hover  { transform: scale(1.045) !important; box-shadow: 0 28px 72px rgba(122,0,75,0.30) !important; z-index:10; position:relative; }
    .testi-card:hover    { transform: translateY(-8px) !important; box-shadow: 0 20px 60px rgba(90,0,51,0.18) !important; border-color:#5a0033 !important; }
    .feat-card:hover     { transform: translateY(-8px) !important; box-shadow: 0 16px 48px rgba(122,0,75,0.18) !important; }
  }
  .pricing-card-popular { transform: scale(1.045); box-shadow: 0 24px 64px rgba(122,0,75,0.32) !important; z-index:5; position:relative; }
  .testi-card  { transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease !important; }
  .feat-card   { transition: transform 0.3s ease, box-shadow 0.3s ease !important; }

  .analytics-card-wrap { position:absolute; bottom:-28px; left:-24px; z-index:20; }

  @media (min-width:1440px) {
    .hero-grid { grid-template-columns: minmax(0,.95fr) minmax(0,1.05fr) !important; }
  }
  @media (max-width:1200px) { .pricing-card-popular { transform: scale(1.02); } }
  @media (max-width:1024px) {
    .feat-section-grid { grid-template-columns: repeat(2,1fr) !important; }
  }
  @media (max-width:1023px) {
    .nav-links { display:none !important; }
    .nav-burger { display:block !important; }
    .hero-grid  { grid-template-columns:1fr !important; gap:40px !important; }
    .hero-section { padding:50px 24px 40px !important; }
    .feat-grid, .pricing-grid, .testi-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .stats-grid, .badge-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .footer-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .storage-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    .testi-cta, .expert-banner { flex-direction:column !important; align-items:flex-start !important; text-align:left !important; }
  }
  @media (max-width:767px) {
    .hero-section { padding:34px 16px 30px !important; }
    .section-pad  { padding:56px 18px !important; }
    .section-pad-sm { padding:36px 18px 48px !important; }
    .analytics-card-wrap { display:none; }
    .pricing-grid, .feat-grid, .feat-section-grid, .testi-grid, .badge-grid, .footer-grid { grid-template-columns:1fr !important; }
    .storage-grid { grid-template-columns:1fr !important; text-align:left; }
    .pricing-card-popular, .pricing-card:hover { transform:none !important; }
    .testi-cta, .expert-banner { text-align:center !important; align-items:center !important; }
  }
  @media (max-width:640px) {
    .feat-section { padding: 60px 20px !important; }
  }
  @media (max-width:480px) {
    .hero-section { padding:28px 14px 24px !important; }
    .stats-grid { grid-template-columns:1fr !important; }
  }
`

// ══════════════════════════════════════════════════════════════
// DIVIDER
// ══════════════════════════════════════════════════════════════
function Divider() {
  return (
    <div style={{ background: PL, padding: '18px 0', display: 'flex', alignItems: 'center' }}>
      <div style={{ width: '100%', height: '1px', background: `linear-gradient(to right, transparent 0%, ${PB} 20%, ${PB} 80%, transparent 100%)` }} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// NAVBAR
// ══════════════════════════════════════════════════════════════
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
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100, background: '#fff',
      boxShadow: scrolled ? '0 2px 16px rgba(122,0,75,.08)' : '0 1px 0 #f0e0e8',
      transition: 'box-shadow .3s'
    }}>
      <div style={{
        maxWidth: 1500, margin: '0 auto', padding: '0 40px', height: 72,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: 26, fontFamily: 'Sora, sans-serif', fontWeight: 800, color: D, letterSpacing: '-1px' }}>
            Torch<span style={{ color: P }}>X</span>
            <sup style={{ fontSize: 11, color: D, fontWeight: 400, verticalAlign: 'super' }}>™</sup>
          </span>
          <span style={{ fontSize: 9, letterSpacing: '3px', color: '#bbb', fontFamily: 'Instrument Sans, sans-serif', fontWeight: 500, textTransform: 'uppercase', marginTop: 1 }}>— TALENT —</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="nav-links">
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

      {open && (
        <div style={{ background: '#fff', borderTop: `1px solid ${PB}`, padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
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

// ══════════════════════════════════════════════════════════════
// ANALYTICS FLOATING CARD
// ══════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════
// DASHBOARD MOCKUP
// ══════════════════════════════════════════════════════════════
function DashboardMockup() {
  return (
    <div style={{ background: 'white', position: 'relative', overflow: 'visible' }}>
      <div style={{ position: 'relative', padding: '48px 24px 80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: '10%', right: '8%', width: '420px', height: '480px', background: 'radial-gradient(ellipse at 60% 40%, #f5d6e8 0%, #fdf0f7 60%, transparent 100%)', borderRadius: '60% 40% 55% 45% / 50% 55% 45% 50%', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '100%' }}>
          <div style={{ position: 'absolute', bottom: '-28px', left: '-36px', zIndex: 20 }}>
            <AnalyticsCard />
          </div>
          <svg viewBox="0 0 960 660" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', maxWidth: '100%', height: 'auto', borderRadius: '18px', display: 'block', margin: '0 auto', overflow: 'hidden', filter: 'drop-shadow(0 24px 64px rgba(115,0,66,0.20))' }}>
            <rect width="960" height="660" rx="18" fill="#eef2f8" />
            <rect x="0" y="0" width="210" height="660" rx="18" fill="#ffffff" />
            <rect x="10" y="0" width="200" height="660" fill="#ffffff" />
            <image href={logo} x="22" y="20" width="118" height="40" preserveAspectRatio="xMidYMid meet" />
            <line x1="16" y1="70" x2="194" y2="70" stroke="#f0e8f0" strokeWidth="1" />
            <rect x="8" y="98" width="194" height="34" rx="8" fill={P} />
            <text x="40" y="120" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="600" fill="white">Dashboard</text>
            <text x="40" y="155" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Leave</text>
            <text x="40" y="176" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Announcement</text>
            <text x="40" y="201" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Organisation</text>
            <text x="40" y="224" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">File</text>
            <text x="40" y="248" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Settings</text>
            <text x="40" y="276" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Logout</text>
            <text x="16" y="648" fontFamily="Instrument Sans,sans-serif" fontSize="8.5" fill="#ccc">Powered by TechTorch | © 2026</text>
            <rect x="210" y="0" width="750" height="660" fill="#eef2f8" />
            <rect x="210" y="0" width="750" height="68" fill="#ffffff" />
            <text x="228" y="28" fontFamily="Sora,sans-serif" fontSize="19" fontWeight="700" fill="#111">Dashboard</text>
            <text x="228" y="46" fontFamily="Instrument Sans,sans-serif" fontSize="11" fill="#888">Welcome back, Ashish · ENG01</text>
            <circle cx="910" cy="27" r="18" fill={P} />
            <text x="910" y="32" fontFamily="Sora,sans-serif" fontSize="11" fontWeight="700" fill="white" textAnchor="middle">AG</text>
            <line x1="210" y1="68" x2="960" y2="68" stroke="#e8e2ee" strokeWidth="1" />
            <rect x="224" y="80" width="712" height="58" rx="10" fill={P} />
            <text x="242" y="124" fontFamily="Sora,sans-serif" fontSize="22" fontWeight="700" fill="white">7 May 2026</text>
            <rect x="856" y="92" width="68" height="30" rx="15" fill="white" />
            <text x="890" y="112" fontFamily="Instrument Sans,sans-serif" fontSize="10.5" fontWeight="600" fill={P} textAnchor="middle">Check In</text>
            <rect x="224" y="149" width="196" height="3" rx="1.5" fill={P} />
            <rect x="224" y="152" width="196" height="156" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1" />
            <text x="272" y="193" fontFamily="Sora,sans-serif" fontSize="12" fontWeight="700" fill="#111">Ashish gangwar</text>
            <rect x="428" y="149" width="162" height="3" rx="1.5" fill="#4a90d9" />
            <rect x="428" y="152" width="162" height="156" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1" />
            <text x="440" y="270" fontFamily="Sora,sans-serif" fontSize="10.5" fontWeight="700" fill="#111">6 May 2026</text>
            <rect x="598" y="149" width="168" height="3" rx="1.5" fill="#2ec27e" />
            <rect x="598" y="152" width="168" height="156" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1" />
            <text x="605" y="194" fontFamily="Sora,sans-serif" fontSize="20" fontWeight="800" fill="#2ec27e">15</text>
            <rect x="774" y="152" width="162" height="156" rx="10" fill={P} />
            <text x="786" y="199" fontFamily="Sora,sans-serif" fontSize="12" fontWeight="700" fill="white">Ashish gangwar</text>
            <rect x="224" y="318" width="496" height="330" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1" />
            <text x="240" y="340" fontFamily="Sora,sans-serif" fontSize="14" fontWeight="700" fill="#111">Attendance</text>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <text key={i} x={252+i*64} y="368" fontFamily="Instrument Sans,sans-serif" fontSize="10" fontWeight="600" fill="#ccc" textAnchor="middle">{d}</text>
            ))}
            <rect x="728" y="318" width="208" height="330" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1" />
            <text x="744" y="340" fontFamily="Sora,sans-serif" fontSize="14" fontWeight="700" fill="#111">Announcements</text>
            <text x="832" y="450" fontFamily="Instrument Sans,sans-serif" fontSize="11" fill="#ccc" textAnchor="middle">No announcements</text>
            <path d="M808,618 H862 L855,645 H815 Z" fill="#730042" opacity="0.9" />
            <rect x="802" y="613" width="62" height="10" rx="5" fill="#5A0033" opacity="0.8" />
            <path d="M830,612 C826,592 814,575 798,561" stroke="#B66A92" strokeWidth="2.2" fill="none" opacity="0.85" />
            <path d="M840,612 C847,582 862,560 878,542" stroke="#B66A92" strokeWidth="2.2" fill="none" opacity="0.85" />
            <path d="M793,557 C784,544 793,531 808,539 C817,545 813,559 798,563 Z" fill="#5A0033" opacity="0.9" />
            <path d="M819,540 C815,527 828,523 839,533 C845,542 838,557 826,557 Z" fill="#5A0033" opacity="0.9" />
            <path d="M852,537 C866,525 880,530 877,543 C873,554 858,558 848,549 Z" fill="#5A0033" opacity="0.9" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// HERO
// ══════════════════════════════════════════════════════════════
function Hero() {
  return (
    <section className="hero-section" style={{ padding: '72px 40px 48px', background: '#fff', overflow: 'hidden' }}>
      <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto', display: 'grid', gap: 'clamp(24px,4vw,60px)', alignItems: 'center' }} className="hero-grid">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <h1 style={{ fontSize: 'clamp(32px,4vw,52px)', fontFamily: 'Sora, sans-serif', fontWeight: 800, color: D, lineHeight: 1.15, margin: '0 0 20px' }}>
            Manage Your Workforce<br />With Smart <span style={{ color: P }}>HR Solutions</span>
          </h1>
          <p style={{ fontSize: 16, fontFamily: 'DM Sans, sans-serif', fontWeight: 400, color: G, lineHeight: 1.75, maxWidth: 440, margin: '0 0 36px' }}>
            Optimize every stage of the employee lifecycle with a robust and reliable Human Resource Management System.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <a href="#trial" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: P, color: '#fff', fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600, padding: '13px 28px', borderRadius: 50, textDecoration: 'none', boxShadow: `0 8px 24px ${P}40`, transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = PH; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = P; e.currentTarget.style.transform = 'none' }}>
              Sign Up For Free Trial <FiArrowRight />
            </a>
            <a href="#expert" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `2px solid ${P}`, color: P, background: 'transparent', fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600, padding: '13px 28px', borderRadius: 50, textDecoration: 'none', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = PL; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none' }}>
              Talk To Expert
            </a>
          </div>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: 0.15 }} style={{ width: '100%', paddingBottom: 'clamp(15px,3vw,36px)', overflow: 'visible' }}>
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════════
function Stats() {
  const stats = [
    { icon: <BsPeopleFill size={22} />, num: '100+',  label: 'Happy customers of TorchX' },
    { icon: <FiBarChart2 size={22} />,  num: '1000+', label: 'No. of live demos' },
    { icon: <FiUsers size={22} />,      num: '10+',   label: 'Partners to collaborate' },
    { icon: <FiStar size={22} />,       num: '98%',   label: 'Customer satisfaction' },
  ]
  return (
    <section className="section-pad-sm" style={{ padding: '40px 40px 60px', background: '#fff' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 20 }} className="stats-grid">
        {stats.map((s, i) => (
          <motion.div key={s.num} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.08 }} viewport={{ once: true }}
            style={{ background: '#fff', borderRadius: 18, padding: '22px 24px', border: `1px solid ${PB}`, boxShadow: '0 2px 12px rgba(122,0,75,.06)', transition: 'all .3s', display: 'flex', alignItems: 'center', gap: 16 }}
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
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// FEATURES — Mini Sidebar
// ══════════════════════════════════════════════════════════════
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
      style={{ background: '#fff', border: `1px solid ${PB}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 24px rgba(122,0,75,0.08)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
      <div style={{ padding: '24px 24px 16px' }}>
        <div style={{ width: 56, height: 56, background: PL, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <HiOutlineSparkles style={{ color: P, fontSize: 26 }} />
        </div>
        <h3 style={{ fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, margin: '0 0 8px' }}>AI Recruitment</h3>
        <p style={{ fontSize: 13, color: G, lineHeight: 1.65, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
          Find the right talent faster with AI-powered candidate screening, smart matching, and automated shortlisting.
        </p>
      </div>
      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ margin: '0 16px', background: PL, borderRadius: '12px 12px 0 0', overflow: 'hidden', display: 'flex', flex: 1 }}>
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
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
      style={{ background: '#fff', border: `1px solid ${PB}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 24px rgba(122,0,75,0.08)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
      <div style={{ padding: '24px 24px 16px' }}>
        <div style={{ width: 56, height: 56, background: PL, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <BsGraphUp style={{ color: P, fontSize: 24 }} />
        </div>
        <h3 style={{ fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, margin: '0 0 8px' }}>Performance Reviews</h3>
        <p style={{ fontSize: 13, color: G, lineHeight: 1.65, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
          Simplify performance evaluations with customizable reviews, goal tracking, and actionable feedback.
        </p>
      </div>
      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        style={{ margin: '0 16px', background: PL, borderRadius: '12px 12px 0 0', padding: '14px 14px 10px', flex: 1 }}>
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
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
      style={{ background: '#fff', border: `1px solid ${PB}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 24px rgba(122,0,75,0.08)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
      <div style={{ padding: '24px 24px 16px' }}>
        <div style={{ width: 56, height: 56, background: PL, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <BsPersonBadge style={{ color: P, fontSize: 26 }} />
        </div>
        <h3 style={{ fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, margin: '0 0 8px' }}>Employee Portal</h3>
        <p style={{ fontSize: 13, color: G, lineHeight: 1.65, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
          Empower employees with a self-service portal for profiles, documents, requests, and company updates.
        </p>
      </div>
      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ margin: '0 16px', background: PL, borderRadius: '12px 12px 0 0', overflow: 'hidden', display: 'flex', flex: 1 }}>
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
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: P }}>Everything you need, in one place.</span>
        <div style={{ width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiArrowRight style={{ color: P, fontSize: 13 }} />
        </div>
      </div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════════
// FEATURES SECTION
// ══════════════════════════════════════════════════════════════
function Features() {
  return (
    <section id="features" className="feat-section" style={{ padding: '100px 40px', background: '#F8F5F7', fontFamily: 'DM Sans, sans-serif' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 'clamp(42px,5vw,72px)', fontFamily: 'Sora, sans-serif', fontWeight: 800, color: D, lineHeight: 1.1, margin: '0 0 20px' }}>
            Powerful <span style={{ color: P }}>Features</span><br />Built for <span style={{ color: P }}>Modern</span> Teams
          </h2>
          <p style={{ fontSize: 20, color: '#555', lineHeight: 1.6, maxWidth: 700, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
            Everything you need to hire smarter, evaluate better, and empower your employees.
          </p>
        </div>
        <motion.div className="feat-section-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
          <AIRecruitmentCard />
          <PerformanceCard />
          <EmployeePortalCard />
        </motion.div>
      </motion.div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// PRICING
// ══════════════════════════════════════════════════════════════
function Pricing() {
  const plans = [
    { name: 'Startup',    desc: 'Perfect for small teams getting started',                    price: '₹109', dark: false, features: ['Employee database','Attendance tracking','Leave management','Basic payroll','Employee self-service portal','Email support'] },
    { name: 'Business',   desc: 'For growing businesses that need more. Everything in Starter +', price: '₹249', dark: true, popular: true, features: ['Recruitment / Applicant tracking','Performance management','Advanced payroll','Custom policies/workflows','Reports & analytics','Priority support'] },
    { name: 'Enterprise', desc: 'Ultimate power and flexibility. Everything in Growth +',     price: '₹499', dark: false, features: ['Multi-company support','Role-based permissions','SSO','API access','Custom integrations','Dedicated account manager'] },
  ]
  const badges = [
    { icon: <FiShield size={20} />,   label: 'Secure & Compliant', desc: 'Enterprise-grade security with regular backups.' },
    { icon: <FiLink size={20} />,     label: 'Easy Integration',   desc: 'Seamlessly integrates with your favorite tools.' },
    { icon: <FiActivity size={20} />, label: '99.9% Uptime',       desc: 'Reliable performance you can count on.' },
    { icon: <FiBookOpen size={20} />, label: 'Free Onboarding',    desc: 'We help you and your team get started.' },
  ]
  return (
    <section id="pricing" className="section-pad" style={{ padding: '80px 40px', background: '#fff' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px,3.2vw,42px)', fontFamily: 'Sora, sans-serif', fontWeight: 800, color: D, margin: '0 0 14px' }}>
            Simple, Transparent <span style={{ color: P }}>Pricing</span><br />That Grows With You
          </h2>
          <p style={{ fontSize: 15, fontFamily: 'DM Sans, sans-serif', color: G, maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
            Choose the perfect plan for your team. Upgrade or downgrade anytime as your needs change.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, alignItems: 'center', marginBottom: 36, paddingTop: 20 }} className="pricing-grid">
          {plans.map(p => (
            <div key={p.name} className={`pricing-card${p.popular ? ' pricing-card-popular' : ''}`} style={{ position: 'relative', borderRadius: 24, padding: '36px 30px', display: 'flex', flexDirection: 'column', gap: 20, background: p.dark ? P : '#fff', border: p.dark ? 'none' : `1.5px solid ${PB}`, boxShadow: p.dark ? `0 24px 64px ${P}50` : '0 4px 16px rgba(122,0,75,.06)' }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                  <span style={{ background: D, color: '#fff', fontSize: 11, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, padding: '6px 20px', borderRadius: 50, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>Most Popular</span>
                </div>
              )}
              <div>
                <div style={{ fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: p.dark ? '#fff' : D, marginBottom: 6 }}>{p.name}</div>
                <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: p.dark ? 'rgba(255,255,255,.7)' : '#999', lineHeight: 1.5 }}>{p.desc}</div>
              </div>
              <div>
                <span style={{ fontSize: 38, fontFamily: 'Sora, sans-serif', fontWeight: 800, color: p.dark ? '#fff' : D }}>{p.price}</span>
                <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: p.dark ? 'rgba(255,255,255,.6)' : '#aaa', marginLeft: 4 }}>/user/mo</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: p.dark ? 'rgba(255,255,255,.88)' : G }}>
                    <FiCheck style={{ color: p.dark ? '#fff' : P, flexShrink: 0, marginTop: 2 }} />{f}
                  </li>
                ))}
              </ul>
              <button style={{ marginTop: 'auto', width: '100%', padding: '12px 0', borderRadius: 50, fontSize: 14, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, cursor: 'pointer', background: p.dark ? '#fff' : 'transparent', color: P, border: p.dark ? 'none' : `2px solid ${P}`, transition: 'all .2s' }}>
                Start Free Trial
              </button>
            </div>
          ))}
        </div>
        <div style={{ background: PL, borderRadius: 20, padding: '22px 28px', marginBottom: 22, border: `1px solid ${PB}` }}>
          <div style={{ display: 'grid', gap: 16, alignItems: 'center' }} className="storage-grid">
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
        <div style={{ display: 'grid', gap: 16, marginBottom: 22 }} className="badge-grid">
          {badges.map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', background: PL, borderRadius: 16, border: `1px solid ${PB}` }}>
              <div style={{ color: P, flexShrink: 0, marginTop: 2 }}>{b.icon}</div>
              <div>
                <div style={{ fontSize: 12, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, marginBottom: 3 }}>{b.label}</div>
                <div style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#aaa', lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: PL, borderRadius: 20, padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, border: `1px solid ${PB}` }} className="expert-banner">
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
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// TESTIMONIALS — soft luxury beetroot-pink palette
// ══════════════════════════════════════════════════════════════
function Testimonials() {
  const [active, setActive] = useState(1)
  const avatarGradients = [
    'linear-gradient(135deg, #c45a8a, #7A004B)',
    'linear-gradient(135deg, #8a4fc4, #7A004B)',
    'linear-gradient(135deg, #4f8ac4, #7A004B)',
  ]
  const testimonials = [
    { quote: 'TorchX has completely transformed our hiring process. The AI recruitment feature helps us find the right talent faster and with better accuracy.', name: 'Alexa', role: 'HR Manager', co: 'LOGOIPSUM', initials: 'AL', grad: avatarGradients[0] },
    { quote: 'The employee portal is a game changer! Our team loves the easy access to documents, requests, and updates all in one place.', name: 'Anaya Varma', role: 'HR Director', co: 'LOGOIPSUM', initials: 'AV', grad: avatarGradients[1] },
    { quote: 'Performance reviews are now simple, transparent, and data-driven. TorchX helps us build a culture of continuous feedback and growth.', name: 'Rohan Sharma', role: 'People Operations Lead', co: 'LOGOIPSUM', initials: 'RS', grad: avatarGradients[2] },
  ]
  return (
    <section id="testimonials" className="section-pad" style={{ padding: '80px 40px', background: '#F6EDF2', fontFamily: 'DM Sans, sans-serif' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(26px,3.2vw,40px)', fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#111111', margin: '0 0 14px', lineHeight: 1.2 }}>
            Loved by <span style={{ color: P }}>Teams</span>, Trusted by <span style={{ color: P }}>Leaders</span>
          </h2>
          <p style={{ fontSize: 15, color: '#555555', maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
            See how organizations like yours are using TorchX to streamline HR and achieve more every day.
          </p>
        </div>
        <div style={{ display: 'grid', gap: 20, marginBottom: 32 }} className="testi-grid">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.1 }} viewport={{ once: true }} className="testi-card"
              style={{ background: '#ffffff', border: '1px solid #DDB7CB', borderRadius: 14, padding: 26, boxShadow: i === active ? '0 10px 24px rgba(122,0,75,0.15)' : '0 6px 18px rgba(122,0,75,0.08)', transform: i === active ? 'translateY(-4px)' : 'none', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 48, fontFamily: 'Sora, sans-serif', fontWeight: 900, color: P, lineHeight: 0.7, marginBottom: 14 }}>"</div>
              <p style={{ fontSize: 13, color: '#333333', lineHeight: 1.75, flex: 1, margin: '0 0 20px' }}>{t.quote}</p>
              <hr style={{ border: 'none', borderTop: '1px solid #E6D6DF', marginBottom: 16 }} />
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
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
        <div className="testi-cta" style={{ background: '#ffffff', border: '1px solid #E2C9D6', boxShadow: '0 8px 24px rgba(122,0,75,0.08)', borderRadius: 18, padding: '32px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, background: P, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HiOutlineSparkles style={{ color: '#fff', fontSize: 22 }} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#222222', marginBottom: 4 }}>Join 100+ companies growing with TorchX</div>
              <div style={{ fontSize: 13, color: '#666666' }}>Powerful HR tools. Happy teams. Better results.</div>
            </div>
          </div>
          <a href="#trial" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: P, color: '#fff', fontSize: 13, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, padding: '14px 26px', borderRadius: 10, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background .2s' }}
            onMouseEnter={e => e.currentTarget.style.background = PH}
            onMouseLeave={e => e.currentTarget.style.background = P}>
            Book For Free Trial <FiArrowRight />
          </a>
        </div>
      </motion.div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// FOOTER — light luxury beetroot-pink palette
// ══════════════════════════════════════════════════════════════
function Footer() {
  const FOOTER_BORDER = '#E2C9D6'
  const FOOTER_MUTED  = '#888888'
  const cols = [
    { title: 'Product',   links: ['Features', 'Pricing', 'Security', 'Roadmap', 'Status'] },
    { title: 'Solutions', links: ['Talent', 'Engage', 'Finance', 'Inventory', 'Pay'] },
    { title: 'Resources', links: ['Documentation', 'Api Reference', 'Guides', 'Blog', 'Community'] },
  ]
  const socials = [
    { icon: <FiLinkedin />,  href: '#', label: 'LinkedIn'  },
    { icon: <FiInstagram />, href: '#', label: 'Instagram' },
    { icon: <FiTwitter />,   href: '#', label: 'Twitter'   },
    { icon: <FiMail />,      href: '#', label: 'Email'     },
  ]
  return (
    <footer style={{ background: '#F6EDF2', borderTop: `1px solid ${FOOTER_BORDER}`, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 40px 0', display: 'grid', gap: 40 }} className="footer-grid">
        <div>
          <img src={logo} alt="TorchX" style={{ height: 'clamp(36px,4vw,48px)', width: 'auto', objectFit: 'contain', display: 'block', marginBottom: 6 }} />
          <div style={{ fontSize: 8, letterSpacing: '3px', color: '#b0869a', fontFamily: 'Instrument Sans, sans-serif', fontWeight: 500, textTransform: 'uppercase', marginBottom: 16 }}>— TALENT —</div>
          <p style={{ fontSize: 13, color: '#444444', lineHeight: 1.75, margin: '0 0 22px' }}>
            Hire smarter, faster, and with confidence using AI-powered talent solutions. Streamline recruitment, discover top candidates, and build high-performing teams effortlessly.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {socials.map((s, i) => (
              <a key={i} href={s.href} aria-label={s.label} style={{ color: P, fontSize: 18, textDecoration: 'none', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .2s, color .2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.color = PH }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.color = P }}>
                {s.icon}
              </a>
            ))}
          </div>
        </div>
        {cols.map(col => (
          <div key={col.title}>
            <div style={{ fontSize: 14, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: P, marginBottom: 18 }}>{col.title}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {col.links.map(l => (
                <li key={l}>
                  <a href="#" style={{ fontSize: 13, color: P, textDecoration: 'none', transition: 'color .2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = PH}
                    onMouseLeave={e => e.currentTarget.style.color = P}>{l}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1100, margin: '40px auto 0', borderTop: `1px solid ${FOOTER_BORDER}`, padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ fontSize: 12, color: '#555555', margin: 0 }}>TorchX™ — A Product of Techtorch Solutions Private Limited.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Refund Policy'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: FOOTER_MUTED, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.currentTarget.style.color = P}
              onMouseLeave={e => e.currentTarget.style.color = FOOTER_MUTED}>{l}</a>
          ))}
        </div>
      </div>
      <div style={{ height: 20 }} />
    </footer>
  )
}

// ══════════════════════════════════════════════════════════════
// DEFAULT EXPORT — single, at the bottom
// ══════════════════════════════════════════════════════════════
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