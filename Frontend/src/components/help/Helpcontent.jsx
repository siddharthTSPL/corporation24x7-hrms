import {
  FaRocket,
  FaTachometerAlt,
  FaCalendarCheck,
  FaCalendarAlt,
  FaClock,
  FaMoneyCheckAlt,
  FaFileInvoiceDollar,
  FaFolderOpen,
  FaBullhorn,
  FaSitemap,
  FaUsersCog,
  FaBoxOpen,
  FaClipboardCheck,
  FaShieldAlt,
  FaCog,
  FaUserShield,
  FaBuilding,
  FaQuestionCircle,
  FaCamera,
} from "react-icons/fa";

// Every article is tagged with the roles it applies to. The Help Center
// filters on this against the logged-in user's role, so admins don't see
// employee-only content and vice versa. "all" is shorthand for every role.
const ALL = ["superadmin", "admin", "manager", "employee"];

export const helpSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: <FaRocket />,
    articles: [
      {
        id: "welcome",
        title: "Welcome to TorchX Talent",
        roles: ALL,
        summary: "What TorchX Talent is and how it's organised.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "TorchX Talent is your organisation's HRMS — one place to mark attendance, apply for leave, log timesheets, submit reimbursements, manage documents, run payroll, track recruitment, and raise support requests.",
              "What you see depends on your role. Employees get a personal workspace for their own attendance, leave, and documents. Managers get everything an employee has, plus tools to approve their team's requests. Admins run the whole organisation — onboarding, payroll, policies, and permissions. Super Admins oversee every organisation on the platform.",
            ],
          },
          {
            heading: "Your role, at a glance",
            paragraphs: [],
            steps: [
              "Employee — mark attendance, apply for leave/WFH, log timesheets, submit reimbursements, upload personal documents, raise support tickets.",
              "Manager — everything an Employee can do, plus approve/forward their team's leave, timesheets and reimbursements, run performance reviews, and view team documents.",
              "Admin — everything above for the whole organisation, plus onboarding, payroll, asset management, recruitment, holiday/leave policy, and permission control.",
              "Super Admin — manages every organisation on TorchX, product licensing, and platform-wide settings.",
            ],
          },
          {
            heading: "Finding your way around",
            paragraphs: [
              "The left sidebar is your main menu — it only shows the modules your role and permissions allow. A locked padlock icon next to a menu item means you don't currently have permission for it; ask your admin if you think that's wrong.",
              "The pink question-mark button floating in the corner of every screen opens quick help: a guided tour of the sidebar, and a way to report a technical problem directly to the support team.",
            ],
          },
        ],
      },
      {
        id: "dashboard",
        title: "Understanding your Dashboard",
        roles: ALL,
        summary: "What the numbers and charts on your dashboard mean.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Your Dashboard is the first thing you see after logging in. It summarises what matters most for your role: for an Employee that's your own attendance and leave; for a Manager it's your team's activity; for an Admin it's organisation-wide headcount and health; for a Super Admin it's usage across every organisation.",
            ],
          },
          {
            heading: "What you'll typically find",
            paragraphs: [],
            steps: [
              "Attendance summary — who's checked in today, and your own check-in status.",
              "Leave snapshot — pending requests awaiting your approval (Manager/Admin), or your own remaining balance (Employee).",
              "Charts and trends — attendance and activity over time, built from the same data as the Attendance and Leave modules.",
              "Quick shortcuts to the modules you use most, so you don't have to hunt through the sidebar.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "attendance",
    title: "Attendance",
    icon: <FaCalendarCheck />,
    articles: [
      {
        id: "mark-attendance",
        title: "Marking your attendance",
        roles: ALL,
        summary: "Check in, check out, and see your active/idle time.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Open Attendance from the sidebar to check in for the day. Once checked in, the app tracks your Active time and Idle time, and shows a live Productivity score based on how you're using the day.",
            ],
          },
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Go to the Attendance page and tap Check In — this stamps your start time for the day.",
              "Keep the app open (or the browser tab) while you work; it tracks Active vs Idle time automatically.",
              "When you're done for the day, tap Check Out to close out your attendance record.",
              "If you forget to check out, contact your Admin/Manager — attendance edits are done from their side.",
            ],
          },
          {
            heading: "Notes",
            paragraphs: [
              "Statuses you'll see on your record: Checked in, Active, Idle, Half Day, and Absent, depending on how much of the day you were logged in and active.",
            ],
          },
        ],
      },
      {
        id: "face-kiosk",
        title: "Face attendance & the kiosk",
        roles: ALL,
        summary: "How selfie/face-based check-in works, and enrolling employees for it.",
        body: [
          {
            heading: "For Employees — using the kiosk",
            paragraphs: [
              "If your organisation uses face-based attendance, a shared kiosk device is set up (usually a tablet at the entrance). Walk up to it, let it scan your face, and it marks you present automatically — no login needed on the kiosk itself.",
              "Some organisations also use a periodic selfie prompt on your own device (the Selfie Tracker) to confirm you're still active during the day.",
            ],
          },
          {
            heading: "For Admins — enrolling faces",
            paragraphs: [
              "Go to Face Attendance in the sidebar (Admin only) to enroll an employee's face before they can use kiosk check-in.",
            ],
            steps: [
              "Open Face Attendance from the sidebar.",
              "Select the employee you want to enroll.",
              "Capture a clear, front-facing photo following the on-screen guide.",
              "Save — the employee can now check in at any kiosk linked to your organisation.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "leave-wfh",
    title: "Leave & Work From Home",
    icon: <FaCalendarAlt />,
    articles: [
      {
        id: "apply-leave",
        title: "Applying for leave",
        roles: ALL,
        summary: "Submit a leave request and track its approval status.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Open Leave from the sidebar. The page is organised into tabs — one to apply for new leave/WFH, and one to see your leave balance and history.",
            ],
          },
          {
            heading: "Steps to apply",
            paragraphs: [],
            steps: [
              "Go to the Leave page and open the Apply Leave tab.",
              "Choose the leave type (Earned Leave, Sick Leave, Half Day, etc. — the options depend on your organisation's policy) and the start/end dates.",
              "Add a reason if your organisation requires one, then Submit.",
              "Track it from the Latest Leave Status column — it moves through the approval chain (e.g. Forwarded to Reporting Mgr → Approved by Manager → Approved by Admin) until it's fully Approved or rejected.",
            ],
          },
          {
            heading: "Editing or cancelling",
            paragraphs: [
              "While a request is still pending, open it and use Edit Leave Request (or Edit WFH Request for work-from-home) to change the dates or reason before it's been decided.",
            ],
          },
        ],
      },
      {
        id: "leave-balance",
        title: "Checking your leave balance",
        roles: ALL,
        summary: "See how many days of each leave type you have left.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "The Leave Balance tab on the Leave page breaks down what you've been allotted, used, and have remaining, by leave type (e.g. Earned Leave, Sick Leave). Balances are set by your organisation's leave policy and typically refresh automatically each cycle.",
            ],
          },
        ],
      },
      {
        id: "approve-leave",
        title: "Approving leave requests (Manager / Admin)",
        roles: ["manager", "admin", "superadmin"],
        summary: "Review, approve, reject, or forward your team's leave requests.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Managers see requests from their direct reports; Admins see everything across the organisation that needs a final decision. Some requests are Forwarded to Reporting Mgr first before reaching an Admin — this reflects your organisation's approval chain.",
            ],
          },
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open Leave from the sidebar — pending requests needing your decision are listed first.",
              "Review the dates, leave type, and reason.",
              "Approve, Reject, or (for Managers) Forward it up the chain to an Admin or Super Admin for the Final Decision.",
              "The employee sees the updated status immediately on their own Leave page.",
            ],
          },
        ],
      },
      {
        id: "wfh",
        title: "Requesting Work From Home",
        roles: ALL,
        summary: "WFH requests follow the same flow as leave, from the same page.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Work From Home requests live alongside leave requests on the same Leave page — pick WFH as the type when applying. They go through the same approval chain as leave.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "timesheet",
    title: "Timesheet",
    icon: <FaClock />,
    articles: [
      {
        id: "log-time",
        title: "Logging time against a job",
        roles: ALL,
        summary: "Track hours with the timer or by logging entries manually.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Timesheet tracks the hours you spend on jobs/projects. Open it from the sidebar — My Jobs lists what you're assigned to, and My Work shows your logged time entries.",
            ],
          },
          {
            heading: "Using the live timer",
            paragraphs: [],
            steps: [
              "Open a job under My Jobs and hit the timer's Start control — this begins tracking in real time (you'll see 'No Active Timer' before you start one).",
              "The timer auto-pauses if you go idle for too long, so it stays accurate.",
              "Stop the timer when you finish — it's logged as a time entry against that job automatically.",
            ],
          },
          {
            heading: "Logging time manually",
            paragraphs: [],
            steps: [
              "Use Log Time to add an entry directly — pick the Job, the Date, and the hours worked.",
              "Mark it Billable if it should be invoiced to the client.",
              "Edit any entry later with Edit Time Log while it's still editable (not yet approved).",
            ],
          },
          {
            heading: "Entry & job statuses",
            paragraphs: [
              "Time entries move through Draft → Completed → Approved (or Cancelled). Jobs themselves are tracked as Not Started, In Progress, or Completed.",
            ],
          },
        ],
      },
      {
        id: "approve-timesheet",
        title: "Reviewing team timesheets (Manager / Admin)",
        roles: ["manager", "admin", "superadmin"],
        summary: "Approve logged hours before they're finalised.",
        body: [
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open Timesheet from the sidebar — team entries awaiting review are listed there.",
              "Check the job, date, and hours logged against each entry.",
              "Approve entries you're happy with; flag or discuss anything that looks off with the employee directly.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "reimbursements",
    title: "Reimbursements",
    icon: <FaMoneyCheckAlt />,
    articles: [
      {
        id: "submit-claim",
        title: "Submitting a reimbursement claim",
        roles: ALL,
        summary: "Claim back an expense and track it to payout.",
        body: [
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open Reimbursements from the sidebar.",
              "Start a new claim — add the amount, category, and a short description of the expense.",
              "Attach a receipt or bill if you have one; this speeds up approval.",
              "Submit — you'll see it move through your organisation's approval chain the same way leave requests do.",
            ],
          },
        ],
      },
      {
        id: "review-claims",
        title: "Reviewing reimbursement claims (Manager / Admin / Super Admin)",
        roles: ["manager", "admin", "superadmin"],
        summary: "Approve claims from your team, or across the organisation.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Managers see claims from their reportees. Admins see claims from managers and employees across the organisation, and can also submit their own. Super Admins can review claims raised by admins, and see every claim across every organisation.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "payroll",
    title: "Payroll",
    icon: <FaFileInvoiceDollar />,
    articles: [
      {
        id: "payroll-overview",
        title: "Running payroll & payslips",
        roles: ["admin", "superadmin"],
        summary: "Payroll runs, salary structures, and payslip generation.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Payroll is restricted to Admins and Super Admins — it covers CTC and salary structures, running a payroll cycle for your organisation, and generating payslips employees can view. This section is sensitive by design, so it's kept out of Manager and Employee menus entirely.",
            ],
          },
          {
            heading: "Typical flow",
            paragraphs: [],
            steps: [
              "Set up each employee's salary structure (components like base pay, allowances, deductions) if not already configured.",
              "Run the payroll cycle for the period — the system calculates pay based on attendance, leave (including loss-of-pay days), and the salary structure.",
              "Review the generated payslips before finalising.",
              "Once finalised, employees can view their own payslip from their account.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "documents",
    title: "Documents",
    icon: <FaFolderOpen />,
    articles: [
      {
        id: "personal-docs",
        title: "Uploading your documents",
        roles: ALL,
        summary: "Store ID proofs, certificates, and other personal files.",
        body: [
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open Document (or File) from the sidebar.",
              "Choose Upload and select the file — common formats like PDF, Word, and images are supported.",
              "Label it clearly (e.g. 'Aadhar Card', 'Degree Certificate') so it's easy to find later.",
            ],
          },
        ],
      },
      {
        id: "team-docs",
        title: "Viewing team documents (Manager / Admin)",
        roles: ["manager", "admin", "superadmin"],
        summary: "See documents uploaded by people you manage.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Managers and Admins with document permissions can see a Team Document view alongside their own — useful for verifying onboarding paperwork without asking each employee individually.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "announcements",
    title: "Announcements",
    icon: <FaBullhorn />,
    articles: [
      {
        id: "view-announcements",
        title: "Reading announcements",
        roles: ALL,
        summary: "Company-wide updates show up here, newest first.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Anything your organisation publishes — policy updates, events, notices — appears on the Announcement page, most recent first.",
            ],
          },
        ],
      },
      {
        id: "create-announcements",
        title: "Publishing an announcement (Admin / Manager)",
        roles: ["admin", "manager", "superadmin"],
        summary: "Write and publish an update for your organisation or team.",
        body: [
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open Announcement from the sidebar.",
              "Click New Announcement, write a title and message.",
              "Publish — it becomes visible instantly to everyone it's targeted at.",
            ],
          },
          {
            heading: "Note",
            paragraphs: [
              "This requires an announcements permission to be enabled on your account. If you don't see the option to create one, ask your Admin.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "organisation",
    title: "Organisation",
    icon: <FaSitemap />,
    articles: [
      {
        id: "org-chart",
        title: "Viewing the org chart",
        roles: ALL,
        summary: "See your organisation's reporting structure.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "The Organisation page shows your company's structure — who reports to whom, and how teams are grouped. It's read-only for Managers and Employees; Admins manage the underlying structure from Onboarding.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "recruitment",
    title: "Recruitment",
    icon: <FaUsersCog />,
    articles: [
      {
        id: "recruitment-overview",
        title: "Hiring requisitions & candidates",
        roles: ["admin", "manager"],
        summary: "Post open roles and track candidates through the pipeline.",
        body: [
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open Recruitment from the sidebar.",
              "Create a Hiring Requisition — the role, department, and headcount you need to fill.",
              "Add candidates against that requisition as they apply or get sourced.",
              "Move candidates through your pipeline stages and track status until the role is filled.",
            ],
          },
          {
            heading: "Note",
            paragraphs: [
              "Requires recruitment permissions (view/create requisitions, view/add candidates). Ask your Admin if the module doesn't appear.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "assets",
    title: "Asset Management",
    icon: <FaBoxOpen />,
    articles: [
      {
        id: "assets-overview",
        title: "Assigning & tracking company assets",
        roles: ["admin", "superadmin"],
        summary: "Laptops, ID cards, and other assets — assign, revoke, and track history.",
        body: [
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open Asset Management from the sidebar.",
              "Add an asset (e.g. a laptop with its serial number) to your inventory.",
              "Assign it to an employee — this is logged with a timestamp.",
              "When it's returned or reassigned, Revoke it from the current holder and re-assign as needed. The full history stays attached to the asset.",
            ],
          },
          {
            heading: "For Employees",
            paragraphs: [
              "You can view the assets currently assigned to you from your own Assets panel, even though you don't manage assignment yourself.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "reviews",
    title: "Performance Reviews",
    icon: <FaClipboardCheck />,
    articles: [
      {
        id: "reviews-overview",
        title: "Running performance reviews",
        roles: ["admin", "manager", "superadmin"],
        summary: "Set up and track review cycles for your team.",
        body: [
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open Review from the sidebar.",
              "Start a review cycle for your team or reportees.",
              "Fill in ratings/feedback per the format your organisation uses, and submit.",
              "Track completion status across your team from the same page.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "support",
    title: "TorchX Voice (Support Tickets)",
    icon: <FaShieldAlt />,
    articles: [
      {
        id: "raise-ticket",
        title: "Raising a ticket",
        roles: ALL,
        summary: "Report an issue, complaint, or grievance — with an anonymous option.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "TorchX Voice is where you raise anything from a technical issue to a workplace grievance. Open it from the sidebar — Submit New starts a ticket, My Tickets tracks ones you've already sent.",
            ],
          },
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open TorchX Voice and switch to Submit New.",
              "Pick a Category — Complaint, Grievance, Colleague Behaviour, Inappropriate Behaviour, Discrimination, Compensation Issue, Data Breach, Financial Fraud, Legal Compliance, and more are available depending on what fits.",
              "Set a Priority (Low, Medium, High, or Critical) and, if relevant, an Incident Date and Location.",
              "Toggle Anonymous if you'd rather your identity not be attached to sensitive reports — Confidentiality is respected for these categories.",
              "Submit, then track it under My Tickets. Status moves through Created → Acknowledged → Action Taken → Closed.",
            ],
          },
        ],
      },
      {
        id: "resolve-ticket",
        title: "Resolving tickets (Manager / Admin / Super Admin)",
        roles: ["manager", "admin", "superadmin"],
        summary: "Acknowledge, act on, and close tickets raised to you.",
        body: [
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open TorchX Voice — tickets needing attention are listed with their Category and Priority.",
              "Acknowledge a ticket to let the raiser know it's been seen.",
              "Record the Action Taken once you've addressed it.",
              "Close it out when resolved — the raiser can then rate the resolution.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "torchx-management",
    title: "TorchX Management",
    icon: <FaUserShield />,
    articles: [
      {
        id: "product-access",
        title: "Managing product access & licensing",
        roles: ["admin", "superadmin"],
        summary: "Control which TorchX products your organisation has access to.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Admins manage their own organisation's TorchX product access from here. Super Admins manage product access and licensing across every organisation on the platform.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "superadmin-orgs",
    title: "Organisations (Super Admin)",
    icon: <FaBuilding />,
    articles: [
      {
        id: "onboard-org",
        title: "Onboarding a new organisation",
        roles: ["superadmin"],
        summary: "Bring a new company onto TorchX Talent.",
        body: [
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open Organisations from the sidebar.",
              "Add the new organisation's details and its first Admin account.",
              "Grant TorchX Talent access via TorchX Management once onboarding is complete.",
            ],
          },
          {
            heading: "Ongoing oversight",
            paragraphs: [
              "From here you can also see leave, reviews, timesheets, payroll, and reimbursements rolled up across every organisation — useful for spotting issues before an individual Admin flags them.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "settings",
    title: "Settings & Profile",
    icon: <FaCog />,
    articles: [
      {
        id: "profile",
        title: "Updating your profile & password",
        roles: ALL,
        summary: "Keep your personal details, avatar, and password up to date.",
        body: [
          {
            heading: "Steps",
            paragraphs: [],
            steps: [
              "Open Settings from the sidebar.",
              "Edit your personal details — contact info, address, bank details (if applicable) — and Save.",
              "Pick an avatar style if your organisation supports custom avatars.",
              "Use Change Password to update your login password; you'll need your current password to confirm.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "permissions",
    title: "Roles & Permissions",
    icon: <FaUserShield />,
    articles: [
      {
        id: "how-permissions-work",
        title: "How roles and permissions work",
        roles: ALL,
        summary: "Why you might not see a menu item — and who to ask.",
        body: [
          {
            heading: "Overview",
            paragraphs: [
              "Your base Role (Employee, Manager, Admin, Super Admin) decides the overall shape of your menu. On top of that, some modules — Announcements, Documents, Recruitment, Tickets — are gated by individual permissions your Admin can grant or revoke per person, independent of role.",
              "If a menu item shows a small padlock, or a page tells you that you don't have permission, that's a permission gate — not a bug. Ask your organisation's Admin to grant the relevant permission if you believe you should have it.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "faq",
    title: "FAQs",
    icon: <FaQuestionCircle />,
    articles: [
      {
        id: "faq-general",
        title: "Frequently asked questions",
        roles: ALL,
        summary: "Quick answers to common questions.",
        body: [
          {
            heading: "I forgot to check out yesterday — what happens?",
            paragraphs: [
              "Your attendance record for that day may show as incomplete or Half Day. It can't be self-corrected — ask your Manager or Admin to review and adjust it.",
            ],
          },
          {
            heading: "My leave request has been pending for days — who do I ask?",
            paragraphs: [
              "Check the Latest Leave Status column on your Leave page to see exactly where it's stuck in the approval chain, then follow up with that person directly (Manager, Admin, or Super Admin).",
            ],
          },
          {
            heading: "Can I edit a submitted timesheet entry?",
            paragraphs: [
              "Yes, as long as it hasn't been approved yet — open it and use Edit Time Log. Once approved, it's locked; ask your Manager/Admin if it needs correcting.",
            ],
          },
          {
            heading: "How do I report something confidential, like a grievance?",
            paragraphs: [
              "Use TorchX Voice, pick the relevant category (Grievance, Discrimination, etc.), and turn on Anonymous — your identity won't be attached to the ticket.",
            ],
          },
          {
            heading: "A menu item I need is missing or locked.",
            paragraphs: [
              "That's a permissions gate, not an error. See Roles & Permissions above, and ask your Admin to enable it for your account.",
            ],
          },
          {
            heading: "I found a bug or something isn't loading correctly.",
            paragraphs: [
              "Use the pink help button in the corner → Help, to send a technical support request directly to the team, with attachments if useful.",
            ],
          },
        ],
      },
    ],
  },
];

export const ROLE_LABEL = {
  superadmin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

// Face kiosk icon export kept available for callers that want the raw icon
// without pulling the whole sections array (used in a couple of blurbs).
export const FaceKioskIcon = FaCamera;