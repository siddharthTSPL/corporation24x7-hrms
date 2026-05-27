import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FiMenu, FiX, FiArrowRight, FiCheck,
  FiLinkedin, FiInstagram, FiTwitter, FiMail,
  FiShield, FiLink, FiActivity, FiBookOpen,
  FiUser, FiFileText, FiBell, FiHardDrive,
  FiHome, FiUsers, FiCalendar, FiSettings,
  FiLogOut, FiFolder, FiStar, FiBarChart2, FiGift
} from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi'
import { BsPeopleFill, BsGraphUp, BsPersonBadge, BsChatSquareText } from 'react-icons/bs'
import { MdOutlineAnnouncement, MdOutlineCorporateFare } from 'react-icons/md'
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
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        padding: '0 40px', height: 72,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <span style={{ fontSize: 26, fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: D, letterSpacing: '-1px' }}>
              Torch<span style={{ color: P }}>X</span>
              <sup style={{ fontSize: 11, color: D, fontWeight: 400, verticalAlign: 'super' }}>™</sup>
            </span>
          </div>
          <span style={{ fontSize: 9, letterSpacing: '3px', color: '#bbb', fontFamily: 'Poppins, sans-serif', fontWeight: 500, textTransform: 'uppercase', marginTop: 1 }}>— TALENT —</span>
        </div>

        {/* Desktop links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="nav-links">
          {links.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{
              fontSize: 15, fontFamily: 'Poppins, sans-serif', fontWeight: 500, color: G,
              textDecoration: 'none', transition: 'color .2s', position: 'relative'
            }}
              onMouseEnter={e => e.currentTarget.style.color = P}
              onMouseLeave={e => e.currentTarget.style.color = G}>
              {l}
            </a>
          ))}
          <a href="/login" style={{
            background: P, color: '#fff',
            fontSize: 14, fontFamily: 'Poppins, sans-serif', fontWeight: 600,
            padding: '10px 28px', borderRadius: 50, textDecoration: 'none',
            boxShadow: `0 4px 18px ${P}40`, transition: 'all .2s'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = PH; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = P; e.currentTarget.style.transform = 'none' }}>
            Login
          </a>
        </div>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)} className="nav-burger"
          style={{ display: 'none', background: 'none', border: 'none', fontSize: 24, color: D, cursor: 'pointer' }}>
          {open ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div style={{ background: '#fff', borderTop: `1px solid ${PB}`, padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {links.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setOpen(false)}
              style={{ fontSize: 15, fontFamily: 'Poppins, sans-serif', fontWeight: 500, color: G, textDecoration: 'none' }}>{l}</a>
          ))}
          <a href="/login" style={{
            background: P, color: '#fff', fontSize: 14, fontFamily: 'Poppins, sans-serif', fontWeight: 600,
            padding: '12px 0', borderRadius: 50, textDecoration: 'none', textAlign: 'center'
          }}>Login</a>
        </div>
      )}

      <style>{`
        @media(max-width:900px){ .nav-links{display:none!important;} .nav-burger{display:block!important;} }
        @media(max-width:480px){ nav > div { padding: 0 20px !important; } }
      `}</style>
    </nav>
  )
}

// ══════════════════════════════════════════════════════════════
// HERO DASHBOARD MOCKUP — matches Figma screenshot exactly
// ══════════════════════════════════════════════════════════════
function DashboardMockup() {
  const sideIcons = [FiHome, FiCalendar, MdOutlineAnnouncement, FiUsers, FiFolder, FiSettings, FiLogOut]

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 560, marginLeft: 'auto' }}>
      {/* Pink blob behind */}
      <div style={{
        position: 'absolute', top: '8%', right: '-5%',
        width: '70%', height: '80%', borderRadius: '50% 40% 60% 50% / 50% 60% 40% 50%',
        background: 'linear-gradient(135deg, #f9e6f0 0%, #fdf4f8 100%)',
        zIndex: 0, filter: 'blur(2px)'
      }} />

      {/* Main dashboard card */}
      <div style={{
        position: 'relative', zIndex: 2,
        background: '#fff', borderRadius: 20,
        boxShadow: '0 16px 64px rgba(122,0,75,.14)',
        overflow: 'hidden', border: `1px solid ${PB}`
      }}>
        {/* Top bar */}
        <div style={{
          background: '#fafafa', borderBottom: `1px solid #f0e0e8`,
          padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <span style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: P }}>
              TorchX
            </span>
            <span style={{ fontSize: 7, letterSpacing: '2px', color: '#bbb', fontFamily: 'Poppins', marginLeft: 2 }}>TALENT</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: '#aaa', fontFamily: 'Poppins' }}>Ready</span>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>AG</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', minHeight: 340 }}>
          {/* Sidebar */}
          <div style={{
            width: 140, background: '#fff', borderRight: `1px solid #f0e0e8`,
            padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 2
          }}>
            {/* Talent group */}
            <div style={{ padding: '4px 12px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontFamily: 'Poppins, sans-serif', fontWeight: 600, color: D }}>Talent</span>
                <span style={{ fontSize: 10, color: '#aaa' }}>▾</span>
              </div>
            </div>
            {[
              { icon: FiHome, label: 'Dashboard', active: true },
              { icon: FiCalendar, label: 'Leave', active: false },
              { icon: MdOutlineAnnouncement, label: 'Announcement', active: false },
              { icon: FiUsers, label: 'Organisation', active: false },
              { icon: FiFolder, label: 'File', active: false },
              { icon: FiSettings, label: 'Settings', active: false },
              { icon: FiLogOut, label: 'Logout', active: false },
            ].map(({ icon: Icon, label, active }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', margin: '0 6px', borderRadius: 8,
                background: active ? P : 'transparent',
                cursor: 'pointer'
              }}>
                <Icon style={{ fontSize: 12, color: active ? '#fff' : '#aaa', flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontFamily: 'Poppins, sans-serif', fontWeight: active ? 600 : 400, color: active ? '#fff' : '#888', whiteSpace: 'nowrap' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Main content */}
          <div style={{ flex: 1, padding: '14px 16px', overflowX: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D }}>Dashboard</div>
                <div style={{ fontSize: 9, color: '#bbb', fontFamily: 'Poppins' }}>Welcome back, Ashish - ENCO1</div>
              </div>
            </div>

            {/* Date + check-in row */}
            <div style={{
              background: P, borderRadius: 10, padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12
            }}>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.65)', fontFamily: 'Poppins', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thursday</div>
                <div style={{ fontSize: 14, color: '#fff', fontFamily: 'Poppins', fontWeight: 700 }}>7 May 2026</div>
              </div>
              <button style={{
                background: '#fff', color: P, fontSize: 10, fontFamily: 'Poppins',
                fontWeight: 700, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer'
              }}>Check in</button>
            </div>

            {/* Info cards row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              {/* Employee card */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: '8px 10px', border: '1px solid #f0e0e8' }}>
                <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'Poppins', marginBottom: 4 }}>Employee</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 7, color: '#fff', fontWeight: 700 }}>AG</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontFamily: 'Poppins', fontWeight: 700, color: D }}>Ashish gangwar</div>
                    <div style={{ fontSize: 7, color: '#bbb' }}>SDE</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {['ENCO1','Active','END'].map((t, i) => (
                    <span key={t} style={{ fontSize: 6, padding: '1px 5px', borderRadius: 8, background: i === 1 ? '#e6f9ee' : '#f0f0f0', color: i === 1 ? '#00b050' : '#888', fontWeight: 700 }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Date of joining */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: '8px 10px', border: '1px solid #f0e0e8' }}>
                <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'Poppins', marginBottom: 6 }}>Date of joining</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${P}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: P, fontFamily: 'Poppins' }}>0.0</span>
                  </div>
                </div>
                <div style={{ fontSize: 7, color: '#bbb', textAlign: 'center', fontFamily: 'Poppins' }}>6 May 2026</div>
              </div>

              {/* Leave overview */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: '8px 10px', border: '1px solid #f0e0e8' }}>
                <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'Poppins', marginBottom: 4 }}>Leave overview</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Poppins', color: D }}>15</span>
                  <span style={{ fontSize: 7, color: '#bbb' }}>remaining</span>
                </div>
                <div style={{ fontSize: 7, color: '#aaa', fontFamily: 'Poppins', lineHeight: 1.4 }}>Accrued this month: 1.25 days</div>
                <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                  {[P, '#00b050', '#f4a800'].map((c, i) => (
                    <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: c }} />
                  ))}
                </div>
              </div>

              {/* Reporting manager */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: '8px 10px', border: '1px solid #f0e0e8' }}>
                <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'Poppins', marginBottom: 4 }}>Reporting manager</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 6, color: '#fff', fontWeight: 700 }}>AG</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: D, fontFamily: 'Poppins' }}>Ashish gangwar</div>
                    <div style={{ fontSize: 7, color: '#bbb' }}>manager</div>
                  </div>
                </div>
                <div style={{ fontSize: 7, color: '#bbb', fontFamily: 'Poppins' }}>Manage ID —</div>
              </div>
            </div>

            {/* Bottom row: Attendance calendar + Announcements */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* Attendance mini-calendar */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: '8px 10px', border: '1px solid #f0e0e8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontFamily: 'Poppins', fontWeight: 700, color: D }}>Attendance</span>
                  <span style={{ fontSize: 8, color: P, fontFamily: 'Poppins', fontWeight: 600 }}>May ▾</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 3 }}>
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} style={{ fontSize: 6, textAlign: 'center', color: '#bbb', fontFamily: 'Poppins', fontWeight: 600 }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <div key={d} style={{
                      fontSize: 7, textAlign: 'center', padding: '2px 0', borderRadius: 4,
                      background: d === 7 ? P : d === 1 || d === 2 ? '#f0e0e8' : 'transparent',
                      color: d === 7 ? '#fff' : d === 1 || d === 2 ? P : '#888',
                      fontFamily: 'Poppins', fontWeight: d === 7 ? 700 : 400
                    }}>{d}</div>
                  ))}
                </div>
              </div>

              {/* Announcements */}
              <div style={{ background: '#fafafa', borderRadius: 10, padding: '8px 10px', border: '1px solid #f0e0e8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontFamily: 'Poppins', fontWeight: 700, color: D }}>Announcements</span>
                  <span style={{ fontSize: 7, color: P, fontFamily: 'Poppins', cursor: 'pointer' }}>○</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 60, gap: 4 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: PL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BsChatSquareText style={{ color: P, fontSize: 10 }} />
                  </div>
                  <span style={{ fontSize: 8, color: '#bbb', fontFamily: 'Poppins' }}>No announcements</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating analytics card */}
      <div style={{
        position: 'absolute', bottom: -24, left: -20, zIndex: 10,
        background: '#fff', borderRadius: 16, padding: '10px 14px',
        boxShadow: '0 8px 32px rgba(0,0,0,.12)', border: `1px solid ${PB}`,
        minWidth: 160
      }}>
        <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'Poppins', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Analytics Overview</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
          {[30,55,40,70,50,85,60,75,45,90].map((h, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: '3px 3px 0 0',
              height: `${(h / 100) * 36}px`,
              background: i === 7 ? P : `${P}33`
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <div style={{ height: 3, flex: 3, borderRadius: 2, background: P }} />
          <div style={{ height: 3, flex: 2, borderRadius: 2, background: PB }} />
          <div style={{ height: 3, flex: 1, borderRadius: 2, background: '#f0f0f0' }} />
        </div>
      </div>

      {/* Decorative plant */}
      <svg style={{ position: 'absolute', bottom: -10, right: -30, zIndex: 1, opacity: 0.85 }} width="90" height="110" viewBox="0 0 90 110">
        <ellipse cx="45" cy="100" rx="18" ry="10" fill={P} opacity="0.15"/>
        <rect x="42" y="55" width="6" height="50" rx="3" fill={P} opacity="0.4"/>
        <ellipse cx="30" cy="60" rx="20" ry="14" fill={P} opacity="0.7" transform="rotate(-20,30,60)"/>
        <ellipse cx="60" cy="50" rx="22" ry="12" fill={P} transform="rotate(15,60,50)"/>
        <ellipse cx="38" cy="42" rx="16" ry="10" fill={P} opacity="0.8" transform="rotate(-10,38,42)"/>
        <ellipse cx="58" cy="72" rx="14" ry="9" fill={P} opacity="0.6" transform="rotate(25,58,72)"/>
      </svg>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// HERO
// ══════════════════════════════════════════════════════════════
function Hero() {
  return (
    <section style={{ padding: '72px 40px 48px', background: '#fff', overflow: 'hidden' }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'grid', gap: 60, alignItems: 'center'
      }} className="hero-grid">

        {/* Left */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <h1 style={{
            fontSize: 'clamp(34px, 4vw, 52px)',
            fontFamily: 'Poppins, sans-serif', fontWeight: 800,
            color: D, lineHeight: 1.15, marginBottom: 20, margin: '0 0 20px'
          }}>
            Manage Your Workforce<br />
            With Smart{' '}
            <span style={{ color: P }}>HR Solutions</span>
          </h1>
          <p style={{
            fontSize: 16, fontFamily: 'Poppins, sans-serif', fontWeight: 400,
            color: G, lineHeight: 1.75, maxWidth: 440, marginBottom: 36, margin: '0 0 36px'
          }}>
            Optimize every stage of the employee lifecycle with a robust and reliable Human Resource Management System.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <a href="#trial" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: P, color: '#fff',
              fontSize: 15, fontFamily: 'Poppins, sans-serif', fontWeight: 600,
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
              fontSize: 15, fontFamily: 'Poppins, sans-serif', fontWeight: 600,
              padding: '13px 28px', borderRadius: 50, textDecoration: 'none',
              transition: 'all .2s'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = PL; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none' }}>
              Talk To Expert
            </a>
          </div>
        </motion.div>

        {/* Right */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          style={{ paddingBottom: 36, paddingRight: 20 }}>
          <DashboardMockup />
        </motion.div>
      </div>

      <style>{`
        .hero-grid { grid-template-columns: 1fr 1fr; }
        @media(max-width:900px){ .hero-grid{ grid-template-columns:1fr!important; } }
        @media(max-width:480px){ section { padding: 48px 20px 32px!important; } }
      `}</style>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════════════
function Stats() {
  const stats = [
    { icon: <BsPeopleFill size={22} />, num: '100+', label: 'Happy customers of TorchX' },
    { icon: <FiBarChart2 size={22} />, num: '1000+', label: 'No. of live demos' },
    { icon: <FiUsers size={22} />, num: '10+', label: 'Partners to collaborate' },
    { icon: <FiStar size={22} />, num: '98%', label: 'Customer satisfaction' },
  ]

  return (
    <section style={{ padding: '40px 40px 60px', background: '#fff' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 20 }} className="stats-grid">
        {stats.map((s, i) => (
          <motion.div key={s.num}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.08 }} viewport={{ once: true }}
            style={{
              background: '#fff', borderRadius: 18, padding: '28px 24px',
              border: `1px solid ${PB}`, textAlign: 'center',
              boxShadow: '0 2px 12px rgba(122,0,75,.06)', transition: 'all .3s'
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 10px 32px ${P}1A`; e.currentTarget.style.transform = 'translateY(-4px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(122,0,75,.06)'; e.currentTarget.style.transform = 'none' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: P,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', color: '#fff'
            }}>{s.icon}</div>
            <div style={{ fontSize: 34, fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: P, marginBottom: 6 }}>{s.num}</div>
            <div style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', color: G, lineHeight: 1.5 }}>{s.label}</div>
          </motion.div>
        ))}
      </motion.div>
      <style>{`
        .stats-grid{ grid-template-columns:repeat(4,1fr); }
        @media(max-width:900px){ .stats-grid{grid-template-columns:1fr 1fr!important;} }
        @media(max-width:480px){ .stats-grid{grid-template-columns:1fr!important;} }
      `}</style>
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
        <polygon key={lv}
          points={Array.from({length:n},(_,i)=>pt(i,lv).join(',')).join(' ')}
          fill="none" stroke="#f0e0e8" strokeWidth="1.2"/>
      ))}
      {Array.from({length:n},(_,i)=>(
        <line key={i} x1={cx} y1={cy} x2={pt(i,1)[0]} y2={pt(i,1)[1]} stroke="#f0e0e8" strokeWidth="1"/>
      ))}
      <polygon
        points={vals.map((v,i)=>pt(i,v).join(',')).join(' ')}
        fill={`${P}28`} stroke={P} strokeWidth="1.8"/>
      {vals.map((v,i)=>(
        <circle key={i} cx={pt(i,v)[0]} cy={pt(i,v)[1]} r="4" fill={P} stroke="#fff" strokeWidth="1.5"/>
      ))}
      {labels.map((lb,i)=>{
        const [x,y]=pt(i,1.28)
        return(
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="8" fontFamily="Poppins, sans-serif" fill="#999">
            {lb.split('\n').map((l,j)=><tspan key={j} x={x} dy={j===0?0:10}>{l}</tspan>)}
          </text>
        )
      })}
    </svg>
  )
}

// ══════════════════════════════════════════════════════════════
// FEATURES  — matches Figma with sidebar strip
// ══════════════════════════════════════════════════════════════
function Features() {
  const sideIcons = [FiUser, BsChatSquareText, FiArrowRight, FiUsers, FiSettings]

  const cardBase = {
    background: '#fff',
    border: `1.5px solid ${PB}`,
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(122,0,75,.06)',
    display: 'flex', flexDirection: 'column',
    transition: 'all .3s'
  }

  return (
    <section id="features" style={{ padding: '80px 40px', background: '#fff' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px,3.2vw,42px)', fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: D, margin: '0 0 14px', lineHeight: 1.2 }}>
            Powerful <span style={{ color: P }}>Features</span><br />
            Built for <span style={{ color: P }}>Modern</span> Teams
          </h2>
          <p style={{ fontSize: 15, fontFamily: 'Poppins, sans-serif', color: G, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Everything you need to hire smarter, evaluate better,<br />and empower your employees.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }} className="feat-grid">

          {/* ── Card 1: AI Recruitment ── */}
          <div style={cardBase}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 16px 48px ${P}20`; e.currentTarget.style.transform = 'translateY(-8px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(122,0,75,.06)'; e.currentTarget.style.transform = 'none' }}>
            {/* Card header */}
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: PL, border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HiOutlineSparkles style={{ color: P, fontSize: 22 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D, margin: '0 0 6px' }}>AI Recruitment</h3>
                  <p style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', color: G, lineHeight: 1.65, margin: 0 }}>
                    Find the right talent faster with AI-powered candidate screening, smart matching, and automated shortlisting.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview with sidebar */}
            <div style={{ flex: 1, margin: '12px 16px 0', background: PL, borderRadius: '14px 14px 0 0', overflow: 'hidden', display: 'flex' }}>
              {/* Left icon strip */}
              <div style={{ width: 36, background: P, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 14 }}>
                {sideIcons.map((Icon, i) => (
                  <Icon key={i} style={{ color: 'rgba(255,255,255,.7)', fontSize: 14 }} />
                ))}
              </div>
              {/* Candidate list */}
              <div style={{ flex: 1, padding: '12px 12px 16px' }}>
                <div style={{ fontSize: 9, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Top Matched Candidates</div>
                {[
                  { name: 'Baibhav Gangwar', role: 'UI/UX Designer', pct: 96 },
                  { name: 'Ashish Gangwar', role: 'Full stack Developer', pct: 92 },
                  { name: 'Pawan Kumar', role: 'Frontend Developer', pct: 89 },
                ].map((c, i) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: '#fff', borderRadius: 10, padding: '6px 10px' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${P}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FiUser style={{ color: P, fontSize: 11 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                      <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'Poppins' }}>{c.role}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <div style={{ width: 40, height: 4, background: '#e8e8e8', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${c.pct}%`, background: P, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#00b050', fontFamily: 'Poppins' }}>{c.pct}%</span>
                      <span style={{ fontSize: 7, color: '#bbb', fontFamily: 'Poppins' }}>Match</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer link */}
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href="#" style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: P, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                Smart hiring. Better teams.
              </a>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiArrowRight style={{ color: P, fontSize: 14 }} />
              </div>
            </div>
          </div>

          {/* ── Card 2: Performance Reviews ── */}
          <div style={cardBase}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 16px 48px ${P}20`; e.currentTarget.style.transform = 'translateY(-8px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(122,0,75,.06)'; e.currentTarget.style.transform = 'none' }}>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: PL, border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BsGraphUp style={{ color: P, fontSize: 22 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D, margin: '0 0 6px' }}>Performance Reviews</h3>
                  <p style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', color: G, lineHeight: 1.65, margin: 0 }}>
                    Simplify performance evaluations with customizable reviews, goal tracking, and actionable feedback.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, margin: '12px 16px 0', background: PL, borderRadius: '14px 14px 0 0', padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Performance Overview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'Poppins', color: '#aaa', marginBottom: 2 }}>Average Rating</div>
                  <div style={{ fontSize: 32, fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: D, lineHeight: 1, marginBottom: 2 }}>4.6</div>
                  <div style={{ color: P, fontSize: 14, letterSpacing: 2 }}>★★★★★</div>
                </div>
                <RadarChart />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontFamily: 'Poppins, sans-serif', color: G, fontWeight: 600 }}>Goals Achieved</span>
                  <span style={{ fontSize: 11, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: P }}>82%</span>
                </div>
                <div style={{ width: '100%', height: 7, background: '#e8d8e8', borderRadius: 6 }}>
                  <div style={{ width: '82%', height: '100%', background: P, borderRadius: 6 }} />
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href="#" style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: P, textDecoration: 'none' }}>
                Evaluate. Improve. Grow.
              </a>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiArrowRight style={{ color: P, fontSize: 14 }} />
              </div>
            </div>
          </div>

          {/* ── Card 3: Employee Portal ── */}
          <div style={cardBase}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 16px 48px ${P}20`; e.currentTarget.style.transform = 'translateY(-8px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(122,0,75,.06)'; e.currentTarget.style.transform = 'none' }}>
            <div style={{ padding: '24px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: PL, border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BsPersonBadge style={{ color: P, fontSize: 22 }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D, margin: '0 0 6px' }}>Employee Portal</h3>
                  <p style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', color: G, lineHeight: 1.65, margin: 0 }}>
                    Empower employees with a self-service portal for profiles, documents, requests, and company updates.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, margin: '12px 16px 0', background: PL, borderRadius: '14px 14px 0 0', overflow: 'hidden', display: 'flex' }}>
              {/* Left icon strip */}
              <div style={{ width: 36, background: P, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 14 }}>
                {sideIcons.map((Icon, i) => (
                  <Icon key={i} style={{ color: 'rgba(255,255,255,.7)', fontSize: 14 }} />
                ))}
              </div>
              {/* Portal content */}
              <div style={{ flex: 1, padding: '12px 10px 16px' }}>
                <div style={{ fontSize: 11, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D, marginBottom: 10 }}>Welcome back, Baibhav!</div>
                {/* Quick actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
                  {[
                    { icon: <FiUser />, label: 'My\nprofile' },
                    { icon: <FiBell />, label: 'Company\nNews' },
                    { icon: <FiFileText />, label: 'My\nDocuments' },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#fff', borderRadius: 10, padding: '8px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: `1px solid ${PB}` }}>
                      <div style={{ color: P, fontSize: 16 }}>{item.icon}</div>
                      <div style={{ fontSize: 8, fontFamily: 'Poppins, sans-serif', color: P, lineHeight: 1.3, fontWeight: 600, whiteSpace: 'pre-line' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                {/* Upcoming leave */}
                <div style={{ background: '#fff', borderRadius: 10, padding: '8px 10px', marginBottom: 6, border: `1px solid ${PB}` }}>
                  <div style={{ fontSize: 9, fontFamily: 'Poppins, sans-serif', color: '#aaa', marginBottom: 2, fontWeight: 600 }}>Upcoming Leave</div>
                  <div style={{ fontSize: 11, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D }}>15 - 18 May 2024</div>
                </div>
                {/* Birthday */}
                <div style={{ background: '#fff', borderRadius: 10, padding: '8px 10px', border: `1px solid ${PB}` }}>
                  <div style={{ fontSize: 9, fontFamily: 'Poppins, sans-serif', color: '#aaa', marginBottom: 4, fontWeight: 600 }}>Team Birthday</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FiUser style={{ color: '#fff', fontSize: 12 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D }}>Baibhav Gangwar</div>
                      <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'Poppins' }}>May 05</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: `1px solid ${PB}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href="#" style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: P, textDecoration: 'none' }}>
                Everything you need, in one place.
              </a>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${PB}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiArrowRight style={{ color: P, fontSize: 14 }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <style>{`
        .feat-grid{ grid-template-columns:repeat(3,1fr); }
        @media(max-width:1024px){ .feat-grid{grid-template-columns:1fr 1fr!important;} }
        @media(max-width:640px){ .feat-grid{grid-template-columns:1fr!important;} }
      `}</style>
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
    <section id="pricing" style={{ padding: '80px 40px', background: '#fff' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px,3.2vw,42px)', fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: D, margin: '0 0 14px' }}>
            Simple, Transparent <span style={{ color: P }}>Pricing</span><br />That Grows With You
          </h2>
          <p style={{ fontSize: 15, fontFamily: 'Poppins, sans-serif', color: G, maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
            Choose the perfect plan for your team. Upgrade or downgrade anytime as your needs change.
          </p>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, alignItems: 'center', marginBottom: 36 }} className="pricing-grid">
          {plans.map(p => (
            <div key={p.name} style={{
              position: 'relative', borderRadius: 24, padding: '36px 30px',
              display: 'flex', flexDirection: 'column', gap: 20,
              background: p.dark ? P : '#fff',
              border: p.dark ? 'none' : `1.5px solid ${PB}`,
              boxShadow: p.dark ? `0 24px 64px ${P}50` : '0 4px 16px rgba(122,0,75,.06)',
              transform: p.dark ? 'scale(1.06)' : 'scale(1)',
              transition: 'all .3s'
            }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                  <span style={{ background: D, color: '#fff', fontSize: 11, fontFamily: 'Poppins, sans-serif', fontWeight: 700, padding: '6px 20px', borderRadius: 50, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
                    Most Popular
                  </span>
                </div>
              )}
              <div>
                <div style={{ fontSize: 18, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: p.dark ? '#fff' : D, marginBottom: 6 }}>{p.name}</div>
                <div style={{ fontSize: 12, fontFamily: 'Poppins, sans-serif', color: p.dark ? 'rgba(255,255,255,.7)' : '#999', lineHeight: 1.5 }}>{p.desc}</div>
              </div>
              <div>
                <span style={{ fontSize: 38, fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: p.dark ? '#fff' : D }}>{p.price}</span>
                <span style={{ fontSize: 12, fontFamily: 'Poppins, sans-serif', color: p.dark ? 'rgba(255,255,255,.6)' : '#aaa', marginLeft: 4 }}>/user/mo</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, fontFamily: 'Poppins, sans-serif', color: p.dark ? 'rgba(255,255,255,.88)' : G }}>
                    <FiCheck style={{ color: p.dark ? '#fff' : P, flexShrink: 0, marginTop: 2 }} />{f}
                  </li>
                ))}
              </ul>
              <button style={{
                marginTop: 'auto', width: '100%', padding: '12px 0', borderRadius: 50,
                fontSize: 14, fontFamily: 'Poppins, sans-serif', fontWeight: 700, cursor: 'pointer',
                background: p.dark ? '#fff' : 'transparent',
                color: P,
                border: p.dark ? 'none' : `2px solid ${P}`,
                transition: 'all .2s'
              }}>
                Start Free Trial
              </button>
            </div>
          ))}
        </div>

        {/* Storage row */}
        <div style={{ background: PL, borderRadius: 20, padding: '22px 28px', marginBottom: 22, border: `1px solid ${PB}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 16, alignItems: 'center' }} className="storage-grid">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FiHardDrive style={{ color: P, fontSize: 22, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D }}>Storage Guidance</div>
                <div style={{ fontSize: 11, fontFamily: 'Poppins, sans-serif', color: '#aaa', lineHeight: 1.4 }}>Finance documents, invoices, receipts, ledgers grow fast.</div>
              </div>
            </div>
            {[{ label: 'Startup', val: '2 GB' }, { label: 'Business', val: '20 GB' }, { label: 'Enterprise', val: '100 GB' }].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: D }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'Poppins', marginBottom: 4 }}>Per company</div>
                <span style={{ fontSize: 10, background: '#fff', color: P, fontWeight: 700, padding: '3px 14px', borderRadius: 20, border: `1px solid ${PB}`, fontFamily: 'Poppins' }}>{s.label}</span>
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
                <div style={{ fontSize: 12, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D, marginBottom: 3 }}>{b.label}</div>
                <div style={{ fontSize: 11, fontFamily: 'Poppins, sans-serif', color: '#aaa', lineHeight: 1.5 }}>{b.desc}</div>
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
              <div style={{ fontSize: 14, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D }}>Not sure which plan is right for you?</div>
              <div style={{ fontSize: 12, fontFamily: 'Poppins, sans-serif', color: '#aaa' }}>Our experts can help you choose the perfect plan based on your requirements.</div>
            </div>
          </div>
          <a href="#expert" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, background: P, color: '#fff',
            fontSize: 13, fontFamily: 'Poppins, sans-serif', fontWeight: 700,
            padding: '12px 24px', borderRadius: 50, textDecoration: 'none', whiteSpace: 'nowrap',
            transition: 'background .2s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = PH}
            onMouseLeave={e => e.currentTarget.style.background = P}>
            Talk to an Expert <FiArrowRight />
          </a>
        </div>
      </motion.div>
      <style>{`
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
          .expert-banner{flex-direction:column!important;text-align:center;}
        }
      `}</style>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// TESTIMONIALS
// ══════════════════════════════════════════════════════════════
function Testimonials() {
  const [active, setActive] = useState(1)
  const testimonials = [
    { quote: 'TorchX has completely transformed our hiring process. The AI recruitment feature helps us find the right talent faster and with better accuracy.', name: 'Alexa', role: 'HR Manager', co: 'LOGOLPSUM', initials: 'AL' },
    { quote: 'The employee portal is a game changer! Our team loves the easy access to documents, requests, and updates all in one place.', name: 'Anaya Varma', role: 'HR Director', co: 'logolpsum', initials: 'AV' },
    { quote: 'Performance reviews are now simple, transparent, and data-driven. TorchX helps us build a culture of continuous feedback and growth.', name: 'Rohan Sharma', role: 'People Operations Lead', co: 'logolpsum', initials: 'RS' },
  ]

  return (
    <section id="testimonials" style={{ padding: '80px 40px', background: '#fff' }}>
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
        style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 'clamp(28px,3.2vw,42px)', fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: D, margin: '0 0 14px' }}>
            Loved by <span style={{ color: P }}>Teams</span>, Trusted by <span style={{ color: P }}>Leaders</span>
          </h2>
          <p style={{ fontSize: 15, fontFamily: 'Poppins, sans-serif', color: G, maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
            See how organizations like yours are using TorchX to streamline HR and achieve more every day.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginBottom: 36 }} className="testi-grid">
          {testimonials.map((t, i) => (
            <motion.div key={t.name}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.1 }} viewport={{ once: true }}
              style={{
                background: '#fff', border: `1.5px solid ${PB}`, borderRadius: 22, padding: 28,
                boxShadow: '0 4px 16px rgba(122,0,75,.06)', display: 'flex', flexDirection: 'column',
                transition: 'all .3s'
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 16px 48px ${P}18`; e.currentTarget.style.transform = 'translateY(-6px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(122,0,75,.06)'; e.currentTarget.style.transform = 'none' }}>
              <div style={{ fontSize: 52, fontFamily: 'Poppins, sans-serif', fontWeight: 900, color: P, lineHeight: 0.8, marginBottom: 16 }}>"</div>
              <p style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', color: G, lineHeight: 1.75, flex: 1, margin: '0 0 22px' }}>{t.quote}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: 13, fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>{t.initials}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: D }}>{t.name}</div>
                  <div style={{ fontSize: 11, fontFamily: 'Poppins, sans-serif', color: '#aaa' }}>{t.role}</div>
                </div>
                <div style={{ fontSize: 9, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#ccc', letterSpacing: 1, textTransform: 'uppercase' }}>{t.co}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 44 }}>
          {testimonials.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} style={{
              width: i === active ? 28 : 8, height: 8, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: i === active ? P : '#ddd', padding: 0, transition: 'all .3s'
            }} />
          ))}
        </div>

        {/* CTA banner */}
        <div style={{ background: D, borderRadius: 22, padding: '36px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }} className="testi-cta">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 50, height: 50, background: `${P}30`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HiOutlineSparkles style={{ color: P, fontSize: 24 }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#fff', marginBottom: 4 }}>Join 100+ companies growing with TorchX</div>
              <div style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', color: '#888' }}>Powerful HR tools. Happy teams. Better results.</div>
            </div>
          </div>
          <a href="#trial" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, background: P, color: '#fff',
            fontSize: 13, fontFamily: 'Poppins, sans-serif', fontWeight: 700,
            padding: '14px 26px', borderRadius: 50, textDecoration: 'none', whiteSpace: 'nowrap',
            boxShadow: `0 8px 24px ${P}50`, transition: 'background .2s'
          }}
            onMouseEnter={e => e.currentTarget.style.background = PH}
            onMouseLeave={e => e.currentTarget.style.background = P}>
            Book For Free Trial <FiArrowRight />
          </a>
        </div>
      </motion.div>
      <style>{`
        .testi-grid{grid-template-columns:repeat(3,1fr);}
        @media(max-width:1024px){ .testi-grid{grid-template-columns:1fr 1fr!important;} }
        @media(max-width:640px){ .testi-grid{grid-template-columns:1fr!important;} .testi-cta{flex-direction:column!important;text-align:center;} }
      `}</style>
    </section>
  )
}

// ══════════════════════════════════════════════════════════════
// FOOTER
// ══════════════════════════════════════════════════════════════
function Footer() {
  const cols = [
    { title: 'Product',   links: ['Features','Pricing','Security','Roadmap','Status'] },
    { title: 'Solutions', links: ['Talent','Engage','Finance','Inventory','Pay'] },
    { title: 'Resources', links: ['Documentation','Api Reference','Guides','Blog','Community'] },
  ]
  const socials = [
    { icon: <FiLinkedin />, href: '#' },
    { icon: <FiInstagram />, href: '#' },
    { icon: <FiTwitter />, href: '#' },
    { icon: <FiMail />, href: '#' },
  ]

  return (
    <footer style={{ background: D }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 40px 0', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 48 }} className="footer-grid">
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 18 }}>
            <span style={{ fontSize: 28, fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>
              Torch<span style={{ color: P }}>X™</span>
            </span>
            <span style={{ fontSize: 8, letterSpacing: '3px', color: '#555', fontFamily: 'Poppins', fontWeight: 500, textTransform: 'uppercase' }}>— TALENT —</span>
          </div>
          <p style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', color: '#777', lineHeight: 1.75, margin: '0 0 24px' }}>
            Hire smarter, faster, and with confidence using AI-powered talent solutions. Streamline recruitment, discover top candidates, and build high-performing teams effortlessly.
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            {socials.map((s, i) => (
              <a key={i} href={s.href} style={{ color: '#555', fontSize: 19, textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => e.currentTarget.style.color = P}
                onMouseLeave={e => e.currentTarget.style.color = '#555'}>
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {cols.map(col => (
          <div key={col.title}>
            <div style={{ fontSize: 14, fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#fff', marginBottom: 20 }}>{col.title}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 13 }}>
              {col.links.map(l => (
                <li key={l}>
                  <a href="#" style={{ fontSize: 13, fontFamily: 'Poppins, sans-serif', color: '#777', textDecoration: 'none', transition: 'color .2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = P}
                    onMouseLeave={e => e.currentTarget.style.color = '#777'}>
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 1280, margin: '40px auto 0', borderTop: '1px solid #2a2a3e', padding: '18px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ fontSize: 12, fontFamily: 'Poppins, sans-serif', color: '#555', margin: 0 }}>
          TorchX™ — A Product of Techtorch Solutions Private Limited.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {['Privacy Policy','Terms of Service','Cookie Policy','Refund Policy'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, fontFamily: 'Poppins, sans-serif', color: '#555', textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.currentTarget.style.color = P}
              onMouseLeave={e => e.currentTarget.style.color = '#555'}>
              {l}
            </a>
          ))}
        </div>
      </div>
      <div style={{ height: 20 }} />

      <style>{`
        .footer-grid{ grid-template-columns:1.5fr 1fr 1fr 1fr; }
        @media(max-width:900px){ .footer-grid{grid-template-columns:1fr 1fr!important;} }
        @media(max-width:480px){ .footer-grid{grid-template-columns:1fr!important;} }
      `}</style>
    </footer>
  )
}

// ══════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ══════════════════════════════════════════════════════════════
export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Poppins', sans-serif; background: #fff; -webkit-font-smoothing: antialiased; }
        a { text-decoration: none; }
        button { outline: none; }
        img { max-width: 100%; display: block; }
      `}</style>
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <Pricing />
      <Testimonials />
      <Footer />
    </>
  )
}