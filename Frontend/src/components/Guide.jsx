import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiShield, FiUsers, FiUserCheck, FiUser, FiZap, FiArrowRight } from 'react-icons/fi'

// ── Fonts ──────────────────────────────────────────────────────────────
// This file uses the existing font-display / font-ui / font-body Tailwind
// classes from the original component. For the intended look, map them in
// tailwind.config.js:
//   fontFamily: {
//     display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
//     ui:      ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
//     body:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
//   }
// and load Fraunces + Inter (e.g. via a <link> in index.html or a
// @import in your global stylesheet):
//   https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap

// TorchX wordmark — path yaha apne project ke assets folder ke hisaab se
// adjust kar lena (abhi ye Vector.png ke naam se uploads se liya gaya hai).
import logo from '../assets/Vector.png'

// "Getting started" onboarding shots — search result se lekar SuperAdmin
// dashboard tak. Ye seedha src/assets/ folder scan karta hai (koi alag
// "guide" subfolder zaroori nahi) aur filename me kisi bhi diye gaye naam
// ka match dhoondh leta hai — case-insensitive, chahe "Sign-in.png" ho ya
// "signin-page.png".
//
// import.meta.glob use kar rahe hain (static `import` ki jagah) taaki agar
// koi ek file abhi missing bhi ho to poora build/app crash na ho — jo shot
// nahi milegi uske liye ShotFrame khud placeholder dikha dega.
const guideShots = import.meta.glob('../assets/**/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' })
const findShot = (...names) => {
  for (const [path, mod] of Object.entries(guideShots)) {
    const file = path.split('/').pop().toLowerCase()
    if (names.some((n) => file.includes(n))) return mod
  }
  return undefined
}
const searchResultShot = findShot('search-result')
const landingPageShot = findShot('landing-page', 'landing')
const signInShot = findShot('signin-page', 'sign-in', 'signin')
const dashboardShot = findShot('superadmin-dashboard', 'dashboard')

// ── Design tokens ──────────────────────────────────────────────────────
const INK = '#1B1320'
const PAPER = '#FCFAFB'
const PLUM = '#7A004B'
const PLUM_DEEP = '#4D0030'
const BLUSH = '#F5E7EE'
const LINE = '#E7DAE1'
const GOLD = '#B8863B'
const MUTED = '#8A7C85'

// ── Roles + their features ──────────────────────────────────────────────
// Each feature: id (anchor), title, desc, steps[], shot (optional — the
// screenshot variable, wired up above once the asset exists, e.g.
// shot: dashboardShot)
const roles = [
  {
    id: 'superadmin', label: 'SuperAdmin', icon: <FiShield />,
    tagline: 'the organisation\u2019s owner \u2014 everything sits in your hands',
    features: [
      { id: 'sa-search', title: 'Find TorchX Talent', desc: 'Search for TorchX Talent on Google (or any search engine) to reach the official website.', steps: ['Type "TorchX Talent" in the search bar and search.', 'The official TorchX Talent website shows up as the top result \u2014 click on it.'], shot: searchResultShot },
      { id: 'sa-landing', title: 'Open the landing page', desc: 'The official website\u2019s landing page opens \u2014 this is where you start signing in.', steps: ['As soon as the landing page loads, you\u2019ll see TorchX Talent\u2019s features, testimonials, pricing, and about sections.', 'Click "Sign in to your Talent Account" in the top-right corner.'], shot: landingPageShot },
      { id: 'sa-signin', title: 'Sign in to your account', desc: 'Enter your email and password to sign in to your Talent account.', steps: ['Fill in your registered email address and password.', 'Click the "Sign in" button.', 'On office kiosk/tablet devices, you can also check in without a password using "Live Attendance (Face Check-in)".'], shot: signInShot },
      {
        id: 'sa-dashboard', title: 'Dashboard overview',
        desc: 'As soon as sign-in succeeds, the SuperAdmin Dashboard opens automatically \u2014 this is where all your features begin, with a live snapshot of the whole organisation right at the top.',
        steps: [
          'Total Admins \u2014 how many admin accounts exist and how many are currently active.',
          'Total Employees \u2014 headcount across all departments, with the department count shown alongside.',
          'Present Today \u2014 how many employees are checked in right now, shown as a percentage plus an on-duty count.',
          'Admin Leaves \u2014 how many admins are on leave today, so coverage gaps are visible at a glance.',
          'Announcements \u2014 the number of announcements currently live for the organisation.',
          'Active Users \u2014 how many people are actively using the platform out of your total seats, with a "near limit" warning as you approach your plan\u2019s user cap.',
          'Live Attendance Map \u2014 a real-time map of where employees are checking in from, with a link through to full Attendance Details.',
          'The Announcements panel on the right lets you post a new update straight from the dashboard.',
          'Switch between the "Overview" and "Analytics" tabs for deeper reports.',
        ],
        shot: dashboardShot,
      },
      { id: 'sa-add-admin', title: 'Add a new Admin', desc: 'Create a new admin account, controlled against your seat limit.', steps: ['Click "+ Add Admin" in the dashboard\u2019s top banner.', 'Fill in the admin\u2019s basic details (name, email, department).', 'Save to issue login credentials to the new admin \u2014 the button disables once your seat limit is reached.'] },
      { id: 'sa-organisations', title: 'Manage Organisation', desc: 'Set up the company profile, departments, and reporting structure.', steps: ['Open "Organisations" in the left sidebar.', 'Add or edit departments, designations, and the reporting hierarchy.', 'Changes reflect instantly in every employee\u2019s org chart.'] },
      { id: 'sa-employees', title: 'Manage all Employees', desc: 'Add, edit, or deactivate any employee, and assign roles.', steps: ['Open the employee list section in the sidebar.', 'Select a role when adding a new employee.', 'Use the row\u2019s actions menu to edit or deactivate any employee.'] },
      { id: 'sa-announcements', title: 'Post Announcements', desc: 'Send a company-wide announcement from one place.', steps: ['Go to "Announcements" in the sidebar.', 'Click "New Announcement" and write a title and message.', 'Publish, and it shows up instantly on every employee\u2019s portal.'] },
      { id: 'sa-reviews', title: 'Set up Performance Reviews', desc: 'Define review cycles and goals for the whole organisation.', steps: ['Open the "Reviews" section in the sidebar.', 'Create a new review cycle and select the applicable departments.', 'Set goals/KPIs and launch the cycle.'] },
      { id: 'sa-assets', title: 'Asset Management', desc: 'Assign and track company assets for employees.', steps: ['Open "Asset Management" in the sidebar.', 'Add a new asset or assign an existing one to an employee.', 'Update return/damage status from the same place.'] },
      { id: 'sa-settings', title: 'Organisation Settings', desc: 'Configure company-wide policies, leave rules, and system preferences.', steps: ['Open "Settings" in the sidebar.', 'Update leave policy, working hours, or notification preferences.', 'Save, and the changes apply across the whole organisation.'] },
      { id: 'sa-documents', title: 'Company Documents', desc: 'Upload, organise, and set access control for company-wide documents.', steps: ['Open "Documents" in the sidebar.', 'Upload files and choose who should see them.', 'Update access permissions any time.'] },
      { id: 'sa-complaints', title: 'Handle Complaints / Tickets', desc: 'Review and resolve complaints/tickets across the organisation.', steps: ['Open "Complaints" or "Tickets" in the sidebar.', 'Open a pending ticket and read the details.', 'Update its status or assign it to the concerned admin/manager.'] },
      { id: 'sa-timesheet', title: 'Review Timesheets', desc: 'Verify timesheet entries across the company.', steps: ['Open "Timesheet" in the sidebar.', 'Filter by department or employee.', 'Flag or comment on any discrepancy.'] },
      { id: 'sa-management', title: 'Admin Management', desc: 'Manage all admins \u2014 permissions, roles, and access control.', steps: ['Open "Management" in the sidebar.', 'Edit an admin\u2019s permissions or role.', 'Deactivate/reactivate an admin when needed.'] },
      { id: 'sa-payroll', title: 'Company Payroll', desc: 'Process and review payroll for the whole organisation.', steps: ['Open "Payroll" in the sidebar and select the month.', 'Review the salary breakdown for every department.', 'Click "Process Payroll" to generate company-wide payslips.'] },
      { id: 'sa-reimbursement', title: 'Reimbursement Approvals', desc: 'Approve company-wide reimbursement/expense requests.', steps: ['Open "Reimbursement" in the sidebar.', 'Review pending requests \u2014 check receipts and amounts.', 'Approve or reject \u2014 the employee gets notified either way.'] },
    ],
  },
  {
    id: 'admin', label: 'Admin', icon: <FiUsers />,
    tagline: 'day-to-day operations and team management',
    features: [
      { id: 'ad-employees', title: 'Manage employees in your scope', desc: 'Add, edit, or manage employees in your assigned department/team.', steps: ['Open the "Employees" section from the dashboard.', 'Fill in the onboarding form for a new employee.', 'Edit or update an existing employee\u2019s details.'] },
      { id: 'ad-attendance', title: 'Monitor attendance', desc: 'See geo-tag and face attendance records in one place.', steps: ['Open the "Attendance" tab.', 'Filter records by date or employee.', 'Raise a manual correction request if you spot a discrepancy.'] },
      { id: 'ad-leaves', title: 'Approve leave requests', desc: 'Review and approve/reject your team\u2019s leave requests.', steps: ['Pending requests appear in the "Leaves" tab.', 'Open a request and check the reason and balance.', 'Click Approve or Reject.'] },
      { id: 'ad-payroll', title: 'Run payroll', desc: 'Process payroll synced with attendance and leave data.', steps: ['Open the "Payroll" section and select the applicable month.', 'Review the auto-calculated salary breakdown.', 'Click "Process Payroll" to generate payslips.'] },
      { id: 'ad-docs', title: 'Team documentation', desc: 'Upload, organise, and share your team\u2019s documents.', steps: ['Open the "Documents" tab.', 'Upload files and link them to the relevant employee/team.', 'Set access permissions.'] },
    ],
  },
  {
    id: 'manager', label: 'Manager', icon: <FiUserCheck />,
    tagline: 'your direct team\u2019s day-to-day work',
    features: [
      { id: 'mg-team', title: 'View your team', desc: 'See the list, profile, and status of your direct reports.', steps: ['Open the "My Team" section on the dashboard.', 'Click on a member\u2019s profile to view their attendance/leave history.'] },
      { id: 'mg-leave-approve', title: 'Approve team leave & WFH', desc: 'Approve your team\u2019s leave and work-from-home requests.', steps: ['Open the "Leave & WFH" tab.', 'Review pending requests and approve/reject with remarks.'] },
      { id: 'mg-reviews', title: 'Run performance reviews', desc: 'Submit reviews and give feedback for your team members.', steps: ['Open the assigned review cycle in the "Reviews" tab.', 'Fill in a rating and written feedback for each team member.', 'Submit \u2014 the SuperAdmin/Admin then sees the cycle summary.'] },
      { id: 'mg-timesheet', title: 'Review timesheets', desc: 'Verify your team\u2019s daily/weekly timesheet entries.', steps: ['Open the "Timesheet" tab.', 'Check each member\u2019s logged hours.', 'Flag an entry with a comment if there\u2019s a discrepancy.'] },
    ],
  },
  {
    id: 'employee', label: 'Employee', icon: <FiUser />,
    tagline: 'self-service \u2014 manage your own work',
    features: [
      { id: 'em-leave-apply', title: 'Apply for leave', desc: 'How an employee applies for their own leave.', steps: ['Open "Leave" in the sidebar.', 'Click "Apply Leave" and select the leave type and dates.', 'Write a reason and submit \u2014 your reporting manager gets notified.', 'Track the status in "My Requests".'] },
      { id: 'em-attendance', title: 'Mark attendance', desc: 'Mark attendance with geo-tag or face check-in.', steps: ['Use "Live Attendance (Face Check-in)" on the sign-in page, or', 'Click "Check In" from the dashboard.', 'Use the same button to "Check Out" at the end of the day.'] },
      { id: 'em-profile', title: 'Update your profile', desc: 'Update your personal details, contact info, and documents.', steps: ['Open "My Profile" in the sidebar.', 'Click "Edit" to update your details.', 'Upload any required documents.'] },
      { id: 'em-docs', title: 'Access your documents', desc: 'View or download payslips, your offer letter, and other documents.', steps: ['Open the "File" section in the sidebar.', 'Click on a document to view or download it.'] },
      { id: 'em-announcements', title: 'Read announcements', desc: 'See the company\u2019s announcements and updates.', steps: ['Open "Announcement" in the sidebar \u2014 the latest updates appear at the top.'] },
    ],
  },
]

function ShotFrame({ src, label }) {
  return src ? (
    <img src={src} alt={label} className="w-full rounded-md border" style={{ borderColor: LINE }} />
  ) : (
    <div
      className="w-full aspect-video rounded-md border border-dashed flex flex-col items-center justify-center gap-2"
      style={{ borderColor: LINE, background: '#FBF6F9' }}
    >
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: BLUSH, color: PLUM }}
      >
        <FiZap size={14} />
      </span>
      <span className="text-[11px] font-body" style={{ color: MUTED }}>Screenshot goes here</span>
    </div>
  )
}

// ── Left rail — role picker, connected by a single guiding line ─────────
function RoleRail({ activeRoleId, onSelect }) {
  return (
    <div className="w-[100px] shrink-0 border-r flex flex-col h-full" style={{ borderColor: LINE, background: PAPER }}>
      <div className="h-[60px] flex items-center justify-center border-b shrink-0" style={{ borderColor: LINE }}>
        <span className="font-ui font-semibold text-[10.5px] tracking-[2px]" style={{ color: MUTED }}>Role</span>
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-evenly py-6">
        {/* guiding line running through every role dot */}
        <div
          className="absolute left-1/2 top-[52px] bottom-[52px] w-px -translate-x-1/2"
          style={{ background: LINE }}
          aria-hidden="true"
        />
        {roles.map((r) => {
          const active = r.id === activeRoleId
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className="relative z-10 flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-xl px-2 py-1"
              style={{ '--tw-ring-color': PLUM }}
              aria-label={r.label}
              aria-current={active}
            >
              <span
                className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] transition-colors duration-150"
                style={{
                  background: active ? PLUM : PAPER,
                  color: active ? '#fff' : MUTED,
                  border: `1.5px solid ${active ? PLUM : LINE}`,
                }}
              >
                {r.icon}
              </span>
              <span
                className="text-[10px] font-ui leading-none"
                style={{ color: active ? PLUM_DEEP : MUTED, fontWeight: active ? 600 : 500 }}
              >
                {r.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Center panel — one continuous document for the active role ──────────
function CenterPanel({ activeRole, scrollRef, sectionRefs, progress }) {
  return (
    <div className="flex-1 min-w-0 h-full flex flex-col">
      {/* reading progress */}
      <div className="h-[3px] shrink-0" style={{ background: LINE }}>
        <div
          className="h-full transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${GOLD}, ${PLUM})` }}
        />
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[700px] mx-auto px-10 pt-14 pb-24">
          <div className="flex items-center gap-3 mb-4">
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] shrink-0"
              style={{ background: BLUSH, color: PLUM }}
            >
              {activeRole.icon}
            </span>
            <h1 className="font-display font-semibold leading-[1.1] text-[#111] text-[clamp(24px,3vw,32px)]">
              A guide for {activeRole.label}s
            </h1>
          </div>
          <p className="font-body text-[14.5px] leading-relaxed mb-14 max-w-[480px]" style={{ color: MUTED }}>
            You are {activeRole.tagline}. Here is everything you can do, walked through step by step.
          </p>

          <div className="flex flex-col">
            {activeRole.features.map((f, fi) => (
              <section
                key={f.id}
                id={f.id}
                ref={(el) => { sectionRefs.current[f.id] = el }}
                className="scroll-mt-10 flex flex-col gap-5 pb-14 mb-14 border-b last:border-b-0 last:mb-0 last:pb-0"
                style={{ borderColor: LINE }}
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[13px] tabular-nums shrink-0 mt-1" style={{ color: GOLD }}>
                    {String(fi + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h2 className="font-display text-[20px] font-semibold text-[#111] mb-1.5">{f.title}</h2>
                    <p className="font-body text-[13.5px] leading-relaxed m-0" style={{ color: MUTED }}>{f.desc}</p>
                  </div>
                </div>

                <ol className="flex flex-col list-none p-0 m-0 ml-6 relative">
                  <span
                    className="absolute left-[11px] top-2 bottom-2 w-px"
                    style={{ background: LINE }}
                    aria-hidden="true"
                  />
                  {f.steps.map((s, i) => (
                    <li key={i} className="relative flex gap-3 items-start pb-3 last:pb-0">
                      <span
                        className="relative z-10 w-6 h-6 rounded-full text-white text-[10.5px] font-ui font-semibold flex items-center justify-center shrink-0"
                        style={{ background: PLUM }}
                      >
                        {i + 1}
                      </span>
                      <span className="font-body text-[13.5px] leading-relaxed pt-0.5" style={{ color: INK }}>{s}</span>
                    </li>
                  ))}
                </ol>

                <ShotFrame src={f.shot} label={f.title} />
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Right rail — jump straight to a section in the center document ──────
function ShortcutRail({ activeRole, activeFeatureId, onJump }) {
  return (
    <div className="w-[280px] shrink-0 border-l flex flex-col h-full" style={{ borderColor: LINE, background: PAPER }}>
      <div className="h-[60px] flex items-center px-6 border-b shrink-0" style={{ borderColor: LINE }}>
        <span className="font-display font-semibold text-[14.5px] text-[#111]">On this page</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeRole.id}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="flex-1 overflow-y-auto py-2"
        >
          {activeRole.features.map((f) => {
            const active = f.id === activeFeatureId
            return (
              <button
                key={f.id}
                onClick={() => onJump(f.id)}
                className="group w-full text-left flex items-center gap-3 px-6 py-2.5 focus:outline-none focus-visible:bg-[#FBF3F7]"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-150"
                  style={{ background: active ? PLUM : LINE }}
                  aria-hidden="true"
                />
                <span
                  className="font-body text-[12.5px] leading-snug transition-colors duration-150"
                  style={{ color: active ? PLUM_DEEP : MUTED, fontWeight: active ? 600 : 400 }}
                >
                  {f.title}
                </span>
                <FiArrowRight
                  className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ color: PLUM }}
                  size={12}
                />
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function Guide() {
  const [activeRoleId, setActiveRoleId] = useState('superadmin')
  const [activeFeatureId, setActiveFeatureId] = useState(roles[0].features[0].id)
  const [progress, setProgress] = useState(0)

  const scrollRef = useRef(null)
  const sectionRefs = useRef({})

  const activeRole = useMemo(() => roles.find((r) => r.id === activeRoleId), [activeRoleId])

  // Role switch — reset to that role's first section and scroll the doc to top.
  const handleRoleSelect = useCallback((roleId) => {
    setActiveRoleId(roleId)
    const firstFeature = roles.find((r) => r.id === roleId).features[0]
    setActiveFeatureId(firstFeature.id)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' }))
  }, [])

  // Right-rail click — jump straight to that section in the center doc.
  const handleJump = useCallback((featureId) => {
    setActiveFeatureId(featureId)
    sectionRefs.current[featureId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Keep the right rail's highlight — and the progress bar — in sync while
  // the person scrolls the doc manually.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
          setActiveFeatureId(topMost.target.id)
        }
      },
      { root, rootMargin: '0px 0px -70% 0px', threshold: 0 }
    )
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el))

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = root
      const max = scrollHeight - clientHeight
      setProgress(max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0)
    }
    root.addEventListener('scroll', onScroll)
    onScroll()

    return () => {
      observer.disconnect()
      root.removeEventListener('scroll', onScroll)
    }
  }, [activeRoleId])

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden" style={{ background: PAPER }}>
      {/* Top bar — TorchX Talent wordmark, top-left. */}
      <div className="h-[60px] shrink-0 border-b flex items-center px-6" style={{ borderColor: LINE }}>
        <img src={logo} alt="TorchX Talent logo" className="h-8 w-auto object-contain" />
      </div>

      <div className="flex-1 flex min-h-0">
        <RoleRail activeRoleId={activeRoleId} onSelect={handleRoleSelect} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-w-0 h-full"
          >
            <CenterPanel activeRole={activeRole} scrollRef={scrollRef} sectionRefs={sectionRefs} progress={progress} />
          </motion.div>
        </AnimatePresence>

        <ShortcutRail activeRole={activeRole} activeFeatureId={activeFeatureId} onJump={handleJump} />
      </div>
    </div>
  )
}