import { useMemo, useState } from "react";
import {
  FaBook, FaSearch, FaChevronDown, FaChevronRight,
  FaUserCheck, FaClock, FaMapMarkerAlt, FaCalendarAlt, FaStopwatch,
  FaUsers, FaBoxes, FaShieldAlt, FaLaptop, FaExclamationTriangle, FaInfoCircle, FaCheckCircle,
  FaMoneyBillWave, FaReceipt, FaAward, FaCommentDots, FaFolderOpen, FaBullhorn,
  FaSitemap, FaBell, FaUserCog, FaSignInAlt, FaCalendarCheck,
} from "react-icons/fa";

// =====================================================================
// COLOR TOKENS — "beetroot" palette (replaces the earlier pink tones).
// Keeping these in one place makes future palette tweaks a one-line change.
// =====================================================================
const BEETROOT = {
  900: "#5C1730", // deepest — headings/icons on light bg
  700: "#730042", // primary accent (already beetroot-toned, kept as-is)
  500: "#8C2F49", // mid accent — focus rings, active states
  300: "#C98096", // borders, dividers
  100: "#E9C7D0", // soft borders / pill outlines
  50: "#F3E1E7",  // lightest tint — section backgrounds, chip fills
  textMid: "#7A2A41", // subdued supporting text on tinted bg
};

// =====================================================================
// CONTENT MODEL — same shape as the Documentation modal, so both stay
// easy to keep in sync. Each article is an ordered list of "blocks":
//   { type: "p",     text }                                 paragraph
//   { type: "steps", title?, items: [string...] }            numbered walkthrough
//   { type: "list",  title?, items: [string...] }             bullet list
//   { type: "note",  tone: "info"|"warning"|"success", text } callout
// =====================================================================

const CATEGORIES = [
  // --------------------------------------------------- Getting started --
  {
    id: "getting-started",
    label: "Getting Started",
    icon: FaSignInAlt,
    articles: [
      {
        title: "Signing up and setting up your organisation",
        blocks: [
          {
            type: "steps",
            items: [
              "On the sign-up page, fill in your Personal Info (your name, email, password).",
              "Move to Company Info — organisation name, industry (e.g. Engineering, Finance, Healthcare, Manufacturing, Logistics, Hospitality, Education, Real Estate, or Other), and basic company details.",
              "Accept the Terms & Policy — this is required before the account can be created.",
              "Submit to create your account. This first account becomes the organisation's Admin.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "You can't submit with any required field empty — the form will point out what's missing before it lets you continue.",
          },
        ],
      },
      {
        title: "Logging in and switching roles",
        blocks: [
          {
            type: "p",
            text: "Everyone — Super Admin, Admin, Manager, and Employee — signs in from the same login page with their email and password.",
          },
          {
            type: "list",
            items: [
              "You're redirected automatically to the dashboard that matches your role — there's no separate login page per role.",
              "On your first login, a welcome message greets you and walks you through the basics.",
              "If it's your birthday, you'll also see a small birthday message on your dashboard the day of.",
            ],
          },
        ],
      },
      {
        title: "Companion Login — continue your session on another device",
        blocks: [
          {
            type: "p",
            text: "Companion Login lets you carry an already-signed-in session to a second browser or device, without typing your password again.",
          },
          {
            type: "steps",
            title: "On the device you're already logged into",
            items: [
              "Open Companion Login from your profile menu.",
              "Generate a companion link — it's short-lived and expires automatically (by default within about an hour).",
              "Share or open that link on the new device.",
            ],
          },
          {
            type: "steps",
            title: "On the new device",
            items: [
              "Open the companion link you were given.",
              "The app redeems the link and signs you in directly — no password prompt.",
            ],
          },
          {
            type: "note",
            tone: "warning",
            text: "Because the link signs in without a password, only share it the same way you'd share a password — and generate a fresh one if it expires or you're unsure it's still valid.",
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Face --
  {
    id: "face-attendance",
    label: "Face Attendance",
    icon: FaUserCheck,
    articles: [
      {
        title: "How face check-in & checkout works, end to end",
        blocks: [
          {
            type: "p",
            text: "Face attendance runs on a dedicated kiosk device (a tablet or PC placed at your office entrance). It scans continuously and automatically recognises your face the moment you look at the camera — there's nothing to tap or press.",
          },
          {
            type: "steps",
            title: "Checking in for the day",
            items: [
              "Walk up to the kiosk and look at the camera for a moment.",
              "The kiosk matches your face against registered employee profiles.",
              "If you're within the check-in window for your shift, you're checked in instantly and a green confirmation banner appears with your name and check-in time.",
              "If you're outside the early-arrival buffer, you'll see a \"Too early\" message — come back closer to your shift start.",
              "If you scan after your shift start, you're still checked in, but marked late (this still counts as a valid check-in).",
            ],
          },
          {
            type: "steps",
            title: "Checking out at the end of the day",
            items: [
              "Look at the same kiosk again when you're leaving.",
              "The system recognises you already checked in today and treats this scan as a checkout attempt.",
              "If enough time has passed since check-in (the checkout cooldown, default 10 minutes), you're checked out immediately.",
              "Your total worked time, and whether it counts as a full day, half day, or falls short, is calculated automatically from the gap between check-in and checkout.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "You never need to tell the kiosk whether you're checking in or checking out — it figures that out automatically based on whether you already have an open check-in for today.",
          },
        ],
      },
      {
        title: "The 10-minute checkout cooldown, explained",
        blocks: [
          {
            type: "p",
            text: "After you check in, the kiosk will not accept a checkout for a short cooldown period — by default 10 minutes. This is intentional, not a bug.",
          },
          {
            type: "list",
            title: "Why this exists",
            items: [
              "The kiosk scans every ~2 seconds while idle, looking for any face.",
              "If you check in and then linger near the camera, or someone else scans right after you, an unprotected system could misread that as an immediate checkout.",
              "The cooldown guarantees at least a few minutes of real gap between your check-in and any checkout, so a stray extra scan can never accidentally close out your day seconds after it started.",
            ],
          },
          {
            type: "steps",
            title: "What you'll see if you scan too early",
            items: [
              "A blue \"Already checked in\" banner appears instead of a checkout confirmation.",
              "A live countdown chip shows exactly how long is left — e.g. \"Checkout unlocks in 07:42\" — and ticks down in real time.",
              "Once the countdown hits zero, the chip switches to \"Checkout window is open\" — your very next scan will check you out normally.",
            ],
          },
        ],
      },
      {
        title: "Automatic checkout if you forget",
        blocks: [
          {
            type: "p",
            text: "If you check in but never scan out — camera glitch, you left through a different exit, you simply forgot — the system won't leave your day open forever.",
          },
          {
            type: "list",
            items: [
              "A background job checks for open (checked-in, not checked-out) sessions every few minutes.",
              "Once your shift's end time plus a fixed overtime allowance (commonly 1 hour) has passed, the system automatically closes your session for you.",
              "Your recorded checkout time will be that cutoff instant, and the day is marked accordingly based on how much time was logged.",
            ],
          },
          {
            type: "note",
            tone: "warning",
            text: "If you genuinely worked later than the automatic cutoff, the recorded hours won't reflect that. Let your admin know so your attendance for that day can be corrected manually.",
          },
        ],
      },
      {
        title: "Face attendance vs. System (manual) attendance",
        blocks: [
          {
            type: "p",
            text: "You can check in through the face kiosk or through the app/System (a manual check-in button), but not a mix of both on the same day — each day's attendance is owned by a single channel.",
          },
          {
            type: "list",
            items: [
              "If you checked in via System, check out via System too — the kiosk will detect the existing System check-in and refuse to silently take over the day.",
              "If you checked in via face scan, check out via face scan.",
              "This prevents a scenario where a face scan accidentally closes out a day that was actually being tracked manually, or vice versa.",
            ],
          },
        ],
      },
      {
        title: "Troubleshooting a failed scan",
        blocks: [
          {
            type: "steps",
            title: "If the kiosk says \"Not registered\"",
            items: [
              "Your face hasn't been enrolled on this kiosk/organisation yet.",
              "Ask your admin to register your face from the Face Attendance settings page.",
              "Once registered, try scanning again — recognition is immediate, no waiting period.",
            ],
          },
          {
            type: "steps",
            title: "If the camera doesn't seem to recognise you",
            items: [
              "Make sure your face is well-lit and centred in the frame — avoid strong backlight from windows or doorways.",
              "Remove anything covering your face (masks, sunglasses) if practical.",
              "Try again after a couple of seconds — the kiosk retries automatically every ~2 seconds.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "A shake animation and a short buzz means the scan genuinely failed (no confident match) — this is different from the blue \"already checked in\" banner, which means it worked but a rule is temporarily blocking the action.",
          },
        ],
      },
    ],
  },

  // -------------------------------------------------- Manual/System --
  {
    id: "system-attendance",
    label: "System Attendance",
    icon: FaClock,
    articles: [
      {
        title: "Checking in and out from the app",
        blocks: [
          {
            type: "steps",
            items: [
              "Go to the Attendance section of the app.",
              "Tap Check In — your check-in time is recorded immediately, along with your current shift details.",
              "At the end of the day, come back to the same screen and tap Check Out.",
              "Your worked duration for the day is calculated automatically from these two timestamps.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "This is the same underlying attendance record as face attendance — the difference is only how the check-in/out event is captured. Once you start a day via System, finish it via System too.",
          },
        ],
      },
      {
        title: "Understanding your attendance status for the day",
        blocks: [
          {
            type: "list",
            title: "How a day gets classified",
            items: [
              "Present — you worked at or above the shift's expected threshold.",
              "Half day — you worked a meaningful chunk of the shift, but below the full-day threshold.",
              "Absent — no valid check-in/checkout was recorded, or the worked time fell below the minimum threshold.",
              "Late — your check-in happened after your shift's grace period, tracked as a separate flag alongside your overall status.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "Thresholds are configured per shift by your admin, so \"half day\" for one shift may be a different worked-duration cutoff than another.",
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------- Geo --
  {
    id: "geolocation",
    label: "Location Check-in",
    icon: FaMapMarkerAlt,
    articles: [
      {
        title: "How location is verified during check-in",
        blocks: [
          {
            type: "p",
            text: "For organisations with location-based attendance enabled, the app checks your device's GPS location at the moment you check in, to confirm you're within an approved radius of your workplace.",
          },
          {
            type: "steps",
            items: [
              "When you tap Check In, your browser/app asks for location permission (only the first time).",
              "The app waits briefly for a high-accuracy GPS fix rather than using the very first, often rough, reading.",
              "If your location falls within the approved radius and the accuracy is good enough to trust, check-in proceeds normally.",
              "If your device can't get an accurate enough fix, or you're outside the approved radius, you'll see a clear message explaining why the check-in was rejected.",
            ],
          },
          {
            type: "note",
            tone: "warning",
            text: "Please allow location permission when prompted — if it's denied, location-gated check-in cannot proceed, since there's nothing to verify against.",
          },
        ],
      },
      {
        title: "What to do if check-in keeps getting rejected for location",
        blocks: [
          {
            type: "list",
            items: [
              "Make sure device Location/GPS is turned on, not just app permission — both are required.",
              "Step outside or near a window if you're deep inside a large building; GPS accuracy is often poor indoors.",
              "Try again after a few seconds — the app retries for a better GPS fix rather than failing on the first weak reading.",
              "If you're genuinely on-site and it still fails, contact your admin — the approved radius or coordinates for your location may need adjustment.",
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ Leave --
  {
    id: "leave",
    label: "Leave & WFH",
    icon: FaCalendarAlt,
    articles: [
      {
        title: "Applying for leave",
        blocks: [
          {
            type: "steps",
            items: [
              "Open the Leave section and tap Apply for Leave.",
              "Choose your leave type (e.g. Casual, Sick, Earned) — available types and your remaining balance for each are shown.",
              "Select your start and end dates, and add a reason.",
              "Submit — your request moves to Pending and is routed to your first approver.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "Half-day leave and Work-From-Home requests, where enabled, follow the same flow with an extra option to mark the specific half or the WFH toggle.",
          },
        ],
      },
      {
        title: "How the approval chain works",
        blocks: [
          {
            type: "p",
            text: "Leave requests move up your reporting hierarchy step by step — each step must approve before the next one sees it.",
          },
          {
            type: "list",
            items: [
              "Employee submits the request.",
              "Manager reviews first and can approve, reject, or leave it pending.",
              "If required by your organisation's chain, it then moves to the Admin.",
              "Super Admin has final visibility and can act at any point in the chain if needed.",
            ],
          },
          {
            type: "steps",
            title: "Tracking your request",
            items: [
              "Open your leave request from the Leave section at any time.",
              "The current status (Pending / Approved / Rejected) and current approver are shown on the request card.",
              "You'll be notified once a decision is made at any stage.",
            ],
          },
        ],
      },
      {
        title: "Understanding your leave balance",
        blocks: [
          {
            type: "p",
            text: "Leave balances accrue automatically on a fixed schedule (commonly monthly) for each leave type your organisation offers.",
          },
          {
            type: "list",
            items: [
              "Your current balance per leave type is shown on the Leave dashboard.",
              "Approved leave is deducted from the relevant balance the moment it's approved.",
              "Any manual adjustments made by HR/Admin (e.g. carry-forward, correction) also reflect here immediately.",
            ],
          },
        ],
      },
    ],
  },

  // --------------------------------------------------------- Timesheet --
  {
    id: "timesheet",
    label: "Timesheet",
    icon: FaStopwatch,
    articles: [
      {
        title: "Logging time against a project",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Timesheet and select the week you want to log time for.",
              "Pick the Client → Project → Job combination you worked on (only ones assigned to you appear).",
              "Enter hours for each day of the week in that row's cells, in the familiar week-grid layout.",
              "Add more rows for additional projects/jobs worked that week.",
              "Submit the week once it's complete and accurate.",
            ],
          },
        ],
      },
      {
        title: "Using the live timer instead of manual entry",
        blocks: [
          {
            type: "steps",
            items: [
              "Pick the project/job you're about to work on and tap Start Timer.",
              "The timer runs in the background and keeps ticking even if you switch tabs or briefly lose connection.",
              "Tap Stop when you're done — the elapsed time is logged automatically into that day's timesheet row.",
              "You can start a new timer for a different project right after stopping the previous one.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "Only one timer can run at a time. Starting a new one automatically stops any timer already running.",
          },
        ],
      },
      {
        title: "Submission, approval & escalation",
        blocks: [
          {
            type: "list",
            items: [
              "Once submitted, your weekly timesheet moves to Pending Approval with your manager/lead.",
              "If it isn't actioned within the expected window, it automatically escalates up the chain so it doesn't sit unnoticed.",
              "Rejected timesheets return to you as editable, with the reviewer's comment explaining what to fix.",
            ],
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------- Payroll --
  {
    id: "payroll",
    label: "Payroll",
    icon: FaMoneyBillWave,
    articles: [
      {
        title: "Setting or revising an employee's CTC",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Payroll → Set / Revise CTC.",
              "Select the employee and enter their Fixed Annual CTC.",
              "Save — the monthly Basic, allowances, and other components are auto-computed from your organisation's current salary policy.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "Setting a CTC again later revises it rather than replacing history — past structures stay on record, so you can always see what changed and when.",
          },
        ],
      },
      {
        title: "Building a salary structure",
        blocks: [
          {
            type: "p",
            text: "Each earning component in a salary structure — including custom ones like a Fixed Allowance — can be defined as a flat amount, a percentage of Gross/Basic/CTC, or a custom formula.",
          },
          {
            type: "list",
            items: [
              "Components you add here (Basic, HRA, Bonus, Advance, Benefits, and any custom ones) build up the full monthly breakup.",
              "A component can't be saved without a name — the form will flag it if it's missing.",
              "This structure is what payroll generation later reads Paid Days and attendance against.",
            ],
          },
        ],
      },
      {
        title: "Generating payroll — single employee",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Payroll → Generate Payroll and pick the employee — they must already have a salary structure (CTC set).",
              "Enter Paid Days by hand for the month — this step does not auto-pull attendance, and no email is sent automatically.",
              "Submit to generate — the payslip is created with status Generated.",
            ],
          },
        ],
      },
      {
        title: "Bulk-generating payroll for the whole organisation",
        blocks: [
          {
            type: "steps",
            items: [
              "Open the Bulk Generate tab and choose the employee type/month to run.",
              "Run it — payroll is generated for every active employee of that type who already has a salary structure, using their attendance summary for the month automatically.",
              "Review the result: it shows how many were generated and how many were skipped (usually because they had no salary structure yet).",
            ],
          },
          {
            type: "note",
            tone: "warning",
            text: "Employees without a CTC/salary structure are skipped, not errored — set their CTC first, then re-run for them individually.",
          },
        ],
      },
      {
        title: "Viewing and sharing payslips",
        blocks: [
          {
            type: "list",
            items: [
              "Every generated payroll run produces an itemised payslip broken into sections (earnings, deductions, net pay).",
              "Payslips are available per employee, per month, once generated.",
              "Full & Final (FnF) settlements, including asset recovery deductions, are generated the same way when an employee is exiting.",
            ],
          },
        ],
      },
    ],
  },

  // -------------------------------------------------- Reimbursement --
  {
    id: "reimbursement",
    label: "Reimbursement",
    icon: FaReceipt,
    articles: [
      {
        title: "Filing an expense claim",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Reimbursement and start a new claim.",
              "Enter the amount, category, and a short description; attach the receipt if you have one.",
              "Submit — the claim is sent to your manager or Admin for approval, depending on your organisation's setup.",
            ],
          },
        ],
      },
      {
        title: "Approving claims (Manager / Admin / Super Admin)",
        blocks: [
          {
            type: "list",
            items: [
              "Open the Reimbursement queue to see all claims waiting on you.",
              "Review the amount, category, and any attached receipt before deciding.",
              "Approve or reject with an optional comment — the employee is notified either way and can track the outcome on their own claim.",
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------- Performance Review --
  {
    id: "performance-review",
    label: "Performance Reviews",
    icon: FaAward,
    articles: [
      {
        title: "How scoring works — 14 Plus / 14 Minus points",
        blocks: [
          {
            type: "p",
            text: "Reviews are scored using a fixed rubric of 14 \"Plus\" (positive) and 14 \"Minus\" (improvement) points, rated per area — from Poor through Good, Very Good, to Excellent.",
          },
          {
            type: "list",
            items: [
              "Each area gets a rating and contributes to an overall average.",
              "Goals and a Development Plan can be attached, each with its own target and due date.",
              "The reviewer can recommend an outcome — No Change, Increment, Promotion, or Training required — alongside the scores.",
            ],
          },
        ],
      },
      {
        title: "Submitting and approving a review",
        blocks: [
          {
            type: "steps",
            items: [
              "The reviewer (typically your manager) fills in the grading form: Plus/Minus points, achievement notes, goals, and a next-cycle target.",
              "Tap Submit Review once every required area is scored.",
              "The review moves into HR's approval queue, where it can be filtered to \"Show pending only\" or \"Show all reviews.\"",
              "HR gives the final approval before the review and any recommended increment/promotion is finalised.",
            ],
          },
        ],
      },
      {
        title: "Viewing your own review history",
        blocks: [
          {
            type: "list",
            items: [
              "Open My Reviews to see every past review cycle you've been part of.",
              "Each review shows its point breakdown, goals set, and the final outcome once HR has approved it.",
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------- Tickets --
  {
    id: "tickets",
    label: "Tickets & Complaints",
    icon: FaCommentDots,
    articles: [
      {
        title: "Raising a ticket",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Tickets and start a new one.",
              "Choose the type: Suggestion, Complaint, POSH, Grievance, or Whistleblower.",
              "Set the Severity — Low, Medium, High, or Critical.",
              "Fill in the details (category, incident date, location, people involved, witnesses if any).",
              "Toggle Submit Anonymously if you'd rather your identity not be attached to the ticket, then submit.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "Categories cover things like Colleague Behavior, Manager Behavior, Discrimination, Harassment, Hostile Work Env., Compensation Issue, Benefits & Perks, Culture & Diversity, Data Breach, Financial Fraud, and Legal Compliance — pick whichever fits the situation.",
          },
        ],
      },
      {
        title: "How a ticket moves through its lifecycle",
        blocks: [
          {
            type: "list",
            title: "Status stages",
            items: [
              "Open — just submitted, waiting to be picked up.",
              "Acknowledged — someone has seen it.",
              "Under Review — actively being looked into.",
              "Action Taken — a concrete step has been taken.",
              "Resolved → Closed — the matter is settled.",
              "A ticket can also be Rejected, or Reopened if the original issue wasn't actually fixed.",
            ],
          },
          {
            type: "steps",
            title: "Tracking your ticket",
            items: [
              "Open the ticket from your Tickets list to see its full timeline.",
              "Every status change, note, and escalation is logged with a timestamp so you can see exactly what happened and when.",
              "Once it's marked resolved, you may be asked to rate the resolution.",
            ],
          },
        ],
      },
    ],
  },

  // --------------------------------------------------- Employee dir --
  {
    id: "employees",
    label: "Employee Directory",
    icon: FaUsers,
    articles: [
      {
        title: "Adding employees one at a time",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Employees and tap Add Employee.",
              "Fill in their details — name, email, department, designation, and role (Employee, Manager, or Admin).",
              "Save — they'll be able to log in once their account is created.",
            ],
          },
        ],
      },
      {
        title: "Bulk onboarding from a spreadsheet",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Bulk Onboarding and tap Download Template to get the correct column layout.",
              "Fill in one row per employee/manager in the template.",
              "Click to choose your completed .xlsx, .xls, or .csv file and upload it.",
              "Review the import result — successful rows are added immediately; any failed rows are flagged so you can fix and re-upload just those.",
            ],
          },
        ],
      },
      {
        title: "Promoting, demoting, and managing profiles",
        blocks: [
          {
            type: "list",
            items: [
              "Open any employee's profile to see their full detail, attendance, and documents in one place.",
              "Promote or demote them between Employee, Manager, and Admin from the same profile.",
              "Move them to a different department, or update their account status if needed.",
            ],
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------- Assets --
  {
    id: "assets",
    label: "Assets",
    icon: FaBoxes,
    articles: [
      {
        title: "Viewing and requesting assets",
        blocks: [
          {
            type: "steps",
            items: [
              "Open your Assets tab to see everything currently assigned to you (laptop, monitor, ID card, etc.).",
              "To request something new, use Request Asset and describe what you need — this routes to Admin for approval.",
            ],
          },
        ],
      },
      {
        title: "How quantity-based assets work (Admin)",
        blocks: [
          {
            type: "p",
            text: "Assets are tracked by quantity, not as single fixed items — useful for things like \"20 spare keyboards\" where many identical units exist.",
          },
          {
            type: "list",
            items: [
              "Each asset type has a total quantity and an available quantity that updates automatically as units are assigned or returned.",
              "Assigning an asset to an employee reduces the available count by that amount.",
              "Assets can be partially revoked — e.g. take back 2 of 5 assigned units — without affecting the rest of that assignment.",
              "When someone exits, unreturned assets can feed into their Full & Final settlement as an asset recovery deduction.",
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------ Recruitment --
  {
    id: "recruitment",
    label: "Recruitment",
    icon: FaUsers,
    articles: [
      {
        title: "Raising a hiring requisition (Admin/Manager)",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Recruitment and tap New Requisition.",
              "Fill in the department, designation, employment type, experience required, and expected joining date.",
              "Submit for approval — approved requisitions become active and open for candidates to be added against them.",
            ],
          },
        ],
      },
      {
        title: "Adding and moving candidates through the pipeline",
        blocks: [
          {
            type: "steps",
            items: [
              "From an active requisition, tap Add Candidate and fill in their details — current company, experience, employment type, source (e.g. Agency).",
              "Move the candidate through the pipeline stages as they progress — Applied is the starting stage.",
              "Add an Admin Comment at any stage if context is needed for the next reviewer.",
            ],
          },
          {
            type: "list",
            title: "Requisition status",
            items: [
              "Applied — a requisition open and actively receiving candidates.",
              "Approved — the requisition itself has been signed off.",
              "Filled — every open seat on the requisition has been matched with a joined candidate.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "Moving a candidate to Selected, Offered, or Joined automatically counts against the requisition's open seats — once all seats are filled, the requisition closes out on its own.",
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------- Company setup --
  {
    id: "company-setup",
    label: "Company Setup",
    icon: FaCalendarCheck,
    articles: [
      {
        title: "Shift configuration fields, explained (Admin/Super Admin)",
        blocks: [
          {
            type: "list",
            items: [
              "Start / End time — the official shift window.",
              "Early buffer — how many minutes before start time check-in is allowed to open.",
              "Grace period — how many minutes after start time a check-in still counts as on-time before being marked late.",
              "Min. minutes before checkout — the cooldown after check-in before a checkout scan is accepted (see Face Attendance → the 10-minute cooldown).",
              "Max overtime minutes — how long past shift end an open session is allowed to run before it's automatically force-checked-out.",
            ],
          },
          {
            type: "note",
            tone: "warning",
            text: "Leaving \"Min. minutes before checkout\" unset or at 0 removes the double-scan safety net entirely — always keep this at a sensible positive value (10 minutes is the recommended default).",
          },
        ],
      },
      {
        title: "Assigning shifts, and grouping employees",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Shift Management and select or create the shift you want to use.",
              "Set a default shift for the organisation, or assign a specific shift directly from an employee's profile.",
              "Use Groups to bundle employees together (e.g. by department or location) so a shift or week schedule can be applied to all of them at once.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "All future attendance evaluation (late marking, checkout cooldown, auto-checkout timing) for an employee follows whichever shift is currently assigned to them.",
          },
        ],
      },
      {
        title: "Week-offs and holidays",
        blocks: [
          {
            type: "list",
            items: [
              "Set a weekly schedule (which days are working days vs. week-offs) for the organisation, a group, or a specific month.",
              "Bulk-add holidays for the year in one go, or edit them individually afterward.",
              "These feed directly into attendance and leave calculations — a holiday or week-off day is never counted as absent.",
            ],
          },
        ],
      },
      {
        title: "Attendance & leave policy",
        blocks: [
          {
            type: "p",
            text: "The organisation-wide policy controls things like leave accrual rate, carry-forward rules, and default thresholds that individual shifts can build on.",
          },
          {
            type: "steps",
            items: [
              "Open Policy Settings.",
              "Update the relevant values (accrual, carry-forward, thresholds).",
              "Save — the new policy applies going forward; it does not retroactively rewrite past records.",
            ],
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------- Permissions --
  {
    id: "permissions",
    label: "Roles & Permissions",
    icon: FaShieldAlt,
    articles: [
      {
        title: "How role-based access works",
        blocks: [
          {
            type: "p",
            text: "Access follows a role hierarchy: Super Admin → Admin → Manager → Employee, with each level able to see and do progressively less than the one above it.",
          },
          {
            type: "list",
            items: [
              "Permissions are grouped by feature area (e.g. Leave, Attendance, Assets), each with its own set of granular toggles.",
              "A sidebar section only shows as locked when every permission within its group is switched off for that role — partial access still shows the section normally.",
              "Admins can fine-tune these toggles per role from the Permissions settings page.",
            ],
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------- Documents --
  {
    id: "documents",
    label: "Documents",
    icon: FaFolderOpen,
    articles: [
      {
        title: "Uploading and finding documents",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Documents and tap Upload.",
              "Give it a Title, pick the Employee it belongs to (for personal documents), and attach the file.",
              "Save — it appears immediately in the relevant document list.",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "Organisation-wide or team-wide documents show up in a separate section from your own personal uploads, and are only visible to people with permission to view that group.",
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------- Announcements --
  {
    id: "announcements",
    label: "Announcements",
    icon: FaBullhorn,
    articles: [
      {
        title: "Publishing an announcement (Admin)",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Announcements and tap Create.",
              "Write the Message, optionally add an Image (by URL), and set a Priority — Medium or High.",
              "Choose the Audience — Employees, Managers, or a broader combination.",
              "Set an Expiry Date so it automatically stops showing after a certain point.",
              "Publish — it appears immediately on the dashboards of everyone in the chosen audience.",
            ],
          },
        ],
      },
      {
        title: "Editing or removing an announcement",
        blocks: [
          {
            type: "list",
            items: [
              "Open the announcement from the list and tap Edit to change its message, audience, priority, or expiry.",
              "Tap Delete to remove it immediately — it disappears from everyone's feed right away.",
            ],
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------- Org chart --
  {
    id: "organisation",
    label: "Organisation Chart",
    icon: FaSitemap,
    articles: [
      {
        title: "Reading the organisation chart",
        blocks: [
          {
            type: "p",
            text: "The org chart is built automatically from reporting-manager relationships and department/designation data — there's no separate chart to draw or maintain.",
          },
          {
            type: "list",
            items: [
              "Each node shows the person's name, department (e.g. Engineering, Operations, Human Resources), and designation.",
              "Click any person to expand and see their direct reports underneath them.",
              "Updating someone's reporting manager or department in their profile updates the chart automatically.",
            ],
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------- Notifications --
  {
    id: "notifications",
    label: "Notifications",
    icon: FaBell,
    articles: [
      {
        title: "Using your notification feed",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Notifications from the bell icon to see everything relevant to you — approvals, announcements, ticket updates, and more.",
              "Unread items are visually distinct so you can scan for what's new at a glance.",
              "Click any notification to jump straight to the page it relates to.",
              "Once you've gone through everything, the feed shows \"All caught up.\"",
            ],
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------- Settings --
  {
    id: "settings",
    label: "Settings & Profile",
    icon: FaUserCog,
    articles: [
      {
        title: "Updating your profile and address",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Settings and go to your profile section.",
              "Update your Avatar, address information, and other personal details.",
              "Save — changes apply to your profile immediately.",
            ],
          },
        ],
      },
      {
        title: "Adding your banking and ID details",
        blocks: [
          {
            type: "list",
            items: [
              "Banking details — bank name, account holder name (as per bank records), and account number — are used for payroll.",
              "ID details such as your Aadhaar number can also be added here where required.",
              "All fields in a section must be filled in together before it can be saved — the form tells you if something's missing or looks off (e.g. an unusually long bank name).",
            ],
          },
          {
            type: "note",
            tone: "info",
            text: "You can choose to keep certain personal details private/anonymous where that option is offered, depending on your organisation's settings.",
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------- Desktop Agent --
  {
    id: "desktop-agent",
    label: "Desktop Agent",
    icon: FaLaptop,
    articles: [
      {
        title: "What the desktop agent does",
        blocks: [
          {
            type: "p",
            text: "The desktop agent is a small background app that runs on your work computer to track activity — it supplements attendance data but does not replace a real check-in.",
          },
          {
            type: "note",
            tone: "info",
            text: "An agent-only session is never treated as a validated check-in. You still need to check in via face scan or System — otherwise the day will show as not properly checked in, even if the agent was running.",
          },
        ],
      },
      {
        title: "Installing and troubleshooting",
        blocks: [
          {
            type: "steps",
            title: "First-time setup",
            items: [
              "Download the installer provided by your admin and run it.",
              "Sign in with your work account when prompted.",
              "The agent runs quietly in the background — no need to keep a window open.",
            ],
          },
          {
            type: "list",
            title: "If Windows shows a security warning",
            items: [
              "This is a standard SmartScreen prompt for new, unsigned installers — it doesn't mean the file is unsafe.",
              "Choose \"More info\" → \"Run anyway\" to proceed with an installer provided directly by your organisation.",
              "If you're unsure whether the installer is genuine, confirm with your admin before running it.",
            ],
          },
        ],
      },
    ],
  },
];

// =====================================================================
// CARD SUMMARIES — one-line blurbs for the category cards on the
// documentation landing page. Kept separate from CATEGORIES above so
// the full article content is never touched by this UI change.
// =====================================================================
const CATEGORY_SUMMARIES = {
  "getting-started": "Sign-up, organisation setup, role-based login, and Companion Login for continuing your session on another device.",
  "face-attendance": "Kiosk face check-in/checkout, the 10-minute checkout cooldown, auto-checkout, and troubleshooting failed scans.",
  "system-attendance": "Manual check-in and checkout from the app, and how your daily attendance status gets classified.",
  "geolocation": "How location is verified during check-in, and what to do if check-in keeps getting rejected for location.",
  "leave": "Applying for leave or WFH, how the approval chain works, tracking requests, and your leave balance.",
  "timesheet": "Logging time against a project, using the live timer, and how submission, approval & escalation work.",
  "payroll": "Setting CTC, building salary structures, generating payroll (single or bulk), and sharing payslips.",
  "reimbursement": "Filing an expense claim, and how Manager / Admin / Super Admin approve reimbursement claims.",
  "performance-review": "The 14 Plus / 14 Minus scoring system, submitting and approving reviews, and your review history.",
  "tickets": "Raising a ticket or complaint and how it moves through status stages to resolution.",
  "employees": "Adding employees one at a time or in bulk, and promoting, demoting, or managing profiles.",
  "assets": "Viewing and requesting company assets, and how quantity-based asset tracking works for Admins.",
  "recruitment": "Raising a hiring requisition and moving candidates through the recruitment pipeline.",
  "company-setup": "Configuring shifts, assigning them to employees, week-offs & holidays, and attendance/leave policy.",
  "permissions": "How role-based access control works across Super Admin, Admin, Manager, and Employee.",
  "documents": "Uploading and finding employee documents.",
  "announcements": "Publishing, editing, and removing organisation-wide announcements.",
  "organisation": "Reading the organisation chart to see reporting lines across the company.",
  "notifications": "Using your notification feed to stay on top of approvals, updates, and alerts.",
  "settings": "Updating your profile and address, and adding your banking and ID details.",
  "desktop-agent": "What the desktop agent does, installing it, and troubleshooting security warnings.",
};

function CategoryCard({ cat, onOpen }) {
  const Icon = cat.icon;
  const count = cat.articles.length;
  return (
    <button
      onClick={onOpen}
      className="relative text-left rounded-[22px] border border-gray-100 bg-white p-5 flex flex-col gap-4 overflow-hidden
                 transition-all duration-300 ease-out group
                 hover:-translate-y-[3px] hover:border-transparent hover:shadow-[0_14px_32px_-12px_rgba(115,0,66,0.28)]"
    >
      {/* soft gradient wash that fades in on hover — purely decorative, sits behind the content */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(150deg, ${BEETROOT[50]} 0%, rgba(255,255,255,0) 55%)` }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm
                     transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3"
          style={{ background: `linear-gradient(135deg, ${BEETROOT[700]} 0%, ${BEETROOT[500]} 100%)` }}
        >
          <Icon className="text-white" size={17} />
        </div>
        <span
          className="text-[10.5px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
          style={{ background: BEETROOT[50], color: BEETROOT[700] }}
        >
          {count} {count === 1 ? "article" : "articles"}
        </span>
      </div>

      <div className="relative min-w-0">
        <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-[#5C1730] transition-colors">
          {cat.label}
        </h3>
        <p className="text-[12.5px] text-gray-500 leading-relaxed mt-1.5 break-words">
          {CATEGORY_SUMMARIES[cat.id]}
        </p>
      </div>

      <div className="relative mt-auto flex items-center gap-1.5 pt-1">
        <span
          className="text-[12px] font-semibold flex items-center gap-1.5 group-hover:gap-2.5 transition-all"
          style={{ color: BEETROOT[700] }}
        >
          Browse docs
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
            style={{ background: BEETROOT[50] }}
          >
            <FaChevronRight size={8} style={{ color: BEETROOT[700] }} />
          </span>
        </span>
      </div>
    </button>
  );
}

// =====================================================================
// RENDERING
// =====================================================================

const NOTE_STYLES = {
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", Icon: FaInfoCircle },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", Icon: FaExclamationTriangle },
  success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", Icon: FaCheckCircle },
};

function Block({ block }) {
  if (block.type === "p") {
    return <p className="text-[13px] text-gray-600 leading-relaxed break-words">{block.text}</p>;
  }

  if (block.type === "steps") {
    return (
      <div className="min-w-0">
        {block.title && (
          <p className="text-[12.5px] font-semibold mb-2" style={{ color: BEETROOT[700] }}>
            {block.title}
          </p>
        )}
        <ol className="flex flex-col gap-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[13px] text-gray-600 leading-relaxed">
              <span
                className="flex-shrink-0 w-[20px] h-[20px] rounded-full text-[10.5px] font-bold flex items-center justify-center mt-0.5"
                style={{ background: BEETROOT[50], color: BEETROOT[700] }}
              >
                {i + 1}
              </span>
              <span className="break-words min-w-0">{item}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (block.type === "list") {
    return (
      <div className="min-w-0">
        {block.title && (
          <p className="text-[12.5px] font-semibold mb-2" style={{ color: BEETROOT[700] }}>
            {block.title}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] text-gray-600 leading-relaxed">
              <span className="flex-shrink-0 mt-2 w-1 h-1 rounded-full" style={{ background: BEETROOT[700] }} />
              <span className="break-words min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.type === "note") {
    const style = NOTE_STYLES[block.tone] || NOTE_STYLES.info;
    const { Icon } = style;
    return (
      <div className={`flex gap-2.5 rounded-xl border px-3.5 py-3 ${style.bg} ${style.border}`}>
        <Icon className={`flex-shrink-0 mt-0.5 ${style.text}`} size={13} />
        <p className={`text-[12.5px] leading-relaxed break-words min-w-0 ${style.text}`}>{block.text}</p>
      </div>
    );
  }

  return null;
}

function Article({ article, isOpen, onToggle }) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 text-left px-3.5 sm:px-4 py-3.5 hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-[13.5px] font-semibold text-gray-800 break-words min-w-0">{article.title}</span>
        <FaChevronDown
          size={11}
          className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="px-3.5 sm:px-4 pb-5 pt-1 flex flex-col gap-3.5 border-t border-gray-50">
          {article.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentationPage() {
  const [query, setQuery] = useState("");
  const [openArticle, setOpenArticle] = useState(null); // `${categoryId}:${index}`
  const [activeCategory, setActiveCategory] = useState(null); // null = landing grid ("Devdocs"-style hub)

  const totalArticles = useMemo(
    () => CATEGORIES.reduce((sum, c) => sum + c.articles.length, 0),
    []
  );

  // Search matches on article title + any text found inside its blocks —
  // covers steps/list items and note text too, not just paragraphs.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    const blockText = (b) =>
      [b.text, b.title, ...(b.items || [])].filter(Boolean).join(" ").toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      articles: cat.articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.blocks.some((b) => blockText(b).includes(q))
      ),
    })).filter((cat) => cat.articles.length > 0);
  }, [query]);

  const isSearching = query.trim().length > 0;
  const isLanding = !isSearching && activeCategory === null;
  const visibleCategories = isSearching ? filtered : CATEGORIES;
  const currentCategory =
    !isSearching && !isLanding
      ? visibleCategories.find((c) => c.id === activeCategory) || visibleCategories[0]
      : null;

  const openCategory = (id) => {
    setActiveCategory(id);
    setOpenArticle(null);
  };
  const backToGrid = () => {
    setActiveCategory(null);
    setOpenArticle(null);
    setQuery("");
  };

  return (
    // h-screen + overflow-y-auto here (instead of relying on a parent) is what makes the
    // page scroll reliably no matter what height/overflow rules the host container sets.
    // overflow-x-hidden on the root stops any stray wide content from creating a
    // page-level horizontal scrollbar — the ONLY intentional horizontal scroll is the
    // small mobile category strip below, which is scoped to itself.
    <div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-[#FAFAFA]">
      {/* Header */}
      <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-5" style={{ background: BEETROOT[50] }}>
        <div className="max-w-5xl mx-auto flex items-start gap-3">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 bg-white shadow-sm mt-0.5"
            style={{ borderColor: BEETROOT[300] }}
          >
            <FaBook style={{ color: BEETROOT[700] }} size={20} />
          </div>
          <div className="min-w-0">
            {!isLanding && (
              <button
                onClick={backToGrid}
                className="text-[11.5px] font-semibold mb-1 flex items-center gap-1 hover:underline"
                style={{ color: BEETROOT[700] }}
              >
                <FaChevronRight size={8} className="rotate-180" /> All documentation
              </button>
            )}
            <h1 className="text-[26px] sm:text-[34px] leading-tight font-bold tracking-tight" style={{ color: BEETROOT[700] }}>
              {isLanding ? "Documentation" : currentCategory ? currentCategory.label : "Documentation"}
            </h1>
            <p className="text-[13px] sm:text-[14px] mt-1 break-words" style={{ color: BEETROOT.textMid }}>
              {isLanding
                ? `Detailed, step-by-step guides for every feature in TorchX Talent — ${CATEGORIES.length} categories, ${totalArticles} articles.`
                : "Detailed, step-by-step guides for every feature in TorchX Talent."}
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-5">
          <div className="relative w-full max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documentation…"
              className="w-full text-sm rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8C2F49]/30 focus:border-[#8C2F49]"
            />
          </div>
        </div>
      </div>

      {/* Landing hub — grid of category cards, à la a "Devdocs"-style docs home. */}
      {isLanding && (
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => (
              <CategoryCard key={cat.id} cat={cat} onOpen={() => openCategory(cat.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Search results OR a single category's articles — no other-categories
          sidebar here on purpose: opening a card shows ONLY that card's content. */}
      {!isLanding && (
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
          {isSearching && visibleCategories.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-16 px-4">No articles match "{query}".</p>
          )}

          {(isSearching ? visibleCategories : currentCategory ? [currentCategory] : []).map((cat) => (
            <div key={cat.id} className="mb-8 last:mb-0">
              {isSearching && (
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2.5">{cat.label}</p>
              )}
              <div className="flex flex-col gap-2.5">
                {cat.articles.map((art, i) => {
                  const key = `${cat.id}:${i}`;
                  return (
                    <Article
                      key={key}
                      article={art}
                      isOpen={openArticle === key}
                      onToggle={() => setOpenArticle(openArticle === key ? null : key)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}