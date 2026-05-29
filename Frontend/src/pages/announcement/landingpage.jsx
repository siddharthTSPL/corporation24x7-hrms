import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FiMenu, FiX, FiArrowRight, FiCheck,
  FiLinkedin, FiInstagram, FiTwitter, FiMail,
  FiShield, FiLink, FiActivity, FiBookOpen,
  FiUser, FiFileText, FiBell, FiHardDrive,
  FiUsers, FiStar, FiBarChart2
} from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi'
import { BsPeopleFill, BsGraphUp, BsPersonBadge, BsChatSquareText } from 'react-icons/bs'
import logo from "../../assets/TorchX.svg"
// ── Brand tokens ──────────────────────────────────────────────
const P   = '#7A004B'
const PH  = '#5a0033'
const PL  = '#FDF4F8'
const PB  = '#EAC7D7'
const D   = '#111111'
const G   = '#5C5C5C'

// ── Fade-up animation variant ─────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
}

// ── Global styles ─────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'DM Sans', sans-serif; background: #fff; -webkit-font-smoothing: antialiased; }
  a { text-decoration: none; }
  button { outline: none; }
  img { max-width: 100%; display: block; }

  /* Nav responsive */
  @media(max-width:900px){ .nav-links{display:none!important;} .nav-burger{display:block!important;} }
  @media(max-width:480px){ .nav-inner { padding: 0 20px !important; } }

  /* Hero */
  .hero-grid { grid-template-columns: 1fr 1fr; }
  @media(max-width:900px){ .hero-grid{ grid-template-columns:1fr!important; } }
  @media(max-width:480px){ .hero-section { padding: 40px 20px 32px!important; } }

  /* Stats */
  .stats-grid{ grid-template-columns:repeat(4,1fr); }
  @media(max-width:900px){ .stats-grid{grid-template-columns:1fr 1fr!important;} }
  @media(max-width:480px){ .stats-grid{grid-template-columns:1fr 1fr!important;} }

  /* Features */
  .feat-grid{ grid-template-columns:repeat(3,1fr); }
  @media(max-width:1024px){ .feat-grid{grid-template-columns:1fr 1fr!important;} }
  @media(max-width:640px){ .feat-grid{grid-template-columns:1fr!important;} }

  /* Pricing */
  .pricing-grid{grid-template-columns:repeat(3,1fr);}
  .badge-grid{grid-template-columns:repeat(4,1fr);}
  .storage-grid{grid-template-columns:1.5fr 1fr 1fr 1fr;}
  @media(max-width:1024px){
    .pricing-grid{grid-template-columns:1fr 1fr!important;}
    .badge-grid{grid-template-columns:1fr 1fr!important;}
  }
  @media(max-width:640px){
    .pricing-grid,.badge-grid{grid-template-columns:1fr!important;}
    .storage-grid{grid-template-columns:1fr 1fr!important;}
    .expert-banner{flex-direction:column!important;text-align:center!important;}
  }

  /* Testimonials */
  .testi-grid{grid-template-columns:repeat(3,1fr);}
  @media(max-width:1024px){ .testi-grid{grid-template-columns:1fr 1fr!important;} }
  @media(max-width:640px){ .testi-grid{grid-template-columns:1fr!important;} .testi-cta{flex-direction:column!important;text-align:center!important;} }

  /* Footer */
  .footer-grid{ grid-template-columns:1.5fr 1fr 1fr 1fr; }
  @media(max-width:900px){ .footer-grid{grid-template-columns:1fr 1fr!important;} }
  @media(max-width:480px){ .footer-grid{grid-template-columns:1fr!important;} }

  /* Hover effects */
  .pricing-card {
    transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease !important;
    cursor: default;
  }
  .pricing-card:hover {
    transform: scale(1.07) !important;
    box-shadow: 0 28px 72px rgba(122,0,75,0.30) !important;
    z-index: 10;
    position: relative;
  }
  .pricing-card-popular {
    transform: scale(1.07);
    box-shadow: 0 24px 64px rgba(122,0,75,0.32) !important;
    z-index: 5;
    position: relative;
  }
  @media(max-width:900px){
    .pricing-card-popular { transform: scale(1.02) !important; }
    .pricing-card:hover { transform: scale(1.03) !important; }
  }

  .testi-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease !important;
    cursor: default;
  }
  .testi-card:hover {
    transform: translateY(-8px) !important;
    box-shadow: 0 20px 60px rgba(90,0,51,0.18) !important;
    border-color: #5a0033 !important;
  }

  .feat-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease !important;
    cursor: default;
  }
  .feat-card:hover {
    transform: translateY(-8px) !important;
    box-shadow: 0 16px 48px rgba(122,0,75,0.18) !important;
  }

  /* Section padding mobile */
  @media(max-width:640px){
    .section-pad { padding: 48px 20px !important; }
    .section-pad-sm { padding: 32px 20px !important; }
  }
    /* Large laptops */
@media (min-width: 1440px) {
  .hero-grid {
    grid-template-columns: 0.95fr 1.05fr !important;
  }
}

/* Tablet */
@media (max-width: 1024px) {
  .hero-grid {
    grid-template-columns: 1fr !important;
    gap: 40px !important;
  }

  .hero-section {
    padding: 50px 24px !important;
  }
}

/* Mobile */
@media (max-width: 768px) {

  .hero-section {
    padding: 30px 16px !important;
  }

  .hero-section h1 {
    text-align: center;
  }

  .hero-section p {
    text-align: center;
    max-width: 100% !important;
  }

  .hero-section div[style*="flex-wrap"] {
    justify-content: center;
  }

  .analytics-card {
    display: none;
  }
}

/* Small Mobile */
@media (max-width: 480px) {

  .hero-section h1 {
    font-size: 32px !important;
  }

  .hero-section p {
    font-size: 14px !important;
  }
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
  const [open, setOpen]       = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const links = ['Features','Testimonials','Pricing','About']

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: '#fff',
      boxShadow: scrolled ? '0 2px 16px rgba(122,0,75,.08)' : '0 1px 0 #f0e0e8',
      transition: 'box-shadow .3s'
    }}>
      <div className="nav-inner" style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '0 40px', height: 72,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <span style={{ fontSize: 26, fontFamily: 'Sora, sans-serif', fontWeight: 800, color: D, letterSpacing: '-1px' }}>
              Torch<span style={{ color: P }}>X</span>
              <sup style={{ fontSize: 11, color: D, fontWeight: 400, verticalAlign: 'super' }}>™</sup>
            </span>
          </div>
          <span style={{ fontSize: 9, letterSpacing: '3px', color: '#bbb', fontFamily: 'Instrument Sans, sans-serif', fontWeight: 500, textTransform: 'uppercase', marginTop: 1 }}>— TALENT —</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="nav-links">
          {links.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{
              fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 500, color: G,
              textDecoration: 'none', transition: 'color .2s'
            }}
              onMouseEnter={e => e.currentTarget.style.color = P}
              onMouseLeave={e => e.currentTarget.style.color = G}>
              {l}
            </a>
          ))}
          <a href="/login" style={{
            background: P, color: '#fff',
            fontSize: 14, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600,
            padding: '10px 28px', borderRadius: 50, textDecoration: 'none',
            boxShadow: `0 4px 18px ${P}40`, transition: 'all .2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = PH; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = P; e.currentTarget.style.transform = 'none' }}>
            Login
          </a>
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
          <a href="/login" style={{
            background: P, color: '#fff', fontSize: 14, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600,
            padding: '12px 0', borderRadius: 50, textDecoration: 'none', textAlign: 'center'
          }}>Login</a>
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
    <div style={{ background:'white', borderRadius:'16px', boxShadow:'0 12px 40px rgba(115,0,66,0.18)', width:'clamp(140px,18vw,200px)', border:'1.5px solid #e0c8d8', display:'flex', flexDirection:'row', overflow:'hidden' }}>
      <div style={{ width:'12px', flexShrink:0, background:P }}/>
      <div style={{ flex:1, padding:'10px 9px 10px 8px', display:'flex', flexDirection:'column', gap:'6px' }}>
        <div style={{ fontSize:'8px', fontWeight:700, color:'#999', letterSpacing:'1.5px', textTransform:'uppercase', fontFamily:'Instrument Sans,sans-serif' }}>Analytics</div>
        <div style={{ border:'1px solid #e0c8d8', borderRadius:'7px', padding:'5px 5px 3px', background:'#fff' }}>
          <svg width="100%" height="44" viewBox="0 0 120 44">
            <line x1="10" y1="2" x2="10" y2="38" stroke="#e0c8d8" strokeWidth="0.8"/>
            <line x1="10" y1="38" x2="118" y2="38" stroke="#e0c8d8" strokeWidth="0.8"/>
            <line x1="10" y1="14" x2="118" y2="14" stroke="#f3e4ee" strokeWidth="0.5"/>
            <line x1="10" y1="26" x2="118" y2="26" stroke="#f3e4ee" strokeWidth="0.5"/>
            <polyline points="10,34 22,28 32,30 42,18 52,24 62,12 72,18 82,10 92,14 102,7 112,11" fill="none" stroke="#f0d0e4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
            <polyline points="10,34 22,28 32,30 42,18 52,24 62,12 72,18 82,10 92,14 102,7 112,11" fill="none" stroke={P} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
            <circle cx="102" cy="7" r="2.5" fill={P}/>
          </svg>
        </div>
        <div style={{ display:'flex', gap:'6px', alignItems:'stretch' }}>
          <div style={{ border:'1px solid #e0c8d8', borderRadius:'7px', padding:'5px', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="34" height="34" viewBox="0 0 34 34">
              <circle cx="17" cy="17" r="15" fill="#f0dcea"/>
              <path d="M17,17 L17,2 A15,15 0 1,1 4.5,24.5 Z" fill={P}/>
              <circle cx="17" cy="17" r="6" fill="white"/>
            </svg>
          </div>
          <div style={{ flex:1, border:'1px solid #e0c8d8', borderRadius:'7px', padding:'4px 5px', background:'#fff' }}>
            <svg width="100%" height="34" viewBox="0 0 80 34">
              <line x1="0" y1="32" x2="80" y2="32" stroke="#e8d0e0" strokeWidth="0.5"/>
              <rect x="1" y="22" width="8" height="10" rx="2" fill="#f0dcea"/>
              <rect x="12" y="18" width="8" height="14" rx="2" fill="#f0dcea"/>
              <rect x="23" y="12" width="8" height="20" rx="2" fill={P} opacity=".6"/>
              <rect x="34" y="6" width="8" height="26" rx="2" fill={P}/>
              <rect x="45" y="10" width="8" height="22" rx="2" fill="#CD166E"/>
              <rect x="56" y="14" width="8" height="18" rx="2" fill={P} opacity=".8"/>
              <rect x="67" y="20" width="8" height="12" rx="2" fill="#f0dcea"/>
            </svg>
          </div>
        </div>
        <div style={{ background:P, borderRadius:'6px', height:'14px', display:'flex', alignItems:'center', padding:'0 8px', gap:'4px' }}>
          {[55,36,22].map((w,i) => <div key={i} style={{ height:'3px', width:`${w}px`, borderRadius:'2px', background:'rgba(255,255,255,0.25)' }}/>)}
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
    <div style={{ background:'white', position:'relative', overflow:'visible' }}>
      <div style={{ position:'relative', padding:'48px 24px 80px', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{
          position:'absolute', top:'10%', right:'8%',
          width:'420px', height:'480px',
          background:'radial-gradient(ellipse at 60% 40%, #f5d6e8 0%, #fdf0f7 60%, transparent 100%)',
          borderRadius:'60% 40% 55% 45% / 50% 55% 45% 50%',
          zIndex:0
        }}/>

        <div
        style={{
          position: 'relative', zIndex: 2,  width: '100%', maxWidth: '100%',}}
>
          <div style={{ position:'absolute', bottom:'-28px', left:'-36px', zIndex:20 }}>
            <AnalyticsCard/>
          </div>

          <svg viewBox="0 0 960 660" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"
            style={{ width:'100%', maxWidth:'100%', height:'auto', borderRadius:'18px', display:'block', margin:'0 auto', overflow:'hidden', filter:'drop-shadow(0 24px 64px rgba(115,0,66,0.20))' }}>

            <rect width="960" height="660" rx="18" fill="#eef2f8"/>

            {/* Sidebar */}
            <rect x="0" y="0" width="210" height="660" rx="18" fill="#ffffff"/>
            <rect x="10" y="0" width="200" height="660" fill="#ffffff"/>
            <image href={logo} x="22"y="20" width="118" height="40" preserveAspectRatio="xMidYMid meet"/>
            
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

            {/* Main content */}
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

            {/* Employee card */}
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

            {/* Date of joining */}
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

            {/* Leave overview */}
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

            {/* Reporting manager */}
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

            {/* Attendance calendar */}
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

            {/* Announcements panel with plant */}
            <rect x="728" y="318" width="208" height="330" rx="10" fill="white" stroke="#ede5f0" strokeWidth="1"/>
            <text x="744" y="340" fontFamily="Sora,sans-serif" fontSize="14" fontWeight="700" fill="#111">Announcements</text>
            <rect x="890" y="328" width="28" height="20" rx="5" fill="#fff3e0"/>
            <text x="904" y="342" fontFamily="Sora,sans-serif" fontSize="11" fontWeight="700" fill="#f0a030" textAnchor="middle">0</text>
            <line x1="728" y1="352" x2="936" y2="352" stroke="#f0e8f0" strokeWidth="1"/>
            <text x="832" y="450" fontFamily="Instrument Sans,sans-serif" fontSize="11" fill="#ccc" textAnchor="middle">No announcements</text>
            {/* Plant SVG at bottom of announcements */}
            {/* Pot */}
            <path d="M808,618 H862 L855,645 H815 Z" fill="#730042" opacity="0.9"/>
            <rect x="802" y="613" width="62" height="10" rx="5" fill="#5A0033" opacity="0.8"/>
            {/* Stems */}
            <path d="M830,612 C826,592 814,575 798,561" stroke="#B66A92" strokeWidth="2.2" fill="none" opacity="0.85"/>
            <path d="M835,612 C835,585 833,562 826,540" stroke="#B66A92" strokeWidth="2.2" fill="none" opacity="0.85"/>
            <path d="M840,612 C847,582 862,560 878,542" stroke="#B66A92" strokeWidth="2.2" fill="none" opacity="0.85"/>
            {/* Left large leaf */}
            <path d="M793,557 C784,544 793,531 808,539 C817,545 813,559 798,563 C795,561 793,559 793,557 Z" fill="#5A0033" opacity="0.9"/>
            {/* Middle leaf */}
            <path d="M819,540 C815,527 828,523 839,533 C845,542 838,557 826,557 C819,553 819,547 819,540 Z" fill="#5A0033" opacity="0.9"/>
            {/* Right top leaf */}
            <path d="M852,537 C866,525 880,530 877,543 C873,554 858,558 848,549 C846,545 847,540 852,537 Z" fill="#5A0033" opacity="0.9"/>
            {/* Right small leaf */}
            <path d="M849,577 C860,568 869,573 867,586 C862,595 849,597 842,590 C840,586 842,580 849,577 Z" fill="#5A0033" opacity="0.85"/>
            {/* Left small leaf */}
            <path d="M806,578 C799,567 808,561 819,568 C825,574 821,587 810,589 C806,587 804,582 806,578 Z" fill="#5A0033" opacity="0.85"/>
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
      <div style={{
  width: '100%', maxWidth: '1600px',margin: '0 auto',display: 'grid',gap: 'clamp(24px,4vw,60px)',alignItems: 'center',paddingInline: 'clamp(10px,2vw,30px)'
}} className="hero-grid">

        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <h1 style={{
            fontSize: 'clamp(32px, 4vw, 52px)',
            fontFamily: 'Sora, sans-serif', fontWeight: 800,
            color: D, lineHeight: 1.15, margin: '0 0 20px'
          }}>
            Manage Your Workforce<br />
            With Smart{' '}
            <span style={{ color: P }}>HR Solutions</span>
          </h1>
          <p style={{
            fontSize: 16, fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
            color: G, lineHeight: 1.75, maxWidth: 440, margin: '0 0 36px'
          }}>
            Optimize every stage of the employee lifecycle with a robust and reliable Human Resource Management System.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <a href="#trial" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: P, color: '#fff',
              fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600,
              padding: '13px 28px', borderRadius: 50, textDecoration: 'none',
              boxShadow: `0 8px 24px ${P}40`, transition: 'all .2s'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = PH; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = P; e.currentTarget.style.transform = 'none' }}>
              Sign Up For Free Trail <FiArrowRight />
            </a>
            <a href="#expert" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `2px solid ${P}`, color: P, background: 'transparent',
              fontSize: 15, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 600,
              padding: '13px 28px', borderRadius: 50, textDecoration: 'none',
              transition: 'all .2s'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = PL; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none' }}>
              Talk To Expert
            </a>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          style={{
          width:'100%', paddingBottom:'clamp(15px,3vw,36px)',paddingRight:0, overflow:'visible'
}}>
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// STATS — icon left, number+label right (matching screenshot)
// ══════════════════════════════════════════════════════════════
function Stats() {
  const stats = [
    { icon: <BsPeopleFill size={22} />, num: '100+', label: 'Happy customers of TorchX' },
    { icon: <FiBarChart2 size={22} />, num: '1000+', label: 'No. of live demos' },
    { icon: <FiUsers size={22} />, num: '10+', label: 'Partners to collaborate' },
    { icon: <FiStar size={22} />, num: '98%', label: 'Customer satisfaction' },
  ]

  return (
    <section className="section-pad-sm" style={{ padding: '40px 40px 60px', background: '#fff' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 20 }} className="stats-grid">
        {stats.map((s, i) => (
          <motion.div key={s.num}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.08 }} viewport={{ once: true }}
            style={{
              background: '#fff', borderRadius: 18, padding: '22px 24px',
              border: `1px solid ${PB}`,
              boxShadow: '0 2px 12px rgba(122,0,75,.06)', transition: 'all .3s',
              display: 'flex', alignItems: 'center', gap: 16
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 10px 32px ${P}1A`; e.currentTarget.style.transform = 'translateY(-4px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(122,0,75,.06)'; e.currentTarget.style.transform = 'none' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: P,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#fff'
            }}>{s.icon}</div>
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
// RADAR CHART
// ══════════════════════════════════════════════════════════════
function RadarChart() {
  const labels = ['Leadership','Teamwork','Quality','Problem\nSolving','Communication']
  const vals   = [0.85,0.72,0.90,0.68,0.80]
  const cx = 88, cy = 88, r = 68
  const n = labels.length
  const angle = i => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i, f) => [cx + r * f * Math.cos(angle(i)), cy + r * f * Math.sin(angle(i))]

  return (
    <svg viewBox="0 0 176 176" width="148" height="148">
      {[0.25,0.5,0.75,1].map(lv => (
        <polygon key={lv} points={Array.from({length:n},(_,i)=>pt(i,lv).join(',')).join(' ')} fill="none" stroke="#f0e0e8" strokeWidth="1.2"/>
      ))}
      {Array.from({length:n},(_,i)=>(
        <line key={i} x1={cx} y1={cy} x2={pt(i,1)[0]} y2={pt(i,1)[1]} stroke="#f0e0e8" strokeWidth="1"/>
      ))}
      <polygon points={vals.map((v,i)=>pt(i,v).join(',')).join(' ')} fill={`${P}28`} stroke={P} strokeWidth="1.8"/>
      {vals.map((v,i)=>(
        <circle key={i} cx={pt(i,v)[0]} cy={pt(i,v)[1]} r="4" fill={P} stroke="#fff" strokeWidth="1.5"/>
      ))}
      {labels.map((lb,i)=>{
        const [x,y]=pt(i,1.28)
        return(
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="DM Sans, sans-serif" fill="#999">
            {lb.split('\n').map((l,j)=><tspan key={j} x={x} dy={j===0?0:10}>{l}</tspan>)}
          </text>
        )
      })}
    </svg>
  )
}

// ══════════════════════════════════════════════════════════════
// FEATURES
// ══════════════════════════════════════════════════════════════
function Features() {
  const sideIcons = [FiUser, BsChatSquareText, FiArrowRight, FiUsers]

  const cardBase = {
    background: '#fff', border: `1.5px solid ${PB}`, borderRadius: 24,
    overflow: 'hidden', boxShadow: '0 4px 16px rgba(122,0,75,.06)',
    display: 'flex', flexDirection: 'column'
  }

  return (
    <section id="features" className="section-pad" style={{ padding: '80px 40px', background: '#fff' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{ maxWidth: 1280, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px,3.2vw,42px)', fontFamily: 'Sora, sans-serif', fontWeight: 800, color: D, margin: '0 0 14px', lineHeight: 1.2 }}>
            Powerful <span style={{ color: P }}>Features</span><br />
            Built for <span style={{ color: P }}>Modern</span> Teams
          </h2>
          <p style={{ fontSize: 15, fontFamily: 'DM Sans, sans-serif', color: G, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Everything you need to hire smarter, evaluate better, and empower your employees.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }} className="feat-grid">

          {/* Card 1: AI Recruitment */}
          <div className="feat-card" style={cardBase}>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: PL, border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HiOutlineSparkles style={{ color: P, fontSize: 22 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, margin: '0 0 6px' }}>AI Recruitment</h3>
                  <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: G, lineHeight: 1.65, margin: 0 }}>
                    Find the right talent faster with AI-powered candidate screening, smart matching, and automated shortlisting.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, margin: '12px 16px 0', background: PL, borderRadius: '14px 14px 0 0', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: 36, background: P, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 14 }}>
                {sideIcons.map((Icon, i) => <Icon key={i} style={{ color: 'rgba(255,255,255,.7)', fontSize: 14 }} />)}
              </div>
              <div style={{ flex: 1, padding: '12px 12px 16px' }}>
                <div style={{ fontSize: 9, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Top Matched Candidates</div>
                {[
                  { name: 'Baibhav Gangwar', role: 'UI/UX Designer', pct: 96 },
                  { name: 'Ashish Gangwar', role: 'Full stack Developer', pct: 92 },
                  { name: 'Pawan Kumar', role: 'Frontend Developer', pct: 89 },
                ].map((c) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: '#fff', borderRadius: 10, padding: '6px 10px' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${P}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FiUser style={{ color: P, fontSize: 11 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: D, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                      <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'DM Sans' }}>{c.role}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <div style={{ width: 40, height: 4, background: '#e8e8e8', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${c.pct}%`, background: P, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#00b050', fontFamily: 'Instrument Sans' }}>{c.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href="#" style={{ fontSize: 13, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: P, textDecoration: 'none' }}>Smart hiring. Better teams.</a>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiArrowRight style={{ color: P, fontSize: 14 }} />
              </div>
            </div>
          </div>

          {/* Card 2: Performance Reviews */}
          <div className="feat-card" style={cardBase}>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: PL, border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BsGraphUp style={{ color: P, fontSize: 22 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, margin: '0 0 6px' }}>Performance Reviews</h3>
                  <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: G, lineHeight: 1.65, margin: 0 }}>
                    Simplify performance evaluations with customizable reviews, goal tracking, and actionable feedback.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, margin: '12px 16px 0', background: PL, borderRadius: '14px 14px 0 0', padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Performance Overview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'DM Sans', color: '#aaa', marginBottom: 2 }}>Average Rating</div>
                  <div style={{ fontSize: 32, fontFamily: 'Sora, sans-serif', fontWeight: 800, color: D, lineHeight: 1, marginBottom: 2 }}>4.6</div>
                  <div style={{ color: P, fontSize: 14, letterSpacing: 2 }}>★★★★★</div>
                </div>
                <RadarChart />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: G, fontWeight: 600 }}>Goals Achieved</span>
                  <span style={{ fontSize: 11, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: P }}>82%</span>
                </div>
                <div style={{ width: '100%', height: 7, background: '#e8d8e8', borderRadius: 6 }}>
                  <div style={{ width: '82%', height: '100%', background: P, borderRadius: 6 }} />
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href="#" style={{ fontSize: 13, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: P, textDecoration: 'none' }}>Evaluate. Improve. Grow.</a>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiArrowRight style={{ color: P, fontSize: 14 }} />
              </div>
            </div>
          </div>

          {/* Card 3: Employee Portal */}
          <div className="feat-card" style={cardBase}>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: PL, border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BsPersonBadge style={{ color: P, fontSize: 22 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, margin: '0 0 6px' }}>Employee Portal</h3>
                  <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: G, lineHeight: 1.65, margin: 0 }}>
                    Empower employees with a self-service portal for profiles, documents, requests, and company updates.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, margin: '12px 16px 0', background: PL, borderRadius: '14px 14px 0 0', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: 36, background: P, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 14 }}>
                {sideIcons.map((Icon, i) => <Icon key={i} style={{ color: 'rgba(255,255,255,.7)', fontSize: 14 }} />)}
              </div>
              <div style={{ flex: 1, padding: '12px 10px 16px' }}>
                <div style={{ fontSize: 11, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D, marginBottom: 10 }}>Welcome back, Baibhav!</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {[
                    { icon: <FiUser />, label: 'My\nprofile' },
                    { icon: <FiBell />, label: 'Company\nNews' },
                    { icon: <FiFileText />, label: 'My\nDocuments' },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#fff', borderRadius: 10, padding: '8px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: `1px solid ${PB}` }}>
                      <div style={{ color: P, fontSize: 16 }}>{item.icon}</div>
                      <div style={{ fontSize: 8, fontFamily: 'Instrument Sans, sans-serif', color: P, lineHeight: 1.3, fontWeight: 600, whiteSpace: 'pre-line' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#fff', borderRadius: 10, padding: '8px 10px', marginBottom: 6, border: `1px solid ${PB}` }}>
                  <div style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', color: '#aaa', marginBottom: 2, fontWeight: 600 }}>Upcoming Leave</div>
                  <div style={{ fontSize: 11, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D }}>15 - 18 May 2024</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 10, padding: '8px 10px', border: `1px solid ${PB}` }}>
                  <div style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', color: '#aaa', marginBottom: 4, fontWeight: 600 }}>Team Birthday</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FiUser style={{ color: '#fff', fontSize: 12 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: D }}>Baibhav Gangwar</div>
                      <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'DM Sans' }}>May 05</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href="#" style={{ fontSize: 13, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, color: P, textDecoration: 'none' }}>Everything you need, in one place.</a>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiArrowRight style={{ color: P, fontSize: 14 }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// PRICING
// ══════════════════════════════════════════════════════════════
function Pricing() {
  const plans = [
    {
      name: 'Startup', desc: 'Perfect for small teams getting started',
      price: '₹109', dark: false,
      features: ['Employee database','Attendance tracking','Leave management','Basic payroll','Employee self-service portal','Email support']
    },
    {
      name: 'Business', desc: 'For growing businesses that need more. Everything in Starter +',
      price: '₹249', dark: true, popular: true,
      features: ['Recruitment / Applicant tracking','Performance management','Advanced payroll','Custom policies/workflows','Reports & analytics','Priority support']
    },
    {
      name: 'Enterprise', desc: 'Ultimate power and flexibility. Everything in Growth +',
      price: '₹499', dark: false,
      features: ['Multi-company support','Role-based permissions','SSO','API access','Custom integrations','Dedicated account manager']
    }
  ]

  const badges = [
    { icon: <FiShield size={20}/>, label: 'Secure & Compliant', desc: 'Enterprise-grade security with regular backups.' },
    { icon: <FiLink size={20}/>, label: 'Easy Integration', desc: 'Seamlessly integrates with your favorite tools.' },
    { icon: <FiActivity size={20}/>, label: '99.9% Uptime', desc: 'Reliable performance you can count on.' },
    { icon: <FiBookOpen size={20}/>, label: 'Free Onboarding', desc: 'We help you and your team get started.' },
  ]

  return (
    <section id="pricing" className="section-pad" style={{ padding: '80px 40px', background: '#fff' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{ maxWidth: 1280, margin: '0 auto' }}>
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
            <div key={p.name} className={`pricing-card${p.popular ? ' pricing-card-popular' : ''}`} style={{
              position: 'relative', borderRadius: 24, padding: '36px 30px',
              display: 'flex', flexDirection: 'column', gap: 20,
              background: p.dark ? P : '#fff',
              border: p.dark ? 'none' : `1.5px solid ${PB}`,
              boxShadow: p.dark ? `0 24px 64px ${P}50` : '0 4px 16px rgba(122,0,75,.06)',
            }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                  <span style={{ background: D, color: '#fff', fontSize: 11, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, padding: '6px 20px', borderRadius: 50, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
                    Most Popular
                  </span>
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
              <button style={{
                marginTop: 'auto', width: '100%', padding: '12px 0', borderRadius: 50,
                fontSize: 14, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700, cursor: 'pointer',
                background: p.dark ? '#fff' : 'transparent', color: P,
                border: p.dark ? 'none' : `2px solid ${P}`, transition: 'all .2s'
              }}>
                Start Free Trial
              </button>
            </div>
          ))}
        </div>

        {/* Storage */}
        <div style={{ background: PL, borderRadius: 20, padding: '22px 28px', marginBottom: 22, border: `1px solid ${PB}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 16, alignItems: 'center' }} className="storage-grid">
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

        {/* Trust badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }} className="badge-grid">
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

        {/* Expert banner */}
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
          <a href="#expert" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, background: P, color: '#fff',
            fontSize: 13, fontFamily: 'Instrument Sans, sans-serif', fontWeight: 700,
            padding: '12px 24px', borderRadius: 50, textDecoration: 'none', whiteSpace: 'nowrap',
            transition: 'background .2s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = PH}
            onMouseLeave={e => e.currentTarget.style.background = P}>
            Talk to an Expert <FiArrowRight />
          </a>
        </div>
      </motion.div>
    </section>
  )
}
/// ================= TESTIMONIALS =================
function Testimonials() {
  const testimonials = [
    {
      quote:
        "TorchX has completely transformed our hiring process. The AI recruitment feature helps us find the right talent faster and with better accuracy.",
      name: "Alexa Morgan",
      role: "HR Manager",
      initials: "AM"
    },
    {
      quote:
        "The employee portal is a game changer. Our team loves the easy access to documents, requests, and updates all in one place.",
      name: "Anaya Varma",
      role: "HR Director",
      initials: "AV"
    },
    {
      quote:
        "Performance reviews are now simple, transparent and fully data-driven across all teams.",
      name: "Rohan Sharma",
      role: "People Operations Lead",
      initials: "RS"
    }
  ];

  return (
    <section
      id="testimonials"
      style={{
        background: "#F8EAF1",
        padding: "120px 40px"
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: "70px" }}>
          <h2
            style={{
              fontSize: "56px",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-1px",
              color: "#1C1C1C",
              marginBottom: "18px"
            }}
          >
            Loved by <span style={{ color: "#7A0148" }}>Teams</span>, Trusted by{" "}
            <span style={{ color: "#7A0148" }}>Leaders</span>
          </h2>

          <p
            style={{
              fontSize: "18px",
              fontWeight: 500,
              lineHeight: 1.6,
              color: "#5E5E5E",
              maxWidth: "720px",
              margin: "0 auto"
            }}
          >
            Discover how forward-thinking companies are transforming HR
            operations with intelligent talent solutions.
          </p>
        </div>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "28px",
            marginBottom: "70px"
          }}
        >
          {testimonials.map((item, index) => (
            <div
              key={index}
              style={{
                background: "#FFFFFF",
                border: "1px solid #D9A7C1",
                borderRadius: "16px",
                padding: "32px",
                boxShadow: "0 8px 30px rgba(122, 1, 72, 0.08)"
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                  color: "#7A0148",
                  marginBottom: "18px",
                  fontWeight: "700"
                }}
              >
                "
              </div>

              <p
                style={{
                  fontSize: "16px",
                  lineHeight: 1.55,
                  color: "#5E5E5E",
                  marginBottom: "30px"
                }}
              >
                {item.quote}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px"
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "#7A0148",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700"
                  }}
                >
                  {item.initials}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      color: "#1C1C1C"
                    }}
                  >
                    {item.name}
                  </div>

                  <div
                    style={{
                      fontSize: "13px",
                      color: "#5E5E5E"
                    }}
                  >
                    {item.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Strip */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #D9A7C1",
            borderRadius: "16px",
            padding: "34px 42px",
            boxShadow: "0 8px 30px rgba(122,1,72,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#1C1C1C",
                marginBottom: "10px"
              }}
            >
              Join 100+ companies growing with TorchX
            </h3>

            <p
              style={{
                fontSize: "16px",
                color: "#5E5E5E"
              }}
            >
              Better hiring. Smarter workforce management.
            </p>
          </div>

          <button
            style={{
              background: "#7A0148",
              color: "#fff",
              border: "none",
              padding: "16px 34px",
              borderRadius: "999px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 8px 20px rgba(122,1,72,0.15)"
            }}
          >
            Book Free Trial
          </button>
        </div>
      </div>
    </section>
  );
}


// ================= FOOTER =================
function Footer() {
  
  const columns = [
    {
      title: "Product",
      links: ["Features", "Pricing", "Security", "Roadmap"]
    },
    {
      title: "Solutions",
      links: ["Talent", "Engage", "Finance", "Pay"]
    },
    {
      title: "Resources",
      links: ["Documentation", "Guides", "Blog", "Community"]
    }
  ];

  return (
    <footer
      style={{
        background: "#F8EAF1",
        borderTop: "1px solid #D9A7C1"
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "90px 40px",
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr 1fr 1fr",
          gap: "50px"
        }}
      ><div>
  <img
    src={logo}
    alt="TorchX Logo"
    style={{
      height: "clamp(42px, 5vw, 58px)",
      width: "auto",
      objectFit: "contain",
      display: "block"
    }}
  />

  <p
    style={{
      fontSize: "16px",
      lineHeight: "1.7",
      color: "#5E5E5E",
      margin: "18px 0"
    }}
  >
    AI-powered talent intelligence built for modern enterprises.
  </p>
</div>

        {/* Columns */}
        {columns.map((col, i) => (
          <div key={i}>
            <h4
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#7A0148",
                marginBottom: "20px"
              }}
            >
              {col.title}
            </h4>

            {col.links.map((link, idx) => (
              <p
                key={idx}
                style={{
                  fontSize: "16px",
                  fontWeight: "500",
                  color: "#5E5E5E",
                  marginBottom: "14px",
                  cursor: "pointer"
                }}
              >
                {link}
              </p>
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          borderTop: "1px solid #D9A7C1",
          padding: "24px",
          textAlign: "center",
          color: "#5E5E5E",
          fontSize: "15px"
        }}
      >
        TorchX™ — A Product of Techtorch Solutions Private Limited
      </div>
    </footer>
  );
}
// ══════════════════════════════════════════════════════════════
// DEFAULT EXPORT
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