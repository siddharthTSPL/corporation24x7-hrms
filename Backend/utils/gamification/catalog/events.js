// Every action that can earn points.
//   xp     -> raises level + leaderboard rank
//   coins  -> "reward points", spendable in the Rewards store
//   icon   -> key resolved to a lucide icon by the frontend (components/gamification/icons.jsx)
//
// capExempt: payout-type events (goal / badge / season rewards, manual awards ...)
//            are never throttled by the daily XP cap - only organic activity is.
// dailyCap : max times per IST day this event can pay out (0/undefined = no limit).
// once     : pays out a single time per person, ever.
const EVENTS = {
  // ── Attendance ─────────────────────────────────────────────
  attendance_checkin: { label: "Checked in", icon: "clock", category: "attendance", module: "attendance", xp: 10, coins: 2, dailyCap: 1 },
  attendance_ontime: { label: "On-time check-in", icon: "timer", category: "attendance", module: "attendance", xp: 5, coins: 1, dailyCap: 1 },
  attendance_checkout: { label: "Completed the working day", icon: "check", category: "attendance", module: "attendance", xp: 10, coins: 2, dailyCap: 1 },
  attendance_perfect_week: { label: "Perfect attendance week", icon: "calendar", category: "attendance", module: "attendance", xp: 50, coins: 10, capExempt: true },
  attendance_perfect_month: { label: "Perfect attendance month", icon: "calendar", category: "attendance", module: "attendance", xp: 250, coins: 50, capExempt: true },

  // ── Work & productivity ───────────────────────────────────
  timesheet_submitted: { label: "Timesheet submitted", icon: "file", category: "productivity", module: "timesheet", xp: 15, coins: 3, dailyCap: 2 },
  timesheet_approved: { label: "Timesheet approved", icon: "check", category: "productivity", module: "timesheet", xp: 10, coins: 2, dailyCap: 2 },
  meeting_action_done: { label: "Action item closed", icon: "check", category: "productivity", module: "meetings", xp: 10, coins: 2, dailyCap: 5 },
  meeting_feedback_given: { label: "Meeting feedback shared", icon: "message", category: "productivity", module: "meetings", xp: 5, coins: 1, dailyCap: 3 },

  // ── Learning & growth ─────────────────────────────────────
  training_completed: { label: "Training completed", icon: "graduation", category: "learning", module: "training", xp: 100, coins: 20 },
  review_submitted: { label: "Performance review submitted", icon: "clipboard", category: "growth", module: "review", xp: 30, coins: 5, dailyCap: 5 },
  review_accepted: { label: "Performance review acknowledged", icon: "handshake", category: "growth", module: "review", xp: 15, coins: 3, dailyCap: 3 },
  policy_acknowledged: { label: "Policy acknowledged", icon: "shield", category: "growth", module: "policy", xp: 10, coins: 2, dailyCap: 5 },
  suggestion_submitted: { label: "Idea or suggestion shared", icon: "bulb", category: "growth", module: "tickets", xp: 20, coins: 4, dailyCap: 2 },

  // ── Recognition ───────────────────────────────────────────
  kudos_given: { label: "Recognised a colleague", icon: "thumbs", category: "culture", module: "kudos", xp: 8, coins: 2, dailyCap: 5 },
  // Counts toward the daily XP cap on purpose: stops two colleagues farming each other.
  kudos_received: { label: "Received recognition", icon: "star", category: "culture", module: "kudos", xp: 20, coins: 5, dailyCap: 10 },

  // ── Profile ───────────────────────────────────────────────
  welcome: { label: "Joined the programme", icon: "rocket", category: "profile", xp: 25, coins: 10, once: true, capExempt: true },
  profile_photo: { label: "Added a profile photo", icon: "camera", category: "profile", xp: 20, coins: 5, once: true, capExempt: true },
  profile_complete: { label: "Completed profile", icon: "user", category: "profile", xp: 50, coins: 10, once: true, capExempt: true },

  // ── Payout / system events (never capped, not tunable) ────
  streak_bonus: { label: "Attendance consistency milestone", icon: "flame", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  quest_reward: { label: "Goal reward", icon: "target", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  quest_completed: { label: "Goal completed", icon: "target", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  badge_reward: { label: "Achievement reward", icon: "award", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  badge_granted: { label: "Achievement granted", icon: "award", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  challenge_reward: { label: "Challenge reward", icon: "trophy", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  challenge_completed: { label: "Challenge completed", icon: "trophy", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  level_up: { label: "Level up", icon: "trend", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  weekly_win: { label: "Top contributor of the week", icon: "medal", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  monthly_star: { label: "Top performer of the month", icon: "crown", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  season_reward: { label: "Season reward", icon: "trophy", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  season_win: { label: "Season champion", icon: "crown", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  anniversary_bonus: { label: "Work anniversary", icon: "gift", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  manual_award: { label: "Awarded by your team", icon: "award", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  store_redeem: { label: "Reward redeemed", icon: "gift", category: "spend", xp: 0, coins: 0, capExempt: true, system: true },
  store_refund: { label: "Redemption refunded", icon: "gift", category: "spend", xp: 0, coins: 0, capExempt: true, system: true },
  kudos_gift: { label: "Points gifted with recognition", icon: "heart", category: "spend", xp: 0, coins: 0, capExempt: true, system: true },
  admin_adjust: { label: "Adjustment by admin", icon: "layers", category: "spend", xp: 0, coins: 0, capExempt: true, system: true },
};

const CATEGORIES = {
  attendance: { label: "Attendance", color: "#2563eb" },
  productivity: { label: "Productivity", color: "#0891b2" },
  learning: { label: "Learning", color: "#7c3aed" },
  growth: { label: "Growth", color: "#16a34a" },
  culture: { label: "Recognition", color: "#db2777" },
  profile: { label: "Profile", color: "#64748b" },
  bonus: { label: "Rewards", color: "#ca8a04" },
  spend: { label: "Store & adjustments", color: "#475569" },
};

// Merge the built-in rule with the organisation's overrides (settings.rules).
const resolveRule = (event, settings = {}) => {
  const base = EVENTS[event];
  if (!base) return null;
  const o = (settings.rules && settings.rules[event]) || {};
  return {
    ...base,
    enabled: o.enabled === undefined ? true : !!o.enabled,
    xp: Number.isFinite(o.xp) ? Math.max(0, o.xp) : base.xp,
    coins: Number.isFinite(o.coins) ? Math.max(0, o.coins) : base.coins,
    dailyCap: Number.isFinite(o.dailyCap) ? Math.max(0, o.dailyCap) : base.dailyCap || 0,
  };
};

// Events admins may tune in the settings screen (everything that is not system).
const TUNABLE_EVENTS = Object.entries(EVENTS)
  .filter(([, v]) => !v.system)
  .map(([key]) => key);

module.exports = { EVENTS, CATEGORIES, resolveRule, TUNABLE_EVENTS };
