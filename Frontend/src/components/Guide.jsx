// import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
// import { motion, AnimatePresence } from 'framer-motion'
// import { FiShield, FiUsers, FiUserCheck, FiUser, FiZap, FiArrowRight } from 'react-icons/fi'

// // ── Fonts ──────────────────────────────────────────────────────────────
// // This file uses the existing font-display / font-ui / font-body Tailwind
// // classes from the original component. For the intended look, map them in
// // tailwind.config.js:
// //   fontFamily: {
// //     display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
// //     ui:      ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
// //     body:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
// //   }
// // and load Fraunces + Inter (e.g. via a <link> in index.html or a
// // @import in your global stylesheet):
// //   https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap

// // TorchX wordmark — path yaha apne project ke assets folder ke hisaab se
// // adjust kar lena (abhi ye Vector.png ke naam se uploads se liya gaya hai).
// import logo from '../assets/Vector.png'

// // Screenshots abhi assets me nahi hain — sab null hai, ShotFrame khud placeholder
// // dikha deta hai. Jab daalo, in 4 lines ko uncomment karo aur neeche ki
// // `= null` wali lines hata do — har feature apni screenshot yaha se le lega
// // (feature object me `shot: <variable>` add karke).
// // import searchResultShot from '../assets/guide/search-result.png'
// // import landingPageShot from '../assets/guide/landing-page.png'
// // import signInShot from '../assets/guide/signin-page.png'
// // import dashboardShot from '../assets/guide/superadmin-dashboard.png'

// // ── Design tokens ──────────────────────────────────────────────────────
// const INK = '#1B1320'
// const PAPER = '#FCFAFB'
// const PLUM = '#7A004B'
// const PLUM_DEEP = '#4D0030'
// const BLUSH = '#F5E7EE'
// const LINE = '#E7DAE1'
// const GOLD = '#B8863B'
// const MUTED = '#8A7C85'

// // ── Roles + their features ──────────────────────────────────────────────
// // Har feature: id (anchor), title, desc, steps[], shot (optional — screenshot
// // variable, jab assets daalo to yaha wire kar dena, e.g. shot: dashboardShot)
// const roles = [
//   {
//     id: 'superadmin', label: 'SuperAdmin', icon: <FiShield />,
//     tagline: 'the organisation\u2019s owner \u2014 everything sits in your hands',
//     features: [
//       { id: 'sa-dashboard', title: 'Dashboard overview', desc: 'Total admins, employees, present today aur active users ek jagah dekhna.', steps: ['Sign in karte hi Dashboard automatically khulta hai.', 'Top banner par total employees, present today aur admin leaves ke live numbers dikhte hain.', '"Overview" aur "Analytics" tabs se detailed reports switch kiye ja sakte hain.'] },
//       { id: 'sa-add-admin', title: 'Add a new Admin', desc: 'Naya admin account create karna aur seat limit ke hisaab se allow/restrict karna.', steps: ['Dashboard ke top banner me "+ Add Admin" button par click karo.', 'Admin ki basic details (naam, email, department) bharo.', 'Save karte hi naye admin ko login credentials mil jaate hain \u2014 seat limit khatam hone par button disable ho jaata hai.'] },
//       { id: 'sa-organisations', title: 'Manage Organisation', desc: 'Company profile, departments aur reporting structure set karna.', steps: ['Left sidebar me "Organisations" open karo.', 'Departments, designations aur reporting hierarchy add/edit karo.', 'Changes turant sabhi employees ke org chart me reflect hote hain.'] },
//       { id: 'sa-employees', title: 'Manage all Employees', desc: 'Sabhi employees ko add, edit ya deactivate karna, roles assign karna.', steps: ['Sidebar me employee list section open karo.', 'Naya employee add karte waqt unka role select karo.', 'Kisi bhi employee ko edit ya deactivate karne ke liye row ke actions menu use karo.'] },
//       { id: 'sa-announcements', title: 'Post Announcements', desc: 'Poori company ke liye ek jagah se announcement bhejna.', steps: ['Sidebar me "Announcements" par jao.', '"New Announcement" par click karo, title aur message likho.', 'Publish karte hi sabhi employees ke portal me turant dikh jaata hai.'] },
//       { id: 'sa-reviews', title: 'Set up Performance Reviews', desc: 'Review cycles aur goals define karna, poori organisation ke liye.', steps: ['Sidebar me "Reviews" section open karo.', 'Naya review cycle create karo aur applicable departments select karo.', 'Goals/KPIs set karke cycle ko launch karo.'] },
//       { id: 'sa-assets', title: 'Asset Management', desc: 'Company assets employees ko assign aur track karna.', steps: ['Sidebar me "Asset Management" open karo.', 'Naya asset add karo ya existing asset kisi employee ko assign karo.', 'Return/damage status yahi se update hoti hai.'] },
//       { id: 'sa-settings', title: 'Organisation Settings', desc: 'Company-wide policies, leave rules aur system preferences configure karna.', steps: ['Sidebar me "Settings" open karo.', 'Leave policy, working hours ya notification preferences update karo.', 'Save karte hi changes poori organisation par apply ho jaate hain.'] },
//       { id: 'sa-documents', title: 'Company Documents', desc: 'Company-wide documents upload, organise aur access control set karna.', steps: ['Sidebar me "Documents" open karo.', 'Files upload karo aur jisko dikhana hai unhe select karo.', 'Access permissions kisi bhi waqt update kar sakte ho.'] },
//       { id: 'sa-complaints', title: 'Handle Complaints / Tickets', desc: 'Poori organisation ke complaints/tickets review aur resolve karna.', steps: ['Sidebar me "Complaints" ya "Tickets" open karo.', 'Pending ticket open karo, details padho.', 'Status update karo ya concerned admin/manager ko assign karo.'] },
//       { id: 'sa-timesheet', title: 'Review Timesheets', desc: 'Poori company ke timesheet entries verify karna.', steps: ['Sidebar me "Timesheet" open karo.', 'Department ya employee ke hisaab se filter karo.', 'Discrepancy hone par flag ya comment karo.'] },
//       { id: 'sa-management', title: 'Admin Management', desc: 'Sabhi admins ko manage karna \u2014 permissions, roles aur access control.', steps: ['Sidebar me "Management" open karo.', 'Kisi admin ki permissions ya role edit karo.', 'Zaroorat par admin ko deactivate/reactivate karo.'] },
//       { id: 'sa-payroll', title: 'Company Payroll', desc: 'Poori organisation ka payroll process aur review karna.', steps: ['Sidebar me "Payroll" open karo, month select karo.', 'Sabhi departments ka salary breakdown review karo.', '"Process Payroll" se company-wide payslips generate karo.'] },
//       { id: 'sa-reimbursement', title: 'Reimbursement Approvals', desc: 'Company-wide reimbursement/expense requests approve karna.', steps: ['Sidebar me "Reimbursement" open karo.', 'Pending requests review karo \u2014 receipts/amount check karo.', 'Approve ya reject karo, employee ko update mil jaata hai.'] },
//     ],
//   },
//   {
//     id: 'admin', label: 'Admin', icon: <FiUsers />,
//     tagline: 'day-to-day operations aur team management',
//     features: [
//       { id: 'ad-employees', title: 'Manage employees in your scope', desc: 'Assigned department/team ke employees add, edit ya manage karna.', steps: ['Dashboard se "Employees" section open karo.', 'Naye employee ka onboarding form fill karo.', 'Existing employee ki details edit ya update karo.'] },
//       { id: 'ad-attendance', title: 'Monitor attendance', desc: 'Geo-tag aur face attendance ke records ek jagah dekhna.', steps: ['"Attendance" tab open karo.', 'Date/employee filter laga kar records dekho.', 'Discrepancy hone par manual correction request raise karo.'] },
//       { id: 'ad-leaves', title: 'Approve leave requests', desc: 'Apni team ke leave requests review aur approve/reject karna.', steps: ['"Leaves" tab me pending requests ki list dikhti hai.', 'Request open karo, reason aur balance check karo.', 'Approve ya Reject par click karo.'] },
//       { id: 'ad-payroll', title: 'Run payroll', desc: 'Attendance aur leave data se synced payroll process karna.', steps: ['"Payroll" section open karo, applicable month select karo.', 'Auto-calculated salary breakdown review karo.', '"Process Payroll" se payslips generate ho jaate hain.'] },
//       { id: 'ad-docs', title: 'Team documentation', desc: 'Team ke documents upload, organise aur share karna.', steps: ['"Documents" tab open karo.', 'Files upload karo aur relevant employee/team se link karo.', 'Access permissions set karo.'] },
//     ],
//   },
//   {
//     id: 'manager', label: 'Manager', icon: <FiUserCheck />,
//     tagline: 'apni direct team ka roz ka kaam',
//     features: [
//       { id: 'mg-team', title: 'View your team', desc: 'Apne direct reports ki list, profile aur status dekhna.', steps: ['Dashboard par "My Team" section open karo.', 'Kisi bhi member ki profile par click karke unki attendance/leave history dekho.'] },
//       { id: 'mg-leave-approve', title: 'Approve team leave & WFH', desc: 'Apni team ke leave aur work-from-home requests approve karna.', steps: ['"Leave & WFH" tab open karo.', 'Pending requests review karo aur remarks ke saath approve/reject karo.'] },
//       { id: 'mg-reviews', title: 'Run performance reviews', desc: 'Team members ke liye review submit karna aur feedback dena.', steps: ['"Reviews" tab me assigned review cycle open karo.', 'Har team member ke liye rating aur written feedback bharo.', 'Submit karte hi SuperAdmin/Admin ko cycle summary dikhti hai.'] },
//       { id: 'mg-timesheet', title: 'Review timesheets', desc: 'Team ke daily/weekly timesheet entries verify karna.', steps: ['"Timesheet" tab open karo.', 'Har member ki logged hours check karo.', 'Discrepancy hone par comment ke saath entry ko flag karo.'] },
//     ],
//   },
//   {
//     id: 'employee', label: 'Employee', icon: <FiUser />,
//     tagline: 'self-service \u2014 apna kaam khud manage karna',
//     features: [
//       { id: 'em-leave-apply', title: 'Apply for leave', desc: 'Kaise ek employee apni leave apply kar sakta hai.', steps: ['Sidebar me "Leave" open karo.', '"Apply Leave" par click karo, leave type aur dates select karo.', 'Reason likh kar submit karo \u2014 reporting manager ko notification chala jaata hai.', '"My Requests" me status track kar sakte ho.'] },
//       { id: 'em-attendance', title: 'Mark attendance', desc: 'Geo-tag ya face check-in se attendance mark karna.', steps: ['Sign in page par "Live Attendance (Face Check-in)" use karo, ya', 'Dashboard se "Check In" button par click karo.', 'Din khatam hone par same button se "Check Out" karo.'] },
//       { id: 'em-profile', title: 'Update your profile', desc: 'Apni personal details, contact info aur documents update karna.', steps: ['Sidebar me "My Profile" open karo.', '"Edit" par click karke details update karo.', 'Zaroori documents upload karo.'] },
//       { id: 'em-docs', title: 'Access your documents', desc: 'Payslips, offer letter aur baaki documents dekhna/download karna.', steps: ['Sidebar me "File" section open karo.', 'Required document par click karke view ya download karo.'] },
//       { id: 'em-announcements', title: 'Read announcements', desc: 'Company ke announcements aur updates dekhna.', steps: ['Sidebar me "Announcement" open karo \u2014 latest updates top par dikhte hain.'] },
//     ],
//   },
// ]

// function ShotFrame({ src, label }) {
//   return src ? (
//     <img src={src} alt={label} className="w-full rounded-md border" style={{ borderColor: LINE }} />
//   ) : (
//     <div
//       className="w-full aspect-video rounded-md border border-dashed flex flex-col items-center justify-center gap-2"
//       style={{ borderColor: LINE, background: '#FBF6F9' }}
//     >
//       <span
//         className="w-8 h-8 rounded-full flex items-center justify-center"
//         style={{ background: BLUSH, color: PLUM }}
//       >
//         <FiZap size={14} />
//       </span>
//       <span className="text-[11px] font-body" style={{ color: MUTED }}>Screenshot goes here</span>
//     </div>
//   )
// }

// // ── Left rail — role picker, connected by a single guiding line ─────────
// function RoleRail({ activeRoleId, onSelect }) {
//   return (
//     <div className="w-[100px] shrink-0 border-r flex flex-col h-full" style={{ borderColor: LINE, background: PAPER }}>
//       <div className="h-[60px] flex items-center justify-center border-b shrink-0" style={{ borderColor: LINE }}>
//         <span className="font-ui font-semibold text-[10.5px] tracking-[2px]" style={{ color: MUTED }}>Role</span>
//       </div>

//       <div className="relative flex-1 flex flex-col items-center justify-evenly py-6">
//         {/* guiding line running through every role dot */}
//         <div
//           className="absolute left-1/2 top-[52px] bottom-[52px] w-px -translate-x-1/2"
//           style={{ background: LINE }}
//           aria-hidden="true"
//         />
//         {roles.map((r) => {
//           const active = r.id === activeRoleId
//           return (
//             <button
//               key={r.id}
//               onClick={() => onSelect(r.id)}
//               className="relative z-10 flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-xl px-2 py-1"
//               style={{ '--tw-ring-color': PLUM }}
//               aria-label={r.label}
//               aria-current={active}
//             >
//               <span
//                 className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] transition-colors duration-150"
//                 style={{
//                   background: active ? PLUM : PAPER,
//                   color: active ? '#fff' : MUTED,
//                   border: `1.5px solid ${active ? PLUM : LINE}`,
//                 }}
//               >
//                 {r.icon}
//               </span>
//               <span
//                 className="text-[10px] font-ui leading-none"
//                 style={{ color: active ? PLUM_DEEP : MUTED, fontWeight: active ? 600 : 500 }}
//               >
//                 {r.label}
//               </span>
//             </button>
//           )
//         })}
//       </div>
//     </div>
//   )
// }

// // ── Center panel — one continuous document for the active role ──────────
// function CenterPanel({ activeRole, scrollRef, sectionRefs, progress }) {
//   return (
//     <div className="flex-1 min-w-0 h-full flex flex-col">
//       {/* reading progress */}
//       <div className="h-[3px] shrink-0" style={{ background: LINE }}>
//         <div
//           className="h-full transition-[width] duration-200 ease-out"
//           style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${GOLD}, ${PLUM})` }}
//         />
//       </div>

//       <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
//         <div className="max-w-[700px] mx-auto px-10 pt-14 pb-24">
//           <div className="flex items-center gap-3 mb-4">
//             <span
//               className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] shrink-0"
//               style={{ background: BLUSH, color: PLUM }}
//             >
//               {activeRole.icon}
//             </span>
//             <h1 className="font-display font-semibold leading-[1.1] text-[#111] text-[clamp(24px,3vw,32px)]">
//               A guide for {activeRole.label}s
//             </h1>
//           </div>
//           <p className="font-body text-[14.5px] leading-relaxed mb-14 max-w-[480px]" style={{ color: MUTED }}>
//             You are {activeRole.tagline}. Here is everything you can do, walked through step by step.
//           </p>

//           <div className="flex flex-col">
//             {activeRole.features.map((f, fi) => (
//               <section
//                 key={f.id}
//                 id={f.id}
//                 ref={(el) => { sectionRefs.current[f.id] = el }}
//                 className="scroll-mt-10 flex flex-col gap-5 pb-14 mb-14 border-b last:border-b-0 last:mb-0 last:pb-0"
//                 style={{ borderColor: LINE }}
//               >
//                 <div className="flex items-baseline gap-3">
//                   <span className="font-display text-[13px] tabular-nums shrink-0 mt-1" style={{ color: GOLD }}>
//                     {String(fi + 1).padStart(2, '0')}
//                   </span>
//                   <div>
//                     <h2 className="font-display text-[20px] font-semibold text-[#111] mb-1.5">{f.title}</h2>
//                     <p className="font-body text-[13.5px] leading-relaxed m-0" style={{ color: MUTED }}>{f.desc}</p>
//                   </div>
//                 </div>

//                 <ol className="flex flex-col list-none p-0 m-0 ml-6 relative">
//                   <span
//                     className="absolute left-[11px] top-2 bottom-2 w-px"
//                     style={{ background: LINE }}
//                     aria-hidden="true"
//                   />
//                   {f.steps.map((s, i) => (
//                     <li key={i} className="relative flex gap-3 items-start pb-3 last:pb-0">
//                       <span
//                         className="relative z-10 w-6 h-6 rounded-full text-white text-[10.5px] font-ui font-semibold flex items-center justify-center shrink-0"
//                         style={{ background: PLUM }}
//                       >
//                         {i + 1}
//                       </span>
//                       <span className="font-body text-[13.5px] leading-relaxed pt-0.5" style={{ color: INK }}>{s}</span>
//                     </li>
//                   ))}
//                 </ol>

//                 <ShotFrame src={f.shot} label={f.title} />
//               </section>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// // ── Right rail — jump straight to a section in the center document ──────
// function ShortcutRail({ activeRole, activeFeatureId, onJump }) {
//   return (
//     <div className="w-[280px] shrink-0 border-l flex flex-col h-full" style={{ borderColor: LINE, background: PAPER }}>
//       <div className="h-[60px] flex items-center px-6 border-b shrink-0" style={{ borderColor: LINE }}>
//         <span className="font-display font-semibold text-[14.5px] text-[#111]">On this page</span>
//       </div>
//       <AnimatePresence mode="wait">
//         <motion.div
//           key={activeRole.id}
//           initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//           transition={{ duration: 0.12 }}
//           className="flex-1 overflow-y-auto py-2"
//         >
//           {activeRole.features.map((f) => {
//             const active = f.id === activeFeatureId
//             return (
//               <button
//                 key={f.id}
//                 onClick={() => onJump(f.id)}
//                 className="group w-full text-left flex items-center gap-3 px-6 py-2.5 focus:outline-none focus-visible:bg-[#FBF3F7]"
//               >
//                 <span
//                   className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-150"
//                   style={{ background: active ? PLUM : LINE }}
//                   aria-hidden="true"
//                 />
//                 <span
//                   className="font-body text-[12.5px] leading-snug transition-colors duration-150"
//                   style={{ color: active ? PLUM_DEEP : MUTED, fontWeight: active ? 600 : 400 }}
//                 >
//                   {f.title}
//                 </span>
//                 <FiArrowRight
//                   className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
//                   style={{ color: PLUM }}
//                   size={12}
//                 />
//               </button>
//             )
//           })}
//         </motion.div>
//       </AnimatePresence>
//     </div>
//   )
// }

// export default function Guide() {
//   const [activeRoleId, setActiveRoleId] = useState('superadmin')
//   const [activeFeatureId, setActiveFeatureId] = useState(roles[0].features[0].id)
//   const [progress, setProgress] = useState(0)

//   const scrollRef = useRef(null)
//   const sectionRefs = useRef({})

//   const activeRole = useMemo(() => roles.find((r) => r.id === activeRoleId), [activeRoleId])

//   // Role switch — reset to that role's first section and scroll the doc to top.
//   const handleRoleSelect = useCallback((roleId) => {
//     setActiveRoleId(roleId)
//     const firstFeature = roles.find((r) => r.id === roleId).features[0]
//     setActiveFeatureId(firstFeature.id)
//     requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' }))
//   }, [])

//   // Right-rail click — jump straight to that section in the center doc.
//   const handleJump = useCallback((featureId) => {
//     setActiveFeatureId(featureId)
//     sectionRefs.current[featureId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
//   }, [])

//   // Keep the right rail's highlight — and the progress bar — in sync while
//   // the person scrolls the doc manually.
//   useEffect(() => {
//     const root = scrollRef.current
//     if (!root) return

//     const observer = new IntersectionObserver(
//       (entries) => {
//         const visible = entries.filter((e) => e.isIntersecting)
//         if (visible.length > 0) {
//           const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
//           setActiveFeatureId(topMost.target.id)
//         }
//       },
//       { root, rootMargin: '0px 0px -70% 0px', threshold: 0 }
//     )
//     Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el))

//     const onScroll = () => {
//       const { scrollTop, scrollHeight, clientHeight } = root
//       const max = scrollHeight - clientHeight
//       setProgress(max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0)
//     }
//     root.addEventListener('scroll', onScroll)
//     onScroll()

//     return () => {
//       observer.disconnect()
//       root.removeEventListener('scroll', onScroll)
//     }
//   }, [activeRoleId])

//   return (
//     <div className="h-screen w-full flex flex-col overflow-hidden" style={{ background: PAPER }}>
//       {/* Top bar — TorchX Talent wordmark, top-left. */}
//       <div className="h-[60px] shrink-0 border-b flex items-center px-6" style={{ borderColor: LINE }}>
//         <img src={logo} alt="TorchX Talent logo" className="h-8 w-auto object-contain" />
//       </div>

//       <div className="flex-1 flex min-h-0">
//         <RoleRail activeRoleId={activeRoleId} onSelect={handleRoleSelect} />

//         <AnimatePresence mode="wait">
//           <motion.div
//             key={activeRole.id}
//             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//             transition={{ duration: 0.15 }}
//             className="flex-1 min-w-0 h-full"
//           >
//             <CenterPanel activeRole={activeRole} scrollRef={scrollRef} sectionRefs={sectionRefs} progress={progress} />
//           </motion.div>
//         </AnimatePresence>

//         <ShortcutRail activeRole={activeRole} activeFeatureId={activeFeatureId} onJump={handleJump} />
//       </div>
//     </div>
//   )
// }