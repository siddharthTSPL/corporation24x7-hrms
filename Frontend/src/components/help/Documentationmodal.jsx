import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaBook, FaTimes, FaSearch, FaChevronDown, FaChevronRight,
  FaUserCheck, FaClock, FaMapMarkerAlt, FaCalendarAlt, FaStopwatch,
  FaUsers, FaBoxes, FaShieldAlt, FaLaptop, FaExclamationTriangle, FaInfoCircle, FaCheckCircle,
} from "react-icons/fa";

// =====================================================================
// CONTENT MODEL
// ---------------------------------------------------------------------
// Each article is a small ordered list of "blocks". Keeping content data
// (not JSX) makes it easy to extend later — e.g. swap this array for one
// fetched from a CMS/backend without touching the renderer below.
//
// Block types:
//   { type: "p",     text }                         paragraph
//   { type: "steps", title?, items: [string...] }    numbered walkthrough
//   { type: "list",  title?, items: [string...] }    bullet list
//   { type: "note",  tone: "info"|"warning"|"success", text }  callout
// =====================================================================

const CATEGORIES = [
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
          {
            type: "note",
            tone: "info",
            text: "You don't need to wait at the kiosk watching the countdown — simply walk away and come back to scan again once you're actually ready to leave.",
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
            text: "This is the same underlying attendance record as face attendance — the difference is only how the check-in/out event is captured. Once you start a day via System, finish it via System too (see the Face Attendance section for why).",
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
    label: "Leave",
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
              "If required by your organisation's chain, it then moves to the Reporting Manager.",
              "Admin has final visibility and can act at any point in the chain if needed.",
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

  // ------------------------------------------------------- Recruitment --
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
              "Fill in the role, number of open seats, and any requirements/notes.",
              "Submit for approval — approved requisitions become active and open for candidates to be added against them.",
            ],
          },
        ],
      },
      {
        title: "Moving candidates through the pipeline",
        blocks: [
          {
            type: "p",
            text: "Each requisition has a visual candidate pipeline with clear stages, so you can see at a glance where every candidate stands.",
          },
          {
            type: "list",
            title: "Typical stages",
            items: [
              "Applied → Screening → Interview → Selected → Offered → Joined",
              "Moving a candidate to Selected, Offered, or Joined automatically counts against the requisition's open seats.",
              "Once all seats are filled, the requisition is marked complete.",
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
            ],
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------- Shifts --
  {
    id: "shifts",
    label: "Shift Settings",
    icon: FaClock,
    articles: [
      {
        title: "Shift configuration fields, explained (Admin)",
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
        title: "Assigning a shift to an employee",
        blocks: [
          {
            type: "steps",
            items: [
              "Open Shift Management and select or create the shift you want to use.",
              "From the employee's profile, set their assigned shift.",
              "All future attendance evaluation (late marking, checkout cooldown, auto-checkout timing) for that employee now follows this shift's rules.",
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
            text: "Access follows a role hierarchy: SuperAdmin → Admin → Manager → Employee, with each level able to see and do progressively less than the one above it.",
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
// RENDERING
// =====================================================================

const NOTE_STYLES = {
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", Icon: FaInfoCircle },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", Icon: FaExclamationTriangle },
  success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", Icon: FaCheckCircle },
};

function Block({ block }) {
  if (block.type === "p") {
    return <p className="text-[12.5px] text-gray-600 leading-relaxed">{block.text}</p>;
  }

  if (block.type === "steps") {
    return (
      <div>
        {block.title && <p className="text-[12px] font-semibold text-[#730042] mb-1.5">{block.title}</p>}
        <ol className="flex flex-col gap-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-[12.5px] text-gray-600 leading-relaxed">
              <span
                className="flex-shrink-0 w-4.5 h-4.5 w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
                style={{ background: "#FBEAF0", color: "#730042" }}
              >
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (block.type === "list") {
    return (
      <div>
        {block.title && <p className="text-[12px] font-semibold text-[#730042] mb-1.5">{block.title}</p>}
        <ul className="flex flex-col gap-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2 text-[12.5px] text-gray-600 leading-relaxed">
              <span className="flex-shrink-0 mt-1.5 w-1 h-1 rounded-full" style={{ background: "#730042" }} />
              <span>{item}</span>
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
      <div className={`flex gap-2 rounded-xl border px-3 py-2.5 ${style.bg} ${style.border}`}>
        <Icon className={`flex-shrink-0 mt-0.5 ${style.text}`} size={12} />
        <p className={`text-[12px] leading-relaxed ${style.text}`}>{block.text}</p>
      </div>
    );
  }

  return null;
}

function Article({ article, isOpen, onToggle }) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 text-left px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="text-[13px] font-semibold text-gray-800">{article.title}</span>
        <FaChevronDown
          size={10}
          className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-gray-50">
          {article.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentationModal({ onClose }) {
  const [query, setQuery] = useState("");
  const [openArticle, setOpenArticle] = useState(null); // `${categoryId}:${index}`
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

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
  const visibleCategories = isSearching ? filtered : CATEGORIES;
  const currentCategory = isSearching
    ? null
    : visibleCategories.find((c) => c.id === activeCategory) || visibleCategories[0];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative bg-white w-full max-w-3xl rounded-2xl border border-[#F4C0D1] overflow-hidden shadow-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex items-start justify-between flex-shrink-0" style={{ background: "#FBEAF0" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#F7C1C1] flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}>
              <FaBook className="text-[#730042]" size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#730042]">Documentation</h3>
              <p className="text-[11px] text-[#993556]">Detailed guides for every feature</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#993556] hover:text-[#730042]">
            <FaTimes size={14} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documentation…"
              className="w-full text-sm rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#CD166E]/30 focus:border-[#CD166E]"
            />
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {!isSearching && (
            <div className="w-40 sm:w-52 flex-shrink-0 border-r border-gray-100 py-2 overflow-y-auto">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = cat.id === (currentCategory?.id ?? activeCategory);
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setOpenArticle(null); }}
                    className={`w-full flex items-center justify-between gap-2 text-left px-4 py-2.5 text-[12.5px] font-medium transition-colors ${
                      active ? "text-[#730042] bg-[#FBEAF0]" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon size={12} className="flex-shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </span>
                    {active && <FaChevronRight size={9} className="flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {isSearching && visibleCategories.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-10">No articles match "{query}".</p>
            )}

            {(isSearching ? visibleCategories : currentCategory ? [currentCategory] : []).map((cat) => (
              <div key={cat.id} className="mb-6 last:mb-0">
                {isSearching && (
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat.label}</p>
                )}
                <div className="flex flex-col gap-2">
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
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">Can't find what you're looking for?</p>
          <button onClick={onClose} className="text-[11.5px] font-medium text-[#730042] hover:underline">
            Close and contact support instead
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}