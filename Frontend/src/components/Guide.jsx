import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiShield, FiUsers, FiUserCheck, FiUser, FiZap, FiArrowRight, FiArrowLeft,
  FiMenu, FiX, FiList, FiMapPin,
} from 'react-icons/fi'


import logo from '../assets/Vector.png'

const guideShots = import.meta.glob('../assets/**/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' })
const findShot = (...names) => {
  for (const [path, mod] of Object.entries(guideShots)) {
    const file = path.split('/').pop().toLowerCase()
    if (names.some((n) => file.includes(n))) return mod
  }
  return undefined
}


const shots = {

  saSearch: findShot('start.png'),
  saSearchResult: findShot('search.png'),
  saLanding: findShot('search-result', 'landing.png'),
  signin: findShot('sign-in', 'signin'),

  // SuperAdmin
  saDashboard: findShot('superadmin-dashboard'),
  saAddAdmin: findShot('add-admin'),
  saOrganisations: findShot('organisations'),
  saSelfService: findShot('sa-self-service', 'sa-selfservice'),
  saAnnouncements: findShot('sa-announcements'),
  saLeaves: findShot('sa-leaves'),
  saReviews: findShot('sa-reviews'),
  saAssets: findShot('sa-assets'),
  saDocuments: findShot('sa-documents'),
  saTimesheet: findShot('sa-timesheet'),
  saManagement: findShot('sa-management'),
  saPayroll: findShot('sa-payroll'),
  saReimbursement: findShot('sa-reimbursement'),
  saVoice: findShot('sa-complaints', 'sa-voice'),
  saSettings: findShot('sa-settings'),
  saPolicy: findShot('sa-policy'),
  saFieldOps: findShot('sa-field-ops', 'sa-field'),

  // Admin
  adDashboard: findShot('ad-dashboard'),
  adAttendance: findShot('ad-attendance'),
  adEmployees: findShot('ad-employees'),
  adSelfService: findShot('ad-self-service', 'ad-selfservice'),
  adAnnouncement: findShot('ad-announcement'),
  adReview: findShot('ad-review'),
  adLeave: findShot('ad-leaves', 'ad-leave'),
  adOrganisation: findShot('ad-organisation'),
  adAsset: findShot('ad-asset'),
  adFaceAttendance: findShot('ad-face-attendance', 'ad-face-enrollment', 'face-enrollment'),
  adRecruitment: findShot('ad-recruitment'),
  adVoice: findShot('ad-voice', 'ad-complaints'),
  adTimesheet: findShot('ad-timesheet'),
  adPayroll: findShot('ad-payroll'),
  adReimbursement: findShot('ad-reimbursement'),
  adManagement: findShot('ad-management'),
  adDocument: findShot('ad-document.png'),
  adTeamDocument: findShot('ad-documents', 'ad-team-document'),
  adSettings: findShot('ad-settings'),
  adPolicy: findShot('ad-policy-management', 'ad-policy'),
  adMyPolicies: findShot('ad-my-policies'),
  adFieldOps: findShot('ad-field-ops', 'ad-field'),

  // Manager
  mgDashboard: findShot('mg-dashboard'),
  mgAttendance: findShot('mg-attendance'),
  mgSelfService: findShot('mg-self-service', 'mg-selfservice'),
  mgLeave: findShot('leave-wfh', 'mg-leave'),
  mgAnnouncement: findShot('mg-announcement'),
  mgOrganisation: findShot('mg-organisation'),
  mgReviews: findShot('mg-reviews'),
  mgTimesheet: findShot('mg-timesheet'),
  mgReimbursement: findShot('mg-reimbursement'),
  mgFile: findShot('mg-file'),
  mgRecruitment: findShot('mg-recruitment'),
  mgVoice: findShot('mg-voice', 'mg-complaints'),
  mgSettings: findShot('mg-settings'),
  mgMyPolicies: findShot('mg-my-policies'),
  mgFieldOps: findShot('mg-field-ops', 'mg-field'),

  // Employee
  emDashboard: findShot('em-dashboard'),
  emAttendance: findShot('em-attendance'),
  emFieldDuty: findShot('em-field-duty', 'em-field'),
  emSelfService: findShot('em-self-service', 'em-selfservice'),
  emLeave: findShot('apply-leave', 'em-leave'),
  emAnnouncement: findShot('em-announcement'),
  emOrganisation: findShot('em-organisation'),
  emReview: findShot('em-review'),
  emTimesheet: findShot('em-timesheet'),
  emReimbursement: findShot('em-reimbursement'),
  emFile: findShot('em-file'),
  emVoice: findShot('em-voice', 'em-complaints'),
  emSettings: findShot('my-profile', 'em-settings'),
  emMyPolicies: findShot('em-my-policies'),
}

// ── Design tokens — aligned with the TorchX Talent marketing site ──────
const INK = '#1B1320'
const PAPER = '#FCFAFB'
const PLUM = '#7A004B'
const PLUM_DEEP = '#4D002C'
const BLUSH = '#FDF4F8'
const LINE = '#EAC7D7'
const GOLD = '#B8863B'
const MUTED = '#8A7C85'

const PLAN_BADGE = { label: 'Plan feature', hint: 'Only shown if your organisation\u2019s plan includes this.' }
const COND_BADGE = { label: 'Conditional', hint: 'Only shown when this is enabled for your role.' }



const SIGNIN_STEPS = [
  { id: 'sa-search', title: 'Search for TorchX Talent', desc: 'Look up TorchX Talent on Google (or any search engine) to reach the official website \u2014 no app install needed, it runs entirely in the browser.', steps: ['Type "TorchX Talent" into the search bar and hit search.'], shotKey: 'saSearch', shotName: 'search.png' },
  { id: 'sa-search-result', title: 'Pick the official result', desc: 'The official TorchX Talent website shows up as the top result. Always confirm the domain before entering your credentials anywhere.', steps: ['Click the top result to open the official TorchX Talent site.'], shotKey: 'saSearchResult', shotName: 'search-result.png' },
  { id: 'sa-landing', title: 'Open the landing page', desc: 'The landing page introduces TorchX Talent \u2014 features, pricing, testimonials \u2014 and is where every session starts, whether you sign in daily or are visiting for the first time.', steps: ['Browse the landing page if you like.', 'Click "Sign in to your Talent Account" in the top-right corner.'], shotKey: 'saLanding', shotName: 'landing-page.png' },
  { id: 'sa-signin', title: 'Sign in', desc: 'Enter your registered email and password to sign in. Your session stays active across the dashboard until you sign out or it times out for security.', steps: ['Fill in your email address and password, then click "Sign in".', 'On an office kiosk/tablet, you can also check in without a password using "Live Attendance (Face Check-in)".'], shotKey: 'signin', shotName: 'sign-in.png' },
]

const roles = [
  {
    id: 'superadmin', label: 'SuperAdmin', short: 'SA', icon: <FiShield />,
    tagline: 'the platform owner \u2014 every organisation sits in your hands',
    features: [
      ...SIGNIN_STEPS,
      {
        id: 'sa-dashboard', title: 'Dashboard overview',
        desc: 'As soon as you sign in, the SuperAdmin Dashboard opens \u2014 a live, auto-refreshing snapshot of every organisation on the platform, plus quick access to the things you do most. Everything here is aggregated across all tenants, so it doubles as your health check for the whole platform.',
        steps: [
          'Total Admins \u2014 how many admin accounts exist across organisations, and how many are active.',
          'Total Employee \u2014 headcount across every organisation and department.',
          'Present Today \u2014 how many employees are checked in right now, as a percentage plus an on-duty count.',
          'Admin Leaves \u2014 how many admins are on leave today, so coverage gaps are visible at a glance.',
          'Announcements \u2014 how many announcements are currently live across the platform.',
          'Active Users \u2014 active seats out of your total plan limit, with a "Near limit" / "Limit reached" warning as you approach the cap.',
          'Live Attendance Map \u2014 a real-time map of where employees are checking in from.',
          'Employee Overview \u2014 a breakdown of employees by department, designation, and status.',
          'Switch between "Overview" and "Analytics" tabs (top of the dashboard) for deeper, chart-based reports.',
        ],
        shotKey: 'saDashboard', shotName: 'superadmin-dashboard.png',
        extras: [
          { title: 'Add a new Admin', desc: 'Click "Add Admin" on the dashboard (disabled once your seat limit is reached), fill in their name, email, and department, and save to issue login credentials instantly. The new admin receives access as soon as the record is saved.', shotKey: 'saAddAdmin', shotName: 'add-admin.png' },
        ],
      },
      { id: 'sa-organisations', title: 'Organisations', desc: 'Onboard organisations and manage their TorchX Talent access from one central directory. This is where each client company\u2019s plan, seat count, and admins are provisioned.', steps: ['Open "Organisations" in the sidebar.', 'Add a new organisation, or open an existing one to manage its access and plan.'], shotKey: 'saOrganisations', shotName: 'organisations.png' },
      { id: 'sa-self-service', title: 'Self Service Portal', desc: 'Org-wide leave, reimbursement, document, and ticket activity, all in one place \u2014 useful when you need to audit or troubleshoot something for a specific organisation without switching accounts.', steps: ['Open "Self Service Portal" in the sidebar.', 'Switch between the Leave, Reimbursement, Document, and Ticket tabs to see activity across every organisation.'], shotKey: 'saSelfService', shotName: 'sa-self-service.png' },
      { id: 'sa-announcements', title: 'Announcements', desc: 'Broadcast announcements across all organisations, or target a select few \u2014 handy for platform-wide notices like scheduled maintenance or new feature rollouts.', steps: ['Open "Announcements" in the sidebar.', 'Click "New Announcement", write a title and message, and choose which organisations should see it.', 'Publish \u2014 it shows up instantly on every recipient\u2019s portal.'], shotKey: 'saAnnouncements', shotName: 'sa-announcements.png' },
      { id: 'sa-leaves', title: 'Leaves', desc: 'See and manage leave requests across every organisation, with filters so you can drill into a single team\u2019s leave pattern when something looks off.', steps: ['Open "Leaves" in the sidebar.', 'Filter by organisation, department, or status to review any request.'], shotKey: 'saLeaves', shotName: 'sa-leaves.png' },
      { id: 'sa-reviews', title: 'Reviews', desc: 'Monitor performance reviews raised across organisations, and keep an eye on which review cycles are stalling before deadlines slip.', steps: ['Open "Reviews" in the sidebar.', 'Track review cycles and completion status per organisation.'], shotKey: 'saReviews', shotName: 'sa-reviews.png', badge: PLAN_BADGE },
      { id: 'sa-assets', title: 'Asset Management', desc: 'Track company assets \u2014 assign, revoke, and view history \u2014 so every laptop, phone, or ID card issued across organisations has a clear owner and audit trail.', steps: ['Open "Asset Management" in the sidebar.', 'Add a new asset, or select one to assign/revoke it and view its history.'], shotKey: 'saAssets', shotName: 'sa-assets.png', badge: PLAN_BADGE },
      { id: 'sa-documents', title: 'Team Documents', desc: 'Access documents uploaded by teams across organisations, filterable by tenant so you\u2019re only ever looking at what\u2019s relevant.', steps: ['Open "Team Documents" in the sidebar.', 'Filter by organisation to browse or download what\u2019s been uploaded.'], shotKey: 'saDocuments', shotName: 'sa-documents.png' },
      { id: 'sa-timesheet', title: 'Timesheet', desc: 'Review logged hours and timesheets, org-wide \u2014 useful for spotting under- or over-logged hours before payroll runs.', steps: ['Open "Timesheet" in the sidebar.', 'Filter by organisation or employee, and flag any discrepancy.'], shotKey: 'saTimesheet', shotName: 'sa-timesheet.png', badge: PLAN_BADGE },
      { id: 'sa-management', title: 'TorchX Management', desc: 'Manage TorchX product access and licensing per organisation \u2014 this is where you turn modules like Payroll or Recruitment on or off for a client.', steps: ['Open "TorchX Management" in the sidebar.', 'Select an organisation to update its product access and licensing.'], shotKey: 'saManagement', shotName: 'sa-management.png' },
      { id: 'sa-payroll', title: 'Payroll', desc: 'Oversee payroll runs across every organisation, with the same salary breakdown and payslip generation admins use, but visible for any tenant you support.', steps: ['Open "Payroll" in the sidebar and select an organisation and month.', 'Review the salary breakdown and click "Process Payroll" to generate payslips.'], shotKey: 'saPayroll', shotName: 'sa-payroll.png' },
      { id: 'sa-reimbursement', title: 'Reimbursements', desc: 'Review reimbursement claims raised by admins, and see every claim org-wide, including receipts attached at submission.', steps: ['Open "Reimbursements" in the sidebar.', 'Review pending claims \u2014 check receipts and amounts \u2014 then approve or reject.'], shotKey: 'saReimbursement', shotName: 'sa-reimbursement.png' },
      { id: 'sa-voice', title: 'TorchX Voice', desc: 'Handle support tickets raised by admins, managers, and employees platform-wide \u2014 your queue for anything that needs a SuperAdmin\u2019s attention.', steps: ['Open "TorchX Voice" in the sidebar.', 'Open a pending ticket, read the details, and resolve or reassign it.'], shotKey: 'saVoice', shotName: 'sa-voice.png', badge: PLAN_BADGE },
      { id: 'sa-settings', title: 'Settings', desc: 'Configure platform-wide settings and preferences that apply beneath every organisation\u2019s own configuration.', steps: ['Open "Settings" in the sidebar.', 'Update preferences \u2014 changes apply across the whole platform.'], shotKey: 'saSettings', shotName: 'sa-settings.png' },
      { id: 'sa-policy', title: 'Policy Management', desc: 'Create, publish, and track acknowledgement of company policies, with a live view of who has and hasn\u2019t read each one.', steps: ['Open "Policy Management" in the sidebar.', 'Create a policy, choose its audience (Employees / Managers / Admins), and publish.', 'Track who has acknowledged it from the same page.'], shotKey: 'saPolicy', shotName: 'sa-policy.png' },
      { id: 'sa-field-ops', title: 'Field Operations', desc: 'Set up field teams and monitor live duty locations and visits \u2014 built for organisations with employees working outside a fixed office.', steps: ['Open "Field Operations" in the sidebar.', 'Create a field team and monitor live locations and visit logs on the map.'], shotKey: 'saFieldOps', shotName: 'sa-field-ops.png', badge: COND_BADGE },
    ],
  },
  {
    id: 'admin', label: 'Admin', short: 'AD', icon: <FiUsers />,
    tagline: 'day-to-day operations and team management for your organisation',
    features: [
      { id: 'ad-signin', title: 'Sign in', desc: 'Sign in the same way shown for SuperAdmin \u2014 search TorchX Talent, open the landing page, and sign in with your Admin email and password.', steps: ['Enter your registered email and password, then click "Sign in".'], shotKey: 'signin', shotName: 'sign-in.png' },
      {
        id: 'ad-dashboard', title: 'Dashboard overview',
        desc: 'Signing in drops you straight onto your organisation\u2019s Dashboard \u2014 your own check-in status plus a live snapshot of your whole team. It\u2019s built to answer "what needs my attention today" in one glance.',
        steps: [
          'Today\u2019s status banner \u2014 shows whether you\u2019re checked in, on leave, or it\u2019s a holiday, with a "Check In" / "Check Out" button for your own attendance.',
          'Headcount \u2014 total employees in your organisation, alongside how many are present today.',
          'Notification bell \u2014 real-time alerts for approvals, announcements, and tickets.',
        ],
        shotKey: 'adDashboard', shotName: 'ad-dashboard.png',
      },
      { id: 'ad-attendance', title: 'Track your team\u2019s attendance', desc: 'A quick stat row \u2014 Present, Absent, Half/Late, Active Now, and Attendance Rate \u2014 plus a colour-coded calendar so you can see the whole month at a glance without opening individual records.', steps: ['On the dashboard, check the stat row for today\u2019s numbers.', 'Use the calendar\u2019s colour legend \u2014 Present, Absent, Half day, Late, Checked in, On leave, WFH, Holiday, Week off \u2014 to read any day.', 'Click a day or an employee to open their full attendance details.'], shotKey: 'adAttendance', shotName: 'ad-attendance.png' },
      { id: 'ad-onboarding', title: 'Onboarding', desc: 'Add and manage employees and managers \u2014 the starting point for getting anyone new set up with a login and a role.', steps: ['Open "Onboarding" in the sidebar.', 'Click "Add Employee", fill in their details, and select a role.', 'Use the row\u2019s actions menu to edit or deactivate anyone already added.'], shotKey: 'adEmployees', shotName: 'ad-employees.png' },
      { id: 'ad-self-service', title: 'Self Service Portal', desc: 'Apply leave, submit claims, manage documents, and raise tickets \u2014 all in one place, whether it\u2019s for your own account or something you\u2019re handling on a team member\u2019s behalf.', steps: ['Open "Self Service Portal" in the sidebar.', 'Switch tabs to apply for leave, submit a reimbursement, upload a document, or raise a ticket.'], shotKey: 'adSelfService', shotName: 'ad-self-service.png' },
      { id: 'ad-announcement', title: 'Announcement', desc: 'Create and publish announcements for your organisation \u2014 the fastest way to get a message in front of every manager and employee at once.', steps: ['Open "Announcement" in the sidebar.', 'Click "New Announcement" (the highlighted button) and write your update.', 'Publish \u2014 it\u2019s instantly visible to your managers and employees.'], shotKey: 'adAnnouncement', shotName: 'ad-announcement.png' },
      { id: 'ad-review', title: 'Review', desc: 'Run and track performance reviews for your team, from opening a new cycle to watching completion status roll in.', steps: ['Open "Review" in the sidebar.', 'Start a new review cycle or continue one already in progress.'], shotKey: 'adReview', shotName: 'ad-review.png', badge: PLAN_BADGE },
      { id: 'ad-leave', title: 'Leave', desc: 'Approve or reject leave requests from managers and employees, and keep tabs on your own balance in the same place.', steps: ['Open "Leave" in the sidebar.', 'Use the tabs to review pending requests, check your own balance, or apply for your own leave/WFH.', 'Approve or reject each request \u2014 the employee is notified either way.'], shotKey: 'adLeave', shotName: 'ad-leave.png' },
      { id: 'ad-organisation', title: 'Organisation', desc: 'View your organisation\u2019s structure and org chart, and adjust departments or reporting lines as the team grows.', steps: ['Open "Organisation" in the sidebar.', 'Browse the org chart, or edit departments and reporting lines.'], shotKey: 'adOrganisation', shotName: 'ad-organisation.png', noShot: true },
      { id: 'ad-asset', title: 'Asset Management', desc: 'Assign, revoke, and track company assets, with a history you can check if a laptop or device ever needs to be traced back to an employee.', steps: ['Open "Asset Management" in the sidebar.', 'Add a new asset, or assign/revoke one for an employee.'], shotKey: 'adAsset', shotName: 'ad-asset.png', badge: PLAN_BADGE },
      { id: 'ad-face-attendance', title: 'Face Attendance', desc: 'Enroll employee faces for kiosk-based attendance, so check-in on a shared office device doesn\u2019t need a password each time.', steps: ['Open "Face Attendance" in the sidebar.', 'Select an employee and capture their face for kiosk check-in.'], shotKey: 'adFaceAttendance', shotName: 'ad-face-attendance.png' },
      { id: 'ad-recruitment', title: 'Recruitment', desc: 'Post hiring requisitions and track candidates from first application through to offer, without leaving TorchX Talent.', steps: ['Open "Recruitment" in the sidebar.', 'Click "Add Candidate" or create a hiring requisition, then track its status.'], shotKey: 'adRecruitment', shotName: 'ad-recruitment.png', badge: PLAN_BADGE },
      { id: 'ad-voice', title: 'TorchX Voice', desc: 'Raise or resolve support tickets \u2014 your own queue for issues you\u2019ve flagged, plus visibility into tickets from your team.', steps: ['Open "TorchX Voice" in the sidebar.', 'Switch to "Submit New" to raise a ticket, or "My Tickets" to track one you\u2019ve raised.'], shotKey: 'adVoice', shotName: 'ad-voice.png', badge: PLAN_BADGE },
      { id: 'ad-timesheet', title: 'Timesheet', desc: 'Review and approve team timesheets before they roll into payroll, catching discrepancies early.', steps: ['Open "Timesheet" in the sidebar.', 'Review logged hours per employee and approve or flag entries.'], shotKey: 'adTimesheet', shotName: 'ad-timesheet.png', badge: PLAN_BADGE },
      { id: 'ad-payroll', title: 'Payroll', desc: 'Run payroll and manage payslips with an auto-calculated breakdown, so a full month\u2019s run is a handful of clicks.', steps: ['Open "Payroll" in the sidebar and select the month.', 'Review the auto-calculated salary breakdown.', 'Click "Process Payroll" to generate payslips.'], shotKey: 'adPayroll', shotName: 'ad-payroll.png' },
      { id: 'ad-reimbursement', title: 'Reimbursements', desc: 'Review claims from employees and managers, and submit your own \u2014 approvals and your personal claims live side by side.', steps: ['Open "Reimbursements" in the sidebar.', 'Review pending claims \u2014 check receipts and amounts \u2014 then approve or reject.', 'Use the same page to submit your own claim.'], shotKey: 'adReimbursement', shotName: 'ad-reimbursement.png' },
      { id: 'ad-management', title: 'TorchX Management', desc: 'Manage your organisation\u2019s TorchX product access, so you always know exactly which modules your team can use.', steps: ['Open "TorchX Management" in the sidebar.', 'Review or update which TorchX products your organisation has access to.'], shotKey: 'adManagement', shotName: 'ad-management.png' },
      { id: 'ad-document', title: 'Document', desc: 'Upload and manage your own documents, organised into folders so important files stay easy to find later.', steps: ['Open "Document" in the sidebar.', 'Upload a file and organise it into the right folder.'], shotKey: 'adDocument', shotName: 'ad-document.png' },
      { id: 'ad-team-document', title: 'Team Document', desc: 'View documents uploaded by your team in one shared library, without having to ask each person individually.', steps: ['Open "Team Document" in the sidebar.', 'Browse or download anything your team has uploaded.'], shotKey: 'adTeamDocument', shotName: 'ad-team-document.png' },
      { id: 'ad-settings', title: 'Settings', desc: 'Update your profile and account preferences \u2014 your name, contact details, and how the app behaves for you.', steps: ['Open "Settings" in the sidebar.', 'Update your details or preferences and save.'], shotKey: 'adSettings', shotName: 'ad-settings.png', noShot: true },
      { id: 'ad-policy-management', title: 'Policy Management', desc: 'Create, publish, and track acknowledgement of company policies for your organisation, from leave rules to code of conduct.', steps: ['Open "Policy Management" in the sidebar.', 'Create a policy, choose its audience, and publish it.'], shotKey: 'adPolicy', shotName: 'ad-policy-management.png' },
      { id: 'ad-my-policies', title: 'My Policies', desc: 'Read and acknowledge policies assigned to you, so there\u2019s a clear record that you\u2019ve seen and agreed to each one.', steps: ['Open "My Policies" in the sidebar.', 'Read a policy and click "Acknowledge" to confirm you\u2019ve read it.'], shotKey: 'adMyPolicies', shotName: 'ad-my-policies.png', noShot: true },
      { id: 'ad-field-ops', title: 'Field Operations', desc: 'Create field teams and monitor live duty locations and visits for employees who work off-site.', steps: ['Open "Field Operations" in the sidebar.', 'Create a field team and watch live locations and visit logs on the map.'], shotKey: 'adFieldOps', shotName: 'ad-field-ops.png', badge: COND_BADGE },
    ],
  },
  {
    id: 'manager', label: 'Manager', short: 'MG', icon: <FiUserCheck />,
    tagline: 'your direct team\u2019s day-to-day work',
    features: [
      { id: 'mg-signin', title: 'Sign in', desc: 'Sign in the same way shown for SuperAdmin \u2014 search TorchX Talent, open the landing page, and sign in with your Manager email and password.', steps: ['Enter your registered email and password, then click "Sign in".'], shotKey: 'signin', shotName: 'sign-in.png' },
      {
        id: 'mg-dashboard', title: 'Dashboard overview',
        desc: 'Signing in drops you straight onto your team\u2019s Dashboard \u2014 your own check-in status plus a live snapshot of your direct reports, so you know exactly who needs a decision from you today.',
        steps: [
          'Today\u2019s status banner \u2014 shows whether you\u2019re checked in, on leave, or it\u2019s a holiday, with a "Check In" / "Check Out" button for yourself.',
          'My leave \u2014 your own leave balance and any pending requests, shown right on the dashboard.',
          'Pending RM \u2014 requests waiting on you as reporting manager, so nothing slips through.',
        ],
        shotKey: 'mgDashboard', shotName: 'mg-dashboard.png',
      },
      { id: 'mg-self-service', title: 'Self Service Portal', desc: 'Apply leave, submit claims, manage documents, and raise tickets \u2014 all in one place, for yourself or on behalf of your team.', steps: ['Open "Self Service Portal" in the sidebar.', 'Switch tabs to apply for leave, submit a reimbursement, upload a document, or raise a ticket.'], shotKey: 'mgSelfService', shotName: 'mg-self-service.png' },
      { id: 'mg-leave', title: 'Leave', desc: 'Approve or forward leave requests from your team, while managing your own applications and balance from the same screen.', steps: ['Open "Leave" in the sidebar.', 'Use the tabs to review your team\u2019s requests, check your own balance, or apply for your own leave.', 'Approve or reject with a remark.'], shotKey: 'mgLeave', shotName: 'leave-wfh.png' },
      { id: 'mg-announcement', title: 'Announcement', desc: 'View and share announcements with your team, with the newest updates from your admin always shown first.', steps: ['Open "Announcement" in the sidebar \u2014 the latest updates from your admin appear first.'], shotKey: 'mgAnnouncement', shotName: 'mg-announcement.png' },
      { id: 'mg-organisation', title: 'Organisation', desc: 'View your organisation\u2019s structure and org chart, so you can see where your team sits relative to the rest of the company.', steps: ['Open "Organisation" in the sidebar to browse the org chart.'], shotKey: 'mgOrganisation', shotName: 'mg-organisation.png', noShot: true },
      { id: 'mg-reviews', title: 'Review', desc: 'Run performance reviews for your reportees, rating and writing feedback that rolls up into the Admin\u2019s cycle summary.', steps: ['Open "Review" in the sidebar.', 'Open an assigned review cycle, rate each team member, and add written feedback.', 'Submit \u2014 the Admin then sees the cycle summary.'], shotKey: 'mgReviews', shotName: 'mg-reviews.png', badge: PLAN_BADGE },
      { id: 'mg-timesheet', title: 'Timesheet', desc: 'Track and approve your team\u2019s timesheets, flagging anything that looks off before it reaches payroll.', steps: ['Open "Timesheet" in the sidebar.', 'Check each member\u2019s logged hours and approve, or flag a discrepancy with a comment.'], shotKey: 'mgTimesheet', shotName: 'mg-timesheet.png', badge: PLAN_BADGE },
      { id: 'mg-reimbursement', title: 'Reimbursements', desc: 'Submit and track your reimbursement claims, from attaching a receipt to seeing when it\u2019s approved.', steps: ['Open "Reimbursements" in the sidebar.', 'Click "New Claim", attach a receipt, and submit for approval.'], shotKey: 'mgReimbursement', shotName: 'mg-reimbursement.png' },
      { id: 'mg-file', title: 'File', desc: 'Upload and manage documents, choosing exactly who on your team should be able to see each one.', steps: ['Open "File" in the sidebar.', 'Upload a document and choose who should have access.'], shotKey: 'mgFile', shotName: 'mg-file.png' },
      { id: 'mg-recruitment', title: 'Recruitment', desc: 'Track hiring requisitions and candidates for roles on your team, moving each one through the pipeline as interviews progress.', steps: ['Open "Recruitment" in the sidebar.', 'Review open requisitions and update candidate status as they move through the pipeline.'], shotKey: 'mgRecruitment', shotName: 'mg-recruitment.png', badge: PLAN_BADGE },
      { id: 'mg-voice', title: 'TorchX Voice', desc: 'Raise a support ticket and track it through to resolution, whether it\u2019s for yourself or something affecting your team.', steps: ['Open "TorchX Voice" in the sidebar.', 'Switch to "Submit New" to raise a ticket, or "My Tickets" to track one you\u2019ve raised.'], shotKey: 'mgVoice', shotName: 'mg-voice.png', badge: PLAN_BADGE },
      { id: 'mg-settings', title: 'Settings', desc: 'Update your profile and account preferences \u2014 your name, contact details, and how the app behaves for you.', steps: ['Open "Settings" in the sidebar.', 'Update your details or preferences and save.'], shotKey: 'mgSettings', shotName: 'mg-settings.png', noShot: true },
      { id: 'mg-my-policies', title: 'My Policies', desc: 'Read and acknowledge policies assigned to you, keeping a clear record that you\u2019ve seen and agreed to each one.', steps: ['Open "My Policies" in the sidebar.', 'Read a policy and click "Acknowledge" to confirm you\u2019ve read it.'], shotKey: 'mgMyPolicies', shotName: 'mg-my-policies.png', noShot: true },
    ],
  },
  {
    id: 'employee', label: 'Employee', short: 'EM', icon: <FiUser />,
    tagline: 'self-service \u2014 manage your own work',
    features: [
      { id: 'em-signin', title: 'Sign in', desc: 'Sign in the same way shown for SuperAdmin \u2014 search TorchX Talent, open the landing page, and sign in with your email and password.', steps: ['Enter your registered email and password, then click "Sign in".', 'On an office kiosk/tablet, you can also check in without a password using "Live Attendance (Face Check-in)".'], shotKey: 'signin', shotName: 'sign-in.png' },
      {
        id: 'em-dashboard', title: 'Dashboard overview',
        desc: 'Signing in drops you straight onto your personal Dashboard \u2014 your own attendance, leave, and the latest company updates, all in one screen you\u2019ll likely check first thing every day.',
        steps: [
          'Today\u2019s status banner \u2014 shows whether you\u2019re checked in, on leave, or it\u2019s a holiday, with your shift timing.',
          'Your attendance streak \u2014 a quick calendar of your recent check-ins.',
          'Leave balance and any pending requests, at a glance.',
        ],
        shotKey: 'emDashboard', shotName: 'em-dashboard.png',
      },
      { id: 'em-attendance', title: 'Mark your attendance', desc: 'Mark attendance with geo-tag or face check-in, whichever your organisation has enabled, in a couple of taps.', steps: ['Click "Check In" on the dashboard (or use "Live Attendance (Face Check-in)" on the sign-in page).', 'Use the same button to "Check Out" at the end of the day.'], shotKey: 'emAttendance', shotName: 'em-attendance.png' },
      { id: 'em-self-service', title: 'Self Service Portal', desc: 'Apply leave, submit claims, manage documents, and raise tickets \u2014 all in one place, without waiting on anyone to do it for you.', steps: ['Open "Self Service Portal" in the sidebar.', 'Switch tabs to apply for leave, submit a reimbursement, upload a document, or raise a ticket.'], shotKey: 'emSelfService', shotName: 'em-self-service.png' },
      { id: 'em-leave', title: 'Leave', desc: 'Apply for leave and track your leave balance, with your manager notified the moment you submit a request.', steps: ['Open "Leave" in the sidebar and open the "Apply Leave" tab.', 'Select the leave type and dates, write a reason, and submit \u2014 your manager gets notified.', 'Track the status in the same tab, and check "Leave Balance" any time.'], shotKey: 'emLeave', shotName: 'apply-leave.png' },
      { id: 'em-announcement', title: 'Announcement', desc: 'See company announcements as soon as they\u2019re published, listed with the newest updates first.', steps: ['Open "Announcement" in the sidebar \u2014 every update your organisation publishes appears here, newest first.'], shotKey: 'emAnnouncement', shotName: 'em-announcement.png' },
      { id: 'em-organisation', title: 'Organisation', desc: 'View your organisation\u2019s structure and org chart, so you can quickly see where you sit and who you report to.', steps: ['Open "Organisation" in the sidebar to see where you sit in the org chart.'], shotKey: 'emOrganisation', shotName: 'em-organisation.png', noShot: true },
      { id: 'em-review', title: 'Review', desc: 'See the performance reviews your manager has given you, including ratings and written feedback from each cycle.', steps: ['Open "Review" in the sidebar to see your ratings and written feedback.'], shotKey: 'emReview', shotName: 'em-review.png', badge: PLAN_BADGE },
      { id: 'em-timesheet', title: 'Timesheet', desc: 'Log your hours and track your timesheet, whether you fill it in daily or catch up at the end of the week.', steps: ['Open "Timesheet" in the sidebar.', 'Log your hours for the day/week and submit.'], shotKey: 'emTimesheet', shotName: 'em-timesheet.png', badge: PLAN_BADGE },
      { id: 'em-reimbursement', title: 'Reimbursements', desc: 'Submit and track your reimbursement claims, from attaching a receipt to seeing when your manager approves it.', steps: ['Open "Reimbursements" in the sidebar.', 'Click "New Claim", attach a receipt, and submit for approval.'], shotKey: 'emReimbursement', shotName: 'em-reimbursement.png' },
      { id: 'em-file', title: 'File', desc: 'Upload and manage your personal documents \u2014 payslips, offer letters, and anything else worth keeping in one place.', steps: ['Open "File" in the sidebar.', 'Click a document to view or download it, such as your payslip or offer letter.'], shotKey: 'emFile', shotName: 'em-file.png' },
      { id: 'em-voice', title: 'TorchX Voice', desc: 'Raise a support ticket for any issue, and track its status without having to follow up over email or chat.', steps: ['Open "TorchX Voice" in the sidebar.', 'Switch to "Submit New" to raise a ticket, or "My Tickets" to check the status of one you\u2019ve already sent.'], shotKey: 'emVoice', shotName: 'em-voice.png', badge: PLAN_BADGE },
      { id: 'em-settings', title: 'Settings', desc: 'Update your profile and account preferences, including any documents your organisation requires on file.', steps: ['Open "Settings" in the sidebar.', 'Click "Edit" to update your details and upload any required documents.', 'Save your changes.'], shotKey: 'emSettings', shotName: 'my-profile.png' },
      { id: 'em-my-policies', title: 'My Policies', desc: 'Read and acknowledge policies assigned to you, keeping a clear record that you\u2019ve seen and agreed to each one.', steps: ['Open "My Policies" in the sidebar.', 'Read a policy and click "Acknowledge" to confirm you\u2019ve read it.'], shotKey: 'emMyPolicies', shotName: 'em-my-policies.png', noShot: true },
    ],
  },
]

function Badge({ badge }) {
  if (!badge) return null
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-ui font-semibold shrink-0"
      style={{ background: BLUSH, color: PLUM_DEEP, border: `1px solid ${LINE}` }}
      title={badge.hint}
    >
      {badge.label}
    </span>
  )
}

function ShotFrame({ src, label, fileName, compact }) {
  return src ? (
    <img
      src={src}
      alt={label}
      className="w-full rounded-2xl border-2 shadow-sm"
      style={{ borderColor: LINE }}
      loading="lazy"
    />
  ) : (
    <div
      className={`w-full ${compact ? 'aspect-[16/7]' : 'aspect-video'} rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 px-4 text-center`}
      style={{ borderColor: LINE, background: BLUSH }}
    >
      <span
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: '#fff', color: PLUM, border: `1px solid ${LINE}` }}
      >
        <FiZap size={15} />
      </span>
      <span className="text-[12px] font-body" style={{ color: MUTED }}>Screenshot goes here</span>
      <span className="text-[10.5px] font-ui px-2.5 py-0.5 rounded-full" style={{ background: '#fff', color: MUTED, border: `1px solid ${LINE}` }}>
        drop <span style={{ color: PLUM_DEEP, fontWeight: 600 }}>{fileName}</span> in src/assets/
      </span>
    </div>
  )
}

// ── Back button — beetroot pill, used at the bottom/end of the role row ──
function BackButton({ onBack, vertical }) {
  return (
    <button
      onClick={onBack}
      className={
        vertical
          ? 'flex items-center justify-center gap-1.5 w-[72px] rounded-full py-2.5 text-[11px] font-ui font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
          : 'shrink-0 flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-ui font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
      }
      style={{ background: PLUM, '--tw-ring-color': PLUM }}
      aria-label="Go back"
    >
      <FiArrowLeft size={13} />
      Back
    </button>
  )
}

// ── Role tabs — used as the desktop left rail AND the mobile top scroller ─
function RoleTabs({ activeRoleId, onSelect, orientation }) {
  const vertical = orientation === 'vertical'
  return (
    <div className={vertical ? 'relative flex-1 min-h-0 flex flex-col items-center justify-center gap-2.5 py-3 overflow-y-auto no-scrollbar' : 'flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-3'}>
      {roles.map((r) => {
        const active = r.id === activeRoleId
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={
              vertical
                ? 'relative z-10 shrink-0 flex flex-col items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-xl px-2 py-1 transition-transform duration-150 hover:-translate-y-0.5'
                : 'shrink-0 flex items-center gap-2 rounded-full px-4 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors duration-150'
            }
            style={vertical ? { '--tw-ring-color': PLUM } : {
              background: active ? PLUM : '#fff',
              color: active ? '#fff' : MUTED,
              border: `1.5px solid ${active ? PLUM : LINE}`,
              '--tw-ring-color': PLUM,
            }}
            aria-label={r.label}
            aria-current={active}
          >
            {vertical ? (
              <>
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] transition-all duration-150"
                  style={{
                    background: active ? `linear-gradient(155deg, ${PLUM}, ${PLUM_DEEP})` : '#fff',
                    color: active ? '#fff' : MUTED,
                    border: `1.5px solid ${active ? PLUM : LINE}`,
                    boxShadow: active ? `0 6px 16px -6px ${PLUM}77` : 'none',
                  }}
                >
                  {r.icon}
                </span>
                <span
                  className="text-[9.5px] font-ui leading-none"
                  style={{ color: active ? PLUM_DEEP : MUTED, fontWeight: active ? 700 : 500 }}
                >
                  {r.label}
                </span>
              </>
            ) : (
              <>
                <span className="text-[13px]">{r.icon}</span>
                <span className="text-[12.5px] font-ui font-semibold whitespace-nowrap">{r.label}</span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}

function CenterPanel({ activeRole, scrollRef, sectionRefs, onActiveFeatureChange }) {
  const [progress, setProgress] = useState(0)

  // The guide always shows every feature for the active role, in order.
  // Search only jumps/scrolls to a feature — it never hides the rest.
  const filtered = activeRole.features

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
          onActiveFeatureChange(topMost.target.id)
        }
      },
      { root, rootMargin: '0px 0px -60% 0px', threshold: 0 }
    )

    const els = filtered.map((f) => sectionRefs.current[f.id]).filter(Boolean)
    els.forEach((el) => observer.observe(el))

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = root
      const max = scrollHeight - clientHeight
      const pct = max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0
      setProgress(pct)

      if (pct > 99 && filtered.length > 0) {
        const last = filtered[filtered.length - 1]
        onActiveFeatureChange(last.id)
      }
    }
    root.addEventListener('scroll', onScroll)
    onScroll()

    return () => {
      observer.disconnect()
      root.removeEventListener('scroll', onScroll)
    }

  }, [activeRole, scrollRef, sectionRefs, onActiveFeatureChange])

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
        <div className="max-w-[720px] mx-auto px-5 sm:px-8 lg:px-10 pt-10 sm:pt-14 pb-24">

          {/* ── Section hero — mirrors the marketing site's heading style ── */}
          <div className="mb-10 sm:mb-14">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4"
              style={{ background: BLUSH, border: `1px solid ${LINE}` }}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px]" style={{ background: PLUM, color: '#fff' }}>
                {activeRole.icon}
              </span>
              <span className="text-[12px] font-ui font-semibold" style={{ color: PLUM_DEEP }}>{activeRole.label} guide</span>
            </span>

            <h1 className="font-hero font-medium leading-[1.12] text-[#111] text-[clamp(26px,3.6vw,38px)] mb-4">
              Everything a <span style={{ color: PLUM }}>{activeRole.label}</span><br className="hidden sm:block" /> can do in TorchX Talent
            </h1>
            <p className="font-body text-[14.5px] leading-relaxed max-w-[480px]" style={{ color: MUTED }}>
              You are {activeRole.tagline}. This walkthrough covers every screen in your sidebar, in the same order it appears, with a screenshot for each step.
            </p>

            <div className="flex items-center gap-2 mt-6">
              <span className="text-[11px] font-ui font-semibold px-3 py-1 rounded-full" style={{ background: '#fff', color: PLUM_DEEP, border: `1px solid ${LINE}` }}>
                {activeRole.features.length} sections
              </span>
              <span className="h-px flex-1" style={{ background: LINE }} aria-hidden="true" />
            </div>
          </div>

          <div className="flex flex-col">
            {filtered.map((f, fi) => (
              <section
                key={f.id}
                id={f.id}
                ref={(el) => { sectionRefs.current[f.id] = el }}
                className="scroll-mt-10 flex flex-col gap-5 pb-12 sm:pb-14 mb-12 sm:mb-14 border-b last:border-b-0 last:mb-0 last:pb-0"
                style={{ borderColor: LINE }}
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[13px] tabular-nums shrink-0 mt-1" style={{ color: GOLD }}>
                    {String(fi + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1.5">
                      <h2 className="font-display text-[19px] sm:text-[21px] font-semibold text-[#111] m-0">{f.title}</h2>
                      <Badge badge={f.badge} />
                    </div>
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


                {!f.noShot && (
                  <ShotFrame src={shots[f.shotKey]} label={f.title} fileName={f.shotName} />
                )}

                {f.extras?.map((ex) => (
                  <div key={ex.title} className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: BLUSH, border: `1px solid ${LINE}` }}>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#fff', color: PLUM, border: `1px solid ${LINE}` }}>
                        <FiZap size={10} />
                      </span>
                      <span className="font-ui text-[12.5px] font-semibold" style={{ color: PLUM_DEEP }}>{ex.title}</span>
                    </div>
                    <p className="font-body text-[12.5px] leading-relaxed m-0" style={{ color: MUTED }}>{ex.desc}</p>
                    {!ex.noShot && (
                      <ShotFrame src={shots[ex.shotKey]} label={ex.title} fileName={ex.shotName} compact />
                    )}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ShortcutList({ activeRole, activeFeatureId, onJump }) {
  const listRef = useRef(null)
  const itemRefs = useRef({})

  useEffect(() => {
    const el = itemRefs.current[activeFeatureId]
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeFeatureId])

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto py-3 px-2.5">
      {activeRole.features.map((f, i) => {
        const active = f.id === activeFeatureId
        return (
          <button
            key={f.id}
            ref={(el) => { itemRefs.current[f.id] = el }}
            onClick={() => onJump(f.id)}
            className="group w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 mb-1 rounded-xl focus:outline-none transition-colors duration-150"
            style={{ background: active ? BLUSH : 'transparent' }}
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-ui font-bold tabular-nums transition-colors duration-150"
              style={{
                background: active ? PLUM : '#fff',
                color: active ? '#fff' : '#C9BCC3',
                border: `1px solid ${active ? PLUM : LINE}`,
              }}
            >
              {i + 1}
            </span>
            <span
              className="font-body text-[12.5px] leading-snug transition-colors duration-150 truncate"
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
    </div>
  )
}

export default function Guide() {
  const [activeRoleId, setActiveRoleId] = useState('superadmin')
  const [activeFeatureId, setActiveFeatureId] = useState(roles[0].features[0].id)
  const [mobileTocOpen, setMobileTocOpen] = useState(false)

  const scrollRef = useRef(null)
  const sectionRefs = useRef({})

  const activeRole = useMemo(() => roles.find((r) => r.id === activeRoleId), [activeRoleId])

  const handleRoleSelect = useCallback((roleId) => {
    setActiveRoleId(roleId)
    const firstFeature = roles.find((r) => r.id === roleId).features[0]
    setActiveFeatureId(firstFeature.id)
    setMobileTocOpen(false)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' }))
  }, [])

  const handleJump = useCallback((featureId) => {
    setActiveFeatureId(featureId)
    setMobileTocOpen(false)
    sectionRefs.current[featureId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleBack = useCallback(() => {
    window.history.back()
  }, [])

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden" style={{ background: PAPER }}>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="h-[56px] sm:h-[64px] shrink-0 border-b flex items-center gap-3 px-3 sm:px-6" style={{ borderColor: LINE, background: '#fff' }}>
        <button
          onClick={() => setMobileTocOpen(true)}
          className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ color: MUTED, border: `1.5px solid ${LINE}` }}
          aria-label="Open contents"
        >
          <FiMenu size={15} />
        </button>

        <img src={logo} alt="TorchX Talent logo" className="h-7 sm:h-8 w-auto object-contain" />

        <span
          className="hidden sm:inline-flex items-center text-[11px] font-ui font-semibold px-2.5 py-1 rounded-full ml-1"
          style={{ background: BLUSH, color: PLUM_DEEP, border: `1px solid ${LINE}` }}
        >
          Product Guide
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setMobileTocOpen(true)}
            className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ color: MUTED, border: `1.5px solid ${LINE}` }}
            aria-label="On this page"
          >
            <FiList size={15} />
          </button>
        </div>
      </div>

      {/* Mobile role scroller (hidden on desktop, where the left rail takes over) */}
      <div className="lg:hidden border-b shrink-0 flex items-center overflow-x-auto no-scrollbar" style={{ borderColor: LINE, background: PAPER }}>
        <RoleTabs activeRoleId={activeRoleId} onSelect={handleRoleSelect} orientation="horizontal" />
        <div className="shrink-0 pr-4">
          <BackButton onBack={handleBack} />
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Desktop left rail */}
        <div className="hidden lg:flex w-[104px] shrink-0 border-r flex-col h-full" style={{ borderColor: LINE, background: '#fff' }}>
          <div className="h-[40px] flex items-center justify-center border-b shrink-0" style={{ borderColor: LINE }}>
            <span
              className="font-ui font-bold text-[10.5px] tracking-[2px] uppercase"
              style={{ color: INK }}
            >
              Role
            </span>
          </div>
          <RoleTabs activeRoleId={activeRoleId} onSelect={handleRoleSelect} orientation="vertical" />
          <div className="shrink-0 border-t flex items-center justify-center py-2.5" style={{ borderColor: LINE }}>
            <BackButton onBack={handleBack} vertical />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-w-0 h-full"
          >
            <CenterPanel
              activeRole={activeRole}
              scrollRef={scrollRef}
              sectionRefs={sectionRefs}
              onActiveFeatureChange={setActiveFeatureId}
            />
          </motion.div>
        </AnimatePresence>

        {/* Desktop right rail */}
        <div className="hidden lg:flex w-[288px] shrink-0 border-l flex-col h-full" style={{ borderColor: LINE, background: '#fff' }}>
          <div className="h-[60px] flex items-center justify-between px-5 border-b shrink-0" style={{ borderColor: LINE }}>
            <span className="font-display font-semibold text-[14.5px] text-[#111]">On this page</span>
            <span
              className="font-ui text-[10.5px] font-semibold tabular-nums px-2 py-0.5 rounded-full"
              style={{ background: BLUSH, color: PLUM_DEEP, border: `1px solid ${LINE}` }}
            >
              {activeRole.features.length}
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={activeRole.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="flex-1 min-h-0 flex flex-col">
              <ShortcutList activeRole={activeRole} activeFeatureId={activeFeatureId} onJump={handleJump} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Mobile "On this page" drawer ───────────────────────────── */}
      <AnimatePresence>
        {mobileTocOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(27,19,32,0.35)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileTocOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-[86%] max-w-[340px] flex flex-col lg:hidden"
              style={{ background: '#fff' }}
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            >
              <div className="h-14 flex items-center justify-between px-5 border-b shrink-0" style={{ borderColor: LINE }}>
                <span className="font-display font-semibold text-[14.5px] text-[#111]">On this page</span>
                <button onClick={() => setMobileTocOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: MUTED, border: `1.5px solid ${LINE}` }} aria-label="Close">
                  <FiX size={15} />
                </button>
              </div>
              <ShortcutList activeRole={activeRole} activeFeatureId={activeFeatureId} onJump={handleJump} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .font-hero { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; }
        .font-ui, .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}