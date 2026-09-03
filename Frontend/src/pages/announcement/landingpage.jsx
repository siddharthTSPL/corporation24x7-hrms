import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FiMenu, FiX, FiArrowRight, FiCheck,
  FiLinkedin, FiInstagram, FiMail,
  FiShield, FiLink, FiActivity, FiBookOpen,
  FiUser, FiFileText, FiBell, FiHardDrive,
  FiUsers, FiStar, FiBarChart2,
  FiLogOut, FiSettings, FiMessageSquare
} from 'react-icons/fi'
import { FaXTwitter, FaYoutube } from "react-icons/fa6";
import { HiOutlineSparkles } from 'react-icons/hi'
import { BsPeopleFill, BsGraphUp, BsPersonBadge } from 'react-icons/bs'
import {
  RadarChart as RechartsRadar, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer
} from 'recharts'
import logo from '../../assets/TorchX.svg'
import PlantImage from '../../assets/plant.png'
import { useAuth } from '../../auth/store/getmeauth/getmeauth'

const radarData = [
  { metric: 'Leadership', value: 85 },
  { metric: 'Teamwork', value: 72 },
  { metric: 'Quality', value: 90 },
  { metric: 'Problem Solving', value: 68 },
  { metric: 'Communication', value: 80 },
]

const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
const cardVariant = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Sans:wght@400;500;600;700&display=swap');

  .font-display { font-family: 'Sora', sans-serif; }
  .font-body { font-family: 'DM Sans', sans-serif; }
  .font-ui { font-family: 'Instrument Sans', sans-serif; }
  .font-hero { font-family: 'Roboto', sans-serif; }

  html { scroll-behavior: smooth; overflow-x: hidden; }
  body { -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  .scroll-anchor { scroll-margin-top: 90px; }

  @keyframes menuDrop {
    from { opacity: 0; transform: translateY(-8px); max-height: 0; }
    to   { opacity: 1; transform: translateY(0);    max-height: 360px; }
  }
  .nav-mobile-menu { overflow: hidden; animation: menuDrop .24s ease both; }
`

const Wrap = ({ children, className = '' }) => (
  <div className={`max-w-[1500px] mx-auto w-full px-5 sm:px-10 lg:px-16 ${className}`}>
    {children}
  </div>
)

function Divider() {
  return (
    <div className="bg-[#FDF4F8] py-3 flex items-center">
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#EAC7D7] to-transparent" />
    </div>
  )
}

function Navbar({ accountLabel, onAccountClick, scrollContainerRef }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const links = ['Features', 'Testimonials', 'Pricing', 'About']

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const scrollToTop = () => {
    scrollContainerRef?.current?.scrollTo({ top: 0, behavior: 'smooth' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' })
    document.body.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 w-full z-[9999] bg-white transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_2px_16px_rgba(122,0,75,.08)]' : 'shadow-[0_1px_0_#f0e0e8]'
      }`}
    >
      <div className="max-w-[1500px] mx-auto px-5 sm:px-10 lg:px-16 h-[72px] flex items-center justify-between">
        <img src={logo} alt="TorchX Talent logo" className="h-9 sm:h-11 w-auto object-contain block" />

        <div className="hidden lg:flex items-center gap-9">
          {links.map(l => (
            <a
              key={l}
              href={l === 'About' ? '#' : `#${l.toLowerCase()}`}
              onClick={(e) => {
                if (l === 'About') {
                  e.preventDefault()
                  scrollToTop()
                }
              }}
              className="text-[15px] font-ui font-medium text-[#5C5C5C] no-underline transition-colors hover:text-[#7A004B]"
            >
              {l}
            </a>
          ))}
          <button
            onClick={onAccountClick}
            className="bg-[#7A004B] text-white text-sm font-ui font-semibold px-7 py-2.5 rounded-full border-none cursor-pointer whitespace-nowrap shadow-[0_4px_18px_rgba(122,0,75,0.25)] transition-all hover:bg-[#5a0033] hover:-translate-y-0.5"
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
          {links.map(l => (
            <a
              key={l}
              href={l === 'About' ? '#' : `#${l.toLowerCase()}`}
              onClick={(e) => {
                if (l === 'About') {
                  e.preventDefault()
                  scrollToTop()
                }
                setOpen(false)
              }}
              className="text-[15px] font-ui font-medium text-[#5C5C5C] no-underline"
            >
              {l}
            </a>
          ))}
          <button
            onClick={() => { setOpen(false); onAccountClick() }}
            className="bg-[#7A004B] text-white text-sm font-ui font-semibold py-3 rounded-full border-none cursor-pointer text-center"
          >
            {accountLabel}
          </button>
        </div>
      )}
    </nav>
  )
}

function AnalyticsCard() {
  const P = '#7A004B'
  return (
    <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(115,0,66,0.18)] w-[clamp(140px,18vw,200px)] border-[1.5px] border-[#e0c8d8] flex flex-row overflow-hidden">
      <div className="w-3 shrink-0" style={{ background: P }} />
      <div className="flex-1 px-2.5 py-2.5 flex flex-col gap-1.5">
        <div className="text-[8px] font-bold text-[#999] tracking-[1.5px] uppercase font-ui">Analytics</div>
        <div className="border border-[#e0c8d8] rounded-[7px] px-[5px] pt-[5px] pb-[3px] bg-white">
          <svg width="100%" height="44" viewBox="0 0 120 44">
            <line x1="10" y1="2" x2="10" y2="38" stroke="#e0c8d8" strokeWidth="0.8" />
            <line x1="10" y1="38" x2="118" y2="38" stroke="#e0c8d8" strokeWidth="0.8" />
            <polyline points="10,34 22,28 32,30 42,18 52,24 62,12 72,18 82,10 92,14 102,7 112,11" fill="none" stroke="#f0d0e4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <polyline points="10,34 22,28 32,30 42,18 52,24 62,12 72,18 82,10 92,14 102,7 112,11" fill="none" stroke={P} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="102" cy="7" r="2.5" fill={P} />
          </svg>
        </div>
        <div className="flex gap-1.5 items-stretch">
          <div className="border border-[#e0c8d8] rounded-[7px] p-[5px] bg-white flex items-center justify-center shrink-0">
            <svg width="34" height="34" viewBox="0 0 34 34">
              <circle cx="17" cy="17" r="15" fill="#f0dcea" />
              <path d="M17,17 L17,2 A15,15 0 1,1 4.5,24.5 Z" fill={P} />
              <circle cx="17" cy="17" r="6" fill="white" />
            </svg>
          </div>
          <div className="flex-1 border border-[#e0c8d8] rounded-[7px] px-[5px] py-1 bg-white">
            <svg width="100%" height="34" viewBox="0 0 80 34">
              <rect x="1" y="22" width="8" height="10" rx="2" fill="#f0dcea" />
              <rect x="12" y="18" width="8" height="14" rx="2" fill="#f0dcea" />
              <rect x="23" y="12" width="8" height="20" rx="2" fill={P} opacity=".6" />
              <rect x="34" y="6" width="8" height="26" rx="2" fill={P} />
              <rect x="45" y="10" width="8" height="22" rx="2" fill="#CD166E" />
              <rect x="56" y="14" width="8" height="18" rx="2" fill={P} opacity=".8" />
              <rect x="67" y="20" width="8" height="12" rx="2" fill="#f0dcea" />
            </svg>
          </div>
        </div>
        <div className="rounded-[6px] h-3.5 flex items-center px-2 gap-1" style={{ background: P }}>
          {[55, 36, 22].map((w, i) => (
            <div key={i} className="h-[3px] rounded-sm bg-white/25" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TalkToExpertButton({ phone = '+917017415604', className }) {
  const [copied, setCopied] = useState(false)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  const handleClick = (e) => {
    if (!isMobile) {
      e.preventDefault()
      navigator.clipboard.writeText(phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
     <a
      href={`tel:${phone}`}
      onClick={handleClick}
      className={className}
    >
      {copied ? `Copied: ${phone}` : 'Talk To Expert'}
    </a>
  )
}

function DashboardMockup() {
  const P = '#7A004B'
  return (
    <div className="bg-white relative overflow-visible">
      <div className="relative px-6 pt-12 pb-20 flex items-center justify-center">
        <div
          className="absolute top-[10%] right-[8%] w-[420px] h-[480px] z-0"
          style={{
            background: 'radial-gradient(ellipse at 60% 40%, #f5d6e8 0%, #fdf0f7 60%, transparent 100%)',
            borderRadius: '60% 40% 55% 45% / 50% 55% 45% 50%',
          }}
        />
        <div className="relative z-[2] w-full max-w-full">
          <div className="absolute -bottom-7 -left-9 z-20">
            <AnalyticsCard />
          </div>
          <svg viewBox="0 0 960 660" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"
            className="w-full max-w-full h-auto rounded-[18px] block mx-auto overflow-hidden"
            style={{ filter: 'drop-shadow(0 24px 64px rgba(115,0,66,0.20))' }}>
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
            <text x="40" y="272" fontFamily="Instrument Sans,sans-serif" fontSize="13" fontWeight="400" fill="#555">Logout</text>
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

function Hero() {
  return (
    <section className="bg-white overflow-hidden pt-20 pb-[72px]">
      <Wrap>
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] items-center gap-10 lg:gap-[60px] mt-5 lg:mt-0">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="max-w-[520px]"
          >
            <p className="font-ui font-semibold text-[#7A004B] tracking-[1px] uppercase text-[13px] mb-3">
              TorchX Talent — HRMS Software
            </p>

            <h1 className="font-hero font-medium text-[#111] leading-[1.08] mb-5 text-[clamp(1.8rem,5vw,4rem)] tracking-[-1px]">
              Manage Your Workforce
              <br />
              With Smart <span className="text-[#7A004B]">HR Solutions</span>
            </h1>

            <p className="font-hero font-normal text-[#555] leading-[1.75] mb-8 text-[clamp(0.9rem,1.8vw,1.1rem)] max-w-[480px]">
              TorchX Talent is a complete Human Resource Management System (HRMS) that helps you optimize every stage of the employee lifecycle — from hiring to performance to payroll — with a robust and reliable platform.
            </p>

            <div className="flex flex-wrap gap-3.5">
              <a
                href="https://torchxsuite.com/signup"
                className="inline-flex items-center gap-2 bg-[#7A004B] text-white text-[15px] font-ui font-semibold px-7 py-3.5 rounded-full border-none cursor-pointer shadow-[0_8px_24px_rgba(122,0,75,0.25)] transition-all hover:bg-[#5a0033] hover:-translate-y-0.5"
              >
                Sign Up for Talent Account <FiArrowRight />
              </a>
              <a
                href="tel:+917454098820"
  className="inline-flex items-center gap-2 border-2 border-[#7A004B] text-[#7A004B] bg-transparent text-[15px] font-ui font-semibold px-7 py-3.5 rounded-full no-underline transition-all hover:bg-[#FDF4F8] hover:-translate-y-0.5"
>
  Talk To Expert
</a>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="w-full pb-[clamp(15px,3vw,36px)] overflow-visible"
          >
            <DashboardMockup />
          </motion.div>
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
    <section className="bg-white pt-0 pb-12">
      <Wrap>
        <motion.div
          variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-1 max-[480px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.08 }} viewport={{ once: true }}
              className="bg-white rounded-[18px] p-6 border border-[#EAC7D7] shadow-[0_2px_12px_rgba(122,0,75,.06)] flex items-center gap-4 transition-all hover:shadow-[0_10px_32px_rgba(122,0,75,0.10)] hover:-translate-y-1"
            >
              <div className="w-13 h-13 rounded-full bg-[#7A004B] flex items-center justify-center shrink-0 text-white">
                {s.icon}
              </div>
              <div>
                <div className="text-[28px] font-display font-extrabold text-[#7A004B] leading-[1.1]">{s.num}</div>
                <div className="text-[13px] font-body font-semibold text-[#111] leading-[1.4] mt-0.5">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Wrap>
    </section>
  )
}

function MiniSidebar() {
  const icons = [FiUser, FiMessageSquare, FiUsers, FiSettings, FiLogOut]
  return (
    <div className="w-11 bg-[#7A004B] rounded-l-xl flex flex-col items-center py-3.5 gap-4.5 shrink-0">
      {icons.map((Icon, i) => (
        <Icon key={i} className={i === 0 ? 'text-white text-[15px]' : 'text-white/45 text-[15px]'} />
      ))}
    </div>
  )
}

function AIRecruitmentCard() {
  const candidates = [
    { name: 'Baibhav Gangwar', role: 'UI/UX Designer', pct: 96 },
    { name: 'Ashish Gangwar', role: 'Full Stack Developer', pct: 92 },
    { name: 'Pawan Kumar', role: 'Frontend Developer', pct: 89 },
  ]
  return (
    <motion.div
      variants={cardVariant}
      className="feat-card bg-white border-2 border-[#7A004B] rounded-[18px] overflow-hidden shadow-[0_8px_24px_rgba(122,0,75,0.08)] flex flex-col transition-all duration-300 hover:-translate-y-2.5 hover:shadow-[0_16px_48px_rgba(122,0,75,0.18)]"
    >
      <div className="px-8 pt-8 pb-4">
        <div className="w-14 h-14 bg-[#FDF4F8] rounded-2xl flex items-center justify-center mb-3.5">
          <HiOutlineSparkles className="text-[#7A004B] text-[26px]" />
        </div>
        <h3 className="text-lg font-display font-bold text-[#111] mb-2">AI Recruitment</h3>
        <p className="text-[13px] text-[#5C5C5C] leading-[1.65] font-body">
          Find the right talent faster with AI-powered candidate screening, smart matching, and automated shortlisting.
        </p>
      </div>
      <div className="mx-4 bg-[#FDF4F8] rounded-t-xl overflow-hidden flex flex-1">
        <MiniSidebar />
        <div className="flex-1 px-3 pt-3.5 pb-4">
          <div className="text-[9px] font-ui font-bold text-[#aaa] uppercase tracking-[0.8px] mb-2.5">Top Matched Candidates</div>
          {candidates.map(c => (
            <div key={c.name} className="flex items-center gap-2 mb-2 bg-white rounded-[10px] px-2.5 py-1.5 border border-[#EAC7D7]">
              <div className="w-7 h-7 rounded-full bg-[#7A004B]/[0.09] flex items-center justify-center shrink-0">
                <FiUser className="text-[#7A004B] text-xs" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-ui font-bold text-[#111] whitespace-nowrap overflow-hidden text-ellipsis">{c.name}</div>
                <div className="text-[8px] text-[#bbb] font-body">{c.role}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-[42px] h-1 bg-[#e8e0ec] rounded overflow-hidden">
                  <div className="h-full bg-[#00b050] rounded" style={{ width: `${c.pct}%` }} />
                </div>
                <span className="text-[9px] font-bold text-[#00b050] font-ui">{c.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-8 py-3.5 border-t border-[#EAC7D7] flex justify-between items-center">
        <span className="text-xs font-ui font-bold text-[#7A004B]">Smart hiring. Better teams.</span>
        <div className="w-[30px] h-[30px] rounded-full border-[1.5px] border-[#EAC7D7] flex items-center justify-center">
          <FiArrowRight className="text-[#7A004B] text-[13px]" />
        </div>
      </div>
    </motion.div>
  )
}

function PerformanceCard() {
  const P = '#7A004B'
  return (
    <motion.div
      variants={cardVariant}
      className="feat-card bg-white border-2 border-[#7A004B] rounded-[18px] overflow-hidden shadow-[0_8px_24px_rgba(122,0,75,0.08)] flex flex-col transition-all duration-300 hover:-translate-y-2.5 hover:shadow-[0_16px_48px_rgba(122,0,75,0.18)]"
    >
      <div className="px-8 pt-8 pb-4">
        <div className="w-14 h-14 bg-[#FDF4F8] rounded-2xl flex items-center justify-center mb-3.5">
          <BsGraphUp className="text-[#7A004B] text-2xl" />
        </div>
        <h3 className="text-lg font-display font-bold text-[#111] mb-2">Performance Reviews</h3>
        <p className="text-[13px] text-[#5C5C5C] leading-[1.65] font-body">
          Simplify performance evaluations with customizable reviews, goal tracking, and actionable feedback.
        </p>
      </div>
      <div className="mx-4 bg-[#FDF4F8] rounded-t-xl px-3.5 pt-3.5 pb-2.5 flex-1">
        <div className="text-[9px] font-ui font-bold text-[#aaa] uppercase tracking-[0.8px] mb-2.5">Performance Overview</div>
        <div className="flex items-center gap-1.5 mb-3">
          <div className="min-w-[80px]">
            <div className="text-[9px] text-[#aaa] font-body mb-0.5">Avg Rating</div>
            <div className="text-[30px] font-display font-extrabold text-[#111] leading-none mb-0.5">4.6</div>
            <div className="text-[#7A004B] text-[13px] tracking-widest">★★★★★</div>
          </div>
          <div className="flex-1 h-[110px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsRadar data={radarData} margin={{ top: 6, right: 10, bottom: 6, left: 10 }}>
                <PolarGrid stroke="#e8d0de" strokeWidth={0.8} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 7, fill: '#aaa', fontFamily: 'DM Sans, sans-serif' }} />
                <Radar dataKey="value" name="Score" stroke={P} fill={P} fillOpacity={0.15} strokeWidth={1.8} dot={{ r: 3, fill: P, strokeWidth: 1.5, stroke: '#fff' }} />
              </RechartsRadar>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-[10px] px-2.5 py-2 border border-[#EAC7D7]">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-body text-[#5C5C5C] font-semibold">Goals Achieved</span>
            <span className="text-[10px] font-ui font-bold text-[#7A004B]">82%</span>
          </div>
          <div className="w-full h-1.5 bg-[#e8d8e8] rounded-md">
            <div className="w-[82%] h-full bg-[#7A004B] rounded-md" />
          </div>
        </div>
      </div>
      <div className="px-8 py-3.5 border-t-2 border-[#7A004B] flex justify-between items-center">
        <span className="text-xs font-ui font-bold text-[#7A004B]">Evaluate. Improve. Grow.</span>
        <div className="w-[30px] h-[30px] rounded-full border-[1.5px] border-[#EAC7D7] flex items-center justify-center">
          <FiArrowRight className="text-[#7A004B] text-[13px]" />
        </div>
      </div>
    </motion.div>
  )
}

function EmployeePortalCard() {
  const quickActions = [
    { icon: <FiUser />, label: 'My\nProfile' },
    { icon: <FiBell />, label: 'Company\nNews' },
    { icon: <FiFileText />, label: 'My\nDocs' },
    { icon: <FiUsers />, label: 'Leave\nReqs' },
  ]
  return (
    <motion.div
      variants={cardVariant}
      className="feat-card bg-white border-2 border-[#7A004B] rounded-[18px] overflow-hidden shadow-[0_8px_24px_rgba(122,0,75,0.08)] flex flex-col transition-all duration-300 hover:-translate-y-2.5 hover:shadow-[0_16px_48px_rgba(122,0,75,0.18)]"
    >
      <div className="px-8 pt-8 pb-4">
        <div className="w-14 h-14 bg-[#FDF4F8] rounded-2xl flex items-center justify-center mb-3.5">
          <BsPersonBadge className="text-[#7A004B] text-[26px]" />
        </div>
        <h3 className="text-lg font-display font-bold text-[#111] mb-2">Employee Portal</h3>
        <p className="text-[13px] text-[#5C5C5C] leading-[1.65] font-body">
          Empower employees with a self-service portal for profiles, documents, requests, and company updates.
        </p>
      </div>
      <div className="mx-4 bg-[#FDF4F8] rounded-t-xl overflow-hidden flex flex-1">
        <MiniSidebar />
        <div className="flex-1 px-2.5 pt-3 pb-3.5">
          <div className="text-[11px] font-display font-bold text-[#111] mb-2.5">Welcome back, Baibhav!</div>
          <div className="grid grid-cols-2 gap-1.5 mb-2">
            {quickActions.map(item => (
              <div key={item.label} className="bg-white rounded-[10px] py-1.5 px-1.5 text-center flex flex-col items-center gap-1 border border-[#EAC7D7]">
                <div className="text-[#7A004B] text-[15px]">{item.icon}</div>
                <div className="text-[8px] font-ui text-[#7A004B] leading-[1.3] font-semibold whitespace-pre-line">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-[10px] px-2.5 py-1.5 mb-1.5 border border-[#EAC7D7]">
            <div className="text-[8px] text-[#aaa] font-body font-semibold mb-0.5">Upcoming Leave</div>
            <div className="text-[10px] font-display font-bold text-[#111]">15 – 18 May 2024</div>
          </div>
          <div className="bg-white rounded-[10px] px-2.5 py-1.5 border border-[#EAC7D7]">
            <div className="text-[8px] text-[#aaa] font-body font-semibold mb-1.5">Team Birthday 🎂</div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-[#7A004B] flex items-center justify-center shrink-0">
                <FiUser className="text-white text-[11px]" />
              </div>
              <div>
                <div className="text-[9px] font-display font-bold text-[#111]">Baibhav Gangwar</div>
                <div className="text-[7.5px] text-[#bbb] font-body">May 05</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-8 py-3.5 border-t border-[#EAC7D7] flex justify-between items-center">
        <span className="text-xs font-ui font-bold text-[#7A004B]">Everything you need, in one place.</span>
        <div className="w-[30px] h-[30px] rounded-full border-[1.5px] border-[#EAC7D7] flex items-center justify-center">
          <FiArrowRight className="text-[#7A004B] text-[13px]" />
        </div>
      </div>
    </motion.div>
  )
}

function Features() {
  return (
    <section id="features" className="scroll-anchor bg-[#F8F5F7] font-body pt-8 pb-9">
      <Wrap>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="text-center mb-16">
            <h2 className="font-hero font-medium text-[#111] leading-[1.1] mb-6 text-[clamp(42px,5vw,52px)]">
              Powerful <span className="text-[#7A004B]">Features</span><br />Built for <span className="text-[#7A004B]">Modern</span> Teams
            </h2>
            <p className="text-xl text-[#555] leading-relaxed max-w-[700px] mx-auto font-body">
              Everything TorchX Talent offers to help you hire smarter, evaluate better, and empower your employees.
            </p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7"
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}
          >
            <AIRecruitmentCard />
            <PerformanceCard />
            <EmployeePortalCard />
          </motion.div>
        </motion.div>
      </Wrap>
    </section>
  )
}

function Pricing() {
  const [billing, setBilling] = useState('monthly') // 'monthly' | 'yearly'

  const plans = [
    {
      name: 'Basic',
      desc: 'Perfect for small teams getting started',
      inherits: null,
      monthlyPrice: 39,
      yearlyPrice: Math.round(39 * 12 * 0.83), // 17% off on annual total
      features: ['Geo Tag Attendance','Face Attendence', 'Monitoring of Employee Active and Idle Time','Leave management','Basic payroll','Analytical and Digital Dashboard','Announcements','Team Documentation','Reimbursement','Custom policies/workflows','Grievance Management','Email support (24/7)', 'Live Map Tracking','Performance Management','Timesheet','Recruitment Management','Employee Self-Service Portal','Telephonic Support (24/7)'],
      crossFeatures: ['Live Map Tracking','Performance Management','Recruitment Management','Timesheet','Employee Self-Service Portal','Telephonic Support (24/7)'] // <- yaha jo labels daloge unke aage cross aayega (text as-is rahega)
    },
    {
      name: 'Advance',
      desc: 'For growing businesses that need more',
      inherits: 'Everything in Basic +',
      monthlyPrice: 99,
      yearlyPrice: Math.round(99 * 12 * 0.83), // 17% off on annual total
      popular: true,
      features: ['Live Map Tracking','Recruitment / Applicant tracking','Face Attendence','Performance management','Integrated Advanced Payroll','Timesheet','Two-factor authentication','Custom policies/workflows','Reports & analytics','Employee Self-Service Portal','Telephonic support (24/7)'],
      crossFeatures: []
    },
    {
      name: 'Enterprise',
      desc: 'Ultimate power and flexibility',
      inherits: 'Everything in Advance +', // <- price ke neeche dark/bold highlighted dikhega
      monthlyPrice: null,
      yearlyPrice: null,
      features: [
        'Free Smartphone gifthamper',
        'Face Attendence',
        'Custom Integrations',
        'Single Sign-On',
        'API access',
        'On-premises/ Private cloud hosting',
        'Dedicated account manager',
      ],
      crossFeatures: []
    }
  ]

  const badges = [
    { icon: <FiShield size={20} />, label: 'Secure & Compliant', desc: 'Enterprise-grade security with regular backups.' },
    { icon: <FiLink size={20} />, label: 'Easy Integration', desc: 'Seamlessly integrates with your favorite tools.' },
    { icon: <FiActivity size={20} />, label: '99.9% Uptime', desc: 'Reliable performance you can count on.' },
    { icon: <FiBookOpen size={20} />, label: 'Free Onboarding', desc: 'We help you and your team get started.' },
  ]

  return (
    <section id="pricing" className="scroll-anchor bg-white pt-8 pb-9">
      <Wrap>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="text-center mb-10">
            <h2 className="font-hero font-medium text-[#111] mb-6 text-[clamp(28px,3.2vw,42px)]">
              Simple, Transparent <span className="text-[#7A004B]">Pricing</span><br />That Grows With You
            </h2>
            <p className="text-lg font-body text-[#5C5C5C] max-w-[440px] mx-auto leading-relaxed mb-8">
              Choose the perfect TorchX Talent plan for your team. Upgrade or downgrade anytime as your needs change.
            </p>

            {/* Monthly / Yearly Toggle */}
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
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-opacity duration-300 ${
                    billing === 'yearly'
                      ? 'bg-[#7A004B] text-white opacity-100'
                      : 'bg-[#7A004B] text-white opacity-40'
                  }`}
                >
                  Save 17%
                </span>
              </span>
            </div>
          </div>

          {/* items-stretch (not items-center) so every card fills the row's full height —
              combined with h-full below, this keeps Basic / Advance / Enterprise
              all exactly the same size regardless of how many features each lists. */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 items-stretch mb-6 pt-5">
            {plans.map(p => {
              const price = billing === 'yearly' ? p.yearlyPrice : p.monthlyPrice
              const suffix = billing === 'yearly' ? '/user/year' : '/user/mo'
              return (
                <div
                  key={p.name}
                  className={`relative rounded-3xl p-8 flex flex-col gap-5 bg-white border-2 border-[#7A004B] h-full transition-transform duration-300 ${
                    p.popular ? 'relative z-[5]' : 'hover:scale-[1.02]'
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-[2]">
                      <span className="bg-[#7A004B] text-white text-[11px] font-ui font-bold px-5 py-1.5 rounded-full whitespace-nowrap tracking-wide">Most Popular</span>
                    </div>
                  )}
                  <div>
                    <div className="text-lg font-display font-bold text-[#111] mb-1.5">{p.name}</div>
                    <div className="text-xs font-body text-[#999] leading-relaxed">{p.desc}</div>
                  </div>
                  <div>
                    <span className="text-[38px] font-display font-extrabold text-[#111]">
                      {price !== null ? `₹${price}` : 'Custom'}
                    </span>
                    {price !== null && (
                      <span className="text-sm font-body text-[#999] ml-1">{suffix}</span>
                    )}
                    {p.inherits && (
                      <div className="text-[15px] font-display font-extrabold text-[#7A004B] mt-1.5">
                        {p.inherits}
                      </div>
                    )}
                  </div>
                  <ul className="list-none p-0 m-0 flex flex-col gap-2.5 flex-1">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px] font-body text-[#5C5C5C]">
                        {p.crossFeatures?.includes(f) ? (
                          <FiX className="text-[#7A004B] shrink-0 mt-0.5" />
                        ) : (
                          <FiCheck className="text-[#7A004B] shrink-0 mt-0.5" />
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

          <div className="bg-[#FDF4F8] rounded-[20px] px-8 py-6 mb-6 border-2 border-[#7A004B]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 items-center">
              <div className="flex items-center gap-2.5">
                <FiHardDrive className="text-[#7A004B] text-[22px] shrink-0" />
                <div>
                  <div className="text-[13px] font-display font-bold text-[#111]">Storage Guidance</div>
                  <div className="text-[11px] font-body text-[#aaa] leading-snug">Finance documents, invoices, receipts, ledgers grow fast.</div>
                </div>
              </div>
              {[{ label: 'Startup', val: '2 GB' }, { label: 'Business', val: '20 GB' }, { label: 'Enterprise', val: '100 GB' }].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-display font-extrabold text-[#111]">{s.val}</div>
                  <div className="text-[10px] text-[#aaa] font-body mb-1">Per company</div>
                  <span className="text-[10px] bg-white text-[#7A004B] font-bold px-3.5 py-0.5 rounded-full border border-[#EAC7D7] font-ui">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {badges.map(b => (
              <div key={b.label} className="flex items-start gap-3 px-4.5 py-4 bg-[#FDF4F8] rounded-2xl border border-[#EAC7D7]">
                <div className="text-[#7A004B] shrink-0 mt-0.5">{b.icon}</div>
                <div>
                  <div className="text-xs font-display font-bold text-[#111] mb-0.5">{b.label}</div>
                  <div className="text-[11px] font-body text-[#aaa] leading-relaxed">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#FDF4F8] rounded-[20px] px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-[#EAC7D7]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-[#7A004B]/[0.09] rounded-full flex items-center justify-center shrink-0">
                <HiOutlineSparkles className="text-[#7A004B] text-xl" />
              </div>
              <div>
                <div className="text-sm font-display font-bold text-[#111]">Not sure which plan is right for you?</div>
                <div className="text-xs font-body text-[#aaa]">Our experts can help you choose the perfect plan based on your requirements.</div>
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
  const [startIndex, setStartIndex] = useState(0)
  const testimonials = [
    { quote: 'TorchX Talent has completely transformed our hiring process. The AI recruitment feature helps us find the right talent faster and with better accuracy.', name: 'KK Oberoi', role: 'HR Manager', initials: 'AL' },
    { quote: 'The employee portal is a game changer! Our team loves the easy access to documents, requests, and updates all in one place.', name: 'Anaya Varma', role: 'HR Director',  initials: 'AV' },
    { quote: 'Performance reviews are now simple, transparent, and data-driven. TorchX Talent helps us build a culture of continuous feedback and growth.', name: 'Rohan Sharma', role: 'People Operations Lead' , initials: 'RS' },
    { quote: 'TorchX Talent has significantly improved our workforce management. From onboarding to performance tracking, everything is streamlined and easy to manage.', name: 'Karan Malhotra', role: 'Head of Human Resources',  initials: 'KM' },
    { quote: 'TorchX Talent has helped us centralize all HR operations in one platform. The automation features save countless hours every week and improve team productivity.', name: 'Meera Patel', role: 'Chief People Officer',  initials: 'MP' },
  ]
  const visibleTestimonials = testimonials.slice(startIndex, startIndex + 3)

  return (
    <section id="testimonials" className="scroll-anchor bg-[#F6EDF2] font-body pt-8 pb-10">
      <Wrap>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="text-center mb-16">
            <h2 className="font-hero font-medium text-[#111] mb-6 text-[clamp(26px,3.2vw,40px)] leading-tight">
              Loved by <span className="text-[#7A004B]">Teams</span>, Trusted by <span className="text-[#7A004B]">Leaders</span>
            </h2>
            <p className="text-lg text-[#555] max-w-[440px] mx-auto leading-relaxed">
              See how organizations like yours are using TorchX Talent to streamline HR and achieve more every day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mb-12">
            {visibleTestimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.1 }} viewport={{ once: true }}
                className="testi-card bg-white border border-[#DDB7CB] rounded-[14px] p-6 shadow-[0_6px_18px_rgba(122,0,75,0.08)] flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(90,0,51,0.18)] hover:border-[#5a0033]"
              >
                <div className="text-5xl font-display font-black text-[#7A004B] leading-[0.7] mb-3.5">"</div>
                <p className="text-[13px] text-[#333] leading-[1.75] flex-1 mb-5">{t.quote}</p>
                <hr className="border-none border-t border-[#E6D6DF] mb-4" />
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#740042] to-[#740022] flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(122,0,75,0.25)]">
                    <span className="text-white text-xs font-display font-bold">{t.initials}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-display font-bold text-[#7A004B]">{t.name}</div>
                    <div className="text-[11px] text-[#777] mt-0.5">{t.role}</div>
                  </div>
                  <div className="text-[9px] font-ui font-bold text-[#888] tracking-widest uppercase border-l border-[#E6D6DF] pl-2.5">{t.co}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center items-center gap-5 mb-12">
            <button
              onClick={() => setStartIndex(prev => Math.max(prev - 1, 0))}
              className="w-[42px] h-[42px] min-w-[42px] rounded-full border-[1.5px] border-[#DDB7CB] bg-white text-[#730042] cursor-pointer flex items-center justify-center text-lg transition-all shadow-[0_4px_12px_rgba(115,0,66,0.08)] hover:bg-[#730042] hover:text-white hover:-translate-y-0.5"
            >
              ←
            </button>

            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  onClick={() => setStartIndex(i)}
                  className={`rounded-full border-none cursor-pointer p-0 transition-all duration-300 ${
                    startIndex === i ? 'w-10 h-[15px] bg-[#730042]' : 'w-[25px] h-2 bg-[#DDB7CB]'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => setStartIndex(prev => Math.min(prev + 1, testimonials.length - 3))}
              className="w-[42px] h-[42px] min-w-[42px] rounded-full border-[1.5px] border-[#DDB7CB] bg-white text-[#730042] cursor-pointer flex items-center justify-center text-lg transition-all shadow-[0_4px_12px_rgba(115,0,66,0.08)] hover:bg-[#730042] hover:text-white hover:-translate-y-0.5"
            >
              →
            </button>
          </div>

          <div className="testimonial-cta flex flex-col md:flex-row flex-wrap w-full bg-gradient-to-br from-[#FFF7FA] to-[#F9EAF2] border border-[#E7CCD9] rounded-[22px] px-8 py-12 justify-between items-start md:items-center gap-5 shadow-[0_10px_30px_rgba(122,0,75,0.08)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(122,0,75,0.15)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7A004B] to-[#B00068] shadow-[0_8px_20px_rgba(122,0,75,0.25)] rounded-full flex items-center justify-center shrink-0">
                <HiOutlineSparkles className="text-white text-xl" />
              </div>
              <div>
                <div className="text-lg font-display font-extrabold text-[#2A1120] mb-1">Join 100+ companies growing with TorchX Talent</div>
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

function LegalModal({ docKey, onClose }) {
  const doc = legalDocs[docKey]
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])
  return (
    <div
      className="fixed inset-0 bg-black/55 z-[9999] flex items-center justify-center p-5"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
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

function Footer() {
  const cols = [
    { title: 'Product', links: [
      { label: 'Talent', href: 'https://torchxsuite.com/talent/' },
      { label: 'Engage', href: '' },
      { label: 'Finance', href: '' },
      { label: 'Inventory', href: '' },
      { label: 'Payroll', href: '' },
    ] },
    { title: 'Solutions', links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
    ] },
    { title: 'Resources', links: [
      { label: 'Documentation', href: '' },
    ] },
  ]
  const socials = [
    { icon: <FiLinkedin />, href: 'https://www.linkedin.com/company/torchx-talent/', label: 'LinkedIn' },
    { icon: <FiInstagram />, href: 'https://www.instagram.com/?hl=en', label: 'Instagram' },
    { icon: <FaXTwitter />, href: 'https://x.com/home', label: 'X' },
    { icon: <FaYoutube />,  href: 'https://www.youtube.com/@techtorch_sol', label: 'YouTube' },
  ]
  const [activeDoc, setActiveDoc] = useState(null)

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
                {socials.map((s, i) => (
                  <a
                    key={i}
                    href={s.href}
                    aria-label={s.label}
                    className="text-[#7A004B] text-lg no-underline w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all hover:-translate-y-0.5 hover:text-[#5a0033]"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {cols.map(col => (
              <div key={col.title}>
                <div className="text-2xl font-display font-bold text-[#7A004B] mb-4">{col.title}</div>
                <ul className="list-none p-0 m-0 flex flex-col gap-3">
                  {col.links.map(l => (
                    <li key={l.label}>
                      {l.href ? (
                        <a
                          href={l.href}
                          className="text-base text-[#7A004B] no-underline transition-colors hover:text-[#5a0033]"
                        >
                          {l.label}
                        </a>
                      ) : (
                        <Link
                          to={`/coming-soon?product=${encodeURIComponent(l.label)}`}
                          className="text-base text-[#7A004B] no-underline transition-colors hover:text-[#5a0033]"
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
              ].map(item => (
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

export default function LandingPage() {
  const navigate = useNavigate()
  const { data: auth } = useAuth()
  const isAuthenticated = !!auth
  const scrollContainerRef = useRef(null)

  // "Access Your Talent Account" when a live session is found; falls back to
  // "Sign in to your Talent Account" while auth is still resolving/expired
  // so the button never flashes the wrong label once it's checked.
  const accountLabel = isAuthenticated
    ? 'Access Your Talent Account'
    : 'Sign in to your Talent Account'

  const handleAccountClick = () => {
    // /redirect resolves the logged-in person's role and sends them to the
    // right dashboard; if the session token expired it bounces to /login.
    navigate(isAuthenticated ? '/redirect' : '/login')
  }

  return (
    <div ref={scrollContainerRef} style={{ height: '100vh', overflowY: 'auto' }}>
      <style>{fontStyles}</style>
      <Navbar accountLabel={accountLabel} onAccountClick={handleAccountClick} scrollContainerRef={scrollContainerRef} />
      <Hero />
      <Stats />
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