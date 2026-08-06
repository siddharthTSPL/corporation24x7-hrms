import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FaBook, FaTimes, FaSearch, FaChevronDown, FaClock, FaUserCheck, FaCalendarAlt, FaLaptop } from "react-icons/fa";

// ---------------------------------------------------------------- content --
// Each category groups a set of Q&A-style articles. Keep answers short,
// scannable, and written for the end user (not internal engineering
// language) — this is what an employee sees when they tap "Documentation"
// from the floating help button.
const CATEGORIES = [
  {
    id: "face-attendance",
    label: "Face Attendance",
    icon: FaUserCheck,
    articles: [
      {
        q: "Why can't I check out right after checking in?",
        a: "There's a short cooldown — by default 10 minutes — between check-in and when checkout is accepted on the same face-scan device. This exists purely as a safety net: the kiosk scans continuously, so if you check in and then walk past the camera again a few seconds later, the system won't accidentally treat that second glance as a checkout. Once the cooldown passes, checkout works normally on your very next scan.",
      },
      {
        q: "How do I know when checkout will unlock?",
        a: "After you check in, or if you scan again too early, the screen shows a small countdown chip — \"Checkout unlocks in mm:ss\". It counts down live and automatically switches to \"Checkout window is open\" the moment you're allowed to scan out.",
      },
      {
        q: "When does the check-in window open and close?",
        a: "Check-in typically opens a set number of minutes before your shift's start time (an \"early buffer\") and stays open through a grace period after your shift starts. Scanning after that grace period still checks you in, just marked as late. There's an outer cutoff beyond which the kiosk will no longer accept a fresh check-in for that day — reach out to your admin if you've missed it.",
      },
      {
        q: "What happens if I forget to check out?",
        a: "Open sessions are automatically checked out at shift end plus a fixed overtime allowance (commonly 1 hour), so a forgotten checkout doesn't leave your day open indefinitely. If you were still genuinely working past that point, let your admin know so your hours can be corrected.",
      },
      {
        q: "I checked in through the app/system — why won't the kiosk let me check out?",
        a: "Each day's attendance is owned by a single channel. If you checked in manually through the System/App, you should also check out from there — the face kiosk will recognise you're already checked in elsewhere and won't create a conflicting record.",
      },
    ],
  },
  {
    id: "attendance",
    label: "Attendance & Shifts",
    icon: FaClock,
    articles: [
      {
        q: "What do \"late\", \"half day\", and \"absent\" mean for face attendance?",
        a: "These are calculated from how much of your shift you were actually clocked in for. Being marked late only affects your check-in remark; whether a day counts as present, half-day, or absent for payroll purposes depends on the total time between check-in and checkout compared to your shift length.",
      },
      {
        q: "Can I see my shift timing?",
        a: "Yes — your shift's start and end time is shown on the result banner right after you scan (\"Shift 09:30 – 18:30\"), and in more detail under My Shift in the attendance section of the app.",
      },
    ],
  },
  {
    id: "leave",
    label: "Leave",
    icon: FaCalendarAlt,
    articles: [
      {
        q: "Who approves my leave request?",
        a: "Leave follows your reporting chain — typically your Manager first, then Reporting Manager or Admin depending on your organisation's approval hierarchy. You'll see the current approver and status on your leave request card.",
      },
      {
        q: "How is my leave balance calculated?",
        a: "Leave accrues automatically on a set schedule and is visible on your Leave dashboard, broken down by leave type. Any adjustments made by HR/Admin are reflected there as well.",
      },
    ],
  },
  {
    id: "desktop-agent",
    label: "Desktop Agent",
    icon: FaLaptop,
    articles: [
      {
        q: "Does the desktop agent count as my official check-in?",
        a: "No — the desktop agent tracks activity in the background but doesn't create a validated attendance record on its own. A real check-in still needs to happen via face scan or the manual/system flow; the agent's activity is used for supplementary tracking only.",
      },
    ],
  },
];

export default function DocumentationModal({ onClose }) {
  const [query, setQuery] = useState("");
  const [openArticle, setOpenArticle] = useState(null); // `${categoryId}:${index}`
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES
      .map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) => a.q.toLowerCase().includes(q) || a.a.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.articles.length > 0);
  }, [query]);

  const visibleCategories = query.trim() ? filtered : CATEGORIES;
  const currentCategory = query.trim()
    ? null
    : visibleCategories.find((c) => c.id === activeCategory) || visibleCategories[0];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative bg-white w-full max-w-2xl rounded-2xl border border-[#F4C0D1] overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex items-start justify-between flex-shrink-0" style={{ background: "#FBEAF0" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#F7C1C1] flex items-center justify-center flex-shrink-0" style={{ background: "#fff" }}>
              <FaBook className="text-[#730042]" size={16} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#730042]">Documentation</h3>
              <p className="text-[11px] text-[#993556]">Guides & frequently asked questions</p>
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
          {!query.trim() && (
            <div className="w-40 sm:w-48 flex-shrink-0 border-r border-gray-100 py-2 overflow-y-auto">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = cat.id === (currentCategory?.id ?? activeCategory);
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setOpenArticle(null); }}
                    className={`w-full flex items-center gap-2 text-left px-4 py-2.5 text-[12.5px] font-medium transition-colors ${
                      active ? "text-[#730042] bg-[#FBEAF0]" : "text-gray-500 hover:bg-gray-50"
                    }`}
                    style={active ? { borderRight: "2px solid #730042" } : undefined}
                  >
                    <Icon size={12} className="flex-shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {query.trim() && visibleCategories.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-10">No articles match "{query}".</p>
            )}

            {(query.trim() ? visibleCategories : currentCategory ? [currentCategory] : []).map((cat) => (
              <div key={cat.id} className="mb-5 last:mb-0">
                {query.trim() && (
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat.label}</p>
                )}
                <div className="flex flex-col gap-2">
                  {cat.articles.map((art, i) => {
                    const key = `${cat.id}:${i}`;
                    const isOpen = openArticle === key;
                    return (
                      <div key={key} className="border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setOpenArticle(isOpen ? null : key)}
                          className="w-full flex items-center justify-between gap-3 text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-[13px] font-medium text-gray-800">{art.q}</span>
                          <FaChevronDown
                            size={10}
                            className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-3.5 text-[12.5px] text-gray-600 leading-relaxed">{art.a}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">Can't find what you're looking for?</p>
          <button
            onClick={onClose}
            className="text-[11.5px] font-medium text-[#730042] hover:underline"
          >
            Close and contact support instead
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}